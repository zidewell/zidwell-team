// Shared types to avoid duplicates
export type InvoiceItem = {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
};

export interface InvoiceForm {
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
export interface Draft {
  id: string;
  business_name: string;
  invoice_id: string;
  created_at: string;
  total_amount: number;
  client_name?: string;
  client_email?: string;
}

export interface DraftsModalProps {
  isOpen: boolean;
  onClose: () => void;
  drafts: Draft[];
  onLoadDraft: (draft: Draft) => void;
  onViewAll?: () => void;
  onStartFresh: () => void;
}

export interface CreateInvoiceProps {
  onInvoiceCreated?: () => void;
}

export interface FreeInvoiceInfo {
  freeInvoicesLeft: number;
  totalInvoicesCreated: number;
  hasFreeInvoices: boolean;
  isChecking: boolean;
}