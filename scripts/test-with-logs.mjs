#!/usr/bin/env node

import puppeteer from 'puppeteer';

console.log('\n🔍 TESTE COM LOGS COMPLETOS\n');

const browser = await puppeteer.launch({
  headless: false,
  args: ['--no-sandbox'],
  defaultViewport: { width: 1600, height: 1000 }
});

const page = await browser.newPage();

// Capturar TODOS os logs do console
const consoleLogs = [];
page.on('console', msg => {
  const text = msg.text();
  consoleLogs.push(text);
  console.log(`[CONSOLE ${msg.type()}]:`, text);
});

// Capturar erros
page.on('pageerror', err => {
  console.log('[PAGE ERROR]:', err.message);
});

// Capturar requisições falhadas
page.on('requestfailed', req => {
  console.log('[REQUEST FAILED]:', req.url(), req.failure().errorText);
});

try {
  // Login
  console.log('\n1️⃣ Login...\n');
  await page.goto('https://www.insightfy.com.br/login', { waitUntil: 'networkidle2' });
  await page.waitForSelector('input[type="email"]');
  await page.type('input[type="email"]', 'testefinal2@gmail.com');
  await page.type('input[type="password"]', '@Fidel2026');
  await page.click('button[type="submit"]');
  await page.waitForNavigation();
  console.log('✅ Login OK\n');
  
  // Navegar
  console.log('2️⃣ Navegando para /meta-ads-config...\n');
  await page.goto('https://www.insightfy.com.br/meta-ads-config', { waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 3000));
  console.log('✅ Página carregada\n');
  
  // Clicar e aguardar logs
  console.log('3️⃣ Clicando em "Conectar Agora"...\n');
  console.log('═══════════════════════════════════════════════════');
  console.log('CAPTURANDO LOGS DO NAVEGADOR:');
  console.log('═══════════════════════════════════════════════════\n');
  
  consoleLogs.length = 0; // Limpar logs anteriores
  
  await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll('button'));
    const btn = buttons.find(b => b.textContent.includes('Conectar Agora'));
    if (btn) btn.click();
  });
  
  // Aguardar tempo suficiente para capturar logs
  await new Promise(r => setTimeout(r, 10000));
  
  console.log('\n═══════════════════════════════════════════════════');
  console.log('RESUMO DOS LOGS:');
  console.log('═══════════════════════════════════════════════════\n');
  
  const importantLogs = consoleLogs.filter(log => 
    log.includes('Error') || 
    log.includes('meta') || 
    log.includes('OAuth') || 
    log.includes('redirect') ||
    log.includes('auth') ||
    log.includes('🔐') ||
    log.includes('🔗') ||
    log.includes('⚙️') ||
    log.includes('❌')
  );
  
  if (importantLogs.length > 0) {
    console.log('Logs importantes capturados:');
    importantLogs.forEach(log => console.log(`  - ${log}`));
  } else {
    console.log('Nenhum log relevante capturado.');
    console.log('\nTodos os logs:');
    consoleLogs.forEach(log => console.log(`  - ${log}`));
  }
  
  const finalUrl = page.url();
  console.log(`\n📍 URL final: ${finalUrl}\n`);
  
  if (finalUrl.includes('facebook.com')) {
    console.log('✅ Redirecionou para Facebook!\n');
    const urlObj = new URL(finalUrl);
    const redirectUri = urlObj.searchParams.get('redirect_uri');
    console.log(`🔗 Redirect URI: ${redirectUri ? decodeURIComponent(redirectUri) : 'N/A'}\n`);
  } else {
    console.log('❌ NÃO redirecionou para Facebook.\n');
    console.log('Isso indica um erro na Edge Function ou no frontend.\n');
  }
  
  console.log('⏸️  Pressione Ctrl+C para fechar\n');
  await new Promise(() => {});
  
} catch (e) {
  console.error('❌ Erro:', e.message);
  await browser.close();
}
