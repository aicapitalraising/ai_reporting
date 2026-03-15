import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Download,
  Trash2,
  Wand2,
  Loader2,
  X,
  ExternalLink,
  Play,
  Image as ImageIcon,
} from 'lucide-react';
import { toast } from 'sonner';
import type { Asset } from '@/types';
import { cn } from '@/lib/utils';
import { isGoogleApiUrl, fetchVideoViaProxy } from '@/lib/video-proxy';

interface AssetActionsDialogProps {
  asset: Asset | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDelete: (asset: Asset) => Promise<void>;
  onAIEdit?: (asset: Asset, prompt: string) => Promise<void>;
}

export function AssetActionsDialog({
  asset,
  open,
  onOpenChange,
  onDelete,
  onAIEdit,
}: AssetActionsDialogProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editPrompt, setEditPrompt] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showEditPanel, setShowEditPanel] = useState(false);
  const [proxiedVideoUrl, setProxiedVideoUrl] = useState<string | null>(null);

  // Proxy Google API video URLs
  useEffect(() => {
    if (asset && (asset.type === 'video' || asset.type === 'broll') && asset.public_url && isGoogleApiUrl(asset.public_url)) {
      fetchVideoViaProxy(asset.public_url).then(setProxiedVideoUrl).catch(() => {});
    } else {
      setProxiedVideoUrl(null);
    }
    return () => {
      if (proxiedVideoUrl) URL.revokeObjectURL(proxiedVideoUrl);
    };
  }, [asset?.id, asset?.public_url]);

  if (!asset) return null;

  const isVideo = asset.type === 'video' || asset.type === 'broll';
  const isImage = asset.type === 'image';
  const metadata = asset.metadata as Record<string, unknown> || {};
  const videoSrc = proxiedVideoUrl || (isVideo && asset.public_url && !isGoogleApiUrl(asset.public_url) ? asset.public_url : undefined);

  const handleDownload = async () => {
    if (!asset.public_url) {
      toast.error('No download URL available');
      return;
    }

    try {
      let url: string;
      if (isVideo && isGoogleApiUrl(asset.public_url)) {
        url = await fetchVideoViaProxy(asset.public_url);
      } else {
        const response = await fetch(asset.public_url);
        const blob = await response.blob();
        url = URL.createObjectURL(blob);
      }
      const a = document.createElement('a');
      a.href = url;
      const extension = isVideo ? 'mp4' : 'png';
      a.download = `${asset.name || asset.id}.${extension}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success('Downloaded successfully');
    } catch (error) {
      console.error('Download error:', error);
      toast.error('Failed to download');
    }
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await onDelete(asset);
      toast.success('Asset deleted');
      onOpenChange(false);
    } catch (error) {
      console.error('Delete error:', error);
      toast.error('Failed to delete');
    } finally {
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  const handleAIEdit = async () => {
    if (!editPrompt.trim()) {
      toast.error('Please enter an edit prompt');
      return;
    }

    if (!onAIEdit) {
      toast.info('AI editing coming soon!');
      return;
    }

    setIsEditing(true);
    try {
      await onAIEdit(asset, editPrompt);
      toast.success('AI edit started!');
      setEditPrompt('');
      setShowEditPanel(false);
    } catch (error) {
      console.error('AI edit error:', error);
      toast.error('Failed to start AI edit');
    } finally {
      setIsEditing(false);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {isVideo ? (
                <Play className="h-5 w-5 text-primary" />
              ) : (
                <ImageIcon className="h-5 w-5 text-primary" />
              )}
              {asset.name || `${asset.type}-${asset.id.slice(0, 8)}`}
            </DialogTitle>
            <DialogDescription>
              View, download, edit, or delete this asset
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Preview */}
            <div className="relative rounded-lg overflow-hidden bg-muted aspect-video">
              {isVideo && (videoSrc || asset.public_url) ? (
                videoSrc ? (
                  <video
                    src={videoSrc}
                    controls
                    autoPlay
                    loop
                    className="w-full h-full object-contain"
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                  </div>
                )
              ) : isImage && asset.public_url ? (
                <img
                  src={asset.public_url}
                  alt={asset.name || 'Asset'}
                  className="w-full h-full object-contain"
                />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center text-muted-foreground">
                  No preview available
                </div>
              )}
            </div>

            {/* Metadata */}
            <div className="flex flex-wrap gap-2">
              <Badge variant="outline" className="capitalize">
                {asset.type}
              </Badge>
              <Badge
                variant={asset.status === 'completed' ? 'default' : 'secondary'}
                className="capitalize"
              >
                {asset.status}
              </Badge>
              {metadata.aspectRatio && (
                <Badge variant="secondary">{String(metadata.aspectRatio)}</Badge>
              )}
              {metadata.duration && (
                <Badge variant="secondary">{String(metadata.duration)}s</Badge>
              )}
            </div>

            {/* Prompt/Description */}
            {metadata.prompt && (
              <div className="p-3 rounded-lg bg-muted">
                <p className="text-sm text-muted-foreground">
                  <strong className="text-foreground">Prompt:</strong>{' '}
                  {String(metadata.prompt)}
                </p>
              </div>
            )}

            {/* AI Edit Panel */}
            {showEditPanel && (
              <div className="p-4 rounded-lg border border-primary/30 bg-primary/5 space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="flex items-center gap-2">
                    <Wand2 className="h-4 w-4 text-primary" />
                    AI Edit Prompt
                  </Label>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={() => setShowEditPanel(false)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                <Textarea
                  value={editPrompt}
                  onChange={(e) => setEditPrompt(e.target.value)}
                  placeholder={
                    isVideo
                      ? 'Describe how to modify this video... (e.g., "make it more dramatic", "add slow motion")'
                      : 'Describe how to edit this image... (e.g., "change background to sunset", "add product glow")'
                  }
                  rows={3}
                />
                <Button
                  onClick={handleAIEdit}
                  disabled={isEditing || !editPrompt.trim()}
                  className="w-full"
                >
                  {isEditing ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <Wand2 className="h-4 w-4 mr-2" />
                      Apply AI Edit
                    </>
                  )}
                </Button>
              </div>
            )}

            {/* Actions */}
            <div className="flex flex-wrap gap-2">
              <Button onClick={handleDownload} variant="outline" className="gap-2">
                <Download className="h-4 w-4" />
                Download
              </Button>

              {asset.public_url && (
                <Button
                  variant="outline"
                  className="gap-2"
                  onClick={() => window.open(asset.public_url!, '_blank')}
                >
                  <ExternalLink className="h-4 w-4" />
                  Open in New Tab
                </Button>
              )}

              {!showEditPanel && (
                <Button
                  variant="outline"
                  className="gap-2"
                  onClick={() => setShowEditPanel(true)}
                >
                  <Wand2 className="h-4 w-4" />
                  AI Edit
                </Button>
              )}

              <Button
                variant="destructive"
                className="gap-2 ml-auto"
                onClick={() => setShowDeleteConfirm(true)}
              >
                <Trash2 className="h-4 w-4" />
                Delete
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this asset?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete "{asset.name || asset.type}" from storage.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                'Delete'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
