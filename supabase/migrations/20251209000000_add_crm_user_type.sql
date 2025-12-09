-- Migration: Add CRM User Type
-- Description: Adds a new user type 'crm_user' with access only to CRM dashboard and pipeline, without access to forms

-- Add new value to user_type enum
ALTER TYPE user_type ADD VALUE IF NOT EXISTS 'crm_user';

-- Update has_crm_access function to include crm_user
CREATE OR REPLACE FUNCTION has_crm_access(user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles
    WHERE id = user_id AND user_type IN ('owner', 'sales', 'crm_user')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to check if user has forms access
CREATE OR REPLACE FUNCTION has_forms_access(user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles
    WHERE id = user_id AND user_type IN ('owner', 'sales')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update RLS policies for lead_forms table (only owner and sales can access)
DROP POLICY IF EXISTS "Users can view lead forms" ON lead_forms;
DROP POLICY IF EXISTS "Users can create lead forms" ON lead_forms;
DROP POLICY IF EXISTS "Users can update lead forms" ON lead_forms;
DROP POLICY IF EXISTS "Users can delete lead forms" ON lead_forms;

CREATE POLICY "Users with forms access can view lead forms"
  ON lead_forms FOR SELECT
  USING (has_forms_access(auth.uid()));

CREATE POLICY "Users with forms access can create lead forms"
  ON lead_forms FOR INSERT
  WITH CHECK (has_forms_access(auth.uid()));

CREATE POLICY "Users with forms access can update lead forms"
  ON lead_forms FOR UPDATE
  USING (has_forms_access(auth.uid()));

CREATE POLICY "Owners can delete lead forms"
  ON lead_forms FOR DELETE
  USING (is_owner(auth.uid()));

-- Update RLS policies for form_fields table (only owner and sales can access)
DROP POLICY IF EXISTS "Users can view form fields" ON form_fields;
DROP POLICY IF EXISTS "Users can create form fields" ON form_fields;
DROP POLICY IF EXISTS "Users can update form fields" ON form_fields;
DROP POLICY IF EXISTS "Users can delete form fields" ON form_fields;

CREATE POLICY "Users with forms access can view form fields"
  ON form_fields FOR SELECT
  USING (has_forms_access(auth.uid()));

CREATE POLICY "Users with forms access can create form fields"
  ON form_fields FOR INSERT
  WITH CHECK (has_forms_access(auth.uid()));

CREATE POLICY "Users with forms access can update form fields"
  ON form_fields FOR UPDATE
  USING (has_forms_access(auth.uid()));

CREATE POLICY "Users with forms access can delete form fields"
  ON form_fields FOR DELETE
  USING (has_forms_access(auth.uid()));

-- Update RLS policies for form_submissions table (only owner and sales can access)
DROP POLICY IF EXISTS "Users can view form submissions" ON form_submissions;
DROP POLICY IF EXISTS "Users can create form submissions" ON form_submissions;
DROP POLICY IF EXISTS "Users can update form submissions" ON form_submissions;
DROP POLICY IF EXISTS "Users can delete form submissions" ON form_submissions;

CREATE POLICY "Users with forms access can view form submissions"
  ON form_submissions FOR SELECT
  USING (has_forms_access(auth.uid()));

CREATE POLICY "Public can create form submissions"
  ON form_submissions FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Users with forms access can update form submissions"
  ON form_submissions FOR UPDATE
  USING (has_forms_access(auth.uid()));

CREATE POLICY "Owners can delete form submissions"
  ON form_submissions FOR DELETE
  USING (is_owner(auth.uid()));

-- Add comments
COMMENT ON FUNCTION has_forms_access IS 'Checks if user can access lead forms features (owner or sales only, crm_user excluded)';
COMMENT ON TYPE user_type IS 'User permission types: owner (full access), traffic_manager (metrics only), sales (CRM + forms), crm_user (CRM only, no forms)';
