import { useState, useRef } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Play,
  Pause,
  RefreshCw,
  Sparkles,
  Loader2,
  Check,
  AlertCircle,
  Clock,
  Edit3,
  Save,
  X,
  Volume2,
  VolumeX,
  Maximize2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { StoryboardScene } from '@/types/video';

interface StoryboardViewProps {
  scenes: StoryboardScene[];
  onUpdateScene: (sceneId: string, updates: Partial<StoryboardScene>) => void;
  onGenerateScene: (scene: StoryboardScene) => void;
  generatingSceneId: string | null;
}

export function StoryboardView({
  scenes,
  onUpdateScene,
  onGenerateScene,
  generatingSceneId,
}: StoryboardViewProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Storyboard</h2>
        <Badge variant="secondary">{scenes.length} scenes × 8s each</Badge>
      </div>

      <div className="space-y-3">
        {scenes.map((scene, index) => (
          <SceneCard
            key={scene.id}
            scene={scene}
            sceneNumber={index + 1}
            onUpdate={(updates) => onUpdateScene(scene.id, updates)}
            onGenerate={() => onGenerateScene(scene)}
            isGenerating={generatingSceneId === scene.id}
            isDisabled={generatingSceneId !== null && generatingSceneId !== scene.id}
          />
        ))}
      </div>
    </div>
  );
}

interface SceneCardProps {
  scene: StoryboardScene;
  sceneNumber: number;
  onUpdate: (updates: Partial<StoryboardScene>) => void;
  onGenerate: () => void;
  isGenerating: boolean;
  isDisabled: boolean;
}

function SceneCard({
  scene,
  sceneNumber,
  onUpdate,
  onGenerate,
  isGenerating,
  isDisabled,
}: SceneCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedPrompt, setEditedPrompt] = useState(scene.prompt);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  const handleSaveEdit = () => {
    onUpdate({ prompt: editedPrompt });
    setIsEditing(false);
  };

  const handleCancelEdit = () => {
    setEditedPrompt(scene.prompt);
    setIsEditing(false);
  };

  const handlePlayPause = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const handleFullscreen = () => {
    if (videoRef.current?.requestFullscreen) {
      videoRef.current.requestFullscreen();
    }
  };

  const statusIcon = {
    pending: <Clock className="h-4 w-4 text-muted-foreground" />,
    generating: <Loader2 className="h-4 w-4 animate-spin text-primary" />,
    completed: <Check className="h-4 w-4 text-green-500" />,
    failed: <AlertCircle className="h-4 w-4 text-destructive" />,
  };

  const statusLabel = {
    pending: 'Ready',
    generating: 'Generating...',
    completed: 'Completed',
    failed: 'Failed',
  };

  return (
    <Card className={cn(
      'overflow-hidden transition-all',
      isGenerating && 'ring-2 ring-primary'
    )}>
      <CardContent className="p-0">
        <div className="flex">
          {/* Video Preview Area */}
          <div className="w-64 aspect-video bg-muted relative flex-shrink-0">
            {scene.videoUrl ? (
              <>
                <video
                  ref={videoRef}
                  src={scene.videoUrl}
                  className="w-full h-full object-cover"
                  loop
                  playsInline
                  muted={isMuted}
                  onPlay={() => setIsPlaying(true)}
                  onPause={() => setIsPlaying(false)}
                />
                {/* Video Controls */}
                <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/70 to-transparent">
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-white hover:text-white hover:bg-white/20"
                      onClick={handlePlayPause}
                    >
                      {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-white hover:text-white hover:bg-white/20"
                      onClick={() => setIsMuted(!isMuted)}
                    >
                      {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
                    </Button>
                    <div className="flex-1" />
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-white hover:text-white hover:bg-white/20"
                      onClick={handleFullscreen}
                    >
                      <Maximize2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </>
            ) : (
              <div className="absolute inset-0 flex items-center justify-center">
                {isGenerating ? (
                  <div className="text-center">
                    <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-2" />
                    <p className="text-xs text-muted-foreground">Generating...</p>
                  </div>
                ) : (
                  <div className="text-center p-4">
                    <div className="w-12 h-12 rounded-full bg-muted-foreground/10 flex items-center justify-center mx-auto mb-2">
                      <Play className="h-6 w-6 text-muted-foreground" />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Click Generate to create this scene
                    </p>
                  </div>
                )}
              </div>
            )}
            
            {/* Scene Number Badge */}
            <Badge 
              variant="secondary"
              className="absolute top-2 left-2"
            >
              Scene {sceneNumber}
            </Badge>
          </div>

          {/* Scene Details */}
          <div className="flex-1 p-4 space-y-3">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {statusIcon[scene.status]}
                <span className="text-sm font-medium">{statusLabel[scene.status]}</span>
              </div>
              <Badge variant="outline" className="gap-1">
                <Clock className="h-3 w-3" />
                {scene.duration}s
              </Badge>
            </div>

            {/* Prompt */}
            {isEditing ? (
              <div className="space-y-2">
                <Textarea
                  value={editedPrompt}
                  onChange={(e) => setEditedPrompt(e.target.value)}
                  rows={3}
                  className="text-sm"
                  autoFocus
                />
                <div className="flex gap-2">
                  <Button size="sm" onClick={handleSaveEdit} className="gap-1">
                    <Save className="h-3 w-3" />
                    Save
                  </Button>
                  <Button size="sm" variant="ghost" onClick={handleCancelEdit}>
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            ) : (
              <div className="group relative">
                <p className="text-sm text-muted-foreground line-clamp-3">
                  {scene.prompt}
                </p>
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute -right-2 -top-1 h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={() => setIsEditing(true)}
                >
                  <Edit3 className="h-3 w-3" />
                </Button>
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center gap-2">
              {scene.status === 'completed' ? (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={onGenerate}
                  disabled={isDisabled}
                  className="gap-1"
                >
                  <RefreshCw className="h-3 w-3" />
                  Regenerate
                </Button>
              ) : (
                <Button
                  size="sm"
                  onClick={onGenerate}
                  disabled={isGenerating || isDisabled}
                  className="gap-1"
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="h-3 w-3 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-3 w-3" />
                      Generate
                    </>
                  )}
                </Button>
              )}
            </div>

            {/* Progress for generating */}
            {isGenerating && (
              <div className="space-y-1">
                <Progress value={undefined} className="h-1" />
                <p className="text-xs text-muted-foreground">
                  Video generation typically takes 1-3 minutes...
                </p>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
