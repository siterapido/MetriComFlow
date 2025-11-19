## Objetivo
- Implementar um wizard de 3 telas (Resposta → Confirmação → Final), com transições suaves, estado preservado, navegação consistente e validação entre etapas.

## Arquitetura de Componentes
- `Wizard`: contêiner que gerencia `activeStep`, estado global dos dados, validação e transições.
- `WizardStep`: wrapper para cada tela que recebe `isActive`, `onNext`, `onBack` e renderiza conteúdo/ações.
- `useWizard`: hook para centralizar estado e regras (dados, validação por etapa, transições).

## Estados & Preservação
- Estado global em `Wizard` (ex.: `wizardData` via `useReducer`), com shape:
  - `response`: dados capturados na etapa 1
  - `confirm`: flags/resultado da etapa 2
  - `final`: payload final/mensagens
- Etapas atualizam seu “slice” do estado; ir/voltar não perde informação.
- Evitar perda de estado por desmontagem: manter dados no pai; passos são controlados por `activeStep` e o conteúdo é re-renderizado com base no estado.

## Validação
- `zod` + `react-hook-form` em cada etapa:
  - Etapa 1 (Resposta): valida campos mínimos conforme o fluxo (ex.: texto obrigatório);
  - Etapa 2 (Confirmação): valida que o usuário confirmou explicitamente (ex.: checkbox “Confirmo”);
  - Etapa 3 (Final): sem inputs, apenas apresentar resultado com opção de reinício.
- Bloquear “Avançar” quando o passo não estiver válido; exibir erros inline.

## Transições
- Sem libs externas: usar Tailwind CSS (`transition`, `duration-300`, `opacity-0/100`, `translate-x-...`).
- Estrutura: cada `WizardStep` aplica classes condicionais para entrada/saída suave.
- Garantir que apenas o passo ativo esteja visível (aria/role para acessibilidade).

## Controles Consistentes
- Cabeçalho com progresso: “Etapa X de 3”.
- Rodapé padronizado:
  - Etapa 1: `Cancelar` e `Avançar`
  - Etapa 2: `Voltar` e `Avançar`
  - Etapa 3: `Voltar` e `Concluir` + `Reiniciar`
- Botões desabilitados quando inválido.

## Implementação Técnica
- Criar `src/components/wizard/Wizard.tsx` e `WizardStep.tsx` (usando shadcn-ui para botões/layout):
  - `Wizard` props: `initialStep=1`, `totalSteps=3`;
  - Renderiza cabeçalho (progresso), conteúdo do passo ativo e rodapé com ações.
- Criar `src/hooks/useWizard.ts` com:
  - `activeStep` e setters (`next`, `back`, `restart`)
  - `wizardData` (context) e helpers de atualização
  - `validateStep(step, data)` retorna boolean e mensagens
- Telas concretas:
  - `ResponseStep`: exibe conteúdo respondido, formulário simples, `Avançar` habilita quando válido.
  - `ConfirmationStep`: mostra resumo e `Confirmo` (checkbox); `Voltar` para editar; `Avançar` se confirmado.
  - `FinalStep`: mensagem de sucesso, `Reiniciar` para resetar e voltar à etapa 1.

## Integração & Uso
- Exemplo de uso em qualquer fluxo (incluindo import de planilhas):
  - Montar `Wizard` e passar `ResponseStep`, `ConfirmationStep`, `FinalStep` como filhos.
  - Conectar validações específicas de domínio via `useWizard` (schemas zod por etapa).

## Testes
- Unit: validação por etapa (zod), navegação (next/back/restart) e preservação de estado.
- Integração: transições visuais e controle de botões conforme validade.

## Entregáveis
- Componentes `Wizard` e `WizardStep` reutilizáveis.
- Hook `useWizard` com estado/validação/transições.
- Exemplo de implementação com as três telas e navegação funcional.

Confirma que posso implementar agora esse wizard e integrar onde você desejar (ex.: importação de leads, formulários de cadastro, etc.)?