# InsightFy - Design System Guide

## 📐 Visão Geral

O InsightFy utiliza um design system moderno e profissional com foco em tons de azul, criando uma identidade visual coesa e harmoniosa em toda a aplicação.

---

## 🎨 Paleta de Cores

### Cores Primárias

| Nome | Valor HSL | Hex | Uso |
|------|-----------|-----|-----|
| **Primary** | `200 100% 56%` | `#2DA7FF` | Ações principais, CTAs, links |
| **Secondary** | `202 100% 52%` | `#0D9DFF` | Highlights, animações, acentos |
| **Background** | `218 56% 14%` | `#071D33` | Fundo principal da aplicação |
| **Foreground** | `206 20% 92%` | `#EBEFF3` | Texto principal |

### Cores de Card e Superfícies

| Nome | Valor HSL | Uso |
|------|-----------|-----|
| **Card** | `218 45% 18%` | Fundo de cards e painéis |
| **Muted** | `218 35% 25%` | Superfícies secundárias |
| **Border** | `218 25% 30%` | Bordas e divisores |

### Cores de Status

| Nome | Valor HSL | Hex | Uso |
|------|-----------|-----|-----|
| **Success** | `142 76% 36%` | `#16A34A` | Sucesso, confirmações, estados ativos |
| **Warning** | `38 92% 50%` | `#F59E0B` | Avisos, alertas, atenção |
| **Destructive** | `0 84% 60%` | `#EF4444` | Erros, exclusões, estados críticos |

---

## 🌈 Gradientes Oficiais

### Gradiente Primário
```css
background: linear-gradient(135deg, hsl(200 100% 56%), hsl(202 100% 52%));
```
**Uso:** Botões principais, headers de destaque, elementos call-to-action

### Gradiente de Card
```css
background: linear-gradient(145deg, hsl(218 45% 18%), hsl(218 35% 25%));
```
**Uso:** Fundos de cards com profundidade, painéis principais

### Gradiente Hero
```css
background: linear-gradient(120deg, hsl(218 56% 14%), hsl(202 100% 52%));
```
**Uso:** Banners, headers de página, seções de destaque

---

## 🎯 Padrões de Componentes

### Cards

#### Card Padrão
```tsx
<Card className="border-border bg-card">
  <CardHeader>
    <CardTitle className="text-foreground">Título</CardTitle>
    <CardDescription className="text-muted-foreground">Descrição</CardDescription>
  </CardHeader>
  <CardContent>
    {/* Conteúdo */}
  </CardContent>
</Card>
```

#### Card com Gradiente
```tsx
<Card className="bg-gradient-to-br from-card to-accent/20 border-border hover-lift">
  {/* ... */}
</Card>
```

#### Card de Destaque
```tsx
<Card className="border-2 border-primary bg-card shadow-lg">
  {/* ... */}
</Card>
```

### Botões

#### Botão Primário
```tsx
<Button className="bg-primary hover:bg-primary/90">
  Ação Principal
</Button>
```

#### Botão com Gradiente
```tsx
<Button className="bg-gradient-to-r from-primary to-secondary hover:opacity-90 shadow-md hover:shadow-lg transition-all">
  Conectar
</Button>
```

#### Botão Outline
```tsx
<Button variant="outline" className="border-border hover:bg-muted">
  Ação Secundária
</Button>
```

### Badges

#### Badge de Status - Ativo
```tsx
<Badge className="bg-success text-success-foreground">
  Ativo
</Badge>
```

#### Badge de Status - Inativo
```tsx
<Badge variant="secondary" className="bg-muted text-muted-foreground">
  Inativo
</Badge>
```

#### Badge com Cor Customizada
```tsx
<Badge className="bg-primary/10 text-primary border border-primary/20">
  Meta Ads
</Badge>
```

---

## 🎭 Ícones e Indicadores

### Ícones em Gradiente
```tsx
<div className="w-12 h-12 bg-gradient-to-br from-primary to-secondary rounded-xl flex items-center justify-center shadow-md">
  <IconComponent className="w-6 h-6 text-white" />
</div>
```

