## Objetivo
- Investigar erros ao abrir o diálogo de importação (Select.Item sem valor e outros) usando logs do Supabase e inspeção no navegador.

## Ações de Diagnóstico
- Supabase Logs:
  - Consultar `edge-function` para invocações de `import-leads` e `undo-lead-import` em tempo real.
  - Consultar `postgres` para erros de banco (constraints, RLS, triggers) durante importações.
  - Consultar `api` para erros do PostgREST nas tabelas `lead_import_*`.
- Navegador:
  - Abrir `/leads` e acionar “Importar planilha”.
  - Coletar console e visualizar possíveis exceptions de UI (Radix/shadcn Select, etc.).
  - Capturar screenshot do diálogo e estados dos Selects.

## Plano de Execução
1. Habilitar servidor local e reproduzir o fluxo:
  - Abrir “Leads - Kanban/CRM - Pipeline” e clicar “Importar planilha”.
2. Obter logs em janelas curtas (últimos minutos):
  - `edge-function` para ver execuções/erros.
  - `postgres` para constraints e triggers.
3. Ajustar UI conforme achados (
  - Trocar valores vazios por sentinelas em Selects.
  - Garantir imports de componentes Radix/shadcn.
  - Validar placeholders e estados iniciais para evitar exceções).
4. Validar novamente com navegador e confirmar ausência de erros.

## Entregáveis
- Relatório curto com: erros observados, correções aplicadas, evidências (logs/screenshot) e verificação final.

Confirma executar esse plano (iniciando servidor local e coletando logs/screenshots) agora?