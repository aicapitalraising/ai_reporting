import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Check, Eye, Paintbrush } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Client } from '@/types';
import { CAPITAL_CREATIVE } from '@/constants/capitalCreativeStyle';

// ── Template definitions ────────────────────────────────────────────────────
export interface AdTemplate {
  id: string;
  name: string;
  category: string;
  platforms: string[];
  layout: 'hero-image' | 'split' | 'text-overlay' | 'minimal' | 'card' | 'capital-creative';
  slots: { headline: string; body: string; cta: string; qualifier?: string; returns?: string; benefits?: string[]; trustSignal?: string; disclaimer?: string };
  ccVariant?: 'hero-return' | 'stacked-benefits' | 'photo-overlay' | 'breaking-news' | 'founder-avatar' | 'stats-heavy';
}

const TEMPLATES: AdTemplate[] = [
  // Real Estate
  { id: 're-showcase', name: 'Property Showcase', category: 'Real Estate', platforms: ['FB', 'IG'], layout: 'hero-image', slots: { headline: 'Dream Home Awaits', body: 'Luxury living in the heart of the city', cta: 'View Property' } },
  { id: 're-openhouse', name: 'Open House', category: 'Real Estate', platforms: ['FB', 'IG'], layout: 'text-overlay', slots: { headline: 'Open House This Weekend', body: 'Tour this stunning 4BR home', cta: 'RSVP Now' } },
  { id: 're-listed', name: 'Just Listed', category: 'Real Estate', platforms: ['FB', 'LinkedIn'], layout: 'split', slots: { headline: 'Just Listed', body: 'Be the first to see this new listing', cta: 'Schedule Tour' } },
  { id: 're-sold', name: 'Just Sold', category: 'Real Estate', platforms: ['FB', 'IG'], layout: 'minimal', slots: { headline: 'SOLD!', body: 'Another happy homeowner', cta: 'List With Us' } },
  { id: 're-market', name: 'Market Report', category: 'Real Estate', platforms: ['LinkedIn', 'FB'], layout: 'card', slots: { headline: 'Q4 Market Report', body: 'Prices up 12% in your area', cta: 'Get Full Report' } },
  // Professional Services
  { id: 'ps-leadmag', name: 'Lead Magnet', category: 'Professional', platforms: ['FB', 'LinkedIn'], layout: 'split', slots: { headline: 'Free Guide Inside', body: 'Download our exclusive industry guide', cta: 'Download Free' } },
  { id: 'ps-testimonial', name: 'Testimonial Spotlight', category: 'Professional', platforms: ['FB', 'IG', 'LinkedIn'], layout: 'card', slots: { headline: '"Best decision we made"', body: 'See why 500+ clients trust us', cta: 'Read Reviews' } },
  { id: 'ps-beforeafter', name: 'Before / After', category: 'Professional', platforms: ['FB', 'IG'], layout: 'split', slots: { headline: 'The Transformation', body: 'See the incredible results', cta: 'Get Started' } },
  // General
  { id: 'gen-product', name: 'Product Feature', category: 'General', platforms: ['FB', 'IG', 'Google'], layout: 'hero-image', slots: { headline: 'Introducing Our Best Yet', body: 'Built for performance, designed for you', cta: 'Shop Now' } },
  { id: 'gen-offer', name: 'Limited Offer', category: 'General', platforms: ['FB', 'IG', 'Google'], layout: 'text-overlay', slots: { headline: '50% OFF Today Only', body: 'Don\'t miss this exclusive deal', cta: 'Claim Offer' } },
  { id: 'gen-event', name: 'Event Promo', category: 'General', platforms: ['FB', 'LinkedIn'], layout: 'card', slots: { headline: 'You\'re Invited', body: 'Join us for an exclusive event', cta: 'Register Free' } },
  { id: 'gen-brand', name: 'Brand Awareness', category: 'General', platforms: ['FB', 'IG', 'LinkedIn'], layout: 'minimal', slots: { headline: 'We Are Different', body: 'Discover what sets us apart', cta: 'Learn More' } },
  // Capital Creative
  {
    id: 'cc-hero-return', name: 'Hero Return', category: 'Capital Creative', platforms: ['FB', 'IG', 'LinkedIn'], layout: 'capital-creative', ccVariant: 'hero-return',
    slots: { headline: 'HIGH-YIELD LENDING OPPORTUNITY', body: 'Secured by real assets with zero missed payments in fund history', cta: 'APPLY NOW', qualifier: 'ACCREDITED INVESTORS', returns: '15%-20%', benefits: ['Asset-Backed Security', 'Paid Monthly', 'Zero Missed Payments', '$150M+ AUM'], trustSignal: '$150M AUM · 2,400+ Units', disclaimer: CAPITAL_CREATIVE.compliance.disclaimer }
  },
  {
    id: 'cc-stacked', name: 'Stacked Benefits', category: 'Capital Creative', platforms: ['FB', 'LinkedIn'], layout: 'capital-creative', ccVariant: 'stacked-benefits',
    slots: { headline: 'PREMIUM LENDING FUND', body: 'Institutional-grade returns for accredited investors', cta: 'LEARN MORE', qualifier: 'ACCREDITED INVESTORS', returns: '15%-20%', benefits: ['Targeted 15%-20% Returns', 'Paid Monthly', '18%+ IRR', 'Tax Advantages'], trustSignal: '$150M AUM · 2,400+ Units', disclaimer: CAPITAL_CREATIVE.compliance.disclaimer }
  },
  {
    id: 'cc-photo', name: 'Photo Overlay', category: 'Capital Creative', platforms: ['FB', 'IG'], layout: 'capital-creative', ccVariant: 'photo-overlay',
    slots: { headline: 'PROJECTED RETURNS', body: 'High-yield lending backed by real assets. Paid monthly with zero missed payments.', cta: 'APPLY NOW', qualifier: 'ACCREDITED INVESTORS', returns: '15%-20%', benefits: ['Asset-Backed', 'Monthly Payouts'], disclaimer: CAPITAL_CREATIVE.compliance.disclaimer }
  },
  {
    id: 'cc-news', name: 'Breaking News / Native', category: 'Capital Creative', platforms: ['FB', 'Google'], layout: 'capital-creative', ccVariant: 'breaking-news',
    slots: { headline: 'Accredited Investors Earning 15%-20% With This Lending Fund', body: 'Asset-backed returns, paid monthly, with zero missed payments and $150M+ in AUM.', cta: 'READ MORE', qualifier: 'ACCREDITED INVESTORS', returns: '15%-20%', benefits: ['Paid Monthly', 'Asset-Backed', 'Zero Missed Payments'], disclaimer: CAPITAL_CREATIVE.compliance.disclaimer }
  },
  {
    id: 'cc-founder', name: 'Founder / Avatar', category: 'Capital Creative', platforms: ['FB', 'IG', 'LinkedIn'], layout: 'capital-creative', ccVariant: 'founder-avatar',
    slots: { headline: 'EARN 15%-20% TARGETED RETURNS', body: 'Join our vertically integrated lending platform', cta: 'APPLY NOW', qualifier: 'ACCREDITED INVESTORS', returns: '15%-20%', trustSignal: '$150M AUM · Zero Missed Payments', disclaimer: CAPITAL_CREATIVE.compliance.disclaimer }
  },
  {
    id: 'cc-stats', name: 'Stats Heavy', category: 'Capital Creative', platforms: ['FB', 'LinkedIn'], layout: 'capital-creative', ccVariant: 'stats-heavy',
    slots: { headline: 'HIGH-YIELD LENDING OPPORTUNITY', body: 'Institutional-grade returns backed by real assets', cta: 'GET STARTED', qualifier: 'ACCREDITED INVESTORS', returns: '15%-20%', benefits: ['Asset-Backed Security', 'Monthly Payouts', 'Tax Advantages'], disclaimer: CAPITAL_CREATIVE.compliance.disclaimer }
  },
];

