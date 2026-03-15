import { useRef, useEffect, useCallback, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Play, Pause, SkipBack, SkipForward, Upload } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { VideoClip, Caption, CaptionStyleType, CaptionPosition } from '@/hooks/useVideoEditor';
import { renderCaptions } from './CaptionRenderer';

interface VideoEditorCanvasProps {
  clips: VideoClip[];
  currentTime: number;
  isPlaying: boolean;
  captions: Caption[];
  captionStyle: CaptionStyleType;
  captionFontSize: number;
  captionColor: string;
  captionFontFamily: string;
  captionPosition: CaptionPosition;
  captionStroke: boolean;
  captionBackground: boolean;
  aspectRatio: '16:9' | '9:16' | '1:1';
  totalDuration: number;
  loadError: string | null;
  isLoading: boolean;
  onTimeUpdate: (time: number) => void;
  onTogglePlayPause: () => void;
  onSeek: (time: number) => void;
  onFileUpload: (file: File) => void;
  sourceUrl?: string;
}

const SAMPLE_CAPTION: Caption = {
  id: '__sample__',
  text: 'Sample caption preview',
  startTime: 0,
  endTime: 999,
  words: [
    { word: 'Sample', startTime: 0, endTime: 1 },
    { word: 'caption', startTime: 1, endTime: 2 },
    { word: 'preview', startTime: 2, endTime: 3 },
  ],
};

