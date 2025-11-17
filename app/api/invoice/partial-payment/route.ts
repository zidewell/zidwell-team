import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { v4 as uuidv4 } from "uuid";
import { getNombaToken } from "@/lib/nomba";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Copy the functions here instead of importing
async function createPartialPayment(invoiceId: string, amount: number): Promise<string> {
  try {
    const { data: invoice, error } = await supabase
      .from("invoices")
      .select("*")
      .eq("id", invoiceId)
      .single();

    if (error || !invoice) {
      throw new Error("Invoice not found");
    }

    if (!invoice.allow_multiple_payments) {
      throw new Error("Multiple payments not allowed for this invoice");
    }

    const remainingAmount = Number(invoice.total_amount) - Number(invoice.paid_amount);
    
    if (amount > remainingAmount) {
      throw new Error("Payment amount exceeds remaining balance");
    }

    const orderReference = uuidv4();
    const baseUrl = process.env.NODE_ENV === "development"
      ? process.env.NEXT_PUBLIC_DEV_URL
      : process.env.NEXT_PUBLIC_BASE_URL;

    const callbackUrl = `${baseUrl}/api/invoice-payment-callback?invoiceId=${invoice.invoice_id}&orderReference=${orderReference}&isPartial=true`;

    const token = await getNombaToken();
    if (!token) throw new Error("Payment service unavailable");

    const nombaPayload = {
      order: {
        orderReference: orderReference,
        callbackUrl: callbackUrl,
        customerEmail: invoice.client_email,
        amount: Math.ceil(amount),
        currency: "NGN",
        accountId: process.env.NOMBA_ACCOUNT_ID,
      },
    };

    const response = await fetch(`${process.env.NOMBA_URL}/v1/checkout/order`, {
      method: "POST",
      headers: {
        accountId: process.env.NOMBA_ACCOUNT_ID!,
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(nombaPayload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Nomba API error: ${errorText}`);
    }

    const data = await response.json();
    if (!data?.data?.checkoutLink) {
      throw new Error("Failed to create payment link");
    }

    const paymentLink = data.data.checkoutLink;

    const { error: paymentError } = await supabase
      .from("invoice_payments")
      .insert([
        {
          invoice_id: invoiceId,
          user_id: invoice.user_id,
          order_reference: orderReference,
          payer_email: invoice.client_email,
          payer_name: invoice.client_name,
          amount: amount,
          paid_amount: 0,
          status: "pending",
          payment_link: paymentLink,
        },
      ]);

    if (paymentError) {
      throw new Error(`Failed to create payment record: ${paymentError.message}`);
    }

    return paymentLink;
  } catch (error: any) {
    console.error("Partial payment creation error:", error);
    throw error;
  }
}

async function getInvoicePaymentStatus(invoiceId: string) {
  const { data: invoice, error: invoiceError } = await supabase
    .from("invoices")
    .select("*")
    .eq("id", invoiceId)
    .single();

  if (invoiceError) throw invoiceError;

  const { data: payments, error: paymentsError } = await supabase
    .from("invoice_payments")
    .select("*")
    .eq("invoice_id", invoiceId)
    .order("created_at", { ascending: false });

  if (paymentsError) throw paymentsError;

  const remainingAmount = Number(invoice.total_amount) - Number(invoice.paid_amount);
  const completedPayments = payments.filter(p => p.status === "completed");

  return {
    invoice,
    payments: completedPayments,
    totalAmount: Number(invoice.total_amount),
    paidAmount: Number(invoice.paid_amount),
    remainingAmount,
    progress: (Number(invoice.paid_amount) / Number(invoice.total_amount)) * 100
  };
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { invoiceId, amount } = body;

    if (!invoiceId || !amount) {
      return NextResponse.json(
        { message: "Invoice ID and amount are required" },
        { status: 400 }
      );
    }

    if (amount <= 0) {
      return NextResponse.json(
        { message: "Amount must be greater than 0" },
        { status: 400 }
      );
    }

    // Use the local function instead of import
    const paymentLink = await createPartialPayment(invoiceId, amount);

    return NextResponse.json({
      message: "Partial payment link created",
      paymentLink,
      amount
    }, { status: 200 });

  } catch (error: any) {
    console.error("Partial payment error:", error);
    return NextResponse.json(
      { message: error.message || "Failed to create partial payment" },
      { status: 500 }
    );
  }
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const invoiceId = searchParams.get("invoiceId");

    if (!invoiceId) {
      return NextResponse.json(
        { message: "Invoice ID is required" },
        { status: 400 }
      );
    }

    // Use the local function
    const paymentStatus = await getInvoicePaymentStatus(invoiceId);

    return NextResponse.json(paymentStatus, { status: 200 });

  } catch (error: any) {
    console.error("Payment status error:", error);
    return NextResponse.json(
      { message: error.message || "Failed to get payment status" },
      { status: 500 }
    );
  }
}