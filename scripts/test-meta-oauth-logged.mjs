#!/usr/bin/env node

import puppeteer from 'puppeteer';
import * as fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const APP_URL = 'https://www.insightfy.com.br';
const TEST_URL = `${APP_URL}/meta-ads-config`;
const SCREENSHOT_DIR = `${__dirname}/../test-screenshots`;

if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

console.log('\n🔍 TESTE DE OAUTH META ADS - USUÁRIO LOGADO');
console.log('═══════════════════════════════════════════════════\n');
console.log(`📍 URL: ${TEST_URL}\n`);

const browser = await puppeteer.launch({
  headless: false,
  args: ['--no-sandbox', '--disable-setuid-sandbox'],
  defaultViewport: { width: 1400, height: 900 }
});

const page = await browser.newPage();

// Capturar todos os console.log
page.on('console', msg => {
  const text = msg.text();
  if (text.includes('META') || text.includes('OAuth') || text.includes('redirect')) {
    console.log(`📝 [CONSOLE]: ${text}`);
  }
});

// Capturar erros
page.on('pageerror', error => {
  console.log(`❌ [ERROR]: ${error.message}`);
});

const networkLogs = [];

page.on('response', async response => {
  const url = response.url();
  if (url.includes('meta-auth') || url.includes('facebook.com/v24.0/dialog/oauth')) {
    networkLogs.push({
      url: url.substring(0, 200),
      status: response.status(),
      statusText: response.statusText()
    });
  }
});

