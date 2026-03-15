import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Check,
  Trash2,
  Wand2,
  Star,
  Loader2,
  Upload,
  Eye,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Avatar } from '@/types';
import type { AvatarLook } from '@/hooks/useAvatarLooks';

interface LookItem {
  id: string;
  image_url: string;
  is_primary: boolean;
  angle: string | null;
  avatar_id: string;
  background?: string | null;
  outfit?: string | null;
}

interface LooksTabProps {
  avatar: Avatar;
  looks: LookItem[];
  isLoading: boolean;
  onSetPrimary: (index: number) => void;
  onDelete: (index: number) => void;
  onUpload: () => void;
  isUploading: boolean;
  isPrimaryPending: boolean;
  isDeletePending: boolean;
}

export function LooksTab({
  avatar,
  looks,
  isLoading,
  onSetPrimary,
  onDelete,
  onUpload,
  isUploading,
  isPrimaryPending,
  isDeletePending,
}: LooksTabProps) {
  const [previewIndex, setPreviewIndex] = useState<number | null>(null);

  const previewLook = previewIndex !== null ? looks[previewIndex] : null;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Label className="text-sm font-semibold">All Looks</Label>
          <Badge variant="outline" className="text-xs">{looks.length}</Badge>
        </div>
        <Button size="sm" variant="outline" onClick={onUpload} disabled={isUploading} className="gap-1.5">
          {isUploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
          Upload
        </Button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : looks.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground text-sm">
          No looks yet. Generate or upload one.
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-3">
          {looks.map((look, index) => (
            <div
              key={look.id}
              className="group relative rounded-lg overflow-hidden border bg-muted aspect-square cursor-pointer"
              onClick={() => setPreviewIndex(index)}
            >
              <img
                src={look.image_url}
                alt={`Look ${index + 1}`}
                className="w-full h-full object-cover"
              />
              {/* Primary badge */}
              {look.is_primary && (
                <div className="absolute top-2 left-2">
                  <Badge className="bg-primary text-primary-foreground text-[10px] gap-1 px-1.5 py-0.5">
                    <Star className="h-2.5 w-2.5 fill-current" /> Primary
                  </Badge>
                </div>
              )}
              {/* Angle label */}
              {look.angle && (
                <span className="absolute bottom-0 left-0 right-0 text-[10px] bg-black/60 text-white text-center py-0.5">
                  {look.angle}
                </span>
              )}
              {/* Hover overlay with actions */}
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                <Button size="icon" variant="secondary" className="h-8 w-8" onClick={(e) => { e.stopPropagation(); setPreviewIndex(index); }}>
                  <Eye className="h-4 w-4" />
                </Button>
                {look.id !== 'primary' && !look.is_primary && (
                  <Button
                    size="icon"
                    variant="secondary"
                    className="h-8 w-8"
                    onClick={(e) => { e.stopPropagation(); onSetPrimary(index); }}
                    disabled={isPrimaryPending}
                  >
                    <Star className="h-4 w-4" />
                  </Button>
                )}
                {look.id !== 'primary' && (
                  <Button
                    size="icon"
                    variant="destructive"
                    className="h-8 w-8"
                    onClick={(e) => { e.stopPropagation(); onDelete(index); }}
                    disabled={isDeletePending}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Preview Dialog */}
      <Dialog open={previewIndex !== null} onOpenChange={(open) => !open && setPreviewIndex(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              Look {previewIndex !== null ? previewIndex + 1 : ''}
              {previewLook?.is_primary && (
                <Badge className="bg-primary text-primary-foreground text-xs gap-1">
                  <Star className="h-3 w-3 fill-current" /> Primary
                </Badge>
              )}
            </DialogTitle>
          </DialogHeader>
          {previewLook && (
            <div className="space-y-4">
              <div className="rounded-lg overflow-hidden bg-muted">
                <img
                  src={previewLook.image_url}
                  alt="Look preview"
                  className="w-full max-h-[60vh] object-contain"
                />
              </div>
              {previewLook.angle && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <span>Angle: <strong className="text-foreground">{previewLook.angle}</strong></span>
                </div>
              )}
              <div className="flex gap-2">
                {previewLook.id !== 'primary' && !previewLook.is_primary && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 gap-2"
                    onClick={() => { onSetPrimary(previewIndex!); setPreviewIndex(null); }}
                    disabled={isPrimaryPending}
                  >
                    <Check className="h-4 w-4" /> Set as Primary
                  </Button>
                )}
                {previewLook.id !== 'primary' && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-2 text-destructive hover:text-destructive"
                    onClick={() => { onDelete(previewIndex!); setPreviewIndex(null); }}
                    disabled={isDeletePending}
                  >
                    <Trash2 className="h-4 w-4" /> Delete
                  </Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
