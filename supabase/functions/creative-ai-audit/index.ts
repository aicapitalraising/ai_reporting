import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { action, creative, videoUrl, transcript } = await req.json();

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    if (action === "transcribe") {
      // Transcribe video - analyze the video content
      if (!videoUrl) {
        return new Response(
          JSON.stringify({ error: "No video URL provided" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            {
              role: "system",
              content: `You are a video transcription and analysis expert. Your job is to:
1. Describe what's happening in the video in detail
2. Transcribe any spoken words, text overlays, or captions
3. Note any background music or sound effects
4. Identify key messaging and calls to action

Format your response as:
**Visual Description:**
[Description of visuals]

**Spoken/Text Content:**
[Transcription of any speech or text]

**Audio Elements:**
[Description of music/sounds]

**Key Messaging:**
[Main marketing message and CTAs]`
            },
            {
              role: "user",
              content: [
                {
                  type: "text",
                  text: "Please analyze and transcribe this video ad creative:"
                },
                {
                  type: "image_url",
                  image_url: {
                    url: videoUrl
                  }
                }
              ]
            }
          ],
          stream: false,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Transcription error:", response.status, errorText);
        throw new Error("Transcription failed");
      }

      const result = await response.json();
      const transcription = result.choices?.[0]?.message?.content || "";

      return new Response(
        JSON.stringify({ transcript: transcription }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "audit") {
      // AI Audit of creative
      const creativeDetails = `
Title: ${creative.title || 'N/A'}
Type: ${creative.type || 'N/A'}
Platform: ${creative.platform || 'N/A'}
Headline: ${creative.headline || 'N/A'}
Body Copy: ${creative.body_copy || 'N/A'}
CTA: ${creative.cta_text || 'N/A'}
${transcript ? `Video Transcript: ${transcript}` : ''}
      `.trim();

      const messages: any[] = [
        {
          role: "system",
          content: `You are an expert digital advertising strategist and creative director with 15+ years of experience in paid social advertising. Analyze ad creatives and provide actionable feedback.

Your audit should cover:
1. **Overall Score (1-10)**: Rate the creative's effectiveness
2. **Headline Analysis**: Is it compelling? Clear value prop?
3. **Visual/Video Quality**: Professional? Attention-grabbing?
4. **Messaging Clarity**: Is the offer clear?
5. **CTA Effectiveness**: Strong action driver?
6. **Platform Optimization**: Suited for the target platform?
7. **Emotional Appeal**: Does it connect with the audience?
8. **Compliance Check**: Any potential ad policy issues?

Format with clear sections and be specific with recommendations.`
        },
        {
          role: "user",
          content: creative.file_url && (creative.type === 'image' || creative.type === 'video')
            ? [
                {
                  type: "text",
                  text: `Please audit this ${creative.type} ad creative:\n\n${creativeDetails}`
                },
                {
                  type: "image_url",
                  image_url: {
                    url: creative.file_url
                  }
                }
              ]
            : `Please audit this ad creative:\n\n${creativeDetails}`
        }
      ];

      const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages,
          stream: false,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Audit error:", response.status, errorText);
        
        if (response.status === 429) {
          return new Response(
            JSON.stringify({ error: "Rate limited, please try again later" }),
            { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        
        throw new Error("Audit failed");
      }

      const result = await response.json();
      const audit = result.choices?.[0]?.message?.content || "";

      return new Response(
        JSON.stringify({ audit }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ error: "Invalid action" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Creative AI error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
