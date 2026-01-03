import React, { useRef, useState } from 'react'
import { 
  AlignCenter, AlignLeft, AlignRight, Bold, 
  Heading1, Heading2, Heading3, Italic, Underline 
} from 'lucide-react';
import { Button } from '../ui/button';

interface ContractEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

const RichTextArea = ({ value, onChange, placeholder }: ContractEditorProps) => {
  const editorRef = useRef<HTMLDivElement>(null);

  // Convert HTML to value when needed (for saving/API)
  const handleInput = () => {
    if (editorRef.current) {
      onChange(editorRef.current.innerHTML);
    }
  };

  // Apply formatting using document.execCommand
  const applyFormat = (command: string, value?: string) => {
    document.execCommand(command, false, value);
    editorRef.current?.focus();
    handleInput();
  };

  // Apply heading formatting
  const applyHeading = (level: number) => {
    const headingTag = `h${level}`;
    document.execCommand('formatBlock', false, headingTag);
    editorRef.current?.focus();
    handleInput();
  };

  // Apply alignment
  const applyAlignment = (alignment: 'left' | 'center' | 'right' | 'justify') => {
    document.execCommand('justify' + alignment.charAt(0).toUpperCase() + alignment.slice(1));
    editorRef.current?.focus();
    handleInput();
  };

  // Set initial content when component mounts or value changes
  React.useEffect(() => {
    if (editorRef.current && value !== editorRef.current.innerHTML) {
      editorRef.current.innerHTML = value || '';
    }
  }, [value]);


const clearFormatting = () => {
  const editor = editorRef.current;
  if (!editor) return;
  
  // Get the current text content
  const textContent = editor.textContent || '';
  
  // Clear all HTML and set plain text
  editor.innerHTML = textContent;
  
  // Focus the editor
  editor.focus();
  
  // Move cursor to the end
  const range = document.createRange();
  range.selectNodeContents(editor);
  range.collapse(false);
  const selection = window.getSelection();
  if (selection) {
    selection.removeAllRanges();
    selection.addRange(range);
  }
  
  handleInput();
};
  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      {/* Toolbar */}
      <div className="flex gap-2 items-center p-3 bg-muted border-b border-border">
        <div className="flex flex-wrap gap-1">
          <Button 
            size={'sm'} 
            variant={'ghost'} 
            className='h-8 px-2' 
            type="button" 
            onClick={() => applyFormat('bold')}
            title="Bold (Ctrl+B)"
          >
            <Bold className="w-4 h-4"/>
          </Button>
          <Button 
            size={'sm'} 
            variant={'ghost'} 
            className='h-8 px-2' 
            type="button" 
            onClick={() => applyFormat('italic')}
            title="Italic (Ctrl+I)"
          >
            <Italic className="w-4 h-4"/>
          </Button>
          <Button 
            size={'sm'} 
            variant={'ghost'} 
            className='h-8 px-2' 
            type="button" 
            onClick={() => applyFormat('underline')}
            title="Underline (Ctrl+U)"
          >
            <Underline className="w-4 h-4"/>
          </Button>
          
          <div className="w-px h-8 bg-border mx-1" />
          
          <Button 
            size={'sm'} 
            variant={'ghost'} 
            className='h-8 px-2' 
            type="button" 
            onClick={() => applyHeading(1)}
            title="Heading 1"
          >
            <Heading1 className="w-4 h-4"/>
          </Button>
          <Button 
            size={'sm'} 
            variant={'ghost'} 
            className='h-8 px-2' 
            type="button" 
            onClick={() => applyHeading(2)}
            title="Heading 2"
          >
            <Heading2 className="w-4 h-4"/>
          </Button>
          <Button 
            size={'sm'} 
            variant={'ghost'} 
            className='h-8 px-2' 
            type="button" 
            onClick={() => applyHeading(3)}
            title="Heading 3"
          >
            <Heading3 className="w-4 h-4"/>
          </Button>
          
          <div className="w-px h-8 bg-border mx-1" />
          
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={() => applyAlignment('left')}
            className="h-8 px-2"
            title="Align Left"
          >
            <AlignLeft className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={() => applyAlignment('center')}
            className="h-8 px-2"
            title="Align Center"
          >
            <AlignCenter className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={() => applyAlignment('right')}
            className="h-8 px-2"
            title="Align Right"
          >
            <AlignRight className="h-4 w-4" />
          </Button>
          
          <div className="w-px h-8 bg-border mx-1" />
          
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={clearFormatting}
            className="h-8 px-2 text-xs"
            title="Clear Formatting"
          >
            Clear
          </Button>
        </div>
      </div>
      
      {/* Editor Area */}
      <div
        ref={editorRef}
        contentEditable
        onInput={handleInput}
        onBlur={handleInput}
        className="min-h-48 p-4 text-sm focus:outline-none"
        // placeholder={placeholder || "Enter your contract details here..."}
        style={{ 
          whiteSpace: 'pre-wrap',
          overflowWrap: 'break-word',
          minHeight: '192px'
        }}
      />
    </div>
  );
}

export default RichTextArea;