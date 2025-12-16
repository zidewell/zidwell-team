// import { NextResponse } from "next/server";
// import { createClient } from "@supabase/supabase-js";
// import bcrypt from "bcryptjs";

// const supabase = createClient(
//   process.env.SUPABASE_URL!,
//   process.env.SUPABASE_SERVICE_ROLE_KEY!
// );

// export async function POST(req: Request) {
//   try {
//     const body = await req.json();
//     let { userId, amount, description, pin } = body;

//     amount = Number(amount);

//     // if (!userId || !amount || amount <= 0 || !pin) {
//     //   return NextResponse.json({ error: "Invalid request data" }, { status: 400 });
//     // }
//     if (!userId || !pin) {

//       return NextResponse.json({ error: "Invalid request data" }, { status: 400 });
//     }

//     // ✅ Fetch user and verify PIN
//     const { data: user, error: fetchError } = await supabase
//       .from("users")
//       .select("transaction_pin, wallet_balance")
//       .eq("id", userId)
//       .single();

//     if (fetchError || !user) {
//       return NextResponse.json(
//         { error: fetchError?.message || "User not found" },
//         { status: 404 }
//       );
//     }

//     if (!user.transaction_pin) {
  
//       return NextResponse.json(
//         { error: "Transaction PIN not set" },
//         { status: 400 }
//       );
//     }

//     const plainPin = Array.isArray(pin) ? pin.join("") : pin;
//     const isValid = await bcrypt.compare(plainPin, user.transaction_pin);

//     if (!isValid) {
//       return NextResponse.json({ error: "Invalid transaction PIN" }, { status: 401 });
//     }

//     // ✅ Call RPC `deduct_wallet_balance`
//     const reference = crypto.randomUUID();
//     const { data: rpcData, error: rpcError } = await supabase.rpc(
//       "deduct_wallet_balance",
//       {
//         user_id: userId,
//         amt: amount,
//         transaction_type: "debit",
//         reference,
//         description: description || "Funds deducted",
//       }
//     );

//     if (rpcError) {
//       console.error("❌ RPC deduct_wallet_balance failed:", rpcError.message);
//       return NextResponse.json(
//         { error: "Failed to deduct wallet balance via RPC" },
//         { status: 500 }
//       );
//     }

//     // ✅ FIX: RPC returns an ARRAY, extract the first item
//     const result = Array.isArray(rpcData) && rpcData.length > 0 ? rpcData[0] : rpcData;
//     console.log("🔍 RPC Result:", result);

//     if (!result || result.status !== "OK") {
    
//       return NextResponse.json(
//         { error: result?.status || "Deduction failed" },
//         { status: 400 }
//       );
//     }

//     const { error: updateError } = await supabase
//       .from("transactions")
//       .update({
//         status: "success"
//         // removed updated_at since column doesn't exist
//       })
//       .eq("id", result.tx_id);

//     if (updateError) {
//       console.error("❌ Failed to update transaction status:", updateError.message);

//     } else {
//       console.log("✅ Transaction status updated to success");
//     }

//     // ✅ FIX: Remove updated_at from users table update too
//     const { error: balanceUpdateError } = await supabase
//       .from("users")
//       .update({
//         wallet_balance: result.new_balance
//       })
//       .eq("id", userId);

//     if (balanceUpdateError) {
//       console.error("❌ Failed to update user wallet balance:", balanceUpdateError.message);
//       // Log but don't fail the request
//     } else {
//       console.log("✅ User balance updated to:");
//     }

//     return NextResponse.json({
//       success: true,
//       message: "Funds deducted successfully",
//       reference,
//       transactionId: result.tx_id,
//       newWalletBalance: result.new_balance,
//       status: "success"
//     });
//   } catch (err: any) {
//     console.error("❌ Deduct Funds Error:", err.message);
//     return NextResponse.json(
//       { error: err.message || "Unexpected server error" },
//       { status: 500 }
//     );
//   }
// }
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import bcrypt from "bcryptjs";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Define invoice pricing
const FREE_INVOICES_LIMIT = 10;
const INVOICE_PRICE = 100; 

