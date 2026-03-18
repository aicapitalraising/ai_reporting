import logo from '@/assets/logo-aicra.png';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { ExternalLink, Play, FileText, Calculator, Phone, Calendar, BookOpen } from 'lucide-react';
import ClientInvestmentCalculator from '@/components/funnel-builder/client/InvestmentCalculator';
import ClientCapitalRaisingCalculator from '@/components/funnel-builder/client/CapitalRaisingCalculator';

/* ── Video data ─────────────────────────────────────────── */
const marketingVideos = [
  { title: 'Fund Investment Process Overview', description: 'Introduction to the capital raising process and how our system works.', loomId: '7446a0b1a2b84e9ba32641662f8c9c14', duration: '2:58' },
  { title: 'Scorecard Overview', description: 'Dashboard overview, metrics, and how to read your scorecard.', loomId: '70f544fad61e4afe97a3629bb70d789e', duration: '2:59' },
];

const operationsVideos = [
  { title: 'CRM Account Overview', description: 'Quick walkthrough of your CRM dashboard and key features.', loomId: 'a40edad2caa24d55be82ca388de7e5b8', duration: '4:00' },
  { title: 'How To Book Appointments', description: 'Learn how to book appointments from your desktop.', loomId: '5a54247d684943c0ac2e72307b955d09', duration: '2:51' },
  { title: 'How To Use Pipeline', description: 'Lead tracking with the pipeline for investor management.', loomId: '7c89ee07b4164a2592d194c0e161a65b', duration: '4:00' },
  { title: 'How To Add Staff Members', description: 'Add new staff members and users to the platform.', loomId: 'c92565ce9d3c468ea25872bdce7b3073', duration: '1:42' },
  { title: 'Marking No Shows', description: 'How to mark calls as no-show in the system.', loomId: 'b082233cc9a64400a26608223bd830e6', duration: '0:50' },
  { title: 'Recording Calls', description: 'How call recordings work and where to find them.', loomId: '6bec1703e84c43c3b8bee829d1db3d3e', duration: '1:10' },
  { title: 'Blocking Off Time', description: 'Block time on your calendar for holidays or breaks.', loomId: 'e7c7428bb5b8437d9201ef5b0cbcb34a', duration: '1:31' },
  { title: 'How To Import A Contact List', description: 'Import your contacts into the CRM system.', loomId: '26e4ffe9c8694c9088b8cd592ad29781', duration: '6:00' },
  { title: 'Nurture King Login Issues', description: 'How to clear browser cache and fix login errors.', loomId: 'd47af79294174c1f8115f14733241c76', duration: '1:33' },
];

/* ── Resource links ─────────────────────────────────────── */
const salesResources = [
  { title: 'Setter Call Script', description: 'Proven script for discovery and setter calls.', url: 'https://docs.google.com/document/d/16GwYeUwKawdvtwt5Yxz_3cOOTWG-pNNzhi3Da1HMiYE/copy', icon: FileText },
  { title: 'Sales Script — Accredited Investors', description: 'Get $50K–$1M in funded investors with this sales framework.', url: 'https://docs.google.com/document/d/1s4JX3FeLK1JC0WhOaBkkKROBkooss3lswbLJpFGolkk/copy', icon: FileText },
  { title: 'Ultimate Follow-Up Guide', description: 'Capital-raising follow-up sequences and templates.', url: 'https://docs.google.com/document/d/1UrkwFhrfWIkgkjh5bdnCpttq5mIkqDpfLcgslbrbx2E/copy', icon: BookOpen },
];

const quickLinks = [
  { title: 'Book Weekly Review Call', url: 'https://aicapitalraising.com/review', icon: Calendar },
  { title: 'How To Share Ad Accounts', url: '/access', icon: ExternalLink },
  { title: 'Get Your CRM Account', url: 'http://app.gohighlevel.com/', icon: ExternalLink },
  { title: 'AI Avatar — Clone Yourself', url: 'https://app.heygen.com/home', icon: ExternalLink },
  { title: 'AI Notetaker (1 Free Month)', url: 'https://fathom.video/invite/H_Rz4w', icon: ExternalLink },
  { title: 'Investor Portal — InvestNext', url: 'https://www.investnext.com/demo/?afmc=6r8', icon: ExternalLink },
];

/* ── Components ─────────────────────────────────────────── */

