import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Mock createClient from supabase-js to control auth calls
vi.mock('@supabase/supabase-js', () => {
  const fakeAuth = {
    signInWithOtp: vi.fn(async (_params: any) => ({ data: {}, error: null })),
    signInWithOAuth: vi.fn(async (_params: any) => ({ data: {}, error: null })),
    signInWithPassword: vi.fn(async (_params: any) => ({ data: {}, error: null })),
    signOut: vi.fn(async () => ({ data: {}, error: null })),
    getSession: vi.fn(async () => ({ data: { session: null }, error: null })),
    onAuthStateChange: vi.fn((_cb: any) => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
    resetPasswordForEmail: vi.fn(async (_email: string, _opts: any) => ({ data: {}, error: null })),
    updateUser: vi.fn(async (_params: any) => ({ data: {}, error: null })),
  }

  const fakeFunctions = {
    invoke: vi.fn(async (_name: string, _options?: any) => ({ data: {}, error: null })),
  }

  return {
    createClient: vi.fn((_url: string, _key: string, _opts: any) => ({ auth: fakeAuth, functions: fakeFunctions })),
    // Types used only for TS, not needed at runtime
  }
})

function setWindowOrigin(origin: string) {
  // Define window.location.origin
  Object.defineProperty(window, 'location', {
    value: { origin },
    writable: true,
  })
}

describe('supabase authHelpers appUrl', () => {
  beforeEach(() => {
    vi.resetModules()
    // Default env vars
    ;(import.meta as any).env = {
      VITE_SUPABASE_URL: 'https://example.supabase.co',
      VITE_SUPABASE_ANON_KEY: 'anon',
      VITE_APP_URL: 'http://localhost:8082',
      DEV: false,
    }
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('usa a origem atual do navegador para magic link', async () => {
    setWindowOrigin('http://localhost:5173')
    const mod = await import('../supabase')
    const { authHelpers, supabase } = mod as any

    await authHelpers.signInWithMagicLink('user@example.com')

    expect(supabase.auth.signInWithOtp).toHaveBeenCalledTimes(1)
    const call = (supabase.auth.signInWithOtp as any).mock.calls[0][0]
    expect(call.options.emailRedirectTo).toBe('http://localhost:5173/auth/callback')
  })

  it('usa a origem atual do navegador para OAuth', async () => {
    setWindowOrigin('http://localhost:3000')
    const mod = await import('../supabase')
    const { authHelpers, supabase } = mod as any

    await authHelpers.signInWithOAuth('google')

    expect(supabase.auth.signInWithOAuth).toHaveBeenCalledTimes(1)
    const call = (supabase.auth.signInWithOAuth as any).mock.calls[0][0]
    expect(call.options.redirectTo).toBe('http://localhost:3000/auth/callback')
  })
})