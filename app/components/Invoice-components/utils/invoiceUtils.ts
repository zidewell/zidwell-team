import { InvoiceForm } from "../types";

export const generateInvoiceId = () => {
  const randomToken = crypto
    .randomUUID()
    .replace(/-/g, "")
    .substring(0, 4)
    .toUpperCase();
  return `INV_${randomToken}`;
};

export const generateItemId = () => {
  return `item_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

export const calculateTotals = (invoice_items: InvoiceForm["invoice_items"], fee_option: InvoiceForm["fee_option"]) => {
  const subtotal = invoice_items.reduce(
    (sum, item) => sum + Number(item.quantity) * Number(item.unitPrice),
    0
  );

  const feePercentage = 0.02;
  const feeAmount =
    fee_option === "customer"
      ? Math.min(subtotal * feePercentage, 2000)
      : 0;

  const totalAmount =
    fee_option === "customer" ? subtotal + feeAmount : subtotal;

  return { subtotal, feeAmount, totalAmount };
};

export const convertToInvoicePreview = (form: InvoiceForm) => {
  const { subtotal, feeAmount, totalAmount } = calculateTotals(form.invoice_items, form.fee_option);

  return {
    id: form.invoice_id,
    invoiceNumber: form.invoice_id,
    businessName: form.business_name,
    businessLogo: form.business_logo || "",
    clientName: form.name,
    clientEmail: form.email,
    clientPhone: form.clientPhone || "",
    items: form.invoice_items,
    subtotal,
    tax: 0,
    total: totalAmount,
    allowPartialPayment: false,
    allowMultiplePayments: form.allowMultiplePayments,
    targetQuantity: form.allowMultiplePayments
      ? form.targetQuantity
      : undefined,
    targetAmount: form.allowMultiplePayments ? totalAmount : undefined,
    paidQuantity: 0,
    createdAt: form.issue_date,
    status: form.status as "draft" | "unpaid" | "paid",
    redirectUrl: form.redirect_url || "",
  };
};