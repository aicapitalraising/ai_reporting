import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { useAllCreatives } from '@/hooks/useAllCreatives';
import { useCreativeBriefs } from '@/hooks/useCreativeBriefs';
import { useAllAdScripts } from '@/hooks/useAdScripts';
import { useClients } from '@/hooks/useClients';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Search,
  Sparkles,
  Film,
  FileText,
  Image as ImageIcon,
  Mic,
  Zap,
  Target,
  ArrowRight,
  Play,
  CheckCircle2,
  Clock,
  AlertCircle,
  TrendingUp,
  Wand2,
  Video,
  User,
  Eye,
  Plus,
  Layers,
  PenTool,
  Megaphone,
  BarChart3,
  ChevronRight,
} from 'lucide-react';
import { format } from 'date-fns';

// ─── Workflow Card ────────────────────────────────────────────────

interface WorkflowCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  stats?: string;
  gradient: string;
  onClick: () => void;
  badge?: string;
}

function WorkflowCard({ icon, title, description, stats, gradient, onClick, badge }: WorkflowCardProps) {
  return (
    <button
      onClick={onClick}
      className="group relative overflow-hidden rounded-2xl border border-border bg-card p-6 text-left transition-all duration-300 hover:shadow-lg hover:border-primary/30 hover:-translate-y-0.5 active:scale-[0.98]"
    >
      <div className={`absolute inset-0 opacity-[0.03] group-hover:opacity-[0.06] transition-opacity ${gradient}`} />
      <div className="relative space-y-3">
        <div className="flex items-start justify-between">
          <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center">
            {icon}
          </div>
          {badge && (
            <Badge variant="secondary" className="text-[10px] font-medium">
              {badge}
            </Badge>
          )}
        </div>
        <div>
          <h3 className="font-semibold text-[15px] tracking-tight">{title}</h3>
          <p className="text-sm text-muted-foreground mt-1 leading-relaxed">{description}</p>
        </div>
        {stats && (
          <p className="text-xs text-muted-foreground/70 font-medium">{stats}</p>
        )}
        <div className="flex items-center gap-1 text-primary text-sm font-medium opacity-0 group-hover:opacity-100 transition-opacity">
          Open <ArrowRight className="h-3.5 w-3.5" />
        </div>
      </div>
    </button>
  );
}

// ─── Quick Action Button ──────────────────────────────────────────

interface QuickActionProps {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
}

function QuickAction({ icon, label, onClick }: QuickActionProps) {
  return (
    <button
      onClick={onClick}
      className="flex flex-col items-center gap-2 p-4 rounded-2xl border border-border bg-card hover:bg-accent/50 hover:border-primary/20 transition-all duration-200 active:scale-95 min-w-[100px]"
    >
      <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
        {icon}
      </div>
      <span className="text-xs font-medium text-center">{label}</span>
    </button>
  );
}

// ─── Status Pill ──────────────────────────────────────────────────

