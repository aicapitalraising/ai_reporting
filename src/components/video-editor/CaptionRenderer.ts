import type { Caption, CaptionStyleType, CaptionPosition, CaptionWord } from '@/hooks/useVideoEditor';

interface RenderOptions {
  ctx: CanvasRenderingContext2D;
  caption: Caption;
  currentTime: number;
  width: number;
  height: number;
  style: CaptionStyleType;
  fontSize: number;
  color: string;
  fontFamily: string;
  position: CaptionPosition;
  showStroke: boolean;
  showBackground: boolean;
}

function getYPosition(position: CaptionPosition, height: number): number {
  switch (position) {
    case 'top': return height * 0.15;
    case 'center': return height * 0.5;
    case 'bottom': return height * 0.8;
  }
}

function getActiveWordIndex(words: CaptionWord[], time: number): number {
  return words.findIndex(w => time >= w.startTime && time < w.endTime);
}

function drawStroke(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, maxWidth: number) {
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 4;
  ctx.lineJoin = 'round';
  ctx.strokeText(text, x, y, maxWidth);
}

export function renderCaptions(options: RenderOptions) {
  const { ctx, caption, currentTime, width, height, style, fontSize, color, fontFamily, position, showStroke, showBackground } = options;
  const y = getYPosition(position, height);
  const words = caption.words || [];
  const activeIdx = getActiveWordIndex(words, currentTime);

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  switch (style) {
    case 'viral-pop':
      renderViralPop(ctx, caption, words, activeIdx, currentTime, width, y, fontSize, color, fontFamily, showStroke);
      break;
    case 'karaoke':
      renderKaraoke(ctx, caption, words, activeIdx, currentTime, width, y, fontSize, color, fontFamily, showStroke);
      break;
    case 'boxed':
      renderBoxed(ctx, caption, words, activeIdx, currentTime, width, y, fontSize, color, fontFamily);
      break;
    case 'typewriter':
      renderTypewriter(ctx, caption, words, activeIdx, currentTime, width, y, fontSize, color, fontFamily, showStroke);
      break;
    case 'gradient':
      renderGradient(ctx, caption, words, activeIdx, currentTime, width, height, y, fontSize, fontFamily, showStroke);
      break;
    case 'minimal':
      renderMinimal(ctx, caption, words, activeIdx, width, y, fontSize, color, fontFamily, showBackground, height);
      break;
    case 'neon':
      renderNeon(ctx, caption, words, activeIdx, currentTime, width, y, fontSize, color, fontFamily);
      break;
    case 'classic':
      renderClassic(ctx, caption, width, height, fontSize, color, fontFamily, showBackground);
      break;
  }
}

function renderViralPop(
  ctx: CanvasRenderingContext2D, caption: Caption, words: CaptionWord[],
  activeIdx: number, time: number, w: number, y: number,
  fontSize: number, color: string, fontFamily: string, showStroke: boolean
) {
  if (words.length === 0) {
    ctx.font = `900 ${fontSize}px ${fontFamily}`;
    ctx.shadowColor = 'rgba(0,0,0,0.8)';
    ctx.shadowBlur = 8;
    ctx.fillStyle = color;
    ctx.fillText(caption.text.toUpperCase(), w / 2, y, w - 40);
    ctx.shadowBlur = 0;
    return;
  }

  // Render max 3-4 words at a time centered
  const groupSize = 3;
  const groupIdx = activeIdx >= 0 ? Math.floor(activeIdx / groupSize) : Math.floor(words.length / groupSize);
  const start = groupIdx * groupSize;
  const end = Math.min(start + groupSize, words.length);
  const visibleWords = words.slice(start, end);

  const baseFont = `900 ${fontSize}px ${fontFamily}`;
  ctx.font = baseFont;

  // Measure total width
  let totalWidth = 0;
  const wordWidths = visibleWords.map(w => {
    const m = ctx.measureText(w.word.toUpperCase() + ' ');
    totalWidth += m.width;
    return m.width;
  });

  let x = (w - totalWidth) / 2;

  visibleWords.forEach((word, i) => {
    const globalI = start + i;
    const isActive = globalI === activeIdx;
    const scale = isActive ? 1.15 : 1.0;
    const wordColor = isActive ? '#FFD700' : color;

    ctx.save();
    ctx.translate(x + wordWidths[i] / 2, y);
    ctx.scale(scale, scale);
    ctx.translate(-(x + wordWidths[i] / 2), -y);

    ctx.font = baseFont;
    ctx.textAlign = 'left';

    if (showStroke) {
      drawStroke(ctx, word.word.toUpperCase(), x, y, w);
    }

    ctx.shadowColor = 'rgba(0,0,0,0.8)';
    ctx.shadowBlur = isActive ? 12 : 6;
    ctx.fillStyle = wordColor;
    ctx.fillText(word.word.toUpperCase(), x, y, w);
    ctx.shadowBlur = 0;
    ctx.restore();

    x += wordWidths[i];
  });
}

