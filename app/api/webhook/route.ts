// // app/api/webhook/route.ts
// import { NextRequest, NextResponse } from "next/server";
// import { createHmac, timingSafeEqual } from "crypto";
// import { createClient } from "@supabase/supabase-js";

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
//     const feeFromNomba = safeNum(tx.fee ?? payload.data?.transaction?.fee ?? 0);
//     const txStatusRaw = (tx.status || payload.data?.status || "").toString();
//     const txStatus = txStatusRaw.toLowerCase();

//     console.log("🔎 eventType:", eventType);
//     console.log("🔎 txType:", tx.type || tx.transactionType || "unknown");
//     console.log("🔎 nombaTransactionId:", nombaTransactionId);
//     console.log("🔎 merchantTxRef:", merchantTxRef);
//     console.log("🔎 orderReference:", orderReference);
//     console.log("🔎 aliasAccountReference:", aliasAccountReference);
//     console.log(
//       "🔎 transactionAmount:",
//       transactionAmount,
//       "fee:",
//       feeFromNomba,
//       "txStatus:",
//       txStatus
//     );

//     // 4) Decide which flow this is:
//     // - Card payment -> payment_success with order.orderReference (card_deposit)
//     // - Virtual account deposit -> payment_success or vact_transfer with aliasAccountReference
//     // - Outgoing transfer (withdrawal) -> payout_success/payout_failed or transfer with merchantTxRef/transactionId
//     const isCardPayment = Boolean(orderReference);
//     const isVirtualAccountDeposit = Boolean(aliasAccountReference);
//     const isPayoutOrTransfer =
//       Boolean(merchantTxRef) ||
//       (tx.type && tx.type.toLowerCase().includes("transfer")) ||
//       eventType?.toLowerCase()?.includes("payout");

//     // ---------- DEPOSIT: CARD (orderReference) OR VA ----------
//     if (
//       eventType === "payment_success" ||
//       eventType === "payment.succeeded" ||
//       isCardPayment ||
//       isVirtualAccountDeposit
//     ) {
//       // -------------------- SUBSCRIPTION HANDLING --------------------
//       // ✅ Only handle card payments with subscription references (SUB-)
//       try {
//         if (isCardPayment && orderReference?.includes("SUB-")) {
//           // Extract email, full name, plan, and amount from payload
//           const subEmail =
//             payload.data?.order?.customerEmail ||
//             payload.data?.customer?.customerEmail ||
//             null;

//           const subFullName =
//             payload.data?.order?.fullName ||
//             payload.data?.customer?.fullName ||
//             "Subscriber";

//           const subPlanId =
//             payload.data?.order?.metadata?.planId ||
//             payload.data?.meta?.planId ||
//             "basic";

//           const subAmount =
//             safeNum(payload.data?.transaction?.transactionAmount) ||
//             safeNum(payload.data?.order?.amount) ||
//             0;

//           const paymentReference = orderReference;

//           if (subEmail && subPlanId && paymentReference) {
//             // Idempotent: check existing subscriber
//             const { data: existingSub } = await supabase
//               .from("subscribers")
//               .select("*")
//               .or(
//                 `payment_reference.eq.${paymentReference},(email.eq.${subEmail},plan_id.eq.${subPlanId})`
//               )
//               .maybeSingle();

//             const now = new Date();
//             const expiresAt = new Date(
//               now.getTime() + 30 * 24 * 60 * 60 * 1000
//             ); // 30 days

//             if (existingSub) {
//               await supabase
//                 .from("subscribers")
//                 .update({
//                   payment_status: "success",
//                   subscription_expires_at: expiresAt.toISOString(),
//                 })
//                 .eq("id", existingSub.id);

//               console.log(
//                 `⚠️ Subscriber exists, updated expiry for ${subEmail}`
//               );
//             } else {
//               await supabase.from("subscribers").insert([
//                 {
//                   email: subEmail,
//                   full_name: subFullName,
//                   plan_id: subPlanId,
//                   amount: subAmount,
//                   payment_reference: paymentReference,
//                   payment_status: "success",
//                   subscription_expires_at: expiresAt.toISOString(),
//                   created_at: now.toISOString(),
//                 },
//               ]);

