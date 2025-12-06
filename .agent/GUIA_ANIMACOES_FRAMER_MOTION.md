# 🎬 Guia de Animações Framer Motion - InsightFy

**Data de Criação**: 2025-11-25  
**Objetivo**: Documentar todas as animações e interações com Framer Motion que devem ser reimplementadas na Landing Page, Dashboard e componentes do sistema.

---

## 📦 Dependências Necessárias

```json
{
  "framer-motion": "^10.16.4"
}
```

**Instalar**:
```bash
npm install framer-motion
```

---

## 🏠 Landing Page (Index.tsx)

### 1. **Header com Scroll Animation**

**Localização**: `function HeaderLanding()`

```tsx
import { motion } from "framer-motion";

<motion.header
  initial={{ y: -100 }}
  animate={{ y: 0 }}
  transition={{ duration: 0.5 }}
  className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
    scrolled 
      ? "bg-background/80 backdrop-blur-md border-b border-border/50 py-3 shadow-sm" 
      : "bg-transparent py-5"
  }`}
>
  {/* Conteúdo do header */}
</motion.header>
```

**Efeito**: Header desce suavemente quando a página carrega e muda de estilo ao fazer scroll.

---

### 2. **Hero Section - Entrada do Conteúdo**

**Localização**: `function Hero()`

#### Badge Animado com Ping
```tsx
<motion.div
  initial={{ opacity: 0, y: 20 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{ delay: 0.2 }}
  className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-medium bg-white border border-border shadow-sm mb-6 text-primary"
>
  <span className="relative flex h-2 w-2">
    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
    <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
  </span>
  Nova geração de CRM + Ads
</motion.div>
```

#### Texto Principal (Fade In + Slide)
```tsx
<motion.div
  initial={{ opacity: 0, x: -50 }}
  animate={{ opacity: 1, x: 0 }}
  transition={{ duration: 0.8, ease: "easeOut" }}
  className="max-w-2xl"
>
  <h1>Escale sua operação com <span className="text-primary">inteligência</span></h1>
  {/* Resto do conteúdo */}
</motion.div>
```

#### Preview do Dashboard
```tsx
<motion.div
  initial={{ opacity: 0, scale: 0.9 }}
  animate={{ opacity: 1, scale: 1 }}
  transition={{ duration: 0.8, delay: 0.2 }}
  className="relative hidden lg:block"
>
  {/* Imagem do dashboard */}
</motion.div>
```

---

### 3. **Floating Badges no Hero - Animação Contínua**

**Efeito**: Badges flutuantes que se movem para cima e para baixo continuamente.

#### Badge de Meta (Floating Up/Down)
```tsx
<motion.div
  animate={{ y: [0, -10, 0] }}
  transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
  className="absolute -left-8 top-10 bg-white p-4 rounded-xl shadow-xl border border-border"
>
  <div className="flex items-center gap-3">
    <div className="p-2 bg-green-100 rounded-lg text-green-600">
      <Target className="w-6 h-6" />
    </div>
    <div>
      <div className="text-xs text-muted-foreground">Meta Mensal</div>
      <div className="font-bold text-lg text-foreground">124%</div>
    </div>
  </div>
</motion.div>
```

#### Badge de Leads (Floating com Delay)
```tsx
<motion.div
  animate={{ y: [0, 10, 0] }}
  transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 1 }}
  className="absolute -right-8 bottom-20 bg-white p-4 rounded-xl shadow-xl border border-border"
>
  <div className="flex items-center gap-3">
    <div className="p-2 bg-blue-100 rounded-lg text-blue-600">
      <Users className="w-6 h-6" />
    </div>
    <div>
      <div className="text-xs text-muted-foreground">Novos Leads</div>
      <div className="font-bold text-lg text-foreground">+48 Hoje</div>
    </div>
  </div>
