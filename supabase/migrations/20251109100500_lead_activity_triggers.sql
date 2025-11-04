-- Log CRM movements for leads into lead_activity
-- Creates function and triggers to capture inserts/updates/deletes on public.leads

create or replace function public.log_lead_activity()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
  v_user_name text;
  v_from text;
  v_to text;
begin
  -- Try to resolve the auth user (optional)
  begin
    select auth.uid() into v_user_id; -- works within auth context
  exception when others then
    v_user_id := null;
  end;

  if v_user_id is not null then
    select p.full_name into v_user_name from public.profiles p where p.id = v_user_id;
  end if;

  if tg_op = 'INSERT' then
    insert into public.lead_activity (action_type, lead_id, lead_title, description, user_id, user_name, created_at)
    values ('created', new.id, new.title, 'Lead criado', v_user_id, coalesce(v_user_name, 'Sistema'), now());
    return new;
  elsif tg_op = 'DELETE' then
    insert into public.lead_activity (action_type, lead_id, lead_title, description, user_id, user_name, created_at)
    values ('deleted', old.id, old.title, 'Lead removido', v_user_id, coalesce(v_user_name, 'Sistema'), now());
    return old;
  elsif tg_op = 'UPDATE' then
    -- Status change
    if coalesce(old.status, '') is distinct from coalesce(new.status, '') then
      insert into public.lead_activity (action_type, lead_id, lead_title, from_status, to_status, description, user_id, user_name, created_at)
      values ('status_change', new.id, new.title, old.status, new.status, 'Mudança de etapa', v_user_id, coalesce(v_user_name, 'Sistema'), now());
    end if;

    -- Assignment change
    if coalesce(old.assignee_id, '') is distinct from coalesce(new.assignee_id, '') then
      insert into public.lead_activity (action_type, lead_id, lead_title, description, user_id, user_name, created_at)
      values ('assignment', new.id, new.title, coalesce(new.assignee_name, 'Responsável atualizado'), v_user_id, coalesce(v_user_name, 'Sistema'), now());
    end if;

    -- Value change
    if coalesce(old.value, 0) is distinct from coalesce(new.value, 0) or coalesce(old.contract_value, 0) is distinct from coalesce(new.contract_value, 0) then
      insert into public.lead_activity (action_type, lead_id, lead_title, description, user_id, user_name, created_at)
      values ('value_update', new.id, new.title, 'Valor do negócio atualizado', v_user_id, coalesce(v_user_name, 'Sistema'), now());
    end if;

    -- Source/campaign change
    if coalesce(old.source, '') is distinct from coalesce(new.source, '') or coalesce(old.campaign_id, '') is distinct from coalesce(new.campaign_id, '') then
      insert into public.lead_activity (action_type, lead_id, lead_title, description, user_id, user_name, created_at)
      values ('source_update', new.id, new.title, 'Origem/Campanha atualizada', v_user_id, coalesce(v_user_name, 'Sistema'), now());
    end if;

    return new;
  end if;

  return null;
end;
$$;
drop trigger if exists trg_leads_log_activity on public.leads;
create trigger trg_leads_log_activity
after insert or update or delete on public.leads
for each row execute function public.log_lead_activity();
-- Optional helpful index for ordering/filters
create index if not exists idx_lead_activity_lead_created_at on public.lead_activity(lead_id, created_at desc);
