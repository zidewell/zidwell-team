import { NextRequest, NextResponse } from "next/server";
import axios from "axios";
import { getNombaToken } from "@/lib/nomba";
import { createClient } from "@supabase/supabase-js";
import bcrypt from "bcryptjs";
import { transporter } from "@/lib/node-mailer";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// User cache
const userCache = new Map();

async function getCachedUser(userId: string) {
  const cacheKey = `user_${userId}`;
  const cached = userCache.get(cacheKey);

  // Check if cache exists and is less than 2 minutes old
  if (cached && Date.now() - cached.timestamp < 2 * 60 * 1000) {
    return cached.data;
  }

  // Fetch fresh data
  const { data: user, error } = await supabase
    .from("users")
    .select("transaction_pin, wallet_balance, email, first_name")
    .eq("id", userId)
    .single();

  if (user && !error) {
    userCache.set(cacheKey, {
      data: user,
      timestamp: Date.now(),
    });
  }

  return user;
}

// Email notification function for money transfer
async function sendMoneyTransferEmailNotification(
  userId: string,
  status: "success" | "failed" | "pending",
  amount: number,
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
      console.error("Failed to fetch user for money transfer email notification:", error);
      return;
    }

    const subject =
      status === "success"
        ? `Money Transfer Successful - ₦${amount.toLocaleString()}`
        : status === "pending"
        ? `Money Transfer Processing - ₦${amount.toLocaleString()}`
        : `Money Transfer Failed - ₦${amount.toLocaleString()}`;

    const greeting = user.first_name ? `Hi ${user.first_name},` : "Hello,";

    const successBody = `
${greeting}

Your money transfer was successful!

💰 Transaction Details:
• Amount: ₦${amount.toLocaleString()}
• Recipient: ${recipientName}
• Account Number: ${recipientAccount}
• Bank: ${bankName}
• Transaction ID: ${transactionId || "N/A"}
• Date: ${new Date().toLocaleString()}

The funds should reflect in the recipient's account shortly.

Thank you for using Zidwell!

Best regards,
Zidwell Team
    `;

    const pendingBody = `
${greeting}

Your money transfer is being processed. This usually takes a few moments.

💰 Transaction Details:
• Amount: ₦${amount.toLocaleString()}
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

Your money transfer failed.

💰 Transaction Details:
• Amount: ₦${amount.toLocaleString()}
• Recipient: ${recipientName}
• Account Number: ${recipientAccount}
• Bank: ${bankName}
• Transaction ID: ${transactionId || "N/A"}
• Date: ${new Date().toLocaleString()}
• Status: ${errorDetail || "Transaction failed"}

Please contact support if you have any questions.

Best regards,
Zidwell Team
    `;

    const emailBody = 
      status === "success" ? successBody :
      status === "pending" ? pendingBody : failedBody;

    const statusColor = 
      status === "success" ? "#22c55e" :
      status === "pending" ? "#f59e0b" : "#ef4444";

    const statusIcon = 
      status === "success" ? "✅" :
      status === "pending" ? "🟡" : "❌";

    const statusText = 
      status === "success" ? "Money Transfer Successful" :
      status === "pending" ? "Money Transfer Processing" : "Money Transfer Failed";

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
            <p><strong>Recipient Name:</strong> ${recipientName}</p>
            <p><strong>Account Number:</strong> ${recipientAccount}</p>
            <p><strong>Bank:</strong> ${bankName}</p>
            <p><strong>Transaction ID:</strong> ${transactionId || "N/A"}</p>
            <p><strong>Date:</strong> ${new Date().toLocaleString()}</p>
            <p><strong>Status:</strong> <span style="color: ${statusColor}; font-weight: bold;">
              ${status === "success" ? "Success" : status === "pending" ? "Processing" : "Failed"}
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
                  The funds should reflect in the recipient's account shortly.
                  If there are any issues, please contact our support team.
                </p>`
              : ""
          }
          
          ${
            status === "pending" 
              ? `<p style="color: #64748b;">
                  You will receive another notification once the transaction is completed.
                  This usually takes just a few moments.
                </p>`
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
      `💰 Money transfer email notification sent to ${user.email} for ${status} transaction`
    );
  } catch (emailError) {
    console.error("Failed to send money transfer email notification:", emailError);
  }
}

export async function POST(req: NextRequest) {
  let transactionId: string | null = null;
  let userId: string | undefined;
  let amount: number | undefined;
  let recipientName: string | undefined;
  let recipientAccount: string | undefined;
  let bankName: string | undefined;
  let merchantTxRef: string | undefined;

  try {
    const body = await req.json();
    userId = body.userId;
    amount = body.amount;
    recipientName = body.recipientName;
    recipientAccount = body.recipientAccount;
    bankName = body.bankName;
    merchantTxRef = body.merchantTxRef;
    const { pin, narration } = body;

    // Validate required fields
    if (!userId || !pin || !amount || amount < 100 || !recipientName || !recipientAccount || !bankName) {
      return NextResponse.json(
        {
          message:
            "Invalid input: userId, pin, amount (>= 100), recipientName, recipientAccount, and bankName are required",
        },
        { status: 400 }
      );
    }

    // Generate merchantTxRef if not provided
    const finalMerchantTxRef = merchantTxRef || `TRANSFER-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    console.log("💰 Starting money transfer:", {
      userId,
      amount,
      recipientName,
      recipientAccount,
      bankName,
      merchantTxRef: finalMerchantTxRef
    });

    // Get Nomba token (if using Nomba for transfers)
    const token = await getNombaToken();
    if (!token) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    // Fetch user with cached version
    const user = await getCachedUser(userId);
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Verify transaction PIN
    const plainPin = Array.isArray(pin) ? pin.join("") : pin;
    const isValid = await bcrypt.compare(plainPin, user.transaction_pin);
    if (!isValid) {
      return NextResponse.json(
        { message: "Invalid Transaction PIN" },
        { status: 401 }
      );
    }

    // Check wallet balance
    if (user.wallet_balance < amount) {
      return NextResponse.json(
        { message: "Insufficient wallet balance" },
        { status: 400 }
      );
    }

    // Deduct wallet using RPC and create transaction
    const { data: rpcResult, error: rpcError } = await supabase.rpc(
      "deduct_wallet_balance",
      {
        user_id: userId,
        amt: amount,
        transaction_type: "transfer",
        reference: finalMerchantTxRef,
        description: narration || `Transfer to ${recipientName} (${recipientAccount})`,
      }
    );

    if (rpcError) {
      console.error("RPC Deduction Error:", rpcError);
      return NextResponse.json(
        { message: "Wallet deduction failed", detail: rpcError.message },
        { status: 500 }
      );
    }

    if (rpcResult[0].status !== "OK") {
      return NextResponse.json(
        { message: "Insufficient wallet balance" },
        { status: 400 }
      );
    }

    // Transaction ID from RPC
    transactionId = rpcResult[0].tx_id;
    console.log("💰 Wallet deducted, transaction created:", transactionId);

    // Call Money Transfer API (Nomba or your transfer provider)
    console.log("📡 Calling Transfer API...");
    const response = await axios.post(
      `${process.env.NOMBA_URL}/v1/transfer`, // Adjust endpoint as needed
      {
        amount,
        recipientName,
        recipientAccount,
        bankName,
        merchantTxRef: finalMerchantTxRef,
        narration: narration || `Transfer to ${recipientName}`,
      },
      {
        headers: {
          accountId: process.env.NOMBA_ACCOUNT_ID!,
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        timeout: 30000,
      }
    );

    console.log("💰 Transfer API Response received:", {
      code: response.data?.code,
      status: response.data?.status,
      description: response.data?.description
    });

    // Determine transaction status based on transfer response
    const responseCode = response.data?.code?.toString();
    const transferStatus = response.data?.status;
    const responseDescription = response.data?.description || "";

    let transactionStatus = "success";
    let emailStatus: "success" | "pending" | "failed" = "success";

    if (responseCode === "00" && responseDescription === "SUCCESS") {
      transactionStatus = "success";
      emailStatus = "success";
      console.log("🟢 Money transfer marked as SUCCESS");
    } 
    else if (responseCode === "00") {
      transactionStatus = "pending";
      emailStatus = "pending";
      console.log("🟡 Money transfer set to PENDING");
    }
    else if (transferStatus === "SUCCESS" || transferStatus === "Success" || transferStatus === "Completed") {
      transactionStatus = "success";
      emailStatus = "success";
      console.log("🟢 Money transfer marked as SUCCESS");
    } 
    else if (transferStatus === "Processing" || transferStatus === "PENDING") {
      transactionStatus = "pending";
      emailStatus = "pending";
      console.log("🟡 Money transfer set to PENDING");
    }
    else if (transferStatus === "Failed" || transferStatus === "FAILED") {
      transactionStatus = "failed";
      emailStatus = "failed";
      console.log("🔴 Money transfer marked as FAILED");
    }
    else {
      transactionStatus = "pending";
      emailStatus = "pending";
      console.log("🟡 Money transfer set to PENDING - default for unknown status");
    }

    // Store additional data for webhook processing
    const externalData = {
      ...response.data,
      recipientName,
      recipientAccount,
      bankName,
      userId,
      originalMerchantTxRef: finalMerchantTxRef
    };

    // Update transaction status based on response
    const { error: updateError } = await supabase
      .from("transactions")
      .update({ 
        status: transactionStatus,
        external_response: externalData,
        merchant_tx_ref: finalMerchantTxRef,
        narration: narration || `Transfer to ${recipientName} (${bankName})`
      })
      .eq("id", transactionId);

    if (updateError) {
      console.error("❌ Failed to update transaction status:", updateError);
      // Continue anyway - don't fail the whole request
    }

    // Send appropriate email notification
    await sendMoneyTransferEmailNotification(
      userId,
      emailStatus,
      amount,
      recipientName,
      recipientAccount,
      bankName,
      transactionId || undefined
    );

    console.log("✅ Money transfer processed successfully:", {
      transactionId,
      status: transactionStatus,
      transferStatus,
      merchantTxRef: finalMerchantTxRef
    });

    return NextResponse.json({
      message: `Money transfer ${transactionStatus}`,
      status: transactionStatus,
      transfer_status: transferStatus,
      transactionId: transactionId,
      merchantTxRef: finalMerchantTxRef,
      data: response.data,
    });

  } catch (error: any) {
    console.error(
      "Money Transfer Error:",
      error.response?.data || error.message
    );

    const errorDetail = error.response?.data?.message || error.message;

    // Update transaction status to failed without refund
    if (transactionId) {
      await supabase
        .from("transactions")
        .update({ 
          status: "failed",
          external_response: {
            error: errorDetail,
            stack: error.stack
          }
        })
        .eq("id", transactionId);
    }

    // Send failure email notification
    if (userId && amount && recipientName && recipientAccount && bankName) {
      await sendMoneyTransferEmailNotification(
        userId,
        "failed",
        amount,
        recipientName,
        recipientAccount,
        bankName,
        transactionId || undefined,
        `Transaction failed: ${errorDetail}`
      );
    }

    return NextResponse.json(
      {
        message: "Money transfer failed",
        detail: errorDetail,
        transactionId: transactionId || null,
      },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const transactionId = searchParams.get('transactionId');
    const merchantTxRef = searchParams.get('merchantTxRef');

    if (!transactionId && !merchantTxRef) {
      return NextResponse.json(
        { message: "transactionId or merchantTxRef is required" },
        { status: 400 }
      );
    }

    let query = supabase
      .from("transactions")
      .select("*")
      .eq("type", "transfer");

    if (transactionId) {
      query = query.eq("id", transactionId);
    } else if (merchantTxRef) {
      query = query.eq("merchant_tx_ref", merchantTxRef);
    }

    const { data: transaction, error } = await query.single();

    if (error) {
      return NextResponse.json(
        { message: "Transaction not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      transactionId: transaction.id,
      status: transaction.status,
      amount: transaction.amount,
      createdAt: transaction.created_at,
      updatedAt: transaction.updated_at,
      merchantTxRef: transaction.merchant_tx_ref,
      externalResponse: transaction.external_response,
      narration: transaction.narration
    });

  } catch (error: any) {
    console.error("Check transfer status error:", error);
    return NextResponse.json(
      { message: "Failed to check transfer status" },
      { status: 500 }
    );
  }
}