</motion.div>
```

---

### 4. **CRM Section - Animação ao Scroll**

**Localização**: `function CRMSection()`

#### Badge "CRM Integrado"
```tsx
<motion.div
  initial={{ opacity: 0, y: 20 }}
  whileInView={{ opacity: 1, y: 0 }}
  viewport={{ once: true }}
  className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium bg-secondary text-primary mb-4"
>
  CRM Integrado
</motion.div>
```

#### Título da Seção
```tsx
<motion.h2
  initial={{ opacity: 0, y: 20 }}
  whileInView={{ opacity: 1, y: 0 }}
  viewport={{ once: true }}
  transition={{ delay: 0.1 }}
  className="text-3xl sm:text-4xl font-bold mb-4 text-foreground"
>
  Gerencie seu funil com <span className="text-primary">maestria</span>
</motion.h2>
```

#### Cards de Features (Stagger)
```tsx
{features.map((feature, idx) => (
  <motion.div
    key={idx}
    initial={{ opacity: 0, y: 30 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true }}
    transition={{ delay: idx * 0.1 }}
    className="group p-8 rounded-2xl bg-secondary/10 border border-transparent hover:border-primary/20 hover:bg-white hover:shadow-xl transition-all duration-300"
  >
    <div className={`w-12 h-12 rounded-xl ${feature.color} flex items-center justify-center mb-6 group-hover:scale-110 transition-transform`}>
      {feature.icon}
    </div>
    {/* Conteúdo do card */}
  </motion.div>
))}
```

#### Preview Interativo do CRM
```tsx
<motion.div
  initial={{ opacity: 0, y: 40 }}
  whileInView={{ opacity: 1, y: 0 }}
  viewport={{ once: true }}
  transition={{ delay: 0.4 }}
  className="mt-20 bg-secondary/20 rounded-3xl p-8 sm:p-12 border border-border/50"
>
  {/* Conteúdo do preview */}
</motion.div>
```

---

### 5. **Features Section - Grid Animado**

**Localização**: `function Features()`

```tsx
<div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
  {features.map((feature, idx) => (
    <motion.div
      key={idx}
      initial={{ opacity: 0, scale: 0.95 }}
      whileInView={{ opacity: 1, scale: 1 }}
      viewport={{ once: true }}
      transition={{ delay: idx * 0.05 }}
      className="group p-8 rounded-2xl bg-white border border-border hover:border-primary/50 transition-all duration-300 hover:shadow-lg"
    >
      <div className="w-12 h-12 rounded-lg bg-secondary/20 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
        {feature.icon}
      </div>
      {/* Conteúdo do card */}
    </motion.div>
  ))}
</div>
```

**Efeito**: Cards aparecem sequencialmente conforme o usuário faz scroll, com um leve aumento de escala.

---

### 6. **Pricing Section - Cards com Glow Effect**

**Localização**: `function PricingPlansSection()`

```tsx
{plans.map((plan) => (
  <motion.div
    key={plan.id}
    initial={{ opacity: 0, y: 20 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true }}
    className="relative group"
  >
    {/* Glow effect para plano Pro */}
    {plan.slug?.includes("pro") && (
      <div className="absolute -inset-[1px] bg-gradient-to-r from-primary to-blue-400 rounded-2xl opacity-70 blur-sm group-hover:opacity-100 transition-opacity duration-500" />
    )}
    
    <div className="relative h-full bg-white border border-border rounded-2xl p-8 flex flex-col hover:border-primary/50 transition-colors duration-300 shadow-sm hover:shadow-xl">
      {/* Conteúdo do plano */}
    </div>
  </motion.div>
))}
```

**Efeito**: 
- Cards aparecem de baixo para cima
- Plano Pro tem um efeito de brilho gradiente ao hover
- Shadow aumenta no hover

---

## 📊 Dashboard

### Animações Recomendadas para Dashboard

#### 1. **KPI Cards - Entrada Sequencial**

```tsx
const kpiCards = [...];

