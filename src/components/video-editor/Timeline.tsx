import { useRef, useCallback, useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import type { VideoClip, Caption, TextOverlay, TransitionType } from '@/hooks/useVideoEditor';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';
import { Magnet, Layers, ZoomIn, ZoomOut, Lock, Unlock, Copy, Scissors, Trash2 } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface TimelineProps {
  clips: VideoClip[];
  captions: Caption[];
  textOverlays?: TextOverlay[];
  currentTime: number;
  totalDuration: number;
  selectedClipId: string | null;
  voiceoverBlobUrl: string | null;
  snapEnabled?: boolean;
  rippleEnabled?: boolean;
  onSeek: (time: number) => void;
  onSelectClip: (id: string | null) => void;
  onDuplicateClip?: (id: string) => void;
  onSplitAtPlayhead?: () => void;
  onRemoveClip?: (id: string) => void;
  onToggleClipLock?: (id: string) => void;
  onToggleSnap?: () => void;
  onToggleRipple?: () => void;
  zoom: number;
  onZoomChange: (zoom: number) => void;
}

const TRANSITION_COLORS: Record<TransitionType, string> = {
  none: '',
  crossfade: 'bg-purple-500',
  dissolve: 'bg-indigo-500',
  'wipe-left': 'bg-cyan-500',
  'wipe-right': 'bg-cyan-500',
  'wipe-up': 'bg-cyan-500',
  'zoom-in': 'bg-amber-500',
  'zoom-out': 'bg-amber-500',
  'slide-left': 'bg-emerald-500',
  'slide-right': 'bg-emerald-500',
};

export function Timeline({
  clips,
  captions,
  textOverlays = [],
  currentTime,
  totalDuration,
  selectedClipId,
  voiceoverBlobUrl,
  snapEnabled = true,
  rippleEnabled = true,
  onSeek,
  onSelectClip,
  onDuplicateClip,
  onSplitAtPlayhead,
  onRemoveClip,
  onToggleClipLock,
  onToggleSnap,
  onToggleRipple,
  zoom,
  onZoomChange,
}: TimelineProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDraggingPlayhead, setIsDraggingPlayhead] = useState(false);
  const [hoveredClipId, setHoveredClipId] = useState<string | null>(null);

  const pixelsPerSecond = 80 * zoom;
  const timelineWidth = Math.max(totalDuration * pixelsPerSecond, 600);
  const playheadPosition = (currentTime / Math.max(totalDuration, 0.1)) * timelineWidth;
  const trackLabelWidth = 36;

  // Auto-scroll to keep playhead visible
  useEffect(() => {
    if (!containerRef.current || isDraggingPlayhead) return;
    const container = containerRef.current;
    const visibleStart = container.scrollLeft;
    const visibleEnd = visibleStart + container.clientWidth;
    const phPos = playheadPosition + trackLabelWidth;
    if (phPos < visibleStart + 40 || phPos > visibleEnd - 40) {
      container.scrollLeft = Math.max(0, phPos - container.clientWidth / 3);
    }
  }, [playheadPosition, isDraggingPlayhead]);

  const getTimeFromX = useCallback((clientX: number) => {
    if (!containerRef.current) return 0;
    const rect = containerRef.current.getBoundingClientRect();
    const x = clientX - rect.left + containerRef.current.scrollLeft - trackLabelWidth;
    return Math.max(0, Math.min((x / timelineWidth) * totalDuration, totalDuration));
  }, [timelineWidth, totalDuration]);

  const handleTimelineClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest('[data-clip]')) return;
    onSeek(getTimeFromX(e.clientX));
  }, [getTimeFromX, onSeek]);

  const handlePlayheadDragStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingPlayhead(true);
    const handleMove = (me: MouseEvent) => {
      onSeek(getTimeFromX(me.clientX));
    };
    const handleUp = () => {
      setIsDraggingPlayhead(false);
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleUp);
    };
    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleUp);
  }, [getTimeFromX, onSeek]);

  const formatTime = (t: number) => {
    const mins = Math.floor(t / 60);
    const secs = Math.floor(t % 60);
    const frames = Math.floor((t % 1) * 30);
    return `${mins}:${secs.toString().padStart(2, '0')}:${frames.toString().padStart(2, '0')}`;
  };

  const formatTimeShort = (t: number) => {
    const mins = Math.floor(t / 60);
    const secs = Math.floor(t % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Time ruler markers
  const markerInterval = zoom > 2 ? 0.5 : zoom > 1.5 ? 1 : zoom > 0.8 ? 2 : 5;
  const markers: number[] = [];
  for (let t = 0; t <= totalDuration; t += markerInterval) {
    markers.push(t);
  }
  // Sub-markers
  const subInterval = markerInterval / 4;
  const subMarkers: number[] = [];
  if (zoom > 1) {
    for (let t = 0; t <= totalDuration; t += subInterval) {
      if (!markers.includes(t)) subMarkers.push(t);
    }
  }

  const selectedClip = clips.find(c => c.id === selectedClipId);

  return (
    <div className="border-t border-border/50 bg-[hsl(var(--card))] flex flex-col">
      {/* Toolbar */}
      <div className="flex items-center gap-1 px-3 py-1.5 border-b border-border/50 bg-muted/20">
        {/* Playhead time */}
        <span className="text-[10px] font-mono text-primary font-semibold mr-2 min-w-[70px]">
          {formatTime(currentTime)}
        </span>

        <div className="h-4 w-px bg-border/50 mx-1" />

        {/* Snap / Ripple toggles */}
        <TooltipProvider delayDuration={200}>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant={snapEnabled ? 'secondary' : 'ghost'}
                size="icon"
                className="h-6 w-6"
                onClick={onToggleSnap}
              >
                <Magnet className="h-3 w-3" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top"><p className="text-xs">Magnetic Snap {snapEnabled ? 'ON' : 'OFF'}</p></TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant={rippleEnabled ? 'secondary' : 'ghost'}
                size="icon"
                className="h-6 w-6"
                onClick={onToggleRipple}
              >
                <Layers className="h-3 w-3" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top"><p className="text-xs">Ripple Edit {rippleEnabled ? 'ON' : 'OFF'}</p></TooltipContent>
          </Tooltip>
        </TooltipProvider>

        <div className="h-4 w-px bg-border/50 mx-1" />

        {/* Clip actions */}
        {selectedClipId && (
          <>
            <TooltipProvider delayDuration={200}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onSplitAtPlayhead}>
                    <Scissors className="h-3 w-3" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="top"><p className="text-xs">Split at Playhead (S)</p></TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => onDuplicateClip?.(selectedClipId)}>
                    <Copy className="h-3 w-3" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="top"><p className="text-xs">Duplicate Clip</p></TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => onToggleClipLock?.(selectedClipId)}>
                    {selectedClip?.locked ? <Lock className="h-3 w-3" /> : <Unlock className="h-3 w-3" />}
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="top"><p className="text-xs">{selectedClip?.locked ? 'Unlock' : 'Lock'} Clip</p></TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive hover:text-destructive" onClick={() => onRemoveClip?.(selectedClipId)}>
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="top"><p className="text-xs">Delete Clip</p></TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <div className="h-4 w-px bg-border/50 mx-1" />
          </>
        )}

        {/* Speed badge */}
        {selectedClip && selectedClip.speed !== 1 && (
          <span className="text-[9px] font-mono bg-amber-500/20 text-amber-400 px-1.5 py-0.5 rounded">
            {selectedClip.speed}x
          </span>
        )}

        <div className="flex-1" />

        {/* Zoom controls */}
        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => onZoomChange(Math.max(0.3, zoom - 0.2))}>
          <ZoomOut className="h-3 w-3" />
        </Button>
        <Slider
          value={[zoom]}
          onValueChange={([v]) => onZoomChange(v)}
          min={0.3}
          max={4}
          step={0.1}
          className="w-24"
        />
        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => onZoomChange(Math.min(4, zoom + 0.2))}>
          <ZoomIn className="h-3 w-3" />
        </Button>
        <span className="text-[9px] text-muted-foreground font-mono w-8 text-right">{zoom.toFixed(1)}x</span>
      </div>

      {/* Timeline tracks */}
      <div ref={containerRef} className="overflow-x-auto overflow-y-hidden relative flex-1" style={{ minHeight: 160 }}>
        <div className="relative" style={{ width: timelineWidth + trackLabelWidth, minHeight: 160 }} onClick={handleTimelineClick}>
          {/* Time ruler */}
          <div className="h-5 relative border-b border-border/30" style={{ marginLeft: trackLabelWidth }}>
            {subMarkers.map(t => (
              <div
                key={`sub-${t}`}
                className="absolute top-0 w-px h-1.5 bg-muted-foreground/15"
                style={{ left: (t / Math.max(totalDuration, 0.1)) * timelineWidth }}
              />
            ))}
            {markers.map(t => (
              <div
                key={t}
                className="absolute top-0 flex flex-col items-center"
                style={{ left: (t / Math.max(totalDuration, 0.1)) * timelineWidth }}
              >
                <div className="w-px h-2.5 bg-muted-foreground/30" />
                <span className="text-[8px] text-muted-foreground/60 font-mono -translate-x-1/2">{formatTimeShort(t)}</span>
              </div>
            ))}
          </div>

          {/* VIDEO TRACK */}
          <div className="relative flex" style={{ height: 44 }}>
            <div className="w-9 shrink-0 flex items-center justify-center text-[8px] font-semibold uppercase tracking-wider text-muted-foreground/60 bg-muted/10 border-r border-border/20">
              V1
            </div>
            <div className="relative flex-1 border-b border-border/20">
              {clips.map((clip, idx) => {
                const effectiveDuration = (clip.trimEnd - clip.trimStart) / (clip.speed || 1);
                const left = (clip.startTime / Math.max(totalDuration, 0.1)) * timelineWidth;
                const width = (effectiveDuration / Math.max(totalDuration, 0.1)) * timelineWidth;
                const isSelected = selectedClipId === clip.id;
                const isHovered = hoveredClipId === clip.id;

                return (
                  <div key={clip.id} data-clip>
                    {/* Transition indicator */}
                    {clip.transition !== 'none' && idx > 0 && (
                      <div
                        className="absolute top-1 z-10"
                        style={{ left: left - 6, width: 12 }}
                      >
                        <div className={cn('w-3 h-3 rounded-full mx-auto', TRANSITION_COLORS[clip.transition])} title={`Transition: ${clip.transition}`} />
                      </div>
                    )}

                    {/* Clip block */}
                    <div
                      className={cn(
                        'absolute top-1 bottom-1 rounded-md cursor-pointer border-[1.5px] transition-all group overflow-hidden',
                        isSelected
                          ? 'border-primary bg-primary/20 ring-1 ring-primary/30 shadow-lg shadow-primary/10'
                          : isHovered
                          ? 'border-primary/50 bg-primary/15'
                          : 'border-primary/20 bg-primary/8 hover:border-primary/40',
                        clip.locked && 'opacity-60 cursor-not-allowed'
                      )}
                      style={{ left, width: Math.max(width, 8) }}
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectClip(clip.id);
                      }}
                      onMouseEnter={() => setHoveredClipId(clip.id)}
                      onMouseLeave={() => setHoveredClipId(null)}
                    >
                      {/* Waveform visualization (simulated) */}
                      <div className="absolute inset-0 flex items-end px-0.5 opacity-30">
                        {Array.from({ length: Math.max(Math.floor(width / 3), 2) }, (_, i) => (
                          <div
                            key={i}
                            className="flex-1 bg-primary/60 rounded-t-sm mx-px"
                            style={{ height: `${20 + Math.sin(i * 0.7 + clip.order) * 30 + Math.random() * 20}%` }}
                          />
                        ))}
                      </div>

                      {/* Clip label */}
                      <div className="relative z-10 px-1.5 py-0.5 flex items-center gap-1">
                        {clip.locked && <Lock className="h-2 w-2 text-muted-foreground" />}
                        <span className="text-[9px] font-medium text-foreground truncate">
                          {clip.label || `Clip ${clip.order + 1}`}
                        </span>
                        {clip.speed !== 1 && (
                          <span className="text-[7px] bg-amber-500/30 text-amber-300 px-1 rounded-sm font-mono">
                            {clip.speed}x
                          </span>
                        )}
                      </div>

                      {/* Trim handles (visible on hover/select) */}
                      {(isSelected || isHovered) && !clip.locked && (
                        <>
                          <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary/60 cursor-col-resize rounded-l-md hover:bg-primary" />
                          <div className="absolute right-0 top-0 bottom-0 w-1 bg-primary/60 cursor-col-resize rounded-r-md hover:bg-primary" />
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* AUDIO TRACK */}
          <div className="relative flex" style={{ height: 32 }}>
            <div className="w-9 shrink-0 flex items-center justify-center text-[8px] font-semibold uppercase tracking-wider text-muted-foreground/60 bg-muted/10 border-r border-border/20">
              A1
            </div>
            <div className="relative flex-1 border-b border-border/20">
              {/* Original audio from clips */}
              {clips.map((clip) => {
                const effectiveDuration = (clip.trimEnd - clip.trimStart) / (clip.speed || 1);
                const left = (clip.startTime / Math.max(totalDuration, 0.1)) * timelineWidth;
                const width = (effectiveDuration / Math.max(totalDuration, 0.1)) * timelineWidth;
                return (
                  <div
                    key={clip.id}
                    className="absolute top-1 bottom-1 rounded-sm bg-blue-500/15 border border-blue-500/20"
                    style={{ left, width: Math.max(width, 4), opacity: clip.volume }}
                  >
                    {/* Mini waveform */}
                    <div className="flex items-center h-full px-0.5 gap-px">
                      {Array.from({ length: Math.max(Math.floor(width / 4), 1) }, (_, i) => (
                        <div
                          key={i}
                          className="flex-1 bg-blue-400/40 rounded-sm"
                          style={{ height: `${15 + Math.sin(i * 1.2 + clip.order * 3) * 35 + Math.random() * 25}%` }}
                        />
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* VOICEOVER TRACK */}
          <div className="relative flex" style={{ height: 28 }}>
            <div className="w-9 shrink-0 flex items-center justify-center text-[8px] font-semibold uppercase tracking-wider text-muted-foreground/60 bg-muted/10 border-r border-border/20">
              VO
            </div>
            <div className="relative flex-1 border-b border-border/20">
              {voiceoverBlobUrl && (
                <div
                  className="absolute top-0.5 bottom-0.5 rounded-sm bg-emerald-500/15 border border-emerald-500/25"
                  style={{ left: 0, width: timelineWidth }}
                >
                  <div className="flex items-center h-full px-1 gap-px">
                    {Array.from({ length: Math.min(Math.floor(timelineWidth / 4), 80) }, (_, i) => (
                      <div
                        key={i}
                        className="flex-1 bg-emerald-400/40 rounded-sm"
                        style={{ height: `${20 + Math.sin(i * 0.8) * 40 + Math.random() * 20}%` }}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* CAPTION TRACK */}
          <div className="relative flex" style={{ height: 28 }}>
            <div className="w-9 shrink-0 flex items-center justify-center text-[8px] font-semibold uppercase tracking-wider text-muted-foreground/60 bg-muted/10 border-r border-border/20">
              CC
            </div>
            <div className="relative flex-1 border-b border-border/20">
              {captions.map(cap => {
                const left = (cap.startTime / Math.max(totalDuration, 0.1)) * timelineWidth;
                const width = ((cap.endTime - cap.startTime) / Math.max(totalDuration, 0.1)) * timelineWidth;
                const isActive = currentTime >= cap.startTime && currentTime < cap.endTime;
                return (
                  <div
                    key={cap.id}
                    className={cn(
                      'absolute top-0.5 bottom-0.5 rounded-sm border',
                      isActive
                        ? 'bg-yellow-500/25 border-yellow-500/50'
                        : 'bg-yellow-500/10 border-yellow-500/20'
                    )}
                    style={{ left, width: Math.max(width, 4) }}
                  >
                    <span className="text-[7px] text-yellow-300/80 px-0.5 truncate block leading-tight mt-0.5">{cap.text}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* TEXT OVERLAY TRACK */}
          {textOverlays.length > 0 && (
            <div className="relative flex" style={{ height: 24 }}>
              <div className="w-9 shrink-0 flex items-center justify-center text-[8px] font-semibold uppercase tracking-wider text-muted-foreground/60 bg-muted/10 border-r border-border/20">
                TXT
              </div>
              <div className="relative flex-1 border-b border-border/20">
                {textOverlays.map(overlay => {
                  const left = (overlay.startTime / Math.max(totalDuration, 0.1)) * timelineWidth;
                  const width = ((overlay.endTime - overlay.startTime) / Math.max(totalDuration, 0.1)) * timelineWidth;
                  return (
                    <div
                      key={overlay.id}
                      className="absolute top-0.5 bottom-0.5 rounded-sm bg-pink-500/15 border border-pink-500/25"
                      style={{ left, width: Math.max(width, 4) }}
                    >
                      <span className="text-[7px] text-pink-300/80 px-0.5 truncate block">{overlay.text}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Playhead - spans all tracks */}
          <div
            className="absolute top-0 bottom-0 z-30 pointer-events-none"
            style={{ left: playheadPosition + trackLabelWidth }}
          >
            <div className="w-px h-full bg-red-500 shadow-[0_0_6px_rgba(239,68,68,0.5)]" />
          </div>
          {/* Playhead grab handle */}
          <div
            className="absolute top-0 z-40 cursor-grab active:cursor-grabbing"
            style={{ left: playheadPosition + trackLabelWidth - 5 }}
            onMouseDown={handlePlayheadDragStart}
          >
            <svg width="11" height="14" viewBox="0 0 11 14">
              <path d="M0 0H11L5.5 14Z" fill="hsl(var(--destructive))" />
            </svg>
          </div>
        </div>
      </div>

      {/* Mini-map */}
      {totalDuration > 0 && (
        <div className="h-2.5 bg-muted/30 border-t border-border/20 relative cursor-pointer" onClick={(e) => {
          const rect = e.currentTarget.getBoundingClientRect();
          const x = e.clientX - rect.left;
          onSeek((x / rect.width) * totalDuration);
        }}>
          {/* Clip indicators */}
          {clips.map(clip => {
            const effectiveDuration = (clip.trimEnd - clip.trimStart) / (clip.speed || 1);
            const left = `${(clip.startTime / totalDuration) * 100}%`;
            const width = `${(effectiveDuration / totalDuration) * 100}%`;
            return (
              <div
                key={clip.id}
                className="absolute top-0 bottom-0 bg-primary/20"
                style={{ left, width }}
              />
            );
          })}
          {/* Current position */}
          <div
            className="absolute top-0 bottom-0 w-0.5 bg-red-500"
            style={{ left: `${(currentTime / totalDuration) * 100}%` }}
          />
          {/* Visible region indicator */}
          <div
            className="absolute top-0 bottom-0 border border-foreground/20 rounded-sm bg-foreground/5"
            style={{
              left: `${((containerRef.current?.scrollLeft || 0) / (timelineWidth + trackLabelWidth)) * 100}%`,
              width: `${((containerRef.current?.clientWidth || 200) / (timelineWidth + trackLabelWidth)) * 100}%`,
            }}
          />
        </div>
      )}
    </div>
  );
}
