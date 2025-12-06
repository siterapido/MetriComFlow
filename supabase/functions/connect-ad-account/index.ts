// @ts-nocheck
// Declare Deno for TypeScript editors that don't load the Edge Runtime types
declare const Deno: {
  serve: (handler: (req: Request) => Promise<Response> | Response) => void;
  env: { get: (name: string) => string | undefined };
};

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import {
  META_API_VERSION,
  fetchWithBackoff,
  mapAdRecord,
  mapAdSetRecord,
  normalizeMetaPaging,
} from "../_shared/meta-sync.ts";

// Load Supabase client dynamically to avoid module resolution issues in editors
async function loadCreateClient() {
  const mod = await import("jsr:@supabase/supabase-js@2");
  return mod.createClient;
}

interface ConnectAccountRequest {
  ad_account_id: string;
  access_token: string;
}

interface MetaCampaign {
  id: string;
  name: string;
  objective: string;
  status: string;
  start_time?: string;
  stop_time?: string;
}

interface MetaAdSet {
  id: string;
  name: string;
  status: string;
  campaign_id: string;
  start_time?: string;
  end_time?: string;
}

interface MetaAd {
  id: string;
  name: string;
  status: string;
  adset_id: string;
  creative: {
    id: string;
    name: string;
    object_story_spec?: {
      link_data?: {
        call_to_action?: { value?: { link_title?: string } };
        image_hash?: string;
        link?: string;
        message?: string;
      };
      video_data?: {
        call_to_action?: { value?: { link_title?: string } };
        image_url?: string;
        video_id?: string;
        message?: string;
      };
    };
    image_url?: string;
    thumbnail_url?: string;
  };
}

