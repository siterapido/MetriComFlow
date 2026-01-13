#!/usr/bin/env node

/**
 * Script para gerenciar variáveis de ambiente na Vercel via CLI
 *
 * Uso:
 *   node scripts/vercel-env.js [comando] [opções]
 *
 * Comandos:
 *   list              Lista todas as variáveis de ambiente
 *   sync              Sincroniza variáveis do arquivo .env para Vercel
 *   add <name>        Adiciona/atualiza uma variável específica
 *   remove <name>     Remove uma variável
 *   export            Exporta variáveis da Vercel para formato .env
 *
 * Opções:
 *   --env, -e         Ambiente: production, preview, development (padrão: production)
 *   --file, -f        Arquivo .env de origem (padrão: .env)
 *   --force           Força sobrescrita sem confirmação
 *   --json            Saída em formato JSON
 *   --help, -h        Mostra ajuda
 *
 * Exemplos:
 *   # Listar todas as variáveis em produção
 *   node scripts/vercel-env.js list --env production
 *
 *   # Sincronizar todas as variáveis do .env para produção
 *   node scripts/vercel-env.js sync --env production
 *
 *   # Adicionar uma variável específica
 *   node scripts/vercel-env.js add VITE_API_KEY --env production
 *
 *   # Remover uma variável
 *   node scripts/vercel-env.js remove VITE_API_KEY --env production
 *
 *   # Exportar variáveis para arquivo
 *   node scripts/vercel-env.js export --env production --output .env.production
 */

