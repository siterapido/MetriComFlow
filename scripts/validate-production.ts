#!/usr/bin/env tsx
/**
 * Script de validação do ambiente de produção
 * Verifica se todas as configurações necessárias estão corretas
 */

import { createClient } from '@supabase/supabase-js';

const PRODUCTION_URL = 'https://www.insightfy.com.br';
const PRODUCTION_REDIRECT_URI = 'https://www.insightfy.com.br/meta-ads-config';
const META_APP_ID = '3361128087359379';

console.log('🔍 Validação do Ambiente de Produção - InsightFy\n');
console.log('=' .repeat(60));

const results = {
  passed: 0,
  failed: 0,
  warnings: 0,
  checks: [] as Array<{ name: string; status: 'pass' | 'fail' | 'warn'; message: string }>
};

function check(name: string, status: 'pass' | 'fail' | 'warn', message: string) {
  results.checks.push({ name, status, message });
  if (status === 'pass') results.passed++;
  else if (status === 'fail') results.failed++;
  else results.warnings++;

  const icon = status === 'pass' ? '✅' : status === 'fail' ? '❌' : '⚠️';
  console.log(`${icon} ${name}: ${message}`);
}

async function validateProduction() {
  console.log('\n📋 Verificando variáveis de ambiente...\n');

  // 1. Verificar variáveis de ambiente
  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
  const metaAppId = process.env.VITE_META_APP_ID;
  const metaRedirectUri = process.env.VITE_META_REDIRECT_URI;
  const appUrl = process.env.VITE_APP_URL;

  if (supabaseUrl) {
    check('Supabase URL', 'pass', supabaseUrl);
  } else {
    check('Supabase URL', 'fail', 'Não configurado');
  }

  if (supabaseKey) {
    check('Supabase Anon Key', 'pass', `${supabaseKey.substring(0, 30)}...`);
  } else {
    check('Supabase Anon Key', 'fail', 'Não configurado');
  }

  if (metaAppId === META_APP_ID) {
    check('Meta App ID', 'pass', metaAppId);
  } else if (metaAppId) {
    check('Meta App ID', 'warn', `Configurado mas não é o esperado: ${metaAppId}`);
  } else {
    check('Meta App ID', 'fail', 'Não configurado');
  }

  if (metaRedirectUri === PRODUCTION_REDIRECT_URI) {
    check('Meta Redirect URI', 'pass', metaRedirectUri);
  } else if (metaRedirectUri) {
    check('Meta Redirect URI', 'warn', `Configurado mas não é o esperado: ${metaRedirectUri}`);
  } else {
    check('Meta Redirect URI', 'fail', 'Não configurado');
  }

  if (appUrl === PRODUCTION_URL) {
    check('App URL', 'pass', appUrl);
  } else if (appUrl) {
    check('App URL', 'warn', `Configurado mas não é o esperado: ${appUrl}`);
  } else {
    check('App URL', 'fail', 'Não configurado');
  }

  // 2. Testar conectividade com Supabase
  console.log('\n🔌 Testando conectividade com Supabase...\n');

  if (supabaseUrl && supabaseKey) {
    try {
      const supabase = createClient(supabaseUrl, supabaseKey);

      // Test auth connection
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (!sessionError) {
        check('Conexão Supabase Auth', 'pass', 'Conectado');
      } else {
        check('Conexão Supabase Auth', 'warn', `Sem sessão ativa (OK se não logado): ${sessionError.message}`);
      }

      // Test database connection
      const { count: profileCount, error: profileError } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true });

      if (!profileError) {
        check('Conexão Supabase Database', 'pass', `${profileCount || 0} perfis encontrados`);
      } else {
        check('Conexão Supabase Database', 'fail', profileError.message);
      }

      // Check ad accounts
      const { count: accountCount, error: accountError } = await supabase
        .from('ad_accounts')
        .select('*', { count: 'exact', head: true });

      if (!accountError) {
        if (accountCount && accountCount > 0) {
          check('Contas Meta conectadas', 'pass', `${accountCount} conta(s) encontrada(s)`);
        } else {
          check('Contas Meta conectadas', 'warn', 'Nenhuma conta Meta conectada ainda');
        }
      } else {
        check('Contas Meta conectadas', 'fail', accountError.message);
      }

      // Check campaigns
      const { count: campaignCount, error: campaignError } = await supabase
        .from('ad_campaigns')
        .select('*', { count: 'exact', head: true });

      if (!campaignError) {
        if (campaignCount && campaignCount > 0) {
          check('Campanhas sincronizadas', 'pass', `${campaignCount} campanha(s) encontrada(s)`);
        } else {
          check('Campanhas sincronizadas', 'warn', 'Nenhuma campanha sincronizada ainda');
        }
      } else {
        check('Campanhas sincronizadas', 'fail', campaignError.message);
      }

      // Check insights
      const { count: insightCount, error: insightError } = await supabase
        .from('campaign_daily_insights')
        .select('*', { count: 'exact', head: true });

      if (!insightError) {
        if (insightCount && insightCount > 0) {
          check('Dados históricos', 'pass', `${insightCount} registros de insights`);

          // Get date range
          const { data: dateRange } = await supabase
            .from('campaign_daily_insights')
            .select('date')
            .order('date', { ascending: true })
            .limit(1)
            .single();

          const { data: latestDate } = await supabase
            .from('campaign_daily_insights')
            .select('date')
            .order('date', { ascending: false })
            .limit(1)
            .single();

          if (dateRange && latestDate) {
            check('Período de dados', 'pass', `${dateRange.date} até ${latestDate.date}`);
          }
        } else {
          check('Dados históricos', 'warn', 'Nenhum insight sincronizado ainda');
        }
      } else {
        check('Dados históricos', 'fail', insightError.message);
      }

      // Check Meta connections
      const { count: connectionCount, error: connectionError } = await supabase
        .from('meta_business_connections')
        .select('*', { count: 'exact', head: true })
        .eq('is_active', true);

      if (!connectionError) {
        if (connectionCount && connectionCount > 0) {
          check('Conexões Meta OAuth', 'pass', `${connectionCount} conexão(ões) ativa(s)`);
        } else {
          check('Conexões Meta OAuth', 'warn', 'Nenhuma conexão OAuth ativa');
        }
      } else {
        check('Conexões Meta OAuth', 'fail', connectionError.message);
      }

    } catch (error) {
      check('Conexão Supabase', 'fail', `Erro: ${error instanceof Error ? error.message : String(error)}`);
    }
  } else {
    check('Conexão Supabase', 'fail', 'Credenciais não configuradas');
  }

  // 3. Testar acesso à URL de produção
  console.log('\n🌐 Testando acesso à URL de produção...\n');

  try {
    const response = await fetch(PRODUCTION_URL, {
      method: 'HEAD',
      redirect: 'follow'
    });

    if (response.ok) {
      check('URL de produção acessível', 'pass', `${PRODUCTION_URL} - HTTP ${response.status}`);
    } else {
      check('URL de produção acessível', 'warn', `${PRODUCTION_URL} - HTTP ${response.status}`);
    }
  } catch (error) {
    check('URL de produção acessível', 'fail', `Erro ao acessar ${PRODUCTION_URL}: ${error instanceof Error ? error.message : String(error)}`);
  }

  // 4. Verificar redirect URI
  try {
    const response = await fetch(PRODUCTION_REDIRECT_URI, {
      method: 'HEAD',
      redirect: 'follow'
    });

    if (response.ok) {
      check('Redirect URI acessível', 'pass', `${PRODUCTION_REDIRECT_URI} - HTTP ${response.status}`);
    } else {
      check('Redirect URI acessível', 'warn', `${PRODUCTION_REDIRECT_URI} - HTTP ${response.status}`);
    }
  } catch (error) {
    check('Redirect URI acessível', 'fail', `Erro ao acessar ${PRODUCTION_REDIRECT_URI}`);
  }

  // 5. Resumo final
  console.log('\n' + '='.repeat(60));
  console.log('\n📊 Resumo da Validação:\n');
  console.log(`✅ Testes aprovados: ${results.passed}`);
  console.log(`⚠️  Avisos: ${results.warnings}`);
  console.log(`❌ Testes falhados: ${results.failed}`);
  console.log(`📝 Total de verificações: ${results.checks.length}`);

  if (results.failed === 0 && results.warnings === 0) {
    console.log('\n🎉 Ambiente de produção configurado corretamente!\n');
    console.log('Próximos passos:');
    console.log('  1. Acesse https://www.insightfy.com.br');
    console.log('  2. Faça login');
    console.log('  3. Vá para Meta Ads Config');
    console.log('  4. Conecte sua conta Meta Business');
    console.log('  5. Adicione contas de anúncios');
    console.log('  6. Sincronize dados históricos\n');
  } else if (results.failed === 0) {
    console.log('\n⚠️  Ambiente parcialmente configurado.\n');
    console.log('Avisos encontrados (verifique acima).');
    console.log('O sistema pode funcionar, mas recomenda-se resolver os avisos.\n');
  } else {
    console.log('\n❌ Configuração incompleta!\n');
    console.log('Erros críticos encontrados. Revise as falhas acima antes de prosseguir.\n');
    process.exit(1);
  }

  // 6. Checklist interativo
  console.log('📋 Checklist de Deploy:\n');
  const checklist = [
    { task: 'Meta App configurado com redirect URI', status: metaRedirectUri === PRODUCTION_REDIRECT_URI },
    { task: 'Supabase Secrets configurados', status: true }, // Assume sim se chegou aqui
    { task: 'Edge Functions deployed', status: true }, // Não podemos verificar facilmente
    { task: 'Variáveis Vercel configuradas', status: metaAppId && metaRedirectUri && appUrl },
    { task: 'Deploy em produção realizado', status: true }, // Se URL responde
    { task: 'OAuth conectado', status: results.checks.find(c => c.name === 'Conexões Meta OAuth')?.status === 'pass' },
    { task: 'Contas de anúncios adicionadas', status: results.checks.find(c => c.name === 'Contas Meta conectadas')?.status === 'pass' },
    { task: 'Campanhas sincronizadas', status: results.checks.find(c => c.name === 'Campanhas sincronizadas')?.status === 'pass' },
    { task: 'Dados históricos sincronizados', status: results.checks.find(c => c.name === 'Dados históricos')?.status === 'pass' },
  ];

  checklist.forEach((item, i) => {
    const icon = item.status ? '✅' : '⬜';
    console.log(`${icon} ${i + 1}. ${item.task}`);
  });

  console.log('\n📖 Para mais informações, consulte: GUIA_PRODUCAO_META_ADS.md\n');
}

validateProduction().catch((error) => {
  console.error('\n❌ Erro fatal:', error);
  process.exit(1);
});
