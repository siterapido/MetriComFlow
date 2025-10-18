import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';

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
}

export function useMetaAuth() {
  const { user } = useAuth();
  const [connections, setConnections] = useState<MetaConnection[]>([]);
  const [adAccounts, setAdAccounts] = useState<AdAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [oauthError, setOauthError] = useState<string | null>(null);
  const lastHandledCodeRef = useRef<string | null>(null);

  // Standardize redirect URI across environments
  const REDIRECT_URI = (import.meta as any).env?.VITE_META_REDIRECT_URI || `${window.location.origin}/meta-ads-config`;

  // Helper to parse Supabase FunctionsHttpError and extract JSON/text body
  const parseFunctionsError = async (error: any): Promise<{ message?: string; error?: string } | null> => {
    try {
      console.log('🔍 Parsing error:', error);
      console.log('🔍 Error context:', error?.context);

      // Try to get response from context
      const res = error?.context?.response;
      if (res) {
        console.log('🔍 Response object found:', res);

        // Try to read the response body
        if (typeof res.text === 'function') {
          const raw = await res.text();
          console.log('🔍 Raw response text:', raw);
          try {
            const parsed = JSON.parse(raw);
            console.log('🔍 Parsed JSON:', parsed);
            return parsed;
          } catch {
            return { message: raw, error: raw };
          }
        }

        // Try to get body directly
        if (res.body) {
          console.log('🔍 Response body:', res.body);
          return res.body;
        }
      }

      // Some versions return context.error directly
      if (error?.context?.error) {
        console.log('🔍 Context error:', error.context.error);
        return error.context.error;
      }

      console.log('🔍 No parseable error found');
      return null;
    } catch (parseErr) {
      console.error('🔍 Error parsing error:', parseErr);
      return null;
    }
  };

  // Fetch existing connections and ad accounts
  const fetchData = async () => {
    if (!user) return;

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
      }

      // Fetch ad accounts (both active and inactive)
      const { data: adAccountsData, error: adAccountsError } = await supabase
        .from('ad_accounts')
        .select('*')
        .eq('connected_by', user.id)
        .eq('provider', 'meta')
        .order('created_at', { ascending: false });

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
      const { data, error } = await supabase.functions.invoke('meta-auth', {
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

      console.log('🔄 Exchanging code with redirect_uri:', REDIRECT_URI);

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

      console.log('📥 Response status:', response.status, response.statusText);

      const responseText = await response.text();
      console.log('📥 Response body (raw):', responseText);

      let data;
      try {
        data = JSON.parse(responseText);
        console.log('📥 Response body (parsed):', data);
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
        console.log('✅ Successfully connected to Meta Business');
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
        console.log('⚠️ Code already used, fetching existing data');
        await fetchData();
        return;
      }
      throw error;
    } finally {
      setConnecting(false);
    }
  };

  // Start OAuth flow
  const connectMetaBusiness = async (): Promise<void> => {
    try {
      setConnecting(true);
      const authUrl = await getAuthUrl();
      window.location.href = authUrl;
    } catch (error) {
      console.error('Error starting OAuth flow:', error);
      setConnecting(false);
      
      // Provide more specific error messages
      if (error instanceof Error) {
        if (error.message.includes('Invalid Meta App ID')) {
          throw new Error('Configuração do Meta App ID inválida. Entre em contato com o suporte técnico.');
        } else if (error.message.includes('Meta app credentials not configured')) {
          throw new Error('Credenciais do Meta não configuradas. Entre em contato com o suporte técnico.');
        }
      }
      
      throw new Error('Erro ao conectar com Meta Business. Tente novamente ou entre em contato com o suporte.');
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

  // Add a new ad account manually
  const addAdAccount = async (accountData: {
    external_id: string;
    business_name: string;
    provider?: string;
  }): Promise<void> => {
    if (!user) throw new Error('User not authenticated');

    try {
      const { data, error } = await supabase
        .from('ad_accounts')
        .insert([
          {
            external_id: accountData.external_id,
            business_name: accountData.business_name,
            provider: accountData.provider || 'meta',
            connected_by: user.id,
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

      console.log('✅ Ad account added successfully:', data);

      // Refresh data
      await fetchData();
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

      console.log('✅ Ad account deactivated successfully');

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

      console.log('✅ Ad account activated successfully');

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

      console.log('✅ Ad account renamed successfully');

      // Refresh data
      await fetchData();
    } catch (error) {
      console.error('Error renaming ad account:', error);
      throw error;
    }
  };

  // Legacy function for backward compatibility
  const removeAdAccount = deactivateAdAccount;

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

      console.log('✅ Ad account deleted permanently');

      // Refresh data
      await fetchData();
    } catch (error) {
      console.error('Error deleting ad account:', error);
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
        console.log('⚠️ Code already handled, skipping');
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
  }, [user]);

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
    loading,
    connecting,
    oauthError,
    connectMetaBusiness,
    disconnectMetaBusiness,
    addAdAccount,
    removeAdAccount,
    deactivateAdAccount,
    activateAdAccount,
    renameAdAccount,
    deleteAdAccount,
    refreshData: fetchData,
    hasActiveConnection: connections.length > 0,
    totalAdAccounts: adAccounts.filter(a => a.is_active).length,
  };
}