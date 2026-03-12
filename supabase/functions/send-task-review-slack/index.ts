import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const GATEWAY_URL = "https://connector-gateway.lovable.dev/slack/api";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const SLACK_API_KEY = Deno.env.get("SLACK_API_KEY");
    if (!SLACK_API_KEY) {
      throw new Error("SLACK_API_KEY is not configured");
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const { taskId, clientId } = await req.json();

    if (!taskId || !clientId) {
      throw new Error("taskId and clientId are required");
    }

    // Fetch task
    const { data: task, error: taskErr } = await supabase
      .from("tasks")
      .select("*")
      .eq("id", taskId)
      .single();
    if (taskErr) throw new Error(`Failed to fetch task: ${taskErr.message}`);

    // Fetch client name
    const { data: client, error: clientErr } = await supabase
      .from("clients")
      .select("name")
      .eq("id", clientId)
      .single();
    if (clientErr) throw new Error(`Failed to fetch client: ${clientErr.message}`);

    // Fetch slack channel from client_settings
    const { data: settings, error: settingsErr } = await supabase
      .from("client_settings")
      .select("slack_review_channel_id")
      .eq("client_id", clientId)
      .maybeSingle();

    const channelId = settings?.slack_review_channel_id;
    if (!channelId) {
      return new Response(
        JSON.stringify({ success: false, reason: "No Slack channel configured for this client" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch comments
    const { data: comments = [] } = await supabase
      .from("task_comments")
      .select("*")
      .eq("task_id", taskId)
      .order("created_at", { ascending: true });

    // Build Slack blocks
    const blocks: any[] = [
      {
        type: "header",
        text: { type: "plain_text", text: "📋 Task Ready for Review", emoji: true },
      },
      { type: "divider" },
      {
        type: "section",
        fields: [
          { type: "mrkdwn", text: `*Title:*\n${task.title}` },
          { type: "mrkdwn", text: `*Client:*\n${client.name}` },
        ],
      },
    ];

    if (task.description) {
      blocks.push({
        type: "section",
        text: { type: "mrkdwn", text: `*Description:*\n${task.description}` },
      });
    }

    if (comments && comments.length > 0) {
      const commentLines = comments
        .map((c: any) => `• *${c.author_name}:* ${c.content}`)
        .join("\n");
      blocks.push({ type: "divider" });
      blocks.push({
        type: "section",
        text: {
          type: "mrkdwn",
          text: `*💬 Comments (${comments.length}):*\n${commentLines}`,
        },
      });
    }

    // Send to Slack
    const slackRes = await fetch(`${GATEWAY_URL}/chat.postMessage`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "X-Connection-Api-Key": SLACK_API_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        channel: channelId,
        text: `📋 Task Ready for Review: ${task.title}`,
        blocks,
      }),
    });

    const slackData = await slackRes.json();
    if (!slackRes.ok || !slackData.ok) {
      throw new Error(`Slack API call failed [${slackRes.status}]: ${JSON.stringify(slackData)}`);
    }

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("Error sending Slack review notification:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
