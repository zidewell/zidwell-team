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

    // Calculate total deduction (amount to recipient + fees)
    const totalDeduction = amount + fee;

    console.log("💰 Using fees from frontend:", {
      amount_to_recipient: amount,
      fee_from_frontend: fee,
      total_deduction: totalDeduction,
      calculation: `₦${amount} (to recipient) + ₦${fee} (fees) = ₦${totalDeduction} total`,
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

    // Check balance against total deduction (amount + fees)
    if (user.wallet_balance < totalDeduction) {
      return NextResponse.json(
        {
          message: "Insufficient wallet balance (including fees)",
          required: totalDeduction,
          current: user.wallet_balance,
          shortfall: totalDeduction - user.wallet_balance,
          fee_breakdown: {
            amount_to_recipient: amount,
            fee: fee,
            total_required: totalDeduction,
          },
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

    const merchantTxRef = `WD_${Date.now()}`;

    // ✅ Start database transaction to ensure atomicity
    const { data: pendingTx, error: txError } = await supabase
      .from("transactions")
      .insert({
        user_id: userId,
        type: "Transfer",
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
        status: "pending",
        narration: narration || `Transfer to ${accountName}`,
        merchant_tx_ref: merchantTxRef,
        external_response: {
          fee_breakdown: {
            amount_to_recipient: amount,
            fee: fee,
            total_deduction: totalDeduction,
            calculation: `₦${amount} to recipient + ₦${fee} fees = ₦${totalDeduction} total`,
            timestamp: new Date().toISOString(),
            fee_source: "frontend_calculation",
          },
          withdrawal_details: {
            account_name: accountName,
            account_number: accountNumber,
            bank_name: bankName,
            bank_code: bankCode,
            narration: narration,
            initiated_at: new Date().toISOString(),
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

    // ✅ Update user wallet balance directly (instead of using RPC)
    const { error: updateBalanceError } = await supabase
      .from("users")
      .update({ 
        wallet_balance: user.wallet_balance - totalDeduction 
      })
      .eq("id", userId)
      .select("wallet_balance")
      .single();

    if (updateBalanceError) {
      console.error("❌ Failed to deduct wallet balance:", updateBalanceError);
      
      // Clean up the transaction record since balance update failed
      await supabase.from("transactions").delete().eq("id", pendingTx.id);
      
      return NextResponse.json(
        { error: "Failed to deduct wallet balance" },
        { status: 500 }
      );
    }

    console.log("✅ Wallet deducted successfully:", {
      user_id: userId,
      amount_deducted: totalDeduction,
      new_balance: user.wallet_balance - totalDeduction,
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
        merchantTxRef,
        narration: narration || `Transfer to ${accountName}`,
      }),
    });

    const data = await res.json();
    console.log("📤 Nomba Transfer Response:", {
      status: res.status,
      nomba_response: data,
      amount_sent: amount,
      merchant_tx_ref: merchantTxRef,
    });

    // ✅ Handle immediate Nomba failure
    if (data.code === "400" || data.status === "failed" || !res.ok) {
      console.log(
        "❌ Nomba transfer failed immediately:",
        data.description || data.message
      );

      // Update transaction to failed
      const { error: updateError } = await supabase
        .from("transactions")
        .update({
          status: "failed",
          external_response: {
            ...pendingTx.external_response,
            nomba_response: data,
            failed_at: new Date().toISOString(),
            error: data.description || data.message,
          },
        })
        .eq("id", pendingTx.id);

      if (updateError) {
        console.error("❌ Failed to update transaction status:", updateError);
      }

      // Refund wallet balance
      const { error: refundErr } = await supabase
        .from("users")
        .update({ 
          wallet_balance: user.wallet_balance // Restore original balance
        })
        .eq("id", userId);

      if (refundErr) {
        console.error("❌ Refund failed:", refundErr);

        return NextResponse.json(
          {
            success: false,
            message: "Transfer failed, refund pending",
            nomba_response: data,
            fee_breakdown: {
              amount_to_recipient: amount,
              fees: fee,
              total_deducted: totalDeduction,
            },
            merchant_tx_ref: merchantTxRef,
          },
          { status: 400 }
        );
      }

      return NextResponse.json(
        {
          success: false,
          message: "Transfer failed, funds refunded successfully.",
          reason: data.description || data.message || "Transfer not successful",
          refunded: true,
          refund_amount: totalDeduction,
          fee_breakdown: {
            amount_to_recipient: amount,
            fees: fee,
            total_deducted: totalDeduction,
          },
          merchant_tx_ref: merchantTxRef,
        },
        { status: 400 }
      );
    }

    // ✅ If request accepted, update transaction to processing
    const { error: updateProcessingError } = await supabase
      .from("transactions")
      .update({
        status: "processing",
        reference: data?.data?.reference || data?.reference || null,
        external_response: {
          ...pendingTx.external_response,
          nomba_response: data,
          updated_at: new Date().toISOString(),
        },
      })
      .eq("id", pendingTx.id);

    if (updateProcessingError) {
      console.error("❌ Failed to update transaction to processing:", updateProcessingError);
    }

    return NextResponse.json({
      success: true,
      message: "Transfer initiated successfully.",
      transactionId: pendingTx.id,
      merchantTxRef,
      fee_breakdown: {
        amount_to_recipient: amount,
        fee: fee,
        total_deducted: totalDeduction,
      },
      note: `₦${amount} will be sent to ${accountName}. Total of ₦${totalDeduction} deducted from your wallet (includes ₦${fee} fees).`,
      nomba_response: data,
    });
  } catch (error: any) {
    console.error("🔥 Transfer API error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Server error",
        message: error.message || error.description || "Internal server error",
      },
      { status: 500 }
    );
  }
}