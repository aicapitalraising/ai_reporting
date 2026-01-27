import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { audioBase64, clientId, clientName, isPublicRecording, durationSeconds } = await req.json();

    if (!audioBase64 || !clientId) {
      return new Response(
        JSON.stringify({ error: "Missing audioBase64 or clientId" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    if (!GEMINI_API_KEY) {
      return new Response(
        JSON.stringify({ error: "Gemini API key not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Processing voice note for client:", clientId);

    // Step 1: Transcribe audio using Gemini API
    const transcriptResponse = await fetch(
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
                  inline_data: {
                    mime_type: "audio/webm",
                    data: audioBase64
                  }
                },
                {
                  text: "Transcribe this audio recording accurately. Only output the transcription text, nothing else. If you cannot hear any speech or the audio is unclear, respond with 'No speech detected'."
                }
              ]
            }
          ],
          generationConfig: {
            temperature: 0.1,
            maxOutputTokens: 4096,
          },
        }),
      }
    );

    if (!transcriptResponse.ok) {
      const errorText = await transcriptResponse.text();
      console.error("Transcription error:", transcriptResponse.status, errorText);
      
      if (transcriptResponse.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      return new Response(
        JSON.stringify({ error: "Failed to transcribe audio" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const transcriptData = await transcriptResponse.json();
    const transcript = transcriptData.candidates?.[0]?.content?.parts?.[0]?.text || "";

    if (!transcript.trim() || transcript.toLowerCase().includes("no speech detected")) {
      return new Response(
        JSON.stringify({ error: "No speech detected in audio" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Transcript:", transcript.substring(0, 100) + "...");

    // Step 2: Generate summary and extract action items
    const analysisResponse = await fetch(
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
                  text: `You are an expert at analyzing meeting transcripts and extracting actionable insights.

You are analyzing a voice note recording from an agency meeting or call with a client${clientName ? ` named "${clientName}"` : ""}.

Transcript:
${transcript}

Based on this transcript, extract:
1. A short descriptive title (max 60 characters)
2. A concise 2-3 sentence summary of the key points discussed
3. Any action items or tasks mentioned that need to be done

Return your response in the following JSON format:
{
  "title": "Short title here",
  "summary": "2-3 sentence summary here",
  "action_items": [
    {"title": "Task title", "description": "Optional description", "priority": "low|medium|high"}
  ]
}

Only return valid JSON, no other text.`
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

    if (!analysisResponse.ok) {
      const errorText = await analysisResponse.text();
      console.error("Analysis error:", analysisResponse.status, errorText);
      return new Response(
        JSON.stringify({ error: "Failed to analyze transcript" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const analysisData = await analysisResponse.json();
    const analysisContent = analysisData.candidates?.[0]?.content?.parts?.[0]?.text || "";
    
    console.log("Analysis response:", analysisContent);

    // Parse the JSON response
    let title = "Voice Note";
    let summary = "";
    let actionItems: Array<{ title: string; description?: string; priority: string }> = [];

    try {
      // Extract JSON from the response (handle potential markdown code blocks)
      let jsonStr = analysisContent;
      const jsonMatch = analysisContent.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (jsonMatch) {
        jsonStr = jsonMatch[1];
      }
      
      const parsed = JSON.parse(jsonStr.trim());
      title = parsed.title || title;
      summary = parsed.summary || "";
      actionItems = parsed.action_items || [];
    } catch (parseError) {
      console.error("Error parsing analysis JSON:", parseError);
      // Fallback: use transcript as summary
      summary = transcript.substring(0, 200) + (transcript.length > 200 ? "..." : "");
    }

    console.log("Extracted:", { title, summary, actionItemsCount: actionItems.length });

    // Step 3: Save voice note to database
    const { data: voiceNote, error: insertError } = await supabase
      .from("client_voice_notes")
      .insert({
        client_id: clientId,
        title,
        duration_seconds: durationSeconds || 0,
        transcript,
        summary,
        action_items: actionItems,
        recorded_by: isPublicRecording ? "Client" : "Agency",
        is_public_recording: isPublicRecording || false,
      })
      .select()
      .single();

    if (insertError) {
      console.error("Insert error:", insertError);
      return new Response(
        JSON.stringify({ error: "Failed to save voice note" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Voice note saved:", voiceNote.id);

    // Step 4: Create pending tasks for approval
    if (actionItems.length > 0) {
      const pendingTasks = actionItems.map((item) => ({
        voice_note_id: voiceNote.id,
        client_id: clientId,
        title: item.title,
        description: item.description || null,
        priority: item.priority || "medium",
        status: "pending",
      }));

      const { error: tasksError } = await supabase
        .from("pending_meeting_tasks")
        .insert(pendingTasks);

      if (tasksError) {
        console.error("Error creating pending tasks:", tasksError);
      } else {
        console.log("Created", pendingTasks.length, "pending tasks");
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        voiceNote: {
          id: voiceNote.id,
          title,
          summary,
          transcript,
          action_items: actionItems,
          duration_seconds: durationSeconds,
        },
        tasksCreated: actionItems.length,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error processing voice note:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
