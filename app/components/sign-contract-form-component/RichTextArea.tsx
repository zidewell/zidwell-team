import React, { useState } from 'react'
import ButtonGhost from '../smart-contract-components/ButtonGhost';
import { AlignCenter, AlignLeft, AlignRight, Bold, Heading1, Heading2, Heading3, Italic, Underline } from 'lucide-react';
import { Button } from '../ui/button';
interface ContractEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}


const RichTextArea = ({ value, onChange, placeholder }: ContractEditorProps) => {
    const [activeFormats, setActiveFormats] = useState<Set<string>>(new Set());
const applyFormat = (format: string) => {
    const textarea = document.getElementById("contract-editor") as HTMLTextAreaElement;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = value.substring(start, end);

    if (selectedText) {
      let formattedText = selectedText;
      
      switch (format) {
        case "bold":
          formattedText = `**${selectedText}**`;
          break;
        case "italic":
          formattedText = `*${selectedText}*`;
          break;
        case "underline":
          formattedText = `<u>${selectedText}</u>`;
          break;
        case "strikethrough":
          formattedText = `~~${selectedText}~~`;
          break;
        case "h1":
          formattedText = `\n# ${selectedText}\n`;
          break;
        case "h2":
          formattedText = `\n## ${selectedText}\n`;
          break;
        case "h3":
          formattedText = `\n### ${selectedText}\n`;
          break;
      }

      const newValue = value.substring(0, start) + formattedText + value.substring(end);
      onChange(newValue);
    }
  };

  const applyAlignment = (alignment: string) => {
    const textarea = document.getElementById("contract-editor") as HTMLTextAreaElement;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = value.substring(start, end);

    if (selectedText) {
      const aligned = `<div style="text-align: ${alignment}">${selectedText}</div>`;
      const newValue = value.substring(0, start) + aligned + value.substring(end);
      onChange(newValue);
    }
  };

    return(
      <div>
        <div className="flex gap-2 items-center mb-2">
            {/* simple toolbar mock */}
            <div className="flex flex-wrap gap-1 p-2 bg-muted rounded-lg border border-border">
              <Button size={'sm'} variant={'ghost'} className='h-8 px-2' type="button" onClick={()=>applyFormat("bold")}>
                <Bold className="w-4 h-4"/>
              </Button>
              <Button size={'sm'} variant={'ghost'} className='h-8 px-2' type="button" onClick={()=>applyFormat("italic")}>
                <Italic className="w-4 h-4"/>
              </Button>
              <Button size={'sm'} variant={'ghost'} className='h-8 px-2' type="button" onClick={()=>applyFormat("underline")}>
                <Underline className="w-4 h-4"/>
              </Button>
              <Button size={'sm'} variant={'ghost'} className='h-8 px-2' type="button" onClick={()=>applyFormat("h1")}>
                <Heading1 className="w-4 h-4"/>
              </Button>
              <Button size={'sm'} variant={'ghost'} className='h-8 px-2' type="button" onClick={()=>applyFormat("h2")}>
                <Heading2 className="w-4 h-4"/>
              </Button>
              <Button size={'sm'} variant={'ghost'} className='h-8 px-2' type="button" onClick={()=>applyFormat("h3")}>
                <Heading3 className="w-4 h-4"/>
              </Button>
               <div className="w-px h-8 bg-border mx-1" />
        
        <Button
          type="button"
          size="sm"
          variant="ghost"
          onClick={() => applyAlignment("left")}
          className="h-8 px-2"
        >
          <AlignLeft className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          onClick={() => applyAlignment("center")}
          className="h-8 px-2"
        >
          <AlignCenter className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          onClick={() => applyAlignment("right")}
          className="h-8 px-2"
        >
          <AlignRight className="h-4 w-4" />
        </Button>
            </div>
        </div>
        <textarea 
        id="contract-editor"  
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder || "Enter your contract details here..."} 
        className="w-full h-48 border border-gray-200 rounded p-3 text-sm resize-none"></textarea>
    </div>

    )
}

export default RichTextArea;
