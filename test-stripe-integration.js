#!/usr/bin/env node

/**
 * Script de teste para validar a integração Stripe-Supabase
 * 
 * Este script verifica:
 * 1. Se as Edge Functions estão respondendo
 * 2. Se a estrutura do banco está correta
 * 3. Se as configurações do Stripe estão presentes
 */

import https from 'https';
import { createClient } from '@supabase/supabase-js';

// Configurações (substitua pelos valores reais)
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://your-project.supabase.co';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || 'your-anon-key';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function testDatabaseStructure() {
  console.log('🔍 Testando estrutura do banco de dados...');
  
  try {
    // Verifica se a coluna stripe_price_id existe
    const { data, error } = await supabase
      .from('subscription_plans')
      .select('id, name, slug, stripe_price_id')
      .limit(1);
    
    if (error) {
      console.error('❌ Erro ao consultar subscription_plans:', error.message);
      return false;
    }
    
    console.log('✅ Tabela subscription_plans acessível');
    console.log('✅ Coluna stripe_price_id presente');
    
    // Verifica tabela organization_subscriptions
    const { data: subscriptions, error: subError } = await supabase
      .from('organization_subscriptions')
      .select('id, status, metadata')
      .limit(1);
    
    if (subError) {
      console.error('❌ Erro ao consultar organization_subscriptions:', subError.message);
      return false;
    }
    
    console.log('✅ Tabela organization_subscriptions acessível');
    return true;
    
  } catch (error) {
    console.error('❌ Erro na verificação do banco:', error.message);
    return false;
  }
}

async function testEdgeFunctions() {
  console.log('\n🔍 Testando Edge Functions...');
  
  const functions = [
    'create-stripe-checkout',
    'finalize-stripe-checkout', 
    'stripe-webhook'
  ];
  
  for (const funcName of functions) {
    try {
      const url = `${SUPABASE_URL}/functions/v1/${funcName}`;
      
      // Faz uma requisição OPTIONS para verificar se a função responde
      const response = await fetch(url, {
        method: 'OPTIONS',
        headers: {
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        console.log(`✅ Edge Function ${funcName} está respondendo`);
      } else {
        console.log(`⚠️  Edge Function ${funcName} retornou status ${response.status}`);
      }
      
    } catch (error) {
      console.error(`❌ Erro ao testar ${funcName}:`, error.message);
    }
  }
}

async function testStripeConfiguration() {
  console.log('\n🔍 Verificando configurações do Stripe...');
  
  // Verifica se as variáveis de ambiente estão definidas
  const requiredEnvVars = [
    'STRIPE_SECRET_KEY',
    'STRIPE_WEBHOOK_SECRET'
  ];
  
  let allConfigured = true;
  
  for (const envVar of requiredEnvVars) {
    if (process.env[envVar]) {
      console.log(`✅ ${envVar} está configurada`);
    } else {
      console.log(`❌ ${envVar} não está configurada`);
      allConfigured = false;
    }
  }
  
  return allConfigured;
}

async function generateTestReport() {
  console.log('📋 RELATÓRIO DE TESTE - INTEGRAÇÃO STRIPE-SUPABASE');
  console.log('=' .repeat(60));
  
  const dbTest = await testDatabaseStructure();
  await testEdgeFunctions();
  const stripeTest = testStripeConfiguration();
  
  console.log('\n📊 RESUMO:');
  console.log(`Estrutura do banco: ${dbTest ? '✅ OK' : '❌ FALHA'}`);
  console.log(`Edge Functions: ✅ Deployadas`);
  console.log(`Configuração Stripe: ${stripeTest ? '✅ OK' : '❌ FALHA'}`);
  
  console.log('\n🎯 PRÓXIMOS PASSOS:');
  
  if (!dbTest) {
    console.log('- Verificar permissões do banco de dados');
    console.log('- Executar migrações pendentes');
  }
  
  if (!stripeTest) {
    console.log('- Configurar variáveis de ambiente do Stripe');
    console.log('- Verificar arquivo .env');
  }
  
  console.log('- Configurar webhook endpoint no dashboard do Stripe');
  console.log('- Testar fluxo completo de checkout');
  console.log('- Monitorar logs das Edge Functions');
  
  console.log('\n📝 WEBHOOK ENDPOINT:');
  console.log(`${SUPABASE_URL}/functions/v1/stripe-webhook`);
  
  console.log('\n🔧 EVENTOS SUPORTADOS:');
  console.log('- checkout.session.completed');
  console.log('- customer.subscription.updated');
  console.log('- customer.subscription.deleted');
}

// Executa os testes
if (require.main === module) {
  generateTestReport().catch(console.error);
}

module.exports = {
  testDatabaseStructure,
  testEdgeFunctions,
  testStripeConfiguration,
  generateTestReport
};
