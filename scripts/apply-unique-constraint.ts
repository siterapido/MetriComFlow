import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://fjoaliipjfcnokermkhy.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZqb2FsaWlwamZjbm9rZXJta2h5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MDQyMzgwNSwiZXhwIjoyMDc1OTk5ODA1fQ.nJjAUvhvOSEXQjweS-NWk5EjBxvNIyUzSY3mOxI40aw'
);

async function applyConstraint() {
  console.log('=== APLICANDO CONSTRAINT DE UNICIDADE ===\n');

  // Step 1: Check for duplicates
  console.log('1. Verificando duplicatas...');
  const { data: duplicates, error: dupError } = await supabase
    .from('ad_accounts')
    .select('external_id')
    .order('external_id');

  if (dupError) {
    console.error('Erro ao verificar duplicatas:', dupError);
    return;
  }

  const externalIdCounts: Record<string, number> = {};
  duplicates?.forEach((acc: any) => {
    externalIdCounts[acc.external_id] = (externalIdCounts[acc.external_id] || 0) + 1;
  });

  const hasDuplicates = Object.values(externalIdCounts).some(count => count > 1);

  if (hasDuplicates) {
    console.log('⚠️  Encontradas duplicatas:');
    Object.entries(externalIdCounts).forEach(([id, count]) => {
      if (count > 1) {
        console.log(`   ${id}: ${count} vezes`);
      }
    });
    console.log('\n❌ Por favor, remova as duplicatas antes de aplicar a constraint.');
    console.log('Execute: npx tsx scripts/fix-ad-accounts.ts\n');
    return;
  }

  console.log('✅ Nenhuma duplicata encontrada.\n');

  // Step 2: Create the function
  console.log('2. Criando função is_ad_account_connected...');

  const createFunctionSQL = `
    CREATE OR REPLACE FUNCTION is_ad_account_connected(p_external_id TEXT)
    RETURNS TABLE (
      is_connected BOOLEAN,
      connected_by_user_id UUID,
      connected_by_user_name TEXT,
      organization_id UUID,
      organization_name TEXT,
      business_name TEXT
    )
    LANGUAGE plpgsql
    SECURITY DEFINER
    AS $$
    BEGIN
      RETURN QUERY
      SELECT
        TRUE as is_connected,
        p.id as connected_by_user_id,
        p.full_name as connected_by_user_name,
        aa.organization_id,
        o.name as organization_name,
        aa.business_name
      FROM ad_accounts aa
      LEFT JOIN organizations o ON o.id = aa.organization_id
      LEFT JOIN profiles p ON p.id = aa.connected_by
      WHERE aa.external_id = p_external_id
        AND aa.is_active = TRUE
      LIMIT 1;
    END;
    $$;
  `;

  try {
    // Using raw SQL via Edge Function or direct connection would be needed
    // For now, we'll note that this needs to be run manually
    console.log('⚠️  Esta função SQL precisa ser aplicada manualmente via Dashboard do Supabase.');
    console.log('\nSQL para copiar:');
    console.log('----------------------------------------');
    console.log(createFunctionSQL);
    console.log('----------------------------------------\n');

    console.log('3. Para aplicar o constraint e a função:');
    console.log('\nAcesse: https://supabase.com/dashboard/project/fjoaliipjfcnokermkhy/sql/new');
    console.log('\nCole e execute este SQL:\n');

    const fullSQL = `
-- Step 1: Add unique constraint on external_id
ALTER TABLE ad_accounts
DROP CONSTRAINT IF EXISTS ad_accounts_external_id_key;

ALTER TABLE ad_accounts
ADD CONSTRAINT ad_accounts_external_id_key
UNIQUE (external_id);

-- Step 2: Create index for performance
CREATE INDEX IF NOT EXISTS idx_ad_accounts_external_id
ON ad_accounts(external_id);

-- Step 3: Add comment
COMMENT ON CONSTRAINT ad_accounts_external_id_key ON ad_accounts IS
'Ensures each Meta ad account (identified by external_id) can only be connected once across all organizations. This prevents duplicate connections and data conflicts.';

${createFunctionSQL}

-- Step 4: Grant permissions
GRANT EXECUTE ON FUNCTION is_ad_account_connected TO authenticated;
    `;

    console.log(fullSQL);

    console.log('\n✅ Após aplicar o SQL acima, a prevenção de duplicidade estará ativa!');

  } catch (err) {
    console.error('Erro:', err);
  }
}

applyConstraint().catch(console.error);
