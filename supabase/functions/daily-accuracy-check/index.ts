import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface Discrepancy {
  clientId: string;
  clientName: string;
  date: string;
  metricType: string;
  expected: number;
  actual: number;
  diff: number;
}

interface OrphanSummary {
  clientId: string;
  clientName: string;
  orphanedCalls: number;
  orphanedFunded: number;
  callsLinked: number;
  fundedLinked: number;
}

interface StaleSyncClient {
  clientId: string;
  clientName: string;
  lastSyncAt: string | null;
  hoursSinceSync: number;
  syncTriggered: boolean;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  let startDate: string;
  let endDate: string;
  let mode = "daily"; // daily | weekly | monthly

  try {
    const body = await req.json();
    mode = body.mode || "daily";

    if (body.startDate && body.endDate) {
      startDate = body.startDate;
      endDate = body.endDate;
    } else if (mode === "weekly") {
      const end = new Date();
      end.setUTCDate(end.getUTCDate() - 1);
      const start = new Date(end);
      start.setUTCDate(start.getUTCDate() - 6);
      startDate = start.toISOString().split("T")[0];
      endDate = end.toISOString().split("T")[0];
    } else if (mode === "monthly") {
      const end = new Date();
      end.setUTCDate(end.getUTCDate() - 1);
      const start = new Date(end.getUTCFullYear(), end.getUTCMonth(), 1);
      startDate = start.toISOString().split("T")[0];
      endDate = end.toISOString().split("T")[0];
    } else {
      const d = new Date();
      d.setUTCDate(d.getUTCDate() - 1);
      startDate = d.toISOString().split("T")[0];
      endDate = startDate;
    }
  } catch {
    const d = new Date();
    d.setUTCDate(d.getUTCDate() - 1);
    startDate = d.toISOString().split("T")[0];
    endDate = startDate;
  }

  console.log(`[accuracy-check] Mode: ${mode}, range: ${startDate} to ${endDate}`);

  // Get all active clients with sync info
  const { data: clients, error: clientsError } = await supabase
    .from("clients")
    .select("id, name, ghl_api_key, ghl_location_id, last_ghl_sync_at, ghl_sync_status")
    .in("status", ["active", "onboarding"]);

