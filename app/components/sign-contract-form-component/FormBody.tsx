import { useState } from "react"
import RichTextArea from "./RichTextArea"
import SignContractFileUpload from "./SignContractFileUpload"
import SignContractInput from "./SignContractInput"
import SignContractSelect from "./SignContractSelect"
import SignContractToggle from "./SignContractToggle"

import { contractTitles } from "@/app/data/sampleContracts"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs"
import { Edit, Eye, FileText, Save, Send, Upload } from "lucide-react"
import { Button } from "../ui/button"
import { toast } from "sonner"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card"
import { useRouter } from "next/navigation"
import { useUserContextData } from "@/app/context/userData"
import Swal from "sweetalert2"
import PinPopOver from "../PinPopOver"
import ContractsPreview from "../previews/ContractsPreview"
import ContractSummary from "../ContractSummary"
const FormBody: React.FC = () => {
    const router = useRouter();
    const { userData } = useUserContextData();


    const inputCount = 4;
    const [isOpen, setIsOpen] = useState(false);
    const [receiverName, setReceiverName] = useState("");
    const [receiverEmail, setReceiverEmail] = useState("");
    const [receiverPhone, setReceiverPhone] = useState("");
    const [activeTab, setActiveTab] = useState("create");
    const [contractTitle, setContractTitle] = useState("");
    const [contractContent, setContractContent] = useState("");
    const [ageConsent, setAgeConsent] = useState(false);
    const [termsConsent, setTermsConsent] = useState(false);
    const [pin, setPin] = useState(Array(inputCount).fill(""));
    const [loading, setLoading] = useState(false);
    const [showContractSummary, setShowContractSummary] = useState(false);
    const [showPreview, setShowPreview] = useState(false);
    const handleSaveDraft = () => {
        toast.success("Contract saved to drafts");
    };

    const [errors, setErrors] = useState({
        contractTitle: "",
        receiverName: "",
        receiverEmail: "",
        contractContent: "",
        pin: "",
        ageConsent: "",
        termsConsent: "",
    });

     const form = {
    isOpen: showPreview,
    contract: {
      contract_title: contractTitle,
      contract_text: contractContent,
      description: "",
    },
    onClose: () => setShowPreview(false),
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

    if (!contractTitle.trim())
        newErrors.contractTitle = "Contract title is required.";

    if (!receiverName.trim())
        newErrors.receiverName = "Signer full name is required.";

    if (!receiverEmail.trim()) {
        newErrors.receiverEmail = "Signee email is required.";
    } else if (receiverEmail.trim() === userData?.email) {
        newErrors.receiverEmail =
            "Sorry, the signee email address cannot be the same as the initiator's email address.";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(receiverEmail)) {
        newErrors.receiverEmail = "Invalid email format.";
    }

    if (!contractContent.trim())
        newErrors.contractContent = "Contract content cannot be empty.";

    if (!ageConsent)
        newErrors.ageConsent = "You must confirm you are 18 years or older.";

    if (!termsConsent)
        newErrors.termsConsent = "You must agree to the contract terms.";

    setErrors(newErrors);

    return !Object.values(newErrors).some((error) => error);
};


    const handleSubmit = async () => {
        try {
            const res = await fetch("/api/send-contracts", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    receiverEmail,
                    receiverName,
                    receiverPhone,
                    contractText: contractContent,
                    initiatorEmail: userData?.email,
                    initiatorName: `${userData?.firstName} ${userData?.lastName}`,
                    contractTitle,
                    contractContent,
                    status,
                    userId: userData?.id,
                }),
            });

            const result = await res.json();
            if (res.ok) {
                Swal.fire({
                    icon: "success",
                    title: "Success!",
                    text: "Contract sent for signature successfully!",
                }).then(() => {
                    router.refresh();
                });
                return true;
            } else {
                await handleRefund();
                Swal.fire({
                    icon: "error",
                    title: "Failed to send",
                    text: result.message || "Unknown error",
                });
                return false;
            }
        } catch (err) {
            console.error(err);
            await handleRefund();
            Swal.fire({
                icon: "error",
                title: "Error",
                text: "An error occurred while sending the contract.",
            });
            return false;
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
                    amount: 20,
                    description: "Contract successfully generated",
                }),
            })
                .then(async (res) => {
                    const data = await res.json();
                    if (!res.ok) {
                        Swal.fire(
                            "Error",
                            data.error || "Something went wrong",
                            "error"
                        );
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
                    amount: 20,
                    description: "Refund for failed contract generation",
                }),
            });
            Swal.fire({
                icon: "info",
                title: "Refund Processed",
                text: "₦20 has been refunded to your wallet due to failed contract sending.",
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
            // First process payment
            const paymentSuccess = await handleDeduct();

            if (paymentSuccess) {
                // If payment successful, send contract
                await handleSubmit();
            }
        } catch (error) {
            console.error("Error in process:", error);
        } finally {
            setLoading(false);
            setIsOpen(false)
        }
    };

    const handleSendForSignature = () => {
        if (!validateInputs()) {
            Swal.fire({
                icon: "error",
                title: "Validation Failed",
                text: "Please correct the errors before sending the contract.",
            });
            return;
        }

        // Show contract summary first
        setShowContractSummary(true);
    };

    // Function to proceed to PIN after summary confirmation
    const handleSummaryConfirm = () => {
        setShowContractSummary(false);
        setIsOpen(true); // Show PIN popup next
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
                contractTitle={contractTitle}
                contractContent={contractContent}
                initiatorName={`${userData?.firstName || ''} ${userData?.lastName || ''}`}
                initiatorEmail={userData?.email || ''}
                receiverEmail={receiverEmail.split('@')[0]}
                receiverName={receiverName}
                amount={20}
                confirmContract={showContractSummary}
                onBack={() => setShowContractSummary(false)}
                onConfirm={handleSummaryConfirm}
                contractType="Custom Contract"
                dateCreated={new Date().toLocaleDateString()}
                />
            <Tabs value={activeTab} onValueChange={setActiveTab} className="animate-slide-up">
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
                <TabsContent value="create" className="mt-6 space-y-6">

                    <section className="space-y-4">
                        <h4 className="text-lg font-medium">Contract Details</h4>
                        <div className="flex flex-col  gap-3">
                            <div className="flex items-end">
                                <div className="w-full">
                                    <label className="block text-xs font-medium text-gray-600">Template</label>
                                    <Select value={contractTitle} onValueChange={setContractTitle}>
                                        <SelectTrigger>
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
                                </div>
                            </div>
                            <div className="md:col-span-2">
                                <label className="block text-xs font-medium text-gray-600">Contract Title</label>
                                <SignContractSelect
                                    setContractTitle={setContractTitle}
                                    setContractContent={setContractContent}
                                />
                            </div>

                        </div>


                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                            <SignContractInput
                                label="SignerFull Name*"
                                placeholder="John Doe"
                                id={"receiver-name"}
                                value={receiverName}
                                onchange={(e) => setReceiverName(e.target.value)} />
                            <SignContractInput
                                label="Email Address*"
                                placeholder="john@example.com"
                                id={"receiver-email"}
                                value={receiverEmail}
                                onchange={(e) => setReceiverEmail(e.target.value)} />
                            <SignContractInput
                                label="Phone Number (Optional)"
                                placeholder="+234 000 000 0000"
                                id={"receiver-phone"}
                                value={receiverPhone}
                                onchange={(e) => setReceiverPhone(e.target.value)} />
                        </div>


                        <div>
                            <label className="block text-xs font-medium text-gray-600">Contract Content</label>
                            <RichTextArea value={contractContent} onChange={setContractContent} />                        </div>
                    </section>


                    <section className="space-y-4">
                        <h4 className="text-lg font-medium">Consent Declarations</h4>
                        <SignContractToggle ageConsent={ageConsent} setAgeConsent={setAgeConsent} setTermsConsent={setTermsConsent} termsConsent={termsConsent} />
                    </section>


                    <div className="flex gap-3 pt-4">
                        <Button onClick={handleSaveDraft} variant="outline" size="lg" className="flex-1">
                            <Save className="mr-2 h-4 w-4" />
                            Save to Draft
                        </Button>
                        <Button onClick={handleSendForSignature} size="lg" className="flex-1">
                            <Send className="mr-2 h-4 w-4" />
                            Send for Signature
                        </Button>
                    </div>
                </TabsContent>
                <TabsContent value="preview">
                    <Card className="border-border shadow-sm">
                        <CardHeader>
                            <CardTitle>Contract Preview</CardTitle>
                            <CardDescription>Review your contract before sending</CardDescription>
                        </CardHeader>
                        <CardContent>
                            {contractContent ? (
                                <div className="prose prose-sm max-w-none p-6 bg-muted/50 rounded-lg border border-border">
                                    <div className="whitespace-pre-wrap font-serif leading-relaxed">
                                        {contractContent}
                                    </div>
                                </div>
                            ) : (
                                <div className="text-center py-12 text-muted-foreground">
                                    <FileText className="h-12 w-12 mx-auto mb-3 opacity-50" />
                                    <p>No contract content to preview yet</p>
                                    <p className="text-sm">Switch to "Write Contract" tab to create your contract</p>
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
                                Upload a PDF or DOCX file to get it notarized with our official seal and signature
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="border-2 border-dashed border-border rounded-lg p-12 text-center hover:border-primary transition-colors">
                                <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                                <h3 className="text-lg font-semibold mb-2">Drop your document here</h3>
                                <p className="text-sm text-muted-foreground mb-4">
                                    Supports PDF and DOCX files up to 10MB
                                </p>
                                <Button variant="outline">Browse Files</Button>
                                <p className="text-xs text-muted-foreground mt-4">
                                    Notarization fee: ₦10,000 per document
                                </p>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>

            <ContractsPreview
                isOpen={showPreview}
                contract={form.contract}
                onClose={() => setShowPreview(false)}
            />
        </>
    )
}


export default FormBody;