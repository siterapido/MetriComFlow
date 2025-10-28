import { createClient, type Session, type AuthChangeEvent } from '@supabase/supabase-js'
import type { Database } from './database.types'

// Get environment variables (and sanitize to avoid trailing newlines/spaces)
const rawSupabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined
const rawSupabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined
const supabaseUrl = rawSupabaseUrl?.trim()
const supabaseAnonKey = rawSupabaseAnonKey?.trim()
const appUrl = import.meta.env.VITE_APP_URL || (typeof window !== 'undefined' ? window.location.origin : undefined)

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Missing Supabase environment variables. Please check your .env file.'
  )
}

// Warn in dev if we had to sanitize env vars
try {
  if ((import.meta as any).env?.DEV) {
    if (rawSupabaseUrl && rawSupabaseUrl !== supabaseUrl) {
      console.warn('[Supabase] VITE_SUPABASE_URL tinha espaços/linhas a mais. Valor foi trimado.')
    }
    if (rawSupabaseAnonKey && rawSupabaseAnonKey !== supabaseAnonKey) {
      console.warn('[Supabase] VITE_SUPABASE_ANON_KEY tinha espaços/linhas a mais. Valor foi trimado.')
    }
  }
} catch (err) {
  void err
}

// Create a single supabase client for interacting with your database
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storage: window.localStorage,
  },
  db: {
    schema: 'public',
  },
  global: {
    headers: {
      'x-application-name': 'metricom-flow',
    },
  },
})

// Debug instrumentation (dev only): expose supabase on window and capture auth/function calls
// This helps diagnose issues where global fetch patching doesn't capture cross-fetch calls.
try {
  if (typeof window !== 'undefined' && (import.meta as any).env?.DEV) {
    // Expose client for inspection
    (window as any).__supabase = supabase
    ;(window as any).__capturedInvokes = (window as any).__capturedInvokes || []
    ;(window as any).__capturedAuth = (window as any).__capturedAuth || []

    // Wrap functions.invoke to log requests and responses
    const originalInvoke = (supabase.functions.invoke as any).bind(supabase.functions)
    ;(supabase.functions as any).invoke = async (fnName: string, options?: any) => {
      const start = Date.now()
      try {
        const result = await originalInvoke(fnName, options)
        ;(window as any).__capturedInvokes.push({
          fnName,
          options,
          result,
          start,
          end: Date.now(),
        })
        return result
      } catch (err) {
        ;(window as any).__capturedInvokes.push({
          fnName,
          options,
          error: err instanceof Error ? err.message : String(err),
          start,
          end: Date.now(),
        })
        throw err
      }
    }

    // Wrap key auth methods for visibility
    const originalSignUp = (supabase.auth.signUp as any).bind(supabase.auth)
    ;(supabase.auth as any).signUp = async (params: any) => {
      try {
        const res = await originalSignUp(params)
        ;(window as any).__capturedAuth.push({ type: 'signUp', params, res })
        return res
      } catch (err) {
        ;(window as any).__capturedAuth.push({
          type: 'signUp',
          params,
          error: err instanceof Error ? err.message : String(err),
        })
        throw err
      }
    }

    const originalSignIn = (supabase.auth.signInWithPassword as any).bind(supabase.auth)
    ;(supabase.auth as any).signInWithPassword = async (params: any) => {
      try {
        const res = await originalSignIn(params)
        ;(window as any).__capturedAuth.push({ type: 'signInWithPassword', params, res })
        return res
      } catch (err) {
        ;(window as any).__capturedAuth.push({
          type: 'signInWithPassword',
          params,
          error: err instanceof Error ? err.message : String(err),
        })
        throw err
      }
    }

    const originalGetSession = (supabase.auth.getSession as any).bind(supabase.auth)
    ;(supabase.auth as any).getSession = async () => {
      try {
        const res = await originalGetSession()
        ;(window as any).__capturedAuth.push({ type: 'getSession', res })
        return res
      } catch (err) {
        ;(window as any).__capturedAuth.push({ type: 'getSession', error: err instanceof Error ? err.message : String(err) })
        throw err
      }
    }
  }
} catch (e) {
  console.warn('Supabase debug instrumentation failed:', e)
}

// Auth helper functions
export const authHelpers = {
  // Sign up with email and password
  signUp: async (email: string, password: string, metadata?: Record<string, unknown>) => {
    return await supabase.auth.signUp({
      email,
      password,
      options: {
        data: metadata,
      },
    })
  },

  // Sign in with email and password
  signIn: async (email: string, password: string) => {
    return await supabase.auth.signInWithPassword({
      email,
      password,
    })
  },

  // Sign out
  signOut: async () => {
    return await supabase.auth.signOut()
  },

  // Sign in with OAuth provider
  signInWithOAuth: async (provider: 'google' | 'github' | 'gitlab' | 'bitbucket' | 'azure' | 'facebook' | 'discord' | 'twitch' | 'spotify' | 'slack' | 'workos') => {
    return await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: appUrl ? `${appUrl}/auth/callback` : undefined,
      },
    })
  },

  // Send reset password email
  resetPasswordForEmail: async (email: string) => {
    return await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: appUrl ? `${appUrl}/auth/update-password` : undefined,
    })
  },

  // Update user password (after recovery or when logged in)
  updatePassword: async (newPassword: string) => {
    return await supabase.auth.updateUser({
      password: newPassword,
    })
  },

  // Get current user
  getUser: async () => {
    return await supabase.auth.getUser()
  },

  // Get current session
  getSession: async () => {
    return await supabase.auth.getSession()
  },

  // Listen to auth state changes
  onAuthStateChange: (callback: (event: AuthChangeEvent, session: Session | null) => void) => {
    return supabase.auth.onAuthStateChange(callback)
  },
}
