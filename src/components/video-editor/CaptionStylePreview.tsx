import { useRef, useEffect } from 'react';
import type { CaptionStyleType } from '@/hooks/useVideoEditor';
import { renderCaptions } from './CaptionRenderer';

interface CaptionStylePreviewProps {
  style: CaptionStyleType;
  width?: number;
  height?: number;
}

const PREVIEW_CAPTION = {
  id: '__preview__',
  text: 'Hello world',
  startTime: 0,
  endTime: 3,
  words: [
    { word: 'Hello', startTime: 0, endTime: 1.5 },
    { word: 'world', startTime: 1.5, endTime: 3 },
  ],
};

export function CaptionStylePreview({ style, width = 120, height = 40 }: CaptionStylePreviewProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (style === 'none') return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let rafId: number;
    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      // Dark bg
      ctx.fillStyle = '#111';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const t = (Date.now() / 1000) % 3;
      renderCaptions({
        ctx,
        caption: PREVIEW_CAPTION,
        currentTime: t,
        width: canvas.width,
        height: canvas.height,
        style,
        fontSize: 11,
        color: '#ffffff',
        fontFamily: 'Inter',
        position: 'center',
        showStroke: false,
        showBackground: style === 'minimal' || style === 'classic',
      });
      rafId = requestAnimationFrame(draw);
    };
    rafId = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(rafId);
  }, [style]);

  if (style === 'none') {
    return (
      <div
        className="rounded bg-gray-900 flex items-center justify-center"
        style={{ width, height }}
      >
        <span className="text-[8px] text-gray-600">Off</span>
      </div>
    );
  }

  return (
    <canvas
      ref={canvasRef}
      width={width * 2}
      height={height * 2}
      className="rounded"
      style={{ width, height }}
    />
  );
}
