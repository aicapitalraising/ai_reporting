import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { url } = await req.json();
    if (!url) {
      return new Response(JSON.stringify({ error: "URL is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; MetadataBot/1.0)",
        "Accept": "text/html",
      },
      signal: controller.signal,
    });
    clearTimeout(timeout);

    const html = await response.text();

    // Extract metadata using regex (no DOM parser in Deno)
    const getMetaContent = (name: string): string | null => {
      // Try property first, then name
      const patterns = [
        new RegExp(`<meta[^>]+(?:property|name)=["']${name}["'][^>]+content=["']([^"']*)["']`, "i"),
        new RegExp(`<meta[^>]+content=["']([^"']*)["'][^>]+(?:property|name)=["']${name}["']`, "i"),
      ];
      for (const pattern of patterns) {
        const match = html.match(pattern);
        if (match?.[1]) return match[1];
      }
      return null;
    };

    const titleMatch = html.match(/<title[^>]*>([^<]*)<\/title>/i);

    const metadata = {
      title: getMetaContent("og:title") || titleMatch?.[1]?.trim() || null,
      description: getMetaContent("og:description") || getMetaContent("description") || null,
      image: getMetaContent("og:image") || null,
      siteName: getMetaContent("og:site_name") || null,
      favicon: null as string | null,
    };

    // Extract favicon
    const faviconMatch = html.match(/<link[^>]+rel=["'](?:shortcut )?icon["'][^>]+href=["']([^"']*)["']/i)
      || html.match(/<link[^>]+href=["']([^"']*)["'][^>]+rel=["'](?:shortcut )?icon["']/i);
    if (faviconMatch?.[1]) {
      let favicon = faviconMatch[1];
      if (favicon.startsWith("//")) favicon = "https:" + favicon;
      else if (favicon.startsWith("/")) {
        const origin = new URL(url).origin;
        favicon = origin + favicon;
      }
      metadata.favicon = favicon;
    }

    // Resolve relative OG image
    if (metadata.image && !metadata.image.startsWith("http")) {
      if (metadata.image.startsWith("//")) {
        metadata.image = "https:" + metadata.image;
      } else if (metadata.image.startsWith("/")) {
        metadata.image = new URL(url).origin + metadata.image;
      }
    }

    return new Response(JSON.stringify(metadata), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("Metadata fetch error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
