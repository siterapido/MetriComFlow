# 🚀 Guia Rápido - Gerenciamento de Contas Publicitárias

## Como Adicionar uma Conta Publicitária

### Passo 1: Obter o ID da Conta no Meta Business Manager

1. Acesse [Meta Business Manager](https://business.facebook.com/)
2. Vá em **Configurações de Negócios**
3. No menu lateral, clique em **Contas de Anúncios**
4. Selecione a conta desejada
5. Copie o **ID da conta** (número de 15-16 dígitos)
   - Pode aparecer como `123456789012345` ou `act_123456789012345`

### Passo 2: Adicionar no MetriCom Flow

1. Acesse **http://localhost:8083/meta-ads-config**
2. Certifique-se de estar conectado ao Meta Business (botão verde "Conectado com sucesso")
3. Role até a seção **Contas Publicitárias**
4. Clique no botão **"Adicionar Conta"** (canto superior direito)
5. Preencha o formulário:
   ```
   Provedor: Meta Ads (já selecionado)
   ID da Conta: Cole o ID copiado (com ou sem 'act_')
   Nome da Conta: Ex: "Minha Empresa - Campanhas Brasil"
   ```
6. Clique em **"Adicionar Conta"**
7. ✅ Pronto! A conta aparecerá na lista

### Exemplo de Formulário

```
┌─────────────────────────────────────────┐
│ Adicionar Conta Publicitária            │
├─────────────────────────────────────────┤
│                                          │
│ Provedor: Meta Ads ▼                    │
│                                          │
│ ID da Conta Publicitária *              │
│ ┌─────────────────────────────────────┐ │
│ │ 123456789012345                     │ │
│ └─────────────────────────────────────┘ │
│                                          │
│ Nome da Conta *                         │
│ ┌─────────────────────────────────────┐ │
│ │ Minha Empresa - Anúncios Brasil     │ │
│ └─────────────────────────────────────┘ │
│                                          │
│    [Cancelar]  [➕ Adicionar Conta]    │
└─────────────────────────────────────────┘
```

---

## Como Remover uma Conta Publicitária

### Método 1: Via Interface

1. Acesse **http://localhost:8083/meta-ads-config**
2. Role até a seção **Contas Publicitárias**
3. Localize a conta que deseja remover
4. **Passe o mouse sobre a conta** (um botão de lixeira aparecerá)
5. Clique no **ícone de lixeira** 🗑️
6. Confirme a remoção no diálogo:
   ```
   ⚠️ Remover conta publicitária?

   Você está prestes a remover a conta "Minha Empresa".

   Esta ação não poderá ser desfeita. Todos os dados
   históricos de campanhas associados a esta conta
   permanecerão no sistema, mas novas sincronizações
   não serão realizadas.

   [Cancelar]  [Remover Conta]
   ```
7. Clique em **"Remover Conta"**
8. ✅ A conta será marcada como inativa

### Nota Importante sobre Remoção

- 🔸 **Soft Delete**: A conta não é deletada permanentemente
- 🔸 **Dados Preservados**: Histórico de campanhas é mantido
- 🔸 **Sem Sincronização**: Novas atualizações não ocorrerão
- 🔸 **Reversível**: Pode ser reativada via banco de dados se necessário

---

## Como Buscar e Filtrar Contas

### Buscar por Texto

1. Use a **barra de busca** no topo da lista
2. Digite qualquer termo:
   - Nome da conta: `"Minha Empresa"`
   - ID da conta: `"123456789"`
   - Provedor: `"meta"`
3. Os resultados são filtrados em tempo real

### Filtrar por Status

1. Use o dropdown **"Filtro"** ao lado da busca
2. Selecione:
   - **Todas**: Mostra todas as contas
   - **Ativas**: Somente contas em uso
   - **Inativas**: Somente contas removidas
3. Combine com busca por texto para filtros mais específicos

### Limpar Filtros

- Clique no botão **"✕ Limpar"** para resetar busca e filtros

---

## Estatísticas da Seção

No topo da lista de contas, você verá 3 cards:

```
┌─────────┐  ┌─────────┐  ┌─────────┐
│ Total   │  │ Ativas  │  │Inativas │
│   5     │  │   4     │  │   1     │
└─────────┘  └─────────┘  └─────────┘
```

- **Total**: Quantidade total de contas conectadas
- **Ativas**: Contas que estão sincronizando dados
- **Inativas**: Contas removidas (soft delete)

---

## Solução de Problemas

### Erro: "Esta conta publicitária já está conectada"

**Causa**: Você está tentando adicionar uma conta que já existe.

**Solução**:
1. Verifique se a conta já está na lista
2. Use a busca para encontrar: digite o ID da conta
3. Se encontrada, não precisa adicionar novamente

### Erro: "Não foi possível adicionar a conta"

**Causa**: Erro de permissão ou conexão.

**Soluções**:
1. Verifique se está logado no sistema
2. Certifique-se de estar conectado ao Meta Business
3. Verifique se o ID da conta está correto
4. Tente reconectar ao Meta Business

### Botão "Adicionar Conta" não aparece

**Causa**: Você não está conectado ao Meta Business.

**Solução**:
1. Role até o card azul "Meta Business Manager"
2. Clique em **"Conectar com Meta Business"**
3. Autorize as permissões no Meta
4. Após conectar, o botão aparecerá

### Não consigo ver minhas contas

**Causa**: Filtros podem estar ativos ou você não adicionou contas.

**Soluções**:
1. Clique em **"✕ Limpar"** para resetar filtros
2. Verifique se o filtro está em "Todas"
3. Limpe a barra de busca
4. Se ainda não aparecer, adicione uma conta

---

## Atalhos Úteis

| Ação | Como Fazer |
|------|------------|
| Adicionar conta | Botão "Adicionar Conta" (topo direito) |
| Remover conta | Hover na conta → Click 🗑️ |
| Atualizar lista | Botão "Atualizar" (topo direito) |
| Buscar conta | Digite na barra de busca |
| Filtrar status | Dropdown "Filtro" → Selecione |
| Limpar filtros | Botão "✕ Limpar" |

---

## Boas Práticas

### Nomenclatura de Contas

Use nomes descritivos e organizados:

✅ **Bom:**
- `Empresa ABC - Campanhas Brasil`
- `Produto X - Meta Ads Q1 2025`
- `Cliente Y - Awareness`

❌ **Evite:**
- `Conta 1`
- `teste`
- `act_123456789`

### Organização

- 📁 Separe por cliente/projeto no nome
- 📁 Inclua o período/objetivo quando relevante
- 📁 Use padrões consistentes de nomenclatura

### Manutenção

- 🔄 Revise periodicamente contas inativas
- 🔄 Remova contas que não são mais usadas
- 🔄 Atualize nomes para refletir uso atual

---

## FAQ

**P: Posso adicionar contas de outros provedores além do Meta?**
R: No momento, apenas Meta Ads é suportado. Google Ads e outros provedores serão adicionados em versões futuras.

**P: Quantas contas posso adicionar?**
R: Não há limite técnico, mas recomendamos gerenciar apenas contas ativas.

**P: A remoção afeta os dados históricos?**
R: Não. A remoção é um "soft delete" que mantém todos os dados históricos intactos.

**P: Posso reativar uma conta removida?**
R: Atualmente não via interface, mas é possível via banco de dados. Entre em contato com suporte técnico.

**P: O que acontece se eu remover uma conta por engano?**
R: Os dados não são perdidos. Entre em contato com suporte técnico para reativação.

**P: Preciso estar conectado ao Meta Business para gerenciar contas?**
R: Sim, a conexão OAuth com Meta Business é necessária para adicionar/gerenciar contas.

---

## Recursos Adicionais

- 📖 [Documentação Completa](./AD_ACCOUNTS_MANAGEMENT.md)
- 📖 [Guia de Configuração Meta Ads](./META_OAUTH_TESTING.md)
- 📖 [Design System](../DESIGN_SYSTEM.md)
- 🐛 [Reportar Problema](https://github.com/seu-repo/issues)

---

**Precisa de ajuda?** Entre em contato com o suporte técnico.

**Última atualização**: 2025-10-18
