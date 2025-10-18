import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

// Verify webhook signature from Meta (Facebook) using App Secret
async function verifyMetaSignature(req: Request, rawBody: string): Promise<boolean> {
  try {
    const appSecret = Deno.env.get('META_APP_SECRET');
    if (!appSecret) {
      console.warn('META_APP_SECRET not set; skipping signature verification');
      return true; // Allow processing but log warning
    }

    const sig256 = req.headers.get('x-hub-signature-256');
    const sig1 = req.headers.get('x-hub-signature');

    const encoder = new TextEncoder();

    // Prefer SHA-256 if present
    if (sig256) {
      const elements = sig256.split('=');
      const received = elements[1]?.toLowerCase();
      const key = await crypto.subtle.importKey(
        'raw',
        encoder.encode(appSecret),
        { name: 'HMAC', hash: 'SHA-256' },
        false,
        ['sign']
      );
      const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(rawBody));
      const hex = Array.from(new Uint8Array(signature)).map(b => b.toString(16).padStart(2, '0')).join('');
      return received === hex;
    }

    // Fallback to SHA-1 header if provided
    if (sig1) {
      const elements = sig1.split('=');
      const received = elements[1]?.toLowerCase();
      const key = await crypto.subtle.importKey(
        'raw',
        encoder.encode(appSecret),
        { name: 'HMAC', hash: 'SHA-1' },
        false,
        ['sign']
      );
      const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(rawBody));
      const hex = Array.from(new Uint8Array(signature)).map(b => b.toString(16).padStart(2, '0')).join('');
      return received === hex;
    }

    // No signature header present
    console.warn('No X-Hub-Signature headers present; skipping verification');
    return true;
  } catch (e) {
    console.error('Error verifying Meta webhook signature:', e);
    return false;
  }
}

interface MetaLeadData {
  id: string;
  created_time: string;
  ad_id: string;
  adset_id: string;
  campaign_id: string;
  form_id: string;
  field_data: Array<{
    name: string;
    values: string[];
  }>;
}

interface WebhookEntry {
  id: string;
  time: number;
  changes: Array<{
    value: {
      leadgen_id: string;
      page_id: string;
      form_id: string;
      adgroup_id: string;
      ad_id: string;
      campaign_id: string;
    };
    field: string;
  }>;
}

Deno.serve(async (req: Request) => {
  try {
    const url = new URL(req.url);
    
    // Verificação do webhook (GET request)
    if (req.method === 'GET') {
      const mode = url.searchParams.get('hub.mode');
      const token = url.searchParams.get('hub.verify_token');
      const challenge = url.searchParams.get('hub.challenge');
      
      const VERIFY_TOKEN = Deno.env.get('META_WEBHOOK_VERIFY_TOKEN');
      
      if (mode === 'subscribe' && token === VERIFY_TOKEN) {
        console.log('Webhook verified');
        return new Response(challenge, { status: 200 });
      } else {
        console.log('Webhook verification failed');
        return new Response('Forbidden', { status: 403 });
      }
    }

    // Processar webhook (POST request)
    if (req.method === 'POST') {
      const META_ACCESS_TOKEN = Deno.env.get('META_ACCESS_TOKEN');
      const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
      const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

      if (!META_ACCESS_TOKEN || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
        return new Response(
          JSON.stringify({ error: 'Missing required environment variables' }),
          { status: 500, headers: { 'Content-Type': 'application/json' } }
        );
      }

      // Read raw body for signature verification
      const rawBody = await req.text();
      const isValid = await verifyMetaSignature(req, rawBody);
      if (!isValid) {
        return new Response(
          JSON.stringify({ error: 'Invalid webhook signature' }),
          { status: 403, headers: { 'Content-Type': 'application/json' } }
        );
      }

      // Parse JSON after verifying signature
      const body = JSON.parse(rawBody);

      const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

      console.log('Received webhook:', JSON.stringify(body, null, 2));

      const results = [];

      // Processar cada entrada do webhook
      for (const entry of body.entry || []) {
        for (const change of entry.changes || []) {
          if (change.field === 'leadgen') {
            try {
              const leadgenId = change.value.leadgen_id;
              
              // Buscar dados completos do lead no Meta Ads
              const leadUrl = `https://graph.facebook.com/v24.0/${leadgenId}` +
                `?fields=id,created_time,ad_id,adset_id,campaign_id,form_id,field_data` +
                `&access_token=${META_ACCESS_TOKEN}`;

              const leadResponse = await fetch(leadUrl);
              const leadData: MetaLeadData = await leadResponse.json();

              if (!leadResponse.ok) {
                console.error('Error fetching lead data:', leadData);
                continue;
              }

              // Extrair informações do lead
              const fieldData = leadData.field_data || [];
              const nameField = fieldData.find(f => f.name === 'full_name' || f.name === 'first_name');
              const emailField = fieldData.find(f => f.name === 'email');
              const phoneField = fieldData.find(f => f.name === 'phone_number');

              const leadName = nameField?.values?.[0] || 'Lead sem nome';
              const leadEmail = emailField?.values?.[0] || null;
              const leadPhone = phoneField?.values?.[0] || null;

              // Buscar campanha no banco de dados
              const { data: campaign, error: campaignError } = await supabase
                .from('ad_campaigns')
                .select('id')
                .eq('external_id', leadData.campaign_id)
                .single();

              if (campaignError) {
                console.error('Error finding campaign:', campaignError);
                continue;
              }

              // Verificar se o lead já existe
              const { data: existingLead, error: existingError } = await supabase
                .from('leads')
                .select('id')
                .eq('external_lead_id', leadData.id)
                .single();

              if (existingError && existingError.code !== 'PGRST116') {
                console.error('Error checking existing lead:', existingError);
                continue;
              }

              if (existingLead) {
                console.log(`Lead ${leadData.id} already exists, skipping`);
                continue;
              }

              // Criar novo lead
              const { data: newLead, error: insertError } = await supabase
                .from('leads')
                .insert({
                  name: leadName,
                  email: leadEmail,
                  phone: leadPhone,
                  status: 'novo_lead',
                  source: 'meta_ads',
                  external_lead_id: leadData.id,
                  ad_id: leadData.ad_id,
                  adset_id: leadData.adset_id,
                  campaign_id: campaign?.id || null,
                  created_at: new Date(leadData.created_time).toISOString()
                })
                .select()
                .single();

              if (insertError) {
                console.error('Error inserting lead:', insertError);
                continue;
              }

              results.push({
                leadgen_id: leadData.id,
                lead_id: newLead.id,
                name: leadName,
                email: leadEmail,
                campaign_id: leadData.campaign_id
              });

              console.log(`Successfully created lead ${newLead.id} from leadgen ${leadData.id}`);

            } catch (error) {
              console.error('Error processing leadgen change:', error);
            }
          }
        }
      }

      return new Response(
        JSON.stringify({ 
          message: 'Webhook processed successfully',
          processed: results.length,
          results 
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    return new Response('Method not allowed', { status: 405 });

  } catch (error) {
    console.error('Error in webhook-lead-ads:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
});