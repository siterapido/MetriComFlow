// @ts-nocheck
// Declare Deno for TypeScript editors that don't load the Edge Runtime types
declare const Deno: {
  serve: (handler: (req: Request) => Promise<Response> | Response) => void;
  env: { get: (name: string) => string | undefined };
};

import "jsr:@supabase/functions-js/edge-runtime.d.ts";

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

    // Obter informações da conta de anúncios do Meta (Graph API v24.0)
    const accountUrl = `https://graph.facebook.com/v24.0/act_${ad_account_id}` +
      `?fields=id,name,business_name&access_token=${access_token}`;

    const accountResponse = await fetch(accountUrl);
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
          platform: 'meta_ads',
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
          platform: 'meta_ads',
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
    const campaignsUrl = `https://graph.facebook.com/v24.0/act_${ad_account_id}/campaigns` +
      `?fields=id,name,objective,status,start_time,stop_time&effective_status=${effectiveStatus}&access_token=${access_token}`;

    const campaignsResponse = await fetch(campaignsUrl);
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

    // Inserir ou atualizar campanhas
    const campaignResults = [];
    for (const campaign of campaignsData.data || []) {
      const { data: existingCampaign, error: existingCampaignError } = await supabase
        .from('ad_campaigns')
        .select('id')
        .eq('external_id', campaign.id)
        .single();

      if (existingCampaignError && existingCampaignError.code !== 'PGRST116') {
        console.error(`Error checking existing campaign ${campaign.id}:`, existingCampaignError);
        continue;
      }

      const campaignData = {
        ad_account_id: accountId,
        external_id: campaign.id,
        name: campaign.name,
        objective: campaign.objective,
        status: campaign.status,
        start_time: campaign.start_time ? new Date(campaign.start_time).toISOString() : null,
        stop_time: campaign.stop_time ? new Date(campaign.stop_time).toISOString() : null,
        updated_at: new Date().toISOString()
      };

      if (existingCampaign) {
        // Atualizar campanha existente
        const { error: updateCampaignError } = await supabase
          .from('ad_campaigns')
          .update(campaignData)
          .eq('id', existingCampaign.id);

        if (updateCampaignError) {
          console.error(`Error updating campaign ${campaign.id}:`, updateCampaignError);
        } else {
          campaignResults.push({ id: existingCampaign.id, external_id: campaign.id, action: 'updated' });
        }
      } else {
        // Criar nova campanha
        const { data: newCampaign, error: insertCampaignError } = await supabase
          .from('ad_campaigns')
          .insert(campaignData)
          .select()
          .single();

        if (insertCampaignError) {
          console.error(`Error creating campaign ${campaign.id}:`, insertCampaignError);
        } else {
          campaignResults.push({ id: newCampaign.id, external_id: campaign.id, action: 'created' });
        }
      }
    }

    return new Response(
      JSON.stringify({
        message: 'Ad account connected successfully',
        account_id: accountId,
        business_name: accountData.business_name || accountData.name,
        campaigns_processed: campaignResults.length,
        campaigns: campaignResults
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