"use client";

import { useState, useEffect, useCallback } from "react";
import RichTextArea from "./RichTextArea";
import SignContractFileUpload from "./SignContractFileUpload";
import SignContractInput from "./SignContractInput";
import SignContractSelect from "./SignContractSelect";
import SignContractToggle from "./SignContractToggle";
import PreviewTab from "./PreviewTab";
import confetti from "canvas-confetti";
import { contractTitles } from "@/app/data/sampleContracts";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import {
  Edit,
  Eye,
  FileText,
  Save,
  Send,
  Upload,
  Loader2,
  History,
  ArrowLeft,
  Copy,
  X,
  Scale,
} from "lucide-react";
import { Button } from "../ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../ui/card";
import { useRouter } from "next/navigation";
import { useUserContextData } from "@/app/context/userData";
import Swal from "sweetalert2";
import PinPopOver from "../PinPopOver";
import ContractSummary from "./ContractSummary";
import { Badge } from "../ui/badge";
import { Label } from "../ui/label";

type ContractDraft = {
  id: string;
  contract_id?: string;
  contract_title: string;
  contract_content?: string;
  contract_text?: string;
  contract_type: string;
  receiver_name?: string;
  receiver_email?: string;
  receiver_phone?: string;
  signee_name?: string;
  signee_email?: string;
  phone_number?: string;
  age_consent: boolean;
  terms_consent: boolean;
  status: string;
  user_id: string;
  created_at: string;
  updated_at: string;
  token?: string;
  verification_code?: string | null;
  attachment_url?: string;
  attachment_name?: string;
  include_lawyer_signature?: boolean;
  creator_name?: string;
  creator_signature?: string;
  metadata?: Record<string, any>;
};

type FormState = {
  receiverName: string;
  receiverEmail: string;
  receiverPhone: string;
  contractTitle: string;
  contractContent: string;
  ageConsent: boolean;
  termsConsent: boolean;
  status: "pending" | "draft";
  contractId: string;
  contractType: "custom";
};

type AttachmentFile = {
  file: File;
  name: string;
  size: number;
  type: string;
  previewUrl?: string;
};

// Add these interfaces for response data
interface DraftsResponse {
  success: boolean;
  drafts: ContractDraft[];
  count: number;
  error?: string;
}

interface SaveContractResponse {
  success: boolean;
  signingLink?: string;
  contractId?: string;
  isUpdate?: boolean;
  error?: string;
  message?: string;
}

interface PaymentResponse {
  error?: string;
  message?: string;
}

