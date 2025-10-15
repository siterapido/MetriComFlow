import { useState, useEffect } from 'react';
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

      // Fetch ad accounts
      const { data: adAccountsData, error: adAccountsError } = await supabase
        .from('ad_accounts')
        .select('*')
        .eq('connected_by', user.id)
        .eq('provider', 'meta');

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
          redirect_uri: `${window.location.origin}/meta-ads-config`
        }
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

      const { data, error } = await supabase.functions.invoke('meta-auth', {
        body: {
          action: 'exchange_code',
          code,
          redirect_uri: `${window.location.origin}/meta-ads-config`
        }
      });

      if (error) throw error;

      if (data.success) {
        // Refresh data after successful connection
        await fetchData();
        return data;
      } else {
        throw new Error(data.error || 'Failed to connect');
      }
    } catch (error) {
      console.error('Error exchanging code:', error);
      throw error;
    } finally {
      setConnecting(false);
    }
  };

  // Start OAuth flow
  const connectMetaBusiness = async (): Promise<void> => {
    try {
      const authUrl = await getAuthUrl();
      window.location.href = authUrl;
    } catch (error) {
      console.error('Error starting OAuth flow:', error);
      throw error;
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

  // Handle OAuth callback
  const handleOAuthCallback = async () => {
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    const error = urlParams.get('error');
    const state = urlParams.get('state');

    if (error) {
      throw new Error(`OAuth error: ${error}`);
    }

    if (code && state === user?.id) {
      await exchangeCode(code);
      
      // Clean up URL
      const url = new URL(window.location.href);
      url.searchParams.delete('code');
      url.searchParams.delete('state');
      window.history.replaceState({}, '', url.toString());
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
    loading,
    connecting,
    connectMetaBusiness,
    disconnectMetaBusiness,
    refreshData: fetchData,
    hasActiveConnection: connections.length > 0,
    totalAdAccounts: adAccounts.length,
  };
}