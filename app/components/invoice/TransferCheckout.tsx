// app/components/invoice/TransferCheckout.tsx
"use client";

import { useState, useEffect, useRef } from "react";
import {
  Copy,
  Check,
  Building2,
  CreditCard,
  FileText,
  ArrowRight,
  Shield,
  Loader2,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/app/components/ui/button";
import Swal from "sweetalert2";

interface BankDetails {
  bankName: string | undefined;
  accountName: string;
  accountNumber: string;
}

interface InvoiceDetails {
  invoiceId: string;
  amount: number;
  currency: string;
  description: string;
  dueDate?: string;
}

interface TransferCheckoutProps {
  bankDetails?: BankDetails;
  invoiceDetails?: InvoiceDetails;
  onConfirmTransfer?: (payerInfo?: {
    email: string;
    name: string;
    phone: string;
  }) => Promise<void>;
  payerInfo?: {
    email: string;
    name: string;
    phone: string;
  };
}

export function TransferCheckout({
  bankDetails,
  invoiceDetails,
  onConfirmTransfer,
  payerInfo,
}: TransferCheckoutProps) {
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [isConfirmed, setIsConfirmed] = useState(false);
  const [isCheckingPayment, setIsCheckingPayment] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState<
    "not_found" | "found" | "checking" | "error"
  >("not_found");
  const [lastCheckTime, setLastCheckTime] = useState<Date | null>(null);
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Provide fallbacks if data is not provided
  const safeBankDetails = bankDetails || {
    bankName: "First Bank of Nigeria",
    accountName: "Account details not provided",
    accountNumber: "Account details not provided",
  };

  const safeInvoiceDetails = invoiceDetails || {
    invoiceId: "INV-001",
    amount: 0,
    currency: "NGN",
    description: "Invoice Payment",
  };

  // Clean up polling on unmount
  useEffect(() => {
    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
    };
  }, []);

  const copyToClipboard = async (
    text: string | undefined,
    fieldName: string
  ) => {
    if (!text || text === "Account details not provided") {
      Swal.fire({
        toast: true,
        position: "top-end",
        icon: "warning",
        title: "No data to copy",
        showConfirmButton: false,
        timer: 2000,
      });
      return;
    }

    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(fieldName);

      Swal.fire({
        toast: true,
        position: "top-end",
        icon: "success",
        title: `${fieldName} copied!`,
        showConfirmButton: false,
        timer: 2000,
        timerProgressBar: true,
      });

      setTimeout(() => setCopiedField(null), 2000);
    } catch (err) {
      Swal.fire({
        toast: true,
        position: "top-end",
        icon: "error",
        title: "Failed to copy",
        text: "Please copy manually",
        showConfirmButton: false,
        timer: 3000,
        timerProgressBar: true,
      });
    }
  };

  const checkPaymentStatus = async (showMessages = true): Promise<boolean> => {
    if (!payerInfo?.email) {
      if (showMessages) {
        Swal.fire({
          icon: "warning",
          title: "Information Required",
          text: "Please provide your email to check payment status.",
          confirmButtonColor: "#C29307",
        });
      }
      return false;
    }

    setIsCheckingPayment(true);
    setPaymentStatus("checking");

    try {
      const response = await fetch("/api/check-invoice-tranfer-payment", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          invoiceId: safeInvoiceDetails.invoiceId,
          amount: safeInvoiceDetails.amount,
          payerEmail: payerInfo.email,
        }),
      });

      const data = await response.json();
      setLastCheckTime(new Date());

      if (data.paymentExists) {
        setPaymentStatus("found");
        setIsConfirmed(true);

        if (showMessages) {
          await Swal.fire({
            title: "🎉 Payment Verified!",
            html: `
              <div class="text-left">
                <p class="mb-2"><strong>Invoice:</strong> ${
                  safeInvoiceDetails.invoiceId
                }</p>
                <p class="mb-2"><strong>Amount:</strong> ₦${safeInvoiceDetails.amount.toLocaleString()}</p>
                <p class="mb-2"><strong>Status:</strong> <span class="text-green-600 font-semibold">Verified</span></p>
                <p class="mb-4"><strong>Payment Reference:</strong> ${
                  data.paymentId || data.transactionId || "N/A"
                }</p>
                <div class="mt-4 p-3 bg-green-50 border border-green-200 rounded">
                  <p class="text-sm text-green-700">
                    ✅ Your payment has been successfully verified and processed.
                  </p>
                </div>
              </div>
            `,
            icon: "success",
            confirmButtonColor: "#C29307",
          });
        }

        // Stop polling if active
        if (pollIntervalRef.current) {
          clearInterval(pollIntervalRef.current);
          pollIntervalRef.current = null;
        }

        return true;
      } else {
        setPaymentStatus("not_found");

        if (showMessages) {
          await Swal.fire({
            title: "Payment Not Found Yet",
            html: `
              <div class="text-left">
                <p>We haven't detected your payment yet. This is normal if you just completed the transfer.</p>
                <div class="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded">
                  <p class="text-sm"><strong>What to expect:</strong></p>
                  <ul class="text-sm mt-2 space-y-1">
                    <li>• Payments typically take 1-5 minutes to process</li>
                    <li>• Ensure you included <strong>${
                      safeInvoiceDetails.invoiceId
                    }</strong> in the narration</li>
                    <li>• We'll automatically check for your payment</li>
                    <li>• You'll receive an email confirmation when verified</li>
                  </ul>
                </div>
                <p class="text-xs text-gray-500 mt-4">Last checked: ${new Date().toLocaleTimeString()}</p>
              </div>
            `,
            icon: "info",
            showCancelButton: true,
            confirmButtonColor: "#C29307",
            cancelButtonColor: "#6b7280",
            confirmButtonText: "Check Again",
            cancelButtonText: "OK",
          }).then((result) => {
            if (result.isConfirmed) {
              checkPaymentStatus(true);
            }
          });
        }

        return false;
      }
    } catch (error) {
      console.error("Payment check error:", error);
      setPaymentStatus("error");

      if (showMessages) {
        Swal.fire({
          title: "Check Failed",
          text: "Unable to check payment status. Please try again in a moment.",
          icon: "error",
          confirmButtonColor: "#C29307",
        });
      }

      return false;
    } finally {
      setIsCheckingPayment(false);
    }
  };

  const handleConfirmTransfer = async () => {
    if (!payerInfo?.email) {
      Swal.fire({
        icon: "warning",
        title: "Information Required",
        text: "Please provide your email in the payment form before confirming.",
        confirmButtonColor: "#C29307",
      });
      return;
    }

    const result = await Swal.fire({
      title: "Confirm Payment",
      html: `
        <div class="text-left">
          <p class="mb-2"><strong>Invoice ID:</strong> ${
            safeInvoiceDetails.invoiceId
          }</p>
          <p class="mb-2"><strong>Amount:</strong> ₦${safeInvoiceDetails.amount.toLocaleString()}</p>
          <p class="mb-2"><strong>Payer:</strong> ${payerInfo.name}</p>
          <p class="mb-4"><strong>Email:</strong> ${payerInfo.email}</p>
          <div class="mt-4 p-3 bg-blue-50 border border-blue-200 rounded">
            <p class="text-sm"><strong>Important:</strong> Did you include <strong>${
              safeInvoiceDetails.invoiceId
            }</strong> in the transfer narration?</p>
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
      // Start automatic polling for payment
      startPaymentPolling();

      // Show initial check status
      await checkPaymentStatus(true);
    }
  };

  const startPaymentPolling = () => {
    // Clear any existing interval
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
    }

    // Start polling every 30 seconds
    pollIntervalRef.current = setInterval(() => {
      checkPaymentStatus(false); // Don't show messages on automatic checks
    }, 30000); // 30 seconds

    console.log("🔍 Started payment polling...");
  };

  const handleManualCheck = async () => {
    await checkPaymentStatus(true);
  };

  const formatCurrency = (amount: number, currency: string) => {
    if (currency === "NGN") {
      return `₦${amount.toLocaleString()}`;
    }
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency,
    }).format(amount);
  };

  // Check if bank account number is valid
  const hasValidAccountDetails =
    safeBankDetails?.accountNumber &&
    safeBankDetails.accountNumber !== "Account details not provided" &&
    safeBankDetails.accountNumber !== "";

  return (
    <div className="w-full max-w-lg mx-auto">
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-2xl font-bold mb-2 text-[#C29307]">
          Bank Transfer Payment
        </h1>
        <p className="text-muted-foreground">
          Complete your payment via bank transfer
        </p>

        {/* Payment Status Indicator */}
        {paymentStatus === "found" && (
          <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-center gap-2">
              <Check className="w-5 h-5 text-green-600" />
              <p className="text-sm text-green-700 font-semibold">
                ✅ Payment Verified Successfully
              </p>
            </div>
            {lastCheckTime && (
              <p className="text-xs text-green-600 mt-1">
                Last checked: {lastCheckTime.toLocaleTimeString()}
              </p>
            )}
          </div>
        )}

        {isCheckingPayment && (
          <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center gap-2">
              <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />
              <p className="text-sm text-blue-700">
                Checking payment status...
              </p>
            </div>
          </div>
        )}

        {/* Warning if account details are not available */}
        {!hasValidAccountDetails && (
          <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-sm text-yellow-700">
              <strong>Note:</strong> Bank account details not specified in this
              invoice. Please contact the invoice sender for payment
              instructions.
            </p>
          </div>
        )}
      </div>

      {/* Amount Card */}
      <div className="bg-card rounded-xl p-6 border border-border mb-6">
        <div className="flex items-center justify-between mb-4">
          <span className="text-muted-foreground text-sm">Amount Due</span>
          {safeInvoiceDetails.dueDate && (
            <span className="text-xs text-[#C29307]">
              Due: {safeInvoiceDetails.dueDate}
            </span>
          )}
        </div>
        <div className="text-4xl font-bold text-[#C29307] mb-2">
          {formatCurrency(
            safeInvoiceDetails.amount,
            safeInvoiceDetails.currency
          )}
        </div>
        <p className="text-sm text-muted-foreground">
          {safeInvoiceDetails.description}
        </p>
      </div>

      {/* Invoice ID - Highlighted */}
      <div className="bg-[#C29307]/10 border-2 border-[#C29307] rounded-xl p-5 mb-6">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-full bg-[#C29307]/20 flex items-center justify-center">
            <FileText className="w-5 h-5 text-[#C29307]" />
          </div>
          <div>
            <p className="text-xs text-[#C29307] font-medium uppercase tracking-wide">
              Invoice ID (Add to Narration)
            </p>
            <p className="text-xs text-muted-foreground">
              Include this in your transfer narration for verification
            </p>
          </div>
        </div>
        <div className="flex items-center justify-between bg-background/50 rounded-lg p-4">
          <span className="font-mono text-xl font-bold text-foreground tracking-wider">
            {safeInvoiceDetails.invoiceId}
          </span>
          <Button
            variant="ghost"
            size="icon"
            onClick={() =>
              copyToClipboard(safeInvoiceDetails.invoiceId, "Invoice ID")
            }
            className="hover:bg-[#C29307]/20"
            disabled={!safeInvoiceDetails.invoiceId}
          >
            {copiedField === "Invoice ID" ? (
              <Check className="w-5 h-5 text-[#C29307]" />
            ) : (
              <Copy className="w-5 h-5 text-[#C29307]" />
            )}
          </Button>
        </div>
      </div>

      {/* Bank Details - Only show if we have bank details */}
      {safeBankDetails && (
        <div className="bg-card rounded-xl p-6 border border-border mb-6">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center">
              <Building2 className="w-5 h-5 text-muted-foreground" />
            </div>
            <div>
              <h3 className="font-semibold text-[#C29307]">
                Bank Transfer Details
              </h3>
              <p className="text-xs text-muted-foreground">
                Transfer to the account below
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <DetailRow
              label="Bank Name"
              value={safeBankDetails.bankName || ""}
              onCopy={() =>
                copyToClipboard(safeBankDetails.bankName || "", "Bank Name")
              }
              isCopied={copiedField === "Bank Name"}
              isValid={hasValidAccountDetails}
            />
            <DetailRow
              label="Account Name"
              value={safeBankDetails.accountName || ""}
              onCopy={() =>
                copyToClipboard(
                  safeBankDetails.accountName || "",
                  "Account Name"
                )
              }
              isCopied={copiedField === "Account Name"}
              isValid={hasValidAccountDetails}
            />
            <DetailRow
              label="Account Number"
              value={safeBankDetails.accountNumber || ""}
              onCopy={() =>
                copyToClipboard(
                  safeBankDetails.accountNumber || "",
                  "Account Number"
                )
              }
              isCopied={copiedField === "Account Number"}
              highlight
              isValid={hasValidAccountDetails}
            />
          </div>
        </div>
      )}

      {/* Transfer Instructions */}
      <div className="bg-secondary/50 rounded-xl p-5 mb-6">
        <h4 className="font-semibold text-[#C29307] mb-3 flex items-center gap-2">
          <CreditCard className="w-4 h-4 text-[#C29307]" />
          How to Complete Your Transfer
        </h4>
        <ol className="space-y-2 text-sm text-muted-foreground">
          <li className="flex gap-2">
            <span className="text-[#C29307] font-semibold">1.</span>
            Open your banking app or visit your bank
          </li>
          <li className="flex gap-2">
            <span className="text-[#C29307] font-semibold">2.</span>
            Enter the bank details provided above
          </li>
          <li className="flex gap-2">
            <span className="text-[#C29307] font-semibold">3.</span>
            <span>
              Add{" "}
              <strong className="text-[#C29307]">
                {safeInvoiceDetails.invoiceId}
              </strong>{" "}
              as the transfer narration/reference
            </span>
          </li>
          <li className="flex gap-2">
            <span className="text-[#C29307] font-semibold">4.</span>
            Complete the transfer and click confirm below
          </li>
        </ol>
      </div>

      {/* Manual Check Button */}
      {!isConfirmed && (
        <div className="mb-4">
          <Button
            onClick={handleManualCheck}
            disabled={isCheckingPayment || !payerInfo?.email}
            variant="outline"
            className="w-full border-[#C29307] text-[#C29307] hover:bg-[#C29307]/10"
            size="lg"
          >
            {isCheckingPayment ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                Checking...
              </>
            ) : (
              <>
                <RefreshCw className="w-5 h-5 mr-2" />
                Check Payment Status
              </>
            )}
          </Button>
          {!payerInfo?.email && (
            <p className="text-xs text-red-500 mt-2 text-center">
              Please provide your email in the payment form to check status
            </p>
          )}
        </div>
      )}

      {/* Confirm Button */}
      <Button
        onClick={handleConfirmTransfer}
        disabled={isConfirmed || !hasValidAccountDetails || isCheckingPayment}
        className="w-full mb-4 bg-[#C29307] hover:bg-[#b38606] text-white disabled:bg-gray-400 disabled:cursor-not-allowed"
        size="lg"
      >
        {isConfirmed ? (
          <>
            <Check className="w-5 h-5 mr-2" />
            Payment Verified
          </>
        ) : isCheckingPayment ? (
          <>
            <Loader2 className="w-5 h-5 mr-2 animate-spin" />
            Verifying...
          </>
        ) : !hasValidAccountDetails ? (
          "Account Details Required"
        ) : (
          <>
            I've Made the Transfer
            <ArrowRight className="w-5 h-5 ml-2" />
          </>
        )}
      </Button>

      {/* Status Information */}
      {!isConfirmed && (
        <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <h4 className="font-semibold text-blue-800 mb-2 flex items-center gap-2">
            <Shield className="w-4 h-4" />
            Payment Verification
          </h4>
          <ul className="text-sm text-blue-700 space-y-1">
            <li>
              • We'll automatically check for your payment after you confirm
            </li>
            <li>• Payments typically verify within 1-5 minutes</li>
            <li>
              • Ensure <strong>{safeInvoiceDetails.invoiceId}</strong> is in the
              narration
            </li>
            <li>• You can also manually check status using the button above</li>
          </ul>
          {lastCheckTime && (
            <p className="text-xs text-blue-600 mt-3">
              Last checked: {lastCheckTime.toLocaleTimeString()}
            </p>
          )}
        </div>
      )}

      {/* Security Badge */}
      <div className="flex items-center justify-center gap-2 text-xs text-[#C29307] mt-6">
        <Shield className="w-4 h-4 text-[#C29307]" />
        <span>Secured by Zidwell Payment Protection</span>
      </div>
    </div>
  );
}

interface DetailRowProps {
  label: string;
  value: string;
  onCopy: () => void;
  isCopied: boolean;
  highlight?: boolean;
  isValid?: boolean | "";
}

function DetailRow({
  label,
  value,
  onCopy,
  isCopied,
  highlight,
  isValid = true,
}: DetailRowProps) {
  const isInvalidValue =
    !value || value === "Account details not provided" || value === "";

  return (
    <div className="flex items-center justify-between py-2 border-b border-border last:border-0">
      <div>
        <p className="text-xs text-muted-foreground mb-1">{label}</p>
        <p
          className={`font-medium ${
            highlight ? "text-[#C29307] font-mono" : "text-foreground"
          } ${isInvalidValue ? "text-gray-500 italic" : ""}`}
        >
          {isInvalidValue ? "Not provided in invoice" : value}
        </p>
      </div>
      <Button
        variant="ghost"
        size="icon"
        onClick={onCopy}
        className="h-8 w-8 hover:bg-secondary"
        disabled={isInvalidValue}
      >
        {isCopied ? (
          <Check className="w-4 h-4 text-green-600" />
        ) : (
          <Copy className="w-4 h-4 text-muted-foreground" />
        )}
      </Button>
    </div>
  );
}
