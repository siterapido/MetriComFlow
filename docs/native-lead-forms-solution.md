# Formulários Nativos Integrados ao CRM e Meta Ads

## 1. Objetivos de Negócio e Produto
- Construir formulários próprios hospedados no domínio InsightFy para máxima performance, controle e segurança.
- Sincronizar leads em tempo real com o CRM, permitindo que atualizações no CRM reflitam instantaneamente nos relatórios de formulários e vice-versa.
- Capturar automaticamente dados de campanhas Meta Ads (leadgen, web leads, UTMs) para atribuição precisa.
- Exigir campos críticos (nome, email, telefone, interesse) e possibilitar validações adicionais conforme tipo de campanha.
- Validar dados tanto no cliente (experiência responsiva) quanto no servidor (Supabase Edge Functions) antes de gravar no CRM.
- Persistir origem (`source`, `utm_*`, `fbp`, `fbc`) no ato da submissão para relatórios de atribuição.
- Gerar relatórios automáticos de conversão por formulário, campanha e estágio do funil.
- Garantir experiência responsiva (mobile first) e alinhada ao design system (`DESIGN_SYSTEM.md`).
- Oferecer personalização visual e lógica (condicionais, campos opcionais) por tipo de campanha.
- Centralizar o gerenciamento (criação, edição, acompanhamento) dentro do CRM com dashboards de performance.

## 2. Visão Geral da Solução
- **Form Builder no CRM**: usuários configuram formulários, campos obrigatórios, regras condicionais, temas e destinos de automação a partir da página `src/pages/LeadForms.tsx`.
- **Public Form Delivery**: nova rota pública (`/forms/:formId`) renderiza formulários nativos com base em metadados armazenados no Supabase, suportando embed via `<iframe>` ou script.
- **Camada de Serviços e Integrações**: Supabase Edge Functions orquestram validações, criação de leads, disparos para o CRM, Conversions API do Meta Ads e webhooks externos.
- **Observabilidade e Métricas**: views/materialized views no Supabase consolidam conversões por campanha, enquanto React Query + Realtime Streams atualizam cards e gráficos em tempo real no CRM.

## 3. Arquitetura Técnica

### 3.1 Frontend Público (`/forms/:id`)
- **Novo componente** `src/components/forms/FormRenderer.tsx` interpreta o schema JSON e gera dinamicamente campos do shadcn.
- **Hook** `usePublicLeadForm(formId)` (React Query) busca metadados (`lead_forms`, `lead_form_fields`, `lead_form_variants`) e assina canais Realtime para atualizações instantâneas (alterações de cópia, ativação/desativação).
- **Validação cliente**: schema dinâmico `zod` montado a partir da configuração de cada campo; integração com `react-hook-form`.
- **Captura de tracking**: utilitário `src/lib/tracking.ts` coleta `utm_*`, `fbclid`, `gclid`, `document.referrer`, timezone, device hints, cookies `fbp/fbc`.
- **Post-submission UX**: variantes suportam mensagens personalizadas, redirecionamento (`redirect_url`) ou apresentação de etapas seguintes.

### 3.2 CRM / Form Builder
- Extensão da página `src/pages/LeadForms.tsx` com:
  - Drawer/Modal de edição avançada de campos usando `FormBuilderCanvas` e `FieldPalette`.
  - Aba para personalização visual (cores primárias, tipografia, logos) baseada no design system.
  - Aba de integrações: seleção do pipeline, regra de distribuição (round-robin, owner fixo) e mapeamento de campanhas Meta Ads.
- **Componentes auxiliares** em `src/components/forms/builder`: `FieldCard`, `ValidationEditor`, `PreviewPane`, `VariantSelector`.
- Persistência imediata via mutações Supabase (`lead_form_fields`, `lead_form_variants`) e feedback com `useToast`.

### 3.3 Camada de Serviços (Supabase Edge Functions)
- `submit-lead-form`: recebe payload do formulário, valida contra schema, aplica sanitização (normalização de telefone, email), enfileira criação de lead e retorno ao cliente.
- `create-crm-lead`: função interna para criar/atualizar `leads`, `lead_activity`, distribuir para owners e anexar etiquetas conforme origem.
- `meta-conversion-dispatch`: envia evento `Lead` para Meta Conversions API com `event_id`, `fbp/fbc`, `utm_*`, deduplicação e tratamento de respostas.
- `sync-crm-to-forms`: escuta alterações relevantes no CRM (ex.: lead fechado) e atualiza métricas agregadas dos formulários para garantir bidirecionalidade.
- Todas as funções compartilham utilitário `lib/validation.ts` com schemas `zod` e `lib/telemetry.ts` para logging/observabilidade (Supabase Logs + Sentry).

