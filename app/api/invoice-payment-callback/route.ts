import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getNombaToken } from "@/lib/nomba";
import { v4 as uuidv4 } from "uuid";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// NEW: Update invoice for multiple full payments
async function updateInvoiceForMultipleFullPayments(invoiceId: string, paidAmount: number) {
  try {
    const { data: invoice, error } = await supabase
      .from("invoices")
      .select("total_amount, paid_amount, paid_quantity, target_quantity, status, allow_multiple_payments")
      .eq("id", invoiceId)
      .single();

    if (error) throw error;

    let newPaidAmount = Number(invoice.paid_amount);
    let newPaidQuantity = Number(invoice.paid_quantity);
    let newStatus = invoice.status;

    // For multiple full payments mode
    if (invoice.allow_multiple_payments) {
      // Each payment should be the full amount
      const expectedAmount = Number(invoice.total_amount);
      
      if (paidAmount >= expectedAmount) {
        // This is a full payment from one person
        newPaidAmount += paidAmount;
        newPaidQuantity += 1;
        
        // Check if we've reached the target quantity
        if (newPaidQuantity >= Number(invoice.target_quantity)) {
          newStatus = "fully_subscribed";
        } else {
          newStatus = "partially_subscribed";
        }
      } else {
        // Handle case where payment is less than expected
        // You might want to mark this as an error or handle differently
        console.warn(`Unexpected payment amount: ${paidAmount} of ${expectedAmount}`);
        newPaidAmount += paidAmount;
      }
    } else {
      // Original single payment logic
      newPaidAmount += paidAmount;
      const totalAmount = Number(invoice.total_amount);
      
      if (newPaidAmount >= totalAmount) {
        newStatus = "paid";
      } else if (newPaidAmount > 0) {
        newStatus = "partially_paid";
      }
    }

    const { error: updateError } = await supabase
      .from("invoices")
      .update({
        paid_amount: newPaidAmount,
        paid_quantity: newPaidQuantity,
        status: newStatus,
        updated_at: new Date().toISOString(),
        ...(newStatus === "paid" && { paid_at: new Date().toISOString() })
      })
      .eq("id", invoiceId);

    if (updateError) throw updateError;

    return { newPaidAmount, newPaidQuantity, newStatus };
  } catch (error: any) {
    console.error("Invoice update error:", error);
    throw error;
  }
}

