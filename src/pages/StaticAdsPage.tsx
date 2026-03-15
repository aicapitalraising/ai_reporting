import { useState, useMemo } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { useClients } from '@/hooks/useClients';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Slider } from '@/components/ui/slider';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Download, Loader2, Image as ImageIcon, Check, Columns, Grid, CheckSquare, Square, Wand2, LayoutGrid, Eye, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { TemplateGallery, type AdTemplate, type TemplateCustomization } from '@/components/static-ads/TemplateGallery';
import { AICopyPanel, type CopyVariation } from '@/components/static-ads/AICopyPanel';
import { PlatformMockup } from '@/components/static-ads/PlatformMockup';

// ── Format Presets ──────────────────────────────────────────────────────────────
type AdFormat = {
  id: string;
  label: string;
  width: number;
  height: number;
  platform: string;
};

const AD_FORMATS: AdFormat[] = [
  { id: 'fb-feed', label: 'Facebook Feed', width: 1200, height: 628, platform: 'Facebook' },
  { id: 'ig-square', label: 'Instagram Square', width: 1080, height: 1080, platform: 'Instagram' },
  { id: 'ig-story', label: 'Story / Reels', width: 1080, height: 1920, platform: 'Instagram' },
  { id: 'linkedin', label: 'LinkedIn', width: 1200, height: 627, platform: 'LinkedIn' },
  { id: 'twitter', label: 'Twitter / X', width: 1600, height: 900, platform: 'Twitter' },
  { id: 'gd-rect', label: 'Medium Rectangle', width: 300, height: 250, platform: 'Google Display' },
  { id: 'gd-leader', label: 'Leaderboard', width: 728, height: 90, platform: 'Google Display' },
  { id: 'gd-sky', label: 'Wide Skyscraper', width: 160, height: 600, platform: 'Google Display' },
];

// ── Copy Frameworks ─────────────────────────────────────────────────────────────
type CopyFramework = {
  id: string;
  label: string;
  description: string;
  structure: string;
};

const COPY_FRAMEWORKS: CopyFramework[] = [
  { id: 'pas', label: 'PAS', description: 'Problem → Agitate → Solution', structure: 'Start with a PROBLEM the audience faces. AGITATE by highlighting the pain. Present the SOLUTION with the product.' },
  { id: 'aida', label: 'AIDA', description: 'Attention → Interest → Desire → Action', structure: 'Grab ATTENTION with a bold hook. Build INTEREST with a compelling benefit. Create DESIRE with social proof or exclusivity. End with a clear ACTION/CTA.' },
  { id: 'bab', label: 'BAB', description: 'Before → After → Bridge', structure: 'Show the BEFORE state (current pain). Paint the AFTER picture (desired outcome). Present the BRIDGE (how the product gets them there).' },
  { id: 'social-proof', label: 'Social Proof', description: 'Testimonial / Stats focused', structure: 'Lead with testimonials, user counts, ratings, or impressive statistics. Center the ad around credibility and trust signals.' },
  { id: 'urgency', label: 'Urgency/Scarcity', description: 'Limited time / spots', structure: 'Create urgency with limited-time offers, countdown language, or scarcity ("only X spots left"). Drive immediate action.' },
  { id: 'direct-offer', label: 'Direct Offer', description: 'Price + CTA focused', structure: 'Lead with the offer/price/discount directly. Clear, no-nonsense value proposition with a strong CTA button.' },
];

// ── Ad Styles ───────────────────────────────────────────────────────────────────
type AdStyle = {
  id: string;
  label: string;
  description: string;
  bgClass: string;
};

const AD_STYLES: AdStyle[] = [
  { id: 'bold', label: 'Bold', description: 'Dark bg, bright text', bgClass: 'bg-gray-900' },
  { id: 'lifestyle', label: 'Lifestyle', description: 'Image-forward, overlay text', bgClass: 'bg-emerald-800' },
  { id: 'real-estate', label: 'Real Estate', description: 'Hero image, luxury feel', bgClass: 'bg-amber-900' },
  { id: 'modern', label: 'Modern', description: 'Clean, contemporary', bgClass: 'bg-indigo-600' },
  { id: 'capital-creative', label: 'Capital Creative', description: 'Dark bg, gold accents, finance/investment', bgClass: 'bg-[#0B2B26]' },
];