export async function POST(req: Request) {
  try {
    const body = await req.json();
    let { userId, amount, description, pin, isInvoiceCreation = false } = body;

    // Validate required fields
    if (!userId || !pin) {
      return NextResponse.json(
        { error: "Invalid request data" },
        { status: 400 }
      );
    }

    // ✅ Fetch user data including free invoice count
    const { data: user, error: fetchError } = await supabase
      .from("users")
      .select(
        "transaction_pin, wallet_balance, free_invoices_left, total_invoices_created"
      )
      .eq("id", userId)
      .single();

    if (fetchError || !user) {
      return NextResponse.json(
        { error: fetchError?.message || "User not found" },
        { status: 404 }
      );
    }

    if (!user.transaction_pin) {
      return NextResponse.json(
        { error: "Transaction PIN not set" },
        { status: 400 }
      );
    }

    // Verify PIN
    const plainPin = Array.isArray(pin) ? pin.join("") : pin;
    const isValid = await bcrypt.compare(plainPin, user.transaction_pin);

    if (!isValid) {
      return NextResponse.json(
        { error: "Invalid transaction PIN" },
        { status: 401 }
      );
    }

    // ✅ Handle Invoice Creation with Free Trial
    if (isInvoiceCreation) {
      // Check if user has free invoices left
      const freeInvoicesLeft = user.free_invoices_left || FREE_INVOICES_LIMIT;
      const totalInvoicesCreated = user.total_invoices_created || 0;

      console.log(
        `User ${userId} has ${freeInvoicesLeft} free invoices left, created ${totalInvoicesCreated} total invoices`
      );

      if (freeInvoicesLeft > 0) {
        // User has free invoices remaining - use one
        const newFreeCount = Math.max(0, freeInvoicesLeft - 1);
        const newTotalCount = totalInvoicesCreated + 1;

        console.log(
          `Using free invoice. New counts: free=${newFreeCount}, total=${newTotalCount}`
        );

        // Update user's free invoice count
        const { error: updateError } = await supabase
          .from("users")
          .update({
            free_invoices_left: newFreeCount,
            total_invoices_created: newTotalCount,
          })
          .eq("id", userId);

        if (updateError) {
          console.error(
            "❌ Failed to update free invoice count:",
            updateError.message
          );
          return NextResponse.json(
            { error: "Failed to update invoice count" },
            { status: 500 }
          );
        }

        // Create a free invoice transaction record
        const reference = `FREE-INV-${crypto.randomUUID().slice(0, 8)}`;
        const { error: transactionError } = await supabase
          .from("transactions")
          .insert({
            user_id: userId,
            amount: 0, // Free
            transaction_type: "invoice_creation",
            status: "success",
            description:
              description ||
              `Free invoice created (${newTotalCount}/${FREE_INVOICES_LIMIT})`,
            reference: reference,
            metadata: {
              free_invoice: true,
              invoice_count: newTotalCount,
              free_invoices_left: newFreeCount,
              total_invoices_created: newTotalCount,
            },
          });

        if (transactionError) {
          console.error(
            "❌ Failed to create free transaction record:",
            transactionError.message
          );
        }

        return NextResponse.json({
          success: true,
          message: "Free invoice created successfully",
          freeInvoicesLeft: newFreeCount,
          totalInvoicesCreated: newTotalCount,
          charged: false,
          isTrial: true,
          amount: 0,
          newWalletBalance: user.wallet_balance, // Wallet balance unchanged
        });
      } else {
        // No free invoices left - charge the user ₦100
        console.log(
          `No free invoices left for user ${userId}. Charging ₦${INVOICE_PRICE}`
        );
        amount = INVOICE_PRICE;

        // Check if user has sufficient balance
        if (user.wallet_balance < amount) {
          return NextResponse.json(
            {
              error: `Insufficient balance. You need ₦${amount} to create an invoice.`,
            },
            { status: 400 }
          );
        }

        // Update total invoice count first
        const newTotalCount = (user.total_invoices_created || 0) + 1;
        const { error: countUpdateError } = await supabase
          .from("users")
          .update({
            total_invoices_created: newTotalCount,
          })
          .eq("id", userId);

        if (countUpdateError) {
          console.error(
            "❌ Failed to update invoice count:",
            countUpdateError.message
          );
        }

        // Proceed to payment deduction
        description =
          description ||
          `Invoice creation charge (after ${FREE_INVOICES_LIMIT} free invoices)`;
      }
    } else {
      // Regular payment (not invoice creation)
      amount = Number(amount);
      if (!amount || amount <= 0) {
        return NextResponse.json({ error: "Invalid amount" }, { status: 400 });
      }

      // Check if user has sufficient balance for regular payment
      if (user.wallet_balance < amount) {
        return NextResponse.json(
          { error: "Insufficient balance" },
          { status: 400 }
        );
      }
    }

    // ✅ Handle Payment (for paid invoices or regular payments)
    const reference = crypto.randomUUID();
    const transactionDescription =
      description ||
      (isInvoiceCreation
        ? `Paid invoice creation (₦${INVOICE_PRICE})`
        : "Funds deducted");

    const { data: rpcData, error: rpcError } = await supabase.rpc(
      "deduct_wallet_balance",
      {
        user_id: userId,
        amt: amount,
        transaction_type: isInvoiceCreation ? "invoice_creation" : "debit",
        reference,
        description: transactionDescription,
      }
    );

    if (rpcError) {
      console.error("❌ RPC deduct_wallet_balance failed:", rpcError.message);
      return NextResponse.json(
        { error: "Failed to process payment" },
        { status: 500 }
      );
    }

    // ✅ Extract RPC result
    const result =
      Array.isArray(rpcData) && rpcData.length > 0 ? rpcData[0] : rpcData;

    if (!result || result.status !== "OK") {
      return NextResponse.json(
        { error: result?.status || "Payment failed" },
        { status: 400 }
      );
    }

    // ✅ Update transaction status
    const { error: updateError } = await supabase
      .from("transactions")
      .update({
        status: "success",
      })
      .eq("id", result.tx_id);

    if (updateError) {
      console.error(
        "❌ Failed to update transaction status:",
        updateError.message
      );
    }

    // ✅ Update user wallet balance
    const { error: balanceUpdateError } = await supabase
      .from("users")
      .update({
        wallet_balance: result.new_balance,
      })
      .eq("id", userId);

    if (balanceUpdateError) {
      console.error(
        "❌ Failed to update user wallet balance:",
        balanceUpdateError.message
      );
    }

    const finalTotalCount = (user.total_invoices_created || 0) + 1;

    return NextResponse.json({
      success: true,
      message: isInvoiceCreation
        ? `Paid invoice created successfully (₦${INVOICE_PRICE} deducted)`
        : "Funds deducted successfully",
      reference,
      transactionId: result.tx_id,
      newWalletBalance: result.new_balance,
      freeInvoicesLeft: user.free_invoices_left || 0,
      totalInvoicesCreated: finalTotalCount,
      charged: isInvoiceCreation && (user.free_invoices_left || 0) <= 0,
      amount: amount,
      isInvoiceCreation: isInvoiceCreation,
      status: "success",
    });
  } catch (err: any) {
    console.error("❌ Deduct Funds Error:", err.message);
    return NextResponse.json(
      { error: err.message || "Unexpected server error" },
      { status: 500 }
    );
  }
}