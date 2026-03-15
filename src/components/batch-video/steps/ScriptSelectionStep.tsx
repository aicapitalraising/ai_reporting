import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Loader2, ArrowRight, FileText, Wand2, Check } from 'lucide-react';
import { useClients, useClient } from '@/hooks/useClients';
import { useProjects, useProject } from '@/hooks/useProjects';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { IgImportSection } from '../IgImportSection';
import type { Script } from '@/types';
import type { VideoAdType, VideoPlatform } from '@/types/batch-video';

const AD_TYPES: { id: VideoAdType; label: string; desc: string }[] = [
  { id: 'hook-story-cta', label: 'Hook-Story-CTA', desc: 'Attention grabber → narrative → action' },
  { id: 'problem-solution', label: 'Problem-Solution', desc: 'Pain point → your fix' },
  { id: 'testimonial', label: 'Testimonial', desc: 'Social proof storytelling' },
  { id: 'product-demo', label: 'Product Demo', desc: 'Show it in action' },
  { id: 'ugc-style', label: 'UGC Style', desc: 'Authentic creator feel' },
];

const PLATFORMS: { id: VideoPlatform; label: string; ratio: '9:16' | '16:9' | '1:1' }[] = [
  { id: 'tiktok-reels', label: 'TikTok / Reels 9:16', ratio: '9:16' },
  { id: 'youtube', label: 'YouTube 16:9', ratio: '16:9' },
  { id: 'square', label: 'Square 1:1', ratio: '1:1' },
];

interface ScriptSelectionStepProps {
  onComplete: (
    scriptContent: string,
    projectId: string,
    scriptId: string,
    clientId: string,
    offerDescription?: string,
    avatarDescription?: string,
    adType?: VideoAdType,
    platform?: VideoPlatform,
  ) => void;
  isProcessing: boolean;
}

