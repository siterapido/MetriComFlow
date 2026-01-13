-- Migration: User Types and Permissions System
-- Description: Adds user type system with granular permissions for Owner, Traffic Manager, and Sales

-- Create user_type enum
CREATE TYPE user_type AS ENUM ('owner', 'traffic_manager', 'sales');
-- Add user_type column to profiles table
ALTER TABLE profiles
ADD COLUMN user_type user_type NOT NULL DEFAULT 'sales';
-- Create function to check if user is owner
CREATE OR REPLACE FUNCTION is_owner(user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles
    WHERE id = user_id AND user_type = 'owner'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
-- Create function to check if user has CRM access
CREATE OR REPLACE FUNCTION has_crm_access(user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles
    WHERE id = user_id AND user_type IN ('owner', 'sales')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
-- Create function to check if user has metrics access
CREATE OR REPLACE FUNCTION has_metrics_access(user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles
    WHERE id = user_id AND user_type IN ('owner', 'traffic_manager')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
-- Update RLS policies for leads table (CRM access only)
DROP POLICY IF EXISTS "Users can view leads" ON leads;
DROP POLICY IF EXISTS "Users can create leads" ON leads;
DROP POLICY IF EXISTS "Users can update leads" ON leads;
DROP POLICY IF EXISTS "Users can delete leads" ON leads;
CREATE POLICY "Users with CRM access can view leads"
  ON leads FOR SELECT
  USING (has_crm_access(auth.uid()));
CREATE POLICY "Users with CRM access can create leads"
  ON leads FOR INSERT
  WITH CHECK (has_crm_access(auth.uid()));
CREATE POLICY "Users with CRM access can update leads"
  ON leads FOR UPDATE
  USING (has_crm_access(auth.uid()));
CREATE POLICY "Owners can delete leads"
  ON leads FOR DELETE
  USING (is_owner(auth.uid()));
-- Update RLS policies for comments (CRM access only)
DROP POLICY IF EXISTS "Users can view comments" ON comments;
DROP POLICY IF EXISTS "Users can create comments" ON comments;
DROP POLICY IF EXISTS "Users can update their comments" ON comments;
DROP POLICY IF EXISTS "Users can delete their comments" ON comments;
CREATE POLICY "Users with CRM access can view comments"
  ON comments FOR SELECT
  USING (has_crm_access(auth.uid()));
CREATE POLICY "Users with CRM access can create comments"
  ON comments FOR INSERT
  WITH CHECK (has_crm_access(auth.uid()) AND user_id = auth.uid());
CREATE POLICY "Users with CRM access can update their comments"
  ON comments FOR UPDATE
  USING (has_crm_access(auth.uid()) AND user_id = auth.uid());
CREATE POLICY "Users with CRM access can delete their comments"
  ON comments FOR DELETE
  USING (has_crm_access(auth.uid()) AND user_id = auth.uid());
-- Update RLS policies for attachments (CRM access only)
DROP POLICY IF EXISTS "Users can view attachments" ON attachments;
DROP POLICY IF EXISTS "Users can create attachments" ON attachments;
DROP POLICY IF EXISTS "Users can delete attachments" ON attachments;
CREATE POLICY "Users with CRM access can view attachments"
  ON attachments FOR SELECT
  USING (has_crm_access(auth.uid()));
CREATE POLICY "Users with CRM access can create attachments"
  ON attachments FOR INSERT
  WITH CHECK (has_crm_access(auth.uid()) AND uploaded_by = auth.uid());
CREATE POLICY "Users with CRM access can delete attachments"
  ON attachments FOR DELETE
  USING (has_crm_access(auth.uid()) AND uploaded_by = auth.uid());
-- Update RLS policies for checklist_items (CRM access only)
DROP POLICY IF EXISTS "Users can view checklist items" ON checklist_items;
DROP POLICY IF EXISTS "Users can create checklist items" ON checklist_items;
DROP POLICY IF EXISTS "Users can update checklist items" ON checklist_items;
DROP POLICY IF EXISTS "Users can delete checklist items" ON checklist_items;
CREATE POLICY "Users with CRM access can view checklist items"
  ON checklist_items FOR SELECT
  USING (has_crm_access(auth.uid()));
CREATE POLICY "Users with CRM access can create checklist items"
  ON checklist_items FOR INSERT
  WITH CHECK (has_crm_access(auth.uid()));
CREATE POLICY "Users with CRM access can update checklist items"
  ON checklist_items FOR UPDATE
  USING (has_crm_access(auth.uid()));
CREATE POLICY "Users with CRM access can delete checklist items"
  ON checklist_items FOR DELETE
  USING (has_crm_access(auth.uid()));
-- Update RLS policies for labels (CRM access only)
DROP POLICY IF EXISTS "Users can view labels" ON labels;
DROP POLICY IF EXISTS "Users can create labels" ON labels;
DROP POLICY IF EXISTS "Users can update labels" ON labels;
DROP POLICY IF EXISTS "Users can delete labels" ON labels;
CREATE POLICY "Users with CRM access can view labels"
  ON labels FOR SELECT
  USING (has_crm_access(auth.uid()));
CREATE POLICY "Users with CRM access can create labels"
  ON labels FOR INSERT
  WITH CHECK (has_crm_access(auth.uid()));
CREATE POLICY "Users with CRM access can update labels"
  ON labels FOR UPDATE
  USING (has_crm_access(auth.uid()));
CREATE POLICY "Owners can delete labels"
  ON labels FOR DELETE
  USING (is_owner(auth.uid()));
-- Update RLS policies for lead_labels (CRM access only)
DROP POLICY IF EXISTS "Users can view lead labels" ON lead_labels;
DROP POLICY IF EXISTS "Users can create lead labels" ON lead_labels;
DROP POLICY IF EXISTS "Users can delete lead labels" ON lead_labels;
CREATE POLICY "Users with CRM access can view lead labels"
  ON lead_labels FOR SELECT
  USING (has_crm_access(auth.uid()));
CREATE POLICY "Users with CRM access can create lead labels"
  ON lead_labels FOR INSERT
  WITH CHECK (has_crm_access(auth.uid()));
CREATE POLICY "Users with CRM access can delete lead labels"
  ON lead_labels FOR DELETE
  USING (has_crm_access(auth.uid()));
-- Update RLS policies for team_members (CRM access only)
DROP POLICY IF EXISTS "Users can view team members" ON team_members;
DROP POLICY IF EXISTS "Users can create team members" ON team_members;
DROP POLICY IF EXISTS "Users can update team members" ON team_members;
DROP POLICY IF EXISTS "Users can delete team members" ON team_members;
CREATE POLICY "Users with CRM access can view team members"
  ON team_members FOR SELECT
  USING (has_crm_access(auth.uid()));
CREATE POLICY "Owners can create team members"
  ON team_members FOR INSERT
  WITH CHECK (is_owner(auth.uid()));
CREATE POLICY "Owners can update team members"
  ON team_members FOR UPDATE
  USING (is_owner(auth.uid()));
CREATE POLICY "Owners can delete team members"
  ON team_members FOR DELETE
  USING (is_owner(auth.uid()));
-- Update RLS policies for lead_activity (CRM access only)
DROP POLICY IF EXISTS "Users can view lead activity" ON lead_activity;
DROP POLICY IF EXISTS "Users can create lead activity" ON lead_activity;
CREATE POLICY "Users with CRM access can view lead activity"
  ON lead_activity FOR SELECT
  USING (has_crm_access(auth.uid()));
CREATE POLICY "Users with CRM access can create lead activity"
  ON lead_activity FOR INSERT
  WITH CHECK (has_crm_access(auth.uid()));
-- Update RLS policies for meta_business_connections (Metrics access only)
DROP POLICY IF EXISTS "Users can view their meta connections" ON meta_business_connections;
DROP POLICY IF EXISTS "Users can create meta connections" ON meta_business_connections;
DROP POLICY IF EXISTS "Users can update their meta connections" ON meta_business_connections;
DROP POLICY IF EXISTS "Users can delete their meta connections" ON meta_business_connections;
CREATE POLICY "Users with metrics access can view meta connections"
  ON meta_business_connections FOR SELECT
  USING (has_metrics_access(auth.uid()));
CREATE POLICY "Users with metrics access can create meta connections"
  ON meta_business_connections FOR INSERT
  WITH CHECK (has_metrics_access(auth.uid()) AND user_id = auth.uid());
CREATE POLICY "Users with metrics access can update meta connections"
  ON meta_business_connections FOR UPDATE
  USING (has_metrics_access(auth.uid()) AND user_id = auth.uid());
CREATE POLICY "Owners can delete meta connections"
  ON meta_business_connections FOR DELETE
  USING (is_owner(auth.uid()));
-- Update RLS policies for ad_accounts (Metrics access only)
DROP POLICY IF EXISTS "Users can view ad accounts" ON ad_accounts;
DROP POLICY IF EXISTS "Users can create ad accounts" ON ad_accounts;
DROP POLICY IF EXISTS "Users can update ad accounts" ON ad_accounts;
DROP POLICY IF EXISTS "Users can delete ad accounts" ON ad_accounts;
CREATE POLICY "Users with metrics access can view ad accounts"
  ON ad_accounts FOR SELECT
  USING (has_metrics_access(auth.uid()));
CREATE POLICY "Users with metrics access can create ad accounts"
  ON ad_accounts FOR INSERT
  WITH CHECK (has_metrics_access(auth.uid()));
CREATE POLICY "Users with metrics access can update ad accounts"
  ON ad_accounts FOR UPDATE
  USING (has_metrics_access(auth.uid()));
CREATE POLICY "Owners can delete ad accounts"
  ON ad_accounts FOR DELETE
  USING (is_owner(auth.uid()));
-- Update RLS policies for ad_campaigns (Metrics access only)
DROP POLICY IF EXISTS "Users can view ad campaigns" ON ad_campaigns;
DROP POLICY IF EXISTS "Users can create ad campaigns" ON ad_campaigns;
DROP POLICY IF EXISTS "Users can update ad campaigns" ON ad_campaigns;
DROP POLICY IF EXISTS "Users can delete ad campaigns" ON ad_campaigns;
CREATE POLICY "Users with metrics access can view ad campaigns"
  ON ad_campaigns FOR SELECT
  USING (has_metrics_access(auth.uid()));
CREATE POLICY "Users with metrics access can create ad campaigns"
  ON ad_campaigns FOR INSERT
  WITH CHECK (has_metrics_access(auth.uid()));
CREATE POLICY "Users with metrics access can update ad campaigns"
  ON ad_campaigns FOR UPDATE
  USING (has_metrics_access(auth.uid()));
CREATE POLICY "Owners can delete ad campaigns"
  ON ad_campaigns FOR DELETE
  USING (is_owner(auth.uid()));
-- Update RLS policies for campaign_daily_insights (Metrics access only)
DROP POLICY IF EXISTS "Users can view campaign insights" ON campaign_daily_insights;
DROP POLICY IF EXISTS "Users can create campaign insights" ON campaign_daily_insights;
DROP POLICY IF EXISTS "Users can update campaign insights" ON campaign_daily_insights;
DROP POLICY IF EXISTS "Users can delete campaign insights" ON campaign_daily_insights;
CREATE POLICY "Users with metrics access can view campaign insights"
  ON campaign_daily_insights FOR SELECT
  USING (has_metrics_access(auth.uid()));
CREATE POLICY "Users with metrics access can create campaign insights"
  ON campaign_daily_insights FOR INSERT
  WITH CHECK (has_metrics_access(auth.uid()));
CREATE POLICY "Users with metrics access can update campaign insights"
  ON campaign_daily_insights FOR UPDATE
  USING (has_metrics_access(auth.uid()));
CREATE POLICY "Owners can delete campaign insights"
  ON campaign_daily_insights FOR DELETE
  USING (is_owner(auth.uid()));
-- Update RLS policies for client_goals (Metrics access for view, Owner for manage)
DROP POLICY IF EXISTS "Users can view client goals" ON client_goals;
DROP POLICY IF EXISTS "Users can create client goals" ON client_goals;
DROP POLICY IF EXISTS "Users can update client goals" ON client_goals;
DROP POLICY IF EXISTS "Users can delete client goals" ON client_goals;
CREATE POLICY "Users with metrics access can view client goals"
  ON client_goals FOR SELECT
  USING (has_metrics_access(auth.uid()));
CREATE POLICY "Owners can create client goals"
  ON client_goals FOR INSERT
  WITH CHECK (is_owner(auth.uid()));
CREATE POLICY "Owners can update client goals"
  ON client_goals FOR UPDATE
  USING (is_owner(auth.uid()));
CREATE POLICY "Owners can delete client goals"
  ON client_goals FOR DELETE
  USING (is_owner(auth.uid()));
-- Update RLS policies for goal_metrics (Metrics access only)
DROP POLICY IF EXISTS "Users can view goal metrics" ON goal_metrics;
DROP POLICY IF EXISTS "Users can create goal metrics" ON goal_metrics;
DROP POLICY IF EXISTS "Users can update goal metrics" ON goal_metrics;
DROP POLICY IF EXISTS "Users can delete goal metrics" ON goal_metrics;
CREATE POLICY "Users with metrics access can view goal metrics"
  ON goal_metrics FOR SELECT
  USING (has_metrics_access(auth.uid()));
CREATE POLICY "Owners can create goal metrics"
  ON goal_metrics FOR INSERT
  WITH CHECK (is_owner(auth.uid()));
CREATE POLICY "Owners can update goal metrics"
  ON goal_metrics FOR UPDATE
  USING (is_owner(auth.uid()));
CREATE POLICY "Owners can delete goal metrics"
  ON goal_metrics FOR DELETE
  USING (is_owner(auth.uid()));
-- Update RLS policies for revenue_records (Metrics access only)
DROP POLICY IF EXISTS "Users can view revenue records" ON revenue_records;
DROP POLICY IF EXISTS "Users can create revenue records" ON revenue_records;
DROP POLICY IF EXISTS "Users can update revenue records" ON revenue_records;
DROP POLICY IF EXISTS "Users can delete revenue records" ON revenue_records;
CREATE POLICY "Users with metrics access can view revenue records"
  ON revenue_records FOR SELECT
  USING (has_metrics_access(auth.uid()));
CREATE POLICY "Owners can create revenue records"
  ON revenue_records FOR INSERT
  WITH CHECK (is_owner(auth.uid()));
CREATE POLICY "Owners can update revenue records"
  ON revenue_records FOR UPDATE
  USING (is_owner(auth.uid()));
CREATE POLICY "Owners can delete revenue records"
  ON revenue_records FOR DELETE
  USING (is_owner(auth.uid()));
-- Update RLS policies for profiles (all users can view, only owners can modify user types)
DROP POLICY IF EXISTS "Users can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
CREATE POLICY "Users can view all profiles"
  ON profiles FOR SELECT
  USING (auth.uid() IS NOT NULL);
CREATE POLICY "Users can update own profile basic info"
  ON profiles FOR UPDATE
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid() AND (
    -- Users can only update their own basic info, not user_type
    (SELECT user_type FROM profiles WHERE id = auth.uid()) = user_type
  ));
CREATE POLICY "Owners can update any profile user_type"
  ON profiles FOR UPDATE
  USING (is_owner(auth.uid()));
-- Create index for user_type lookups
CREATE INDEX IF NOT EXISTS idx_profiles_user_type ON profiles(user_type);
-- Set the first user as owner (for initial setup)
-- This will be run only if there's exactly one user
DO $$
DECLARE
  user_count INTEGER;
  first_user_id UUID;
BEGIN
  SELECT COUNT(*) INTO user_count FROM profiles;

  IF user_count = 1 THEN
    SELECT id INTO first_user_id FROM profiles LIMIT 1;
    UPDATE profiles SET user_type = 'owner' WHERE id = first_user_id;
    RAISE NOTICE 'First user % set as owner', first_user_id;
  END IF;
END $$;
COMMENT ON TYPE user_type IS 'User permission types: owner (full access), traffic_manager (metrics only), sales (CRM only)';
COMMENT ON COLUMN profiles.user_type IS 'Defines user permissions: owner, traffic_manager, or sales';
COMMENT ON FUNCTION is_owner IS 'Checks if user has owner permissions';
COMMENT ON FUNCTION has_crm_access IS 'Checks if user can access CRM features (owner or sales)';
COMMENT ON FUNCTION has_metrics_access IS 'Checks if user can access metrics and analytics (owner or traffic_manager)';
