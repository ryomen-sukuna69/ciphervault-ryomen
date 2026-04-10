-- CipherVault (E2EE) schema + policies
-- Apply in Supabase SQL editor or via CLI migrations.

-- Extensions
create extension if not exists "pgcrypto";

-- Profiles (optional friendly name)
create table if not exists public.profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "profiles: self read"
on public.profiles for select
to authenticated
using (user_id = auth.uid());

create policy "profiles: self upsert"
on public.profiles for insert
to authenticated
with check (user_id = auth.uid());

create policy "profiles: self update"
on public.profiles for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

-- Public keys for hybrid crypto
create table if not exists public.user_public_keys (
  user_id uuid primary key references auth.users (id) on delete cascade,
  enc_public_key_jwk jsonb not null,  -- RSA-OAEP
  sig_public_key_jwk jsonb not null,  -- RSA-PSS
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.user_public_keys enable row level security;

create policy "public_keys: read authenticated"
on public.user_public_keys for select
to authenticated
using (true);

create policy "public_keys: self upsert"
on public.user_public_keys for insert
to authenticated
with check (user_id = auth.uid());

create policy "public_keys: self update"
on public.user_public_keys for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

-- Transfers metadata (ciphertext in Storage)
create table if not exists public.transfers (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid not null references auth.users (id) on delete restrict,
  recipient_id uuid not null references auth.users (id) on delete restrict,

  filename text not null,
  mime text not null,
  byte_size bigint not null,

  storage_bucket text not null default 'ciphervault',
  storage_path text not null,

  wrapped_aes_key_b64 text not null,
  iv_b64 text not null,
  ciphertext_sha256_b64 text not null,

  sender_signature_b64 text not null,

  created_at timestamptz not null default now(),
  status text not null default 'ready'
);

create index if not exists transfers_sender_idx on public.transfers (sender_id, created_at desc);
create index if not exists transfers_recipient_idx on public.transfers (recipient_id, created_at desc);

alter table public.transfers enable row level security;

create policy "transfers: sender or recipient read"
on public.transfers for select
to authenticated
using (sender_id = auth.uid() or recipient_id = auth.uid());

create policy "transfers: sender insert"
on public.transfers for insert
to authenticated
with check (sender_id = auth.uid());

-- Allow sender to update status (optional)
create policy "transfers: sender update status"
on public.transfers for update
to authenticated
using (sender_id = auth.uid())
with check (sender_id = auth.uid());

