// // app/api/webhook/route.ts
// import { NextRequest, NextResponse } from "next/server";
// import { createHmac, timingSafeEqual } from "crypto";
// import { createClient } from "@supabase/supabase-js";
// import { getNombaToken } from "@/lib/nomba";
// import {
//   sendInvoiceCreatorNotification,
//   sendPaymentSuccessEmail,
// } from "@/lib/invoice-email-confirmation";
// import { transporter } from "@/lib/node-mailer";

// const supabase = createClient(
//   process.env.SUPABASE_URL!,
//   process.env.SUPABASE_SERVICE_ROLE_KEY!
// );

// const baseUrl =
//   process.env.NODE_ENV === "development"
//     ? process.env.NEXT_PUBLIC_DEV_URL
//     : process.env.NEXT_PUBLIC_BASE_URL;

// const NOMBA_SIGNATURE_KEY = process.env.NOMBA_SIGNATURE_KEY!;

// function safeNum(v: any) {
//   const n = Number(v);
//   return Number.isFinite(n) ? n : 0;
// }

// async function sendVirtualAccountDepositEmailNotification(
//   userId: string,
//   amount: number,
//   transactionId: string,
//   bankName: string,
//   accountNumber: string,
//   accountName: string
// ) {
//   try {
//     // Fetch user email
//     const { data: user, error } = await supabase
//       .from("users")
//       .select("email, first_name")
//       .eq("id", userId)
//       .single();

//     if (error || !user) {
//       console.error(
//         "Failed to fetch user for virtual account deposit email notification:",
//         error
//       );
//       return;
//     }

//     const subject = `Virtual Account Deposit Received - ₦${amount.toLocaleString()}`;
//     const greeting = user.first_name ? `Hi ${user.first_name},` : "Hello,";

//     const emailBody = `
// ${greeting}

// Your virtual account deposit was successful!

// 💰 Transaction Details:
// • Amount: ₦${amount.toLocaleString()}
// • Bank: ${bankName}
// • Account Number: ${accountNumber}
// • Account Name: ${accountName}
// • Transaction ID: ${transactionId}
// • Date: ${new Date().toLocaleString()}

// The funds have been credited to your Zidwell wallet and are ready to use.

// Thank you for using Zidwell!

// Best regards,
// Zidwell Team
//     `;

//     await transporter.sendMail({
//       from: process.env.EMAIL_FROM || '"Zidwell" <notifications@zidwell.com>',
//       to: user.email,
//       subject,
//       text: emailBody,
//       html: `
//         <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
//           <p>${greeting}</p>

//           <h3 style="color: #22c55e;">
//             ✅ Virtual Account Deposit Successful
//           </h3>

//           <div style="background: #f8fafc; padding: 15px; border-radius: 8px; margin: 15px 0;">
//             <h4 style="margin-top: 0;">Transaction Details:</h4>
//             <p><strong>Amount:</strong> ₦${amount.toLocaleString()}</p>
//             <p><strong>Bank:</strong> ${bankName}</p>
//             <p><strong>Account Number:</strong> ${accountNumber}</p>
//             <p><strong>Account Name:</strong> ${accountName}</p>
//             <p><strong>Transaction ID:</strong> ${transactionId}</p>
//             <p><strong>Date:</strong> ${new Date().toLocaleString()}</p>
//             <p><strong>Status:</strong> <span style="color: #22c55e; font-weight: bold;">Success</span></p>
//           </div>

//           <p style="color: #64748b;">
//             The funds have been credited to your Zidwell wallet and are ready to use.
//           </p>

//           <p>Thank you for using Zidwell!</p>

//           <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;">
//           <p style="color: #64748b; font-size: 14px;">
//             Best regards,<br>
//             <strong>Zidwell Team</strong>
//           </p>
//         </div>
//       `,
//     });

//     console.log(
//       `💰 Virtual account deposit email notification sent to ${user.email} for ₦${amount}`
//     );
//   } catch (emailError) {
//     console.error(
//       "Failed to send virtual account deposit email notification:",
//       emailError
//     );
//   }
// }

// async function sendWithdrawalEmailNotification(
//   userId: string,
//   status: "success" | "failed",
//   amount: number,
//   fee: number,
//   totalDeduction: number,
//   recipientName: string,
//   recipientAccount: string,
//   bankName: string,
//   transactionId?: string,
//   errorDetail?: string
// ) {
//   try {
//     // Fetch user email
//     const { data: user, error } = await supabase
//       .from("users")
//       .select("email, first_name")
//       .eq("id", userId)
//       .single();

//     if (error || !user) {
//       console.error(
//         "Failed to fetch user for withdrawal email notification:",
//         error
//       );
//       return;
//     }

//     const subject =
//       status === "success"
//         ? `Withdrawal Successful - ₦${amount.toLocaleString()}`
//         : `Withdrawal Failed - ₦${amount.toLocaleString()}`;

//     const greeting = user.first_name ? `Hi ${user.first_name},` : "Hello,";

//     const successBody = `
// ${greeting}

// Your withdrawal was successful!

// 💰 Transaction Details:
// • Amount: ₦${amount.toLocaleString()}
// • Fee: ₦${fee.toLocaleString()}
// • Total Deducted: ₦${totalDeduction.toLocaleString()}
// • Recipient: ${recipientName}
// • Account Number: ${recipientAccount}
// • Bank: ${bankName}
// • Transaction ID: ${transactionId || "N/A"}
// • Date: ${new Date().toLocaleString()}

// The funds should reflect in your bank account shortly.

// Thank you for using Zidwell!

// Best regards,
// Zidwell Team
//     `;

//     const failedBody = `
// ${greeting}

// Your withdrawal failed.

// 💰 Transaction Details:
// • Amount: ₦${amount.toLocaleString()}
// • Fee: ₦${fee.toLocaleString()}
// • Total Deducted: ₦${totalDeduction.toLocaleString()}
// • Recipient: ${recipientName}
// • Account Number: ${recipientAccount}
// • Bank: ${bankName}
// • Transaction ID: ${transactionId || "N/A"}
// • Date: ${new Date().toLocaleString()}
// • Status: ${errorDetail || "Transaction failed"}

// ${
//   errorDetail?.includes("refunded") || errorDetail?.includes("refund")
//     ? "✅ Your wallet has been refunded successfully."
//     : "Please contact support if you have any questions."
// }

// Best regards,
// Zidwell Team
//     `;

//     const emailBody = status === "success" ? successBody : failedBody;

//     const statusColor = status === "success" ? "#22c55e" : "#ef4444";
//     const statusIcon = status === "success" ? "✅" : "❌";
//     const statusText =
//       status === "success" ? "Withdrawal Successful" : "Withdrawal Failed";

//     await transporter.sendMail({
//       from: process.env.EMAIL_FROM || '"Zidwell" <notifications@zidwell.com>',
//       to: user.email,
//       subject,
//       text: emailBody,
//       html: `
//         <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
//           <p>${greeting}</p>

//           <h3 style="color: ${statusColor};">
//             ${statusIcon} ${statusText}
//           </h3>

//           <div style="background: #f8fafc; padding: 15px; border-radius: 8px; margin: 15px 0;">
//             <h4 style="margin-top: 0;">Transaction Details:</h4>
//             <p><strong>Amount:</strong> ₦${amount.toLocaleString()}</p>
//             <p><strong>Fee:</strong> ₦${fee.toLocaleString()}</p>
//             <p><strong>Total Deducted:</strong> ₦${totalDeduction.toLocaleString()}</p>
//             <p><strong>Recipient Name:</strong> ${recipientName}</p>
//             <p><strong>Account Number:</strong> ${recipientAccount}</p>
//             <p><strong>Bank:</strong> ${bankName}</p>
//             <p><strong>Transaction ID:</strong> ${transactionId || "N/A"}</p>
//             <p><strong>Date:</strong> ${new Date().toLocaleString()}</p>
//             <p><strong>Status:</strong> <span style="color: ${statusColor}; font-weight: bold;">
//               ${status === "success" ? "Success" : "Failed"}
//             </span></p>
//             ${
//               status === "failed"
//                 ? `<p><strong>Reason:</strong> ${
//                     errorDetail || "Transaction failed"
//                   }</p>`
//                 : ""
//             }
//           </div>

//           ${
//             status === "success"
//               ? `<p style="color: #64748b;">
//                   The funds should reflect in your bank account shortly.
//                   If there are any issues, please contact our support team.
//                 </p>`
//               : ""
//           }

//           ${
//             status === "failed" &&
//             (errorDetail?.includes("refunded") ||
//               errorDetail?.includes("refund"))
//               ? '<p style="color: #22c55e; font-weight: bold;">✅ Your wallet has been refunded successfully.</p>'
//               : ""
//           }

//           <p>Thank you for using Zidwell!</p>

//           <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;">
//           <p style="color: #64748b; font-size: 14px;">
//             Best regards,<br>
//             <strong>Zidwell Team</strong>
//           </p>
//         </div>
//       `,
//     });

//     console.log(
//       `💰 Withdrawal email notification sent to ${user.email} for ${status} transaction`
//     );
//   } catch (emailError) {
//     console.error("Failed to send withdrawal email notification:", emailError);
//   }
// }

// export async function POST(req: NextRequest) {
//   try {
//     console.log("====== Nomba Webhook Triggered ======");

//     // 1) Read raw body and parse
//     const rawBody = await req.text();
//     console.log("🔸 Raw body length:", rawBody?.length);
//     let payload: any;
//     try {
//       payload = JSON.parse(rawBody);
//       console.log("payload", payload);
//     } catch (err) {
//       console.error("❌ Failed to parse JSON body", err);
//       return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
//     }
//     console.log(
//       "🟢 Parsed payload.event_type:",
//       payload?.event_type || payload?.eventType
//     );

//     // 2) Signature verification (HMAC SHA256 -> Base64)
//     const timestamp = req.headers.get("nomba-timestamp");
//     const signature =
//       req.headers.get("nomba-sig-value") || req.headers.get("nomba-signature");

//     if (!timestamp || !signature) {
//       console.warn("❗ Missing Nomba signature headers. Headers:", {
//         "nomba-timestamp": timestamp,
//         "nomba-sig-value": signature,
//       });
//       return NextResponse.json(
//         { error: "Missing signature headers" },
//         { status: 401 }
//       );
//     }

//     // Build hash payload according to Nomba docs (use safe optional chaining)
//     const hashingPayload = `${payload.event_type}:${payload.requestId}:${
//       payload.data?.merchant?.userId || ""
//     }:${payload.data?.merchant?.walletId || ""}:${
//       payload.data?.transaction?.transactionId || ""
//     }:${payload.data?.transaction?.type || ""}:${
//       payload.data?.transaction?.time || ""
//     }:${payload.data?.transaction?.responseCode || ""}`;
//     const message = `${hashingPayload}:${timestamp}`;

//     const hmac = createHmac("sha256", NOMBA_SIGNATURE_KEY);
//     hmac.update(message);
//     const expectedSignature = hmac.digest("base64");

//     // Timing-safe compare
//     const receivedBuffer = Buffer.from(signature, "base64");
//     const expectedBuffer = Buffer.from(expectedSignature, "base64");

//     console.log("🔐 Signature verification: received:", signature);
//     console.log("🔐 Signature verification: expected:", expectedSignature);
//     console.log(
//       "🔐 Same length?:",
//       receivedBuffer.length === expectedBuffer.length
//     );

//     if (
//       receivedBuffer.length !== expectedBuffer.length ||
//       !timingSafeEqual(receivedBuffer, expectedBuffer)
//     ) {
//       console.error("❌ Invalid signature - aborting webhook");
//       return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
//     }
//     console.log("✅ Signature verified");

//     // 3) Normalize fields
//     const eventType: string = payload.event_type || payload.eventType;
//     const tx = payload.data?.transaction || payload.data?.txn || {};
//     const order = payload.data?.order || null;

//     // try several fields for IDs / refs
//     const nombaTransactionId =
//       tx.transactionId || tx.transaction_id || tx.id || tx.reference || null;
//     const merchantTxRef =
//       tx.merchantTxRef ||
//       tx.merchant_tx_ref ||
//       payload.data?.meta?.merchantTxRef ||
//       null;
//     const orderReference =
//       order?.orderReference || order?.order_reference || null;
//     const aliasAccountReference =
//       tx.aliasAccountReference ||
//       tx.alias_account_reference ||
//       tx.aliasAccount ||
//       null;
//     const transactionAmount = safeNum(
//       tx.transactionAmount ?? tx.amount ?? order?.amount ?? 0
//     );
//     const nombaFee = safeNum(tx.fee ?? payload.data?.transaction?.fee ?? 0);
//     const txStatusRaw = (tx.status || payload.data?.status || "").toString();
//     const txStatus = txStatusRaw.toLowerCase();
//     const transactionType = (tx.type || "").toLowerCase();

//     console.log("🔎 eventType:", eventType);
//     console.log("🔎 txType:", transactionType);
//     console.log("🔎 nombaTransactionId:", nombaTransactionId);
//     console.log("🔎 merchantTxRef:", merchantTxRef);
//     console.log("🔎 orderReference:", orderReference);
//     console.log("🔎 aliasAccountReference:", aliasAccountReference);
//     console.log(
//       "🔎 transactionAmount:",
//       transactionAmount,
//       "nombaFee:",
//       nombaFee,
//       "txStatus:",
//       txStatus
//     );

