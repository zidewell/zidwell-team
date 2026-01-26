"use client";
import { useState } from "react";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/app/components/ui/select";
import { Switch } from "@/app/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/app/components/ui/card";
import {
  Bold,
  Italic,
  Underline,
  List,
  ListOrdered,
  Quote,
  Link2,
  Image as ImageIcon,
  Video,
  Mic,
  Heading1,
  Heading2,
  Heading3,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Indent,
  Outdent,
  Save,
  Eye,
  Send,
  X,
} from "lucide-react";
import { categories } from "@/app/blog/data/mockData";
import { Separator } from "@/app/components/ui/separator";
import { useRouter } from "next/navigation";
import AdminLayout from "@/app/components/blog-components/admin/AdminLayout";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { Label } from "@/app/components/ui/label";
import { Textarea } from "@/app/components/ui/textarea";
import Image from "next/image";

// Define type for toolbar buttons
type ToolbarButton = {
  type?: "separator";
  icon?: React.ComponentType<{ className?: string }>;
  label?: string;
  command?: string;
};

const toolbarButtons: ToolbarButton[] = [
  { icon: Bold, label: "Bold", command: "bold" },
  { icon: Italic, label: "Italic", command: "italic" },
  { icon: Underline, label: "Underline", command: "underline" },
  { type: "separator" },
  { icon: Heading1, label: "Heading 1", command: "h1" },
  { icon: Heading2, label: "Heading 2", command: "h2" },
  { icon: Heading3, label: "Heading 3", command: "h3" },
  { type: "separator" },
  { icon: List, label: "Bullet List", command: "ul" },
  { icon: ListOrdered, label: "Numbered List", command: "ol" },
  { icon: Quote, label: "Quote", command: "quote" },
  { type: "separator" },
  { icon: AlignLeft, label: "Align Left", command: "left" },
  { icon: AlignCenter, label: "Align Center", command: "center" },
  { icon: AlignRight, label: "Align Right", command: "right" },
  { type: "separator" },
  { icon: Indent, label: "Indent", command: "indent" },
  { icon: Outdent, label: "Outdent", command: "outdent" },
  { type: "separator" },
  { icon: Link2, label: "Add Link", command: "link" },
  { icon: ImageIcon, label: "Add Image", command: "image" },
  { icon: Video, label: "Add Video", command: "video" },
  { icon: Mic, label: "Add Audio", command: "audio" },
];

