#!/usr/bin/env node

import puppeteer from 'puppeteer';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import * as fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Configurações
const APP_URL = process.env.VITE_APP_URL || 'https://www.insightfy.com.br';
const TEST_URL = `${APP_URL}/meta-ads-config`;
const SCREENSHOT_DIR = `${__dirname}/../test-screenshots`;

// Criar diretório de screenshots
if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

console.log('🤖 Iniciando teste automatizado do fluxo OAuth Meta');
console.log('═══════════════════════════════════════════════════\n');
console.log(`📍 URL de teste: ${TEST_URL}\n`);

const browser = await puppeteer.launch({
  headless: false, // Mostrar navegador para debug
  args: [
    '--no-sandbox',
    '--disable-setuid-sandbox',
    '--disable-web-security',
    '--disable-features=IsolateOrigins,site-per-process'
  ],
  defaultViewport: { width: 1280, height: 800 }
});

const page = await browser.newPage();

// Capturar logs do console
page.on('console', msg => {
  const type = msg.type();
  const text = msg.text();
  if (type === 'error') {
    console.log(`🔴 [BROWSER ERROR]: ${text}`);
  } else if (type === 'warning') {
    console.log(`⚠️  [BROWSER WARN]: ${text}`);
  } else if (text.includes('META') || text.includes('OAuth') || text.includes('auth')) {
    console.log(`📝 [BROWSER LOG]: ${text}`);
  }
});

// Capturar requisições de rede
const requests = [];
page.on('request', request => {
  const url = request.url();
  if (url.includes('facebook.com') || url.includes('meta') || url.includes('oauth') || url.includes('supabase')) {
    requests.push({
      method: request.method(),
      url: url.substring(0, 150),
      type: request.resourceType()
    });
  }
});

// Capturar respostas de rede
const responses = [];
page.on('response', async response => {
  const url = response.url();
  if (url.includes('facebook.com') || url.includes('meta-auth') || url.includes('oauth')) {
    try {
      const status = response.status();
      const headers = response.headers();
      responses.push({
        url: url.substring(0, 150),
        status,
        statusText: response.statusText(),
        contentType: headers['content-type'] || 'unknown'
      });
    } catch (e) {
      // Ignore errors reading response
    }
  }
});

// Capturar erros de página
page.on('pageerror', error => {
  console.log(`❌ [PAGE ERROR]: ${error.message}`);
});

// Capturar falhas de requisição
page.on('requestfailed', request => {
  console.log(`❌ [REQUEST FAILED]: ${request.url()} - ${request.failure().errorText}`);
});

