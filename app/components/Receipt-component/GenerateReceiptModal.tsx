import { useState } from "react";
import { Copy, Download, Check, Link2, FileText } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import { Button } from "../ui/button";
import { toast } from "sonner"; 

interface GenerateReceiptModalProps {
  open: boolean;
  onClose: () => void;
  receiptId: string;
  onDownload: () => void;
}

export const GenerateReceiptModal: React.FC<{
  open: boolean;
  onClose: () => void;
  receiptId: string;
  onDownload: () => void;
  onCopyLink?: (link: string) => void;
  signingLink?: string;
}> = ({ open, onClose, receiptId, onDownload, onCopyLink, signingLink }) => {
  const [copied, setCopied] = useState(false);

  if (!open) return null;

  const handleCopyLink = async (link: string) => {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      toast.success("Receipt link copied to clipboard");
      
      // Reset copied state after 2 seconds
      setTimeout(() => setCopied(false), 2000);
      
      // Also call the parent's onCopyLink if provided
      if (onCopyLink) {
        onCopyLink(link);
      }
    } catch (error) {
      toast.error("Failed to copy link");
    }
  };

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
            Receipt Created Successfully! 🎉
          </h3>
          <p className="text-gray-600">
            Your receipt has been generated and is ready to share.
          </p>
        </div>

        <div className="space-y-6 py-4">
          {/* Download Option */}
          <div className="rounded-lg border-2 border-gray-200 p-4 hover:border-[#C29307] transition-colors">
            <div className="flex items-start gap-4">
              <div className="h-10 w-10 rounded-lg bg-gray-100 flex items-center justify-center shrink-0">
                <FileText className="h-5 w-5 text-gray-700" />
              </div>
              <div className="flex-1">
                <h3 className="font-medium text-gray-900">Download PDF</h3>
                <p className="text-xs text-gray-600 mt-1">
                  Download receipt as PDF with your signature. Receiver's signature space will be empty.
                </p>
                <Button
                  onClick={onDownload}
                  className="mt-3 bg-[#C29307] hover:bg-[#b38606] text-white"
                >
                  <FileText className="h-4 w-4 mr-2" />
                  Download PDF
                </Button>
              </div>
            </div>
          </div>

          {/* Share Link Option */}
          {signingLink && (
            <div className="rounded-lg border-2 border-gray-200 p-4 hover:border-[#C29307] transition-colors">
              <div className="flex items-start gap-4">
                <div className="h-10 w-10 rounded-lg bg-gray-100 flex items-center justify-center shrink-0">
                  <svg
                    className="h-5 w-5 text-gray-700"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"
                    />
                  </svg>
                </div>
                <div className="flex-1">
                  <h3 className="font-medium text-gray-900">
                    Share Receipt Link
                  </h3>
                  <p className="text-xs text-gray-600 mt-1">
                    Send this link to the receiver. They can view, acknowledge, and sign the receipt.
                  </p>
                  <div className="flex gap-2 mt-3">
                    <div className="flex-1 rounded-lg bg-gray-100 px-3 py-2 text-xs font-mono text-gray-600 truncate">
                      {signingLink}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleCopyLink(signingLink)}
                      className="shrink-0"
                    >
                      {copied ? (
                        <Check className="h-4 w-4 text-green-600" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="mt-6 p-3 bg-gray-50 rounded-lg">
          <p className="text-sm text-gray-700 text-center">
            <strong>Receipt ID:</strong> {receiptId}
          </p>
        </div>

        <div className="mt-6">
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