//               console.log(
//                 `✅ Subscriber created: ${subEmail}, expiresAt: ${expiresAt.toDateString()}`
//               );
//             }

//             // Send subscription confirmation email
//             try {
//               await fetch(`${baseUrl}/api/send-subscription-email`, {
//                 method: "POST",
//                 headers: { "Content-Type": "application/json" },
//                 body: JSON.stringify({
//                   to: subEmail,
//                   subject: "Subscription Payment Successful ✅",
//                   message: `
//           <p>Hello ${subFullName},</p>
//           <p>We received your payment of <strong>₦${subAmount}</strong> for your subscription.</p>
//           <p>Your subscription is now active and will expire on <strong>${expiresAt.toDateString()}</strong>.</p>
//           <p>Reference: <strong>${paymentReference}</strong></p>
//           <p>Thank you 🎉</p>
//         `,
//                 }),
//               });
//               console.log(
//                 `📨 Subscription confirmation email sent to ${subEmail}`
//               );
//             } catch (emailErr) {
//               console.error("❌ Failed sending subscription email:", emailErr);
//             }

//             // ✅ IMPORTANT: stop further processing for subscription
//             return NextResponse.json(
//               { success: true, message: "Subscription processed" },
//               { status: 200 }
//             );
//           } else {
//             console.warn(
//               "⚠️ Subscription metadata incomplete — skipping insert/update/email"
//             );
//           }
//         }
//       } catch (subErr) {
//         console.error("❌ Subscription handling error:", subErr);
//       }
//       // -------------------- END SUBSCRIPTION HANDLING --------------------

//       // DETERMINE userId & reference for transaction
//       let userId: string | null = null;
//       let referenceToUse: string | null =
//         orderReference || nombaTransactionId || tx.sessionId || null;
//       let txType = isCardPayment ? "card_deposit" : "deposit";
//       let channel = isCardPayment ? "card" : "bank";

//       console.log(
//         "➡️ Handling deposit/card flow. txType:",
//         txType,
//         "channel:",
//         channel
//       );

//       // For VA: aliasAccountReference === userId (you confirmed)
//       if (isVirtualAccountDeposit) {
//         userId = aliasAccountReference;
//         // for VA there may not be an orderReference; use transactionId as merchant_tx_ref
//         referenceToUse =
//           nombaTransactionId || tx.sessionId || `nomba-${Date.now()}`;
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
//         // Best effort: if aliasAccountReference exists but not stored in users table, create transaction referencing alias as userId (you said alias === userId)
//         if (aliasAccountReference) {
//           userId = aliasAccountReference;
//         } else {
//           // Nothing we can do reliably
//           return NextResponse.json(
//             { message: "No user to credit" },
//             { status: 200 }
//           );
//         }
//       }

//       console.log(
//         "👤 Deposit userId resolved:",
//         userId,
//         "referenceToUse:",
//         referenceToUse
//       );

//       // Compute amounts
//       const amount = transactionAmount;

//       const fee = feeFromNomba;
//       const netCredit = Number((amount - fee).toFixed(2));
//       const total_deduction = Number((amount - fee).toFixed(2)); // for deposit, store net as total_deduction for consistency

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
//         const { error: updErr } = await supabase
//           .from("transactions")
//           .update({
//             status: "success",
//             amount,
//             fee,
//             total_deduction,
//             merchant_tx_ref: nombaTransactionId,
//             external_response: payload,
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
//       const { error: insertErr } = await supabase.from("transactions").insert([
//         {
//           user_id: userId,
//           type: txType === "card_deposit" ? "card_deposit" : "deposit",
//           amount,
//           fee,
//           total_deduction,
//           status: "success",
//           reference: referenceToUse,
//           merchant_tx_ref: nombaTransactionId,
//           description:
//             txType === "card_deposit" ? "Card deposit" : "Bank deposit",
//           external_response: payload,
//           channel: txType === "card_deposit" ? "card" : "bank",
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
//       return NextResponse.json({ success: true }, { status: 200 });
//     } // end deposit handling

