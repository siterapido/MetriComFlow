#!/bin/bash

# Script to apply ad_sets and ads migration to remote Supabase database
# Usage: ./scripts/apply-ad-sets-migration.sh

set -e

echo "🔄 Applying ad_sets and ads migration to remote database..."

# Get Supabase project ref from .env
source .env
PROJECT_REF=$(echo $VITE_SUPABASE_URL | sed -E 's/https:\/\/(.*)\.supabase\.co/\1/')

echo "📦 Project: $PROJECT_REF"
echo "📝 Migration file: 20251203120000_meta_ad_sets_and_ads.sql"

# Use Supabase SQL editor API to execute migration
# Note: You need to have SUPABASE_ACCESS_TOKEN set or use the CLI

echo ""
echo "⚠️  Please run this SQL manually in Supabase SQL Editor:"
echo "   https://supabase.com/dashboard/project/$PROJECT_REF/sql/new"
echo ""
echo "Or copy and paste the migration file content from:"
echo "   supabase/migrations/20251203120000_meta_ad_sets_and_ads.sql"
echo ""

# Alternative: Use supabase db remote command (if available)
if command -v supabase &> /dev/null; then
    echo "💡 Alternative: Run this command:"
    echo "   npx supabase db remote execute < supabase/migrations/20251203120000_meta_ad_sets_and_ads.sql"
fi
