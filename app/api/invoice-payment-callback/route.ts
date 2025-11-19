import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getNombaToken } from "@/lib/nomba";
import { sendPaymentSuccessEmail, sendInvoiceCreatorNotification } from "@/lib/invoice-email-confirmation"; 

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const baseUrl = process.env.NODE_ENV === "development" 
  ? process.env.NEXT_PUBLIC_DEV_URL 
  : process.env.NEXT_PUBLIC_BASE_URL;

export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const invoiceId = searchParams.get("invoiceId");
    const orderReference = searchParams.get("orderReference");

    // console.log("🔄 Payment callback received:", {
    //   invoiceId,
    //   orderReference
    // });

    if (!invoiceId) {
      console.error("❌ No invoiceId provided");
      return NextResponse.redirect(
        `${baseUrl}/payment/callback?status=failed&reason=missing-invoice&invoiceId=unknown`
      );
    }

    // Find the invoice
    const { data: invoice, error: invoiceError } = await supabase
      .from("invoices")
      .select("*")
      .eq("invoice_id", invoiceId)
      .single();

    if (invoiceError || !invoice) {
      console.error("❌ Invoice not found:", invoiceId);
      return NextResponse.redirect(
        `${baseUrl}/payment/callback?status=failed&reason=invoice-not-found&invoiceId=${invoiceId}`
      );
    }


    let paymentStatus = "pending";
    let verifiedAmount = 0;
    let paymentMethod = "unknown";

    // First, check our database for any payment records
    if (orderReference) {
  
      const { data: existingPayment, error: paymentError } = await supabase
        .from("invoice_payments")
        .select("*")
        .eq("order_reference", orderReference)
        .single();

      if (existingPayment) {
        // console.log("✅ Payment record found in database:", existingPayment.status);
        
        if (existingPayment.status === "completed" || existingPayment.status === "paid") {
          paymentStatus = "paid";
          verifiedAmount = existingPayment.paid_amount || existingPayment.amount;
          paymentMethod = existingPayment.payment_method || "card";
          // console.log("💰 Payment already completed in database");
        } else if (existingPayment.status === "failed") {
          paymentStatus = "failed";
          // console.log("❌ Payment failed in database");
        }
      } else {
        console.log("⏳ No payment record found yet, checking Nomba...");
      }
    }

    
    if (paymentStatus === "pending" && orderReference) {
      try {
        
    
        await new Promise(resolve => setTimeout(resolve, 5000));
        
        const token = await getNombaToken();
        if (token) {
          const verifyUrl = `${process.env.NOMBA_URL}/v1/checkout/transaction?orderReference=${orderReference}`;
          
        
          const verifyResponse = await fetch(verifyUrl, {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
              "accountId": process.env.NOMBA_ACCOUNT_ID!,
              "Authorization": `Bearer ${token}`,
            },
          });

          // console.log("📨 Nomba verification status:", verifyResponse.status);

          if (verifyResponse.ok) {
            const verifyData = await verifyResponse.json();
            

            const transactionStatus = verifyData.data?.transactionDetails?.statusCode || 
                                    verifyData.data?.status;
            verifiedAmount = verifyData.data?.transactionDetails?.amount || 
                           verifyData.data?.amount || 
                           0;

            // // Convert amount from kobo to Naira if needed
            // if (verifiedAmount > 1000) { // Assuming amounts over 1000 are in kobo
            //   verifiedAmount = verifiedAmount 
            // }

            if (transactionStatus === "success" || transactionStatus === "SUCCESS" || transactionStatus === "SUCCESSFUL") {
              paymentStatus = "paid";
             
              
              // Create payment record if it doesn't exist
              await createPaymentRecord(invoice, orderReference, verifiedAmount, "Nomba verification");
            } else if (transactionStatus === "failed" || transactionStatus === "FAILED") {
              paymentStatus = "failed";
             
            } else {
             
              
              // Check invoice paid amount as final fallback
              if (invoice.paid_amount > 0) {
                paymentStatus = "paid";
                verifiedAmount = invoice.paid_amount;
               
              }
            }
          } else {
            const errorText = await verifyResponse.text();
            // console.log("⚠️ Nomba verification API failed:", errorText);
            
            // Check invoice paid amount as fallback
            if (invoice.paid_amount > 0) {
              paymentStatus = "paid";
              verifiedAmount = invoice.paid_amount;
              
            }
          }
        } else {

          
          // Check invoice paid amount as fallback
          if (invoice.paid_amount > 0) {
            paymentStatus = "paid";
            verifiedAmount = invoice.paid_amount;
          
          }
        }
      } catch (verifyError: any) {
        
        // Final fallback - check invoice paid amount
        if (invoice.paid_amount > 0) {
          paymentStatus = "paid";
          verifiedAmount = invoice.paid_amount;
         
        }
      }
    }

    // Determine final status
    let finalStatus = paymentStatus;
    if (paymentStatus === "pending") {
      // Final check - use invoice status
      if (invoice.paid_amount >= invoice.total_amount) {
        finalStatus = "paid";
        verifiedAmount = invoice.paid_amount;
      } else if (invoice.paid_amount > 0) {
        finalStatus = "partially_paid";
        verifiedAmount = invoice.paid_amount;
      } else {
        finalStatus = "processing"; // Use "processing" instead of "pending" for better UX
      }
    }


    // ADD EMAIL SENDING HERE - AFTER STATUS DETERMINATION
    if (finalStatus === "paid" || finalStatus === "success") {
      try {
        
        // Get invoice creator's email
        const { data: creatorData } = await supabase
          .from('users')
          .select('email')
          .eq('id', invoice.user_id)
          .single();

        const creatorEmail = creatorData?.email;
        const customerEmail = invoice.client_email;
        const customerName = invoice.client_name;
        const finalAmount = verifiedAmount || invoice.paid_amount;

        // Send email to payer
        if (customerEmail) {
          sendPaymentSuccessEmail(
            customerEmail,
            invoice.invoice_id,
            finalAmount,
            customerName || "Customer",
            invoice
          ).catch((error:any)=> console.error('❌ Callback: Payer email failed:', error));
        } else {
          console.log('⚠️ No customer email available for payment confirmation');
        }

        // Send notification to invoice creator
        if (creatorEmail) {
          sendInvoiceCreatorNotification(
            creatorEmail,
            invoice.invoice_id,
            finalAmount,
            customerName || "Customer",
            customerEmail || "N/A",
            invoice
          ).catch((error:any) => console.error('❌ Callback: Creator notification failed:', error));
        } else {
          console.log('⚠️ No creator email available for notification');
        }

      } catch (emailError) {
        console.error("❌ Callback email setup error:", emailError);
      }
    }

    const redirectUrl = new URL(`${baseUrl}/payment/callback`);
    redirectUrl.searchParams.set("redirectUrl", invoice?.redirect_url);
    redirectUrl.searchParams.set("status", finalStatus);
    redirectUrl.searchParams.set("invoiceId", invoiceId);
    redirectUrl.searchParams.set("orderReference", orderReference || "");
    redirectUrl.searchParams.set("paidAmount", verifiedAmount > 0 ? verifiedAmount.toString() : invoice.paid_amount?.toString() || "0");
    redirectUrl.searchParams.set("totalAmount", invoice.total_amount?.toString() || "0");
    
    if (finalStatus === "processing") {
      redirectUrl.searchParams.set("message", "Payment is being processed. This may take a few moments.");
    }

    return NextResponse.redirect(redirectUrl);

  } catch (error: any) {
    return NextResponse.redirect(
      `${baseUrl}/payment/callback?status=failed&reason=internal-error&message=${encodeURIComponent(error.message)}`
    );
  }
}