//     // ---------- WITHDRAWAL / TRANSFER (OUTGOING) ----------
// if (isPayoutOrTransfer) {
//   console.log("➡️ Handling payout/transfer flow");

//   const refCandidates = [merchantTxRef, nombaTransactionId].filter(Boolean);
//   console.log("🔎 Searching transaction by candidates:", refCandidates);

//   const orExprParts = refCandidates
//     .map((r) => `merchant_tx_ref.eq.${r}`)
//     .concat(refCandidates.map((r) => `reference.eq.${r}`));
//   const orExpr = orExprParts.join(",");

//   const { data: pendingTx, error: pendingErr } = await supabase
//     .from("transactions")
//     .select("*")
//     .or(orExpr)
//     .maybeSingle();

//   if (pendingErr) {
//     console.error("❌ DB error while finding pending transaction:", pendingErr);
//     return NextResponse.json({ error: "DB error" }, { status: 500 });
//   }

//   if (!pendingTx) {
//     console.warn("⚠️ No matching pending withdrawal found for refs:", refCandidates);
//     return NextResponse.json(
//       { message: "No matching withdrawal transaction" },
//       { status: 200 }
//     );
//   }

//   console.log("📦 Found pending withdrawal:", pendingTx.id, "status:", pendingTx.status);

//   // Idempotency
//   if (["success", "failed"].includes(pendingTx.status)) {
//     console.log(`⚠️ Withdrawal already ${pendingTx.status}. Skipping.`);
//     return NextResponse.json({ message: "Already processed" }, { status: 200 });
//   }

//   const fee = safeNum(pendingTx.fee ?? feeFromNomba);
//   const amount = safeNum(pendingTx.amount ?? transactionAmount);
//   const totalDeduction = Number((amount + fee).toFixed(2));

//   // ✅ Success case
//   if (eventType === "payout_success" || txStatus === "success") {
//     console.log("✅ Payout success. Deducting wallet via RPC...");

//     // Call the new deduct_wallet_balance RPC
//     const reference = nombaTransactionId || crypto.randomUUID();
//     const { data: rpcData, error: rpcError } = await supabase.rpc(
//       "deduct_wallet_balance",
//       {
//         user_id: pendingTx.user_id,
//         amt: totalDeduction,
//         transaction_type: "debit",
//         reference,
//         description: `Withdrawal of ₦${amount} (including ₦${fee} fee)`,
//       }
//     );

//     if (rpcError) {
//       console.error("❌ RPC deduct_wallet_balance failed:", rpcError.message);
//       // Mark transaction failed
//       await supabase
//         .from("transactions")
//         .update({ status: "failed", external_response: payload })
//         .eq("id", pendingTx.id);
//       return NextResponse.json(
//         { error: "Wallet deduction failed via RPC" },
//         { status: 500 }
//       );
//     }

//     const rpcResult = Array.isArray(rpcData) && rpcData.length > 0 ? rpcData[0] : rpcData;

//     if (!rpcResult || rpcResult.status !== "OK") {
//       console.error("⚠️ RPC returned non-OK:", rpcResult);
//       await supabase
//         .from("transactions")
//         .update({ status: "failed", external_response: payload })
//         .eq("id", pendingTx.id);
//       return NextResponse.json(
//         { error: rpcResult?.status || "Deduction failed" },
//         { status: 400 }
//       );
//     }

//     // Update transaction with payout reference and success status
//     await supabase
//       .from("transactions")
//       .update({
//         status: "success",
//         reference,
//         external_response: payload,
//         total_deduction: totalDeduction,
//         fee,
//       })
//       .eq("id", pendingTx.id);

//     console.log(
//       `✅ Withdrawal processed successfully. ₦${totalDeduction} deducted for user ${pendingTx.user_id}`
//     );

//     return NextResponse.json(
//       {
//         success: true,
//         message: "Withdrawal processed successfully",
//         newWalletBalance: rpcResult.balance || rpcResult.new_balance,
//       },
//       { status: 200 }
//     );
//   }