  if (clientsError || !clients) {
    return new Response(JSON.stringify({ success: false, error: "Failed to fetch clients" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const discrepancies: Discrepancy[] = [];
  let autoFixedClients = 0;
  const clientsNeedingFix: Set<string> = new Set();
  const orphanSummaries: OrphanSummary[] = [];
  const staleSyncClients: StaleSyncClient[] = [];

  // ============================================================
  // PHASE 1: Check for stale syncs (>6 hours since last sync)
  // ============================================================
  console.log("[accuracy-check] PHASE 1: Checking for stale syncs...");
  const now = new Date();
  const STALE_THRESHOLD_HOURS = 6;

  for (const client of clients) {
    if (!client.ghl_api_key || !client.ghl_location_id) continue;

    const lastSync = client.last_ghl_sync_at ? new Date(client.last_ghl_sync_at) : null;
    const hoursSinceSync = lastSync
      ? (now.getTime() - lastSync.getTime()) / (1000 * 60 * 60)
      : Infinity;

    if (hoursSinceSync > STALE_THRESHOLD_HOURS) {
      let syncTriggered = false;
      try {
        console.log(`[accuracy-check] Client "${client.name}" stale (${Math.round(hoursSinceSync)}h since last sync), triggering sync...`);
        const res = await fetch(`${supabaseUrl}/functions/v1/sync-ghl-contacts`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${supabaseKey}`,
          },
          body: JSON.stringify({ client_id: client.id, syncType: "contacts", sinceDateDays: 14 }),
        });
        syncTriggered = res.ok;
      } catch (err) {
        console.error(`[accuracy-check] Failed to trigger sync for ${client.name}:`, err);
      }

      staleSyncClients.push({
        clientId: client.id,
        clientName: client.name,
        lastSyncAt: client.last_ghl_sync_at,
        hoursSinceSync: Math.round(hoursSinceSync),
        syncTriggered,
      });

      // Small delay between sync triggers
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }
  console.log(`[accuracy-check] Phase 1 complete: ${staleSyncClients.length} stale clients, syncs triggered`);

  // ============================================================
  // PHASE 2: Fix orphaned calls and funded investors
  // ============================================================
  console.log("[accuracy-check] PHASE 2: Fixing orphaned records...");

  for (const client of clients) {
    // Count orphaned calls
    const { count: orphanedCallCount } = await supabase
      .from("calls")
      .select("*", { count: "exact", head: true })
      .eq("client_id", client.id)
      .is("lead_id", null);

    // Count orphaned funded
    const { count: orphanedFundedCount } = await supabase
      .from("funded_investors")
      .select("*", { count: "exact", head: true })
      .eq("client_id", client.id)
      .is("lead_id", null);

    if ((orphanedCallCount || 0) > 0 || (orphanedFundedCount || 0) > 0) {
      console.log(`[accuracy-check] Client "${client.name}": ${orphanedCallCount} orphaned calls, ${orphanedFundedCount} orphaned funded`);

      // Trigger the sync-ghl-contacts function with syncType=link_only to just run linking
      // Since there's no link_only mode, use the contacts sync which includes linking
      let callsLinked = 0;
      let fundedLinked = 0;

      try {
        // Build lead lookup maps for this client
        const { data: leads } = await supabase
          .from("leads")
          .select("id, external_id, name, email, phone")
          .eq("client_id", client.id);

        const leadsByExternalId = new Map<string, { id: string; name: string | null; email: string | null; phone: string | null }>();
        const leadsByEmail = new Map<string, { id: string; name: string | null; email: string | null; phone: string | null }>();
        const leadsByName = new Map<string, { id: string; name: string | null; email: string | null; phone: string | null }>();
        const leadsByPhone = new Map<string, { id: string; name: string | null; email: string | null; phone: string | null }>();

        for (const lead of leads || []) {
          const ld = { id: lead.id, name: lead.name, email: lead.email, phone: lead.phone };
          if (lead.external_id) leadsByExternalId.set(lead.external_id, ld);
          if (lead.email) leadsByEmail.set(lead.email.toLowerCase().trim(), ld);
          if (lead.name) leadsByName.set(lead.name.toLowerCase().trim(), ld);
          if (lead.phone) leadsByPhone.set(lead.phone.replace(/\D/g, ''), ld);
        }

        function findLead(
          externalId: string | null,
          email: string | null,
          name: string | null,
          phone: string | null
        ) {
          if (externalId) {
            const m = leadsByExternalId.get(externalId);
            if (m) return m;
          }
          if (email) {
            const m = leadsByEmail.get(email.toLowerCase().trim());
            if (m) return m;
          }
          if (phone) {
            const m = leadsByPhone.get(phone.replace(/\D/g, ''));
            if (m) return m;
          }
          if (name) {
            const m = leadsByName.get(name.toLowerCase().trim());
            if (m) return m;
          }
          return undefined;
        }

        // Link orphaned calls
        if ((orphanedCallCount || 0) > 0) {
          const { data: orphanedCalls } = await supabase
            .from("calls")
            .select("id, external_id, contact_name, contact_email, contact_phone")
            .eq("client_id", client.id)
            .is("lead_id", null);

          for (const call of orphanedCalls || []) {
            const match = findLead(call.external_id, call.contact_email, call.contact_name, call.contact_phone);
            if (match) {
              await supabase
                .from("calls")
                .update({
                  lead_id: match.id,
                  contact_name: call.contact_name || match.name,
                  contact_email: call.contact_email || match.email,
                  contact_phone: call.contact_phone || match.phone,
                })
                .eq("id", call.id);
              callsLinked++;
            }
          }
        }

        // Link orphaned funded investors
        if ((orphanedFundedCount || 0) > 0) {
          const { data: orphanedFunded } = await supabase
            .from("funded_investors")
            .select("id, external_id, name")
            .eq("client_id", client.id)
            .is("lead_id", null);

          for (const fi of orphanedFunded || []) {
            const match = findLead(fi.external_id, null, fi.name, null);
            if (match) {
              // Get lead created_at for time_to_fund calculation
              const { data: fullLead } = await supabase
                .from("leads")
                .select("created_at")
                .eq("id", match.id)
                .maybeSingle();

              const { data: fiData } = await supabase
                .from("funded_investors")
                .select("funded_at")
                .eq("id", fi.id)
                .maybeSingle();

              const updates: Record<string, unknown> = { lead_id: match.id };
              if (fullLead?.created_at) {
                updates.first_contact_at = fullLead.created_at;
                if (fiData?.funded_at) {
                  updates.time_to_fund_days = Math.floor(
                    (new Date(fiData.funded_at).getTime() - new Date(fullLead.created_at).getTime()) / (1000 * 60 * 60 * 24)
                  );
                }
              }

              const { count } = await supabase
                .from("calls")
                .select("*", { count: "exact", head: true })
                .eq("lead_id", match.id);
              updates.calls_to_fund = count || 0;

              await supabase
                .from("funded_investors")
                .update(updates)
                .eq("id", fi.id);
              fundedLinked++;
            }
          }
        }
      } catch (err) {
        console.error(`[accuracy-check] Error linking orphans for ${client.name}:`, err);
      }

      orphanSummaries.push({
        clientId: client.id,
        clientName: client.name,
        orphanedCalls: orphanedCallCount || 0,
        orphanedFunded: orphanedFundedCount || 0,
        callsLinked,
        fundedLinked,
      });
    }
  }

  const totalCallsLinked = orphanSummaries.reduce((s, o) => s + o.callsLinked, 0);
  const totalFundedLinked = orphanSummaries.reduce((s, o) => s + o.fundedLinked, 0);
  console.log(`[accuracy-check] Phase 2 complete: linked ${totalCallsLinked} calls, ${totalFundedLinked} funded investors`);

  // ============================================================
  // PHASE 3: Check daily_metrics accuracy
  // ============================================================
  console.log("[accuracy-check] PHASE 3: Checking daily metrics accuracy...");

  const current = new Date(startDate + "T00:00:00Z");
  const endDt = new Date(endDate + "T00:00:00Z");

  while (current <= endDt) {
    const checkDate = current.toISOString().split("T")[0];
    const dayStart = `${checkDate}T00:00:00.000Z`;
    const dayEnd = `${checkDate}T23:59:59.999Z`;

    for (const client of clients) {
      const { data: metricsRow } = await supabase
        .from("daily_metrics")
        .select("leads, spam_leads, calls, showed_calls, reconnect_calls, reconnect_showed, funded_investors, funded_dollars")
        .eq("client_id", client.id)
        .eq("date", checkDate)
        .maybeSingle();

      const { count: leadsCount } = await supabase
        .from("leads")
        .select("*", { count: "exact", head: true })
        .eq("client_id", client.id)
        .eq("is_spam", false)
        .gte("created_at", dayStart)
        .lte("created_at", dayEnd);

      const { count: nullSpamCount } = await supabase
        .from("leads")
        .select("*", { count: "exact", head: true })
        .eq("client_id", client.id)
        .is("is_spam", null)
        .gte("created_at", dayStart)
        .lte("created_at", dayEnd);

      const expectedLeads = (leadsCount || 0) + (nullSpamCount || 0);

      const { count: expectedCalls } = await supabase
        .from("calls")
        .select("*", { count: "exact", head: true })
        .eq("client_id", client.id)
        .neq("is_reconnect", true)
        .gte("booked_at", dayStart)
        .lte("booked_at", dayEnd);

      const { count: expectedShowed } = await supabase
        .from("calls")
        .select("*", { count: "exact", head: true })
        .eq("client_id", client.id)
        .eq("showed", true)
        .neq("is_reconnect", true)
        .gte("scheduled_at", dayStart)
        .lte("scheduled_at", dayEnd);

      const { count: expectedFunded } = await supabase
        .from("funded_investors")
        .select("*", { count: "exact", head: true })
        .eq("client_id", client.id)
        .gte("funded_at", dayStart)
        .lte("funded_at", dayEnd);

      const actualLeads = metricsRow?.leads ?? 0;
      const actualCalls = metricsRow?.calls ?? 0;
      const actualShowed = metricsRow?.showed_calls ?? 0;
      const actualFunded = metricsRow?.funded_investors ?? 0;

      const checks = [
        { type: "leads", expected: expectedLeads, actual: actualLeads },
        { type: "calls", expected: expectedCalls || 0, actual: actualCalls },
        { type: "showed_calls", expected: expectedShowed || 0, actual: actualShowed },
        { type: "funded_investors", expected: expectedFunded || 0, actual: actualFunded },
      ];

      for (const check of checks) {
        if (check.expected !== check.actual) {
          clientsNeedingFix.add(client.id);
          discrepancies.push({
            clientId: client.id,
            clientName: client.name,
            date: checkDate,
            metricType: check.type,
            expected: check.expected,
            actual: check.actual,
            diff: check.expected - check.actual,
          });

          await supabase.from("sync_accuracy_log").insert({
            client_id: client.id,
            check_date: checkDate,
            metric_type: check.type,
            expected_count: check.expected,
            actual_count: check.actual,
            discrepancy: check.expected - check.actual,
            auto_fixed: true,
          }).then(() => {}).catch(() => {});
        }
      }
    }

    current.setUTCDate(current.getUTCDate() + 1);
  }

  // Auto-fix: trigger recalculation for each client that had discrepancies
  for (const cid of clientsNeedingFix) {
    try {
      console.log(`[accuracy-check] Triggering recalc for client ${cid} (${startDate} to ${endDate})`);
      await fetch(`${supabaseUrl}/functions/v1/recalculate-daily-metrics`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${supabaseKey}`,
        },
        body: JSON.stringify({ clientId: cid, startDate, endDate }),
      });
      autoFixedClients++;
    } catch (err) {
      console.error(`[accuracy-check] Failed to auto-fix client ${cid}:`, err);
    }
  }

  console.log(
    `[accuracy-check] Complete: ${discrepancies.length} discrepancies across ${clientsNeedingFix.size} clients, ${autoFixedClients} auto-fixed, ${totalCallsLinked} calls linked, ${totalFundedLinked} funded linked`
  );

  return new Response(
    JSON.stringify({
      success: true,
      mode,
      startDate,
      endDate,
      staleSyncs: {
        count: staleSyncClients.length,
        clients: staleSyncClients,
      },
      orphanedRecords: {
        clientsWithOrphans: orphanSummaries.length,
        totalCallsLinked,
        totalFundedLinked,
        details: orphanSummaries,
      },
      metricsAccuracy: {
        discrepanciesFound: discrepancies.length,
        clientsWithIssues: clientsNeedingFix.size,
        autoFixedClients,
        discrepancies,
      },
    }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
});
