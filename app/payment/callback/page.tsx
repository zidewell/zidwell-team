"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Swal from "sweetalert2";

function PaymentCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(true);

  const invoiceId = searchParams.get("invoiceId");
  const status = searchParams.get("status");
  const paidAmount = searchParams.get("paidAmount");
  const totalAmount = searchParams.get("totalAmount");
  const allowMultiplePayments = searchParams.get("allowMultiplePayments") === "true";
  const error = searchParams.get("error");

  useEffect(() => {
    if (error) {
      Swal.fire({
        title: "Payment Failed ❌",
        text: "There was an issue processing your payment. Please try again.",
        icon: "error",
        confirmButtonText: "Try Again",
      }).then(() => {
        // The payment link is unlimited, so they can try again
        window.history.back();
      });
      setLoading(false);
      return;
    }

    if (status === "paid") {
      Swal.fire({
        title: "Payment Successful! 🎉",
        text: `Invoice #${invoiceId} has been fully paid. Thank you!`,
        icon: "success",
        confirmButtonText: "View Invoice",
      }).then(() => {
        router.push(`/invoice/${invoiceId}`);
      });
    } else if (status === "partially_paid" && allowMultiplePayments) {
      const remaining = Number(totalAmount) - Number(paidAmount);
      
      Swal.fire({
        title: "Payment Received! ✅",
        html: `
          <div class="text-left">
            <p>Thank you for your payment!</p>
            <p><strong>Amount Paid:</strong> ₦${Number(paidAmount).toLocaleString()}</p>
            <p><strong>Remaining Balance:</strong> ₦${remaining.toLocaleString()}</p>
            <p><strong>Total Amount:</strong> ₦${Number(totalAmount).toLocaleString()}</p>
            <p class="text-sm text-gray-600 mt-2">
              You can use the same payment link again to pay the remaining balance.
            </p>
          </div>
        `,
        icon: "info",
        showCancelButton: true,
        confirmButtonText: "Pay Remaining Balance",
        cancelButtonText: "View Invoice",
      }).then((result) => {
        if (result.isConfirmed) {
          // The same payment link will work for remaining balance
          window.history.back();
        } else {
          router.push(`/invoice/${invoiceId}`);
        }
      });
    } else {
      Swal.fire(
        "Payment Processing ⏳",
        "Your payment is being processed. Please wait...",
        "info"
      );
    }
    
    setLoading(false);
  }, [invoiceId, status, paidAmount, totalAmount, allowMultiplePayments, error, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        {loading ? (
          <>
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#C29307] mx-auto mb-4"></div>
            <p className="text-gray-600">Processing your payment...</p>
          </>
        ) : (
          <>
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <p className="text-gray-600">Redirecting you...</p>
          </>
        )}
      </div>
    </div>
  );
}

export default function PaymentCallback() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#C29307] mx-auto"></div>
      </div>
    }>
      <PaymentCallbackContent />
    </Suspense>
  );
}