// ── CTA Variants ────────────────────────────────────────────────────────────────
const CTA_VARIANTS = ['Learn More', 'Get Started', 'Apply Now', 'Book a Call', 'Shop Now', 'Start Free Trial', 'Claim Offer', 'See Plans'];

// ── Headline angle labels ───────────────────────────────────────────────────────
const HEADLINE_ANGLES = ['benefit-driven', 'urgency', 'social-proof', 'question', 'stat-driven', 'curiosity', 'fear-of-missing-out', 'aspirational', 'contrarian', 'direct'];

// ── Types ───────────────────────────────────────────────────────────────────────
type GeneratedAd = {
  id: string;
  format: AdFormat;
  style: AdStyle;
  variant: number;
  headline: string;
  ctaText: string;
  headlineAngle: string;
  colors: { primary: string; secondary: string; accent: string };
  logoUrl?: string;
  imageUrl?: string;
  status: 'pending' | 'generating' | 'completed' | 'failed';
  selected: boolean;
};

export default function StaticAdsPage() {
  const { data: clients } = useClients();
  const { toast } = useToast();

  // Config state
  const [selectedClientId, setSelectedClientId] = useState('');
  const [headline, setHeadline] = useState('');
  const [ctaText, setCtaText] = useState('Learn More');
  const [selectedFormats, setSelectedFormats] = useState<string[]>(['fb-feed', 'ig-square']);
  const [selectedStyle, setSelectedStyle] = useState('bold');
  const [selectedFramework, setSelectedFramework] = useState('');
  const [variantCount, setVariantCount] = useState(3);
  const [primaryColor, setPrimaryColor] = useState('#4F46E5');
  const [secondaryColor, setSecondaryColor] = useState('#111827');
  const [accentColor, setAccentColor] = useState('#10B981');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedAds, setGeneratedAds] = useState<GeneratedAd[]>([]);
  const [formatFilter, setFormatFilter] = useState('all');
  const [compareMode, setCompareMode] = useState(false);
  const [activeTab, setActiveTab] = useState('generator');

  const selectedClient = useMemo(
    () => clients?.find((c) => c.id === selectedClientId),
    [clients, selectedClientId]
  );

  const handleClientChange = (clientId: string) => {
    setSelectedClientId(clientId);
    const client = clients?.find((c) => c.id === clientId);
    if (client?.brand_colors?.length) {
      if (client.brand_colors[0]) setPrimaryColor(client.brand_colors[0]);
      if (client.brand_colors[1]) setSecondaryColor(client.brand_colors[1]);
      if (client.brand_colors[2]) setAccentColor(client.brand_colors[2]);
    }
  };

  const toggleFormat = (id: string) => {
    setSelectedFormats((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]
    );
  };

  const totalAdsToGenerate = selectedFormats.length * variantCount;

  // Handle AI copy selection
  const handleCopySelect = (copy: CopyVariation) => {
    setHeadline(copy.headline);
    setCtaText(copy.ctaText);
  };

  // Handle template selection
  const handleTemplateSelect = (template: AdTemplate, customization: TemplateCustomization) => {
    setHeadline(customization.headline);
    setCtaText(customization.cta);
    setPrimaryColor(customization.primaryColor);
    setSecondaryColor(customization.secondaryColor);
    setActiveTab('generator');
    toast({ title: `Template "${template.name}" applied!` });
  };

  // ── Regenerate single ad ──────────────────────────────────────────────────────
  const handleRegenerateAd = async (adIndex: number) => {
    const ad = generatedAds[adIndex];
    if (!ad) return;

    setGeneratedAds(prev => prev.map((a, i) => i === adIndex ? { ...a, status: 'generating' as const } : a));

    const style = AD_STYLES.find(s => s.id === ad.style.id) || ad.style;
    const brandColors = [ad.colors.primary, ad.colors.secondary, ad.colors.accent].filter(Boolean);
    const framework = COPY_FRAMEWORKS.find(f => f.id === selectedFramework);

    let variantPrompt = `Create a ${ad.format.width}x${ad.format.height} advertisement image for ${ad.format.platform}.`;
    variantPrompt += `\nStyle: ${style.label} — ${style.description}`;
    variantPrompt += `\nHeadline: "${ad.headline}"`;
    variantPrompt += `\nCTA Button: "${ad.ctaText}"`;
    if (framework) variantPrompt += `\nCopy Framework: ${framework.label} — ${framework.structure}`;
    if (selectedClient?.description) variantPrompt += `\nProduct: ${selectedClient.description}`;

    try {
      const { data, error } = await supabase.functions.invoke('generate-static-ad', {
        body: {
          prompt: variantPrompt,
          styleName: style.label,
          aspectRatio: getAspectRatio(ad.format),
          productDescription: selectedClient?.offer_description || selectedClient?.description,
          brandColors,
          clientId: selectedClientId || undefined,
        },
      });
      if (error) throw error;
      setGeneratedAds(prev => prev.map((a, i) => i === adIndex ? { ...a, status: 'completed' as const, imageUrl: data.imageUrl } : a));
      toast({ title: 'Ad regenerated!' });
    } catch {
      setGeneratedAds(prev => prev.map((a, i) => i === adIndex ? { ...a, status: 'failed' as const } : a));
      toast({ title: 'Regeneration failed', variant: 'destructive' });
    }
  };

  // ── Generate ──────────────────────────────────────────────────────────────────
  const handleGenerate = async () => {
    if (!headline.trim()) {
      toast({ title: 'Headline required', variant: 'destructive' });
      return;
    }
    if (!selectedFormats.length) {
      toast({ title: 'Select at least one format', variant: 'destructive' });
      return;
    }

    setIsGenerating(true);
    const style = AD_STYLES.find((s) => s.id === selectedStyle)!;
    const formats = AD_FORMATS.filter((f) => selectedFormats.includes(f.id));
    const framework = COPY_FRAMEWORKS.find((f) => f.id === selectedFramework);
    const brandColors = [primaryColor, secondaryColor, accentColor].filter(Boolean);

    const ads: GeneratedAd[] = [];
    for (const format of formats) {
      for (let v = 0; v < variantCount; v++) {
        const angle = HEADLINE_ANGLES[v % HEADLINE_ANGLES.length];
        const cta = CTA_VARIANTS[v % CTA_VARIANTS.length];
        ads.push({
          id: `${format.id}-v${v}-${Date.now()}`,
          format,
          style,
          variant: v + 1,
          headline,
          ctaText: variantCount > 1 ? cta : ctaText,
          headlineAngle: angle,
          colors: { primary: primaryColor, secondary: secondaryColor, accent: accentColor },
          logoUrl: selectedClient?.logo_url || undefined,
          imageUrl: undefined,
          status: 'pending',
          selected: false,
        });
      }
    }
    setGeneratedAds(ads);

    let completedCount = 0;
    let failedCount = 0;

    for (let i = 0; i < ads.length; i++) {
      const ad = ads[i];
      setGeneratedAds((prev) =>
        prev.map((a, idx) => (idx === i ? { ...a, status: 'generating' as const } : a))
      );

      let variantPrompt = `Create a ${ad.format.width}x${ad.format.height} advertisement image for ${ad.format.platform}.`;
      variantPrompt += `\nStyle: ${style.label} — ${style.description}`;
      variantPrompt += `\nHeadline: "${ad.headline}"`;
      variantPrompt += `\nCTA Button: "${ad.ctaText}"`;
      variantPrompt += `\nHeadline angle: ${ad.headlineAngle}`;

      if (framework) {
        variantPrompt += `\nCopy Framework: ${framework.label} — ${framework.structure}`;
      }
      if (selectedClient?.offer_description) {
        variantPrompt += `\nOffer/Product: ${selectedClient.offer_description}`;
      } else if (selectedClient?.description) {
        variantPrompt += `\nProduct: ${selectedClient.description}`;
      }
      if (variantCount > 1) {
        const colorIdx = i % brandColors.length;
        variantPrompt += `\nEmphasize brand color: ${brandColors[colorIdx]} as the accent element in this variant.`;
      }

      try {
        const { data, error } = await supabase.functions.invoke('generate-static-ad', {
          body: {
            prompt: variantPrompt,
            styleName: style.label,
            aspectRatio: getAspectRatio(ad.format),
            productDescription: selectedClient?.offer_description || selectedClient?.description,
            productUrl: selectedClient?.product_url,
            brandColors,
            clientId: selectedClientId || undefined,
          },
        });

        if (error) throw error;

        setGeneratedAds((prev) =>
          prev.map((a, idx) =>
            idx === i ? { ...a, status: 'completed' as const, imageUrl: data.imageUrl } : a
          )
        );
        completedCount++;
      } catch (err) {
        console.error('Failed to generate ad:', err);
        setGeneratedAds((prev) =>
          prev.map((a, idx) => (idx === i ? { ...a, status: 'failed' as const } : a))
        );
        failedCount++;
      }
    }

    setIsGenerating(false);
    if (completedCount > 0) toast({ title: `${completedCount} ad(s) generated!` });
    if (failedCount > 0) toast({ title: `${failedCount} failed`, variant: 'destructive' });
  };

  function getAspectRatio(format: AdFormat): string {
    const r = format.width / format.height;
    if (Math.abs(r - 1) < 0.05) return '1:1';
    if (r > 1.7) return '16:9';
    if (r < 0.65) return '9:16';
    if (r > 1.4) return '16:9';
    return '4:5';
  }

  // ── Filtering ─────────────────────────────────────────────────────────────────
  const filteredAds = formatFilter === 'all'
    ? generatedAds
    : generatedAds.filter((a) => a.format.id === formatFilter);

  // ── Selection ─────────────────────────────────────────────────────────────────
  const toggleAdSelection = (id: string) => {
    setGeneratedAds((prev) =>
      prev.map((a) => (a.id === id ? { ...a, selected: !a.selected } : a))
    );
  };

  const selectedAds = generatedAds.filter((a) => a.selected);
  const selectAll = () => setGeneratedAds((prev) => prev.map((a) => ({ ...a, selected: true })));
  const deselectAll = () => setGeneratedAds((prev) => prev.map((a) => ({ ...a, selected: false })));

  // ── Download ──────────────────────────────────────────────────────────────────
  const downloadAds = async (ads: GeneratedAd[]) => {
    const completed = ads.filter((a) => a.status === 'completed' && a.imageUrl);
    if (!completed.length) return;

    const clientName = selectedClient?.name?.replace(/\s+/g, '-') || 'ads';
    const dateStr = new Date().toISOString().slice(0, 10);

    if (completed.length === 1) {
      const ad = completed[0];
      const res = await fetch(ad.imageUrl!);
      const blob = await res.blob();
      saveAs(blob, `${clientName}_${ad.format.label.replace(/\s+/g, '-')}_v${ad.variant}_${dateStr}.png`);
      return;
    }

    const zip = new JSZip();
    for (const ad of completed) {
      try {
        const res = await fetch(ad.imageUrl!);
        const blob = await res.blob();
        const fileName = `${clientName}_${ad.format.label.replace(/\s+/g, '-')}_v${ad.variant}_${dateStr}.png`;
        zip.file(fileName, blob);
      } catch (e) {
        console.warn('Failed to fetch for zip:', e);
      }
    }
    const blob = await zip.generateAsync({ type: 'blob' });
    saveAs(blob, `${clientName}_ads_${dateStr}.zip`);
    toast({ title: 'ZIP downloaded!' });
  };

  // ── Preview card ──────────────────────────────────────────────────────────────
  const renderAdPreview = (ad: GeneratedAd, index: number) => {
    const aspect = ad.format.width / ad.format.height;
    const maxW = compareMode ? 240 : 300;
    const displayW = maxW;
    const displayH = Math.min(displayW / aspect, 420);

    return (
      <div key={ad.id} className="group relative rounded-xl overflow-hidden border border-border bg-card">
        {/* Selection checkbox */}
        <button
          onClick={(e) => { e.stopPropagation(); toggleAdSelection(ad.id); }}
          className={cn(
            'absolute top-2 left-2 z-10 h-5 w-5 rounded border flex items-center justify-center transition-all',
            ad.selected
              ? 'bg-primary border-primary text-primary-foreground'
              : 'border-muted-foreground/40 bg-background/70 opacity-0 group-hover:opacity-100'
          )}
        >
          {ad.selected && <Check className="h-3 w-3" />}
        </button>

        {/* Action buttons */}
        <div className="absolute top-2 right-2 z-10 flex gap-1 opacity-0 group-hover:opacity-100 transition-all">
          {ad.status === 'completed' && ad.imageUrl && (
            <>
              <PlatformMockup
                imageUrl={ad.imageUrl}
                headline={ad.headline}
                ctaText={ad.ctaText}
                clientName={selectedClient?.name}
                clientLogo={selectedClient?.logo_url || undefined}
              >
                <button className="h-6 w-6 rounded bg-background/80 backdrop-blur flex items-center justify-center hover:bg-background">
                  <Eye className="h-3 w-3" />
                </button>
              </PlatformMockup>
              <button
                onClick={(e) => { e.stopPropagation(); handleRegenerateAd(index); }}
                className="h-6 w-6 rounded bg-background/80 backdrop-blur flex items-center justify-center hover:bg-background"
                title="Regenerate"
              >
                <RefreshCw className="h-3 w-3" />
              </button>
            </>
          )}
        </div>

        <div
          className="relative flex flex-col items-center justify-between p-3"
          style={{ width: displayW, height: displayH, backgroundColor: ad.colors.secondary }}
        >
          {ad.status === 'completed' && ad.imageUrl ? (
            <img src={ad.imageUrl} alt={ad.headline} className="absolute inset-0 w-full h-full object-cover" loading="lazy" />
          ) : ad.status === 'generating' ? (
            <div className="flex-1 flex items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : ad.status === 'failed' ? (
            <div className="flex-1 flex items-center justify-center text-destructive text-xs">Failed</div>
          ) : (
            <>
              {ad.logoUrl && (
                <img src={ad.logoUrl} alt="Logo" className="absolute top-2 left-2 h-6 w-6 rounded object-contain" loading="lazy" />
              )}
              <div className="flex-1 flex items-center justify-center px-3 text-center">
                <h3 className="font-bold leading-tight" style={{ color: ad.colors.primary, fontSize: aspect > 1 ? '0.85rem' : '1rem' }}>
                  {ad.headline}
                </h3>
              </div>
              <span className="rounded-md px-3 py-1 text-[10px] font-semibold text-white" style={{ backgroundColor: ad.colors.accent }}>
                {ad.ctaText}
              </span>
            </>
          )}
        </div>

        {/* Info bar */}
        <div className="px-3 py-2 flex items-center justify-between gap-2">
          <div className="min-w-0">
            <p className="text-[10px] text-muted-foreground truncate">
              {ad.format.label} • {ad.format.width}×{ad.format.height}
            </p>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <Badge variant="secondary" className="text-[9px] px-1.5">{ad.headlineAngle}</Badge>
            <Badge variant="outline" className="text-[9px] px-1.5">v{ad.variant}</Badge>
          </div>
        </div>
      </div>
    );
  };

  return (
    <AppLayout>
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Bulk Ad Generator</h1>
            <p className="text-muted-foreground mt-1">
              Generate branded ads across multiple formats, frameworks &amp; variants in one batch
            </p>
          </div>
          <AICopyPanel clients={clients} selectedClientId={selectedClientId} onSelectCopy={handleCopySelect}>
            <Button variant="outline" size="sm" className="gap-2">
              <Wand2 className="h-4 w-4" />
              AI Copy Engine
            </Button>
          </AICopyPanel>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="generator" className="gap-2">
              <ImageIcon className="h-3.5 w-3.5" />
              Generator
            </TabsTrigger>
            <TabsTrigger value="templates" className="gap-2">
              <LayoutGrid className="h-3.5 w-3.5" />
              Template Gallery
            </TabsTrigger>
          </TabsList>

          <TabsContent value="templates" className="mt-6">
            <TemplateGallery client={selectedClient} onSelectTemplate={handleTemplateSelect} />
          </TabsContent>

          <TabsContent value="generator" className="mt-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* ── LEFT CONFIG PANEL ── */}
              <div className="lg:col-span-1 space-y-5">
                {/* Client */}
                <Card className="p-4 space-y-3 bg-card/50 backdrop-blur border-border">
                  <Label className="text-xs font-semibold">Client</Label>
                  <Select value={selectedClientId} onValueChange={handleClientChange}>
                    <SelectTrigger><SelectValue placeholder="Select client..." /></SelectTrigger>
                    <SelectContent>
                      {clients?.map((c) => (
                        <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {selectedClient?.offer_description && (
                    <p className="text-[10px] text-muted-foreground line-clamp-2">
                      Offer: {selectedClient.offer_description}
                    </p>
                  )}
                </Card>

                {/* Ad Content */}
                <Card className="p-4 space-y-3 bg-card/50 backdrop-blur border-border">
                  <h3 className="text-xs font-semibold">Ad Content</h3>
                  <div className="space-y-1.5">
                    <Label className="text-[10px]">Headline</Label>
                    <Input value={headline} onChange={(e) => setHeadline(e.target.value)} placeholder="Your powerful headline..." className="h-8 text-sm" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[10px]">Default CTA</Label>
                    <Input value={ctaText} onChange={(e) => setCtaText(e.target.value)} placeholder="Learn More" className="h-8 text-sm" />
                    {variantCount > 1 && (
                      <p className="text-[10px] text-muted-foreground">CTAs auto-vary across variants</p>
                    )}
                  </div>
                </Card>

                {/* Copy Framework */}
                <Card className="p-4 space-y-3 bg-card/50 backdrop-blur border-border">
                  <h3 className="text-xs font-semibold">Copy Framework</h3>
                  <Select value={selectedFramework} onValueChange={setSelectedFramework}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="None (freeform)" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None (freeform)</SelectItem>
                      {COPY_FRAMEWORKS.map((fw) => (
                        <SelectItem key={fw.id} value={fw.id}>
                          <span className="font-medium">{fw.label}</span>
                          <span className="text-muted-foreground ml-1.5">— {fw.description}</span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {selectedFramework && selectedFramework !== 'none' && (
                    <p className="text-[10px] text-muted-foreground">
                      {COPY_FRAMEWORKS.find((f) => f.id === selectedFramework)?.structure}
                    </p>
                  )}
                </Card>

                {/* Formats */}
                <Card className="p-4 space-y-3 bg-card/50 backdrop-blur border-border">
                  <h3 className="text-xs font-semibold">Formats ({selectedFormats.length} selected)</h3>
                  <div className="grid grid-cols-1 gap-1.5">
                    {AD_FORMATS.map((fmt) => {
                      const sel = selectedFormats.includes(fmt.id);
                      return (
                        <button
                          key={fmt.id}
                          onClick={() => toggleFormat(fmt.id)}
                          className={cn(
                            'relative flex items-center justify-between rounded-lg border px-3 py-2 text-left transition-all text-xs',
                            sel
                              ? 'border-primary bg-primary/10 text-foreground'
                              : 'border-border bg-card text-muted-foreground hover:border-muted-foreground'
                          )}
                        >
                          <div className="flex items-center gap-2">
                            {sel && <Check className="h-3 w-3 text-primary shrink-0" />}
                            <span className="font-medium">{fmt.label}</span>
                          </div>
                          <span className="text-[10px] opacity-70 font-mono">{fmt.width}×{fmt.height}</span>
                        </button>
                      );
                    })}
                  </div>
                </Card>

                {/* Style */}
                <Card className="p-4 space-y-3 bg-card/50 backdrop-blur border-border">
                  <h3 className="text-xs font-semibold">Style</h3>
                  <div className="grid grid-cols-2 gap-2">
                    {AD_STYLES.map((style) => (
                      <button
                        key={style.id}
                        onClick={() => setSelectedStyle(style.id)}
                        className={cn(
                          'rounded-lg border p-2.5 text-left transition-all',
                          selectedStyle === style.id ? 'border-primary ring-1 ring-primary' : 'border-border hover:border-muted-foreground'
                        )}
                      >
                        <div className={cn('w-full h-8 rounded-md mb-1.5', style.bgClass)} />
                        <p className="text-[10px] font-medium">{style.label}</p>
                        <p className="text-[9px] text-muted-foreground">{style.description}</p>
                      </button>
                    ))}
                  </div>
                </Card>

                {/* Variants */}
                <Card className="p-4 space-y-3 bg-card/50 backdrop-blur border-border">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-semibold">Variants</h3>
                    <span className="text-sm font-bold text-primary">{variantCount}</span>
                  </div>
                  <Slider
                    value={[variantCount]}
                    onValueChange={([v]) => setVariantCount(v)}
                    min={1}
                    max={10}
                    step={1}
                  />
                  <div className="flex justify-between text-[10px] text-muted-foreground">
                    <span>1</span>
                    <span>10</span>
                  </div>
                  <p className="text-[10px] text-muted-foreground">
                    Each variant gets different headline angles, CTAs &amp; color emphasis
                  </p>
                </Card>

                {/* Colors */}
                <Card className="p-4 space-y-3 bg-card/50 backdrop-blur border-border">
                  <h3 className="text-xs font-semibold">Brand Colors</h3>
                  {selectedClient?.brand_colors?.length ? (
                    <p className="text-[10px] text-muted-foreground">Auto-populated from client</p>
                  ) : null}
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { label: 'Primary', value: primaryColor, set: setPrimaryColor },
                      { label: 'Secondary', value: secondaryColor, set: setSecondaryColor },
                      { label: 'Accent', value: accentColor, set: setAccentColor },
                    ].map((c) => (
                      <div key={c.label} className="space-y-1">
                        <Label className="text-[10px]">{c.label}</Label>
                        <div className="flex items-center gap-1">
                          <input type="color" value={c.value} onChange={(e) => c.set(e.target.value)} className="h-7 w-7 rounded border-0 cursor-pointer" />
                          <span className="text-[9px] text-muted-foreground font-mono">{c.value}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>

                {/* Generate Button */}
                <div className="space-y-2">
                  <div className="bg-muted rounded-lg p-3 text-center">
                    <p className="text-xs text-muted-foreground">
                      {selectedFormats.length} formats × {variantCount} variants
                    </p>
                    <p className="text-lg font-bold text-primary">= {totalAdsToGenerate} ads</p>
                  </div>
                  <Button onClick={handleGenerate} disabled={isGenerating} className="w-full" size="lg">
                    {isGenerating ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Generating {totalAdsToGenerate} ads...
                      </>
                    ) : (
                      <>
                        <ImageIcon className="mr-2 h-4 w-4" />
                        Generate {totalAdsToGenerate} Ads
                      </>
                    )}
                  </Button>
                </div>
              </div>

              {/* ── RIGHT: RESULTS ── */}
              <div className="lg:col-span-2 space-y-4">
                {generatedAds.length > 0 && (
                  <>
                    {/* Toolbar */}
                    <div className="flex flex-wrap items-center gap-3">
                      <h2 className="text-lg font-semibold">Results</h2>

                      <Select value={formatFilter} onValueChange={setFormatFilter}>
                        <SelectTrigger className="w-44 h-8 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Formats</SelectItem>
                          {AD_FORMATS.filter((f) => selectedFormats.includes(f.id)).map((f) => (
                            <SelectItem key={f.id} value={f.id}>{f.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>

                      <Button variant={compareMode ? 'default' : 'outline'} size="sm" className="h-8 text-xs" onClick={() => setCompareMode(!compareMode)}>
                        <Columns className="h-3.5 w-3.5 mr-1" />
                        Compare
                      </Button>

                      <Separator orientation="vertical" className="h-6" />

                      <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={selectAll}>
                        <CheckSquare className="h-3.5 w-3.5 mr-1" />
                        Select All
                      </Button>
                      <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={deselectAll}>
                        <Square className="h-3.5 w-3.5 mr-1" />
                        Deselect
                      </Button>

                      <div className="flex-1" />

                      {selectedAds.length > 0 && (
                        <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => downloadAds(selectedAds)}>
                          <Download className="mr-1 h-3.5 w-3.5" />
                          Download Selected ({selectedAds.length})
                        </Button>
                      )}
                      <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => downloadAds(generatedAds)}>
                        <Download className="mr-1 h-3.5 w-3.5" />
                        Download All
                      </Button>
                    </div>

                    {/* Progress */}
                    {isGenerating && (
                      <div className="bg-muted rounded-lg p-3">
                        <div className="flex justify-between text-xs mb-1">
                          <span>Generating...</span>
                          <span>{generatedAds.filter((a) => a.status === 'completed').length}/{generatedAds.length}</span>
                        </div>
                        <div className="h-1.5 bg-background rounded-full overflow-hidden">
                          <div
                            className="h-full bg-primary rounded-full transition-all"
                            style={{ width: `${(generatedAds.filter((a) => a.status === 'completed').length / generatedAds.length) * 100}%` }}
                          />
                        </div>
                      </div>
                    )}

                    {/* Grid */}
                    <div className={cn(
                      'flex flex-wrap gap-4',
                      compareMode && 'gap-3'
                    )}>
                      {filteredAds.map((ad, i) => renderAdPreview(ad, generatedAds.indexOf(ad)))}
                    </div>
                  </>
                )}

                {!generatedAds.length && !isGenerating && (
                  <div className="flex flex-col items-center justify-center h-96 text-center">
                    <ImageIcon className="h-16 w-16 text-muted-foreground/30 mb-4" />
                    <p className="text-muted-foreground">Configure your ad and click Generate to see previews</p>
                    <p className="text-xs text-muted-foreground mt-1">Select formats, style, framework &amp; variants on the left</p>
                  </div>
                )}
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