const PostEditor = () => {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [excerpt, setExcerpt] = useState("");
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [newCategory, setNewCategory] = useState("");
  const [featuredImage, setFeaturedImage] = useState("");
  const [audioFile, setAudioFile] = useState("");
  const [isPublished, setIsPublished] = useState(false);
  const [tags, setTags] = useState("");

  const handleToolbarClick = (command: string) => {
    // In a real implementation, this would apply formatting to the content
    console.log("Toolbar command:", command);
    // For now, let's implement basic text insertion
    const textArea = document.querySelector('textarea');
    if (textArea) {
      const start = textArea.selectionStart;
      const end = textArea.selectionEnd;
      const selectedText = content.substring(start, end);
      
      let formattedText = '';
      
      switch(command) {
        case 'bold':
          formattedText = `**${selectedText || 'bold text'}**`;
          break;
        case 'italic':
          formattedText = `*${selectedText || 'italic text'}*`;
          break;
        case 'underline':
          formattedText = `<u>${selectedText || 'underlined text'}</u>`;
          break;
        case 'h1':
          formattedText = `# ${selectedText || 'Heading 1'}`;
          break;
        case 'h2':
          formattedText = `## ${selectedText || 'Heading 2'}`;
          break;
        case 'h3':
          formattedText = `### ${selectedText || 'Heading 3'}`;
          break;
        case 'ul':
          formattedText = selectedText 
            ? selectedText.split('\n').map(line => `- ${line}`).join('\n')
            : '- List item';
          break;
        case 'ol':
          formattedText = selectedText 
            ? selectedText.split('\n').map((line, i) => `${i + 1}. ${line}`).join('\n')
            : '1. List item';
          break;
        case 'quote':
          formattedText = `> ${selectedText || 'Quote text'}`;
          break;
        default:
          formattedText = selectedText;
      }
      
      const newContent = content.substring(0, start) + formattedText + content.substring(end);
      setContent(newContent);
      
      // Focus back on textarea
      setTimeout(() => {
        textArea.focus();
        textArea.setSelectionRange(start + formattedText.length, start + formattedText.length);
      }, 0);
    }
  };

  const handleSave = (publish: boolean) => {
    const post = {
      title,
      content,
      excerpt,
      categories: selectedCategories,
      featuredImage,
      audioFile,
      isPublished: publish,
      tags: tags.split(",").map((t) => t.trim()).filter(t => t),
    };
    console.log("Saving post:", post);
    alert(publish ? "Post published!" : "Draft saved!");
    router.push("/admin/posts");
  };

  const addCategory = () => {
    if (newCategory.trim() && !selectedCategories.includes(newCategory.trim())) {
      setSelectedCategories([...selectedCategories, newCategory.trim()]);
      setNewCategory("");
    }
  };

  const removeCategory = (category: string) => {
    setSelectedCategories(selectedCategories.filter((c) => c !== category));
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setFeaturedImage(event.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAudioUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setAudioFile(file.name);
    }
  };

  return (
    <AdminLayout>
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold">Create New Post</h1>
            <p className="text-muted-foreground">
              Write and publish your article
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Button variant="outline" onClick={() => handleSave(false)}>
              <Save className="w-4 h-4 mr-2" />
              Save Draft
            </Button>
            <Button variant="outline" onClick={() => console.log("Preview")}>
              <Eye className="w-4 h-4 mr-2" />
              Preview
            </Button>
            <Button
              className="bg-accent text-accent-foreground hover:bg-accent/90"
              onClick={() => handleSave(true)}
            >
              <Send className="w-4 h-4 mr-2" />
              Publish
            </Button>
          </div>
        </div>

        <div className="grid lg:grid-cols-[1fr_300px] gap-6">
          {/* Main Editor */}
          <div className="space-y-6">
            {/* Title */}
            <Input
              placeholder="Enter your title..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="text-3xl font-semibold h-auto py-4 px-0 border-0 border-b rounded-none focus-visible:ring-0 focus-visible:border-accent"
            />

            {/* Toolbar */}
            <div className="flex flex-wrap items-center gap-1 p-2 bg-secondary/50 rounded-lg border border-border">
              {toolbarButtons.map((btn, index) =>
                btn.type === "separator" ? (
                  <Separator key={`separator-${index}`} orientation="vertical" className="h-6 mx-1" />
                ) : (
                  <Button
                    key={btn.command}
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => btn.command && handleToolbarClick(btn.command)}
                    title={btn.label}
                    type="button"
                  >
                    {btn.icon && <btn.icon className="w-4 h-4" />}
                  </Button>
                )
              )}
            </div>

            {/* Content Editor */}
            <Textarea
              placeholder="Start writing your story..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="min-h-[400px] text-lg leading-relaxed resize-y"
            />

            {/* Excerpt */}
            <div className="space-y-2">
              <Label htmlFor="excerpt">Excerpt</Label>
              <Textarea
                id="excerpt"
                placeholder="Write a brief summary of your article..."
                value={excerpt}
                onChange={(e) => setExcerpt(e.target.value)}
                rows={3}
              />
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Publish Settings */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Publish Settings</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label htmlFor="publish-switch">Publish immediately</Label>
                  <Switch
                    id="publish-switch"
                    checked={isPublished}
                    onCheckedChange={setIsPublished}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Featured Image */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Featured Image</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {featuredImage ? (
                  <div className="relative group">
                    <div className="w-full aspect-video relative rounded overflow-hidden">
                      <Image
                        src={featuredImage}
                        alt="Featured"
                        fill
                        className="object-cover"
                        sizes="(max-width: 300px) 100vw, 300px"
                      />
                    </div>
                    <Button
                      variant="destructive"
                      size="sm"
                      className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => setFeaturedImage("")}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ) : (
                  <div className="border-2 border-dashed border-border rounded-lg p-6 text-center cursor-pointer hover:bg-secondary/50 transition-colors"
                       onClick={() => document.getElementById('image-upload')?.click()}>
                    <ImageIcon className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
                    <p className="text-sm text-muted-foreground">
                      Click to upload or drag and drop
                    </p>
                    <input
                      id="image-upload"
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleImageUpload}
                    />
                  </div>
                )}
                <Input
                  placeholder="Or paste image URL..."
                  value={featuredImage}
                  onChange={(e) => setFeaturedImage(e.target.value)}
                />
              </CardContent>
            </Card>

            {/* Categories */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Categories</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Select
                  onValueChange={(value) => {
                    if (!selectedCategories.includes(value)) {
                      setSelectedCategories([...selectedCategories, value]);
                    }
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select categories" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((cat) => (
                      <SelectItem key={cat.id} value={cat.name}>
                        {cat.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <div className="flex gap-2">
                  <Input
                    placeholder="Add new category..."
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && addCategory()}
                  />
                  <Button variant="outline" size="icon" onClick={addCategory}>
                    +
                  </Button>
                </div>

                {selectedCategories.length > 0 && (
                  <div className="flex flex-wrap gap-2 pt-2">
                    {selectedCategories.map((cat) => (
                      <div
                        key={cat}
                        className="px-2 py-1 text-xs bg-secondary rounded-full flex items-center gap-1"
                      >
                        {cat}
                        <button
                          onClick={() => removeCategory(cat)}
                          className="hover:text-destructive text-xs"
                          type="button"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Tags */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Tags</CardTitle>
              </CardHeader>
              <CardContent>
                <Input
                  placeholder="Enter tags separated by commas..."
                  value={tags}
                  onChange={(e) => setTags(e.target.value)}
                />
                <p className="text-xs text-muted-foreground mt-2">
                  Separate tags with commas
                </p>
              </CardContent>
            </Card>

            {/* Audio File */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Audio File (Optional)</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  Upload an audio file if this is a podcast episode
                </p>
                <div className="border-2 border-dashed border-border rounded-lg p-4 text-center cursor-pointer hover:bg-secondary/50 transition-colors"
                     onClick={() => document.getElementById('audio-upload')?.click()}>
                  <Mic className="w-6 h-6 mx-auto text-muted-foreground mb-2" />
                  <p className="text-xs text-muted-foreground">
                    MP3, WAV, or M4A
                  </p>
                  <input
                    id="audio-upload"
                    type="file"
                    accept="audio/*"
                    className="hidden"
                    onChange={handleAudioUpload}
                  />
                </div>
                {audioFile && (
                  <div className="text-sm text-muted-foreground">
                    Selected: {audioFile}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default PostEditor;