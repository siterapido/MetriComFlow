import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'

type MetaConnectionStatus = {
  hasActiveConnection: boolean
  connectionId?: string
  tokenExpiresAt?: string
  isActive?: boolean
}

export function useMetaConnectionStatus() {
  const { user } = useAuth()

  const query = useQuery<MetaConnectionStatus>({
    queryKey: ['meta-connection-status', user?.id],
    queryFn: async () => {
      if (!user) {
        return { hasActiveConnection: false }
      }

      const { data, error } = await supabase
        .from('meta_business_connections')
        .select('id, token_expires_at, is_active')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .limit(1)
        .maybeSingle() as any

      // PGRST116 = No rows, treat as no active connection
      if (error && error.code !== 'PGRST116') {
        throw error
      }

      return {
        hasActiveConnection: !!data,
        connectionId: data?.id,
        tokenExpiresAt: data?.token_expires_at,
        isActive: data?.is_active
      }
    },
    enabled: !!user,
    staleTime: 30000,
    refetchOnWindowFocus: false,
  })

  return {
    hasActiveConnection: query.data?.hasActiveConnection ?? false,
    ...query,
  }
}
