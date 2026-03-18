import DeckHero from '@/components/funnel-builder/deck/DeckHero';
import ChallengeSection from '@/components/funnel-builder/deck/ChallengeSection';
import OpportunitySection from '@/components/funnel-builder/deck/OpportunitySection';
import FrameworkSection from '@/components/funnel-builder/deck/FrameworkSection';
import ConversionFlow from '@/components/funnel-builder/deck/ConversionFlow';
import LeadGenDeepDive from '@/components/funnel-builder/deck/LeadGenDeepDive';
import FunnelDeepDive from '@/components/funnel-builder/deck/FunnelDeepDive';
import AutomationDeepDive from '@/components/funnel-builder/deck/AutomationDeepDive';
import AnalyticsDeepDive from '@/components/funnel-builder/deck/AnalyticsDeepDive';
import CaseStudies from '@/components/funnel-builder/deck/CaseStudies';
import BrokerComparison from '@/components/funnel-builder/deck/BrokerComparison';
import DeckLeadEnrichment from '@/components/funnel-builder/deck/DeckLeadEnrichment';
import CapitalRaisingCalculator from '@/components/funnel-builder/deck/CapitalRaisingCalculator';
import ExecutiveTeam from '@/components/funnel-builder/deck/ExecutiveTeam';
import WhatYouGet from '@/components/funnel-builder/deck/WhatYouGet';
import InvestmentSteps from '@/components/funnel-builder/deck/InvestmentSteps';
import DeckCTA from '@/components/funnel-builder/deck/DeckCTA';

const Deck = () => {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <DeckHero />
      <ChallengeSection />
      <OpportunitySection />
      <FrameworkSection />
      <ConversionFlow />
      <LeadGenDeepDive />
      <FunnelDeepDive />
      <AutomationDeepDive />
      <AnalyticsDeepDive />
      <CaseStudies />
      <BrokerComparison />
      <DeckLeadEnrichment />
      <CapitalRaisingCalculator />
      <ExecutiveTeam />
      <WhatYouGet />
      <InvestmentSteps />
      <DeckCTA />
    </div>
  );
};

export default Deck;
