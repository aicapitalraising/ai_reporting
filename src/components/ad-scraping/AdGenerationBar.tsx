import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Loader2, Sparkles, Info, Trash2, UserPlus } from 'lucide-react';
import { useClients } from '@/hooks/useClients';
import { useAdRegeneration, useDailyAdUsage, type RegenerationOptions } from '@/hooks/useAdRegeneration';
import type { ScrapedAd } from '@/hooks/useAdScraping';

const DAILY_LIMIT = 30;

interface AdGenerationBarProps {
  selectedIds: Set<string>;
  ads: ScrapedAd[];
  onClearSelection: () => void;
  onAssignSelected: () => void;
  onDeleteSelected: () => void;
}

export function AdGenerationBar({
  selectedIds,
  ads,
  onClearSelection,
  onAssignSelected,
  onDeleteSelected,
}: AdGenerationBarProps) {
  const [rewriteCopy, setRewriteCopy] = useState(true);
  const [forceBrandColors, setForceBrandColors] = useState(true);
  const [selectedClientId, setSelectedClientId] = useState<string>('');

  const { data: clients = [] } = useClients();
  const { data: dailyUsage = 0 } = useDailyAdUsage();
  const { mutate: regenerate, isPending, progress } = useAdRegeneration();

  if (selectedIds.size === 0) return null;

  const selectedAds = ads.filter((a) => selectedIds.has(a.id));
  const remaining = DAILY_LIMIT - dailyUsage;

  const handleGenerate = () => {
    const options: RegenerationOptions = {
      rewriteCopy,
      forceBrandColors,
      clientId: selectedClientId || undefined,
    };
    regenerate({ ads: selectedAds, options }, { onSuccess: () => onClearSelection() });
  };

  return (
    <TooltipProvider>
      <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-card/95 backdrop-blur-sm shadow-lg animate-in slide-in-from-bottom-4 duration-300">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
          {/* Left: toggles */}
          <div className="flex items-center gap-5 flex-wrap">
            <ToggleOption
              checked={rewriteCopy}
              onChange={setRewriteCopy}
              label="Rewrite original ad copy"
              tooltip="AI will create fresh, compelling copy inspired by the original ad text"
            />
            <ToggleOption
              checked={forceBrandColors}
              onChange={setForceBrandColors}
              label="Force strict brand colors"
              tooltip="Generated ads will use the selected client's brand color palette"
            />

            {/* Client selector */}
            {forceBrandColors && (
              <Select value={selectedClientId} onValueChange={setSelectedClientId}>
                <SelectTrigger className="w-[160px] h-8 text-xs">
                  <SelectValue placeholder="Select client" />
                </SelectTrigger>
                <SelectContent>
                  {clients.map((c) => (
                    <SelectItem key={c.id} value={c.id} className="text-xs">
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {/* Right: actions */}
          <div className="flex items-center gap-3">
            {/* Bulk actions */}
            <Button size="sm" variant="ghost" className="h-8 text-xs gap-1" onClick={onAssignSelected}>
              <UserPlus className="h-3 w-3" /> Assign
            </Button>
            <Button size="sm" variant="ghost" className="h-8 text-xs gap-1 text-destructive hover:text-destructive" onClick={onDeleteSelected}>
              <Trash2 className="h-3 w-3" /> Delete
            </Button>

            <div className="h-6 w-px bg-border" />

            {/* Usage counter */}
            <span className="text-xs text-muted-foreground whitespace-nowrap">
              <span className="font-semibold text-foreground">{remaining}</span>/{DAILY_LIMIT} daily ads left
            </span>

            {/* Generate button */}
            <Button
              size="sm"
              className="h-9 px-4 gap-1.5 font-semibold"
              onClick={handleGenerate}
              disabled={isPending || remaining <= 0}
            >
              {isPending ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  {progress.total > 0 ? `${progress.current}/${progress.total}` : 'Generating...'}
                </>
              ) : (
                <>
                  <Sparkles className="h-3.5 w-3.5" />
                  Generate {selectedIds.size} Ad{selectedIds.size > 1 ? 's' : ''}
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}

function ToggleOption({
  checked,
  onChange,
  label,
  tooltip,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  tooltip: string;
}) {
  return (
    <div className="flex items-center gap-1.5">
      <Checkbox
        checked={checked}
        onCheckedChange={(v) => onChange(!!v)}
        className="h-3.5 w-3.5"
      />
      <span className="text-xs whitespace-nowrap">{label}</span>
      <Tooltip>
        <TooltipTrigger asChild>
          <Info className="h-3 w-3 text-muted-foreground cursor-help" />
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-[200px] text-xs">
          {tooltip}
        </TooltipContent>
      </Tooltip>
    </div>
  );
}
