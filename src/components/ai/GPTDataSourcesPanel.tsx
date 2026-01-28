import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useGPTFiles, useCreateGPTFile, useDeleteGPTFile, TOKEN_LIMIT, getCapacityPercent, getCapacityColor, estimateTokens } from '@/hooks/useGPTFiles';
import { Plus, FileText, Globe, Type, Trash2, ChevronDown, Loader2, Info, Upload } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface GPTDataSourcesPanelProps {
  gptId: string;
  gptName: string;
}

export function GPTDataSourcesPanel({ gptId, gptName }: GPTDataSourcesPanelProps) {
  const { data: files = [], isLoading } = useGPTFiles(gptId);
  const createFile = useCreateGPTFile();
  const deleteFile = useDeleteGPTFile();
  
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [addType, setAddType] = useState<'file' | 'url' | 'text'>('file');
  const [name, setName] = useState('');
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [textContent, setTextContent] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadedFileUrl, setUploadedFileUrl] = useState<string | null>(null);
  
  const [filesOpen, setFilesOpen] = useState(true);
  const [urlsOpen, setUrlsOpen] = useState(true);
  const [textsOpen, setTextsOpen] = useState(true);

  const totalTokens = files.reduce((sum, f) => sum + (f.estimated_tokens || 0), 0);
  const capacityPercent = getCapacityPercent(totalTokens);
  const capacityColor = getCapacityColor(capacityPercent);

  const fileItems = files.filter(f => f.file_type === 'document' || f.file_type === 'image');
  const urlItems = files.filter(f => f.file_type === 'url');
  const textItems = files.filter(f => f.file_type === 'text');

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${gptId}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('gpt-files')
        .upload(fileName, file);

      if (uploadError) {
        console.warn('Storage upload failed:', uploadError);
        setUploadedFileUrl(`local:${file.name}`);
      } else {
        const { data: { publicUrl } } = supabase.storage
          .from('gpt-files')
          .getPublicUrl(fileName);
        setUploadedFileUrl(publicUrl);
      }
      if (!name) setName(file.name);
      toast.success('File ready');
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Failed to upload file');
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async () => {
    if (!name.trim()) {
      toast.error('Please enter a name');
      return;
    }

    let fileType = 'document';
    let content = '';

    if (addType === 'file') {
      if (!uploadedFileUrl) {
        toast.error('Please upload a file');
        return;
      }
      fileType = 'document';
    } else if (addType === 'url') {
      if (!websiteUrl) {
        toast.error('Please enter a URL');
        return;
      }
      fileType = 'url';
    } else {
      if (!textContent) {
        toast.error('Please enter text content');
        return;
      }
      fileType = 'text';
      content = textContent;
    }

    await createFile.mutateAsync({
      gpt_id: gptId,
      name: name.trim(),
      file_type: fileType,
      file_url: addType === 'file' ? uploadedFileUrl || undefined : undefined,
      website_url: addType === 'url' ? websiteUrl : undefined,
      content: addType === 'text' ? content : undefined,
    });

    resetForm();
    setAddDialogOpen(false);
  };

  const resetForm = () => {
    setName('');
    setWebsiteUrl('');
    setTextContent('');
    setUploadedFileUrl(null);
    setAddType('file');
  };

  const formatTokens = (tokens: number) => {
    if (tokens >= 1000) return `${(tokens / 1000).toFixed(1)}k`;
    return tokens.toString();
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-4">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h4 className="font-medium text-sm">Data Sources</h4>
          <span className="text-xs text-muted-foreground">({files.length})</span>
        </div>
        <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm" variant="outline">
              <Plus className="h-3 w-3 mr-1" />
              Add
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Add Data Source</DialogTitle>
            </DialogHeader>
            <Tabs value={addType} onValueChange={(v) => setAddType(v as 'file' | 'url' | 'text')}>
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="file" className="text-xs">
                  <Upload className="h-3 w-3 mr-1" />
                  File
                </TabsTrigger>
                <TabsTrigger value="url" className="text-xs">
                  <Globe className="h-3 w-3 mr-1" />
                  URL
                </TabsTrigger>
                <TabsTrigger value="text" className="text-xs">
                  <Type className="h-3 w-3 mr-1" />
                  Text
                </TabsTrigger>
              </TabsList>
              
              <div className="mt-4 space-y-4">
                <div className="space-y-2">
                  <Label>Name</Label>
                  <Input 
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Source name..."
                  />
                </div>

                <TabsContent value="file" className="mt-0 space-y-2">
                  <Label>Upload File</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      type="file"
                      accept=".pdf,.doc,.docx,.txt,.png,.jpg,.jpeg"
                      onChange={handleFileUpload}
                      disabled={uploading}
                    />
                    {uploading && <Loader2 className="h-4 w-4 animate-spin" />}
                  </div>
                  {uploadedFileUrl && (
                    <p className="text-xs text-primary">File ready</p>
                  )}
                </TabsContent>

                <TabsContent value="url" className="mt-0 space-y-2">
                  <Label>Website URL</Label>
                  <Input 
                    value={websiteUrl}
                    onChange={(e) => setWebsiteUrl(e.target.value)}
                    placeholder="https://example.com/page"
                    type="url"
                  />
                  <p className="text-xs text-muted-foreground">
                    AI will reference this URL for context
                  </p>
                </TabsContent>

                <TabsContent value="text" className="mt-0 space-y-2">
                  <Label>Text Content</Label>
                  <Textarea
                    value={textContent}
                    onChange={(e) => setTextContent(e.target.value)}
                    placeholder="Paste your text content..."
                    rows={6}
                  />
                  {textContent && (
                    <p className="text-xs text-muted-foreground">
                      ~{formatTokens(estimateTokens(textContent))} tokens
                    </p>
                  )}
                </TabsContent>

                <Button 
                  onClick={handleSubmit} 
                  disabled={createFile.isPending || !name.trim()}
                  className="w-full"
                >
                  {createFile.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Adding...
                    </>
                  ) : (
                    'Add Source'
                  )}
                </Button>
              </div>
            </Tabs>
          </DialogContent>
        </Dialog>
      </div>

      {/* Capacity bar */}
      <div className="space-y-1">
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">
            {formatTokens(totalTokens)} / {formatTokens(TOKEN_LIMIT)} tokens
          </span>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger>
                <Info className="h-3 w-3 text-muted-foreground" />
              </TooltipTrigger>
              <TooltipContent>
                <p className="text-xs">Token limit for GPT context</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
        <Progress value={capacityPercent} className="h-2" />
      </div>

      {/* Files & Images */}
      <Collapsible open={filesOpen} onOpenChange={setFilesOpen}>
        <CollapsibleTrigger className="flex items-center justify-between w-full py-2 text-sm hover:bg-muted/50 rounded px-2 -mx-2">
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-muted-foreground" />
            <span>Files & Images</span>
            <span className="text-xs text-muted-foreground">({fileItems.length})</span>
          </div>
          <ChevronDown className={`h-4 w-4 transition-transform ${filesOpen ? '' : '-rotate-90'}`} />
        </CollapsibleTrigger>
        <CollapsibleContent className="space-y-1 pl-6">
          {fileItems.length === 0 ? (
            <p className="text-xs text-muted-foreground py-2">No files uploaded</p>
          ) : (
            fileItems.map((file) => (
              <div key={file.id} className="flex items-center justify-between py-1.5 group">
                <div className="flex items-center gap-2 min-w-0">
                  <FileText className="h-3 w-3 text-muted-foreground shrink-0" />
                  <span className="text-sm truncate">{file.name}</span>
                  {file.estimated_tokens > 0 && (
                    <span className="text-xs text-muted-foreground shrink-0">
                      {formatTokens(file.estimated_tokens)}
                    </span>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 opacity-0 group-hover:opacity-100"
                  onClick={() => deleteFile.mutate({ id: file.id, gptId })}
                >
                  <Trash2 className="h-3 w-3 text-destructive" />
                </Button>
              </div>
            ))
          )}
        </CollapsibleContent>
      </Collapsible>

      {/* Web Pages */}
      <Collapsible open={urlsOpen} onOpenChange={setUrlsOpen}>
        <CollapsibleTrigger className="flex items-center justify-between w-full py-2 text-sm hover:bg-muted/50 rounded px-2 -mx-2">
          <div className="flex items-center gap-2">
            <Globe className="h-4 w-4 text-muted-foreground" />
            <span>Web Pages</span>
            <span className="text-xs text-muted-foreground">({urlItems.length})</span>
          </div>
          <ChevronDown className={`h-4 w-4 transition-transform ${urlsOpen ? '' : '-rotate-90'}`} />
        </CollapsibleTrigger>
        <CollapsibleContent className="space-y-1 pl-6">
          {urlItems.length === 0 ? (
            <p className="text-xs text-muted-foreground py-2">No web pages added</p>
          ) : (
            urlItems.map((file) => (
              <div key={file.id} className="flex items-center justify-between py-1.5 group">
                <div className="flex items-center gap-2 min-w-0">
                  <Globe className="h-3 w-3 text-muted-foreground shrink-0" />
                  <span className="text-sm truncate">{file.name}</span>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 opacity-0 group-hover:opacity-100"
                  onClick={() => deleteFile.mutate({ id: file.id, gptId })}
                >
                  <Trash2 className="h-3 w-3 text-destructive" />
                </Button>
              </div>
            ))
          )}
        </CollapsibleContent>
      </Collapsible>

      {/* Text Snippets */}
      <Collapsible open={textsOpen} onOpenChange={setTextsOpen}>
        <CollapsibleTrigger className="flex items-center justify-between w-full py-2 text-sm hover:bg-muted/50 rounded px-2 -mx-2">
          <div className="flex items-center gap-2">
            <Type className="h-4 w-4 text-muted-foreground" />
            <span>Text Snippets</span>
            <span className="text-xs text-muted-foreground">({textItems.length})</span>
          </div>
          <ChevronDown className={`h-4 w-4 transition-transform ${textsOpen ? '' : '-rotate-90'}`} />
        </CollapsibleTrigger>
        <CollapsibleContent className="space-y-1 pl-6">
          {textItems.length === 0 ? (
            <p className="text-xs text-muted-foreground py-2">No text snippets</p>
          ) : (
            textItems.map((file) => (
              <div key={file.id} className="flex items-center justify-between py-1.5 group">
                <div className="flex items-center gap-2 min-w-0">
                  <Type className="h-3 w-3 text-muted-foreground shrink-0" />
                  <span className="text-sm truncate">{file.name}</span>
                  <span className="text-xs text-muted-foreground shrink-0">
                    {formatTokens(file.estimated_tokens)}
                  </span>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 opacity-0 group-hover:opacity-100"
                  onClick={() => deleteFile.mutate({ id: file.id, gptId })}
                >
                  <Trash2 className="h-3 w-3 text-destructive" />
                </Button>
              </div>
            ))
          )}
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}