function StatusPill({ status, count }: { status: string; count: number }) {
  const config: Record<string, { bg: string; text: string; icon: React.ReactNode }> = {
    pending: { bg: 'bg-amber-500/10', text: 'text-amber-600', icon: <Clock className="h-3.5 w-3.5" /> },
    approved: { bg: 'bg-green-500/10', text: 'text-green-600', icon: <CheckCircle2 className="h-3.5 w-3.5" /> },
    in_production: { bg: 'bg-blue-500/10', text: 'text-blue-600', icon: <Play className="h-3.5 w-3.5" /> },
    rejected: { bg: 'bg-red-500/10', text: 'text-red-600', icon: <AlertCircle className="h-3.5 w-3.5" /> },
  };
  const c = config[status] || config.pending;
  return (
    <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full ${c.bg} ${c.text}`}>
      {c.icon}
      <span className="text-xs font-semibold">{count}</span>
      <span className="text-xs capitalize">{status.replace('_', ' ')}</span>
    </div>
  );
}

// ─── Recent Activity Item ─────────────────────────────────────────

function ActivityItem({ title, subtitle, time, status, type }: {
  title: string;
  subtitle: string;
  time: string;
  status: string;
  type: string;
}) {
  const typeIcons: Record<string, React.ReactNode> = {
    brief: <FileText className="h-4 w-4 text-blue-500" />,
    script: <PenTool className="h-4 w-4 text-purple-500" />,
    creative: <ImageIcon className="h-4 w-4 text-green-500" />,
    video: <Video className="h-4 w-4 text-orange-500" />,
  };

  return (
    <div className="flex items-center gap-3 p-3 rounded-xl hover:bg-accent/50 transition-colors cursor-pointer group">
      <div className="h-9 w-9 rounded-xl bg-muted flex items-center justify-center shrink-0">
        {typeIcons[type] || typeIcons.creative}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{title}</p>
        <p className="text-xs text-muted-foreground">{subtitle}</p>
      </div>
      <div className="text-right shrink-0">
        <Badge
          variant={status === 'approved' || status === 'completed' ? 'default' : 'secondary'}
          className="text-[10px]"
        >
          {status}
        </Badge>
        <p className="text-[10px] text-muted-foreground mt-1">{time}</p>
      </div>
      <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
    </div>
  );
}

// ─── Client Review Card ───────────────────────────────────────────

function ClientReviewCard({ clientName, pendingCount, approvedCount, totalCount, onClick }: {
  clientName: string;
  pendingCount: number;
  approvedCount: number;
  totalCount: number;
  onClick: () => void;
}) {
  const progress = totalCount > 0 ? (approvedCount / totalCount) * 100 : 0;
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-4 p-4 rounded-xl border border-border bg-card hover:shadow-md hover:border-primary/20 transition-all duration-200 w-full text-left group"
    >
      <div className="h-10 w-10 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center shrink-0">
        <span className="text-sm font-bold text-primary">
          {clientName.charAt(0).toUpperCase()}
        </span>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold truncate">{clientName}</p>
        <div className="flex items-center gap-3 mt-1">
          <span className="text-xs text-muted-foreground">{totalCount} creatives</span>
          {pendingCount > 0 && (
            <span className="text-xs text-amber-600 font-medium">{pendingCount} pending</span>
          )}
        </div>
        <div className="mt-2 h-1.5 w-full rounded-full bg-muted overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-primary to-primary/70 transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
      <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors shrink-0" />
    </button>
  );
}

// ─── Main Page ────────────────────────────────────────────────────

export default function CreativesHubPage() {
  const navigate = useNavigate();
  const { data: creatives = [] } = useAllCreatives();
  const { data: briefs = [] } = useCreativeBriefs();
  const { data: scripts = [] } = useAllAdScripts();
  const { data: clients = [] } = useClients();
  const [searchQuery, setSearchQuery] = useState('');
  const [clientFilter, setClientFilter] = useState<string>('all');

  // Stats
  const stats = useMemo(() => {
    const pending = creatives.filter(c => c.status === 'pending').length;
    const approved = creatives.filter(c => c.status === 'approved').length;
    const inProduction = creatives.filter(c => c.status === 'in_production').length;
    const totalBriefs = briefs.length;
    const totalScripts = scripts.length;
    const approvedScripts = scripts.filter(s => s.status === 'approved').length;
    return { pending, approved, inProduction, totalBriefs, totalScripts, approvedScripts };
  }, [creatives, briefs, scripts]);

  // Client-level creative aggregation for review
  const clientCreativeStats = useMemo(() => {
    const map = new Map<string, { name: string; id: string; pending: number; approved: number; total: number }>();
    creatives.forEach((c: any) => {
      const clientId = c.client_id;
      if (!clientId) return;
      const client = clients.find((cl: any) => cl.id === clientId);
      const name = client?.name || c.clientName || 'Unknown';
      if (!map.has(clientId)) {
        map.set(clientId, { name, id: clientId, pending: 0, approved: 0, total: 0 });
      }
      const entry = map.get(clientId)!;
      entry.total++;
      if (c.status === 'pending') entry.pending++;
      if (c.status === 'approved' || c.status === 'completed') entry.approved++;
    });
    return Array.from(map.values()).sort((a, b) => b.pending - a.pending);
  }, [creatives, clients]);

  // Recent activity feed
  const recentActivity = useMemo(() => {
    const items: Array<{ title: string; subtitle: string; time: string; status: string; type: string; date: Date }> = [];

    briefs.slice(0, 5).forEach(b => {
      items.push({
        title: `Brief: ${b.client_name}`,
        subtitle: (b as any).generation_reason || 'AI-generated brief',
        time: format(new Date(b.created_at), 'MMM d'),
        status: b.status,
        type: 'brief',
        date: new Date(b.created_at),
      });
    });

    scripts.slice(0, 5).forEach(s => {
      items.push({
        title: s.title,
        subtitle: `${s.script_type} script`,
        time: format(new Date(s.created_at), 'MMM d'),
        status: s.status,
        type: 'script',
        date: new Date(s.created_at),
      });
    });

    creatives.slice(0, 5).forEach((c: any) => {
      items.push({
        title: c.name || c.title || 'Creative',
        subtitle: c.type || 'creative asset',
        time: format(new Date(c.created_at), 'MMM d'),
        status: c.status,
        type: 'creative',
        date: new Date(c.created_at),
      });
    });

    return items.sort((a, b) => b.date.getTime() - a.date.getTime()).slice(0, 8);
  }, [briefs, scripts, creatives]);

  return (
    <AppLayout breadcrumbs={[{ label: 'Creatives Hub' }]}>
      <div className="max-w-7xl mx-auto space-y-8">

        {/* ── Hero Header ────────────────────────────────── */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Creatives Hub</h1>
              <p className="text-muted-foreground mt-1">
                Your AI-powered creative command center. Generate, review, and optimize.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search creatives..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="pl-9 w-[260px] rounded-xl"
                />
              </div>
            </div>
          </div>
        </div>

        {/* ── Status Overview ────────────────────────────── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="p-5 bg-gradient-to-br from-amber-500/5 to-transparent border-amber-500/10">
            <CardContent className="p-0 space-y-1">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-amber-500" />
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Pending Review</span>
              </div>
              <p className="text-3xl font-bold tracking-tight">{stats.pending}</p>
              <p className="text-xs text-muted-foreground">creatives awaiting approval</p>
            </CardContent>
          </Card>
          <Card className="p-5 bg-gradient-to-br from-green-500/5 to-transparent border-green-500/10">
            <CardContent className="p-0 space-y-1">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Approved</span>
              </div>
              <p className="text-3xl font-bold tracking-tight">{stats.approved}</p>
              <p className="text-xs text-muted-foreground">ready for launch</p>
            </CardContent>
          </Card>
          <Card className="p-5 bg-gradient-to-br from-blue-500/5 to-transparent border-blue-500/10">
            <CardContent className="p-0 space-y-1">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-blue-500" />
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">AI Briefs</span>
              </div>
              <p className="text-3xl font-bold tracking-tight">{stats.totalBriefs}</p>
              <p className="text-xs text-muted-foreground">strategic briefs generated</p>
            </CardContent>
          </Card>
          <Card className="p-5 bg-gradient-to-br from-purple-500/5 to-transparent border-purple-500/10">
            <CardContent className="p-0 space-y-1">
              <div className="flex items-center gap-2">
                <PenTool className="h-4 w-4 text-purple-500" />
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Scripts</span>
              </div>
              <p className="text-3xl font-bold tracking-tight">{stats.totalScripts}</p>
              <p className="text-xs text-muted-foreground">{stats.approvedScripts} approved</p>
            </CardContent>
          </Card>
        </div>

        {/* ── Quick Actions ──────────────────────────────── */}
        <div>
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Quick Actions</h2>
          <div className="flex gap-3 overflow-x-auto pb-1 scrollbar-none">
            <QuickAction
              icon={<Sparkles className="h-5 w-5 text-primary" />}
              label="Generate Brief"
              onClick={() => navigate('/briefs')}
            />
            <QuickAction
              icon={<PenTool className="h-5 w-5 text-purple-500" />}
              label="AI Script Writer"
              onClick={() => navigate('/briefs')}
            />
            <QuickAction
              icon={<Video className="h-5 w-5 text-orange-500" />}
              label="Batch Video"
              onClick={() => navigate('/batch-video')}
            />
            <QuickAction
              icon={<ImageIcon className="h-5 w-5 text-green-500" />}
              label="Static Ads"
              onClick={() => navigate('/static-ads')}
            />
            <QuickAction
              icon={<User className="h-5 w-5 text-blue-500" />}
              label="AI Avatars"
              onClick={() => navigate('/avatars')}
            />
            <QuickAction
              icon={<Eye className="h-5 w-5 text-amber-500" />}
              label="Review Queue"
              onClick={() => navigate('/')}
            />
            <QuickAction
              icon={<Wand2 className="h-5 w-5 text-pink-500" />}
              label="Ad Variations"
              onClick={() => navigate('/ad-variations')}
            />
          </div>
        </div>

        {/* ── Main Content Grid ──────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Left Column: Workflow Cards */}
          <div className="lg:col-span-2 space-y-6">

            {/* AI Creative Workflows */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold tracking-tight">AI Creative Workflows</h2>
                <Badge variant="secondary" className="text-xs gap-1">
                  <Zap className="h-3 w-3" /> AI-Powered
                </Badge>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <WorkflowCard
                  icon={<Mic className="h-6 w-6 text-primary" />}
                  title="Podcast & Video Ads"
                  description="Generate AI podcast-style ads and talking head videos with custom avatars, voices, and scripts."
                  stats={`${scripts.filter(s => s.script_type === 'video').length} video scripts ready`}
                  gradient="bg-gradient-to-br from-blue-500 to-cyan-500"
                  onClick={() => navigate('/batch-video')}
                  badge="Popular"
                />
                <WorkflowCard
                  icon={<ImageIcon className="h-6 w-6 text-green-500" />}
                  title="Hyper-Realistic Ads"
                  description="Create photorealistic static ads with AI. Product shots, lifestyle imagery, and branded visuals."
                  stats={`${creatives.filter((c: any) => c.type === 'image' || c.type === 'static').length} static ads created`}
                  gradient="bg-gradient-to-br from-green-500 to-emerald-500"
                  onClick={() => navigate('/static-ads')}
                />
                <WorkflowCard
                  icon={<PenTool className="h-6 w-6 text-purple-500" />}
                  title="AI Script Writer"
                  description="Generate direct response scripts from offers, marketing angles, hooks, and emotional drivers."
                  stats={`${stats.totalScripts} scripts generated`}
                  gradient="bg-gradient-to-br from-purple-500 to-pink-500"
                  onClick={() => navigate('/briefs')}
                  badge="DR Optimized"
                />
                <WorkflowCard
                  icon={<Target className="h-6 w-6 text-orange-500" />}
                  title="Direct Response Engine"
                  description="AI briefs powered by live Meta performance data. Auto-generates hooks, angles, and CTAs weekly."
                  stats={`${stats.totalBriefs} briefs this month`}
                  gradient="bg-gradient-to-br from-orange-500 to-red-500"
                  onClick={() => navigate('/briefs')}
                />
              </div>
            </div>

            {/* Creative Tools */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold tracking-tight">Creative Tools</h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <WorkflowCard
                  icon={<User className="h-6 w-6 text-blue-500" />}
                  title="AI Avatars"
                  description="Custom AI avatars with consistent identity across angles, outfits, and environments."
                  gradient="bg-gradient-to-br from-blue-500 to-indigo-500"
                  onClick={() => navigate('/avatars')}
                />
                <WorkflowCard
                  icon={<Wand2 className="h-6 w-6 text-pink-500" />}
                  title="Ad Variations"
                  description="Generate multiple ad variations from a single winning creative to scale campaigns."
                  gradient="bg-gradient-to-br from-pink-500 to-rose-500"
                  onClick={() => navigate('/ad-variations')}
                />
                <WorkflowCard
                  icon={<Film className="h-6 w-6 text-amber-500" />}
                  title="B-Roll Library"
                  description="AI-generated stock footage and B-roll clips for video ad production."
                  gradient="bg-gradient-to-br from-amber-500 to-yellow-500"
                  onClick={() => navigate('/broll')}
                />
              </div>
            </div>

            {/* Intelligence */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold tracking-tight">Creative Intelligence</h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <WorkflowCard
                  icon={<Megaphone className="h-6 w-6 text-red-500" />}
                  title="Ad Scraping Engine"
                  description="Scrape and analyze competitor ads for inspiration. Track winning creative patterns."
                  gradient="bg-gradient-to-br from-red-500 to-orange-500"
                  onClick={() => navigate('/ad-scraping')}
                />
                <WorkflowCard
                  icon={<BarChart3 className="h-6 w-6 text-teal-500" />}
                  title="Instagram Intel"
                  description="Monitor competitor Instagram accounts and analyze top-performing content."
                  gradient="bg-gradient-to-br from-teal-500 to-cyan-500"
                  onClick={() => navigate('/instagram-intel')}
                />
              </div>
            </div>
          </div>

          {/* Right Column: Activity & Client Review */}
          <div className="space-y-6">

            {/* Pipeline Status */}
            <Card className="p-5">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-3">Pipeline Status</h3>
              <div className="flex flex-wrap gap-2">
                <StatusPill status="pending" count={stats.pending} />
                <StatusPill status="approved" count={stats.approved} />
                <StatusPill status="in_production" count={stats.inProduction} />
              </div>
            </Card>

            {/* Client Review Queue */}
            <Card className="p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Client Review</h3>
                {clientCreativeStats.some(c => c.pending > 0) && (
                  <Badge variant="default" className="text-[10px]">
                    {clientCreativeStats.reduce((sum, c) => sum + c.pending, 0)} pending
                  </Badge>
                )}
              </div>
              <div className="space-y-2">
                {clientCreativeStats.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">No client creatives yet</p>
                ) : (
                  clientCreativeStats.slice(0, 6).map(client => (
                    <ClientReviewCard
                      key={client.id}
                      clientName={client.name}
                      pendingCount={client.pending}
                      approvedCount={client.approved}
                      totalCount={client.total}
                      onClick={() => navigate(`/client/${client.id}/creatives`)}
                    />
                  ))
                )}
              </div>
            </Card>

            {/* Recent Activity */}
            <Card className="p-5">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-3">Recent Activity</h3>
              <div className="space-y-0.5">
                {recentActivity.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">No recent activity</p>
                ) : (
                  recentActivity.map((item, i) => (
                    <ActivityItem key={i} {...item} />
                  ))
                )}
              </div>
            </Card>

          </div>
        </div>
      </div>
    </AppLayout>
  );
}
