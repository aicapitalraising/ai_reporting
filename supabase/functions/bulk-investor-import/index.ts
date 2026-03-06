import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { client_id, records, trigger_enrich } = await req.json();

    if (!client_id || !records?.length) {
      return new Response(JSON.stringify({ success: false, error: 'client_id and records required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    console.log(`[BulkImport] Processing ${records.length} records for client ${client_id}`);

    // Deduplicate by email (lowercase)
    const seen = new Set<string>();
    const uniqueRecords: any[] = [];
    for (const r of records) {
      const key = (r.email || r.external_id || `${r.first_name}-${r.last_name}-${r.phone}`).toLowerCase().trim();
      if (key && !seen.has(key)) {
        seen.add(key);
        uniqueRecords.push(r);
      }
    }

    console.log(`[BulkImport] ${uniqueRecords.length} unique records after dedup`);

    // Build funded_investor records
    const fundedRecords = uniqueRecords.map((r, i) => ({
      client_id,
      external_id: r.external_id || `bulk-${(r.email || r.phone || `${r.first_name}${r.last_name}${i}`).replace(/[^a-zA-Z0-9@._-]/g, '')}`,
      name: [r.first_name, r.last_name].filter(Boolean).join(' ') || r.name || null,
      funded_amount: parseFloat(r.funded_amount) || 0,
      source: r.source || 'bulk-import',
      funded_at: r.funded_at || new Date().toISOString(),
    }));

    // Batch insert in chunks of 200
    let importedCount = 0;
    let failedCount = 0;
    for (let i = 0; i < fundedRecords.length; i += 200) {
      const chunk = fundedRecords.slice(i, i + 200);
      const { error } = await supabase
        .from('funded_investors')
        .upsert(chunk, { onConflict: 'external_id,client_id', ignoreDuplicates: true });
      if (error) {
        console.error(`[BulkImport] Chunk ${i} error:`, error);
        failedCount += chunk.length;
      } else {
        importedCount += chunk.length;
      }
    }

    console.log(`[BulkImport] Imported ${importedCount}, failed ${failedCount}`);

    // Also insert into lead_enrichment for tracking
    const enrichRecords = uniqueRecords.map((r, i) => ({
      client_id,
      external_id: r.external_id || `bulk-${(r.email || r.phone || `${r.first_name}${r.last_name}${i}`).replace(/[^a-zA-Z0-9@._-]/g, '')}`,
      source: 'bulk-import-pending',
      first_name: r.first_name || null,
      last_name: r.last_name || null,
      address: r.address || null,
      city: r.city || null,
      state: r.state || null,
      zip: r.zip || null,
      enriched_phones: r.phone ? [{ phone: r.phone }] : [],
      enriched_emails: r.email ? [{ email: r.email }] : [],
      raw_data: { imported: true, original: r },
    }));

    for (let i = 0; i < enrichRecords.length; i += 200) {
      const chunk = enrichRecords.slice(i, i + 200);
      await supabase
        .from('lead_enrichment')
        .upsert(chunk, { onConflict: 'external_id,client_id', ignoreDuplicates: true })
        .then(({ error }) => {
          if (error) console.error(`[BulkImport] Enrichment record chunk ${i} error:`, error);
        });
    }

    // Trigger enrichment in background if requested
    if (trigger_enrich) {
      const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
      const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

      const enrichPromise = (async () => {
        let enrichedCount = 0;
        let enrichFailedCount = 0;
        const batchSize = 3;

        for (let i = 0; i < uniqueRecords.length; i += batchSize) {
          const batch = uniqueRecords.slice(i, i + batchSize);
          
          const promises = batch.map(async (r: any) => {
            try {
              const body: any = {
                client_id,
                external_id: r.external_id || `bulk-${(r.email || r.phone || `${r.first_name}${r.last_name}`).replace(/[^a-zA-Z0-9@._-]/g, '')}`,
              };
              if (r.phone) body.phone = r.phone.trim();
              if (r.email) body.email = r.email.trim();
              if (r.first_name) body.first_name = r.first_name.trim();
              if (r.last_name) body.last_name = r.last_name.trim();
              if (r.city) body.city = r.city.trim();
              if (r.state) body.state = r.state.trim();
              if (r.zip) body.zip = r.zip.trim();
              if (r.address) body.address = r.address.trim();

              if (!body.phone && !body.email && !body.city) return false;

              const res = await fetch(`${supabaseUrl}/functions/v1/enrich-lead-retargetiq`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${serviceKey}`,
                },
                body: JSON.stringify(body),
              });

              const data = await res.json();
              if (data.success) {
                enrichedCount++;
                return true;
              } else {
                enrichFailedCount++;
                return false;
              }
            } catch (e) {
              console.error(`[BulkEnrich] Error:`, e);
              enrichFailedCount++;
              return false;
            }
          });

          await Promise.all(promises);
          
          if (i + batchSize < uniqueRecords.length) {
            await new Promise(resolve => setTimeout(resolve, 500));
          }
          
          if ((i + batchSize) % 30 === 0) {
            console.log(`[BulkEnrich] Progress: ${Math.min(i + batchSize, uniqueRecords.length)}/${uniqueRecords.length} (${enrichedCount} enriched, ${enrichFailedCount} failed)`);
          }
        }

        console.log(`[BulkEnrich] Complete: ${enrichedCount} enriched, ${enrichFailedCount} failed out of ${uniqueRecords.length}`);
      })();

      if (typeof (globalThis as any).EdgeRuntime !== 'undefined') {
        (globalThis as any).EdgeRuntime.waitUntil(enrichPromise);
      } else {
        enrichPromise.catch(e => console.error('[BulkEnrich] Background error:', e));
      }
    }

    return new Response(JSON.stringify({
      success: true,
      imported: importedCount,
      failed: failedCount,
      unique_records: uniqueRecords.length,
      enriching: trigger_enrich || false,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('Bulk import error:', err);
    return new Response(JSON.stringify({ success: false, error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