try {
  console.log('1️⃣ Acessando página inicial...\n');
  await page.goto(TEST_URL, { waitUntil: 'networkidle2', timeout: 30000 });
  await page.screenshot({ path: `${SCREENSHOT_DIR}/01-initial-page.png`, fullPage: true });
  
  console.log('✅ Página carregada\n');
  
  // Verificar se está logado
  console.log('2️⃣ Verificando estado de autenticação...\n');
  
  const isLoggedIn = await page.evaluate(() => {
    // Verificar se há botão de login ou se já está autenticado
    const loginButton = document.querySelector('button[type="submit"]');
    const userMenu = document.querySelector('[role="navigation"]');
    return !loginButton || !!userMenu;
  });
  
  console.log(`   Autenticado: ${isLoggedIn ? 'SIM ✅' : 'NÃO ❌'}\n`);
  
  if (!isLoggedIn) {
    console.log('⚠️  Usuário não está logado. Necessário login manual para continuar o teste.\n');
    console.log('   Por favor:\n');
    console.log('   1. Faça login manualmente na janela do navegador\n');
    console.log('   2. Navegue até /meta-ads-config\n');
    console.log('   3. Pressione Enter aqui para continuar...\n');
    
    // Aguardar input do usuário
    await new Promise(resolve => {
      process.stdin.once('data', () => resolve());
    });
    
    await page.screenshot({ path: `${SCREENSHOT_DIR}/02-after-login.png`, fullPage: true });
  }
  
  // Procurar botão "Conectar com Meta Business"
  console.log('3️⃣ Procurando botão de conexão Meta...\n');
  
  await page.waitForSelector('body', { timeout: 5000 });
  
  const buttonInfo = await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll('button'));
    const metaButton = buttons.find(btn => 
      btn.textContent.toLowerCase().includes('meta') || 
      btn.textContent.toLowerCase().includes('conectar') ||
      btn.textContent.toLowerCase().includes('connect')
    );
    
    if (metaButton) {
      return {
        found: true,
        text: metaButton.textContent.trim(),
        disabled: metaButton.disabled,
        classes: metaButton.className
      };
    }
    return { found: false };
  });
  
  if (!buttonInfo.found) {
    console.log('❌ Botão de conexão Meta não encontrado!\n');
    await page.screenshot({ path: `${SCREENSHOT_DIR}/03-button-not-found.png`, fullPage: true });
    throw new Error('Botão de conexão Meta não encontrado');
  }
  
  console.log(`✅ Botão encontrado: "${buttonInfo.text}"`);
  console.log(`   Desabilitado: ${buttonInfo.disabled ? 'SIM' : 'NÃO'}\n`);
  
  // Clicar no botão
  console.log('4️⃣ Clicando no botão de conexão...\n');
  
  await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll('button'));
    const metaButton = buttons.find(btn => 
      btn.textContent.toLowerCase().includes('meta') || 
      btn.textContent.toLowerCase().includes('conectar')
    );
    if (metaButton) {
      metaButton.click();
    }
  });
  
  await page.screenshot({ path: `${SCREENSHOT_DIR}/04-after-click.png`, fullPage: true });
  
  // Aguardar redirecionamento ou erro
  console.log('5️⃣ Aguardando resposta...\n');
  
  await new Promise(resolve => setTimeout(resolve, 3000));
  
  const currentUrl = page.url();
  console.log(`   URL atual: ${currentUrl}\n`);
  
  // Verificar se foi redirecionado para o Facebook
  if (currentUrl.includes('facebook.com')) {
    console.log('✅ Redirecionado para Facebook OAuth!\n');
    await page.screenshot({ path: `${SCREENSHOT_DIR}/05-facebook-oauth.png`, fullPage: true });
    
    // Verificar se há erro na página do Facebook
    const pageText = await page.evaluate(() => document.body.innerText);
    
    if (pageText.toLowerCase().includes('url bloqueada') || 
        pageText.toLowerCase().includes('blocked') ||
        pageText.toLowerCase().includes('redirect_uri')) {
      console.log('❌ ERRO DETECTADO NA PÁGINA DO FACEBOOK:\n');
      console.log(pageText.substring(0, 500));
      console.log('\n');
      
      // Extrair URL de redirecionamento da mensagem de erro
      const redirectMatch = pageText.match(/redirect_uri[=:]?\s*([^\s&]+)/i);
      if (redirectMatch) {
        console.log(`🔍 Redirect URI detectado: ${decodeURIComponent(redirectMatch[1])}\n`);
      }
    }
  } else if (currentUrl.includes('code=')) {
    console.log('✅ Código de autorização recebido!\n');
    await page.screenshot({ path: `${SCREENSHOT_DIR}/06-success-callback.png`, fullPage: true });
  } else {
    console.log('⚠️  Nenhum redirecionamento detectado\n');
    await page.screenshot({ path: `${SCREENSHOT_DIR}/06-no-redirect.png`, fullPage: true });
  }
  
  // Relatório de requisições
  console.log('\n📊 RELATÓRIO DE REQUISIÇÕES:\n');
  console.log('═══════════════════════════════════════════════════\n');
  
  const metaRequests = requests.filter(r => r.url.includes('facebook.com') || r.url.includes('meta'));
  if (metaRequests.length > 0) {
    console.log('🌐 Requisições para Facebook/Meta:\n');
    metaRequests.forEach((req, i) => {
      console.log(`   ${i + 1}. [${req.method}] ${req.url}`);
    });
    console.log('\n');
  }
  
  const supabaseRequests = requests.filter(r => r.url.includes('supabase'));
  if (supabaseRequests.length > 0) {
    console.log('🗄️  Requisições para Supabase:\n');
    supabaseRequests.forEach((req, i) => {
      console.log(`   ${i + 1}. [${req.method}] ${req.url}`);
    });
    console.log('\n');
  }
  
  // Relatório de respostas
  if (responses.length > 0) {
    console.log('📥 RESPOSTAS IMPORTANTES:\n');
    console.log('═══════════════════════════════════════════════════\n');
    responses.forEach((res, i) => {
      const statusIcon = res.status >= 200 && res.status < 300 ? '✅' : 
                         res.status >= 400 ? '❌' : '⚠️';
      console.log(`   ${statusIcon} [${res.status}] ${res.statusText}`);
      console.log(`      ${res.url}\n`);
    });
  }
  
  console.log('\n📸 Screenshots salvos em: test-screenshots/\n');
  
} catch (error) {
  console.error('\n❌ ERRO DURANTE O TESTE:\n');
  console.error(error.message);
  console.error('\n');
  await page.screenshot({ path: `${SCREENSHOT_DIR}/error.png`, fullPage: true });
} finally {
  console.log('\n⏸️  Navegador permanecerá aberto para inspeção.');
  console.log('   Pressione Ctrl+C para fechar.\n');
  
  // Manter navegador aberto
  await new Promise(() => {});
}
