import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { X, Loader2, CheckCircle, XCircle, Clock, Video } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { BatchVideoScene } from '@/types/batch-video';

interface GenerationQueuePanelProps {
  scenes: BatchVideoScene[];
  onClose: () => void;
}

const AVG_GENERATION_SECONDS: Record<string, number> = {
  pending: 0,
  queued: 120,
  image_generating: 30,
  image_completed: 0,
  video_generating: 90,
  video_completed: 0,
  failed: 0,
};

export function GenerationQueuePanel({ scenes, onClose }: GenerationQueuePanelProps) {
  const generating = scenes.filter(s => s.status === 'video_generating' || s.status === 'image_generating');
  const queued = scenes.filter(s => s.status === 'queued' || s.status === 'pending');
  const completed = scenes.filter(s => s.status === 'video_completed');
  const failed = scenes.filter(s => s.status === 'failed');

  const estimatedRemaining = [...generating, ...queued].reduce(
    (sum, s) => sum + (AVG_GENERATION_SECONDS[s.status] || 60), 0
  );
  const estMinutes = Math.ceil(estimatedRemaining / 60);

  const getStatusIcon = (status: BatchVideoScene['status']) => {
    switch (status) {
      case 'video_completed':
      case 'image_completed':
        return <CheckCircle className="h-3.5 w-3.5 text-primary" />;
      case 'failed':
        return <XCircle className="h-3.5 w-3.5 text-destructive" />;
      case 'video_generating':
      case 'image_generating':
        return <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />;
      case 'queued':
        return <Clock className="h-3.5 w-3.5 text-amber-500" />;
      default:
        return <Clock className="h-3.5 w-3.5 text-muted-foreground" />;
    }
  };

  const getStatusLabel = (status: BatchVideoScene['status']) => {
    const map: Record<string, string> = {
      pending: 'Pending',
      queued: 'Queued',
      image_generating: 'Generating Image',
      image_completed: 'Image Ready',
      video_generating: 'Rendering Video',
      video_completed: 'Complete',
      failed: 'Failed',
    };
    return map[status] || status;
  };

  return (
    <Card className="w-72 shrink-0 h-fit sticky top-6">
      <CardHeader className="py-3 px-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            <Video className="h-4 w-4" />
            Generation Queue
          </CardTitle>
          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onClose}>
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="px-4 pb-4 space-y-3">
        {/* Summary */}
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="p-2 bg-muted rounded-lg">
            <p className="text-sm font-bold text-primary">{completed.length}</p>
            <p className="text-[9px] text-muted-foreground">Done</p>
          </div>
          <div className="p-2 bg-muted rounded-lg">
            <p className="text-sm font-bold">{generating.length}</p>
            <p className="text-[9px] text-muted-foreground">Active</p>
          </div>
          <div className="p-2 bg-muted rounded-lg">
            <p className="text-sm font-bold">{queued.length}</p>
            <p className="text-[9px] text-muted-foreground">Queued</p>
          </div>
        </div>

        {(generating.length > 0 || queued.length > 0) && (
          <div className="flex items-center gap-2 px-2 py-1.5 bg-primary/5 rounded-lg">
            <Loader2 className="h-3 w-3 animate-spin text-primary shrink-0" />
            <span className="text-[10px] text-muted-foreground">
              ~{estMinutes} min remaining
            </span>
          </div>
        )}

        {/* Scene list */}
        <ScrollArea className="h-[350px]">
          <div className="space-y-1.5 pr-2">
            {scenes.map((scene) => (
              <div
                key={scene.id}
                className={cn(
                  'flex items-center gap-2 px-2 py-1.5 rounded-md text-xs transition-colors',
                  scene.status === 'video_generating' && 'bg-primary/5 animate-pulse',
                  scene.status === 'video_completed' && 'bg-muted/50',
                  scene.status === 'failed' && 'bg-destructive/5',
                )}
              >
                {getStatusIcon(scene.status)}
                <span className="font-medium">Scene {scene.order}</span>
                <span className="ml-auto text-[10px] text-muted-foreground">
                  {getStatusLabel(scene.status)}
                </span>
              </div>
            ))}
          </div>
        </ScrollArea>

        {failed.length > 0 && (
          <Badge variant="destructive" className="w-full justify-center text-xs">
            {failed.length} failed
          </Badge>
        )}
      </CardContent>
    </Card>
  );
}
