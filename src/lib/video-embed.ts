/**
 * Video embed URL utilities - extract embeddable player URLs from social platform links
 */

export type EmbedPlatform = 'youtube' | 'tiktok' | 'facebook' | 'instagram' | 'unknown';

export type EmbedInfo = {
  type: EmbedPlatform;
  embedUrl: string | null;
  videoId: string | null;
  thumbnailUrl: string | null;
};

/**
 * Extract YouTube video ID from various URL formats
 */
function extractYouTubeId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/v\/)([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/,
  ];
  for (const p of patterns) {
    const match = url.match(p);
    if (match) return match[1];
  }
  return null;
}

/**
 * Extract TikTok video ID from URL
 */
function extractTikTokId(url: string): string | null {
  const match = url.match(/tiktok\.com\/@[^/]+\/video\/(\d+)/);
  return match ? match[1] : null;
}

/**
 * Extract Facebook video ID from URL
 */
function extractFacebookVideoId(url: string): string | null {
  const patterns = [
    /facebook\.com\/.*\/videos\/(\d+)/,
    /facebook\.com\/watch\/?\?v=(\d+)/,
    /fb\.watch\/([a-zA-Z0-9_-]+)/,
  ];
  for (const p of patterns) {
    const match = url.match(p);
    if (match) return match[1];
  }
  return null;
}

/**
 * Extract Instagram post/reel shortcode from URL
 */
function extractInstagramId(url: string): string | null {
  const patterns = [
    /instagram\.com\/(?:p|reel|reels|tv)\/([a-zA-Z0-9_-]+)/,
  ];
  for (const p of patterns) {
    const match = url.match(p);
    if (match) return match[1];
  }
  return null;
}

/**
 * Get embed info from any social platform URL
 */
export function getEmbedInfo(sourceUrl: string | null | undefined): EmbedInfo {
  if (!sourceUrl) return { type: 'unknown', embedUrl: null, videoId: null, thumbnailUrl: null };

  // YouTube
  const ytId = extractYouTubeId(sourceUrl);
  if (ytId) {
    return {
      type: 'youtube',
      videoId: ytId,
      embedUrl: `https://www.youtube.com/embed/${ytId}?autoplay=0&rel=0&modestbranding=1`,
      thumbnailUrl: `https://i.ytimg.com/vi/${ytId}/hqdefault.jpg`,
    };
  }

  // TikTok
  const ttId = extractTikTokId(sourceUrl);
  if (ttId) {
    return {
      type: 'tiktok',
      videoId: ttId,
      embedUrl: `https://www.tiktok.com/embed/v2/${ttId}`,
      thumbnailUrl: null,
    };
  }

  // Instagram
  const igId = extractInstagramId(sourceUrl);
  if (igId) {
    return {
      type: 'instagram',
      videoId: igId,
      embedUrl: `https://www.instagram.com/p/${igId}/embed/`,
      thumbnailUrl: null,
    };
  }

  // Facebook
  const fbId = extractFacebookVideoId(sourceUrl);
  if (fbId) {
    return {
      type: 'facebook',
      videoId: fbId,
      embedUrl: `https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(sourceUrl)}&show_text=false&width=560`,
      thumbnailUrl: null,
    };
  }

  return { type: 'unknown', embedUrl: null, videoId: null, thumbnailUrl: null };
}

/**
 * Check if a source URL can be embedded inline
 */
export function isEmbeddable(sourceUrl: string | null | undefined): boolean {
  const info = getEmbedInfo(sourceUrl);
  return info.embedUrl !== null;
}

/**
 * Get a human-readable label for the platform badge
 */
export function getPlatformLabel(type: EmbedPlatform): string {
  switch (type) {
    case 'youtube': return '▶ YouTube';
    case 'tiktok': return '♪ TikTok';
    case 'instagram': return '📸 Instagram';
    case 'facebook': return '📺 Facebook';
    default: return '📺 Video';
  }
}
