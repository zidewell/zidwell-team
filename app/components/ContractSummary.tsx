"use client";

import { Button } from "./ui/button";
import { motion, AnimatePresence } from "framer-motion";
import { FileText, User, Mail, Calendar, Shield, Lock, AlertCircle } from "lucide-react";

interface ContractSummaryProps {
  contractTitle: string;
  contractContent: string;
  initiatorName: string;
  initiatorEmail: string;
  receiverName: string;
  receiverEmail: string;
  receiverPhone?: string;
  amount: number;
  confirmContract: boolean;
  onBack: () => void;
  onConfirm: () => void;
  contractType?: string;
  dateCreated?: string;
  status?: string;
}

export default function ContractSummary({
  contractTitle,
  contractContent,
  initiatorName,
  initiatorEmail,
  receiverName,
  receiverEmail,
  receiverPhone,
  amount,
  confirmContract,
  onBack,
  onConfirm,
  contractType = "Service Agreement",
  dateCreated = new Date().toLocaleDateString(),
  status = "pending"
}: ContractSummaryProps) {
  // Truncate contract content for preview
  const truncatedContent = contractContent.length > 200 
    ? contractContent.substring(0, 200) + "..."
    : contractContent;

  return (
    <AnimatePresence>
      {confirmContract && (
        <>
          {/* 🔲 Backdrop */}
          <motion.div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onBack}
          />

          {/* 📄 Modal Container */}
          <motion.div
            className="fixed inset-0 flex items-center justify-center z-50 px-4"
            initial={{ opacity: 0, y: 60, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 40, scale: 0.95 }}
            transition={{ type: "spring", stiffness: 260, damping: 22 }}
          >
            <div className="max-w-2xl w-full mx-auto bg-white rounded-2xl shadow-lg p-6 space-y-4 max-h-[90vh] overflow-y-auto">
             
              {/* Header */}
              <div className="flex flex-col items-center border-b pb-4">
                <div className="text-gray-500 text-sm">Contract Generation Fee</div>
                <div className="text-3xl font-bold text-gray-900">
                  ₦{typeof amount === 'number' ? amount.toLocaleString() : amount}
                </div>
                <div className="text-sm text-gray-600 mt-1">
                  {contractType}
                </div>
              </div>

              {/* CONTRACT DETAILS Section */}
              <div>
                <h3 className="text-gray-700 text-sm font-semibold mb-3">
                  Contract Details
                </h3>
                <div className="bg-gray-50 rounded-lg p-4 space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Contract Title</span>
                    <span className="text-gray-900 font-medium text-right max-w-[60%]">
                      {contractTitle || "Untitled Contract"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Contract Type</span>
                    <span className="text-gray-900 capitalize">{contractType}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Status</span>
                    <span className="text-gray-900 capitalize">{status}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Date Created</span>
                    <span className="text-gray-900">{dateCreated}</span>
                  </div>
                </div>
              </div>

              {/* PARTIES INVOLVED Section */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* INITIATOR Section */}
                <div>
                  <h3 className="text-gray-700 text-sm font-semibold mb-2">
                    Initiator (You)
                  </h3>
                  <div className="bg-gray-50 rounded-lg p-3 space-y-2 text-sm">
                    <div>
                      <span className="text-gray-500 block text-xs">Full Name</span>
                      <span className="text-gray-900 font-medium">{initiatorName || "Not specified"}</span>
                    </div>
                    <div>
                      <span className="text-gray-500 block text-xs">Email Address</span>
                      <span className="text-gray-900 break-all">{initiatorEmail}</span>
                    </div>
                  </div>
                </div>

                {/* SIGNEE Section */}
                <div>
                  <h3 className="text-gray-700 text-sm font-semibold mb-2">
                    Signee (Recipient)
                  </h3>
                  <div className="bg-gray-50 rounded-lg p-3 space-y-2 text-sm">
                    <div>
                      <span className="text-gray-500 block text-xs">Full Name</span>
                      <span className="text-gray-900 font-medium">{receiverName || "Not specified"}</span>
                    </div>
                    <div>
                      <span className="text-gray-500 block text-xs">Email Address</span>
                      <span className="text-gray-900 break-all">{receiverEmail}</span>
                    </div>
                    {receiverPhone && (
                      <div>
                        <span className="text-gray-500 block text-xs">Phone Number</span>
                        <span className="text-gray-900">{receiverPhone}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* CONTRACT CONTENT PREVIEW */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <h3 className="text-gray-700 text-sm font-semibold">
                    Contract Preview
                  </h3>
                  <div className="text-xs text-gray-500">
                    {contractContent.length > 200 
                      ? `200/${contractContent.length} chars`
                      : `${contractContent.length} chars`}
                  </div>
                </div>
                <div className="bg-gray-50 rounded-lg p-4 max-h-48 overflow-y-auto">
                  <pre className="text-sm text-gray-700 whitespace-pre-wrap font-sans leading-relaxed">
                    {truncatedContent}
                  </pre>
                </div>
                <div className="text-xs text-gray-500 text-center pt-2">
                  {contractContent.length > 200 
                    ? "Preview limited to 200 characters - full contract will be delivered"
                    : "Full contract content shown above"}
                </div>
              </div>

              {/* SECURITY FEATURES */}
              <div>
                <h3 className="text-gray-700 text-sm font-semibold mb-2">
                  Security Features
                </h3>
                <div className="bg-gray-50 rounded-lg p-4 text-sm">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 text-gray-600">
                        <Shield className="h-4 w-4 text-green-600" />
                        <span className="font-medium">Digital Signature</span>
                      </div>
                      <p className="text-gray-600 text-xs">Legally binding e-signature</p>
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 text-gray-600">
                        <Lock className="h-4 w-4 text-blue-600" />
                        <span className="font-medium">Secure Delivery</span>
                      </div>
                      <p className="text-gray-600 text-xs">Encrypted contract transmission</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Important Notes */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-700 flex items-start gap-3">
                <AlertCircle className="h-5 w-5 mt-0.5 text-blue-500 shrink-0" />
                <div className="space-y-1">
                  <p className="font-medium">Important Information</p>
                  <ul className="list-disc list-inside space-y-1 text-xs">
                    <li>This contract will be sent to the recipient's email for electronic signature</li>
                    <li>Recipient will need to enter a verification code to sign</li>
                    <li>The ₦{amount} fee covers secure delivery, digital signing, and storage</li>
                    <li>You will receive notifications when the contract is viewed and signed</li>
                    <li>Once sent, the contract cannot be edited - please review carefully</li>
                    <li>Signed contracts are stored securely with timestamped audit trail</li>
                  </ul>
                </div>
              </div>

              {/* Buttons */}
              <div className="flex justify-between pt-4 border-t">
                <Button
                  variant="outline"
                  onClick={onBack}
                  className="border border-gray-300 text-gray-700 hover:bg-gray-100"
               
                >
                  Back to Edit
                </Button>
                <Button
                  onClick={onConfirm}
                  className="bg-[#C29307] text-white hover:bg-[#b38606] px-8"
             
                >
                Send Contract
                </Button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}