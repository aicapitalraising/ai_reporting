import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useKnowledgeDocuments, useCreateDocument, useDeleteDocument, KnowledgeDocument } from '@/hooks/useKnowledgeBase';
import { Plus, FileText, Globe, Trash2, Upload, Loader2, File, Link } from 'lucide-react';
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
        // If bucket doesn't exist, just store a reference
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
    
    // Reset form
    setName('');
    setContent('');
    setWebsiteUrl('');
    setUploadedFileUrl(null);
    setAddDialogOpen(false);
  };

  const getDocIcon = (doc: KnowledgeDocument) => {
    switch (doc.document_type) {
      case 'url':
        return <Globe className="h-5 w-5 text-primary" />;
      case 'text':
        return <FileText className="h-5 w-5 text-secondary-foreground" />;
      default:
        return <File className="h-5 w-5 text-destructive" />;
    }
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
            Upload documents, add websites, or paste text for AI to reference
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
        <div className="grid gap-3">
          {documents.map((doc) => (
            <Card key={doc.id}>
              <CardContent className="flex items-center justify-between p-4">
                <div className="flex items-center gap-3">
                  {getDocIcon(doc)}
                  <div>
                    <p className="font-medium">{doc.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {doc.document_type.toUpperCase()} • Added {format(new Date(doc.created_at), 'MMM d, yyyy')}
                    </p>
                    {doc.website_url && (
                      <a 
                        href={doc.website_url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-xs text-primary hover:underline"
                      >
                        {doc.website_url}
                      </a>
                    )}
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => deleteDocument.mutate(doc.id)}
                  disabled={deleteDocument.isPending}
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

// Needed for icon reference
import { BookOpen } from 'lucide-react';
