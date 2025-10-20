-- Add contract fields to leads table
-- Migration: 008_add_contract_fields_to_leads
-- Created: 2025-10-19

-- Add contract value field (monthly or annual)
ALTER TABLE public.leads
ADD COLUMN contract_value DECIMAL(12, 2) DEFAULT 0,
ADD COLUMN contract_type VARCHAR(20) DEFAULT 'monthly' CHECK (contract_type IN ('monthly', 'annual', 'one_time')),
ADD COLUMN contract_months INTEGER DEFAULT 1 CHECK (contract_months >= 1 AND contract_months <= 120);

-- Add comment to explain new fields
COMMENT ON COLUMN public.leads.contract_value IS 'Contract value (monthly or annual amount)';
COMMENT ON COLUMN public.leads.contract_type IS 'Contract billing type: monthly, annual, or one_time';
COMMENT ON COLUMN public.leads.contract_months IS 'Number of months for monthly contracts (1-120)';

-- Update the existing value column to be calculated based on contract fields
-- This will be used for backward compatibility
-- For monthly contracts: contract_value * contract_months
-- For annual/one_time: contract_value

-- Create a function to calculate total lead value
CREATE OR REPLACE FUNCTION calculate_lead_total_value(
  p_contract_value DECIMAL,
  p_contract_type VARCHAR,
  p_contract_months INTEGER
) RETURNS DECIMAL AS $$
BEGIN
  IF p_contract_type = 'monthly' THEN
    RETURN p_contract_value * COALESCE(p_contract_months, 1);
  ELSE
    RETURN p_contract_value;
  END IF;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Add a computed column for total value (this maintains backward compatibility)
-- We'll keep the existing 'value' column and update it via trigger

-- Create trigger to auto-update the 'value' field based on contract fields
CREATE OR REPLACE FUNCTION update_lead_value()
RETURNS TRIGGER AS $$
BEGIN
  NEW.value := calculate_lead_total_value(
    NEW.contract_value,
    NEW.contract_type,
    NEW.contract_months
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_lead_value
BEFORE INSERT OR UPDATE OF contract_value, contract_type, contract_months
ON public.leads
FOR EACH ROW
EXECUTE FUNCTION update_lead_value();

-- Migrate existing data: copy 'value' to 'contract_value' with 'one_time' type
UPDATE public.leads
SET
  contract_value = COALESCE(value, 0),
  contract_type = 'one_time',
  contract_months = 1
WHERE contract_value IS NULL OR contract_value = 0;
