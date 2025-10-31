#!/usr/bin/env node

import puppeteer from 'puppeteer';

console.log('\n🎯 TESTE RÁPIDO - CLICAR NO BOTÃO META\n');

const browser = await puppeteer.launch({
  headless: false,
  args: ['--no-sandbox'],
  defaultViewport: { width: 1400, height: 900 }
});

const page = await browser.newPage();

// Capturar console
page.on('console', msg => console.log(`📝 [JS]: ${msg.text()}`));

try {
  console.log('1️⃣ Conectando à página já aberta...\n');
  
  await page.goto('https://www.insightfy.com.br/meta-ads-config', { 
    waitUntil: 'networkidle2',
    timeout: 20000 
  });
  
  await page.waitForTimeout(2000);
  
  console.log('2️⃣ Procurando botão "Conectar"...\n');
  
  // Listar todos os botões
  const buttons = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('button')).map(b => ({
      text: b.textContent.trim(),
      id: b.id,
      classes: b.className
    }));
  });
  
  console.log('   Botões encontrados:');
  buttons.forEach((btn, i) => {
    if (btn.text.length > 0 && btn.text.length < 100) {
      console.log(`     ${i + 1}. "${btn.text}"`);
    }
  });
  console.log('');
  
  // Clicar no botão
  const clicked = await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll('button'));
    const metaBtn = buttons.find(b => 
      b.textContent.includes('Conectar') && 
      (b.textContent.includes('Meta') || b.textContent.includes('Business'))
    );
    
    if (metaBtn) {
      metaBtn.click();
      return true;
    }
    return false;
  });
  
  if (!clicked) {
    console.log('❌ Botão não encontrado!\n');
    process.exit(1);
  }
  
  console.log('✅ Botão clicado!\n');
  console.log('3️⃣ Aguardando redirecionamento...\n');
  
  // Aguardar navegação
  await page.waitForNavigation({ timeout: 10000 }).catch(() => {});
  await page.waitForTimeout(3000);
  
  const finalUrl = page.url();
  console.log(`   URL final: ${finalUrl}\n`);
  
  if (finalUrl.includes('facebook.com')) {
    console.log('🎯 REDIRECIONADO PARA FACEBOOK!\n');
    
    // Extrair a URL completa do OAuth
    console.log('📋 URL COMPLETA DO OAUTH:\n');
    console.log(finalUrl);
    console.log('\n');
    
    // Extrair redirect_uri
    const url = new URL(finalUrl);
    const redirectUri = url.searchParams.get('redirect_uri');
    
    if (redirectUri) {
      console.log('🔗 REDIRECT_URI ENVIADO:\n');
      console.log(`   ${decodeURIComponent(redirectUri)}\n`);
    }
    
    // Verificar se há erro
    const pageContent = await page.evaluate(() => document.body.innerText);
    
    if (pageContent.includes('URL bloqueada') || pageContent.includes('bloqueada')) {
      console.log('❌ ERRO DETECTADO: URL BLOQUEADA\n');
      console.log('═══════════════════════════════════════════════════\n');
      console.log(pageContent);
      console.log('\n═══════════════════════════════════════════════════\n');
      
      console.log('💡 SOLUÇÃO:\n');
      console.log('   Acesse: https://developers.facebook.com/apps/3361128087359379/fb-login/settings/\n');
      console.log('   Adicione na lista "Valid OAuth Redirect URIs":\n');
      if (redirectUri) {
        console.log(`   ${decodeURIComponent(redirectUri)}\n`);
      }
    } else {
      console.log('✅ PÁGINA DE AUTORIZAÇÃO CARREGADA!\n');
      console.log('   OAuth está funcionando corretamente! 🎉\n');
    }
    
    await page.screenshot({ path: 'test-screenshots/facebook-page.png', fullPage: true });
    console.log('📸 Screenshot salvo: test-screenshots/facebook-page.png\n');
  }
  
  console.log('⏸️  Mantenha o navegador aberto para inspecionar.\n');
  console.log('   Pressione Ctrl+C para fechar.\n');
  
  await new Promise(() => {});
  
} catch (error) {
  console.error('❌ Erro:', error.message);
  await browser.close();
}
