import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { clientId, pageId, adsLibraryUrl } = await req.json();

    if (!clientId) {
      return new Response(
        JSON.stringify({ success: false, error: "clientId is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!pageId && !adsLibraryUrl) {
      return new Response(
        JSON.stringify({ success: false, error: "pageId or adsLibraryUrl is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const apiKey = Deno.env.get("FIRECRAWL_API_KEY");
    if (!apiKey) {
      console.error("FIRECRAWL_API_KEY not configured");
      return new Response(
        JSON.stringify({ success: false, error: "Firecrawl connector not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Construct the Ads Library URL
    let targetUrl = adsLibraryUrl;
    if (!targetUrl && pageId) {
      targetUrl = `https://www.facebook.com/ads/library/?active_status=active&ad_type=all&country=US&media_type=all&search_type=page&view_all_page_id=${pageId}`;
    }

    console.log("Scraping Facebook Ads Library:", targetUrl);

    // Scrape the page using Firecrawl
    const scrapeResponse = await fetch("https://api.firecrawl.dev/v1/scrape", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        url: targetUrl,
        formats: ["markdown", "html", "screenshot"],
        waitFor: 5000, // Wait for dynamic content to load
        onlyMainContent: false,
      }),
    });

    const scrapeData = await scrapeResponse.json();

    if (!scrapeResponse.ok) {
      console.error("Firecrawl API error:", scrapeData);
      return new Response(
        JSON.stringify({ success: false, error: scrapeData.error || "Failed to scrape page" }),
        { status: scrapeResponse.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const markdown = scrapeData.data?.markdown || scrapeData.markdown || "";
    const html = scrapeData.data?.html || scrapeData.html || "";
    const screenshot = scrapeData.data?.screenshot || scrapeData.screenshot;
    const metadata = scrapeData.data?.metadata || scrapeData.metadata || {};

    // Parse ads from the scraped content
    const parsedAds = parseAdsFromContent(markdown, html, pageId || extractPageIdFromUrl(targetUrl));

    console.log(`Parsed ${parsedAds.length} ads from content`);

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Store the scraped ads
    const storedAds = [];
    for (const ad of parsedAds) {
      const { data: insertedAd, error: insertError } = await supabase
        .from("client_live_ads")
        .upsert({
          client_id: clientId,
          page_id: ad.pageId,
          page_name: ad.pageName || metadata.title,
          ad_library_url: targetUrl,
          primary_text: ad.primaryText,
          headline: ad.headline,
          description: ad.description,
          cta_type: ad.ctaType,
          media_type: ad.mediaType,
          media_urls: ad.mediaUrls,
          thumbnail_url: screenshot,
          status: "active",
          platforms: ad.platforms,
          raw_markdown: markdown.substring(0, 10000), // Store first 10k chars
          scraped_at: new Date().toISOString(),
        }, {
          onConflict: "id",
        })
        .select()
        .single();

      if (insertError) {
        console.error("Error inserting ad:", insertError);
      } else if (insertedAd) {
        storedAds.push(insertedAd);
      }
    }

    // If no ads were parsed, still store the scrape result as a single entry
    if (parsedAds.length === 0 && (markdown || screenshot)) {
      const { data: insertedAd, error: insertError } = await supabase
        .from("client_live_ads")
        .insert({
          client_id: clientId,
          page_id: pageId || extractPageIdFromUrl(targetUrl),
          page_name: metadata.title || "Facebook Ads",
          ad_library_url: targetUrl,
          primary_text: extractPrimaryText(markdown),
          thumbnail_url: screenshot,
          status: "active",
          platforms: ["facebook"],
          raw_markdown: markdown.substring(0, 10000),
          scraped_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (!insertError && insertedAd) {
        storedAds.push(insertedAd);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        adsCount: storedAds.length,
        ads: storedAds,
        screenshot,
        metadata,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error scraping Facebook Ads:", error);
    const errorMessage = error instanceof Error ? error.message : "Failed to scrape ads";
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

function extractPageIdFromUrl(url: string): string | null {
  try {
    const urlObj = new URL(url);
    return urlObj.searchParams.get("view_all_page_id") || urlObj.searchParams.get("id");
  } catch {
    return null;
  }
}

function extractPrimaryText(markdown: string): string {
  // Extract meaningful text from markdown
  const lines = markdown.split("\n").filter((line) => {
    const trimmed = line.trim();
    return (
      trimmed.length > 20 &&
      !trimmed.startsWith("#") &&
      !trimmed.startsWith("*") &&
      !trimmed.startsWith("-") &&
      !trimmed.includes("http") &&
      !trimmed.includes("[")
    );
  });
  return lines.slice(0, 3).join(" ").substring(0, 500);
}

interface ParsedAd {
  pageId: string | null;
  pageName: string | null;
  primaryText: string | null;
  headline: string | null;
  description: string | null;
  ctaType: string | null;
  mediaType: string;
  mediaUrls: string[];
  platforms: string[];
}

function parseAdsFromContent(markdown: string, html: string, pageId: string | null): ParsedAd[] {
  const ads: ParsedAd[] = [];

  // Try to extract ad sections from markdown
  // Look for patterns that indicate ad content
  const sections = markdown.split(/(?=Started running on|Active on|Ad Details)/gi);

  for (const section of sections) {
    if (section.length < 50) continue;

    const ad: ParsedAd = {
      pageId,
      pageName: null,
      primaryText: null,
      headline: null,
      description: null,
      ctaType: null,
      mediaType: "image",
      mediaUrls: [],
      platforms: [],
    };

    // Extract primary text (usually the longest text block)
    const textBlocks = section
      .split("\n")
      .filter((line) => line.trim().length > 30 && !line.includes("http"));
    if (textBlocks.length > 0) {
      ad.primaryText = textBlocks[0].trim().substring(0, 500);
    }

    // Look for headline patterns
    const headlineMatch = section.match(/(?:headline|title)[:\s]*(.+)/i);
    if (headlineMatch) {
      ad.headline = headlineMatch[1].trim().substring(0, 200);
    }

    // Look for CTA patterns
    const ctaPatterns = [
      "Learn More",
      "Sign Up",
      "Shop Now",
      "Book Now",
      "Contact Us",
      "Get Quote",
      "Apply Now",
      "Download",
    ];
    for (const cta of ctaPatterns) {
      if (section.toLowerCase().includes(cta.toLowerCase())) {
        ad.ctaType = cta;
        break;
      }
    }

    // Detect media type
    if (section.toLowerCase().includes("video")) {
      ad.mediaType = "video";
    } else if (section.toLowerCase().includes("carousel")) {
      ad.mediaType = "carousel";
    }

    // Extract image URLs from markdown/HTML
    const imgMatches = [...section.matchAll(/!\[.*?\]\((https?:\/\/[^\)]+)\)/g)];
    for (const match of imgMatches) {
      ad.mediaUrls.push(match[1]);
    }

    // Extract platforms
    const platforms = ["facebook", "instagram", "messenger", "audience network"];
    for (const platform of platforms) {
      if (section.toLowerCase().includes(platform)) {
        ad.platforms.push(platform);
      }
    }
    if (ad.platforms.length === 0) {
      ad.platforms = ["facebook"];
    }

    if (ad.primaryText || ad.mediaUrls.length > 0) {
      ads.push(ad);
    }
  }

  return ads;
}
