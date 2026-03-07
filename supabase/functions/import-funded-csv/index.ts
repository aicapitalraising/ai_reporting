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
    const { bucket, file_path, client_id } = await req.json();

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Download CSV from storage
    const { data: fileData, error: dlError } = await supabase.storage
      .from(bucket || 'imports')
      .download(file_path);

    if (dlError || !fileData) {
      return new Response(JSON.stringify({ success: false, error: `Download failed: ${dlError?.message}` }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const csvText = await fileData.text();
    const lines = csvText.split('\n').filter(l => l.trim());
    const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/\s+/g, '_'));

    console.log(`[ImportFundedCSV] Headers: ${headers.join(', ')}`);
    console.log(`[ImportFundedCSV] Processing ${lines.length - 1} rows`);

    const seen = new Set<string>();
    const fundedRecords: any[] = [];
    const enrichRecords: any[] = [];

    for (let i = 1; i < lines.length; i++) {
      // Simple CSV parse (handles basic cases)
      const values = lines[i].split(',').map(v => v.trim().replace(/^"|"$/g, ''));
      const row: Record<string, string> = {};
      headers.forEach((h, idx) => { row[h] = values[idx] || ''; });

      const first_name = (row['first_name'] || '').trim();
      const last_name = (row['last_name'] || '').trim();
      const phone = (row['phone_number'] || row['phone'] || '').trim();
      const email = (row['email'] || '').trim().toLowerCase().replace(/\\/g, '');
      const funded_amount = parseFloat((row['funded_amount'] || '0').replace(/[$,]/g, '')) || 0;
      const city = (row['city'] || '').trim();
      const state = (row['state'] || '').trim();
      const zip = (row['zip_code'] || row['zip'] || '').trim();

      if (!email && !phone && !first_name) continue;

      const key = (email || phone || `${first_name}-${last_name}`).toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);

      const name = [first_name, last_name].filter(Boolean).join(' ') || null;
      const external_id = `bulk-${(email || phone || `${first_name}${last_name}`).replace(/[^a-zA-Z0-9@._-]/g, '')}`;

      fundedRecords.push({
        client_id,
        external_id,
        name,
        funded_amount,
        source: 'bulk-import',
        funded_at: new Date().toISOString(),
      });

      enrichRecords.push({
        client_id,
        external_id,
        source: 'bulk-import-pending',
        first_name: first_name || null,
        last_name: last_name || null,
        city: city || null,
        state: state || null,
        zip: zip || null,
        enriched_phones: phone ? [{ phone }] : [],
        enriched_emails: email ? [{ email }] : [],
        raw_data: { imported: true },
      });
    }

    console.log(`[ImportFundedCSV] ${fundedRecords.length} unique records after dedup`);

    // Batch upsert funded_investors
    let importedCount = 0;
    let failedCount = 0;
    for (let i = 0; i < fundedRecords.length; i += 200) {
      const chunk = fundedRecords.slice(i, i + 200);
      const { error } = await supabase
        .from('funded_investors')
        .upsert(chunk, { onConflict: 'external_id,client_id', ignoreDuplicates: true });
      if (error) {
        console.error(`[ImportFundedCSV] Funded chunk ${i} error:`, error);
        failedCount += chunk.length;
      } else {
        importedCount += chunk.length;
      }
    }

    // Batch upsert lead_enrichment
    for (let i = 0; i < enrichRecords.length; i += 200) {
      const chunk = enrichRecords.slice(i, i + 200);
      const { error } = await supabase
        .from('lead_enrichment')
        .upsert(chunk, { onConflict: 'external_id,client_id', ignoreDuplicates: true });
      if (error) {
        console.error(`[ImportFundedCSV] Enrichment chunk ${i} error:`, error);
      }
    }

    console.log(`[ImportFundedCSV] Complete: imported=${importedCount}, failed=${failedCount}`);

    return new Response(JSON.stringify({
      success: true,
      imported: importedCount,
      failed: failedCount,
      unique_records: fundedRecords.length,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('Import funded CSV error:', err);
    return new Response(JSON.stringify({ success: false, error: err.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
