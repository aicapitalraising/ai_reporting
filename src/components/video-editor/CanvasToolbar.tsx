import { Button } from '@/components/ui/button';
import { Scissors, ArrowRightToLine, VolumeX, Volume2, Type, Music, Gauge } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface CanvasToolbarProps {
  hasSelectedClip: boolean;
  clipMuted?: boolean;
  clipSpeed?: number;
  onSplit: () => void;
  onTrim: () => void;
  onToggleMute: () => void;
  onAddText: () => void;
  onAddAudio: () => void;
  onSetSpeed: (speed: number) => void;
}

const speeds = [0.25, 0.5, 0.75, 1, 1.5, 2, 3, 4];

export function CanvasToolbar({
  hasSelectedClip,
  clipMuted,
  clipSpeed = 1,
  onSplit,
  onTrim,
  onToggleMute,
  onAddText,
  onAddAudio,
  onSetSpeed,
}: CanvasToolbarProps) {
  return (
    <div className="h-9 flex items-center gap-0.5 px-2 bg-[#111] border-b border-white/5 shrink-0">
      <ToolBtn icon={<Scissors className="h-3.5 w-3.5" />} label="Split" disabled={!hasSelectedClip} onClick={onSplit} shortcut="S" />
      <ToolBtn icon={<ArrowRightToLine className="h-3.5 w-3.5" />} label="Trim" disabled={!hasSelectedClip} onClick={onTrim} />
      <ToolBtn
        icon={clipMuted ? <VolumeX className="h-3.5 w-3.5" /> : <Volume2 className="h-3.5 w-3.5" />}
        label={clipMuted ? 'Unmute' : 'Mute'}
        disabled={!hasSelectedClip}
        onClick={onToggleMute}
      />

      <div className="h-4 w-px bg-white/10 mx-1" />

      <ToolBtn icon={<Type className="h-3.5 w-3.5" />} label="Add Text" onClick={onAddText} />
      <ToolBtn icon={<Music className="h-3.5 w-3.5" />} label="Add Audio" onClick={onAddAudio} />

      <div className="h-4 w-px bg-white/10 mx-1" />

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            disabled={!hasSelectedClip}
            className={cn(
              'h-7 px-2 gap-1.5 text-[11px] font-medium rounded-md',
              hasSelectedClip
                ? 'text-gray-300 hover:text-white hover:bg-white/10'
                : 'text-gray-600 cursor-not-allowed'
            )}
          >
            <Gauge className="h-3.5 w-3.5" />
            {clipSpeed !== 1 ? `${clipSpeed}x` : 'Speed'}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="min-w-[100px]">
          {speeds.map(s => (
            <DropdownMenuItem key={s} onClick={() => onSetSpeed(s)} className={cn(s === clipSpeed && 'font-bold text-primary')}>
              {s}x
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

function ToolBtn({ icon, label, disabled, onClick, shortcut }: {
  icon: React.ReactNode;
  label: string;
  disabled?: boolean;
  onClick: () => void;
  shortcut?: string;
}) {
  return (
    <Button
      variant="ghost"
      size="sm"
      disabled={disabled}
      onClick={onClick}
      className={cn(
        'h-7 px-2 gap-1.5 text-[11px] font-medium rounded-md',
        disabled
          ? 'text-gray-600 cursor-not-allowed'
          : 'text-gray-300 hover:text-white hover:bg-white/10'
      )}
      title={shortcut ? `${label} (${shortcut})` : label}
    >
      {icon}
      <span className="hidden sm:inline">{label}</span>
    </Button>
  );
}
