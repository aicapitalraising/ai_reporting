import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown, Upload, ImagePlus, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

export function CustomAdsUploadSection() {
  const [open, setOpen] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();

  const { data: customAds = [] } = useQuery({
    queryKey: ['custom-ads'],
    queryFn: async () => {
      const { data, error } = await supabase.from('custom_ads').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const ext = file.name.split('.').pop();
      const path = `custom-ads/${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage.from('assets').upload(path, file);
      if (uploadError) throw uploadError;
      const { data: urlData } = supabase.storage.from('assets').getPublicUrl(path);
      const { error: insertError } = await supabase.from('custom_ads').insert({
        name: file.name,
        file_url: urlData.publicUrl,
        file_type: file.type.startsWith('video') ? 'video' : 'image',
      });
      if (insertError) throw insertError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['custom-ads'] });
      toast.success('Ad uploaded successfully');
    },
    onError: (e: any) => toast.error(e.message || 'Upload failed'),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('custom_ads').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['custom-ads'] });
      toast.success('Ad deleted');
    },
  });

  const handleFiles = (files: FileList | null) => {
    if (!files) return;
    Array.from(files).forEach((f) => uploadMutation.mutate(f));
  };

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger asChild>
        <div className="flex items-center justify-between cursor-pointer group">
          <div>
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Upload className="h-4 w-4 text-primary" />
              Custom Ads Upload
            </h2>
            <p className="text-sm text-muted-foreground">Upload your own ads to use as templates</p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs">{customAds.length} ads</Badge>
            <ChevronDown className={cn('h-4 w-4 text-muted-foreground transition-transform', open && 'rotate-180')} />
          </div>
        </div>
      </CollapsibleTrigger>
      <CollapsibleContent className="mt-4 space-y-4">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,video/*"
          multiple
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
        />
        <div
          className="border-2 border-dashed border-border rounded-lg p-8 text-center cursor-pointer hover:border-primary/40 transition-colors"
          onClick={() => fileInputRef.current?.click()}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => { e.preventDefault(); handleFiles(e.dataTransfer.files); }}
        >
          <ImagePlus className="h-8 w-8 mx-auto mb-2 text-muted-foreground/50" />
          <p className="text-sm font-medium text-muted-foreground">Click or drag files to upload</p>
          <p className="text-xs text-muted-foreground/70 mt-1">Supports images and videos</p>
        </div>

        {customAds.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3">
            {customAds.map((ad: any) => (
              <div key={ad.id} className="group/card rounded-lg border border-border/50 bg-card overflow-hidden relative">
                <div className="aspect-[4/3] bg-muted/30">
                  {ad.file_type === 'video' ? (
                    <video src={ad.file_url} className="w-full h-full object-cover" />
                  ) : (
                    <img src={ad.file_url} alt={ad.name} className="w-full h-full object-cover" />
                  )}
                </div>
                <div className="p-2">
                  <p className="text-xs font-medium truncate">{ad.name}</p>
                  {ad.category && <Badge variant="secondary" className="text-[9px] mt-1">{ad.category}</Badge>}
                </div>
                <Button
                  size="sm"
                  variant="destructive"
                  className="absolute top-1 right-1 h-6 w-6 p-0 opacity-0 group-hover/card:opacity-100 transition-opacity"
                  onClick={() => deleteMutation.mutate(ad.id)}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </CollapsibleContent>
    </Collapsible>
  );
}
