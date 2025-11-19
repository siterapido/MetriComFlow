## Objetivo
- Tornar as mensagens de erro da UI mais claras quando a função Edge retorna não-2xx.
- Propagar o motivo exato do erro a partir do backend para o frontend.
- Ampliar logs estruturados com razão e métricas da chamada.

## Mudanças no Frontend
- Atualizar `getMetrics` em `src/hooks/useGetMetrics.ts` para:
  - Quando `supabase.functions.invoke` retornar `error`, extrair detalhes de `(error as any).context?.error` ou `(error as any).context` e incluí-los na mensagem lançada.
  - Manter compatibilidade com mensagens atuais.
- Ajustar `AdSetPerformanceTable` e `AdPerformanceTableV2` para mapear o padrão “non-2xx” como serviço indisponível, exibindo detalhe quando disponível.
- Criar teste unitário que simula erro `non-2xx` com detalhe e valida a mensagem final exibida.

## Mudanças no Backend
- Em `supabase/functions/get-metrics/index.ts`:
  - Garantir que todas respostas de erro tragam campo `error` textual e um `reason` padronizado.
  - Manter logs estruturados: `metrics_response`, `metrics_param_error`, `metrics_invalid_level`, `metrics_error` com `durationMs` e contadores.

## Verificação
- Rodar testes unitários novos e existentes.
- Validar manualmente chamadas com parâmetros vazios e nível inválido.

## Resultado
- UI passa a exibir mensagens específicas com a causa (parâmetros, credenciais, permissões, serviço indisponível) e detalhe do backend quando disponível.
- Logs permitem rastrear tempo, contadores e razões de erro para troubleshooting.