//     const serviceTypes = [
//       "data",
//       "airtime",
//       "cable-tv",
//       "electricity",
//       "utility",
//       "bill",
//       "topup",
//     ];
//     const serviceRefPatterns = [
//       "Data-",
//       "Airtime-",
//       "Cable-",
//       "Electricity-",
//       "Bill-",
//       "Utility-",
//       "Topup-",
//       "AIRTIME-",
//       "DATA-",
//       "CABLE-",
//       "ELECTRICITY-",
//     ];

//     const isServicePurchase =
//       serviceTypes.some((service) => transactionType.includes(service)) ||
//       serviceRefPatterns.some((pattern) => merchantTxRef?.includes(pattern));

//     if (isServicePurchase) {
//       console.log(
//         "📱 Ignoring service purchase (data/airtime/cable/electricity/topup) - already handled by main API"
//       );
//       return NextResponse.json(
//         { message: "Service purchase ignored - already processed by main API" },
//         { status: 200 }
//       );
//     }

//     // Also ignore ALL payout_success events for service purchases regardless of detection
//     if (
//       eventType.includes("payout_success") &&
//       (transactionType.includes("topup") ||
//         merchantTxRef?.includes("AIRTIME-") ||
//         merchantTxRef?.includes("DATA-") ||
//         merchantTxRef?.includes("Airtime-") ||
//         merchantTxRef?.includes("Data-") ||
//         transactionType.includes("airtime") ||
//         transactionType.includes("data"))
//     ) {
//       console.log("📱 Ignoring service purchase payout event");
//       return NextResponse.json(
//         { message: "Service purchase payout event ignored" },
//         { status: 200 }
//       );
//     }

//     // 4) FIXED: Better logic to determine transaction flow
//     console.log("🎯 Determining transaction flow type...");

//     const isCardPayment = Boolean(orderReference);
//     const isVirtualAccountDeposit = Boolean(aliasAccountReference);

//     // FIX: Better detection for deposits vs withdrawals
//     const isDepositEvent =
//       eventType === "payment_success" ||
//       eventType === "payment.succeeded" ||
//       tx.type?.toLowerCase().includes("vact") ||
//       tx.type?.toLowerCase().includes("deposit") ||
//       isCardPayment ||
//       isVirtualAccountDeposit;

//     const isPayoutOrTransfer =
//       (eventType?.toLowerCase()?.includes("payout") && !isServicePurchase) ||
//       (Boolean(merchantTxRef) && !isServicePurchase) ||
//       (tx.type &&
//         tx.type.toLowerCase().includes("transfer") &&
//         !tx.type.toLowerCase().includes("vact"));

//     console.log("   - isCardPayment:", isCardPayment);
//     console.log("   - isVirtualAccountDeposit:", isVirtualAccountDeposit);
//     console.log("   - isDepositEvent:", isDepositEvent);
//     console.log("   - isPayoutOrTransfer:", isPayoutOrTransfer);
//     console.log("   - isServicePurchase:", isServicePurchase);

//     // ---------- DEPOSIT: CARD (orderReference) OR VA ----------
//     if (isDepositEvent) {
//       console.log("💰 Processing DEPOSIT transaction...");

//       // -------------------- SUBSCRIPTION HANDLING --------------------
//       const isSubscription =
//         orderReference?.includes("SUB-") ||
//         payload?.data?.order?.metadata?.type === "subscription";

//       if (isSubscription) {
//         console.log("💰 Processing subscription payment...");

//         const subscriptionId =
//           payload?.data?.order?.metadata?.subscriptionId ||
//           orderReference?.split("-")[1];

//         if (eventType === "payment_success" || txStatus === "success") {
//           // Update subscription status to active
//           const { error: updateError } = await supabase
//             .from("user_subscriptions")
//             .update({
//               status: "active",
//             })
//             .eq("id", subscriptionId);

//           if (!updateError) {
//             console.log(`✅ Subscription activated: ${subscriptionId}`);

//             // Update user's subscription tier
//             const planName = payload?.data?.order?.metadata?.planName;
//             const userId = payload?.data?.order?.metadata?.userId;

//             if (planName && userId) {
//               await supabase
//                 .from("users")
//                 .update({
//                   subscription_tier: planName
//                     .toLowerCase()
//                     .replace(/\s+/g, "_"),
//                   subscription_expires_at: new Date(
//                     new Date().getTime() + 30 * 24 * 60 * 60 * 1000
//                   ).toISOString(),
//                 })
//                 .eq("id", userId);

//               console.log(`✅ User ${userId} updated to ${planName} tier`);
//             }

//             // Send confirmation email
//             const userEmail = payload?.data?.order?.customerEmail;
//             if (userEmail) {
//               try {
//                 await fetch(`${baseUrl}/api/send-email`, {
//                   method: "POST",
//                   headers: { "Content-Type": "application/json" },
//                   body: JSON.stringify({
//                     to: userEmail,
//                     subject: `🎉 Welcome to Zidwell ${planName}!`,
//                     message: `
//                 <h2>Welcome to Zidwell ${planName}!</h2>
//                 <p>Your subscription has been successfully activated and you now have access to all premium features.</p>
//                 <p><strong>Plan:</strong> ${planName}</p>
//                 <p><strong>Status:</strong> Active</p>
//                 <p>Thank you for choosing Zidwell. We're excited to help you grow your business!</p>
//                 <br>
//                 <p>Best regards,<br>The Zidwell Team</p>
//               `,
//                   }),
//                 });
//                 console.log(
//                   `📧 Subscription confirmation email sent to ${userEmail}`
//                 );
//               } catch (emailError) {
//                 console.error("Failed to send subscription email:", emailError);
//               }
//             }
//           } else {
//             console.error("Failed to update subscription:", updateError);
//           }
//         } else if (eventType === "payment_failed" || txStatus === "failed") {
//           // Update subscription status to failed
//           await supabase
//             .from("user_subscriptions")
//             .update({
//               status: "failed",
//             })
//             .eq("id", subscriptionId);

//           console.log(`❌ Subscription payment failed: ${subscriptionId}`);
//         }

//         // Return early since subscription is handled
//         return NextResponse.json({ success: true }, { status: 200 });
//       }
//       // -------------------- END SUBSCRIPTION HANDLING --------------------

//       // -------------------- INVOICE PAYMENT HANDLING --------------------
//       const isInvoicePayment =
//         orderReference ||
//         payload?.data?.order?.callbackUrl?.includes(
//           "/api/invoice-payment-callback"
//         );

//       if (isInvoicePayment) {
//         // console.log("🧾 Processing INVOICE payment...");

//         const txStatus =
//           payload?.data?.transaction?.status || payload.event_type; // Use the actual webhook event_type

//         // console.log("🔍 Payment status check:", {
//         //   eventType,
//         //   txStatus,
//         //   orderReference,
//         //   event_type: payload.event_type
//         // });

//         const isPaymentSuccess =
//           eventType === "payment_success" ||
//           payload.event_type === "payment_success";

//         if (!isPaymentSuccess) {
//           console.error("❌ Payment not successful - Event Type:", eventType);
//           return NextResponse.json(
//             { error: "Payment not successful" },
//             { status: 400 }
//           );
//         }

//         try {
//           const token = await getNombaToken();

//           if (token) {
//             const verifyUrl = `${process.env.NOMBA_URL}/v1/checkout/transaction?orderReference=${orderReference}`;

//             const verifyResponse = await fetch(verifyUrl, {
//               method: "GET",
//               headers: {
//                 "Content-Type": "application/json",
//                 accountId: process.env.NOMBA_ACCOUNT_ID!,
//                 Authorization: `Bearer ${token}`,
//               },
//             });

//             if (verifyResponse.ok) {
//               const verifyData = await verifyResponse.json();

//               const transactionStatus =
//                 verifyData.data?.transactionDetails?.statusCode ||
//                 verifyData.data?.status ||
//                 verifyData.status;

//               const isVerifiedSuccess =
//                 transactionStatus === "success" ||
//                 transactionStatus === "SUCCESS" ||
//                 transactionStatus === "SUCCESSFUL" ||
//                 verifyData.data?.transactionDetails?.status === "SUCCESSFUL" ||
//                 verifyData.success === true;

//               if (isVerifiedSuccess) {
//                 console.log("✅ Payment verified as SUCCESS by Nomba API");
//               } else {
//                 console.log(
//                   "⚠️ Nomba verification inconclusive - Status:",
//                   transactionStatus
//                 );
//               }
//             } else {
//               const errorText = await verifyResponse.text();
//             }
//           } else {
//             console.log("⚠️ No token available, skipping verification");
//           }
//         } catch (verifyError: any) {
//           console.error(
//             "❌ Verification error, but continuing with webhook data:",
//             verifyError.message
//           );
//         }

//         try {
//           let invoiceId: string | null = null;

//           invoiceId = payload?.data?.order?.metadata?.invoiceId;

//           if (!invoiceId && payload?.data?.order?.callbackUrl) {
//             try {
//               const callbackUrl = new URL(payload.data.order.callbackUrl);
//               invoiceId = callbackUrl.searchParams.get("invoiceId");
//             } catch (urlError) {
//               console.error("❌ Error parsing callback URL:", urlError);
//             }
//           }

//           if (!invoiceId) {
//             invoiceId = orderReference;
//           }

//           if (!invoiceId) {
//             console.error("❌ No invoice ID found");
//             return NextResponse.json(
//               { error: "No invoice ID" },
//               { status: 400 }
//             );
//           }

//           // Find invoice in database
//           let invoice: any;
//           const { data: invoiceData, error: invoiceError } = await supabase
//             .from("invoices")
//             .select("*")
//             .eq("invoice_id", invoiceId)
//             .single();

//           if (invoiceError) {
//             console.error("❌ Invoice not found by invoice_id:", invoiceError);

//             // Fallback: try finding by id
//             const { data: fallbackInvoice, error: fallbackError } =
//               await supabase
//                 .from("invoices")
//                 .select("*")
//                 .eq("id", invoiceId)
//                 .single();

//             if (fallbackError || !fallbackInvoice) {
//               console.error("❌ Invoice not found in fallback search");
//               return NextResponse.json(
//                 { error: "Invoice not found" },
//                 { status: 404 }
//               );
//             }

//             invoice = fallbackInvoice;
//           } else {
//             invoice = invoiceData;
//           }

//           // console.log(`✅ Found invoice:`, {
//           //   id: invoice.id,
//           //   invoice_id: invoice.invoice_id,
//           //   total_amount: invoice.total_amount,
//           //   paid_amount: invoice.paid_amount,
//           //   status: invoice.status
//           // });

//           // Check for duplicate payments
//           const { data: existingPayment, error: checkError } = await supabase
//             .from("invoice_payments")
//             .select("*")
//             .or(
//               `nomba_transaction_id.eq.${nombaTransactionId},order_reference.eq.${orderReference}`
//             )
//             .maybeSingle();

//           if (existingPayment) {
//             await updateInvoiceTotals(invoice, transactionAmount);
//             return NextResponse.json({ success: true }, { status: 200 });
//           }

//           if (checkError && checkError.code !== "PGRST116") {
//             console.error("❌ Error checking existing payment:", checkError);
//             return NextResponse.json(
//               { error: "Payment check failed" },
//               { status: 500 }
//             );
//           }

//           const paidAmount = transactionAmount;
//           const customerEmail = payload?.data?.order?.customerEmail;
//           const customerName = payload?.data?.order?.customerName;

//           const newOrderReference =
//             orderReference ||
//             `PAY-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

//           // Create payment record
//           const { data: paymentRecord, error: paymentError } = await supabase
//             .from("invoice_payments")
//             .insert([
//               {
//                 invoice_id: invoice.id,
//                 user_id: invoice.user_id,
//                 order_reference: newOrderReference,
//                 payer_email: customerEmail || invoice.client_email,
//                 payer_name: customerName || invoice.client_name,
//                 amount: paidAmount,
//                 paid_amount: paidAmount,
//                 status: "completed",
//                 payment_link: invoice.payment_link,
//                 nomba_transaction_id: nombaTransactionId,
//                 payment_method: "card_payment",
//                 paid_at: new Date().toISOString(),
//                 is_reusable: true,
//                 payment_attempts: 1,
//                 created_at: new Date().toISOString(),
//               },
//             ])
//             .select()
//             .single();

//           if (paymentError) {
//             console.error("❌ Failed to create payment record:", paymentError);
//             return NextResponse.json(
//               { error: "Payment record failed" },
//               { status: 500 }
//             );
//           }

//           // CREATE TRANSACTION RECORD FOR THE INVOICE CREATOR
//           try {
//             const transactionDescription = `${
//               customerName || "Customer"
//             } paid ₦${paidAmount} for invoice ${invoice.invoice_id}`;

