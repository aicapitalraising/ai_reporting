import { useState } from 'react';
import { useClients } from '@/hooks/useClients';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { Palette, ChevronDown, ChevronUp } from 'lucide-react';

const TONES = ['Professional', 'Bold', 'Luxury'] as const;

interface BrandGuidelinesBarProps {
  enabled: boolean;
  onEnabledChange: (v: boolean) => void;
  selectedClientId: string;
  onClientChange: (id: string) => void;
  selectedTone: string;
  onToneChange: (t: string) => void;
}

export function BrandGuidelinesBar({
  enabled,
  onEnabledChange,
  selectedClientId,
  onClientChange,
  selectedTone,
  onToneChange,
}: BrandGuidelinesBarProps) {
  const { data: clients } = useClients();
  const [expanded, setExpanded] = useState(true);
  const selectedClient = clients?.find((c) => c.id === selectedClientId);

  return (
    <Card className="border-border bg-card/50 backdrop-blur">
      {/* Toggle row */}
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-3">
          <Palette className="h-4 w-4 text-primary" />
          <Label className="text-sm font-semibold cursor-pointer" htmlFor="brand-toggle">
            Apply Brand Guidelines to Generated Creatives
          </Label>
        </div>
        <div className="flex items-center gap-3">
          {enabled && selectedClient && (
            <Badge variant="secondary" className="text-[10px] gap-1">
              <span className="h-2 w-2 rounded-full bg-emerald-500 inline-block" />
              Brand Active
            </Badge>
          )}
          <Switch id="brand-toggle" checked={enabled} onCheckedChange={onEnabledChange} />
        </div>
      </div>

      {/* Collapsible panel */}
      {enabled && (
        <>
          <button
            onClick={() => setExpanded(!expanded)}
            className="w-full flex items-center justify-center gap-1 text-[10px] text-muted-foreground py-1 border-t border-border/50 hover:bg-accent/50 transition-colors"
          >
            {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
            {expanded ? 'Collapse' : 'Expand'} Brand Settings
          </button>

          {expanded && (
            <div className="px-4 pb-4 space-y-4 border-t border-border/50 pt-3">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Client */}
                <div className="space-y-1.5">
                  <Label className="text-xs">Client</Label>
                  <Select value={selectedClientId} onValueChange={onClientChange}>
                    <SelectTrigger className="h-9">
                      <SelectValue placeholder="Select client..." />
                    </SelectTrigger>
                    <SelectContent>
                      {clients?.map((c) => (
                        <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Colors (from client) */}
                <div className="space-y-1.5">
                  <Label className="text-xs">Brand Colors</Label>
                  {selectedClient?.brand_colors?.length ? (
                    <div className="flex items-center gap-2 h-9">
                      {selectedClient.brand_colors.map((color, i) => (
                        <div
                          key={i}
                          className="h-7 w-7 rounded-md border border-border"
                          style={{ backgroundColor: color }}
                          title={color}
                        />
                      ))}
                      {selectedClient.logo_url && (
                        <img
                          src={selectedClient.logo_url}
                          alt="Logo"
                          className="h-7 w-7 rounded object-contain bg-muted p-0.5 ml-2"
                        />
                      )}
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground h-9 flex items-center">
                      {selectedClientId ? 'No colors set' : 'Select a client'}
                    </p>
                  )}
                </div>

                {/* Tone */}
                <div className="space-y-1.5">
                  <Label className="text-xs">Creative Tone</Label>
                  <div className="flex gap-1.5">
                    {TONES.map((tone) => (
                      <button
                        key={tone}
                        onClick={() => onToneChange(tone)}
                        className={cn(
                          'px-3 py-1.5 rounded-md text-xs font-medium transition-all border',
                          selectedTone === tone
                            ? 'border-primary bg-primary/10 text-foreground'
                            : 'border-border text-muted-foreground hover:border-muted-foreground'
                        )}
                      >
                        {tone}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </Card>
  );
}
