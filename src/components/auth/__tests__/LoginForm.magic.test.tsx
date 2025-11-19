import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { LoginForm } from '../LoginForm'

vi.mock('@/lib/supabase', () => {
  return {
    authHelpers: {
      signInWithMagicLink: vi.fn(async () => ({ error: null })),
      signIn: vi.fn(async () => ({ data: { user: { email: 'user@example.com', user_metadata: {} } }, error: null })),
    },
  }
})

describe('LoginForm Magic Link', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('usa Magic Link como padrão e envia OTP por e-mail', async () => {
    render(
      <MemoryRouter>
        <LoginForm />
      </MemoryRouter>
    )

    const emailInput = screen.getByLabelText(/email/i)
    fireEvent.change(emailInput, { target: { value: 'user@example.com' } })

    const submitButton = screen.getByRole('button', { name: /enviar magic link/i })
    fireEvent.click(submitButton)

    const { authHelpers } = await import('@/lib/supabase')
    expect(authHelpers.signInWithMagicLink).toHaveBeenCalledWith('user@example.com')
  })

  it('alterna para modo senha e faz login normal', async () => {
    render(
      <MemoryRouter>
        <LoginForm />
      </MemoryRouter>
    )

    const toggle = screen.getByRole('button', { name: /entrar com senha/i })
    fireEvent.click(toggle)

    const emailInput = screen.getByLabelText(/email/i)
    fireEvent.change(emailInput, { target: { value: 'user@example.com' } })

    const passwordInput = screen.getByLabelText(/senha/i)
    fireEvent.change(passwordInput, { target: { value: 'secret' } })

    const submitButton = screen.getByRole('button', { name: /entrar/i })
    fireEvent.click(submitButton)

    const { authHelpers } = await import('@/lib/supabase')
    expect(authHelpers.signIn).toHaveBeenCalledWith('user@example.com', 'secret')
  })
})