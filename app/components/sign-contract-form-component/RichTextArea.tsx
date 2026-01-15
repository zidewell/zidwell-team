import React, { useRef } from 'react'
import { 
  AlignCenter, AlignLeft, AlignRight, Bold, 
  Heading1, Heading2, Heading3, Italic, Underline,
  List, ListOrdered
} from 'lucide-react';
import { Button } from '../ui/button';

interface ContractEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

const RichTextArea = ({ value, onChange, placeholder }: ContractEditorProps) => {
  const editorRef = useRef<HTMLDivElement>(null);

  // Convert HTML to value when needed
  const handleInput = () => {
    if (editorRef.current) {
      onChange(editorRef.current.innerHTML);
    }
  };

  // Simple execCommand wrapper that always works
  const execCommand = (command: string, value: string = '') => {
    if (!editorRef.current) return;
    
    // Focus the editor first
    editorRef.current.focus();
    
    // Save the current selection
    const selection = window.getSelection();
    
    // Try to execute the command
    const success = document.execCommand(command, false, value);
    
    // If it failed, try alternative approach
    if (!success) {
      console.warn(`Command ${command} failed, trying alternative...`);
      
      if (command === 'insertOrderedList' || command === 'insertUnorderedList') {
        // Alternative list creation
        createListManually(command === 'insertOrderedList' ? 'ol' : 'ul');
      } else {
        // Try one more time
        document.execCommand(command, false, value);
      }
    }
    
    handleInput();
  };

  // Manual list creation function
  const createListManually = (listType: 'ul' | 'ol') => {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;
    
    const range = selection.getRangeAt(0);
    
    // Create list element
    const list = document.createElement(listType);
    const listItem = document.createElement('li');
    
    // Get selected text or use placeholder
    if (!selection.isCollapsed) {
      const selectedText = selection.toString();
      listItem.textContent = selectedText;
      
      // Delete the selected content
      range.deleteContents();
    } else {
      listItem.innerHTML = '&nbsp;'; // Empty item
    }
    
    list.appendChild(listItem);
    range.insertNode(list);
    
    // Move cursor inside the list item
    const newRange = document.createRange();
    newRange.setStart(listItem, 0);
    newRange.collapse(true);
    
    selection.removeAllRanges();
    selection.addRange(newRange);
  };

  // Apply heading formatting
  const formatBlock = (tag: string) => {
    execCommand('formatBlock', `<${tag}>`);
  };

  // Apply list formatting - Fixed version
  const applyList = (type: 'ordered' | 'unordered') => {
    const command = type === 'ordered' ? 'insertOrderedList' : 'insertUnorderedList';
    execCommand(command);
  };

  // Apply alignment - Simplified
  const applyAlignment = (alignment: 'left' | 'center' | 'right') => {
    if (!editorRef.current) return;
    
    editorRef.current.focus();
    
    // Try different approaches
    const command = `justify${alignment.charAt(0).toUpperCase() + alignment.slice(1)}`;
    const success = document.execCommand(command);
    
    if (!success) {
      // Fallback: set style directly on selection
      const selection = window.getSelection();
      if (selection && selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        const container = document.createElement('span');
        container.style.textAlign = alignment;
        
        if (!selection.isCollapsed) {
          const fragment = range.cloneContents();
          container.appendChild(fragment);
          range.deleteContents();
          range.insertNode(container);
        }
      }
    }
    
    handleInput();
  };

  // Set initial content
  React.useEffect(() => {
    if (editorRef.current && value !== editorRef.current.innerHTML) {
      editorRef.current.innerHTML = value || '';
    }
  }, [value]);

  // Clear formatting - Working version
  const clearFormatting = () => {
    if (!editorRef.current) return;
    
    editorRef.current.focus();
    
    // Try execCommand first
    document.execCommand('removeFormat', false);
    
    // Also remove all inline styles
    const selection = window.getSelection();
    if (selection && !selection.isCollapsed) {
      const range = selection.getRangeAt(0);
      const fragment = range.cloneContents();
      
      // Create a clean text node
      const text = fragment.textContent || '';
      const cleanText = document.createTextNode(text);
      
      range.deleteContents();
      range.insertNode(cleanText);
      
      // Move cursor to end
      range.setStartAfter(cleanText);
      range.collapse(true);
      selection.removeAllRanges();
      selection.addRange(range);
    }
    
    handleInput();
  };

  // Clear all content
  const clearAllContent = () => {
    if (!editorRef.current) return;
    
    editorRef.current.innerHTML = '';
    editorRef.current.focus();
    handleInput();
  };

  // Handle paste
  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const text = e.clipboardData.getData('text/plain');
    
    // Insert as plain text
    document.execCommand('insertText', false, text);
    
    handleInput();
  };

  // Handle focus/placeholder
  const handleFocus = () => {
    if (editorRef.current && editorRef.current.innerHTML === `<p>${placeholder}</p>`) {
      editorRef.current.innerHTML = '';
    }
  };

  const handleBlur = () => {
    if (editorRef.current && editorRef.current.innerHTML.trim() === '') {
      editorRef.current.innerHTML = `<p>${placeholder}</p>`;
    } else if (editorRef.current && editorRef.current.innerHTML === '') {
      editorRef.current.innerHTML = `<p>${placeholder}</p>`;
    }
  };

  // Add a click handler to ensure selection works
  const handleEditorClick = () => {
    if (!editorRef.current) return;
    
    // Ensure the editor has focus when clicked
    editorRef.current.focus();
    
    // If empty, ensure placeholder is cleared
    if (editorRef.current.innerHTML === `<p>${placeholder}</p>`) {
      editorRef.current.innerHTML = '';
    }
  };

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      {/* Toolbar */}
      <div className="flex gap-2 items-center p-3 bg-muted border-b border-border">
        <div className="flex flex-wrap gap-1">
          {/* Text formatting */}
          <Button 
            size={'sm'} 
            variant={'ghost'} 
            className='h-8 px-2' 
            type="button" 
            onClick={() => execCommand('bold')}
            title="Bold (Ctrl+B)"
          >
            <Bold className="w-4 h-4"/>
          </Button>
          <Button 
            size={'sm'} 
            variant={'ghost'} 
            className='h-8 px-2' 
            type="button" 
            onClick={() => execCommand('italic')}
            title="Italic (Ctrl+I)"
          >
            <Italic className="w-4 h-4"/>
          </Button>
          <Button 
            size={'sm'} 
            variant={'ghost'} 
            className='h-8 px-2' 
            type="button" 
            onClick={() => execCommand('underline')}
            title="Underline (Ctrl+U)"
          >
            <Underline className="w-4 h-4"/>
          </Button>
          
          <div className="w-px h-8 bg-border mx-1" />
          
          {/* Headings */}
          <Button 
            size={'sm'} 
            variant={'ghost'} 
            className='h-8 px-2' 
            type="button" 
            onClick={() => formatBlock('h1')}
            title="Heading 1"
          >
            <Heading1 className="w-4 h-4"/>
          </Button>
          <Button 
            size={'sm'} 
            variant={'ghost'} 
            className='h-8 px-2' 
            type="button" 
            onClick={() => formatBlock('h2')}
            title="Heading 2"
          >
            <Heading2 className="w-4 h-4"/>
          </Button>
          <Button 
            size={'sm'} 
            variant={'ghost'} 
            className='h-8 px-2' 
            type="button" 
            onClick={() => formatBlock('h3')}
            title="Heading 3"
          >
            <Heading3 className="w-4 h-4"/>
          </Button>
          
          <div className="w-px h-8 bg-border mx-1" />
          
          {/* Lists - FIXED */}
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={() => applyList('unordered')}
            className="h-8 px-2"
            title="Bullet List"
          >
            <List className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={() => applyList('ordered')}
            className="h-8 px-2"
            title="Numbered List"
          >
            <ListOrdered className="h-4 w-4" />
          </Button>
          
          <div className="w-px h-8 bg-border mx-1" />
          
          {/* Alignment */}
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
          
          {/* Clear buttons */}
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={clearFormatting}
            className="h-8 px-2 text-xs"
            title="Clear Formatting"
          >
            Clear Format
          </Button>
          
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={clearAllContent}
            className="h-8 px-2 text-xs"
            title="Clear All Content"
          >
            Clear All
          </Button>
        </div>
      </div>
      
      {/* Editor Area */}
      <div
        ref={editorRef}
        contentEditable
        onInput={handleInput}
        onPaste={handlePaste}
        onFocus={handleFocus}
        onBlur={handleBlur}
        onClick={handleEditorClick}
        className="min-h-56 p-4 text-sm focus:outline-none rich-text-editor"
        style={{ 
          whiteSpace: 'pre-wrap',
          overflowWrap: 'break-word',
          minHeight: '292px'
        }}
        suppressContentEditableWarning
      />

      {/* CSS Styles - Fixed to apply properly */}
      <style jsx global>{`
        /* Target the editor properly */
        div.rich-text-editor[contenteditable="true"] {
          outline: none;
          line-height: 1.6;
          font-family: inherit;
        }

        div.rich-text-editor[contenteditable="true"] h1 {
          font-size: 1.875rem;
          font-weight: 700;
          margin: 1.5rem 0 1rem 0;
          color: #111827;
        }

        div.rich-text-editor[contenteditable="true"] h2 {
          font-size: 1.5rem;
          font-weight: 600;
          margin: 1.25rem 0 0.75rem 0;
          color: #111827;
        }

        div.rich-text-editor[contenteditable="true"] h3 {
          font-size: 1.25rem;
          font-weight: 600;
          margin: 1rem 0 0.5rem 0;
          color: #111827;
        }

        div.rich-text-editor[contenteditable="true"] p {
          margin: 0.75rem 0;
          line-height: 1.6;
          min-height: 1.5em;
        }

        /* List styles - IMPORTANT: This makes lists visible */
        div.rich-text-editor[contenteditable="true"] ul,
        div.rich-text-editor[contenteditable="true"] ol {
          margin: 0.75rem 0 !important;
          padding-left: 1.5rem !important;
          display: block !important;
        }

        div.rich-text-editor[contenteditable="true"] ul {
          list-style-type: disc !important;
        }

        div.rich-text-editor[contenteditable="true"] ol {
          list-style-type: decimal !important;
        }

        div.rich-text-editor[contenteditable="true"] li {
          margin: 0.25rem 0 !important;
          display: list-item !important;
          list-style-position: outside !important;
        }

        /* Text formatting */
        div.rich-text-editor[contenteditable="true"] strong,
        div.rich-text-editor[contenteditable="true"] b {
          font-weight: bold !important;
        }

        div.rich-text-editor[contenteditable="true"] em,
        div.rich-text-editor[contenteditable="true"] i {
          font-style: italic !important;
        }

        div.rich-text-editor[contenteditable="true"] u {
          text-decoration: underline !important;
        }

        /* Selection */
        div.rich-text-editor[contenteditable="true"] ::selection {
          background-color: rgba(37, 99, 235, 0.2);
        }

        /* Placeholder styling */
        div.rich-text-editor[contenteditable="true"]:empty:before {
          content: "${placeholder || 'Enter your contract details here...'}";
          color: #9ca3af;
          pointer-events: none;
        }
      `}</style>
    </div>
  );
}

export default RichTextArea;