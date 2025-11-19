import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getNombaToken } from "@/lib/nomba";
import { v4 as uuidv4 } from "uuid";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const baseUrl = process.env.NODE_ENV === "development"
  ? process.env.NEXT_PUBLIC_DEV_URL
  : process.env.NEXT_PUBLIC_BASE_URL;

export async function POST(req: Request) {
  try {
    const { invoiceId, amount, payerName, payerEmail, payerPhone } = await req.json();

    if (!invoiceId || !amount || !payerName || !payerEmail || !payerPhone) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Fetch invoice
    const { data: invoice, error } = await supabase
      .from("invoices")
      .select("*")
      .eq("invoice_id", invoiceId)
      .single();

    if (error || !invoice) {
      console.error("❌ Invoice not found");
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    }

    const token = await getNombaToken();
    if (!token) {
      return NextResponse.json(
        { error: "Unable to authenticate payment provider" },
        { status: 500 }
      );
    }

    const orderReference = uuidv4();

    const orderData = {
      order: {
        orderReference: orderReference,
        amount: Number(amount),
        currency: "NGN",
        customerName: payerName,
        customerEmail: payerEmail,
        callbackUrl: `${baseUrl}/api/invoice-payment-callback?invoiceId=${encodeURIComponent(invoiceId)}&orderReference=${encodeURIComponent(orderReference)}`,
        description: `Payment for Invoice #${invoiceId}`,
        metadata: {
          invoiceId: invoiceId,
          payerName: payerName,
          payerEmail: payerEmail,
          payerPhone: payerPhone,
        }
      }
    };

    console.log("🔄 Sending to Nomba:", JSON.stringify(orderData, null, 2));

    // Create initial payment record
    const { error: paymentRecordError } = await supabase
      .from("invoice_payments")
      .insert([
        {
          invoice_id: invoice.id,
          user_id: invoice.user_id,
          order_reference: orderReference,
          payer_email: payerEmail,
          payer_name: payerName,
          amount: Number(amount),
          paid_amount: 0,
          status: "pending",
          payment_method: "card_payment",
          created_at: new Date().toISOString(),
        },
      ]);

    if (paymentRecordError) {
      console.error("❌ Failed to create initial payment record:", paymentRecordError);
    } else {
      console.log("✅ Initial payment record created");
    }

    // FIXED: Correct API endpoint and headers
    const response = await fetch(`${process.env.NOMBA_URL}/v1/checkout/order`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        accountId: process.env.NOMBA_ACCOUNT_ID!,
      },
      body: JSON.stringify(orderData),
    });

    const text = await response.text();
    console.log("📨 Nomba raw response:", text);

    let json;
    try {
      json = JSON.parse(text);
    } catch (e) {
      console.error("❌ Could not parse JSON response");
      
      await supabase
        .from("invoice_payments")
        .update({ 
          status: "failed",
          error_message: "Invalid JSON response from payment provider"
        })
        .eq("order_reference", orderReference);
      
      return NextResponse.json(
        { error: "Payment provider error: Invalid JSON response" },
        { status: 500 }
      );
    }

    if (!response.ok || !json?.data?.checkoutLink) {
      console.error("❌ Nomba API error:", json);
      
      // Log detailed error information
      console.error("Error details:", {
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries()),
        body: json
      });

      await supabase
        .from("invoice_payments")
        .update({ 
          status: "failed",
          error_message: json?.description || json?.message || "Unable to initialize payment"
        })
        .eq("order_reference", orderReference);
      
      return NextResponse.json(
        {
          error: json?.description || json?.message || "Unable to initialize payment",
          details: "Check order data structure and amount conversion"
        },
        { status: 500 }
      );
    }

    console.log("✅ Payment link generated:", json.data.checkoutLink);

    // Update payment record with successful payment link
    await supabase
      .from("invoice_payments")
      .update({ 
        payment_link: json.data.checkoutLink,
        status: "initiated"
      })
      .eq("order_reference", orderReference);

    return NextResponse.json({
      success: true,
      paymentUrl: json.data.checkoutLink,
      orderReference: orderReference,
      invoiceId: invoiceId,
    });

  } catch (err: any) {
    console.error("❌ Server error:", err);
    return NextResponse.json(
      { error: err.message || "Internal error creating payment" },
      { status: 500 }
    );
  }
}