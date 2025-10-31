#!/usr/bin/env node

import puppeteer from 'puppeteer';

console.log('\n🎯 TESTE FINAL - CAPTURAR ERRO DO FACEBOOK\n');

const browser = await puppeteer.launch({
  headless: false,
  args: ['--no-sandbox'],
  defaultViewport: { width: 1400, height: 900 }
});

const page = await browser.newPage();

try {
  // Login
  console.log('1️⃣ Fazendo login...\n');
  await page.goto('https://www.insightfy.com.br/login', { waitUntil: 'networkidle2' });
  await page.waitForSelector('input[type="email"]');
  await page.type('input[type="email"]', 'testefinal2@gmail.com');
  await page.type('input[type="password"]', '@Fidel2026');
  await page.click('button[type="submit"]');
  await page.waitForNavigation({ timeout: 15000 });
  console.log('✅ Login OK\n');
  
  // Navegar para meta-ads-config
  console.log('2️⃣ Navegando para /meta-ads-config...\n');
  await page.goto('https://www.insightfy.com.br/meta-ads-config', { waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 3000));
  console.log('✅ Página carregada\n');
  
  // Clicar em "Conectar Agora"
  console.log('3️⃣ Clicando em "Conectar Agora"...\n');
  
  await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll('button'));
    const btn = buttons.find(b => b.textContent.includes('Conectar Agora'));
    if (btn) {
      console.log('Encontrado botão:', btn.textContent);
      btn.click();
    }
  });
  
  console.log('✅ Botão clicado\n');
  
  // Aguardar redirecionamento
  console.log('4️⃣ Aguardando Facebook...\n');
  await page.waitForNavigation({ timeout: 10000 }).catch(() => {});
  await new Promise(r => setTimeout(r, 5000));
  
  const url = page.url();
  console.log(`\n📍 URL: ${url}\n`);
  
  if (url.includes('facebook.com')) {
    console.log('═══════════════════════════════════════════════════');
    console.log('🎯 FACEBOOK OAUTH DETECTADO!');
    console.log('═══════════════════════════════════════════════════\n');
    
    const urlObj = new URL(url);
    const redirectUri = urlObj.searchParams.get('redirect_uri');
    
    console.log('🔗 REDIRECT_URI USADO:\n');
    console.log(`   ${redirectUri ? decodeURIComponent(redirectUri) : 'N/A'}\n`);
    
    const content = await page.evaluate(() => document.body.innerText);
    
    if (content.includes('URL bloqueada') || content.includes('bloqueada')) {
      console.log('═══════════════════════════════════════════════════');
      console.log('❌ ERRO CONFIRMADO: URL BLOQUEADA');
      console.log('═══════════════════════════════════════════════════\n');
      console.log(content.substring(0, 600));
      console.log('\n═══════════════════════════════════════════════════\n');
      console.log('💡 SOLUÇÃO DEFINITIVA:\n');
      console.log('1. Acesse: https://developers.facebook.com/apps/3361128087359379/fb-login/settings/\n');
      console.log('2. Adicione na "Valid OAuth Redirect URIs":\n');
      console.log(`   ${redirectUri ? decodeURIComponent(redirectUri) : ''}\n`);
      console.log('3. Salve e aguarde 5 minutos\n');
    } else {
      console.log('✅ SUCESSO! OAuth funcionando! 🎉\n');
    }
  }
  
  console.log('\n⏸️  Pressione Ctrl+C para fechar\n');
  await new Promise(() => {});
  
} catch (e) {
  console.error('❌ Erro:', e.message);
  await browser.close();
}