// Function to create a new payment record for the same invoice (for tracking)
async function createNewPaymentRecordForTracking(invoice: any, paidAmount: number, transactionData: any) {
  const orderReference = uuidv4();

  // Create new payment record for tracking (not for new payments)
  const { error: paymentError } = await supabase
    .from("invoice_payments")
    .insert([
      {
        invoice_id: invoice.id,
        user_id: invoice.user_id,
        order_reference: orderReference,
        payer_email: transactionData.customerEmail || invoice.client_email,
        payer_name: transactionData.customerName || invoice.client_name,
        amount: paidAmount,
        paid_amount: paidAmount,
        status: "completed",
        payment_link: invoice.payment_link, // Keep same payment link
        nomba_transaction_id: transactionData.transactionId,
        payment_method: transactionData.paymentMethod,
        paid_at: new Date().toISOString(),
        is_reusable: true,
        payment_attempts: 1,
      },
    ]);

  if (paymentError) {
    throw new Error(`Failed to create payment record: ${paymentError.message}`);
  }

  return orderReference;
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const invoiceId = searchParams.get("invoiceId");
    const orderReference = searchParams.get("orderReference");

    if (!invoiceId || !orderReference) {
      throw new Error("Missing required parameters");
    }

    console.log("Payment callback received:", {
      invoiceId,
      orderReference
    });

    // Verify payment with Nomba
    const token = await getNombaToken();
    const response = await fetch(`${process.env.NOMBA_URL}/v1/checkout/order/${orderReference}`, {
      headers: {
        accountId: process.env.NOMBA_ACCOUNT_ID!,
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Nomba verification failed: ${errorText}`);
    }

    const paymentData = await response.json();
    console.log("Nomba payment data:", paymentData);
    
    if (paymentData.data?.status !== "SUCCESS") {
      throw new Error(`Payment not completed. Status: ${paymentData.data?.status}`);
    }

    const paidAmount = paymentData.data.amount / 100; // Convert from kobo

    // Get the invoice details
    const { data: invoice, error: invoiceError } = await supabase
      .from("invoices")
      .select("*")
      .eq("invoice_id", invoiceId)
      .single();

    if (invoiceError) {
      throw new Error(`Invoice not found: ${invoiceError.message}`);
    }

    // Check if this payment record already exists to avoid duplicates
    const { data: existingPayment } = await supabase
      .from("invoice_payments")
      .select("*")
      .eq("nomba_transaction_id", paymentData.data.transactionId)
      .single();

    if (existingPayment) {
      console.log("Payment already processed, skipping duplicate");
      // Continue to update invoice totals but don't create duplicate payment record
    } else {
      // Create new payment record for tracking
      await createNewPaymentRecordForTracking(invoice, paidAmount, {
        transactionId: paymentData.data.transactionId,
        paymentMethod: paymentData.data.paymentMethod,
        customerEmail: paymentData.data.customerEmail,
        customerName: paymentData.data.customerName
      });
    }

    // Update invoice totals using the new multiple full payments logic
    const { newPaidAmount, newPaidQuantity, newStatus } = await updateInvoiceForMultipleFullPayments(invoice.id, paidAmount);

    console.log("Invoice updated:", {
      newPaidAmount,
      newPaidQuantity,
      newStatus,
      paidAmount
    });

    // Get updated invoice details for redirect
    const { data: updatedInvoice } = await supabase
      .from("invoices")
      .select("status, paid_amount, total_amount, public_token, invoice_id, allow_multiple_payments, paid_quantity, target_quantity")
      .eq("id", invoice.id)
      .single();

    console.log("Updated invoice:", updatedInvoice);

    // Redirect to payment callback page
    const baseUrl = process.env.NODE_ENV === "development"
      ? process.env.NEXT_PUBLIC_DEV_URL
      : process.env.NEXT_PUBLIC_BASE_URL;
    
    const redirectUrl = new URL(`${baseUrl}/payment/callback`);
    redirectUrl.searchParams.set("invoiceId", updatedInvoice?.invoice_id || invoiceId);
    redirectUrl.searchParams.set("status", updatedInvoice?.status || "unknown");
    
    if (updatedInvoice) {
      redirectUrl.searchParams.set("paidAmount", updatedInvoice.paid_amount?.toString() || "0");
      redirectUrl.searchParams.set("totalAmount", updatedInvoice.total_amount?.toString() || "0");
      redirectUrl.searchParams.set("public_token", updatedInvoice.public_token || "");
      redirectUrl.searchParams.set("allowMultiplePayments", updatedInvoice.allow_multiple_payments?.toString() || "false");
      redirectUrl.searchParams.set("paidQuantity", updatedInvoice.paid_quantity?.toString() || "0");
      redirectUrl.searchParams.set("targetQuantity", updatedInvoice.target_quantity?.toString() || "1");
    }

    console.log("Redirecting to:", redirectUrl.toString());
    return NextResponse.redirect(redirectUrl);

  } catch (error: any) {
    console.error("Payment callback error:", error);
    
    // Redirect to failure page
    const baseUrl = process.env.NODE_ENV === "development"
      ? process.env.NEXT_PUBLIC_DEV_URL
      : process.env.NEXT_PUBLIC_BASE_URL;
    
    const redirectUrl = new URL(`${baseUrl}/payment/callback`);
    redirectUrl.searchParams.set("error", "payment_failed");
    redirectUrl.searchParams.set("message", error.message);
    
    return NextResponse.redirect(redirectUrl);
  }
}