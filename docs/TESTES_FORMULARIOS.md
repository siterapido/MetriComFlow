# Plano de Testes – Formulários Nativos

## 1) Usabilidade (com usuários reais)
- Cenários:
  - Preencher com campos obrigatórios faltantes → mensagens de erro inline.
  - Email/telefone inválidos → bloqueio de envio e feedback claro.
  - Mensagem de sucesso e redirecionamento quando configurado.
- Dispositivos: mobile (<= 390px), tablet e desktop.
- Tempo alvo: < 2 min para concluir um envio.

## 2) Integração com Meta Ads
- Pré-requisitos:
  - `META_PIXEL_ID`, `META_ACCESS_TOKEN` (e opcional `META_TEST_EVENT_CODE`) configurados.
  - Pixel ativo no Events Manager.
- Passos:
  1. Enviar formulário com `fbp/fbc` presentes (via Pixel na página externa ou cookie).
  2. Verificar em `Test Events` se o evento `Lead` chegou (deduplicado pelo `event_id`).
  3. Conferir parâmetros customizados (form_id, meta_* ids quando aplicável).

## 3) Performance
- Teste local com 100/500/1000 envios simulados (artificial) via `fetch` concorrente no endpoint `submit-lead-form`.
- KPIs:
  - Mediana do tempo de resposta < 300ms nos Edge Functions.
  - Nenhum erro 5xx.
  - Gravações no Supabase sem lock contention.

## 4) Exportação CSV
- Confirmar colunas fixas e dinâmicas; acentos/UTF-8 corretos; separador `,`.
- Validar importação no Excel/Sheets e em ferramentas de marketing (quando aplicável).

## 5) Segurança
- Sem dados sensíveis em logs.
- Falhas de validação não criam leads e retornam 400 com `issues`.
- Acesso à exportação bloqueado sem login ou sem permissão (`has_crm_access`).

