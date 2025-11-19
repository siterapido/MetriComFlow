## Interpretação dos 2 logs
- Log 1 (net::ERR_ABORTED lead_forms): requisição REST cancelada pelo navegador (troca de rota/AbortController). Não indica erro de servidor. Se o objetivo era listar formulários ativos, o filtro correto é `deleted_at=is.null`; `not.is.null` retorna itens deletados.
- Log 2 (42883 uuid = text em get_ad_set_metrics): incompatibilidade de tipos na função SQL chamada pelo fallback. O banco está comparando `uuid` com `text` sem cast.

## Correções propostas
- Lead Forms
  - Ajustar o filtro para `deleted_at=is.null` quando listar ativos.
  - Tratar cancelamentos: capturar `AbortError` e não logar como erro.
- get_ad_set_metrics (fallback)
  - Normalizar tipos na função SQL para evitar `uuid = text`: usar cast explícito no lado da coluna ou do parâmetro.
    - Ex.: `(c.ad_account_id = CAST(p_account_id AS uuid))` e `(s.campaign_id = CAST(p_campaign_id AS uuid))` quando os parâmetros forem `TEXT`.
  - Alternativa: alterar a assinatura da função para `UUID` e enviar `uuid` nativo, mantendo consistência com o schema.
  - No frontend (`useMetaCampaignMetrics.ts`): manter RPC com `rpcParams` e, se vier 42883, reexecutar com chaves compatíveis (remover campo conflitante) como fallback temporário.

## UI de Conjuntos e Anúncios
- Conjuntos
  - Tabela com Nome, ID, Status, Orçamentos (diário/vitalício) e métricas.
  - Filtros por campanha/conta, status e busca textual; ordenação (status/gasto/leads); paginação.
  - Painel de detalhes do conjunto listando anúncios do conjunto com campos do criativo (título, imagem/thumbnail, texto, URL destino) e métricas.
- Anúncios
  - Estender tabela de criativos para exibir título, imagem/thumbnail, texto, URL destino, status e métricas.
- Responsividade
  - Grid/tabela adaptáveis (Tailwind utilitários existentes), `line-clamp` em textos, tamanhos fixos de thumbnails.
- Tempo real
  - Assinar `ad_sets`, `ads`, `ad_set_daily_insights`, `ad_daily_insights` e invalidar caches React Query.

## Validação
- Testes unitários para render/filtros/ordenação/paginação e tempo real.
- Verificação manual nas abas “Conjuntos” e “Criativos”.

## Próximo passo
- Aplicar correções de tipos na função SQL e tratar `AbortError` em lead_forms; em seguida implementar/ajustar UI conforme acima e validar.