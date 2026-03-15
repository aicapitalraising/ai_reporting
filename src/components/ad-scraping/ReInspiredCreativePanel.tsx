import { useState } from 'react';
import { useClients } from '@/hooks/useClients';
import { ScrapedAd } from '@/hooks/useAdScraping';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sparkles, ArrowRight, X } from 'lucide-react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

interface ReInspiredCreativePanelProps {
  ad: ScrapedAd;
  brandActive: boolean;
  brandClientId?: string;
  onClose: () => void;
}

export function ReInspiredCreativePanel({ ad, brandActive, brandClientId, onClose }: ReInspiredCreativePanelProps) {
  const navigate = useNavigate();
  const [headline, setHeadline] = useState(ad.headline || '');
  const [bodyCopy, setBodyCopy] = useState(ad.description || '');
  const [ctaText, setCtaText] = useState('Learn More');

  const handleAutoFillAI = () => {
    toast.info('AI auto-fill would generate variant copy based on the reference ad and brand guidelines.');
  };

  return (
    <Card className="border-primary/30 bg-card/80 backdrop-blur p-5 space-y-5">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          Re-Inspired Creative
        </h3>
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Left: Reference */}
        <div className="space-y-3">
          <Label className="text-xs font-semibold text-muted-foreground">Reference Ad</Label>
          <div className="rounded-lg border border-border overflow-hidden bg-muted/20">
            {ad.image_url && (
              <img src={ad.image_url} alt={ad.headline} className="w-full max-h-48 object-contain" />
            )}
            <div className="p-3 space-y-1">
              <p className="text-xs font-semibold">{ad.company}</p>
              <p className="text-xs text-muted-foreground line-clamp-3">{ad.description}</p>
              <p className="text-xs font-medium">{ad.headline}</p>
            </div>
          </div>
        </div>

        {/* Right: Variant */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label className="text-xs font-semibold text-muted-foreground">Variant Version</Label>
            {brandActive && (
              <Badge variant="secondary" className="text-[10px] gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 inline-block" />
                Brand Applied
              </Badge>
            )}
          </div>

          <div className="space-y-3">
            <div className="space-y-1">
              <Label className="text-[10px]">Headline</Label>
              <Input value={headline} onChange={(e) => setHeadline(e.target.value)} className="h-8 text-xs" />
            </div>
            <div className="space-y-1">
              <Label className="text-[10px]">Body Copy</Label>
              <Textarea value={bodyCopy} onChange={(e) => setBodyCopy(e.target.value)} className="text-xs min-h-[80px]" />
            </div>
            <div className="space-y-1">
              <Label className="text-[10px]">CTA</Label>
              <Input value={ctaText} onChange={(e) => setCtaText(e.target.value)} className="h-8 text-xs" />
            </div>
          </div>

          <Button variant="outline" size="sm" className="w-full text-xs" onClick={handleAutoFillAI}>
            <Sparkles className="h-3 w-3 mr-1" />
            Auto-Fill with AI
          </Button>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 pt-2 border-t border-border/50">
        <Button
          size="sm"
          className="text-xs"
          onClick={() => {
            toast.success('Added to Ad Variations');
            navigate('/ad-variations');
          }}
        >
          Add to Ad Variations
          <ArrowRight className="h-3 w-3 ml-1" />
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="text-xs"
          onClick={() => {
            toast.success('Sent to Static Ads');
            navigate('/static-ads');
          }}
        >
          Send to Static Ads
          <ArrowRight className="h-3 w-3 ml-1" />
        </Button>
      </div>
    </Card>
  );
}
