import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-application-name',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
};

interface MetaAuthRequest {
  action: 'get_auth_url' | 'exchange_code';
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
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get user from Authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      throw new Error('Invalid token');
    }

    const { action, code, redirect_uri }: MetaAuthRequest = await req.json();

    const META_APP_ID = Deno.env.get('META_APP_ID');
    const META_APP_SECRET = Deno.env.get('META_APP_SECRET');
    
    if (!META_APP_ID || !META_APP_SECRET) {
      throw new Error('Meta app credentials not configured');
    }

    if (action === 'get_auth_url') {
      // Generate OAuth URL for Meta Business Manager
      const scopes = [
        'ads_read',
        'pages_manage_ads',
        'leads_retrieval',
        'business_management'
      ].join(',');

      const baseUrl = 'https://www.facebook.com/v18.0/dialog/oauth';
      const params = new URLSearchParams({
        client_id: META_APP_ID,
        redirect_uri: redirect_uri || `${req.headers.get('origin')}/meta-ads-config`,
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
      const tokenUrl = 'https://graph.facebook.com/v18.0/oauth/access_token';
      const tokenParams = new URLSearchParams({
        client_id: META_APP_ID,
        client_secret: META_APP_SECRET,
        redirect_uri: redirect_uri || `${req.headers.get('origin')}/meta-ads-config`,
        code: code,
      });

      const tokenResponse = await fetch(`${tokenUrl}?${tokenParams.toString()}`);
      
      if (!tokenResponse.ok) {
        const errorData = await tokenResponse.text();
        throw new Error(`Token exchange failed: ${errorData}`);
      }

      const tokenData: MetaTokenResponse = await tokenResponse.json();

      // Get user info from Meta
      const userInfoUrl = `https://graph.facebook.com/v18.0/me?access_token=${tokenData.access_token}&fields=id,name,email`;
      const userResponse = await fetch(userInfoUrl);
      
      if (!userResponse.ok) {
        throw new Error('Failed to get user info from Meta');
      }

      const userData: MetaUserResponse = await userResponse.json();

      // Store the connection in the database
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
        });

      if (insertError) {
        console.error('Database insert error:', insertError);
        throw new Error('Failed to store connection');
      }

      // Get ad accounts accessible to this user
      const adAccountsUrl = `https://graph.facebook.com/v18.0/me/adaccounts?access_token=${tokenData.access_token}&fields=id,name,account_status,currency,timezone_name`;
      const adAccountsResponse = await fetch(adAccountsUrl);
      
      if (adAccountsResponse.ok) {
        const adAccountsData = await adAccountsResponse.json();
        
        // Store ad accounts
        if (adAccountsData.data && adAccountsData.data.length > 0) {
          const adAccountsToInsert = adAccountsData.data.map((account: any) => ({
            user_id: user.id,
            ad_account_id: account.id,
            name: account.name,
            account_status: account.account_status,
            currency: account.currency,
            timezone_name: account.timezone_name,
            platform: 'meta_ads',
            is_active: account.account_status === 1, // 1 = ACTIVE
            connected_at: new Date().toISOString(),
          }));

          await supabase
            .from('ad_accounts')
            .upsert(adAccountsToInsert, { onConflict: 'ad_account_id' });
        }
      }

      return new Response(
        JSON.stringify({ 
          success: true, 
          user: userData,
          message: 'Successfully connected to Meta Business Manager'
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      );
    }

    throw new Error('Invalid action');

  } catch (error) {
    console.error('Meta auth error:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Internal server error',
        success: false 
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});