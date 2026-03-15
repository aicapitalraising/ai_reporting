import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Play,
  ExternalLink,
  Eye,
  Heart,
  MessageCircle,
  Share2,
  Brain,
  Loader2,
  Copy,
  Lightbulb,
  Zap,
  Target,
  Megaphone,
  CheckCircle2,
  XCircle,
  ShieldCheck,
} from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { getEmbedInfo, getPlatformLabel, type EmbedInfo } from '@/lib/video-embed';
import { cn } from '@/lib/utils';

function formatCount(n: number): string {
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(1)}B`;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toString();
}

type ScriptSection = {
  text: string;
  technique: string;
  timeRange: string;
};

type PersuasionItem = {
  present: boolean;
  details: string;
};

type PersuasionChecklist = {
  socialProof?: PersuasionItem;
  urgency?: PersuasionItem;
  authority?: PersuasionItem;
  reciprocity?: PersuasionItem;
  emotionalAppeal?: PersuasionItem;
  storytelling?: PersuasionItem;
  contrast?: PersuasionItem;
};

type VideoAnalysis = {
  hook?: ScriptSection;
  problem?: ScriptSection;
  solution?: ScriptSection;
  cta?: ScriptSection;
  persuasionChecklist?: PersuasionChecklist;
  overallStrategy?: string;
  recreationTips?: string[];
  estimatedDuration?: string;
  contentStyle?: string;
  emotionalTriggers?: string[];
};

export interface VideoIntelligenceItem {
  id: string;
  title: string;
  description?: string | null;
  platform: string;
  source_url?: string | null;
  video_url?: string | null;
  thumbnail_url?: string | null;
  image_url?: string | null;
  creator_name?: string | null;
  creator_handle?: string | null;
  views?: number;
  likes?: number;
  comments?: number;
  shares?: number;
  hashtags?: string[];
}

interface VideoIntelligenceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: VideoIntelligenceItem | null;
}

const SECTION_CONFIG = [
  { key: 'hook', label: 'Hook', icon: Zap, color: 'text-yellow-500', bg: 'bg-yellow-500/10 border-yellow-500/30' },
  { key: 'problem', label: 'Problem', icon: Target, color: 'text-orange-500', bg: 'bg-orange-500/10 border-orange-500/30' },
  { key: 'solution', label: 'Solution', icon: Lightbulb, color: 'text-blue-500', bg: 'bg-blue-500/10 border-blue-500/30' },
  { key: 'cta', label: 'CTA', icon: Megaphone, color: 'text-emerald-500', bg: 'bg-emerald-500/10 border-emerald-500/30' },
] as const;

const PERSUASION_LABELS: { key: keyof PersuasionChecklist; label: string; emoji: string }[] = [
  { key: 'socialProof', label: 'Social Proof', emoji: '👥' },
  { key: 'urgency', label: 'Urgency / Scarcity', emoji: '⏳' },
  { key: 'authority', label: 'Authority / Credibility', emoji: '🏆' },
  { key: 'reciprocity', label: 'Reciprocity', emoji: '🎁' },
  { key: 'emotionalAppeal', label: 'Emotional Appeal', emoji: '❤️' },
  { key: 'storytelling', label: 'Storytelling', emoji: '📖' },
  { key: 'contrast', label: 'Before / After Contrast', emoji: '🔄' },
];

export function VideoIntelligenceDialog({ open, onOpenChange, item }: VideoIntelligenceDialogProps) {
  const [analysis, setAnalysis] = useState<VideoAnalysis | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [activeTab, setActiveTab] = useState('preview');

  if (!item) return null;

  const embedInfo: EmbedInfo = getEmbedInfo(item.source_url);
  const thumbnail = item.thumbnail_url || item.image_url || embedInfo.thumbnailUrl;

  const handleAnalyze = async () => {
    setIsAnalyzing(true);
    try {
      const { data, error } = await supabase.functions.invoke('analyze-video-script', {
        body: {
          title: item.title,
          description: item.description,
          platform: item.platform,
          sourceUrl: item.source_url,
          thumbnailUrl: thumbnail,
        },
      });
      if (error) throw error;
      setAnalysis(data.analysis);
      setActiveTab('analysis');
      toast.success('Script analysis complete');
    } catch (err: any) {
      toast.error(err?.message || 'Analysis failed');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const copySection = (section: ScriptSection, label: string) => {
    navigator.clipboard.writeText(section.text);
    toast.success(`${label} copied`);
  };

  const persuasionScore = analysis?.persuasionChecklist
    ? PERSUASION_LABELS.filter(({ key }) => analysis.persuasionChecklist?.[key]?.present).length
    : 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] p-0 gap-0 overflow-hidden">
        <DialogHeader className="p-4 pb-2">
          <div className="flex items-center justify-between gap-3">
            <DialogTitle className="text-base truncate flex-1">{item.title}</DialogTitle>
            <div className="flex items-center gap-2 shrink-0">
              <Badge variant="outline" className="text-xs">{item.platform}</Badge>
              {item.views != null && (
                <Badge variant="secondary" className="text-xs gap-1">
                  <Eye className="h-3 w-3" /> {formatCount(item.views)}
                </Badge>
              )}
            </div>
          </div>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 overflow-hidden">
          <div className="px-4">
            <TabsList className="h-8">
              <TabsTrigger value="preview" className="text-xs">Preview</TabsTrigger>
              <TabsTrigger value="analysis" className="text-xs">
                <Brain className="h-3 w-3 mr-1" /> Script Analysis
              </TabsTrigger>
              {analysis?.persuasionChecklist && (
                <TabsTrigger value="checklist" className="text-xs">
                  <ShieldCheck className="h-3 w-3 mr-1" /> Persuasion ({persuasionScore}/{PERSUASION_LABELS.length})
                </TabsTrigger>
              )}
            </TabsList>
          </div>

          <div className="px-4 pb-4 overflow-y-auto max-h-[calc(90vh-120px)]">
            {/* Preview Tab */}
            <TabsContent value="preview" className="space-y-3 mt-3">
              <div className="relative bg-black rounded-lg overflow-hidden">
                {embedInfo.embedUrl ? (
                  <iframe
                    src={embedInfo.embedUrl}
                    className={cn(
                      'w-full border-0',
                      (embedInfo.type === 'tiktok' || embedInfo.type === 'instagram') ? 'h-[580px]' : 'aspect-video'
                    )}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    title={item.title}
                  />
                ) : item.video_url ? (
                  <video
                    src={item.video_url}
                    poster={thumbnail || undefined}
                    className="w-full max-h-[70vh] object-contain"
                    controls
                    playsInline
                  />
                ) : thumbnail ? (
                  <div className="relative">
                    <img src={thumbnail} alt={item.title} className="w-full max-h-[70vh] object-contain" />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-16 h-16 rounded-full bg-black/60 flex items-center justify-center backdrop-blur-sm">
                        <Play className="h-7 w-7 text-white ml-1" />
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-64 text-muted-foreground">
                    <Play className="h-12 w-12 opacity-30" />
                  </div>
                )}
              </div>

              {/* Platform badge */}
              {embedInfo.type !== 'unknown' && (
                <Badge variant="secondary" className="text-xs">
                  {getPlatformLabel(embedInfo.type)}
                </Badge>
              )}

              {/* Creator + metrics */}
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center text-xs font-bold text-muted-foreground">
                    {(item.creator_name || 'U')[0].toUpperCase()}
                  </div>
                  <div>
                    <p className="font-medium">{item.creator_name || 'Unknown'}</p>
                    {item.creator_handle && <p className="text-xs text-muted-foreground">{item.creator_handle}</p>}
                  </div>
                </div>
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  {item.likes != null && <span className="flex items-center gap-1"><Heart className="h-3 w-3" /> {formatCount(item.likes)}</span>}
                  {item.comments != null && <span className="flex items-center gap-1"><MessageCircle className="h-3 w-3" /> {formatCount(item.comments)}</span>}
                  {item.shares != null && <span className="flex items-center gap-1"><Share2 className="h-3 w-3" /> {formatCount(item.shares)}</span>}
                </div>
              </div>

              {/* Description */}
              {item.description && (
                <p className="text-xs text-muted-foreground line-clamp-4 leading-relaxed">{item.description}</p>
              )}

              {/* Hashtags */}
              {item.hashtags && item.hashtags.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {item.hashtags.slice(0, 10).map((tag) => (
                    <Badge key={tag} variant="secondary" className="text-[10px]">{tag.startsWith('#') ? tag : `#${tag}`}</Badge>
                  ))}
                </div>
              )}
            </TabsContent>

            {/* Analysis Tab */}
            <TabsContent value="analysis" className="space-y-4 mt-3">
              {!analysis && !isAnalyzing && (
                <div className="text-center py-12">
                  <Brain className="h-10 w-10 mx-auto mb-3 text-muted-foreground opacity-50" />
                  <p className="text-sm font-medium mb-1">AI Script Breakdown</p>
                  <p className="text-xs text-muted-foreground mb-4">
                    Analyze this video's structure: Hook → Problem → Solution → CTA + persuasion checklist
                  </p>
                  <Button onClick={handleAnalyze} className="gap-2">
                    <Brain className="h-4 w-4" /> Analyze Script
                  </Button>
                </div>
              )}

              {isAnalyzing && (
                <div className="text-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin mx-auto mb-3 text-primary" />
                  <p className="text-sm font-medium">Analyzing video structure...</p>
                  <p className="text-xs text-muted-foreground mt-1">Breaking down hook, problem, solution, CTA & persuasion tactics</p>
                </div>
              )}

              {analysis && !isAnalyzing && (
                <div className="space-y-3">
                  {/* Overall strategy */}
                  {analysis.overallStrategy && (
                    <div className="rounded-lg border border-border bg-muted/30 p-3">
                      <p className="text-xs font-semibold mb-1">Why It Works</p>
                      <p className="text-sm leading-relaxed">{analysis.overallStrategy}</p>
                      <div className="flex gap-2 mt-2 flex-wrap">
                        {analysis.contentStyle && (
                          <Badge variant="outline" className="text-[10px]">{analysis.contentStyle}</Badge>
                        )}
                        {analysis.estimatedDuration && (
                          <Badge variant="outline" className="text-[10px]">{analysis.estimatedDuration}</Badge>
                        )}
                        {analysis.emotionalTriggers?.map((t) => (
                          <Badge key={t} variant="secondary" className="text-[10px]">{t}</Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Script sections */}
                  {SECTION_CONFIG.map(({ key, label, icon: Icon, color, bg }) => {
                    const section = analysis[key as keyof VideoAnalysis] as ScriptSection | undefined;
                    if (!section?.text) return null;
                    return (
                      <div key={key} className={cn('rounded-lg border p-3 space-y-1.5', bg)}>
                        <div className="flex items-center justify-between">
                          <span className={cn('text-xs font-bold flex items-center gap-1.5', color)}>
                            <Icon className="h-3.5 w-3.5" />
                            {label}
                            <span className="font-normal opacity-70">{section.timeRange}</span>
                          </span>
                          <div className="flex items-center gap-1.5">
                            {section.technique && (
                              <Badge variant="outline" className="text-[9px] h-5">{section.technique}</Badge>
                            )}
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 text-[10px] px-2"
                              onClick={() => copySection(section, label)}
                            >
                              <Copy className="h-2.5 w-2.5 mr-0.5" /> Copy
                            </Button>
                          </div>
                        </div>
                        <p className="text-sm leading-relaxed">{section.text}</p>
                      </div>
                    );
                  })}

                  {/* Inline persuasion summary */}
                  {analysis.persuasionChecklist && (
                    <div className="rounded-lg border border-border bg-muted/20 p-3">
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-xs font-semibold flex items-center gap-1.5">
                          <ShieldCheck className="h-3.5 w-3.5 text-primary" /> Persuasion Score
                        </p>
                        <Badge variant={persuasionScore >= 5 ? 'default' : 'secondary'} className="text-[10px]">
                          {persuasionScore}/{PERSUASION_LABELS.length}
                        </Badge>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {PERSUASION_LABELS.map(({ key, label, emoji }) => {
                          const item = analysis.persuasionChecklist?.[key];
                          return (
                            <Badge
                              key={key}
                              variant="outline"
                              className={cn(
                                'text-[10px] gap-1',
                                item?.present
                                  ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-700'
                                  : 'border-border text-muted-foreground opacity-60'
                              )}
                            >
                              {item?.present ? <CheckCircle2 className="h-2.5 w-2.5" /> : <XCircle className="h-2.5 w-2.5" />}
                              {emoji} {label}
                            </Badge>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Recreation tips */}
                  {analysis.recreationTips && analysis.recreationTips.length > 0 && (
                    <div className="rounded-lg border border-primary/20 bg-primary/5 p-3">
                      <p className="text-xs font-semibold mb-2 flex items-center gap-1.5">
                        <Lightbulb className="h-3.5 w-3.5 text-primary" /> Recreation Tips
                      </p>
                      <ul className="space-y-1">
                        {analysis.recreationTips.map((tip, i) => (
                          <li key={i} className="text-xs text-foreground/80 flex items-start gap-2">
                            <span className="text-primary font-bold">{i + 1}.</span> {tip}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <Button variant="outline" size="sm" className="w-full" onClick={handleAnalyze}>
                    <Brain className="h-3 w-3 mr-1" /> Re-analyze
                  </Button>
                </div>
              )}
            </TabsContent>

            {/* Persuasion Checklist Tab (detailed view) */}
            <TabsContent value="checklist" className="space-y-3 mt-3">
              {analysis?.persuasionChecklist && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-semibold flex items-center gap-2">
                      <ShieldCheck className="h-4 w-4 text-primary" />
                      Persuasion Tactics Detected
                    </h3>
                    <Badge variant={persuasionScore >= 5 ? 'default' : 'secondary'}>
                      {persuasionScore}/{PERSUASION_LABELS.length} active
                    </Badge>
                  </div>

                  {PERSUASION_LABELS.map(({ key, label, emoji }) => {
                    const checkItem = analysis.persuasionChecklist?.[key];
                    const isPresent = checkItem?.present;
                    return (
                      <div
                        key={key}
                        className={cn(
                          'rounded-lg border p-3 flex items-start gap-3 transition-colors',
                          isPresent
                            ? 'border-emerald-500/30 bg-emerald-500/5'
                            : 'border-border bg-muted/20 opacity-70'
                        )}
                      >
                        <div className={cn(
                          'mt-0.5 shrink-0',
                          isPresent ? 'text-emerald-600' : 'text-muted-foreground'
                        )}>
                          {isPresent ? <CheckCircle2 className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold flex items-center gap-1.5">
                            <span>{emoji}</span> {label}
                          </p>
                          {checkItem?.details && (
                            <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{checkItem.details}</p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </TabsContent>
          </div>
        </Tabs>

        {/* Bottom actions */}
        <div className="flex items-center gap-2 p-4 pt-2 border-t border-border">
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>Close</Button>
          <div className="flex-1" />
          {!analysis && !isAnalyzing && (
            <Button variant="outline" size="sm" className="gap-1.5" onClick={handleAnalyze} disabled={isAnalyzing}>
              <Brain className="h-3.5 w-3.5" /> Analyze Script
            </Button>
          )}
          {item.source_url && (
            <Button variant="outline" size="sm" className="gap-1.5" asChild>
              <a href={item.source_url} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="h-3.5 w-3.5" /> Open Original
              </a>
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
