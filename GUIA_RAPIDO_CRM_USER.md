# 🎯 Guia Rápido: Novo Tipo de Usuário CRM

## 🆕 O que foi criado?

Um novo tipo de usuário chamado **"Usuário CRM"** (`crm_user`) que tem acesso apenas ao CRM e pipeline, **sem acesso a formulários**.

## 🎨 Identificação Visual

Cada tipo de usuário tem uma cor e ícone únicos:

| Tipo | Ícone | Cor | Badge |
|------|-------|-----|-------|
| **Proprietário** | 🛡️ Shield | Cyan/Blue | ![#00BFFF](https://via.placeholder.com/15/00BFFF/000000?text=+) |
| **Gestor de Tráfego** | 📊 BarChart | Blue/Cyan | ![#3B82F6](https://via.placeholder.com/15/3B82F6/000000?text=+) |
| **Vendedor** | 🛒 ShoppingCart | Green/Emerald | ![#10B981](https://via.placeholder.com/15/10B981/000000?text=+) |
| **Usuário CRM** ⭐ | 👥 Users | Purple/Pink | ![#A855F7](https://via.placeholder.com/15/A855F7/000000?text=+) |

## ✅ Checklist de Implementação

- [x] Migration de banco de dados criada
- [x] Enum `user_type` atualizado
- [x] Funções SQL criadas/atualizadas
- [x] Políticas RLS configuradas
- [x] Hook de permissões atualizado
- [x] Formulário de usuários atualizado
- [x] Navegação/Sidebar configurada
- [x] Hooks de convites atualizados
- [x] UserCard com suporte visual
- [x] Documentação completa
- [x] Script de aplicação criado

## 🚀 Próximos Passos

### 1. Aplicar a Migration
```bash
cd /Users/marcosalexandre/metricom-flow
./scripts/apply-crm-user-migration.sh
```

### 2. Testar a Funcionalidade
1. Acesse `/equipe`
2. Crie um usuário do tipo "Usuário CRM"
3. Faça login com esse usuário
4. Verifique que:
   - ✅ Dashboard Geral está visível
   - ✅ Leads está visível
   - ❌ Formulários NÃO está visível
   - ❌ Métricas NÃO está visível

### 3. Validar Segurança
1. Tente acessar `/formularios` diretamente
2. Verifique que o acesso é bloqueado
3. Confirme que as políticas RLS estão funcionando

## 📊 Matriz de Permissões

```
┌─────────────────┬────────┬──────────────┬──────────┬─────────────┐
│ Funcionalidade  │ Owner  │ Traf. Mgr    │ Sales    │ CRM User ⭐ │
├─────────────────┼────────┼──────────────┼──────────┼─────────────┤
│ Dashboard       │   ✅   │      ✅      │    ✅    │     ✅      │
│ CRM/Leads       │   ✅   │      ❌      │    ✅    │     ✅      │
│ Pipeline        │   ✅   │      ❌      │    ✅    │     ✅      │
│ Formulários     │   ✅   │      ❌      │    ✅    │     ❌      │
│ Métricas        │   ✅   │      ✅      │    ❌    │     ❌      │
│ Gestão Equipe   │   ✅   │      ❌      │    ❌    │     ❌      │
└─────────────────┴────────┴──────────────┴──────────┴─────────────┘
```

## 🔍 Diferença Principal

### Vendedor vs Usuário CRM

**Vendedor (sales)**:
- ✅ Acesso ao CRM
- ✅ **Pode criar e gerenciar formulários**
- ✅ Pode capturar leads via formulários
- ❌ Sem acesso a métricas

**Usuário CRM (crm_user)** ⭐:
- ✅ Acesso ao CRM
- ❌ **NÃO pode acessar formulários**
- ✅ Pode trabalhar com leads existentes
- ❌ Sem acesso a métricas

## 💡 Quando Usar Cada Tipo?

### Use "Vendedor" quando:
- Precisa criar formulários de captura
- Gerencia todo o ciclo de vendas
- Precisa de autonomia completa no CRM

### Use "Usuário CRM" quando:
- Foca apenas em trabalhar leads existentes
- Não precisa criar formulários
- É um consultor externo ou estagiário
- Quer limitar acesso a funcionalidades específicas

## 🎯 Casos de Uso Reais

1. **Estagiário de Vendas**
   - Tipo: Usuário CRM
   - Motivo: Trabalha apenas com leads atribuídos, sem criar formulários

2. **Consultor Externo**
   - Tipo: Usuário CRM
   - Motivo: Ajuda no processo de vendas mas não deve ter acesso a formulários

3. **Vendedor Pleno**
   - Tipo: Vendedor
   - Motivo: Precisa de autonomia completa incluindo criação de formulários

4. **Gestor de Tráfego**
   - Tipo: Gestor de Tráfego
   - Motivo: Foca apenas em métricas e campanhas

## 📝 Arquivos Importantes

- **Migration**: `supabase/migrations/20251209000000_add_crm_user_type.sql`
- **Permissões**: `src/hooks/useUserPermissions.ts`
- **Formulário**: `src/components/users/UserFormDialog.tsx`
- **Navegação**: `src/components/layout/AppSidebar.tsx`
- **Documentação**: `docs/CRM_USER_TYPE.md`
- **Script**: `scripts/apply-crm-user-migration.sh`

## ⚠️ Importante

- A migration é **segura** e **reversível**
- Não afeta usuários existentes
- Políticas RLS garantem segurança em 3 camadas
- Tipo pode ser alterado posteriormente

## 📞 Suporte

Consulte a documentação completa em:
- `docs/CRM_USER_TYPE.md`
- `IMPLEMENTACAO_CRM_USER.md`

---

**Status**: ✅ Pronto para uso  
**Versão**: 1.0.0  
**Data**: 2025-12-09
