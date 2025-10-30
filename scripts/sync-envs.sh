#!/bin/bash

# Sync de variáveis de ambiente (Vercel + Supabase) usando valores do .env
# Uso: bash scripts/sync-envs.sh [--prod] [--preview] [--skip-vercel] [--skip-supabase]

set -euo pipefail

PROJECT_ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
ENV_FILE="$PROJECT_ROOT_DIR/.env"

echo "🚀 Sincronização Automática de Variáveis de Ambiente"
echo "====================================================="
echo "Projeto: $PROJECT_ROOT_DIR"
echo "Arquivo .env: $ENV_FILE"
echo ""

if [[ ! -f "$ENV_FILE" ]]; then
  echo "❌ Arquivo .env não encontrado em $ENV_FILE"
  exit 1
fi

# Flags
TARGET_PROD=true
TARGET_PREVIEW=false
DO_VERCEL=true
DO_SUPABASE=true

for arg in "$@"; do
  case "$arg" in
    --prod)
      TARGET_PROD=true ;;
    --preview)
      TARGET_PREVIEW=true ;;
    --skip-vercel)
      DO_VERCEL=false ;;
    --skip-supabase)
      DO_SUPABASE=false ;;
    *)
      echo "ℹ️  Argumento desconhecido: $arg" ;;
  esac
done

# Função de limpeza de valores (remove aspas e crases)
function clean_value() {
  local v="$1"
  v="${v%\r}"      # remove CR
  v="${v%\n}"      # remove LF final
  v="${v#\`}"       # remove crase inicial
  v="${v%\`}"       # remove crase final
  v="${v#\"}"       # remove aspas iniciais
  v="${v%\"}"       # remove aspas finais
  echo -n "$v"
}

# Função para ler valores do .env por chave
function read_env() {
  local key="$1"
  local line="$(grep -E "^${key}=" "$ENV_FILE" | tail -n1 || true)"
  local val="${line#${key}=}"
  clean_value "$val"
}

# Ler e exportar variáveis necessárias
export VITE_META_APP_ID="$(read_env VITE_META_APP_ID)"
export VITE_META_APP_SECRET="$(read_env VITE_META_APP_SECRET)"
export VITE_META_REDIRECT_URI="$(read_env VITE_META_REDIRECT_URI)"
export VITE_APP_URL="$(read_env VITE_APP_URL)"
export VITE_SUPABASE_URL="$(read_env VITE_SUPABASE_URL)"
export VITE_SUPABASE_ANON_KEY="$(read_env VITE_SUPABASE_ANON_KEY)"
export SUPABASE_URL="$(read_env SUPABASE_URL)"
export SUPABASE_SERVICE_ROLE_KEY="$(read_env SUPABASE_SERVICE_ROLE_KEY)"
# Stripe environment variables removed
export APP_URL="$(read_env APP_URL)"

# Funções auxiliares
function ensure_cli() {
  local cmd="$1"; local install_msg="$2"; local install_cmd="$3";
  if ! command -v "$cmd" &> /dev/null; then
    echo "📦 $install_msg"
    eval "$install_cmd"
  fi
}

function set_vercel_env() {
  local name="$1"; local value="$2"; local env="$3";
  if [[ -z "$value" ]]; then
    echo "⚠️  Variável $name não possui valor — pulando ($env)"; return 0;
  fi
  echo "🔧 [$env] $name = $value"
  # Remover previamente (sempre tenta), confirmando via stdin para evitar prompt interativo
  printf 'y\n' | vercel env remove "$name" "$env" >/dev/null 2>&1 || true
  # Adicionar valor (não interativo; lê o valor do stdin)
  echo "$value" | vercel env add "$name" "$env"
}

function set_supabase_secret() {
  local name="$1"; local value="$2";
  if [[ -z "$value" ]]; then
    echo "⚠️  Secret $name sem valor — pulando"; return 0;
  fi
  echo "🔐 Supabase secret $name"
  supabase secrets set "${name}=${value}" || {
    echo "❌ Falha ao setar secret $name"; return 1;
  }
}

