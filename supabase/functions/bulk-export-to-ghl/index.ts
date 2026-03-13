import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const GHL_BASE_URL = 'https://services.leadconnectorhq.com';
const DELAY_MS = 300;

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

interface QuestionAnswer {
  question: string;
  answer: string | string[] | null;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    const { client_id } = await req.json();
    if (!client_id) {
      return new Response(JSON.stringify({ success: false, error: 'client_id required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get client GHL credentials
    const { data: client, error: clientError } = await supabase
      .from('clients')
      .select('id, name, ghl_api_key, ghl_location_id')
      .eq('id', client_id)
      .single();

    if (clientError || !client) {
      return new Response(JSON.stringify({ success: false, error: 'Client not found' }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!client.ghl_api_key || !client.ghl_location_id) {
      return new Response(JSON.stringify({ success: false, error: 'Client has no GHL credentials configured' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Fetch all leads with questions and external_id (GHL contact ID)
    const { data: leads, error: leadsError } = await supabase
      .from('leads')
      .select('id, external_id, name, email, phone, questions')
      .eq('client_id', client_id)
      .not('external_id', 'is', null)
      .not('external_id', 'like', 'wh_%')
      .not('external_id', 'like', 'manual-%');

    if (leadsError) throw leadsError;

    if (!leads || leads.length === 0) {
      return new Response(JSON.stringify({ success: true, message: 'No leads to export', updated: 0, skipped: 0, failed: 0 }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`[bulk-export-to-ghl] Processing ${leads.length} leads for ${client.name}`);

    let updated = 0;
    let skipped = 0;
    let failed = 0;

    for (const lead of leads) {
      const questions = lead.questions as QuestionAnswer[] | null;
      
      // Skip leads without question answers
      if (!questions || !Array.isArray(questions) || questions.length === 0) {
        skipped++;
        continue;
      }

      try {
        // Build custom field values from questions
        // We'll push these as a note on the GHL contact since custom fields
        // require field ID mapping which varies per location
        let noteBody = `📋 **Form Responses (from Lovable)**\n\n`;
        for (const qa of questions) {
          const answer = Array.isArray(qa.answer) ? qa.answer.join(', ') : (qa.answer || 'N/A');
          noteBody += `**${qa.question}:** ${answer}\n`;
        }
        noteBody += `\n_Exported at ${new Date().toISOString()}_`;

        // Create a note on the GHL contact
        const response = await fetch(`${GHL_BASE_URL}/contacts/${lead.external_id}/notes`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${client.ghl_api_key}`,
            'Version': '2021-07-28',
            'Content-Type': 'application/json',
            'Accept': 'application/json',
          },
          body: JSON.stringify({ body: noteBody }),
        });

        if (response.ok) {
          updated++;
        } else {
          const errorText = await response.text();
          console.error(`[bulk-export-to-ghl] Failed for ${lead.external_id}: ${response.status} - ${errorText}`);
          failed++;
        }
      } catch (err) {
        console.error(`[bulk-export-to-ghl] Error for ${lead.external_id}:`, err);
        failed++;
      }

      await delay(DELAY_MS);
    }

    console.log(`[bulk-export-to-ghl] Complete: ${updated} updated, ${skipped} skipped (no answers), ${failed} failed`);

    return new Response(JSON.stringify({
      success: true,
      updated,
      skipped,
      failed,
      total: leads.length,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[bulk-export-to-ghl] Error:', errorMessage);
    return new Response(JSON.stringify({ success: false, error: errorMessage }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
