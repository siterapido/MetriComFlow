## Objetivo
- Garantir que o novo wizard de importação de leads esteja visível e funcional em localhost.

## Passos de Diagnóstico
- Reiniciar servidor local:
  - Finalizar qualquer preview anterior e iniciar `npm run dev` para HMR no `http://localhost:8082/`.
  - Se persistir tela antiga, executar `npm run build && npm run preview` e abrir `http://localhost:8082/`.
- Navegação:
  - Acessar “Leads” (`/leads`) ou “Leads - Kanban” (`/leads/kanban`).
  - Clicar no botão “Importar planilha”.
- Verificações visuais:
  - Confirmar o indicador “Etapa X de 3” no cabeçalho do diálogo.
  - Ver os campos mínimos (Título, E-mail, Telefone, Origem) na primeira seção e “Opções avançadas” separadas.
  - Abrir a seção “Origem — Meta Ads” e verificar toggle e mapeamentos (`campaign_id`, `adset_id/adset_name`, `ad_id/ad_name`).
  - Checar a pré-visualização e presença dos botões “Importar” e “Importar e avançar”.
- Cache/Atualização:
  - Fazer hard reload no navegador (Cmd+Shift+R) e limpar cache se necessário.
  - Verificar que não há erros de console (Radix Select, imports, etc.).
- Logs Supabase:
  - Executar uma importação de teste e coletar logs de `edge-function` e `postgres` para confirmar invocação e inserções.

## Correções se necessário
- Se o wizard não aparecer:
  - Validar que está em `/leads` ou `/leads/kanban` (ambas páginas foram atualizadas com o diálogo).
  - Confirmar que o bundle ativo contém `Etapa X de 3` e a seção “Origem — Meta Ads”.
  - Corrigir qualquer erro de build ou import, reiniciando o servidor.

## Entregáveis
- Wizard visível em localhost com todas as etapas.
- Importação de teste realizada e logs verificados (função chamada, registros auditados).