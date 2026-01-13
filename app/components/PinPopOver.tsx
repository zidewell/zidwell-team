"use client";

import { useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "./ui/button";
import { Loader2 } from "lucide-react";

interface PinPopOverProps {
  setIsOpen: (isOpen: boolean) => void;
  isOpen: boolean;
  pin: string[];
  setPin: (pin: string[]) => void;
  inputCount: number;
  onConfirm?: (code: string) => Promise<void> | void; 
  invoiceFeeInfo?: {
    isFree: boolean;
    freeInvoicesLeft: number;
    totalInvoicesCreated: number;
    feeAmount: number;
  };
}

export default function PinPopOver({
  setIsOpen,
  isOpen,
  pin,
  setPin,
  inputCount,
  onConfirm,
  invoiceFeeInfo,
}: PinPopOverProps) {
  const inputsRef = useRef<(HTMLInputElement | null)[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  // ✅ Handle input change
  const handleInput = (index: number, value: string) => {
    if (isProcessing) return; // Prevent input changes when processing
    if (!/^\d?$/.test(value)) return;
    const newOtp = [...pin];
    newOtp[index] = value;
    setPin(newOtp);
    if (value && index < inputCount - 1) {
      inputsRef.current[index + 1]?.focus();
    }
  };

  // ✅ Handle keyboard navigation
  const handleKeyDown = (
    e: React.KeyboardEvent<HTMLInputElement>,
    index: number
  ) => {
    if (isProcessing) return; // Prevent keyboard navigation when processing
    if (e.key === "Backspace" || e.key === "Delete") {
      if (!pin[index] && index > 0) {
        inputsRef.current[index - 1]?.focus();
      }
    }
  };

  // ✅ Handle paste event
  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    if (isProcessing) return; // Prevent paste when processing
    e.preventDefault();
    const text = e.clipboardData.getData("text").trim();
    if (!new RegExp(`^[0-9]{${inputCount}}$`).test(text)) return;
    const digits = text.split("");
    setPin(digits);
    inputsRef.current[inputCount - 1]?.focus();
  };

  // ✅ Handle form submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const code = pin.join("");
    
    // Prevent submission if already processing or PIN is incomplete
    if (isProcessing || code.length !== inputCount) return;

    // Start loading
    setIsProcessing(true);

    try {
      if (onConfirm) {
        // If onConfirm returns a promise, await it
        const result = onConfirm(code);
        if (result && typeof result.then === 'function') {
          await result;
        }
      }

      // Don't close modal or clear PIN immediately - let parent component handle it
      // The parent will handle closing based on the result
      
    } catch (error) {
      console.error("Error during PIN confirmation:", error);
      // Reset on error
      setIsProcessing(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* 🔲 Backdrop */}
          <motion.div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => !isProcessing && setIsOpen(false)}
          />

          {/* 📤 Modal Container */}
          <motion.div
            className="fixed inset-0 flex items-center justify-center z-50 px-4"
            initial={{ opacity: 0, y: 60, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 40, scale: 0.95 }}
            transition={{ type: "spring", stiffness: 260, damping: 22 }}
          >
            <div className="max-w-md w-full text-center bg-white px-4 sm:px-8 py-10 rounded-xl shadow-xl relative">
          
              {/* Close button - only shown when not processing */}
              {!isProcessing && (
                <button
                  onClick={() => setIsOpen(false)}
                  className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
                  disabled={isProcessing}
                >
                  ✕
                </button>
              )}

              {/* Invoice Fee Information */}
              {invoiceFeeInfo && (
                <div
                  className={`mb-4 p-3 rounded-lg border ${
                    invoiceFeeInfo.isFree
                      ? "bg-green-50 border-green-200"
                      : "bg-yellow-50 border-yellow-200"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold">
                        {invoiceFeeInfo.isFree
                          ? "🎉 Free Invoice"
                          : "💰 Invoice Fee"}
                      </p>
                      
                    </div>
                    <div className="text-right">
                      <p
                        className={`text-xl font-bold ${
                          invoiceFeeInfo.isFree
                            ? "text-green-600"
                            : "text-[#C29307]"
                        }`}
                      >
                        {invoiceFeeInfo.isFree ? "FREE" : "₦100"}
                      </p>
                    
                    </div>
                  </div>
                </div>
              )}

              <header className="mb-8">
                <h1 className="text-2xl font-bold mb-1">
                  Transaction Pin Verification
                </h1>
                <p className="text-[15px] text-slate-500">
                  {isProcessing ? (
                    <span className="text-[#C29307] font-medium">
                      Processing transaction...
                    </span>
                  ) : (
                    <>
                      Input your 4-digit pin to complete transaction.
                      {invoiceFeeInfo?.isFree && (
                        <span className="block text-green-600 font-medium mt-1">
                          No payment required for this free invoice
                        </span>
                      )}
                    </>
                  )}
                </p>
              </header>

              <form onSubmit={handleSubmit}>
                <div className="flex items-center justify-center gap-3">
                  {pin.map((digit, i) => (
                    <input
                      key={i}
                      ref={(el) => {
                        inputsRef.current[i] = el;
                      }}
                      type="password"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      maxLength={1}
                      value={digit}
                      onChange={(e) => {
                        if (isProcessing) return;
                        const val = e.target.value.replace(/\D/g, "");
                        handleInput(i, val);
                      }}
                      onKeyDown={(e) => {
                        if (isProcessing) return;
                        handleKeyDown(e, i);
                      }}
                      onFocus={(e) => !isProcessing && e.target.select()}
                      onPaste={(e) => {
                        if (isProcessing) return;
                        handlePaste(e);
                      }}
                      className={`w-14 h-14 text-center text-2xl font-extrabold rounded p-4 outline-none transition-colors ${
                        isProcessing
                          ? 'bg-gray-100 text-gray-400 border-gray-300 cursor-not-allowed'
                          : 'text-slate-900 bg-slate-100 border border-transparent hover:border-slate-200 focus:bg-white focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100'
                      }`}
                      disabled={isProcessing}
                      readOnly={isProcessing}
                    />
                  ))}
                </div>

                <div className="max-w-[260px] mx-auto mt-6">
                  <Button
                    type="submit"
                    className={`w-full inline-flex justify-center items-center whitespace-nowrap rounded-lg px-3.5 py-2.5 text-sm font-medium text-white shadow-sm focus:outline-none focus:ring focus:ring-[#C29307] transition-colors duration-150 ${
                      isProcessing || pin.join("").length !== inputCount
                        ? 'bg-gray-400 cursor-not-allowed hover:bg-gray-400'
                        : 'bg-[#C29307] hover:bg-[#C29307]/90'
                    }`}
                    disabled={isProcessing || pin.join("").length !== inputCount}
                  >
                    {isProcessing ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Processing...
                      </>
                    ) : invoiceFeeInfo?.isFree ? (
                      "Confirm Free Invoice"
                    ) : (
                      "Confirm Payment"
                    )}
                  </Button>
                  
                
                </div>
              </form>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}