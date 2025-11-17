import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

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

    // Get invoice details
    const { data: invoice, error: invoiceError } = await supabase
      .from("invoices")
      .select("*")
      .eq("invoice_id", invoiceId)
      .single();

    if (invoiceError) {
      return NextResponse.json(
        { message: "Invoice not found" },
        { status: 404 }
      );
    }

    // Get payment records for this invoice
    const { data: payments, error: paymentsError } = await supabase
      .from("invoice_payments")
      .select("*")
      .eq("invoice_id", invoice.id)
      .order("created_at", { ascending: false });

    if (paymentsError) {
      return NextResponse.json(
        { message: "Failed to fetch payments" },
        { status: 500 }
      );
    }

    const totalAmount = Number(invoice.total_amount);
    const paidAmount = Number(invoice.paid_amount);
    const remainingAmount = totalAmount - paidAmount;
    const progress = totalAmount > 0 ? (paidAmount / totalAmount) * 100 : 0;

    const completedPayments = payments.filter(p => p.status === "completed");

    return NextResponse.json({
      invoice,
      payments: completedPayments,
      totalAmount,
      paidAmount,
      remainingAmount,
      progress,
      paidQuantity: invoice.paid_quantity || 0,
      targetQuantity: invoice.target_quantity || 1
    }, { status: 200 });

  } catch (error: any) {
    console.error("Payment status error:", error);
    return NextResponse.json(
      { message: "Internal server error", error: error.message },
      { status: 500 }
    );
  }
}