import { execSync } from 'child_process'
import { readFileSync, writeFileSync, existsSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import readline from 'readline'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const PROJECT_ROOT = resolve(__dirname, '..')

// Cores para terminal
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  white: '\x1b[37m'
}

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`)
}

function error(message) {
  log(`❌ ${message}`, 'red')
}

function success(message) {
  log(`✅ ${message}`, 'green')
}

function info(message) {
  log(`ℹ️  ${message}`, 'cyan')
}

function warn(message) {
  log(`⚠️  ${message}`, 'yellow')
}

// Verifica se Vercel CLI está instalada e autenticada
function checkVercelCLI() {
  try {
    execSync('vercel --version', { stdio: 'pipe' })
    execSync('vercel whoami', { stdio: 'pipe' })
    return true
  } catch (err) {
    return false
  }
}

// Lista todas as variáveis de ambiente
async function listVars(environment = 'production', json = false) {
  log(`\n📋 Variáveis de ambiente em ${environment}:\n`, 'bright')

  try {
    const output = execSync('vercel env ls --json', {
      encoding: 'utf-8',
      stdio: 'pipe'
    })

    const vars = JSON.parse(output)
    const filtered = vars.filter(v => v.target.includes(environment))

    if (json) {
      console.log(JSON.stringify(filtered, null, 2))
      return
    }

    if (filtered.length === 0) {
      warn('Nenhuma variável encontrada')
      return
    }

    filtered.forEach(v => {
      const envs = v.target.join(', ')
      log(`  • ${v.key} (${v.type}) [${envs}]`, 'cyan')
    })

    log(`\nTotal: ${filtered.length} variáveis\n`, 'green')
  } catch (err) {
    error('Erro ao listar variáveis: ' + err.message)
    process.exit(1)
  }
}

// Adiciona ou atualiza uma variável
async function addVar(name, value, environment = 'production', force = false) {
  if (!value) {
    // Se valor não fornecido, lê do stdin ou prompt
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    })

    value = await new Promise(resolve => {
      rl.question(`Digite o valor para ${name}: `, answer => {
        rl.close()
        resolve(answer)
      })
    })
  }

  try {
    // Remove variável se existir
    try {
      if (force) {
        execSync(`echo 'y' | vercel env remove ${name} ${environment}`, {
          stdio: 'pipe'
        })
      }
    } catch (err) {
      // Ignora se variável não existe
    }

    // Adiciona nova variável
    execSync(`echo '${value}' | vercel env add ${name} ${environment}`, {
      stdio: 'pipe'
    })

    success(`Variável ${name} adicionada/atualizada em ${environment}`)
  } catch (err) {
    error(`Erro ao adicionar variável ${name}: ` + err.message)
    process.exit(1)
  }
}

// Remove uma variável
async function removeVar(name, environment = 'production', force = false) {
  if (!force) {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    })

    const answer = await new Promise(resolve => {
      rl.question(`Tem certeza que deseja remover ${name} de ${environment}? (y/N) `, ans => {
        rl.close()
        resolve(ans.toLowerCase())
      })
    })

    if (answer !== 'y') {
      info('Operação cancelada')
      return
    }
  }

  try {
    execSync(`echo 'y' | vercel env rm ${name} ${environment}`, {
      stdio: 'pipe'
    })

    success(`Variável ${name} removida de ${environment}`)
  } catch (err) {
    error(`Erro ao remover variável ${name}: ` + err.message)
    process.exit(1)
  }
}

// Sincroniza variáveis do arquivo .env
async function syncVars(envFile = '.env', environment = 'production', force = false) {
  const envPath = resolve(PROJECT_ROOT, envFile)

  if (!existsSync(envPath)) {
    error(`Arquivo ${envFile} não encontrado em ${PROJECT_ROOT}`)
    process.exit(1)
  }

  log(`\n🔄 Sincronizando variáveis de ${envFile} para ${environment}...\n`, 'bright')

  const content = readFileSync(envPath, 'utf-8')
  const vars = parseEnvFile(content)

  if (vars.size === 0) {
    warn('Nenhuma variável encontrada no arquivo .env')
    return
  }

  log(`Encontradas ${vars.size} variáveis\n`, 'cyan')

  let successCount = 0
  let errorCount = 0

  for (const [name, value] of vars.entries()) {
    try {
      await addVar(name, value, environment, true)
      successCount++
    } catch (err) {
      error(`Falha ao sincronizar ${name}: ${err.message}`)
      errorCount++
    }
  }

  log(`\n📊 Resumo:`, 'bright')
  log(`  ✅ Sucesso: ${successCount}`, 'green')
  log(`  ❌ Erros: ${errorCount}`, errorCount > 0 ? 'red' : 'green')
  log('')
}

// Exporta variáveis da Vercel para formato .env
async function exportVars(environment = 'production', outputFile = null) {
  log(`\n📤 Exportando variáveis de ${environment}...\n`, 'bright')

  try {
    const output = execSync('vercel env ls --json', {
      encoding: 'utf-8',
      stdio: 'pipe'
    })

    const vars = JSON.parse(output)
    const filtered = vars.filter(v => v.target.includes(environment))

    if (filtered.length === 0) {
      warn('Nenhuma variável encontrada')
      return
    }

    // Busca valores das variáveis
    const envLines = []
    for (const v of filtered) {
      try {
        const valueOutput = execSync(`vercel env pull ${v.key} --environment=${environment}`, {
          encoding: 'utf-8',
          stdio: 'pipe'
        })

        // Extrai valor do output
        const value = valueOutput.trim()
        envLines.push(`${v.key}=${value}`)
      } catch (err) {
        warn(`Não foi possível obter valor para ${v.key}`)
      }
    }

    const result = envLines.join('\n') + '\n'

    if (outputFile) {
      const outputPath = resolve(PROJECT_ROOT, outputFile)
      writeFileSync(outputPath, result, 'utf-8')
      success(`Variáveis exportadas para ${outputFile}`)
    } else {
      console.log(result)
      info('Variáveis exportadas acima (use --output para salvar em arquivo)')
    }
  } catch (err) {
    error('Erro ao exportar variáveis: ' + err.message)
    process.exit(1)
  }
}

// Parse do arquivo .env
function parseEnvFile(content) {
  const vars = new Map()

  content.split('\n').forEach(line => {
    line = line.trim()

    // Ignora comentários e linhas vazias
    if (!line || line.startsWith('#')) {
      return
    }

    // Parse da variável
    const match = line.match(/^([^=]+)=(.*)$/)
    if (match) {
      const name = match[1].trim()
      let value = match[2].trim()

      // Remove aspas se presentes
      if ((value.startsWith('"') && value.endsWith('"')) ||
          (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1)
      }

      vars.set(name, value)
    }
  })

  return vars
}

// Mostra ajuda
function showHelp() {
  console.log(`
