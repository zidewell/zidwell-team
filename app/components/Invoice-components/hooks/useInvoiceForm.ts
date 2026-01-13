import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useUserContextData } from "@/app/context/userData"; 
import { InvoiceForm, FreeInvoiceInfo } from "../types";
import { generateInvoiceId, generateItemId, calculateTotals } from "../utils/invoiceUtils";
import { showCustomNotification } from "../utils/notification";

export const useInvoiceForm = (onInvoiceCreated?: () => void) => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { userData } = useUserContextData();

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

  const [freeInvoiceInfo, setFreeInvoiceInfo] = useState<FreeInvoiceInfo>({
    freeInvoicesLeft: 0,
    totalInvoicesCreated: 0,
    hasFreeInvoices: false,
    isChecking: true,
  });

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

  // Check free invoice status
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
              freeInvoicesLeft: data.freeInvoicesLeft ?? 0,
              totalInvoicesCreated: data.totalInvoicesCreated ?? 0,
              hasFreeInvoices: data.hasFreeInvoices ?? false,
              isChecking: false,
            });
          } else {
            setFreeInvoiceInfo({
              freeInvoicesLeft: 0,
              totalInvoicesCreated: 0,
              hasFreeInvoices: false,
              isChecking: false,
            });
          }
        } catch (error) {
          console.error("Error checking invoice status:", error);
          setFreeInvoiceInfo({
            freeInvoicesLeft: 0,
            totalInvoicesCreated: 0,
            hasFreeInvoices: false,
            isChecking: false,
          });
        }
      } else {
        setFreeInvoiceInfo({
          freeInvoicesLeft: 0,
          totalInvoicesCreated: 0,
          hasFreeInvoices: false,
          isChecking: false,
        });
      }
    };

    checkInvoiceStatus();
  }, [userData?.id]);

  const handleItemSubmit = (item: any) => {
    const itemWithId = {
      ...item,
      id: generateItemId(),
    };

    if (item.id) {
      // Update existing item
      setForm((prev) => ({
        ...prev,
        invoice_items: prev.invoice_items.map((i) =>
          i.id === item.id ? itemWithId : i
        ),
      }));
    } else {
      // Add new item
      setForm((prev) => ({
        ...prev,
        invoice_items: [...prev.invoice_items, itemWithId],
      }));
    }
  };

  const removeItem = (id: string) => {
    const updatedItems = form.invoice_items.filter((item) => item.id !== id);
    setForm((prev) => ({
      ...prev,
      invoice_items: updatedItems,
    }));

    showCustomNotification({
      type: "success",
      title: "Item Removed!",
      message: "Item has been removed from the invoice.",
    });
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

    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  return {
    form,
    setForm,
    freeInvoiceInfo,
    handleItemSubmit,
    removeItem,
    validateInvoiceForm,
    handleChange,
    calculateTotals: () => calculateTotals(form.invoice_items, form.fee_option),
  };
};