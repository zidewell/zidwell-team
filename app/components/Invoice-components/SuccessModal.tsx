"use client";

import React from "react";
import { Button } from "../ui/button";
import { Download, Link, Copy } from "lucide-react";

interface SuccessModalProps {
  isOpen: boolean;
  onClose: () => void;
  generatedSigningLink?: string;
  onDownloadPDF: () => void;
  onCopyLink: () => void;
  allowMultiplePayments?: boolean;
  pdfLoading?: boolean;
}

const SuccessModal: React.FC<SuccessModalProps> = ({
  isOpen,
  onClose,
  generatedSigningLink,
  onDownloadPDF,
  onCopyLink,
  allowMultiplePayments = false,
  pdfLoading = false,
}) => {
  if (!isOpen) return null;

  return (
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
            onClick={onDownloadPDF}
            disabled={pdfLoading}
            className="w-full bg-[#C29307] hover:bg-[#b38606] text-white"
          >
            <Download className="w-4 h-4 mr-2" />
            {pdfLoading ? "Generating PDF..." : "Download PDF"}
          </Button>

          {generatedSigningLink && (
            <div className="space-y-2">
              <Button
                onClick={onCopyLink}
                variant="outline"
                className="w-full border-blue-500 text-blue-500 hover:bg-blue-500 hover:text-white"
              >
                <Link className="w-4 h-4 mr-2" />
                Copy Invoice Link
              </Button>
              <div className="text-xs text-gray-500 text-center">
                {allowMultiplePayments
                  ? "Share this link with multiple people - each provides their info and pays"
                  : "Share this invoice link with your client to view details and pay"}
              </div>
            </div>
          )}

          <Button
            onClick={onClose}
            variant="outline"
            className="w-full"
          >
            Close
          </Button>
        </div>
      </div>
    </div>
  );
};

export default SuccessModal;