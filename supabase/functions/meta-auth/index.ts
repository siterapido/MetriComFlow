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

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-application-name',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
};

interface MetaAuthRequest {
  action: 'get_auth_url' | 'exchange_code' | 'list_available_accounts';
  code?: string;
  redirect_uri?: string;
}

interface MetaTokenResponse {
  access_token: string;
  token_type: string;
  expires_in?: number;
}

interface MetaUserResponse {
  id: string;
  name: string;
  email?: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Read env with fallback names (CLI forbids SUPABASE_* in secrets sometimes)
    const SUPABASE_URL = Deno.env.get('PROJECT_URL') ?? Deno.env.get('SUPABASE_URL') ?? '';
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SERVICE_ROLE_KEY') ?? Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

    const createClient = await loadCreateClient();
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Get user from Authorization header
    const authHeader = req.headers.get('Authorization');
    console.log('📨 Received request with auth header:', authHeader ? 'Present' : 'Missing');

    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const token = authHeader.replace('Bearer ', '');
    console.log('🔑 Token length:', token.length, 'First 20 chars:', token.substring(0, 20) + '...');

    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    console.log('👤 User validation result:', {
      hasUser: !!user,
      userId: user?.id,
      userEmail: user?.email,
      hasError: !!authError,
      errorMessage: authError?.message
    });

    if (authError || !user) {
      console.error('❌ Auth error details:', authError);
      throw new Error(`Invalid token: ${authError?.message || 'User not found'}`);
    }

    console.log('✅ User authenticated successfully:', user.email);

    // Permission check: only owners and traffic managers can manage Meta Ads
    const { data: profile } = await supabase
      .from('profiles')
      .select('user_type')
      .eq('id', user.id)
      .maybeSingle();
    const userType = (profile as any)?.user_type || null;
    if (userType !== 'owner' && userType !== 'traffic_manager') {
      return new Response(
        JSON.stringify({ error: 'Permissão insuficiente para gerenciar integrações de anúncios.', success: false }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 403 }
      );
    }

    const { action, code, redirect_uri }: MetaAuthRequest = await req.json();

    // Helper to deterministically resolve and normalize the redirect_uri so that
    // the exact same value is used in both the OAuth dialog and the token exchange.
    const normalizeRedirectUri = (
      input: string | undefined,
      origin: string | null
    ): string => {
      const DEFAULT_PATH = '/metricas';

      // Read production URL from environment (with fallback for backward compatibility)
      const PRODUCTION_BASE_URL = Deno.env.get('VITE_APP_URL') ||
                                   Deno.env.get('APP_URL') ||
                                   'https://www.insightfy.com.br';

      // Step 1: choose a candidate (prefer explicit input, then origin fallback)
      let candidate = input?.trim();
      if (!candidate || !/^https?:\/\//i.test(candidate)) {
        if (origin && /^https?:\/\//i.test(origin)) {
          candidate = `${origin}${DEFAULT_PATH}`;
        } else {
          // Use environment-based production URL instead of hardcoded
          candidate = `${PRODUCTION_BASE_URL}${DEFAULT_PATH}`;
        }
      }

      // Step 2: normalize via URL API
      try {
        const url = new URL(candidate);

        // Always force the OAuth callback path without trailing slash
        url.pathname = DEFAULT_PATH;

        // Remove any query/fragments to avoid accidental mismatches
        url.search = '';
        url.hash = '';

        // If the host is our production domain (with or without www), normalize it
        if (url.hostname === 'insightfy.com.br' || url.hostname === 'www.insightfy.com.br') {
          // Preserve the www variant if PRODUCTION_BASE_URL uses it
          const prodUrl = new URL(PRODUCTION_BASE_URL);
          url.hostname = prodUrl.hostname;
          url.protocol = 'https:';
        }

        // Return the full string form
        return url.toString();
      } catch (e) {
        // If parsing fails for any reason, return the environment-based prod URL
        console.error('⚠️  URL parsing failed, using fallback:', e);
        return `${PRODUCTION_BASE_URL}${DEFAULT_PATH}`;
      }
    };

    const resolvedRedirectUri = normalizeRedirectUri(redirect_uri, req.headers.get('origin'));

    // Try to read secrets from environment first (Supabase Functions secrets)
    let META_APP_ID = Deno.env.get('META_APP_ID');
    let META_APP_SECRET = Deno.env.get('META_APP_SECRET');

    // Fallback: read from Supabase Vault via RPC if not present in env
    if (!META_APP_ID) {
      try {
        const { data: appId, error: appIdError } = await supabase.rpc('get_vault_secret', { secret_name: 'META_APP_ID' });
        if (!appIdError && appId) META_APP_ID = appId as string;
      } catch (e) {
        console.error('Vault fallback error (META_APP_ID):', e);
      }
    }

