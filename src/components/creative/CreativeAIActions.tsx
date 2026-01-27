import { useState } from 'react';
import { Creative } from '@/hooks/useCreatives';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import ReactMarkdown from 'react-markdown';
import { 
  FileText, 
  Sparkles, 
  Loader2, 
  Video,
  CheckCircle,
  AlertCircle,
  Star
} from 'lucide-react';

interface CreativeAIActionsProps {
  creative: Creative;
}

export function CreativeAIActions({ creative }: CreativeAIActionsProps) {
  const [transcribing, setTranscribing] = useState(false);
  const [auditing, setAuditing] = useState(false);
  const [transcript, setTranscript] = useState<string | null>(null);
  const [audit, setAudit] = useState<string | null>(null);
  const [transcriptOpen, setTranscriptOpen] = useState(false);
  const [auditOpen, setAuditOpen] = useState(false);

  const handleTranscribe = async () => {
    if (!creative.file_url) {
      toast.error('No video file to transcribe');
      return;
    }

    setTranscribing(true);
    try {
      const { data, error } = await supabase.functions.invoke('creative-ai-audit', {
        body: { 
          action: 'transcribe',
          videoUrl: creative.file_url 
        }
      });

      if (error) throw error;

      if (data?.transcript) {
        setTranscript(data.transcript);
        setTranscriptOpen(true);
        toast.success('Video transcribed successfully');
      } else {
        throw new Error('No transcript returned');
      }
    } catch (error) {
      console.error('Transcription error:', error);
      toast.error('Failed to transcribe video');
    } finally {
      setTranscribing(false);
    }
  };

  const handleAudit = async () => {
    setAuditing(true);
    try {
      const { data, error } = await supabase.functions.invoke('creative-ai-audit', {
        body: { 
          action: 'audit',
          creative: {
            title: creative.title,
            type: creative.type,
            platform: creative.platform,
            headline: creative.headline,
            body_copy: creative.body_copy,
            cta_text: creative.cta_text,
            file_url: creative.file_url
          },
          transcript: transcript
        }
      });

      if (error) throw error;

      if (data?.audit) {
        setAudit(data.audit);
        setAuditOpen(true);
        toast.success('AI audit complete');
      } else {
        throw new Error('No audit returned');
      }
    } catch (error) {
      console.error('Audit error:', error);
      toast.error('Failed to run AI audit');
    } finally {
      setAuditing(false);
    }
  };

  // Extract score from audit text (looking for "Overall Score" pattern)
  const extractScore = (auditText: string): number | null => {
    const match = auditText.match(/Overall Score[:\s]*(\d+)/i);
    return match ? parseInt(match[1], 10) : null;
  };

  const score = audit ? extractScore(audit) : null;

  const getScoreColor = (s: number) => {
    if (s >= 8) return 'text-green-500';
    if (s >= 6) return 'text-amber-500';
    return 'text-red-500';
  };

  return (
    <>
      <div className="flex gap-2 flex-wrap">
        {creative.type === 'video' && (
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleTranscribe}
            disabled={transcribing}
            className="gap-2"
          >
            {transcribing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Video className="h-4 w-4" />
            )}
            {transcribing ? 'Transcribing...' : 'Transcribe Video'}
          </Button>
        )}

        <Button 
          variant="outline" 
          size="sm" 
          onClick={handleAudit}
          disabled={auditing}
          className="gap-2"
        >
          {auditing ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Sparkles className="h-4 w-4" />
          )}
          {auditing ? 'Analyzing...' : 'AI Audit'}
        </Button>

        {/* Quick indicators if we have results */}
        {transcript && (
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => setTranscriptOpen(true)}
            className="gap-1 text-green-600"
          >
            <CheckCircle className="h-4 w-4" />
            Transcript Ready
          </Button>
        )}

        {audit && score !== null && (
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => setAuditOpen(true)}
            className={`gap-1 ${getScoreColor(score)}`}
          >
            <Star className="h-4 w-4" />
            Score: {score}/10
          </Button>
        )}
      </div>

      {/* Transcript Modal */}
      <Dialog open={transcriptOpen} onOpenChange={setTranscriptOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Video Transcription
            </DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-[60vh]">
            <div className="prose prose-sm dark:prose-invert max-w-none pr-4">
              <ReactMarkdown>{transcript || ''}</ReactMarkdown>
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Audit Modal */}
      <Dialog open={auditOpen} onOpenChange={setAuditOpen}>
        <DialogContent className="max-w-3xl max-h-[85vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              AI Creative Audit
              {score !== null && (
                <Badge className={`ml-2 ${score >= 8 ? 'bg-green-100 text-green-800' : score >= 6 ? 'bg-amber-100 text-amber-800' : 'bg-red-100 text-red-800'}`}>
                  Score: {score}/10
                </Badge>
              )}
            </DialogTitle>
          </DialogHeader>
          
          <div className="flex items-center gap-4 py-2">
            <Badge variant="outline">{creative.platform}</Badge>
            <Badge variant="secondary">{creative.type}</Badge>
            <span className="text-sm text-muted-foreground">{creative.title}</span>
          </div>
          
          <Separator />
          
          <ScrollArea className="max-h-[55vh]">
            <div className="prose prose-sm dark:prose-invert max-w-none pr-4">
              <ReactMarkdown>{audit || ''}</ReactMarkdown>
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </>
  );
}