function VideoCard({ title, description, loomId, duration }: {
  title: string; description: string; loomId: string; duration: string;
}) {
  return (
    <a href={`https://www.loom.com/share/${loomId}`} target="_blank" rel="noopener noreferrer"
      className="group block rounded-xl border border-border bg-card hover:border-primary/40 transition-all duration-300 overflow-hidden">
      <div className="relative aspect-video bg-muted">
        <img src={`https://cdn.loom.com/sessions/thumbnails/${loomId}-with-play.gif`} alt={title}
          className="w-full h-full object-cover" loading="lazy"
          onError={(e) => { (e.target as HTMLImageElement).src = `https://cdn.loom.com/sessions/thumbnails/${loomId}.jpg`; }} />
        <div className="absolute inset-0 bg-foreground/0 group-hover:bg-foreground/10 transition-colors flex items-center justify-center">
          <div className="w-12 h-12 rounded-full bg-primary/90 flex items-center justify-center opacity-80 group-hover:opacity-100 group-hover:scale-110 transition-all">
            <Play className="w-5 h-5 text-primary-foreground ml-0.5" />
          </div>
        </div>
        <span className="absolute bottom-2 right-2 text-[10px] font-mono bg-foreground/70 text-background px-1.5 py-0.5 rounded">{duration}</span>
      </div>
      <div className="p-4">
        <h4 className="font-display text-sm font-semibold text-foreground group-hover:text-primary transition-colors">{title}</h4>
        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{description}</p>
      </div>
    </a>
  );
}

function ResourceCard({ title, description, url, icon: Icon }: {
  title: string; description: string; url: string; icon: React.ElementType;
}) {
  return (
    <a href={url} target="_blank" rel="noopener noreferrer"
      className="group flex items-start gap-4 rounded-xl border border-border bg-card p-5 hover:border-primary/40 transition-all duration-300">
      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 group-hover:bg-primary/20 transition-colors">
        <Icon className="w-5 h-5 text-primary" />
      </div>
      <div className="min-w-0">
        <h4 className="font-display text-sm font-semibold text-foreground group-hover:text-primary transition-colors">{title}</h4>
        <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
      </div>
      <ExternalLink className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity" />
    </a>
  );
}

function QuickLinkCard({ title, url, icon: Icon }: { title: string; url: string; icon: React.ElementType }) {
  const isExternal = url.startsWith('http');
  return (
    <a href={url} target={isExternal ? '_blank' : undefined} rel={isExternal ? 'noopener noreferrer' : undefined}
      className="group flex items-center gap-3 rounded-xl border border-border bg-card p-4 hover:border-primary/40 transition-all duration-300">
      <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 group-hover:bg-primary/20 transition-colors">
        <Icon className="w-4 h-4 text-primary" />
      </div>
      <span className="font-display text-sm font-medium text-foreground group-hover:text-primary transition-colors">{title}</span>
      <ExternalLink className="w-3.5 h-3.5 text-muted-foreground ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
    </a>
  );
}

function SectionHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="mb-8">
      <h2 className="font-display text-2xl md:text-3xl font-bold text-foreground">{title}</h2>
      {subtitle && <p className="text-muted-foreground text-sm mt-1 max-w-xl">{subtitle}</p>}
      <div className="luxury-divider mt-4 mx-0" />
    </div>
  );
}

/* ── Page ────────────────────────────────────────────────── */