function renderKaraoke(
  ctx: CanvasRenderingContext2D, caption: Caption, words: CaptionWord[],
  activeIdx: number, time: number, w: number, y: number,
  fontSize: number, color: string, fontFamily: string, showStroke: boolean
) {
  ctx.font = `bold ${fontSize}px ${fontFamily}`;

  if (words.length === 0) {
    if (showStroke) drawStroke(ctx, caption.text, w / 2, y, w - 40);
    ctx.fillStyle = color;
    ctx.fillText(caption.text, w / 2, y, w - 40);
    return;
  }

  const text = words.map(w => w.word).join(' ');
  const totalWidth = ctx.measureText(text).width;
  let x = (w - totalWidth) / 2;

  words.forEach((word, i) => {
    const wText = word.word + (i < words.length - 1 ? ' ' : '');
    const wWidth = ctx.measureText(wText).width;

    ctx.textAlign = 'left';
    if (showStroke) drawStroke(ctx, wText, x, y, w);

    // Spoken words get accent color, upcoming get dim
    ctx.fillStyle = i <= activeIdx ? '#00FF88' : 'rgba(255,255,255,0.4)';
    ctx.fillText(wText, x, y, w);
    x += wWidth;
  });
}

function renderBoxed(
  ctx: CanvasRenderingContext2D, caption: Caption, words: CaptionWord[],
  activeIdx: number, time: number, w: number, y: number,
  fontSize: number, color: string, fontFamily: string
) {
  ctx.font = `bold ${fontSize * 0.85}px ${fontFamily}`;

  if (words.length === 0) {
    const pad = 12;
    const m = ctx.measureText(caption.text);
    ctx.fillStyle = 'rgba(0,0,0,0.7)';
    ctx.roundRect(w / 2 - m.width / 2 - pad, y - fontSize / 2 - pad / 2, m.width + pad * 2, fontSize + pad, 8);
    ctx.fill();
    ctx.fillStyle = color;
    ctx.fillText(caption.text, w / 2, y, w - 40);
    return;
  }

  // Group words 3 at a time
  const groupSize = 3;
  const groupIdx = activeIdx >= 0 ? Math.floor(activeIdx / groupSize) : 0;
  const start = groupIdx * groupSize;
  const end = Math.min(start + groupSize, words.length);
  const visibleWords = words.slice(start, end);

  const pad = 10;
  const gap = 8;
  const wordMeasures = visibleWords.map(wObj => ctx.measureText(wObj.word));
  const totalWidth = wordMeasures.reduce((s, m) => s + m.width + pad * 2, 0) + (visibleWords.length - 1) * gap;
  let x = (w - totalWidth) / 2;

  visibleWords.forEach((word, i) => {
    const globalI = start + i;
    const isActive = globalI === activeIdx;
    const wWidth = wordMeasures[i].width;

    ctx.fillStyle = isActive ? 'hsl(262, 83%, 58%)' : 'rgba(0,0,0,0.7)';
    ctx.beginPath();
    ctx.roundRect(x, y - fontSize / 2 - pad / 2, wWidth + pad * 2, fontSize + pad, 8);
    ctx.fill();

    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'left';
    ctx.fillText(word.word, x + pad, y);
    x += wWidth + pad * 2 + gap;
  });
}

function renderTypewriter(
  ctx: CanvasRenderingContext2D, caption: Caption, words: CaptionWord[],
  activeIdx: number, time: number, w: number, y: number,
  fontSize: number, color: string, fontFamily: string, showStroke: boolean
) {
  ctx.font = `bold ${fontSize}px ${fontFamily}`;

  if (words.length === 0 || activeIdx < 0) {
    return; // Nothing to show yet
  }

  // Show words up to active index
  const visibleText = words.slice(0, activeIdx + 1).map(w => w.word).join(' ');
  
  if (showStroke) drawStroke(ctx, visibleText, w / 2, y, w - 40);
  ctx.fillStyle = color;
  ctx.shadowColor = 'rgba(0,0,0,0.6)';
  ctx.shadowBlur = 4;
  ctx.fillText(visibleText, w / 2, y, w - 40);
  ctx.shadowBlur = 0;
}

