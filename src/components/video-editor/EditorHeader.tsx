import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, Check, Loader2, Monitor, Smartphone, Square } from 'lucide-react';
import { cn } from '@/lib/utils';

interface EditorHeaderProps {
  projectName: string;
  aspectRatio: '16:9' | '9:16' | '1:1';
  saveStatus: 'saved' | 'saving' | 'unsaved';
  onBack: () => void;
  onRename: (name: string) => void;
  onAspectRatioChange: (ar: '16:9' | '9:16' | '1:1') => void;
  clientName?: string;
}

export function EditorHeader({
  projectName,
  aspectRatio,
  saveStatus,
  onBack,
  onRename,
  onAspectRatioChange,
  clientName,
}: EditorHeaderProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(projectName);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { setEditValue(projectName); }, [projectName]);

  const commit = () => {
    if (editValue.trim() && editValue.trim() !== projectName) {
      onRename(editValue.trim());
    }
    setIsEditing(false);
  };

  const arOptions: { value: '16:9' | '9:16' | '1:1'; label: string; icon: React.ReactNode }[] = [
    { value: '16:9', label: 'Landscape 16:9', icon: <Monitor className="h-3 w-3" /> },
    { value: '9:16', label: 'Portrait 9:16', icon: <Smartphone className="h-3 w-3" /> },
    { value: '1:1', label: 'Square 1:1', icon: <Square className="h-3 w-3" /> },
  ];

  return (
    <div className="h-11 flex items-center gap-2 px-3 border-b border-border/40 bg-card/80 backdrop-blur-sm shrink-0">
      {/* Back */}
      <Button variant="ghost" size="sm" className="gap-1.5 text-xs h-7 px-2" onClick={onBack}>
        <ArrowLeft className="h-3.5 w-3.5" /> Projects
      </Button>

      <div className="h-4 w-px bg-border/50" />

      {/* Project name */}
      {isEditing ? (
        <input
          ref={inputRef}
          value={editValue}
          onChange={e => setEditValue(e.target.value)}
          onBlur={commit}
          onKeyDown={e => e.key === 'Enter' && commit()}
          autoFocus
          className="text-sm font-semibold bg-transparent border-b border-primary outline-none px-1 py-0.5 text-foreground max-w-[200px]"
        />
      ) : (
        <button
          className="text-sm font-semibold text-foreground hover:text-primary transition-colors truncate max-w-[200px]"
          onClick={() => setIsEditing(true)}
        >
          {projectName}
        </button>
      )}

      {clientName && (
        <span className="text-[10px] text-muted-foreground bg-muted/30 px-1.5 py-0.5 rounded">
          {clientName}
        </span>
      )}

      <div className="flex-1" />

      {/* Aspect ratio selector */}
      <div className="flex items-center gap-0.5 bg-muted/30 rounded-md p-0.5">
        {arOptions.map(opt => (
          <Button
            key={opt.value}
            variant="ghost"
            size="sm"
            className={cn(
              'h-6 px-2 text-[10px] gap-1 rounded-sm',
              aspectRatio === opt.value && 'bg-primary/15 text-primary'
            )}
            onClick={() => onAspectRatioChange(opt.value)}
          >
            {opt.icon} {opt.value}
          </Button>
        ))}
      </div>

      <div className="h-4 w-px bg-border/50" />

      {/* Save status */}
      <div className="flex items-center gap-1.5 text-[10px] min-w-[60px]">
        {saveStatus === 'saving' && (
          <>
            <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
            <span className="text-muted-foreground">Saving...</span>
          </>
        )}
        {saveStatus === 'saved' && (
          <>
            <Check className="h-3 w-3 text-emerald-500" />
            <span className="text-emerald-500">Saved</span>
          </>
        )}
        {saveStatus === 'unsaved' && (
          <span className="text-amber-500">Unsaved</span>
        )}
      </div>
    </div>
  );
}