//             const { data: transaction, error: transactionError } =
//               await supabase
//                 .from("transactions")
//                 .insert([
//                   {
//                     user_id: invoice.user_id,
//                     type: "credit",
//                     amount: paidAmount,
//                     status: "success",
//                     reference: `INV-${invoice.invoice_id}-${
//                       nombaTransactionId || orderReference
//                     }`,
//                     description: transactionDescription,
//                     narration: `Payment received for Invoice #${
//                       invoice.invoice_id
//                     } from ${customerName || "customer"}`,
//                     fee: payload?.data?.transaction?.fee || 0,
//                     channel: "invoice_payment",
//                     sender: {
//                       name: customerName,
//                       email: customerEmail,
//                       phone: payload?.data?.customer?.phone || null,
//                       type: "customer",
//                     },
//                     receiver: {
//                       name: invoice.from_name,
//                       email: invoice.from_email,
//                       business: invoice.business_name,
//                       type: "merchant",
//                     },
//                     external_response: {
//                       nomba_transaction_id: nombaTransactionId,
//                       order_reference: orderReference,
//                       payment_method: "card_payment",
//                     },
//                   },
//                 ])
//                 .select()
//                 .single();

//             if (transactionError) {
//               console.error(
//                 "❌ Failed to create transaction record:",
//                 transactionError
//               );
//             } else {
//               console.log(
//                 "✅ Transaction record created for merchant:",
//                 transaction.id
//               );
//             }
//           } catch (transactionError: any) {
//             console.error(
//               "❌ Transaction creation error:",
//               transactionError.message
//             );
//           }

//           // Update invoice totals
//           await updateInvoiceTotals(invoice, paidAmount);

//           // Credit user's wallet
//           console.log(`💰 Crediting wallet: ${invoice.user_id}`);

//           const { error: creditError } = await supabase.rpc(
//             "increment_wallet_balance",
//             {
//               user_id: invoice.user_id,
//               amt: paidAmount,
//             }
//           );

//           if (creditError) {
//             console.error("❌ Failed to credit wallet:", creditError);
//             // Don't fail the entire process if wallet credit fails
//           } else {
//             console.log(
//               `✅ Successfully credited ₦${paidAmount} to user ${invoice.user_id}`
//             );
//           }

//           try {
//             // Get invoice creator's email
//             const { data: creatorData } = await supabase
//               .from("users")
//               .select("email")
//               .eq("id", invoice.user_id)
//               .single();

//             const creatorEmail = creatorData?.email;

//             // Send email to payer
//             if (customerEmail) {
//               sendPaymentSuccessEmail(
//                 customerEmail,
//                 invoice.invoice_id,
//                 paidAmount,
//                 customerName || "Customer",
//                 invoice
//               ).catch((error) =>
//                 console.error("❌ Payer email failed:", error)
//               );
//             } else {
//               console.log(
//                 "⚠️ No customer email available for payment confirmation"
//               );
//             }

//             // Send notification to invoice creator
//             if (creatorEmail) {
//               sendInvoiceCreatorNotification(
//                 creatorEmail,
//                 invoice.invoice_id,
//                 paidAmount,
//                 customerName || "Customer",
//                 customerEmail || "N/A",
//                 invoice
//               ).catch((error) =>
//                 console.error("❌ Creator notification failed:", error)
//               );
//             } else {
//               console.log("⚠️ No creator email available for notification");
//             }

//             console.log("✅ Email sending initiated");
//           } catch (emailError) {
//             console.error(
//               "❌ Email setup error (but payment still processed):",
//               emailError
//             );
//           }

//           return NextResponse.json({ success: true }, { status: 200 });
//         } catch (invoiceError: any) {
//           console.error("❌ Invoice processing error:", invoiceError);
//           return NextResponse.json(
//             { error: "Invoice processing failed" },
//             { status: 500 }
//           );
//         }
//       }
//       // -------------------- END INVOICE PAYMENT HANDLING --------------------

//       // Helper function to update invoice totals
//       async function updateInvoiceTotals(
//         invoice: any,
//         paidAmountNaira: number
//       ) {
//         try {
//           const paidAmount = paidAmountNaira;

//           const targetQty = Number(invoice.target_quantity || 1);
//           const totalAmount = Number(invoice.total_amount || 0);
//           const currentPaidAmount = Number(invoice.paid_amount || 0);
//           const currentPaidQty = Number(invoice.paid_quantity || 0);

//           let newPaidAmount = currentPaidAmount + paidAmount;
//           let newPaidQuantity = currentPaidQty;
//           let newStatus = invoice.status;

//           console.log("📊 Invoice update calculations:", {
//             currentPaidAmount,
//             paidAmount,
//             newPaidAmount,
//             totalAmount,
//             targetQty,
//             currentPaidQty,
//             allow_multiple_payments: invoice.allow_multiple_payments,
//           });

//           if (invoice.allow_multiple_payments) {
//             // FIXED: Calculate how many COMPLETE quantities are paid for
//             const cumulativeQuantitiesPaid = Math.floor(
//               newPaidAmount / totalAmount
//             );

//             console.log(`🔢 Cumulative quantities paid calculation:`, {
//               newPaidAmount,
//               totalAmount,
//               division: newPaidAmount / totalAmount,
//               cumulativeQuantitiesPaid,
//             });

//             // Only update if we have more complete quantities than before
//             if (cumulativeQuantitiesPaid > currentPaidQty) {
//               newPaidQuantity = cumulativeQuantitiesPaid;
//               console.log(
//                 `✅ Quantity increased: ${currentPaidQty} → ${newPaidQuantity}`
//               );
//             }

//             // Check if all quantities are paid
//             if (newPaidQuantity >= targetQty) {
//               newStatus = "paid";
//               console.log("🎯 All quantities paid - marking as fully paid");
//             } else if (newPaidQuantity > 0 || newPaidAmount > 0) {
//               newStatus = "partially_paid";
//               console.log("📦 Partially paid - some quantities completed");
//             }
//           } else {
//             // For single payment invoices
//             if (newPaidAmount >= totalAmount) {
//               newStatus = "paid";
//               console.log("🎯 Full amount paid - marking as paid");
//             } else if (newPaidAmount > 0) {
//               newStatus = "partially_paid";
//               console.log("💰 Partial payment received");
//             }
//           }

//           const updateData: any = {
//             paid_amount: newPaidAmount,
//             paid_quantity: newPaidQuantity,
//             status: newStatus,
//             updated_at: new Date().toISOString(),
//           };

//           if (newStatus === "paid") {
//             updateData.paid_at = new Date().toISOString();
//             console.log("⏰ Setting paid_at timestamp");
//           }

//           console.log("🔄 Updating invoice with data:", updateData);

//           const { error: updateError } = await supabase
//             .from("invoices")
//             .update(updateData)
//             .eq("id", invoice.id);

//           if (updateError) {
//             console.error("❌ Failed to update invoice:", updateError);
//             throw updateError;
//           }

//           console.log("✅ Invoice totals updated successfully:", {
//             invoice_id: invoice.invoice_id,
//             newPaidAmount,
//             newPaidQuantity,
//             targetQty,
//             newStatus,
//           });

//           return { newPaidAmount, newPaidQuantity, newStatus };
//         } catch (error) {
//           console.error("❌ Error in updateInvoiceTotals:", error);
//           throw error;
//         }
//       }

//       // DETERMINE userId & reference for transaction
//       let userId: string | null = null;
//       let referenceToUse: string | null =
//         orderReference || nombaTransactionId || tx.sessionId || null;
//       let txType = isCardPayment ? "card_deposit" : "deposit";
//       let channel = isCardPayment ? "card" : "bank";

//       // console.log(
//       //   "➡️ Handling deposit/card flow. txType:",
//       //   txType,
//       //   "channel:",
//       //   channel
//       // );

//       // For VA: aliasAccountReference === userId (you confirmed)
//       if (isVirtualAccountDeposit) {
//         userId = aliasAccountReference;
//         // for VA there may not be an orderReference; use transactionId as merchant_tx_ref
//         referenceToUse =
//           nombaTransactionId || tx.sessionId || `nomba-${Date.now()}`;
//         txType = "virtual_account_deposit";
//         channel = "virtual_account";
//         console.log("🏦 Virtual Account deposit detected");
//       } else if (isCardPayment) {
//         // Card: find the pending transaction inserted at initialize step using orderReference
//         referenceToUse = orderReference;
//         // find transaction row to get userId
//         const { data: pendingByRef, error: refErr } = await supabase
//           .from("transactions")
//           .select("*")
//           .eq("reference", referenceToUse)
//           .maybeSingle();

//         if (refErr) {
//           console.error("❌ Supabase error finding orderReference:", refErr);
//           return NextResponse.json({ error: "DB error" }, { status: 500 });
//         }

//         if (pendingByRef) {
//           userId = pendingByRef.user_id;
//         } else {
//           // fallback: try to find user by customerEmail if present
//           const customerEmail =
//             order?.customerEmail ||
//             payload.data?.customer?.customerEmail ||
//             null;
//           if (customerEmail) {
//             const { data: userByEmail } = await supabase
//               .from("users")
//               .select("id")
//               .eq("email", customerEmail)
//               .maybeSingle();
//             userId = userByEmail?.id || null;
//           }
//         }
//       }

//       if (!userId) {
//         console.warn(
//           "⚠️ Could not determine userId for deposit. referenceToUse:",
//           referenceToUse
//         );

//         if (aliasAccountReference) {
//           userId = aliasAccountReference;
//           console.log("   - Using aliasAccountReference as userId:", userId);
//         } else {
//           // Nothing we can do reliably
//           console.error("❌ No user to credit - aborting");
//           return NextResponse.json(
//             { message: "No user to credit" },
//             { status: 200 }
//           );
//         }
//       }

//       // console.log(
//       //   "👤 Deposit userId resolved:",
//       //   userId,
//       //   "referenceToUse:",
//       //   referenceToUse
//       // );

//       // ✅ DEPOSIT FEE CALCULATIONS
//       const amount = transactionAmount;

//       // NO APP FEES FOR ANY PAYMENT METHOD
//       let ourAppFee = 0;
//       let totalFees = Number(nombaFee.toFixed(2));
//       let netCredit = Number((amount - totalFees).toFixed(2));
//       const total_deduction = amount;

//       console.log("💰 Deposit calculations (NO CHARGES):");
//       console.log("   - Amount:", amount);
//       console.log("   - Nomba's fee:", nombaFee);
//       console.log("   - Our app fee:", ourAppFee);
//       console.log("   - Total fees:", totalFees);
//       console.log("   - Net credit to user:", netCredit);

//       // Idempotency: check existing transaction by reference or merchant_tx_ref
//       const { data: existingTx, error: existingErr } = await supabase
//         .from("transactions")
//         .select("*")
//         .or(
//           `reference.eq.${referenceToUse},merchant_tx_ref.eq.${nombaTransactionId}`
//         )
//         .maybeSingle();

//       if (existingErr) {
//         console.error("❌ Error checking existing transaction:", existingErr);
//         return NextResponse.json({ error: "DB error" }, { status: 500 });
//       }

//       // ✅ Already successfully processed
//       if (existingTx && existingTx.status === "success") {
//         console.log(
//           "⚠️ Deposit already processed (idempotent). Skipping credit."
//         );
//         return NextResponse.json(
//           { message: "Already processed" },
//           { status: 200 }
//         );
//       }

//       // 🔁 Existing pending tx: mark success and credit
//       if (existingTx) {
//         console.log(
//           "🔁 Found existing transaction. Updating to success and crediting user."
//         );
//         // Store fee breakdown in external_response
//         const updatedExternalResponse = {
//           ...payload,
//           fee_breakdown: {
//             nomba_fee: nombaFee,
//             total_fee: totalFees,
//             profit_margin: Number((ourAppFee - nombaFee).toFixed(2)),
//           },
//         };

//         const { error: updErr } = await supabase
//           .from("transactions")
//           .update({
//             status: "success",
//             amount,
//             fee: totalFees,
//             total_deduction,
//             merchant_tx_ref: nombaTransactionId,
//             external_response: updatedExternalResponse,
//             channel,
//           })
//           .eq("id", existingTx.id);

//         if (updErr) {
//           console.error("❌ Failed to update existing transaction:", updErr);
//           return NextResponse.json(
//             { error: "Failed to update transaction" },
//             { status: 500 }
//           );
//         }

//         // Credit wallet atomically using RPC
//         const { error: rpcErr } = await supabase.rpc(
//           "increment_wallet_balance",
//           {
//             user_id: existingTx.user_id,
//             amt: netCredit,
//           }
//         );

//         if (rpcErr) {
//           console.error("❌ RPC increment_wallet_balance failed:", rpcErr);
//           // fallback manual credit
//           const { data: before } = await supabase
//             .from("users")
//             .select("wallet_balance")
//             .eq("id", existingTx.user_id)
//             .single();

//           if (!before) {
//             console.error("❌ User not found for manual credit fallback");
//             return NextResponse.json(
//               { error: "User not found" },
//               { status: 500 }
//             );
//           }

//           const newBal = Number(before.wallet_balance) + netCredit;
//           const { error: updUserErr } = await supabase
//             .from("users")
//             .update({ wallet_balance: newBal })
//             .eq("id", existingTx.user_id);