############################################
# VERCEL
############################################
if [[ "$DO_VERCEL" == true ]]; then
  echo "\n🛠️  Preparando Vercel CLI..."
  ensure_cli "vercel" "Instalando Vercel CLI..." "npm install -g vercel"

  echo "🔐 Verificando sessão da Vercel"
  if vercel whoami >/dev/null 2>&1; then
    echo "☑️  Vercel já está autenticado"
  else
    echo "⚠️  Vercel NÃO está autenticado. Pulei atualização de Vercel."
    echo "   Rode 'vercel login' manualmente e execute novamente este script."
    DO_VERCEL=false
  fi

  if [[ "$DO_VERCEL" == true ]]; then
    echo "🔗 Linkando projeto (se necessário)"
    vercel link --yes 2>/dev/null || true

    echo "\n⚙️  Atualizando variáveis de ambiente na Vercel..."
    if [[ "$TARGET_PROD" == true ]]; then
      set_vercel_env "VITE_META_APP_ID" "${VITE_META_APP_ID:-}" "production"
      set_vercel_env "VITE_META_APP_SECRET" "${VITE_META_APP_SECRET:-}" "production"
      set_vercel_env "VITE_META_REDIRECT_URI" "${VITE_META_REDIRECT_URI:-}" "production"
      set_vercel_env "VITE_APP_URL" "${VITE_APP_URL:-}" "production"
      # Também é útil manter Supabase client vars em Vercel
      set_vercel_env "VITE_SUPABASE_URL" "${VITE_SUPABASE_URL:-}" "production"
      set_vercel_env "VITE_SUPABASE_ANON_KEY" "${VITE_SUPABASE_ANON_KEY:-}" "production"
      # Stripe variables removed
    fi

    if [[ "$TARGET_PREVIEW" == true ]]; then
      set_vercel_env "VITE_META_APP_ID" "${VITE_META_APP_ID:-}" "preview"
      set_vercel_env "VITE_META_APP_SECRET" "${VITE_META_APP_SECRET:-}" "preview"
      set_vercel_env "VITE_META_REDIRECT_URI" "${VITE_META_REDIRECT_URI:-}" "preview"
      set_vercel_env "VITE_APP_URL" "${VITE_APP_URL:-}" "preview"
      set_vercel_env "VITE_SUPABASE_URL" "${VITE_SUPABASE_URL:-}" "preview"
      set_vercel_env "VITE_SUPABASE_ANON_KEY" "${VITE_SUPABASE_ANON_KEY:-}" "preview"
      # Stripe variables removed
    fi
  else
    echo "⏭️  Pulando atualização de variáveis na Vercel por falta de autenticação."
  fi
fi

############################################
# SUPABASE
############################################
if [[ "$DO_SUPABASE" == true ]]; then
  echo "\n🛠️  Preparando Supabase CLI..."
  ensure_cli "supabase" "Instalando Supabase CLI..." "npm install -g supabase@latest"

  echo "🔐 Verificando sessão do Supabase"
  if supabase projects list >/dev/null 2>&1; then
    echo "☑️  Supabase já está autenticado"
  else
    echo "⚠️  Supabase NÃO está autenticado. Pulei atualização de secrets."
    echo "   Rode 'supabase login' manualmente e execute novamente este script."
    DO_SUPABASE=false
  fi

  # Linkar ao projeto usando project-ref local, se existir
  if [[ -f "$PROJECT_ROOT_DIR/supabase/.temp/project-ref" ]]; then
    PROJECT_REF="$(cat "$PROJECT_ROOT_DIR/supabase/.temp/project-ref" | tr -d ' \n\r')"
    if [[ -n "$PROJECT_REF" ]]; then
      echo "🔗 Linkando ao projeto Supabase ($PROJECT_REF)"
      supabase link --project-ref "$PROJECT_REF" || true
    fi
  fi

  echo "\n🔐 Atualizando secrets das Edge Functions (Supabase)"
  set_supabase_secret "META_APP_ID" "${VITE_META_APP_ID:-}"
  set_supabase_secret "META_APP_SECRET" "${VITE_META_APP_SECRET:-}"
  # Secrets de infraestrutura usados pelas funções
  # Evitar prefixo proibido SUPABASE_ pelo CLI; usar nomes alternativos lidos pela função
  set_supabase_secret "PROJECT_URL" "${SUPABASE_URL:-${VITE_SUPABASE_URL:-}}"
  set_supabase_secret "SERVICE_ROLE_KEY" "${SUPABASE_SERVICE_ROLE_KEY:-}"
  # Stripe secrets removed
  set_supabase_secret "APP_URL" "${APP_URL:-${VITE_APP_URL:-}}"
fi

echo "\n✅ Sincronização concluída."
echo "\n📋 Resumo:"
echo "   - Vercel (production): $( [[ "$DO_VERCEL" == true && "$TARGET_PROD" == true ]] && echo 'atualizado' || echo 'pulado' )"
echo "   - Vercel (preview): $( [[ "$DO_VERCEL" == true && "$TARGET_PREVIEW" == true ]] && echo 'atualizado' || echo 'pulado' )"
echo "   - Supabase secrets: $( [[ "$DO_SUPABASE" == true ]] && echo 'atualizado' || echo 'pulado' )"

echo "\n🔎 Verificando configuração (opcional)..."
if command -v node &> /dev/null; then
  node "$PROJECT_ROOT_DIR/scripts/verify-meta-config.cjs" || true
else
  echo "⚠️  Node não encontrado, pulei verificação."
fi

echo "\n💡 Dicas:"
echo "   - Para publicar na Vercel: vercel --prod"
echo "   - Para deploy da função meta-auth: supabase functions deploy meta-auth"
echo "   - Para testar UI: acesse $VITE_APP_URL/meta-ads-config"