{kpiCards.map((card, index) => (
  <motion.div
    key={card.id}
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay: index * 0.1 }}
  >
    <Card>
      {/* Conteúdo do KPI */}
    </Card>
  </motion.div>
))}
```

#### 2. **Gráficos - Fade In Suave**

```tsx
<motion.div
  initial={{ opacity: 0 }}
  animate={{ opacity: 1 }}
  transition={{ duration: 0.5, delay: 0.3 }}
>
  <ResponsiveContainer>
    {/* Recharts Chart */}
  </ResponsiveContainer>
</motion.div>
```

#### 3. **Tabelas - Slide From Bottom**

```tsx
<motion.div
  initial={{ opacity: 0, y: 30 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{ duration: 0.4, delay: 0.5 }}
>
  <Table>
    {/* Conteúdo da tabela */}
  </Table>
</motion.div>
```

---

## 🎯 Página de Métricas (MetricsPage)

### Animações Sugeridas

#### 1. **Metric Cards com Counter Animation**

```tsx
import { motion, useSpring, useTransform } from "framer-motion";

const AnimatedNumber = ({ value }: { value: number }) => {
  const spring = useSpring(value, { duration: 1000 });
  const display = useTransform(spring, (current) =>
    Math.round(current).toLocaleString("pt-BR")
  );

  return <motion.span>{display}</motion.span>;
};
```

#### 2. **Tabs com Transição Suave**

```tsx
<motion.div
  key={activeTab}
  initial={{ opacity: 0, x: 20 }}
  animate={{ opacity: 1, x: 0 }}
  exit={{ opacity: 0, x: -20 }}
  transition={{ duration: 0.3 }}
>
  {/* Conteúdo da tab */}
</motion.div>
```

---

## 📝 Página de Leads

### Kanban Drag & Drop Animations

#### 1. **Lead Cards - Arrastar**

```tsx
import { motion, Reorder } from "framer-motion";

<Reorder.Group values={leads} onReorder={setLeads}>
  {leads.map((lead) => (
    <Reorder.Item key={lead.id} value={lead}>
      <motion.div
        layout
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.8 }}
        whileHover={{ scale: 1.02 }}
        whileDrag={{ scale: 1.05, rotate: 2 }}
        className="bg-card p-4 rounded-lg shadow-sm cursor-grab active:cursor-grabbing"
      >
        {/* Conteúdo do lead */}
      </motion.div>
    </Reorder.Item>
  ))}
</Reorder.Group>
```

#### 2. **Animação "Conquista" ao Fechar Negócio**

```tsx
const [showConfetti, setShowConfetti] = useState(false);

const handleLeadWon = () => {
  setShowConfetti(true);
  setTimeout(() => setShowConfetti(false), 3000);
};

// No componente
{showConfetti && (
  <motion.div
    initial={{ scale: 0, rotate: -180 }}
    animate={{ scale: 1, rotate: 0 }}
    exit={{ scale: 0, opacity: 0 }}
    className="fixed inset-0 pointer-events-none z-50 flex items-center justify-center"
  >
    <motion.div
      animate={{
        scale: [1, 1.2, 1],
        rotate: [0, 10, -10, 0],
      }}
      transition={{
        duration: 0.5,
        repeat: 3,
      }}
      className="text-8xl"
    >
      🎉
    </motion.div>
  </motion.div>
)}
```

---

## 🎨 Componentes Globais

### 1. **Modal/Dialog Animation**

```tsx
<motion.div
  initial={{ opacity: 0, scale: 0.95 }}
  animate={{ opacity: 1, scale: 1 }}
  exit={{ opacity: 0, scale: 0.95 }}
  transition={{ duration: 0.2 }}
>
  <Dialog>
    {/* Conteúdo do modal */}
  </Dialog>
</motion.div>
```

### 2. **Toast Notifications**

```tsx
<motion.div
  initial={{ opacity: 0, y: 50, scale: 0.3 }}
  animate={{ opacity: 1, y: 0, scale: 1 }}
  exit={{ opacity: 0, scale: 0.5, transition: { duration: 0.2 } }}
>
  <Toast />
