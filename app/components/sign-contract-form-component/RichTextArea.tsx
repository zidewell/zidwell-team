import React, { useRef, useEffect, useCallback } from 'react';
import Quill from 'quill';
import 'quill/dist/quill.snow.css';
import { 
  AlignCenter, AlignLeft, AlignRight, Bold, 
  Heading1, Heading2, Heading3, Italic, Underline,
  List, ListOrdered, Undo, Redo, Link,
  RemoveFormatting
} from 'lucide-react';
import { Button } from '../ui/button';

interface ContractEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  readOnly?: boolean;
}

const RichTextArea = ({ value, onChange, placeholder = 'Enter your contract details here...', readOnly = false }: ContractEditorProps) => {
  const editorRef = useRef<HTMLDivElement>(null);
  const quillInstanceRef = useRef<Quill | null>(null);

  // Initialize Quill
  useEffect(() => {
    if (!editorRef.current || quillInstanceRef.current) return;

    const quill = new Quill(editorRef.current, {
      theme: 'snow',
      placeholder,
      readOnly,
      modules: {
        toolbar: false, // We'll use custom toolbar
        clipboard: {
          matchVisual: false,
        },
        history: {
          delay: 1000,
          maxStack: 50,
          userOnly: true,
        },
      },
      formats: [
        'header',
        'bold', 'italic', 'underline', 'strike',
        'blockquote', 'code-block',
        'list', 'bullet', 'indent',
        'align',
        'link',
        'clean'
      ],
    });

    quillInstanceRef.current = quill;

    // Set initial value
    if (value) {
      quill.clipboard.dangerouslyPasteHTML(value);
    }

    // Handle text changes
    quill.on('text-change', () => {
      const html = quill.root.innerHTML;
      onChange(html);
    });

    return () => {
      quillInstanceRef.current = null;
    };
  }, []);

  // Update value when prop changes
  useEffect(() => {
    if (quillInstanceRef.current && value !== quillInstanceRef.current.root.innerHTML) {
      quillInstanceRef.current.clipboard.dangerouslyPasteHTML(value);
    }
  }, [value]);

  // Update readOnly state
  useEffect(() => {
    if (quillInstanceRef.current) {
      quillInstanceRef.current.enable(!readOnly);
    }
  }, [readOnly]);

  const handleFormat = useCallback((format: string, value?: any) => {
    if (quillInstanceRef.current) {
      quillInstanceRef.current.format(format, value);
    }
  }, []);

  const handleHeading = useCallback((level: number) => {
    if (quillInstanceRef.current) {
      const format = quillInstanceRef.current.getFormat();
      if (format.header === level) {
        quillInstanceRef.current.format('header', false);
      } else {
        quillInstanceRef.current.format('header', level);
      }
    }
  }, []);

  const handleList = useCallback((type: 'bullet' | 'ordered') => {
    if (quillInstanceRef.current) {
      quillInstanceRef.current.format('list', type);
    }
  }, []);

  const handleAlignment = useCallback((alignment: 'left' | 'center' | 'right' | 'justify') => {
    if (quillInstanceRef.current) {
      quillInstanceRef.current.format('align', alignment);
    }
  }, []);

  const handleClearFormatting = useCallback(() => {
    if (quillInstanceRef.current) {
      const range = quillInstanceRef.current.getSelection();
      if (range) {
        quillInstanceRef.current.removeFormat(range.index, range.length);
      }
    }
  }, []);

  const handleClearAll = useCallback(() => {
    if (quillInstanceRef.current) {
      quillInstanceRef.current.setText('');
    }
  }, []);

  const handleLink = useCallback(() => {
    if (!quillInstanceRef.current) return;
    
    const range = quillInstanceRef.current.getSelection();
    if (!range) return;
    
    const text = quillInstanceRef.current.getText(range.index, range.length);
    let url = prompt('Enter URL:', text || 'https://');
    
    if (url) {
      if (!url.match(/^https?:\/\//)) {
        url = 'https://' + url;
      }
      
      if (range.length > 0) {
        quillInstanceRef.current.formatText(range.index, range.length, 'link', url);
      } else {
        quillInstanceRef.current.insertText(range.index, url, 'link', url);
      }
    }
  }, []);

  const handleUndo = useCallback(() => {
    if (quillInstanceRef.current) {
      quillInstanceRef.current.history.undo();
    }
  }, []);

  const handleRedo = useCallback(() => {
    if (quillInstanceRef.current) {
      quillInstanceRef.current.history.redo();
    }
  }, []);

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      {/* Toolbar */}
      <div className="flex gap-2 items-center p-3 bg-muted border-b border-border flex-wrap">
        {/* History Controls */}
        <div className="flex items-center gap-1 mr-2">
          <Button
            size="sm"
            variant="ghost"
            onClick={handleUndo}
            className="h-8 px-2"
            title="Undo (Ctrl+Z)"
          >
            <Undo className="h-4 w-4" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={handleRedo}
            className="h-8 px-2"
            title="Redo (Ctrl+Y)"
          >
            <Redo className="h-4 w-4" />
          </Button>
        </div>

        <div className="w-px h-8 bg-border mx-1" />

        {/* Text formatting */}
        <div className="flex items-center gap-1">
          <Button
            size="sm"
            variant="ghost"
            onClick={() => handleFormat('bold')}
            className="h-8 px-2"
            title="Bold (Ctrl+B)"
          >
            <Bold className="w-4 h-4" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => handleFormat('italic')}
            className="h-8 px-2"
            title="Italic (Ctrl+I)"
          >
            <Italic className="w-4 h-4" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => handleFormat('underline')}
            className="h-8 px-2"
            title="Underline (Ctrl+U)"
          >
            <Underline className="w-4 h-4" />
          </Button>
        </div>

        <div className="w-px h-8 bg-border mx-1" />

        {/* Headings */}
        <div className="flex items-center gap-1">
          <Button
            size="sm"
            variant="ghost"
            onClick={() => handleHeading(1)}
            className="h-8 px-2"
            title="Heading 1"
          >
            <Heading1 className="w-4 h-4" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => handleHeading(2)}
            className="h-8 px-2"
            title="Heading 2"
          >
            <Heading2 className="w-4 h-4" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => handleHeading(3)}
            className="h-8 px-2"
            title="Heading 3"
          >
            <Heading3 className="w-4 h-4" />
          </Button>
        </div>

        <div className="w-px h-8 bg-border mx-1" />

        {/* Lists */}
        <div className="flex items-center gap-1">
          <Button
            size="sm"
            variant="ghost"
            onClick={() => handleList('bullet')}
            className="h-8 px-2"
            title="Bullet List"
          >
            <List className="h-4 w-4" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => handleList('ordered')}
            className="h-8 px-2"
            title="Numbered List"
          >
            <ListOrdered className="h-4 w-4" />
          </Button>
        </div>

        <div className="w-px h-8 bg-border mx-1" />

        {/* Alignment */}
        <div className="flex items-center gap-1">
          <Button
            size="sm"
            variant="ghost"
            onClick={() => handleAlignment('left')}
            className="h-8 px-2"
            title="Align Left"
          >
            <AlignLeft className="h-4 w-4" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => handleAlignment('center')}
            className="h-8 px-2"
            title="Align Center"
          >
            <AlignCenter className="h-4 w-4" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => handleAlignment('right')}
            className="h-8 px-2"
            title="Align Right"
          >
            <AlignRight className="h-4 w-4" />
          </Button>
        </div>

        <div className="w-px h-8 bg-border mx-1" />

        {/* Link */}
        <Button
          size="sm"
          variant="ghost"
          onClick={handleLink}
          className="h-8 px-2"
          title="Insert Link"
        >
          <Link className="h-4 w-4" />
        </Button>

        <div className="w-px h-8 bg-border mx-1" />

        {/* Clear buttons */}
        <div className="flex items-center gap-1">
          <Button
            size="sm"
            variant="ghost"
            onClick={handleClearFormatting}
            className="h-8 px-2"
            title="Clear Formatting"
          >
            <RemoveFormatting className="h-4 w-4" />
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={handleClearAll}
            className="h-8 px-2 text-xs"
            title="Clear All Content"
          >
            Clear All
          </Button>
        </div>
      </div>

      {/* Quill Editor Container */}
      <div ref={editorRef} className="min-h-56" />
    </div>
  );
};

export default RichTextArea;