### 3.4 Integração Meta Ads
- **Entrada (Lead Ads)**: reutiliza `supabase/functions/webhook-lead-ads` com ajustes para armazenar `form_id` Meta → `lead_form_meta_mappings`. Leads capturados via Meta Leadgen são reconciliados com formulários correspondentes por `meta_form_id`.
- **Saída (Conversions API)**: `meta-conversion-dispatch` envia evento com `event_id` igual ao `submission_id`, garantindo deduplicação entre Pixel e CAPI.
- **Sincronização de Campanhas**: tabela de mapeamento liga `lead_form_variants` a `ad_account_id`, `campaign_id`, `adset_id` e `ad_id` (todas opcionais) para relatórios de granularidade.

## 4. Modelagem de Dados (Supabase)

```sql
-- Extensões na tabela existente
ALTER TABLE public.lead_forms
  ADD COLUMN IF NOT EXISTS organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS schema_version integer DEFAULT 1,
  ADD COLUMN IF NOT EXISTS settings jsonb DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS theme jsonb DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS last_published_at timestamptz,
  ADD COLUMN IF NOT EXISTS default_owner_id uuid REFERENCES public.team_members(id);

CREATE TABLE public.lead_form_fields (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  form_id text REFERENCES public.lead_forms(id) ON DELETE CASCADE,
  key text NOT NULL,
  label text NOT NULL,
  type text NOT NULL CHECK (type IN ('text', 'email', 'phone', 'select', 'multiselect', 'textarea', 'checkbox', 'radio', 'date', 'hidden')),
  is_required boolean DEFAULT false,
  order_index integer DEFAULT 0,
  placeholder text,
  help_text text,
  options jsonb DEFAULT '[]'::jsonb,
  validations jsonb DEFAULT '{}'::jsonb,
  crm_field text, -- mapeamento (ex.: "email", "phone", "product_interest")
  meta_field text, -- campo nativo Meta Ads quando aplicável
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE public.lead_form_variants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  form_id text REFERENCES public.lead_forms(id) ON DELETE CASCADE,
  name text NOT NULL,
  slug text NOT NULL,
  campaign_source text, -- meta_ads, google_ads, organic...
  campaign_id uuid REFERENCES public.ad_campaigns(id) ON DELETE SET NULL,
  meta_ad_account_id text,
  meta_campaign_id text,
  meta_adset_id text,
  meta_ad_id text,
  theme_overrides jsonb DEFAULT '{}'::jsonb,
  automation_settings jsonb DEFAULT '{}'::jsonb,
  is_default boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE public.lead_form_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  form_id text REFERENCES public.lead_forms(id) ON DELETE CASCADE,
  variant_id uuid REFERENCES public.lead_form_variants(id) ON DELETE SET NULL,
  lead_id uuid REFERENCES public.leads(id) ON DELETE SET NULL,
  payload jsonb NOT NULL,
  errors jsonb,
  status text NOT NULL DEFAULT 'received' CHECK (status IN ('received', 'validated', 'synced_crm', 'failed')),
  source text,
  utm_source text,
  utm_medium text,
  utm_campaign text,
  utm_content text,
  utm_term text,
  meta_form_id text,
  meta_lead_id text,
  fbp text,
  fbc text,
  landing_page text,
  referrer text,
  user_agent text,
  ip_address inet,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE public.lead_form_submission_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id uuid REFERENCES public.lead_form_submissions(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  payload jsonb,
  created_at timestamptz DEFAULT now()
);

CREATE VIEW public.lead_form_performance AS
  SELECT
    lf.id AS form_id,
    lf.name,
    lfv.id AS variant_id,
    lfv.name AS variant_name,
    DATE_TRUNC('day', lfs.created_at) AS day,
    COUNT(*) FILTER (WHERE lfs.status IN ('validated', 'synced_crm')) AS submissions,
    COUNT(*) FILTER (WHERE lfs.lead_id IS NOT NULL) AS leads_crm,
    COUNT(*) FILTER (WHERE l.status = 'fechado_ganho') AS deals_closed,
    SUM(l.value) FILTER (WHERE l.status = 'fechado_ganho') AS revenue_won
  FROM public.lead_forms lf
  LEFT JOIN public.lead_form_variants lfv ON lfv.form_id = lf.id
  LEFT JOIN public.lead_form_submissions lfs ON lfs.form_id = lf.id AND lfs.variant_id = lfv.id
  LEFT JOIN public.leads l ON l.id = lfs.lead_id
  GROUP BY 1,2,3,4,5;
```

