// Source normalization utilities for advertising platform detection

export const KNOWN_SOURCES = ['Facebook', 'Google', 'TikTok', 'LinkedIn', 'Direct', 'Unknown'] as const;

export type KnownSource = typeof KNOWN_SOURCES[number];

/**
 * Normalize raw UTM source values to standardized platform names
 * This is used across webhooks, API syncs, and frontend filtering
 */
export function normalizeSource(raw: string | null | undefined): string {
  if (!raw) return 'Unknown';
  const lower = raw.toLowerCase().trim();
  
  // Platform detection patterns
  const patterns: [RegExp, string][] = [
    [/facebook|fb|meta|instagram|ig_|ig\s/i, 'Facebook'],
    [/google|gclid|youtube|yt_|adwords/i, 'Google'],
    [/tiktok|tt_|bytedance/i, 'TikTok'],
    [/linkedin|li_/i, 'LinkedIn'],
    [/^(webhook|manual|api|direct|organic)$/i, 'Direct'],
  ];
  
  for (const [pattern, source] of patterns) {
    if (pattern.test(lower)) return source;
  }
  
  return raw; // Keep original if no match
}

/**
 * Infer source from campaign name patterns when utm_source is not set
 * Facebook campaigns often have numeric IDs or specific patterns
 */
export function inferSourceFromCampaign(campaignName: string | null | undefined): string | null {
  if (!campaignName) return null;
  
  const lower = campaignName.toLowerCase();
  
  // Facebook-style campaign patterns
  // - Numeric IDs (e.g., "23847392847293")
  // - Contains "fb_" or "facebook"
  // - Contains common Facebook campaign naming conventions
  if (/^\d{10,}$/.test(campaignName)) {
    return 'Facebook';
  }
  
  if (lower.includes('fb_') || lower.includes('facebook') || lower.includes('ig_') || lower.includes('meta')) {
    return 'Facebook';
  }
  
  // Google-style patterns
  if (lower.includes('ggl_') || lower.includes('google') || lower.includes('gdn_') || lower.includes('search_')) {
    return 'Google';
  }
  
  // TikTok patterns
  if (lower.includes('tt_') || lower.includes('tiktok')) {
    return 'TikTok';
  }
  
  return null;
}

/**
 * Get the display color for a source platform
 */
export function getSourceColor(source: string): string {
  const normalized = normalizeSource(source);
  
  switch (normalized) {
    case 'Facebook':
      return 'bg-blue-500/10 text-blue-600 border-blue-200';
    case 'Google':
      return 'bg-red-500/10 text-red-600 border-red-200';
    case 'TikTok':
      return 'bg-pink-500/10 text-pink-600 border-pink-200';
    case 'LinkedIn':
      return 'bg-sky-500/10 text-sky-600 border-sky-200';
    case 'Direct':
      return 'bg-green-500/10 text-green-600 border-green-200';
    default:
      return 'bg-muted text-muted-foreground border-border';
  }
}

/**
 * Get icon name for a source platform
 */
export function getSourceIcon(source: string): string {
  const normalized = normalizeSource(source);
  
  switch (normalized) {
    case 'Facebook':
      return 'facebook';
    case 'Google':
      return 'chrome';
    case 'TikTok':
      return 'music';
    case 'LinkedIn':
      return 'linkedin';
    default:
      return 'globe';
  }
}