### Indicadores de Status
```tsx
{/* Conectado */}
<div className="flex items-center gap-2">
  <div className="w-2.5 h-2.5 bg-success rounded-full animate-pulse" />
  <span className="text-sm font-semibold text-success">Conectado</span>
</div>

{/* Desconectado */}
<div className="flex items-center gap-2">
  <div className="w-2.5 h-2.5 bg-muted-foreground rounded-full" />
  <span className="text-sm font-semibold text-muted-foreground">Desconectado</span>
</div>
```

---

## 📊 Cartões de Métricas

### Estilo Padrão
```tsx
<Card className="bg-gradient-to-br from-card to-accent/20 border-border hover-lift">
  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
    <CardTitle className="text-sm font-medium text-muted-foreground">
      Métrica
    </CardTitle>
    <IconComponent className="h-4 w-4 text-primary" />
  </CardHeader>
  <CardContent>
    <div className="text-2xl font-bold text-foreground">Valor</div>
    <p className="text-xs text-primary">Descrição</p>
  </CardContent>
</Card>
```

### Cartões Coloridos (Estatísticas)
```tsx
{/* Azul */}
<div className="bg-gradient-to-br from-blue-50 to-blue-100/50 border border-blue-200 rounded-lg p-3">
  <p className="text-xs font-medium text-blue-700 uppercase tracking-wide mb-1">Label</p>
  <p className="text-2xl font-bold text-blue-900">Valor</p>
</div>

{/* Verde (Sucesso) */}
<div className="bg-gradient-to-br from-green-50 to-green-100/50 border border-green-200 rounded-lg p-3">
  <p className="text-xs font-medium text-green-700 uppercase tracking-wide mb-1">Label</p>
  <p className="text-2xl font-bold text-green-900">Valor</p>
</div>
```

---

## 🎨 Seções e Layouts

### Header de Página
```tsx
<div className="space-y-2">
  <div className="flex items-center gap-3">
    <div className="w-12 h-12 bg-gradient-to-br from-primary to-secondary rounded-xl flex items-center justify-center shadow-lg">
      <IconComponent className="w-7 h-7 text-white" />
    </div>
    <div>
      <h1 className="text-4xl font-bold tracking-tight text-foreground">
        Título da Página
      </h1>
      <p className="text-base text-muted-foreground mt-1">
        Descrição da página
      </p>
    </div>
  </div>
</div>
```

### Grid de Conteúdo
```tsx
<div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
  {/* Conteúdo Principal */}
  <div className="lg:col-span-2 space-y-6">
    {/* ... */}
  </div>

  {/* Sidebar */}
  <div className="space-y-6">
    {/* ... */}
  </div>
</div>
```

---

## ✨ Efeitos e Animações

### Hover Lift
```tsx
<Card className="hover-lift">
  {/* Adiciona elevação suave ao hover */}
</Card>
```

### Fade In
```tsx
<div className="animate-fade-in">
  {/* Fade in suave */}
</div>
```

### Pulse Glow
```tsx
<Button className="animate-pulse-glow">
  {/* Pulso com brilho */}
</Button>
```

### Glass Effect
```tsx
<div className="glass">
  {/* Efeito de vidro com blur */}
</div>
```

---

## 🎯 Seções Especiais

### Cards de Feature com Ícone
```tsx
<div className="bg-card/60 backdrop-blur-sm rounded-lg p-4 border border-primary/20 hover:border-primary/40 transition-colors">
  <div className="w-12 h-12 bg-gradient-to-br from-primary to-secondary rounded-lg flex items-center justify-center mx-auto mb-3 shadow-sm">
    <IconComponent className="w-6 h-6 text-white" />
  </div>
  <p className="text-sm font-semibold text-foreground text-center">Título</p>
  <p className="text-xs text-muted-foreground mt-1 text-center">Descrição</p>
</div>
```