Uso: node scripts/vercel-env.js [comando] [opções]

Comandos:
  list              Lista todas as variáveis de ambiente
  sync              Sincroniza variáveis do arquivo .env para Vercel
  add <name>        Adiciona/atualiza uma variável específica
  remove <name>     Remove uma variável
  export            Exporta variáveis da Vercel para formato .env

Opções:
  --env, -e         Ambiente: production, preview, development (padrão: production)
  --file, -f        Arquivo .env de origem (padrão: .env)
  --output, -o      Arquivo de saída (para comando export)
  --force           Força sobrescrita sem confirmação
  --json            Saída em formato JSON
  --help, -h        Mostra esta ajuda

Exemplos:
  # Listar todas as variáveis em produção
  node scripts/vercel-env.js list --env production

  # Sincronizar todas as variáveis do .env para produção
  node scripts/vercel-env.js sync --env production

  # Adicionar uma variável específica
  node scripts/vercel-env.js add VITE_API_KEY --env production

  # Remover uma variável
  node scripts/vercel-env.js remove VITE_API_KEY --env production

  # Exportar variáveis para arquivo
  node scripts/vercel-env.js export --env production --output .env.production
`)
}

// Parse de argumentos CLI
function parseArgs() {
  const args = process.argv.slice(2)
  const options = {
    command: null,
    environment: 'production',
    file: '.env',
    output: null,
    force: false,
    json: false,
    name: null,
    value: null
  }

  for (let i = 0; i < args.length; i++) {
    const arg = args[i]

    switch (arg) {
      case '--help':
      case '-h':
        showHelp()
        process.exit(0)
      case '--env':
      case '-e':
        options.environment = args[++i]
        break
      case '--file':
      case '-f':
        options.file = args[++i]
        break
      case '--output':
      case '-o':
        options.output = args[++i]
        break
      case '--force':
        options.force = true
        break
      case '--json':
        options.json = true
        break
      default:
        if (!options.command) {
          options.command = arg
        } else if (!options.name && ['add', 'remove'].includes(options.command)) {
          options.name = arg
        } else if (!options.value && options.command === 'add') {
          options.value = arg
        }
    }
  }

  return options
}

// Main
async function main() {
  log('\n🚀 Gerenciador de Variáveis de Ambiente - Vercel CLI\n', 'bright')

  if (!checkVercelCLI()) {
    error('Vercel CLI não está instalada ou autenticada')
    info('Execute: npm install -g vercel && vercel login')
    process.exit(1)
  }

  success('Vercel CLI autenticada\n')

  const options = parseArgs()

  if (!options.command) {
    showHelp()
    process.exit(1)
  }

  switch (options.command) {
    case 'list':
      await listVars(options.environment, options.json)
      break

    case 'sync':
      await syncVars(options.file, options.environment, options.force)
      break

    case 'add':
      if (!options.name) {
        error('Nome da variável é obrigatório para o comando add')
        process.exit(1)
      }
      await addVar(options.name, options.value, options.environment, options.force)
      break

    case 'remove':
      if (!options.name) {
        error('Nome da variável é obrigatório para o comando remove')
        process.exit(1)
      }
      await removeVar(options.name, options.environment, options.force)
      break

    case 'export':
      await exportVars(options.environment, options.output)
      break

    default:
      error(`Comando desconhecido: ${options.command}`)
      showHelp()
      process.exit(1)
  }
}

main().catch(err => {
  error(err.message)
  process.exit(1)
})
