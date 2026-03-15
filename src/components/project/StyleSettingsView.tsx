import { useState, useRef, useCallback, DragEvent } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { 
  Plus, 
  Trash2, 
  ImagePlus, 
  Loader2, 
  X, 
  Edit2, 
  Check, 
  Search,
  Upload,
  Images,
  GripVertical,
} from 'lucide-react';
import { useAdStyles, useCreateAdStyle, useUpdateAdStyle, useDeleteAdStyle } from '@/hooks/useAdStyles';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { AdStyle } from '@/types';
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

interface StyleSettingsViewProps {
  clientId?: string;
}

export function StyleSettingsView({ clientId }: StyleSettingsViewProps) {
  const { data: styles = [], isLoading, refetch } = useAdStyles(clientId);
  const createStyle = useCreateAdStyle();
  const updateStyle = useUpdateAdStyle();
  const deleteStyle = useDeleteAdStyle();

  const [searchQuery, setSearchQuery] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<AdStyle | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newStyle, setNewStyle] = useState({ name: '', description: '', prompt_template: '' });
  const [uploadingStyleId, setUploadingStyleId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);

  const filteredStyles = styles
    .filter(
      (style) =>
        style.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        style.description.toLowerCase().includes(searchQuery.toLowerCase())
    )
    .sort((a, b) => a.display_order - b.display_order);

  const handleAddStyle = async () => {
    if (!newStyle.name.trim()) {
      toast.error('Style name is required');
      return;
    }
    try {
      await createStyle.mutateAsync({
        name: newStyle.name,
        description: newStyle.description || 'Custom ad style',
        prompt_template: newStyle.prompt_template || 'Generate an ad with the following specifications...',
        client_id: clientId,
        is_default: false,
        display_order: styles.length,
      });
      setNewStyle({ name: '', description: '', prompt_template: '' });
      setShowAddForm(false);
      toast.success('Style created');
    } catch {
      toast.error('Failed to create style');
    }
  };

  const handleDeleteStyle = async (style: AdStyle) => {
    try {
      await deleteStyle.mutateAsync(style.id);
      setDeleteConfirm(null);
      toast.success('Style deleted');
    } catch {
      toast.error('Failed to delete style');
    }
  };

  const handleDragStart = (e: DragEvent, styleId: string) => {
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', styleId);
    setDraggingId(styleId);
  };

  const handleDragOver = (e: DragEvent, styleId: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (styleId !== dragOverId) setDragOverId(styleId);
  };

  const handleDragLeave = () => {
    setDragOverId(null);
  };

  const handleDrop = async (e: DragEvent, targetId: string) => {
    e.preventDefault();
    const sourceId = e.dataTransfer.getData('text/plain');
    setDragOverId(null);
    setDraggingId(null);

    if (sourceId === targetId) return;

    const sorted = [...filteredStyles];
    const sourceIdx = sorted.findIndex(s => s.id === sourceId);
    const targetIdx = sorted.findIndex(s => s.id === targetId);
    if (sourceIdx === -1 || targetIdx === -1) return;

    const [moved] = sorted.splice(sourceIdx, 1);
    sorted.splice(targetIdx, 0, moved);

    // Update display_order for all affected styles
    try {
      const updates = sorted.map((s, i) => 
        updateStyle.mutateAsync({ id: s.id, display_order: i } as any)
      );
      await Promise.all(updates);
      refetch();
      toast.success('Style order updated');
    } catch {
      toast.error('Failed to reorder');
    }
  };

  const handleDragEnd = () => {
    setDraggingId(null);
    setDragOverId(null);
  };

  const handleBulkUpload = useCallback(async (styleId: string, files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploadingStyleId(styleId);

    const style = styles.find(s => s.id === styleId);
    const existingImages = style?.reference_images || [];
    const newUrls: string[] = [];

    try {
      for (const file of Array.from(files)) {
        if (!file.type.startsWith('image/')) {
          toast.error(`${file.name} is not an image`);
          continue;
        }
        const fileExt = file.name.split('.').pop();
        const filePath = `style-references/${clientId || 'global'}/${styleId}/${Date.now()}-${Math.random().toString(36).substr(2, 9)}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from('assets')
          .upload(filePath, file);

        if (uploadError) {
          console.error('Upload error:', uploadError);
          toast.error(`Failed to upload ${file.name}`);
          continue;
        }

        const { data: { publicUrl } } = supabase.storage
          .from('assets')
          .getPublicUrl(filePath);

        newUrls.push(publicUrl);
      }

      if (newUrls.length > 0) {
        const updatedImages = [...existingImages, ...newUrls];
        await updateStyle.mutateAsync({ id: styleId, reference_images: updatedImages } as any);
        refetch();
        toast.success(`Added ${newUrls.length} reference image(s)`);
      }
    } catch (error) {
      console.error('Bulk upload error:', error);
      toast.error('Failed to upload images');
    } finally {
      setUploadingStyleId(null);
    }
  }, [styles, clientId, updateStyle, refetch]);

  const handleRemoveReferenceImage = useCallback(async (styleId: string, imageUrl: string) => {
    const style = styles.find(s => s.id === styleId);
    const updatedImages = (style?.reference_images || []).filter(url => url !== imageUrl);
    
    try {
      await updateStyle.mutateAsync({ id: styleId, reference_images: updatedImages } as any);
      refetch();
      toast.success('Reference removed');
    } catch {
      toast.error('Failed to remove reference');
    }
  }, [styles, updateStyle, refetch]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Manage Ad Styles</h2>
          <p className="text-sm text-muted-foreground">
            Drag to reorder • Click edit to customize • Add reference images
          </p>
        </div>
        <Button onClick={() => setShowAddForm(true)} disabled={showAddForm}>
          <Plus className="h-4 w-4 mr-2" />
          Add Style
        </Button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search styles..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Add New Style Form */}
      {showAddForm && (
        <Card className="border-primary/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">New Custom Style</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <Label className="text-xs">Name</Label>
              <Input
                value={newStyle.name}
                onChange={(e) => setNewStyle({ ...newStyle, name: e.target.value })}
                placeholder="Style name"
                className="h-8"
              />
            </div>
            <div>
              <Label className="text-xs">Description</Label>
              <Textarea
                value={newStyle.description}
                onChange={(e) => setNewStyle({ ...newStyle, description: e.target.value })}
                placeholder="Brief description"
                rows={2}
              />
            </div>
            <div>
              <Label className="text-xs">Prompt Template</Label>
              <Textarea
                value={newStyle.prompt_template}
                onChange={(e) => setNewStyle({ ...newStyle, prompt_template: e.target.value })}
                placeholder="AI generation prompt..."
                rows={4}
              />
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" size="sm" onClick={() => setShowAddForm(false)}>Cancel</Button>
              <Button size="sm" onClick={handleAddStyle} disabled={createStyle.isPending}>
                {createStyle.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Create'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* All Styles - Single sortable list */}
      <div className="space-y-4">
        {filteredStyles.map((style) => (
          <StyleCard
            key={style.id}
            style={style}
            isEditing={editingId === style.id}
            isUploading={uploadingStyleId === style.id}
            isDragging={draggingId === style.id}
            isDragOver={dragOverId === style.id}
            onEdit={(data) => {
              setEditingId(style.id);
            }}
            onCancelEdit={() => setEditingId(null)}
            onSave={async (data) => {
              try {
                await updateStyle.mutateAsync({ id: style.id, ...data });
                setEditingId(null);
                toast.success('Style updated');
              } catch {
                toast.error('Failed to update');
              }
            }}
            onDelete={() => setDeleteConfirm(style)}
            onUpload={(files) => handleBulkUpload(style.id, files)}
            onRemoveImage={(url) => handleRemoveReferenceImage(style.id, url)}
            onDragStart={(e) => handleDragStart(e, style.id)}
            onDragOver={(e) => handleDragOver(e, style.id)}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, style.id)}
            onDragEnd={handleDragEnd}
          />
        ))}
      </div>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Style</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deleteConfirm?.name}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteConfirm && handleDeleteStyle(deleteConfirm)}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

interface StyleCardProps {
  style: AdStyle;
  isEditing: boolean;
  isUploading: boolean;
  isDragging: boolean;
  isDragOver: boolean;
  onEdit: (data: { name: string; description: string; prompt_template: string }) => void;
  onCancelEdit: () => void;
  onSave: (data: { name: string; description: string; prompt_template: string }) => void;
  onDelete: () => void;
  onUpload: (files: FileList | null) => void;
  onRemoveImage: (url: string) => void;
  onDragStart: (e: DragEvent<HTMLDivElement>) => void;
  onDragOver: (e: DragEvent<HTMLDivElement>) => void;
  onDragLeave: () => void;
  onDrop: (e: DragEvent<HTMLDivElement>) => void;
  onDragEnd: () => void;
}

function StyleCard({
  style,
  isEditing,
  isUploading,
  isDragging,
  isDragOver,
  onEdit,
  onCancelEdit,
  onSave,
  onDelete,
  onUpload,
  onRemoveImage,
  onDragStart,
  onDragOver,
  onDragLeave,
  onDrop,
  onDragEnd,
}: StyleCardProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [editData, setEditData] = useState({
    name: style.name,
    description: style.description,
    prompt_template: style.prompt_template,
  });

  const referenceImages = style.reference_images || [];

  const handleStartEdit = () => {
    setEditData({
      name: style.name,
      description: style.description,
      prompt_template: style.prompt_template,
    });
    onEdit(editData);
  };

  return (
    <Card
      draggable
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      onDragEnd={onDragEnd}
      className={`relative group transition-all ${
        isDragging ? 'opacity-40 scale-[0.98]' : ''
      } ${isDragOver ? 'ring-2 ring-primary ring-offset-2' : ''}`}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start gap-3">
          {/* Drag Handle */}
          <div className="cursor-grab active:cursor-grabbing pt-0.5 text-muted-foreground hover:text-foreground transition-colors">
            <GripVertical className="h-5 w-5" />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1">
                {isEditing ? (
                  <Input
                    value={editData.name}
                    onChange={(e) => setEditData({ ...editData, name: e.target.value })}
                    className="h-8 text-sm font-semibold"
                  />
                ) : (
                  <CardTitle className="text-base flex items-center gap-2 flex-wrap">
                    {style.name}
                    {style.is_default && (
                      <Badge variant="secondary" className="text-[10px]">Default</Badge>
                    )}
                    {referenceImages.length > 0 && (
                      <Badge variant="outline" className="text-[10px] gap-1">
                        <Images className="h-3 w-3" />
                        {referenceImages.length}
                      </Badge>
                    )}
                  </CardTitle>
                )}
              </div>
              <div className="flex items-center gap-1 flex-shrink-0">
                {isEditing ? (
                  <>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onCancelEdit}>
                      <X className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-primary" onClick={() => onSave(editData)}>
                      <Check className="h-3.5 w-3.5" />
                    </Button>
                  </>
                ) : (
                  <>
                    <Button
                      variant="ghost" size="icon"
                      className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={handleStartEdit}
                    >
                      <Edit2 className="h-3.5 w-3.5" />
                    </Button>
                    {!style.is_default && (
                      <Button
                        variant="ghost" size="icon"
                        className="h-7 w-7 text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={onDelete}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </>
                )}
              </div>
            </div>
            {isEditing ? (
              <Textarea
                value={editData.description}
                onChange={(e) => setEditData({ ...editData, description: e.target.value })}
                className="text-xs mt-2"
                rows={2}
              />
            ) : (
              <CardDescription className="text-xs mt-1">{style.description}</CardDescription>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        {/* Reference Images - Large format */}
        <div className="mt-1">
          <div className="flex items-center justify-between mb-2">
            <Label className="text-sm text-muted-foreground font-medium">
              Reference Images ({referenceImages.length})
            </Label>
            <label>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={(e) => onUpload(e.target.files)}
                disabled={isUploading}
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={isUploading}
                onClick={() => fileInputRef.current?.click()}
              >
                {isUploading ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <ImagePlus className="h-4 w-4 mr-2" />
                )}
                {isUploading ? 'Uploading...' : 'Add Images'}
              </Button>
            </label>
          </div>

          {referenceImages.length > 0 ? (
            <ScrollArea className="w-full">
              <div className="flex gap-3 pb-3">
                {referenceImages.map((url, index) => (
                  <div
                    key={`${url}-${index}`}
                    className="relative group/img flex-shrink-0 w-[200px] h-[200px] rounded-lg overflow-hidden border bg-muted"
                  >
                    <img src={url} alt={`Ref ${index + 1}`} className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/0 group-hover/img:bg-black/30 transition-colors" />
                    <button
                      onClick={() => onRemoveImage(url)}
                      className="absolute top-2 right-2 p-1.5 bg-destructive text-destructive-foreground rounded-full opacity-0 group-hover/img:opacity-100 transition-opacity shadow-lg"
                    >
                      <X className="h-4 w-4" />
                    </button>
                    <div className="absolute bottom-2 left-2 opacity-0 group-hover/img:opacity-100 transition-opacity">
                      <Badge variant="secondary" className="text-[10px]">
                        {index + 1} / {referenceImages.length}
                      </Badge>
                    </div>
                  </div>
                ))}
                {/* Add more button inline */}
                <div
                  className="flex-shrink-0 w-[200px] h-[200px] rounded-lg border-2 border-dashed border-muted-foreground/30 flex items-center justify-center cursor-pointer hover:border-primary/50 hover:bg-muted/50 transition-colors"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <div className="text-center text-muted-foreground">
                    <ImagePlus className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">Add More</p>
                  </div>
                </div>
              </div>
              <ScrollBar orientation="horizontal" />
            </ScrollArea>
          ) : (
            <div
              className="flex items-center justify-center h-[200px] border-2 border-dashed rounded-lg bg-muted/30 cursor-pointer hover:bg-muted/50 hover:border-primary/30 transition-colors"
              onClick={() => fileInputRef.current?.click()}
            >
              <div className="text-center text-muted-foreground">
                <Upload className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm font-medium">Drop or click to add reference images</p>
                <p className="text-xs mt-1 opacity-70">PNG, JPG up to 10MB each</p>
              </div>
            </div>
          )}
        </div>

        {/* Prompt Template (edit mode) */}
        {isEditing && (
          <div className="mt-4">
            <Label className="text-sm text-muted-foreground mb-1 block">Prompt Template</Label>
            <Textarea
              value={editData.prompt_template}
              onChange={(e) => setEditData({ ...editData, prompt_template: e.target.value })}
              className="text-xs"
              rows={5}
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
