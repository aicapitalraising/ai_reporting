import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const CLAUDE_MODEL = "claude-sonnet-4-20250514";

interface BriefRequest {
  action: "generate_brief" | "generate_scripts";
  clientId: string;
  briefId?: string; // Required for generate_scripts
  platform?: string;
  reason?: string; // "high_cpa" | "fatigue" | "scaling" | "new_angle"
}

async function callClaude(apiKey: string, systemPrompt: string, userPrompt: string): Promise<string> {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: CLAUDE_MODEL,
      max_tokens: 4096,
      system: systemPrompt,
      messages: [{ role: "user", content: userPrompt }],
    }),
  });

  if (!res.ok) {
    const errBody = await res.text();
    throw new Error(`Claude API ${res.status}: ${errBody.substring(0, 500)}`);
  }

  const data = await res.json();
  return data.content?.[0]?.text || "";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body: BriefRequest = await req.json();
    const { action, clientId, briefId, platform = "meta", reason = "scaling" } = body;

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get Claude API key from agency_settings
    const { data: settings } = await supabase
      .from("agency_settings")
      .select("anthropic_api_key")
      .limit(1)
      .maybeSingle();

    const ANTHROPIC_API_KEY = settings?.anthropic_api_key || Deno.env.get("ANTHROPIC_API_KEY");
    if (!ANTHROPIC_API_KEY) {
      throw new Error("ANTHROPIC_API_KEY is not configured. Add it in Agency Settings or as an environment variable.");
    }

    // Get client info
    const { data: client, error: clientErr } = await supabase
      .from("clients")
      .select("id, name, industry, description")
      .eq("id", clientId)
      .single();

    if (clientErr || !client) {
      throw new Error("Client not found");
    }

    // Get client settings for KPI context
    const { data: clientSettings } = await supabase
      .from("client_settings")
      .select("target_cpl, target_cost_per_call, target_cost_per_show, target_cost_per_investor, mrr")
      .eq("client_id", clientId)
      .maybeSingle();

    if (action === "generate_brief") {
      // Fetch top-performing campaigns (by attributed_leads)
      const { data: campaigns } = await supabase
        .from("meta_campaigns")
        .select("name, status, spend, impressions, clicks, ctr, cpc, cpm, attributed_leads, attributed_calls, attributed_funded, cost_per_lead, cost_per_funded")
        .eq("client_id", clientId)
        .gt("spend", 0)
        .order("spend", { ascending: false })
        .limit(10);

      // Fetch top ad sets
      const { data: adSets } = await supabase
        .from("meta_ad_sets")
        .select("name, status, spend, impressions, clicks, ctr, attributed_leads, attributed_funded, targeting")
        .eq("client_id", clientId)
        .gt("spend", 0)
        .order("spend", { ascending: false })
        .limit(10);

      // Fetch top ads
      const { data: ads } = await supabase
        .from("meta_ads")
        .select("name, status, spend, impressions, clicks, ctr, cpc, attributed_leads, attributed_funded, cost_per_lead")
        .eq("client_id", clientId)
        .gt("spend", 0)
        .order("spend", { ascending: false })
        .limit(10);

      // Fetch past rejected briefs for this client (learning from mistakes)
      const { data: rejectedBriefs } = await supabase
        .from("creative_briefs")
        .select("title, objective, rejection_reason, generation_reason, created_at")
        .eq("client_id", clientId)
        .eq("status", "rejected")
        .not("rejection_reason", "is", null)
        .order("created_at", { ascending: false })
        .limit(5);

      // Fetch approved/completed scripts as positive examples
      const { data: approvedScripts } = await supabase
        .from("ad_scripts")
        .select("title, angle, headline, hook, body_copy, cta")
        .eq("client_id", clientId)
        .in("status", ["approved", "in_production", "completed"])
        .order("created_at", { ascending: false })
        .limit(5);

      // === CROSS-CLIENT CREATIVE INTELLIGENCE ===
      // Query top-performing ads from OTHER clients to find transferable patterns
      const { data: crossClientAds } = await supabase
        .from("meta_ads")
        .select("name, spend, impressions, clicks, ctr, cpc, attributed_leads, cost_per_lead, client_id")
        .neq("client_id", clientId)
        .gt("attributed_leads", 2)
        .gt("spend", 100)
        .order("cost_per_lead", { ascending: true })
        .limit(20);

      // Get client names for the cross-client ads
      const crossClientIds = [...new Set((crossClientAds || []).map(a => a.client_id))];
      const { data: crossClients } = crossClientIds.length > 0
        ? await supabase
            .from("clients")
            .select("id, name, industry")
            .in("id", crossClientIds)
        : { data: [] };

      const clientNameMap = new Map((crossClients || []).map(c => [c.id, { name: c.name, industry: c.industry }]));

      // Group cross-client ads by performance tier
      const crossClientWinners = (crossClientAds || [])
        .map(a => ({
          ...a,
          _cpl: Number(a.attributed_leads) > 0 ? Number(a.spend) / Number(a.attributed_leads) : Infinity,
          _client: clientNameMap.get(a.client_id),
        }))
        .filter(a => a._cpl < Infinity && a._client)
        .slice(0, 10);

      // Calculate aggregate performance
      const totalSpend = (campaigns || []).reduce((s, c) => s + (Number(c.spend) || 0), 0);
      const totalLeads = (campaigns || []).reduce((s, c) => s + (Number(c.attributed_leads) || 0), 0);
      const totalFunded = (campaigns || []).reduce((s, c) => s + (Number(c.attributed_funded) || 0), 0);
      const avgCPL = totalLeads > 0 ? totalSpend / totalLeads : 0;
      const avgCPF = totalFunded > 0 ? totalSpend / totalFunded : 0;

      const reasonContext: Record<string, string> = {
        high_cpa: "CPA is above target. Focus on improving conversion efficiency. Analyze what top-converting ads have in common vs. high-spend low-conversion ads. Prioritize angles that lower cost per acquisition — tighter targeting messages, stronger social proof, urgency, and more specific CTAs.",
        fatigue: "Creative fatigue detected — CTR is declining and frequency is rising. The audience has seen current ads too many times. Generate COMPLETELY NEW angles that feel fresh. Avoid reusing hooks or themes from existing top campaigns. Push into unexpected emotional territory or contrarian framings.",
        scaling: "Current campaigns are performing well and we want to scale. Generate new angles that can run alongside winners without audience overlap. Look for underexploited pain points or desires that existing ads don't address. These should expand the audience, not cannibalize existing winners.",
        new_angle: "Client wants a fresh creative direction. Analyze what themes/emotions/formats are NOT represented in current campaigns. Push creative boundaries — test unconventional hooks, new emotional drivers, or different storytelling structures.",
      };

      const systemPrompt = `You are a senior performance creative strategist who has managed $50M+ in Meta ad spend across direct response campaigns. You generate strategic creative briefs that consistently produce top-decile ads.

Your analytical process:
1. PATTERN DETECTION — Identify what winning ads share (hooks, emotions, formats, audience signals) and what losing ads have in common
2. CROSS-CLIENT LEARNING — When cross-client data is provided, identify transferable winning patterns (hooks, emotional drivers, formats) that could work for this client. Adapt, don't copy.
3. GAP ANALYSIS — Find untested angles, underexploited emotions, or audience segments not addressed by current creative
4. STRATEGIC ANGLES — Develop 3 differentiated messaging angles, each targeting a different emotional driver or audience motivation
5. ACTIONABLE DIRECTION — Give designers/videographers specific, executable creative guidance

Rules:
- Every angle must be grounded in specific data observations (cite campaign names/metrics)
- Hooks must stop the scroll in under 2 seconds — lead with pattern interrupts, specific numbers, or provocative statements
- Pain points must be specific to the industry, not generic ("tired of low returns" not "tired of problems")
- Each angle must target a DIFFERENT emotional driver (fear, aspiration, curiosity, urgency, belonging, etc.)

Always respond with valid JSON matching this exact schema:
{
  "title": "string - concise brief title referencing the strategic focus",
  "objective": "string - specific measurable goal (e.g. 'Reduce CPL from $45 to $30 by testing urgency-driven hooks')",
  "target_audience": {
    "demographics": "string - age, income, location, job title if relevant",
    "psychographics": "string - beliefs, values, lifestyle, media consumption",
    "pain_points": ["string - 3-4 specific pain points with industry context"],
    "desires": ["string - 3-4 specific desires/aspirations"],
    "awareness_level": "string - unaware/problem-aware/solution-aware/product-aware/most-aware"
  },
  "performance_insights": {
    "winning_patterns": "string - what top-performing ads have in common",
    "losing_patterns": "string - what underperforming ads share",
    "untested_territory": "string - angles/emotions/formats not yet explored"
  },
  "messaging_angles": [
    {
      "angle": "string - angle name",
      "emotional_driver": "string - primary emotion (fear/aspiration/curiosity/urgency/social-proof/belonging)",
      "hook": "string - opening hook text (must stop scroll in <2 sec)",
      "hook_variants": ["string - 2 alternative hooks for A/B testing"],
      "body_theme": "string - core message/story arc for the body copy",
      "proof_points": ["string - specific claims, stats, or social proof to include"],
      "rationale": "string - why this angle based on specific data observations"
    }
  ],
  "creative_direction": "string - visual style, color palette, imagery type, text overlay approach",
  "ad_format": "string - recommended format (static_image/video_short/video_long/carousel)",
  "format_rationale": "string - why this format based on performance data"
}`;

      // Sort campaigns by efficiency for better analysis
      const sortedCampaigns = (campaigns || [])
        .map(c => ({
          ...c,
          _cpl: Number(c.attributed_leads) > 0 ? Number(c.spend) / Number(c.attributed_leads) : Infinity,
          _ctr: Number(c.ctr) || 0,
        }))
        .sort((a, b) => a._cpl - b._cpl);

      const sortedAds = (ads || [])
        .map(a => ({
          ...a,
          _cpl: Number(a.attributed_leads) > 0 ? Number(a.spend) / Number(a.attributed_leads) : Infinity,
          _ctr: Number(a.ctr) || 0,
        }))
        .sort((a, b) => a._cpl - b._cpl);

      // Identify winners vs losers
      const winnerAds = sortedAds.filter(a => a._cpl < avgCPL && a._cpl < Infinity).slice(0, 5);
      const loserAds = sortedAds.filter(a => a._cpl > avgCPL * 1.5 || a._cpl === Infinity).slice(0, 5);

      const userPrompt = `Generate a creative brief for ${client.name} (${client.industry || "industry not specified"}).
${client.description ? `Business: ${client.description}` : ""}

STRATEGIC CONTEXT: ${reasonContext[reason] || reasonContext.scaling}

AGGREGATE PERFORMANCE:
- Total spend: $${totalSpend.toFixed(0)} | Leads: ${totalLeads} | Funded: ${totalFunded}
- Current CPL: $${avgCPL.toFixed(2)} ${clientSettings?.target_cpl ? `| Target CPL: $${clientSettings.target_cpl}` : ""} ${avgCPL > (clientSettings?.target_cpl || Infinity) ? "⚠️ ABOVE TARGET" : ""}
- Current CPF: $${avgCPF.toFixed(2)} ${clientSettings?.target_cost_per_investor ? `| Target: $${clientSettings.target_cost_per_investor}` : ""}
- Lead→Funded rate: ${totalLeads > 0 ? ((totalFunded / totalLeads) * 100).toFixed(1) : 0}%

TOP PERFORMING CAMPAIGNS (by efficiency):
${sortedCampaigns.slice(0, 5).map(c => `- "${c.name}": $${Number(c.spend).toFixed(0)} spend, ${c.attributed_leads || 0} leads (CPL: $${c._cpl === Infinity ? "N/A" : c._cpl.toFixed(2)}), CTR: ${c._ctr.toFixed(2)}%, ${c.attributed_funded || 0} funded`).join("\n")}

WINNING ADS (lowest CPL):
${winnerAds.length > 0 ? winnerAds.map(a => `- "${a.name}": CPL $${a._cpl.toFixed(2)}, CTR ${a._ctr.toFixed(2)}%, ${a.attributed_leads} leads from $${Number(a.spend).toFixed(0)} spend`).join("\n") : "- No clear winners yet (insufficient attribution data)"}

UNDERPERFORMING ADS (high CPL or no conversions):
${loserAds.length > 0 ? loserAds.map(a => `- "${a.name}": CPL ${a._cpl === Infinity ? "∞ (no leads)" : "$" + a._cpl.toFixed(2)}, CTR ${a._ctr.toFixed(2)}%, $${Number(a.spend).toFixed(0)} spent`).join("\n") : "- No clear underperformers identified"}

AD SETS WITH TARGETING CONTEXT:
${(adSets || []).slice(0, 8).map(a => `- "${a.name}": $${Number(a.spend).toFixed(0)} → ${a.attributed_leads || 0} leads, targeting: ${JSON.stringify(a.targeting || {}).substring(0, 250)}`).join("\n")}

PLATFORM: ${platform}
${approvedScripts && approvedScripts.length > 0 ? `
APPROVED SCRIPTS — these styles/tones/angles resonated with this client:
${approvedScripts.map((as: any) => `- "${as.title}" | Angle: ${as.angle} | Hook: "${as.hook}" | CTA: "${as.cta}"`).join("\n")}
Build on what works. Match the tone and specificity level of approved scripts while exploring new angles.
` : ""}${rejectedBriefs && rejectedBriefs.length > 0 ? `
PREVIOUSLY REJECTED BRIEFS — DO NOT repeat these mistakes:
${rejectedBriefs.map((rb: any) => `- "${rb.title}" (${rb.generation_reason}) — REJECTED: ${rb.rejection_reason}`).join("\n")}
Learn from this feedback. Avoid the same angles, tones, or approaches that were rejected.
` : ""}

${crossClientWinners.length > 0 ? `CROSS-CLIENT INTELLIGENCE — Top-performing ads from other agency clients:
${crossClientWinners.map(a => `- "${a.name}" (${a._client?.name}, ${a._client?.industry || "unknown industry"}): CPL $${a._cpl.toFixed(2)}, CTR ${(Number(a.ctr) || 0).toFixed(2)}%, ${a.attributed_leads} leads from $${Number(a.spend).toFixed(0)}`).join("\n")}
Look for transferable patterns: hooks, emotional angles, or formats that work across clients. Adapt — don't copy — what's working elsewhere.` : ""}
Analyze the data carefully. What patterns separate winners from losers? What emotional territory or audience segments are untapped? Generate a brief with 3 distinct angles that address the strategic context above.`;

      const response = await callClaude(ANTHROPIC_API_KEY, systemPrompt, userPrompt);

      // Parse Claude's JSON response
      let briefData;
      try {
        // Extract JSON from markdown code blocks, or try raw response
        const jsonMatch = response.match(/```(?:json)?\s*([\s\S]*?)```/);
        const jsonStr = jsonMatch ? jsonMatch[1].trim() : response.trim();
        briefData = JSON.parse(jsonStr);
      } catch (parseErr) {
        throw new Error(`Failed to parse brief JSON: ${parseErr}. Raw response: ${response.substring(0, 200)}`);
      }

      // Save to database
      const { data: brief, error: insertErr } = await supabase
        .from("creative_briefs")
        .insert({
          client_id: clientId,
          title: briefData.title,
          objective: briefData.objective,
          target_audience: briefData.target_audience,
          messaging_angles: briefData.messaging_angles,
          creative_direction: briefData.creative_direction,
          platform,
          ad_format: briefData.ad_format && briefData.format_rationale
            ? `${briefData.ad_format} (${briefData.format_rationale})`
            : briefData.ad_format || null,
          source_campaigns: (campaigns || []).map(c => c.name),
          performance_snapshot: {
            spend: totalSpend, leads: totalLeads, funded: totalFunded,
            cpl: avgCPL, cpf: avgCPF,
            insights: briefData.performance_insights || null,
          },
          generation_reason: reason,
          status: "pending",
          generated_by: "ai",
        })
        .select()
        .single();

      if (insertErr) throw new Error(`Failed to save brief: ${insertErr.message}`);

      return new Response(JSON.stringify({ success: true, brief }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "generate_scripts") {
      if (!briefId) throw new Error("briefId is required for generate_scripts");

      // Fetch the brief
      const { data: brief, error: briefErr } = await supabase
        .from("creative_briefs")
        .select("*")
        .eq("id", briefId)
        .single();

      if (briefErr || !brief) throw new Error("Brief not found");

      const angles = brief.messaging_angles || [];

      // Fetch past rejected scripts for this client (learning from mistakes)
      const { data: rejectedScripts } = await supabase
        .from("ad_scripts")
        .select("title, angle, headline, hook, rejection_reason, created_at")
        .eq("client_id", clientId)
        .eq("status", "rejected")
        .not("rejection_reason", "is", null)
        .order("created_at", { ascending: false })
        .limit(8);

      // Fetch approved scripts as positive tone/style reference
      const { data: approvedScriptsForRef } = await supabase
        .from("ad_scripts")
        .select("title, angle, headline, hook, body_copy, cta")
        .eq("client_id", clientId)
        .in("status", ["approved", "in_production", "completed"])
        .order("created_at", { ascending: false })
        .limit(5);

      const adFormat = brief.ad_format || "static_image";
      const isVideo = adFormat.includes("video");
      const isCarousel = adFormat === "carousel";

      const formatInstructions: Record<string, string> = {
        static_image: `FORMAT: Static Image Ad
- Primary text: 3-5 short lines, first line is the hook (visible without "See more"). Keep under 125 chars for first line.
- Headline: Max 40 characters, appears below image. Must reinforce the hook.
- Description: Max 30 characters, supporting text below headline.
- Text overlay on image: 1-2 punchy lines, max 20% of image area. Include the core value prop.`,
        video_short: `FORMAT: Short-Form Video (15-30 sec)
- Hook (0-3 sec): Pattern interrupt — must stop the scroll. Use text overlay + motion.
- Problem (3-8 sec): Agitate the pain point. Be specific and visceral.
- Solution (8-18 sec): Present the offer. Show proof (testimonials, results, demos).
- CTA (18-25 sec): Clear next step with urgency. Text overlay + voiceover.
- Primary text: 2-3 lines max, hook + key benefit + CTA link. First line must hook without "See more".
- Headline: 40 chars max.
- Include script_body with [VISUAL] and [VO/TEXT] markers for each section.`,
        video_long: `FORMAT: Long-Form Video (60-120 sec)
- Hook (0-3 sec): Pattern interrupt with provocative statement or question.
- Story (3-30 sec): Relatable scenario or testimonial setup. Build emotional connection.
- Problem amplification (30-50 sec): Deepen the pain. Show consequences of inaction.
- Solution reveal (50-80 sec): Present offering as the bridge from pain to desire.
- Social proof (80-100 sec): Testimonials, numbers, credibility markers.
- CTA (100-120 sec): Urgency + clear next step.
- Include script_body with [SCENE], [VISUAL], [VO/TEXT], and [TIMING] markers.`,
        carousel: `FORMAT: Carousel Ad (3-5 cards)
- Each card must work standalone AND as part of a sequence.
- Card 1: Hook card — must stop scroll and create curiosity to swipe.
- Cards 2-4: Value/proof cards — each delivers one benefit, stat, or testimonial.
- Final card: CTA card — clear action step with urgency.
- headlines array should have one headline per card.
- body_variants should have one body text per card.`,
      };

      const systemPrompt = `You are an elite direct response copywriter with a track record of producing Meta ads that consistently outperform benchmarks. You write copy that converts because you understand buyer psychology, not just copywriting formulas.

Your writing principles:
1. SPECIFICITY SELLS — "297 investors funded in 90 days" beats "help many clients succeed"
2. HOOKS BREAK PATTERNS — The first line must make them stop scrolling. Use numbers, contrarian claims, direct address, or curiosity gaps.
3. EMOTION THEN LOGIC — Lead with feeling, support with facts. Every angle targets one primary emotion.
4. ONE IDEA PER AD — Don't dilute. Each script delivers one clear message with one clear CTA.
5. WRITE FOR THE SCROLL — Short paragraphs. One idea per line. Whitespace is your friend.

${formatInstructions[adFormat] || formatInstructions.static_image}

For each messaging angle, generate one production-ready ad script. These should be ready to hand directly to a designer or videographer with no additional creative direction needed.

Always respond with valid JSON matching this exact schema:
{
  "scripts": [
    {
      "title": "string - descriptive script name",
      "angle": "string - which brief angle this addresses",
      "emotional_driver": "string - primary emotion targeted",
      "headline": "string - primary headline (max 40 chars)",
      "headlines": ["string - 3 headline variants for A/B testing"],
      "body_copy": "string - primary ad text${isCarousel ? " (for card 1)" : ""}",
      "body_variants": ["string - ${isCarousel ? "one per card" : "2 variants for testing"}"],
      "cta": "string - specific call to action button text",
      "cta_url_suggestion": "string - suggested landing page path or UTM params",
      "hook": "string - the scroll-stopping opening line",
      "hook_variants": ["string - 2 alternative hooks"],
      ${isVideo ? `"script_body": "string - full video script with [TIMING], [VISUAL], [VO/TEXT] markers for each section",` : `"script_body": "string or null - text overlay copy if applicable, null for pure feed ads",`}
      "design_notes": "string - specific visual direction for the designer/videographer"
    }
  ]
}`;

      const userPrompt = `Generate production-ready ad scripts for ${client.name} (${client.industry || "industry not specified"}).
${client.description ? `Business: ${client.description}` : ""}

CREATIVE BRIEF: "${brief.title}"
OBJECTIVE: ${brief.objective}
FORMAT: ${adFormat}
PLATFORM: ${brief.platform || "meta"}

TARGET AUDIENCE:
${JSON.stringify(brief.target_audience, null, 2)}

CREATIVE DIRECTION: ${brief.creative_direction}

PERFORMANCE CONTEXT:
${brief.performance_snapshot ? `- Current CPL: $${brief.performance_snapshot.cpl?.toFixed(2) || "N/A"} | Total leads: ${brief.performance_snapshot.leads || 0} | Funded: ${brief.performance_snapshot.funded || 0}` : "- No performance data available"}
${clientSettings?.target_cpl ? `- Target CPL: $${clientSettings.target_cpl}` : ""}

MESSAGING ANGLES TO SCRIPT:
${angles.map((a: any, i: number) => `
${i + 1}. ANGLE: "${a.angle}"
   Emotional driver: ${a.emotional_driver || "not specified"}
   Hook: "${a.hook}"
   ${a.hook_variants ? `Alt hooks: ${a.hook_variants.map((h: string) => `"${h}"`).join(", ")}` : ""}
   Body theme: ${a.body_theme || "not specified"}
   Proof points: ${a.proof_points ? a.proof_points.join("; ") : "none specified"}
   Rationale: ${a.rationale}
`).join("")}

Write ${angles.length} complete, production-ready scripts — one per angle. Each must be directly executable by a designer/videographer with no additional creative direction needed. Include specific visual/design notes for each.
${approvedScriptsForRef && approvedScriptsForRef.length > 0 ? `
APPROVED SCRIPTS — match this tone, specificity, and quality level:
${approvedScriptsForRef.map((as: any) => `- "${as.title}" | Hook: "${as.hook}" | Headline: "${as.headline}" | CTA: "${as.cta}"`).join("\n")}
These were approved by the client. Match their voice and directness while creating fresh angles.` : ""}
${rejectedScripts && rejectedScripts.length > 0 ? `
PREVIOUSLY REJECTED SCRIPTS — learn from this feedback and avoid these patterns:
${rejectedScripts.map((rs: any) => `- "${rs.title}" (hook: "${rs.hook}") — REJECTED: ${rs.rejection_reason}`).join("\n")}
Do NOT reuse rejected hooks, headlines, or tones. Produce distinctly different creative.` : ""}`;

      const response = await callClaude(ANTHROPIC_API_KEY, systemPrompt, userPrompt);

      let scriptData;
      try {
        const jsonMatch = response.match(/```(?:json)?\s*([\s\S]*?)```/);
        const jsonStr = jsonMatch ? jsonMatch[1].trim() : response.trim();
        scriptData = JSON.parse(jsonStr);
      } catch (parseErr) {
        throw new Error(`Failed to parse scripts JSON: ${parseErr}. Raw: ${response.substring(0, 200)}`);
      }

      // Save each script
      const savedScripts = [];
      for (const script of scriptData.scripts || []) {
        const { data: saved, error: saveErr } = await supabase
          .from("ad_scripts")
          .insert({
            client_id: clientId,
            brief_id: briefId,
            title: script.title,
            headline: script.headline,
            headlines: script.headlines,
            body_copy: script.body_copy,
            body_variants: script.body_variants,
            cta: script.cta,
            hook: script.hook,
            script_body: script.script_body,
            platform: brief.platform || "meta",
            ad_format: adFormat,
            angle: script.angle,
            status: "draft",
            generated_by: "ai",
          })
          .select()
          .single();

        if (saveErr) {
          console.error(`Failed to save script: ${saveErr.message}`);
        } else {
          savedScripts.push(saved);
        }
      }

      // Update brief status
      await supabase
        .from("creative_briefs")
        .update({ status: "in_production" })
        .eq("id", briefId);

      return new Response(JSON.stringify({ success: true, scripts: savedScripts }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    throw new Error(`Unknown action: ${action}`);
  } catch (error) {
    console.error("generate-brief error:", error);
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
