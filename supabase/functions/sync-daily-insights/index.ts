import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

interface MetaInsight {
  campaign_id: string;
  date_start: string;
  spend: string;
  impressions: string;
  clicks: string;
  actions?: Array<{
    action_type: string;
    value: string;
  }>;
}

Deno.serve(async (req: Request) => {
  try {
    // Verificar se é uma requisição POST
    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ error: 'Method not allowed' }),
        { status: 405, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Obter secrets
    const META_ACCESS_TOKEN = Deno.env.get('META_ACCESS_TOKEN');
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!META_ACCESS_TOKEN || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      return new Response(
        JSON.stringify({ error: 'Missing required environment variables' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Inicializar cliente Supabase
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Obter todas as contas de anúncios ativas
    const { data: adAccounts, error: accountsError } = await supabase
      .from('ad_accounts')
      .select('external_id');

    if (accountsError) {
      throw new Error(`Error fetching ad accounts: ${accountsError.message}`);
    }

    if (!adAccounts || adAccounts.length === 0) {
      return new Response(
        JSON.stringify({ message: 'No ad accounts found' }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const results = [];

    // Para cada conta de anúncios, buscar insights das campanhas
    for (const account of adAccounts) {
      try {
        // Buscar campanhas da conta
        const { data: campaigns, error: campaignsError } = await supabase
          .from('ad_campaigns')
          .select('id, external_id')
          .eq('ad_account_id', account.external_id);

        if (campaignsError) {
          console.error(`Error fetching campaigns for account ${account.external_id}:`, campaignsError);
          continue;
        }

        if (!campaigns || campaigns.length === 0) {
          continue;
        }

        // Buscar insights do Meta Ads para as campanhas
        const campaignIds = campaigns.map(c => c.external_id).join(',');
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const dateStr = yesterday.toISOString().split('T')[0];

        const metaUrl = `https://graph.facebook.com/v18.0/act_${account.external_id}/insights` +
          `?fields=campaign_id,date_start,spend,impressions,clicks,actions` +
          `&filtering=[{"field":"campaign.id","operator":"IN","value":["${campaignIds.replace(/,/g, '","')}"]}]` +
          `&time_range={"since":"${dateStr}","until":"${dateStr}"}` +
          `&access_token=${META_ACCESS_TOKEN}`;

        const metaResponse = await fetch(metaUrl);
        const metaData = await metaResponse.json();

        if (!metaResponse.ok) {
          console.error(`Meta API error for account ${account.external_id}:`, metaData);
          continue;
        }

        // Processar insights
        for (const insight of metaData.data || []) {
          const campaign = campaigns.find(c => c.external_id === insight.campaign_id);
          if (!campaign) continue;

          // Extrair contagem de leads das ações
          const leadsAction = insight.actions?.find((action: any) => 
            action.action_type === 'lead' || action.action_type === 'leadgen.other'
          );
          const leadsCount = leadsAction ? parseInt(leadsAction.value) : 0;

          // Inserir ou atualizar insight
          const { error: upsertError } = await supabase
            .from('campaign_daily_insights')
            .upsert({
              campaign_id: campaign.id,
              date: insight.date_start,
              spend: parseFloat(insight.spend || '0'),
              impressions: parseInt(insight.impressions || '0'),
              clicks: parseInt(insight.clicks || '0'),
              leads_count: leadsCount
            }, {
              onConflict: 'campaign_id,date'
            });

          if (upsertError) {
            console.error(`Error upserting insight for campaign ${campaign.id}:`, upsertError);
          } else {
            results.push({
              campaign_id: campaign.id,
              date: insight.date_start,
              spend: insight.spend,
              leads_count: leadsCount
            });
          }
        }
      } catch (error) {
        console.error(`Error processing account ${account.external_id}:`, error);
      }
    }

    return new Response(
      JSON.stringify({ 
        message: 'Daily insights sync completed',
        processed: results.length,
        results 
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in sync-daily-insights:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
});