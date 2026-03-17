import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { DateFilterProvider } from "@/contexts/DateFilterContext";
import { PasswordGate } from "@/components/auth/PasswordGate";
import { Loader2 } from "lucide-react";

// Core reporting pages (lazy-loaded for code-splitting)
const Index = lazy(() => import("./pages/Index"));
const ClientDetail = lazy(() => import("./pages/ClientDetail"));
const ClientRecords = lazy(() => import("./pages/ClientRecords"));
const DatabaseView = lazy(() => import("./pages/DatabaseView"));
const PublicReport = lazy(() => import("./pages/PublicReport"));
const SpamBlacklist = lazy(() => import("./pages/SpamBlacklist"));
const NotFound = lazy(() => import("./pages/NotFound"));
const ClientCreatives = lazy(() => import("./pages/ClientCreatives"));
const PublicCreatives = lazy(() => import("./pages/PublicCreatives"));
const MetaAdsOverlay = lazy(() => import("./pages/MetaAdsOverlay"));
const CreativeBriefs = lazy(() => import("./pages/CreativeBriefs"));

// Creative tools pages (from ad-verse-ally)
const StaticAdsPage = lazy(() => import("./pages/StaticAdsPage"));
const StaticCreativesPage = lazy(() => import("./pages/StaticCreativesPage"));
const BatchVideoPage = lazy(() => import("./pages/BatchVideoPage"));
const AdScrapingPage = lazy(() => import("./pages/AdScrapingPage"));
const AdVariationsPage = lazy(() => import("./pages/AdVariationsPage"));
const AvatarsPage = lazy(() => import("./pages/AvatarsPage"));
const BrollPage = lazy(() => import("./pages/BrollPage"));
const VideoEditorPage = lazy(() => import("./pages/VideoEditorPage"));
const InstagramIntelPage = lazy(() => import("./pages/InstagramIntelPage"));
const HistoryPage = lazy(() => import("./pages/HistoryPage"));
const ExportHubPage = lazy(() => import("./pages/ExportHubPage"));
const ClientProjectsPage = lazy(() => import("./pages/ClientProjectsPage"));
const ProjectPage = lazy(() => import("./pages/ProjectPage"));

// Funnel Builder pages
const FunnelBuilderPage = lazy(() => import("./pages/FunnelBuilderPage"));
const FunnelBookingPage = lazy(() => import("./pages/FunnelBookingPage"));
const FunnelOnboardingPage = lazy(() => import("./pages/FunnelOnboardingPage"));
const FunnelAdminPage = lazy(() => import("./pages/FunnelAdminPage"));
const FunnelClientPage = lazy(() => import("./pages/FunnelClientPage"));
const FunnelDeckPage = lazy(() => import("./pages/FunnelDeckPage"));
const FunnelFulfillmentPage = lazy(() => import("./pages/FunnelFulfillmentPage"));
const FunnelInvestPage = lazy(() => import("./pages/FunnelInvestPage"));
const FunnelKickoffPage = lazy(() => import("./pages/FunnelKickoffPage"));
const FunnelAccessPage = lazy(() => import("./pages/FunnelAccessPage"));

function PageLoader() {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  );
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      gcTime: 1000 * 60 * 30,
      refetchOnWindowFocus: false,
      retry: 2,
    },
  },
});

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <DateFilterProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Suspense fallback={<PageLoader />}>
          <Routes>
            {/* Protected routes - require password */}
            <Route path="/" element={<PasswordGate><Index /></PasswordGate>} />
            <Route path="/client/:clientId" element={<PasswordGate><ClientDetail /></PasswordGate>} />
            <Route path="/client/:clientId/records" element={<PasswordGate><ClientRecords /></PasswordGate>} />
            <Route path="/client/:clientId/creatives" element={<PasswordGate><ClientCreatives /></PasswordGate>} />
            <Route path="/database" element={<PasswordGate><DatabaseView /></PasswordGate>} />
            <Route path="/spam-blacklist" element={<PasswordGate><SpamBlacklist /></PasswordGate>} />
            <Route path="/briefs" element={<PasswordGate><CreativeBriefs /></PasswordGate>} />

            {/* Creative Tools - from ad-verse-ally */}
            <Route path="/static-ads" element={<PasswordGate><StaticAdsPage /></PasswordGate>} />
            <Route path="/static-creatives" element={<PasswordGate><StaticCreativesPage /></PasswordGate>} />
            <Route path="/batch-video" element={<PasswordGate><BatchVideoPage /></PasswordGate>} />
            <Route path="/ad-scraping" element={<PasswordGate><AdScrapingPage /></PasswordGate>} />
            <Route path="/ad-variations" element={<PasswordGate><AdVariationsPage /></PasswordGate>} />
            <Route path="/avatars" element={<PasswordGate><AvatarsPage /></PasswordGate>} />
            <Route path="/broll" element={<PasswordGate><BrollPage /></PasswordGate>} />
            <Route path="/video-editor" element={<PasswordGate><VideoEditorPage /></PasswordGate>} />
            <Route path="/instagram-intel" element={<PasswordGate><InstagramIntelPage /></PasswordGate>} />
            <Route path="/history" element={<PasswordGate><HistoryPage /></PasswordGate>} />
            <Route path="/export" element={<PasswordGate><ExportHubPage /></PasswordGate>} />
            <Route path="/projects" element={<PasswordGate><ClientProjectsPage /></PasswordGate>} />
            <Route path="/projects/:projectId" element={<PasswordGate><ProjectPage /></PasswordGate>} />

            {/* Funnel Builder - from aicapitalraising */}
            <Route path="/funnel-builder" element={<PasswordGate><FunnelBuilderPage /></PasswordGate>} />
            <Route path="/funnel/:clientId/booking" element={<FunnelBookingPage />} />
            <Route path="/funnel/:clientId/onboarding" element={<FunnelOnboardingPage />} />
            <Route path="/funnel/:clientId/admin" element={<PasswordGate><FunnelAdminPage /></PasswordGate>} />
            <Route path="/funnel/:clientId/client" element={<FunnelClientPage />} />
            <Route path="/funnel/:clientId/deck" element={<FunnelDeckPage />} />
            <Route path="/funnel/:clientId/fulfillment" element={<PasswordGate><FunnelFulfillmentPage /></PasswordGate>} />
            <Route path="/funnel/:clientId/invest" element={<FunnelInvestPage />} />
            <Route path="/funnel/:clientId/kickoff" element={<FunnelKickoffPage />} />
            <Route path="/funnel/:clientId/access" element={<FunnelAccessPage />} />

            {/* Public routes - no password required */}
            <Route path="/public/:token" element={<PublicReport />} />
            <Route path="/public/:token/creatives" element={<PublicCreatives />} />
            <Route path="/meta-overlay" element={<MetaAdsOverlay />} />

            <Route path="*" element={<NotFound />} />
          </Routes>
          </Suspense>
        </BrowserRouter>
      </DateFilterProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
