# InsightFy CRM

> Sistema de CRM moderno para gestão de leads, metas e faturamento B2B

**URL Lovable**: https://lovable.dev/projects/9857f451-8bd1-47f6-9f7c-40342942a99a

## 🚀 Tecnologias

- **Frontend**: React 18 + TypeScript + Vite
- **UI Components**: shadcn-ui + Tailwind CSS
- **Database**: Supabase (PostgreSQL)
- **State Management**: TanStack Query
- **Charts**: Recharts
- **Drag & Drop**: @hello-pangea/dnd
- **Forms**: React Hook Form + Zod

## 📋 Funcionalidades

- 🎯 **Kanban Board** - Gestão de leads com drag-and-drop
- 📊 **Dashboard** - KPIs e gráficos de faturamento
- 🎯 **Metas** - Acompanhamento de goals por cliente
- 🏷️ **Labels** - Sistema de tags customizáveis
- 📝 **Checklist** - Tasks dentro de cada lead
- 💬 **Comentários** - Colaboração em tempo real
- 📎 **Anexos** - Upload de arquivos
- 🔄 **Histórico** - Audit trail de atividades
- 🎨 **Dark Mode** - Tema escuro moderno
- 📱 **Responsivo** - Mobile-first design

## 🛠️ Como editar este código?

There are several ways of editing your application.

**Use Lovable**

Simply visit the [Lovable Project](https://lovable.dev/projects/9857f451-8bd1-47f6-9f7c-40342942a99a) and start prompting.

Changes made via Lovable will be committed automatically to this repo.

**Use your preferred IDE**

If you want to work locally using your own IDE, you can clone this repo and push changes. Pushed changes will also be reflected in Lovable.

The only requirement is having Node.js & npm installed - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)

Follow these steps:

```sh
# Step 1: Clone the repository using the project's Git URL.
git clone <YOUR_GIT_URL>

# Step 2: Navigate to the project directory.
cd <YOUR_PROJECT_NAME>

# Step 3: Install the necessary dependencies.
npm i

# Step 4: Start the development server with auto-reloading and an instant preview.
npm run dev
```

**Edit a file directly in GitHub**

- Navigate to the desired file(s).
- Click the "Edit" button (pencil icon) at the top right of the file view.
- Make your changes and commit the changes.

**Use GitHub Codespaces**

- Navigate to the main page of your repository.
- Click on the "Code" button (green button) near the top right.
- Select the "Codespaces" tab.
- Click on "New codespace" to launch a new Codespace environment.
- Edit files directly within the Codespace and commit and push your changes once you're done.

## 🗂️ Estrutura do Projeto

```
metricom-flow/
├── src/
│   ├── components/      # UI components
│   ├── pages/           # Dashboard, Leads, Metas
│   ├── lib/             # Supabase client & types
│   └── hooks/           # Custom hooks
├── supabase/
│   └── migrations/      # Database schema
├── DATABASE.md          # Database docs
├── AGENTS.md            # Contributor guidelines
├── SETUP_SUPABASE.md    # Setup guide
└── CLAUDE.md            # AI instructions
```

## 🔧 Setup do Banco de Dados

Este projeto usa **Supabase** como backend. Siga o guia completo:

**→ [SETUP_SUPABASE.md](./SETUP_SUPABASE.md)**

Resumo:
1. Crie projeto no [Supabase](https://supabase.com)
2. Configure `.env` com as credenciais
3. Execute o SQL em `supabase/migrations/001_initial_schema.sql`

## 📚 Documentação

- **[DATABASE.md](./DATABASE.md)** - Schema completo e API reference
- **[AGENTS.md](./AGENTS.md)** - Guia para contribuidores e agentes
- **[SETUP_SUPABASE.md](./SETUP_SUPABASE.md)** - Guia de setup passo a passo
- **[CLAUDE.md](./CLAUDE.md)** - Instruções para Claude Code
- **[docs/META_OAUTH_SETUP.md](./docs/META_OAUTH_SETUP.md)** - Configuração OAuth Meta Ads (completo)
- **[CORRIGIR_OAUTH_META.md](./CORRIGIR_OAUTH_META.md)** - 🚨 Correção urgente: URL bloqueada Meta OAuth

## How can I deploy this project?

Simply open [Lovable](https://lovable.dev/projects/9857f451-8bd1-47f6-9f7c-40342942a99a) and click on Share -> Publish.

## Can I connect a custom domain to my Lovable project?

Yes, you can!

To connect a domain, navigate to Project > Settings > Domains and click Connect Domain.

Read more here: [Setting up a custom domain](https://docs.lovable.dev/tips-tricks/custom-domain#step-by-step-guide)
