import { Image, Video, MessageSquare, Film, Save, Play, Trash2, User, Layers, Wand2, Combine, AlignHorizontalSpaceBetween, Zap, Flame, Undo2, Redo2, Check, Loader2, Copy, Scissors } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { FlowNodeType } from '@/types/flowboard';
import { cn } from '@/lib/utils';

interface FlowToolbarProps {
  onAddNode: (type: FlowNodeType) => void;
  onSave: () => void;
  onRunFlow: () => void;
  onClear: () => void;
  onOpenScriptToFlow?: () => void;
  onOpenViralAd?: () => void;
  onAutoAlign?: () => void;
  onUndo?: () => void;
  onRedo?: () => void;
  onDuplicate?: () => void;
  onSendToEditor?: () => void;
  canUndo?: boolean;
  canRedo?: boolean;
  isSaving?: boolean;
  isRunning?: boolean;
  hasNodes?: boolean;
  hasSelection?: boolean;
  hasCompletedVideos?: boolean;
  saveStatus?: 'saved' | 'saving' | 'unsaved';
}

const NODE_BUTTONS = [
  { type: 'image-generator' as FlowNodeType, icon: Image, label: 'Image', color: 'text-purple-400' },
  { type: 'video-generator' as FlowNodeType, icon: Video, label: 'Video', color: 'text-blue-400' },
  { type: 'avatar-scene' as FlowNodeType, icon: User, label: 'Avatar', color: 'text-pink-400' },
  { type: 'image-combiner' as FlowNodeType, icon: Layers, label: 'Combiner', color: 'text-amber-400' },
  { type: 'scene-combiner' as FlowNodeType, icon: Combine, label: 'Stitch', color: 'text-cyan-400' },
  { type: 'prompt-generator' as FlowNodeType, icon: MessageSquare, label: 'Prompt', color: 'text-green-400' },
  { type: 'image-to-video' as FlowNodeType, icon: Film, label: 'I2V', color: 'text-orange-400' },
  { type: 'hooks' as FlowNodeType, icon: Zap, label: 'Hooks', color: 'text-yellow-400' },
];

export function FlowToolbar({
  onAddNode,
  onSave,
  onRunFlow,
  onClear,
  onOpenScriptToFlow,
  onOpenViralAd,
  onAutoAlign,
  onUndo,
  onRedo,
  onDuplicate,
  onSendToEditor,
  canUndo = false,
  canRedo = false,
  isSaving = false,
  isRunning = false,
  hasNodes = false,
  hasSelection = false,
  hasCompletedVideos = false,
  saveStatus = 'saved',
}: FlowToolbarProps) {
  return (
    <div className="flex items-center gap-2 p-3 bg-card border-b border-border flex-wrap">
      {/* Node creation buttons */}
      <div className="flex items-center gap-1 flex-wrap">
        {NODE_BUTTONS.map(({ type, icon: Icon, label, color }) => (
          <Button
            key={type}
            variant="outline"
            size="sm"
            onClick={() => onAddNode(type)}
            className="gap-1.5"
          >
            <Icon className={cn("h-4 w-4", color)} />
            <span className="hidden sm:inline">{label}</span>
          </Button>
        ))}
      </div>

      <Separator orientation="vertical" className="h-6 hidden sm:block" />

      {/* Auto-builders */}
      {onOpenScriptToFlow && (
        <Button variant="outline" size="sm" onClick={onOpenScriptToFlow} className="gap-1.5">
          <Wand2 className="h-4 w-4 text-primary" />
          <span className="hidden sm:inline">Auto-Build</span>
        </Button>
      )}
      {onOpenViralAd && (
        <Button variant="outline" size="sm" onClick={onOpenViralAd} className="gap-1.5">
          <Flame className="h-4 w-4 text-orange-400" />
          <span className="hidden sm:inline">Viral Ad</span>
        </Button>
      )}

      {/* Actions */}
      <div className="flex items-center gap-1 ml-auto flex-wrap">
        {/* Undo / Redo */}
        {onUndo && (
          <Button variant="ghost" size="icon" onClick={onUndo} disabled={!canUndo} title="Undo (Ctrl+Z)" className="h-8 w-8">
            <Undo2 className="h-4 w-4" />
          </Button>
        )}
        {onRedo && (
          <Button variant="ghost" size="icon" onClick={onRedo} disabled={!canRedo} title="Redo (Ctrl+Shift+Z)" className="h-8 w-8">
            <Redo2 className="h-4 w-4" />
          </Button>
        )}

        {/* Duplicate */}
        {hasSelection && onDuplicate && (
          <Button variant="outline" size="sm" onClick={onDuplicate} className="gap-1.5">
            <Copy className="h-4 w-4" />
            <span className="hidden sm:inline">Duplicate</span>
          </Button>
        )}

        {hasNodes && (
          <>
            {onAutoAlign && (
              <Button variant="outline" size="sm" onClick={onAutoAlign} className="gap-1.5">
                <AlignHorizontalSpaceBetween className="h-4 w-4" />
                <span className="hidden sm:inline">Auto Align</span>
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={onClear}
              className="gap-1.5 text-destructive hover:text-destructive"
            >
              <Trash2 className="h-4 w-4" />
              <span className="hidden sm:inline">Clear</span>
            </Button>
            <Button variant="outline" size="sm" onClick={onRunFlow} disabled={isRunning} className="gap-1.5">
              <Play className="h-4 w-4" />
              <span className="hidden sm:inline">{isRunning ? 'Running...' : 'Run Flow'}</span>
            </Button>
          </>
        )}

        {/* Send to Video Editor */}
        {hasCompletedVideos && onSendToEditor && (
          <Button variant="outline" size="sm" onClick={onSendToEditor} className="gap-1.5">
            <Scissors className="h-4 w-4 text-cyan-500" />
            <span className="hidden sm:inline">Video Editor</span>
          </Button>
        )}

        {/* Save with status indicator */}
        <Button variant="default" size="sm" onClick={onSave} disabled={isSaving} className="gap-1.5">
          {saveStatus === 'saving' ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : saveStatus === 'saved' ? (
            <Check className="h-4 w-4" />
          ) : (
            <Save className="h-4 w-4" />
          )}
          <span className="hidden sm:inline">
            {saveStatus === 'saving' ? 'Saving...' : saveStatus === 'saved' ? 'Saved' : 'Save'}
          </span>
        </Button>
      </div>
    </div>
  );
}
