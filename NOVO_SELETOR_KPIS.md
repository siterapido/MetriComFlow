# 🎯 Novo Seletor Visual de KPIs

## O que mudou?

Substituímos o dropdown simples por uma **interface visual interativa** que facilita a seleção de KPIs para suas metas.

## ✨ Recursos do Novo Seletor

### 1. **Busca Inteligente** 🔍
- Digite qualquer termo para filtrar os KPIs
- Busca por nome ou descrição
- Exemplo: "faturamento", "leads", "ROAS"

### 2. **Filtro por Categoria** 🏷️
Clique nas badges para filtrar por categoria:
- **Todos** - Mostra todos os KPIs disponíveis
- **CRM** - Métricas do CRM (6 tipos)
- **Meta Ads** - Métricas de anúncios (7 tipos)
- **Receita** - Métricas financeiras (2 tipos)
- **Custom** - Metas personalizadas (1 tipo)

### 3. **Cards Visuais** 🎨
Cada KPI é exibido em um card com:
- ✅ Ícone representativo
- ✅ Nome e descrição clara
- ✅ Badge de categoria (CRM, Meta Ads, etc.)
- ✅ Badge de unidade (R$, %, #)
- ✅ Destaque visual quando selecionado

### 4. **Feedback Visual** 👁️
- Cards se destacam ao passar o mouse
- KPI selecionado tem borda azul e ícone de check
- Card de confirmação mostra o KPI escolhido

## 📱 Como Usar

### Criar uma Nova Meta

1. Acesse **Metas** no menu
2. Clique em **"Nova Meta"**
3. Preencha título e descrição
4. **Selecione o KPI**:
   - Use a busca para encontrar rapidamente
   - Ou filtre por categoria
   - Clique no card do KPI desejado
5. O card ficará destacado em azul
6. Continue preenchendo os outros campos
7. Clique em **"Criar Meta"**

### Exemplo: Criar Meta de Faturamento

```
1. Título: "Faturamento Novembro"
2. Descrição: "Meta de vendas do mês"
3. KPI: Digite "faturamento" na busca → Clique em "Faturamento (CRM)"
4. Valor Alvo: R$ 500.000,00
5. Período: 01/11/2025 - 30/11/2025
```

### Exemplo: Criar Meta de CPL

```
1. Título: "CPL Black Friday"
2. KPI: Filtre por "Meta Ads" → Clique em "CPL (Custo por Lead)"
3. Valor Alvo: R$ 50,00
4. Filtros: Selecione a campanha "Black Friday"
5. Período: 20/11/2025 - 30/11/2025
```

## 🎨 Interface Visual

### Layout do Seletor

```
┌─────────────────────────────────────┐
│  Buscar KPI: [_______________]  🔍  │
├─────────────────────────────────────┤
│  [Todos] [CRM] [Meta Ads] [Receita] │
├─────────────────────────────────────┤
│  ┌──────┐  ┌──────┐  ┌──────┐      │
│  │ 💰   │  │ 👥   │  │ ✅   │      │
│  │ Fat. │  │Leads │  │Conv. │      │
│  └──────┘  └──────┘  └──────┘      │
│                                      │
│  ┌──────┐  ┌──────┐  ┌──────┐      │
│  │ 📈   │  │ 📊   │  │ 💼   │      │
│  │ROAS  │  │ CPL  │  │Inv.  │      │
│  └──────┘  └──────┘  └──────┘      │
└─────────────────────────────────────┘
     ✓ KPI Selecionado: Faturamento (CRM)
```

## 🆕 Melhorias vs Versão Anterior

| Recurso | Antes | Agora |
|---------|-------|-------|
| **Visualização** | Lista dropdown | Cards visuais |
| **Busca** | ❌ Não tinha | ✅ Busca inteligente |
| **Filtros** | ❌ Não tinha | ✅ Por categoria |
| **Descrição** | Texto pequeno | Descrição completa visível |
| **Ícones** | ❌ Não tinha | ✅ Ícone para cada KPI |
| **Feedback** | Texto simples | Card destacado + confirmação |
| **UX Mobile** | Difícil de usar | Responsivo e touch-friendly |

## 📊 KPIs Disponíveis

### CRM (6 tipos)
- 💰 **Faturamento** - Receita de leads fechados
- 👥 **Leads Gerados** - Total de leads criados
- ✅ **Leads Convertidos** - Leads fechados
- 📈 **Taxa de Conversão** - % de conversão
- 📚 **Valor do Pipeline** - Oportunidades ativas
- 📊 **Ticket Médio** - Valor médio por venda

### Meta Ads (7 tipos)
- 📈 **ROAS** - Retorno sobre investimento
- 💵 **CPL** - Custo por lead
- 💼 **Investimento Total** - Gasto em anúncios
- 👥 **Leads** - Leads gerados por anúncios
- 👁️ **Impressões** - Visualizações
- 🖱️ **Cliques** - Total de cliques
- 🎯 **CTR** - Taxa de cliques

### Receita (2 tipos)
- 💰 **Receita Total** - Soma de todas receitas
- 📊 **Receita por Categoria** - Filtrada por categoria

### Custom (1 tipo)
- ⚙️ **Meta Personalizada** - Fórmula customizada

## 🔧 Personalização

Se você quiser adicionar mais KPIs ou personalizar os existentes, edite:

**Arquivo**: `src/types/goals.ts`

```typescript
export const GOAL_TYPE_METADATA: Record<GoalType, GoalTypeMetadata> = {
  // Adicione ou edite aqui
  novo_kpi: {
    label: 'Meu KPI',
    description: 'Descrição do meu KPI',
    icon: 'Star',  // Ícone do lucide-react
    category: 'custom',
    unit: 'number',
    supportsFilters: { ... }
  }
}
```

**Ícones disponíveis**: https://lucide.dev/icons

## 💡 Dicas de UX

1. **Use a busca** se souber o KPI que quer
2. **Filtre por categoria** para explorar opções
3. **Leia as descrições** antes de selecionar
4. **Preste atenção na unidade** (R$, %, #)
5. **Verifique o card de confirmação** antes de continuar

## 🐛 Troubleshooting

### Não aparecem KPIs

**Causa**: Termo de busca muito específico
**Solução**: Limpe a busca ou use termos mais genéricos

### Card não destaca ao clicar

**Causa**: Pode estar desabilitado ou erro de estado
**Solução**: Recarregue a página ou abra o modal novamente

### Ícones não aparecem

**Causa**: Ícone não importado corretamente
**Solução**: Verifique se o ícone existe no `ICON_MAP` em `KPISelector.tsx`

## 📱 Compatibilidade

- ✅ Desktop (Chrome, Firefox, Safari, Edge)
- ✅ Tablet (iPad, Android)
- ✅ Mobile (iPhone, Android)
- ✅ Touch & Mouse
- ✅ Teclado (Tab para navegar)

## 🚀 Próximas Melhorias

- [ ] Favoritos / KPIs mais usados
- [ ] Sugestões baseadas em histórico
- [ ] Preview de dados antes de criar
- [ ] Templates de metas prontos
- [ ] Comparação lado a lado de KPIs

---

**Versão**: 2.0.0
**Data**: Outubro 2025
**Desenvolvido com**: React + shadcn/ui + Lucide Icons
