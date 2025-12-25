import { Card } from "../ui/card";
import { Separator } from "../ui/separator";
import { Progress } from "../ui/progress";

interface InvoicePreviewProps {
  invoice: any;
}

export const InvoicePreview = ({ invoice }: InvoicePreviewProps) => {
  // Safely handle items array
  const items = Array.isArray(invoice.items) ? invoice.items : [];
  const paymentProgress =
    invoice.allowMultiplePayments && invoice.targetQuantity
      ? (invoice.paidQuantity / invoice.targetQuantity) * 100
      : 0;

  return (
    <Card className="p-4 bg-invoice-bg border-invoice-border h-full overflow-auto">
      <div className="max-w-xl mx-auto">
        {/* Header - Payment Page Style */}
        <div className="text-center mb-8">
          {invoice.businessLogo && (
            <img
              src={invoice.businessLogo}
              alt="Business Logo"
              className="h-16 w-auto mx-auto mb-4"
            />
          )}
          <h2 className="text-3xl font-bold text-foreground mb-2">
            {invoice.businessName}
          </h2>
          <p className="text-muted-foreground">Payment Request</p>
          <div className="inline-block mt-2 px-4 py-1 bg-gold/10 border border-[#C29307] rounded-full">
            <span className="text-sm text-[#C29307] font-semibold">
              #{invoice.invoiceNumber}
            </span>
          </div>
        </div>

        {/* Multi-Payment Progress - Top */}
        {/* {invoice.allowMultiplePayments && (
          <div className="mb-8 p-4 bg-gold/10 border border-gold/20 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-semibold text-foreground">
                Multiple Payments Accepted
              </span>
              <span className="text-sm font-bold text-gold">
                {invoice.paidQuantity}/{invoice.targetQuantity || 0} paid
              </span>
            </div>
            <Progress value={paymentProgress} className="h-2 mb-2" />
            {invoice.targetAmount && (
              <p className="text-xs text-muted-foreground mt-2">
                Target Amount: ₦{invoice.targetAmount.toLocaleString()}
              </p>
            )}
          </div>
        )} */}

        {/* Client Details - Only if filled */}
        {(invoice.clientName || invoice.clientEmail || invoice.clientPhone) && (
          <>
            <div className="mb-6 p-4 bg-muted/50 rounded-lg">
              <div className="text-xs font-semibold text-muted-foreground mb-2">
                BILL TO
              </div>
              <div className="text-foreground">
                {invoice.clientName && (
                  <div className="font-semibold">{invoice.clientName}</div>
                )}
                {invoice.clientEmail && (
                  <div className="text-sm text-muted-foreground">
                    {invoice.clientEmail}
                  </div>
                )}
                {invoice.clientPhone && (
                  <div className="text-sm text-muted-foreground">
                    {invoice.clientPhone}
                  </div>
                )}
              </div>
            </div>
          </>
        )}

        {/* Items - Payment Page Style */}
        <div className="mb-6">
          <h3 className="text-lg font-semibold mb-4 text-foreground">
            Payment Details
          </h3>
          <div className="space-y-3">
            {items.length > 0 ? (
              items.map((item: any) => (
                <div
                  key={item.id}
                  className="flex justify-between items-start p-3 bg-muted/30 rounded-lg"
                >
                  <div className="flex-1">
                    <div className="font-medium text-foreground">
                      {item.description || "Item description"}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {item.quantity} × ₦
                      {(item.unitPrice || 0).toLocaleString()}
                    </div>
                  </div>
                  <div className="font-semibold text-foreground">
                    ₦{(item.total || 0).toLocaleString()}
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center text-muted-foreground py-8 bg-muted/30 rounded-lg">
                No items added to this invoice
              </div>
            )}
          </div>
        </div>

        {/* Totals - Card Style */}
        <div className="p-6 bg-muted/50 rounded-lg border border-border">
          <div className="space-y-2">
            <div className="flex justify-between text-foreground">
              <span>Subtotal</span>
              <span>₦{(invoice.subtotal || 0).toLocaleString()}</span>
            </div>
            {invoice.tax > 0 && (
              <div className="flex justify-between text-foreground">
                <span>Tax</span>
                <span>₦{(invoice.tax || 0).toLocaleString()}</span>
              </div>
            )}
            <Separator className="my-3" />
            <div className="flex justify-between text-2xl font-bold">
              <span className="text-foreground">Amount Due</span>
              <span className="text-gold">
                ₦{(invoice.total || 0).toLocaleString()}
              </span>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
};
