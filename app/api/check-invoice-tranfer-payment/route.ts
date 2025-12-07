// app/api/check-invoice-tranfer-payment/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { invoiceId, amount, payerEmail } = body;

    console.log("🔍 Checking payment for invoice:", {
      invoiceId,
      amount,
      payerEmail,
    });

    // 1. Find the invoice first
    const { data: invoice, error: invoiceError } = await supabase
      .from("invoices")
      .select("*")
      .eq("invoice_id", invoiceId)
      .single();

    if (invoiceError || !invoice) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    }

    // 2. Check invoice_payments table for completed payments
    const { data: payments, error: paymentsError } = await supabase
      .from("invoice_payments")
      .select("*")
      .eq("invoice_id", invoice.id)
      .eq("status", "completed")
      .order("created_at", { ascending: false });

    if (paymentsError) {
      console.error("Error fetching payments:", paymentsError);
      return NextResponse.json({ paymentExists: false }, { status: 200 });
    }

    // 3. Check if any payment matches the amount and payer
    const matchingPayment = payments?.find((payment) => {
      const amountMatches = Math.abs(payment.amount - amount) < 1; 
      const emailMatches = payment.payer_email === payerEmail;
      const narrationMatches = payment.narration?.includes(invoiceId);

      return amountMatches && (emailMatches || narrationMatches);
    });

    // 4. Also check transactions table (virtual account deposits)
    const { data: transactions, error: transactionsError } = await supabase
      .from("transactions")
      .select("*")
      .eq("status", "success")
      .ilike("narration", `%${invoiceId}%`)
      .order("created_at", { ascending: false });

    if (!transactionsError && transactions && transactions.length > 0) {
      // Check if any transaction matches the amount
      const matchingTransaction = transactions.find(
        (tx) => Math.abs(tx.amount - amount) < 1
      );

      if (matchingTransaction) {
        console.log("✅ Found matching transaction:", matchingTransaction.id);
        return NextResponse.json(
          {
            paymentExists: true,
            foundIn: "transactions",
            transactionId: matchingTransaction.id,
            timestamp: matchingTransaction.created_at,
          },
          { status: 200 }
        );
      }
    }

    if (matchingPayment) {
      console.log("✅ Found matching payment:", matchingPayment.id);
      return NextResponse.json(
        {
          paymentExists: true,
          foundIn: "invoice_payments",
          paymentId: matchingPayment.id,
          timestamp: matchingPayment.paid_at,
        },
        { status: 200 }
      );
    }

    // 5. Check if invoice status is already paid/partially paid
    if (invoice.status === "paid" || invoice.status === "partially_paid") {
      console.log("ℹ️ Invoice is already marked as", invoice.status);
      return NextResponse.json(
        {
          paymentExists: true,
          foundIn: "invoice_status",
          status: invoice.status,
          paid_amount: invoice.paid_amount,
        },
        { status: 200 }
      );
    }

    return NextResponse.json(
      {
        paymentExists: false,
        message:
          "Payment not found yet. Please wait a few minutes and try again.",
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("❌ Error checking payment:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