//           if (updUserErr) {
//             console.error("❌ Manual wallet update failed:", updUserErr);
//             return NextResponse.json(
//               { error: "Failed to credit wallet" },
//               { status: 500 }
//             );
//           }
//         }

//         console.log(
//           `✅ Credited user ${existingTx.user_id} with ₦${netCredit} (existing tx updated)`
//         );
//         return NextResponse.json({ success: true }, { status: 200 });
//       }

//       // No existing tx: create and credit (auto-create best-effort)
//       console.log(
//         "➕ No existing tx — creating transaction and crediting user now (auto-create)."
//       );
//       // Store fee breakdown in external_response
//       const updatedExternalResponse = {
//         ...payload,
//         fee_breakdown: {
//           nomba_fee: nombaFee,
//           app_fee: ourAppFee,
//           total_fee: totalFees,
//           profit_margin: Number((ourAppFee - nombaFee).toFixed(2)),
//         },
//       };

//       const { error: insertErr } = await supabase.from("transactions").insert([
//         {
//           user_id: userId,
//           type: txType,
//           amount,
//           fee: totalFees,
//           total_deduction,
//           status: "success",
//           reference: referenceToUse,
//           merchant_tx_ref: nombaTransactionId,
//           description:
//             txType === "card_deposit"
//               ? "Card deposit"
//               : txType === "virtual_account_deposit"
//               ? "Virtual Account deposit"
//               : "Bank deposit",
//           external_response: updatedExternalResponse,
//           channel: channel,
//         },
//       ]);

//       if (insertErr) {
//         // if duplicate (unique constraint) — treat as processed
//         if (insertErr.code === "23505") {
//           console.warn(
//             "⚠️ Duplicate insert prevented. Treating as already processed."
//           );
//           return NextResponse.json(
//             { message: "Duplicate ignored" },
//             { status: 200 }
//           );
//         }
//         console.error("❌ Failed to insert new transaction:", insertErr);
//         return NextResponse.json(
//           { error: "Failed to record transaction" },
//           { status: 500 }
//         );
//       }

//       // credit via RPC
//       const { error: rpcErr2 } = await supabase.rpc(
//         "increment_wallet_balance",
//         {
//           user_id: userId,
//           amt: netCredit,
//         }
//       );
//       if (rpcErr2) {
//         console.error("❌ RPC increment failed (after insert):", rpcErr2);
//         // fallback manual
//         const { data: before } = await supabase
//           .from("users")
//           .select("wallet_balance")
//           .eq("id", userId)
//           .single();
//         if (!before) {
//           console.error("❌ User not found for manual credit fallback");
//           return NextResponse.json(
//             { error: "User not found" },
//             { status: 500 }
//           );
//         }
//         const newBal = Number(before.wallet_balance) + netCredit;
//         const { error: uiErr } = await supabase
//           .from("users")
//           .update({ wallet_balance: newBal })
//           .eq("id", userId);
//         if (uiErr) {
//           console.error("❌ Manual wallet update failed:", uiErr);
//           return NextResponse.json(
//             { error: "Failed to credit wallet" },
//             { status: 500 }
//           );
//         }
//       }

//       console.log(
//         `✅ Auto-created transaction and credited user ${userId} with ₦${netCredit}`
//       );

//       console.log("🔍 Virtual Account Deposit Payload Structure:", {
//         transaction: payload.data?.transaction,
//         bank: payload.data?.bank,
//         customer: payload.data?.customer,
//         fullPayload: payload,
//       });

//       const bankName =
//         payload.data?.transaction?.bankName ||
//         payload.data?.bank?.name ||
//         "Virtual Account Bank";

//       const accountNumber =
//         payload.data?.transaction?.accountNumber ||
//         payload.data?.aliasAccountReference ||
//         "Virtual Account";

//       const accountName =
//         payload.data?.transaction?.accountName ||
//         payload.data?.customer?.name ||
//         "Your Virtual Account";
//       if (userId) {
//         await sendVirtualAccountDepositEmailNotification(
//           userId,
//           amount,
//           nombaTransactionId || referenceToUse,
//           bankName,
//           accountNumber,
//           accountName
//         );
//       }

//       return NextResponse.json({ success: true }, { status: 200 });
//     } // end deposit handling

//     // ---------- WITHDRAWAL / TRANSFER (OUTGOING) ----------
//     if (isPayoutOrTransfer) {
//       console.log("➡️ Handling payout/transfer flow");

//       const refCandidates = [merchantTxRef, nombaTransactionId].filter(Boolean);
//       // console.log("🔎 Searching transaction by candidates:", refCandidates);

//       const orExprParts = refCandidates
//         .map((r) => `merchant_tx_ref.eq.${r}`)
//         .concat(refCandidates.map((r) => `reference.eq.${r}`));
//       const orExpr = orExprParts.join(",");

//       const { data: pendingTxList, error: pendingErr } = await supabase
//         .from("transactions")
//         .select("*")
//         .or(orExpr)
//         .in("status", ["pending", "processing"])
//         .order("created_at", { ascending: false })
//         .limit(1);

//       if (pendingErr) {
//         console.error(
//           "❌ DB error while finding pending transaction:",
//           pendingErr
//         );
//         return NextResponse.json({ error: "DB error" }, { status: 500 });
//       }

//       const pendingTx = pendingTxList?.[0];

//       if (!pendingTx) {
//         console.warn(
//           "⚠️ No matching pending withdrawal found for refs:",
//           refCandidates
//         );
//         return NextResponse.json(
//           { message: "No matching withdrawal transaction" },
//           { status: 200 }
//         );
//       }

//       // console.log(
//       //   "📦 Found pending transaction:",
//       //   pendingTx.id,
//       //   "status:",
//       //   pendingTx.status,
//       //   "type:",
//       //   pendingTx.type,
//       //   "pendingTx:",
//       //   pendingTx
//       // );

//       // 🔥 NEW: Check if this is a P2P transfer or regular withdrawal
//       const isP2PTransfer = pendingTx.type === "p2p_transfer";
//       const isRegularWithdrawal = pendingTx.type === "withdrawal";

//       console.log("   - Is P2P Transfer:", isP2PTransfer);
//       console.log("   - Is Regular Withdrawal:", isRegularWithdrawal);

//       // Idempotency - check if already processed
//       if (["success", "failed"].includes(pendingTx.status)) {
//         console.log(`⚠️ Transaction already ${pendingTx.status}. Skipping.`);
//         return NextResponse.json(
//           { message: "Already processed" },
//           { status: 200 }
//         );
//       }

//       const txAmount = Number(pendingTx.amount ?? transactionAmount ?? 0);

//       let appFee = 0;
//       let totalFees = 0;
//       let totalDeduction = txAmount;

//       if (isRegularWithdrawal) {
//         // Regular withdrawal fee logic: 1% (₦20 min, ₦1000 cap)
//         appFee = txAmount * 0.0025;
//         appFee = Math.max(appFee, 20);
//         appFee = Math.min(appFee, 150);
//         appFee = Number(appFee.toFixed(2));
//         totalFees = Number((nombaFee + appFee).toFixed(2));
//         totalDeduction = txAmount;

//         console.log("💰 Regular Withdrawal calculations:");
//         console.log("   - Withdrawal amount:", txAmount);
//         console.log("   - Nomba fee:", nombaFee);
//         console.log("   - Our app fee:", appFee);
//         console.log("   - Total fees:", totalFees);
//         console.log("   - Total deduction:", totalDeduction);
//       } else if (isP2PTransfer) {
//         // 🔥 P2P transfers have NO FEES
//         appFee = 0;
//         totalFees = 0; // No fees for P2P
//         totalDeduction = txAmount; // Only deduct the transfer amount

//         console.log("💰 P2P Transfer calculations (NO FEES):");
//         console.log("   - Transfer amount:", txAmount);
//         console.log("   - Nomba fee:", nombaFee); // This might be 0 for internal transfers
//         console.log("   - Our app fee:", appFee);
//         console.log("   - Total fees:", totalFees);
//         console.log("   - Total deduction:", totalDeduction);
//       }

//       // ✅ SUCCESS CASE
//       if (eventType === "payout_success" || txStatus === "success") {
//         console.log(
//           `✅ ${
//             isP2PTransfer ? "P2P Transfer" : "Withdrawal"
//           } success - marking transaction as success`
//         );

//         const reference = nombaTransactionId || crypto.randomUUID();

//         // Build updated external response with fee info
//         const updatedExternalResponse = {
//           ...payload,
//           fee_breakdown: {
//             transaction_type: isP2PTransfer ? "p2p_transfer" : "withdrawal",
//             amount: txAmount,
//             nomba_fee: nombaFee,
//             app_fee: appFee,
//             total_fee: totalFees,
//             total_deduction: totalDeduction,
//           },
//         };

//         // 🟩 No second deduction here — we already deducted at initiation
//         const { error: updateErr } = await supabase
//           .from("transactions")
//           .update({
//             status: "success",
//             reference,
//             external_response: updatedExternalResponse,
//             total_deduction: totalDeduction,
//             fee: totalFees,
//           })
//           .eq("id", pendingTx.id);

//         const withdrawalDetails =
//           pendingTx.external_response?.withdrawal_details || {};
//         const accountName = withdrawalDetails.account_name || "N/A";
//         const accountNumber = withdrawalDetails.account_number || "N/A";
//         const bankName = withdrawalDetails.bank_name || "N/A";

//         await sendWithdrawalEmailNotification(
//           pendingTx.user_id,
//           "success",
//           txAmount,
//           appFee,
//           totalDeduction,
//           accountName,
//           accountNumber,
//           bankName,
//           pendingTx.id
//         );
//         if (updateErr) {
//           console.error("❌ Failed to update transaction:", updateErr);
//           return NextResponse.json({ error: "Update failed" }, { status: 500 });
//         }

//         // 🔥 NEW: For P2P transfers, also credit the receiver
//         if (isP2PTransfer && pendingTx.receiver) {
//           try {
//             console.log("💰 Processing P2P receiver credit...");

//             // Find receiver by wallet_id from the transaction record
//             const { data: receiver, error: receiverError } = await supabase
//               .from("users")
//               .select("id, first_name, last_name")
//               .eq("wallet_id", pendingTx.receiver.wallet_id)
//               .single();

//             if (receiverError || !receiver) {
//               console.error("❌ P2P receiver not found:", pendingTx.receiver);
//             } else {
//               // Credit receiver's wallet
//               const { error: creditError } = await supabase.rpc(
//                 "increment_wallet_balance",
//                 {
//                   user_id: receiver.id,
//                   amt: txAmount,
//                 }
//               );

//               if (creditError) {
//                 console.error(
//                   "❌ Failed to credit receiver wallet:",
//                   creditError
//                 );
//               } else {
//                 // Create receiver transaction record
//                 await supabase.from("transactions").insert({
//                   user_id: receiver.id,
//                   type: "p2p_received",
//                   amount: txAmount,
//                   status: "success",
//                   description: `Received ₦${txAmount} from ${
//                     pendingTx.sender?.name || "User"
//                   }`,
//                   narration: pendingTx.narration || "P2P Received",
//                   reference: reference,
//                   external_response: updatedExternalResponse,
//                   sender: pendingTx.sender,
//                 });

//                 console.log(
//                   `✅ P2P receiver ${receiver.id} credited with ₦${txAmount}`
//                 );
//               }
//             }
//           } catch (receiverErr) {
//             console.error(
//               "❌ Error processing P2P receiver credit:",
//               receiverErr
//             );
//             // Don't fail the whole webhook - log and continue
//           }
//         }

//         // console.log(
//         //   `✅ ${
//         //     isP2PTransfer ? "P2P Transfer" : "Withdrawal"
//         //   } marked success. User ${
//         //     pendingTx.user_id
//         //   } was already charged ₦${totalDeduction} during initiation.`
//         // );

//         return NextResponse.json(
//           {
//             success: true,
//             message: `${
//               isP2PTransfer ? "P2P Transfer" : "Withdrawal"
//             } processed successfully`,
//             transaction_type: isP2PTransfer ? "p2p_transfer" : "withdrawal",
//           },
//           { status: 200 }
//         );
//       }

//       // ❌ FAILURE CASE — REFUND USER
//       if (eventType === "payout_failed" || txStatus === "failed") {
//         console.log(
//           `❌ ${
//             isP2PTransfer ? "P2P Transfer" : "Withdrawal"
//           } failed - refunding user and marking transaction failed`
//         );

//         const updatedExternalResponse = {
//           ...payload,
//           fee_breakdown: {
//             transaction_type: isP2PTransfer ? "p2p_transfer" : "withdrawal",
//             nomba_fee: nombaFee,
//             app_fee: appFee,
//             total_fee: totalFees,
//             failed: true,
//           },
//         };

//         // Update transaction to failed
//         const { error: updateError } = await supabase
//           .from("transactions")
//           .update({
//             status: "failed",
//             external_response: updatedExternalResponse,
//             reference: nombaTransactionId || pendingTx.reference,
//           })
//           .eq("id", pendingTx.id);

//         const withdrawalDetails =
//           pendingTx.external_response?.withdrawal_details || {};
//         const accountName = withdrawalDetails.account_name || "N/A";
//         const accountNumber = withdrawalDetails.account_number || "N/A";
//         const bankName = withdrawalDetails.bank_name || "N/A";