export function ScriptSelectionStep({ onComplete, isProcessing }: ScriptSelectionStepProps) {
  const { data: clients = [] } = useClients();
  const [selectedClientId, setSelectedClientId] = useState('');
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [selectedScriptId, setSelectedScriptId] = useState('');
  const [scripts, setScripts] = useState<Script[]>([]);
  const [customScript, setCustomScript] = useState('');
  const [isLoadingScripts, setIsLoadingScripts] = useState(false);
  const [isGeneratingScript, setIsGeneratingScript] = useState(false);
  const [generatedScripts, setGeneratedScripts] = useState<Array<{ id: string; title: string; content: string; framework: string }>>([]);
  const [adType, setAdType] = useState<VideoAdType>('hook-story-cta');
  const [platform, setPlatform] = useState<VideoPlatform>('tiktok-reels');

  const { data: projects = [] } = useProjects(selectedClientId);
  const { data: selectedClient } = useClient(selectedClientId);
  const { data: selectedProject } = useProject(selectedProjectId);
  const offerDescription = selectedProject?.offer_description || selectedClient?.offer_description || selectedClient?.description || '';

  useEffect(() => {
    if (selectedProjectId) {
      loadScripts(selectedProjectId);
    } else {
      setScripts([]);
      setSelectedScriptId('');
    }
  }, [selectedProjectId]);

  const loadScripts = async (projectId: string) => {
    setIsLoadingScripts(true);
    try {
      const { data, error } = await supabase
        .from('scripts').select('*').eq('project_id', projectId).order('created_at', { ascending: false });
      if (error) throw error;
      setScripts(data || []);
    } catch {
      toast.error('Failed to load scripts');
    } finally {
      setIsLoadingScripts(false);
    }
  };

  const handleGenerateScripts = async () => {
    if (!selectedClientId) { toast.error('Select a client first'); return; }
    setIsGeneratingScript(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-scripts', {
        body: {
          productInfo: {
            productService: offerDescription || selectedClient?.name || 'Product',
            targetAudience: 'Potential customers',
            painPoints: ['Problem to solve'],
            benefits: ['Key benefit'],
            usp: offerDescription || 'Unique value proposition',
          },
          frameworks: ['hormozi', 'pas'],
        },
      });
      if (error) throw error;
      if (data.scripts?.length > 0) {
        setGeneratedScripts(data.scripts);
        toast.success(`Generated ${data.scripts.length} scripts`);
      }
    } catch { toast.error('Failed to generate scripts'); }
    finally { setIsGeneratingScript(false); }
  };

  const handleSelectGeneratedScript = (script: { id: string; content: string }) => {
    setCustomScript(script.content);
    setSelectedScriptId(script.id);
    toast.success('Script selected');
  };

  const canProceed = !!selectedClientId;

  const handleContinue = () => {
    if (!canProceed) return;
    onComplete(customScript, selectedProjectId || 'default', selectedScriptId || 'custom', selectedClientId, offerDescription, undefined, adType, platform);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Step 1: Script & Configuration
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Client + Project */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Client</Label>
            <Select value={selectedClientId} onValueChange={(v) => { setSelectedClientId(v); setSelectedProjectId(''); setSelectedScriptId(''); setGeneratedScripts([]); }}>
              <SelectTrigger><SelectValue placeholder="Select a client" /></SelectTrigger>
              <SelectContent>{clients.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          {selectedClientId && (
            <div className="space-y-2">
              <Label>Project</Label>
              <Select value={selectedProjectId} onValueChange={setSelectedProjectId}>
                <SelectTrigger><SelectValue placeholder="Select a project" /></SelectTrigger>
                <SelectContent>{projects.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          )}
        </div>

        {/* Video Ad Type */}
        <div className="space-y-2">
          <Label>Video Ad Type</Label>
          <div className="flex flex-wrap gap-2">
            {AD_TYPES.map(t => (
              <Button
                key={t.id}
                size="sm"
                variant={adType === t.id ? 'default' : 'outline'}
                onClick={() => setAdType(t.id)}
                className="gap-1.5"
              >
                {adType === t.id && <Check className="h-3 w-3" />}
                {t.label}
              </Button>
            ))}
          </div>
          <p className="text-xs text-muted-foreground">{AD_TYPES.find(t => t.id === adType)?.desc}</p>
        </div>

        {/* Platform */}
        <div className="space-y-2">
          <Label>Platform</Label>
          <div className="flex flex-wrap gap-2">
            {PLATFORMS.map(p => (
              <Button
                key={p.id}
                size="sm"
                variant={platform === p.id ? 'default' : 'outline'}
                onClick={() => setPlatform(p.id)}
                className="gap-1.5"
              >
                {platform === p.id && <Check className="h-3 w-3" />}
                {p.label}
              </Button>
            ))}
          </div>
        </div>

        {/* Instagram Import */}
        <IgImportSection
          onScriptImported={setCustomScript}
          onPlatformChange={setPlatform}
          clientOffer={offerDescription}
          clientId={selectedClientId}
        />

        {/* Script Input */}
        <div className="space-y-3">
          <Label>Script</Label>
          <Textarea
            value={customScript}
            onChange={(e) => setCustomScript(e.target.value)}
            placeholder="Paste or write your video script here, or import from Instagram above..."
            rows={8}
            className="font-mono text-sm"
          />
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleGenerateScripts}
              disabled={isGeneratingScript || !selectedClientId}
              className="gap-2"
            >
              {isGeneratingScript ? <><Loader2 className="h-4 w-4 animate-spin" />Generating...</> : <><Wand2 className="h-4 w-4" />Auto-Generate Script</>}
            </Button>
            {!selectedClientId && (
              <span className="text-xs text-muted-foreground">Select a client first</span>
            )}
          </div>
        </div>

        {/* Generated Scripts */}
        {generatedScripts.length > 0 && (
          <div className="space-y-3">
            <Label>Generated Scripts — click to use</Label>
            <ScrollArea className="h-48">
              <div className="space-y-2 pr-4">
                {generatedScripts.map(script => (
                  <button key={script.id} onClick={() => handleSelectGeneratedScript(script)}
                    className={cn('w-full p-3 rounded-lg border text-left transition-all', customScript === script.content ? 'border-primary bg-primary/5' : 'border-border hover:border-muted-foreground/50')}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium text-sm">{script.title}</span>
                      <Badge variant="secondary" className="text-xs">{script.framework}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-2">{script.content}</p>
                  </button>
                ))}
              </div>
            </ScrollArea>
          </div>
        )}

        {/* Existing Scripts (if project selected) */}
        {selectedProjectId && scripts.length > 0 && (
          <div className="space-y-2">
            <Label>Or load from existing scripts</Label>
            <Select value={selectedScriptId} onValueChange={(id) => { setSelectedScriptId(id); const s = scripts.find(x => x.id === id); if (s) setCustomScript(s.content); }}>
              <SelectTrigger><SelectValue placeholder="Select a saved script" /></SelectTrigger>
              <SelectContent>{scripts.map(s => <SelectItem key={s.id} value={s.id}>{s.title}</SelectItem>)}</SelectContent>
            </Select>
          </div>
        )}

        <div className="flex justify-end pt-4">
          <Button onClick={handleContinue} disabled={!canProceed || isProcessing} className="gap-2">
            {isProcessing ? <><Loader2 className="h-4 w-4 animate-spin" />Segmenting...</> : <>Continue<ArrowRight className="h-4 w-4" /></>}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
