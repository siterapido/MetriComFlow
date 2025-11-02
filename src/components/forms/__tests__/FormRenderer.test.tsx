import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { FormRenderer } from '@/components/forms/FormRenderer'

describe('FormRenderer', () => {
  const baseFields = [
    {
      id: 'f1', key: 'full_name', label: 'Nome', type: 'text', isRequired: true,
      order: 1, placeholder: 'Seu nome', helpText: 'Nome completo', options: [], validations: {}
    },
    {
      id: 'f2', key: 'email', label: 'Email', type: 'email', isRequired: true,
      order: 2, placeholder: 'email@empresa.com', helpText: undefined, options: [], validations: {}
    },
    {
      id: 'f3', key: 'phone', label: 'Telefone / WhatsApp', type: 'phone', isRequired: false,
      order: 3, placeholder: '(11) 99999-9999', helpText: undefined, options: [], validations: {}
    },
    {
      id: 'f4', key: 'source', label: 'Como nos conheceu?', type: 'select', isRequired: false,
      order: 4, placeholder: 'Selecione', helpText: undefined, options: [
        { label: 'Google', value: 'google' },
        { label: 'Indicação', value: 'refer' },
      ], validations: {}
    },
    {
      id: 'f5', key: 'terms', label: 'Aceito os termos', type: 'checkbox', isRequired: true,
      order: 5, placeholder: '', helpText: undefined, options: [], validations: {}
    },
    {
      id: 'f6', key: 'notes', label: 'Mensagem', type: 'textarea', isRequired: false,
      order: 6, placeholder: 'Detalhes', helpText: undefined, options: [], validations: { maxLength: 600 }
    },
    {
      id: 'f7', key: 'campaign', label: 'Campanha', type: 'hidden', isRequired: false,
      order: 7, placeholder: '', helpText: undefined, options: [], validations: { defaultValue: 'spring' }
    },
  ] as const

  it('renderiza campos e valida obrigatórios', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn()

    render(
      <FormRenderer
        formName="Formulário de Teste"
        fields={baseFields as any}
        onSubmit={async (v) => onSubmit(v)}
      />
    )

    // Campos visíveis
    expect(screen.getByLabelText(/Nome/)).toBeInTheDocument()
    expect(screen.getByLabelText(/Email/)).toBeInTheDocument()
    expect(screen.getByLabelText(/Telefone/)).toBeInTheDocument()
    expect(screen.getByText('Formulário de Teste')).toBeInTheDocument()

    // Tenta enviar vazio → deve mostrar erros dos obrigatórios
    await user.click(screen.getByRole('button', { name: /enviar formulário/i }))
    const obrigatorios = await screen.findAllByText(/obrigatório/i)
    expect(obrigatorios.length).toBeGreaterThanOrEqual(2) // Pelo menos Nome e Email

    // Preenche e marca checkbox
    await user.type(screen.getByLabelText(/Nome/), 'Ana Souza')
    await user.type(screen.getByLabelText(/Email/), 'ana@empresa.com')
    await user.click(screen.getByLabelText(/Aceito os termos/))

    await user.click(screen.getByRole('button', { name: /enviar formulário/i }))

    // onSubmit chamado com payload contendo campos
    expect(onSubmit).toHaveBeenCalledTimes(1)
    const payload = onSubmit.mock.calls[0][0] as Record<string, unknown>
    expect(payload.full_name).toBe('Ana Souza')
    expect(payload.email).toBe('ana@empresa.com')
    expect(payload.campaign).toBe('spring') // hidden default
  })
})