function renderGradient(
  ctx: CanvasRenderingContext2D, caption: Caption, words: CaptionWord[],
  activeIdx: number, time: number, w: number, h: number, y: number,
  fontSize: number, fontFamily: string, showStroke: boolean
) {
  ctx.font = `900 ${fontSize}px ${fontFamily}`;
  const text = caption.text.toUpperCase();

  const gradient = ctx.createLinearGradient(w * 0.2, y, w * 0.8, y);
  const shift = (time * 0.5) % 1;
  gradient.addColorStop((0 + shift) % 1, '#FF6B6B');
  gradient.addColorStop((0.33 + shift) % 1, '#FFD93D');
  gradient.addColorStop((0.66 + shift) % 1, '#6BCB77');
  gradient.addColorStop((1 + shift) % 1, '#4D96FF');

  if (showStroke) drawStroke(ctx, text, w / 2, y, w - 40);
  ctx.fillStyle = gradient;
  ctx.fillText(text, w / 2, y, w - 40);
}

function renderMinimal(
  ctx: CanvasRenderingContext2D, caption: Caption, words: CaptionWord[],
  activeIdx: number, w: number, y: number,
  fontSize: number, color: string, fontFamily: string, showBg: boolean, h: number
) {
  const fSize = fontSize * 0.75;
  ctx.font = `500 ${fSize}px ${fontFamily}`;

  if (showBg) {
    const m = ctx.measureText(caption.text);
    const pad = 12;
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.beginPath();
    ctx.roundRect(w / 2 - m.width / 2 - pad, y - fSize / 2 - pad / 2, m.width + pad * 2, fSize + pad, 6);
    ctx.fill();
  }

  if (words.length === 0) {
    ctx.fillStyle = color;
    ctx.fillText(caption.text, w / 2, y, w - 40);
    return;
  }

  const text = words.map(w => w.word).join(' ');
  const totalWidth = ctx.measureText(text).width;
  let x = (w - totalWidth) / 2;

  words.forEach((word, i) => {
    const wText = word.word + (i < words.length - 1 ? ' ' : '');
    const wWidth = ctx.measureText(wText).width;
    ctx.textAlign = 'left';
    ctx.fillStyle = i === activeIdx ? color : 'rgba(255,255,255,0.6)';
    ctx.font = i === activeIdx ? `700 ${fSize}px ${fontFamily}` : `500 ${fSize}px ${fontFamily}`;
    ctx.fillText(wText, x, y);
    // Reset font for measurement consistency
    ctx.font = `500 ${fSize}px ${fontFamily}`;
    x += wWidth;
  });
}

function renderNeon(
  ctx: CanvasRenderingContext2D, caption: Caption, words: CaptionWord[],
  activeIdx: number, time: number, w: number, y: number,
  fontSize: number, color: string, fontFamily: string
) {
  ctx.font = `bold ${fontSize}px ${fontFamily}`;
  const text = caption.text.toUpperCase();

  // Neon glow layers
  const glowColor = color === '#ffffff' ? '#00ffff' : color;

  ctx.shadowColor = glowColor;
  ctx.shadowBlur = 20;
  ctx.fillStyle = glowColor;
  ctx.fillText(text, w / 2, y, w - 40);

  ctx.shadowBlur = 40;
  ctx.fillText(text, w / 2, y, w - 40);

  ctx.shadowBlur = 0;
  ctx.fillStyle = '#ffffff';
  ctx.fillText(text, w / 2, y, w - 40);

  // Pulse active word
  if (words.length > 0 && activeIdx >= 0) {
    const activeWord = words[activeIdx];
    const pulse = 0.5 + Math.sin(time * 8) * 0.5;
    ctx.shadowColor = glowColor;
    ctx.shadowBlur = 30 + pulse * 20;
    
    // Approximate position of active word
    const beforeText = words.slice(0, activeIdx).map(w => w.word).join(' ');
    const beforeWidth = beforeText ? ctx.measureText(beforeText + ' ').width : 0;
    const totalWidth = ctx.measureText(text).width;
    const startX = (w - totalWidth) / 2 + beforeWidth;
    const wordWidth = ctx.measureText(activeWord.word.toUpperCase()).width;

    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'left';
    ctx.fillText(activeWord.word.toUpperCase(), startX, y);
    ctx.shadowBlur = 0;
    ctx.textAlign = 'center';
  }
}

function renderClassic(
  ctx: CanvasRenderingContext2D, caption: Caption,
  w: number, h: number, fontSize: number, color: string,
  fontFamily: string, showBg: boolean
) {
  const fSize = fontSize * 0.7;
  ctx.font = `${fSize}px ${fontFamily}`;
  const barH = fSize + 16;

  ctx.fillStyle = 'rgba(0,0,0,0.75)';
  ctx.fillRect(0, h - barH - 20, w, barH);

  ctx.fillStyle = color;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(caption.text, w / 2, h - 20 - barH / 2, w - 40);
}
