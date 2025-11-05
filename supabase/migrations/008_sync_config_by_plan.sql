-- Tabela de configuração de sincronização por organização
CREATE TABLE organization_sync_config (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  plan_slug TEXT NOT NULL CHECK (plan_slug IN ('basico', 'intermediario', 'pro')),
  
  -- Limites de histórico em dias
  campaign_history_days INTEGER NOT NULL DEFAULT 30,
  ad_set_history_days INTEGER NOT NULL DEFAULT 30,
  ad_history_days INTEGER NOT NULL DEFAULT 30,
  
  -- Configurações de sincronização
  auto_sync_enabled BOOLEAN NOT NULL DEFAULT true,
  last_campaign_sync TIMESTAMP WITH TIME ZONE,
  last_ad_set_sync TIMESTAMP WITH TIME ZONE,
  last_ad_sync TIMESTAMP WITH TIME ZONE,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Índices únicos
  UNIQUE(organization_id)
);

-- Índices para performance
CREATE INDEX idx_organization_sync_config_org_id ON organization_sync_config(organization_id);
CREATE INDEX idx_organization_sync_config_plan ON organization_sync_config(plan_slug);

-- RLS: Usuários podem ver apenas configurações da própria organização
ALTER TABLE organization_sync_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuários podem ver config da própria org" ON organization_sync_config
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id FROM users WHERE id = auth.uid()
    )
  );

CREATE POLICY "Apenas admins podem atualizar config" ON organization_sync_config
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() 
      AND organization_id = organization_sync_config.organization_id
      AND role = 'admin'
    )
  );

-- Função para atualizar configurações baseado no plano
CREATE OR REPLACE FUNCTION update_organization_sync_config(org_id UUID, new_plan_slug TEXT)
RETURNS VOID AS $$
BEGIN
  INSERT INTO organization_sync_config (
    organization_id,
    plan_slug,
    campaign_history_days,
    ad_set_history_days,
    ad_history_days
  )
  VALUES (
    org_id,
    new_plan_slug,
    CASE new_plan_slug
      WHEN 'basico' THEN 30
      WHEN 'intermediario' THEN 90
      WHEN 'pro' THEN 1110
    END,
    CASE new_plan_slug
      WHEN 'basico' THEN 30
      WHEN 'intermediario' THEN 90
      WHEN 'pro' THEN 1110
    END,
    CASE new_plan_slug
      WHEN 'basico' THEN 30
      WHEN 'intermediario' THEN 90
      WHEN 'pro' THEN 1110
    END
  )
  ON CONFLICT (organization_id) 
  DO UPDATE SET
    plan_slug = EXCLUDED.plan_slug,
    campaign_history_days = EXCLUDED.campaign_history_days,
    ad_set_history_days = EXCLUDED.ad_set_history_days,
    ad_history_days = EXCLUDED.ad_history_days,
    updated_at = NOW();
END;
$$ LANGUAGE plpgsql;

-- Trigger para criar config padrão quando organização for criada
CREATE OR REPLACE FUNCTION create_default_sync_config()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM update_organization_sync_config(NEW.id, 'basico');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_create_sync_config
  AFTER INSERT ON organizations
  FOR EACH ROW
  EXECUTE FUNCTION create_default_sync_config();