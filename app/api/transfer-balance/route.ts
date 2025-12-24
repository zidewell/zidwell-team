import { NextResponse } from "next/server";
import { getNombaToken } from "@/lib/nomba";
import { createClient } from "@supabase/supabase-js";
import bcrypt from "bcryptjs";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  try {
    const {
      userId,
      senderName,
      senderAccountNumber,
      senderBankName,
      amount,
      fee,
      accountNumber,
      accountName,
      bankCode,
      bankName,
      narration,
      pin,
    } = await req.json();

    console.log({ amount, fee });

    // ✅ Validate inputs
    if (
      !userId ||
      !pin ||
      !amount ||
      amount < 100 ||
      !fee ||
      fee < 0 ||
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

    // Calculate total deduction
    const totalDeduction = amount + fee;

    console.log("💰 Transaction details:", {
      amount_to_recipient: amount,
      fee: fee,
      total_deduction: totalDeduction,
    });

    // ✅ Verify user + PIN
    const { data: user, error: userError } = await supabase
      .from("users")
      .select("id, transaction_pin, wallet_balance, email, first_name")
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

    // Check balance
    if (user.wallet_balance < totalDeduction) {
      return NextResponse.json(
        {
          message: "Insufficient wallet balance (including fees)",
          required: totalDeduction,
          current: user.wallet_balance,
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

    // Create unique reference for webhook matching
    const merchantTxRef = `WD_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // ✅ Start with "pending" status (not "processing")
    // This matches what your webhook expects
    const { data: pendingTx, error: txError } = await supabase
      .from("transactions")
      .insert({
        user_id: userId,
        type: "withdrawal", // Fixed: Should match what webhook looks for
        sender: {
          name: senderName || user.first_name || "User",
          accountNumber: senderAccountNumber || "N/A",
          bankName: senderBankName || "N/A",
        },
        receiver: {
          name: accountName,
          accountNumber,
          bankName,
        },
        amount: amount,
        fee: fee,
        total_deduction: totalDeduction,
        status: "pending", // CHANGED: Start with "pending" not "processing"
        narration: narration || `Transfer to ${accountName}`,
        merchant_tx_ref: merchantTxRef,
        external_response: {
          init_timestamp: new Date().toISOString(),
          fee_breakdown: {
            amount_to_recipient: amount,
            fee: fee,
            total_deduction: totalDeduction,
            fee_source: "frontend_calculation",
          },
          withdrawal_details: {
            account_name: accountName,
            account_number: accountNumber,
            bank_name: bankName,
            bank_code: bankCode,
            narration: narration,
          },
        },
      })
      .select("*")
      .single();

    if (txError || !pendingTx) {
      console.error("❌ Failed to create transaction record:", txError);
      return NextResponse.json(
        { error: "Could not create transaction record" },
        { status: 500 }
      );
    }

    // ✅ Deduct wallet balance immediately
    const { error: updateBalanceError } = await supabase
      .from("users")
      .update({ 
        wallet_balance: user.wallet_balance - totalDeduction 
      })
      .eq("id", userId);

    if (updateBalanceError) {
      console.error("❌ Failed to deduct wallet balance:", updateBalanceError);
      
      // Clean up
      await supabase.from("transactions").delete().eq("id", pendingTx.id);
      
      return NextResponse.json(
        { error: "Failed to deduct wallet balance" },
        { status: 500 }
      );
    }

    console.log("✅ Wallet deducted, calling Nomba API...", {
      user_id: userId,
      amount_deducted: totalDeduction,
      merchant_tx_ref: merchantTxRef,
    });

    // ✅ Call Nomba transfer API
    const res = await fetch(`${process.env.NOMBA_URL}/v1/transfers/bank`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        accountId: process.env.NOMBA_ACCOUNT_ID!,
      },
      body: JSON.stringify({
        amount: amount,
        accountNumber,
        accountName,
        bankCode,
        senderName: senderName || user.first_name || "Zidwell User",
        merchantTxRef, // This is crucial for webhook matching
        narration: narration || `Transfer to ${accountName}`,
      }),
    });

    const nombaResponse = await res.json();
    console.log("📤 Nomba Response:", {
      status: res.status,
      nomba_response: nombaResponse,
      merchant_tx_ref: merchantTxRef,
    });

    // ✅ Handle IMMEDIATE Nomba failure (not async webhook failure)
    if (nombaResponse.code === "400" || !res.ok) {
      console.log("❌ Nomba transfer failed immediately:", nombaResponse.description);

      // Update transaction to failed immediately
      const { error: updateError } = await supabase
        .from("transactions")
        .update({
          status: "failed",
          external_response: {
            ...pendingTx.external_response,
            nomba_response: nombaResponse,
            failed_at: new Date().toISOString(),
            error: nombaResponse.description || "Immediate failure",
            final_status: "failed",
          },
        })
        .eq("id", pendingTx.id);

      // Refund wallet balance
      const { error: refundErr } = await supabase
        .from("users")
        .update({ 
          wallet_balance: user.wallet_balance 
        })
        .eq("id", userId);

      if (refundErr) {
        console.error("❌ Refund failed:", refundErr);
        return NextResponse.json(
          {
            success: false,
            message: "Transfer failed, refund pending",
            nomba_response: nombaResponse,
          },
          { status: 400 }
        );
      }

      return NextResponse.json(
        {
          success: false,
          message: "Transfer failed immediately",
          reason: nombaResponse.description,
          refunded: true,
        },
        { status: 400 }
      );
    }

    // ✅ IMPORTANT: Update to "processing" so webhook knows it's been sent
    // But ONLY if Nomba accepted the request
    const { error: updateProcessingError } = await supabase
      .from("transactions")
      .update({
        status: "processing", // Now webhook will see this as "in-flight"
        reference: nombaResponse?.data?.reference || nombaResponse?.reference || null,
        external_response: {
          ...pendingTx.external_response,
          nomba_initial_response: nombaResponse,
          sent_to_nomba_at: new Date().toISOString(),
          merchant_tx_ref: merchantTxRef, // Ensure this is preserved
        },
      })
      .eq("id", pendingTx.id);

    if (updateProcessingError) {
      console.error("❌ Failed to update to processing:", updateProcessingError);
      // Don't fail - transaction exists, webhook will handle it
    }

    console.log("✅ Transfer initiated successfully. Awaiting webhook...");

    // ✅ Return success response
    return NextResponse.json({
      success: true,
      message: "Transfer initiated successfully. Awaiting confirmation.",
      transactionId: pendingTx.id,
      merchantTxRef, // Crucial: Return this for debugging
      status: "processing",
      note: "Your transfer is being processed. You'll receive a notification when completed.",
      fee_breakdown: {
        amount_to_recipient: amount,
        fee: fee,
        total_deducted: totalDeduction,
      },
    });
  } catch (error: any) {
    console.error("🔥 Transfer API error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Server error",
        message: error.message || "Internal server error",
      },
      { status: 500 }
    );
  }
}