</motion.div>
```

### 3. **Sidebar Animation**

```tsx
<motion.aside
  initial={{ x: -250 }}
  animate={{ x: 0 }}
  transition={{ type: "spring", stiffness: 300, damping: 30 }}
  className="fixed left-0 top-0 h-screen"
>
  {/* Conteúdo da sidebar */}
</motion.aside>
```

---

## 🔧 Utilitários e Hooks Customizados

### 1. **Hook para Scroll Progress**

```tsx
import { useScroll, useTransform } from "framer-motion";

const { scrollYProgress } = useScroll();
const opacity = useTransform(scrollYProgress, [0, 0.2], [1, 0]);
const scale = useTransform(scrollYProgress, [0, 0.2], [1, 0.95]);
```

### 2. **Hook para Stagger Children**

```tsx
const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1
    }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 }
};

<motion.div variants={containerVariants} initial="hidden" animate="show">
  {items.map(item => (
    <motion.div key={item.id} variants={itemVariants}>
      {/* Conteúdo */}
    </motion.div>
  ))}
</motion.div>
```

---

## 📐 Configurações Padrão

### Transições Recomendadas

```tsx
// Suave e elegante
const smoothTransition = {
  duration: 0.3,
  ease: "easeInOut"
};

// Bounce para elementos interativos
const bounceTransition = {
  type: "spring",
  stiffness: 300,
  damping: 20
};

// Snap para tabs e navegação
const snapTransition = {
  type: "tween",
  duration: 0.2
};
```

### Variantes Comuns

```tsx
const fadeInUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -20 }
};

const scaleIn = {
  initial: { opacity: 0, scale: 0.9 },
  animate: { opacity: 1, scale: 1 },
  exit: { opacity: 0, scale: 0.9 }
};

const slideInRight = {
  initial: { opacity: 0, x: 50 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: 50 }
};
```

---

## 🎯 Prioridades de Implementação

### Alta Prioridade ⚡
1. **Landing Page Hero** - Primeira impressão crítica
2. **CRM Section Cards** - Demonstração de valor
3. **Pricing Cards** - Conversão
4. **Header Scroll** - UX consistente

### Média Prioridade 📊
5. **Dashboard KPI Cards** - Visualização de dados
6. **Features Grid** - Storytelling
7. **FAQ Accordion** - Suporte

### Baixa Prioridade 🎨
8. **Floating Badges** - Polimento visual
9. **Footer** - Estático, menos impacto
10. **Confete no Lead Won** - "Nice to have"

---

## 🚀 Como Implementar

### Passo 1: Instalar Dependências
```bash
npm install framer-motion
```

### Passo 2: Importar no Componente
```tsx
import { motion } from "framer-motion";
```

### Passo 3: Substituir `<div>` por `<motion.div>`
```tsx
// Antes
<div className="card">Conteúdo</div>

// Depois
<motion.div 
  initial={{ opacity: 0 }}
  animate={{ opacity: 1 }}
  className="card"
>
  Conteúdo
</motion.div>
```

### Passo 4: Testar e Ajustar
- Verificar performance (use `layout` com cuidado)
- Ajustar delays para fluxo natural
- Reduzir animações em mobile se necessário

---

## ⚠️ Considerações de Performance

1. **Use `viewport={{ once: true }}`** para animações de scroll (evita re-renders)
2. **Evite animar propriedades pesadas** (width, height) - prefira `scale` e `opacity`
3. **Use `will-change` CSS** para animações complexas
4. **Lazy load animações** em seções abaixo da dobra
5. **Prefira `transform` e `opacity`** - são GPU-aceleradas

---

## 📚 Recursos Adicionais

- [Framer Motion Docs](https://www.framer.com/motion/)
- [Framer Motion Examples](https://www.framer.com/motion/examples/)
- [Animation Best Practices](https://web.dev/animations/)

---

**Última Atualização**: 2025-11-25  
**Autor**: Antigravity AI Assistant  
**Status**: ✅ Pronto para implementação
