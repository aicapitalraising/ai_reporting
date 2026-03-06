import { Sparkles, Building2, MapPin, CreditCard, Car, Briefcase, Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown } from 'lucide-react';
import { LeadEnrichment } from '@/hooks/useLeadEnrichment';

interface EnrichmentSectionProps {
  enrichment: LeadEnrichment | null | undefined;
  isLoading: boolean;
  isEnriching: boolean;
  onEnrich: () => void;
  canEnrich: boolean;
  isOpen: boolean;
  onToggle: () => void;
}

export function EnrichmentSection({
  enrichment,
  isLoading,
  isEnriching,
  onEnrich,
  canEnrich,
  isOpen,
  onToggle,
}: EnrichmentSectionProps) {
  const hasData = !!enrichment;

  return (
    <Collapsible open={isOpen} onOpenChange={onToggle}>
      <CollapsibleTrigger className="flex items-center justify-between w-full py-2 text-sm font-semibold text-muted-foreground uppercase tracking-wide hover:text-foreground transition-colors">
        <span className="flex items-center gap-2">
          <Sparkles className="h-4 w-4" />
          Lead Enrichment
          {hasData && (
            <Badge variant="secondary" className="text-[10px] px-1.5 py-0 bg-chart-4/10 text-chart-4 border-chart-4/20">
              Enriched
            </Badge>
          )}
        </span>
        <ChevronDown className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </CollapsibleTrigger>
      <CollapsibleContent className="pt-2 space-y-3">
        {!hasData && !isLoading && (
          <div className="text-center py-3">
            <p className="text-sm text-muted-foreground mb-2">No enrichment data yet</p>
            {canEnrich && (
              <Button
                size="sm"
                variant="outline"
                disabled={isEnriching}
                onClick={onEnrich}
                className="gap-1.5"
              >
                {isEnriching ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Sparkles className="h-3.5 w-3.5" />
                )}
                Enrich Lead
              </Button>
            )}
          </div>
        )}

        {isLoading && (
          <div className="flex items-center justify-center py-4">
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          </div>
        )}

        {hasData && (
          <div className="space-y-3">
            {/* Identity */}
            {(enrichment.first_name || enrichment.last_name) && (
              <div className="bg-muted/50 p-2.5 rounded space-y-1">
                <p className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                  <Building2 className="h-3 w-3" /> Identity
                </p>
                <p className="text-sm font-medium">
                  {[enrichment.first_name, enrichment.last_name].filter(Boolean).join(' ')}
                </p>
                {enrichment.gender && (
                  <p className="text-xs text-muted-foreground">Gender: {enrichment.gender}</p>
                )}
                {enrichment.birth_date && (
                  <p className="text-xs text-muted-foreground">DOB: {enrichment.birth_date}</p>
                )}
              </div>
            )}

            {/* Address */}
            {enrichment.address && (
              <div className="bg-muted/50 p-2.5 rounded space-y-1">
                <p className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                  <MapPin className="h-3 w-3" /> Address
                </p>
                <p className="text-sm">{enrichment.address}</p>
              </div>
            )}

            {/* Financial */}
            {(enrichment.household_income || enrichment.credit_range) && (
              <div className="bg-muted/50 p-2.5 rounded space-y-1">
                <p className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                  <CreditCard className="h-3 w-3" /> Financial
                </p>
                {enrichment.household_income && (
                  <p className="text-sm">Income: {enrichment.household_income}</p>
                )}
                {enrichment.credit_range && (
                  <p className="text-sm">Credit: {enrichment.credit_range}</p>
                )}
              </div>
            )}

            {/* Company */}
            {(enrichment.company_name || enrichment.company_title) && (
              <div className="bg-muted/50 p-2.5 rounded space-y-1">
                <p className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                  <Briefcase className="h-3 w-3" /> Company
                </p>
                {enrichment.company_title && (
                  <p className="text-sm font-medium">{enrichment.company_title}</p>
                )}
                {enrichment.company_name && (
                  <p className="text-sm">{enrichment.company_name}</p>
                )}
                {enrichment.linkedin_url && (
                  <a
                    href={enrichment.linkedin_url.startsWith('http') ? enrichment.linkedin_url : `https://${enrichment.linkedin_url}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-primary hover:underline"
                  >
                    LinkedIn Profile →
                  </a>
                )}
              </div>
            )}

            {/* Vehicles */}
            {enrichment.vehicles && enrichment.vehicles.length > 0 && (
              <div className="bg-muted/50 p-2.5 rounded space-y-1">
                <p className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                  <Car className="h-3 w-3" /> Vehicles
                </p>
                {enrichment.vehicles.map((v: any, i: number) => (
                  <p key={i} className="text-sm">
                    {[v.year, v.make, v.model].filter(Boolean).join(' ')}
                  </p>
                ))}
              </div>
            )}

            {/* Re-enrich button */}
            {canEnrich && (
              <Button
                size="sm"
                variant="ghost"
                disabled={isEnriching}
                onClick={onEnrich}
                className="w-full gap-1.5 text-xs"
              >
                {isEnriching ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <Sparkles className="h-3 w-3" />
                )}
                Re-enrich
              </Button>
            )}

            <p className="text-[10px] text-muted-foreground text-right">
              Enriched {new Date(enrichment.enriched_at).toLocaleDateString()}
            </p>
          </div>
        )}
      </CollapsibleContent>
    </Collapsible>
  );
}
