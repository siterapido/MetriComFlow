#!/usr/bin/env node

import puppeteer from 'puppeteer';
import * as fs from 'fs';

const SCREENSHOT_DIR = './test-screenshots';
if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

console.log('\n🚀 TESTE COMPLETO - LOGIN + OAUTH META\n');
console.log('═══════════════════════════════════════════════════\n');

const browser = await puppeteer.launch({
  headless: false,
  args: ['--no-sandbox', '--disable-setuid-sandbox'],
  defaultViewport: { width: 1400, height: 900 }
});

const page = await browser.newPage();

// Capturar logs importantes
page.on('console', msg => {
  const text = msg.text();
  if (text.includes('OAuth') || text.includes('META') || text.includes('redirect')) {
    console.log(`📝 [CONSOLE]: ${text}`);
  }
});

try {
  // PASSO 1: LOGIN
  console.log('1️⃣ Acessando página de login...\n');
  await page.goto('https://www.insightfy.com.br/login', { 
    waitUntil: 'networkidle2',
    timeout: 30000 
  });
  
  await page.screenshot({ path: `${SCREENSHOT_DIR}/01-login-page.png` });
  
  console.log('2️⃣ Preenchendo credenciais...\n');
  console.log('   Email: testefinal2@gmail.com\n');
  
  // Aguardar campos de login
  await page.waitForSelector('input[type="email"]', { timeout: 10000 });
  await page.waitForSelector('input[type="password"]', { timeout: 10000 });
  
  // Preencher formulário
  await page.type('input[type="email"]', 'testefinal2@gmail.com');
  await page.type('input[type="password"]', '@Fidel2026');
  
  await page.screenshot({ path: `${SCREENSHOT_DIR}/02-credentials-filled.png` });
  
  console.log('3️⃣ Fazendo login...\n');
  
  // Clicar no botão de login
  await page.click('button[type="submit"]');
  
  // Aguardar navegação após login
  await page.waitForNavigation({ timeout: 15000 });
  
  const afterLoginUrl = page.url();
  console.log(`   URL após login: ${afterLoginUrl}\n`);
  
  await page.screenshot({ path: `${SCREENSHOT_DIR}/03-after-login.png` });
  
  if (afterLoginUrl.includes('/login')) {
    console.log('❌ Login falhou! Ainda na página de login.\n');
    const errorMsg = await page.evaluate(() => {
      const error = document.querySelector('[role="alert"]');
      return error ? error.textContent : 'Nenhum erro visível';
    });
    console.log(`   Erro: ${errorMsg}\n`);
    throw new Error('Login falhou');
  }
  
  console.log('✅ Login realizado com sucesso!\n');
  
  // PASSO 2: NAVEGAR PARA META ADS CONFIG
  console.log('4️⃣ Navegando para /meta-ads-config...\n');
  
  await page.goto('https://www.insightfy.com.br/meta-ads-config', {
    waitUntil: 'networkidle2',
    timeout: 20000
  });
  
  await new Promise(resolve => setTimeout(resolve, 3000));
  
  await page.screenshot({ path: `${SCREENSHOT_DIR}/04-meta-ads-page.png`, fullPage: true });
  
  const currentUrl = page.url();
  console.log(`   URL atual: ${currentUrl}\n`);
  
  // PASSO 3: PROCURAR BOTÃO DE CONEXÃO
  console.log('5️⃣ Procurando botão de conexão Meta...\n');
  
  const buttons = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('button')).map(b => ({
      text: b.textContent.trim().substring(0, 100),
      visible: b.offsetParent !== null,
      disabled: b.disabled
    })).filter(b => b.text.length > 0);
  });
  
  console.log('   Botões encontrados na página:');
  buttons.forEach((btn, i) => {
    const status = !btn.visible ? '(oculto)' : btn.disabled ? '(desabilitado)' : '';
    console.log(`     ${i + 1}. "${btn.text}" ${status}`);
  });
  console.log('');
  
  // PASSO 4: CLICAR NO BOTÃO
  console.log('6️⃣ Clicando no botão de conexão...\n');
  
  const clicked = await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll('button'));
    const metaBtn = buttons.find(b => {
      const text = b.textContent.toLowerCase();
      return (text.includes('conectar') || text.includes('connect')) && 
             (text.includes('meta') || text.includes('business'));
    });
    
    if (metaBtn) {
      console.log('Clicando no botão:', metaBtn.textContent.trim());
      metaBtn.click();
      return true;
    }
    return false;
  });
  
  if (!clicked) {
    console.log('❌ Botão de conexão não encontrado!\n');
    throw new Error('Botão não encontrado');
  }
  
  console.log('✅ Botão clicado!\n');
  
  await page.screenshot({ path: `${SCREENSHOT_DIR}/05-after-click.png` });
  
  // PASSO 5: AGUARDAR REDIRECIONAMENTO
  console.log('7️⃣ Aguardando redirecionamento para Facebook...\n');
  
  await page.waitForNavigation({ timeout: 10000 }).catch(() => {
    console.log('   (Timeout de navegação - pode ser normal)\n');
  });
  
  await new Promise(resolve => setTimeout(resolve, 3000));
  
  const finalUrl = page.url();
  console.log(`   URL final: ${finalUrl}\n`);
  
  await page.screenshot({ path: `${SCREENSHOT_DIR}/06-final-page.png`, fullPage: true });
  
  // PASSO 6: ANALISAR RESULTADO
  if (finalUrl.includes('facebook.com')) {
    console.log('═══════════════════════════════════════════════════');
    console.log('🎯 REDIRECIONADO PARA FACEBOOK!');
    console.log('═══════════════════════════════════════════════════\n');
    
    // Extrair parâmetros da URL
    const url = new URL(finalUrl);
    const clientId = url.searchParams.get('client_id');
    const redirectUri = url.searchParams.get('redirect_uri');
    const scope = url.searchParams.get('scope');
    const state = url.searchParams.get('state');
    
    console.log('📋 PARÂMETROS DO OAUTH:\n');
    console.log(`   client_id: ${clientId}`);
    console.log(`   redirect_uri: ${redirectUri ? decodeURIComponent(redirectUri) : 'N/A'}`);
    console.log(`   scope: ${scope}`);
    console.log(`   state: ${state}`);
    console.log('');
    
    // Verificar conteúdo da página
    const pageContent = await page.evaluate(() => document.body.innerText);
    
    if (pageContent.includes('URL bloqueada') || pageContent.includes('bloqueada') || 
        pageContent.toLowerCase().includes('blocked') || pageContent.toLowerCase().includes('redirect_uri')) {
      console.log('═══════════════════════════════════════════════════');
      console.log('❌ ERRO: URL BLOQUEADA PELO FACEBOOK');
      console.log('═══════════════════════════════════════════════════\n');
      
      console.log('🔍 MENSAGEM DE ERRO DO FACEBOOK:\n');
      console.log(pageContent.substring(0, 500));
      console.log('\n');
      
      console.log('═══════════════════════════════════════════════════');
      console.log('💡 SOLUÇÃO:');
      console.log('═══════════════════════════════════════════════════\n');
      console.log('1. Acesse o Meta Developer Console:');
      console.log(`   https://developers.facebook.com/apps/${clientId}/fb-login/settings/\n`);
      console.log('2. Procure por "Valid OAuth Redirect URIs"\n');
      console.log('3. Adicione esta URL:\n');
      if (redirectUri) {
        console.log(`   ${decodeURIComponent(redirectUri)}\n`);
      }
      console.log('4. Salve e aguarde 2-5 minutos\n');
      console.log('5. Tente novamente\n');
      
    } else if (pageContent.includes('Continuar') || pageContent.includes('Authorize') || 
               pageContent.includes('Continue')) {
      console.log('═══════════════════════════════════════════════════');
      console.log('✅ SUCESSO! PÁGINA DE AUTORIZAÇÃO CARREGADA');
      console.log('═══════════════════════════════════════════════════\n');
      console.log('🎉 O OAuth está funcionando corretamente!\n');
      console.log('   O usuário pode autorizar o app agora.\n');
    }
  } else if (finalUrl.includes('code=')) {
    console.log('═══════════════════════════════════════════════════');
    console.log('✅ CÓDIGO DE AUTORIZAÇÃO RECEBIDO!');
    console.log('═══════════════════════════════════════════════════\n');
    console.log('🎉 OAuth completado com sucesso!\n');
  } else {
    console.log('⚠️  Nenhum redirecionamento detectado.\n');
    console.log(`   URL permanece: ${finalUrl}\n`);
  }
  
  console.log('\n📸 Screenshots salvos em: test-screenshots/\n');
  console.log('⏸️  Navegador permanecerá aberto para inspeção.\n');
  console.log('   Pressione Ctrl+C para fechar.\n');
  
  // Manter aberto
  await new Promise(() => {});
  
} catch (error) {
  console.error('\n❌ ERRO:', error.message, '\n');
  await page.screenshot({ path: `${SCREENSHOT_DIR}/error.png`, fullPage: true });
  await new Promise(resolve => setTimeout(resolve, 5000));
  await browser.close();
}
