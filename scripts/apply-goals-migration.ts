import { createClient } from '@supabase/supabase-js'
import * as fs from 'fs'
import * as path from 'path'

const supabaseUrl = process.env.VITE_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function applyMigration() {
  console.log('📦 Reading migration file...')

  const migrationPath = path.join(__dirname, '../supabase/migrations/20251020_unified_goals_system.sql')
  const sql = fs.readFileSync(migrationPath, 'utf-8')

  console.log('🚀 Applying migration to database...')

  const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql }).single()

  if (error) {
    console.error('❌ Migration failed:', error)
    process.exit(1)
  }

  console.log('✅ Migration applied successfully!')
  console.log(data)
}

applyMigration()
