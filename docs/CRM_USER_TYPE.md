# Novo Tipo de Usuário: CRM User

## Descrição

Foi criado um novo tipo de usuário específico para o plano de CRM chamado **"Usuário CRM" (crm_user)**. Este tipo de usuário tem acesso restrito apenas ao dashboard de CRM e pipeline de vendas, sem permissão para acessar a aba de formulários.

## Tipos de Usuários Disponíveis

### 1. **Proprietário (owner)**
- **Acesso Completo**: Todas as funcionalidades do sistema
- **Permissões**:
  - Acesso total ao CRM
  - Acesso total aos formulários
  - Acesso total às métricas e análises
  - Gerenciar usuários
  - Gerenciar metas e objetivos
  - Gerenciar membros da equipe
  - Deletar leads e dados
  - Configurar integrações

### 2. **Gestor de Tráfego (traffic_manager)**
- **Acesso**: Apenas métricas e análises
- **Permissões**:
  - Visualizar métricas de campanhas
  - Visualizar análises de desempenho
  - Visualizar metas e objetivos
  - Configurar integrações de anúncios
  - **SEM acesso ao CRM**
  - **SEM acesso aos formulários**

### 3. **Vendedor (sales)**
- **Acesso**: CRM completo + Formulários
- **Permissões**:
  - Criar e gerenciar leads
  - Visualizar pipeline de vendas
  - Criar e gerenciar formulários
  - Adicionar comentários e anexos
  - Atualizar status de leads
  - Visualizar membros da equipe
  - **SEM acesso às métricas**

### 4. **Usuário CRM (crm_user)** ⭐ NOVO
- **Acesso**: Apenas CRM e pipeline (sem formulários)
- **Permissões**:
  - Visualizar leads
  - Visualizar pipeline de vendas
  - Adicionar comentários
  - Atualizar status de leads
  - Visualizar membros da equipe
  - **SEM acesso aos formulários**
  - **SEM acesso às métricas**

## Diferença entre "Vendedor" e "Usuário CRM"

| Funcionalidade | Vendedor (sales) | Usuário CRM (crm_user) |
|----------------|------------------|------------------------|
| Visualizar leads | ✅ | ✅ |
| Criar/editar leads | ✅ | ✅ |
| Pipeline de vendas | ✅ | ✅ |
| Comentários | ✅ | ✅ |
| Anexos | ✅ | ✅ |
| **Formulários** | ✅ | ❌ |
| Métricas | ❌ | ❌ |

## Implementação Técnica

### 1. Migration de Banco de Dados
- **Arquivo**: `supabase/migrations/20251209000000_add_crm_user_type.sql`
- Adiciona o novo valor `crm_user` ao enum `user_type`
- Atualiza a função `has_crm_access()` para incluir `crm_user`
- Cria nova função `has_forms_access()` que exclui `crm_user`
- Atualiza políticas RLS para tabelas de formulários

### 2. Hook de Permissões
- **Arquivo**: `src/hooks/useUserPermissions.ts`
- Adiciona nova propriedade `hasFormsAccess` à interface `UserPermissions`
- Implementa lógica para determinar acesso a formulários
- Atualiza labels e descrições para o novo tipo

### 3. Formulário de Usuários
- **Arquivo**: `src/components/users/UserFormDialog.tsx`
- Adiciona `crm_user` aos schemas de validação
- Inclui o novo tipo na lista de opções disponíveis

### 4. Navegação/Sidebar
- **Arquivo**: `src/components/layout/AppSidebar.tsx`
- Adiciona propriedade `requiresForms` ao tipo `NavItem`
- Implementa filtro para esconder aba de Formulários de usuários sem permissão

## Como Usar

### Criar um Usuário CRM

1. Acesse a página de **Gestão de Equipe**
2. Clique em **"Criar Novo Usuário"**
3. Preencha os dados:
   - Nome completo
   - Email
   - Senha
4. Selecione o tipo: **"Usuário CRM"**
5. Clique em **"Criar Usuário"**

### Comportamento Esperado

Quando um usuário do tipo "Usuário CRM" fizer login:
- ✅ Verá o Dashboard Geral
- ✅ Verá a aba de Leads
- ✅ Poderá acessar o pipeline de vendas
- ✅ Poderá adicionar comentários e anexos
- ❌ **NÃO verá a aba de Formulários**
- ❌ NÃO verá métricas ou análises
- ❌ NÃO poderá gerenciar usuários

## Aplicar a Migration

Para aplicar as mudanças no banco de dados, execute:

```bash
# Aplicar a migration localmente
supabase migration up

# Ou aplicar em produção
supabase db push
```

## Casos de Uso

Este tipo de usuário é ideal para:
- **Equipes de vendas focadas**: Que precisam apenas gerenciar leads e pipeline
- **Consultores externos**: Que ajudam no processo de vendas mas não devem criar formulários
- **Estagiários de vendas**: Com acesso limitado ao CRM
- **Parceiros comerciais**: Que precisam visualizar e atualizar leads

## Segurança

As permissões são aplicadas em múltiplas camadas:
1. **Banco de Dados (RLS)**: Políticas de Row Level Security impedem acesso não autorizado
2. **Backend (Funções)**: Funções SQL verificam permissões antes de executar operações
3. **Frontend (UI)**: Interface esconde opções não disponíveis para melhor UX

## Notas Importantes

- Apenas **Proprietários** podem criar e gerenciar usuários
- Proprietários **não podem** criar outros proprietários
- O tipo de usuário pode ser alterado posteriormente (exceto proprietários)
- As permissões são verificadas em tempo real
