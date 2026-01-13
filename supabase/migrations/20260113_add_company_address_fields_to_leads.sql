-- Migration: Add company and address fields to leads table
-- Date: 2026-01-13
-- Description: Adds fields for company information (legal_name, trade_name, cnpj, etc.) 
--              and address information (street, city, state, etc.) to the leads table

BEGIN;

-- Add company information fields
ALTER TABLE public.leads
ADD COLUMN IF NOT EXISTS trade_name TEXT,
ADD COLUMN IF NOT EXISTS legal_name TEXT,
ADD COLUMN IF NOT EXISTS cnpj TEXT,
ADD COLUMN IF NOT EXISTS secondary_phone TEXT,
ADD COLUMN IF NOT EXISTS size TEXT,
ADD COLUMN IF NOT EXISTS share_capital DECIMAL(15, 2),
ADD COLUMN IF NOT EXISTS opening_date DATE,
ADD COLUMN IF NOT EXISTS main_activity TEXT,
ADD COLUMN IF NOT EXISTS product_interest TEXT;

-- Add address fields
ALTER TABLE public.leads
ADD COLUMN IF NOT EXISTS zip_code TEXT,
ADD COLUMN IF NOT EXISTS street TEXT, -- Usando 'street' ao invés de 'address'
ADD COLUMN IF NOT EXISTS address_number TEXT,
ADD COLUMN IF NOT EXISTS complement TEXT,
ADD COLUMN IF NOT EXISTS neighborhood TEXT,
ADD COLUMN IF NOT EXISTS city TEXT,
ADD COLUMN IF NOT EXISTS state TEXT;

-- Create indexes for commonly queried fields
CREATE INDEX IF NOT EXISTS idx_leads_cnpj ON public.leads(cnpj) WHERE cnpj IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_leads_city ON public.leads(city) WHERE city IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_leads_state ON public.leads(state) WHERE state IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_leads_zip_code ON public.leads(zip_code) WHERE zip_code IS NOT NULL;

-- Add comments to document the new fields
COMMENT ON COLUMN public.leads.trade_name IS 'Nome fantasia da empresa';
COMMENT ON COLUMN public.leads.legal_name IS 'Razão social da empresa';
COMMENT ON COLUMN public.leads.cnpj IS 'CNPJ da empresa';
COMMENT ON COLUMN public.leads.secondary_phone IS 'Telefone secundário';
COMMENT ON COLUMN public.leads.size IS 'Porte da empresa (MEI, ME, EPP, etc.)';
COMMENT ON COLUMN public.leads.share_capital IS 'Capital social da empresa';
COMMENT ON COLUMN public.leads.opening_date IS 'Data de abertura da empresa';
COMMENT ON COLUMN public.leads.main_activity IS 'Atividade principal (CNAE)';
COMMENT ON COLUMN public.leads.product_interest IS 'Produto ou serviço de interesse';
COMMENT ON COLUMN public.leads.zip_code IS 'CEP';
COMMENT ON COLUMN public.leads.street IS 'Logradouro (rua, avenida, etc.)';
COMMENT ON COLUMN public.leads.address_number IS 'Número do endereço';
COMMENT ON COLUMN public.leads.complement IS 'Complemento do endereço';
COMMENT ON COLUMN public.leads.neighborhood IS 'Bairro';
COMMENT ON COLUMN public.leads.city IS 'Cidade';
COMMENT ON COLUMN public.leads.state IS 'Estado (UF)';

COMMIT;
