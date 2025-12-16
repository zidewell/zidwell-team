import { Download, Edit, Eye, Loader2, Send } from "lucide-react";
import React, { useEffect, useState } from "react";
import { Button } from "./ui/button";
import { Card, CardContent } from "./ui/card";
import { Badge } from "./ui/badge";
import RecieptPreview from "./previews/RecieptPreview";
import { useRouter } from "next/navigation";
import { useUserContextData } from "../context/userData";
import Swal from "sweetalert2";
import withReactContent from "sweetalert2-react-content";
import { Receipt } from "./ReceiptGen";
import Loader from "./Loader";

const getBase64Logo = async () => {
  try {
    const response = await fetch("/logo.png");
    if (!response.ok) throw new Error("Logo not found");
    const blob = await response.blob();
    return await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    console.error("Error loading logo:", error);
    return "";
  }
};

const MySwal = withReactContent(Swal);

interface ReceiptItem {
  item: string;
  quantity: number;
  price: number;
}

interface ReceiptForm {
  name: string;
  email: string;
  receipt_id: string;
  bill_to: string;
  from: string;
  issue_date: string;
  customer_note: string;
  amount_balance?: string;
  payment_for: string;
  receipt_items: ReceiptItem[];
  created_at?: string;
  signed_at?: string;
  signee_name?: string;
  initiator_name?: string;
  signing_link?: string;
  id?: string;
  status: string;
  sent_at?: string;
  reciept_number?: string;
  initator_name?: string;
}

type Props = {
  receipts: any[];
  loading: boolean;
};

