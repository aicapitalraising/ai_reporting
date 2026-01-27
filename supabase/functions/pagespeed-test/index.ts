import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const PAGESPEED_API = 'https://www.googleapis.com/pagespeedonline/v5/runPagespeed';

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { url, strategy = 'mobile' } = await req.json();

    if (!url) {
      return new Response(
        JSON.stringify({ error: 'URL is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Running PageSpeed test for: ${url} (strategy: ${strategy})`);

    const apiUrl = `${PAGESPEED_API}?url=${encodeURIComponent(url)}&strategy=${strategy}&category=performance`;
    const response = await fetch(apiUrl);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('PageSpeed API error:', errorText);
      throw new Error(`PageSpeed API returned ${response.status}`);
    }

    const data = await response.json();

    // Extract key metrics from Lighthouse results
    const lighthouse = data.lighthouseResult;
    
    if (!lighthouse || !lighthouse.categories || !lighthouse.audits) {
      throw new Error('Invalid response from PageSpeed API');
    }

    const result = {
      performanceScore: (lighthouse.categories.performance?.score || 0) * 100,
      metrics: {
        firstContentfulPaint: lighthouse.audits['first-contentful-paint']?.displayValue || 'N/A',
        speedIndex: lighthouse.audits['speed-index']?.displayValue || 'N/A',
        largestContentfulPaint: lighthouse.audits['largest-contentful-paint']?.displayValue || 'N/A',
        timeToInteractive: lighthouse.audits['interactive']?.displayValue || 'N/A',
        totalBlockingTime: lighthouse.audits['total-blocking-time']?.displayValue || 'N/A',
        cumulativeLayoutShift: lighthouse.audits['cumulative-layout-shift']?.displayValue || 'N/A',
      }
    };

    console.log(`PageSpeed test complete. Score: ${result.performanceScore}`);

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('Error running PageSpeed test:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
