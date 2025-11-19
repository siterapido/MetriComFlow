import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { authHelpers, supabase } from '@/lib/supabase'

type AuthContextValue = {
  user: User | null
  session: Session | null
  loading: boolean
  signIn: (email: string, password: string) => ReturnType<typeof authHelpers.signIn>
  signUp: (email: string, password: string, metadata?: Record<string, any>) => ReturnType<typeof authHelpers.signUp>
  signOut: () => ReturnType<typeof authHelpers.signOut>
  signInWithOAuth: (provider: Parameters<typeof authHelpers.signInWithOAuth>[0]) => ReturnType<typeof authHelpers.signInWithOAuth>
  signInWithMagicLink: (email: string) => ReturnType<typeof authHelpers.signInWithMagicLink>
  resetPasswordForEmail: (email: string) => ReturnType<typeof authHelpers.resetPasswordForEmail>
  updatePassword: (newPassword: string) => ReturnType<typeof authHelpers.updatePassword>
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let isMounted = true

    const init = async () => {
      try {
        const {
          data: { session },
        } = await authHelpers.getSession()

        if (!isMounted) return
        setSession(session)
        setUser(session?.user ?? null)
      } finally {
        if (isMounted) setLoading(false)
      }
    }

    init()

    const { data: subscription } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession)
      setUser(newSession?.user ?? null)
    })

    return () => {
      isMounted = false
      subscription.subscription?.unsubscribe()
    }
  }, [])

  // Fallback: ao obter primeira sessão autenticada, garantir promoção a owner/org
  useEffect(() => {
    const run = async () => {
      if (!user) return
      const key = `mf_promote_owner_done_${user.id}`
      if (localStorage.getItem(key)) return
      try {
        await supabase.functions.invoke('promote-owner', { body: {} })
      } catch (err) {
        // Ignora silenciosamente; função requer JWT e service role configurado
        console.warn('promote-owner (fallback) falhou:', err)
      } finally {
        // Evita chamar novamente nesta máquina
        localStorage.setItem(key, '1')
      }
    }
    run()
  }, [user])

  const value = useMemo<AuthContextValue>(() => ({
    user,
    session,
    loading,
    signIn: authHelpers.signIn,
    signUp: authHelpers.signUp,
    signOut: authHelpers.signOut,
    signInWithOAuth: authHelpers.signInWithOAuth,
    signInWithMagicLink: authHelpers.signInWithMagicLink,
    resetPasswordForEmail: authHelpers.resetPasswordForEmail,
    updatePassword: authHelpers.updatePassword,
  }), [user, session, loading])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuthContext() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuthContext must be used within AuthProvider')
  return ctx
}