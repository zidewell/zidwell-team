"use client";

import { useState } from "react";
import { Button } from "@/app/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/app/components/ui/card";
import { Badge } from "@/app/components/ui/badge";
import { SuggestEditsModal } from "./SuggestEditsModal";
import { FileText, CheckCircle, XCircle, Edit, PenTool } from "lucide-react";
import { useRouter } from "next/navigation";
import { useToast } from "@/app/hooks/use-toast";
import { IdentityVerificationModal } from "./IdentityVerificationModal";
import { SignaturePanel } from "./SignaturePanel";

interface Contract {
  id: string;
  token: string;
  title: string;
  content: string;
  status: string;
  initiatorName: string;
  initiatorEmail: string;
  signeeName: string;
  signeeEmail: string;
  signeePhone: string;
  hasLawyerSignature: boolean;
  creatorName: string;
  creatorSignature: string | null;
  signeeSignature?: string | null;
  createdAt: string;
  verificationCode: string | null;
  metadata: any;
  contractDate: string;
}

interface ContractSigningPageProps {
  contract: Contract;
}

const ContractSigningPage = ({ contract }: ContractSigningPageProps) => {
  const router = useRouter();
  const [showVerificationModal, setShowVerificationModal] = useState(false);
  const [showSignaturePanel, setShowSignaturePanel] = useState(false);
  const [showEditsModal, setShowEditsModal] = useState(false);
  const { toast } = useToast();

  const handleSign = () => {
    setShowSignaturePanel(true);
  };

  const handleReject = () => {
    setShowEditsModal(true);
  };

  const handleVerificationSuccess = () => {
    toast({
      title: "Contract signed successfully!",
      description: "Check your email for the signed document.",
    });
  };

  const handleEditsSubmitted = () => {
    toast({
      title: "Edits submitted successfully!",
      description: "The contract creator will be notified.",
    });
  };

  // Format date like "31st December 2025"
  const formatDate = (dateString: string) => {
    if (!dateString) return "Date not specified";
    
    const date = new Date(dateString);
    const day = date.getDate();
    const month = date.toLocaleDateString("en-US", { month: "long" });
    const year = date.getFullYear();

    // Add ordinal suffix
    const getOrdinalSuffix = (n: number) => {
      if (n > 3 && n < 21) return "th";
      switch (n % 10) {
        case 1:
          return "st";
        case 2:
          return "nd";
        case 3:
          return "rd";
        default:
          return "th";
      }
    };

    return `${day}${getOrdinalSuffix(day)} ${month} ${year}`;
  };

  // Get payment terms from metadata
  const getPaymentTerms = () => {
    if (!contract.metadata) return null;
    
    // Try to parse metadata if it's a string
    let metadataObj = contract.metadata;
    if (typeof contract.metadata === 'string') {
      try {
        metadataObj = JSON.parse(contract.metadata);
      } catch (e) {
        console.error('Failed to parse metadata:', e);
        return null;
      }
    }
    
    return metadataObj?.payment_terms || null;
  };

  const paymentTerms = getPaymentTerms();

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header - matches image design */}
        <div className="text-center mb-10">
          <h1 className="text-3xl font-bold text-[#C29307] bg-[#073b2a] uppercase mb-2 py-2">
            {contract.title || "SERVICE CONTRACT"}
          </h1>
          <p className="text-base text-gray-700 mb-8">
            This is a service agreement entered into between:
          </p>

          {/* Party Information */}
          <div className="space-y-4 mb-8 text-left">
            <div className="flex ">
              <span className="font-bold ">PARTY A:</span>
              <span className="ml-4 relative pl-4 before:absolute before:left-0 before:top-3 before:w-2 before:h-0.5 before:bg-black">
                {contract.initiatorName}
              </span>
            </div>
            <div className="flex ">
              <span className="font-bold ">PARTY B:</span>
              <span className="ml-4 relative pl-4 before:absolute before:left-0 before:top-3 before:w-2 before:h-0.5 before:bg-black">
                {contract.signeeName || "Signee Name"}
              </span>
            </div>
            <div className="flex ">
              <span className="font-bold">DATE:</span>
              <span className="ml-4 relative pl-4 before:absolute before:left-0 before:top-3 before:w-2 before:h-0.5 before:bg-black">
                {formatDate(contract.contractDate || contract.createdAt)}
              </span>
            </div>
          </div>
        </div>

        {/* Terms Section */}
        <div className="mb-10">
          <div className="flex items-center gap-4 my-6">
            <div className="flex-1 h-1 bg-[#C29307] rounded-2xl" />

            <h2 className="text-xl font-bold text-center whitespace-nowrap">
              THE TERMS OF AGREEMENT ARE AS FOLLOWS
            </h2>

            <div className="flex-1 h-1 bg-[#C29307] rounded-2xl" />
          </div>

          {contract.content ? (
            contract.content.includes("<") ? (
              // Render HTML content
              <div
                className="rich-text-content prose prose-sm max-w-none text-sm leading-relaxed"
                dangerouslySetInnerHTML={{ __html: contract.content }}
              />
            ) : (
              // Render plain text
              <div className="whitespace-pre-wrap text-sm leading-relaxed">
                {contract.content}
              </div>
            )
          ) : (
            <div className="text-gray-400 italic text-sm text-center py-8">
              No contract content provided
            </div>
          )}
        </div>

        {/* PAYMENT TERMS Section - Only show if payment terms exist */}
        {paymentTerms && (
          <div className="mb-10">
            <div className="flex items-center gap-4 my-6">
              <div className="flex-1 h-1 bg-[#C29307] rounded-2xl" />

              <h2 className="text-xl font-bold text-center whitespace-nowrap">
                PAYMENT TERMS
              </h2>

              <div className="flex-1 h-1 bg-[#C29307] rounded-2xl" />
            </div>

            <div className="space-y-4">
              {paymentTerms.includes("<") ? (
                <div
                  className="rich-text-content prose prose-sm max-w-none text-sm leading-relaxed"
                  dangerouslySetInnerHTML={{ __html: paymentTerms }}
                />
              ) : (
                <div className="whitespace-pre-wrap text-sm leading-relaxed">
                  {paymentTerms}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Signature Section - matches the table layout from image */}
        <div className="mb-10 pt-6 border-t border-gray-200">
          <div className="flex items-center gap-4 my-6">
            <div className="flex-1 h-1 bg-[#C29307] rounded-2xl" />

            <h2 className="text-xl font-bold text-center whitespace-nowrap">
              SIGNATURES
            </h2>

            <div className="flex-1 h-1 bg-[#C29307] rounded-2xl" />
          </div>

          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  <th className="py-3 px-4 text-center font-bold">PARTY A</th>
                  {contract.hasLawyerSignature && (
                    <th className="py-3 px-4 text-center font-bold">
                      LEGAL WITNESS
                    </th>
                  )}
                  <th className="py-3 px-4 text-center font-bold">PARTY B</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  {/* Party A Signature Cell */}
                  <td className="py-6 px-4 text-center align-top">
                    <div className="min-h-[120px] flex flex-col items-center justify-start">
                      <div className="font-bold">{contract.initiatorName}</div>
                      <div className="h-[50px] w-48 border-b-2 border-dotted border-black mb-4 flex items-center justify-center">
                        {contract.creatorSignature ? (
                          <img
                            src={contract.creatorSignature}
                            alt="Creator signature"
                            className="h-10 object-contain"
                          />
                        ) : (
                          <span className="text-gray-400 text-sm">
                            Signature
                          </span>
                        )}
                      </div>
                    </div>
                  </td>

                  {/* Lawyer Witness Signature Cell - Added between Party A and Party B */}
                  {contract.hasLawyerSignature && (
                    <td className="py-6 px-4 text-center align-top">
                      <div className="min-h-[120px] flex flex-col items-center justify-start">
                        <div className="font-bold">Barr. Adewale Johnson</div>
                        <div className="h-[50px] w-48 border-b-2 border-dotted border-black mb-4 flex items-center justify-center">
                          <span className="text-gray-600 italic font-serif text-lg">
                            Barr. Adewale Johnson
                          </span>
                        </div>
                        <div className="text-center">
                          <p className="text-sm text-gray-600 mt-1">
                            Legal Counsel
                          </p>
                          <p className="text-xs bg-[#C29307]/10 text-[#C29307] px-2 py-1 rounded-full inline-block mt-2">
                            Verified Lawyer
                          </p>
                        </div>
                      </div>
                    </td>
                  )}

                  {/* Party B Signature Cell */}
                  <td className="py-6 px-4 text-center align-top">
                    <div className="min-h-[120px] flex flex-col items-center justify-start">
                      <div className="font-bold">
                        {contract.signeeName || "Signee Name"}
                      </div>
                      <div className="h-[50px] w-48 border-b-2 border-dotted border-black mb-4 flex items-center justify-center">
                        {contract.signeeSignature ? (
                          <img
                            src={contract.signeeSignature}
                            alt="Signee signature"
                            className="h-10 object-contain"
                          />
                        ) : (
                          <span className="text-gray-400 text-sm">
                            Signature
                          </span>
                        )}
                      </div>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

       

        {/* Action Buttons - Only show if not signed */}
        {contract.status !== "signed" && (
          <div className="mt-12 p-8 border border-gray-200 rounded-lg bg-gray-50">
            <h3 className="text-lg font-semibold text-center mb-6">
              Review & Sign Contract
            </h3>

            <div className="grid md:grid-cols-2 gap-6 max-w-2xl mx-auto">
              <Button
                onClick={handleSign}
                className="h-auto py-4 flex items-center justify-center gap-3 bg-[#C29307] hover:bg-[#b38606] text-white"
              >
                <PenTool className="h-5 w-5" />
                <div className="text-left">
                  <div className="font-semibold">Sign Contract</div>
                  <div className="text-xs opacity-90">I agree to all terms</div>
                </div>
              </Button>

              <Button
                onClick={handleReject}
                variant="outline"
                className="h-auto py-4 flex items-center justify-center gap-3"
              >
                <Edit className="h-5 w-5" />
                <div className="text-left">
                  <div className="font-semibold">Suggest Edits</div>
                  <div className="text-xs opacity-90">Request changes</div>
                </div>
              </Button>
            </div>

            <div className="mt-6 pt-6 border-t border-gray-300">
              <div className="flex items-start gap-3 text-sm text-gray-600">
                <XCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
                <p>
                  By signing this contract, you agree to be legally bound by its
                  terms. If you need changes, use the "Suggest Edits" option.
                  Note that suggested edits will cost the contract creator ₦500
                  to review and update.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Already Signed Message */}
        {contract.status === "signed" && (
          <div className="mt-8 p-6 border border-green-200 bg-green-50 rounded-lg">
            <div className="text-center">
              <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-green-700 mb-2">
                Contract Already Signed
              </h3>
              <p className="text-green-600">
                This contract has been signed and is legally binding. Check your
                email for the signed document.
              </p>
            </div>
          </div>
        )}

         {/* Footer */}
        <div className="text-center text-xs text-gray-500 pt-6 border-t border-gray-200">
          THIS CONTRACT WAS CREATED AND SIGNED ON ZIDWELL.COM
          <br />
          Contract ID: {contract.token.substring(0, 8).toUpperCase()}
        </div>
      </div>

      {/* Modals */}
      <IdentityVerificationModal
        open={showVerificationModal}
        onOpenChange={setShowVerificationModal}
        contractId={contract.id}
        contractToken={contract.token}
        signeeName={contract.signeeName}
        signeeEmail={contract.signeeEmail}
        onSuccess={handleVerificationSuccess}
      />

      <SuggestEditsModal
        open={showEditsModal}
        onOpenChange={setShowEditsModal}
        contractId={contract.id}
        contractTitle={contract.title}
        contractToken={contract.token}
        signeeEmail={contract.signeeEmail}
        onSuccess={handleEditsSubmitted}
      />

      {showSignaturePanel && (
        <SignaturePanel
          contractId={contract.id}
          contractToken={contract.token}
          signeeName={contract.signeeName}
          signeeEmail={contract.signeeEmail}
          onSignatureComplete={(signatureData) => {
            setShowSignaturePanel(false);
          }}
          onCancel={() => setShowSignaturePanel(false)}
        />
      )}
    </div>
  );
};

export default ContractSigningPage;