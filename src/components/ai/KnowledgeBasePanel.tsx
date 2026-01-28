import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useKnowledgeDocuments, useCreateDocument, useDeleteDocument, KnowledgeDocument } from '@/hooks/useKnowledgeBase';
import { TOKEN_LIMIT, getCapacityPercent, getCapacityColor, estimateTokens } from '@/hooks/useGPTFiles';
import { Plus, FileText, Globe, Trash2, Upload, Loader2, File, Link, BookOpen, Info, Type } from 'lucide-react';
import { format } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export function KnowledgeBasePanel() {
  const { data: documents = [], isLoading } = useKnowledgeDocuments();
  const createDocument = useCreateDocument();
  const deleteDocument = useDeleteDocument();
  
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [docType, setDocType] = useState<'pdf' | 'url' | 'text'>('pdf');
  const [name, setName] = useState('');
  const [content, setContent] = useState('');
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadedFileUrl, setUploadedFileUrl] = useState<string | null>(null);

  // Calculate token usage
  const totalTokens = documents.reduce((sum, doc) => {
    const docTokens = (doc as any).estimated_tokens || estimateTokens(doc.content || doc.extracted_text || '');
    return sum + docTokens;
  }, 0);
  const capacityPercent = getCapacityPercent(totalTokens);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}.${fileExt}`;
      const filePath = `knowledge-base/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('documents')
        .upload(filePath, file);

      if (uploadError) {
        console.warn('Storage upload failed, storing reference only');
        setUploadedFileUrl(`local:${file.name}`);
        if (!name) setName(file.name);
      } else {
        const { data: { publicUrl } } = supabase.storage
          .from('documents')
          .getPublicUrl(filePath);
        
        setUploadedFileUrl(publicUrl);
        if (!name) setName(file.name);
      }
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

    const docData: Parameters<typeof createDocument.mutate>[0] = {
      name: name.trim(),
      document_type: docType,
    };

    if (docType === 'pdf' && uploadedFileUrl) {
      docData.file_url = uploadedFileUrl;
    } else if (docType === 'url' && websiteUrl) {
      docData.website_url = websiteUrl;
    } else if (docType === 'text' && content) {
      docData.content = content;
      docData.extracted_text = content;
    }

    await createDocument.mutateAsync(docData);
    
    setName('');
    setContent('');
    setWebsiteUrl('');
    setUploadedFileUrl(null);
    setAddDialogOpen(false);
  };

  const getDocIcon = (doc: KnowledgeDocument) => {
    switch (doc.document_type) {
      case 'url':
        return <Globe className="h-4 w-4 text-primary" />;
      case 'text':
        return <Type className="h-4 w-4 text-muted-foreground" />;
      default:
        return <File className="h-4 w-4 text-destructive" />;
    }
  };

  const getDocTokens = (doc: KnowledgeDocument): number => {
    return (doc as any).estimated_tokens || estimateTokens(doc.content || doc.extracted_text || '');
  };

  const formatTokens = (tokens: number) => {
    if (tokens >= 1000) return `${(tokens / 1000).toFixed(1)}k`;
    return tokens.toString();
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Knowledge Base</h3>
          <p className="text-sm text-muted-foreground">
            Agency-wide context for the main AI assistant
          </p>
        </div>
        <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Document
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Add to Knowledge Base</DialogTitle>
              <DialogDescription>
                Add a document, website, or text for AI to use as context
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Document Type</Label>
                <Select value={docType} onValueChange={(v) => setDocType(v as 'pdf' | 'url' | 'text')}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pdf">
                      <div className="flex items-center gap-2">
                        <Upload className="h-4 w-4" />
                        PDF Upload
                      </div>
                    </SelectItem>
                    <SelectItem value="url">
                      <div className="flex items-center gap-2">
                        <Link className="h-4 w-4" />
                        Website URL
                      </div>
                    </SelectItem>
                    <SelectItem value="text">
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4" />
                        Plain Text
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Name</Label>
                <Input 
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Document name..."
                />
              </div>

              {docType === 'pdf' && (
                <div className="space-y-2">
                  <Label>Upload PDF</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      type="file"
                      accept=".pdf,.doc,.docx,.txt"
                      onChange={handleFileUpload}
                      disabled={uploading}
                    />
                    {uploading && <Loader2 className="h-4 w-4 animate-spin" />}
                  </div>
                  {uploadedFileUrl && (
                    <p className="text-xs text-primary">File uploaded successfully</p>
                  )}
                </div>
              )}

              {docType === 'url' && (
                <div className="space-y-2">
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
                </div>
              )}

              {docType === 'text' && (
                <div className="space-y-2">
                  <Label>Content</Label>
                  <Textarea
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    placeholder="Paste your text content here..."
                    rows={6}
                  />
                  {content && (
                    <p className="text-xs text-muted-foreground">
                      ~{formatTokens(estimateTokens(content))} tokens
                    </p>
                  )}
                </div>
              )}

              <Button 
                onClick={handleSubmit} 
                disabled={createDocument.isPending || !name.trim()}
                className="w-full"
              >
                {createDocument.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Adding...
                  </>
                ) : (
                  'Add to Knowledge Base'
                )}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Token Usage Stats */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">Token Usage</span>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger>
                    <Info className="h-3.5 w-3.5 text-muted-foreground" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="text-xs">Tokens used for AI context window</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <span className="text-xs text-muted-foreground">
              {formatTokens(totalTokens)} / {formatTokens(TOKEN_LIMIT)}
            </span>
          </div>
          <Progress value={capacityPercent} className="h-2" />
          <p className="text-xs text-muted-foreground mt-2">
            {documents.length} document{documents.length !== 1 ? 's' : ''} • Used by Agency AI
          </p>
        </CardContent>
      </Card>

      {documents.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <BookOpen className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground text-center">
              No documents in knowledge base yet.<br />
              Add PDFs, websites, or text for AI to reference.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-2">
          {documents.map((doc) => {
            const docTokens = getDocTokens(doc);
            const tokenPercent = (docTokens / TOKEN_LIMIT) * 100;
            
            return (
              <Card key={doc.id}>
                <CardContent className="flex items-center justify-between p-3">
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center shrink-0">
                      {getDocIcon(doc)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-sm truncate">{doc.name}</p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span>{doc.document_type.toUpperCase()}</span>
                        <span>•</span>
                        <span>{format(new Date(doc.created_at), 'MMM d')}</span>
                        {docTokens > 0 && (
                          <>
                            <span>•</span>
                            <span>{formatTokens(docTokens)} tokens</span>
                          </>
                        )}
                      </div>
                      {docTokens > 0 && (
                        <div className="mt-1.5 w-24">
                          <Progress value={tokenPercent} className="h-1" />
                        </div>
                      )}
                      {doc.website_url && (
                        <a 
                          href={doc.website_url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-xs text-primary hover:underline truncate block mt-1"
                        >
                          {doc.website_url}
                        </a>
                      )}
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="shrink-0"
                    onClick={() => deleteDocument.mutate(doc.id)}
                    disabled={deleteDocument.isPending}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
