## Objetivo
- Tornar o Magic Link (login por e-mail sem senha) a opção padrão na tela de login, mantendo login por senha apenas como alternativa secundária.

## Mudanças de Código
### Helpers de Autenticação
- Adicionar `authHelpers.signInWithMagicLink(email)` usando `supabase.auth.signInWithOtp({ email, options: { emailRedirectTo } })` em `src/lib/supabase.ts:141`.
- `emailRedirectTo` aponta para `appUrl + '/auth/callback'` (já existente em OAuth), garantindo que `detectSessionInUrl` (`src/lib/supabase.ts:41-46`) capture a sessão ao retornar pelo link.
- Expor `signInWithMagicLink` no contexto em `src/context/AuthContext.tsx:5-15, 73-83` para uso futuro, embora o formulário possa chamar direto dos helpers.

### UI de Login
- Transformar `src/components/auth/LoginForm.tsx` para operar em dois modos:
  - Modo padrão: Magic Link (apenas campo de e-mail + botão “Enviar link por e-mail”).
  - Modo secundário: Senha (mostra os campos atuais de e-mail/senha).
- Alternância simples via estado local com link “Entrar com senha”/“Voltar para Magic Link”.
- Após enviar com sucesso, mostrar toast “Enviamos um link de acesso para seu e‑mail” e não navegar; a navegação ocorre após o usuário clicar no link recebido.
- Manter “Esqueci minha senha” visível apenas no modo senha.

### Rotas / Callback
- Reaproveitar `src/pages/AuthCallback.tsx:5-16` como destino do `emailRedirectTo`; ele já redireciona para `/dashboard` quando há usuário em sessão.
- Nenhuma nova rota necessária; `src/App.tsx:56-59` já tem `'/auth/callback'` e `detectSessionInUrl` está ativo.

## Segurança e Configuração
- Pré-requisito: configurar envio de e‑mail no projeto Supabase (SMTP ou provider embutido) e incluir `APP_URL` (domínio) na lista de redirecionamentos permitidos no Auth.
- Não registrar chaves/segredos no repositório; usar `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_APP_URL` já presentes (`src/lib/supabase.ts:4-15`).

## Validação
- Cenário 1: Solicitar Magic Link com e‑mail válido; verificar toast e recebimento do e‑mail.
- Cenário 2: Clicar no Magic Link; confirmar que a sessão é criada e `AuthCallback` navega para `/dashboard`.
- Cenário 3: Testar alternância para login por senha; garantir que fluxo atual segue funcionando (inclui query `?next=` já suportada em `src/components/auth/LoginForm.tsx:35-43`).
- Cenário 4: Testar erro (e‑mail inválido / problemas de envio); exibir toast de erro adequado.

## Arquivos a Alterar
- `src/lib/supabase.ts` — adicionar `signInWithMagicLink`.
- `src/context/AuthContext.tsx` — expor método (opcional agora, útil depois).
- `src/components/auth/LoginForm.tsx` — tornar Magic Link o modo padrão com alternância para senha.
- Nenhuma alteração em `src/pages/Auth.tsx` além do texto (opcional), pois o componente continua sendo `LoginForm`.

## Resultado Esperado
- Usuários veem Magic Link como primeira opção e podem entrar sem senha; login por senha permanece acessível como alternativa.

Confirma que posso implementar estas mudanças?