### Steps (Instruções Numeradas)
```tsx
<div className="bg-card border border-border rounded-lg p-4 flex gap-4 hover:shadow-sm transition-shadow">
  <div className="w-8 h-8 bg-gradient-to-br from-primary to-secondary text-white rounded-lg flex items-center justify-center text-base font-bold flex-shrink-0">
    1
  </div>
  <div>
    <p className="font-semibold text-base text-foreground">Título do Passo</p>
    <p className="text-sm text-muted-foreground mt-1">
      Descrição do passo
    </p>
  </div>
</div>
```

### Alert Customizado
```tsx
<Alert className="border-2 border-primary bg-primary/10">
  <AlertCircle className="h-5 w-5 text-primary" />
  <AlertDescription className="text-primary font-medium">
    Mensagem importante
  </AlertDescription>
</Alert>
```

---

## 📏 Espaçamentos Padrão

- **Entre seções:** `space-y-6` ou `space-y-8`
- **Gap em grids:** `gap-6` (principal) ou `gap-4` (secundário)
- **Padding em cards:** `p-4` (pequeno), `p-6` (médio), `p-7` (grande)
- **Margens internas:** `mb-2`, `mb-4`, `mb-6`

---

## 🎨 Tipografia

### Títulos
- **H1 (Página):** `text-4xl font-bold tracking-tight text-foreground`
- **H2 (Seção):** `text-3xl font-bold text-foreground`
- **H3 (Card):** `text-2xl font-bold text-foreground`
- **H4 (Subtítulo):** `text-xl font-bold text-foreground`

### Corpo
- **Normal:** `text-base text-foreground`
- **Descrição:** `text-base text-muted-foreground`
- **Pequeno:** `text-sm text-muted-foreground`
- **Extra Pequeno:** `text-xs text-muted-foreground`

### Pesos
- **Regular:** `font-normal`
- **Médio:** `font-medium`
- **Semi-bold:** `font-semibold`
- **Bold:** `font-bold`

---

## 🔄 Transições

Todas as transições usam:
```css
transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
```

Para bounces:
```css
transition: all 0.4s cubic-bezier(0.68, -0.55, 0.265, 1.55);
```

---

## ✅ Checklist de Consistência

Ao criar um novo componente, certifique-se de:

- [ ] Usar cores da paleta oficial (primary, secondary, muted, etc.)
- [ ] Aplicar gradientes consistentes para elementos de destaque
- [ ] Usar ícones com container em gradiente quando apropriado
- [ ] Adicionar estados de hover e transições suaves
- [ ] Manter espaçamentos padronizados (gap-6, space-y-6)
- [ ] Usar tipografia consistente (tamanhos e pesos)
- [ ] Incluir estados de loading quando necessário
- [ ] Aplicar bordas consistentes (border, border-2)
- [ ] Usar shadow-sm, shadow-md, shadow-lg apropriadamente
- [ ] Testar responsividade (sm:, md:, lg:, xl:)

---

## 🎯 Exemplos de Uso por Página

### Dashboard
- Cards com gradiente `from-card to-accent/20`
- Gráficos com cor primária `#2DA7FF`
- Badges de status coloridos

### Leads (Kanban)
- Cards com `hover-lift` e `border-border`
- Badges de labels com cores específicas
- Indicador de drag com `ring-2 ring-primary`

### Meta Ads Config
- Header com ícone em gradiente
- Cards de feature com background `from-primary to-secondary`
- Status cards com indicador animado
- Sidebar com cards coloridos

---

## 📝 Notas Importantes

1. **Sempre prefira usar variáveis CSS** (`hsl(var(--primary))`) ao invés de cores hardcoded
2. **Mantenha a hierarquia visual** usando tamanhos e pesos de fonte apropriados
3. **Use gradientes com moderação** - apenas em elementos de destaque
4. **Teste em dark mode** - todas as cores devem funcionar bem
5. **Seja consistente** - se um padrão foi estabelecido, siga-o em toda a aplicação

---

**Última atualização:** 2025-10-18
**Versão:** 1.0.0