    if (!META_APP_SECRET) {
      try {
        const { data: appSecret, error: appSecretError } = await supabase.rpc('get_vault_secret', { secret_name: 'META_APP_SECRET' });
        if (!appSecretError && appSecret) META_APP_SECRET = appSecret as string;
      } catch (e) {
        console.error('Vault fallback error (META_APP_SECRET):', e);
      }
    }

    if (!META_APP_ID || !META_APP_SECRET) {
      console.error('Meta app credentials not configured:', {
        hasAppId: !!META_APP_ID,
        hasAppSecret: !!META_APP_SECRET
      });
      throw new Error('Meta app credentials not configured. Please check META_APP_ID and META_APP_SECRET in Supabase Vault.');
    }

    // Validate App ID format (should be numeric)
    console.log('==================== META AUTH DEBUG ====================');
    console.log('Action:', action);
    console.log('META_APP_ID:', META_APP_ID);
    console.log('META_APP_ID length:', META_APP_ID?.length);
    console.log('META_APP_ID is numeric:', /^\d+$/.test(META_APP_ID || ''));
    console.log('Expected APP_ID: 3361128087359379 (InsightFy)');
    console.log('User ID:', user.id);
    console.log('Origin:', req.headers.get('origin'));
    console.log('Redirect URI (incoming):', redirect_uri);
    console.log('Redirect URI (resolved):', resolvedRedirectUri);
    console.log('Environment Variables:');
    console.log('  - VITE_APP_URL:', Deno.env.get('VITE_APP_URL') || 'not set');
    console.log('  - APP_URL:', Deno.env.get('APP_URL') || 'not set');
    console.log('========================================================');

    if (!META_APP_ID || !/^\d+$/.test(META_APP_ID)) {
      console.error('❌ Invalid Meta App ID format:', META_APP_ID);
      throw new Error(`Invalid Meta App ID format. App ID should be numeric. Received: ${META_APP_ID}`);
    }

    // Verificar se é o App ID correto
    const EXPECTED_APP_ID = '3361128087359379';
    if (META_APP_ID !== EXPECTED_APP_ID) {
      console.warn('⚠️  WARNING: Using different App ID than expected!');
      console.warn('   Expected:', EXPECTED_APP_ID, '(InsightFy)');
      console.warn('   Received:', META_APP_ID);
    } else {
      console.log('✅ Using correct App ID: InsightFy');
    }

