import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

declare const EdgeRuntime: { waitUntil: (promise: Promise<any>) => void } | undefined;

interface StepResult {
  step: string;
  success: boolean;
  duration_ms: number;
  details?: string;
  error?: string;
}

async function callFunction(
  supabaseUrl: string,
  supabaseKey: string,
  functionName: string,
  body: Record<string, unknown> = {},
  timeoutMs: number = 120000
): Promise<{ success: boolean; data?: any; error?: string }> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    const response = await fetch(`${supabaseUrl}/functions/v1/${functionName}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${supabaseKey}`,
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    clearTimeout(timeout);
    const data = await response.json();
    return { success: !data.error && response.ok, data, error: data.error };
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") {
      return { success: false, error: `Timeout after ${timeoutMs / 1000}s` };
    }
    return { success: false, error: err instanceof Error ? err.message : "Unknown" };
  }
}

async function createAlertTask(
  supabase: any,
  title: string,
  description: string,
  priority: string = "high"
) {
  try {
    await supabase.from("tasks").insert({
      title,
      description,
      priority,
      status: "todo",
      stage: "backlog",
      created_by: "system",
    });
    console.log(`[daily-master-sync] Created alert task: ${title}`);
  } catch (err) {
    console.error(`[daily-master-sync] Failed to create alert task:`, err);
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  let skipSteps: string[] = [];
  try {
    const body = await req.json();
    skipSteps = body.skipSteps || [];
  } catch {}

  console.log(`[daily-master-sync] Starting daily master sync pipeline`);

  const doSync = async () => {
    const results: StepResult[] = [];

    // ── Step 0: Dead-letter cleanup — reset stuck syncs ──
    {
      const start = Date.now();
      console.log(`[daily-master-sync] Step 0: Dead-letter cleanup for stuck syncs`);
      let resetCount = 0;
      const resetDetails: string[] = [];

      try {
        // Reset GHL syncs stuck in "syncing" for >30 minutes (or with null last_ghl_sync_at)
        const thirtyMinAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString();

        // Clients stuck in "syncing" with null sync timestamp (never completed)
        const { data: stuckGhlNull } = await supabase
          .from("clients")
          .select("id, name")
          .eq("ghl_sync_status", "syncing")
          .is("last_ghl_sync_at", null);

        if (stuckGhlNull && stuckGhlNull.length > 0) {
          for (const client of stuckGhlNull) {
            await supabase
              .from("clients")
              .update({
                ghl_sync_status: "error",
                ghl_sync_error: "Auto-reset: stuck in syncing state (never completed)",
              })
              .eq("id", client.id);
            resetDetails.push(`GHL: ${client.name} (never completed)`);
            resetCount++;
          }
        }

        // Clients stuck in "syncing" with stale last_ghl_sync_at (>30 min ago)
        const { data: stuckGhlStale } = await supabase
          .from("clients")
          .select("id, name")
          .eq("ghl_sync_status", "syncing")
          .lt("last_ghl_sync_at", thirtyMinAgo);

        if (stuckGhlStale && stuckGhlStale.length > 0) {
          for (const client of stuckGhlStale) {
            await supabase
              .from("clients")
              .update({
                ghl_sync_status: "error",
                ghl_sync_error: "Auto-reset: stuck in syncing state (>30 min)",
              })
              .eq("id", client.id);
            resetDetails.push(`GHL: ${client.name} (stale >30min)`);
            resetCount++;
          }
        }

        // Reset HubSpot syncs stuck in "syncing" with null last_hubspot_sync_at
        const { data: stuckHubspotNull } = await supabase
          .from("clients")
          .select("id, name")
          .eq("hubspot_sync_status", "syncing")
          .is("last_hubspot_sync_at", null);

        if (stuckHubspotNull && stuckHubspotNull.length > 0) {
          for (const client of stuckHubspotNull) {
            await supabase
              .from("clients")
              .update({
                hubspot_sync_status: "error",
                hubspot_sync_error: "Auto-reset: stuck in syncing state (never completed)",
              })
              .eq("id", client.id);
            resetDetails.push(`HubSpot: ${client.name} (never completed)`);
            resetCount++;
          }
        }

        // HubSpot stuck in "syncing" with stale timestamp
        const { data: stuckHubspotStale } = await supabase
          .from("clients")
          .select("id, name")
          .eq("hubspot_sync_status", "syncing")
          .lt("last_hubspot_sync_at", thirtyMinAgo);

        if (stuckHubspotStale && stuckHubspotStale.length > 0) {
          for (const client of stuckHubspotStale) {
            await supabase
              .from("clients")
              .update({
                hubspot_sync_status: "error",
                hubspot_sync_error: "Auto-reset: stuck in syncing state (>30 min)",
              })
              .eq("id", client.id);
            resetDetails.push(`HubSpot: ${client.name} (stale >30min)`);
            resetCount++;
          }
        }

        if (resetCount > 0) {
          console.log(`[daily-master-sync] Reset ${resetCount} stuck sync(s): ${resetDetails.join(", ")}`);
          await createAlertTask(supabase,
            `🔄 Auto-reset ${resetCount} stuck sync(s)`,
            `Dead-letter cleanup reset the following stuck syncs:\n${resetDetails.map(d => `- ${d}`).join("\n")}\n\nThese clients will be retried on the next sync cycle.`,
            "medium"
          );
        }

        results.push({
          step: "dead-letter-cleanup",
          success: true,
          duration_ms: Date.now() - start,
          details: resetCount > 0 ? `Reset ${resetCount}: ${resetDetails.join(", ")}` : "No stuck syncs found",
        });
      } catch (err) {
        console.error(`[daily-master-sync] Dead-letter cleanup error:`, err);
        results.push({
          step: "dead-letter-cleanup",
          success: false,
          duration_ms: Date.now() - start,
          error: err instanceof Error ? err.message : "Unknown",
        });
      }
    }

    // ── Step 1: Meta Ads Daily (campaigns, ad sets, ads + backfill) ──
    if (!skipSteps.includes("meta")) {
      const start = Date.now();
      console.log(`[daily-master-sync] Step 1: sync-meta-ads-daily`);
      const res = await callFunction(supabaseUrl, supabaseKey, "sync-meta-ads-daily");
      const duration = Date.now() - start;
      results.push({
        step: "sync-meta-ads-daily",
        success: res.success,
        duration_ms: duration,
        details: res.data?.message,
        error: res.error,
      });
      if (!res.success) {
        await createAlertTask(supabase,
          "⚠️ Meta Ads daily sync failed",
          `The daily Meta Ads sync failed with error: ${res.error}. Check the META_SHARED_ACCESS_TOKEN and client ad account configurations.`
        );
      }
      // Wait for Meta to finish processing in background
      await new Promise(r => setTimeout(r, 10000));
    }

    // ── Step 2: GHL All Clients (contacts, calendar, pipelines) ──
    if (!skipSteps.includes("ghl")) {
      const start = Date.now();
      console.log(`[daily-master-sync] Step 2: sync-ghl-all-clients`);
      const res = await callFunction(supabaseUrl, supabaseKey, "sync-ghl-all-clients");
      const duration = Date.now() - start;
      results.push({
        step: "sync-ghl-all-clients",
        success: res.success,
        duration_ms: duration,
        details: res.data?.message,
        error: res.error,
      });
      if (!res.success) {
        await createAlertTask(supabase,
          "⚠️ GHL sync failed",
          `The daily GHL all-clients sync failed: ${res.error}. Check GHL API keys.`
        );
      }
      await new Promise(r => setTimeout(r, 10000));
    }

    // ── Step 3: HubSpot All Clients ──
    if (!skipSteps.includes("hubspot")) {
      const start = Date.now();
      console.log(`[daily-master-sync] Step 3: sync-hubspot-all-clients`);
      const res = await callFunction(supabaseUrl, supabaseKey, "sync-hubspot-all-clients");
      const duration = Date.now() - start;
      results.push({
        step: "sync-hubspot-all-clients",
        success: res.success,
        duration_ms: duration,
        details: res.data?.message,
        error: res.error,
      });
      if (!res.success) {
        await createAlertTask(supabase,
          "⚠️ HubSpot sync failed",
          `The daily HubSpot sync failed: ${res.error}. Check HubSpot access tokens.`
        );
      }
      await new Promise(r => setTimeout(r, 5000));
    }

    // ── Step 4: Recalculate Daily Metrics ──
    if (!skipSteps.includes("recalculate")) {
      const start = Date.now();
      console.log(`[daily-master-sync] Step 4: recalculate-daily-metrics`);
      const res = await callFunction(supabaseUrl, supabaseKey, "recalculate-daily-metrics");
      const duration = Date.now() - start;
      results.push({
        step: "recalculate-daily-metrics",
        success: res.success,
        duration_ms: duration,
        details: `${res.data?.totalUpdated || 0} days updated`,
        error: res.error,
      });
      await new Promise(r => setTimeout(r, 5000));
    }

    // ── Step 5: Daily Accuracy Check ──
    if (!skipSteps.includes("accuracy")) {
      const start = Date.now();
      console.log(`[daily-master-sync] Step 5: daily-accuracy-check`);
      const res = await callFunction(supabaseUrl, supabaseKey, "daily-accuracy-check");
      const duration = Date.now() - start;
      const discrepancies = res.data?.discrepanciesFound || 0;
      results.push({
        step: "daily-accuracy-check",
        success: res.success,
        duration_ms: duration,
        details: `${discrepancies} discrepancies, ${res.data?.autoFixedClients || 0} auto-fixed`,
        error: res.error,
      });
      if (discrepancies > 0) {
        await createAlertTask(supabase,
          `📊 ${discrepancies} data discrepancies auto-fixed`,
          `The daily accuracy check found ${discrepancies} discrepancies across ${res.data?.clientsWithIssues || 0} clients and auto-fixed ${res.data?.autoFixedClients || 0}. Review sync_accuracy_log for details.`,
          "medium"
        );
      }
    }

    // ── Step 6: Creative Brief Auto-Generation (high-CPA clients) ──
    if (!skipSteps.includes("creative")) {
      const start = Date.now();
      console.log(`[daily-master-sync] Step 6: Creative brief auto-generation check`);
      try {
        // Find clients where CPL exceeds target by >25%
        const { data: clientSettings } = await supabase
          .from("client_settings" as any)
          .select("client_id, target_cpl")
          .not("target_cpl", "is", null);

        let briefsGenerated = 0;
        const briefErrors: string[] = [];

        if (clientSettings && clientSettings.length > 0) {
          for (const cs of clientSettings) {
            // Check if client already has a pending brief (don't spam)
            const { data: existingBriefs } = await supabase
              .from("creative_briefs" as any)
              .select("id")
              .eq("client_id", cs.client_id)
              .eq("status", "pending")
              .limit(1);

            if (existingBriefs && existingBriefs.length > 0) continue;

            // Get recent CPL from daily_metrics (last 7 days)
            const sevenDaysAgo = new Date(Date.now() - 7 * 86400000).toISOString().split("T")[0];
            const { data: metrics } = await supabase
              .from("daily_metrics" as any)
              .select("cost_per_lead")
              .eq("client_id", cs.client_id)
              .gte("date", sevenDaysAgo)
              .not("cost_per_lead", "is", null);

            if (!metrics || metrics.length === 0) continue;

            const avgCpl = metrics.reduce((s: number, m: any) => s + (m.cost_per_lead || 0), 0) / metrics.length;
            const threshold = (cs as any).target_cpl * 1.25;

            if (avgCpl > threshold) {
              console.log(`[daily-master-sync] Client ${cs.client_id}: CPL $${avgCpl.toFixed(2)} exceeds target $${(cs as any).target_cpl} by >25%, triggering brief`);
              const briefRes = await callFunction(supabaseUrl, supabaseKey, "generate-brief", {
                action: "generate_brief",
                clientId: cs.client_id,
                platform: "meta",
                reason: "high_cpa",
              }, 90000);

              if (briefRes.success) {
                briefsGenerated++;
              } else {
                briefErrors.push(`${cs.client_id}: ${briefRes.error}`);
              }
            }
          }
        }

        results.push({
          step: "creative-auto-brief",
          success: briefErrors.length === 0,
          duration_ms: Date.now() - start,
          details: `${briefsGenerated} briefs generated${briefErrors.length > 0 ? `, ${briefErrors.length} errors: ${briefErrors.slice(0, 3).join("; ")}` : ""}`,
        });

        if (briefsGenerated > 0) {
          await createAlertTask(supabase,
            `AI generated ${briefsGenerated} creative brief(s)`,
            `Auto-generated briefs for clients with CPL >25% above target. Review and approve in the Creative Pipeline.`,
            "medium"
          );
        }
      } catch (err) {
        results.push({
          step: "creative-auto-brief",
          success: false,
          duration_ms: Date.now() - start,
          error: err instanceof Error ? err.message : "Unknown",
        });
      }
    }

    // ── Step 7: Meta Token Expiry Check ──
    if (!skipSteps.includes("token_check")) {
      const start = Date.now();
      console.log(`[daily-master-sync] Step 7: Meta token health check`);
      try {
        const metaToken = Deno.env.get("META_SHARED_ACCESS_TOKEN");
        if (metaToken) {
          // Call Meta debug_token to check expiry (15s timeout)
          const tokenController = new AbortController();
          const tokenTimeout = setTimeout(() => tokenController.abort(), 15000);
          const debugRes = await fetch(
            `https://graph.facebook.com/v21.0/debug_token?input_token=${metaToken}&access_token=${metaToken}`,
            { signal: tokenController.signal }
          );
          clearTimeout(tokenTimeout);
          const debugData = await debugRes.json();
          const expiresAt = debugData?.data?.expires_at;

          if (expiresAt && expiresAt > 0) {
            const expiryDate = new Date(expiresAt * 1000);
            const daysUntilExpiry = Math.round((expiryDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));

            results.push({
              step: "meta-token-check",
              success: daysUntilExpiry > 7,
              duration_ms: Date.now() - start,
              details: `Token expires in ${daysUntilExpiry} days (${expiryDate.toISOString().split("T")[0]})`,
            });

            if (daysUntilExpiry <= 7) {
              await createAlertTask(supabase,
                `🔑 Meta token expires in ${daysUntilExpiry} days`,
                `The META_SHARED_ACCESS_TOKEN expires on ${expiryDate.toISOString().split("T")[0]}. Generate a new long-lived token via Graph API Explorer (App ID: 815113834838322) and update the secret.`,
                daysUntilExpiry <= 3 ? "urgent" : "high"
              );
            }
          } else if (debugData?.data?.is_valid === false) {
            results.push({
              step: "meta-token-check",
              success: false,
              duration_ms: Date.now() - start,
              error: "Token is invalid or expired",
            });
            await createAlertTask(supabase,
              "🚨 Meta token is EXPIRED",
              "The META_SHARED_ACCESS_TOKEN is invalid. All Meta Ads syncs are broken. Generate a new token immediately.",
              "urgent"
            );
          } else {
            // Token doesn't expire (app token) or unknown
            results.push({
              step: "meta-token-check",
              success: true,
              duration_ms: Date.now() - start,
              details: "Token is valid (no expiry or long-lived)",
            });
          }
        } else {
          results.push({
            step: "meta-token-check",
            success: false,
            duration_ms: Date.now() - start,
            error: "META_SHARED_ACCESS_TOKEN not configured",
          });
        }
      } catch (err) {
        results.push({
          step: "meta-token-check",
          success: false,
          duration_ms: Date.now() - start,
          error: err instanceof Error ? err.message : "Unknown",
        });
      }
    }

    // ── Summary ──
    const succeeded = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;
    const totalDuration = results.reduce((s, r) => s + r.duration_ms, 0);

    console.log(`[daily-master-sync] Pipeline complete: ${succeeded}/${results.length} steps succeeded in ${Math.round(totalDuration / 1000)}s`);

    // Log to sync_logs
    await supabase.from("sync_logs").insert({
      client_id: "00000000-0000-0000-0000-000000000000", // System-level
      sync_type: "daily-master-sync",
      status: failed === 0 ? "completed" : "partial",
      records_synced: succeeded,
      error_message: failed > 0 ? results.filter(r => !r.success).map(r => `${r.step}: ${r.error}`).join("; ") : null,
      completed_at: new Date().toISOString(),
    });

    return { success: failed === 0, steps: results, totalDuration_ms: totalDuration };
  };

  if (typeof EdgeRuntime !== "undefined") {
    EdgeRuntime.waitUntil(doSync());
    return new Response(
      JSON.stringify({ success: true, message: "Daily master sync started (background)" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } else {
    const result = await doSync();
    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