//         await sendWithdrawalEmailNotification(
//           pendingTx.user_id,
//           "failed",
//           txAmount,
//           appFee,
//           totalDeduction,
//           accountName,
//           accountNumber,
//           bankName,
//           pendingTx.id
//         );

//         if (updateError) {
//           console.error("❌ Failed to update transaction status:", updateError);
//           return NextResponse.json(
//             { error: "Failed to update transaction" },
//             { status: 500 }
//           );
//         }

//         // Refund wallet via RPC since we deducted earlier
//         console.log("🔄 Refunding user wallet...");
//         const refundReference = `refund_${
//           nombaTransactionId || crypto.randomUUID()
//         }`;
//         const { error: refundErr } = await supabase.rpc(
//           "deduct_wallet_balance",
//           {
//             user_id: pendingTx.user_id,
//             amt: -totalDeduction, // negative = credit back
//             transaction_type: "credit",
//             reference: refundReference,
//             description: `Refund for failed ${
//               isP2PTransfer ? "P2P transfer" : "withdrawal"
//             } of ₦${txAmount}`,
//           }
//         );

//         if (refundErr) {
//           console.error("❌ Refund RPC failed:", refundErr.message);
//           return NextResponse.json(
//             { error: "Failed to refund wallet via RPC" },
//             { status: 500 }
//           );
//         }

//         console.log(
//           `✅ Refund completed successfully for user ${pendingTx.user_id}`
//         );
//         return NextResponse.json(
//           {
//             refunded: true,
//             transaction_type: isP2PTransfer ? "p2p_transfer" : "withdrawal",
//           },
//           { status: 200 }
//         );
//       }

//       console.log("ℹ️ Unhandled transfer event/status. Ignoring.");
//       return NextResponse.json(
//         { message: "Ignored transfer event" },
//         { status: 200 }
//       );
//     }

//     // If we reach here, event type not handled specifically
//     console.log("ℹ️ Event type not matched. Ignoring.");
//     return NextResponse.json({ message: "Ignored event" }, { status: 200 });
//   } catch (err: any) {
//     console.error("🔥 Webhook processing error:", err);
//     return NextResponse.json(
//       { error: err.message || "Server error" },
//       { status: 500 }
//     );
//   }
// }

// updated webhook
// app/api/webhook/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createHmac, timingSafeEqual } from "crypto";
import { createClient } from "@supabase/supabase-js";
import { getNombaToken } from "@/lib/nomba";
import {
  sendInvoiceCreatorNotification,
  sendPaymentSuccessEmail,
} from "@/lib/invoice-email-confirmation";
import { transporter } from "@/lib/node-mailer";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const baseUrl =
  process.env.NODE_ENV === "development"
    ? process.env.NEXT_PUBLIC_DEV_URL
    : process.env.NEXT_PUBLIC_BASE_URL;

const NOMBA_SIGNATURE_KEY = process.env.NOMBA_SIGNATURE_KEY!;

function safeNum(v: any) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

