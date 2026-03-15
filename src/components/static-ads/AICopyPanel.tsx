import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Sparkles, Loader2, Check, Wand2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { Client } from '@/types';

export interface CopyVariation {
  id: string;
  headline: string;
  primaryText: string;
  ctaText: string;
  framework: string;
  frameworkLabel: string;
}

interface AICopyPanelProps {
  clients?: Client[];
  selectedClientId?: string;
  onSelectCopy: (copy: CopyVariation) => void;
  children?: React.ReactNode;
}

// Capital Creative copy frameworks
function generateCapitalCreativeCopy(clientName: string, keyMessage: string): CopyVariation[] {
  const msg = keyMessage || `${clientName}'s lending fund`;
  return [
    {
      id: `cc-direct-${Date.now()}`,
      headline: `ACCREDITED INVESTORS | Earn Targeted 15%-20%`,
      primaryText: `${msg}. Paid Monthly · Secured by Assets · Zero Missed Payments · $150M AUM`,
      ctaText: 'APPLY NOW',
      framework: 'cc-direct-offer',
      frameworkLabel: 'Capital Creative — Direct Offer: Qualifier → Return Hook → Benefits → CTA',
    },
    {
      id: `cc-trust-${Date.now()}`,
      headline: `$150M AUM · Zero Missed Payments`,
      primaryText: `Targeted 15%-20% returns with 18%+ IRR. ${msg}. Monthly payouts, tax advantages, asset-backed security.`,
      ctaText: 'LEARN MORE',
      framework: 'cc-trust-first',
      frameworkLabel: 'Capital Creative — Trust-First: Trust Anchor → Offer → Benefits → CTA',
    },
    {
      id: `cc-contrast-${Date.now()}`,
      headline: `NO Stocks. NO Crypto. NO AI Bots.`,
      primaryText: `Just asset-backed returns, paid monthly. ${msg} — zero missed payments, $150M+ AUM, real property collateral.`,
      ctaText: 'SEE HOW IT WORKS',
      framework: 'cc-contrast',
      frameworkLabel: 'Capital Creative — Contrast/Exclusion: What it ISN\'T → What it IS → Proof → CTA',
    },
    {
      id: `cc-pas-${Date.now()}`,
      headline: `Tired of Volatile Markets Eating Your Returns?`,
      primaryText: `Inflation is shrinking your savings. ${msg} offers targeted 15%-20% returns, asset-backed and paid monthly. No stock market drama.`,
      ctaText: 'APPLY NOW',
      framework: 'cc-pas',
      frameworkLabel: 'Capital Creative — PAS: Problem → Agitate → Solution → CTA',
    },
  ];
}

// Mock AI copy generation (placeholder for real AI integration)
function generateMockCopy(clientName: string, goal: string, tone: string, keyMessage: string): CopyVariation[] {
  const toneMap: Record<string, { adj: string; verb: string }> = {
    professional: { adj: 'proven', verb: 'Discover' },
    friendly: { adj: 'amazing', verb: 'Check out' },
    urgent: { adj: 'limited-time', verb: 'Act now' },
    luxury: { adj: 'exclusive', verb: 'Experience' },
  };
  const t = toneMap[tone] || toneMap.professional;
  const msg = keyMessage || `${clientName}'s solution`;

  return [
    {
      id: `pas-${Date.now()}`,
      headline: `Tired of the old way? ${msg}`,
      primaryText: `Stop struggling with outdated methods. ${clientName} delivers ${t.adj} results that transform your workflow. ${t.verb} the difference today.`,
      ctaText: goal === 'conversion' ? 'Start Free Trial' : goal === 'consideration' ? 'Learn More' : 'See How It Works',
      framework: 'pas',
      frameworkLabel: 'PAS — Problem → Agitate → Solution',
    },
    {
      id: `aida-${Date.now()}`,
      headline: `What if ${msg} was effortless?`,
      primaryText: `${t.verb} how ${clientName} is changing the game. Join thousands who already switched. Your ${t.adj} advantage starts here.`,
      ctaText: goal === 'conversion' ? 'Get Started Now' : goal === 'consideration' ? 'Explore Features' : 'Watch Demo',
      framework: 'aida',
      frameworkLabel: 'AIDA — Attention → Interest → Desire → Action',
    },
    {
      id: `bab-${Date.now()}`,
      headline: `From struggle to success with ${clientName}`,
      primaryText: `Before: wasted time & frustration. After: ${t.adj} results on autopilot. The bridge? ${msg}. Make the switch today.`,
      ctaText: goal === 'conversion' ? 'Claim Your Spot' : goal === 'consideration' ? 'See the Results' : 'Discover More',
      framework: 'bab',
      frameworkLabel: 'BAB — Before → After → Bridge',
    },
  ];
}

