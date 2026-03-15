import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Upload, FileText, Sparkles, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface ScriptUploaderProps {
  onScriptSubmit: (title: string, content: string) => void;
  isProcessing?: boolean;
}

export function ScriptUploader({ onScriptSubmit, isProcessing }: ScriptUploaderProps) {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [isDragOver, setIsDragOver] = useState(false);

  const handleFileUpload = async (file: File) => {
    if (!file.name.endsWith('.txt') && !file.name.endsWith('.md')) {
      toast.error('Please upload a .txt or .md file');
      return;
    }

    try {
      const text = await file.text();
      setContent(text);
      setTitle(file.name.replace(/\.(txt|md)$/, ''));
      toast.success('Script loaded');
    } catch (err) {
      toast.error('Failed to read file');
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFileUpload(file);
  };

  const handleSubmit = () => {
    if (!content.trim()) {
      toast.error('Please enter or upload a script');
      return;
    }
    onScriptSubmit(title || 'Untitled Script', content.trim());
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <FileText className="h-5 w-5 text-primary" />
          Video Script
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Title */}
        <div className="space-y-2">
          <Label>Script Title</Label>
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="My Video Ad"
          />
        </div>

        {/* Upload Zone */}
        <div
          onDrop={handleDrop}
          onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
          onDragLeave={() => setIsDragOver(false)}
          className={`
            border-2 border-dashed rounded-lg p-6 text-center transition-colors
            ${isDragOver ? 'border-primary bg-primary/5' : 'border-border'}
          `}
        >
          <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
          <p className="text-sm text-muted-foreground mb-2">
            Drag & drop a script file or
          </p>
          <label className="cursor-pointer">
            <span className="text-primary hover:underline text-sm">browse files</span>
            <input
              type="file"
              accept=".txt,.md"
              className="hidden"
              onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0])}
            />
          </label>
        </div>

        {/* Script Content */}
        <div className="space-y-2">
          <Label>Script Content</Label>
          <Textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder={`Enter your video script here...

Scene 1: Product introduction
Show the product on a clean background with soft lighting...

Scene 2: Feature highlight
Demonstrate the key feature with close-up shots...

Scene 3: Call to action
End with logo and purchase information...`}
            rows={10}
            className="font-mono text-sm"
          />
          <p className="text-xs text-muted-foreground">
            Separate scenes with blank lines or use "Scene X:" markers
          </p>
        </div>

        {/* Submit */}
        <Button
          onClick={handleSubmit}
          disabled={!content.trim() || isProcessing}
          className="w-full gap-2"
          size="lg"
        >
          {isProcessing ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Generating Storyboard...
            </>
          ) : (
            <>
              <Sparkles className="h-4 w-4" />
              Generate Storyboard
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
