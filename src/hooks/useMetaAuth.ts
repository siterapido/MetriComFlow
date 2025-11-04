import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { useQueryClient } from '@tanstack/react-query';
import { useActiveOrganization } from '@/hooks/useActiveOrganization';
import { logDebug } from '@/lib/debug';

interface MetaConnection {
  id: string;
  meta_user_id: string;
  meta_user_name: string;
  meta_user_email?: string;
  connected_at: string;
  is_active: boolean;
}

interface AdAccount {
  id: string;
  provider: string;
  external_id: string;
  business_name: string;
  connected_by: string;
  created_at: string;
  updated_at: string;
  is_active: boolean;
  connected_at?: string;
}

interface AvailableAdAccount {
  external_id: string;
  business_name: string;
  account_status: number;
  currency: string;
  timezone: string;
  business?: any;
  is_connected: boolean;
}

export function useMetaAuth() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { data: activeOrg } = useActiveOrganization();
  const [connections, setConnections] = useState<MetaConnection[]>([]);
  const [adAccounts, setAdAccounts] = useState<AdAccount[]>([]);
  const [availableAccounts, setAvailableAccounts] = useState<AvailableAdAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [loadingAvailableAccounts, setLoadingAvailableAccounts] = useState(false);
  const [oauthError, setOauthError] = useState<string | null>(null);
  const lastHandledCodeRef = useRef<string | null>(null);

  // Standardize redirect URI across environments
  // Priority: 1. VITE_META_REDIRECT_URI, 2. production URL, 3. current origin
  const REDIRECT_URI = (() => {
    const envRedirectUri = (import.meta as any).env?.VITE_META_REDIRECT_URI;
    if (envRedirectUri) {
      return envRedirectUri;
    }

    // Check if we're in production mode
    const isProd = (import.meta as any).env?.MODE === 'production';
    const appUrl = (import.meta as any).env?.VITE_APP_URL;

    if (isProd && appUrl) {
      // Use configured production URL
      return `${appUrl}/metricas`;
    }

    // Fallback to current window origin (for local dev)
    return `${window.location.origin}/metricas`;
  })();

  // Helper to parse Supabase FunctionsHttpError and extract JSON/text body
  const parseFunctionsError = async (error: any): Promise<{ message?: string; error?: string } | null> => {
    try {
      logDebug('🔍 Parsing error:', error);
      logDebug('🔍 Error context:', error?.context);

      // Try to get response from context
      const res = error?.context?.response;
      if (res) {
        logDebug('🔍 Response object found:', res);

        // Try to read the response body
        if (typeof res.text === 'function') {
          const raw = await res.text();
          logDebug('🔍 Raw response text:', raw);
          try {
            const parsed = JSON.parse(raw);
            logDebug('🔍 Parsed JSON:', parsed);
            return parsed;
          } catch {
            return { message: raw, error: raw };
          }
        }

        // Try to get body directly
        if (res.body) {
        logDebug('🔍 Response body:', res.body);
        return res.body;
      }
    }

      // Some versions return context.error directly
      if (error?.context?.error) {
        logDebug('🔍 Context error:', error.context.error);
        return error.context.error;
      }

      logDebug('🔍 No parseable error found');
      return null;
    } catch (parseErr) {
      console.error('🔍 Error parsing error:', parseErr);
      return null;
    }
  };

  // Fetch existing connections and ad accounts
  const fetchData = async () => {
    if (!user || !activeOrg?.id) return;

    try {
      setLoading(true);

      // Fetch Meta Business connections
      const { data: connectionsData, error: connectionsError } = await supabase
        .from('meta_business_connections')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_active', true);

      if (connectionsError) {
        console.error('Error fetching connections:', connectionsError);
      } else {
        setConnections(connectionsData || []);
        if (user) {
          queryClient.setQueryData(
            ['meta-connection-status', user.id],
            { hasActiveConnection: (connectionsData?.length ?? 0) > 0 }
          );
        }
      }

      // Fetch ad accounts (both active and inactive) - filter by organization_id
      const { data: adAccountsData, error: adAccountsError } = await supabase
        .from('ad_accounts')
        .select('*')
        .eq('organization_id', activeOrg.id)
        .eq('provider', 'meta')
        .order('created_at', { ascending: false});

      if (adAccountsError) {
        console.error('Error fetching ad accounts:', adAccountsError);
      } else {
        setAdAccounts(adAccountsData || []);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Get Meta OAuth URL
  const getAuthUrl = async (): Promise<string> => {
    try {
      // Get the current session explicitly to ensure we have a valid token
      const { data: { session } } = await supabase.auth.getSession();

      if (!session?.access_token) {
        throw new Error('No active session. Please log in again.');
      }

      logDebug('🔐 Using session token for meta-auth');
      logDebug('🔗 Frontend REDIRECT_URI:', REDIRECT_URI);
      logDebug('🌍 Current window.location.origin:', window.location.origin);
      logDebug('⚙️  Environment variables:', {
        VITE_META_REDIRECT_URI: (import.meta as any).env?.VITE_META_REDIRECT_URI || 'not set',
        VITE_APP_URL: (import.meta as any).env?.VITE_APP_URL || 'not set',
        MODE: (import.meta as any).env?.MODE || 'not set',
      });

      const { data, error } = await supabase.functions.invoke('meta-auth', {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
        body: {
          action: 'get_auth_url',
          redirect_uri: REDIRECT_URI,
        },
      });

      if (error) throw error;
      return data.auth_url;
    } catch (error) {
      console.error('Error getting auth URL:', error);
      throw error;
    }
  };

  // Exchange authorization code for access token
  const exchangeCode = async (code: string): Promise<void> => {
    try {
      setConnecting(true);

      logDebug('🔄 Exchanging code with redirect_uri:', REDIRECT_URI);

      // Get the access token for authorization
      const { data: { session } } = await supabase.auth.getSession();

      if (!session?.access_token) {
        throw new Error('No active session');
      }

      // Make a direct fetch request to get better error handling
      const supabaseUrl = (import.meta as any).env.VITE_SUPABASE_URL;
      const response = await fetch(`${supabaseUrl}/functions/v1/meta-auth`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          action: 'exchange_code',
          code,
          redirect_uri: REDIRECT_URI
        })
      });

      logDebug('📥 Response status:', response.status, response.statusText);

      const responseText = await response.text();
      logDebug('📥 Response body (raw):', responseText);

      let data;
      try {
        data = JSON.parse(responseText);
        logDebug('📥 Response body (parsed):', data);
      } catch (parseError) {
        console.error('❌ Failed to parse response:', parseError);
        throw new Error(`Invalid response from server: ${responseText}`);
      }

      if (!response.ok) {
        console.error('❌ HTTP error:', response.status, data);

        // Extract error message from response
        const errorMessage = data?.error || data?.message || `HTTP ${response.status}: ${response.statusText}`;
        throw new Error(errorMessage);
      }

      if (data?.success) {
        logDebug('✅ Successfully connected to Meta Business');
        // Refresh data after successful connection
        await fetchData();
        return;
      } else {
        console.error('❌ Connection failed:', data);
        throw new Error(data?.error || data?.message || 'Failed to connect');
      }
    } catch (error) {
      console.error('❌ Error exchanging code:', error);

      const errorMessage = error instanceof Error ? error.message : String(error);

      // Gracefully handle duplicate exchange attempts (common in React 18 StrictMode dev)
      if (/authorization code has been used/i.test(errorMessage)) {
        logDebug('⚠️ Code already used, fetching existing data');
        await fetchData();
        return;
      }
      throw error;
    } finally {
      setConnecting(false);
    }
  };

  // Start OAuth flow
  const connectMetaBusiness = async (): Promise<string> => {
    setConnecting(true);

    try {
      const authUrl = await getAuthUrl();
      return authUrl;
    } catch (error) {
      console.error('Error starting OAuth flow:', error);

      if (error instanceof Error) {
        if (error.message.includes('Invalid Meta App ID')) {
          throw new Error('Configuração do Meta App ID inválida. Entre em contato com o suporte técnico.');
        } else if (error.message.includes('Meta app credentials not configured')) {
          throw new Error('Credenciais do Meta não configuradas. Entre em contato com o suporte técnico.');
        }
      }

      throw new Error('Erro ao conectar com Meta Business. Tente novamente ou entre em contato com o suporte.');
    } finally {
      setConnecting(false);
    }
  };

  // Disconnect Meta Business account
  const disconnectMetaBusiness = async (connectionId: string): Promise<void> => {
    try {
      const { error } = await supabase
        .from('meta_business_connections')
        .update({ is_active: false })
        .eq('id', connectionId)
        .eq('user_id', user?.id);

      if (error) throw error;

      // Refresh data
      await fetchData();
    } catch (error) {
      console.error('Error disconnecting:', error);
      throw error;
    }
  };

  // Find duplicate account by external_id (global check across all organizations)
  const findDuplicateAccount = async (externalId: string): Promise<AdAccount | null> => {
    if (!user) return null;

    try {
      // Normalize external_id
      let normalizedId = externalId.trim();
      if (normalizedId.startsWith('act_')) {
        normalizedId = normalizedId.substring(4);
      }

      const { data, error } = await supabase
        .from('ad_accounts')
        .select('*')
        .eq('external_id', normalizedId)
        .eq('connected_by', user.id)
        .maybeSingle();

      if (error) throw error;

      return data as AdAccount | null;
    } catch (error) {
      console.error('Error finding duplicate account:', error);
      return null;
    }
  };

  // Check if account is already connected globally (by any user/organization)
  const checkAccountConnected = async (externalId: string): Promise<{
    isConnected: boolean;
    connectedByUserName?: string;
    organizationName?: string;
    businessName?: string;
  }> => {
    try {
      // Normalize external_id
      let normalizedId = externalId.trim();
      if (normalizedId.startsWith('act_')) {
        normalizedId = normalizedId.substring(4);
      }

      const { data, error } = await supabase
        .rpc('is_ad_account_connected', { p_external_id: normalizedId });

      if (error) throw error;

      if (data && data.length > 0) {
        const account = data[0];
        return {
          isConnected: true,
          connectedByUserName: account.connected_by_user_name,
          organizationName: account.organization_name,
          businessName: account.business_name,
        };
      }

      return { isConnected: false };
    } catch (error) {
      console.error('Error checking account connection:', error);
      return { isConnected: false };
    }
  };

  // Add a new ad account manually
  const addAdAccount = async (accountData: {
    external_id: string;
    business_name: string;
    provider?: string;
  }): Promise<AdAccount> => {
    if (!user) throw new Error('User not authenticated');
    if (!activeOrg?.id) throw new Error('No active organization');

    try {
      // Normalize external_id: remove "act_" prefix if present
      let normalizedId = accountData.external_id.trim();
      if (normalizedId.startsWith('act_')) {
        normalizedId = normalizedId.substring(4);
      }

      // Validate external_id format for Meta accounts
      if (accountData.provider === 'meta' || !accountData.provider) {
        // Meta Ad Account IDs should be numeric and at least 10 digits
        if (!/^\d{10,}$/.test(normalizedId)) {
          throw new Error('ID da conta Meta inválido. Deve conter apenas números com pelo menos 10 dígitos (ex: 1558732224693082).');
        }
      }

      // IMPORTANT: Check if account is already connected GLOBALLY (by any user/organization)
      const connectionCheck = await checkAccountConnected(normalizedId);
      if (connectionCheck.isConnected) {
        const { connectedByUserName, organizationName, businessName } = connectionCheck;
        throw new Error(
          `Esta conta Meta "${businessName || normalizedId}" já está conectada por ${connectedByUserName || 'outro usuário'} ` +
          `na organização "${organizationName || 'outra organização'}". ` +
          `Cada conta Meta só pode ser conectada uma vez no sistema.`
        );
      }

      // Check if account already exists (including inactive ones) in this organization
      const { data: existingAccounts, error: checkError } = await supabase
        .from('ad_accounts')
        .select('id, business_name, is_active, external_id')
        .eq('external_id', normalizedId)
        .eq('organization_id', activeOrg.id);

      if (checkError) throw checkError;

      if (existingAccounts && existingAccounts.length > 0) {
        const existing = existingAccounts[0];
        if (existing.is_active) {
          throw new Error(`Esta conta "${existing.business_name}" já está conectada e ativa.`);
        } else {
          throw new Error(`Esta conta "${existing.business_name}" já existe mas está inativa. Reative-a ao invés de criar uma nova.`);
        }
      }

      const { data, error } = await supabase
        .from('ad_accounts')
        .insert([
          {
            external_id: normalizedId,
            business_name: accountData.business_name.trim(),
            provider: accountData.provider || 'meta',
            connected_by: user.id,
            organization_id: activeOrg.id,
            is_active: true,
          }
        ])
        .select();

      if (error) {
        // Handle unique constraint violation
        if (error.code === '23505') {
          throw new Error('Esta conta publicitária já está conectada.');
        }
        throw error;
      }

      const insertedAccount = data?.[0] as AdAccount | undefined;

      if (!insertedAccount) {
        throw new Error('Não foi possível registrar a conta de anúncios.');
      }

      logDebug('✅ Ad account added successfully:', insertedAccount);

      // Refresh data
      await fetchData();

      return insertedAccount;
    } catch (error) {
      console.error('Error adding ad account:', error);
      throw error;
    }
  };

  // Deactivate an ad account (soft delete)
  const deactivateAdAccount = async (accountId: string): Promise<void> => {
    if (!user) throw new Error('User not authenticated');

    try {
      // Soft delete by setting is_active to false
      const { error } = await supabase
        .from('ad_accounts')
        .update({ is_active: false })
        .eq('id', accountId)
        .eq('connected_by', user.id);

      if (error) throw error;

      logDebug('✅ Ad account deactivated successfully');

      // Refresh data
      await fetchData();
    } catch (error) {
      console.error('Error deactivating ad account:', error);
      throw error;
    }
  };

  // Activate an ad account
  const activateAdAccount = async (accountId: string): Promise<void> => {
    if (!user) throw new Error('User not authenticated');

    try {
      const { error } = await supabase
        .from('ad_accounts')
        .update({ is_active: true })
        .eq('id', accountId)
        .eq('connected_by', user.id);

      if (error) throw error;

      logDebug('✅ Ad account activated successfully');

      // Refresh data
      await fetchData();
    } catch (error) {
      console.error('Error activating ad account:', error);
      throw error;
    }
  };

  // Rename an ad account
  const renameAdAccount = async (accountId: string, newName: string): Promise<void> => {
    if (!user) throw new Error('User not authenticated');

    try {
      const { error } = await supabase
        .from('ad_accounts')
        .update({ business_name: newName.trim() })
        .eq('id', accountId)
        .eq('connected_by', user.id);

      if (error) throw error;

      logDebug('✅ Ad account renamed successfully');

      // Refresh data
      await fetchData();
    } catch (error) {
      console.error('Error renaming ad account:', error);
      throw error;
    }
  };

  // Legacy function for backward compatibility
  const removeAdAccount = deactivateAdAccount;

  // List all available ad accounts from Meta API
  const listAvailableAccounts = async (): Promise<AvailableAdAccount[]> => {
    if (!user) throw new Error('User not authenticated');

    try {
      setLoadingAvailableAccounts(true);

      // Get the access token for authorization
      const { data: { session } } = await supabase.auth.getSession();

      if (!session?.access_token) {
        throw new Error('No active session');
      }

      // Call Edge Function to list available accounts
      const supabaseUrl = (import.meta as any).env.VITE_SUPABASE_URL;
      const response = await fetch(`${supabaseUrl}/functions/v1/meta-auth`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          action: 'list_available_accounts'
        })
      });

      logDebug('📥 List accounts response status:', response.status, response.statusText);

      const responseText = await response.text();
      logDebug('📥 List accounts response body (raw):', responseText);

      let data;
      try {
        data = JSON.parse(responseText);
        logDebug('📥 List accounts response body (parsed):', data);
      } catch (parseError) {
        console.error('❌ Failed to parse response:', parseError);
        throw new Error(`Invalid response from server: ${responseText}`);
      }

      if (!response.ok) {
        console.error('❌ HTTP error:', response.status, data);
        const errorMessage = data?.error || data?.message || `HTTP ${response.status}: ${response.statusText}`;
        throw new Error(errorMessage);
      }

      if (data?.success && data?.available_accounts) {
        logDebug('✅ Successfully fetched available accounts:', data.available_accounts.length);
        setAvailableAccounts(data.available_accounts);
        return data.available_accounts;
      } else {
        console.error('❌ Failed to fetch accounts:', data);
        throw new Error(data?.error || data?.message || 'Failed to fetch available accounts');
      }
    } catch (error) {
      console.error('❌ Error listing available accounts:', error);
      throw error;
    } finally {
      setLoadingAvailableAccounts(false);
    }
  };

  // Permanently delete an ad account
  const deleteAdAccount = async (accountId: string): Promise<void> => {
    if (!user) throw new Error('User not authenticated');

    try {
      const { error } = await supabase
        .from('ad_accounts')
        .delete()
        .eq('id', accountId)
        .eq('connected_by', user.id);

      if (error) throw error;

      logDebug('✅ Ad account deleted permanently');

      // Refresh data
      await fetchData();
    } catch (error) {
      console.error('Error deleting ad account:', error);
      throw error;
    }
  };

  // Merge/unify duplicate ad accounts
  const mergeAdAccounts = async (sourceAccountId: string, targetAccountId: string): Promise<{
    campaigns_migrated: number;
    insights_migrated: number;
    leads_migrated: number;
    success: boolean;
    message: string;
  }> => {
    if (!user) throw new Error('User not authenticated');

    try {
      logDebug('🔄 Merging accounts:', { sourceAccountId, targetAccountId });

      const { data, error } = await supabase.rpc('merge_ad_accounts', {
        p_source_account_id: sourceAccountId,
        p_target_account_id: targetAccountId,
      });

      if (error) throw error;

      const result = Array.isArray(data) ? data[0] : data;

      logDebug('✅ Accounts merged successfully:', result);

      // Refresh data
      await fetchData();

      return result;
    } catch (error) {
      console.error('Error merging ad accounts:', error);
      throw error;
    }
  };

  // Sync campaigns for an ad account
  const syncCampaigns = async (accountId: string): Promise<{
    success: boolean;
    message: string;
    campaignsCount?: number;
  }> => {
    try {
      // Get the access token for authorization
      const { data: { session } } = await supabase.auth.getSession();

      if (!session?.access_token) {
        throw new Error('No active session');
      }

      // Get Meta access token from connections
      const { data: connection } = await supabase
        .from('meta_business_connections')
        .select('access_token')
        .eq('user_id', user?.id)
        .eq('is_active', true)
        .single();

      if (!connection?.access_token) {
        throw new Error('No active Meta connection found');
      }

      // Get account external_id
      const { data: account } = await supabase
        .from('ad_accounts')
        .select('external_id')
        .eq('id', accountId)
        .single();

      if (!account?.external_id) {
        throw new Error('Ad account not found');
      }

      const supabaseUrl = (import.meta as any).env.VITE_SUPABASE_URL;
      const response = await fetch(`${supabaseUrl}/functions/v1/connect-ad-account`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          ad_account_id: account.external_id,
          access_token: connection.access_token,
        })
      });

      const responseText = await response.text();
      console.log('📥 Sync campaigns response status:', response.status);
      console.log('📥 Sync campaigns response body:', responseText);

      let data;
      try {
        data = JSON.parse(responseText);
      } catch (parseError) {
        throw new Error(`Invalid response from server: ${responseText}`);
      }

      if (!response.ok) {
        const errorMessage = data?.error || data?.message || `HTTP ${response.status}`;
        throw new Error(errorMessage);
      }

      // Refresh local caches so the UI reflects newly synced campaigns without a reload
      await fetchData();

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['ad-accounts'] }),
        queryClient.invalidateQueries({ queryKey: ['ad-campaigns'] }),
        queryClient.invalidateQueries({ queryKey: ['campaign-financials'] }),
        queryClient.invalidateQueries({ queryKey: ['campaign-financials-filtered'] }),
        queryClient.invalidateQueries({ queryKey: ['metrics-summary'] }),
        queryClient.invalidateQueries({ queryKey: ['filtered-insights'] }),
        queryClient.invalidateQueries({ queryKey: ['conversion-funnel'] }),
        queryClient.invalidateQueries({ queryKey: ['conversion-time-funnel'] }),
        queryClient.invalidateQueries({ queryKey: ['ad-sets'] }),
        queryClient.invalidateQueries({ queryKey: ['ad-set-metrics'] }),
        queryClient.invalidateQueries({ queryKey: ['ads'] }),
        queryClient.invalidateQueries({ queryKey: ['ad-metrics'] }),
        queryClient.invalidateQueries({ queryKey: ['creative-performance'] }),
      ]);

      return {
        success: true,
        message: data?.message || 'Campanhas sincronizadas com sucesso',
        campaignsCount: data?.campaigns_synced || 0,
      };
    } catch (error) {
      console.error('❌ Error syncing campaigns:', error);
      throw error;
    }
  };

  // Sync daily insights from Meta API
  const syncDailyInsights = async (params?: {
    since?: string;
    until?: string;
    accountIds?: string[];
    campaignIds?: string[];
  }): Promise<{
    success: boolean;
    message: string;
    recordsProcessed?: number;
  }> => {
    try {
      // Get the access token for authorization
      const { data: { session } } = await supabase.auth.getSession();

      if (!session?.access_token) {
        throw new Error('No active session');
      }

      // Default to last 30 days if no range provided
      const today = new Date().toISOString().split('T')[0];
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

      const supabaseUrl = (import.meta as any).env.VITE_SUPABASE_URL;
      const response = await fetch(`${supabaseUrl}/functions/v1/sync-daily-insights`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          since: params?.since || thirtyDaysAgo,
          until: params?.until || today,
          ad_account_ids: params?.accountIds,
          campaign_external_ids: params?.campaignIds,
          maxDaysPerChunk: 30,
        })
      });

      const responseText = await response.text();
      logDebug('📥 Sync response status:', response.status);
      logDebug('📥 Sync response body:', responseText);

      let data;
      try {
        data = JSON.parse(responseText);
      } catch (parseError) {
        throw new Error(`Invalid response from server: ${responseText}`);
      }

      if (!response.ok) {
        const errorMessage = data?.error || data?.message || `HTTP ${response.status}`;
        throw new Error(errorMessage);
      }

      return {
        success: true,
        message: data?.message || 'Sincronização concluída com sucesso',
        recordsProcessed: data?.recordsProcessed,
      };
    } catch (error) {
      console.error('❌ Error syncing insights:', error);
      throw error;
    }
  };

  // Handle OAuth callback
  const handleOAuthCallback = async () => {
      const url = new URL(window.location.href);
    const urlParams = new URLSearchParams(url.search);
    const code = urlParams.get('code');
    const error = urlParams.get('error');
    const errorDescription = urlParams.get('error_description');
    const state = urlParams.get('state');

    if (error) {
      const errorMsg = errorDescription
        ? `OAuth error: ${error} - ${errorDescription}`
        : `OAuth error: ${error}`;
      setOauthError(errorMsg);
      console.error('❌ OAuth error from Meta:', errorMsg);

      // Clean up URL
      url.searchParams.delete('error');
      url.searchParams.delete('error_description');
      url.searchParams.delete('state');
      window.history.replaceState({}, '', url.toString());
      return;
    }

    if (code && state === user?.id) {
      // Clear any previous errors
      setOauthError(null);

      // Prevent duplicate handling within the same session and across StrictMode double-invocation
      const sessionKey = `meta_oauth_code_${state}`;
      const alreadyHandled = sessionStorage.getItem(sessionKey);
      if (alreadyHandled === code || lastHandledCodeRef.current === code) {
        logDebug('⚠️ Code already handled, skipping');
        return;
      }
      sessionStorage.setItem(sessionKey, code);
      lastHandledCodeRef.current = code;

      // Clean up URL BEFORE invoking exchange to avoid re-triggering in StrictMode
      url.searchParams.delete('code');
      url.searchParams.delete('state');
      window.history.replaceState({}, '', url.toString());

      try {
        await exchangeCode(code);
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Erro ao trocar código OAuth';
        setOauthError(errorMsg);
        console.error('❌ Error in handleOAuthCallback:', err);
      }
    }
  };

  useEffect(() => {
    fetchData();
  }, [user, activeOrg?.id]);

  // Check for OAuth callback on mount
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    
    if (code && user) {
      handleOAuthCallback().catch(console.error);
    }
  }, [user]);

  return {
    connections,
    adAccounts,
    activeAdAccounts: adAccounts.filter(a => a.is_active),
    inactiveAdAccounts: adAccounts.filter(a => !a.is_active),
    availableAccounts,
    loading,
    connecting,
    loadingAvailableAccounts,
    oauthError,
    connectMetaBusiness,
    disconnectMetaBusiness,
    addAdAccount,
    removeAdAccount,
    deactivateAdAccount,
    activateAdAccount,
    renameAdAccount,
    deleteAdAccount,
    mergeAdAccounts,
    findDuplicateAccount,
    checkAccountConnected,
    listAvailableAccounts,
    syncCampaigns,
    syncDailyInsights,
    refreshData: fetchData,
    hasActiveConnection: connections.length > 0,
    totalAdAccounts: adAccounts.filter(a => a.is_active).length,
  };
}
