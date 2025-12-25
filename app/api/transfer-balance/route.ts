import { NextResponse } from "next/server";
import { getNombaToken } from "@/lib/nomba";
import { createClient } from "@supabase/supabase-js";
import bcrypt from "bcryptjs";

export async function POST(req: Request) {
  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  try {
    const {
      userId,
      senderName,
      senderAccountNumber,
      senderBankName,
      amount,
      accountNumber,
      accountName,
      bankCode,
      bankName,
      narration,
      pin,
      fee,
      totalDebit,
    } = await req.json();

    // ✅ Validate inputs
    if (
      !userId ||
      !pin ||
      !amount ||
      amount < 100 ||
      !accountNumber ||
      !accountName ||
      !bankCode ||
      !bankName
    ) {
      return NextResponse.json(
        { message: "Missing or invalid required fields" },
        { status: 400 }
      );
    }

    // ✅ Verify user + PIN
    const { data: user, error: userError } = await supabase
      .from("users")
      .select("id, transaction_pin, wallet_balance")
      .eq("id", userId)
      .single();

    if (userError || !user) {
      return NextResponse.json({ message: "User not found" }, { status: 404 });
    }

    const plainPin = Array.isArray(pin) ? pin.join("") : pin;
    const isValid = await bcrypt.compare(plainPin, user.transaction_pin);
    if (!isValid) {
      return NextResponse.json(
        { message: "Invalid transaction PIN" },
        { status: 401 }
      );
    }

    const totalDeduction = totalDebit || amount + fee;
    if (user.wallet_balance < totalDeduction) {
      return NextResponse.json(
        { message: "Insufficient wallet balance (including fees)" },
        { status: 400 }
      );
    }

    // ✅ Generate unique merchant reference
    const merchantTxRef = `WD_${Date.now()}`;
    console.log("🆕 Creating transaction with ref:", merchantTxRef);

    // ✅ Check for duplicate transaction (idempotency)
    const { data: existingTx } = await supabase
      .from("transactions")
      .select("id, status")
      .eq("merchant_tx_ref", merchantTxRef)
      .single();

    if (existingTx) {
      console.log("⚠️ Duplicate transaction found:", existingTx.id);
      return NextResponse.json(
        { 
          message: "Transaction already exists", 
          transactionId: existingTx.id,
          status: existingTx.status 
        },
        { status: 400 }
      );
    }

    // ✅ Get Nomba token
    const token = await getNombaToken();
    if (!token) {
      return NextResponse.json(
        { message: "Unauthorized: Nomba token missing" },
        { status: 401 }
      );
    }

    // ✅ FIRST: Create transaction with status "processing" directly
    // (No need for "pending" then "processing" - go straight to "processing")
    const { data: transaction, error: txError } = await supabase
      .from("transactions")
      .insert({
        user_id: userId,
        type: "withdrawal",
        sender: {
          name: senderName,
          accountNumber: senderAccountNumber,
          bankName: senderBankName,
        },
        receiver: {
          name: accountName,
          accountNumber,
          bankName,
        },
        amount,
        fee,
        total_deduction: totalDeduction,
        status: "processing", // Start as processing, not pending
        description: `Transfer of ₦${amount}`,
        narration: narration || "N/A",
        merchant_tx_ref: merchantTxRef,
        created_at: new Date().toISOString(),
      })
      .select("*")
      .single();

    if (txError || !transaction) {
      console.error("❌ Transaction creation failed:", txError);
      return NextResponse.json(
        { error: "Could not create transaction record" },
        { status: 500 }
      );
    }

    console.log("✅ Transaction created with ID:", transaction.id);

    // ✅ Deduct wallet balance first
    const { error: rpcError } = await supabase.rpc("deduct_wallet_balance", {
      user_id: transaction.user_id,
      amt: totalDeduction,
      transaction_type: "withdrawal",
      reference: merchantTxRef,
      description: `Transfer of ₦${amount}`,
    });

    if (rpcError) {
      console.error("❌ Wallet deduction failed:", rpcError);
      
      // Update transaction to failed
      await supabase
        .from("transactions")
        .update({
          status: "failed",
          external_response: { error: "Wallet deduction failed", details: rpcError },
        })
        .eq("id", transaction.id);

      return NextResponse.json(
        { error: "Failed to deduct wallet balance" },
        { status: 500 }
      );
    }

    // ✅ Call Nomba transfer API
    console.log("📤 Calling Nomba API with ref:", merchantTxRef);
    const res = await fetch(`${process.env.NOMBA_URL}/v1/transfers/bank`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        accountId: process.env.NOMBA_ACCOUNT_ID!,
      },
      body: JSON.stringify({
        amount,
        accountNumber,
        accountName,
        bankCode,
        senderName,
        merchantTxRef,
        narration,
      }),
    });

    const nombaResponse = await res.json();
    console.log("📥 Nomba response:", {
      code: nombaResponse.code,
      status: nombaResponse.status,
      message: nombaResponse.message,
    });

    // ✅ Handle failure immediately
    if (nombaResponse.code === "400" || nombaResponse.status === false) {
      console.log("❌ Nomba transfer failed:", nombaResponse.description);

      // Update transaction to failed
      await supabase
        .from("transactions")
        .update({
          status: "failed",
          external_response: nombaResponse,
          updated_at: new Date().toISOString(),
        })
        .eq("id", transaction.id)
        .eq("merchant_tx_ref", merchantTxRef);

      // Refund wallet balance
      const refundReference = `refund_${merchantTxRef}`;
      const { error: refundErr } = await supabase.rpc("deduct_wallet_balance", {
        user_id: user.id,
        amt: -totalDeduction,
        transaction_type: "credit",
        reference: refundReference,
        description: `Refund for failed Transfer of ₦${amount}`,
      });

      if (refundErr) {
        console.error("❌ Refund failed:", refundErr);
        return NextResponse.json(
          { 
            message: "Transfer failed, refund pending", 
            nombaResponse: nombaResponse 
          },
          { status: 400 }
        );
      }

      return NextResponse.json(
        {
          message: "Transfer failed, funds refunded successfully.",
          reason: nombaResponse.description || "Transfer not successful",
          refunded: true,
        },
        { status: 400 }
      );
    }

    // ✅ Success case - update with Nomba response
    await supabase
      .from("transactions")
      .update({
        status: "processing",
        reference: nombaResponse?.data?.reference || null,
        external_response: nombaResponse,
        updated_at: new Date().toISOString(),
      })
      .eq("id", transaction.id)
      .eq("merchant_tx_ref", merchantTxRef);

    console.log("✅ Transaction updated to processing:", transaction.id);

    return NextResponse.json({
      message: "Transfer initiated successfully.",
      transactionId: transaction.id,
      merchantTxRef,
      nombaResponse: nombaResponse,
    });
  } catch (error: any) {
    console.error("Withdraw API error:", error);
    return NextResponse.json(
      { error: "Server error: " + (error.message || error.description) },
      { status: 500 }
    );
  }
}