export function AICopyPanel({ clients, selectedClientId, onSelectCopy, children }: AICopyPanelProps) {
  const [open, setOpen] = useState(false);
  const [clientId, setClientId] = useState(selectedClientId || '');
  const [goal, setGoal] = useState('awareness');
  const [tone, setTone] = useState('professional');
  const [keyMessage, setKeyMessage] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [variations, setVariations] = useState<CopyVariation[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const client = clients?.find(c => c.id === clientId);

  const handleGenerate = async () => {
    if (!client) {
      toast.error('Please select a client');
      return;
    }
    setIsGenerating(true);
    setSelectedId(null);

    // Simulate AI delay
    await new Promise(r => setTimeout(r, 1200));

    const copies = tone === 'capital-creative'
      ? generateCapitalCreativeCopy(client.name, keyMessage)
      : generateMockCopy(client.name, goal, tone, keyMessage);
    setVariations(copies);

    // Save to copy_library
    for (const c of copies) {
      try {
        await supabase.from('copy_library' as any).insert({
          client_id: clientId,
          headline: c.headline,
          primary_text: c.primaryText,
          cta_text: c.ctaText,
          framework: c.framework,
          tone,
          goal,
          key_message: keyMessage || null,
        });
      } catch (e) {
        console.warn('Failed to save copy:', e);
      }
    }

    setIsGenerating(false);
    toast.success(`${copies.length} copy variations generated!`);
  };

  const handleSelect = (v: CopyVariation) => {
    setSelectedId(v.id);
    onSelectCopy(v);
    toast.success('Copy applied to ad');
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        {children || (
          <Button variant="outline" size="sm" className="text-xs h-8">
            <Wand2 className="h-3.5 w-3.5 mr-1" />
            AI Copy
          </Button>
        )}
      </SheetTrigger>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            AI Copy Engine
          </SheetTitle>
        </SheetHeader>

        <div className="space-y-5 mt-6">
          <div className="space-y-1.5">
            <Label className="text-xs">Client</Label>
            <Select value={clientId} onValueChange={setClientId}>
              <SelectTrigger className="h-9"><SelectValue placeholder="Select client..." /></SelectTrigger>
              <SelectContent>
                {clients?.map(c => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Ad Goal</Label>
              <Select value={goal} onValueChange={setGoal}>
                <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="awareness">Awareness</SelectItem>
                  <SelectItem value="consideration">Consideration</SelectItem>
                  <SelectItem value="conversion">Conversion</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Tone</Label>
              <Select value={tone} onValueChange={setTone}>
                <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="professional">Professional</SelectItem>
                  <SelectItem value="friendly">Friendly</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                  <SelectItem value="luxury">Luxury</SelectItem>
                  <SelectItem value="capital-creative">Capital Creative</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Key Message</Label>
            <Input value={keyMessage} onChange={e => setKeyMessage(e.target.value)} placeholder="e.g. AI-powered analytics that save 10 hours/week" className="h-9 text-sm" />
          </div>

          <Button onClick={handleGenerate} disabled={isGenerating || !clientId} className="w-full">
            {isGenerating ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Generating...</> : <><Sparkles className="h-4 w-4 mr-2" />Generate 3 Variations</>}
          </Button>

          {/* Variations */}
          {variations.length > 0 && (
            <div className="space-y-3">
              <h4 className="text-xs font-semibold text-muted-foreground">Select a variation to use:</h4>
              {variations.map((v, i) => (
                <Card
                  key={v.id}
                  className={cn(
                    'p-4 cursor-pointer transition-all hover:shadow-md',
                    selectedId === v.id ? 'border-primary ring-2 ring-primary/30' : 'border-border'
                  )}
                  onClick={() => handleSelect(v)}
                >
                  <div className="flex items-start justify-between mb-2">
                    <Badge variant="secondary" className="text-[9px]">
                      {String.fromCharCode(65 + i)} — {v.framework.toUpperCase()}
                    </Badge>
                    {selectedId === v.id && <Check className="h-4 w-4 text-primary" />}
                  </div>
                  <h5 className="text-sm font-semibold mb-1">{v.headline}</h5>
                  <p className="text-xs text-muted-foreground mb-2">{v.primaryText}</p>
                  <Badge variant="outline" className="text-[9px]">{v.ctaText}</Badge>
                  <p className="text-[9px] text-muted-foreground mt-2 italic">{v.frameworkLabel}</p>
                </Card>
              ))}
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