const RecieptList: React.FC<Props> = ({ receipts, loading }) => {
  const statusColors: Record<string, string> = {
    pending: "bg-yellow-100 text-yellow-800",
    draft: "bg-gray-100 text-gray-800",
    signed: "bg-blue-100 text-blue-800",
  };

  const formatNumber = (value: number) =>
    new Intl.NumberFormat("en-US", {
      style: "decimal",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);

  const [selectedReciept, setSelectedReciept] = useState<ReceiptForm | null>(null);
  const [processing, setProcessing] = useState<any>(null);
  const [processing2, setProcessing2] = useState(false);
  const { user } = useUserContextData();
  const router = useRouter();
  const [base64Logo, setBase64Logo] = useState<string>("");

  useEffect(() => {
    const loadLogo = async () => {
      const logo = await getBase64Logo();
      setBase64Logo(logo);
    };
    loadLogo();
  }, []);

  const downloadPdf = async (receipt: ReceiptForm) => {
    const formattedCreatedAt = receipt.created_at
      ? new Date(receipt.created_at).toLocaleDateString("en-US", {
          year: "numeric",
          month: "long",
          day: "numeric",
        })
      : "N/A";

    const formattedSignedAt = receipt.signed_at
      ? new Date(receipt.signed_at).toLocaleDateString("en-US", {
          year: "numeric",
          month: "long",
          day: "numeric",
        })
      : "N/A";

    const signedSection =
      receipt.signee_name && receipt.signed_at
        ? `
      <div class="signatures" style="display: flex; gap: 20px; margin-top: 20px;">
        <div>
          <p style="margin: 0; font-weight: 600;">Signee:</p>
          <p style="margin: 5px 0 0 0;">${receipt.signee_name}</p>
        </div>
        <div>
          <p style="margin: 0; font-weight: 600;">Date:</p>
          <p style="margin: 5px 0 0 0;">${formattedSignedAt}</p>
        </div>
      </div>
    `
        : "";

    const formattedTotal = receipt.receipt_items?.reduce(
      (acc, item) => acc + item.price * item.quantity,
      0
    ).toLocaleString("en-NG", { style: "currency", currency: "NGN" });

    const fullHtml = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Receipt - ${receipt.receipt_id || "Download"}</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body {
      font-family: 'Inter', 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      background-color: #ffffff;
      color: #374151;
      line-height: 1.5;
    }
    
    .receipt-container {
      max-width: 800px;
      margin: 0 auto;
      background: #ffffff;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
      overflow: hidden;
    }
    
    .receipt-header {
      padding: 2rem;
      color: black;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    
    .logo-container {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    
    .logo {
      height: 48px;
      width: 48px;
      object-fit: contain;
    }
    
    .header-title h1 {
      font-size: 28px;
      font-weight: 700;
      margin-bottom: 4px;
    }
    
    .header-title p {
      opacity: 0.9;
      font-size: 14px;
    }
    
    .receipt-body {
      padding: 2rem;
    }
    
    .details-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 1.5rem;
      margin-bottom: 2rem;
    }
    
    .detail-card {
      background: #f9fafb;
      padding: 1.5rem;
      border-radius: 8px;
      border: 1px solid #e5e7eb;
    }
    
    .detail-card h2 {
      font-size: 18px;
      font-weight: 600;
      color: #111827;
      margin-bottom: 1rem;
    }
    
    .detail-row {
      display: flex;
      justify-content: space-between;
      margin-bottom: 8px;
    }
    
    .detail-label {
      color: #6b7280;
      font-weight: 500;
    }
    
    .detail-value {
      color: #374151;
      font-weight: 600;
    }
    
    .section-title {
      font-size: 20px;
      font-weight: 600;
      color: #111827;
      margin-bottom: 1rem;
    }
    
    .items-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 2rem;
      border-radius: 8px;
      overflow: hidden;
      box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1);
    }
    
    .items-table th {
      background: #f3f4f6;
      padding: 1rem;
      text-align: left;
      font-weight: 600;
      color: #374151;
      border-bottom: 1px solid #e5e7eb;
    }
    
    .items-table td {
      padding: 1rem;
      border-bottom: 1px solid #f3f4f6;
    }
    
    .text-left { text-align: left; }
    .text-center { text-align: center; }
    .text-right { text-align: right; }
    
    .total-section {
      background: #f3f4f6;
      padding: 1.5rem;
      border-radius: 8px;
      max-width: 320px;
      margin-left: auto;
    }
    
    .total-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 18px;
    }
    
    .total-amount {
      font-size: 24px;
      font-weight: 700;
      color: #059669;
    }
    
    .notes-section {
      background: #f9fafb;
      padding: 1.5rem;
      border-radius: 8px;
      border: 1px solid #e5e7eb;
      margin-bottom: 2rem;
    }
    
    .notes-section h3 {
      font-weight: 600;
      color: #374151;
      margin-bottom: 0.5rem;
    }
    
    .signatures-section {
      display: flex;
      gap: 3rem;
      margin-top: 2rem;
      padding-top: 2rem;
      border-top: 1px solid #e5e7eb;
    }
    
    .signature-block {
      flex: 1;
    }
    
    .signature-label {
      font-weight: 600;
      color: #374151;
      margin-bottom: 4px;
    }
    
    .signature-value {
      color: #6b7280;
    }
    
    .footer {
      margin-top: 2rem;
      padding-top: 1.5rem;
      border-top: 1px solid #e5e7eb;
      text-align: center;
      color: #9ca3af;
      font-size: 14px;
    }
    
    @media (max-width: 768px) {
      .details-grid {
        grid-template-columns: 1fr;
      }
      
      .receipt-header {
        flex-direction: column;
        gap: 1rem;
        text-align: center;
      }
      
      .signatures-section {
        flex-direction: column;
        gap: 1rem;
      }
    }
  </style>
</head>
<body>
  <div class="receipt-container">
    <div class="receipt-header">
      <div class="logo-container">
        <img src="${base64Logo}" alt="Company Logo" class="logo" />
        <div class="header-title">
          <h1>RECEIPT</h1>
          <p>Proof of Payment</p>
        </div>
      </div>
    </div>

    <div class="receipt-body">
      <div class="details-grid">
        <div class="detail-card">
          <h2>Receipt Details</h2>
          <div class="detail-row">
            <span class="detail-label">Receipt #:</span>
            <span class="detail-value">#${receipt.receipt_id || "0001"}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">Issue Date:</span>
            <span class="detail-value">${receipt.issue_date || "N/A"}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">Payment For:</span>
            <span class="detail-value">${receipt.payment_for || "N/A"}</span>
          </div>
        </div>

        <div class="space-y-4 flex flex-col gap-3">
          <div class="detail-card">
            <h2>From</h2>
            <p style="color: #374151; white-space: pre-line;">${receipt.initiator_name || "N/A"}</p>
          </div>
          <div class="detail-card">
            <h2>Bill To</h2>
            <p style="color: #374151; white-space: pre-line;">${receipt.bill_to || "N/A"}</p>
          </div>
        </div>
      </div>

      <h2 class="section-title">Receipt Items</h2>
      <table class="items-table">
        <thead>
          <tr>
            <th class="text-left">Description</th>
            <th class="text-center">Qty</th>
            <th class="text-right">Rate</th>
            <th class="text-right">Amount</th>
          </tr>
        </thead>
        <tbody>
          ${receipt.receipt_items
            ?.map(
              (item) => `
            <tr>
              <td class="text-left">${item.item}</td>
              <td class="text-center">${item.quantity}</td>
              <td class="text-right">${item.price.toLocaleString("en-NG", {
                style: "currency",
                currency: "NGN",
              })}</td>
              <td class="text-right" style="font-weight: 600;">${(
                item.quantity * item.price
              ).toLocaleString("en-NG", {
                style: "currency",
                currency: "NGN",
              })}</td>
            </tr>`
            )
            .join("")}
        </tbody>
      </table>

      <div class="total-section">
        <div class="total-row">
          <span>Total:</span>
          <span class="total-amount">${formattedTotal}</span>
        </div>
      </div>

      <div class="notes-section">
        <h3>Customer Notes</h3>
        <p>${receipt.customer_note || "Thank you for your payment!"}</p>
      </div>

      <div class="signatures-section">
        <div class="signature-block">
          <div class="signature-label">Initiator</div>
          <div class="signature-value">${receipt.initiator_name || "N/A"}</div>
          <div class="signature-label" style="margin-top: 8px;">Date</div>
          <div class="signature-value">${formattedCreatedAt}</div>
        </div>
        ${signedSection}
      </div>

      <div class="footer">
        <p>This receipt serves as confirmation of payment. Please retain for your records.</p>
      </div>
    </div>
  </div>
</body>
</html>
`;

    try {
      setProcessing(receipt.id);
      const res = await fetch("/api/generate-pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ html: fullHtml }),
      });

      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(errorText || "Failed to generate PDF");
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);

      const a = document.createElement("a");
      a.href = url;
      a.download = `receipt-${receipt.receipt_id || "download"}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("PDF download failed:", err);
      Swal.fire("Error", "Failed to download PDF. Please try again.", "error");
    } finally {
      setProcessing(null);
    }
  };

  const sendrecieptEmail = async (receipt: ReceiptForm) => {
    if (!user?.email) return;

    const result = await MySwal.fire({
      title: "Send Receipt",
      text: "How would you like to send the receipt?",
      icon: "question",
      showCancelButton: true,
      confirmButtonText: `Send Receipt via Email`,
      cancelButtonText: `Send via WhatsApp`,
      customClass: {
        cancelButton: "whatsapp-button",
        confirmButton: "email-button",
      },
      buttonsStyling: true,
      didOpen: () => {
        const whatsappBtn = document.querySelector(".swal2-cancel");
        const emailBtn = document.querySelector(".swal2-confirm");
        if (whatsappBtn) {
          (whatsappBtn as HTMLElement).style.backgroundColor = "#25D366";
          (whatsappBtn as HTMLElement).style.color = "#fff";
          (whatsappBtn as HTMLElement).style.border = "none";
        }
        if (emailBtn) {
          (emailBtn as HTMLElement).style.backgroundColor = "#4f46e5";
          (emailBtn as HTMLElement).style.color = "#fff";
          (emailBtn as HTMLElement).style.border = "none";
        }
      },
    });

    if (result.isConfirmed) {
      try {
        setProcessing2(true);
        const res = await fetch("/api/send-receipt-email", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: user.email, receipt }),
        });

        if (!res.ok) throw new Error("Failed to send receipt email");

        Swal.fire("Sent!", "Receipt sent via email.", "success");
        setSelectedReciept(null);
      } catch (error) {
        Swal.fire(
          "Error",
          "Failed to send receipt email. Please try again.",
          "error"
        );
      } finally {
        setProcessing2(false);
      }
    } else if (result.dismiss === Swal.DismissReason.cancel) {
      const receiptUrl = receipt.signing_link;
      const message = `Here is your receipt: ${receiptUrl}`;
      window.open(
        `https://wa.me/?text=${encodeURIComponent(message)}`,
        "_blank"
      );
    }
  };

  const [pageLoading, setPageLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setPageLoading(false);
    }, 2500);

    return () => clearTimeout(timer);
  }, []);

  if (pageLoading) {
    return <Loader />;
  }


  if (receipts.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-500 text-lg">
        No receipt records found
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {receipts.map((receipt) => {
        const totalAmount =
          receipt.receipt_items?.reduce(
            (sum: any, item: any) => sum + item.quantity * item.price,
            0
          ) || 0;

        return (
          <Card key={receipt.id} className="hover:shadow-md transition-shadow duration-200">
            <CardContent className="p-4 sm:p-6">
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                <div className="flex-1">
                  <div className="flex flex-wrap items-center gap-3 mb-2">
                    <h3 className="font-semibold text-lg text-gray-900">
                      {receipt.receipt_id}
                    </h3>
                    <Badge
                      className={
                        statusColors[receipt.status] ||
                        "bg-gray-100 text-gray-800"
                      }
                    >
                      {receipt.status}
                    </Badge>
                  </div>
                  <p className="text-gray-900 font-medium mb-1">
                    {receipt.bill_to}
                  </p>
                 
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-500">
                    <span>
                      Date: {new Date(receipt.issue_date).toLocaleDateString()}
                    </span>
                    {receipt.sent_at && (
                      <span>
                        Sent:{" "}
                        {new Date(receipt.sent_at).toLocaleDateString("en-GB", {
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                        })}
                      </span>
                    )}
                    <span className="font-semibold text-gray-900">
                      {formatNumber(totalAmount)}
                    </span>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 justify-start sm:justify-end">
                  <Button
                    onClick={() => setSelectedReciept(receipt)}
                    variant="outline"
                    size="sm"
                    className="flex items-center gap-1"
                  >
                    <Eye className="w-4 h-4" /> View
                  </Button>
                  <Button
                    onClick={() =>
                      router.push(
                        `/dashboard/services/create-receipt/receipt/edit/${receipt.id}`
                      )
                    }
                    variant="outline"
                    size="sm"
                    disabled={receipt.status === "signed"}
                    className="flex items-center gap-1"
                  >
                    <Edit className="w-4 h-4" /> Edit
                  </Button>
                  <Button
                    onClick={() => sendrecieptEmail(receipt)}
                    variant="outline"
                    size="sm"
                    disabled={processing2}
                    className="flex items-center gap-1"
                  >
                    {processing2 ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Send className="w-4 h-4" />
                    )}
                    Send
                  </Button>
                  <Button
                    onClick={() => downloadPdf(receipt)}
                    variant="outline"
                    size="sm"
                    disabled={receipt.status !== "signed" || processing === receipt.id}
                    className="flex items-center gap-1"
                  >
                    {processing === receipt.id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Download className="w-4 h-4" />
                    )}
                    PDF
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}

      {selectedReciept && (
        <RecieptPreview
          form={selectedReciept}
          onClose={() => setSelectedReciept(null)}
        />
      )}
    </div>
  );
};

export default RecieptList;