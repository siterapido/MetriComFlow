-- Create Meta Business connections table (já deve existir, mas vamos garantir)
CREATE TABLE IF NOT EXISTS meta_business_connections (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  meta_user_id TEXT NOT NULL,
  meta_user_name TEXT NOT NULL,
  meta_user_email TEXT,
  access_token TEXT NOT NULL,
  token_expires_at TIMESTAMPTZ,
  connected_at TIMESTAMPTZ DEFAULT NOW(),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, meta_user_id)
);
-- Create ad accounts table
CREATE TABLE IF NOT EXISTS ad_accounts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  ad_account_id TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  account_status INTEGER,
  currency TEXT,
  timezone_name TEXT,
  platform TEXT DEFAULT 'meta_ads',
  is_active BOOLEAN DEFAULT TRUE,
  connected_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_meta_business_connections_user_id ON meta_business_connections(user_id);
CREATE INDEX IF NOT EXISTS idx_meta_business_connections_is_active ON meta_business_connections(is_active);
CREATE INDEX IF NOT EXISTS idx_ad_accounts_user_id ON ad_accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_ad_accounts_platform ON ad_accounts(platform);
CREATE INDEX IF NOT EXISTS idx_ad_accounts_is_active ON ad_accounts(is_active);
-- Enable Row Level Security
ALTER TABLE meta_business_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE ad_accounts ENABLE ROW LEVEL SECURITY;
-- RLS Policies for meta_business_connections
CREATE POLICY "Users can view their own Meta connections"
  ON meta_business_connections FOR SELECT
  USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own Meta connections"
  ON meta_business_connections FOR INSERT
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own Meta connections"
  ON meta_business_connections FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete their own Meta connections"
  ON meta_business_connections FOR DELETE
  USING (auth.uid() = user_id);
-- RLS Policies for ad_accounts
CREATE POLICY "Users can view their own ad accounts"
  ON ad_accounts FOR SELECT
  USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own ad accounts"
  ON ad_accounts FOR INSERT
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own ad accounts"
  ON ad_accounts FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete their own ad accounts"
  ON ad_accounts FOR DELETE
  USING (auth.uid() = user_id);
-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER update_meta_business_connections_updated_at
  BEFORE UPDATE ON meta_business_connections
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_ad_accounts_updated_at
  BEFORE UPDATE ON ad_accounts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
-- Comment on tables
COMMENT ON TABLE meta_business_connections IS 'Stores Meta (Facebook) Business Manager OAuth connections';
COMMENT ON TABLE ad_accounts IS 'Stores advertising accounts from various platforms (Meta Ads, Google Ads, etc.)';
