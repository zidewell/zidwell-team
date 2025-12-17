"use client";

import { useState, useEffect } from "react";
import RichTextArea from "./RichTextArea";
import SignContractFileUpload from "./SignContractFileUpload";
import SignContractInput from "./SignContractInput";
import SignContractSelect from "./SignContractSelect";
import SignContractToggle from "./SignContractToggle";

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
  Link,
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
import ContractsPreview from "../previews/ContractsPreview";
import ContractSummary from "../ContractSummary";
import { Badge } from "../ui/badge";
import { Label } from "../ui/label";

// Contract Draft Type matching API response
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
};

const FormBody: React.FC = () => {
  const router = useRouter();
  const { userData } = useUserContextData();

  const inputCount = 4;
  const [isOpen, setIsOpen] = useState(false);
  const [pin, setPin] = useState(Array(inputCount).fill(""));
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
  const [showPreview, setShowPreview] = useState(false);
  
  // Form state
  const [form, setForm] = useState({
    receiverName: "",
    receiverEmail: "",
    receiverPhone: "",
    contractTitle: "",
    contractContent: "",
    ageConsent: false,
    termsConsent: false,
    status: "pending" as "pending" | "draft",
    contractId: "",
    contractType: "custom" as "custom",
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

  // Generate contract ID function
  const generateContractId = () => {
    const datePart = new Date().getFullYear();
    const randomToken = crypto
      .randomUUID()
      .replace(/-/g, "")
      .substring(0, 12)
      .toUpperCase();
    return `CTR-${datePart}-${randomToken}`;
  };

  // Initialize contract ID
  useEffect(() => {
    setForm(prev => ({ ...prev, contractId: generateContractId() }));
    setIsInitialLoad(false);
  }, []);

  // Track form changes
  useEffect(() => {
    if (!isInitialLoad && (
      form.contractTitle || 
      form.contractContent || 
      form.receiverName || 
      form.receiverEmail
    )) {
      setHasUnsavedChanges(true);
    }
  }, [
    form.contractTitle,
    form.contractContent,
    form.receiverName,
    form.receiverEmail,
    form.receiverPhone,
    form.ageConsent,
    form.termsConsent,
  ]);

  // Load drafts on component mount - show SweetAlert when drafts exist
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
      const res = await fetch(`/api/contract-drafts?userId=${userData.id}`);
      const result = await res.json();

      if (res.ok && result.drafts && result.drafts.length > 0) {
        // Store drafts for later use
        setDrafts(result.drafts);
        
        // Show SweetAlert popup when drafts are found on page load
        // Only show if form is empty (no existing content)
        if (!form.contractTitle && !form.contractContent && !form.receiverName && !form.receiverEmail) {
          setTimeout(() => {
            Swal.fire({
              title: "Drafts Found!",
              html: `You have <strong>${result.drafts.length}</strong> saved draft${result.drafts.length !== 1 ? 's' : ''}.<br><br>Would you like to load the most recent one?`,
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
                popup: 'rounded-lg',
                title: 'text-xl font-bold',
                htmlContainer: 'text-gray-600'
              }
            }).then((swalResult) => {
              if (swalResult.isConfirmed) {
                const recentDraft = result.drafts[0];
                console.log("Loading recent draft:", recentDraft);
                loadDraftIntoForm(recentDraft);
              } else if (swalResult.isDenied) {
                showDraftsList(result.drafts);
              } else if (swalResult.dismiss === Swal.DismissReason.cancel) {
                // User chose "Start Fresh" - do nothing
                console.log("User chose to start fresh");
              }
            });
          }, 1000); // 1 second delay to let page load first
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

    // Handle all possible field names for each piece of data
    const formData = {
      receiverName: draft.receiver_name || draft.signee_name || "",
      receiverEmail: draft.receiver_email || draft.signee_email || "",
      receiverPhone: draft.receiver_phone || draft.phone_number || "",
      contractTitle: draft.contract_title || "",
      contractContent: draft.contract_content || draft.contract_text || "",
      ageConsent: draft.age_consent || false,
      termsConsent: draft.terms_consent || false,
      status: draft.status as "pending" | "draft",
      contractId: draft.contract_id || draft.id || generateContractId(),
      contractType: draft.contract_type as "custom" || "custom",
    };

    setForm(formData);
    setHasUnsavedChanges(false);

    // Show success SweetAlert
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
      <strong class="text-gray-900">${draft.contract_title || "Untitled Contract"}</strong><br>
      <small class="text-gray-600">To: ${draft.receiver_name || draft.signee_name || "No recipient"}</small><br>
      <small class="text-gray-500">Created: ${new Date(draft.created_at).toLocaleDateString()}</small>
    </div>
  `
      )
      .join("");

    Swal.fire({
      title: "Select a Draft to Load",
      html: `
    <div style="text-align: left; max-height: 300px; overflow-y: auto; padding-right: 4px;">
      ${draftListHTML}
    </div>
  `,
      showConfirmButton: true,
      confirmButtonText: "Close",
      confirmButtonColor: "#C29307",
      width: 500,
      customClass: {
        popup: 'rounded-lg',
        title: 'text-xl font-bold mb-4',
        htmlContainer: 'text-gray-600'
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

  // Auto-save when leaving page
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges && (form.contractTitle.trim() || form.contractContent.trim())) {
        e.preventDefault();
        e.returnValue =
          "You have unsaved changes. Are you sure you want to leave?";
        return e.returnValue;
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [hasUnsavedChanges, form.contractTitle, form.contractContent]);

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

      // Don't save empty drafts
      if (!form.contractTitle.trim() && !form.contractContent.trim()) {
        Swal.fire({
          icon: "warning",
          title: "No Content",
          text: "Please add some content before saving as draft.",
        });
        return;
      }

      // Use existing contract ID or generate new one
      const draftContractId = form.contractId || generateContractId();

      const payload = {
        userId: userData.id,
        initiator_email: userData.email || "",
        initiator_name: userData.firstName && userData.lastName 
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
      };

      console.log("Saving draft with payload:", payload);

      const res = await fetch("/api/contract-drafts", {
        method: "PUT",
        headers: { 
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const result = await res.json();
      console.log("Save draft response:", result);

      if (!res.ok) {
        throw new Error(result.error || result.message || "Failed to save draft");
      }

      Swal.fire({
        icon: "success",
        title: "Draft Saved!",
        text: "Your contract draft has been saved successfully.",
        confirmButtonColor: "#C29307",
      });

      setHasUnsavedChanges(false);
      setForm(prev => ({ ...prev, contractId: draftContractId }));
      
      // Refresh the drafts list
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

  const validateInputs = () => {
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

  // Combined save/send function
  const handleSaveContract = async (
    isDraft: boolean = false
  ): Promise<{
    success: boolean;
    signingLink?: string;
    contractId?: string;
  }> => {
    try {
      if (!userData?.id) {
        Swal.fire({
          icon: "warning",
          title: "Unauthorized",
          text: "You must be logged in to send a contract.",
        });
        return { success: false };
      }

      const payload = {
        userId: userData.id,
        initiator_email: userData.email || "",
        initiator_name: userData.firstName && userData.lastName 
          ? `${userData.firstName} ${userData.lastName}`
          : userData.email || "",
        contract_id: form.contractId || generateContractId(),
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
      };

      const endpoint = "/api/send-contracts";
      const method = "POST";

      const res = await fetch(endpoint, {
        method: method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const result = await res.json();

      if (!res.ok) {
        console.error("API Error:", result);
        throw new Error(
          result.error || result.message || "Failed to save contract"
        );
      }

      // Delete the draft after successful submission if it existed
      if (!isDraft && userData?.id) {
        const existingDraft = drafts.find(
          (d) => d.contract_id === form.contractId
        );
        if (existingDraft) {
          await fetch(`/api/contract-drafts?id=${existingDraft.id}`, {
            method: "DELETE",
          });
          setDrafts(drafts.filter((d) => d.id !== existingDraft.id));
        }
      }

      return {
        success: true,
        signingLink: isDraft ? undefined : result.signingLink,
        contractId: payload.contract_id,
      };
    } catch (err) {
      console.error("Error in handleSaveContract:", err);
      if (!isDraft) {
        await handleRefund();
      }
      Swal.fire({
        icon: "error",
        title: `Failed to ${isDraft ? "Save Draft" : "Send Contract"}`,
        text: (err as Error)?.message || "An unexpected error occurred.",
      });
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
          amount: 10,
          description: "Contract successfully generated",
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
          amount: 10,
          description: "Refund for failed contract generation",
        }),
      });
      Swal.fire({
        icon: "info",
        title: "Refund Processed",
        text: "₦10 has been refunded to your wallet due to failed contract sending.",
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

  const processPaymentAndSubmit = async () => {
    setLoading(true);

    try {
      const paymentSuccess = await handleDeduct();

      if (paymentSuccess) {
        const result = await handleSaveContract(false);
        if (result.success) {
          setGeneratedSigningLink(result.signingLink || "");
          setSavedContractId(result.contractId || "");
          setShowSuccessModal(true);
        }
      }
    } catch (error) {
      console.error("Error in process:", error);
    } finally {
      setLoading(false);
      setIsOpen(false);
      setIsSending(false);
    }
  };

  const handleSendForSignature = () => {
    if (!validateInputs()) {
      Swal.fire({
        icon: "error",
        title: "Validation Error",
        text: "Please fill in all required fields correctly.",
        confirmButtonColor: "#C29307",
      });
      return;
    }

    setIsSending(true);
    setShowContractSummary(true);
  };

  const handleSummaryConfirm = () => {
    setShowContractSummary(false);
    setIsOpen(true);
  };

  const handleSummaryBack = () => {
    setShowContractSummary(false);
    setIsSending(false);
  };

  // Handle copy signing link
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

    // For sending the contract
    handleSendForSignature();
  };

  // Reset form
  const resetForm = () => {
    Swal.fire({
      title: "Clear Form?",
      text: "This will remove all current form data.",
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

  const handleFormChange = (field: keyof typeof form, value: any) => {
    setForm(prev => ({ ...prev, [field]: value }));
    // Clear error for this field if exists
    const errorField = field as keyof typeof errors;
    if (errors[errorField]) {
      setErrors(prev => ({ ...prev, [errorField]: "" }));
    }
  };

  const handleSelectChange = (value: string) => {
    handleFormChange("contractTitle", value);
  };

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

      <ContractSummary
        contractTitle={form.contractTitle}
        contractContent={form.contractContent}
        initiatorName={`${userData?.firstName || ""} ${userData?.lastName || ""}`}
        initiatorEmail={userData?.email || ""}
        receiverName={form.receiverName}
        receiverEmail={form.receiverEmail}
        receiverPhone={form.receiverPhone}
        amount={10}
        confirmContract={showContractSummary}
        onBack={handleSummaryBack}
        onConfirm={handleSummaryConfirm}
        contractType="Custom Contract"
        dateCreated={new Date().toLocaleDateString()}
      />

      {/* Success Modal */}
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
                Contract Created Successfully!
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
                    className="w-full border-blue-500 text-blue-500 hover:bg-blue-500 hover:text-white"
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
                className="w-full"
              >
                Create New Contract
              </Button>
            </div>

            {/* Additional Information */}
            <div className="mt-4 p-3 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-700 text-center">
                <strong>Contract ID:</strong> {savedContractId}
              </p>
              <p className="text-xs text-gray-500 text-center mt-1">
                You can find this contract in your dashboard
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="min-h-screen bg-background">
        <div className="container mx-auto py-8 px-4">
          {/* Header */}
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
                <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
                  Unsaved changes
                </Badge>
              )}
            </div>
          </div>

          <Card className="p-6 h-fit">
            {/* Contract ID Display */}
            <div className="flex justify-between items-center mb-6">
              <div className="flex items-center gap-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    // Show drafts modal
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
              <TabsList className="grid w-full grid-cols-3 mb-8">
                <TabsTrigger value="create" className="gap-2">
                  <Edit className="h-4 w-4" />
                  Write Contract
                </TabsTrigger>
                <TabsTrigger value="preview" className="gap-2">
                  <Eye className="h-4 w-4" />
                  Preview
                </TabsTrigger>
                <TabsTrigger value="upload" className="gap-2">
                  <Upload className="h-4 w-4" />
                  Upload Document
                </TabsTrigger>
              </TabsList>

              <TabsContent value="create" className="space-y-6">
                <section className="space-y-4">
                  <div className="flex justify-between items-center">
                    <h4 className="text-lg font-medium">Contract Details</h4>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowPreview(true)}
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
                        setContractTitle={(value) => handleFormChange("contractTitle", value)}
                        setContractContent={(value) => handleFormChange("contractContent", value)}
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
                        onchange={(e) => handleFormChange("receiverName", e.target.value)}
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
                        onchange={(e) => handleFormChange("receiverEmail", e.target.value)}
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
                        onchange={(e) => handleFormChange("receiverPhone", e.target.value)}
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
                      onChange={(value) => handleFormChange("contractContent", value)}
                    />
                    {errors.contractContent && (
                      <p className="text-xs text-red-500 mt-1">
                        {errors.contractContent}
                      </p>
                    )}
                  </div>
                </section>

                <section className="space-y-4">
                  <h4 className="text-lg font-medium">Consent Declarations</h4>
                  <SignContractToggle
                    ageConsent={form.ageConsent}
                    setAgeConsent={(value) => handleFormChange("ageConsent", value)}
                    setTermsConsent={(value) => handleFormChange("termsConsent", value)}
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
                      (!form.contractTitle.trim() && !form.contractContent.trim())
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
                <Card className="border-border shadow-lg">
                  <CardHeader className="bg-gradient-to-r from-gray-50 to-white">
                    <div className="flex justify-between items-center">
                      <div>
                        <CardTitle>Contract Preview</CardTitle>
                        <CardDescription>
                          Review your contract before sending
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {form.contractContent ? (
                      <div className="prose prose-sm max-w-none p-6 bg-muted/50 rounded-lg border border-border">
                        <div className="whitespace-pre-wrap font-serif leading-relaxed">
                          {form.contractContent}
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-12 text-muted-foreground">
                        <FileText className="h-16 w-16 mx-auto mb-4 opacity-50" />
                        <p className="text-lg font-medium text-gray-500">
                          No contract content to preview yet
                        </p>
                        <p className="text-sm text-gray-400 mt-2">
                          Switch to "Write Contract" tab to create your
                          contract
                        </p>
                        <Button
                          variant="outline"
                          className="mt-4"
                          onClick={() => setActiveTab("create")}
                        >
                          <Edit className="h-4 w-4 mr-2" />
                          Write Contract
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="upload">
                <Card className="border-border shadow-sm">
                  <CardHeader>
                    <CardTitle>Upload Document for Notarization</CardTitle>
                    <CardDescription>
                      Upload a PDF or DOCX file to get it notarized with our official
                      seal and signature
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <SignContractFileUpload />
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </Card>

          
        </div>
      </div>
    </>
  );
};

export default FormBody;