async function sendVirtualAccountDepositEmailNotification(
  userId: string,
  amount: number,
  transactionId: string,
  bankName: string,
  accountNumber: string,
  accountName: string,
  senderName: string
) {
  try {
    // Fetch user email and name
    const { data: user, error } = await supabase
      .from("users")
      .select("email, first_name")
      .eq("id", userId)
      .single();

    if (error || !user) {
      console.error(
        "Failed to fetch user for virtual account deposit email notification:",
        error
      );
      return;
    }

    const subject = `Account Deposit Received - ₦${amount.toLocaleString()}`;
    const greeting = user.first_name ? `Hi ${user.first_name},` : "Hello,";

    const emailBody = `
${greeting}

Your account deposit was successful!

💰 Transaction Details:
• Amount: ₦${amount.toLocaleString()}
• Bank: ${bankName}
• Account Number: ${accountNumber}
• Account Name: ${accountName}
• Sender: ${senderName}
• Transaction ID: ${transactionId}
• Date: ${new Date().toLocaleString()}

The funds have been credited to your Zidwell wallet and are ready to use.

Thank you for using Zidwell!

Best regards,
Zidwell Team
    `;

    await transporter.sendMail({
      from: process.env.EMAIL_FROM || '"Zidwell" <notifications@zidwell.com>',
      to: user.email,
      subject,
      text: emailBody,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <p>${greeting}</p>
          
          <h3 style="color: #22c55e;">
            ✅ Account Deposit Successful
          </h3>
          
          <div style="background: #f8fafc; padding: 15px; border-radius: 8px; margin: 15px 0;">
            <h4 style="margin-top: 0;">Transaction Details:</h4>
            <p><strong>Amount:</strong> ₦${amount.toLocaleString()}</p>
            <p><strong>Bank:</strong> ${bankName}</p>
            <p><strong>Account Number:</strong> ${accountNumber}</p>
            <p><strong>Account Name:</strong> ${accountName}</p>
            <p><strong>Sender:</strong> ${senderName}</p>
            <p><strong>Transaction ID:</strong> ${transactionId}</p>
            <p><strong>Date:</strong> ${new Date().toLocaleString()}</p>
            <p><strong>Status:</strong> <span style="color: #22c55e; font-weight: bold;">Success</span></p>
          </div>
          
          <p style="color: #64748b;">
            The funds have been credited to your Zidwell wallet and are ready to use.
          </p>
          
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
      `💰 Virtual account deposit email notification sent to ${user.email} for ₦${amount} from ${senderName}`
    );
  } catch (emailError) {
    console.error(
      "Failed to send virtual account deposit email notification:",
      emailError
    );
  }
}

async function sendWithdrawalEmailNotification(
  userId: string,
  status: "success" | "failed",
  amount: number,
  nombaFee: number,
  appFee: number,
  totalDeduction: number,
  recipientName: string,
  recipientAccount: string,
  bankName: string,
  narration?: string,
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
        "Failed to fetch user for Transfer email notification:",
        error
      );
      return;
    }

    const totalFee = nombaFee + appFee;
    const subject =
      status === "success"
        ? `Transfer Successful - ₦${amount.toLocaleString()}`
        : `Transfer Failed - ₦${amount.toLocaleString()}`;

    const greeting = user.first_name ? `Hi ${user.first_name},` : "Hello,";

    const successBody = `
${greeting}

Your transfer was successful!

💰 Transaction Details:
• Amount: ₦${amount.toLocaleString()}
• Fee: ₦${totalFee.toLocaleString()}
• Recipient: ${recipientName}
• Account Number: ${recipientAccount}
• Bank: ${bankName}
• Narration: ${narration || "N/A"}
• Transaction ID: ${transactionId || "N/A"}
• Date: ${new Date().toLocaleString()}

The funds should reflect in your beneficiary's bank account shortly.

Thank you for using Zidwell!

Best regards,
Zidwell Team
    `;

    const failedBody = `
${greeting}

Your transfer failed.

💰 Transaction Details:
• Amount: ₦${amount.toLocaleString()}
• Fee: ₦${totalFee.toLocaleString()}
• Recipient: ${recipientName}
• Account Number: ${recipientAccount}
• Bank: ${bankName}
• Narration: ${narration || "N/A"}
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

    const emailBody = status === "success" ? successBody : failedBody;

    const statusColor = status === "success" ? "#22c55e" : "#ef4444";
    const statusIcon = status === "success" ? "✅" : "❌";
    const statusText =
      status === "success" ? "Transfer Successful" : "Transfer Failed";

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
            <p><strong>Fee:</strong> ₦${totalFee.toLocaleString()}</p>
            <p><strong>Recipient Name:</strong> ${recipientName}</p>
            <p><strong>Account Number:</strong> ${recipientAccount}</p>
            <p><strong>Bank:</strong> ${bankName}</p>
            <p><strong>Narration:</strong> ${narration || "N/A"}</p>
            <p><strong>Transaction ID:</strong> ${transactionId || "N/A"}</p>
            <p><strong>Date:</strong> ${new Date().toLocaleString()}</p>
            <p><strong>Status:</strong> <span style="color: ${statusColor}; font-weight: bold;">
              ${status === "success" ? "Success" : "Failed"}
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
                  The funds should reflect in your bank account shortly.
                  If there are any dispute, please contact our support team.
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

export async function POST(req: NextRequest) {
  try {
    console.log("====== Nomba Webhook Triggered ======");

    // 1) Read raw body and parse
    const rawBody = await req.text();
    console.log("🔸 Raw body length:", rawBody?.length);
    let payload: any;
    try {
      payload = JSON.parse(rawBody);
      console.log("payload", payload);
    } catch (err) {
      console.error("❌ Failed to parse JSON body", err);
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }
    console.log(
      "🟢 Parsed payload.event_type:",
      payload?.event_type || payload?.eventType
    );

    // 2) Signature verification (HMAC SHA256 -> Base64)
    const timestamp = req.headers.get("nomba-timestamp");
    const signature =
      req.headers.get("nomba-sig-value") || req.headers.get("nomba-signature");

    if (!timestamp || !signature) {
      console.warn("❗ Missing Nomba signature headers. Headers:", {
        "nomba-timestamp": timestamp,
        "nomba-sig-value": signature,
      });
      return NextResponse.json(
        { error: "Missing signature headers" },
        { status: 401 }
      );
    }

    // Build hash payload according to Nomba docs (use safe optional chaining)
    const hashingPayload = `${payload.event_type}:${payload.requestId}:${
      payload.data?.merchant?.userId || ""
    }:${payload.data?.merchant?.walletId || ""}:${
      payload.data?.transaction?.transactionId || ""
    }:${payload.data?.transaction?.type || ""}:${
      payload.data?.transaction?.time || ""
    }:${payload.data?.transaction?.responseCode || ""}`;
    const message = `${hashingPayload}:${timestamp}`;

    const hmac = createHmac("sha256", NOMBA_SIGNATURE_KEY);
    hmac.update(message);
    const expectedSignature = hmac.digest("base64");

    // Timing-safe compare
    const receivedBuffer = Buffer.from(signature, "base64");
    const expectedBuffer = Buffer.from(expectedSignature, "base64");

    console.log("🔐 Signature verification: received:", signature);
    console.log("🔐 Signature verification: expected:", expectedSignature);
    console.log(
      "🔐 Same length?:",
      receivedBuffer.length === expectedBuffer.length
    );

    if (
      receivedBuffer.length !== expectedBuffer.length ||
      !timingSafeEqual(receivedBuffer, expectedBuffer)
    ) {
      console.error("❌ Invalid signature - aborting webhook");
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }
    console.log("✅ Signature verified");

    // 3) Normalize fields
    const eventType: string = payload.event_type || payload.eventType;
    const tx = payload.data?.transaction || payload.data?.txn || {};
    const order = payload.data?.order || null;

    // try several fields for IDs / refs
    const nombaTransactionId =
      tx.transactionId || tx.transaction_id || tx.id || tx.reference || null;
    const merchantTxRef =
      tx.merchantTxRef ||
      tx.merchant_tx_ref ||
      payload.data?.meta?.merchantTxRef ||
      null;
    const orderReference =
      order?.orderReference || order?.order_reference || null;
    const aliasAccountReference =
      tx.aliasAccountReference ||
      tx.alias_account_reference ||
      tx.aliasAccount ||
      null;
    const transactionAmount = safeNum(
      tx.transactionAmount ?? tx.amount ?? order?.amount ?? 0
    );
    const nombaFee = safeNum(tx.fee ?? payload.data?.transaction?.fee ?? 0);
    const txStatusRaw = (tx.status || payload.data?.status || "").toString();
    const txStatus = txStatusRaw.toLowerCase();
    const transactionType = (tx.type || "").toLowerCase();

    console.log("🔎 eventType:", eventType);
    console.log("🔎 txType:", transactionType);
    console.log("🔎 nombaTransactionId:", nombaTransactionId);
    console.log("🔎 merchantTxRef:", merchantTxRef);
    console.log("🔎 orderReference:", orderReference);
    console.log("🔎 aliasAccountReference:", aliasAccountReference);
    console.log(
      "🔎 transactionAmount:",
      transactionAmount,
      "nombaFee:",
      nombaFee,
      "txStatus:",
      txStatus
    );

    const serviceTypes = [
      "data",
      "airtime",
      "cable-tv",
      "electricity",
      "utility",
      "bill",
      "topup",
    ];
    const serviceRefPatterns = [
      "Data-",
      "Airtime-",
      "Cable-",
      "Electricity-",
      "Bill-",
      "Utility-",
      "Topup-",
      "AIRTIME-",
      "DATA-",
      "CABLE-",
      "ELECTRICITY-",
    ];

    const isServicePurchase =
      serviceTypes.some((service) => transactionType.includes(service)) ||
      serviceRefPatterns.some((pattern) => merchantTxRef?.includes(pattern));

    if (isServicePurchase) {
      console.log(
        "📱 Ignoring service purchase (data/airtime/cable/electricity/topup) - already handled by main API"
      );
      return NextResponse.json(
        { message: "Service purchase ignored - already processed by main API" },
        { status: 200 }
      );
    }

    // Also ignore ALL payout_success events for service purchases regardless of detection
    if (
      eventType.includes("payout_success") &&
      (transactionType.includes("topup") ||
        merchantTxRef?.includes("AIRTIME-") ||
        merchantTxRef?.includes("DATA-") ||
        merchantTxRef?.includes("Airtime-") ||
        merchantTxRef?.includes("Data-") ||
        transactionType.includes("airtime") ||
        transactionType.includes("data"))
    ) {
      console.log("📱 Ignoring service purchase payout event");
      return NextResponse.json(
        { message: "Service purchase payout event ignored" },
        { status: 200 }
      );
    }

    // 4) FIXED: Better logic to determine transaction flow
    console.log("🎯 Determining transaction flow type...");

    const isCardPayment = Boolean(orderReference);
    const isVirtualAccountDeposit = Boolean(aliasAccountReference);

    // FIX: Better detection for deposits vs withdrawals
    const isDepositEvent =
      eventType === "payment_success" ||
      eventType === "payment.succeeded" ||
      tx.type?.toLowerCase().includes("vact") ||
      tx.type?.toLowerCase().includes("deposit") ||
      isCardPayment ||
      isVirtualAccountDeposit;

    const isPayoutOrTransfer =
      (eventType?.toLowerCase()?.includes("payout") && !isServicePurchase) ||
      (Boolean(merchantTxRef) && !isServicePurchase) ||
      (tx.type &&
        tx.type.toLowerCase().includes("transfer") &&
        !tx.type.toLowerCase().includes("vact"));

    console.log("   - isCardPayment:", isCardPayment);
    console.log("   - isVirtualAccountDeposit:", isVirtualAccountDeposit);
    console.log("   - isDepositEvent:", isDepositEvent);
    console.log("   - isPayoutOrTransfer:", isPayoutOrTransfer);
    console.log("   - isServicePurchase:", isServicePurchase);

    // ---------- DEPOSIT: CARD (orderReference) OR VA ----------
    if (isDepositEvent) {
      console.log("💰 Processing DEPOSIT transaction...");

      // -------------------- SUBSCRIPTION HANDLING --------------------
      const isSubscription =
        orderReference?.includes("SUB-") ||
        payload?.data?.order?.metadata?.type === "subscription";

      if (isSubscription) {
        console.log("💰 Processing subscription payment...");

        const subscriptionId =
          payload?.data?.order?.metadata?.subscriptionId ||
          orderReference?.split("-")[1];

        if (eventType === "payment_success" || txStatus === "success") {
          // Update subscription status to active
          const { error: updateError } = await supabase
            .from("user_subscriptions")
            .update({
              status: "active",
            })
            .eq("id", subscriptionId);

          if (!updateError) {
            console.log(`✅ Subscription activated: ${subscriptionId}`);

            // Update user's subscription tier
            const planName = payload?.data?.order?.metadata?.planName;
            const userId = payload?.data?.order?.metadata?.userId;

            if (planName && userId) {
              await supabase
                .from("users")
                .update({
                  subscription_tier: planName
                    .toLowerCase()
                    .replace(/\s+/g, "_"),
                  subscription_expires_at: new Date(
                    new Date().getTime() + 30 * 24 * 60 * 60 * 1000
                  ).toISOString(),
                })
                .eq("id", userId);

              console.log(`✅ User ${userId} updated to ${planName} tier`);
            }

            // Send confirmation email
            const userEmail = payload?.data?.order?.customerEmail;
            if (userEmail) {
              try {
                await fetch(`${baseUrl}/api/send-email`, {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    to: userEmail,
                    subject: `🎉 Welcome to Zidwell ${planName}!`,
                    message: `
                <h2>Welcome to Zidwell ${planName}!</h2>
                <p>Your subscription has been successfully activated and you now have access to all premium features.</p>
                <p><strong>Plan:</strong> ${planName}</p>
                <p><strong>Status:</strong> Active</p>
                <p>Thank you for choosing Zidwell. We're excited to help you grow your business!</p>
                <br>
                <p>Best regards,<br>The Zidwell Team</p>
              `,
                  }),
                });
                console.log(
                  `📧 Subscription confirmation email sent to ${userEmail}`
                );
              } catch (emailError) {
                console.error("Failed to send subscription email:", emailError);
              }
            }
          } else {
            console.error("Failed to update subscription:", updateError);
          }
        } else if (eventType === "payment_failed" || txStatus === "failed") {
          // Update subscription status to failed
          await supabase
            .from("user_subscriptions")
            .update({
              status: "failed",
            })
            .eq("id", subscriptionId);

          console.log(`❌ Subscription payment failed: ${subscriptionId}`);
        }

        // Return early since subscription is handled
        return NextResponse.json({ success: true }, { status: 200 });
      }
      // -------------------- END SUBSCRIPTION HANDLING --------------------

      // -------------------- INVOICE PAYMENT HANDLING (CARD ONLY) --------------------
      const isInvoicePayment =
        orderReference ||
        payload?.data?.order?.callbackUrl?.includes(
          "/api/invoice-payment-callback"
        );

      if (isInvoicePayment) {
        console.log("🧾 Processing INVOICE payment...");

        const txStatus =
          payload?.data?.transaction?.status || payload.event_type;

        console.log("🔍 Payment status check:", {
          eventType,
          txStatus,
          orderReference,
          event_type: payload.event_type,
        });

        const isPaymentSuccess =
          eventType === "payment_success" ||
          payload.event_type === "payment_success";

        if (!isPaymentSuccess) {
          console.error("❌ Payment not successful - Event Type:", eventType);
          return NextResponse.json(
            { error: "Payment not successful" },
            { status: 400 }
          );
        }

        try {
          const token = await getNombaToken();

          if (token) {
            const verifyUrl = `${process.env.NOMBA_URL}/v1/checkout/transaction?orderReference=${orderReference}`;

            const verifyResponse = await fetch(verifyUrl, {
              method: "GET",
              headers: {
                "Content-Type": "application/json",
                accountId: process.env.NOMBA_ACCOUNT_ID!,
                Authorization: `Bearer ${token}`,
              },
            });

            if (verifyResponse.ok) {
              const verifyData = await verifyResponse.json();

              const transactionStatus =
                verifyData.data?.transactionDetails?.statusCode ||
                verifyData.data?.status ||
                verifyData.status;

              const isVerifiedSuccess =
                transactionStatus === "success" ||
                transactionStatus === "SUCCESS" ||
                transactionStatus === "SUCCESSFUL" ||
                verifyData.data?.transactionDetails?.status === "SUCCESSFUL" ||
                verifyData.success === true;

              if (isVerifiedSuccess) {
                console.log("✅ Payment verified as SUCCESS by Nomba API");
              } else {
                console.log(
                  "⚠️ Nomba verification inconclusive - Status:",
                  transactionStatus
                );
              }
            } else {
              const errorText = await verifyResponse.text();
              console.log("⚠️ Nomba verification failed:", errorText);
            }
          } else {
            console.log("⚠️ No token available, skipping verification");
          }
        } catch (verifyError: any) {
          console.error(
            "❌ Verification error, but continuing with webhook data:",
            verifyError.message
          );
        }

        try {
          let invoiceId: string | null = null;

          invoiceId = payload?.data?.order?.metadata?.invoiceId;

          if (!invoiceId && payload?.data?.order?.callbackUrl) {
            try {
              const callbackUrl = new URL(payload.data.order.callbackUrl);
              invoiceId = callbackUrl.searchParams.get("invoiceId");
            } catch (urlError) {
              console.error("❌ Error parsing callback URL:", urlError);
            }
          }

          if (!invoiceId) {
            invoiceId = orderReference;
          }

          if (!invoiceId) {
            console.error("❌ No invoice ID found");
            return NextResponse.json(
              { error: "No invoice ID" },
              { status: 400 }
            );
          }

          // Find invoice in database
          let invoice: any;
          const { data: invoiceData, error: invoiceError } = await supabase
            .from("invoices")
            .select("*")
            .eq("invoice_id", invoiceId)
            .single();

          if (invoiceError) {
            console.error("❌ Invoice not found by invoice_id:", invoiceError);

            // Fallback: try finding by id
            const { data: fallbackInvoice, error: fallbackError } =
              await supabase
                .from("invoices")
                .select("*")
                .eq("id", invoiceId)
                .single();

            if (fallbackError || !fallbackInvoice) {
              console.error("❌ Invoice not found in fallback search");
              return NextResponse.json(
                { error: "Invoice not found" },
                { status: 404 }
              );
            }

            invoice = fallbackInvoice;
          } else {
            invoice = invoiceData;
          }

          console.log(`✅ Found invoice:`, {
            id: invoice.id,
            invoice_id: invoice.invoice_id,
            total_amount: invoice.total_amount,
            paid_amount: invoice.paid_amount,
            status: invoice.status,
          });

          // Check for duplicate payments
          const { data: existingPayment, error: checkError } = await supabase
            .from("invoice_payments")
            .select("*")
            .or(
              `nomba_transaction_id.eq.${nombaTransactionId},order_reference.eq.${orderReference}`
            )
            .maybeSingle();

          if (existingPayment) {
            console.log(
              "⚠️ Duplicate payment detected, updating invoice totals only"
            );
            await updateInvoiceTotals(invoice, transactionAmount);
            return NextResponse.json({ success: true }, { status: 200 });
          }

          if (checkError && checkError.code !== "PGRST116") {
            console.error("❌ Error checking existing payment:", checkError);
            return NextResponse.json(
              { error: "Payment check failed" },
              { status: 500 }
            );
          }

          const paidAmount = transactionAmount;
          const customerEmail = payload?.data?.order?.customerEmail;
          const customerName = payload?.data?.order?.customerName;

          const newOrderReference =
            orderReference ||
            `PAY-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

          // Create payment record
          const { data: paymentRecord, error: paymentError } = await supabase
            .from("invoice_payments")
            .insert([
              {
                invoice_id: invoice.id,
                user_id: invoice.user_id,
                order_reference: newOrderReference,
                payer_email: customerEmail || invoice.client_email,
                payer_name: customerName || invoice.client_name,
                amount: paidAmount,
                paid_amount: paidAmount,
                status: "completed",
                payment_link: invoice.payment_link,
                nomba_transaction_id: nombaTransactionId,
                payment_method: "card_payment",
                paid_at: new Date().toISOString(),
                is_reusable: true,
                payment_attempts: 1,
                created_at: new Date().toISOString(),
              },
            ])
            .select()
            .single();

          if (paymentError) {
            console.error("❌ Failed to create payment record:", paymentError);
            return NextResponse.json(
              { error: "Payment record failed" },
              { status: 500 }
            );
          }

          // CREATE TRANSACTION RECORD FOR THE INVOICE CREATOR
          try {
            const transactionDescription = `${
              customerName || "Customer"
            } paid ₦${paidAmount} for invoice ${invoice.invoice_id}`;

            const { data: transaction, error: transactionError } =
              await supabase
                .from("transactions")
                .insert([
                  {
                    user_id: invoice.user_id,
                    type: "credit",
                    amount: paidAmount,
                    status: "success",
                    reference: `INV-${invoice.invoice_id}-${
                      nombaTransactionId || orderReference
                    }`,
                    description: transactionDescription,
                    narration: `Payment received for Invoice #${
                      invoice.invoice_id
                    } from ${customerName || "customer"}`,
                    fee: payload?.data?.transaction?.fee || 0,
                    channel: "invoice_payment",
                    sender: {
                      name: customerName,
                      email: customerEmail,
                      phone: payload?.data?.customer?.phone || null,
                      type: "customer",
                    },
                    receiver: {
                      name: invoice.from_name,
                      email: invoice.from_email,
                      business: invoice.business_name,
                      type: "merchant",
                    },
                    external_response: {
                      nomba_transaction_id: nombaTransactionId,
                      order_reference: orderReference,
                      payment_method: "card_payment",
                    },
                  },
                ])
                .select()
                .single();

            if (transactionError) {
              console.error(
                "❌ Failed to create transaction record:",
                transactionError
              );
            } else {
              console.log(
                "✅ Transaction record created for merchant:",
                transaction.id
              );
            }
          } catch (transactionError: any) {
            console.error(
              "❌ Transaction creation error:",
              transactionError.message
            );
          }

          // Update invoice totals
          await updateInvoiceTotals(invoice, paidAmount);

          // Credit user's wallet
          console.log(`💰 Crediting wallet: ${invoice.user_id}`);

          const { error: creditError } = await supabase.rpc(
            "increment_wallet_balance",
            {
              user_id: invoice.user_id,
              amt: paidAmount,
            }
          );

          if (creditError) {
            console.error("❌ Failed to credit wallet:", creditError);
            // Don't fail the entire process if wallet credit fails
          } else {
            console.log(
              `✅ Successfully credited ₦${paidAmount} to user ${invoice.user_id}`
            );
          }

          try {
            // Get invoice creator's email
            const { data: creatorData } = await supabase
              .from("users")
              .select("email")
              .eq("id", invoice.user_id)
              .single();

            const creatorEmail = creatorData?.email;

            // Send email to payer
            if (customerEmail) {
              sendPaymentSuccessEmail(
                customerEmail,
                invoice.invoice_id,
                paidAmount,
                customerName || "Customer",
                invoice
              ).catch((error) =>
                console.error("❌ Payer email failed:", error)
              );
            } else {
              console.log(
                "⚠️ No customer email available for payment confirmation"
              );
            }

            // Send notification to invoice creator
            if (creatorEmail) {
              sendInvoiceCreatorNotification(
                creatorEmail,
                invoice.invoice_id,
                paidAmount,
                customerName || "Customer",
                customerEmail || "N/A",
                invoice
              ).catch((error) =>
                console.error("❌ Creator notification failed:", error)
              );
            } else {
              console.log("⚠️ No creator email available for notification");
            }

            console.log("✅ Email sending initiated");
          } catch (emailError) {
            console.error(
              "❌ Email setup error (but payment still processed):",
              emailError
            );
          }

          return NextResponse.json({ success: true }, { status: 200 });
        } catch (invoiceError: any) {
          console.error("❌ Invoice processing error:", invoiceError);
          return NextResponse.json(
            { error: "Invoice processing failed" },
            { status: 500 }
          );
        }
      }
      // -------------------- END INVOICE PAYMENT HANDLING --------------------

      // Helper function to update invoice totals
      async function updateInvoiceTotals(
        invoice: any,
        paidAmountNaira: number
      ) {
        try {
          const paidAmount = paidAmountNaira;

          const targetQty = Number(invoice.target_quantity || 1);
          const totalAmount = Number(invoice.total_amount || 0);
          const currentPaidAmount = Number(invoice.paid_amount || 0);
          const currentPaidQty = Number(invoice.paid_quantity || 0);

          let newPaidAmount = currentPaidAmount + paidAmount;
          let newPaidQuantity = currentPaidQty;
          let newStatus = invoice.status;

          console.log("📊 Invoice update calculations:", {
            currentPaidAmount,
            paidAmount,
            newPaidAmount,
            totalAmount,
            targetQty,
            currentPaidQty,
            allow_multiple_payments: invoice.allow_multiple_payments,
          });

          if (invoice.allow_multiple_payments) {
            // FIXED: Calculate how many COMPLETE quantities are paid for
            const cumulativeQuantitiesPaid = Math.floor(
              newPaidAmount / totalAmount
            );

            console.log(`🔢 Cumulative quantities paid calculation:`, {
              newPaidAmount,
              totalAmount,
              division: newPaidAmount / totalAmount,
              cumulativeQuantitiesPaid,
            });

            // Only update if we have more complete quantities than before
            if (cumulativeQuantitiesPaid > currentPaidQty) {
              newPaidQuantity = cumulativeQuantitiesPaid;
              console.log(
                `✅ Quantity increased: ${currentPaidQty} → ${newPaidQuantity}`
              );
            }

            // Check if all quantities are paid
            if (newPaidQuantity >= targetQty) {
              newStatus = "paid";
              console.log("🎯 All quantities paid - marking as fully paid");
            } else if (newPaidQuantity > 0 || newPaidAmount > 0) {
              newStatus = "partially_paid";
              console.log("📦 Partially paid - some quantities completed");
            }
          } else {
            // For single payment invoices
            if (newPaidAmount >= totalAmount) {
              newStatus = "paid";
              console.log("🎯 Full amount paid - marking as paid");
            } else if (newPaidAmount > 0) {
              newStatus = "partially_paid";
              console.log("💰 Partial payment received");
            }
          }

          const updateData: any = {
            paid_amount: newPaidAmount,
            paid_quantity: newPaidQuantity,
            status: newStatus,
            updated_at: new Date().toISOString(),
          };

          if (newStatus === "paid") {
            updateData.paid_at = new Date().toISOString();
            console.log("⏰ Setting paid_at timestamp");
          }

          console.log("🔄 Updating invoice with data:", updateData);

          const { error: updateError } = await supabase
            .from("invoices")
            .update(updateData)
            .eq("id", invoice.id);

          if (updateError) {
            console.error("❌ Failed to update invoice:", updateError);
            throw updateError;
          }

          console.log("✅ Invoice totals updated successfully:", {
            invoice_id: invoice.invoice_id,
            newPaidAmount,
            newPaidQuantity,
            targetQty,
            newStatus,
          });

          return { newPaidAmount, newPaidQuantity, newStatus };
        } catch (error) {
          console.error("❌ Error in updateInvoiceTotals:", error);
          throw error;
        }
      }

      // DETERMINE userId & reference for transaction
      let userId: string | null = null;
      let referenceToUse: string | null =
        orderReference || nombaTransactionId || tx.sessionId || null;
      let txType = isCardPayment ? "card_deposit" : "deposit";
      let channel = isCardPayment ? "card" : "bank";

      // For VA: aliasAccountReference === userId (you confirmed)
      if (isVirtualAccountDeposit) {
        userId = aliasAccountReference;
        // for VA there may not be an orderReference; use transactionId as merchant_tx_ref
        referenceToUse =
          nombaTransactionId || tx.sessionId || `nomba-${Date.now()}`;
        txType = "virtual_account_deposit";
        channel = "virtual_account";
        console.log("🏦 Virtual Account deposit detected");
      } else if (isCardPayment) {
        // Card: find the pending transaction inserted at initialize step using orderReference
        referenceToUse = orderReference;
        // find transaction row to get userId
        const { data: pendingByRef, error: refErr } = await supabase
          .from("transactions")
          .select("*")
          .eq("reference", referenceToUse)
          .maybeSingle();

        if (refErr) {
          console.error("❌ Supabase error finding orderReference:", refErr);
          return NextResponse.json({ error: "DB error" }, { status: 500 });
        }

        if (pendingByRef) {
          userId = pendingByRef.user_id;
        } else {
          // fallback: try to find user by customerEmail if present
          const customerEmail =
            order?.customerEmail ||
            payload.data?.customer?.customerEmail ||
            null;
          if (customerEmail) {
            const { data: userByEmail } = await supabase
              .from("users")
              .select("id")
              .eq("email", customerEmail)
              .maybeSingle();
            userId = userByEmail?.id || null;
          }
        }
      }

      if (!userId) {
        console.warn(
          "⚠️ Could not determine userId for deposit. referenceToUse:",
          referenceToUse
        );

        if (aliasAccountReference) {
          userId = aliasAccountReference;
          console.log("   - Using aliasAccountReference as userId:", userId);
        } else {
          // Nothing we can do reliably
          console.error("❌ No user to credit - aborting");
          return NextResponse.json(
            { message: "No user to credit" },
            { status: 200 }
          );
        }
      }

      // ✅ DEPOSIT FEE CALCULATIONS
      const amount = transactionAmount;

      // NO APP FEES FOR ANY PAYMENT METHOD
      let ourAppFee = 0;
      let totalFees = Number(nombaFee.toFixed(2));
      let netCredit = Number((amount - totalFees).toFixed(2));
      const total_deduction = amount;

      console.log("💰 Deposit calculations (NO CHARGES):");
      console.log("   - Amount:", amount);
      console.log("   - Nomba's fee:", nombaFee);
      console.log("   - Our app fee:", ourAppFee);
      console.log("   - Total fees:", totalFees);
      console.log("   - Net credit to user:", netCredit);

      // Idempotency: check existing transaction by reference or merchant_tx_ref
      const { data: existingTx, error: existingErr } = await supabase
        .from("transactions")
        .select("*")
        .or(
          `reference.eq.${referenceToUse},merchant_tx_ref.eq.${nombaTransactionId}`
        )
        .maybeSingle();

      if (existingErr) {
        console.error("❌ Error checking existing transaction:", existingErr);
        return NextResponse.json({ error: "DB error" }, { status: 500 });
      }

      // ✅ Already successfully processed
      if (existingTx && existingTx.status === "success") {
        console.log(
          "⚠️ Deposit already processed (idempotent). Skipping credit."
        );
        return NextResponse.json(
          { message: "Already processed" },
          { status: 200 }
        );
      }

      // 🔁 Existing pending tx: mark success and credit
      if (existingTx) {
        console.log(
          "🔁 Found existing transaction. Updating to success and crediting user."
        );
        // Store fee breakdown in external_response
        const updatedExternalResponse = {
          ...payload,
          fee_breakdown: {
            nomba_fee: nombaFee,
            total_fee: totalFees,
            profit_margin: Number((ourAppFee - nombaFee).toFixed(2)),
          },
        };

        const { error: updErr } = await supabase
          .from("transactions")
          .update({
            status: "success",
            amount,
            fee: totalFees,
            total_deduction,
            merchant_tx_ref: nombaTransactionId,
            external_response: updatedExternalResponse,
            channel,
          })
          .eq("id", existingTx.id);

        if (updErr) {
          console.error("❌ Failed to update existing transaction:", updErr);
          return NextResponse.json(
            { error: "Failed to update transaction" },
            { status: 500 }
          );
        }

        // Credit wallet atomically using RPC
        const { error: rpcErr } = await supabase.rpc(
          "increment_wallet_balance",
          {
            user_id: existingTx.user_id,
            amt: netCredit,
          }
        );

        if (rpcErr) {
          console.error("❌ RPC increment_wallet_balance failed:", rpcErr);
          // fallback manual credit
          const { data: before } = await supabase
            .from("users")
            .select("wallet_balance")
            .eq("id", existingTx.user_id)
            .single();

          if (!before) {
            console.error("❌ User not found for manual credit fallback");
            return NextResponse.json(
              { error: "User not found" },
              { status: 500 }
            );
          }

          const newBal = Number(before.wallet_balance) + netCredit;
          const { error: updUserErr } = await supabase
            .from("users")
            .update({ wallet_balance: newBal })
            .eq("id", existingTx.user_id);

          if (updUserErr) {
            console.error("❌ Manual wallet update failed:", updUserErr);
            return NextResponse.json(
              { error: "Failed to credit wallet" },
              { status: 500 }
            );
          }
        }

        console.log(
          `✅ Credited user ${existingTx.user_id} with ₦${netCredit} (existing tx updated)`
        );
        return NextResponse.json({ success: true }, { status: 200 });
      }

      // No existing tx: create and credit (auto-create best-effort)
      console.log(
        "➕ No existing tx — creating transaction and crediting user now (auto-create)."
      );
      // Store fee breakdown in external_response
      const updatedExternalResponse = {
        ...payload,
        fee_breakdown: {
          nomba_fee: nombaFee,
          app_fee: ourAppFee,
          total_fee: totalFees,
          profit_margin: Number((ourAppFee - nombaFee).toFixed(2)),
        },
      };

      const { error: insertErr } = await supabase.from("transactions").insert([
        {
          user_id: userId,
          type: txType,
          amount,
          fee: totalFees,
          total_deduction,
          status: "success",
          reference: referenceToUse,
          merchant_tx_ref: nombaTransactionId,
          description:
            txType === "card_deposit"
              ? "Card deposit"
              : txType === "virtual_account_deposit"
              ? "Account deposit"
              : "Bank deposit",
          external_response: updatedExternalResponse,
          channel: channel,
        },
      ]);

      if (insertErr) {
        // if duplicate (unique constraint) — treat as processed
        if (insertErr.code === "23505") {
          console.warn(
            "⚠️ Duplicate insert prevented. Treating as already processed."
          );
          return NextResponse.json(
            { message: "Duplicate ignored" },
            { status: 200 }
          );
        }
        console.error("❌ Failed to insert new transaction:", insertErr);
        return NextResponse.json(
          { error: "Failed to record transaction" },
          { status: 500 }
        );
      }

      // credit via RPC
      const { error: rpcErr2 } = await supabase.rpc(
        "increment_wallet_balance",
        {
          user_id: userId,
          amt: netCredit,
        }
      );
      if (rpcErr2) {
        console.error("❌ RPC increment failed (after insert):", rpcErr2);
        // fallback manual
        const { data: before } = await supabase
          .from("users")
          .select("wallet_balance")
          .eq("id", userId)
          .single();
        if (!before) {
          console.error("❌ User not found for manual credit fallback");
          return NextResponse.json(
            { error: "User not found" },
            { status: 500 }
          );
        }
        const newBal = Number(before.wallet_balance) + netCredit;
        const { error: uiErr } = await supabase
          .from("users")
          .update({ wallet_balance: newBal })
          .eq("id", userId);
        if (uiErr) {
          console.error("❌ Manual wallet update failed:", uiErr);
          return NextResponse.json(
            { error: "Failed to credit wallet" },
            { status: 500 }
          );
        }
      }

      console.log(
        `✅ Auto-created transaction and credited user ${userId} with ₦${netCredit}`
      );

      // VIRTUAL ACCOUNT DEPOSIT EMAIL NOTIFICATION
      console.log("🔍 Virtual Account Deposit Payload Structure:", {
        transaction: payload.data?.transaction,
        customer: payload.data?.customer,
        fullPayload: payload,
      });

      // Extract virtual account details from your actual webhook structure
      const bankName =
        payload.data?.customer?.bankName || // "Paycom (Opay)" from your sample
        payload.data?.transaction?.aliasAccountType || // "VIRTUAL" from your sample
        "Virtual Account Bank";

      const accountNumber =
        payload.data?.transaction?.aliasAccountNumber || // "3580219918" from your sample
        payload.data?.customer?.accountNumber || // "9132316236" from your sample
        "Virtual Account";

      const accountName =
        payload.data?.transaction?.aliasAccountName || // "DIGITAL/Lohloh Abbalolo" from your sample
        payload.data?.customer?.senderName || // "IBRAHIM ABBALOLO LAWAL" from your sample
        "Your Virtual Account";

      const senderName =
        payload.data?.customer?.senderName || // "IBRAHIM ABBALOLO LAWAL" from your sample
        "Customer";

      console.log("🏦 Extracted Virtual Account Details:", {
        bankName,
        accountNumber,
        accountName,
        senderName,
      });

      if (userId) {
        await sendVirtualAccountDepositEmailNotification(
          userId,
          amount,
          nombaTransactionId || referenceToUse,
          bankName,
          accountNumber,
          accountName,
          senderName
        );
      }

      return NextResponse.json({ success: true }, { status: 200 });
    } // end deposit handling

    // ---------- WITHDRAWAL / TRANSFER (OUTGOING) ----------
    if (isPayoutOrTransfer) {
      console.log("➡️ Handling payout/transfer flow");

      const refCandidates = [merchantTxRef, nombaTransactionId].filter(Boolean);

      const orExprParts = refCandidates
        .map((r) => `merchant_tx_ref.eq.${r}`)
        .concat(refCandidates.map((r) => `reference.eq.${r}`));
      const orExpr = orExprParts.join(",");

      const { data: pendingTxList, error: pendingErr } = await supabase
        .from("transactions")
        .select("*")
        .or(orExpr)
        .in("status", ["pending", "processing"])
        .order("created_at", { ascending: false })
        .limit(1);

      if (pendingErr) {
        console.error(
          "❌ DB error while finding pending transaction:",
          pendingErr
        );
        return NextResponse.json({ error: "DB error" }, { status: 500 });
      }

      const pendingTx = pendingTxList?.[0];

      if (!pendingTx) {
        console.warn(
          "⚠️ No matching pending withdrawal found for refs:",
          refCandidates
        );
        return NextResponse.json(
          { message: "No matching withdrawal transaction" },
          { status: 200 }
        );
      }

      // Check if this is a P2P transfer or regular withdrawal
      const isP2PTransfer = pendingTx.type === "p2p_transfer";
      const isRegularWithdrawal = pendingTx.type === "withdrawal";

      console.log("   - Is P2P Transfer:", isP2PTransfer);
      console.log("   - Is Regular Withdrawal:", isRegularWithdrawal);

      // Idempotency - check if already processed
      if (["success", "failed"].includes(pendingTx.status)) {
        console.log(`⚠️ Transaction already ${pendingTx.status}. Skipping.`);
        return NextResponse.json(
          { message: "Already processed" },
          { status: 200 }
        );
      }

      const txAmount = Number(pendingTx.amount ?? transactionAmount ?? 0);

      let appFee = 0;
      let totalFees = 0;
      let totalDeduction = txAmount;

      if (isRegularWithdrawal) {
        // Regular withdrawal fee logic: 1% (₦20 min, ₦1000 cap)
        appFee = txAmount * 0.0025;
        appFee = Math.max(appFee, 20);
        appFee = Math.min(appFee, 150);
        appFee = Number(appFee.toFixed(2));
        totalFees = Number((nombaFee + appFee).toFixed(2));
        totalDeduction = txAmount;

        console.log("💰 Regular Withdrawal calculations:");
        console.log("   - Withdrawal amount:", txAmount);
        console.log("   - Nomba fee:", nombaFee);
        console.log("   - Our app fee:", appFee);
        console.log("   - Total fees:", totalFees);
        console.log("   - Total deduction:", totalDeduction);
      } else if (isP2PTransfer) {
        // 🔥 P2P transfers have NO FEES
        appFee = 0;
        totalFees = 0; // No fees for P2P
        totalDeduction = txAmount; // Only deduct the transfer amount

        console.log("💰 P2P Transfer calculations (NO FEES):");
        console.log("   - Transfer amount:", txAmount);
        console.log("   - Nomba fee:", nombaFee); // This might be 0 for internal transfers
        console.log("   - Our app fee:", appFee);
        console.log("   - Total fees:", totalFees);
        console.log("   - Total deduction:", totalDeduction);
      }

      // ✅ SUCCESS CASE
      if (eventType === "payout_success" || txStatus === "success") {
        console.log(
          `✅ ${
            isP2PTransfer ? "P2P Transfer" : "Withdrawal"
          } success - marking transaction as success`
        );

        const reference = nombaTransactionId || crypto.randomUUID();

        // Build updated external response with fee info
        const updatedExternalResponse = {
          ...payload,
          fee_breakdown: {
            transaction_type: isP2PTransfer ? "p2p_transfer" : "withdrawal",
            amount: txAmount,
            nomba_fee: nombaFee,
            app_fee: appFee,
            total_fee: totalFees,
            total_deduction: totalDeduction,
          },
        };

        // 🟩 No second deduction here — we already deducted at initiation
        const { error: updateErr } = await supabase
          .from("transactions")
          .update({
            status: "success",
            reference,
            external_response: updatedExternalResponse,
            total_deduction: totalDeduction,
            fee: totalFees,
          })
          .eq("id", pendingTx.id);

        const withdrawalDetails =
          pendingTx.external_response?.withdrawal_details || {};

        const recipientName =
          payload.data?.customer?.recipientName ||
          withdrawalDetails.account_name ||
          "N/A";

        const recipientAccount =
          payload.data?.customer?.accountNumber ||
          withdrawalDetails.account_number ||
          "N/A";

        const bankName =
          payload.data?.customer?.bankName ||
          withdrawalDetails.bank_name ||
          "N/A";

        // 🔥 FIX: Extract narration from payload
        const narration =
          payload.data?.transaction?.narration || // "my money" from your payload
          pendingTx.narration || // Fallback to transaction narration
          "Transfer";

        console.log("🏦 Extracted Withdrawal Details:", {
          recipientName,
          recipientAccount,
          bankName,
          narration, // Add narration to logs
        });

        await sendWithdrawalEmailNotification(
          pendingTx.user_id,
          "success",
          txAmount,
          nombaFee,
          appFee,
          totalDeduction,
          recipientName,
          recipientAccount,
          bankName,
          narration, // Pass the extracted narration
          pendingTx.id
        );

        console.log(pendingTx, "pendingTx");

        if (updateErr) {
          console.error("❌ Failed to update transaction:", updateErr);
          return NextResponse.json({ error: "Update failed" }, { status: 500 });
        }

        // 🔥 NEW: For P2P transfers, also credit the receiver
        if (isP2PTransfer && pendingTx.receiver) {
          try {
            console.log("💰 Processing P2P receiver credit...");

            // Find receiver by wallet_id from the transaction record
            const { data: receiver, error: receiverError } = await supabase
              .from("users")
              .select("id, first_name, last_name")
              .eq("wallet_id", pendingTx.receiver.wallet_id)
              .single();

            if (receiverError || !receiver) {
              console.error("❌ P2P receiver not found:", pendingTx.receiver);
            } else {
              // Credit receiver's wallet
              const { error: creditError } = await supabase.rpc(
                "increment_wallet_balance",
                {
                  user_id: receiver.id,
                  amt: txAmount,
                }
              );

              if (creditError) {
                console.error(
                  "❌ Failed to credit receiver wallet:",
                  creditError
                );
              } else {
                // Create receiver transaction record
                await supabase.from("transactions").insert({
                  user_id: receiver.id,
                  type: "p2p_received",
                  amount: txAmount,
                  status: "success",
                  description: `Received ₦${txAmount} from ${
                    pendingTx.sender?.name || "User"
                  }`,
                  narration: pendingTx.narration || "P2P Received",
                  reference: reference,
                  external_response: updatedExternalResponse,
                  sender: pendingTx.sender,
                });

                console.log(
                  `✅ P2P receiver ${receiver.id} credited with ₦${txAmount}`
                );
              }
            }
          } catch (receiverErr) {
            console.error(
              "❌ Error processing P2P receiver credit:",
              receiverErr
            );
            // Don't fail the whole webhook - log and continue
          }
        }

        return NextResponse.json(
          {
            success: true,
            message: `${
              isP2PTransfer ? "P2P Transfer" : "Withdrawal"
            } processed successfully`,
            transaction_type: isP2PTransfer ? "p2p_transfer" : "withdrawal",
          },
          { status: 200 }
        );
      }

      // ❌ FAILURE CASE — REFUND USER
      if (eventType === "payout_failed" || txStatus === "failed") {
        console.log(
          `❌ ${
            isP2PTransfer ? "P2P Transfer" : "Withdrawal"
          } failed - refunding user and marking transaction failed`
        );

        // Extract error details from the payload
        const errorDetail =
          payload.data?.transaction?.responseMessage ||
          payload.data?.transaction?.narration || // This might be the error narration
          payload.error?.message ||
          "Transaction failed";

        // 🔥 FIX: Extract narration from payload (same as success case)
        const narration =
          payload.data?.transaction?.narration || // "my money" from your payload
          pendingTx.narration || // Fallback to transaction narration
          "Transfer";

        const updatedExternalResponse = {
          ...payload,
          fee_breakdown: {
            transaction_type: isP2PTransfer ? "p2p_transfer" : "withdrawal",
            nomba_fee: nombaFee,
            app_fee: appFee,
            total_fee: totalFees,
            failed: true,
          },
        };

        // Update transaction to failed
        const { error: updateError } = await supabase
          .from("transactions")
          .update({
            status: "failed",
            external_response: updatedExternalResponse,
            reference: nombaTransactionId || pendingTx.reference,
          })
          .eq("id", pendingTx.id);

        // Extract withdrawal details from the actual webhook payload
        const withdrawalDetails =
          pendingTx.external_response?.withdrawal_details || {};

        const recipientName =
          payload.data?.customer?.recipientName ||
          withdrawalDetails.account_name ||
          "N/A";

        const recipientAccount =
          payload.data?.customer?.accountNumber ||
          withdrawalDetails.account_number ||
          "N/A";

        const bankName =
          payload.data?.customer?.bankName ||
          withdrawalDetails.bank_name ||
          "N/A";

        console.log("🏦 Extracted Withdrawal Details:", {
          recipientName,
          recipientAccount,
          bankName,
          narration, // Add narration to logs
          errorDetail,
        });

        if (updateError) {
          console.error("❌ Failed to update transaction status:", updateError);
          return NextResponse.json(
            { error: "Failed to update transaction" },
            { status: 500 }
          );
        }

        // Refund wallet via RPC since we deducted earlier
        console.log("🔄 Refunding user wallet...");
        const refundReference = `refund_${
          nombaTransactionId || crypto.randomUUID()
        }`;
        const { error: refundErr } = await supabase.rpc(
          "deduct_wallet_balance",
          {
            user_id: pendingTx.user_id,
            amt: -totalDeduction, // negative = credit back
            transaction_type: "credit",
            reference: refundReference,
            description: `Refund for failed ${
              isP2PTransfer ? "P2P transfer" : "withdrawal"
            } of ₦${txAmount}`,
          }
        );

        if (refundErr) {
          console.error("❌ Refund RPC failed:", refundErr.message);
          return NextResponse.json(
            { error: "Failed to refund wallet via RPC" },
            { status: 500 }
          );
        }

        // Send failure email with error details
        await sendWithdrawalEmailNotification(
          pendingTx.user_id,
          "failed",
          txAmount,
          nombaFee,
          appFee,
          totalDeduction,
          recipientName,
          recipientAccount,
          bankName,
          narration, // Pass the extracted narration
          pendingTx.id,
          errorDetail
        );

        console.log(
          `✅ Refund completed successfully for user ${pendingTx.user_id}`
        );
        return NextResponse.json(
          {
            refunded: true,
            transaction_type: isP2PTransfer ? "p2p_transfer" : "withdrawal",
          },
          { status: 200 }
        );
      }
      console.log("ℹ️ Unhandled transfer event/status. Ignoring.");
      return NextResponse.json(
        { message: "Ignored transfer event" },
        { status: 200 }
      );
    }

    // If we reach here, event type not handled specifically
    console.log("ℹ️ Event type not matched. Ignoring.");
    return NextResponse.json({ message: "Ignored event" }, { status: 200 });
  } catch (err: any) {
    console.error("🔥 Webhook processing error:", err);
    return NextResponse.json(
      { error: err.message || "Server error" },
      { status: 500 }
    );
  }
}

// export async function POST(req: Request) {
//   const timestamp = req.headers.get("nomba-timestamp");
//   const signature = req.headers.get("nomba-sig-value");

//   // ✅ TEMP: Allow missing headers only for initial verification
//   if (!timestamp || !signature) {
//     console.log("Nomba initial webhook verification ping — allowing");
//     return new Response(JSON.stringify({ verified: true }), { status: 200 });
//   }

//   // 🔐 Normal processing for real events
//   const body = await req.json();
//   console.log("Nomba Webhook Triggered", body);

//   return new Response(JSON.stringify({ received: true }), { status: 200 });
// }
