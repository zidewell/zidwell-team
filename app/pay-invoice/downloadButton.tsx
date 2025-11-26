"use client";

import { useState } from "react";
import { Button } from "@/app/components/ui/button";
import { Download } from "lucide-react";
import Swal from "sweetalert2";

interface InvoiceItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
  item_description?: string;
  unit_price?: number;
  total_amount?: number;
}

interface InvoiceData {
  id: string;
  business_name: string;
  business_logo?: string;
  invoice_id: string;
  issue_date: string;
  due_date: string;
  from_name: string;
  from_email: string;
  client_name?: string;
  client_email?: string;
  client_phone?: string;
  bill_to?: string;
  message?: string;
  customer_note?: string;
  invoice_items: InvoiceItem[];
  subtotal: number;
  fee_amount: number;
  total_amount: number;
  paid_amount?: number;
  fee_option: string;
  status: string;
  allow_multiple_payments?: boolean;
  unit?: number | "";
  initiator_account_name?: string;
  initiator_account_number?: string;
}

interface DownloadInvoiceButtonProps {
  invoiceData: InvoiceData;
}

// Helper functions from the original code
const getPaymentProgress = (invoice: any) => {
  if (!invoice.paid_amount || !invoice.total_amount) return 0;
  return (invoice.paid_amount / invoice.total_amount) * 100;
};

const getPaymentCountText = (invoice: any) => {
  if (!invoice.payment_count) return "";
  return invoice.payment_count === 1 ? "1 payment" : `${invoice.payment_count} payments`;
};

