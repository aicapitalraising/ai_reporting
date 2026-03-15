import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ImagePlus, X, Loader2, Upload } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface ReferenceImagesManagerProps {
  styleId: string;
  styleName: string;
  referenceImages: string[];
  onImagesChange: (images: string[]) => void;
  clientId?: string;
}

export function ReferenceImagesManager({
  styleId,
  styleName,
  referenceImages,
  onImagesChange,
  clientId,
}: ReferenceImagesManagerProps) {
  const [isUploading, setIsUploading] = useState(false);

  const handleFileUpload = useCallback(async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    setIsUploading(true);
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
        const updatedImages = [...referenceImages, ...newUrls];
        
        // Update the database
        const { error: updateError } = await supabase
          .from('ad_styles')
          .update({ reference_images: updatedImages })
          .eq('id', styleId);

        if (updateError) {
          console.error('Update error:', updateError);
          toast.error('Failed to save references');
          return;
        }

        onImagesChange(updatedImages);
        toast.success(`Added ${newUrls.length} reference image(s)`);
      }
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Failed to upload images');
    } finally {
      setIsUploading(false);
    }
  }, [styleId, clientId, referenceImages, onImagesChange]);

  const handleRemoveImage = useCallback(async (imageUrl: string) => {
    const updatedImages = referenceImages.filter((url) => url !== imageUrl);

    const { error } = await supabase
      .from('ad_styles')
      .update({ reference_images: updatedImages })
      .eq('id', styleId);

    if (error) {
      toast.error('Failed to remove reference');
      return;
    }

    onImagesChange(updatedImages);
    toast.success('Reference removed');
  }, [styleId, referenceImages, onImagesChange]);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h5 className="text-sm font-medium text-muted-foreground">
          Reference Images ({referenceImages.length})
        </h5>
        <label>
          <input
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(e) => handleFileUpload(e.target.files)}
            disabled={isUploading}
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={isUploading}
            asChild
          >
            <span className="cursor-pointer">
              {isUploading ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <ImagePlus className="h-4 w-4 mr-2" />
              )}
              Add References
            </span>
          </Button>
        </label>
      </div>

      {referenceImages.length > 0 ? (
        <ScrollArea className="w-full">
          <div className="flex gap-2 pb-2">
            {referenceImages.map((url, index) => (
              <div
                key={`${url}-${index}`}
                className="relative group flex-shrink-0 w-20 h-20 rounded-md overflow-hidden border bg-muted"
              >
                <img
                  src={url}
                  alt={`Reference ${index + 1}`}
                  className="w-full h-full object-cover"
                />
                <button
                  onClick={() => handleRemoveImage(url)}
                  className="absolute top-1 right-1 p-1 bg-destructive text-destructive-foreground rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        </ScrollArea>
      ) : (
        <div className="flex items-center justify-center h-20 border border-dashed rounded-md bg-muted/30">
          <div className="text-center text-sm text-muted-foreground">
            <Upload className="h-5 w-5 mx-auto mb-1 opacity-50" />
            <p>No references yet</p>
          </div>
        </div>
      )}
    </div>
  );
}