## 5. Fluxos Principais
1. **Criação e Publicação**: gestor cria o formulário, adiciona campos e variantes → `PublishForm` chama Edge Function que valida schema, atualiza `last_published_at` e aciona rebuild do cache estático (se necessário).
2. **Personalização por Campanha**: ao vincular uma campanha Meta Ads, o CRM salva mapeamentos no Supabase e gera tokens de embed específicos por variante.
3. **Submissão Pública**: usuário acessa `/forms/:id?variant=slug` → `FormRenderer` monta schema, coleta tracking, dispara POST → `submit-lead-form`.
4. **Processamento no Servidor**: função valida payload, cria `lead_form_submissions` (`status=validated`), chama `create-crm-lead` (que cria/atualiza lead, atualiza contadores nas views e emite eventos Realtime).
5. **Atualizações Bidirecionais**: mudanças no lead (status, owner, prioridade) disparam trigger `AFTER UPDATE` → `sync-crm-to-forms` registra evento e atualiza métricas agregadas usadas nos dashboards do builder.
6. **Reporting**: dashboards consomem `lead_form_performance` + `campaign_daily_insights` para mostrar conversões, CPL e ROAS por formulário/campanha.

## 6. Validação, Segurança e Compliance
- **Sanitização**: normalização de email/telefone, limites de caracteres, remoção de HTML.
- **Rate limiting**: bucket por IP + `form_id` via tabela `form_rate_limits` (incremental com TTL) para mitigar spam/bots.
- **Honeypot e reCAPTCHA** opcionais, configuráveis por formulário.
- **Assinatura de embeds**: tokens HMAC (`form_id`, `expires_at`) garantem que apenas páginas autorizadas utilizem o iframe/script.
- **Criptografia de PII sensível**: armazenar `ip_address` e `user_agent` somente para auditoria, com política de retenção e anonimização após 180 dias.
- **LGPD**: checkbox obrigatório para termos de privacidade, registro de consentimento no payload.

## 7. Captura de Origem e Meta Ads
- `tracking.ts` coleta `utm_*`, `referrer`, `firstTouch`/`lastTouch` e injeta no payload.
- Pixel Meta: snippet opcional embutido no formulário (ou orientações para páginas externas) garantindo criação de `fbp/fbc`.
- Conversions API: `meta-conversion-dispatch` envia evento `Lead` com `event_time`, `user_data` (email/telefone hasheados em SHA-256), `custom_data` (valor estimado, form_id) e `action_source='website'`.
- Reconciliação Leadgen: se `meta_form_id` existir, submissões são linkadas a leads já recebidos pelo webhook, evitando duplicidade.

## 8. Personalização e Experiência
- **Temas**: `theme` (global) + `theme_overrides` por variante controlam cores (primária, background), tipografia e espaçamentos; aplicados via CSS variables (`:root`).
- **Layouts**: suporte a modo single-step, multi-step (wizard) e compacto (mobile first).
- **Campos condicionais**: `validations.jsonb` suporta regras `show_if`/`require_if` avaliadas no cliente e servidor.
- **Componentes reutilizados**: Inputs, Selects, Switches do shadcn adaptados com classes definidas no design system.
- **Acessibilidade**: labels conectados, mensagens de erro descritivas, navegação teclado e contrastes adequados.

## 9. Relatórios e Dashboard
- Cards principais: total de leads, conversão por estágio, CPL/CPA, ROAS por formulário e por campanha.
- Gráficos: linha (conversões por dia), pizza (origem da captura), tabela detalhada com filtros por status/campanha/período.
- Exportações: CSV/Excel das submissões (com filtros) via `supabase/functions/export-lead-form`.
- Alertas: regra opcional para disparar Slack/Email quando lead urgente entra ou taxa de conversão cai abaixo de limiar.

## 10. Roadmap de Implementação
1. **Fase 1 – Fundamentos (1 sprint)**
   - Migration das novas tabelas/views.
   - FormRenderer público com validação básica e integração com `submit-lead-form`.
   - Atualização do builder para suportar criação/edição de campos e publicação.
2. **Fase 2 – Integrações Meta e Automação (1 sprint)**
   - Implementar `meta-conversion-dispatch` + armazenamento de `fbp/fbc`.
   - Vincular variantes a campanhas Meta Ads e reconciliar leads do webhook.
   - Distribuição automática de leads no CRM e atualização em tempo real dos dashboards.
3. **Fase 3 – Analytics Avançado e Personalização (1 sprint)**
   - Habilitar temas, variantes, formulários multi-etapa e regras condicionais.
   - Construir dashboards completos com `lead_form_performance`.
   - Implementar exportações, alertas e testes E2E (smoke) de submissão.

## 11. Considerações Técnicas
- Dependências adicionais: `zod`, `lodash-es` (clonagem/ordenação), `ua-parser-js` (detectar device), `@supabase/supabase-js` (Edge Functions).
- Monitoramento: logs estruturados nas Edge Functions, alertas via Supabase Insights, métricas de erro no Sentry.
- Testes: unitários para geração de schema (`FormRenderer`), testes de integração para `submit-lead-form` (Deno), testes manuais de responsividade conforme guia em `docs/design`.

Com essa arquitetura, os formulários passam a operar como uma extensão nativa do CRM, preservando rastreabilidade ponta a ponta das campanhas Meta Ads e entregando governança total sobre a aquisição de leads.
