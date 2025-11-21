"use client";

import { Card } from "./ui/card";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import {
  Plus,
  Download,
  ArrowLeft,
  Copy,
  Link,
  RefreshCw,
  Users,
  Save,
} from "lucide-react";
import { Label } from "./ui/label";
import { Switch } from "./ui/switch";
import React, { useEffect, useState } from "react";
import Swal from "sweetalert2";
import { useUserContextData } from "../context/userData";
import { Textarea } from "./ui/textarea";
import PinPopOver from "./PinPopOver";
import InvoiceSummary from "./InvoiceSummary";
import { InvoicePreview } from "./previews/InvoicePreview";
import { InvoiceItemRow } from "./invoice/InvoiceItemRow";
import LogoUpload from "./invoice/LogoUpload";
import { useRouter } from "next/navigation";

// Shared types to avoid duplicates
type InvoiceItem = {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
};

interface InvoiceForm {
  name: string;
  email: string;
  message: string;
  invoice_id: string;
  bill_to: string;
  from: string;
  issue_date: string;
  customer_note: string;
  invoice_items: InvoiceItem[];
  payment_type: "single" | "multiple";
  fee_option: "absorbed" | "customer";
  status: "unpaid" | "paid" | "draft";
  business_logo?: string;
  redirect_url?: string;
  business_name: string;
  allowMultiplePayments: boolean;
  clientPhone?: string;
  targetQuantity: number | "";
}

// Convert InvoiceForm to the format expected by InvoicePreview
const convertToInvoicePreview = (form: InvoiceForm) => {
  const subtotal = form.invoice_items.reduce(
    (sum, item) => sum + Number(item.quantity) * Number(item.unitPrice),
    0
  );

  const feePercentage = 0.03;
  const feeAmount =
    form.fee_option === "customer"
      ? Math.min(subtotal * feePercentage, 2000)
      : 0;

  const total =
    form.fee_option === "customer" ? subtotal + feeAmount : subtotal;

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
    total,
    allowPartialPayment: false,
    allowMultiplePayments: form.allowMultiplePayments,
    targetQuantity: form.allowMultiplePayments
      ? form.targetQuantity
      : undefined,
    targetAmount: form.allowMultiplePayments ? total : undefined,
    paidQuantity: 0,
    createdAt: form.issue_date,
    status: form.status as "draft" | "unpaid" | "paid",
    redirectUrl: form.redirect_url || "",
  };
};

const generateInvoiceId = () => {
  const datePart = new Date().getFullYear();
  const randomToken = crypto
    .randomUUID()
    .replace(/-/g, "")
    .substring(0, 12)
    .toUpperCase();
  return `INV-${datePart}-${randomToken}`;
};

interface CreateInvoiceProps {
  onInvoiceCreated?: () => void;
}

