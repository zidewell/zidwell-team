import { NextResponse } from "next/server";
import { getNombaToken } from "@/lib/nomba";
import { createClient } from "@supabase/supabase-js";
import bcrypt from "bcryptjs";
import { transporter } from "@/lib/node-mailer";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Helper function to calculate fees consistently
function calculateWithdrawalFees(amount: number) {
  // 1. Calculate Nomba fee: 0.5% (₦20 min, ₦100 cap)
  const nombaPercentage = amount * 0.005; // 0.5%
  const nombaFee = Math.min(Math.max(nombaPercentage, 20), 100); // Min ₦20, Max ₦100
  
  // 2. Calculate Zidwell fee: 0.5% (₦5 min, ₦50 cap)
  const zidwellPercentage = amount * 0.005; // 0.5%
  const zidwellFee = Math.min(Math.max(zidwellPercentage, 5), 50); // Min ₦5, Max ₦50
  
  // Total fees
  const totalFees = nombaFee + zidwellFee;
  const totalDeduction = amount + totalFees;
  
  return {
    amount, // Amount to recipient
    nombaFee,
    zidwellFee,
    totalFees,
    totalDeduction,
  };
}

// Email notification function for withdrawal
async function sendWithdrawalEmailNotification(
  userId: string,
  status: "success" | "failed" | "pending" | "processing",
  amount: number,
  fee: number,
  totalDeduction: number,
  recipientName: string,
  recipientAccount: string,
  bankName: string,
  transactionId?: string,
  errorDetail?: string
) {
  try {
    // Fetch user email
    const { data: user, error } = await supabase
      .from("users")
      .select("email, first_name")
      .eq("id", userId)
      .single();

    if (error || !user) {
      console.error(
        "Failed to fetch user for withdrawal email notification:",
        error
      );
      return;
    }

    const subject =
      status === "success"
        ? `Transfer Successful - ₦${amount.toLocaleString()}`
        : status === "processing" || status === "pending"
        ? `Transfer Processing - ₦${amount.toLocaleString()}`
        : `Transfer Failed - ₦${amount.toLocaleString()}`;

    const greeting = user.first_name ? `Hi ${user.first_name},` : "Hello,";

    const successBody = `
${greeting}

Your Transfer was successful!

💰 Transaction Details:
• Amount Sent: ₦${amount.toLocaleString()}
• Fee: ₦${fee.toLocaleString()}
• Total Deducted: ₦${totalDeduction.toLocaleString()}
• Recipient: ${recipientName}
• Account Number: ${recipientAccount}
• Bank: ${bankName}
• Transaction ID: ${transactionId || "N/A"}
• Date: ${new Date().toLocaleString()}

The funds should reflect in your beneficiary's bank account shortly.

Thank you for using Zidwell!

Best regards,
Zidwell Team
    `;

    const processingBody = `
${greeting}

Your Transfer is being processed. This usually takes a few moments.

💰 Transaction Details:
• Amount Sent: ₦${amount.toLocaleString()}
• Fee: ₦${fee.toLocaleString()}
• Total Deducted: ₦${totalDeduction.toLocaleString()}
• Recipient: ${recipientName}
• Account Number: ${recipientAccount}
• Bank: ${bankName}
• Transaction ID: ${transactionId || "N/A"}
• Date: ${new Date().toLocaleString()}
• Status: Processing

You will receive another notification once the transaction is completed.

Thank you for using Zidwell!

Best regards,
Zidwell Team
    `;

    const failedBody = `
${greeting}

Your Transfer failed.

💰 Transaction Details:
• Amount Sent: ₦${amount.toLocaleString()}
• Fee: ₦${fee.toLocaleString()}
• Total Deducted: ₦${totalDeduction.toLocaleString()}
• Recipient: ${recipientName}
• Account Number: ${recipientAccount}
• Bank: ${bankName}
• Transaction ID: ${transactionId || "N/A"}
• Date: ${new Date().toLocaleString()}
• Status: ${errorDetail || "Transaction failed"}

${
  errorDetail?.includes("refunded") || errorDetail?.includes("refund")
    ? "✅ Your wallet has been refunded successfully."
    : "Please contact support if you have any questions."
}

Best regards,
Zidwell Team
    `;

    const emailBody =
      status === "success"
        ? successBody
        : status === "processing" || status === "pending"
        ? processingBody
        : failedBody;

    const statusColor =
      status === "success"
        ? "#22c55e"
        : status === "processing" || status === "pending"
        ? "#f59e0b"
        : "#ef4444";

    const statusIcon =
      status === "success"
        ? "✅"
        : status === "processing" || status === "pending"
        ? "🟡"
        : "❌";

    const statusText =
      status === "success"
        ? "Transfer Successful"
        : status === "processing" || status === "pending"
        ? "Transfer Processing"
        : "Transfer Failed";

    await transporter.sendMail({
      from: `Zidwell <${process.env.EMAIL_USER}>`,
      to: user.email,
      subject,
      text: emailBody,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <p>${greeting}</p>
          
          <h3 style="color: ${statusColor};">
            ${statusIcon} ${statusText}
          </h3>
          
          <div style="background: #f8fafc; padding: 15px; border-radius: 8px; margin: 15px 0;">
            <h4 style="margin-top: 0;">Transaction Details:</h4>
            <p><strong>Amount Sent:</strong> ₦${amount.toLocaleString()}</p>
            <p><strong>Fee:</strong> ₦${fee.toLocaleString()}</p>
            <p><strong>Total Deducted:</strong> ₦${totalDeduction.toLocaleString()}</p>
            <p><strong>Recipient Name:</strong> ${recipientName}</p>
            <p><strong>Account Number:</strong> ${recipientAccount}</p>
            <p><strong>Bank:</strong> ${bankName}</p>
            <p><strong>Transaction ID:</strong> ${transactionId || "N/A"}</p>
            <p><strong>Date:</strong> ${new Date().toLocaleString()}</p>
            <p><strong>Status:</strong> <span style="color: ${statusColor}; font-weight: bold;">
              ${
                status === "success"
                  ? "Success"
                  : status === "processing" || status === "pending"
                  ? "Processing"
                  : "Failed"
              }
            </span></p>
            ${
              status === "failed"
                ? `<p><strong>Reason:</strong> ${
                    errorDetail || "Transaction failed"
                  }</p>`
                : ""
            }
          </div>
          
          ${
            status === "success"
              ? `<p style="color: #64748b;">
                  The funds should reflect in your beneficiary's bank account shortly.
                  If there are any issues, please contact our support team.
                </p>`
              : ""
          }
          
          ${
            status === "processing" || status === "pending"
              ? `<p style="color: #64748b;">
                  You will receive another notification once the transaction is completed.
                  This usually takes just a few moments.
                </p>`
              : ""
          }
          
          ${
            status === "failed" &&
            (errorDetail?.includes("refunded") ||
              errorDetail?.includes("refund"))
              ? '<p style="color: #22c55e; font-weight: bold;">✅ Your wallet has been refunded successfully.</p>'
              : ""
          }
          
          <p>Thank you for using Zidwell!</p>
          
          <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;">
          <p style="color: #64748b; font-size: 14px;">
            Best regards,<br>
            <strong>Zidwell Team</strong>
          </p>
        </div>
      `,
    });

    console.log(
      `💰 Withdrawal email notification sent to ${user.email} for ${status} transaction`
    );
  } catch (emailError) {
    console.error("Failed to send withdrawal email notification:", emailError);
  }
}

export async function POST(req: Request) {
  try {
    const {
      userId,
      senderName,
      senderAccountNumber,
      senderBankName,
      amount, // Amount recipient should receive
      accountNumber,
      accountName,
      bankCode,
      bankName,
      narration,
      pin,
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

    // ✅ Calculate fees server-side for consistency
    const feeCalculation = calculateWithdrawalFees(amount);
    const recipientAmount = feeCalculation.amount;
    const nombaFee = feeCalculation.nombaFee;
    const zidwellFee = feeCalculation.zidwellFee;
    const totalFees = feeCalculation.totalFees;
    const totalDeduction = feeCalculation.totalDeduction;

    console.log("💰 Server-side Fee Calculation:", {
      amount_to_recipient: recipientAmount,
      nomba_fee: nombaFee,
      zidwell_fee: zidwellFee,
      total_fees: totalFees,
      total_deduction: totalDeduction,
      calculation: `₦${recipientAmount} (to recipient) + ₦${totalFees} (fees) = ₦${totalDeduction} total`,
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
            amount_to_recipient: recipientAmount,
            nomba_fee: nombaFee,
            zidwell_fee: zidwellFee,
            total_fees: totalFees,
            total_required: totalDeduction,
          }
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

    // ✅ Insert pending transaction with clear fee breakdown
    const { data: pendingTx, error: txError } = await supabase
      .from("transactions")
      .insert({
        user_id: userId,
        type: "withdrawal",
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
        amount: recipientAmount, // Amount to recipient
        fee: totalFees, // Total fees
        total_deduction: totalDeduction, // Amount + fees
        status: "pending",
        narration: narration || `Transfer to ${accountName}`,
        merchant_tx_ref: merchantTxRef,
        external_response: {
          fee_breakdown: {
            amount_to_recipient: recipientAmount,
            webhook_expected_amount: recipientAmount, // Critical: Tell webhook what amount to expect
            nomba_fee: nombaFee,
            zidwell_fee: zidwellFee,
            total_fees: totalFees,
            total_deduction: totalDeduction,
            calculation: `₦${recipientAmount} to recipient + ₦${totalFees} fees = ₦${totalDeduction} total`,
            timestamp: new Date().toISOString(),
          },
          withdrawal_details: {
            account_name: accountName,
            account_number: accountNumber,
            bank_name: bankName,
            bank_code: bankCode,
            narration: narration,
            initiated_at: new Date().toISOString(),
          }
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

    // ✅ Deduct wallet balance first (amount + fees)
    const { error: rpcError } = await supabase.rpc("deduct_wallet_balance", {
      user_id: pendingTx.user_id,
      amt: totalDeduction,
      transaction_type: "withdrawal",
      reference: merchantTxRef,
      description: `Transfer of ₦${recipientAmount} to ${accountName} (includes ₦${totalFees} fees)`,
    });

    if (rpcError) {
      console.error("❌ Failed to deduct wallet balance:", rpcError);
      
      // Clean up pending transaction
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
        amount: recipientAmount, // Send amount to recipient
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
      amount_sent: recipientAmount,
      merchant_tx_ref: merchantTxRef,
    });

    // ✅ Handle immediate Nomba failure (webhook won't be called for these)
    if (data.code === "400" || data.status === "failed" || !res.ok) {
      console.log("❌ Nomba transfer failed immediately:", data.description || data.message);

      // Update transaction to failed
      await supabase
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

      // Refund wallet balance
      const { error: refundErr } = await supabase.rpc("increment_wallet_balance", {
        user_id: user.id,
        amt: totalDeduction, // Add back the total deducted amount
      });

      if (refundErr) {
        console.error("❌ Refund failed:", refundErr);

        // Send failure email without refund
        await sendWithdrawalEmailNotification(
          userId,
          "failed",
          recipientAmount,
          totalFees,
          totalDeduction,
          accountName,
          accountNumber,
          bankName,
          pendingTx.id,
          data.description || data.message || "Transfer failed. Refund pending."
        );

        return NextResponse.json(
          { 
            success: false,
            message: "Transfer failed, refund pending", 
            nomba_response: data,
            fee_breakdown: {
              amount_to_recipient: recipientAmount,
              fees: totalFees,
              total_deducted: totalDeduction,
            },
            merchant_tx_ref: merchantTxRef,
          },
          { status: 400 }
        );
      }

      // Send failure email with refund (webhook won't be called for immediate failures)
      await sendWithdrawalEmailNotification(
        userId,
        "failed",
        recipientAmount,
        totalFees,
        totalDeduction,
        accountName,
        accountNumber,
        bankName,
        pendingTx.id,
        data.description || data.message || "Transfer failed. Funds refunded successfully."
      );

      return NextResponse.json(
        {
          success: false,
          message: "Transfer failed, funds refunded successfully.",
          reason: data.description || data.message || "Transfer not successful",
          refunded: true,
          refund_amount: totalDeduction,
          fee_breakdown: {
            amount_to_recipient: recipientAmount,
            fees: totalFees,
            total_deducted: totalDeduction,
          },
          merchant_tx_ref: merchantTxRef,
        },
        { status: 400 }
      );
    }

    // ✅ If request accepted, update transaction to processing
    await supabase
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

    // ✅ Send processing email only (success/failure emails will come from webhook)
    await sendWithdrawalEmailNotification(
      userId,
      "processing",
      recipientAmount,
      totalFees,
      totalDeduction,
      accountName,
      accountNumber,
      bankName,
      pendingTx.id
    );

    return NextResponse.json({
      success: true,
      message: "Transfer initiated successfully.",
      transactionId: pendingTx.id,
      merchantTxRef,
      fee_breakdown: {
        amount_to_recipient: recipientAmount,
        nomba_fee: nombaFee,
        zidwell_fee: zidwellFee,
        total_fees: totalFees,
        total_deducted: totalDeduction,
      },
      note: `₦${recipientAmount} will be sent to ${accountName}. Total of ₦${totalDeduction} deducted from your wallet (includes ₦${totalFees} fees).`,
      nomba_response: data,
    });
  } catch (error: any) {
    console.error("🔥 Transfer API error:", error);
    return NextResponse.json(
      { 
        success: false,
        error: "Server error",
        message: error.message || error.description || "Internal server error" 
      },
      { status: 500 }
    );
  }
}