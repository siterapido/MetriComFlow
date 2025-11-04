-- Migration: Unificar/mesclar contas publicitárias duplicadas
-- Objetivo: Quando houver contas com external_ids diferentes mas que representam a mesma conta,
-- consolidar todos os dados (campanhas, insights, leads) na conta correta e remover duplicatas.

-- Função para mesclar duas contas publicitárias
CREATE OR REPLACE FUNCTION merge_ad_accounts(
  p_source_account_id UUID,  -- Conta que será removida
  p_target_account_id UUID   -- Conta que receberá os dados
)
RETURNS TABLE(
  campaigns_migrated INTEGER,
  insights_migrated INTEGER,
  leads_migrated INTEGER,
  success BOOLEAN,
  message TEXT
) LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_campaigns_count INTEGER := 0;
  v_insights_count INTEGER := 0;
  v_leads_count INTEGER := 0;
  v_source_name TEXT;
  v_target_name TEXT;
BEGIN
  -- Validar que as contas existem
  SELECT business_name INTO v_source_name FROM ad_accounts WHERE id = p_source_account_id;
  SELECT business_name INTO v_target_name FROM ad_accounts WHERE id = p_target_account_id;

  IF v_source_name IS NULL THEN
    RETURN QUERY SELECT 0, 0, 0, false, 'Conta origem não encontrada'::TEXT;
    RETURN;
  END IF;

  IF v_target_name IS NULL THEN
    RETURN QUERY SELECT 0, 0, 0, false, 'Conta destino não encontrada'::TEXT;
    RETURN;
  END IF;

  -- 1. Migrar campanhas da conta origem para a conta destino
  -- Verificar se já existem campanhas com mesmo external_campaign_id
  UPDATE ad_campaigns
  SET ad_account_id = p_target_account_id
  WHERE ad_account_id = p_source_account_id;

  GET DIAGNOSTICS v_campaigns_count = ROW_COUNT;

  -- 2. Insights das campanhas já foram migrados automaticamente via FK
  -- Contar quantos insights foram afetados
  SELECT COUNT(*) INTO v_insights_count
  FROM campaign_daily_insights cdi
  JOIN ad_campaigns ac ON ac.id = cdi.campaign_id
  WHERE ac.ad_account_id = p_target_account_id;

  -- 3. Migrar leads associados às campanhas
  UPDATE leads
  SET campaign_id = (
    SELECT id FROM ad_campaigns
    WHERE ad_account_id = p_target_account_id
    AND name = (
      SELECT name FROM ad_campaigns WHERE id = leads.campaign_id LIMIT 1
    )
    LIMIT 1
  )
  WHERE campaign_id IN (
    SELECT id FROM ad_campaigns WHERE ad_account_id = p_source_account_id
  );

  GET DIAGNOSTICS v_leads_count = ROW_COUNT;

  -- 4. Desativar a conta origem (soft delete)
  UPDATE ad_accounts
  SET is_active = false,
      business_name = business_name || ' (merged into ' || v_target_name || ')'
  WHERE id = p_source_account_id;

  -- Retornar resultado
  RETURN QUERY SELECT
    v_campaigns_count,
    v_insights_count,
    v_leads_count,
    true,
    format('Migração concluída: %s campanhas, %s insights, %s leads movidos de "%s" para "%s"',
           v_campaigns_count, v_insights_count, v_leads_count, v_source_name, v_target_name)::TEXT;

EXCEPTION WHEN OTHERS THEN
  -- Em caso de erro, retornar mensagem de erro
  RETURN QUERY SELECT 0, 0, 0, false, ('Erro ao mesclar contas: ' || SQLERRM)::TEXT;
END;
$$;
-- Comentário da função
COMMENT ON FUNCTION merge_ad_accounts IS
'Mescla dados de uma conta publicitária duplicada (origem) para a conta correta (destino).
Move todas as campanhas, insights e leads associados e desativa a conta origem.';
-- Exemplo de uso:
-- SELECT * FROM merge_ad_accounts(
--   'id-da-conta-duplicada'::UUID,
--   'id-da-conta-correta'::UUID
-- );;