function CreateInvoice({ onInvoiceCreated }: CreateInvoiceProps) {
  const inputCount = 4;
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [pin, setPin] = useState(Array(inputCount).fill(""));
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [draftLoading, setDraftLoading] = useState(false);
  const router = useRouter();
  const [showInvoiceSummary, setShowInvoiceSummary] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [generatedSigningLink, setGeneratedSigningLink] = useState<string>("");
  const [savedInvoiceId, setSavedInvoiceId] = useState<string>("");
  const [details, setDetails] = useState<any>(null);
  const [paymentProgress, setPaymentProgress] = useState({
    totalAmount: 0,
    paidAmount: 0,
    remainingAmount: 0,
    progress: 0,
    status: "unpaid",
    paidQuantity: 0,
    targetQuantity: 1,
  });

  const [form, setForm] = useState<InvoiceForm>({
    name: "",
    email: "",
    message: "",
    invoice_id: "",
    bill_to: "",
    from: "",
    issue_date: new Date().toISOString().slice(0, 10),
    customer_note: "",
    invoice_items: [],
    payment_type: "single",
    fee_option: "customer",
    status: "draft",
    business_logo: "",
    redirect_url: "",
    business_name: "",
    allowMultiplePayments: false,
    clientPhone: "",
    targetQuantity: 1,
  });

  const { userData } = useUserContextData();

  const calculateTotals = () => {
    const subtotal = form.invoice_items.reduce(
      (sum, item) => sum + Number(item.quantity) * Number(item.unitPrice),
      0
    );

    const feePercentage = 0.03;
    const feeAmount =
      form.fee_option === "customer"
        ? Math.min(subtotal * feePercentage, 2000)
        : 0;

    const totalAmount =
      form.fee_option === "customer" ? subtotal + feeAmount : subtotal;

    return { subtotal, feeAmount, totalAmount };
  };

  // Fixed updateItem function with proper typing
  const updateItem = (
    id: string,
    field: keyof InvoiceItem,
    value: string | number
  ) => {
    setForm((prev) => {
      const updatedItems = prev.invoice_items.map((item) => {
        if (item.id === id) {
          const updated = { ...item, [field]: value };
          if (field === "quantity" || field === "unitPrice") {
            updated.total =
              Number(updated.quantity) * Number(updated.unitPrice);
          }
          return updated;
        }
        return item;
      });
      return { ...prev, invoice_items: updatedItems };
    });
  };

  // ✅ add new item
  const addItem = () => {
    const newItem: InvoiceItem = {
      id: crypto.randomUUID(),
      description: "",
      quantity: 1,
      unitPrice: 0,
      total: 0,
    };
    setForm((prev) => ({
      ...prev,
      invoice_items: [...prev.invoice_items, newItem],
    }));
  };

  // ✅ remove item
  const removeItem = (id: string) => {
    setForm((prev) => ({
      ...prev,
      invoice_items: prev.invoice_items.filter((item) => item.id !== id),
    }));
  };

  // ✅ initialize from userData
  useEffect(() => {
    if (userData) {
      const today = new Date().toISOString().slice(0, 10);
      const due = new Date();
      due.setDate(due.getDate() + 14);

      setForm((prev) => ({
        ...prev,
        invoice_id: generateInvoiceId(),
        issue_date: today,
        from: userData.email || "",
        business_name:
          userData.firstName && userData.lastName
            ? `${userData.firstName} ${userData.lastName}`
            : userData.email || "",
      }));
    }
  }, [userData]);

 const handleSaveDraft = async () => {
  try {
    setDraftLoading(true);

    if (!userData?.id) {
      Swal.fire({
        icon: "warning",
        title: "Unauthorized",
        text: "You must be logged in to save a draft.",
      });
      return;
    }

    const { totalAmount } = calculateTotals();

    const payload = {
      userId: userData?.id,
      initiator_email: userData?.email || "",
      initiator_name: userData
        ? `${userData.firstName} ${userData.lastName}`
        : "",
      invoice_id: form.invoice_id,
      signee_name: form.name,
      signee_email: form.email,
      message: form.message,
      bill_to: form.bill_to,
      issue_date: form.issue_date,
      customer_note: form.customer_note,
      invoice_items: form.invoice_items,
      total_amount: totalAmount,
      payment_type: form.payment_type,
      fee_option: form.fee_option,
      status: "draft",
      business_logo: form.business_logo,
      redirect_url: form.redirect_url,
      business_name: form.business_name,
      target_quantity: form.allowMultiplePayments ? form.targetQuantity : 1,
      is_draft: true,
      clientPhone: form.clientPhone,
    };

    // Use the draft endpoint with PUT method
    const res = await fetch("/api/save-invoice-draft", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const result = await res.json();

    if (!res.ok) {
      throw new Error(result.error || result.message);
    }

    Swal.fire({
      icon: "success",
      title: "Draft Saved!",
      text: "Your invoice draft has been saved successfully.",
      confirmButtonColor: "#C29307",
    });
  } catch (err) {
    Swal.fire({
      icon: "error",
      title: "Failed to Save Draft",
      text: (err as Error)?.message || "An unexpected error occurred.",
    });
  } finally {
    setDraftLoading(false);
  }
};

  const loadUserDrafts = async () => {
    try {
      if (!userData?.id) {
        console.log("No user data found");
        return;
      }

      const res = await fetch(`/api/get-invoice-drafts?userId=${userData.id}`);

      const result = await res.json();

      if (res.ok && result.drafts && result.drafts.length > 0) {
        const swalResult = await Swal.fire({
          title: "Drafts Found!",
          html: `You have ${result.drafts.length} saved draft(s). Would you like to load the most recent one?`,
          icon: "info",
          showCancelButton: true,
          showDenyButton: true,
          confirmButtonText: "Load Recent",
          denyButtonText: "View All",
          cancelButtonText: "Start Fresh",
          confirmButtonColor: "#C29307",
        });

        if (swalResult.isConfirmed) {
          const recentDraft = result.drafts[0];

          loadDraftIntoForm(recentDraft);
        } else if (swalResult.isDenied) {
          showDraftsList(result.drafts);
        }
      } else {
        console.log("No drafts found or API error:", result);
      }
    } catch (error) {
      console.error("Failed to load drafts:", error);
    }
  };

  const loadDraftIntoForm = (draft: any) => {
    console.log("Loading draft:", draft);

    // Handle different possible data structures for items
    let transformedItems: InvoiceItem[] = [];

    // Check if items exist in the draft
    if (draft.items && Array.isArray(draft.items)) {
      // If items are already in the correct format
      transformedItems = draft.items.map((item: any) => ({
        id: item.id || crypto.randomUUID(),
        description: item.description || "",
        quantity: Number(item.quantity) || 1,
        unitPrice: Number(item.unitPrice) || Number(item.unit_price) || 0,
        total: Number(item.total) || Number(item.total_amount) || 0,
      }));
    } else if (draft.invoice_items && Array.isArray(draft.invoice_items)) {
      // If items are in invoice_items format
      transformedItems = draft.invoice_items.map((item: any) => ({
        id: item.id || crypto.randomUUID(),
        description: item.description || item.item_description || "",
        quantity: Number(item.quantity) || 1,
        unitPrice: Number(item.unitPrice) || Number(item.unit_price) || 0,
        total: Number(item.total) || Number(item.total_amount) || 0,
      }));
    }

  
    const formData = {
      name: draft.client_name || draft.signee_name || "",
      email: draft.client_email || draft.signee_email || "",
      message: draft.message || "",
      invoice_id: draft.invoice_id || generateInvoiceId(),
      bill_to: draft.bill_to || "",
      from: draft.from_name || draft.initiator_name || "",
      issue_date: draft.issue_date || new Date().toISOString().slice(0, 10),
      customer_note: draft.customer_note || "",
      invoice_items: transformedItems,
      payment_type: draft.payment_type || "single",
      fee_option: draft.fee_option || "customer",
      status: "draft" as const,
      business_logo: draft.business_logo || "",
      redirect_url: draft.redirect_url || "",
      business_name: draft.business_name || "",
      allowMultiplePayments: draft.allow_multiple_payments || false,
      clientPhone: draft.client_phone || "",
      targetQuantity: draft.target_quantity || 1,
    };

    setForm(formData);

    Swal.fire({
      icon: "success",
      title: "Draft Loaded!",
      text: "Your draft has been loaded into the form.",
      confirmButtonColor: "#C29307",
    });
  };

  const showDraftsList = (drafts: any[]) => {
    const draftListHTML = drafts
      .map(
        (draft, index) => `
    <div style="padding: 8px; border-bottom: 1px solid #eee; cursor: pointer;" 
         data-draft-index="${index}">
      <strong>${draft.business_name || "Untitled Invoice"}</strong><br>
      <small>Created: ${new Date(draft.created_at).toLocaleDateString()}</small>
    </div>
  `
      )
      .join("");

    Swal.fire({
      title: "Your Drafts",
      html: `
      <div style="text-align: left; max-height: 300px; overflow-y: auto;">
        ${draftListHTML}
      </div>
    `,
      showConfirmButton: true,
      confirmButtonText: "Close",
      confirmButtonColor: "#C29307",
      width: 500,
      didOpen: () => {
        // Add click handlers after the modal opens
        const draftElements = document.querySelectorAll("[data-draft-index]");
        draftElements.forEach((element) => {
          element.addEventListener("click", () => {
            const index = parseInt(
              element.getAttribute("data-draft-index") || "0"
            );
            loadDraftIntoForm(drafts[index]);
            Swal.close();
          });
        });
      },
    });
  };

  useEffect(() => {
    if (userData?.id) {
      loadUserDrafts();
    }
  }, [userData?.id]);

  // NEW: Function to fetch payment status
  const fetchPaymentStatus = async (invoiceId: string) => {
    try {
      const response = await fetch(
        `/api/invoice/payment-status?invoiceId=${invoiceId}`
      );
      if (response.ok) {
        const data = await response.json();
        setPaymentProgress({
          totalAmount: data.totalAmount || data.invoice?.total_amount || 0,
          paidAmount: data.paidAmount || data.invoice?.paid_amount || 0,
          remainingAmount:
            data.remainingAmount || data.totalAmount - data.paidAmount || 0,
          progress: data.progress || 0,
          status: data.invoice?.status || "unpaid",
          paidQuantity: data.paidQuantity || data.invoice?.paid_quantity || 0,
          targetQuantity:
            data.targetQuantity || data.invoice?.target_quantity || 1,
        });
      }
    } catch (error) {
      console.error("Failed to fetch payment status:", error);
    }
  };

useEffect(() => {
const fetchAccountDetails = async () => {
    if (!userData?.id) return;
    try {
      const res = await fetch("/api/get-wallet-account-details", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: userData.id }),
      });
      const data = await res.json();

      setDetails(data);
    } catch (error) {
      console.error("Error fetching balance:", error);
    }
  };

 fetchAccountDetails();

}, [userData?.id])
  