Deno.serve(async (req: Request) => {
  // CORS headers
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  };

  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ error: 'Method not allowed' }),
        { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      return new Response(
        JSON.stringify({ error: 'Missing required environment variables' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const createClient = await loadCreateClient();
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const { ad_account_id, access_token }: ConnectAccountRequest = await req.json();

    if (!ad_account_id || !access_token) {
      return new Response(
        JSON.stringify({ error: 'Missing ad_account_id or access_token' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const graphBase = `https://graph.facebook.com/${META_API_VERSION}`;

    // Obter informações da conta de anúncios do Meta
    const accountUrl = `${graphBase}/act_${ad_account_id}` +
      `?fields=id,name,business_name&access_token=${access_token}`;

    const accountResponse = await fetchWithBackoff(accountUrl, { method: "GET" });
    const accountData = await accountResponse.json();

    if (!accountResponse.ok) {
      return new Response(
        JSON.stringify({
          error: 'Failed to fetch ad account data',
          details: accountData
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Obter usuário autenticado
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { data: { user }, error: userError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid authorization token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Permission check: only owners and traffic managers can connect ad accounts
    const { data: profile } = await supabase
      .from('profiles')
      .select('user_type')
      .eq('id', user.id)
      .maybeSingle();
    const userType = (profile as any)?.user_type || null;
    if (userType !== 'owner' && userType !== 'traffic_manager') {
      return new Response(
        JSON.stringify({ error: 'Permissão insuficiente para conectar contas de anúncios.' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get user's active organization
    const { data: orgMembership, error: orgError } = await supabase
      .from('organization_memberships')
      .select('organization_id')
      .eq('profile_id', user.id)
      .eq('is_active', true)
      .single();

    if (orgError || !orgMembership) {
      return new Response(
        JSON.stringify({ error: 'No active organization found for user' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const organizationId = orgMembership.organization_id;

    // Verificar se a conta já existe
    const { data: existingAccount, error: existingError } = await supabase
      .from('ad_accounts')
      .select('id')
      .eq('external_id', ad_account_id)
      .single();

    if (existingError && existingError.code !== 'PGRST116') {
      throw new Error(`Error checking existing account: ${existingError.message}`);
    }

    let accountId: string;

    if (existingAccount) {
      // Atualizar conta existente
      const { data: updatedAccount, error: updateError } = await supabase
        .from('ad_accounts')
        .update({
          business_name: accountData.business_name || accountData.name,
          connected_by: user.id,
          organization_id: organizationId,
          provider: 'meta',
          is_active: true,
          updated_at: new Date().toISOString()
        })
        .eq('id', existingAccount.id)
        .select()
        .single();

      if (updateError) {
        throw new Error(`Error updating ad account: ${updateError.message}`);
      }

      accountId = updatedAccount.id;
    } else {
      // Criar nova conta
      const { data: newAccount, error: insertError } = await supabase
        .from('ad_accounts')
        .insert({
          external_id: ad_account_id,
          business_name: accountData.business_name || accountData.name,
          connected_by: user.id,
          organization_id: organizationId,
          provider: 'meta',
          is_active: true,
          connected_at: new Date().toISOString()
        })
        .select()
        .single();

      if (insertError) {
        throw new Error(`Error creating ad account: ${insertError.message}`);
      }

      accountId = newAccount.id;
    }

    // Buscar campanhas da conta (Graph API v24.0)
    const effectiveStatus = encodeURIComponent('["ACTIVE","PAUSED","ARCHIVED"]');
    const campaignsUrl = `${graphBase}/act_${ad_account_id}/campaigns` +
      `?fields=id,name,objective,status,start_time,stop_time&effective_status=${effectiveStatus}&limit=500&access_token=${access_token}`;

    const campaignsResponse = await fetchWithBackoff(campaignsUrl, { method: "GET" });
    const campaignsData = await campaignsResponse.json();

    if (!campaignsResponse.ok) {
      console.error('Error fetching campaigns:', campaignsData);
      return new Response(
        JSON.stringify({
          message: 'Ad account connected but failed to fetch campaigns',
          account_id: accountId,
          error: campaignsData
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const campaigns: MetaCampaign[] = campaignsData.data || [];
    let campaignsSyncedCount = 0;
    let adSetsSyncedCount = 0;
    let adsSyncedCount = 0;

    if (campaigns.length > 0) {
      const recordsToUpsert = campaigns.map(c => ({
        ad_account_id: accountId,
        external_id: c.id,
        name: c.name,
        objective: c.objective,
        status: c.status,
        start_time: c.start_time ? new Date(c.start_time).toISOString() : null,
        stop_time: c.stop_time ? new Date(c.stop_time).toISOString() : null,
        organization_id: organizationId,
        provider: 'meta',
        updated_at: new Date().toISOString(),
      }));

      const { data: upsertedCampaigns, error: upsertError } = await supabase
        .from('ad_campaigns')
        .upsert(recordsToUpsert, { onConflict: 'external_id, organization_id' })
        .select('id, external_id');

      if (upsertError) {
        throw new Error(`Error upserting campaigns: ${upsertError.message}`);
      }

      campaignsSyncedCount = upsertedCampaigns?.length || recordsToUpsert.length || 0;

      // Mapeia external_id para o id interno da campanha
      const campaignIdMap = new Map(upsertedCampaigns.map(c => [c.external_id, c.id]));

      // Itera sobre as campanhas para buscar adsets
      for (const campaign of campaigns) {
        const campaignInternalId = campaignIdMap.get(campaign.id);
        if (!campaignInternalId) continue;

        const adSetsUrl = `${graphBase}/${campaign.id}/adsets` +
          `?fields=id,name,status,optimization_goal,billing_event,bid_strategy,targeting,daily_budget,lifetime_budget,start_time,end_time&limit=500&access_token=${access_token}`;
        
        const adSetsResponse = await fetchWithBackoff(adSetsUrl, { method: "GET" });
        const adSetsData = await adSetsResponse.json();

        if (adSetsResponse.ok && adSetsData.data) {
          const adSets: MetaAdSet[] = normalizeMetaPaging(adSetsData) as MetaAdSet[];
          const adSetRecords = adSets.map(as => mapAdSetRecord(as, campaignInternalId));

          if (adSetRecords.length > 0) {
            const { data: upsertedAdSets, error: adSetUpsertError } = await supabase
              .from('ad_sets')
              .upsert(adSetRecords, { onConflict: 'external_id' })
              .select('id, external_id');

            if (adSetUpsertError) {
              console.error(`Error upserting ad sets for campaign ${campaign.id}:`, adSetUpsertError.message);
            } else {
              adSetsSyncedCount += upsertedAdSets?.length || adSetRecords.length || 0;
              
              const adSetIdMap = new Map(upsertedAdSets.map(as => [as.external_id, as.id]));

              // Itera sobre os adsets para buscar ads
              for (const adSet of adSets) {
                const adSetInternalId = adSetIdMap.get(adSet.id);
                if (!adSetInternalId) continue;

                const adsUrl = `${graphBase}/${adSet.id}/ads` +
                  `?fields=id,name,status,creative{id,name,object_story_spec,image_url,thumbnail_url,asset_feed_spec},effective_object_story_id,adset_id,created_time,updated_time&limit=500&access_token=${access_token}`;
                
                const adsResponse = await fetchWithBackoff(adsUrl, { method: "GET" });
                const adsData = await adsResponse.json();

                if (adsResponse.ok && adsData.data) {
                  const ads: MetaAd[] = normalizeMetaPaging(adsData) as MetaAd[];
                  const adRecords = ads.map(ad => mapAdRecord(ad, adSetInternalId, campaignInternalId));

                  if (adRecords.length > 0) {
                    const { error: adUpsertError } = await supabase
                      .from('ads')
                      .upsert(adRecords, { onConflict: 'external_id' });

                    if (adUpsertError) {
                      console.error(`Error upserting ads for ad set ${adSet.id}:`, adUpsertError.message);
                    } else {
                      adsSyncedCount += adRecords.length;
                    }
                  }
                }
              }
            }
          }
        }
      }
    }

    // Atualiza a lógica de insights para usar o filtro de 30 dias
    const today = new Date();
    const thirtyDaysAgo = new Date(today);
    thirtyDaysAgo.setDate(today.getDate() - 30);
    
    const since = thirtyDaysAgo.toISOString().split('T')[0];
    const until = today.toISOString().split('T')[0];

    // Dispara a sincronização de insights com o período de 30 dias
    // (A lógica real de insights está em outras funções, aqui apenas preparamos o terreno)
    // Exemplo de como poderia ser chamado (não implementado aqui):
    // await supabase.functions.invoke('sync-daily-insights', {
    //   body: { ad_account_ids: [accountId], since, until }
    // });

    return new Response(
      JSON.stringify({
        message: 'Ad account and all related entities synced successfully',
        accountId,
        campaigns_synced: campaignsSyncedCount,
        ad_sets_synced: adSetsSyncedCount,
        ads_synced: adsSyncedCount,
        insights_period: { since, until }
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in connect-ad-account:', error);
    const message = (error as any)?.message ?? String(error);
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
