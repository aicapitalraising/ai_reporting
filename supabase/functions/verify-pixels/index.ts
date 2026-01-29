import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface PixelResult {
  platform: 'meta' | 'google' | 'linkedin' | 'tiktok';
  name: string;
  detected: boolean;
  pixelId?: string;
  events?: string[];
  confidence: 'high' | 'medium' | 'low';
}

// Patterns to detect various tracking pixels
const PIXEL_PATTERNS = {
  meta: {
    name: 'Meta Pixel (Facebook)',
    patterns: [
      /fbq\s*\(\s*['"]init['"]\s*,\s*['"](\d+)['"]/gi,
      /facebook\.com\/tr/gi,
      /connect\.facebook\.net.*fbevents\.js/gi,
      /fbevents\.js/gi,
      /_fbq\s*=/gi,
    ],
    idPattern: /fbq\s*\(\s*['"]init['"]\s*,\s*['"](\d+)['"]/i,
    eventPatterns: [
      { pattern: /fbq\s*\(\s*['"]track['"]\s*,\s*['"]PageView['"]/gi, event: 'PageView' },
      { pattern: /fbq\s*\(\s*['"]track['"]\s*,\s*['"]Lead['"]/gi, event: 'Lead' },
      { pattern: /fbq\s*\(\s*['"]track['"]\s*,\s*['"]Schedule['"]/gi, event: 'Schedule' },
      { pattern: /fbq\s*\(\s*['"]track['"]\s*,\s*['"]CompleteRegistration['"]/gi, event: 'CompleteRegistration' },
      { pattern: /fbq\s*\(\s*['"]track['"]\s*,\s*['"]Purchase['"]/gi, event: 'Purchase' },
      { pattern: /fbq\s*\(\s*['"]track['"]\s*,\s*['"]ViewContent['"]/gi, event: 'ViewContent' },
      { pattern: /fbq\s*\(\s*['"]track['"]\s*,\s*['"]InitiateCheckout['"]/gi, event: 'InitiateCheckout' },
      { pattern: /fbq\s*\(\s*['"]track['"]\s*,\s*['"]AddToCart['"]/gi, event: 'AddToCart' },
      { pattern: /fbq\s*\(\s*['"]trackCustom['"]/gi, event: 'CustomEvent' },
    ],
  },
  google: {
    name: 'Google Ads / Analytics',
    patterns: [
      /gtag\s*\(/gi,
      /googletagmanager\.com\/gtag/gi,
      /googletagmanager\.com\/gtm\.js/gi,
      /google-analytics\.com\/analytics\.js/gi,
      /googleadservices\.com\/pagead\/conversion/gi,
      /gtm\.js/gi,
      /GA_TRACKING_ID/gi,
      /G-[A-Z0-9]+/gi,
      /AW-[0-9]+/gi,
      /UA-[0-9]+-[0-9]+/gi,
    ],
    idPattern: /(G-[A-Z0-9]+|AW-[0-9]+|UA-[0-9]+-[0-9]+|GTM-[A-Z0-9]+)/i,
    eventPatterns: [
      { pattern: /gtag\s*\(\s*['"]event['"]\s*,\s*['"]conversion['"]/gi, event: 'Conversion' },
      { pattern: /gtag\s*\(\s*['"]event['"]\s*,\s*['"]page_view['"]/gi, event: 'PageView' },
      { pattern: /gtag\s*\(\s*['"]event['"]\s*,\s*['"]generate_lead['"]/gi, event: 'Lead' },
      { pattern: /gtag\s*\(\s*['"]event['"]\s*,\s*['"]schedule['"]/gi, event: 'Schedule' },
      { pattern: /gtag\s*\(\s*['"]event['"]\s*,\s*['"]purchase['"]/gi, event: 'Purchase' },
      { pattern: /gtag\s*\(\s*['"]config['"]/gi, event: 'Config' },
    ],
  },
  linkedin: {
    name: 'LinkedIn Insight Tag',
    patterns: [
      /linkedin\.com\/px/gi,
      /snap\.licdn\.com\/li\.lms-analytics/gi,
      /lintrk/gi,
      /_linkedin_partner_id/gi,
      /linkedin-ads\.js/gi,
    ],
    idPattern: /_linkedin_partner_id\s*=\s*['"]?(\d+)['"]?/i,
    eventPatterns: [
      { pattern: /lintrk\s*\(\s*['"]track['"]/gi, event: 'Track' },
      { pattern: /linkedin.*conversion/gi, event: 'Conversion' },
    ],
  },
  tiktok: {
    name: 'TikTok Pixel',
    patterns: [
      /ttq\.load/gi,
      /analytics\.tiktok\.com/gi,
      /tiktok-pixel/gi,
      /ttq\s*\(/gi,
    ],
    idPattern: /ttq\.load\s*\(\s*['"]([A-Z0-9]+)['"]/i,
    eventPatterns: [
      { pattern: /ttq\.track\s*\(\s*['"]ViewContent['"]/gi, event: 'ViewContent' },
      { pattern: /ttq\.track\s*\(\s*['"]ClickButton['"]/gi, event: 'ClickButton' },
      { pattern: /ttq\.track\s*\(\s*['"]SubmitForm['"]/gi, event: 'SubmitForm' },
      { pattern: /ttq\.track\s*\(\s*['"]CompleteRegistration['"]/gi, event: 'CompleteRegistration' },
      { pattern: /ttq\.page\s*\(/gi, event: 'PageView' },
    ],
  },
};

async function fetchPageContent(url: string): Promise<string> {
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    return await response.text();
  } catch (error) {
    console.error('Error fetching page:', error);
    throw error;
  }
}

function detectPixels(html: string): PixelResult[] {
  const results: PixelResult[] = [];
  
  for (const [platform, config] of Object.entries(PIXEL_PATTERNS)) {
    let detected = false;
    let matchCount = 0;
    let pixelId: string | undefined;
    const events: string[] = [];
    
    // Check for presence patterns
    for (const pattern of config.patterns) {
      const matches = html.match(pattern);
      if (matches) {
        detected = true;
        matchCount += matches.length;
      }
    }
    
    // Try to extract pixel ID
    if (detected && config.idPattern) {
      const idMatch = html.match(config.idPattern);
      if (idMatch && idMatch[1]) {
        pixelId = idMatch[1];
      }
    }
    
    // Detect tracked events
    if (detected && config.eventPatterns) {
      for (const eventConfig of config.eventPatterns) {
        if (html.match(eventConfig.pattern)) {
          if (!events.includes(eventConfig.event)) {
            events.push(eventConfig.event);
          }
        }
      }
    }
    
    // Determine confidence
    let confidence: 'high' | 'medium' | 'low' = 'low';
    if (pixelId && matchCount >= 2) {
      confidence = 'high';
    } else if (matchCount >= 2 || pixelId) {
      confidence = 'medium';
    }
    
    results.push({
      platform: platform as 'meta' | 'google' | 'linkedin' | 'tiktok',
      name: config.name,
      detected,
      pixelId,
      events: events.length > 0 ? events : undefined,
      confidence,
    });
  }
  
  return results;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }
  
  try {
    const { url } = await req.json();
    
    if (!url) {
      return new Response(
        JSON.stringify({ success: false, error: 'URL is required' }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    console.log('Verifying pixels for URL:', url);
    
    // Fetch the page content
    const html = await fetchPageContent(url);
    
    // Detect pixels
    const pixels = detectPixels(html);
    
    console.log('Pixel detection results:', pixels);
    
    return new Response(
      JSON.stringify({
        success: true,
        pixels,
        scannedAt: new Date().toISOString(),
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error('Pixel verification error:', error);
    
    return new Response(
      JSON.stringify({
        success: false,
        pixels: [],
        scannedAt: new Date().toISOString(),
        error: error.message || 'Failed to verify pixels',
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
