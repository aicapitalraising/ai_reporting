import { supabase } from '@/integrations/supabase/client';
import { getStoredKeys } from '@/hooks/useApiRateLimiter';

/**
 * Check if a URL is a Google API URL that needs proxying
 */
export function isGoogleApiUrl(url: string): boolean {
  return url.includes('generativelanguage.googleapis.com');
}

/**
 * Build the edge function URL for download-video
 */
function getDownloadFunctionUrl(): string {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  return `${supabaseUrl}/functions/v1/download-video`;
}

/**
 * Get the first available Veo3 API key from localStorage.
 * Google API video files are tied to the key that generated them,
 * so we must use the user's key, not the server-side secret.
 */
function getStoredVeoKey(): string | undefined {
  const veoKeys = getStoredKeys('veo3');
  const found = veoKeys.find((k) => k.key.trim());
  if (found) return found.key;
  // Fallback to gemini keys
  const geminiKeys = getStoredKeys('gemini');
  return geminiKeys.find((k) => k.key.trim())?.key;
}

/**
 * Fetch a video via the download-video proxy edge function.
 * Returns a blob URL for playback/download.
 */
export async function fetchVideoViaProxy(videoUrl: string, apiKey?: string): Promise<string> {
  const blob = await fetchVideoAsBlob(videoUrl, apiKey);
  return URL.createObjectURL(blob);
}

/**
 * Fetch video as a Blob (for uploading to storage).
 * Uses proxy for Google API URLs, direct fetch otherwise.
 */
export async function fetchVideoAsBlob(videoUrl: string, apiKey?: string): Promise<Blob> {
  if (isGoogleApiUrl(videoUrl)) {
    // Auto-resolve API key from localStorage if not provided
    const resolvedKey = apiKey || getStoredVeoKey();
    
    // Call the edge function directly via fetch to get binary stream
    const functionUrl = getDownloadFunctionUrl();
    const anonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
    
    const response = await fetch(functionUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': anonKey,
        'Authorization': `Bearer ${anonKey}`,
      },
      body: JSON.stringify({ videoUrl, apiKey: resolvedKey }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Proxy error: ${response.status} - ${errorText}`);
    }

    return response.blob();
  }

  const response = await fetch(videoUrl);
  if (!response.ok) throw new Error(`Fetch failed: ${response.status}`);
  return response.blob();
}