try {
  console.log('1️⃣ Acessando página /meta-ads-config...\n');
  await page.goto(TEST_URL, { waitUntil: 'networkidle2', timeout: 20000 });
  await page.screenshot({ path: `${SCREENSHOT_DIR}/logged-01-page.png`, fullPage: true });
  
  console.log('✅ Página carregada\n');
  
  // Extrair informações da página
  console.log('2️⃣ Analisando elementos da página...\n');
  
  const pageInfo = await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll('button'));
    const allText = document.body.innerText;
    
    return {
      title: document.title,
      url: window.location.href,
      hasMetaButton: buttons.some(b => 
        b.textContent.toLowerCase().includes('meta') ||
        b.textContent.toLowerCase().includes('conectar') ||
        b.textContent.toLowerCase().includes('business')
      ),
      buttons: buttons.map(b => ({
        text: b.textContent.trim().substring(0, 50),
        disabled: b.disabled,
        visible: b.offsetParent !== null
      })).filter(b => b.text && b.text.length > 0),
      hasConnectionStatus: allText.includes('Conectado') || allText.includes('Desconectado'),
      bodySnippet: allText.substring(0, 300)
    };
  });
  
  console.log(`   Título: ${pageInfo.title}`);
  console.log(`   URL: ${pageInfo.url}`);
  console.log(`   Tem botão Meta: ${pageInfo.hasMetaButton ? 'SIM ✅' : 'NÃO ❌'}`);
  console.log(`   Status de conexão visível: ${pageInfo.hasConnectionStatus ? 'SIM' : 'NÃO'}\n`);
  
  if (pageInfo.buttons.length > 0) {
    console.log('   Botões encontrados:');
    pageInfo.buttons.slice(0, 10).forEach((btn, i) => {
      console.log(`     ${i + 1}. "${btn.text}" ${btn.disabled ? '(desabilitado)' : ''}`);
    });
    console.log('\n');
  }
  
  // Procurar e clicar no botão
  console.log('3️⃣ Procurando botão de conexão...\n');
  
  const button = await page.evaluateHandle(() => {
    const buttons = Array.from(document.querySelectorAll('button'));
    return buttons.find(b => 
      b.textContent.toLowerCase().includes('conectar') &&
      (b.textContent.toLowerCase().includes('meta') || 
       b.textContent.toLowerCase().includes('business'))
    );
  });
  
  if (!button || !button.asElement()) {
    console.log('❌ Botão não encontrado. Tentando selectors alternativos...\n');
    
    // Tentar outros seletores
    const altButton = await page.$('[data-testid*="meta"]') ||
                      await page.$('button[class*="meta"]') ||
                      await page.$('button:has-text("Meta")');
    
    if (!altButton) {
      console.log('❌ Nenhum botão encontrado!\n');
      console.log('   Snippet da página:');
      console.log(`   ${pageInfo.bodySnippet}\n`);
      throw new Error('Botão de conexão não encontrado');
    }
  }
  
  console.log('✅ Botão encontrado! Clicando...\n');
  
  // Aguardar navegação ao clicar
  const navigationPromise = page.waitForNavigation({ timeout: 10000 }).catch(() => null);
  
  await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll('button'));
    const btn = buttons.find(b => 
      b.textContent.toLowerCase().includes('conectar') &&
      (b.textContent.toLowerCase().includes('meta') || 
       b.textContent.toLowerCase().includes('business'))
    );
    if (btn) btn.click();
  });
  
  await page.screenshot({ path: `${SCREENSHOT_DIR}/logged-02-after-click.png`, fullPage: true });
  
  console.log('4️⃣ Aguardando resposta...\n');
  
  await navigationPromise;
  await page.waitForTimeout(3000);
  
  const finalUrl = page.url();
  console.log(`   URL final: ${finalUrl}\n`);
  
  await page.screenshot({ path: `${SCREENSHOT_DIR}/logged-03-final.png`, fullPage: true });
  
  // Analisar resultado
  if (finalUrl.includes('facebook.com')) {
    console.log('🎯 REDIRECIONADO PARA O FACEBOOK!\n');
    
    const fbContent = await page.evaluate(() => document.body.innerText);
    
    if (fbContent.includes('URL bloqueada') || fbContent.includes('bloqueada')) {
      console.log('❌ ERRO: URL BLOQUEADA NO FACEBOOK\n');
      console.log('═══════════════════════════════════════════════════\n');
      
      // Extrair detalhes do erro
      const errorDetails = await page.evaluate(() => {
        const text = document.body.innerText;
        return {
          fullText: text,
          hasRedirectUri: text.includes('redirect_uri'),
          hasValidOAuth: text.includes('Valid OAuth')
        };
      });
      
      console.log('📋 DETALHES DO ERRO:\n');
      console.log(errorDetails.fullText);
      console.log('\n═══════════════════════════════════════════════════\n');
      
      // Tentar extrair a URL de redirecionamento usada
      const currentFullUrl = finalUrl;
      const urlObj = new URL(currentFullUrl);
      const redirectUri = urlObj.searchParams.get('redirect_uri');
      
      if (redirectUri) {
        console.log('🔍 REDIRECT_URI USADO NA REQUISIÇÃO:\n');
        console.log(`   ${decodeURIComponent(redirectUri)}\n`);
        console.log('═══════════════════════════════════════════════════\n');
      }
      
    } else if (fbContent.includes('Continuar') || fbContent.includes('Autorizar')) {
      console.log('✅ PÁGINA DE AUTORIZAÇÃO CARREGADA CORRETAMENTE!\n');
      console.log('   O OAuth está funcionando! 🎉\n');
    }
  } else if (finalUrl.includes('code=')) {
    console.log('✅ CÓDIGO DE AUTORIZAÇÃO RECEBIDO!\n');
    console.log('   OAuth completado com sucesso! 🎉\n');
  } else {
    console.log('⚠️  Nenhuma navegação detectada\n');
    console.log(`   URL permanece: ${finalUrl}\n`);
  }
  
  // Logs de rede
  if (networkLogs.length > 0) {
    console.log('\n📡 REQUISIÇÕES RELEVANTES:\n');
    console.log('═══════════════════════════════════════════════════\n');
    networkLogs.forEach(log => {
      console.log(`   [${log.status}] ${log.url}\n`);
    });
  }
  
  console.log('\n✅ Teste concluído!\n');
  console.log('📸 Screenshots salvos em: test-screenshots/\n');
  console.log('   - logged-01-page.png');
  console.log('   - logged-02-after-click.png');
  console.log('   - logged-03-final.png\n');
  
} catch (error) {
  console.error('\n❌ ERRO:\n', error.message, '\n');
  await page.screenshot({ path: `${SCREENSHOT_DIR}/logged-error.png`, fullPage: true });
} finally {
  await page.waitForTimeout(2000);
  await browser.close();
  console.log('✅ Navegador fechado.\n');
}
