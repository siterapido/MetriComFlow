## Objetivo
- Mostrar o título da página apenas na barra superior, com estilo minimalista.
- Evitar repetição do título no corpo: manter apenas um `h1` por página (no topo). 

## Onde o título aparece hoje
- Topo: `src/components/layout/Header.tsx:50` renderiza `<h1>` com título derivado do menu/rota.
- Corpo (duplicações dentro do AppLayout):
  - `src/pages/Dashboard.tsx:129`
  - `src/pages/LeadsLinear.tsx:182`
  - `src/pages/Leads.tsx:244`
  - `src/pages/LeadForms.tsx:903`
  - `src/pages/MetricsPageModern.tsx:316, 358`
  - `src/pages/Profile.tsx:180`
  - `src/pages/TeamManagement.tsx:126`
  - `src/pages/SubscriptionPlans.tsx:144`
  - `src/pages/PurchasePage.tsx:27`
  - `src/pages/PurchaseSuccessPage.tsx:46`
  - `src/pages/PurchaseCancelPage.tsx:4`
  - `src/pages/PosLoginPage.tsx:18`
- Componente: `src/components/forms/FormRenderer.tsx:365` também usa `<h1>` (deve virar subtítulo `h2`).
- Fora do AppLayout (públicas): `Index`, `Auth`, `PrivacyPolicy`, `NotFound` — permanecem com seus próprios títulos.

## Alterações propostas
- Minimalismo no topo: em `src/components/layout/Header.tsx:50`
  - Trocar classes para `text-base sm:text-lg font-medium text-muted-foreground` (mantendo semântica `h1`).
  - Garantir cálculo de `pageTitle` atual permanece.
- Remover/demover `<h1>` no corpo das páginas dentro do AppLayout:
  - Apagar o primeiro `<h1>` listado em cada arquivo acima ou trocá-lo por `h2`/`p` quando for subtítulo/descrição.
  - Ajustar margens locais (`mb-*`) se necessário para manter espaçamento.
- Demover `FormRenderer.tsx:365` para `h2` com estilo coerente (`text-xl font-semibold text-foreground`).
- Não tocar páginas públicas fora do AppLayout.

## Verificações
- Rodar a aplicação e navegar pelas rotas afetadas verificando:
  - O `h1` aparece apenas no topo (Header) e não se repete no corpo.
  - Estilo do topo está discreto/legível em desktop e mobile.
  - Não há regressão de layout (espaçamentos após remoções).
- Validar acessibilidade: uma estrutura de cabeçalho por página, `h1` único.

## Observações
- Se alguma página precisar de subtítulos internos, usar `h2`/`h3` em vez de repetir o título principal.
- Páginas de compra/sucesso/cancelamento seguem a mesma regra por estarem sob o AppLayout.