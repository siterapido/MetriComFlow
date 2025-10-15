# Guia de Setup - Supabase para Metricom Flow

Este guia passo a passo irá ajudá-lo a configurar o banco de dados Supabase para o projeto Metricom Flow.

## Pré-requisitos

- Conta no [Supabase](https://supabase.com)
- Node.js e npm instalados
- Projeto Metricom Flow clonado localmente

---

## Passo 1: Criar Projeto no Supabase

1. Acesse [supabase.com](https://supabase.com) e faça login
2. Clique em "New Project"
3. Preencha as informações:
   - **Name**: `metricom-flow` (ou nome de sua preferência)
   - **Database Password**: Anote essa senha em local seguro
   - **Region**: Escolha a região mais próxima (ex: South America)
   - **Pricing Plan**: Free tier é suficiente para começar

4. Clique em "Create new project" e aguarde alguns minutos

---

## Passo 2: Obter Credenciais do Projeto

1. Na dashboard do seu projeto, vá em **Settings** (ícone de engrenagem)
2. Clique em **API**
3. Copie as seguintes informações:
   - **Project URL** (ex: `https://xyzproject.supabase.co`)
   - **anon/public key** (chave longa começando com `eyJ...`)

---

## Passo 3: Configurar Variáveis de Ambiente

1. Na raiz do projeto, crie o arquivo `.env`:

```bash
cp .env.example .env
```

2. Edite o arquivo `.env` e preencha com suas credenciais:

```env
VITE_SUPABASE_URL=https://seu-projeto.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

⚠️ **IMPORTANTE**: Nunca commite o arquivo `.env` no git!

---

## Passo 4: Aplicar o Schema do Banco de Dados

### Opção A: Usando o Dashboard do Supabase (Recomendado)

1. No dashboard do Supabase, vá em **SQL Editor** (ícone de terminal no menu lateral)
2. Clique em **New Query**
3. Abra o arquivo `supabase/migrations/001_initial_schema.sql` deste projeto
4. Copie **todo o conteúdo** do arquivo
5. Cole no SQL Editor do Supabase
6. Clique em **RUN** (ou pressione Ctrl/Cmd + Enter)
7. Aguarde a execução (pode levar alguns segundos)
8. Verifique se apareceu "Success. No rows returned"

### Opção B: Usando Supabase CLI

```bash
# Instalar Supabase CLI globalmente
npm install -g supabase

# Login no Supabase
supabase login

# Vincular ao projeto (você precisará do project ID)
supabase link --project-ref seu-project-id

# Aplicar migrations
supabase db push
```

---

## Passo 5: Verificar Instalação

1. No dashboard do Supabase, vá em **Table Editor**
2. Você deve ver as seguintes tabelas:
   - profiles
   - team_members
   - leads
   - labels
   - lead_labels
   - checklist_items
   - comments
   - attachments
   - lead_activity
   - client_goals
   - revenue_records
   - stopped_sales

3. Clique na tabela `labels` - ela deve ter 11 registros pré-inseridos

---

## Passo 6: Configurar Storage (Opcional - para anexos)

1. No dashboard, vá em **Storage**
2. Clique em **Create a new bucket**
3. Preencha:
   - **Name**: `attachments`
   - **Public bucket**: Marque esta opção (para facilitar acesso)
4. Clique em **Create bucket**

---

## Passo 7: Configurar Authentication

### Email/Password (Já vem habilitado por padrão)

1. Vá em **Authentication** > **Providers**
2. Verifique se **Email** está habilitado

### Configurações Recomendadas

1. Em **Authentication** > **Settings**:
   - **Site URL**: `http://localhost:8080` (dev) ou seu domínio (prod)
   - **Redirect URLs**: Adicione `http://localhost:8080/**`

---

## Passo 8: Testar Conexão

1. Inicie o projeto:

```bash
npm install
npm run dev
```

2. Abra o navegador em `http://localhost:8080`

3. Abra o Console do Navegador (F12)

4. Digite o seguinte comando para testar:

```javascript
// No console do navegador
const { createClient } = await import('@supabase/supabase-js');
const supabase = createClient(
  'SEU_SUPABASE_URL',
  'SEU_SUPABASE_ANON_KEY'
);

const { data, error } = await supabase.from('labels').select('*');
console.log('Labels:', data);
```

Se você ver uma lista de labels, está tudo funcionando! ✅

---

## Passo 9: Gerar TypeScript Types (Opcional)

Para ter types atualizados baseados no seu schema:

```bash
# Instalar Supabase CLI se ainda não fez
npm install -g supabase

# Gerar types
supabase gen types typescript --project-id SEU_PROJECT_ID > src/lib/database.types.ts
```

Os types já estão incluídos no projeto, mas você pode regenerá-los sempre que alterar o schema.

---

## Passo 10: Popular Dados de Teste (Opcional)

Para facilitar o desenvolvimento, você pode inserir dados de teste:

```sql
-- No SQL Editor do Supabase

-- Inserir team members
INSERT INTO public.team_members (name, email, position, department) VALUES
  ('João Silva', 'joao@example.com', 'Desenvolvedor', 'TI'),
  ('Maria Santos', 'maria@example.com', 'Gerente de Vendas', 'Comercial'),
  ('Pedro Costa', 'pedro@example.com', 'Designer', 'Criativo'),
  ('Ana Lima', 'ana@example.com', 'Analista', 'Marketing');

-- Inserir leads de exemplo
INSERT INTO public.leads (title, description, status, value, due_date, assignee_name) VALUES
  ('Proposta Empresa ABC', 'Desenvolver proposta comercial completa', 'todo', 50000, '2024-12-15', 'João Silva'),
  ('Projeto XYZ', 'Implementação da primeira fase', 'doing', 75000, '2024-12-20', 'Pedro Costa'),
  ('Contrato DEF', 'Projeto finalizado com sucesso', 'done', 100000, '2024-12-10', 'Ana Lima');

-- Inserir metas de clientes
INSERT INTO public.client_goals (company_name, goal_amount, achieved_amount, period_start, period_end) VALUES
  ('Empresa Alpha', 150000, 125000, '2024-01-01', '2024-12-31'),
  ('Beta Solutions', 200000, 180000, '2024-01-01', '2024-12-31'),
  ('Gamma Corp', 100000, 65000, '2024-01-01', '2024-12-31');

-- Inserir dados de revenue
INSERT INTO public.revenue_records (category, amount, month, year, date) VALUES
  ('new_up', 120000, 'Jan', 2024, '2024-01-31'),
  ('new_up', 135000, 'Fev', 2024, '2024-02-29'),
  ('new_up', 148000, 'Mar', 2024, '2024-03-31'),
  ('new_up', 162000, 'Abr', 2024, '2024-04-30'),
  ('new_up', 178000, 'Mai', 2024, '2024-05-31'),
  ('new_up', 195000, 'Jun', 2024, '2024-06-30'),
  ('clientes', 85000, 'Jan', 2024, '2024-01-31'),
  ('clientes', 92000, 'Fev', 2024, '2024-02-29'),
  ('clientes', 105000, 'Mar', 2024, '2024-03-31'),
  ('oportunidades', 65000, 'Jan', 2024, '2024-01-31'),
  ('oportunidades', 78000, 'Fev', 2024, '2024-02-29'),
  ('oportunidades', 88000, 'Mar', 2024, '2024-03-31');
```

---

## Resolução de Problemas

### Erro: "Invalid API key"
- Verifique se copiou corretamente a `anon key` (não a `service_role key`)
- Confirme se o arquivo `.env` está na raiz do projeto
- Reinicie o servidor (`npm run dev`)

### Erro: "relation does not exist"
- Execute o script SQL novamente
- Verifique se todas as tabelas foram criadas no Table Editor

### Erro: "permission denied"
- Verifique se as políticas RLS foram criadas corretamente
- Tente fazer login primeiro (algumas operações requerem autenticação)

### Tipos TypeScript não batem
- Regenere os tipos: `supabase gen types typescript`
- Verifique se o schema está atualizado

---

## Próximos Passos

Agora que o banco está configurado:

1. **Migrar Mock Data**: Substitua os dados estáticos em `Leads.tsx`, `Dashboard.tsx` e `Metas.tsx` por queries Supabase

2. **Implementar Auth**: Adicione telas de login/registro usando `authHelpers`

3. **Adicionar Real-time**: Implemente subscriptions para atualização automática do Kanban

4. **Storage**: Configure upload de anexos

5. **Otimização**: Configure caching com TanStack Query

---

## Recursos Úteis

- [Documentação do Database](./DATABASE.md) - Referência completa do schema
- [Supabase Docs](https://supabase.com/docs)
- [Row Level Security](https://supabase.com/docs/guides/auth/row-level-security)
- [Supabase JavaScript Client](https://supabase.com/docs/reference/javascript/introduction)

---

## Suporte

Se encontrar problemas:
1. Consulte a [documentação do Supabase](https://supabase.com/docs)
2. Verifique o [DATABASE.md](./DATABASE.md) para exemplos de queries
3. Abra uma issue no repositório

---

**Última atualização**: 2025-10-14