const FormBody: React.FC = () => {
  const router = useRouter();
  const { userData } = useUserContextData();

  const inputCount = 4;
  const [isOpen, setIsOpen] = useState(false);
  const [pin, setPin] = useState<string[]>(Array(inputCount).fill(""));
  const [loading, setLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isSavingDraft, setIsSavingDraft] = useState(false);
  const [isLoadingDrafts, setIsLoadingDrafts] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [generatedSigningLink, setGeneratedSigningLink] = useState<string>("");
  const [savedContractId, setSavedContractId] = useState<string>("");
  const [showContractSummary, setShowContractSummary] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(false);

  const [attachments, setAttachments] = useState<AttachmentFile[]>([]);
  const [includeLawyerSignature, setIncludeLawyerSignature] = useState(false);
  const [totalAmount, setTotalAmount] = useState(10);
  const CONTRACT_FEE = 10;
  const LAWYER_FEE = 10000;

  const [creatorName, setCreatorName] = useState(
    userData?.firstName && userData?.lastName
      ? `${userData.firstName} ${userData.lastName}`
      : ""
  );
  const [creatorSignature, setCreatorSignature] = useState<string | null>(null);

  useEffect(() => {
    if (includeLawyerSignature) {
      setTotalAmount(CONTRACT_FEE + LAWYER_FEE);
    } else {
      setTotalAmount(CONTRACT_FEE);
    }
  }, [includeLawyerSignature]);

  const [form, setForm] = useState<FormState>({
    receiverName: "",
    receiverEmail: "",
    receiverPhone: "",
    contractTitle: "",
    contractContent: "",
    ageConsent: false,
    termsConsent: false,
    status: "pending",
    contractId: "",
    contractType: "custom",
  });

  const [drafts, setDrafts] = useState<ContractDraft[]>([]);
  const [activeTab, setActiveTab] = useState("create");

  const [errors, setErrors] = useState({
    contractTitle: "",
    receiverName: "",
    receiverEmail: "",
    contractContent: "",
    pin: "",
    ageConsent: "",
    termsConsent: "",
  });

const triggerContractConfetti = () => {
  // Main burst
  confetti({
    particleCount: 150,
    spread: 70,
    origin: { y: 0.6 },
    colors: ["#C29307", "#ffd700", "#ffed4e", "#ffffff", "#fbbf24"],
  });

  // Side bursts
  setTimeout(() => {
    confetti({
      particleCount: 80,
      angle: 60,
      spread: 55,
      origin: { x: 0 },
      colors: ["#C29307", "#ffd700", "#ffed4e"],
    });
    confetti({
      particleCount: 80,
      angle: 120,
      spread: 55,
      origin: { x: 1 },
      colors: ["#C29307", "#ffd700", "#ffed4e"],
    });
  }, 150);

  // Additional bursts for more celebration
  setTimeout(() => {
    confetti({
      particleCount: 100,
      spread: 100,
      origin: { y: 0.8 },
      colors: ["#C29307", "#ffd700", "#ffed4e"],
    });
  }, 300);
};
  const generateContractId = useCallback(() => {
    const datePart = new Date().getFullYear();
    const randomToken = crypto
      .randomUUID()
      .replace(/-/g, "")
      .substring(0, 12)
      .toUpperCase();
    return `CTR-${datePart}-${randomToken}`;
  }, []);

  useEffect(() => {
    setForm((prev) => ({ ...prev, contractId: generateContractId() }));
    setIsInitialLoad(false);
  }, [generateContractId]);

  useEffect(() => {
    if (
      !isInitialLoad &&
      (form.contractTitle ||
        form.contractContent ||
        form.receiverName ||
        form.receiverEmail ||
        form.receiverPhone ||
        form.ageConsent ||
        form.termsConsent ||
        attachments.length > 0)
    ) {
      setHasUnsavedChanges(true);
    }
  }, [
    isInitialLoad,
    form.contractTitle,
    form.contractContent,
    form.receiverName,
    form.receiverEmail,
    form.receiverPhone,
    form.ageConsent,
    form.termsConsent,
    attachments.length,
  ]);

  useEffect(() => {
    if (userData?.id) {
      loadUserDrafts();
    }
  }, [userData?.id]);

  const loadUserDrafts = async () => {
    try {
      if (!userData?.id) {
        console.log("No user data found");
        return;
      }

      setIsLoadingDrafts(true);
      const res = await fetch(`/api/contract/contract-drafts?userId=${userData.id}`);
      
      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }
      
      const result: DraftsResponse = await res.json();

      if (result.success && result.drafts && result.drafts.length > 0) {
        setDrafts(result.drafts);

        if (
          !form.contractTitle &&
          !form.contractContent &&
          !form.receiverName &&
          !form.receiverEmail &&
          attachments.length === 0
        ) {
          setTimeout(() => {
            Swal.fire({
              title: "Drafts Found!",
              html: `You have <strong>${
                result.drafts.length
              }</strong> saved draft${
                result.drafts.length !== 1 ? "s" : ""
              }.<br><br>Would you like to load the most recent one?`,
              icon: "info",
              showCancelButton: true,
              showDenyButton: true,
              confirmButtonText: "Load Recent",
              denyButtonText: "View All Drafts",
              cancelButtonText: "Start Fresh",
              confirmButtonColor: "#C29307",
              cancelButtonColor: "#6b7280",
              denyButtonColor: "#3b82f6",
              width: 500,
              customClass: {
                popup: "rounded-lg",
                title: "text-xl font-bold",
                htmlContainer: "text-gray-600",
              },
            }).then((swalResult) => {
              if (swalResult.isConfirmed) {
                const recentDraft = result.drafts[0];
                console.log("Loading recent draft:", recentDraft);
                loadDraftIntoForm(recentDraft);
              } else if (swalResult.isDenied) {
                showDraftsList(result.drafts);
              } else if (swalResult.dismiss === Swal.DismissReason.cancel) {
                console.log("User chose to start fresh");
              }
            });
          }, 1000);
        }
      } else {
        console.log("No drafts found");
      }
    } catch (error) {
      console.error("Failed to load drafts:", error);
    } finally {
      setIsLoadingDrafts(false);
    }
  };

  const loadDraftIntoForm = (draft: ContractDraft) => {
    console.log("Loading draft into form:", draft);

    // Get contract_id from metadata if available
    const draftContractId = draft.metadata?.contract_id || draft.contract_id || draft.id || generateContractId();

    const formData: FormState = {
      receiverName: draft.receiver_name || draft.signee_name || "",
      receiverEmail: draft.receiver_email || draft.signee_email || "",
      receiverPhone: draft.receiver_phone || draft.phone_number?.toString() || "",
      contractTitle: draft.contract_title || "",
      contractContent: draft.contract_content || draft.contract_text || "",
      ageConsent: draft.age_consent || false,
      termsConsent: draft.terms_consent || false,
      status: (draft.status as "pending" | "draft") || "draft",
      contractId: draftContractId, // Use the contract_id from metadata
      contractType: "custom",
    };

    setForm(formData);
    setHasUnsavedChanges(false);

    // Also set creator name and signature if available
    if (draft.creator_name) {
      setCreatorName(draft.creator_name);
    }
    if (draft.creator_signature) {
      setCreatorSignature(draft.creator_signature);
    }
    if (draft.include_lawyer_signature) {
      setIncludeLawyerSignature(draft.include_lawyer_signature);
    }

    if (draft.attachment_url || draft.attachment_name) {
      Swal.fire({
        icon: "info",
        title: "Attachment Notice",
        text: "This draft had an attachment. You'll need to re-upload the file.",
        confirmButtonColor: "#C29307",
      });
    }

    setTimeout(() => {
      Swal.fire({
        icon: "success",
        title: "Draft Loaded!",
        text: "Your draft has been loaded into the form successfully.",
        confirmButtonColor: "#C29307",
        timer: 2000,
        timerProgressBar: true,
        showConfirmButton: false,
      });
    }, 300);
  };

  const showDraftsList = (draftsList: ContractDraft[]) => {
    const draftListHTML = draftsList
      .map(
        (draft, index) => `
    <div style="padding: 12px; border-bottom: 1px solid #e5e7eb; cursor: pointer; transition: background-color 0.2s;" 
         data-draft-index="${index}"
         class="hover:bg-gray-50 rounded">
      <strong class="text-gray-900">${
        draft.contract_title || "Untitled Contract"
      }</strong><br>
      <small class="text-gray-600">To: ${
        draft.receiver_name || draft.signee_name || "No recipient"
      }</small><br>
      <small class="text-gray-500">Created: ${new Date(
        draft.created_at
      ).toLocaleDateString()}</small>
    </div>
  `
      )
      .join("");

    Swal.fire({
      title: "Select a Draft to Load",
      html: `
    <div style="text-align: left; max-height: 300px; overflow-y auto; padding-right: 4px;">
      ${draftListHTML}
    </div>
  `,
      showConfirmButton: true,
      confirmButtonText: "Close",
      confirmButtonColor: "#C29307",
      width: 500,
      customClass: {
        popup: "rounded-lg",
        title: "text-xl font-bold mb-4",
        htmlContainer: "text-gray-600",
      },
      didOpen: () => {
        const draftElements = document.querySelectorAll("[data-draft-index]");
        draftElements.forEach((element) => {
          element.addEventListener("click", () => {
            const index = parseInt(
              element.getAttribute("data-draft-index") || "0"
            );
            loadDraftIntoForm(draftsList[index]);
            Swal.close();
          });
        });
      },
    });
  };

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (
        hasUnsavedChanges &&
        (form.contractTitle.trim() ||
          form.contractContent.trim() ||
          attachments.length > 0)
      ) {
        e.preventDefault();
        e.returnValue =
          "You have unsaved changes. Are you sure you want to leave?";
        return e.returnValue;
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [
    hasUnsavedChanges,
    form.contractTitle,
    form.contractContent,
    attachments.length,
  ]);

  const handleSaveDraft = async () => {
    try {
      setIsSavingDraft(true);

      if (!userData?.id) {
        Swal.fire({
          icon: "warning",
          title: "Unauthorized",
          text: "You must be logged in to save a draft.",
        });
        return;
      }

      if (
        !form.contractTitle.trim() &&
        !form.contractContent.trim() &&
        attachments.length === 0
      ) {
        Swal.fire({
          icon: "warning",
          title: "No Content",
          text: "Please add some content before saving as draft.",
        });
        return;
      }

      const draftContractId = form.contractId || generateContractId();

      const payload = {
        userId: userData.id,
        initiator_email: userData.email || "",
        initiator_name:
          userData.firstName && userData.lastName
            ? `${userData.firstName} ${userData.lastName}`
            : userData.email || "",
        contract_id: draftContractId,
        contractTitle: form.contractTitle || "Untitled Contract",
        contractContent: form.contractContent,
        receiverName: form.receiverName,
        receiverEmail: form.receiverEmail,
        receiverPhone: form.receiverPhone,
        ageConsent: form.ageConsent,
        termsConsent: form.termsConsent,
        contract_type: "custom",
        status: "draft",
        is_draft: true,
        has_attachments: attachments.length > 0,
        attachment_count: attachments.length,
        creator_name: creatorName,
        creator_signature: creatorSignature,
      };

      console.log("Saving draft with payload:", payload);

      const res = await fetch("/api/contract/contract-drafts", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const result = await res.json();
      console.log("Save draft response:", result);

      if (!res.ok) {
        throw new Error(
          result.error || result.message || "Failed to save draft"
        );
      }

      Swal.fire({
        icon: "success",
        title: "Draft Saved!",
        text: "Your contract draft has been saved successfully.",
        confirmButtonColor: "#C29307",
      });

      setHasUnsavedChanges(false);
      setForm((prev) => ({ ...prev, contractId: draftContractId }));

      await loadUserDrafts();
    } catch (err) {
      console.error("Save draft error:", err);
      Swal.fire({
        icon: "error",
        title: "Failed to Save Draft",
        text: (err as Error)?.message || "An unexpected error occurred.",
      });
    } finally {
      setIsSavingDraft(false);
    }
  };

const validateFormFields = (): boolean => {
  const newErrors = {
    contractTitle: "",
    receiverName: "",
    receiverEmail: "",
    contractContent: "",
    pin: "",
    ageConsent: "",
    termsConsent: "",
  };

  let hasErrors = false;

  if (!form.contractTitle.trim()) {
    newErrors.contractTitle = "Contract title is required.";
    hasErrors = true;
  }

  if (!form.receiverName.trim()) {
    newErrors.receiverName = "Signer full name is required.";
    hasErrors = true;
  }

  if (!form.receiverEmail.trim()) {
    newErrors.receiverEmail = "Signee email is required.";
    hasErrors = true;
  } else if (form.receiverEmail.trim() === userData?.email) {
    newErrors.receiverEmail =
      "Sorry, the signee email address cannot be the same as the initiator's email address.";
    hasErrors = true;
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.receiverEmail)) {
    newErrors.receiverEmail = "Invalid email format.";
    hasErrors = true;
  }

  if (!form.contractContent.trim()) {
    newErrors.contractContent = "Contract content cannot be empty.";
    hasErrors = true;
  }

  if (!form.ageConsent) {
    newErrors.ageConsent = "You must confirm you are 18 years or older.";
    hasErrors = true;
  }

  if (!form.termsConsent) {
    newErrors.termsConsent = "You must agree to the contract terms.";
    hasErrors = true;
  }

  setErrors(newErrors);
  return !hasErrors;
};