const handleSaveInvoice = async (
  isDraft: boolean = false
): Promise<{
  success: boolean;
  signingLink?: string;
  invoiceId?: string;
}> => {
  try {
    if (!userData?.id) {
      Swal.fire({
        icon: "warning",
        title: "Unauthorized",
        text: "You must be logged in to send an invoice.",
      });
      return { success: false };
    }

    if (!details) {
      return { success: false };
    }

    const { totalAmount } = calculateTotals();

    const payload = {
      userId: userData?.id,
      initiator_email: userData?.email || "",
      initiator_name: userData
        ? `${userData.firstName} ${userData.lastName}`
        : "",
      invoice_id: form.invoice_id,
      signee_name: form.name,
      signee_email: form.email,
      message: form.message,
      bill_to: form.bill_to,
      issue_date: form.issue_date,
      customer_note: form.customer_note,
      invoice_items: form.invoice_items,
      total_amount: totalAmount,
      payment_type: form.payment_type,
      fee_option: form.fee_option,
      status: isDraft ? "draft" : "unpaid",
      business_logo: form.business_logo,
      redirect_url: form.redirect_url,
      business_name: form.business_name,
      target_quantity: form.allowMultiplePayments ? form.targetQuantity : 1,
      is_draft: isDraft,
      clientPhone: form.clientPhone,
      initiator_account_number: details?.bank_details.bank_account_number,
      initiator_account_name: details?.bank_details.bank_name,
    };



    // Use DIFFERENT endpoints based on whether it's a draft or final invoice
    const endpoint = isDraft ? "/api/save-invoice-draft" : "/api/send-invoice";
    const method = isDraft ? "PUT" : "POST"; // Use PUT for draft updates, POST for new final invoices

    const res = await fetch(endpoint, {
      method: method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const result = await res.json();
    
    if (!res.ok) {
      console.error('API Error:', result);
      throw new Error(result.error || result.message || 'Failed to save invoice');
    }


    if (!isDraft) {
      setPaymentProgress({
        totalAmount: totalAmount,
        paidAmount: 0,
        remainingAmount: totalAmount,
        progress: 0,
        status: "unpaid",
        paidQuantity: 0,
        targetQuantity: form.allowMultiplePayments
          ? Number(form.targetQuantity || 0)
          : 1,
      });
    }

    return {
      success: true,
      signingLink: isDraft ? undefined : result.signingLink,
      invoiceId: form.invoice_id,
    };
  } catch (err) {
    console.error('Error in handleSaveInvoice:', err);
    if (!isDraft) {
      await handleRefund();
    }
    Swal.fire({
      icon: "error",
      title: `Failed to ${isDraft ? "Save Draft" : "Send Invoice"}`,
      text: (err as Error)?.message || "An unexpected error occurred.",
    });
    return { success: false };
  }
};

  const validateInvoiceForm = () => {
    let newErrors: Record<string, string> = {};

    if (!form.business_name.trim())
      newErrors.business_name = "Business name is required.";
    if (!form.email.trim()) {
      newErrors.email = "Client email is required.";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      newErrors.email = "Invalid email format.";
    }

    if (form.invoice_items.length === 0) {
      newErrors.invoice_items = "At least one invoice item is required.";
    } else {
      form.invoice_items.forEach((item, index) => {
        if (!item.description.trim()) {
          newErrors[`item_${index}`] = `Item ${
            index + 1
          } description is required.`;
        }
        if (!item.quantity || Number(item.quantity) <= 0) {
          newErrors[`quantity_${index}`] = `Item ${
            index + 1
          } quantity must be greater than 0.`;
        }
        if (!item.unitPrice || Number(item.unitPrice) <= 0) {
          newErrors[`price_${index}`] = `Item ${
            index + 1
          } price must be greater than 0.`;
        }
      });
    }

    // NEW: Validate target quantity for multiple payments
    if (
      form.allowMultiplePayments &&
      (!form.targetQuantity || form.targetQuantity < 1)
    ) {
      newErrors.targetQuantity = "Target quantity must be at least 1.";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => ({ ...prev, [name]: "" }));
  };

 const handleSubmit = async (isDraft: boolean = false) => {
 
  const result = await handleSaveInvoice(isDraft);
 
  
  if (result.success) {
    if (!isDraft) {
      setGeneratedSigningLink(result.signingLink || "");
      setSavedInvoiceId(result.invoiceId || form.invoice_id);
      setShowSuccessModal(true);

      // Start polling for payment status if multiple payments are enabled
      if (form.allowMultiplePayments && result.invoiceId) {
        fetchPaymentStatus(result.invoiceId);
        const pollInterval = setInterval(() => {
          fetchPaymentStatus(result.invoiceId!);
        }, 10000);
        setTimeout(() => clearInterval(pollInterval), 10 * 60 * 1000);
      }
    } else {
      Swal.fire({
        icon: "success",
        title: "Draft Saved!",
        text: "Your invoice draft has been saved successfully.",
        confirmButtonColor: "#C29307",
      });
    }

    setLoading(false);
    setIsOpen(false);

    if (onInvoiceCreated) {
      onInvoiceCreated();
    }
  } else {
    console.error('Invoice submission failed');
  }
};


  const handleDeduct = async (): Promise<boolean> => {
    return new Promise((resolve) => {
      const pinString = pin.join("");

      fetch("/api/pay-app-service", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: userData?.id,
          pin: pinString,
          amount: 200,
          description: "Invoice successfully generated",
        }),
      })
        .then(async (res) => {
          const data = await res.json();
          if (!res.ok) {
            Swal.fire("Error", data.error || "Something went wrong", "error");
            resolve(false);
          } else {
            resolve(true);
          }
        })
        .catch((err) => {
          Swal.fire("Error", err.message, "error");
          resolve(false);
        });
    });
  };

  const handleRefund = async () => {
    try {
      await fetch("/api/refund-service", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: userData?.id,
          amount: 200,
          description: "Refund for failed invoice generation",
        }),
      });
      Swal.fire({
        icon: "info",
        title: "Refund Processed",
        text: "₦200 has been refunded to your wallet due to failed invoice sending.",
      });
    } catch (err) {
      console.error("Refund failed:", err);
      Swal.fire({
        icon: "warning",
        title: "Refund Failed",
        text: "Payment deduction was made, but refund failed. Please contact support.",
      });
    }
  };

  // Function to process payment and submit invoice
  const processPaymentAndSubmit = async () => {
    setLoading(true);

    try {
      // First process payment
      const paymentSuccess = await handleDeduct();

      if (paymentSuccess) {
        // If payment successful, send invoice
        await handleSubmit(false); // false = not a draft
      }
    } catch (error) {
      console.error("Error in process:", error);
    } finally {
      setLoading(false);
      setIsOpen(false);
    }
  };

  const handleGenerateInvoice = () => {
    if (!validateInvoiceForm()) {
      Swal.fire({
        icon: "error",
        title: "Validation Failed",
        text: "Please correct the errors before generating the invoice.",
      });
      return;
    }

    // Show invoice summary first (payment confirmation)
    setShowInvoiceSummary(true);
  };

  const handleSummaryConfirm = () => {
    setShowInvoiceSummary(false);
    setIsOpen(true);
  };

  // Handle copy signing link
  const handleCopySigningLink = () => {
    if (generatedSigningLink) {
      navigator.clipboard.writeText(generatedSigningLink);
      Swal.fire({
        icon: "success",
        title: "Invoice Link Copied!",
        text: "Invoice link copied to clipboard",
        confirmButtonColor: "#C29307",
      });
    }
  };

  // Refresh payment status
  const handleRefreshStatus = async () => {
    if (savedInvoiceId) {
      await fetchPaymentStatus(savedInvoiceId);
      Swal.fire({
        icon: "success",
        title: "Status Updated",
        text: "Payment status has been refreshed",
        confirmButtonColor: "#C29307",
        timer: 1500,
      });
    }
  };

  const handleDownloadPDF = async () => {
    try {
      setPdfLoading(true);

      const { subtotal, feeAmount, totalAmount } = calculateTotals();

      // Generate HTML content for PDF
      const htmlContent = `
        
        <!DOCTYPE html>
        <html>
        <head>
          <title>Invoice ${form.invoice_id}</title>
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
              margin-bottom: 10px;
            }
            .accound-details {
             display: flex;
             flex-direction: column;
             gap: 10px;
            }
            .accound-details h2 {
            color: #C29307;;
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
            .note-box {
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
          
            .payment-info {
              background-color: #f0f9ff;
              padding: 20px;
              border-radius: 8px;
              border-left: 4px solid #0ea5e9;
              margin: 20px 0;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <div class="business-info">
                ${
                  form.business_logo
                    ? `<img src="${form.business_logo}" alt="${form.business_name}" class="logo">`
                    : ""
                }
                <h2>${form.business_name}</h2>
                <p>${userData?.email || ""}</p>
                ${form.bill_to ? `<p>${form.bill_to}</p>` : ""}

                <div class="account-details">

                  <h2>Account Details</h2>

                  <h3>${details?.bank_details.bank_account_number}</h3>
                <h3>${details?.bank_details.bank_name}</h3>
                </div>

              
              </div>
              <div class="invoice-info">
                <h1>INVOICE</h1>
                <p><strong>Invoice #:</strong> ${form.invoice_id}</p>
                <p><strong>Issue Date:</strong> ${new Date(
                  form.issue_date
                ).toLocaleDateString()}</p>
    
                <p><strong>Status:</strong> ${
                  form.status
                } <span class="status-badge">${form.status.toUpperCase()}</span></p>
              </div>
            </div>

            <div class="section">
              <div class="billing-info">
                <div class="billing-section">
                  <h3>Bill To:</h3>
                  <p><strong>${form.name || "Client Information"}</strong></p>
                  ${form.email ? `<p>📧 ${form.email}</p>` : ""}
                  ${form.clientPhone ? `<p>📞 ${form.clientPhone}</p>` : ""}
                </div>
                <div class="billing-section">
                  <h3>From:</h3>
                  <p><strong>${
                    userData
                      ? `${userData.firstName} ${userData.lastName}`
                      : form.business_name
                  }</strong></p>
                  <p>📧 ${userData?.email || ""}</p>
                </div>
              </div>
            </div>

            ${
              form.message
                ? `
            <div class="section">
              <div class="message-box">
                <h3>Message from ${
                  userData?.firstName || form.business_name
                }:</h3>
                <p>${form.message}</p>
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
                  ${form.invoice_items
                    .map(
                      (item) => `
                    <tr>
                      <td>${item.description}</td>
                      <td>${item.quantity}</td>
                      <td>₦${Number(item.unitPrice).toLocaleString()}</td>
                      <td>₦${Number(item.total).toLocaleString()}</td>
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
                <strong>Processing Fee (3%):</strong> ₦${Number(
                  feeAmount
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
                form.fee_option === "absorbed"
                  ? `
              <div class="total-row" style="font-size: 12px; color: #666;">
                *3% processing fees absorbed by merchant
              </div>
              `
                  : form.fee_option === "customer"
                  ? `
              <div class="total-row" style="font-size: 12px; color: #666;">
                *3% processing fee applied (capped at ₦2,000)
              </div>
              `
                  : ""
              }
            </div>

            ${
              form.customer_note
                ? `
            <div class="section">
              <div class="note-box">
                <h3>Note to Customer:</h3>
                <p>${form.customer_note}</p>
              </div>
            </div>
            `
                : ""
            }

            ${
              form.allowMultiplePayments
                ? `
            <div class="section">
              <div class="payment-info">
                <h3>🎫 Multiple Payments Information:</h3>
                <p><strong>Payment Mode:</strong> Multiple Full Payments</p>
                <p><strong>Individual Payment:</strong> ₦${Number(
                  totalAmount
                ).toLocaleString()} per person</p>
                <p><strong>Target Quantity:</strong> ${
                  form.targetQuantity
                } people</p>
                <p><strong>How it works:</strong></p>
                <ul>
                  <li>Each person pays the full amount: ₦${Number(
                    totalAmount
                  ).toLocaleString()}</li>
                  <li>Share the invoice link with everyone</li>
                  <li>Each person provides their info and pays</li>
                  <li>Perfect for events, tickets, group purchases</li>
                </ul>
              </div>
            </div>
            `
                : ""
            }

            <div class="footer">
              <p><strong>Thank you for your business!</strong></p>
              <p>If you have any questions about this invoice, please contact ${
                userData?.email || form.from
              }</p>
              <p>Generated on ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}</p>
            </div>
          </div>
        </body>
        </html>
      
      `;

      // Call your PDF generation API
      const response = await fetch("/api/generate-pdf", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          html: htmlContent,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to generate PDF");
      }

      // Create blob and download
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.style.display = "none";
      a.href = url;
      a.download = `invoice-${form.invoice_id}.pdf`;

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
      console.error("PDF download error:", error);
      Swal.fire({
        icon: "error",
        title: "Download Failed",
        text: "Failed to download PDF. Please try again.",
        confirmButtonColor: "#C29307",
      });
    } finally {
      setPdfLoading(false);
    }
  };

  const previewInvoice = convertToInvoicePreview(form);

  return (
    <>
      <PinPopOver
        setIsOpen={setIsOpen}
        isOpen={isOpen}
        pin={pin}
        setPin={setPin}
        inputCount={inputCount}
        onConfirm={processPaymentAndSubmit}
      />

      {/* Invoice Summary Modal (Payment Confirmation) */}
      <InvoiceSummary
        invoiceData={form}
        totals={calculateTotals()}
        initiatorName={`${userData?.firstName || ""} ${
          userData?.lastName || ""
        }`}
        initiatorEmail={userData?.email || ""}
        amount={200}
        confirmInvoice={showInvoiceSummary}
        onBack={() => setShowInvoiceSummary(false)}
        onConfirm={handleSummaryConfirm}
      />

      {/* Success Modal with Multiple Payments Features */}
      {showSuccessModal && (
        <div className="fixed inset-0 bg-white/10 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 shadow-lg max-h-[90vh] overflow-y-auto">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg
                  className="w-8 h-8 text-green-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </div>

              <h3 className="text-xl font-bold text-gray-900 mb-2">
                Invoice Created Successfully!
              </h3>
              <p className="text-gray-600">
                Your invoice has been generated and is ready to share.
              </p>
            </div>

            {/* Payment Progress Section for Multiple Payments */}
            {form.allowMultiplePayments && (
              <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-semibold text-blue-800 flex items-center">
                    <Users className="w-4 h-4 mr-2" />
                    Multiple Payments Progress
                  </h4>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleRefreshStatus}
                    className="text-blue-600 border-blue-300"
                  >
                    <RefreshCw className="w-3 h-3 mr-1" />
                    Refresh
                  </Button>
                </div>

                {/* Progress Bar */}
                <div className="mb-3">
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-blue-700">Registration Progress</span>
                    <span className="text-blue-700 font-semibold">
                      {paymentProgress.paidQuantity} /{" "}
                      {paymentProgress.targetQuantity} People
                    </span>
                  </div>
                  <div className="w-full bg-blue-200 rounded-full h-3">
                    <div
                      className="bg-green-600 h-3 rounded-full transition-all duration-500"
                      style={{
                        width: `${
                          paymentProgress.targetQuantity > 0
                            ? (paymentProgress.paidQuantity /
                                paymentProgress.targetQuantity) *
                              100
                            : 0
                        }%`,
                      }}
                    ></div>
                  </div>
                </div>

                {/* Payment Details */}
                <div className="grid grid-cols-2 gap-4 text-sm mb-3">
                  <div className="text-center p-2 bg-white rounded border">
                    <div className="font-semibold text-green-600">
                      {paymentProgress.paidQuantity}
                    </div>
                    <div className="text-blue-600 text-xs">Paid</div>
                  </div>
                  <div className="text-center p-2 bg-white rounded border">
                    <div className="font-semibold text-blue-700">
                      {Math.max(
                        0,
                        paymentProgress.targetQuantity -
                          paymentProgress.paidQuantity
                      )}
                    </div>
                    <div className="text-blue-600 text-xs">
                      Remaining payments
                    </div>
                  </div>
                </div>

                <div className="text-center p-2 bg-white rounded border">
                  <div className="font-semibold text-purple-600">
                    ₦{paymentProgress.totalAmount.toLocaleString()}
                  </div>
                  <div className="text-blue-600 text-xs">Amount Per Person</div>
                </div>

                {/* Multiple Payments Notice */}
                <div className="mt-3 p-3 bg-white rounded border border-blue-300">
                  <div className="flex items-start">
                    <svg
                      className="w-4 h-4 text-blue-600 mt-0.5 mr-2 shrink-0"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                    <div>
                      <p className="text-blue-800 text-sm font-medium">
                        How Multiple Payments Work
                      </p>
                      <p className="text-blue-600 text-xs mt-1">
                        Each person pays the full amount: ₦
                        {paymentProgress.totalAmount.toLocaleString()}. Share
                        the invoice link with everyone - each person provides
                        their info and pays individually!
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div className="space-y-3">
              <Button
                onClick={handleDownloadPDF}
                disabled={pdfLoading}
                className="w-full bg-[#C29307] hover:bg-[#b38606] text-white"
              >
                <Download className="w-4 h-4 mr-2" />
                {pdfLoading ? "Generating PDF..." : "Download PDF"}
              </Button>

            
              {generatedSigningLink && (
                <div className="space-y-2">
                  <Button
                    onClick={handleCopySigningLink}
                    variant="outline"
                    className="w-full border-blue-500 text-blue-500 hover:bg-blue-500 hover:text-white"
                  >
                    <Link className="w-4 h-4 mr-2" />
                    Copy Invoice Link
                  </Button>
                  <div className="text-xs text-gray-500 text-center">
                    {form.allowMultiplePayments
                      ? "Share this link with multiple people - each provides their info and pays"
                      : "Share this invoice link with your client to view details and pay"}
                  </div>
                </div>
              )}

              <Button
                onClick={() => {
                  setShowSuccessModal(false);
                  window.location.reload();
                }}
                variant="outline"
                className="w-full"
              >
                Close
              </Button>
            </div>

            {/* Additional Information */}
            <div className="mt-4 p-3 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-700 text-center">
                <strong>Invoice ID:</strong> {savedInvoiceId}
              </p>
              {form.allowMultiplePayments && (
                <p className="text-xs text-gray-600 text-center mt-1">
                  🎫 Perfect for events, tickets, group registrations
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="min-h-screen bg-background">
        <div className="container mx-auto py-8 px-4">
          {/* Header */}
          <div className="flex items-start space-x-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.back()}
              className="text-[#C29307] hover:bg-white/10 text-sm md:text-base"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              <span className="hidden md:block">Back</span>
            </Button>

            <div className="mb-4">
              <h1 className="md:text-3xl text-xl font-bold mb-2">
                Create Invoice
              </h1>
              <p className="text-muted-foreground">
                Generate a professional invoice and share the link for payments
              </p>
            </div>
          </div>

          <div className="grid lg:grid-cols-2 gap-3">
            {/* Left Column - Invoice Form */}
            <Card className="p-6 h-fit">
              <LogoUpload
                logo={form.business_logo || ""}
                onLogoChange={(logoDataUrl) =>
                  setForm((prev) => ({ ...prev, business_logo: logoDataUrl }))
                }
              />
              <div className="space-y-4">
                <div>
                  <Label htmlFor="businessName">Business Name *</Label>
                  <Input
                    id="businessName"
                    value={form.business_name}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        business_name: e.target.value,
                      }))
                    }
                    placeholder="Your Business Name"
                    className="mt-1"
                  />
                  {errors.business_name && (
                    <p className="text-red-500 text-xs mt-1">
                      {errors.business_name}
                    </p>
                  )}
                </div>

                <div>
                  <Label htmlFor="invoiceNumber">Invoice Number</Label>
                  <Input
                    id="invoiceNumber"
                    value={form.invoice_id}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        invoice_id: e.target.value,
                      }))
                    }
                    className="mt-1"
                    disabled
                  />
                </div>

                <div className="border-t border-border pt-4 mt-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold text-foreground">Bill To</h3>
                    <span className="text-xs text-muted-foreground">
                      (Optional - leave blank for client to fill)
                    </span>
                  </div>
                  <div className="space-y-3">
                    <div>
                      <Label htmlFor="clientName">Client Name</Label>
                      <Input
                        id="clientName"
                        value={form.name || ""}
                        onChange={(e) =>
                          setForm((prev) => ({ ...prev, name: e.target.value }))
                        }
                        placeholder="Leave blank for client to fill"
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label htmlFor="clientEmail">Client Email</Label>
                      <Input
                        id="clientEmail"
                        type="email"
                        value={form.email || ""}
                        onChange={(e) =>
                          setForm((prev) => ({
                            ...prev,
                            email: e.target.value,
                          }))
                        }
                        placeholder="Leave blank for client to fill"
                        className="mt-1"
                      />
                      {errors.email && (
                        <p className="text-red-500 text-xs mt-1">
                          {errors.email}
                        </p>
                      )}
                    </div>
                    <div>
                      <Label htmlFor="clientPhone">Client Phone</Label>
                      <Input
                        id="clientPhone"
                        value={form.clientPhone || ""}
                        onChange={(e) =>
                          setForm((prev) => ({
                            ...prev,
                            clientPhone: e.target.value,
                          }))
                        }
                        placeholder="Leave blank for client to fill"
                        className="mt-1"
                      />
                    </div>
                  </div>
                </div>

                <div className="border-t border-border pt-4 mt-6">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="font-semibold text-foreground">Items</h3>
                    <Button
                      className="bg-[#C29307] text-white cursor-pointer"
                      size="sm"
                      onClick={addItem}
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      Add Item
                    </Button>
                  </div>

                  {form.invoice_items.length > 0 ? (
                    <div>
                      <div className="grid grid-cols-12 gap-3 mb-2 text-xs font-semibold text-muted-foreground">
                        <div className="col-span-5">DESCRIPTION</div>
                        <div className="col-span-2">QTY</div>
                        <div className="col-span-2">PRICE</div>
                        <div className="col-span-2">TOTAL</div>
                        <div className="col-span-1"></div>
                      </div>
                      {form.invoice_items.map((item) => (
                        <InvoiceItemRow
                          key={item.id}
                          item={item}
                          onUpdate={updateItem}
                          onRemove={removeItem}
                        />
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground border border-dashed border-border rounded-md">
                      No items added yet. Click "Add Item" to get started.
                    </div>
                  )}
                  {errors.invoice_items && (
                    <p className="text-red-500 text-sm">
                      {errors.invoice_items}
                    </p>
                  )}
                </div>

                <div className="border-t border-border pt-4 mt-6 space-y-4">
                  {/* Allow Multiple Payments Switch */}
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <Label htmlFor="multiplePayments" className="font-medium">
                        🎫 Allow Multiple Full Payments
                      </Label>
                      <p className="text-xs text-muted-foreground mt-1">
                        Enable multiple people to each pay the FULL amount
                        (perfect for events, tickets, group purchases)
                      </p>
                    </div>
                    <Switch
                      className="bg-[#C29307]"
                      id="multiplePayments"
                      checked={form.allowMultiplePayments}
                      onCheckedChange={(checked) =>
                        setForm((prev) => ({
                          ...prev,
                          allowMultiplePayments: checked,
                          payment_type: checked ? "multiple" : "single",
                          targetQuantity: checked
                            ? prev.targetQuantity || 1
                            : 1,
                        }))
                      }
                    />
                  </div>

                  {/* Target Quantity - Only show when multiple payments is enabled */}
                  {form.allowMultiplePayments && (
                    <div className="border border-blue-200 rounded-lg p-4 bg-blue-50">
                      <Label
                        htmlFor="targetQuantity"
                        className="font-medium text-blue-800"
                      >
                        👥 Number of People Expected to Pay
                      </Label>

                      <Input
                        id="targetQuantity"
                        type="number"
                        min="1"
                        value={form.targetQuantity}
                        onChange={(e) =>
                          setForm((prev) => ({
                            ...prev,
                            targetQuantity:
                              e.target.value === ""
                                ? ""
                                : Number(e.target.value),
                          }))
                        }
                        placeholder="e.g., 50 for 50 attendees"
                        className="mt-1"
                      />

                      {errors.targetQuantity && (
                        <p className="text-red-500 text-xs mt-1">
                          {errors.targetQuantity}
                        </p>
                      )}

                      <p className="text-xs text-blue-600 mt-1">
                        This defines how many people should pay the full amount.
                        Perfect for events, tickets, or group registrations.
                      </p>
                    </div>
                  )}

                  {/* Redirect URL */}
                  <div className="border-t border-border pt-4 mt-4">
                    <Label htmlFor="redirectUrl">Redirect URL (Optional)</Label>
                    <Input
                      id="redirectUrl"
                      type="url"
                      value={form.redirect_url || ""}
                      onChange={(e) =>
                        setForm((prev) => ({
                          ...prev,
                          redirect_url: e.target.value,
                        }))
                      }
                      placeholder="https://example.com/thankyou"
                      className="mt-1"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Redirect clients to this URL after successful payment
                      (e.g., registration form, download page)
                    </p>
                  </div>
                </div>

                <div className="flex gap-3 pt-4">
                  <Button
                    variant="outline"
                    onClick={handleSaveDraft}
                    disabled={draftLoading}
                    className="flex-1"
                  >
                    <Save className="w-4 h-4 mr-2" />
                    {draftLoading ? "Saving..." : "Save Draft"}
                  </Button>
                  <Button
                    onClick={handleGenerateInvoice}
                    disabled={loading}
                    className="flex-1 bg-[#C29307] hover:bg-[#b38606] text-white"
                  >
                    {loading ? (
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        Processing...
                      </div>
                    ) : (
                      "Generate Invoice"
                    )}
                  </Button>
                </div>
              </div>
            </Card>

            {/* Right Column - Live Preview */}
            <div className="lg:sticky lg:top-8 h-fit">
              <h3 className="text-lg font-semibold mb-4 text-foreground">
                Live Preview
              </h3>
              <InvoicePreview invoice={previewInvoice} />
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

export default CreateInvoice;