export default function DownloadInvoiceButton({ invoiceData }: DownloadInvoiceButtonProps) {
  const [loading, setLoading] = useState(false);

  const handleDownloadPDF = async () => {
    try {
      setLoading(true);

      // Calculate values like in the original function
      const invoiceItems = Array.isArray(invoiceData.invoice_items)
        ? invoiceData.invoice_items
        : [];

      const subtotal = invoiceData.subtotal || invoiceItems.reduce(
        (sum: number, item: InvoiceItem) =>
          sum + (item.quantity || 0) * (item.unitPrice || item.unit_price || 0),
        0
      );

      const feeAmount = invoiceData.fee_amount || 0;
      const totalAmount = invoiceData.total_amount || subtotal + feeAmount;
      const paidAmount = invoiceData.paid_amount || 0;

      const paymentProgress = getPaymentProgress(invoiceData);
      const paymentCountText = getPaymentCountText(invoiceData);

      // Generate HTML content for PDF - matching the sample exactly
      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>Invoice ${invoiceData.invoice_id}</title>
          <meta charset="UTF-8">
          <style>
            body { 
              font-family: 'Arial', sans-serif; 
              margin: 0;
              padding: 40px;
              color: #333;
              line-height: 1.6;
            }
            .container {
              max-width: 800px;
              margin: 0 auto;
              background: white;
            }
            .header {
              display: flex;
              justify-content: space-between;
              align-items: flex-start;
              margin-bottom: 40px;
              padding-bottom: 20px;
              border-bottom: 2px solid #C29307;
            }
            .business-info {
              flex: 1;
            }
            .invoice-info {
              text-align: right;
            }
            .logo {
              max-height: 80px;
              max-width: 200px;
              margin-bottom: 15px;
            }
            .account-details {
              display: flex;
              flex-direction: column;
              gap: 10px;
            }
            .account-details h2 {
              color: #C29307;
            }
            h1 {
              color: #C29307;
              margin: 0 0 10px 0;
              font-size: 32px;
              font-weight: bold;
            }
            h2 {
              margin: 0 0 10px 0;
              font-size: 24px;
              color: #333;
            }
            h3 {
              margin: 0 0 15px 0;
              font-size: 18px;
              color: #333;
            }
            .section {
              margin: 30px 0;
            }
            .billing-info {
              display: flex;
              justify-content: space-between;
              gap: 40px;
            }
            .billing-section {
              flex: 1;
            }
            .items-table {
              width: 100%;
              border-collapse: collapse;
              margin: 30px 0;
              font-size: 14px;
            }
            .items-table th {
              background-color: #f8f9fa;
              border: 1px solid #ddd;
              padding: 12px 15px;
              text-align: left;
              font-weight: bold;
              color: #333;
            }
            .items-table td {
              border: 1px solid #ddd;
              padding: 12px 15px;
              text-align: left;
            }
            .items-table tr:nth-child(even) {
              background-color: #f9f9f9;
            }
            .totals {
              margin-top: 30px;
              text-align: right;
              font-size: 16px;
            }
            .total-row {
              margin: 8px 0;
            }
            .grand-total {
              font-size: 20px;
              font-weight: bold;
              color: #C29307;
              margin-top: 15px;
              padding-top: 15px;
              border-top: 2px solid #ddd;
            }
            .message-box {
              background-color: #f8f9fa;
              padding: 20px;
              border-radius: 8px;
              border-left: 4px solid #C29307;
              margin: 20px 0;
            }
            .payment-info {
              background-color: #e8f4fd;
              padding: 20px;
              border-radius: 8px;
              border-left: 4px solid #2196F3;
              margin: 20px 0;
            }
            .footer {
              margin-top: 50px;
              text-align: center;
              color: #666;
              font-size: 14px;
              padding-top: 20px;
              border-top: 1px solid #ddd;
            }
            .status-badge {
              display: inline-block;
              padding: 4px 12px;
              background-color: #C29307;
              color: white;
              border-radius: 20px;
              font-size: 12px;
              font-weight: bold;
              margin-left: 10px;
            }
            .progress-bar {
              background-color: #e0e0e0;
              border-radius: 10px;
              height: 10px;
              margin: 10px 0;
              overflow: hidden;
            }
            .progress-fill {
              background-color: #4CAF50;
              height: 100%;
              transition: width 0.3s ease;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <div class="business-info">
                ${
                  invoiceData.business_logo
                    ? `<img src="${invoiceData.business_logo}" alt="${invoiceData.business_name}" class="logo">`
                    : ""
                }
                <h2>${invoiceData.business_name}</h2>
                <p>${invoiceData.from_email}</p>
                ${invoiceData.bill_to ? `<p>${invoiceData.bill_to}</p>` : ""}

                ${
                  invoiceData.initiator_account_name && invoiceData.initiator_account_number
                    ? `
                    <div class="account-details">
                      <h2>Account Details</h2>
                      <h3>${invoiceData.initiator_account_name}</h3>
                      <h3>${invoiceData.initiator_account_number}</h3>
                    </div>
                    `
                    : ""
                }
              </div>
              <div class="invoice-info">
                <h1>INVOICE</h1>
                <p><strong>Invoice #:</strong> ${invoiceData.invoice_id}</p>
                <p><strong>Issue Date:</strong> ${new Date(
                  invoiceData.issue_date
                ).toLocaleDateString()}</p>
                <p><strong>Status:</strong> ${
                  invoiceData.status
                } <span class="status-badge">${invoiceData.status.toUpperCase()}</span></p>
              </div>
            </div>

            <div class="section">
              <div class="billing-info">
                <div class="billing-section">
                  <h3>Bill To:</h3>
                  <p><strong>${
                    invoiceData.client_name || "Client Information"
                  }</strong></p>
                  ${
                    invoiceData.client_email
                      ? `<p>📧 ${invoiceData.client_email}</p>`
                      : ""
                  }
                  ${
                    invoiceData.client_phone
                      ? `<p>📞 ${invoiceData.client_phone}</p>`
                      : ""
                  }
                </div>
                <div class="billing-section">
                  <h3>From:</h3>
                  <p><strong>${invoiceData.from_name}</strong></p>
                  <p>📧 ${invoiceData.from_email}</p>
                </div>
              </div>
            </div>

            ${
              invoiceData.message
                ? `
            <div class="section">
              <div class="message-box">
                <h3>Message from ${invoiceData.from_name}:</h3>
                <p>${invoiceData.message}</p>
              </div>
            </div>
            `
                : ""
            }

            ${
              paidAmount > 0
                ? `
            <div class="section">
              <div class="payment-info">
                <h3>Payment Information</h3>
                <p><strong>Amount Paid:</strong> ₦${Number(paidAmount).toLocaleString()}</p>
                <p><strong>Balance Due:</strong> ₦${Number(totalAmount - paidAmount).toLocaleString()}</p>
                ${paymentCountText ? `<p><strong>Payments:</strong> ${paymentCountText}</p>` : ''}
                <div class="progress-bar">
                  <div class="progress-fill" style="width: ${paymentProgress}%"></div>
                </div>
                <p>Payment Progress: ${Math.round(paymentProgress)}%</p>
              </div>
            </div>
            `
                : ""
            }

            <div class="section">
              <h3>Invoice Items</h3>
              <table class="items-table">
                <thead>
                  <tr>
                    <th>Description</th>
                    <th width="100">Qty</th>
                    <th width="120">Unit Price</th>
                    <th width="120">Total</th>
                  </tr>
                </thead>
                <tbody>
                  ${invoiceItems
                    ?.map(
                      (item: any) => `
                    <tr>
                      <td>${item.item_description || item.description}</td>
                      <td>${item.quantity}</td>
                      <td>₦${Number(
                        item.unit_price || item.unitPrice
                      ).toLocaleString()}</td>
                      <td>₦${Number(
                        item.total_amount || item.total
                      ).toLocaleString()}</td>
                    </tr>
                  `
                    )
                    .join("")}
                </tbody>
              </table>
            </div>

            <div class="totals">
              <div class="total-row">
                <strong>Subtotal:</strong> ₦${Number(subtotal).toLocaleString()}
              </div>
              ${
                feeAmount > 0
                  ? `
              <div class="total-row">
                <strong>Processing Fee:</strong> ₦${Number(
                  feeAmount
                ).toLocaleString()}
              </div>
              `
                  : ""
              }
              ${
                paidAmount > 0
                  ? `
              <div class="total-row">
                <strong>Amount Paid:</strong> ₦${Number(
                  paidAmount
                ).toLocaleString()}
              </div>
              <div class="total-row">
                <strong>Balance Due:</strong> ₦${Number(
                  totalAmount - paidAmount
                ).toLocaleString()}
              </div>
              `
                  : ""
              }
              <div class="total-row grand-total">
                <strong>TOTAL AMOUNT:</strong> ₦${Number(
                  totalAmount
                ).toLocaleString()}
              </div>
              ${
                invoiceData.fee_option === "absorbed"
                  ? `
              <div class="total-row" style="font-size: 12px; color: #666;">
                *Processing fees absorbed by merchant
              </div>
              `
                  : ""
              }
            </div>

            ${
              invoiceData.customer_note
                ? `
            <div class="section">
              <div class="note-box">
                <h3>Note to Customer:</h3>
                <p>${invoiceData.customer_note}</p>
              </div>
            </div>
            `
                : ""
            }

            <div class="footer">
              <p><strong>Thank you for your business!</strong></p>
              <p>If you have any questions about this invoice, please contact ${
                invoiceData.from_email
              }</p>
              <p>Generated on ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}</p>
            </div>
          </div>
        </body>
        </html>
      `;

      // Call the PDF generation API
      const response = await fetch('/api/generate-pdf', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          html: htmlContent,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate PDF');
      }

      // Create blob and download
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = `invoice-${invoiceData.invoice_id}.pdf`;
      
      document.body.appendChild(a);
      a.click();
      
      // Clean up
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      Swal.fire({
        icon: "success",
        title: "PDF Downloaded!",
        text: "Your invoice has been downloaded as PDF",
        confirmButtonColor: "#C29307",
      });

    } catch (error) {
      console.error('PDF download error:', error);
      Swal.fire({
        icon: "error",
        title: "Download Failed",
        text: "Failed to download PDF. Please try again.",
        confirmButtonColor: "#C29307",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button 
      variant="outline" 
      size="lg" 
      className="w-full"
      onClick={handleDownloadPDF}
      disabled={loading}
    >
      <Download className="mr-2 h-4 w-4" />
      {loading ? "Generating PDF..." : "Download Invoice"}
    </Button>
  );
}