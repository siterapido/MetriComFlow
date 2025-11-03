-- ============================================================================
-- SCRIPT DE VERIFICAÇÃO - META ADS INTEGRATION
-- Execute no Supabase SQL Editor para verificar se tudo foi instalado
-- ============================================================================

\echo '🔍 Verificando instalação da integração Meta Ads...\n'

-- ============================================================================
-- 1. TABELA meta_conversion_events
-- ============================================================================

\echo '1️⃣ Verificando tabela meta_conversion_events...'

SELECT
  CASE
    WHEN COUNT(*) = 1 THEN '✅ Tabela meta_conversion_events existe'
    ELSE '❌ Tabela meta_conversion_events NÃO encontrada'
  END as status
FROM information_schema.tables
WHERE table_schema = 'public' AND table_name = 'meta_conversion_events';

SELECT
  CASE
    WHEN COUNT(*) >= 21 THEN '✅ Colunas da meta_conversion_events: ' || COUNT(*) || ' (esperado: 21)'
    ELSE '❌ Colunas insuficientes: ' || COUNT(*) || ' (esperado: 21)'
  END as status
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'meta_conversion_events';

-- ============================================================================
-- 2. COLUNAS UTM - LEADS
-- ============================================================================

\echo '\n2️⃣ Verificando colunas UTM na tabela leads...'

SELECT
  CASE
    WHEN COUNT(*) = 6 THEN '✅ Colunas UTM na tabela leads: 6/6'
    ELSE '❌ Colunas UTM incompletas: ' || COUNT(*) || '/6'
  END as status
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'leads'
  AND column_name IN ('utm_source', 'utm_campaign', 'utm_medium', 'utm_term', 'utm_content', 'fbclid');

-- Listar colunas encontradas
SELECT
  '  → ' || column_name || ' (' || data_type || ')' as coluna
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'leads'
  AND column_name IN ('utm_source', 'utm_campaign', 'utm_medium', 'utm_term', 'utm_content', 'fbclid')
ORDER BY column_name;

-- ============================================================================
-- 3. COLUNAS UTM - LEAD_FORM_SUBMISSIONS
-- ============================================================================

\echo '\n3️⃣ Verificando colunas UTM na tabela lead_form_submissions...'

SELECT
  CASE
    WHEN COUNT(*) = 6 THEN '✅ Colunas UTM na tabela lead_form_submissions: 6/6'
    ELSE '❌ Colunas UTM incompletas: ' || COUNT(*) || '/6'
  END as status
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'lead_form_submissions'
  AND column_name IN ('utm_source', 'utm_campaign', 'utm_medium', 'utm_term', 'utm_content', 'fbclid');

-- ============================================================================
-- 4. TRIGGERS
-- ============================================================================

\echo '\n4️⃣ Verificando trigger de conversão...'

SELECT
  CASE
    WHEN COUNT(*) = 1 THEN '✅ Trigger trigger_create_meta_conversion_event instalado'
    ELSE '❌ Trigger trigger_create_meta_conversion_event NÃO encontrado'
  END as status
FROM information_schema.triggers
WHERE trigger_name = 'trigger_create_meta_conversion_event';

-- ============================================================================
-- 5. RLS POLICIES
-- ============================================================================

\echo '\n5️⃣ Verificando RLS policies...'

SELECT
  CASE
    WHEN COUNT(*) >= 2 THEN '✅ RLS Policies na meta_conversion_events: ' || COUNT(*) || ' (esperado: 2+)'
    ELSE '❌ RLS Policies insuficientes: ' || COUNT(*) || ' (esperado: 2+)'
  END as status
FROM pg_policies
WHERE tablename = 'meta_conversion_events';

-- Listar policies encontradas
SELECT
  '  → ' || policyname || ' (' || cmd || ')' as policy
FROM pg_policies
WHERE tablename = 'meta_conversion_events'
ORDER BY policyname;

-- ============================================================================
-- 6. ÍNDICES
-- ============================================================================

\echo '\n6️⃣ Verificando índices criados...'

SELECT
  CASE
    WHEN COUNT(*) >= 5 THEN '✅ Índices na meta_conversion_events: ' || COUNT(*) || ' (esperado: 5+)'
    ELSE '⚠️ Índices: ' || COUNT(*) || ' (esperado: 5+)'
  END as status
FROM pg_indexes
WHERE tablename = 'meta_conversion_events';

-- ============================================================================
-- 7. ESTATÍSTICAS
-- ============================================================================

\echo '\n7️⃣ Estatísticas atuais...'

-- Contagem de eventos
SELECT
  'meta_conversion_events' as tabela,
  COUNT(*) as total_registros
FROM meta_conversion_events;

-- Eventos por status
SELECT
  status,
  COUNT(*) as total
FROM meta_conversion_events
GROUP BY status
ORDER BY total DESC;

-- Leads com UTM
SELECT
  'Leads com UTM tracking' as metrica,
  COUNT(*) as total
FROM leads
WHERE utm_source IS NOT NULL OR fbclid IS NOT NULL;

-- Leads por campanha Meta
SELECT
  'Leads de Meta Ads' as metrica,
  COUNT(*) as total
FROM leads
WHERE source = 'meta_ads';

-- ============================================================================
-- RESUMO FINAL
-- ============================================================================

\echo '\n✅ RESUMO DA VERIFICAÇÃO\n'
\echo 'Execute as queries acima para verificar cada componente.'
\echo 'Se todos mostrarem ✅, a instalação está completa!'
\echo '\n📚 Próximos passos:'
\echo '  1. Configurar Supabase secrets (META_ACCESS_TOKEN, META_PIXEL_ID)'
\echo '  2. Adicionar Meta Pixel ao index.html'
\echo '  3. Executar testes em STATUS-IMPLEMENTACAO.md'
\echo '\n'
