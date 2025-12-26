"use client";

import React, {
  useState,
  useRef,
  useEffect,
  forwardRef,
  useImperativeHandle,
} from "react";
import {
  Upload,
  FileText,
  X,
  AlertCircle,
  Trash2,
  Eye,
  Loader2,
  Paperclip,
  CheckCircle,
  XCircle,
} from "lucide-react";
import { Button } from "../ui/button";
import { Alert, AlertDescription } from "../ui/alert";
import { Badge } from "../ui/badge";
import { Progress } from "../ui/progress";

export interface UploadedFile {
  fileName: string;
  originalName: string;
  fileUrl: string;
  fileSize: number;
  fileType: string;
  uploadedAt: string;
  storagePath: string;
  file?: File; // Store the actual File object
  uploadStatus?: "pending" | "uploading" | "success" | "error";
  uploadProgress?: number;
  errorMessage?: string;
}

export interface SignContractFileUploadRef {
  uploadFiles: () => Promise<{
    success: boolean;
    uploadedFiles?: UploadedFile[];
    error?: string;
  }>;
  clearAllFiles: () => void;
  getQueuedFiles: () => File[];
}

interface SignContractFileUploadProps {
  onUploadSuccess?: (data: any) => void;
  onUploadError?: (error: string) => void;
  userId: string;
  contractId: string;
  bucketName?: string;
  onFilesChange?: (files: UploadedFile[]) => void;
  disabled?: boolean;
  // New props for parent-controlled state
  queuedFiles?: UploadedFile[];
  onFileAdd?: (file: File) => UploadedFile;
  onFileRemove?: (index: number) => void;
  onFileUpdate?: (index: number, updates: Partial<UploadedFile>) => void;
}

const SignContractFileUpload = forwardRef<
  SignContractFileUploadRef,
  SignContractFileUploadProps