    if (action === 'get_auth_url') {
      // Generate OAuth URL for Meta Business Manager
      // Scopes requested by product requirements:
      // - ads_management: manage ad accounts/campaigns
      // - read_insights: read insights/metrics
      // - business_management: manage Business Manager assets
      // Optionally include leads_retrieval for future Lead Ads usage
      const requestedScopes = [
        'ads_management',
        'ads_read',
        'business_management',
        'leads_retrieval', // optional; safe for apps with this permission approved or in dev with testers
      ];

      const scopes = requestedScopes.join(',');

      // Use Graph API v24.0 by default
      const baseUrl = 'https://www.facebook.com/v24.0/dialog/oauth';
      const params = new URLSearchParams({
        client_id: META_APP_ID,
        redirect_uri: resolvedRedirectUri,
        scope: scopes,
        response_type: 'code',
        state: user.id, // Use user ID as state for security
      });

      const authUrl = `${baseUrl}?${params.toString()}`;

      return new Response(
        JSON.stringify({ auth_url: authUrl }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      );
    }

    if (action === 'exchange_code') {
      if (!code) {
        throw new Error('Authorization code is required');
      }

      // Exchange code for access token
      // Token exchange endpoint (Graph API v24.0)
      const tokenUrl = 'https://graph.facebook.com/v24.0/oauth/access_token';
      const tokenParams = new URLSearchParams({
        client_id: META_APP_ID,
        client_secret: META_APP_SECRET,
        redirect_uri: resolvedRedirectUri,
        code: code,
      });

      const tokenResponse = await fetch(`${tokenUrl}?${tokenParams.toString()}`);
      
      if (!tokenResponse.ok) {
        const errorData = await tokenResponse.text();
        console.error('Meta OAuth token exchange failed:', {
          status: tokenResponse.status,
          statusText: tokenResponse.statusText,
          error: errorData,
          appId: META_APP_ID
        });
        
        // Parse error for more specific messages
        try {
          const errorJson = JSON.parse(errorData);
          if (errorJson.error?.code === 100 && errorJson.error?.message?.includes('Invalid application ID')) {
            throw new Error(`Invalid Meta App ID (${META_APP_ID}). Please verify the App ID in Meta for Developers and update META_APP_ID in Supabase Vault.`);
          }
          throw new Error(`Meta OAuth error: ${errorJson.error?.message || errorData}`);
        } catch (parseError) {
          throw new Error(`Token exchange failed: ${errorData}`);
        }
      }

      const tokenData: MetaTokenResponse = await tokenResponse.json();

      // Get user info from Meta
      // Fetch user info (Graph API v24.0)
      const userInfoUrl = `https://graph.facebook.com/v24.0/me?access_token=${tokenData.access_token}&fields=id,name,email`;
      const userResponse = await fetch(userInfoUrl);
      
      if (!userResponse.ok) {
        throw new Error('Failed to get user info from Meta');
      }

      const userData: MetaUserResponse = await userResponse.json();

      // Store the connection in the database
      // Use upsert with the unique constraint (user_id, meta_user_id)
      const { error: insertError } = await supabase
        .from('meta_business_connections')
        .upsert({
          user_id: user.id,
          meta_user_id: userData.id,
          meta_user_name: userData.name,
          meta_user_email: userData.email,
          access_token: tokenData.access_token,
          token_expires_at: tokenData.expires_in
            ? new Date(Date.now() + tokenData.expires_in * 1000).toISOString()
            : null,
          connected_at: new Date().toISOString(),
          is_active: true,
        }, {
          onConflict: 'user_id,meta_user_id',
          ignoreDuplicates: false
        });

      if (insertError) {
        console.error('Database insert error:', insertError);
        throw new Error('Failed to store connection');
      }

      // Get ad accounts accessible to this user
      // List ad accounts (Graph API v24.0)
      const adAccountsUrl = `https://graph.facebook.com/v24.0/me/adaccounts?access_token=${tokenData.access_token}&fields=id,name,account_status,currency,timezone_name,business`;
      const adAccountsResponse = await fetch(adAccountsUrl);

      let availableAccounts = [];
      if (adAccountsResponse.ok) {
        const adAccountsData = await adAccountsResponse.json();

        if (adAccountsData.data && adAccountsData.data.length > 0) {
          // Format accounts for frontend display
          availableAccounts = adAccountsData.data.map((account: any) => ({
            external_id: account.id.replace('act_', ''), // Remove act_ prefix for storage
            business_name: account.name,
            account_status: account.account_status,
            currency: account.currency,
            timezone: account.timezone_name,
            business: account.business,
          }));
        }
      }

      return new Response(
        JSON.stringify({
          success: true,
          user: userData,
          available_accounts: availableAccounts,
          message: 'Successfully connected to Meta Business Manager'
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      );
    }

    if (action === 'list_available_accounts') {
      // Get active Meta connection for user
      const { data: connection, error: connError } = await supabase
        .from('meta_business_connections')
        .select('access_token')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .single();

      if (connError || !connection) {
        throw new Error('No active Meta Business connection found');
      }

      // Fetch available ad accounts from Meta API
      const adAccountsUrl = `https://graph.facebook.com/v24.0/me/adaccounts?access_token=${connection.access_token}&fields=id,name,account_status,currency,timezone_name,business`;
      const adAccountsResponse = await fetch(adAccountsUrl);

      if (!adAccountsResponse.ok) {
        const errorData = await adAccountsResponse.text();
        console.error('Failed to fetch ad accounts:', errorData);
        throw new Error('Failed to fetch ad accounts from Meta');
      }

      const adAccountsData = await adAccountsResponse.json();

      // Format accounts for display
      const availableAccounts = (adAccountsData.data || []).map((account: any) => ({
        external_id: account.id.replace('act_', ''), // Remove act_ prefix
        business_name: account.name,
        account_status: account.account_status,
        currency: account.currency,
        timezone: account.timezone_name,
        business: account.business,
      }));

      // Check which accounts are already connected (in user's organization)
      // Get user's organization
      const { data: orgMembership } = await supabase
        .from('organization_memberships')
        .select('organization_id')
        .eq('profile_id', user.id)
        .eq('is_active', true)
        .single();

      let connectedAccountIds: string[] = [];
      if (orgMembership) {
        const { data: connectedAccounts } = await supabase
          .from('ad_accounts')
          .select('external_id')
          .eq('organization_id', orgMembership.organization_id)
          .eq('provider', 'meta');

        connectedAccountIds = (connectedAccounts || []).map(acc => acc.external_id);
      }

      // Mark which accounts are already connected
      const accountsWithStatus = availableAccounts.map((acc: any) => ({
        ...acc,
        is_connected: connectedAccountIds.includes(acc.external_id),
      }));

      return new Response(
        JSON.stringify({
          success: true,
          available_accounts: accountsWithStatus,
          total_count: accountsWithStatus.length,
          connected_count: connectedAccountIds.length,
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      );
    }

    throw new Error('Invalid action');

  } catch (error) {
    console.error('==================== META AUTH ERROR ====================');
    console.error('Error type:', error.constructor.name);
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    console.error('========================================================');

    return new Response(
      JSON.stringify({
        error: error.message || 'Internal server error',
        errorType: error.constructor.name,
        success: false
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});