//   // ❌ Failure case: payout_failed
//   if (eventType === "payout_failed" || txStatus === "failed") {
//     console.log("❌ Payout failed. Marking transaction failed and refunding if necessary.");

//     await supabase
//       .from("transactions")
//       .update({
//         status: "failed",
//         external_response: payload,
//         reference: nombaTransactionId || pendingTx.reference,
//       })
//       .eq("id", pendingTx.id);

//     // Attempt safe refund via increment_wallet_balance RPC
//     try {
//       const { error: rpcErr } = await supabase.rpc("increment_wallet_balance", {
//         user_id: pendingTx.user_id,
//         amt: Number(pendingTx.total_deduction ?? pendingTx.amount ?? 0),
//       });

//       if (rpcErr) {
//         console.warn("⚠️ Refund RPC failed:", rpcErr);
//         const { data: u } = await supabase
//           .from("users")
//           .select("wallet_balance")
//           .eq("id", pendingTx.user_id)
//           .single();

//         if (u) {
//           const newBal =
//             Number(u.wallet_balance ?? 0) +
//             Number(pendingTx.total_deduction ?? pendingTx.amount ?? 0);
//           await supabase
//             .from("users")
//             .update({ wallet_balance: newBal })
//             .eq("id", pendingTx.user_id);
//         }
//       } else {
//         console.log("✅ Refund processed via RPC");
//       }
//     } catch (rEx) {
//       console.warn("⚠️ Refund RPC threw error, attempted manual refund", rEx);
//     }

//     console.log("✅ Payout failed processed and refund attempted if needed");
//     return NextResponse.json({ refunded: true }, { status: 200 });
//   }

//   console.log("ℹ️ Unhandled transfer event/status. Ignoring.");
//   return NextResponse.json({ message: "Ignored transfer event" }, { status: 200 });
// }

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