>(
  (
    {
      onUploadSuccess,
      onUploadError,
      userId,
      contractId,
      bucketName = "contracts",
      onFilesChange,
      disabled = false,
      // New props
      queuedFiles: externalQueuedFiles = [],
      onFileAdd,
      onFileRemove,
      onFileUpdate,
    },
    ref
  ) => {
    const [isDragging, setIsDragging] = useState(false);
    const [localQueuedFiles, setLocalQueuedFiles] = useState<UploadedFile[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [isUploading, setIsUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Use external queued files if provided, otherwise use local state
    const queuedFiles = externalQueuedFiles.length > 0 ? externalQueuedFiles : localQueuedFiles;

    // Expose methods via ref
    useImperativeHandle(ref, () => ({
      uploadFiles,
      clearAllFiles,
      getQueuedFiles: () => queuedFiles.map(f => f.file!).filter(Boolean),
    }));

    // Notify parent when local files change
    useEffect(() => {
      if (onFilesChange && externalQueuedFiles.length === 0) {
        onFilesChange(localQueuedFiles);
      }
    }, [localQueuedFiles, onFilesChange, externalQueuedFiles]);

    const validateFile = (file: File): { valid: boolean; error?: string } => {
      const allowedTypes = [
        "application/pdf",
        "application/msword",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "text/plain",
        "image/jpeg",
        "image/png",
        "image/jpg",
        "image/gif",
        "image/webp",
      ];

      const maxFileSize = 10 * 1024 * 1024; // 10MB

      // Check file type
      if (!allowedTypes.includes(file.type)) {
        return {
          valid: false,
          error:
            "Invalid file type. Please upload PDF, DOC, DOCX, TXT, JPEG, PNG, GIF, or WEBP files.",
        };
      }

      // Check file size
      if (file.size > maxFileSize) {
        return {
          valid: false,
          error: "File size too large. Maximum size is 10MB.",
        };
      }

      return { valid: true };
    };

    const formatFileSize = (bytes: number): string => {
      if (bytes === 0) return "0 Bytes";
      const k = 1024;
      const sizes = ["Bytes", "KB", "MB", "GB"];
      const i = Math.floor(Math.log(bytes) / Math.log(k));
      return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
    };

    const getFileIcon = (fileType: string) => {
      if (fileType.includes("pdf")) return "📄";
      if (fileType.includes("word") || fileType.includes("document")) return "📝";
      if (fileType.includes("image")) return "🖼️";
      if (fileType.includes("text")) return "📋";
      return "📎";
    };

    const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
      const files = event.target.files;
      if (!files || files.length === 0) return;

      // Show upload notification
      setError(null);
      setError("");

      // Handle each file
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        handleAddFile(file);
      }
      
      // Clear the input so same file can be selected again
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    };

    const handleDragOver = (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(true);
    };

    const handleDragLeave = (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
    };

    const handleDrop = (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);

      const files = e.dataTransfer.files;
      if (!files || files.length === 0) return;

      // Show upload notification
      setError(null);
      setError("");

      // Handle each dropped file
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        handleAddFile(file);
      }
    };

    const handleAddFile = (file: File) => {
      // Validate file
      const validation = validateFile(file);
      if (!validation.valid) {
        setError(validation.error || "Invalid file");
        return;
      }

      let fileObj: UploadedFile;
      
      if (onFileAdd) {
        // Use parent's function to create file object
        fileObj = onFileAdd(file);
      } else {
        // Create a file object locally
        fileObj = {
          fileName: file.name,
          originalName: file.name,
          fileUrl: URL.createObjectURL(file),
          fileSize: file.size,
          fileType: file.type,
          uploadedAt: new Date().toISOString(),
          storagePath: `pending/${userId}/${contractId}/${Date.now()}_${file.name}`,
          file: file,
          uploadStatus: "pending" as const,
          uploadProgress: 0,
        };
        
        // Update local state
        setLocalQueuedFiles(prev => [...prev, fileObj]);
      }

      // Notify parent
      onUploadSuccess?.({
        success: true,
        message: "File added to queue",
        data: fileObj,
      });

      // Show success message in UI
      setError("");
    };

    const handleRemoveFile = (index: number) => {
      // Revoke the object URL
      const fileToRemove = queuedFiles[index];
      if (fileToRemove.fileUrl.startsWith("blob:")) {
        URL.revokeObjectURL(fileToRemove.fileUrl);
      }

      if (onFileRemove) {
        // Call parent to remove file
        onFileRemove(index);
      } else {
        // Remove from local state
        setLocalQueuedFiles(prev => prev.filter((_, i) => i !== index));
      }
    };

    const handleBrowseClick = () => {
      if (!disabled) {
        fileInputRef.current?.click();
      }
    };

    const updateFileStatus = (index: number, updates: Partial<UploadedFile>) => {
      if (onFileUpdate) {
        onFileUpdate(index, updates);
      } else {
        setLocalQueuedFiles(prev => 
          prev.map((file, i) => 
            i === index ? { ...file, ...updates } : file
          )
        );
      }
    };

    const uploadFiles = async (): Promise<{
      success: boolean;
      uploadedFiles?: UploadedFile[];
      error?: string;
    }> => {
      if (queuedFiles.length === 0) {
        return { success: true, uploadedFiles: [] };
      }

      setIsUploading(true);
      setError(null);

      try {
        const uploadedResults: UploadedFile[] = [];
        
        // Upload each file to the API
        for (let i = 0; i < queuedFiles.length; i++) {
          const queuedFile = queuedFiles[i];
          const file = queuedFile.file;
          
          if (!file) continue;

          // Update status to uploading
          updateFileStatus(i, { 
            uploadStatus: "uploading", 
            uploadProgress: 0 
          });

          const formData = new FormData();
          formData.append("file", file);
          formData.append("userId", userId);
          formData.append("contractId", contractId);
          formData.append("bucketName", bucketName);
          formData.append("isSubmitted", "true");

          // Create XMLHttpRequest for progress tracking
          const xhr = new XMLHttpRequest();
          
          // Track upload progress
          xhr.upload.addEventListener("progress", (event) => {
            if (event.lengthComputable) {
              const progress = Math.round((event.loaded / event.total) * 100);
              updateFileStatus(i, { uploadProgress: progress });
            }
          });

          const uploadPromise = new Promise<UploadedFile>((resolve, reject) => {
            xhr.onload = () => {
              if (xhr.status >= 200 && xhr.status < 300) {
                const result = JSON.parse(xhr.responseText);
                
                const uploadedFile: UploadedFile = {
                  fileName: result.data.fileName,
                  originalName: result.data.originalName,
                  fileUrl: result.data.fileUrl,
                  fileSize: result.data.fileSize,
                  fileType: result.data.fileType,
                  uploadedAt: result.data.uploadedAt,
                  storagePath: result.data.storagePath,
                  file: undefined,
                  uploadStatus: "success" as const,
                  uploadProgress: 100,
                };
                
                resolve(uploadedFile);
              } else {
                const result = JSON.parse(xhr.responseText || '{}');
                reject(new Error(result.error || `Upload failed with status ${xhr.status}`));
              }
            };
            
            xhr.onerror = () => {
              reject(new Error("Network error during upload"));
            };
            
            xhr.open("POST", "/api/send-contracts/upload-contract-file");
            xhr.send(formData);
          });

          try {
            const uploadedFile = await uploadPromise;
            uploadedResults.push(uploadedFile);
            
            // Update status to success
            updateFileStatus(i, { 
              uploadStatus: "success", 
              uploadProgress: 100 
            });
            
            // Revoke the blob URL
            if (queuedFile.fileUrl.startsWith("blob:")) {
              URL.revokeObjectURL(queuedFile.fileUrl);
            }

          } catch (uploadError: any) {
            // Update status to error
            updateFileStatus(i, { 
              uploadStatus: "error", 
              errorMessage: uploadError.message 
            });
            throw uploadError;
          }
        }

        // Clear files after successful upload
        if (onFileRemove) {
          for (let i = queuedFiles.length - 1; i >= 0; i--) {
            onFileRemove(i);
          }
        } else {
          setLocalQueuedFiles([]);
        }

        return {
          success: true,
          uploadedFiles: uploadedResults,
        };

      } catch (err: any) {
        setError(err.message || "Failed to upload files");
        onUploadError?.(err.message || "Failed to upload files");
        return { success: false, error: err.message };
      } finally {
        setIsUploading(false);
      }
    };

    const clearAllFiles = () => {
      // Revoke all object URLs
      queuedFiles.forEach((file) => {
        if (file.fileUrl.startsWith("blob:")) {
          URL.revokeObjectURL(file.fileUrl);
        }
      });

      if (onFileRemove) {
        for (let i = queuedFiles.length - 1; i >= 0; i--) {
          onFileRemove(i);
        }
      } else {
        setLocalQueuedFiles([]);
      }
      
      setError(null);
      setError("");

      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    };

    // Get status badge color and icon
    const getStatusBadge = (file: UploadedFile) => {
      switch (file.uploadStatus) {
        case "uploading":
          return {
            text: "Uploading...",
            color: "bg-blue-50 text-blue-700 border-blue-200",
            icon: <Loader2 className="w-3 h-3 animate-spin mr-1" />
          };
        case "success":
          return {
            text: "Uploaded",
            color: "bg-green-50 text-green-700 border-green-200",
            icon: <CheckCircle className="w-3 h-3 mr-1" />
          };
        case "error":
          return {
            text: "Failed",
            color: "bg-red-50 text-red-700 border-red-200",
            icon: <XCircle className="w-3 h-3 mr-1" />
          };
        default:
          return {
            text: "Queued",
            color: "bg-gray-50 text-gray-700 border-gray-200",
            icon: <FileText className="w-3 h-3 mr-1" />
          };
      }
    };

    return (
      <div className="space-y-4">
        {/* Upload Area */}
        <div
          className={`border-2 ${
            isDragging
              ? "border-blue-500 bg-blue-50"
              : "border-dashed border-gray-300"
          } ${
            disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"
          } rounded-lg p-8 text-center transition-all duration-200 hover:border-blue-400 hover:bg-gray-50`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={handleBrowseClick}
        >
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileSelect}
            accept=".pdf,.doc,.docx,.txt,.jpg,.jpeg,.png,.gif,.webp"
            className="hidden"
            disabled={disabled || isUploading}
            multiple
          />

          <div className="space-y-4">
            <div className="w-16 h-16 mx-auto bg-gray-100 rounded-full flex items-center justify-center">
              <Upload className="w-8 h-8 text-gray-400" />
            </div>

            <div>
              <p className="text-sm font-medium text-gray-700 mb-1">
                Drag & drop your file here
              </p>
              <p className="text-xs text-gray-500">
                or click to browse (PDF, DOC, DOCX, TXT, JPEG, PNG, GIF, WEBP up to 10MB)
              </p>
            </div>

            {!disabled && (
              <Button
                type="button"
                variant="outline"
                onClick={(e) => {
                  e.stopPropagation();
                  handleBrowseClick();
                }}
                className="mt-2"
                disabled={disabled || isUploading}
              >
                Browse Files
              </Button>
            )}
          </div>
        </div>

        {/* Upload Status Notification */}
        {queuedFiles.length > 0 && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Loader2 className="w-4 h-4 text-blue-600 animate-spin" />
                <span className="text-sm font-medium text-blue-700">
                  {isUploading ? "Uploading files..." : "Ready to upload"}
                </span>
              </div>
              <span className="text-xs text-blue-600">
                {queuedFiles.length} file{queuedFiles.length !== 1 ? 's' : ''} queued
              </span>
            </div>
            <div className="mt-2">
              <div className="text-xs text-blue-600">
                Files will be uploaded when you submit the contract
              </div>
            </div>
          </div>
        )}

        {/* Queued Files List */}
        {queuedFiles.length > 0 && (
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <h4 className="font-medium text-sm text-gray-700">
                Files to be Uploaded
              </h4>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={clearAllFiles}
                className="text-red-600 hover:text-red-800 hover:bg-red-50 text-xs"
                disabled={disabled || isUploading}
              >
                <Trash2 className="w-3 h-3 mr-1" />
                Clear All
              </Button>
            </div>

            <div className="space-y-2">
              {queuedFiles.map((file, index) => {
                const statusBadge = getStatusBadge(file);
                const fileIcon = getFileIcon(file.fileType);
                const isUploadingFile = file.uploadStatus === "uploading";
                const isUploaded = file.uploadStatus === "success";
                const isFailed = file.uploadStatus === "error";

                return (
                  <div key={index} className={`border rounded-lg p-3 bg-white ${isFailed ? 'border-red-200 bg-red-50' : ''}`}>
                    <div className="flex items-start justify-between">
                      <div className="flex items-start space-x-3">
                        <div className={`p-2 rounded ${isUploaded ? 'bg-green-100' : isFailed ? 'bg-red-100' : 'bg-gray-100'}`}>
                          <span className="text-lg">{fileIcon}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-2 mb-1">
                            <h5 className="font-medium text-sm text-gray-900 truncate">
                              {file.originalName}
                            </h5>
                            <Badge
                              variant="outline"
                              className={`text-xs ${statusBadge.color} flex items-center`}
                            >
                              {statusBadge.icon}
                              {statusBadge.text}
                            </Badge>
                          </div>
                          <p className="text-xs text-gray-500 mb-2">
                            {formatFileSize(file.fileSize)} •{" "}
                            {file.fileType.split("/")[1].toUpperCase()}
                          </p>
                          
                          {/* Error message if upload failed */}
                          {isFailed && file.errorMessage && (
                            <div className="mb-2">
                              <p className="text-xs text-red-600">
                                {file.errorMessage}
                              </p>
                            </div>
                          )}
                          
                          {/* Progress bar if uploading */}
                          {(isUploadingFile || file.uploadProgress !== undefined) && (
                            <div className="mt-2">
                              <div className="flex justify-between text-xs text-gray-600 mb-1">
                                <span>
                                  {isUploadingFile ? "Uploading..." : "Progress"}
                                </span>
                                <span>{file.uploadProgress || 0}%</span>
                              </div>
                              <div className="w-full bg-gray-200 rounded-full h-1.5">
                                <div
                                  className={`h-1.5 rounded-full transition-all duration-300 ${
                                    isFailed ? 'bg-red-500' : 
                                    isUploaded ? 'bg-green-500' : 
                                    'bg-[#C29307]'
                                  }`}
                                  style={{ width: `${file.uploadProgress || 0}%` }}
                                />
                              </div>
                            </div>
                          )}
                          
                          <div className="flex items-center space-x-2 mt-2">
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => window.open(file.fileUrl, "_blank")}
                              className="text-xs h-7"
                              disabled={disabled || isUploading}
                            >
                              <Eye className="w-3 h-3 mr-1" />
                              Preview
                            </Button>
                            {isFailed && (
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  // Option to retry failed upload
                                  updateFileStatus(index, { 
                                    uploadStatus: "pending", 
                                    uploadProgress: 0,
                                    errorMessage: undefined 
                                  });
                                }}
                                className="text-xs h-7 text-blue-600 hover:text-blue-800"
                                disabled={disabled || isUploading}
                              >
                                <Loader2 className="w-3 h-3 mr-1" />
                                Retry
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                      {!disabled && !isUploadingFile && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveFile(index)}
                          className="text-gray-400 hover:text-red-600"
                          disabled={isUploading}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="text-xs text-gray-500 text-center pt-2 border-t">
              <p>
                Files will be uploaded to Supabase when you submit the contract.
              </p>
              <p className="mt-1">
                {queuedFiles.filter(f => f.uploadStatus === "success").length} of {queuedFiles.length} file(s) uploaded
              </p>
            </div>
          </div>
        )}

        {/* Error Display */}
        {error && (
          <Alert variant="destructive" className="py-3">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="text-sm">{error}</AlertDescription>
          </Alert>
        )}

        {/* Uploading State */}
        {isUploading && (
          <div className="flex items-center justify-center p-4">
            <Loader2 className="w-5 h-5 animate-spin text-[#C29307] mr-2" />
            <span className="text-sm text-gray-600">Uploading files...</span>
          </div>
        )}
      </div>
    );
  }
);

SignContractFileUpload.displayName = "SignContractFileUpload";

export default SignContractFileUpload;