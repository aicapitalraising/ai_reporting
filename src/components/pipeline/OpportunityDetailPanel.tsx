import { User, Mail, Phone, DollarSign, Calendar, Tag, ExternalLink, Hash } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { PipelineOpportunity } from '@/hooks/usePipelines';
import { useContactTimeline } from '@/hooks/useContactTimeline';
import { ContactTimelineSection } from './ContactTimelineSection';
import { useClient } from '@/hooks/useClients';

// Helper to format currency
function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

interface OpportunityDetailPanelProps {
  opportunity: PipelineOpportunity;
  clientId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isPublicView?: boolean;
}

export function OpportunityDetailPanel({ 
  opportunity, 
  clientId,
  open, 
  onOpenChange,
  isPublicView 
}: OpportunityDetailPanelProps) {
  const { data: timelineEvents = [], isLoading: timelineLoading } = useContactTimeline(
    clientId,
    opportunity.ghl_contact_id || undefined
  );
  const { data: client } = useClient(clientId);

  const statusColors: Record<string, string> = {
    open: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
    won: 'bg-green-500/10 text-green-600 border-green-500/20',
    lost: 'bg-red-500/10 text-red-600 border-red-500/20',
    abandoned: 'bg-gray-500/10 text-gray-600 border-gray-500/20',
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            {opportunity.contact_name || 'Unknown Contact'}
          </SheetTitle>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {/* Contact Info */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              Contact Information
            </h3>
            
            {opportunity.contact_email && (
              <div className="flex items-center gap-2 text-sm">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <a 
                  href={`mailto:${opportunity.contact_email}`}
                  className="text-primary hover:underline"
                >
                  {opportunity.contact_email}
                </a>
              </div>
            )}
            
            {opportunity.contact_phone && (
              <div className="flex items-center gap-2 text-sm">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <a 
                  href={`tel:${opportunity.contact_phone}`}
                  className="text-primary hover:underline"
                >
                  {opportunity.contact_phone}
                </a>
              </div>
            )}

            {/* GHL Contact ID and View in GHL link */}
            {opportunity.ghl_contact_id && (
              <div className="flex items-center gap-2 mt-2 pt-2 border-t border-border/50 text-sm">
                <Hash className="h-4 w-4 text-muted-foreground" />
                <span className="text-xs text-muted-foreground font-mono">
                  GHL: {opportunity.ghl_contact_id}
                </span>
                {client?.ghl_location_id && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 px-2 text-xs"
                    onClick={() => {
                      window.open(
                        `https://app.gohighlevel.com/v2/location/${client.ghl_location_id}/contacts/detail/${opportunity.ghl_contact_id}`,
                        '_blank'
                      );
                    }}
                  >
                    <ExternalLink className="h-3 w-3 mr-1" />
                    View in GHL
                  </Button>
                )}
              </div>
            )}
          </div>

          <Separator />

          {/* Opportunity Details */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              Opportunity Details
            </h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-muted-foreground" />
                <div>
                  <div className="text-xs text-muted-foreground">Value</div>
                  <div className="font-semibold text-green-600">
                    {formatCurrency(opportunity.monetary_value)}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Tag className="h-4 w-4 text-muted-foreground" />
                <div>
                  <div className="text-xs text-muted-foreground">Status</div>
                  <Badge 
                    variant="outline" 
                    className={statusColors[opportunity.status] || ''}
                  >
                    {opportunity.status}
                  </Badge>
                </div>
              </div>

              {opportunity.source && (
                <div className="flex items-center gap-2">
                  <ExternalLink className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <div className="text-xs text-muted-foreground">Source</div>
                    <div className="text-sm">{opportunity.source}</div>
                  </div>
                </div>
              )}

              {opportunity.last_stage_change_at && (
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <div className="text-xs text-muted-foreground">Last Updated</div>
                    <div className="text-sm">
                      {new Date(opportunity.last_stage_change_at).toLocaleDateString()}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          <Separator />

          {/* Timeline */}
          <ContactTimelineSection 
            events={timelineEvents}
            isLoading={timelineLoading}
            ghlContactId={opportunity.ghl_contact_id}
            clientId={clientId}
            isPublicView={isPublicView}
          />
        </div>
      </SheetContent>
    </Sheet>
  );
}