// app/api/webhook/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createHmac, timingSafeEqual } from "crypto";
import { createClient } from "@supabase/supabase-js";

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

    // 🚫 CRITICAL: IGNORE ALL SERVICE PURCHASES COMPLETELY - FIXED VERSION
    const serviceTypes = ["data", "airtime", "cable-tv", "electricity", "utility", "bill", "topup"];
    const serviceRefPatterns = ["Data-", "Airtime-", "Cable-", "Electricity-", "Bill-", "Utility-", "Topup-", "AIRTIME-", "DATA-", "CABLE-", "ELECTRICITY-"];

    const isServicePurchase = serviceTypes.some(service => 
      transactionType.includes(service)
    ) || serviceRefPatterns.some(pattern => 
      merchantTxRef?.includes(pattern)
    );

    if (isServicePurchase) {
      console.log("📱 Ignoring service purchase (data/airtime/cable/electricity/topup) - already handled by main API");
      return NextResponse.json(
        { message: "Service purchase ignored - already processed by main API" },
        { status: 200 }
      );
    }

    // Also ignore ALL payout_success events for service purchases regardless of detection
    if (eventType.includes("payout_success") && 
        (transactionType.includes("topup") || 
         merchantTxRef?.includes("AIRTIME-") || 
         merchantTxRef?.includes("DATA-") ||
         merchantTxRef?.includes("Airtime-") ||
         merchantTxRef?.includes("Data-") ||
         transactionType.includes("airtime") ||
         transactionType.includes("data"))) {
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
      tx.type?.toLowerCase().includes("vact") || // Virtual account transfer
      tx.type?.toLowerCase().includes("deposit") ||
      isCardPayment ||
      isVirtualAccountDeposit;

    const isPayoutOrTransfer =
      (eventType?.toLowerCase()?.includes("payout") && 
       !isServicePurchase) ||
      (Boolean(merchantTxRef) && 
       !isServicePurchase) ||
      (tx.type &&
        tx.type.toLowerCase().includes("transfer") &&
        !tx.type.toLowerCase().includes("vact")); // Exclude virtual account transfers

    console.log("   - isCardPayment:", isCardPayment);
    console.log("   - isVirtualAccountDeposit:", isVirtualAccountDeposit);
    console.log("   - isDepositEvent:", isDepositEvent);
    console.log("   - isPayoutOrTransfer:", isPayoutOrTransfer);
    console.log("   - isServicePurchase:", isServicePurchase);

    // ---------- DEPOSIT: CARD (orderReference) OR VA ----------
    if (isDepositEvent) {
      console.log("💰 Processing DEPOSIT transaction...");

      // -------------------- SUBSCRIPTION HANDLING --------------------
      try {
        if (isCardPayment && orderReference?.includes("SUB-")) {
          // Extract email, full name, plan, and amount from payload
          const subEmail =
            payload.data?.order?.customerEmail ||
            payload.data?.customer?.customerEmail ||
            null;

          const subFullName =
            payload.data?.order?.fullName ||
            payload.data?.customer?.fullName ||
            "Subscriber";

          const subPlanId =
            payload.data?.order?.metadata?.planId ||
            payload.data?.meta?.planId ||
            "basic";

          const subAmount =
            safeNum(payload.data?.transaction?.transactionAmount) ||
            safeNum(payload.data?.order?.amount) ||
            0;

          const paymentReference = orderReference;

          if (subEmail && subPlanId && paymentReference) {
            // Idempotent: check existing subscriber
            const { data: existingSub } = await supabase
              .from("subscribers")
              .select("*")
              .or(
                `payment_reference.eq.${paymentReference},(email.eq.${subEmail},plan_id.eq.${subPlanId})`
              )
              .maybeSingle();

            const now = new Date();
            const expiresAt = new Date(
              now.getTime() + 30 * 24 * 60 * 60 * 1000
            ); // 30 days

            if (existingSub) {
              await supabase
                .from("subscribers")
                .update({
                  payment_status: "success",
                  subscription_expires_at: expiresAt.toISOString(),
                })
                .eq("id", existingSub.id);

              console.log(
                `⚠️ Subscriber exists, updated expiry for ${subEmail}`
              );
            } else {
              await supabase.from("subscribers").insert([
                {
                  email: subEmail,
                  full_name: subFullName,
                  plan_id: subPlanId,
                  amount: subAmount,
                  payment_reference: paymentReference,
                  payment_status: "success",
                  subscription_expires_at: expiresAt.toISOString(),
                  created_at: now.toISOString(),
                },
              ]);

              console.log(
                `✅ Subscriber created: ${subEmail}, expiresAt: ${expiresAt.toDateString()}`
              );
            }

            // Send subscription confirmation email
            try {
              await fetch(`${baseUrl}/api/send-subscription-email`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  to: subEmail,
                  subject: "Subscription Payment Successful ✅",
                  message: `
          <p>Hello ${subFullName},</p>
          <p>We received your payment of <strong>₦${subAmount}</strong> for your subscription.</p>
          <p>Your subscription is now active and will expire on <strong>${expiresAt.toDateString()}</strong>.</p>
          <p>Reference: <strong>${paymentReference}</strong></p>
          <p>Thank you 🎉</p>
        `,
                }),
              });
              console.log(
                `📨 Subscription confirmation email sent to ${subEmail}`
              );
            } catch (emailErr) {
              console.error("❌ Failed sending subscription email:", emailErr);
            }

            // ✅ IMPORTANT: stop further processing for subscription
            return NextResponse.json(
              { success: true, message: "Subscription processed" },
              { status: 200 }
            );
          } else {
            console.warn(
              "⚠️ Subscription metadata incomplete — skipping insert/update/email"
            );
          }
        }
      } catch (subErr) {
        console.error("❌ Subscription handling error:", subErr);
      }
      // -------------------- END SUBSCRIPTION HANDLING --------------------

      // DETERMINE userId & reference for transaction
      let userId: string | null = null;
      let referenceToUse: string | null =
        orderReference || nombaTransactionId || tx.sessionId || null;
      let txType = isCardPayment ? "card_deposit" : "deposit";
      let channel = isCardPayment ? "card" : "bank";

      console.log(
        "➡️ Handling deposit/card flow. txType:",
        txType,
        "channel:",
        channel
      );

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
        // Best effort: if aliasAccountReference exists but not stored in users table, create transaction referencing alias as userId (you said alias === userId)
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

      console.log(
        "👤 Deposit userId resolved:",
        userId,
        "referenceToUse:",
        referenceToUse
      );

      // ✅ DEPOSIT FEE CALCULATIONS
      const amount = transactionAmount;

      // Calculate our app fee based on payment method
      let ourAppFee = 0;
      if (channel === "card" || txType === "card_deposit") {
        // Checkout: 1.6% capped at ₦20,000
        ourAppFee = amount * 0.016;
        ourAppFee = Math.min(ourAppFee, 20000);
      } else if (
        channel === "virtual_account" ||
        txType === "virtual_account_deposit"
      ) {
        // Virtual Account: 0.5% (₦10 min, ₦2000 cap)
        ourAppFee = amount * 0.005;
        ourAppFee = Math.min(Math.max(ourAppFee, 10), 2000);
      } else {
        // Bank transfer: 0.5% (₦20 min, ₦2000 cap)
        ourAppFee = amount * 0.005;
        ourAppFee = Math.min(Math.max(ourAppFee, 20), 2000);
      }

      const finalOurAppFee = Number(ourAppFee.toFixed(2));
      const totalFees = Number((nombaFee + finalOurAppFee).toFixed(2));
      const netCredit = Number((amount - totalFees).toFixed(2));
      const total_deduction = amount; // Gross amount deposited

      console.log("💰 Deposit calculations (WITH FEES):");
      console.log("   - Amount:", amount);
      console.log("   - Nomba's fee:", nombaFee);
      console.log("   - Our app fee:", finalOurAppFee);
      console.log("   - Total fees:", totalFees);
      console.log("   - Our margin:", Number((finalOurAppFee - nombaFee).toFixed(2)));
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
            app_fee: finalOurAppFee,
            total_fee: totalFees,
            profit_margin: Number((finalOurAppFee - nombaFee).toFixed(2)),
          }
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
          app_fee: finalOurAppFee,
          total_fee: totalFees,
          profit_margin: Number((finalOurAppFee - nombaFee).toFixed(2)),
        }
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
              ? "Virtual Account deposit"
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
      return NextResponse.json({ success: true }, { status: 200 });
    } // end deposit handling

    // ---------- WITHDRAWAL / TRANSFER (OUTGOING) ----------
    if (isPayoutOrTransfer) {
      console.log("➡️ Handling payout/transfer flow");

      const refCandidates = [merchantTxRef, nombaTransactionId].filter(Boolean);
      console.log("🔎 Searching transaction by candidates:", refCandidates);

      const orExprParts = refCandidates
        .map((r) => `merchant_tx_ref.eq.${r}`)
        .concat(refCandidates.map((r) => `reference.eq.${r}`));
      const orExpr = orExprParts.join(",");

      const { data: pendingTx, error: pendingErr } = await supabase
        .from("transactions")
        .select("*")
        .or(orExpr)
        .maybeSingle();

      if (pendingErr) {
        console.error("❌ DB error while finding pending transaction:", pendingErr);
        return NextResponse.json({ error: "DB error" }, { status: 500 });
      }

      if (!pendingTx) {
        console.warn("⚠️ No matching pending withdrawal found for refs:", refCandidates);
        return NextResponse.json(
          { message: "No matching withdrawal transaction" },
          { status: 200 }
        );
      }

      console.log("📦 Found pending withdrawal:", pendingTx.id, "status:", pendingTx.status);

      // Idempotency - check if already processed
      if (["success", "failed"].includes(pendingTx.status)) {
        console.log(`⚠️ Withdrawal already ${pendingTx.status}. Skipping.`);
        return NextResponse.json({ message: "Already processed" }, { status: 200 });
      }

      // Withdrawal fee logic
      const withdrawalAmount = Number(pendingTx.amount ?? transactionAmount ?? 0);
      
      // Calculate app fee: 0.5% (₦20 min, ₦2000 cap)
      let withdrawalAppFee = withdrawalAmount * 0.005;
      withdrawalAppFee = Math.max(withdrawalAppFee, 20);
      withdrawalAppFee = Math.min(withdrawalAppFee, 2000);
      withdrawalAppFee = Number(withdrawalAppFee.toFixed(2));

      const totalFees = Number((nombaFee + withdrawalAppFee).toFixed(2));
      const totalDeduction = withdrawalAmount + totalFees;

      console.log("💰 Withdrawal calculations:");
      console.log("   - Withdrawal amount:", withdrawalAmount);
      console.log("   - Nomba fee:", nombaFee);
      console.log("   - Our app fee:", withdrawalAppFee);
      console.log("   - Total fees:", totalFees);
      console.log("   - Total deduction:", totalDeduction);

      // ✅ Success case - withdrawal completed successfully
      if (eventType === "payout_success" || txStatus === "success") {
        console.log("✅ Payout success - updating transaction status to success");

        const updatedExternalResponse = {
          ...payload,
          fee_breakdown: {
            withdrawal_amount: withdrawalAmount,
            nomba_fee: nombaFee,
            app_fee: withdrawalAppFee,
            total_fee: totalFees,
            total_deduction: totalDeduction,
          }
        };

        const { error: updateError } = await supabase
          .from("transactions")
          .update({
            status: "success",
            merchant_tx_ref: nombaTransactionId,
            external_response: updatedExternalResponse,
            fee: totalFees,
            total_deduction: totalDeduction,
          })
          .eq("id", pendingTx.id);

        if (updateError) {
          console.error("❌ Failed to update transaction status:", updateError);
          return NextResponse.json(
            { error: "Failed to update transaction" },
            { status: 500 }
          );
        }

        console.log(`✅ Withdrawal completed for user ${pendingTx.user_id}`);
        return NextResponse.json({ success: true }, { status: 200 });
      }

      // ❌ Failure case: payout_failed - REFUND the user
      if (eventType === "payout_failed" || txStatus === "failed") {
        console.log("❌ Payout failed - refunding user and marking transaction failed");

        const updatedExternalResponse = {
          ...payload,
          fee_breakdown: {
            nomba_fee: nombaFee,
            app_fee: withdrawalAppFee,
            total_fee: totalFees,
            failed: true
          }
        };

        // Update transaction status first
        const { error: updateError } = await supabase
          .from("transactions")
          .update({
            status: "failed",
            external_response: updatedExternalResponse,
            reference: nombaTransactionId || pendingTx.reference,
          })
          .eq("id", pendingTx.id);

        if (updateError) {
          console.error("❌ Failed to update transaction status:", updateError);
          return NextResponse.json(
            { error: "Failed to update transaction" },
            { status: 500 }
          );
        }

        // REFUND the user's wallet if balance was deducted
        if (pendingTx.status === 'pending') {
          console.log("🔄 Refunding user wallet (balance was deducted)...");
          try {
            const refundAmount = withdrawalAmount; // Only refund the principal amount
            
            const { data: user } = await supabase
              .from("users")
              .select("wallet_balance")
              .eq("id", pendingTx.user_id)
              .single();

            if (user) {
              const newBal = Number(user.wallet_balance ?? 0) + refundAmount;
              const { error: updUserErr } = await supabase
                .from("users")
                .update({ wallet_balance: newBal })
                .eq("id", pendingTx.user_id);

              if (updUserErr) {
                console.error("❌ Manual wallet refund failed:", updUserErr);
                return NextResponse.json(
                  { error: "Failed to refund wallet" },
                  { status: 500 }
                );
              }
              console.log(`✅ Manual refund completed. New balance: ₦${newBal}`);
            }
          } catch (rEx) {
            console.warn("⚠️ Refund RPC threw error, attempted manual refund", rEx);
          }
        } else {
          console.log("ℹ️ No refund needed - balance was not deducted");
        }

        console.log("✅ Payout failed processed");
        return NextResponse.json({ refunded: true }, { status: 200 });
      }

      console.log("ℹ️ Unhandled transfer event/status. Ignoring.");
      return NextResponse.json({ message: "Ignored transfer event" }, { status: 200 });
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