export function VideoEditorCanvas({
  clips,
  currentTime,
  isPlaying,
  captions,
  captionStyle,
  captionFontSize,
  captionColor,
  captionFontFamily,
  captionPosition,
  captionStroke,
  captionBackground,
  aspectRatio,
  totalDuration,
  loadError,
  isLoading,
  onTimeUpdate,
  onTogglePlayPause,
  onSeek,
  onFileUpload,
  sourceUrl,
}: VideoEditorCanvasProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animFrameRef = useRef<number>(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const getCurrentClip = useCallback((): { clip: VideoClip; localTime: number } | null => {
    let accumulated = 0;
    for (const clip of clips) {
      const effectiveDuration = clip.trimEnd - clip.trimStart;
      if (currentTime >= accumulated && currentTime < accumulated + effectiveDuration) {
        return { clip, localTime: clip.trimStart + (currentTime - accumulated) };
      }
      accumulated += effectiveDuration;
    }
    return null;
  }, [clips, currentTime]);

  useEffect(() => {
    const result = getCurrentClip();
    if (!result || !videoRef.current) return;
    const { clip, localTime } = result;
    if (videoRef.current.src !== clip.blobUrl) {
      videoRef.current.src = clip.blobUrl;
    }
    if (Math.abs(videoRef.current.currentTime - localTime) > 0.3) {
      videoRef.current.currentTime = localTime;
    }
  }, [currentTime, getCurrentClip]);

  useEffect(() => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.play().catch(() => {});
    } else {
      videoRef.current.pause();
    }
  }, [isPlaying]);

  const currentTimeRef = useRef(currentTime);
  currentTimeRef.current = currentTime;
  const totalDurationRef = useRef(totalDuration);
  totalDurationRef.current = totalDuration;

  useEffect(() => {
    if (!isPlaying) return;
    let lastTimestamp = performance.now();
    const tick = (timestamp: number) => {
      const delta = (timestamp - lastTimestamp) / 1000;
      lastTimestamp = timestamp;
      const newTime = Math.min(currentTimeRef.current + delta, totalDurationRef.current);
      onTimeUpdate(newTime);
      animFrameRef.current = requestAnimationFrame(tick);
    };
    animFrameRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animFrameRef.current);
  }, [isPlaying, onTimeUpdate]);

  useEffect(() => {
    if (currentTime >= totalDuration && isPlaying && totalDuration > 0) {
      onTogglePlayPause();
    }
  }, [currentTime, totalDuration, isPlaying, onTogglePlayPause]);

  // Draw captions on canvas overlay — ALWAYS, even with no video
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (captionStyle === 'none') return;

    // Find real caption at current time, or use sample
    const realCaption = captions.find(c => currentTime >= c.startTime && currentTime < c.endTime);
    const caption = realCaption || SAMPLE_CAPTION;
    // Use a cycling time for sample so preview animates
    const displayTime = realCaption ? currentTime : (Date.now() / 1000) % 3;

    renderCaptions({
      ctx,
      caption,
      currentTime: displayTime,
      width: canvas.width,
      height: canvas.height,
      style: captionStyle,
      fontSize: captionFontSize,
      color: captionColor,
      fontFamily: captionFontFamily,
      position: captionPosition,
      showStroke: captionStroke,
      showBackground: captionBackground,
    });
  }, [currentTime, captions, captionStyle, captionFontSize, captionColor, captionFontFamily, captionPosition, captionStroke, captionBackground]);

  // Animate sample caption when no real caption is active
  useEffect(() => {
    if (captionStyle === 'none') return;
    const hasRealCaption = captions.some(c => currentTime >= c.startTime && currentTime < c.endTime);
    if (hasRealCaption) return;

    // Animate the sample caption
    let rafId: number;
    const animate = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const displayTime = (Date.now() / 1000) % 3;
      renderCaptions({
        ctx,
        caption: SAMPLE_CAPTION,
        currentTime: displayTime,
        width: canvas.width,
        height: canvas.height,
        style: captionStyle,
        fontSize: captionFontSize,
        color: captionColor,
        fontFamily: captionFontFamily,
        position: captionPosition,
        showStroke: captionStroke,
        showBackground: captionBackground,
      });
      rafId = requestAnimationFrame(animate);
    };
    rafId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(rafId);
  }, [captionStyle, captionFontSize, captionColor, captionFontFamily, captionPosition, captionStroke, captionBackground, captions, currentTime]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) onFileUpload(file);
  };

  const formatTime = (t: number) => {
    const mins = Math.floor(t / 60);
    const secs = Math.floor(t % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const canvasWidth = aspectRatio === '9:16' ? 1080 : aspectRatio === '1:1' ? 1080 : 1920;
  const canvasHeight = aspectRatio === '9:16' ? 1920 : aspectRatio === '1:1' ? 1080 : 1080;

  // Use explicit width/height style for 9:16 to prevent collapse
  const containerStyle = useMemo((): React.CSSProperties => ({
    width: '100%',
    height: '100%',
  }), []);

  return (
    <div className="flex flex-col items-center gap-3 w-full h-full justify-center">
      <div
        className="relative bg-black rounded-lg overflow-hidden"
        style={containerStyle}
      >
        {clips.length > 0 ? (
          <>
            <video ref={videoRef} className="w-full h-full object-contain" playsInline muted={false} />
            <canvas
              ref={canvasRef}
              width={canvasWidth}
              height={canvasHeight}
              className="absolute inset-0 w-full h-full pointer-events-none"
            />
          </>
        ) : (
          <>
            {/* Empty state content */}
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 p-6 text-center z-10">
              {isLoading ? (
                <div className="text-gray-400 text-sm">Loading video...</div>
              ) : loadError ? (
                <div className="space-y-3 max-w-sm">
                  <p className="text-sm text-destructive">{loadError}</p>
                  {sourceUrl && (
                    <Button variant="outline" size="sm" asChild>
                      <a href={sourceUrl} download target="_blank" rel="noopener noreferrer">Download from source</a>
                    </Button>
                  )}
                  <Button variant="secondary" size="sm" onClick={() => fileInputRef.current?.click()} className="gap-2">
                    <Upload className="h-4 w-4" /> Upload video file
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="text-gray-500 text-sm">Upload a video to get started</p>
                  <Button variant="secondary" size="sm" onClick={() => fileInputRef.current?.click()} className="gap-2">
                    <Upload className="h-4 w-4" /> Upload video file
                  </Button>
                </div>
              )}
            </div>
            {/* Caption canvas overlay — shows even with no video */}
            <canvas
              ref={canvasRef}
              width={canvasWidth}
              height={canvasHeight}
              className="absolute inset-0 w-full h-full pointer-events-none z-20"
            />
          </>
        )}
      </div>

      {/* Playback Controls */}
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-400 hover:text-white" onClick={() => onSeek(0)}>
          <SkipBack className="h-4 w-4" />
        </Button>
        <Button variant="outline" size="icon" className="h-9 w-9 border-gray-700 text-gray-300 hover:text-white" onClick={onTogglePlayPause} disabled={clips.length === 0}>
          {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
        </Button>
        <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-400 hover:text-white" onClick={() => onSeek(totalDuration)}>
          <SkipForward className="h-4 w-4" />
        </Button>
        <span className="text-xs text-gray-500 font-mono ml-2">
          {formatTime(currentTime)} / {formatTime(totalDuration)}
        </span>
      </div>

      <div className="w-full">
        <input ref={fileInputRef} type="file" accept="video/*" onChange={handleFileChange} className="hidden" />
        <Button variant="ghost" size="sm" className="w-full text-xs text-gray-600 gap-2 hover:text-gray-400" onClick={() => fileInputRef.current?.click()}>
          <Upload className="h-3 w-3" /> or upload a video file
        </Button>
      </div>
    </div>
  );
}
