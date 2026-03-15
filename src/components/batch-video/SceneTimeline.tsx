import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Check, Clock, AlertCircle, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { BatchVideoScene } from '@/types/batch-video';

interface SceneTimelineProps {
  scenes: BatchVideoScene[];
  onSceneClick?: (sceneId: string) => void;
}

export function SceneTimeline({ scenes, onSceneClick }: SceneTimelineProps) {
  const totalDuration = scenes.reduce((sum, s) => sum + (s.segment.duration || 8), 0);
  const completedCount = scenes.filter(s => s.status === 'video_completed').length;

  return (
    <div className="border rounded-lg p-4 bg-card space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium">Timeline Preview</h3>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="gap-1">
            <Clock className="h-3 w-3" />
            {totalDuration}s total
          </Badge>
          <Badge variant="secondary">
            {completedCount}/{scenes.length} complete
          </Badge>
        </div>
      </div>

      <ScrollArea className="w-full">
        <div className="flex gap-2 pb-2">
          {scenes.map((scene, index) => {
            const imageUrl = scene.generatedImageUrl || scene.avatarImageUrl;
            const isCompleted = scene.status === 'video_completed';
            const isFailed = scene.status === 'failed';
            const isGenerating = scene.status === 'video_generating' || scene.status === 'image_generating';

            return (
              <button
                key={scene.id}
                onClick={() => onSceneClick?.(scene.id)}
                className={cn(
                  'flex-shrink-0 w-28 rounded-lg overflow-hidden border-2 transition-all hover:ring-2 hover:ring-primary/50',
                  isCompleted && 'border-primary',
                  isFailed && 'border-destructive',
                  !isCompleted && !isFailed && 'border-border'
                )}
              >
                <div className="aspect-video bg-muted relative">
                  {imageUrl ? (
                    <img src={imageUrl} alt={`Scene ${index + 1}`} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <span className="text-xs text-muted-foreground">{index + 1}</span>
                    </div>
                  )}
                  <div className="absolute top-1 left-1">
                    <Badge variant="secondary" className="text-[10px] px-1 py-0">
                      {index + 1}
                    </Badge>
                  </div>
                  <div className="absolute top-1 right-1">
                    {isCompleted && <Check className="h-3 w-3 text-primary" />}
                    {isFailed && <AlertCircle className="h-3 w-3 text-destructive" />}
                    {isGenerating && <Loader2 className="h-3 w-3 animate-spin text-primary" />}
                  </div>
                </div>
                <div className="px-1 py-0.5">
                  <p className="text-[10px] text-muted-foreground truncate">
                    {scene.segment.duration}s
                  </p>
                </div>
              </button>
            );
          })}
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>
    </div>
  );
}
