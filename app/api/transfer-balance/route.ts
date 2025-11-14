import { NextResponse } from "next/server";
import { getNombaToken } from "@/lib/nomba";
import { createClient } from "@supabase/supabase-js";
import bcrypt from "bcryptjs";
import { transporter } from "@/lib/node-mailer";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

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
      console.error("Failed to fetch user for withdrawal email notification:", error);
      return;
    }

    const subject =
      status === "success"
        ? `Withdrawal Successful - ₦${amount.toLocaleString()}`
        : status === "processing" || status === "pending"
        ? `Withdrawal Processing - ₦${amount.toLocaleString()}`
        : `Withdrawal Failed - ₦${amount.toLocaleString()}`;

    const greeting = user.first_name ? `Hi ${user.first_name},` : "Hello,";

    const successBody = `
${greeting}

Your withdrawal was successful!

💰 Transaction Details:
• Amount: ₦${amount.toLocaleString()}
• Fee: ₦${fee.toLocaleString()}
• Total Deducted: ₦${totalDeduction.toLocaleString()}
• Recipient: ${recipientName}
• Account Number: ${recipientAccount}
• Bank: ${bankName}
• Transaction ID: ${transactionId || "N/A"}
• Date: ${new Date().toLocaleString()}

The funds should reflect in your bank account shortly.

Thank you for using Zidwell!

Best regards,
Zidwell Team
    `;

    const processingBody = `
${greeting}

Your withdrawal is being processed. This usually takes a few moments.

💰 Transaction Details:
• Amount: ₦${amount.toLocaleString()}
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

Your withdrawal failed.

💰 Transaction Details:
• Amount: ₦${amount.toLocaleString()}
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
      status === "success" ? successBody :
      (status === "processing" || status === "pending") ? processingBody : failedBody;

    const statusColor = 
      status === "success" ? "#22c55e" :
      (status === "processing" || status === "pending") ? "#f59e0b" : "#ef4444";

    const statusIcon = 
      status === "success" ? "✅" :
      (status === "processing" || status === "pending") ? "🟡" : "❌";

    const statusText = 
      status === "success" ? "Withdrawal Successful" :
      (status === "processing" || status === "pending") ? "Withdrawal Processing" : "Withdrawal Failed";

    await transporter.sendMail({
      from: process.env.EMAIL_FROM || '"Zidwell" <notifications@zidwell.com>',
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
            <p><strong>Amount:</strong> ₦${amount.toLocaleString()}</p>
            <p><strong>Fee:</strong> ₦${fee.toLocaleString()}</p>
            <p><strong>Total Deducted:</strong> ₦${totalDeduction.toLocaleString()}</p>
            <p><strong>Recipient Name:</strong> ${recipientName}</p>
            <p><strong>Account Number:</strong> ${recipientAccount}</p>
            <p><strong>Bank:</strong> ${bankName}</p>
            <p><strong>Transaction ID:</strong> ${transactionId || "N/A"}</p>
            <p><strong>Date:</strong> ${new Date().toLocaleString()}</p>
            <p><strong>Status:</strong> <span style="color: ${statusColor}; font-weight: bold;">
              ${status === "success" ? "Success" : (status === "processing" || status === "pending") ? "Processing" : "Failed"}
            </span></p>
            ${
              status === "failed"
                ? `<p><strong>Reason:</strong> ${errorDetail || "Transaction failed"}</p>`
                : ""
            }
          </div>
          
          ${
            status === "success"
              ? `<p style="color: #64748b;">
                  The funds should reflect in your bank account shortly.
                  If there are any issues, please contact our support team.
                </p>`
              : ""
          }
          
          ${
            (status === "processing" || status === "pending")
              ? `<p style="color: #64748b;">
                  You will receive another notification once the transaction is completed.
                  This usually takes just a few moments.
                </p>`
              : ""
          }
          
          ${
            status === "failed" && (errorDetail?.includes("refunded") || errorDetail?.includes("refund"))
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
      bankName,
      bankCode,
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
      return NextResponse.json({ message: "Invalid transaction PIN" }, { status: 401 });
    }

    const totalDeduction = totalDebit || amount + fee;
    if (user.wallet_balance < totalDeduction) {
      return NextResponse.json(
        { message: "Insufficient wallet balance (including fees)" },
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

    // ✅ Insert pending transaction
    const { data: pendingTx, error: txError } = await supabase
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
        status: "pending",
        narration: narration || "Withdrawal",
        merchant_tx_ref: merchantTxRef,
      })
      .select("*")
      .single();

    if (txError || !pendingTx) {
      return NextResponse.json({ error: "Could not create transaction record" }, { status: 500 });
    }

    // ✅ Deduct wallet balance first
    const { error: rpcError } = await supabase.rpc("deduct_wallet_balance", {
      user_id: pendingTx.user_id,
      amt: totalDeduction,
      transaction_type: "withdrawal",
      reference: merchantTxRef,
      description: `Withdrawal of ₦${amount} (fee ₦${fee})`,
    });

    if (rpcError) {
      return NextResponse.json({ error: "Failed to deduct wallet balance" }, { status: 500 });
    }

    // ✅ Call Nomba transfer API
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

    const data = await res.json();
    // console.log("transfer data", data);

    // ✅ Handle failure immediately
    if (data.code === "400") {
      console.log("❌ Nomba transfer failed:", data.description);

      // Update transaction to failed
      await supabase
        .from("transactions")
        .update({
          status: "failed",
          external_response: data,
        })
        .eq("id", pendingTx.id);

      // Refund wallet balance (reverse previous deduction)
      const refundReference = `refund_${merchantTxRef}`;
      const { error: refundErr } = await supabase.rpc("deduct_wallet_balance", {
        user_id: user.id,
        amt: -totalDeduction, 
        transaction_type: "credit",
        reference: refundReference,
        description: `Refund for failed withdrawal of ₦${amount} (fee ₦${fee})`,
      });

      if (refundErr) {
        console.error("❌ Refund failed:", refundErr);
        
        // Send failure email without refund
        await sendWithdrawalEmailNotification(
          userId,
          "failed",
          amount,
          fee,
          totalDeduction,
          accountName,
          accountNumber,
          bankName,
          pendingTx.id,
          data.description || "Transfer failed. Refund pending."
        );
        
        return NextResponse.json(
          { message: "Transfer failed, refund pending", nombaResponse: data },
          { status: 400 }
        );
      }

      // Send failure email with refund
      await sendWithdrawalEmailNotification(
        userId,
        "failed",
        amount,
        fee,
        totalDeduction,
        accountName,
        accountNumber,
        bankName,
        pendingTx.id,
        data.description || "Transfer failed. Funds refunded successfully."
      );

      return NextResponse.json(
        {
          message: "Withdrawal failed, funds refunded successfully.",
          reason: data.description || "Transfer not successful",
          refunded: true,
        },
        { status: 400 }
      );
    }

    // ✅ If success, update transaction to processing
    await supabase
      .from("transactions")
      .update({
        status: "processing",
        reference: data?.data?.reference || null,
        external_response: data,
      })
      .eq("id", pendingTx.id);

    // Send processing email notification
    await sendWithdrawalEmailNotification(
      userId,
      "processing",
      amount,
      fee,
      totalDeduction,
      accountName,
      accountNumber,
      bankName,
      pendingTx.id
    );

    return NextResponse.json({
      message: "Withdrawal initiated successfully.",
      transactionId: pendingTx.id,
      merchantTxRef,
      nombaResponse: data,
    });
  } catch (error: any) {
    console.error("Withdraw API error:", error); 
    return NextResponse.json(
      { error: "Server error: " + (error.message || error.description) },
      { status: 500 }
    );
  }
}