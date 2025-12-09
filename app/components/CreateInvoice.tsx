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
  Edit,
  Trash2,
  X,
  Eye,
  Clock,
  Calendar,
  FileText,
} from "lucide-react";
import { Label } from "./ui/label";
import { Switch } from "./ui/switch";
import React, { Suspense, useEffect, useState } from "react";
import Swal from "sweetalert2";
import { useUserContextData } from "../context/userData";
import { Textarea } from "./ui/textarea";
import PinPopOver from "./PinPopOver";
import InvoiceSummary from "./InvoiceSummary";
import { InvoicePreview } from "./previews/InvoicePreview";
import LogoUpload from "./invoice/LogoUpload";
import { useRouter, useSearchParams } from "next/navigation";
import confetti from "canvas-confetti";

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

// Drafts Modal Component
interface Draft {
  id: string;
  business_name: string;
  invoice_id: string;
  created_at: string;
  total_amount: number;
  client_name?: string;
  client_email?: string;
}

interface DraftsModalProps {
  isOpen: boolean;
  onClose: () => void;
  drafts: Draft[];
  onLoadDraft: (draft: Draft) => void;
  onViewAll?: () => void;
  onStartFresh: () => void;
}

const DraftsModal: React.FC<DraftsModalProps> = ({
  isOpen,
  onClose,
  drafts,
  onLoadDraft,
  onViewAll,
  onStartFresh,
}) => {
  const [selectedDraftId, setSelectedDraftId] = useState<string | null>(null);

  if (!isOpen) return null;

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-NG", {
      style: "currency",
      currency: "NGN",
      minimumFractionDigits: 2,
    }).format(amount);
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <Card className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[85vh] overflow-hidden">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b p-6 flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Saved Drafts</h2>
            <p className="text-gray-600 text-sm mt-1">
              You have {drafts.length} saved draft
              {drafts.length !== 1 ? "s" : ""}. Choose an action:
            </p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="h-10 w-10 hover:bg-gray-100"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[60vh]">
          {/* Drafts List */}
          <div className="grid gap-4 mb-8">
            {drafts.slice(0, 3).map((draft) => (
              <div
                key={draft.id}
                className={`p-4 border rounded-lg hover:shadow-md transition-shadow cursor-pointer ${
                  selectedDraftId === draft.id
                    ? "border-[#C29307] bg-amber-50"
                    : "border-gray-200"
                }`}
                onClick={() => setSelectedDraftId(draft.id)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="px-2 py-1 bg-amber-100 text-amber-800 text-xs font-medium rounded border border-amber-200 flex items-center">
                        <Clock className="h-3 w-3 mr-1" />
                        Draft
                      </span>
                      <span className="text-sm font-medium text-gray-500">
                        {draft.invoice_id}
                      </span>
                    </div>
                    <h3 className="font-semibold text-gray-900 mb-1">
                      {draft.business_name || "Untitled Invoice"}
                    </h3>
                    {draft.client_name && (
                      <p className="text-sm text-gray-600 mb-1">
                        Client: {draft.client_name}
                      </p>
                    )}
                    <div className="flex items-center gap-4 text-sm text-gray-500">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {formatDate(draft.created_at)}
                      </span>
                      <span className="flex items-center gap-1">
                        <FileText className="h-3 w-3" />
                        {formatCurrency(draft.total_amount)}
                      </span>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      onLoadDraft(draft);
                      onClose();
                    }}
                    className="ml-4"
                  >
                    <Eye className="h-4 w-4 mr-2" />
                    Load
                  </Button>
                </div>
              </div>
            ))}
          </div>

          {drafts.length > 3 && (
            <div className="text-center mb-6">
              <p className="text-gray-600">
                ...and {drafts.length - 3} more draft
                {drafts.length - 3 !== 1 ? "s" : ""}
              </p>
              <Button
                variant="link"
                onClick={onViewAll}
                className="text-[#C29307] hover:text-[#b38606]"
              >
                View All Drafts
              </Button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-white border-t p-6">
          <div className="flex flex-col sm:flex-row gap-3">
            <Button variant="outline" onClick={onStartFresh} className="flex-1">
              Start Fresh
            </Button>
            {selectedDraftId && (
              <Button
                onClick={() => {
                  const selectedDraft = drafts.find(
                    (d) => d.id === selectedDraftId
                  );
                  if (selectedDraft) onLoadDraft(selectedDraft);
                }}
                className="flex-1 bg-[#C29307] hover:bg-[#b38606] text-white"
              >
                Load Selected Draft
              </Button>
            )}
          </div>
        </div>
      </Card>
    </div>
  );
};

