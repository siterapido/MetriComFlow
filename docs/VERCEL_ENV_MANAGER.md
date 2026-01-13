# Gerenciador de Variáveis de Ambiente - Vercel CLI

Script em Node.js para gerenciar variáveis de ambiente na Vercel diretamente da linha de comando.

## 🚀 Recursos

- ✅ **Listar** todas as variáveis de ambiente da Vercel
- ✅ **Sincronizar** variáveis do arquivo `.env` local para a Vercel
- ✅ **Adicionar/Atualizar** variáveis individuais
- ✅ **Remover** variáveis
- ✅ **Exportar** variáveis da Vercel para formato `.env`
- ✅ Suporte a múltiplos ambientes (production, preview, development)
- ✅ Saída em formato JSON opcional
- ✅ Modo não-interativo com `--force`

## 📋 Pré-requisitos

Antes de usar, certifique-se de ter:

1. **Vercel CLI instalada:**
   ```bash
   npm install -g vercel
   ```

2. **Autenticado na Vercel:**
   ```bash
   vercel login
   ```

3. **Projeto linkado (se necessário):**
   ```bash
   vercel link
   ```

## 🎯 Comandos Disponíveis via NPM

### Listar Variáveis

Lista todas as variáveis de ambiente na Vercel:

```bash
# Produção
npm run vercel:env:list

# Preview
npm run vercel:env:list:preview

# Development (direto)
node scripts/vercel-env.js list --env development
```

### Sincronizar Variáveis

Sincroniza todas as variáveis do arquivo `.env` local para a Vercel:

```bash
# Produção
npm run vercel:env:sync

# Preview
npm run vercel:env:sync:preview

# Development
npm run vercel:env:sync:dev
```

### Adicionar Variável

Adiciona ou atualiza uma variável específica:

```bash
# Será solicitado o valor
npm run vercel:env:add VITE_API_KEY

# Com valor direto
node scripts/vercel-env.js add VITE_API_KEY "seu-valor-aqui" --env production

# Em preview
node scripts/vercel-env.js add VITE_API_KEY "seu-valor-aqui" --env preview
```

### Remover Variável

Remove uma variável da Vercel:

```bash
# Com confirmação
npm run vercel:env:remove VITE_API_KEY

# Forçar remoção sem confirmação
node scripts/vercel-env.js remove VITE_API_KEY --force
```

### Exportar Variáveis

Exporta variáveis da Vercel para formato `.env`:

```bash
# Mostrar no terminal
npm run vercel:env:export

# Salvar em arquivo
node scripts/vercel-env.js export --env production --output .env.production

# Exportar de preview
node scripts/vercel-env.js export --env preview --output .env.preview
```

## 🔧 Uso Avançado (Direto)

Você pode usar o script diretamente com Node.js para mais opções:

```bash
# Listar todas as variáveis em produção (formato JSON)
node scripts/vercel-env.js list --env production --json

# Sincronizar de arquivo .env específico
node scripts/vercel-env.js sync --file .env.local --env production

# Sincronizar forçando sobrescrita sem confirmação
node scripts/vercel-env.js sync --env production --force

# Adicionar variável em ambiente específico
node scripts/vercel-env.js add VITE_API_KEY "valor" --env preview
```

## 📖 Parâmetros

### Comandos

| Comando | Descrição |
|---------|-----------|
| `list` | Lista todas as variáveis de ambiente |
| `sync` | Sincroniza variáveis do arquivo `.env` |
| `add <name>` | Adiciona/atualiza uma variável |
| `remove <name>` | Remove uma variável |
| `export` | Exporta variáveis para formato `.env` |

### Opções

| Opção | Curto | Descrição | Padrão |
|-------|-------|-----------|--------|
| `--env` | `-e` | Ambiente (production/preview/development) | `production` |
| `--file` | `-f` | Arquivo .env de origem | `.env` |
| `--output` | `-o` | Arquivo de saída (para export) | stdout |
| `--force` | - | Força sobrescrita sem confirmação | `false` |
| `--json` | - | Saída em formato JSON | `false` |
| `--help` | `-h` | Mostra ajuda | - |

## 📝 Exemplos Práticos

### Exemplo 1: Configurar ambiente de produção

```bash
# 1. Edite seu arquivo .env com as variáveis de produção
nano .env

# 2. Sincronize para produção
npm run vercel:env:sync

# 3. Verifique se foram sincronizadas
npm run vercel:env:list
```

### Exemplo 2: Backup das variáveis

