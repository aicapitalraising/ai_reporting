import { useState, useEffect } from 'react';
import { Globe, Image as ImageIcon, FileText, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface PageMetadata {
  title: string | null;
  description: string | null;
  image: string | null;
  siteName: string | null;
  favicon: string | null;
}

interface PageMetadataPreviewProps {
  url: string;
  className?: string;
}

export function PageMetadataPreview({ url, className }: PageMetadataPreviewProps) {
  const [metadata, setMetadata] = useState<PageMetadata | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [imgError, setImgError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(false);
    setImgError(false);

    supabase.functions
      .invoke('fetch-page-metadata', { body: { url } })
      .then(({ data, error: fnError }) => {
        if (cancelled) return;
        if (fnError || !data || data.error) {
          setError(true);
        } else {
          setMetadata(data);
        }
        setLoading(false);
      })
      .catch(() => {
        if (!cancelled) {
          setError(true);
          setLoading(false);
        }
      });

    return () => { cancelled = true; };
  }, [url]);

  if (loading) {
    return (
      <div className={`flex items-center justify-center py-3 ${className || ''}`}>
        <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
        <span className="text-xs text-muted-foreground ml-1.5">Loading metadata…</span>
      </div>
    );
  }

  if (error || !metadata) {
    return (
      <div className={`text-xs text-muted-foreground text-center py-2 ${className || ''}`}>
        <Globe className="h-3 w-3 inline mr-1" />
        Unable to load metadata
      </div>
    );
  }

  const hasImage = metadata.image && !imgError;
  const hasContent = metadata.title || metadata.description;

  if (!hasContent && !metadata.image) {
    return (
      <div className={`text-xs text-muted-foreground text-center py-2 ${className || ''}`}>
        <FileText className="h-3 w-3 inline mr-1" />
        No metadata found
      </div>
    );
  }

  return (
    <div className={`mt-2 rounded-lg border bg-card overflow-hidden max-w-[320px] ${className || ''}`}>
      {/* OG Image */}
      {metadata.image && !imgError && (
        <div className="w-full h-[140px] bg-muted overflow-hidden">
          <img
            src={metadata.image}
            alt={metadata.title || 'Page preview'}
            className="w-full h-full object-cover"
            onError={() => setImgError(true)}
          />
        </div>
      )}

      {/* Text Content */}
      <div className="p-2.5 space-y-1">
        {/* Site name / favicon */}
        {(metadata.siteName || metadata.favicon) && (
          <div className="flex items-center gap-1.5">
            {metadata.favicon && (
              <img 
                src={metadata.favicon} 
                alt="" 
                className="h-3.5 w-3.5 rounded-sm"
                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
              />
            )}
            {metadata.siteName && (
              <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium truncate">
                {metadata.siteName}
              </span>
            )}
          </div>
        )}

        {/* Title */}
        {metadata.title && (
          <h4 className="text-xs font-semibold text-card-foreground leading-tight line-clamp-2">
            {metadata.title}
          </h4>
        )}

        {/* Description */}
        {metadata.description && (
          <p className="text-[11px] text-muted-foreground leading-snug line-clamp-2">
            {metadata.description}
          </p>
        )}
      </div>
    </div>
  );
}