export default function Client() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border bg-background sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <a href="/"><img src={logo} alt="AI Capital Raising Accelerator" className="h-8" /></a>
          <a href="https://aicapitalraising.com/steps" target="_blank" rel="noopener noreferrer">
            <Button size="sm" className="font-semibold rounded-lg"><Phone className="w-4 h-4 mr-1.5" />Kick Off Call</Button>
          </a>
        </div>
      </header>

      <section className="py-16 md:py-20 px-6">
        <div className="max-w-6xl mx-auto text-center">
          <h1 className="font-display text-4xl md:text-5xl font-bold text-foreground mb-3">
            Client <span className="gradient-text">Resource Hub</span>
          </h1>
          <p className="text-muted-foreground max-w-lg mx-auto">
            Everything you need to raise capital efficiently—onboarding, scripts, guides, and calculators in one place.
          </p>
        </div>
      </section>

      <div className="max-w-6xl mx-auto px-6 pb-20 space-y-20">
        {/* Flow Diagrams */}
        <section>
          <SectionHeader title="Flow Diagrams" subtitle="Visual breakdown of our capital raising funnels." />
          <div className="space-y-6">
            <div className="rounded-xl border border-border bg-card overflow-hidden">
              <div className="px-5 py-3 border-b border-border bg-muted/40">
                <h3 className="font-display text-sm font-semibold text-foreground">Capital Calendar Flow</h3>
              </div>
              <div className="p-4">
                <img src="/images/capital-calendar-flow.png" alt="Capital Calendar Flow — full funnel diagram" className="w-full rounded-lg" loading="lazy" />
              </div>
            </div>
            <div className="rounded-xl border border-border bg-card overflow-hidden">
              <div className="px-5 py-3 border-b border-border bg-muted/40">
                <h3 className="font-display text-sm font-semibold text-foreground">Capital Webinar Flow</h3>
              </div>
              <div className="p-4">
                <img src="/images/capital-webinar-flow.png" alt="Capital Webinar Flow — full funnel diagram" className="w-full rounded-lg" loading="lazy" />
              </div>
            </div>
          </div>
        </section>

        {/* Marketing Videos */}
        <section>
          <SectionHeader title="Marketing" subtitle="Overview of our model and how the system works." />
          <div className="grid sm:grid-cols-2 gap-5">
            {marketingVideos.map(v => <VideoCard key={v.loomId} {...v} />)}
          </div>
        </section>

        {/* Sales Resources */}
        <section>
          <SectionHeader title="Sales" subtitle="Scripts and follow-up guides to close funded investors." />
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {salesResources.map(r => <ResourceCard key={r.title} {...r} />)}
          </div>
        </section>

        {/* Operations */}
        <section>
          <SectionHeader title="Operations" subtitle="CRM walkthroughs, appointment booking, pipeline management, and more." />
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {operationsVideos.map(v => <VideoCard key={v.loomId} {...v} />)}
          </div>
        </section>

        {/* Mobile App */}
        <section>
          <SectionHeader title="Mobile App" subtitle="Stay connected on the go with the Lead Connector app." />
          <div className="flex flex-wrap gap-4">
            <a href="https://apps.apple.com/us/app/lead-connector/id1564302502" target="_blank" rel="noopener noreferrer">
              <img src="https://images.leadconnectorhq.com/image/f_webp/q_80/r_1200/u_https://assets.cdn.filesafe.space/d8CBJtLt5tMw2cYEu0AC/media/62056130657a868f59cc41e5.webp" alt="Download on App Store" className="h-12 rounded-lg" />
            </a>
            <a href="https://play.google.com/store/apps/details?id=com.LeadConnector" target="_blank" rel="noopener noreferrer">
              <img src="https://images.leadconnectorhq.com/image/f_webp/q_80/r_1200/u_https://assets.cdn.filesafe.space/d8CBJtLt5tMw2cYEu0AC/media/62056130657a863c63cc41e6.webp" alt="Get it on Google Play" className="h-12 rounded-lg" />
            </a>
          </div>
        </section>

        {/* Calculators */}
        <section>
          <SectionHeader title="Calculators" subtitle="Plan your raise and project investor returns." />
          <Tabs defaultValue="capital" className="w-full">
            <TabsList className="mb-6 bg-muted/60">
              <TabsTrigger value="capital" className="gap-1.5"><Calculator className="w-3.5 h-3.5" /> Capital Raising</TabsTrigger>
              <TabsTrigger value="investment" className="gap-1.5"><Calculator className="w-3.5 h-3.5" /> Investment</TabsTrigger>
            </TabsList>
            <TabsContent value="capital"><ClientCapitalRaisingCalculator /></TabsContent>
            <TabsContent value="investment"><ClientInvestmentCalculator /></TabsContent>
          </Tabs>
        </section>

        {/* Quick Links */}
        <section>
          <SectionHeader title="Quick Links" subtitle="Useful tools and external resources." />
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {quickLinks.map(l => <QuickLinkCard key={l.title} {...l} />)}
          </div>
        </section>
      </div>

      <footer className="border-t border-border py-8 bg-muted/30">
        <div className="max-w-6xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <img src={logo} alt="AI Capital Raising Accelerator" className="h-7" />
          <p className="text-xs text-muted-foreground">© {new Date().getFullYear()} AI Capital Raising. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