const validateSignature = (): boolean => {
  if (!creatorSignature) {
    Swal.fire({
      icon: "warning",
      title: "Signature Required",
      html: `Please add your signature in the <strong>Preview tab</strong> before submitting.`,
      confirmButtonColor: "#C29307",
      showCancelButton: true,
      cancelButtonText: "Cancel",
      confirmButtonText: "Go to Preview",
    }).then((result) => {
      if (result.isConfirmed) {
        setActiveTab("preview");
      }
    });
    return false;
  }

  if (!creatorName.trim()) {
    Swal.fire({
      icon: "warning",
      title: "Name Required",
      text: "Please enter your full legal name in the Preview tab signature section.",
      confirmButtonColor: "#C29307",
    }).then(() => {
      setActiveTab("preview");
    });
    return false;
  }

  return true;
};

const validateInputs = (): boolean => {
  // First validate form fields
  const formValid = validateFormFields();
  
  if (!formValid) {
    // Show form field errors in SweetAlert
    const errorMessages = [];
    if (errors.contractTitle) errorMessages.push(errors.contractTitle);
    if (errors.receiverName) errorMessages.push(errors.receiverName);
    if (errors.receiverEmail) errorMessages.push(errors.receiverEmail);
    if (errors.contractContent) errorMessages.push(errors.contractContent);
    if (errors.ageConsent) errorMessages.push(errors.ageConsent);
    if (errors.termsConsent) errorMessages.push(errors.termsConsent);

    if (errorMessages.length > 0) {
      Swal.fire({
        icon: "error",
        title: "Please fix the following errors:",
        html: errorMessages.map(msg => `• ${msg}`).join('<br>'),
        confirmButtonColor: "#C29307",
      });
    }
    
    return false;
  }

  // Then validate signature
  return validateSignature();
};

  const uploadAttachmentFiles = async (): Promise<
    Array<{
      url: string;
      path: string;
      name: string;
      type: string;
      size: number;
    }>
  > => {
    if (attachments.length === 0 || !userData?.id) return [];

    const uploadedFiles = [];
    setUploadingFile(true);

    try {
      for (const attachment of attachments) {
        const formData = new FormData();
        formData.append("file", attachment.file);
        formData.append("userId", userData.id);
        formData.append("contractId", form.contractId);

        const res = await fetch("/api/contract/send-contracts/upload-contract-file", {
          method: "POST",
          body: formData,
        });

        const result = await res.json();

        if (!res.ok) {
          throw new Error(
            result.error || `Failed to upload: ${attachment.name}`
          );
        }

        uploadedFiles.push({
          url: result.fileUrl,
          path: result.filePath,
          name: attachment.name,
          type: attachment.type,
          size: attachment.size,
        });
      }

      return uploadedFiles;
    } catch (err) {
      Swal.fire("Upload Failed", (err as Error).message, "error");
      return [];
    } finally {
      setUploadingFile(false);
    }
  };

  const handleSaveContract = async (
    isDraft: boolean = false
  ): Promise<SaveContractResponse> => {
    try {
      if (!userData?.id) {
        Swal.fire("Unauthorized", "You must be logged in", "warning");
        return { success: false };
      }

      const attachmentsData = isDraft ? [] : await uploadAttachmentFiles();

      // Make sure contractId is included
      const contractIdToUse = form.contractId || generateContractId();

      const payload = {
        userId: userData.id,
        initiator_email: userData.email || "",
        initiator_name:
          userData.firstName && userData.lastName
            ? `${userData.firstName} ${userData.lastName}`
            : userData.email || "",
        contract_id: contractIdToUse, 
        contract_title: form.contractTitle,
        contract_content: form.contractContent,
        receiver_name: form.receiverName,
        receiver_email: form.receiverEmail,
        receiver_phone: form.receiverPhone,
        age_consent: form.ageConsent,
        terms_consent: form.termsConsent,
        contract_type: "custom",
        status: isDraft ? "draft" : "pending",
        is_draft: isDraft,
        include_lawyer_signature: includeLawyerSignature,
        creator_name: creatorName,
        creator_signature: creatorSignature,
        metadata: {
          attachments: attachmentsData,
          attachment_count: attachments.length,
          lawyer_signature: includeLawyerSignature,
          base_fee: CONTRACT_FEE,
          lawyer_fee: includeLawyerSignature ? LAWYER_FEE : 0,
          total_fee: totalAmount,
          creator_name: creatorName,
          creator_signature: creatorSignature,
        },
      };

      const res = await fetch("/api/contract/send-contracts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const result: SaveContractResponse = await res.json();

      if (!res.ok) {
        throw new Error(result.error || "Failed to save contract");
      }

      if (!isDraft && result.isUpdate) {
        await loadUserDrafts(); 
      }

      return {
        success: true,
        signingLink: isDraft ? undefined : result.signingLink,
        contractId: payload.contract_id,
      };
    } catch (err) {
      if (!isDraft) await handleRefund();

      Swal.fire(
        "Error",
        (err as Error)?.message || "Something went wrong",
        "error"
      );

      return { success: false };
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
          amount: totalAmount,
          description: includeLawyerSignature
            ? "Contract with lawyer signature successfully generated"
            : "Contract successfully generated",
          service: "contract",
          include_lawyer_signature: includeLawyerSignature,
        }),
      })
        .then(async (res) => {
          const data: PaymentResponse = await res.json();
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
      const res = await fetch("/api/refund-service", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: userData?.id,
          amount: totalAmount,
          description: includeLawyerSignature
            ? "Refund for failed contract generation with lawyer signature"
            : "Refund for failed contract generation",
        }),
      });

      const data: PaymentResponse = await res.json();
      
      if (res.ok) {
        Swal.fire({
          icon: "info",
          title: "Refund Processed",
          text: includeLawyerSignature
            ? `₦${totalAmount.toLocaleString()} has been refunded to your wallet due to failed contract sending.`
            : "₦10 has been refunded to your wallet due to failed contract sending.",
        });
      } else {
        throw new Error(data.error || "Refund failed");
      }
    } catch (err) {
      console.error("Refund failed:", err);
      Swal.fire({
        icon: "warning",
        title: "Refund Failed",
        text: "Payment deduction was made, but refund failed. Please contact support.",
      });
    }
  };