```bash
# Exporta variáveis de produção para arquivo
node scripts/vercel-env.js export --env production --output .env.backup
```

### Exemplo 3: Migrar entre ambientes

```bash
# 1. Exporta de preview
node scripts/vercel-env.js export --env preview --output .env.preview

# 2. Edita se necessário
nano .env.preview

# 3. Sincroniza para produção
node scripts/vercel-env.js sync --file .env.preview --env production
```

### Exemplo 4: Atualizar uma variável específica

```bash
# Atualiza API key sem reescrever tudo
node scripts/vercel-env.js add VITE_API_KEY "nova-chave-2025" --env production --force
```

## 🎨 Formato do Arquivo .env

O script suporta o formato padrão de arquivos `.env`:

```env
# Comentários são ignorados

# Variáveis simples
VITE_APP_URL=https://meuapp.com

# Variáveis com aspas (simples ou duplas)
VITE_API_KEY="minha-chave-api"
VITE_SECRET='meu-segredo'

# Variáveis com espaços (usam aspas)
DATABASE_URL="postgresql://user:pass@host:5432/db"

# Variáveis vazias
OPTIONAL_VAR=
```

## ⚠️ Notas Importantes

1. **Segurança:** Nunca commite arquivos `.env` com valores reais. Use `.env.example` com placeholders.

2. **Ordem de Precedência:** Ao sincronizar, variáveis são sobrescritas na Vercel. Use `--force` para evitar confirmações.

3. **Ambientes:** Certifique-se de especificar o ambiente correto (`--env`) para evitar sobrescrever variáveis de produção acidentalmente.

4. **Valores Sensíveis:** Variáveis com valores sensíveis (senhas, chaves API) aparecem como `****` na listagem, mas são armazenadas com segurança.

5. **Rate Limits:** A Vercel pode ter rate limits. Se você tem muitas variáveis, considere fazer operações em lotes.

## 🐛 Troubleshooting

### "Vercel CLI não está instalada ou autenticada"

```bash
# Instala Vercel CLI
npm install -g vercel

# Autentica
vercel login
```

### "Projeto não está linkado"

```bash
# Linka ao projeto
vercel link
```

### Erro de permissão ao adicionar variável

```bash
# Verifica se você tem permissão de admin no projeto Vercel
# Acesse: https://vercel.com/your-team/your-project/settings
```

### Variáveis não aparecem após sync

```bash
# Lista com formato JSON para ver detalhes
node scripts/vercel-env.js list --env production --json

# Verifica se o ambiente está correto
node scripts/vercel-env.js list --env preview
```

## 📚 Comparação com Scripts Antigos

### Script Antigo: `sync-envs.sh`

- **Linguagem:** Bash shell script
- **Foco:** Vercel + Supabase (tudo de uma vez)
- **Uso:** `bash scripts/sync-envs.sh --prod`

### Novo Script: `vercel-env.js`

- **Linguagem:** Node.js (JavaScript/ESM)
- **Foco:** Apenas Vercel (mais especializado)
- **Recursos:** Listar, adicionar, remover, exportar
- **Uso:** `npm run vercel:env:sync` ou `node scripts/vercel-env.js sync`

**Quando usar cada:**

- **`sync-envs.sh`:** Quando precisa sincronizar Vercel E Supabase junto
- **`vercel-env.js`:** Quando precisa de controle granular sobre variáveis da Vercel

## 🔗 Links Úteis

- [Vercel CLI Documentation](https://vercel.com/docs/cli)
- [Environment Variables - Vercel](https://vercel.com/docs/projects/environment-variables)
- [Supabase Edge Functions Secrets](https://supabase.com/docs/guides/functions/secrets)

## 💡 Dicas

1. **Versionar .env.example:** Mantenha um arquivo `.env.example` com as variáveis necessárias (sem valores) para documentação.

2. **Automatizar:** Crie um script de deploy que sincroniza variáveis antes do deploy:
   ```bash
   npm run vercel:env:sync && vercel --prod
   ```

3. **Variáveis por Ambiente:** Use ambientes diferentes para desenvolvimento, preview e produção para evitar conflitos.

4. **Backup Regular:** Exporte variáveis regularmente como backup:
   ```bash
   npm run vercel:env:export -- --output .env.backup
   ```

## 📞 Suporte

Se encontrar problemas:

1. Verifique se a Vercel CLI está atualizada: `npm update -g vercel`
2. Confirme que está autenticado: `vercel whoami`
3. Verifique o log da Vercel: `vercel logs`
4. Abra uma issue no repositório do projeto