// Popup Invoice Item Form Component
const InvoiceItemForm = ({
  item,
  isOpen,
  onClose,
  onSubmit,
}: {
  item: InvoiceItem | null;
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (item: InvoiceItem) => void;
}) => {
  const [formData, setFormData] = useState<InvoiceItem>({
    id: "",
    description: "",
    quantity: 1,
    unitPrice: 0,
    total: 0,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (item) {
      setFormData(item);
    } else {
      setFormData({
        id: crypto.randomUUID(),
        description: "",
        quantity: 1,
        unitPrice: 0,
        total: 0,
      });
    }
    setErrors({});
  }, [item]);

  useEffect(() => {
    const total = formData.quantity * formData.unitPrice;
    setFormData((prev) => ({ ...prev, total }));
  }, [formData.quantity, formData.unitPrice]);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.description.trim()) {
      newErrors.description = "Description is required";
    }
    if (!formData.quantity || formData.quantity <= 0) {
      newErrors.quantity = "Quantity must be greater than 0";
    }
    if (!formData.unitPrice || formData.unitPrice < 0) {
      newErrors.unitPrice = "Price must be 0 or greater";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validateForm()) {
      onSubmit(formData);
      onClose();
    }
  };

  const handleChange = (field: keyof InvoiceItem, value: string | number) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: "" }));
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-background rounded-lg shadow-lg max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-lg font-semibold">
            {item ? "Edit Item" : "Add New Item"}
          </h2>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="h-8 w-8"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="description">Description *</Label>
            <Input
              id="description"
              placeholder="Item/Service name"
              value={formData.description}
              onChange={(e) => handleChange("description", e.target.value)}
              required
              autoFocus
              className={errors.description ? "border-red-500" : ""}
            />
            {errors.description && (
              <p className="text-red-500 text-xs mt-1">{errors.description}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="quantity">Quantity *</Label>
              <Input
                id="quantity"
                type="number"
                placeholder="Qty"
                value={formData.quantity}
                onChange={(e) =>
                  handleChange("quantity", parseFloat(e.target.value) || 0)
                }
                min="1"
                step="1"
                required
                className={errors.quantity ? "border-red-500" : ""}
              />
              {errors.quantity && (
                <p className="text-red-500 text-xs mt-1">{errors.quantity}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="unitPrice">Unit Price (₦) *</Label>
              <Input
                id="unitPrice"
                type="number"
                placeholder="Price"
                value={formData.unitPrice}
                onChange={(e) =>
                  handleChange("unitPrice", parseFloat(e.target.value) || 0)
                }
                min="0"
                step="0.01"
                required
                className={errors.unitPrice ? "border-red-500" : ""}
              />
              {errors.unitPrice && (
                <p className="text-red-500 text-xs mt-1">{errors.unitPrice}</p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Total</Label>
            <div className="p-3 bg-muted rounded-md text-lg font-semibold">
              ₦
              {formData.total.toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </div>
          </div>

          <div className="flex justify-end space-x-2 pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" className="bg-[#C29307] hover:bg-[#b38606]">
              {item ? "Update Item" : "Add Item"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

// View-only Invoice Item Row Component
const InvoiceItemRow = ({
  item,
  onEdit,
  onRemove,
}: {
  item: InvoiceItem;
  onEdit: (id: string) => void;
  onRemove: (id: string) => void;
}) => {
  return (
    <div className="grid grid-cols-12 gap-3 items-center mb-3 p-3 border rounded-md hover:bg-accent/5 transition-colors">
      <div className="col-span-5">
        <div className="font-medium truncate" title={item.description}>
          {item.description || "No description"}
        </div>
      </div>

      <div className="col-span-1">
        <div className="text-muted-foreground text-center">{item.quantity}</div>
      </div>

      <div className="col-span-2">
        <div className="text-muted-foreground text-right">
          ₦{item.unitPrice.toLocaleString()}
        </div>
      </div>

      <div className="col-span-2">
        <div className="font-semibold text-right">
          ₦{item.total.toLocaleString()}
        </div>
      </div>

      <div className="col-span-2 flex justify-end space-x-1">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onEdit(item.id)}
          className="h-8 w-8 hover:bg-primary/10"
        >
          <Edit className="h-3.5 w-3.5" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onRemove(item.id)}
          className="h-8 w-8 hover:bg-destructive/10 hover:text-destructive"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
};

// Convert InvoiceForm to the format expected by InvoicePreview
const convertToInvoicePreview = (form: InvoiceForm) => {
  const subtotal = form.invoice_items.reduce(
    (sum, item) => sum + Number(item.quantity) * Number(item.unitPrice),
    0
  );

  const feePercentage = 0.02;
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
  const randomToken = crypto
    .randomUUID()
    .replace(/-/g, "")
    .substring(0, 4)
    .toUpperCase();
  return `INV_${randomToken}`;
};

// Update the showCustomNotification function type definition
const showCustomNotification = ({
  type,
  title,
  message,
}: {
  type: "success" | "error" | "info" | "warning";
  title: string;
  message: string;
}) => {
  // Check if notification already exists
  const existingNotification = document.querySelector(".custom-notification");
  if (existingNotification) {
    existingNotification.remove();
  }

  const notification = document.createElement("div");
  const bgColor =
    type === "success"
      ? "bg-green-50 border-green-200"
      : type === "error"
      ? "bg-red-50 border-red-200"
      : type === "warning"
      ? "bg-yellow-50 border-yellow-200"
      : "bg-blue-50 border-blue-200";
  const textColor =
    type === "success"
      ? "text-green-800"
      : type === "error"
      ? "text-red-800"
      : type === "warning"
      ? "text-yellow-800"
      : "text-blue-800";
  const icon =
    type === "success"
      ? "✅"
      : type === "error"
      ? "❌"
      : type === "warning"
      ? "⚠️"
      : "ℹ️";

  notification.className = `custom-notification fixed top-4 right-4 ${bgColor} border rounded-lg shadow-lg p-4 max-w-sm z-50`;
  notification.style.cssText = `
    animation: slideIn 0.3s ease-out forwards;
    transform: translateX(100%);
  `;

  notification.innerHTML = `
    <div class="flex items-start">
      <span class="text-xl mr-3">${icon}</span>
      <div>
        <h4 class="font-bold ${textColor}">${title}</h4>
        <p class="text-sm text-gray-600 mt-1">${message}</p>
      </div>
    </div>
  `;

  // Add CSS animation if not already present
  if (!document.querySelector("#notification-styles")) {
    const style = document.createElement("style");
    style.id = "notification-styles";
    style.textContent = `
      @keyframes slideIn {
        from {
          transform: translateX(100%);
          opacity: 0;
        }
        to {
          transform: translateX(0);
          opacity: 1;
        }
      }
      @keyframes slideOut {
        from {
          transform: translateX(0);
          opacity: 1;
        }
        to {
          transform: translateX(100%);
          opacity: 0;
        }
      }
    `;
    document.head.appendChild(style);
  }

  document.body.appendChild(notification);

  // Trigger animation
  setTimeout(() => {
    notification.style.animation = "slideIn 0.3s ease-out forwards";
  }, 10);

  // Auto remove after 3 seconds
  setTimeout(() => {
    notification.style.animation = "slideOut 0.3s ease-in forwards";
    setTimeout(() => {
      if (notification.parentNode) {
        document.body.removeChild(notification);
      }
    }, 300);
  }, 3000);
};

interface CreateInvoiceProps {
  onInvoiceCreated?: () => void;
}

function CreateInvoice({ onInvoiceCreated }: CreateInvoiceProps) {
  const inputCount = 4;
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [pin, setPin] = useState(Array(inputCount).fill(""));
  const [isPinOpen, setIsPinOpen] = useState(false);
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

  // Add state for free invoice tracking
  const [freeInvoiceInfo, setFreeInvoiceInfo] = useState({
    freeInvoicesLeft: 10,
    totalInvoicesCreated: 0,
    hasFreeInvoices: true,
    isChecking: true,
  });

  // Add state for drafts modal
  const [showDraftsModal, setShowDraftsModal] = useState(false);
  const [userDrafts, setUserDrafts] = useState<Draft[]>([]);

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

  // State for popup invoice item form
  const [isItemDialogOpen, setIsItemDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<InvoiceItem | null>(null);
  const searchParams = useSearchParams();
  const { userData } = useUserContextData();

  const [hasLoadedFromUrl, setHasLoadedFromUrl] = useState(false);

  useEffect(() => {
    const draftId = searchParams?.get("draftId");

    if (draftId && userData?.id && !hasLoadedFromUrl) {
      const loadDraftFromParam = async () => {
        try {
          const res = await fetch(
            `/api/get-invoice-draft-details?draftId=${draftId}&userId=${userData.id}`
          );
          const result = await res.json();

          if (res.ok && result.draft) {
            loadDraftIntoForm(result.draft);
            setHasLoadedFromUrl(true); // Mark as loaded
          } else {
            showCustomNotification({
              type: "error",
              title: "Draft Not Found",
              message:
                result.error || "The requested draft could not be found.",
            });
          }
        } catch (error) {
          console.error("Failed to load draft from URL:", error);
          showCustomNotification({
            type: "error",
            title: "Error",
            message: "Failed to load the draft. Please try again.",
          });
        }
      };

      loadDraftFromParam();
    }
  }, [searchParams, userData?.id, hasLoadedFromUrl]);

  const loadDraftIntoForm = (draft: any) => {
    // Close drafts modal if it's open
    if (showDraftsModal) {
      setShowDraftsModal(false);
    }

    let transformedItems: InvoiceItem[] = [];

    // Handle both API response structures
    if (draft.items && Array.isArray(draft.items)) {
      // From get-invoice-draft-details API
      transformedItems = draft.items.map((item: any) => ({
        id: item.id || crypto.randomUUID(),
        description: item.description || item.item_description || "",
        quantity: Number(item.quantity) || 1,
        unitPrice: Number(item.unitPrice) || Number(item.unit_price) || 0,
        total: Number(item.total) || Number(item.total_amount) || 0,
      }));
    } else if (draft.invoice_items && Array.isArray(draft.invoice_items)) {
      // From get-invoice-drafts API
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
      from: draft.from_name || draft.initiator_name || userData?.email || "",
      issue_date: draft.issue_date || new Date().toISOString().slice(0, 10),
      customer_note: draft.customer_note || "",
      invoice_items: transformedItems,
      payment_type: draft.payment_type || "single",
      fee_option: draft.fee_option || "customer",
      status: "draft" as const,
      business_logo: draft.business_logo || "",
      redirect_url: draft.redirect_url || "",
      business_name:
        draft.business_name ||
        (userData?.firstName && userData?.lastName
          ? `${userData.firstName} ${userData.lastName}`
          : userData?.email || ""),
      allowMultiplePayments: draft.allow_multiple_payments || false,
      clientPhone: draft.client_phone || "",
      targetQuantity: draft.target_quantity || 1,
    };

    setForm(formData);

    showCustomNotification({
      type: "success",
      title: "Draft Loaded!",
      message: "Your draft has been loaded into the form.",
    });
  };
  useEffect(() => {
    const checkInvoiceStatus = async () => {
      if (userData?.id) {
        try {
          const res = await fetch(
            `/api/check-remaning-free-invoice?userId=${userData.id}`
          );
          const data = await res.json();

          if (data.success) {
            setFreeInvoiceInfo({
              freeInvoicesLeft: data.freeInvoicesLeft || 10,
              totalInvoicesCreated: data.totalInvoicesCreated || 0,
              hasFreeInvoices: data.hasFreeInvoices || true,
              isChecking: false,
            });
          } else {
            setFreeInvoiceInfo({
              freeInvoicesLeft: 10,
              totalInvoicesCreated: 0,
              hasFreeInvoices: true,
              isChecking: false,
            });
          }
        } catch (error) {
          console.error("Error checking invoice status:", error);
          setFreeInvoiceInfo({
            freeInvoicesLeft: 10,
            totalInvoicesCreated: 0,
            hasFreeInvoices: true,
            isChecking: false,
          });
        }
      } else {
        setFreeInvoiceInfo({
          freeInvoicesLeft: 10,
          totalInvoicesCreated: 0,
          hasFreeInvoices: true,
          isChecking: false,
        });
      }
    };

    checkInvoiceStatus();
  }, [userData?.id]);

  const triggerConfetti = () => {
    confetti({
      particleCount: 150,
      spread: 70,
      origin: { y: 0.6 },
      colors: ["#C29307", "#ffd700", "#ffed4e", "#ffffff", "#fbbf24"],
    });
  };

  const calculateTotals = () => {
    const subtotal = form.invoice_items.reduce(
      (sum, item) => sum + Number(item.quantity) * Number(item.unitPrice),
      0
    );

    const feePercentage = 0.02;
    const feeAmount =
      form.fee_option === "customer"
        ? Math.min(subtotal * feePercentage, 2000)
        : 0;

    const totalAmount =
      form.fee_option === "customer" ? subtotal + feeAmount : subtotal;

    return { subtotal, feeAmount, totalAmount };
  };

  // Handle adding new item via popup
  const handleAddItem = () => {
    setEditingItem(null);
    setIsItemDialogOpen(true);
  };

  // Handle editing existing item via popup
  const handleEditItem = (id: string) => {
    const itemToEdit = form.invoice_items.find((item) => item.id === id);
    setEditingItem(itemToEdit || null);
    setIsItemDialogOpen(true);
  };

  // Handle item submission from popup
  const handleItemSubmit = (item: InvoiceItem) => {
    if (editingItem) {
      setForm((prev) => ({
        ...prev,
        invoice_items: prev.invoice_items.map((i) =>
          i.id === item.id ? item : i
        ),
      }));
    } else {
      setForm((prev) => ({
        ...prev,
        invoice_items: [...prev.invoice_items, item],
      }));
    }
  };

  // Handle closing the popup
  const handleDialogClose = () => {
    setIsItemDialogOpen(false);
    setEditingItem(null);
  };

  // Handle removing an item with confirmation
  const removeItem = (id: string) => {
    Swal.fire({
      title: "Remove Item?",
      text: "Are you sure you want to remove this item?",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#C29307",
      cancelButtonColor: "#6b7280",
      confirmButtonText: "Yes, remove it!",
      cancelButtonText: "Cancel",
    }).then((result) => {
      if (result.isConfirmed) {
        setForm((prev) => ({
          ...prev,
          invoice_items: prev.invoice_items.filter((item) => item.id !== id),
        }));
        showCustomNotification({
          type: "success",
          title: "Item Removed!",
          message: "Item has been removed from the invoice.",
        });
      }
    });
  };

  // Initialize from userData
  useEffect(() => {
    if (userData) {
      const today = new Date().toISOString().slice(0, 10);

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

  // Load user drafts
  const loadUserDrafts = async () => {
    try {
      if (!userData?.id) {
        console.log("No user data found");
        return;
      }

      // Check if we're already loading a specific draft from URL
      const draftId = searchParams?.get("draftId");
      if (draftId) {
        console.log("Skipping drafts modal - loading specific draft:", draftId);
        return;
      }

      const res = await fetch(`/api/get-invoice-drafts?userId=${userData.id}`);
      const result = await res.json();

      if (res.ok && result.drafts && result.drafts.length > 0) {
        setUserDrafts(result.drafts);
        setShowDraftsModal(true);
      }
    } catch (error) {
      console.error("Failed to load drafts:", error);
    }
  };

  // Handle view all drafts
  const handleViewAllDrafts = () => {
    setShowDraftsModal(false);

    const draftsHTML = userDrafts
      .map(
        (draft, index) => `
      <div class="draft-item p-3 border-b border-gray-200 hover:bg-gray-50 cursor-pointer" 
           data-draft-id="${draft.id}">
        <div class="flex justify-between items-center">
          <div>
            <strong class="text-gray-900">${
              draft.business_name || "Untitled Invoice"
            }</strong>
            <div class="text-sm text-gray-600 mt-1">
              ${draft.invoice_id} • ${new Date(
          draft.created_at
        ).toLocaleDateString()}
            </div>
          </div>
          <button class="load-draft-btn px-3 py-1 text-sm bg-[#C29307] text-white rounded hover:bg-[#b38606] transition-colors"
                  data-draft-id="${draft.id}">
            Load
          </button>
        </div>
      </div>
    `
      )
      .join("");

    const modal = document.createElement("div");
    modal.className =
      "fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4";
    modal.innerHTML = `
      <div class="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] overflow-hidden">
        <div class="p-6 border-b">
          <div class="flex justify-between items-center">
            <h3 class="text-xl font-bold text-gray-900">All Drafts (${userDrafts.length})</h3>
            <button class="close-modal text-gray-400 hover:text-gray-600">
              ✕
            </button>
          </div>
        </div>
        <div class="p-6 overflow-y-auto max-h-[60vh]">
          ${draftsHTML}
        </div>
        <div class="p-6 border-t">
          <button class="start-fresh-btn w-full py-2 px-4 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors">
            Start New Invoice
          </button>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    // Add event listeners
    modal.querySelector(".close-modal")?.addEventListener("click", () => {
      document.body.removeChild(modal);
    });

    modal
      .querySelectorAll(".load-draft-btn, .draft-item")
      .forEach((element) => {
        element.addEventListener("click", (e) => {
          e.stopPropagation();
          const draftId = element.getAttribute("data-draft-id");
          const draft = userDrafts.find((d) => d.id === draftId);
          if (draft) {
            loadDraftIntoForm(draft);
            document.body.removeChild(modal);
          }
        });
      });

    modal.querySelector(".start-fresh-btn")?.addEventListener("click", () => {
      document.body.removeChild(modal);
    });

    // Close on background click
    modal.addEventListener("click", (e) => {
      if (e.target === modal) {
        document.body.removeChild(modal);
      }
    });
  };

  // Load drafts on mount
  useEffect(() => {
    if (userData?.id) {
      const draftId = searchParams?.get("draftId");

      if (!draftId) {
        loadUserDrafts();
      }
    }
  }, [userData?.id, searchParams]);

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
  }, [userData?.id]);

  const handleSaveDraft = async () => {
    try {
      setDraftLoading(true);

      if (!userData?.id) {
        showCustomNotification({
          type: "error",
          title: "Unauthorized",
          message: "You must be logged in to save a draft.",
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

      const res = await fetch("/api/save-invoice-draft", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const result = await res.json();

      if (!res.ok) {
        throw new Error(result.error || result.message);
      }

      showCustomNotification({
        type: "success",
        title: "Draft Saved!",
        message: "Your invoice draft has been saved successfully.",
      });

      router.push("/dashboard/services/create-invoice");
    } catch (err) {
      showCustomNotification({
        type: "error",
        title: "Failed to Save Draft",
        message: (err as Error)?.message || "An unexpected error occurred.",
      });
    } finally {
      setDraftLoading(false);
    }
  };

  const handleSaveInvoice = async (
    isDraft: boolean = false
  ): Promise<{
    success: boolean;
    signingLink?: string;
    invoiceId?: string;
  }> => {
    try {
      if (!userData?.id) {
        showCustomNotification({
          type: "warning",
          title: "Unauthorized",
          message: "You must be logged in to send an invoice.",
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
        initiator_account_name: details?.bank_details.bank_account_name,
        initiator_bank_name: details?.bank_details.bank_name,
      };

      const endpoint = isDraft
        ? "/api/save-invoice-draft"
        : "/api/send-invoice";
      const method = isDraft ? "PUT" : "POST";

      const res = await fetch(endpoint, {
        method: method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const result = await res.json();

      if (!res.ok) {
        console.error("API Error:", result);
        throw new Error(
          result.error || result.message || "Failed to save invoice"
        );
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
      console.error("Error in handleSaveInvoice:", err);
      if (!isDraft) {
        await handleRefund();
      }
      showCustomNotification({
        type: "error",
        title: `Failed to ${isDraft ? "Save Draft" : "Send Invoice"}`,
        message: (err as Error)?.message || "An unexpected error occurred.",
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
        triggerConfetti();
        setGeneratedSigningLink(result.signingLink || "");
        setSavedInvoiceId(result.invoiceId || form.invoice_id);

        // Show success modal directly without any other modals
        setShowSuccessModal(true);

        if (form.allowMultiplePayments && result.invoiceId) {
          fetchPaymentStatus(result.invoiceId!);
          const pollInterval = setInterval(() => {
            fetchPaymentStatus(result.invoiceId!);
          }, 10000);
          setTimeout(() => clearInterval(pollInterval), 10 * 60 * 1000);
        }
      } else {
        showCustomNotification({
          type: "success",
          title: "Draft Saved!",
          message: "Your invoice draft has been saved successfully.",
        });
      }

      setLoading(false);
      setIsPinOpen(false);

      if (onInvoiceCreated) {
        onInvoiceCreated();
      }
    } else {
      console.error("Invoice submission failed");
    }
  };

  const handleDeduct = async (): Promise<boolean> => {
    return new Promise((resolve) => {
      const pinString = pin.join("") || "0000";

      fetch("/api/pay-app-service", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: userData?.id,
          pin: pinString,
          amount: 0,
          description: "Invoice successfully generated",
          isInvoiceCreation: true,
        }),
      })
        .then(async (res) => {
          const data = await res.json();
          if (!res.ok) {
            showCustomNotification({
              type: "error",
              title: "Payment Failed",
              message: data.error || "Something went wrong",
            });
            resolve(false);
          } else {
            // Update free invoice info
            setFreeInvoiceInfo({
              freeInvoicesLeft: data.freeInvoicesLeft || 0,
              totalInvoicesCreated: data.totalInvoicesCreated || 0,
              hasFreeInvoices: (data.freeInvoicesLeft || 0) > 0,
              isChecking: false,
            });

            // Don't show success modal here - it will show after handleSubmit
            resolve(true);
          }
        })
        .catch((err) => {
          showCustomNotification({
            type: "error",
            title: "Error",
            message: err.message,
          });
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
          amount: 0,
          description: "Refund for failed invoice generation",
        }),
      });
      showCustomNotification({
        type: "info",
        title: "Refund Processed",
        message:
          "₦0 has been refunded to your wallet due to failed invoice sending.",
      });
    } catch (err) {
      console.error("Refund failed:", err);
      showCustomNotification({
        type: "warning",
        title: "Refund Failed",
        message:
          "Payment deduction was made, but refund failed. Please contact support.",
      });
    }
  };

  // Fixed: Simplified flow - only show PIN popup when needed
  const processPaymentAndSubmit = async () => {
    setLoading(true);

    try {
      if (freeInvoiceInfo.hasFreeInvoices) {
        // For free invoices, we still need PIN verification
        setIsPinOpen(true);
      } else {
        // For paid invoices, show PIN popup
        setIsPinOpen(true);
      }
    } catch (error) {
      console.error("Error in process:", error);
      showCustomNotification({
        type: "error",
        title: "Error",
        message: "Failed to process invoice creation",
      });
      setLoading(false);
    }
  };

  const handleGenerateInvoice = () => {
    if (!validateInvoiceForm()) {
      showCustomNotification({
        type: "error",
        title: "Validation Failed",
        message: "Please correct the errors before generating the invoice.",
      });
      return;
    }

    // Show invoice summary first
    setShowInvoiceSummary(true);
  };

  const handleSummaryConfirm = () => {
    setShowInvoiceSummary(false);
    // Start the payment/invoice creation process
    processPaymentAndSubmit();
  };

  // Handle copy signing link
  const handleCopySigningLink = () => {
    if (generatedSigningLink) {
      navigator.clipboard.writeText(generatedSigningLink);
      showCustomNotification({
        type: "success",
        title: "Invoice Link Copied!",
        message: "Invoice link copied to clipboard",
      });
    }
  };

  // Refresh payment status
  const handleRefreshStatus = async () => {
    if (savedInvoiceId) {
      await fetchPaymentStatus(savedInvoiceId);
      showCustomNotification({
        type: "success",
        title: "Status Updated",
        message: "Payment status has been refreshed",
      });
    }
  };

  const handleDownloadPDF = async () => {
    try {
      setPdfLoading(true);

      const { subtotal, feeAmount, totalAmount } = calculateTotals();

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
                .invoice-narration{
               margin-left: 30px;
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

                  <h3>${details?.bank_details.bank_account_name}</h3>
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

                                <small class="invoice-narration">
                  Ensure this invoice number <strong>${
                    form.invoice_id
                  }</strong> is used as the narration when you transfer to make payment valid.
                </small>
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
                <strong>Processing Fee (2%):</strong> ₦${Number(
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

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.style.display = "none";
      a.href = url;
      a.download = `invoice-${form.invoice_id}.pdf`;

      document.body.appendChild(a);
      a.click();

      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      showCustomNotification({
        type: "success",
        title: "PDF Downloaded!",
        message: "Your invoice has been downloaded as PDF",
      });
    } catch (error) {
      console.error("PDF download error:", error);
      showCustomNotification({
        type: "error",
        title: "Download Failed",
        message: "Failed to download PDF. Please try again.",
      });
    } finally {
      setPdfLoading(false);
    }
  };

  const previewInvoice = convertToInvoicePreview(form);

  return (
    <>
      <PinPopOver
        setIsOpen={setIsPinOpen}
        isOpen={isPinOpen}
        pin={pin}
        setPin={setPin}
        inputCount={inputCount}
        onConfirm={() => {
          handleDeduct().then((success) => {
            if (success) {
              handleSubmit(false);
            }
          });
        }}
        invoiceFeeInfo={{
          isFree: freeInvoiceInfo.hasFreeInvoices,
          freeInvoicesLeft: freeInvoiceInfo.freeInvoicesLeft,
          totalInvoicesCreated: freeInvoiceInfo.totalInvoicesCreated,
          feeAmount: 100,
        }}
      />

      <DraftsModal
        isOpen={showDraftsModal && !searchParams?.get("draftId")}
        onClose={() => setShowDraftsModal(false)}
        drafts={userDrafts}
        onLoadDraft={loadDraftIntoForm}
        onViewAll={handleViewAllDrafts}
        onStartFresh={() => setShowDraftsModal(false)}
      />

      {/* Invoice Summary Modal */}

      <InvoiceSummary
        invoiceData={form}
        totals={calculateTotals()}
        initiatorName={`${userData?.firstName || ""} ${
          userData?.lastName || ""
        }`}
        initiatorEmail={userData?.email || ""}
        amount={freeInvoiceInfo.hasFreeInvoices ? 0 : 100}
        confirmInvoice={showInvoiceSummary}
        onBack={() => setShowInvoiceSummary(false)}
        onConfirm={handleSummaryConfirm}
        freeInvoiceInfo={freeInvoiceInfo}
      />

      {/* Popup Invoice Item Form */}
      <InvoiceItemForm
        item={editingItem}
        isOpen={isItemDialogOpen}
        onClose={handleDialogClose}
        onSubmit={handleItemSubmit}
      />

      {/* Success Modal - Only this one shows at the end */}
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
                Invoice Created Successfully! 🎉
              </h3>
              <p className="text-gray-600">
                Your invoice has been generated and is ready to share.
              </p>
            </div>

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
              <h1 className="md:text-3xl text-xl font-bold mb-2 flex items-start gap-3">
                Create Invoice
                <span
                  className={`p-1 text-white text-sm font-bold rounded ${
                    freeInvoiceInfo.hasFreeInvoices
                      ? "bg-[#C29307]"
                      : "bg-red-600"
                  }`}
                >
                  {freeInvoiceInfo.isChecking
                    ? "Loading..."
                    : freeInvoiceInfo.hasFreeInvoices
                    ? `Free (${freeInvoiceInfo.freeInvoicesLeft} left)`
                    : "₦100"}
                </span>
              </h1>
              <p className="text-muted-foreground">
                Generate a professional invoice and share the link for payments
                {!freeInvoiceInfo.isChecking && (
                  <span
                    className={`font-medium ml-2 ${
                      freeInvoiceInfo.hasFreeInvoices
                        ? "text-green-600"
                        : "text-red-600"
                    }`}
                  >
                    •{" "}
                    {freeInvoiceInfo.hasFreeInvoices
                      ? `${freeInvoiceInfo.freeInvoicesLeft} free invoices remaining`
                      : "₦100 per invoice after free limit"}
                  </span>
                )}
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
                    <div>
                      <h3 className="font-semibold text-foreground">Items</h3>
                      {form.invoice_items.length > 0 && (
                        <p className="text-xs text-muted-foreground mt-1">
                          {form.invoice_items.length} item
                          {form.invoice_items.length !== 1 ? "s" : ""} • Total:
                          ₦
                          {form.invoice_items
                            .reduce((sum, item) => sum + item.total, 0)
                            .toLocaleString()}
                        </p>
                      )}
                    </div>
                    <Button
                      className="bg-[#C29307] hover:bg-[#b38606] text-white cursor-pointer"
                      size="sm"
                      onClick={handleAddItem}
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      Add Item
                    </Button>
                  </div>

                  {form.invoice_items.length > 0 ? (
                    <div>
                      <div className="grid grid-cols-12 gap-3 mb-2 text-xs font-semibold text-muted-foreground">
                        <div className="col-span-5">DESCRIPTION</div>
                        <div className="col-span-1 text-center">QTY</div>
                        <div className="col-span-2 text-right">PRICE</div>
                        <div className="col-span-2 text-right">TOTAL</div>
                        <div className="col-span-2 text-right">ACTIONS</div>
                      </div>
                      <div className="space-y-2">
                        {form.invoice_items.map((item) => (
                          <InvoiceItemRow
                            key={item.id}
                            item={item}
                            onEdit={handleEditItem}
                            onRemove={removeItem}
                          />
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground border border-dashed border-border rounded-md">
                      <div className="flex flex-col items-center gap-2">
                        <div className="w-12 h-12 bg-accent rounded-full flex items-center justify-center">
                          <Plus className="h-6 w-6 text-muted-foreground" />
                        </div>
                        <p className="text-sm font-medium">
                          No items added yet
                        </p>
                        <p className="text-xs">
                          Click "Add Item" to get started
                        </p>
                      </div>
                    </div>
                  )}
                  {errors.invoice_items && (
                    <p className="text-red-500 text-sm mt-2">
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
                    ) : freeInvoiceInfo.isChecking ? (
                      "Checking..."
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


export default function LoginPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <CreateInvoice />
    </Suspense>
  );
}