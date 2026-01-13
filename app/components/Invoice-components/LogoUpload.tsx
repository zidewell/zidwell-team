"use client";

import { useState } from "react";
import { Label } from "../ui/label";
import { Input } from "../ui/input";
import { Upload, X } from "lucide-react";

interface LogoUploadProps {
  logo: string;
  onLogoChange: (logoUrl: string) => void;
}

const LogoUpload: React.FC<LogoUploadProps> = ({ logo, onLogoChange }) => {
  const [uploading, setUploading] = useState(false);

  const handleFileUpload = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    try {
      setUploading(true);
      const file = event.target.files?.[0];

      if (!file) return;

      // Client-side validation
      if (!file.type.startsWith("image/")) {
        alert("Please upload an image file (PNG, JPG, JPEG, GIF)");
        return;
      }

      if (file.size > 5 * 1024 * 1024) {
        alert("File size must be less than 5MB");
        return;
      }

      // Create temporary object URL for preview (doesn't upload to server yet)
      const objectUrl = URL.createObjectURL(file);

      // Convert to base64 for temporary storage in form state
      const reader = new FileReader();
      reader.onloadend = () => {
        onLogoChange(reader.result as string);
        // Clean up object URL since we have base64 now
        URL.revokeObjectURL(objectUrl);
      };
      reader.readAsDataURL(file);
    } catch (error: any) {
      console.error("Upload error:", error);
      alert("Error processing logo");
    } finally {
      setUploading(false);
      // Reset file input
      if (event.target) {
        event.target.value = "";
      }
    }
  };

  const handleRemoveLogo = () => {
    // Simply remove from form state - no server call needed
    onLogoChange("");
  };

  return (
    <div className="mb-6">
      <Label htmlFor="logo" className="block mb-2">
        Business Logo
      </Label>
      <div className="flex items-center gap-4">
        {logo && (
          <div className="relative">
            <img
              src={logo}
              alt="Business Logo"
              className="h-16 w-16 rounded-lg object-cover"
            />
            <button
              type="button"
              onClick={handleRemoveLogo}
              className="absolute -top-2 -right-2 h-6 w-6 rounded-full bg-red-500 hover:bg-red-600 text-white flex items-center justify-center text-xs"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        )}
        <div className="flex-1">
          <Input
            id="logo"
            type="file"
            accept="image/*"
            onChange={handleFileUpload}
            disabled={uploading}
            className="hidden"
          />
          <Label
            htmlFor="logo"
            className={`
              flex items-center justify-center gap-2 px-4 py-2 border-2 border-dashed rounded-lg cursor-pointer transition-colors
              ${
                uploading
                  ? "bg-gray-100 cursor-not-allowed"
                  : "hover:bg-gray-50"
              }
            `}
          >
            {uploading ? (
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                Processing...
              </div>
            ) : (
              <>
                <Upload className="h-4 w-4" />
                {logo ? "Change Logo" : "Upload Logo"}
              </>
            )}
          </Label>
          <p className="text-xs text-muted-foreground mt-1">
            PNG, JPG, GIF up to 5MB. Logo will be saved when invoice is
            generated.
          </p>
        </div>
      </div>
    </div>
  );
};

export default LogoUpload;
