-- Create public bucket for lead form assets (logo and banner)
-- This migration is idempotent.

insert into storage.buckets (id, name, public)
values ('lead-form-assets', 'lead-form-assets', true)
on conflict (id) do nothing;

-- Policies: read public, write for authenticated users
do $$
begin
  if not exists (
    select 1 from pg_policies p
    where p.schemaname = 'storage' and p.tablename = 'objects' and p.policyname = 'lead_form_assets_read'
  ) then
    create policy lead_form_assets_read on storage.objects
      for select
      to anon, authenticated
      using (bucket_id = 'lead-form-assets');
  end if;

  if not exists (
    select 1 from pg_policies p
    where p.schemaname = 'storage' and p.tablename = 'objects' and p.policyname = 'lead_form_assets_insert'
  ) then
    create policy lead_form_assets_insert on storage.objects
      for insert
      to authenticated
      with check (bucket_id = 'lead-form-assets');
  end if;

  if not exists (
    select 1 from pg_policies p
    where p.schemaname = 'storage' and p.tablename = 'objects' and p.policyname = 'lead_form_assets_update'
  ) then
    create policy lead_form_assets_update on storage.objects
      for update
      to authenticated
      using (bucket_id = 'lead-form-assets')
      with check (bucket_id = 'lead-form-assets');
  end if;

  if not exists (
    select 1 from pg_policies p
    where p.schemaname = 'storage' and p.tablename = 'objects' and p.policyname = 'lead_form_assets_delete'
  ) then
    create policy lead_form_assets_delete on storage.objects
      for delete
      to authenticated
      using (bucket_id = 'lead-form-assets');
  end if;
end $$;

comment on policy lead_form_assets_read on storage.objects is 'Permite leitura pública dos arquivos do bucket lead-form-assets';
comment on policy lead_form_assets_insert on storage.objects is 'Permite upload por usuários autenticados no bucket lead-form-assets';
comment on policy lead_form_assets_update on storage.objects is 'Permite atualizar objetos do bucket lead-form-assets por usuários autenticados';
comment on policy lead_form_assets_delete on storage.objects is 'Permite remover objetos do bucket lead-form-assets por usuários autenticados';

