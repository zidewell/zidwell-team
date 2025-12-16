"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  Bold,
  Italic,
  Underline,
  List,
  ListOrdered,
  Heading1,
  Heading2,
  Heading3,
  Link,
  Image as ImageIcon,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Undo,
  Redo,
  Type,
} from "lucide-react";

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  height?: number;
  onImagesAdded?: (
    images: Array<{ file: File; placeholderId: string }>
  ) => void;
}

const RichTextEditor: React.FC<RichTextEditorProps> = ({
  value,
  onChange,
  placeholder = "Type your message here...",
  className = "",
  height = 350,
  onImagesAdded,
}) => {
  const editorRef = useRef<HTMLDivElement>(null);
  const [history, setHistory] = useState<string[]>([
    value || `<p>${placeholder}</p>`,
  ]);
  const [historyIndex, setHistoryIndex] = useState(0);
  const [pendingImages, setPendingImages] = useState<
    Array<{ file: File; placeholderId: string }>
  >([]);

  // Initialize editor with content
  useEffect(() => {
    if (editorRef.current && editorRef.current.innerHTML !== value) {
      if (value && value.trim() !== "") {
        editorRef.current.innerHTML = value;
      } else {
        editorRef.current.innerHTML = `<p>${placeholder}</p>`;
      }
    }
  }, [value, placeholder]);

  // Save content to history
  const saveToHistory = (content: string) => {
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(content);
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  };

  const handleInput = () => {
    if (!editorRef.current) return;

    const content = editorRef.current.innerHTML;

    if (content !== history[historyIndex]) {
      saveToHistory(content);
    }

    onChange(content);
  };

  const execCommand = (
    command: string,
    value: string = "",
    showUI: boolean = false
  ) => {
    if (!editorRef.current) return;

    editorRef.current.focus();

    const selection = window.getSelection();
    if (!selection?.rangeCount) {
      document.execCommand("insertParagraph");
      const newSelection = window.getSelection();
      if (newSelection?.rangeCount) {
        document.execCommand(command, showUI, value);
      }
      return;
    }

    document.execCommand(command, showUI, value);
    handleInput();
  };

  // Helper function to convert file to base64
  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = (error) => reject(error);
    });
  };

  // Image upload handler
  const handleImageUpload = () => {
    const input = document.createElement("input");
    input.setAttribute("type", "file");
    input.setAttribute("accept", "image/*");
    input.click();

    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file || !editorRef.current) return;

      // Validate file type
      const validTypes = [
        "image/jpeg",
        "image/jpg",
        "image/png",
        "image/gif",
        "image/webp",
      ];
      if (!validTypes.includes(file.type)) {
        alert(`Invalid file type. Supported: JPEG, PNG, GIF, WebP`);
        return;
      }

      // Validate file size (max 5MB)
      const maxSize = 5 * 1024 * 1024;
      if (file.size > maxSize) {
        alert(
          `File too large: ${(file.size / 1024 / 1024).toFixed(
            1
          )}MB. Maximum is 5MB.`
        );
        return;
      }

      try {
        // Create a unique placeholder ID
        const placeholderId = `img_${Date.now()}_${Math.random()
          .toString(36)
          .substring(7)}`;

        // Convert image to base64 for preview
        const base64 = await fileToBase64(file);

        console.log("Inserting image with placeholder:", placeholderId);

        // Insert base64 image as a temporary placeholder
        execCommand(
          "insertHTML",
          `<img src="${base64}" alt="Uploaded image" data-placeholder-id="${placeholderId}" data-filename="${file.name}" style="max-width:100%;height:auto;border-radius:0.375rem;margin:0.5rem 0;border:2px dashed #C29307;opacity:0.8;" />`
        );

        // Add to pending images list
        const newImage = { file, placeholderId };
        const updatedPendingImages = [...pendingImages, newImage];
        setPendingImages(updatedPendingImages);

        // Notify parent component about new images
        if (onImagesAdded) {
          onImagesAdded(updatedPendingImages);
        }

        console.log("Image added successfully:", {
          filename: file.name,
          size: file.size,
          type: file.type,
          placeholderId,
        });
      } catch (error) {
        console.error("Image processing error:", error);
        alert("Failed to process image. Please try again.");
      }
    };
  };

  // Function to replace placeholder with actual URL after upload
  const replaceImagePlaceholder = (placeholderId: string, finalUrl: string) => {
    if (!editorRef.current) return;

    const editor = editorRef.current;
    const img = editor.querySelector(
      `img[data-placeholder-id="${placeholderId}"]`
    ) as HTMLImageElement;

    if (img) {
      img.setAttribute("src", finalUrl);
      img.removeAttribute("data-placeholder-id");
      // Use setAttribute for style to ensure it works
      img.setAttribute(
        "style",
        "max-width:100%;height:auto;border-radius:0.375rem;margin:0.5rem 0;border:1px solid #e5e7eb;opacity:1;"
      );

      // Remove from pending images
      const updatedPendingImages = pendingImages.filter(
        (img) => img.placeholderId !== placeholderId
      );
      setPendingImages(updatedPendingImages);

      // Update the editor content
      handleInput();
    }
  };

  // Function to clear all pending images (on cancel)
  const clearPendingImages = () => {
    if (!editorRef.current) return;

    const editor = editorRef.current;
    const placeholders = editor.querySelectorAll("img[data-placeholder-id]");
    placeholders.forEach((img) => img.remove());

    setPendingImages([]);
    handleInput();
  };

  const insertLink = () => {
    const url = prompt("Enter URL:");
    if (url) {
      execCommand("createLink", url);
    }
  };

  const handleUndo = () => {
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1;
      setHistoryIndex(newIndex);
      if (editorRef.current) {
        editorRef.current.innerHTML = history[newIndex];
        onChange(history[newIndex]);
      }
    }
  };

  const handleRedo = () => {
    if (historyIndex < history.length - 1) {
      const newIndex = historyIndex + 1;
      setHistoryIndex(newIndex);
      if (editorRef.current) {
        editorRef.current.innerHTML = history[newIndex];
        onChange(history[newIndex]);
      }
    }
  };

  const formatBlock = (tag: string) => {
    execCommand("formatBlock", tag);
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();

    // Check if clipboard contains files/images
    const items = e.clipboardData.items;
    let hasImage = false;

    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf("image") !== -1) {
        const file = items[i].getAsFile();
        if (file) {
          // Handle image paste by creating a file input
          const input = document.createElement("input");
          input.setAttribute("type", "file");
          const dataTransfer = new DataTransfer();
          dataTransfer.items.add(file);
          input.files = dataTransfer.files;

          // Trigger image upload
          handleImageUpload();
          hasImage = true;
          break;
        }
      }
    }

    if (!hasImage) {
      // Get plain text from clipboard
      const text = e.clipboardData.getData("text/plain");
      document.execCommand("insertText", false, text);
      handleInput();
    }
  };

  const clearFormatting = () => {
    if (!editorRef.current) return;

    editorRef.current.focus();
    const selection = window.getSelection();
    if (!selection?.rangeCount) return;

    const range = selection.getRangeAt(0);
    const content = range.extractContents();
    const textNode = document.createTextNode(content.textContent || "");

    range.deleteContents();
    range.insertNode(textNode);

    selection.removeAllRanges();
    const newRange = document.createRange();
    newRange.selectNode(textNode);
    newRange.collapse(false);
    selection.addRange(newRange);

    handleInput();
  };

  const handleFocus = () => {
    if (
      editorRef.current &&
      editorRef.current.innerHTML === `<p>${placeholder}</p>`
    ) {
      editorRef.current.innerHTML = "";
    }
  };

  const handleBlur = () => {
    if (editorRef.current && editorRef.current.innerHTML.trim() === "") {
      editorRef.current.innerHTML = `<p>${placeholder}</p>`;
    }
  };

  return (
    <div className={`rich-text-editor relative ${className}`}>
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-1 p-2 border border-gray-300 rounded-t-lg bg-gray-50">
        {/* Headings */}
        <button
          type="button"
          onClick={() => formatBlock("h1")}
          className="p-2 rounded hover:bg-gray-200"
          title="Heading 1"
        >
          <Heading1 className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={() => formatBlock("h2")}
          className="p-2 rounded hover:bg-gray-200"
          title="Heading 2"
        >
          <Heading2 className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={() => formatBlock("h3")}
          className="p-2 rounded hover:bg-gray-200"
          title="Heading 3"
        >
          <Heading3 className="w-4 h-4" />
        </button>

        <div className="w-px h-6 bg-gray-300 mx-1" />

        {/* Text formatting */}
        <button
          type="button"
          onClick={() => execCommand("bold")}
          className="p-2 rounded hover:bg-gray-200"
          title="Bold"
        >
          <Bold className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={() => execCommand("italic")}
          className="p-2 rounded hover:bg-gray-200"
          title="Italic"
        >
          <Italic className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={() => execCommand("underline")}
          className="p-2 rounded hover:bg-gray-200"
          title="Underline"
        >
          <Underline className="w-4 h-4" />
        </button>

        <div className="w-px h-6 bg-gray-300 mx-1" />

        {/* Lists */}
        <button
          type="button"
          onClick={() => execCommand("insertUnorderedList")}
          className="p-2 rounded hover:bg-gray-200"
          title="Bullet List"
        >
          <List className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={() => execCommand("insertOrderedList")}
          className="p-2 rounded hover:bg-gray-200"
          title="Numbered List"
        >
          <ListOrdered className="w-4 h-4" />
        </button>

        <div className="w-px h-6 bg-gray-300 mx-1" />

        {/* Alignment */}
        <button
          type="button"
          onClick={() => execCommand("justifyLeft")}
          className="p-2 rounded hover:bg-gray-200"
          title="Align Left"
        >
          <AlignLeft className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={() => execCommand("justifyCenter")}
          className="p-2 rounded hover:bg-gray-200"
          title="Align Center"
        >
          <AlignCenter className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={() => execCommand("justifyRight")}
          className="p-2 rounded hover:bg-gray-200"
          title="Align Right"
        >
          <AlignRight className="w-4 h-4" />
        </button>

        <div className="w-px h-6 bg-gray-300 mx-1" />

        {/* Links & Images */}
        <button
          type="button"
          onClick={insertLink}
          className="p-2 rounded hover:bg-gray-200"
          title="Insert Link"
        >
          <Link className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={handleImageUpload}
          className="p-2 rounded hover:bg-gray-200"
          title="Insert Image"
        >
          <ImageIcon className="w-4 h-4" />
        </button>

        <div className="w-px h-6 bg-gray-300 mx-1" />

        {/* Undo/Redo */}
        <button
          type="button"
          onClick={handleUndo}
          disabled={historyIndex === 0}
          className="p-2 rounded hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
          title="Undo"
        >
          <Undo className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={handleRedo}
          disabled={historyIndex === history.length - 1}
          className="p-2 rounded hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
          title="Redo"
        >
          <Redo className="w-4 h-4" />
        </button>

        <div className="w-px h-6 bg-gray-300 mx-1" />

        {/* Clear formatting */}
        <button
          type="button"
          onClick={clearFormatting}
          className="px-3 py-1 text-sm rounded hover:bg-gray-200"
          title="Clear Formatting"
        >
          <Type className="w-4 h-4 inline mr-1" />
          Clear
        </button>
      </div>

      {/* Editor area */}
      <div
        ref={editorRef}
        contentEditable
        onInput={handleInput}
        onPaste={handlePaste}
        onFocus={handleFocus}
        onBlur={handleBlur}
        className="w-full p-4 border border-t-0 border-gray-300 rounded-b-lg focus:outline-none focus:ring-1 focus:ring-[#C29307] focus:border-[#C29307] overflow-y-auto bg-white"
        style={{
          height: `${height - 50}px`,
          minHeight: "200px",
        }}
        suppressContentEditableWarning
      />

      {/* Pending images info */}
      {pendingImages.length > 0 && (
        <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded text-sm text-yellow-800">
          <div className="flex items-center justify-between">
            <span>
              ⚠️ {pendingImages.length} image
              {pendingImages.length > 1 ? "s" : ""} pending upload
            </span>
            <button
              type="button"
              onClick={clearPendingImages}
              className="text-xs text-yellow-600 hover:text-yellow-800 underline"
            >
              Clear all
            </button>
          </div>
          <p className="text-xs mt-1">
            Images will be uploaded when you submit the notification.
          </p>
        </div>
      )}

      <style jsx global>{`
        /* Editor styles */
        .rich-text-editor [contenteditable] {
          outline: none;
          line-height: 1.6;
        }

        .rich-text-editor [contenteditable] h1 {
          font-size: 1.875rem;
          font-weight: 700;
          margin: 1.5rem 0 1rem 0;
          color: #111827;
        }

        .rich-text-editor [contenteditable] h2 {
          font-size: 1.5rem;
          font-weight: 600;
          margin: 1.25rem 0 0.75rem 0;
          color: #111827;
        }

        .rich-text-editor [contenteditable] h3 {
          font-size: 1.25rem;
          font-weight: 600;
          margin: 1rem 0 0.5rem 0;
          color: #111827;
        }

        .rich-text-editor [contenteditable] p {
          margin: 0.75rem 0;
          line-height: 1.6;
        }

        .rich-text-editor [contenteditable] ul,
        .rich-text-editor [contenteditable] ol {
          margin: 0.75rem 0;
          padding-left: 1.5rem;
        }

        .rich-text-editor [contenteditable] ul li {
          list-style-type: disc;
        }

        .rich-text-editor [contenteditable] ol li {
          list-style-type: decimal;
        }

        .rich-text-editor [contenteditable] a {
          color: #c29307;
          text-decoration: none;
        }

        .rich-text-editor [contenteditable] a:hover {
          text-decoration: underline;
        }

        .rich-text-editor [contenteditable] img {
          max-width: 100%;
          height: auto;
          border-radius: 0.375rem;
          margin: 0.5rem 0;
          border: 1px solid #e5e7eb;
        }

        .rich-text-editor [contenteditable] img[data-placeholder-id] {
          border: 2px dashed #c29307;
          opacity: 0.8;
        }

        .rich-text-editor [contenteditable] blockquote {
          border-left: 3px solid #c29307;
          margin: 1rem 0;
          padding-left: 1rem;
          font-style: italic;
          color: #6b7280;
        }

        /* Selection */
        .rich-text-editor [contenteditable] ::selection {
          background-color: rgba(194, 147, 7, 0.2);
        }

        .rich-text-editor [contenteditable] strong,
        .rich-text-editor [contenteditable] b {
          font-weight: bold;
        }

        .rich-text-editor [contenteditable] em,
        .rich-text-editor [contenteditable] i {
          font-style: italic;
        }

        .rich-text-editor [contenteditable] u {
          text-decoration: underline;
        }
      `}</style>
    </div>
  );
};

export default RichTextEditor;
