create table if not exists public.magic_links (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  user_id uuid null,
  order_id text null,
  checkout_session_id text null,
  token_hash text not null unique,
  expires_at timestamptz not null,
  consumed_at timestamptz null,
  status text not null default 'active' check (status in ('active','consumed','expired','revoked')),
  attempt_count int not null default 0,
  last_attempt_at timestamptz null,
  last_attempt_ip inet null,
  last_attempt_ua text null,
  created_at timestamptz not null default now()
);

create index if not exists magic_links_token_hash_idx on public.magic_links (token_hash);
create index if not exists magic_links_email_idx on public.magic_links (email);
create index if not exists magic_links_status_idx on public.magic_links (status);
create index if not exists magic_links_expires_at_idx on public.magic_links (expires_at);

alter table public.magic_links enable row level security;

comment on table public.magic_links is 'Tokens de magic link únicos para login pós-compra. Acesso restrito via service role.';
