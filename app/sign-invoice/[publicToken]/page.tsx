import { notFound } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import { Download } from "lucide-react";
import { Button } from "@/app/components/ui/button";
import { Card } from "@/app/components/ui/card";
import { Separator } from "@/app/components/ui/separator";
import DownloadInvoiceButton from "../downloadButton"; 

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface InvoiceItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

export default async function SignPage({
  params,
}: {
  params: Promise<{ publicToken: string }>;
}) {
  const publicToken = (await params).publicToken;

  // Fetch invoice using the publicToken
  const { data: invoice, error } = await supabase
    .from("invoices")
    .select(`
      *,
      invoice_items (*)
    `)
    .eq("public_token", publicToken)
    .single();

  if (error || !invoice) return notFound();

  // Map the database columns to your expected interface
  const items: InvoiceItem[] = (invoice.invoice_items || []).map((dbItem: any) => ({
    id: dbItem.id,
    description: dbItem.item_description,  
    quantity: dbItem.quantity,
    unitPrice: dbItem.unit_price,
    total: dbItem.total_amount,  
  }));

  // Prepare invoice data for PDF download
  const invoiceData = {
    business_name: invoice.business_name,
    business_logo: invoice.business_logo,
    invoice_id: invoice.invoice_id,
    issue_date: invoice.issue_date,
    due_date: invoice.due_date,
    from_name: invoice.from_name,
    from_email: invoice.from_email,
    client_name: invoice.client_name,
    client_email: invoice.client_email,
    client_phone: invoice.client_phone,
    bill_to: invoice.bill_to,
    message: invoice.message,
    customer_note: invoice.customer_note,
    invoice_items: items,
    subtotal: invoice.subtotal,
    fee_amount: invoice.fee_amount,
    total_amount: invoice.total_amount,
    fee_option: invoice.fee_option,
    status: invoice.status,
    allow_multiple_payments: invoice.allow_multiple_payments,
    unit: invoice.unit,
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto py-12 px-4 max-w-3xl">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">Payment Request</h1>
          <p className="text-muted-foreground">Review invoice details and proceed with payment</p>
        </div>

        {/* Invoice Card */}
        <Card className="p-8 mb-6">
          {/* Business Header */}
          <div className="flex justify-between items-start mb-6">
            <div>
              {invoice.business_logo && (
                <img 
                  src={invoice.business_logo} 
                  alt="Business Logo" 
                  className="h-12 w-auto mb-2 rounded-lg" 
                />
              )}
              <h2 className="text-xl font-bold text-foreground">{invoice.business_name}</h2>
              <p className="text-sm text-muted-foreground mt-1">{invoice.from_name}</p>
            </div>
            <div className="text-right">
              <div className="text-sm text-muted-foreground">Invoice</div>
              <div className="text-lg font-bold text-foreground">#{invoice.invoice_id}</div>
              <div className="text-xs text-muted-foreground mt-1">
                Due: {new Date(invoice.due_date).toLocaleDateString()}
              </div>
            </div>
          </div>

          <Separator className="my-6" />

          {/* Client Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div className="space-y-2">
              <h3 className="font-semibold text-foreground">Bill To</h3>
              <div className="text-sm text-muted-foreground">
                {invoice.client_name ? (
                  <>
                    <p className="font-medium text-foreground">{invoice.client_name}</p>
                    {invoice.client_email && <p>{invoice.client_email}</p>}
                    {invoice.client_phone && <p>{invoice.client_phone}</p>}
                  </>
                ) : (
                  <p>Payment information will be collected during checkout</p>
                )}
              </div>
            </div>
            <div className="space-y-2">
              <h3 className="font-semibold text-foreground">From</h3>
              <div className="text-sm text-muted-foreground">
                <p className="font-medium text-foreground">{invoice.from_name}</p>
                <p>{invoice.from_email}</p>
                {invoice.bill_to && <p className="mt-1">{invoice.bill_to}</p>}
              </div>
            </div>
          </div>

          {/* Message */}
          {invoice.message && (
            <div className="mb-6 p-4 bg-muted/50 rounded-lg border">
              <h3 className="font-semibold text-foreground mb-2">Message from {invoice.from_name}</h3>
              <p className="text-sm text-muted-foreground">{invoice.message}</p>
            </div>
          )}

          {/* Items */}
          <div className="mb-6">
            <h3 className="font-semibold mb-4 text-foreground">Invoice Items</h3>
            <div className="space-y-3">
              {items.map((item) => (
                <div key={item.id} className="flex justify-between text-sm">
                  <div className="flex-1">
                    <div className="font-medium text-foreground">{item.description}</div>
                    <div className="text-muted-foreground">
                      {item.quantity} × ₦{item.unitPrice.toLocaleString()}
                    </div>
                  </div>
                  <div className="font-semibold text-foreground">
                    ₦{item.total.toLocaleString()}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <Separator className="my-6" />

          {/* Totals */}
          <div className="space-y-2">
            <div className="flex justify-between text-foreground">
              <span>Subtotal</span>
              <span>₦{invoice.subtotal.toLocaleString()}</span>
            </div>
            {invoice.fee_amount > 0 && (
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>Processing Fee ({invoice.fee_option === 'customer' ? '3.5%' : 'Absorbed'})</span>
                <span>₦{invoice.fee_amount.toLocaleString()}</span>
              </div>
            )}
            <Separator className="my-3" />
            <div className="flex justify-between text-xl font-bold">
              <span className="text-foreground">Total Amount</span>
              <span className="text-[#C29307]">₦{invoice.total_amount.toLocaleString()}</span>
            </div>
          </div>

          {/* Customer Note */}
          {invoice.customer_note && (
            <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-700">{invoice.customer_note}</p>
            </div>
          )}
        </Card>

        {/* Payment CTA */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <DownloadInvoiceButton invoiceData={invoiceData} />
          {invoice.payment_link && (
            <Button 
              size="lg" 
              className="w-full bg-[#C29307] hover:bg-[#b38606] text-white"
              asChild
            >
              <a href={invoice.payment_link} target="_blank" rel="noopener noreferrer">
                Make Payment
              </a>
            </Button>
          )}
        </div>

        {/* Footer */}
        <div className="text-center mt-8">
          <p className="text-sm text-muted-foreground">
            Secured by <span className="text-[#C29307] font-semibold">Zidwell Finance</span>
          </p>
          <p className="text-xs text-muted-foreground mt-2">
            Need help? Contact {invoice.from_email}
          </p>
        </div>
      </div>
    </div>
  );
}