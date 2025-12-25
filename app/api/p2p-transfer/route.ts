import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import bcrypt from "bcryptjs";

export async function POST(req: Request) {
  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  try {
    const { userId, receiverAccountId, amount, narration, pin } =
      await req.json();

    if (!userId || !pin || !amount || amount < 100 || !receiverAccountId) {
      return NextResponse.json(
        { message: "Missing or invalid required fields" },
        { status: 400 }
      );
    }

    // ✅ Verify user + PIN
    const { data: user, error: userError } = await supabase
      .from("users")
      .select(
        "id, first_name, last_name, transaction_pin, wallet_balance, wallet_id, bank_name, bank_account_number"
      )
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

    if (
      user.bank_name !== "Nombank MFB" &&
      user.bank_name !== "Nombank(Amucha) MFB"
    ) {
      return NextResponse.json(
        { message: "Only Nombank MFB users can perform transfers" },
        { status: 403 }
      );
    }

    // ✅ Check balance
    if (user.wallet_balance < amount) {
      return NextResponse.json(
        { message: "Insufficient wallet balance" },
        { status: 400 }
      );
    }

    // ✅ Get receiver details
    const { data: receiver, error: receiverError } = await supabase
      .from("users")
      .select(
        "id, first_name, last_name, wallet_id, bank_name, bank_account_number"
      )
      .eq("wallet_id", receiverAccountId)
      .single();

    if (!receiver) {
      return NextResponse.json(
        { message: "Receiver wallet not found" },
        { status: 404 }
      );
    }

    // ✅ Check if receiver is also from allowed banks
    if (
      receiver.bank_name !== "Nombank MFB" &&
      receiver.bank_name !== "Nombank(Amucha) MFB"
    ) {
      return NextResponse.json(
        { message: "You can only transfer to other Nombank MFB users" },
        { status: 403 }
      );
    }

    // ✅ Prevent self-transfer by checking bank_account_number
    if (user.bank_account_number === receiver.bank_account_number) {
      return NextResponse.json(
        { message: "You cannot transfer to your own account" },
        { status: 400 }
      );
    }

    // ✅ Also check wallet_id as an additional safeguard
    if (user.wallet_id === receiver.wallet_id) {
      return NextResponse.json(
        { message: "You cannot transfer to your own wallet" },
        { status: 400 }
      );
    }

    const receiverName = `${receiver.first_name} ${receiver.last_name}`;

    const merchantTxRef = `P2P_${Date.now()}`;
    const senderName = `${user.first_name} ${user.last_name}`;

    // Create description for sender and receiver
    const senderDescription = `P2P transfer to ${receiverName}`;
    const receiverDescription = `P2P transfer from ${senderName}`;

    // ✅ 1. Deduct from sender using your existing function
    const { data: deductionResult, error: deductionError } = await supabase.rpc(
      "deduct_wallet_balance",
      {
        user_id: userId,
        amt: amount,
        transaction_type: "p2p_transfer",
        reference: merchantTxRef,
        description: senderDescription,
      }
    );

    console.log("deductionResult", deductionResult);

    if (deductionError) {
      return NextResponse.json(
        {
          message: "Failed to deduct from sender",
          error: deductionError.message,
        },
        { status: 500 }
      );
    }

    // Check if deduction was successful
    if (
      !deductionResult ||
      deductionResult[0]?.status === "INSUFFICIENT_FUNDS"
    ) {
      return NextResponse.json(
        { message: "Insufficient funds for transfer" },
        { status: 400 }
      );
    }

    // Get the transaction ID from deduction result
    const transactionId = deductionResult[0]?.transaction_id;

    // ✅ 2. Credit receiver using your existing function
    const { error: creditError } = await supabase.rpc(
      "increment_wallet_balance",
      {
        user_id: receiver.id,
        amt: amount,
      }
    );

    if (creditError) {
      console.error("Credit failed, refunding sender...", creditError);

      // If credit fails, refund the sender
      await supabase.rpc("increment_wallet_balance", {
        user_id: userId,
        amt: amount,
      });

      return NextResponse.json(
        {
          message: "Transfer failed, funds refunded",
          error: creditError.message,
        },
        { status: 500 }
      );
    }

    // ✅ 3. Update the sender's transaction record with full details
    const { error: updateError } = await supabase
      .from("transactions")
      .update({
        status: "success",
        sender: {
          name: senderName,
          accountNumber: user.bank_account_number,
          bankName: user.bank_name,
        },
        receiver: {
          name: receiverName,
          accountNumber: receiver.bank_account_number,
          bankName: receiver.bank_name,
        },

        fee: 0,
        total_deduction: amount,
        narration: narration,
        description: senderDescription,
        external_response: {
          status: "success",
          type: "internal_p2p",
          bank_check: "Nombank MFB verified",
          self_transfer_check: "Verified - not self-transfer",
          timestamp: new Date().toISOString(),
        },
      })
      .eq("reference", merchantTxRef)
      .eq("user_id", userId);

    if (updateError) {
      console.error("Failed to update transaction record:", updateError);
    }

    // ✅ 4. Create a complete transaction record for the receiver
    const { error: receiverTxError } = await supabase
      .from("transactions")
      .insert({
        user_id: receiver.id,
        type: "p2p_credit",
        amount: amount,
        status: "success",
        reference: merchantTxRef,
        narration: narration,
        description: receiverDescription,
        sender: {
          name: senderName,
          accountNumber: user.bank_account_number,
          bankName: user.bank_name,
        },
        receiver: {
          name: receiverName,
          accountNumber: receiver.bank_account_number,
          bankName: receiver.bank_name,
        },

        fee: 0,
        total_deduction: 0,
        external_response: {
          status: "success",
          type: "internal_p2p",
          bank_check: "Nombank MFB verified",
          self_transfer_check: "Verified - not self-transfer",
          timestamp: new Date().toISOString(),
        },
      });

    if (receiverTxError) {
      console.error("Failed to create receiver transaction:", receiverTxError);
    }

    // ✅ 5. Also update wallet_history for both users if you have that table
    try {
      // For sender
      await supabase.from("wallet_history").insert({
        user_id: userId,
        transaction_id: transactionId,
        amount: -amount,
        transaction_type: "debit",
        reference: merchantTxRef,
        description: senderDescription,
        created_at: new Date().toISOString(),
      });

      // For receiver
      await supabase.from("wallet_history").insert({
        user_id: receiver.id,
        transaction_id: transactionId,
        amount: amount,
        transaction_type: "credit",
        reference: merchantTxRef,
        description: receiverDescription,
        created_at: new Date().toISOString(),
      });
    } catch (historyError) {
      console.error("Failed to update wallet history:", historyError);
      // Don't fail the whole transaction if history fails
    }

    return NextResponse.json({
      message: "P2P transfer completed successfully.",
      transactionRef: merchantTxRef,
      amount,
      receiverName,
      bankVerification: "Nombank MFB verified",
      selfTransferCheck: "Verified - not self-transfer",
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error("P2P API error:", error);
    return NextResponse.json(
      { error: "Server error: " + (error.message || error.description) },
      { status: 500 }
    );
  }
}
