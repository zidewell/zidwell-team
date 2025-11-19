import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getNombaToken } from "@/lib/nomba";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const invoiceId = searchParams.get('invoiceId');
    const orderReference = searchParams.get('orderReference');

    console.log('🔍 Verifying payment:', { invoiceId, orderReference });

    if (!invoiceId || !orderReference) {
      return NextResponse.json({ 
        success: false, 
        error: 'Invoice ID and Order Reference are required' 
      }, { status: 400 });
    }

    // 1. First check our database for payment record
    const { data: payment, error: paymentError } = await supabase
      .from('invoice_payments')
      .select('*')
      .eq('order_reference', orderReference)
      .single();

    if (payment && payment.status === 'completed') {
      console.log('✅ Payment found in database:', payment.status);
      return NextResponse.json({
        success: true,
        paymentStatus: 'paid',
        payment: payment
      });
    }

    // 2. Check invoice status as fallback
    const { data: invoice, error: invoiceError } = await supabase
      .from('invoices')
      .select('*')
      .eq('invoice_id', invoiceId)
      .single();

    if (invoice && invoice.paid_amount > 0) {
      console.log('✅ Invoice shows payment:', invoice.paid_amount);
      return NextResponse.json({
        success: true,
        paymentStatus: 'paid',
        invoice: invoice
      });
    }

    // 3. Verify with Nomba API
    try {
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

        if (verifyResponse.ok) {
          const verifyData = await verifyResponse.json();
          console.log('✅ Nomba verification:', verifyData.data?.transactionDetails?.statusCode);
          
          const transactionStatus = verifyData.data?.transactionDetails?.statusCode;
          if (transactionStatus === 'success' || transactionStatus === 'SUCCESS') {
            return NextResponse.json({
              success: true,
              paymentStatus: 'paid',
              nombaData: verifyData.data
            });
          }
        }
      }
    } catch (nombaError) {
      console.error('Nomba verification error:', nombaError);
      // Continue to return pending status
    }

    // 4. If all checks fail, return pending
    console.log('⏳ Payment still pending');
    return NextResponse.json({
      success: true,
      paymentStatus: 'pending',
      message: 'Payment is still being processed'
    });

  } catch (error) {
    console.error('Verification error:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Internal server error' 
    }, { status: 500 });
  }
}