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

    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    if (!GEMINI_API_KEY) {
      throw new Error("GEMINI_API_KEY is not configured");
    }

    if (action === "transcribe") {
      if (!videoUrl) {
        return new Response(
          JSON.stringify({ error: "No video URL provided" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            contents: [
              {
                parts: [
                  {
                    text: `You are a video transcription and analysis expert. Analyze this video URL and provide:
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
[Main marketing message and CTAs]

Video URL: ${videoUrl}`
                  }
                ]
              }
            ],
            generationConfig: {
              temperature: 0.3,
              maxOutputTokens: 4096,
            },
          }),
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Transcription error:", response.status, errorText);
        throw new Error("Transcription failed");
      }

      const result = await response.json();
      const transcription = result.candidates?.[0]?.content?.parts?.[0]?.text || "";

      return new Response(
        JSON.stringify({ transcript: transcription }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "audit") {
      const creativeDetails = `
Title: ${creative.title || 'N/A'}
Type: ${creative.type || 'N/A'}
Platform: ${creative.platform || 'N/A'}
Headline: ${creative.headline || 'N/A'}
Body Copy: ${creative.body_copy || 'N/A'}
CTA: ${creative.cta_text || 'N/A'}
${transcript ? `Video Transcript: ${transcript}` : ''}
${creative.file_url ? `File URL: ${creative.file_url}` : ''}
      `.trim();

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            contents: [
              {
                parts: [
                  {
                    text: `You are an expert digital advertising strategist and creative director with 15+ years of experience in paid social advertising. Analyze this ad creative and provide actionable feedback.

Your audit should cover:
1. **Overall Score (1-10)**: Rate the creative's effectiveness
2. **Headline Analysis**: Is it compelling? Clear value prop?
3. **Visual/Video Quality**: Professional? Attention-grabbing?
4. **Messaging Clarity**: Is the offer clear?
5. **CTA Effectiveness**: Strong action driver?
6. **Platform Optimization**: Suited for the target platform?
7. **Emotional Appeal**: Does it connect with the audience?
8. **Compliance Check**: Any potential ad policy issues?

Format with clear sections and be specific with recommendations.

Ad Creative Details:
${creativeDetails}`
                  }
                ]
              }
            ],
            generationConfig: {
              temperature: 0.7,
              maxOutputTokens: 4096,
            },
          }),
        }
      );

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
      const audit = result.candidates?.[0]?.content?.parts?.[0]?.text || "";

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
