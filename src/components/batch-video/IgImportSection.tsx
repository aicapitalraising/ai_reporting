import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Loader2, Instagram, Link2, ExternalLink, Video, FileText, Wand2, Play, Image as ImageIcon } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { fetchVideoAsBlob } from '@/lib/video-proxy';

interface IgImportData {
  shortcode: string;
  postType: string;
  caption: string;
  username: string;
  mediaUrl: string;
  videoUrl: string;
  sourceUrl: string;
  title: string;
  likes: number;
  comments: number;
}

interface IgImportSectionProps {
  onScriptImported: (script: string) => void;
  onPlatformChange: (platform: 'tiktok-reels') => void;
  clientOffer?: string;
  clientId?: string;
}

export function IgImportSection({ onScriptImported, onPlatformChange, clientOffer, clientId }: IgImportSectionProps) {
  const [igUrl, setIgUrl] = useState('');
  const [isImporting, setIsImporting] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [importData, setImportData] = useState<IgImportData | null>(null);
  const [transcription, setTranscription] = useState<string | null>(null);
  const [step, setStep] = useState<'idle' | 'imported' | 'transcribed'>('idle');

  const handleImport = async () => {
    if (!igUrl.trim()) return;
    const igPattern = /instagram\.com\/(p|reel|reels|tv)\/([a-zA-Z0-9_-]+)/;
    if (!igPattern.test(igUrl)) {
      toast.error('Invalid Instagram URL — paste a post or reel link');
      return;
    }

    setIsImporting(true);
    try {
      const { data, error } = await supabase.functions.invoke('scrape-instagram-post', {
        body: { url: igUrl.trim() },
      });
      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || 'Scrape failed');

      setImportData(data.data);
      setStep('imported');
      onPlatformChange('tiktok-reels');

      // If it's a post with caption, auto-set as script
      if (data.data.caption) {
        onScriptImported(data.data.caption);
        toast.success(`Imported from @${data.data.username || 'unknown'}`);
      } else {
        toast.warning('No caption found — try transcribing the video');
      }
    } catch (err: any) {
      console.error('IG import error:', err);
      toast.error(err.message || 'Failed to import');
    } finally {
      setIsImporting(false);
    }
  };

  const handleTranscribe = async () => {
    if (!importData?.videoUrl) {
      toast.error('No video URL found for this post');
      return;
    }

    setIsTranscribing(true);
    try {
      // Fetch video and convert to base64
      toast.info('Downloading video for transcription...');
      const blob = await fetchVideoAsBlob(importData.videoUrl);
      const arrayBuffer = await blob.arrayBuffer();
      const base64 = btoa(
        new Uint8Array(arrayBuffer).reduce((data, byte) => data + String.fromCharCode(byte), '')
      );

      toast.info('Transcribing audio...');
      const { data, error } = await supabase.functions.invoke('transcribe-video', {
        body: { videoBase64: base64, mimeType: 'video/mp4' },
      });
      if (error) throw error;

      const captions = data?.captions || [];
      const fullText = captions.map((c: any) => c.text).join(' ');

      if (fullText.trim()) {
        setTranscription(fullText);
        setStep('transcribed');
        onScriptImported(fullText);
        toast.success('Video transcribed — script updated');
      } else {
        toast.warning('No speech detected in video');
      }
    } catch (err: any) {
      console.error('Transcription error:', err);
      toast.error(err.message || 'Transcription failed');
    } finally {
      setIsTranscribing(false);
    }
  };

  const handleRegenerate = async () => {
    if (!clientId) {
      toast.error('Select a client first to regenerate');
      return;
    }

    const originalScript = transcription || importData?.caption || '';
    if (!originalScript.trim()) {
      toast.error('No source script to regenerate from');
      return;
    }

    setIsRegenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-scripts', {
        body: {
          productInfo: {
            productService: clientOffer || 'Product',
            targetAudience: 'Potential customers',
            painPoints: ['Problem to solve'],
            benefits: ['Key benefit'],
            usp: clientOffer || 'Unique value proposition',
          },
          frameworks: ['hormozi'],
          referenceScript: originalScript,
          instructions: `Rewrite this script for MY product/offer while keeping the same structure, energy, and hook style. The original script is from an Instagram post — adapt it to sell my offer instead. Keep the same pacing and tone but change all product-specific details to match my offer:\n\nOffer: ${clientOffer || 'My product'}\n\nOriginal Script:\n${originalScript}`,
        },
      });
      if (error) throw error;
      if (data.scripts?.length > 0) {
        const newScript = data.scripts[0].content;
        onScriptImported(newScript);
        toast.success('Script regenerated for your offer');
      }
    } catch (err: any) {
      console.error('Regenerate error:', err);
      toast.error('Failed to regenerate script');
    } finally {
      setIsRegenerating(false);
    }
  };

  if (step === 'idle') {
    return (
      <div className="space-y-3">
        <Label className="flex items-center gap-2">
          <Instagram className="h-4 w-4" />
          Import from Instagram
        </Label>
        <div className="flex gap-2">
          <Input
            value={igUrl}
            onChange={(e) => setIgUrl(e.target.value)}
            placeholder="https://instagram.com/p/... or /reel/..."
            className="flex-1"
            onKeyDown={(e) => e.key === 'Enter' && handleImport()}
          />
          <Button
            variant="outline"
            onClick={handleImport}
            disabled={isImporting || !igUrl.trim()}
            className="gap-2 shrink-0"
          >
            {isImporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Link2 className="h-4 w-4" />}
            {isImporting ? 'Importing...' : 'Import'}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <Label className="flex items-center gap-2">
        <Instagram className="h-4 w-4" />
        Instagram Import
      </Label>

      {/* Imported Post Preview */}
      <div className="rounded-lg border border-primary/20 bg-primary/5 p-4 space-y-3">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Instagram className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium">@{importData?.username || 'unknown'}</span>
            <Badge variant="secondary" className="text-xs">{step === 'transcribed' ? 'Transcribed' : 'Imported'}</Badge>
            {importData?.videoUrl && <Badge variant="outline" className="text-xs gap-1"><Video className="h-3 w-3" />Video</Badge>}
          </div>
          <a href={importData?.sourceUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1">
            View original <ExternalLink className="h-3 w-3" />
          </a>
        </div>

        {/* Media Preview */}
        <div className="flex gap-3">
          {importData?.mediaUrl && (
            <div className="relative shrink-0">
              <img src={importData.mediaUrl} alt="IG post" className="w-28 h-28 rounded-md object-cover" />
              {importData.videoUrl && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/30 rounded-md">
                  <Play className="h-8 w-8 text-white fill-white" />
                </div>
              )}
            </div>
          )}
          <div className="flex-1 min-w-0 space-y-1">
            {importData?.caption && (
              <p className="text-xs text-muted-foreground line-clamp-4">{importData.caption}</p>
            )}
            <div className="flex gap-3 text-xs text-muted-foreground">
              {importData?.likes > 0 && <span>❤️ {importData.likes.toLocaleString()}</span>}
              {importData?.comments > 0 && <span>💬 {importData.comments.toLocaleString()}</span>}
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-2 pt-1">
          {importData?.videoUrl && step !== 'transcribed' && (
            <Button
              size="sm"
              variant="outline"
              onClick={handleTranscribe}
              disabled={isTranscribing}
              className="gap-2"
            >
              {isTranscribing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FileText className="h-3.5 w-3.5" />}
              {isTranscribing ? 'Transcribing...' : 'Transcribe Video'}
            </Button>
          )}

          <Button
            size="sm"
            variant="outline"
            onClick={handleRegenerate}
            disabled={isRegenerating || !clientId}
            className="gap-2"
          >
            {isRegenerating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Wand2 className="h-3.5 w-3.5" />}
            {isRegenerating ? 'Regenerating...' : 'Regenerate for My Offer'}
          </Button>

          {importData?.caption && step !== 'transcribed' && (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                onScriptImported(importData.caption);
                toast.success('Using original caption as script');
              }}
              className="gap-2"
            >
              <FileText className="h-3.5 w-3.5" />
              Use Original Caption
            </Button>
          )}

          <Button
            size="sm"
            variant="ghost"
            onClick={() => { setStep('idle'); setImportData(null); setTranscription(null); setIgUrl(''); }}
            className="text-muted-foreground"
          >
            Clear
          </Button>
        </div>

        {step === 'transcribed' && (
          <p className="text-xs text-green-600 dark:text-green-400">
            ✓ Video transcription loaded as script. Select an avatar in Step 2 to regenerate with your presenter.
          </p>
        )}
      </div>
    </div>
  );
}