async function createPaymentRecord(invoice: any, orderReference: string, amount: number, source: string) {
  try {
    
    const { data: existingPayment } = await supabase
      .from("invoice_payments")
      .select("*")
      .eq("order_reference", orderReference)
      .single();

    if (!existingPayment) {
      const { error: insertError } = await supabase
        .from("invoice_payments")
        .insert([
          {
            invoice_id: invoice.id,
            user_id: invoice.user_id,
            order_reference: orderReference,
            payer_email: invoice.client_email,
            payer_name: invoice.client_name,
            amount: amount,
            paid_amount: amount,
            status: "completed",
            payment_method: "card_payment",
            paid_at: new Date().toISOString(),
            is_reusable: false,
            payment_attempts: 1,
            created_at: new Date().toISOString(),
          },
        ]);

      if (insertError) {
        console.error("❌ Failed to create payment record:", insertError);
      } else {
        
        // CREATE TRANSACTION RECORD IN CALLBACK TOO
        try {
          
          const transactionDescription = `${invoice.client_name || "Customer"} paid ₦${amount} for invoice ${invoice.invoice_id}`;
          
          const { data: transaction, error: transactionError } = await supabase
            .from('transactions')
            .insert([
              {
                user_id: invoice.user_id,
                type: 'credit',
                amount: amount,
                status: 'success',
                reference: `INV-CALLBACK-${invoice.invoice_id}-${orderReference}`,
                description: transactionDescription,
                narration: `Payment received for Invoice #${invoice.invoice_id}`,
                fee: 0, // You might not have fee info in callback
                channel: 'invoice_payment',
                sender: {
                  name: invoice.client_name,
                  email: invoice.client_email,
                  type: 'customer'
                },
                receiver: {
                  name: invoice.from_name,
                  email: invoice.from_email,
                  business: invoice.business_name,
                  type: 'merchant'
                }
              }
            ])
            .select()
            .single();

          if (transactionError) {
            console.error("❌ Failed to create transaction record in callback:", transactionError);
          } else {
            console.log("✅ Transaction record created from callback:", transaction.id);
          }
        } catch (transactionError: any) {
          console.error("❌ Callback transaction creation error:", transactionError.message);
        }
      }
    } else {
      console.log("✅ Payment record already exists");
    }
  } catch (error) {
    console.error("❌ Error creating payment record:", error);
  }
}