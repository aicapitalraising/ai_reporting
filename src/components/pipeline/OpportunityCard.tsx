import { useState } from 'react';
import { User, DollarSign, Mail, Phone } from 'lucide-react';
import { PipelineOpportunity } from '@/hooks/usePipelines';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { OpportunityDetailPanel } from './OpportunityDetailPanel';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';

// Helper to format currency
function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

interface OpportunityCardProps {
  opportunity: PipelineOpportunity;
  clientId: string;
  isPublicView?: boolean;
}

export function OpportunityCard({ opportunity, clientId, isPublicView }: OpportunityCardProps) {
  const [detailOpen, setDetailOpen] = useState(false);

  const statusColors: Record<string, string> = {
    open: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
    won: 'bg-green-500/10 text-green-600 border-green-500/20',
    lost: 'bg-red-500/10 text-red-600 border-red-500/20',
    abandoned: 'bg-gray-500/10 text-gray-600 border-gray-500/20',
  };

  return (
    <>
      <Card 
        className="cursor-pointer hover:bg-accent/50 transition-colors"
        onClick={() => setDetailOpen(true)}
      >
        <CardContent className="p-3 space-y-2">
          {/* Name */}
          <div className="flex items-start gap-2">
            <User className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
            <span className="text-sm font-medium truncate">
              {opportunity.contact_name || 'Unknown Contact'}
            </span>
          </div>

          {/* Value */}
          {opportunity.monetary_value > 0 && (
            <div className="flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-muted-foreground shrink-0" />
              <span className="text-sm font-semibold text-green-600">
                {formatCurrency(opportunity.monetary_value)}
              </span>
            </div>
          )}

          {/* Source */}
          {opportunity.source && (
            <Badge variant="outline" className="text-xs">
              {opportunity.source}
            </Badge>
          )}

          {/* Contact info icons */}
          <div className="flex items-center gap-2 pt-1">
            <TooltipProvider>
              {opportunity.contact_email && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Mail className="h-3 w-3 text-muted-foreground" />
                  </TooltipTrigger>
                  <TooltipContent>{opportunity.contact_email}</TooltipContent>
                </Tooltip>
              )}
              {opportunity.contact_phone && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Phone className="h-3 w-3 text-muted-foreground" />
                  </TooltipTrigger>
                  <TooltipContent>{opportunity.contact_phone}</TooltipContent>
                </Tooltip>
              )}
            </TooltipProvider>
            <Badge 
              variant="outline" 
              className={`text-xs ml-auto ${statusColors[opportunity.status] || ''}`}
            >
              {opportunity.status}
            </Badge>
          </div>
        </CardContent>
      </Card>

      <OpportunityDetailPanel
        opportunity={opportunity}
        clientId={clientId}
        open={detailOpen}
        onOpenChange={setDetailOpen}
        isPublicView={isPublicView}
      />
    </>
  );
}
