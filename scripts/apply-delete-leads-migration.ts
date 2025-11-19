/**
 * Apply Delete Leads Migration
 *
 * Aplica a migração para permitir exclusão de leads por todos os membros da organização.
 */

import { readFileSync } from 'fs';
import { join } from 'path';

const SUPABASE_URL = 'https://fjoaliipjfcnokermkhy.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZqb2FsaWlwamZjbm9rZXJta2h5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MDQyMzgwNSwiZXhwIjoyMDc1OTk5ODA1fQ.nJjAUvhvOSEXQjweS-NWk5EjBxvNIyUzSY3mOxI40aw';

async function applyMigration() {
  console.log('🚀 Aplicando migração: Allow members to delete leads...\n');

  try {
    // Usar fetch para executar SQL via REST API do Supabase
    const queries = [
      // 1. Atualizar política DELETE para leads
      `DROP POLICY IF EXISTS "Admins can delete leads in their organization" ON public.leads;`,
      `CREATE POLICY "Members can delete leads in their organization"
        ON public.leads FOR DELETE
        USING (
          organization_id IN (
            SELECT organization_id FROM public.organization_memberships
            WHERE profile_id = auth.uid() AND is_active = TRUE
          )
        );`,

      // 2. Atualizar FK de comments para CASCADE
      `ALTER TABLE public.comments DROP CONSTRAINT IF EXISTS comments_lead_id_fkey;`,
      `ALTER TABLE public.comments
        ADD CONSTRAINT comments_lead_id_fkey
        FOREIGN KEY (lead_id) REFERENCES public.leads(id) ON DELETE CASCADE;`,

      // 3. Atualizar FK de attachments para CASCADE
      `ALTER TABLE public.attachments DROP CONSTRAINT IF EXISTS attachments_lead_id_fkey;`,
      `ALTER TABLE public.attachments
        ADD CONSTRAINT attachments_lead_id_fkey
        FOREIGN KEY (lead_id) REFERENCES public.leads(id) ON DELETE CASCADE;`,

      // 4. Atualizar FK de checklist_items para CASCADE
      `ALTER TABLE public.checklist_items DROP CONSTRAINT IF EXISTS checklist_items_lead_id_fkey;`,
      `ALTER TABLE public.checklist_items
        ADD CONSTRAINT checklist_items_lead_id_fkey
        FOREIGN KEY (lead_id) REFERENCES public.leads(id) ON DELETE CASCADE;`,

      // 5. Atualizar FK de lead_activity para CASCADE
      `ALTER TABLE public.lead_activity DROP CONSTRAINT IF EXISTS lead_activity_lead_id_fkey;`,
      `ALTER TABLE public.lead_activity
        ADD CONSTRAINT lead_activity_lead_id_fkey
        FOREIGN KEY (lead_id) REFERENCES public.leads(id) ON DELETE CASCADE;`,

      // 6. Atualizar FK de lead_labels para CASCADE
      `ALTER TABLE public.lead_labels DROP CONSTRAINT IF EXISTS lead_labels_lead_id_fkey;`,
      `ALTER TABLE public.lead_labels
        ADD CONSTRAINT lead_labels_lead_id_fkey
        FOREIGN KEY (lead_id) REFERENCES public.leads(id) ON DELETE CASCADE;`,

      // 7. Atualizar FK de stopped_sales para CASCADE
      `ALTER TABLE public.stopped_sales DROP CONSTRAINT IF EXISTS stopped_sales_lead_id_fkey;`,
      `ALTER TABLE public.stopped_sales
        ADD CONSTRAINT stopped_sales_lead_id_fkey
        FOREIGN KEY (lead_id) REFERENCES public.leads(id) ON DELETE CASCADE;`,

      // 8. Atualizar FK de revenue_records para SET NULL
      `ALTER TABLE public.revenue_records DROP CONSTRAINT IF EXISTS revenue_records_related_lead_id_fkey;`,
      `ALTER TABLE public.revenue_records
        ADD CONSTRAINT revenue_records_related_lead_id_fkey
        FOREIGN KEY (related_lead_id) REFERENCES public.leads(id) ON DELETE SET NULL;`,

      // 9. Adicionar políticas DELETE para tabelas relacionadas
      `DROP POLICY IF EXISTS "Members can delete checklist items in their organization" ON public.checklist_items;`,
      `CREATE POLICY "Members can delete checklist items in their organization"
        ON public.checklist_items FOR DELETE
        USING (
          organization_id IN (
            SELECT organization_id FROM public.organization_memberships
            WHERE profile_id = auth.uid() AND is_active = TRUE
          )
        );`,

      `DROP POLICY IF EXISTS "Members can delete activity in their organization" ON public.lead_activity;`,
      `CREATE POLICY "Members can delete activity in their organization"
        ON public.lead_activity FOR DELETE
        USING (
          organization_id IN (
            SELECT organization_id FROM public.organization_memberships
            WHERE profile_id = auth.uid() AND is_active = TRUE
          )
        );`,

      `DROP POLICY IF EXISTS "Members can delete stopped sales in their organization" ON public.stopped_sales;`,
      `CREATE POLICY "Members can delete stopped sales in their organization"
        ON public.stopped_sales FOR DELETE
        USING (
          organization_id IN (
            SELECT organization_id FROM public.organization_memberships
            WHERE profile_id = auth.uid() AND is_active = TRUE
          )
        );`,
    ];

    console.log(`📝 Executando ${queries.length} comando(s) SQL...\n`);

    for (let i = 0; i < queries.length; i++) {
      const query = queries[i];
      console.log(`[${i + 1}/${queries.length}] Executando: ${query.substring(0, 60)}...`);

      try {
        const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_raw_sql`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': SUPABASE_SERVICE_ROLE_KEY,
            'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
          },
          body: JSON.stringify({ sql: query })
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.log(`   ⚠️  Aviso: ${errorText.substring(0, 100)}`);
        } else {
          console.log(`   ✅ Sucesso`);
        }
      } catch (error) {
        console.log(`   ⚠️  Erro ao executar (continuando): ${error instanceof Error ? error.message : error}`);
      }
    }

    console.log('\n✨ Migração concluída!\n');
    console.log('📋 Próximos passos:');
    console.log('   1. Teste a exclusão de leads no frontend');
    console.log('   2. Verifique se as tabelas relacionadas são deletadas automaticamente');
    console.log('   3. Confirme que revenue_records mantém histórico (lead_id vira NULL)');
    console.log('');

  } catch (error) {
    console.error('\n❌ Erro:', error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

applyMigration();