const processPaymentAndSubmit = async () => {
  setLoading(true);
  setIsOpen(false);

  try {
    const paymentSuccess = await handleDeduct();

    if (paymentSuccess) {
      const result = await handleSaveContract(false);
      if (result.success) {
        setGeneratedSigningLink(result.signingLink || "");
        setSavedContractId(result.contractId || "");
        
        // Trigger confetti when showing success modal
        triggerContractConfetti();
        
        // Add a small delay for better UX
        setTimeout(() => {
          setShowSuccessModal(true);
        }, 300);
        
        setIncludeLawyerSignature(false);
        setCreatorSignature(null);

        // Reset form
        setForm({
          receiverName: "",
          receiverEmail: "",
          receiverPhone: "",
          contractTitle: "",
          contractContent: "",
          ageConsent: false,
          termsConsent: false,
          status: "pending",
          contractId: generateContractId(),
          contractType: "custom",
        });
        setAttachments([]);
        setHasUnsavedChanges(false);
      } else {
        await handleRefund();
      }
    }
  } catch (error) {
    console.error("Error in process:", error);
    Swal.fire({
      icon: "error",
      title: "Processing Failed",
      text: "Failed to process payment. Please try again.",
      confirmButtonColor: "#C29307",
    });
  } finally {
    setLoading(false);
    setIsSending(false);
    // Reset PIN
    setPin(Array(inputCount).fill(""));
  }
};

  const handleSendForSignature = () => {
  if (!validateInputs()) {
    return;
  }

  setIsSending(true);
  setShowContractSummary(true);
};
  const handleSummaryConfirm = (options?: {
    includeLawyerSignature: boolean;
  }) => {
    setShowContractSummary(false);
    if (options?.includeLawyerSignature !== undefined) {
      setIncludeLawyerSignature(options.includeLawyerSignature);
    }
    setIsOpen(true);
    setIsSending(false);
  };

  const handleSummaryBack = () => {
    setShowContractSummary(false);
    setIsSending(false);
    setLoading(false);
  };

  const handleCopySigningLink = () => {
    if (generatedSigningLink) {
      navigator.clipboard.writeText(generatedSigningLink);
      Swal.fire({
        icon: "success",
        title: "Contract Link Copied!",
        text: "Contract link copied to clipboard",
        confirmButtonColor: "#C29307",
        timer: 2000,
        timerProgressBar: true,
        showConfirmButton: false,
      });
    }
  };

  const handleSubmit = async (isDraft: boolean = false) => {
    if (isDraft) {
      await handleSaveDraft();
      return;
    }

    handleSendForSignature();
  };

  const resetForm = () => {
    Swal.fire({
      title: "Clear Form?",
      text: "This will remove all current form data, including uploaded attachments.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#C29307",
      cancelButtonColor: "#6b7280",
      confirmButtonText: "Clear",
      cancelButtonText: "Cancel",
    }).then((result) => {
      if (result.isConfirmed) {
        setForm({
          receiverName: "",
          receiverEmail: "",
          receiverPhone: "",
          contractTitle: "",
          contractContent: "",
          ageConsent: false,
          termsConsent: false,
          status: "pending",
          contractId: generateContractId(),
          contractType: "custom",
        });
        setAttachments([]);
        setIncludeLawyerSignature(false);
        setCreatorSignature(null);
        setHasUnsavedChanges(false);
        setErrors({
          contractTitle: "",
          receiverName: "",
          receiverEmail: "",
          contractContent: "",
          pin: "",
          ageConsent: "",
          termsConsent: "",
        });

        Swal.fire({
          icon: "success",
          title: "Form Reset",
          text: "Form has been cleared successfully.",
          confirmButtonColor: "#C29307",
          timer: 1500,
          showConfirmButton: false,
        });
      }
    });
  };

  const handleFormChange = (field: keyof FormState, value: any) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    const errorField = field as keyof typeof errors;
    if (errors[errorField]) {
      setErrors((prev) => ({ ...prev, [errorField]: "" }));
    }
  };

  const handleSelectChange = (value: string) => {
    handleFormChange("contractTitle", value);
  };

  const handleFileUpload = (file: File) => {
    let previewUrl: string | undefined;
    if (file.type.startsWith("image/")) {
      previewUrl = URL.createObjectURL(file);
    }

    const newAttachment: AttachmentFile = {
      file,
      name: file.name,
      size: file.size,
      type: file.type,
      previewUrl,
    };

    setAttachments((prev) => [...prev, newAttachment]);
    setHasUnsavedChanges(true);

    Swal.fire({
      icon: "success",
      title: "File Added!",
      text: `${file.name} has been added as an attachment.`,
      confirmButtonColor: "#C29307",
      timer: 1500,
      showConfirmButton: false,
    });
  };

  const handleRemoveAttachment = (index: number) => {
    const attachmentToRemove = attachments[index];

    if (attachmentToRemove.previewUrl) {
      URL.revokeObjectURL(attachmentToRemove.previewUrl);
    }

    setAttachments((prev) => prev.filter((_, i) => i !== index));
    setHasUnsavedChanges(true);
  };

  useEffect(() => {
    return () => {
      attachments.forEach((attachment) => {
        if (attachment.previewUrl) {
          URL.revokeObjectURL(attachment.previewUrl);
        }
      });
    };
  }, [attachments]);

  return (
    <>
      {isOpen && !showContractSummary && !showSuccessModal && (
        <PinPopOver
          setIsOpen={(newValue) => {
            setIsOpen(newValue);
            // When PinPopOver closes, reset isSending
            if (!newValue) {
              setIsSending(false);
            }
          }}
          isOpen={isOpen}
          pin={pin}
          setPin={setPin}
          inputCount={inputCount}
          onConfirm={() => {
            const pinString = pin.join("");
            processPaymentAndSubmit(); // This already handles the PIN internally
          }}
        />
      )}

      <ContractSummary
        contractTitle={form.contractTitle}
        contractContent={form.contractContent}
        initiatorName={`${userData?.firstName || ""} ${
          userData?.lastName || ""
        }`}
        initiatorEmail={userData?.email || ""}
        receiverName={form.receiverName}
        receiverEmail={form.receiverEmail}
        receiverPhone={form.receiverPhone}
        amount={CONTRACT_FEE}
        confirmContract={showContractSummary}
        onBack={handleSummaryBack}
        onConfirm={handleSummaryConfirm}
        contractType="Custom Contract"
        dateCreated={new Date().toLocaleDateString()}
        attachments={attachments}
        currentLawyerSignature={includeLawyerSignature}
      />

     {showSuccessModal && (
  <div className="fixed inset-0 bg-white/10 backdrop-blur-sm flex items-center justify-center z-50">
    <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 shadow-lg max-h-[90vh] overflow-y-auto">
      <div className="text-center mb-6">
        {/* Animated confetti icon */}
        <div className="w-16 h-16 bg-gradient-to-br from-[#F9F4E5] to-[#ffed4e] rounded-full flex items-center justify-center mx-auto mb-4 animate-bounce">
          <svg
            className="w-8 h-8 text-[#C29307]"
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
          Contract Created Successfully! 🎉
        </h3>
        <p className="text-gray-600">
          Your contract has been generated and is ready to share.
        </p>
      </div>

      <div className="space-y-3">
        {generatedSigningLink && (
          <div className="space-y-2">
            <Button
              onClick={handleCopySigningLink}
              variant="outline"
              className="w-full border-[#C29307] text-[#C29307] hover:bg-[#C29307] hover:text-white transition-all duration-200 hover:scale-[1.02]"
            >
              <Copy className="w-4 h-4 mr-2" />
              Copy Contract Link
            </Button>
            <div className="text-xs text-gray-500 text-center">
              Share this contract link with the recipient to sign
            </div>
          </div>
        )}

        <Button
          onClick={() => {
            setShowSuccessModal(false);
            window.location.reload();
          }}
          variant="outline"
          className="w-full hover:bg-gray-50 transition-colors duration-200"
        >
          Create New Contract
        </Button>
      </div>

      <div className="mt-4 p-3 bg-gradient-to-r from-gray-50 to-[#F9F4E5]/30 rounded-lg border border-gray-100">
        <p className="text-sm text-gray-700 text-center">
          <strong>Contract ID:</strong> {savedContractId}
        </p>
        {attachments.length > 0 && (
          <p className="text-sm text-gray-700 text-center mt-1">
            <strong>Attachments:</strong> {attachments.length} file(s) included
          </p>
        )}
        {includeLawyerSignature && (
          <p className="text-sm text-gray-700 text-center mt-1">
            <strong>Lawyer Signature:</strong> Included ✓
          </p>
        )}
        {creatorSignature && (
          <p className="text-sm text-gray-700 text-center mt-1">
            <strong>Your Signature:</strong> Applied ✓
          </p>
        )}
        <p className="text-xs text-gray-500 text-center mt-1">
          You can find this contract in your dashboard
        </p>
      </div>
    </div>
  </div>
)}

      <div className="min-h-screen bg-background">
        <div className="container mx-auto py-8 px-4">
          <div className="flex items-start justify-between mb-6">
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

              <div>
                <h1 className="md:text-3xl text-xl font-bold mb-2">
                  Create Contract
                </h1>
                <p className="text-muted-foreground">
                  Generate a professional contract and send for signatures
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {hasUnsavedChanges && (
                <Badge
                  variant="outline"
                  className="bg-yellow-50 text-yellow-700 border-yellow-200"
                >
                  Unsaved changes
                </Badge>
              )}
              {attachments.length > 0 && (
                <Badge
                  variant="outline"
                  className="bg-blue-50 text-blue-700 border-blue-200"
                >
                  <FileText className="w-3 h-3 mr-1" />
                  {attachments.length} attachment(s)
                </Badge>
              )}
              {includeLawyerSignature && (
                <Badge
                  variant="outline"
                  className="bg-purple-50 text-purple-700 border-purple-200"
                >
                  <Scale className="w-3 h-3 mr-1" />
                  Lawyer Signature
                </Badge>
              )}
              {creatorSignature && (
                <Badge
                  variant="outline"
                  className="bg-green-50 text-green-700 border-green-200"
                >
                  ✓ Signed
                </Badge>
              )}
            </div>
          </div>

          <Card className="p-6 h-fit">
            <div className="flex justify-between items-center mb-6">
              <div className="flex items-center gap-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    if (drafts.length > 0) {
                      showDraftsList(drafts);
                    } else {
                      Swal.fire({
                        icon: "info",
                        title: "No Drafts",
                        text: "You don't have any saved drafts.",
                        confirmButtonColor: "#C29307",
                      });
                    }
                  }}
                  className="border-blue-300 text-blue-700 hover:bg-blue-50"
                >
                  <History className="h-4 w-4 mr-2" />
                  View Drafts ({drafts.length})
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={resetForm}
                  className="text-gray-600 hover:text-gray-900"
                >
                  Clear Form
                </Button>
              </div>
              <div className="text-sm text-gray-500">
                Contract ID: {form.contractId}
              </div>
            </div>

            <Tabs
              value={activeTab}
              onValueChange={setActiveTab}
              className="w-full"
            >
              <TabsList className="grid w-full grid-cols-2 mb-8">
                <TabsTrigger value="create" className="gap-2">
                  <Edit className="h-4 w-4" />
                  Write Contract
                </TabsTrigger>
                <TabsTrigger value="preview" className="gap-2">
                  <Eye className="h-4 w-4" />
                  Preview
                </TabsTrigger>
                {/* <TabsTrigger value="upload" className="gap-2">
                  <Upload className="h-4 w-4" />
                  Add Attachments
                </TabsTrigger> */}
              </TabsList>

              <TabsContent value="create" className="space-y-6">
                <section className="space-y-4">
                  <div className="flex justify-between items-center">
                    <h4 className="text-lg font-medium">Contract Details</h4>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setActiveTab("preview")}
                      disabled={!form.contractContent}
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      Preview
                    </Button>
                  </div>

                  <div className="flex flex-col gap-3">
                    <div className="flex items-end">
                      <div className="w-full">
                        <Label className="block text-xs font-medium text-gray-600 mb-2">
                          Template <span className="text-red-500">*</span>
                        </Label>
                        <Select
                          value={form.contractTitle}
                          onValueChange={handleSelectChange}
                        >
                          <SelectTrigger className="h-11">
                            <SelectValue placeholder="Select or type a contract title" />
                          </SelectTrigger>
                          <SelectContent>
                            {contractTitles.map((title) => (
                              <SelectItem key={title} value={title}>
                                {title}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {errors.contractTitle && (
                          <p className="text-xs text-red-500 mt-1">
                            {errors.contractTitle}
                          </p>
                        )}
                      </div>
                    </div>
                    <div>
                      <Label className="block text-xs font-medium text-gray-600 mb-2">
                        Contract Title <span className="text-red-500">*</span>
                      </Label>
                      <SignContractSelect
                        setContractTitle={(value) =>
                          handleFormChange("contractTitle", value)
                        }
                        setContractContent={(value) =>
                          handleFormChange("contractContent", value)
                        }
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <SignContractInput
                        label="Signer Full Name*"
                        placeholder="John Doe"
                        id={"receiver-name"}
                        value={form.receiverName}
                        onchange={(e) =>
                          handleFormChange("receiverName", e.target.value)
                        }
                      />
                      {errors.receiverName && (
                        <p className="text-xs text-red-500 mt-1">
                          {errors.receiverName}
                        </p>
                      )}
                    </div>
                    <div>
                      <SignContractInput
                        label="Email Address*"
                        placeholder="john@example.com"
                        id={"receiver-email"}
                        value={form.receiverEmail}
                        onchange={(e) =>
                          handleFormChange("receiverEmail", e.target.value)
                        }
                      />
                      {errors.receiverEmail && (
                        <p className="text-xs text-red-500 mt-1">
                          {errors.receiverEmail}
                        </p>
                      )}
                    </div>
                    <div>
                      <SignContractInput
                        label="Phone Number (Optional)"
                        placeholder="+234 000 000 0000"
                        id={"receiver-phone"}
                        value={form.receiverPhone}
                        onchange={(e) =>
                          handleFormChange("receiverPhone", e.target.value)
                        }
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <Label className="block text-xs font-medium text-gray-600">
                        Contract Content <span className="text-red-500">*</span>
                      </Label>
                      <span className="text-xs text-gray-500">
                        {form.contractContent.length} characters
                      </span>
                    </div>
                    <RichTextArea
                      value={form.contractContent}
                      onChange={(value) =>
                        handleFormChange("contractContent", value)
                      }
                    />
                    {errors.contractContent && (
                      <p className="text-xs text-red-500 mt-1">
                        {errors.contractContent}
                      </p>
                    )}
                  </div>

                  {attachments.length > 0 && (
                    <div className="mt-6 pt-6 border-t">
                      <h4 className="text-lg font-medium mb-4">
                        Attachments ({attachments.length})
                      </h4>
                      <div className="space-y-3">
                        {attachments.map((attachment, index) => (
                          <div
                            key={index}
                            className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50"
                          >
                            <div className="flex items-center">
                              <FileText className="h-5 w-5 text-gray-500 mr-3" />
                              <div>
                                <p className="text-sm font-medium text-gray-900">
                                  {attachment.name}
                                </p>
                                <p className="text-xs text-gray-500">
                                  {(attachment.size / 1024).toFixed(2)} KB •{" "}
                                  {attachment.type}
                                </p>
                              </div>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleRemoveAttachment(index)}
                              className="text-red-600 hover:text-red-800 hover:bg-red-50"
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        ))}
                      </div>
                      <p className="text-xs text-gray-500 mt-2">
                        These files will be attached to your contract submission
                      </p>
                    </div>
                  )}
                </section>

                <section className="space-y-4">
                  <h4 className="text-lg font-medium">Consent Declarations</h4>
                  <SignContractToggle
                    ageConsent={form.ageConsent}
                    setAgeConsent={(value) =>
                      handleFormChange("ageConsent", value)
                    }
                    setTermsConsent={(value) =>
                      handleFormChange("termsConsent", value)
                    }
                    termsConsent={form.termsConsent}
                  />
                  <div className="space-y-2">
                    {errors.ageConsent && (
                      <p className="text-xs text-red-500">
                        {errors.ageConsent}
                      </p>
                    )}
                    {errors.termsConsent && (
                      <p className="text-xs text-red-500">
                        {errors.termsConsent}
                      </p>
                    )}
                  </div>
                </section>

                <div className="flex gap-3 pt-4 border-t">
                  <Button
                    onClick={() => handleSubmit(true)}
                    variant="outline"
                    size="lg"
                    className="flex-1 hover:bg-blue-50"
                    disabled={
                      isSending ||
                      loading ||
                      isSavingDraft ||
                      (!form.contractTitle.trim() &&
                        !form.contractContent.trim())
                    }
                  >
                    {isSavingDraft ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save className="mr-2 h-4 w-4" />
                        Save Draft
                      </>
                    )}
                  </Button>
                  <Button
                    onClick={() => handleSubmit(false)}
                    size="lg"
                    className="flex-1 bg-[#C29307] text-white hover:bg-[#b38606]"
                    disabled={isSending || loading || isSavingDraft}
                  >
                    {isSending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      <>
                        <Send className="mr-2 h-4 w-4" />
                        Send for Signature
                      </>
                    )}
                  </Button>
                </div>
              </TabsContent>

              <TabsContent value="preview">
                <PreviewTab
                  contractTitle={form.contractTitle}
                  contractContent={form.contractContent}
                  receiverName={form.receiverName}
                  receiverEmail={form.receiverEmail}
                  receiverPhone={form.receiverPhone}
                  attachments={attachments}
                  setActiveTab={setActiveTab}
                  includeLawyerSignature={includeLawyerSignature}
                  onIncludeLawyerChange={setIncludeLawyerSignature}
                  creatorName={creatorName}
                  onCreatorNameChange={setCreatorName}
                  creatorSignature={creatorSignature}
                  onSignatureChange={setCreatorSignature}
                />
              </TabsContent>

              {/* <TabsContent value="upload">
                <Card className="border-border shadow-sm">
                  <CardHeader>
                    <CardTitle>Add Attachments</CardTitle>
                    <CardDescription>
                      Upload supporting documents, images, or other files to
                      attach to your contract
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-6">
                      <SignContractFileUpload onFileSelect={handleFileUpload} />

                      {attachments.length > 0 && (
                        <div className="mt-6">
                          <h4 className="text-lg font-medium mb-4">
                            Current Attachments ({attachments.length})
                          </h4>
                          <div className="space-y-3">
                            {attachments.map((attachment, index) => (
                              <div
                                key={index}
                                className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50"
                              >
                                <div className="flex items-center">
                                  {attachment.previewUrl ? (
                                    <div className="relative h-10 w-10 mr-3">
                                      <img
                                        src={attachment.previewUrl}
                                        alt={attachment.name}
                                        className="h-10 w-10 object-cover rounded border"
                                      />
                                    </div>
                                  ) : (
                                    <FileText className="h-5 w-5 text-gray-500 mr-3" />
                                  )}
                                  <div>
                                    <p className="text-sm font-medium text-gray-900">
                                      {attachment.name}
                                    </p>
                                    <p className="text-xs text-gray-500">
                                      {(attachment.size / 1024).toFixed(2)} KB •{" "}
                                      {attachment.type}
                                    </p>
                                  </div>
                                </div>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleRemoveAttachment(index)}
                                  className="text-red-600 hover:text-red-800 hover:bg-red-50"
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              </div>
                            ))}
                          </div>
                          <div className="mt-4 flex gap-2">
                            <Button
                              variant="outline"
                              onClick={() => setActiveTab("create")}
                            >
                              <Edit className="h-4 w-4 mr-2" />
                              Continue Writing Contract
                            </Button>
                            <Button
                              variant="outline"
                              onClick={() => setActiveTab("preview")}
                            >
                              <Eye className="h-4 w-4 mr-2" />
                              Preview Contract
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent> */}
            </Tabs>
          </Card>
        </div>
      </div>
    </>
  );
};

export default FormBody;