const CATEGORIES = ['All', 'Real Estate', 'Professional', 'General', 'Capital Creative'];

interface TemplateGalleryProps {
  client?: Client | null;
  onSelectTemplate: (template: AdTemplate, customization: TemplateCustomization) => void;
}

export interface TemplateCustomization {
  headline: string;
  body: string;
  cta: string;
  bgStyle: 'solid' | 'gradient' | 'overlay';
  fontStyle: 'modern' | 'classic' | 'bold';
  primaryColor: string;
  secondaryColor: string;
}

export function TemplateGallery({ client, onSelectTemplate }: TemplateGalleryProps) {
  const [category, setCategory] = useState('All');
  const [selectedTemplate, setSelectedTemplate] = useState<AdTemplate | null>(null);
  const [customization, setCustomization] = useState<TemplateCustomization>({
    headline: '',
    body: '',
    cta: 'Learn More',
    bgStyle: 'gradient',
    fontStyle: 'modern',
    primaryColor: client?.brand_colors?.[0] || '#4F46E5',
    secondaryColor: client?.brand_colors?.[1] || '#111827',
  });

  const filtered = category === 'All' ? TEMPLATES : TEMPLATES.filter(t => t.category === category);

  const handleSelect = (t: AdTemplate) => {
    setSelectedTemplate(t);
    setCustomization(prev => ({
      ...prev,
      headline: t.slots.headline,
      body: t.slots.body,
      cta: t.slots.cta,
      primaryColor: client?.brand_colors?.[0] || prev.primaryColor,
      secondaryColor: client?.brand_colors?.[1] || prev.secondaryColor,
    }));
  };

  const getBgStyle = () => {
    if (customization.bgStyle === 'gradient') return { background: `linear-gradient(135deg, ${customization.primaryColor}, ${customization.secondaryColor})` };
    if (customization.bgStyle === 'solid') return { backgroundColor: customization.primaryColor };
    return { backgroundColor: customization.secondaryColor };
  };

  const getFontClass = () => {
    if (customization.fontStyle === 'classic') return 'font-serif';
    if (customization.fontStyle === 'bold') return 'font-black tracking-tight';
    return 'font-sans';
  };

  const handleSelectCC = (t: AdTemplate) => {
    setSelectedTemplate(t);
    setCustomization(prev => ({
      ...prev,
      headline: t.slots.headline,
      body: t.slots.body,
      cta: t.slots.cta,
      primaryColor: CAPITAL_CREATIVE.backgrounds.deepGreen,
      secondaryColor: CAPITAL_CREATIVE.gold.primary,
    }));
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Template grid */}
      <div className="lg:col-span-2 space-y-4">
        <div className="flex gap-2">
          {CATEGORIES.map(c => (
            <Button key={c} variant={category === c ? 'default' : 'outline'} size="sm" className="text-xs h-7" onClick={() => setCategory(c)}>
              {c}
            </Button>
          ))}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {filtered.map(t => (
            <button
              key={t.id}
              onClick={() => t.category === 'Capital Creative' ? handleSelectCC(t) : handleSelect(t)}
              className={cn(
                'relative rounded-xl border p-3 text-left transition-all hover:shadow-md',
                selectedTemplate?.id === t.id ? 'border-primary ring-2 ring-primary/30 bg-primary/5' : 'border-border bg-card hover:border-muted-foreground'
              )}
            >
              {selectedTemplate?.id === t.id && (
                <div className="absolute top-2 right-2 h-5 w-5 rounded-full bg-primary flex items-center justify-center">
                  <Check className="h-3 w-3 text-primary-foreground" />
                </div>
              )}
              {/* Mini preview */}
              <div
                className="w-full aspect-video rounded-lg mb-2 flex items-center justify-center"
                style={t.category === 'Capital Creative'
                  ? { background: CAPITAL_CREATIVE.backgrounds.deepGreen }
                  : { background: `linear-gradient(135deg, ${client?.brand_colors?.[0] || '#4F46E5'}88, ${client?.brand_colors?.[1] || '#111827'}88)` }}
              >
                {t.category === 'Capital Creative' ? (
                  <div className="flex flex-col items-center gap-0.5 px-2">
                    <span style={{ color: CAPITAL_CREATIVE.gold.primary, fontSize: '7px', letterSpacing: '2px', fontWeight: 700 }}>{t.slots.qualifier}</span>
                    {t.slots.returns && <span style={{ color: CAPITAL_CREATIVE.gold.primary, fontSize: '14px', fontWeight: 900 }}>{t.slots.returns}</span>}
                    <span className="text-[8px] text-white/90 font-bold text-center leading-tight">{t.slots.headline}</span>
                  </div>
                ) : (
                  <span className="text-[9px] text-white/80 font-medium text-center px-2">{t.slots.headline}</span>
                )}
              </div>
              <p className="text-xs font-medium truncate">{t.name}</p>
              <div className="flex gap-1 mt-1 flex-wrap">
                {t.platforms.map(p => (
                  <Badge key={p} variant="secondary" className="text-[8px] px-1 py-0 h-4">{p}</Badge>
                ))}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Customize panel */}
      <div className="space-y-4">
        <h3 className="text-sm font-semibold flex items-center gap-2">
          <Paintbrush className="h-4 w-4" />
          Customize
        </h3>

        {selectedTemplate ? (
          <ScrollArea className="h-[500px]">
            <div className="space-y-4 pr-3">
              {/* Live Preview */}
              {selectedTemplate.category === 'Capital Creative' ? (
                <CapitalCreativePreview template={selectedTemplate} customization={customization} />
              ) : (
              <div
                className={cn('rounded-xl p-6 flex flex-col gap-3 min-h-[200px] justify-center text-white', getFontClass())}
                style={getBgStyle()}
              >
                <h4 className="text-lg font-bold leading-tight">{customization.headline}</h4>
                <p className="text-xs opacity-80">{customization.body}</p>
                <span className="self-start rounded-md px-4 py-1.5 text-xs font-semibold bg-white/20 backdrop-blur">
                  {customization.cta}
                </span>
                {client?.name && <p className="text-[9px] opacity-50 mt-2">by {client.name}</p>}
              </div>
              )}

              <div className="space-y-3">
                <div className="space-y-1">
                  <Label className="text-[10px]">Headline</Label>
                  <Input value={customization.headline} onChange={e => setCustomization(p => ({ ...p, headline: e.target.value }))} className="h-8 text-sm" />
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px]">Body Text</Label>
                  <Input value={customization.body} onChange={e => setCustomization(p => ({ ...p, body: e.target.value }))} className="h-8 text-sm" />
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px]">CTA Button</Label>
                  <Input value={customization.cta} onChange={e => setCustomization(p => ({ ...p, cta: e.target.value }))} className="h-8 text-sm" />
                </div>

                <div className="space-y-1">
                  <Label className="text-[10px]">Background Style</Label>
                  <Select value={customization.bgStyle} onValueChange={(v: any) => setCustomization(p => ({ ...p, bgStyle: v }))}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="gradient">Gradient</SelectItem>
                      <SelectItem value="solid">Solid Color</SelectItem>
                      <SelectItem value="overlay">Image Overlay</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <Label className="text-[10px]">Font Style</Label>
                  <Select value={customization.fontStyle} onValueChange={(v: any) => setCustomization(p => ({ ...p, fontStyle: v }))}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="modern">Modern</SelectItem>
                      <SelectItem value="classic">Classic</SelectItem>
                      <SelectItem value="bold">Bold</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label className="text-[10px]">Primary</Label>
                    <input type="color" value={customization.primaryColor} onChange={e => setCustomization(p => ({ ...p, primaryColor: e.target.value }))} className="h-8 w-full rounded border-0 cursor-pointer" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[10px]">Secondary</Label>
                    <input type="color" value={customization.secondaryColor} onChange={e => setCustomization(p => ({ ...p, secondaryColor: e.target.value }))} className="h-8 w-full rounded border-0 cursor-pointer" />
                  </div>
                </div>
              </div>

              <Button className="w-full" onClick={() => onSelectTemplate(selectedTemplate, customization)}>
                <Eye className="h-4 w-4 mr-2" />
                Use This Template
              </Button>
            </div>
          </ScrollArea>
        ) : (
          <div className="flex flex-col items-center justify-center h-40 text-center text-muted-foreground">
            <Paintbrush className="h-8 w-8 mb-2 opacity-30" />
            <p className="text-xs">Select a template to customize</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Capital Creative Preview ────────────────────────────────────────────────
function CapitalCreativePreview({ template, customization }: { template: AdTemplate; customization: TemplateCustomization }) {
  const cc = CAPITAL_CREATIVE;
  const v = template.ccVariant;
  const qualifier = template.slots.qualifier || cc.compliance.qualifierText;
  const returns = template.slots.returns || '15%-20%';
  const benefits = template.slots.benefits || [];
  const disclaimer = template.slots.disclaimer || cc.compliance.disclaimer;

  if (v === 'breaking-news') {
    return (
      <div className="rounded-xl overflow-hidden border" style={{ background: '#FFFFFF' }}>
        <div style={{ background: '#C0392B', padding: '6px', textAlign: 'center' }}>
          <span style={{ color: '#fff', fontSize: '10px', fontWeight: 800, letterSpacing: '3px' }}>BREAKING NEWS</span>
        </div>
        <div className="p-5 space-y-3">
          <span style={{ color: '#2980B9', fontSize: '10px', fontWeight: 700, letterSpacing: '3px' }}>{qualifier}</span>
          <h4 style={{ color: '#111', fontSize: '16px', fontWeight: 800, lineHeight: 1.3 }}>{customization.headline}</h4>
          <p style={{ color: '#666', fontSize: '11px' }}>{customization.body}</p>
          <div className="w-full h-24 rounded-lg" style={{ background: '#e5e7eb' }} />
          {benefits.map((b, i) => (
            <div key={i} className="flex items-center gap-2">
              <Check className="h-3 w-3" style={{ color: '#2980B9' }} />
              <span style={{ color: '#444', fontSize: '11px' }}>{b}</span>
            </div>
          ))}
          <p style={{ color: '#999', fontSize: '7px', opacity: 0.6 }}>{disclaimer}</p>
        </div>
      </div>
    );
  }

  if (v === 'founder-avatar') {
    return (
      <div className="rounded-xl p-6 flex flex-col items-center gap-3 min-h-[240px] justify-center" style={{ background: cc.gradients.diagonalNavy }}>
        <span style={{ color: cc.gold.primary, fontSize: '9px', fontWeight: 700, letterSpacing: '4px' }}>{qualifier}</span>
        <div className="w-16 h-16 rounded-full border-2 flex items-center justify-center" style={{ borderColor: cc.gold.primary, background: 'rgba(255,255,255,0.08)' }}>
          <span style={{ color: cc.gold.primary, fontSize: '20px' }}>👤</span>
        </div>
        <span style={{ color: '#fff', fontSize: '10px', fontWeight: 600 }}>Fund Manager</span>
        <h4 style={{ color: cc.gold.primary, fontSize: '18px', fontWeight: 900, fontFamily: 'Playfair Display, serif', textAlign: 'center' }}>EARN {returns} TARGETED RETURNS</h4>
        {template.slots.trustSignal && <span style={{ color: cc.gold.dark, fontSize: '9px', letterSpacing: '2px' }}>{template.slots.trustSignal}</span>}
        <span className="rounded-md px-5 py-1.5 text-xs font-bold" style={{ background: cc.gold.primary, color: '#0A0A0A', letterSpacing: '3px', fontSize: '10px' }}>{customization.cta}</span>
        <p style={{ color: '#fff', fontSize: '7px', opacity: 0.35, textAlign: 'center', padding: '0 8px' }}>{disclaimer}</p>
      </div>
    );
  }

  if (v === 'stats-heavy') {
    return (
      <div className="rounded-xl p-6 flex flex-col gap-3 min-h-[240px]" style={{ background: `linear-gradient(180deg, ${cc.backgrounds.deepGreen}, ${cc.backgrounds.navy})` }}>
        <span style={{ color: cc.gold.primary, fontSize: '9px', fontWeight: 700, letterSpacing: '4px' }}>{qualifier}</span>
        <h4 style={{ color: '#fff', fontSize: '15px', fontWeight: 800, textTransform: 'uppercase' }}>{customization.headline}</h4>
        {benefits.map((b, i) => (
          <div key={i} className="flex items-center gap-2">
            <Check className="h-3 w-3" style={{ color: cc.gold.primary }} />
            <span style={{ color: '#fff', fontSize: '10px', fontWeight: 600, letterSpacing: '1px' }}>{b}</span>
          </div>
        ))}
        <div className="grid grid-cols-3 gap-2 mt-2">
          {['15%-20%', '18%+ IRR', '$150M'].map((stat, i) => (
            <div key={i} className="rounded-lg p-2 text-center" style={{ background: 'rgba(255,255,255,0.06)' }}>
              <p style={{ color: cc.gold.primary, fontSize: '14px', fontWeight: 900 }}>{stat}</p>
              <p style={{ color: '#888', fontSize: '7px' }}>{['Returns', 'IRR', 'AUM'][i]}</p>
            </div>
          ))}
        </div>
        <span className="self-center rounded-md px-5 py-1.5 text-xs font-bold mt-2" style={{ background: cc.gold.primary, color: '#0A0A0A', letterSpacing: '3px', fontSize: '10px' }}>{customization.cta}</span>
        <p style={{ color: '#fff', fontSize: '7px', opacity: 0.35, textAlign: 'center' }}>{disclaimer}</p>
      </div>
    );
  }

  if (v === 'photo-overlay') {
    return (
      <div className="rounded-xl p-6 flex flex-col gap-3 min-h-[240px] justify-center" style={{ background: cc.gradients.verticalGreen }}>
        <span style={{ color: cc.gold.primary, fontSize: '9px', fontWeight: 700, letterSpacing: '4px' }}>{qualifier}</span>
        <span style={{ color: '#fff', fontSize: '10px', letterSpacing: '3px', fontWeight: 600 }}>PROJECTED</span>
        <h4 style={{ color: cc.gold.primary, fontSize: '36px', fontWeight: 900 }}>{returns}</h4>
        <p style={{ color: '#fff', fontSize: '11px', opacity: 0.85 }}>{customization.body}</p>
        <span style={{ color: cc.gold.primary, fontSize: '11px', fontWeight: 700, letterSpacing: '2px' }}>PAID MONTHLY</span>
        <span className="self-start rounded-md px-5 py-1.5 text-xs font-bold" style={{ background: cc.gold.primary, color: '#0A0A0A', letterSpacing: '3px', fontSize: '10px' }}>{customization.cta}</span>
        <p style={{ color: '#fff', fontSize: '7px', opacity: 0.35 }}>{disclaimer}</p>
      </div>
    );
  }

  if (v === 'stacked-benefits') {
    return (
      <div className="rounded-xl p-6 flex flex-col gap-3 min-h-[240px]" style={{ background: cc.backgrounds.navy }}>
        <span style={{ color: cc.gold.primary, fontSize: '9px', fontWeight: 700, letterSpacing: '4px' }}>{qualifier}</span>
        <h4 style={{ color: '#fff', fontSize: '16px', fontWeight: 800, textTransform: 'uppercase' }}>{customization.headline}</h4>
        {benefits.map((b, i) => (
          <div key={i} className="flex items-center gap-2">
            <Check className="h-3 w-3" style={{ color: cc.gold.primary }} />
            <span style={{ color: '#fff', fontSize: '11px', fontWeight: 600, letterSpacing: '1px' }}>{b}</span>
          </div>
        ))}
        {template.slots.trustSignal && <span style={{ color: cc.gold.dark, fontSize: '9px', letterSpacing: '2px', marginTop: '4px' }}>{template.slots.trustSignal}</span>}
        <span className="self-start rounded-md px-5 py-1.5 text-xs font-bold mt-1" style={{ background: cc.gold.primary, color: '#0A0A0A', letterSpacing: '3px', fontSize: '10px' }}>{customization.cta}</span>
        <p style={{ color: '#fff', fontSize: '7px', opacity: 0.35 }}>{disclaimer}</p>
      </div>
    );
  }

  // Default: hero-return
  return (
    <div className="rounded-xl p-6 flex flex-col gap-3 min-h-[240px]" style={{ background: cc.backgrounds.deepGreen }}>
      <span style={{ color: cc.gold.primary, fontSize: '9px', fontWeight: 700, letterSpacing: '4px' }}>{qualifier}</span>
      <h4 style={{ color: cc.gold.primary, fontSize: '36px', fontWeight: 900, lineHeight: 1 }}>{returns}</h4>
      <h5 style={{ color: '#fff', fontSize: '14px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '2px' }}>{customization.headline}</h5>
      <span style={{ color: cc.gold.primary, fontSize: '11px', fontWeight: 700, letterSpacing: '2px' }}>PAID MONTHLY</span>
      {benefits.map((b, i) => (
        <div key={i} className="flex items-center gap-2">
          <Check className="h-3 w-3" style={{ color: cc.gold.primary }} />
          <span style={{ color: '#fff', fontSize: '10px', fontWeight: 600, letterSpacing: '1px' }}>{b}</span>
        </div>
      ))}
      <span className="self-start rounded-md px-5 py-1.5 text-xs font-bold mt-1" style={{ background: cc.gold.primary, color: '#0A0A0A', letterSpacing: '3px', fontSize: '10px' }}>{customization.cta}</span>
      <p style={{ color: '#fff', fontSize: '7px', opacity: 0.35 }}>{disclaimer}</p>
    </div>
  );
}
