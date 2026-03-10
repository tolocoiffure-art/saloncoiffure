-- Multi-tenant websites: add slug/status/plan/published_at and website_domains mapping
-- Safe to run multiple times thanks to IF NOT EXISTS guards

-- Ensure pgcrypto is available for gen_random_uuid
create extension if not exists "pgcrypto";

alter table public.websites
  add column if not exists slug text,
  add column if not exists plan text,
  add column if not exists published_at timestamptz;

-- Backfill slug from domain/name and ensure non-null
do $$
declare
  rec record;
begin
  update public.websites
  set slug = coalesce(
    nullif(regexp_replace(coalesce(domain, name, ''), '[^a-z0-9]+', '-', 'gi'), ''),
    substr(gen_random_uuid()::text, 1, 12)
  )
  where slug is null or slug = '';

  -- Enforce not null after backfill
  alter table public.websites alter column slug set not null;
end $$;

-- Table for domain mapping (primary/verified)
create table if not exists public.website_domains (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  website_id uuid references public.websites(id) on delete cascade,
  domain text not null unique,
  is_primary boolean not null default false,
  verified_at timestamptz,
  metadata jsonb default '{}'::jsonb
);

-- Indexes
create index if not exists websites_slug_agency_id_idx on public.websites(slug, agency_id);
create index if not exists website_domains_domain_idx on public.website_domains(domain);
create index if not exists website_domains_website_id_idx on public.website_domains(website_id);

