// app/components/invoice/PayWithTransferModal.tsx
"use client";

import { useState } from "react";
import { Button } from "@/app/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/app/components/ui/dialog";
import { TransferCheckout } from "@/app/components/invoice/TransferCheckout";
import Swal from "sweetalert2";

interface PayerInfo {
  fullName: string;
  email: string;
  phone: string;
}

interface PayWithTransferModalProps {
  isOpen: boolean;
  onClose: () => void;
  invoiceId: string;
  amount: number;
  payerInfo: PayerInfo;
  initiatorAccountName?: string;
  initiatorAccountNumber?: string;
  initiatorBankName?: string;
}

export function PayWithTransferModal({
  isOpen,
  onClose,
  invoiceId,
  amount,
  payerInfo,
  initiatorAccountName,
  initiatorAccountNumber,
  initiatorBankName,
}: PayWithTransferModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showTransferConfirmation, setShowTransferConfirmation] =
    useState(false);

  const handleConfirmTransfer = async () => {
    setIsSubmitting(true);

    try {
      // Show confirmation dialog
      const result = await Swal.fire({
        title: "Confirm Payment",
        html: `
          <div class="text-left">
            <p class="mb-2"><strong>Invoice ID:</strong> ${invoiceId}</p>
            <p class="mb-2"><strong>Amount:</strong> ₦${amount.toLocaleString()}</p>
            <p class="mb-2"><strong>Payer:</strong> ${payerInfo.fullName}</p>
            <p class="mb-4"><strong>Email:</strong> ${payerInfo.email}</p>
            <div class="mt-4 p-3 bg-blue-50 border border-blue-200 rounded">
              <p class="text-sm"><strong>Important:</strong> Did you include <strong>${invoiceId}</strong> in the transfer narration?</p>
            </div>
          </div>
        `,
        icon: "question",
        showCancelButton: true,
        confirmButtonColor: "#C29307",
        cancelButtonColor: "#6b7280",
        confirmButtonText: "Yes, I've completed the transfer",
        cancelButtonText: "Not yet",
      });

      if (result.isConfirmed) {
        // Check if payment already exists
        const checkResponse = await fetch(
          "/api/check-invoice-tranfer-payment",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              invoiceId,
              amount,
              payerEmail: payerInfo.email,
            }),
          }
        );

        const checkData = await checkResponse.json();

        if (checkData.paymentExists) {
          // Payment already exists
          await Swal.fire({
            title: "🎉 Payment Already Verified!",
            html: `
              <div class="text-left">
                <p class="mb-2"><strong>Invoice:</strong> ${invoiceId}</p>
                <p class="mb-2"><strong>Amount:</strong> ₦${amount.toLocaleString()}</p>
                <p class="mb-2"><strong>Status:</strong> <span class="text-green-600 font-semibold">Verified</span></p>
                <p class="mb-4"><strong>Payment Reference:</strong> ${
                  checkData.paymentId || checkData.transactionId || "N/A"
                }</p>
                <div class="mt-4 p-3 bg-green-50 border border-green-200 rounded">
                  <p class="text-sm text-green-700">
                    ✅ Your payment has already been verified and processed.
                  </p>
                </div>
              </div>
            `,
            icon: "success",
            confirmButtonColor: "#C29307",
          });
          onClose();
        } else {
          // Payment not found yet
          setShowTransferConfirmation(true);

          await Swal.fire({
            title: "Payment Not Found Yet",
            html: `
              <div class="text-left">
                <p>We haven't detected your payment yet. This is normal if you just completed the transfer.</p>
                <div class="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded">
                  <p class="text-sm"><strong>What to expect:</strong></p>
                  <ul class="text-sm mt-2 space-y-1">
                    <li>• Payments typically take 1-5 minutes to process</li>
                    <li>• Ensure you included <strong>${invoiceId}</strong> in the narration</li>
                    <li>• We'll automatically check for your payment</li>
                    <li>• You'll receive an email confirmation when verified</li>
                    <li>• You can check payment status in the payment window</li>
                  </ul>
                </div>
              </div>
            `,
            icon: "info",
            confirmButtonColor: "#C29307",
          });

          // Don't close the modal - keep it open so they can check status
          setIsSubmitting(false);
        }
      }
    } catch (error) {
      console.error("Transfer confirmation error:", error);
      await Swal.fire({
        title: "Error",
        text: "Failed to check payment status. Please try again later.",
        icon: "error",
        confirmButtonColor: "#C29307",
      });
      setIsSubmitting(false);
    }
  };

  const bankDetails = {
    bankName: initiatorBankName,
    accountName: initiatorAccountName || "",
    accountNumber: initiatorAccountNumber || "",
  };

  const invoiceDetails = {
    invoiceId: invoiceId,
    amount: amount,
    currency: "NGN",
    description: `Payment for invoice ${invoiceId}${
      initiatorBankName ? ` - ${initiatorBankName}` : ""
    }`,
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span className="text-[#C29307]">Pay via Bank Transfer</span>
          </DialogTitle>
        </DialogHeader>

        <div className="py-4">
          <TransferCheckout
            bankDetails={bankDetails}
            invoiceDetails={invoiceDetails}
            onConfirmTransfer={handleConfirmTransfer}
            payerInfo={{
              email: payerInfo.email,
              name: payerInfo.fullName,
              phone: payerInfo.phone,
            }}
          />
        </div>

        {showTransferConfirmation && (
          <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <h4 className="font-semibold text-blue-800 mb-2">💡 Next Steps</h4>
            <ul className="text-sm text-blue-700 space-y-1">
              <li>• Your payment is being processed</li>
              <li>
                • Use the <strong>"Check Payment Status"</strong> button above
                to verify
              </li>
              <li>• We'll notify you by email when payment is confirmed</li>
              <li>• You can close this window and return later</li>
            </ul>
          </div>
        )}

        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button variant="outline" onClick={onClose}>
            {showTransferConfirmation ? "Close & Check Later" : "Cancel"}
          </Button>
          <Button
            onClick={handleConfirmTransfer}
            disabled={isSubmitting || !initiatorAccountNumber}
            className="bg-[#C29307] hover:bg-[#b38606] text-white disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            {isSubmitting ? "Checking..." : "Confirm Transfer"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
