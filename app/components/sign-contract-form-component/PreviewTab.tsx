"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import {
  FileText,
  Trash2,
  Edit,
  FileText as FileIcon,
  Download,
  Printer,
} from "lucide-react";
import { Button } from "@/app/components/ui/button";
import { Label } from "@/app/components/ui/label";
import { Input } from "@/app/components/ui/input";
import { Switch } from "@/app/components/ui/switch";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/app/components/ui/card";

interface AttachmentFile {
  file: File;
  name: string;
  size: number;
  type: string;
  previewUrl?: string;
}

interface PreviewTabProps {
  contractTitle: string;
  contractContent: string;
  receiverName: string;
  receiverEmail: string;
  receiverPhone?: string;
  attachments: AttachmentFile[];
  setActiveTab: (tab: string) => void;
  includeLawyerSignature?: boolean;
  onIncludeLawyerChange?: (include: boolean) => void;
  creatorName?: string;
  onCreatorNameChange?: (name: string) => void;
  creatorSignature?: string | null;
  onSignatureChange?: (signature: string | null) => void;
}

const PreviewTab: React.FC<PreviewTabProps> = ({
  contractTitle,
  contractContent,
  receiverName,
  receiverEmail,
  receiverPhone,
  attachments,
  setActiveTab,
  includeLawyerSignature = false,
  onIncludeLawyerChange,
  creatorName = "",
  onCreatorNameChange,
  creatorSignature = null,
  onSignatureChange,
}) => {
  const [isDrawing, setIsDrawing] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [localCreatorName, setLocalCreatorName] = useState(creatorName);
  const [localSignature, setLocalSignature] = useState(creatorSignature);
  const [canvasSize, setCanvasSize] = useState({ width: 400, height: 150 });

  // Update canvas size based on container
  useEffect(() => {
    const updateCanvasSize = () => {
      if (containerRef.current) {
        const containerWidth = containerRef.current.clientWidth;
        const width = Math.min(400, containerWidth);
        const height = Math.max(120, width * 0.35);
        setCanvasSize({ width, height });
      }
    };

    updateCanvasSize();
    window.addEventListener("resize", updateCanvasSize);
    return () => window.removeEventListener("resize", updateCanvasSize);
  }, []);

  // Initialize canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Set canvas background
    ctx.fillStyle = "white";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Set drawing styles
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = "#000000";

    // If there's a saved signature, draw it
    if (localSignature) {
      const img = new Image();
      img.onload = () => {
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      };
      img.src = localSignature;
    }
  }, [localSignature, canvasSize]);

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

    // Calculate scale factors
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
    setLocalSignature(dataUrl);
    onSignatureChange?.(dataUrl);
  }, [isDrawing, onSignatureChange]);

  const clearSignature = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "white";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    setLocalSignature(null);
    onSignatureChange?.(null);
  }, [onSignatureChange]);

  const handleCreatorNameChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const name = e.target.value;
      setLocalCreatorName(name);
      onCreatorNameChange?.(name);
    },
    [onCreatorNameChange]
  );

  // REMOVED: No longer need local state for lawyer toggle
  // Use the prop directly and call the parent handler
  const handleLawyerToggle = useCallback(
    (checked: boolean) => {
      // Call parent handler directly
      onIncludeLawyerChange?.(checked);
    },
    [onIncludeLawyerChange]
  );



  return (
    <Card className="border-border shadow-sm">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-[#C29307]">Contract Preview</CardTitle>
            <CardDescription>
              Review your contract document before sending
            </CardDescription>
          </div>
          {/* <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handlePrint}
              className="hidden print:hidden sm:flex"
            >
              <Printer className="h-4 w-4 mr-2" />
              Print
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleDownload}
              className="hidden print:hidden sm:flex"
            >
              <Download className="h-4 w-4 mr-2" />
              Download
            </Button>
          </div> */}
        </div>
      </CardHeader>
      <CardContent>
        {contractContent ? (
          <div className="space-y-8">
            {/* Document/PDF View */}
            <div className="bg-white border border-gray-300 rounded-lg shadow-lg overflow-hidden print:shadow-none print:border-none">
              {/* Document Header */}
              <div id="contract-document" className="p-6 min-h-[80vh] bg-white">
                {/* Contract Title */}
                <div className="mb-12 text-center">
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">
                    {contractTitle || "Untitled Contract"}
                  </h2>
                  <p className="text-gray-600">
                    Document ID: ZW-{Date.now().toString(36).toUpperCase()}
                  </p>
                  <p className="text-gray-600 mt-1">
                    Created:{" "}
                    {new Date().toLocaleDateString("en-NG", {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>

                {/* Parties Section */}
                <div className="mb-12">
                  <h3 className="text-lg font-semibold text-gray-900 mb-6 pb-2 border-b">
                    PARTIES TO THIS AGREEMENT
                  </h3>
                  <div className="grid md:grid-cols-2 gap-8">
                    <div className="space-y-4">
                      <div>
                        <h4 className="font-medium text-gray-700 mb-2">
                          CONTRACT CREATOR (First Party)
                        </h4>
                        <div className="bg-gray-50 p-4 rounded border">
                          <p className="font-semibold text-gray-900">
                            {localCreatorName || "[Your Name]"}
                          </p>
                          <p className="text-sm text-gray-600 mt-1">
                            Contract Initiator
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="space-y-4">
                      <div>
                        <h4 className="font-medium text-gray-700 mb-2">
                          SIGNEE (Second Party)
                        </h4>
                        <div className="bg-gray-50 p-4 rounded border">
                          <p className="font-semibold text-gray-900">
                            {receiverName || "[Signee Name]"}
                          </p>
                          {receiverEmail && (
                            <p className="text-sm text-gray-600 mt-1">
                              {receiverEmail}
                            </p>
                          )}
                          {receiverPhone && (
                            <p className="text-sm text-gray-600">
                              {receiverPhone}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Contract Content */}
                <div className="mb-12">
                  <h3 className="text-lg font-semibold text-gray-900 mb-6 pb-2 border-b">
                    TERMS AND CONDITIONS
                  </h3>
                  <div className="prose prose-sm max-w-none text-gray-700 leading-relaxed font-serif bg-gray-50 p-6 rounded border">
                    {contractContent ? (
                      <div
                        className="rich-text-content"
                        dangerouslySetInnerHTML={{
                          __html: contractContent.includes("<")
                            ? contractContent
                            : contractContent.replace(/\n/g, "<br>"),
                        }}
                      />
                    ) : (
                      <p className="text-gray-400 italic">
                        No contract content provided
                      </p>
                    )}
                  </div>
                </div>

                {/* Signatures Section */}
                <div className="mt-16">
                  <h3 className="text-lg font-semibold text-gray-900 mb-8 pb-2 border-b">
                    SIGNATURES
                  </h3>
                  <div
                    className={`grid gap-8 ${
                      includeLawyerSignature
                        ? "md:grid-cols-3"
                        : "md:grid-cols-2"
                    }`}
                  >
                    {/* Contract Creator Signature */}
                    <div className="space-y-4">
                      <div className="border-t border-gray-300 pt-4">
                        <p className="text-sm font-medium text-gray-700 mb-4 text-center">
                          PARTY A
                        </p>
                        <div className="h-32 border-b border-gray-300 flex items-end justify-center mb-4">
                          {localSignature ? (
                            <div className="text-center">
                              <img
                                src={localSignature}
                                alt="Creator signature"
                                className="h-20 object-contain mx-auto"
                              />
                            </div>
                          ) : (
                            <div className="h-20 w-40 border border-dashed border-gray-300 rounded flex items-center justify-center">
                              <p className="text-gray-400 text-sm">
                                Signature Required
                              </p>
                            </div>
                          )}
                        </div>
                        <div className="text-center">
                          <p className="font-semibold text-gray-900">
                            {localCreatorName || "[Your Name]"}
                          </p>
                          <p className="text-sm text-gray-600 mt-1">
                            First Party - Contract Creator
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Lawyer Signature (Conditional) */}
                    {includeLawyerSignature && ( // Use the prop directly
                      <div className="space-y-4">
                        <div className="border-t border-gray-300 pt-4">
                          <div className="flex items-center mb-4">
                            <div className="h-6 w-6 bg-[#C29307] rounded-full flex items-center justify-center mr-2">
                              <span className="text-white text-xs">✓</span>
                            </div>
                            <p className="text-sm font-medium text-[#C29307]">
                              LEGAL WITNESS SIGNATURE
                            </p>
                          </div>
                          <div className="h-32 border-b border-gray-300 flex items-end justify-center mb-4">
                            <div className="text-center">
                              <p className="text-gray-600 italic font-serif text-lg">
                                Barr. Adewale Johnson
                              </p>
                            </div>
                          </div>
                          <div className="text-center">
                            <p className="font-semibold text-gray-900">
                              Barr. Adewale Johnson
                            </p>
                            <p className="text-sm text-gray-600 mt-1">
                              Legal Counsel
                            </p>
                            <p className="text-xs bg-[#C29307]/10 text-[#C29307] px-2 py-1 rounded-full inline-block mt-2">
                              Verified Lawyer
                            </p>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Signee Signature */}
                    <div className="space-y-4">
                      <div className="border-t border-gray-300 pt-4">
                        <p className="text-sm font-medium text-gray-700 mb-4 text-center">
                          PARTY B
                        </p>
                        <div className="h-32 border-b border-gray-300 flex items-end justify-center mb-4">
                          <div className="text-center">
                            <p className="text-gray-400 italic font-serif text-lg">
                              {receiverName || "[Signee Name]"}
                            </p>
                          </div>
                        </div>
                        <div className="text-center">
                          <p className="font-semibold text-gray-900">
                            {receiverName || "[Signee Name]"}
                          </p>
                          <p className="text-sm text-gray-600 mt-1">
                            Second Party - Signee
                          </p>
                          <p className="text-xs text-gray-400 italic mt-2">
                            (Awaiting signature)
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Document Footer */}
                <div className="mt-16 pt-8 border-t border-gray-300">
                  <div className="flex flex-col md:flex-row justify-between items-center text-xs text-gray-500">
                    <div className="mb-4 md:mb-0">
                      <p>Page 1 of 1</p>
                      <p className="mt-1">
                        This document is electronically generated and legally
                        binding
                      </p>
                    </div>
                    <div className="text-center md:text-right">
                      <p>Zidwell Legal Contract System</p>
                      <p className="mt-1">www.zidwell.com • info@zidwell.com</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Attachments Section */}
            {attachments.length > 0 && (
              <div className="border border-gray-200 rounded-lg p-6 bg-gray-50">
                <h4 className="text-lg font-medium mb-4 text-gray-900 flex items-center">
                  <FileIcon className="h-5 w-5 mr-2 text-gray-600" />
                  Attached Documents ({attachments.length})
                </h4>
                <div className="space-y-3">
                  {attachments.map((attachment, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-4 border border-gray-200 rounded-lg bg-white hover:bg-gray-50"
                    >
                      <div className="flex items-center">
                        <FileText className="h-5 w-5 text-gray-500 mr-3" />
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            {attachment.name}
                          </p>
                          <p className="text-xs text-gray-500">
                            {(attachment.size / 1024).toFixed(0)} KB •{" "}
                            {attachment.type.split("/").pop()?.toUpperCase()}
                          </p>
                        </div>
                      </div>
                      <span className="text-xs px-2 py-1 bg-blue-100 text-blue-800 rounded-full">
                        Attached
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Interactive Signature Section */}
            <div className="border border-gray-200 rounded-lg p-6 bg-gray-50 print:hidden">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6">
                <div className="mb-4 sm:mb-0">
                  <h4 className="text-lg font-semibold text-gray-900">
                    Add Your Signature
                  </h4>
                  <p className="text-sm text-gray-600">
                    Draw your signature to complete the contract
                  </p>
                </div>
                {localSignature && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={clearSignature}
                    className="border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700 w-full sm:w-auto"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Clear Signature
                  </Button>
                )}
              </div>

              <div className="space-y-6">
                <div className="space-y-2">
                  <Label
                    htmlFor="creator-name"
                    className="text-gray-700 font-medium"
                  >
                    Your Full Legal Name *
                  </Label>
                  <Input
                    id="creator-name"
                    value={localCreatorName}
                    onChange={handleCreatorNameChange}
                    placeholder="Enter your full legal name as it should appear on the contract"
                    className="max-w-md"
                  />
                </div>

                <div className="space-y-3">
                  <Label className="text-gray-700 font-medium">
                    Draw Your Signature *
                  </Label>
                  <div
                    ref={containerRef}
                    className="bg-white rounded-lg border-2 border-dashed border-gray-300 overflow-hidden max-w-lg"
                  >
                    <canvas
                      ref={canvasRef}
                      width={canvasSize.width}
                      height={canvasSize.height}
                      className="cursor-crosshair touch-none block w-full h-auto"
                      style={{
                        width: "100%",
                        height: "auto",
                        maxHeight: "150px",
                      }}
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
                      Click and drag to draw your signature, or use your finger
                      on touch devices
                    </p>
                  </div>
                </div>

                {/* Lawyer Toggle */}
                {/* <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg bg-white max-w-md">
                  <div className="space-y-1">
                    <div className="flex items-center">
                      <Label
                        htmlFor="lawyer-toggle"
                        className="cursor-pointer text-gray-700 font-medium"
                      >
                        Add Lawyer's Signature
                      </Label>
                      <span className="ml-2 text-xs px-2 py-0.5 bg-[#C29307]/10 text-[#C29307] rounded-full">
                        +₦10,000
                      </span>
                    </div>
                    <p className="text-xs text-gray-500">
                      Includes professional legal witness for added validity
                    </p>
                  </div>
                  <Switch
                    id="lawyer-toggle"
                    checked={includeLawyerSignature} // Use prop directly
                    onCheckedChange={handleLawyerToggle}
                    className="data-[state=checked]:bg-[#C29307] flex-shrink-0"
                  />
                </div> */}
              </div>
            </div>

            {/* Navigation Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 pt-6 border-t border-gray-200 print:hidden">
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => setActiveTab("create")}
                  className="flex-1"
                >
                  <Edit className="h-4 w-4 mr-2" />
                  Back To Edit Contract
                </Button>
                {/* <Button
                  variant="outline"
                  onClick={() => setActiveTab("upload")}
                  className="flex-1"
                >
                  <FileIcon className="h-4 w-4 mr-2" />
                  Manage Attachments
                </Button> */}
              </div>
             
            </div>
          </div>
        ) : (
          <div className="text-center py-12">
            <div className="max-w-md mx-auto">
              <div className="h-16 w-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <FileText className="h-8 w-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                No contract content to preview
              </h3>
              <p className="text-gray-600 mb-6">
                Switch to the "Write Contract" tab to create your contract
                document
              </p>
              <Button
                variant="default"
                onClick={() => setActiveTab("create")}
                className="bg-[#C29307] hover:bg-[#b38606]"
              >
                <Edit className="h-4 w-4 mr-2" />
                Write Contract
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default PreviewTab;
