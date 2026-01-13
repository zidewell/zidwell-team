"use client";

import { Download, Edit, Eye, Loader2, X } from "lucide-react";
import React, { useEffect, useState } from "react";
import { Button } from "../ui/button";
import { Card, CardContent } from "../ui/card";
import { Badge } from "../ui/badge";
import { useRouter } from "next/navigation";
import { useUserContextData } from "../../context/userData";
import Swal from "sweetalert2";
import withReactContent from "sweetalert2-react-content";
import { Receipt } from "./ReceiptGen";
import Loader from "../Loader";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";

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

type Props = {
  receipts: Receipt[];
  loading: boolean;
};

const ReceiptList: React.FC<Props> = ({ receipts, loading }) => {
  const statusColors: Record<string, string> = {
    pending: "bg-yellow-100 text-yellow-800",
    draft: "bg-gray-100 text-gray-800",
    signed: "bg-green-100 text-green-800",
  };

  const statusLabels: Record<string, string> = {
    pending: "Pending",
    draft: "Draft",
    signed: "Signed",
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-NG", {
      style: "currency",
      currency: "NGN",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  };

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString("en-GB", {
        day: "numeric",
        month: "short",
        year: "numeric",
      });
    } catch {
      return "N/A";
    }
  };

  const formatDateTime = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString("en-GB", {
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return "N/A";
    }
  };

  const [selectedReceipt, setSelectedReceipt] = useState<Receipt | null>(null);
  const [processing, setProcessing] = useState<string | null>(null);
  const { userData } = useUserContextData();
  const router = useRouter();
  const [base64Logo, setBase64Logo] = useState<string>("");
  const [pageLoading, setPageLoading] = useState(true);
  const [viewModalOpen, setViewModalOpen] = useState(false);

  useEffect(() => {
    const loadLogo = async () => {
      const logo = await getBase64Logo();
      setBase64Logo(logo);
    };
    loadLogo();
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      setPageLoading(false);
    }, 1000);
    return () => clearTimeout(timer);
  }, []);

  // Parse receipt items
  const parseReceiptItems = (items: any) => {
    try {
      if (Array.isArray(items)) return items;
      if (typeof items === "string") return JSON.parse(items);
      return [];
    } catch (error) {
      console.error("Error parsing receipt items:", error);
      return [];
    }
  };

  const viewReceipt = (receipt: Receipt) => {
    setSelectedReceipt(receipt);
    setViewModalOpen(true);
  };

  // SVG icons as strings
  const svgIcons = {
    receipt: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>`,
    building: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>`,
    user: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>`,
    mail: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>`,
    phone: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>`,
    mapPin: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>`,
    creditCard: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>`,
    fileText: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>`
  };

  const downloadPdf = async (receipt: Receipt) => {
    if (!base64Logo) {
      Swal.fire("Error", "Logo is still loading. Please try again.", "error");
      return;
    }

    const receiptItems = parseReceiptItems(receipt.receipt_items);
    const formattedCreatedAt = receipt.created_at
      ? formatDate(receipt.created_at)
      : "N/A";

    const formattedSignedAt = receipt.signed_at
      ? formatDate(receipt.signed_at)
      : "N/A";

    const hasSellerSignature =
      receipt.seller_signature &&
      receipt.seller_signature !== "null" &&
      receipt.seller_signature !== "";
    const hasClientSignature =
      receipt.client_signature &&
      receipt.client_signature !== "null" &&
      receipt.client_signature !== "";

    // Parse items for template
    const formattedItems = receiptItems.map((item: any, index: number) => ({
      description: item.description || item.item || "N/A",
      quantity: item.quantity,
      unit_price: item.unit_price || item.price || 0,
      amount: item.total || item.quantity * (item.unit_price || item.price || 0),
      index: index + 1
    }));

    const fullHtml = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Receipt - ${receipt.receipt_id}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">
  <script src="https://cdn.tailwindcss.com"></script>
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
      padding: 20px;
    }
    
    @media print {
      body {
        padding: 0;
      }
      @page {
        margin: 20mm;
      }
    }
    
    .gold-gradient {
      background: linear-gradient(135deg, #C29307 0%, #b38606 100%);
    }
    
    .gold-light-bg {
      background-color: rgba(194, 147, 7, 0.1);
    }
    
    .gold-border {
      border-color: #C29307;
    }
    
    .gold-text {
      color: #C29307;
    }
    
    .watermark {
      opacity: 0.1;
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      font-size: 120px;
      color: #C29307;
      pointer-events: none;
      z-index: -1;
    }
  </style>
</head>
<body>
  <!-- Watermark -->
  <div class="watermark">ZIDWELL</div>
  
  <div class="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden max-w-4xl mx-auto mb-8">
    <!-- Header -->
    <div class="gold-gradient p-8 text-white">
      <div class="flex items-center justify-between gap-6">
        <div class="flex items-center gap-4">
          <div class="w-14 h-14 bg-white/20 rounded-xl flex items-center justify-center">
            <img src="${base64Logo}" alt="Zidwell Logo" class="h-7 w-7" />
          </div>
          <div>
            <p class="text-sm opacity-90 uppercase tracking-wide">
              Receipt #${receipt.receipt_id}
            </p>
            <h1 class="text-2xl font-bold mt-1">
              ${receipt.business_name || receipt.initiator_name}
            </h1>
            <p class="text-sm opacity-90 mt-1">
              Issued on ${formatDate(receipt.issue_date)}
            </p>
          </div>
        </div>
        <div class="text-right">
          <p class="text-sm opacity-90">Total Amount</p>
          <p class="text-3xl font-bold">
            ${formatCurrency(receipt.total)}
          </p>
          <div class="mt-2 inline-block bg-white/20 px-3 py-1 rounded-full text-sm">
            Status: <span class="font-semibold">${receipt.status.toUpperCase()}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Main Content -->
    <div class="p-8 space-y-8">
      <!-- Business Details -->
      <div class="grid md:grid-cols-2 gap-8">
        <div class="space-y-4">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 gold-light-bg rounded-lg flex items-center justify-center">
              ${svgIcons.building}
            </div>
            <div>
              <h3 class="font-semibold text-gray-900">From</h3>
              <p class="text-gray-600">${receipt.business_name || receipt.initiator_name}</p>
              ${receipt.initiator_email ? `
              <p class="text-sm text-gray-500 mt-1 flex items-center gap-2">
                ${svgIcons.mail}
                ${receipt.initiator_email}
              </p>
              ` : ''}
              ${receipt.initiator_phone ? `
              <p class="text-sm text-gray-500 mt-1 flex items-center gap-2">
                ${svgIcons.phone}
                ${receipt.initiator_phone}
              </p>
              ` : ''}
            </div>
          </div>
        </div>

        <div class="space-y-4">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 gold-light-bg rounded-lg flex items-center justify-center">
              ${svgIcons.user}
            </div>
            <div>
              <h3 class="font-semibold text-gray-900">To</h3>
              <p class="text-gray-600">${receipt.client_name}</p>
              <div class="space-y-1 mt-1">
                ${receipt.client_email ? `
                <p class="text-sm text-gray-500 flex items-center gap-2">
                  ${svgIcons.mail}
                  ${receipt.client_email}
                </p>
                ` : ''}
                ${receipt.client_phone ? `
                <p class="text-sm text-gray-500 flex items-center gap-2">
                  ${svgIcons.phone}
                  ${receipt.client_phone}
                </p>
                ` : ''}
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Billing Address -->
      ${receipt.bill_to ? `
      <div class="bg-gray-50 rounded-xl p-6">
        <div class="flex items-center gap-3 mb-4">
          ${svgIcons.mapPin}
          <h3 class="font-semibold text-gray-900">Billing Address</h3>
        </div>
        <p class="text-gray-700 whitespace-pre-line">${receipt.bill_to}</p>
      </div>
      ` : ''}

      <!-- Items Table -->
      ${formattedItems.length > 0 ? `
      <div class="border rounded-xl overflow-hidden">
        <div class="bg-gray-50 px-6 py-4 border-b">
          <h3 class="font-semibold text-gray-900">Items Details</h3>
        </div>
        <div class="divide-y">
          <!-- Header -->
          <div class="grid grid-cols-12 px-6 py-4 bg-gray-50/50 text-sm font-medium text-gray-600 border-b">
            <div class="col-span-6">Description</div>
            <div class="col-span-2 text-center">Quantity</div>
            <div class="col-span-2 text-right">Unit Price</div>
            <div class="col-span-2 text-right">Amount</div>
          </div>
          
          <!-- Items -->
          ${formattedItems.map((item: any) => `
          <div class="grid grid-cols-12 px-6 py-4 hover:bg-gray-50/50 transition-colors">
            <div class="col-span-6">
              <p class="font-medium text-gray-900">${item.description}</p>
              <p class="text-sm text-gray-500 mt-1">Item #${item.index}</p>
            </div>
            <div class="col-span-2 text-center">
              <p class="text-gray-700">${item.quantity}</p>
            </div>
            <div class="col-span-2 text-right">
              <p class="text-gray-700">${formatCurrency(item.unit_price)}</p>
            </div>
            <div class="col-span-2 text-right">
              <p class="font-semibold text-gray-900">${formatCurrency(item.amount)}</p>
            </div>
          </div>
          `).join('')}
          
          <!-- Totals -->
          <div class="bg-gray-50 px-6 py-4">
            <div class="flex justify-between items-center">
              <div>
                <p class="text-sm text-gray-600">Subtotal</p>
                <p class="text-2xl font-bold gold-text">${formatCurrency(receipt.total)}</p>
              </div>
              <div class="text-right">
                <p class="text-sm text-gray-600">Total Amount</p>
                <p class="text-2xl font-bold gold-text">${formatCurrency(receipt.total)}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
      ` : '<p class="text-gray-500 italic">No items listed</p>'}

      <!-- Payment & Notes -->
      <div class="grid md:grid-cols-2 gap-8">
        <div class="bg-gray-50 rounded-xl p-6">
          <div class="flex items-center gap-3 mb-4">
            ${svgIcons.creditCard}
            <h3 class="font-semibold text-gray-900">Payment Details</h3>
          </div>
          <div class="space-y-3">
            <div class="flex justify-between">
              <span class="text-gray-600">Payment Method:</span>
              <span class="font-medium capitalize">
                ${receipt.payment_method === "transfer" ? "Bank Transfer" : receipt.payment_method || "Not specified"}
              </span>
            </div>
            <div class="flex justify-between">
              <span class="text-gray-600">Payment For:</span>
              <span class="font-medium capitalize">${receipt.payment_for}</span>
            </div>
            <div class="flex justify-between">
              <span class="text-gray-600">Issue Date:</span>
              <span class="font-medium">${formatDate(receipt.issue_date)}</span>
            </div>
            ${receipt.verification_code ? `
            <div class="flex justify-between">
              <span class="text-gray-600">Verification Code:</span>
              <span class="font-medium font-mono">${receipt.verification_code}</span>
            </div>
            ` : ''}
          </div>
        </div>

        <div class="bg-gray-50 rounded-xl p-6">
          <div class="flex items-center gap-3 mb-4">
            ${svgIcons.fileText}
            <h3 class="font-semibold text-gray-900">Notes</h3>
          </div>
          <p class="text-gray-700">
            ${receipt.customer_note || "No additional notes provided."}
          </p>
        </div>
      </div>

      <!-- Signatures -->
      <div class="border-t pt-8">
        <h3 class="font-semibold text-gray-900 mb-6 text-center">Signatures</h3>
        <div class="grid md:grid-cols-2 gap-8">
          <!-- Seller Signature -->
          <div class="space-y-4">
            <div class="text-center">
              <p class="font-medium text-gray-900 mb-2">Seller's Signature</p>
              <p class="text-sm text-gray-600">${receipt.business_name || receipt.initiator_name}</p>
            </div>
            <div class="h-32 border-2 border-dashed border-gray-300 rounded-lg bg-white flex items-center justify-center">
              ${hasSellerSignature ? `
              <img src="${receipt.seller_signature}" alt="Seller signature" class="max-h-20" />
              ` : `
              <span class="text-gray-400">No signature provided</span>
              `}
            </div>
          </div>

          <!-- Client Signature -->
          <div class="space-y-4">
            <div class="text-center">
              <p class="font-medium text-gray-900 mb-2">Client's Signature</p>
              <p class="text-sm text-gray-600">${receipt.client_name}</p>
            </div>
            <div class="h-32 border-2 border-dashed border-gray-300 rounded-lg bg-white flex items-center justify-center">
              ${hasClientSignature ? `
              <img src="${receipt.client_signature}" alt="Client signature" class="max-h-20" />
              ` : `
              <span class="text-gray-400">${receipt.status === "signed" ? "Signed" : "Awaiting signature"}</span>
              `}
            </div>
          </div>
        </div>
        
        <!-- Signature Dates -->
        <div class="grid md:grid-cols-2 gap-8 mt-6">
          <div class="text-center">
            <p class="text-sm text-gray-600">Issued Date</p>
            <p class="font-medium">${formattedCreatedAt}</p>
          </div>
          <div class="text-center">
            <p class="text-sm text-gray-600">Signed Date</p>
            <p class="font-medium">${formattedSignedAt}</p>
          </div>
        </div>
      </div>

      <!-- Footer -->
      <div class="border-t pt-8 text-center text-gray-500 text-sm">
        <p>This receipt was generated electronically by Zidwell Receipts</p>
        ${receipt.signing_link ? `
        <p class="mt-1">For verification, visit: <a href="${receipt.signing_link}" class="text-blue-600 hover:underline">${receipt.signing_link}</a></p>
        ` : ''}
        <div class="mt-4 text-xs text-gray-400">
          <p>Receipt ID: ${receipt.receipt_id} | Generated on: ${new Date().toLocaleDateString("en-GB", {
            day: "numeric",
            month: "short",
            year: "numeric",
          })}</p>
        </div>
      </div>
    </div>
  </div>
</body>
</html>`;

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
      a.download = `receipt-${receipt.receipt_id}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      Swal.fire("Success", "PDF downloaded successfully!", "success");
    } catch (err) {
      console.error("PDF download failed:", err);
      Swal.fire("Error", "Failed to download PDF. Please try again.", "error");
    } finally {
      setProcessing(null);
    }
  };

  if (pageLoading || loading) {
    return <Loader />;
  }

  if (receipts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-gray-500">
        <div className="text-lg mb-2">No receipts found</div>
        <p className="text-sm text-gray-400">
          Create your first receipt to get started
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-4">
        {receipts.map((receipt) => {
          const receiptItems = parseReceiptItems(receipt.receipt_items);

          return (
            <Card
              key={receipt.id}
              className="hover:shadow-md transition-shadow duration-200 border"
            >
              <CardContent className="p-4 sm:p-6">
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-3 mb-2">
                      <h3 className="font-semibold text-lg text-gray-900 truncate">
                        {receipt.receipt_id}
                      </h3>
                      <Badge
                        className={
                          statusColors[receipt.status] ||
                          "bg-gray-100 text-gray-800"
                        }
                      >
                        {statusLabels[receipt.status]}
                      </Badge>
                    </div>
                    <p className="text-gray-900 font-medium mb-1 truncate">
                      {receipt.client_name || "No client name"}
                    </p>
                    <p className="text-gray-600 text-sm mb-2 truncate">
                      {receipt.payment_for || "No description"}
                    </p>

                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-500">
                      <span>Date: {formatDate(receipt.issue_date)}</span>
                      {receipt.signed_at && (
                        <span>Signed: {formatDate(receipt.signed_at)}</span>
                      )}
                      <span className="font-semibold text-gray-900">
                        {formatCurrency(receipt.total)}
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2 justify-start sm:justify-end">
                    <Button
                      onClick={() => viewReceipt(receipt)}
                      variant="outline"
                      size="sm"
                      className="flex items-center gap-1 hover:bg-gray-50"
                    >
                      <Eye className="w-4 h-4" /> View
                    </Button>
                    <Button
                      onClick={() =>
                        router.push(
                          `/dashboard/services/receipt/edit/${receipt.id}`
                        )
                      }
                      variant="outline"
                      size="sm"
                      disabled={receipt.status === "signed"}
                      className="flex items-center gap-1 hover:bg-blue-50"
                    >
                      <Edit className="w-4 h-4" /> Edit
                    </Button>
                    <Button
                      onClick={() => downloadPdf(receipt)}
                      variant="outline"
                      size="sm"
                      disabled={processing === receipt.id}
                      className="flex items-center gap-1 hover:bg-purple-50"
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
      </div>

      {/* View Receipt Modal */}
      <Dialog open={viewModalOpen} onOpenChange={setViewModalOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex justify-between items-center">
              <span>Receipt Details</span>
            </DialogTitle>
            <DialogDescription>
              View receipt information and details
            </DialogDescription>
          </DialogHeader>

          {selectedReceipt && (
            <div className="space-y-6">
              {/* Header */}
              <div className="border-b pb-4">
                <div className="flex justify-between items-start">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900">
                      {selectedReceipt.receipt_id}
                    </h2>
                    <div className="flex items-center gap-2 mt-2">
                      <Badge className={statusColors[selectedReceipt.status]}>
                        {statusLabels[selectedReceipt.status]}
                      </Badge>
                      <span className="text-sm text-gray-500">
                        Issued: {formatDate(selectedReceipt.issue_date)}
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-green-600">
                      {formatCurrency(selectedReceipt.total)}
                    </p>
                    <p className="text-sm text-gray-500">Total Amount</p>
                  </div>
                </div>
              </div>

              {/* Details Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* From Section */}
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="font-semibold text-gray-900 mb-3">From</h3>
                  <div className="space-y-2">
                    <p className="text-gray-900">
                      {selectedReceipt.initiator_name}
                    </p>
                    <p className="text-sm text-gray-600">
                      {selectedReceipt.initiator_email}
                    </p>
                    {selectedReceipt.business_name && (
                      <p className="text-sm text-gray-600">
                        {selectedReceipt.business_name}
                      </p>
                    )}
                  </div>
                </div>

                {/* Bill To Section */}
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="font-semibold text-gray-900 mb-3">Bill To</h3>
                  <div className="space-y-2">
                    <p className="text-gray-900">
                      {selectedReceipt.client_name}
                    </p>
                    <p className="text-sm text-gray-600">
                      {selectedReceipt.client_email}
                    </p>
                    {selectedReceipt.client_phone && (
                      <p className="text-sm text-gray-600">
                        {selectedReceipt.client_phone}
                      </p>
                    )}
                    {selectedReceipt.bill_to && (
                      <p className="text-sm text-gray-600">
                        {selectedReceipt.bill_to}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Payment Details */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="font-semibold text-gray-900 mb-3">
                  Payment Details
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-600">Payment For</p>
                    <p className="font-medium">{selectedReceipt.payment_for}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Payment Method</p>
                    <p className="font-medium">
                      {selectedReceipt.payment_method || "N/A"}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Verification Code</p>
                    <p className="font-medium font-mono">
                      {selectedReceipt.verification_code || "N/A"}
                    </p>
                  </div>
                  {selectedReceipt.signing_link && (
                    <div>
                      <p className="text-sm text-gray-600">Signing Link</p>
                      <a
                        href={selectedReceipt.signing_link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline break-all"
                      >
                        {selectedReceipt.signing_link}
                      </a>
                    </div>
                  )}
                </div>
              </div>

              {/* Receipt Items */}
              <div>
                <h3 className="font-semibold text-gray-900 mb-3">
                  Receipt Items
                </h3>
                {parseReceiptItems(selectedReceipt.receipt_items).length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead>
                        <tr className="bg-gray-50">
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Description
                          </th>
                          <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Quantity
                          </th>
                          <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Unit Price
                          </th>
                          <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Total
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {parseReceiptItems(selectedReceipt.receipt_items).map(
                          (item: any, index: number) => (
                            <tr key={index}>
                              <td className="px-4 py-3 text-sm text-gray-900">
                                {item.description || item.item || "N/A"}
                              </td>
                              <td className="px-4 py-3 text-sm text-center text-gray-900">
                                {item.quantity}
                              </td>
                              <td className="px-4 py-3 text-sm text-right text-gray-900">
                                {formatCurrency(
                                  item.unit_price || item.price || 0
                                )}
                              </td>
                              <td className="px-4 py-3 text-sm text-right text-gray-900 font-medium">
                                {formatCurrency(
                                  item.total ||
                                    item.quantity *
                                      (item.unit_price || item.price || 0)
                                )}
                              </td>
                            </tr>
                          )
                        )}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-gray-500 italic">No items listed</p>
                )}
              </div>

              {/* Totals */}
              <div className="bg-gray-50 p-4 rounded-lg max-w-md ml-auto">
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Subtotal</span>
                    <span className="font-medium">
                      {formatCurrency(selectedReceipt.subtotal || 0)}
                    </span>
                  </div>
                  {selectedReceipt.metadata?.base_fee && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Base Fee</span>
                      <span className="font-medium">
                        {formatCurrency(selectedReceipt.metadata.base_fee)}
                      </span>
                    </div>
                  )}
                  {selectedReceipt.metadata?.total_fee && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Total Fee</span>
                      <span className="font-medium">
                        {formatCurrency(selectedReceipt.metadata.total_fee)}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between border-t pt-2">
                    <span className="font-semibold text-gray-900">Total</span>
                    <span className="font-bold text-green-600 text-lg">
                      {formatCurrency(selectedReceipt.total)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Notes */}
              {selectedReceipt.customer_note && (
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="font-semibold text-gray-900 mb-2">Notes</h3>
                  <p className="text-gray-700">
                    {selectedReceipt.customer_note}
                  </p>
                </div>
              )}

              {/* Signatures */}
              {(selectedReceipt.seller_signature ||
                selectedReceipt.client_signature) && (
                <div className="border-t pt-6">
                  <h3 className="font-semibold text-gray-900 mb-4">
                    Signatures
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {selectedReceipt.seller_signature &&
                      selectedReceipt.seller_signature !== "null" && (
                        <div>
                          <h4 className="font-medium text-gray-700 mb-2">
                            Seller Signature
                          </h4>
                          <img
                            src={selectedReceipt.seller_signature}
                            alt="Seller Signature"
                            className="max-w-xs border rounded"
                          />
                          <p className="text-sm text-gray-500 mt-2">
                            Date Created:{" "}
                            {formatDateTime(selectedReceipt.created_at)}
                          </p>
                        </div>
                      )}
                    {selectedReceipt.client_signature &&
                      selectedReceipt.client_signature !== "null" && (
                        <div>
                          <h4 className="font-medium text-gray-700 mb-2">
                            Client Signature
                          </h4>
                          <img
                            src={selectedReceipt.client_signature}
                            alt="Client Signature"
                            className="max-w-xs border rounded"
                          />
                          {selectedReceipt.signed_at && (
                            <p className="text-sm text-gray-500 mt-2">
                              Date Signed:{" "}
                              {formatDateTime(selectedReceipt.signed_at)}
                            </p>
                          )}
                        </div>
                      )}
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};

export default ReceiptList;