"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { Button } from "@/app/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/app/components/ui/card";
import { Badge } from "@/app/components/ui/badge";
import { Label } from "@/app/components/ui/label";
import { Input } from "@/app/components/ui/input";
import { Switch } from "@/app/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/app/components/ui/dialog";
import {
  CheckCircle,
  XCircle,
  Undo2,
  Trash2,
  Shield,
  Fingerprint,
  AlertCircle,
  Loader2,
  Save,
  Clock,
  Eye,
  EyeOff,
  Lock,
  Mail,
} from "lucide-react";
import Swal from "sweetalert2";
import confetti from "canvas-confetti";

interface SignaturePanelProps {
  contractId: string;
  contractToken: string;
  signeeName: string;
  signeeEmail: string;
  onSignatureComplete: (signatureData: string) => void;
  onCancel: () => void;
}

export const SignaturePanel = ({
  contractId,
  contractToken,
  signeeName,
  signeeEmail,
  onSignatureComplete,
  onCancel,
}: SignaturePanelProps) => {
  const [step, setStep] = useState<
    "verification" | "signature" | "review" | "confirm"
  >("verification");
  const [isDrawing, setIsDrawing] = useState(false);
  const [signatureData, setSignatureData] = useState<string | null>(null);
  const [typedName, setTypedName] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);
  const [showSignature, setShowSignature] = useState(true);
  const [isSigning, setIsSigning] = useState(false);
  const [signingTimestamp, setSigningTimestamp] = useState<string | null>(null);
  const [isBiometricEnabled, setIsBiometricEnabled] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const [canvasInitialized, setCanvasInitialized] = useState(false);
  const [isSendingCode, setIsSendingCode] = useState(false);
  const [codeSent, setCodeSent] = useState(false);
  const [sendCooldown, setSendCooldown] = useState(0);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [canvasSize, setCanvasSize] = useState({ width: 500, height: 200 });

  // Confetti function - same as in Transfer component
  const triggerConfetti = () => {
    // Main burst
    confetti({
      particleCount: 150,
      spread: 70,
      origin: { y: 0.6 },
      colors: ["#C29307", "#ffd700", "#ffed4e", "#ffffff", "#fbbf24"],
    });

    // Side bursts
    setTimeout(() => {
      confetti({
        particleCount: 80,
        angle: 60,
        spread: 55,
        origin: { x: 0 },
        colors: ["#C29307", "#ffd700", "#ffed4e"],
      });
      confetti({
        particleCount: 80,
        angle: 120,
        spread: 55,
        origin: { x: 1 },
        colors: ["#C29307", "#ffd700", "#ffed4e"],
      });
    }, 150);

    // Additional bursts for more celebration
    setTimeout(() => {
      confetti({
        particleCount: 100,
        spread: 100,
        origin: { y: 0.8 },
        colors: ["#C29307", "#ffd700", "#ffed4e"],
      });
    }, 300);
  };

  // Initialize canvas size
  useEffect(() => {
    const updateCanvasSize = () => {
      if (containerRef.current) {
        const containerWidth = containerRef.current.clientWidth;
        const width = Math.min(500, containerWidth - 32);
        const height = Math.max(150, width * 0.4);
        setCanvasSize({ width, height });
      }
    };

    updateCanvasSize();
    window.addEventListener("resize", updateCanvasSize);
    return () => window.removeEventListener("resize", updateCanvasSize);
  }, []);

  // Show success notification with SweetAlert
  const showSuccessAlert = (title: string, text: string) => {
    return Swal.fire({
      title,
      text,
      icon: "success",
      confirmButtonText: "OK",
      confirmButtonColor: "#C29307",
      background: "#fafafa",
      iconColor: "#C29307",
      timer: 3000,
      timerProgressBar: true,
    });
  };

  // Show error notification with SweetAlert
  const showErrorAlert = (title: string, text: string) => {
    return Swal.fire({
      title,
      text,
      icon: "error",
      confirmButtonText: "OK",
      confirmButtonColor: "#ef4444",
      background: "#fafafa",
      iconColor: "#ef4444",
    });
  };

  // Show warning notification with SweetAlert
  const showWarningAlert = (title: string, text: string) => {
    return Swal.fire({
      title,
      text,
      icon: "warning",
      confirmButtonText: "OK",
      confirmButtonColor: "#f59e0b",
      background: "#fafafa",
      iconColor: "#f59e0b",
    });
  };

  // Show info notification with SweetAlert
  const showInfoAlert = (title: string, text: string) => {
    return Swal.fire({
      title,
      text,
      icon: "info",
      confirmButtonText: "OK",
      confirmButtonColor: "#3b82f6",
      background: "#fafafa",
      iconColor: "#3b82f6",
    });
  };

  // Initialize canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || canvasInitialized) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Set canvas background
    ctx.fillStyle = "white";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Set drawing styles
    ctx.lineWidth = 2.5;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = "#1a1a1a";

    // Draw guide line
    ctx.setLineDash([5, 5]);
    ctx.beginPath();
    ctx.moveTo(20, canvas.height - 30);
    ctx.lineTo(canvas.width - 20, canvas.height - 30);
    ctx.stroke();
    ctx.setLineDash([]);

    // Draw "X" mark on the line
    ctx.fillStyle = "#666";
    ctx.font = "12px Arial";
    ctx.fillText("✗", 10, canvas.height - 20);
    ctx.fillText("✗", canvas.width - 15, canvas.height - 20);

    setCanvasInitialized(true);
  }, [canvasSize, canvasInitialized]);

  // Initialize with signee name
  useEffect(() => {
    if (signeeName) {
      setTypedName(signeeName);
    }
  }, [signeeName]);

  // Check if WebAuthn (biometric) is available
  useEffect(() => {
    if (typeof window !== "undefined" && window.PublicKeyCredential) {
      setIsBiometricEnabled(true);
    }
  }, []);

  // Handle cooldown timer for sending verification code
  useEffect(() => {
    if (sendCooldown > 0) {
      const timer = setInterval(() => {
        setSendCooldown((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [sendCooldown]);

  const getCanvasCoordinates = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };

    const rect = canvas.getBoundingClientRect();
    let clientX, clientY;

    if ("touches" in e) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    const x = (clientX - rect.left) * scaleX;
    const y = (clientY - rect.top) * scaleY;

    return { x, y };
  };

  const startDrawing = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    setIsDrawing(true);

    const { x, y } = getCanvasCoordinates(e);

    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = "#1a1a1a";
  }, []);

  const draw = useCallback(
    (e: React.MouseEvent | React.TouchEvent) => {
      e.preventDefault();
      if (!isDrawing) return;

      const canvas = canvasRef.current;
      if (!canvas) return;

      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const { x, y } = getCanvasCoordinates(e);

      ctx.lineTo(x, y);
      ctx.stroke();
    },
    [isDrawing]
  );

  const stopDrawing = useCallback(() => {
    if (!isDrawing) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.closePath();
    setIsDrawing(false);

    // Save the signature
    const dataUrl = canvas.toDataURL("image/png");
    setSignatureData(dataUrl);
  }, [isDrawing]);

  const clearSignature = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Reset background
    ctx.fillStyle = "white";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Redraw guide line
    ctx.setLineDash([5, 5]);
    ctx.beginPath();
    ctx.moveTo(20, canvas.height - 30);
    ctx.lineTo(canvas.width - 20, canvas.height - 30);
    ctx.stroke();
    ctx.setLineDash([]);

    // Draw "X" mark on the line
    ctx.fillStyle = "#666";
    ctx.font = "12px Arial";
    ctx.fillText("✗", 10, canvas.height - 20);
    ctx.fillText("✗", canvas.width - 15, canvas.height - 20);

    setSignatureData(null);
  }, []);

  const undoLastStroke = useCallback(() => {
    // For simplicity, we'll clear and start over
    // In a production app, you'd implement proper undo functionality
    showInfoAlert("Tip", "Clear and start over for best results");
  }, []);

  const handleVerification = async () => {
    setIsVerifying(true);
    if (!verificationCode || verificationCode.length !== 6) {
      showErrorAlert(
        "Invalid Code",
        "Please enter a valid 6-digit verification code"
      );
      return;
    }

    try {
      const response = await fetch("/api/contract/verify-signature-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contractToken,
          signeeEmail,
          verificationCode,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Verification failed");
      }

      setStep("signature");
      setIsVerifying(false);
      showSuccessAlert(
        "Verified!",
        "Identity verified successfully. You can now sign the contract."
      );
    } catch (error) {
      setIsVerifying(false);
      const newAttempts = attempts + 1;
      setAttempts(newAttempts);

      if (newAttempts >= 3) {
        showErrorAlert(
          "Too Many Attempts",
          "Please request a new verification code"
        );
        setVerificationCode("");
      } else {
        showErrorAlert(
          "Verification Failed",
          error instanceof Error ? error.message : "Invalid verification code"
        );
      }
    }
  };

  const handleSendVerificationCode = async () => {
    if (sendCooldown > 0) return;

    setIsSendingCode(true);
    setCodeSent(false);

    try {
      const response = await fetch("/api/contract/send-signature-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contractToken,
          signeeEmail,
          signeeName,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to send code");
      }

      setCodeSent(true);
      setSendCooldown(60);
      showSuccessAlert(
        "Code Sent!",
        "Check your email for the verification code"
      );
    } catch (error) {
      showErrorAlert(
        "Error",
        error instanceof Error ? error.message : "Failed to send code"
      );
    } finally {
      setIsSendingCode(false);
    }
  };

  const handleBiometricSign = async () => {
    if (!isBiometricEnabled) {
      showErrorAlert(
        "Biometric Not Available",
        "Your device doesn't support biometric authentication"
      );
      return;
    }

    try {
      // WebAuthn implementation
      const credential = await navigator.credentials.create({
        publicKey: {
          challenge: new Uint8Array(32),
          rp: {
            name: "Zidwell Contracts",
            id: window.location.hostname,
          },
          user: {
            id: new Uint8Array(16),
            name: signeeEmail,
            displayName: signeeName,
          },
          pubKeyCredParams: [
            { type: "public-key", alg: -7 },
            { type: "public-key", alg: -257 },
          ],
          authenticatorSelection: {
            authenticatorAttachment: "platform",
            userVerification: "required",
          },
          timeout: 60000,
          attestation: "direct",
        },
      });

      if (credential) {
        setStep("review");
        showSuccessAlert(
          "Biometric Verified!",
          "Your identity has been verified with biometrics"
        );
      }
    } catch (error) {
      showErrorAlert(
        "Biometric Failed",
        "Please use traditional signature method"
      );
    }
  };

  const handleProceedToSignature = () => {
    if (!signatureData) {
      showErrorAlert(
        "Signature Required",
        "Please provide your signature before proceeding"
      );
      return;
    }

    if (!typedName.trim()) {
      showErrorAlert("Name Required", "Please enter your full name");
      return;
    }

    setSigningTimestamp(new Date().toISOString());
    setStep("review");
  };

  const handleConfirmSign = async () => {
    setIsSigning(true);

    try {
      if (!signatureData) {
        throw new Error("No signature data available");
      }

      const response = await fetch("/api/contract/sign-contract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contractToken,
          signeeName: typedName,
          signeeEmail,
          signatureImage: signatureData,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to sign contract");
      }

      // First close the SignaturePanel
      onSignatureComplete(signatureData);

      // Small delay to ensure panel is closed before showing confetti
      setTimeout(() => {
        // Trigger confetti after panel is closed
        triggerConfetti();

        // Show success message
        Swal.fire({
          title: "🎉 Contract Signed Successfully!",
          html: `
          <div class="text-center">
            <div class="mb-4">
              <div class="inline-flex items-center justify-center w-16 h-16 rounded-full bg-[#FEFCE8] mb-3">
                <svg class="w-8 h-8 text-[#C29307]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
                </svg>
              </div>
              <h3 class="text-lg font-bold text-gray-900 mb-2">Contract Signed!</h3>
            
            </div>
            <div class="space-y-2 text-gray-600">
              <p class="flex items-center justify-center gap-1">
                <svg class="w-4 h-4 text-[#C29307]" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"></path>
                </svg>
                Digital signature recorded
              </p>
              <p class="flex items-center justify-center gap-1">
                <svg class="w-4 h-4 text-[#C29307]" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"></path>
                </svg>
                Legal certificate generated
              </p>
              <p class="flex items-center justify-center gap-1">
                <svg class="w-4 h-4 text-[#C29307]" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"></path>
                </svg>
                Email sent with signed copy
              </p>
            </div>
          </div>
        `,
          icon: "success",
          showConfirmButton: false,
          background: "#fafafa",
          iconColor: "#10b981",
          allowOutsideClick: false,
          allowEscapeKey: false,
          timer: 3000,
          timerProgressBar: true,
        }).then(() => {
          // Refresh the page after SweetAlert closes
          window.location.reload();
        });

        // Backup refresh in case SweetAlert has issues
        setTimeout(() => {
          window.location.reload();
        }, 4000);
      }, 300);
    } catch (error) {
      // Show error and reset signing state
      showErrorAlert(
        "Error",
        error instanceof Error ? error.message : "Failed to sign contract"
      );
      setIsSigning(false);
    }
  };
  return (
    <Dialog open={true} onOpenChange={(open) => !open && onCancel()}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-[#C29307]" />
            Secure Signature Panel
          </DialogTitle>
         
        </DialogHeader>

        {/* Verification Step */}
        {step === "verification" && (
          <div className="space-y-6 py-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <Shield className="h-5 w-5 text-blue-600 mt-0.5" />
                <div>
                  <h4 className="font-semibold text-blue-800">
                    Two-Factor Authentication Required
                  </h4>
                  <p className="text-sm text-blue-700 mt-1">
                    For security, we need to verify it's really you before
                    signing.
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="verificationCode">
                  Email Verification Code *
                </Label>
                <div className="flex gap-2">
                  <Input
                    id="verificationCode"
                    value={verificationCode}
                    onChange={(e) =>
                      setVerificationCode(
                        e.target.value.replace(/\D/g, "").slice(0, 6)
                      )
                    }
                    placeholder="Enter 6-digit code"
                    maxLength={6}
                    className="text-center text-lg tracking-widest"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleSendVerificationCode}
                    className="whitespace-nowrap min-w-[120px]"
                    disabled={isSendingCode || sendCooldown > 0}
                  >
                    {isSendingCode ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Sending...
                      </>
                    ) : sendCooldown > 0 ? (
                      `Resend (${sendCooldown}s)`
                    ) : codeSent ? (
                      <>
                        <Mail className="h-4 w-4 mr-2" />
                        Resend Code
                      </>
                    ) : (
                      "Send Code"
                    )}
                  </Button>
                </div>
                <p className="text-xs text-gray-500">
                  {codeSent
                    ? `A 6-digit verification code has been sent to ${signeeEmail}`
                    : `Enter the verification code sent to ${signeeEmail}`}
                </p>
              </div>
              {/* 
              {isBiometricEnabled && (
                <div className="pt-4 border-t">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Fingerprint className="h-5 w-5 text-[#C29307]" />
                        <span className="font-medium">
                          Quick Biometric Sign
                        </span>
                        <Badge variant="outline" className="ml-2">
                          Recommended
                        </Badge>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleBiometricSign}
                        className="border-[#C29307] text-[#C29307] hover:bg-[#C29307]/10"
                      >
                        Use Biometric
                      </Button>
                    </div>
                    <p className="text-xs text-gray-500">
                      Sign securely using your device's fingerprint or face
                      recognition
                    </p>
                  </div>
                </div>
              )} */}

              <div className="flex gap-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1"
                  onClick={onCancel}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  className="flex-1 bg-[#C29307] hover:bg-[#b38606]"
                  onClick={handleVerification}
                  disabled={!verificationCode || verificationCode.length !== 6}
                >
                  {isVerifying ? (
                    <span className="flex items-center gap-2">
                      {" "}
                      <Loader2 className="h-4 w-4 animate-spin" />{" "}
                      Checking....
                    </span>
                  ) : (
                    "Verify & Continue"
                  )}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Signature Step */}
        {step === "signature" && (
          <div className="space-y-6 py-4">
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5" />
                <div>
                  <h4 className="font-semibold text-amber-800">Legal Notice</h4>
                  <p className="text-sm text-amber-700 mt-1">
                    Your signature is legally binding. By signing, you
                    acknowledge that you have read, understood, and agree to all
                    terms of this contract.
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="typedName">Contract Creator Name *</Label>
                <Input
                  id="typedName"
                  value={typedName}
                  onChange={(e) => setTypedName(e.target.value)}
                  placeholder="Enter your full name as it should appear on the contract"
                  className="text-lg"
                  disabled
                />
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-gray-700 font-medium">
                    Draw Your Signature *
                  </Label>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={undoLastStroke}
                      className="h-8"
                    >
                      <Undo2 className="h-4 w-4 mr-1" />
                      Undo
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={clearSignature}
                      className="h-8 text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="h-4 w-4 mr-1" />
                      Clear
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowSignature(!showSignature)}
                      className="h-8"
                    >
                      {showSignature ? (
                        <>
                          <EyeOff className="h-4 w-4 mr-1" />
                          Hide
                        </>
                      ) : (
                        <>
                          <Eye className="h-4 w-4 mr-1" />
                          Show
                        </>
                      )}
                    </Button>
                  </div>
                </div>

                <div
                  ref={containerRef}
                  className="bg-white rounded-lg border-2 border-gray-300 overflow-hidden shadow-sm"
                >
                  <canvas
                    ref={canvasRef}
                    width={canvasSize.width}
                    height={canvasSize.height}
                    className="w-full h-48 cursor-crosshair touch-none bg-white"
                    onMouseDown={startDrawing}
                    onMouseMove={draw}
                    onMouseUp={stopDrawing}
                    onMouseLeave={stopDrawing}
                    onTouchStart={startDrawing}
                    onTouchMove={draw}
                    onTouchEnd={stopDrawing}
                  />
                </div>

                <div className="flex items-start text-xs text-gray-500">
                  <div className="h-2 w-2 bg-gray-400 rounded-full mr-2 mt-1 flex-shrink-0"></div>
                  <p>
                    Click and drag to draw your signature. For best results,
                    sign along the dotted line.
                  </p>
                </div>
              </div>

            

              <div className="flex gap-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1"
                  onClick={() => setStep("verification")}
                >
                  Back
                </Button>
                <Button
                  type="button"
                  className="flex-1 bg-[#C29307] hover:bg-[#b38606]"
                  onClick={handleProceedToSignature}
                  disabled={!signatureData || !typedName.trim()}
                >
                  <Save className="h-4 w-4 mr-2" />
                  Save & Continue
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Review Step */}
        {step === "review" && (
          <div className="space-y-6 py-4">
            <div className="text-center">
              <CheckCircle className="h-16 w-16 text-[#C29307] mx-auto mb-4" />
              <h3 className="text-xl font-bold text-gray-900 mb-2">
                Review Your Signature
              </h3>
              <p className="text-gray-600">
                Please verify your signature before final submission
              </p>
            </div>

            <div className="space-y-6">
              <div className="bg-white border border-gray-200 rounded-lg p-6">
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div>
                      <h4 className="font-medium text-gray-700 mb-2">
                        Signatory Information
                      </h4>
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-500">Name:</span>
                          <span className="font-medium">{typedName}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-500">Email:</span>
                          <span className="font-medium">{signeeEmail}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-500">
                            Signed At:
                          </span>
                          <span className="font-medium">
                            {signingTimestamp
                              ? new Date(signingTimestamp).toLocaleString()
                              : "Pending"}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h4 className="font-medium text-gray-700 mb-2">
                      Your Signature
                    </h4>
                    <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 flex items-center justify-center h-32">
                      {signatureData ? (
                        <img
                          src={signatureData}
                          alt="Your signature"
                          className="max-h-20 object-contain"
                        />
                      ) : (
                        <p className="text-gray-400 italic">
                          No signature captured
                        </p>
                      )}
                    </div>
                   
                  </div>
                </div>
              </div>

              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <AlertCircle className="h-5 w-5 text-red-600 mt-0.5" />
                  <div>
                    <h4 className="font-semibold text-red-800">
                      Final Warning
                    </h4>
                    <p className="text-sm text-red-700 mt-1">
                      Once confirmed, this action cannot be undone. Your
                      signature will be legally binding.
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1"
                  onClick={() => setStep("signature")}
                  disabled={isSigning}
                >
                  Edit Signature
                </Button>
                <Button
                  type="button"
                  className="flex-1 bg-red-600 hover:bg-red-700"
                  onClick={handleConfirmSign}
                  disabled={isSigning}
                >
                  {isSigning ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    "Confirm & Sign Contract"
                  )}
                </Button>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
