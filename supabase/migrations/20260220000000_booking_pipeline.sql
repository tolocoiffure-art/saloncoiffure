create table if not exists public.bookings (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  tenant_id text,
  status text default 'pending',
  customer_name text,
  customer_email text,
  customer_phone text,
  service text,
  address text,
  notes text,
  start_time timestamptz not null,
  end_time timestamptz not null,
  timezone text,
  locale text,
  stripe_session_id text unique,
  amount_total bigint,
  currency text,
  metadata jsonb default '{}'::jsonb
);

create table if not exists public.booking_blocks (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  tenant_id text,
  start_time timestamptz not null,
  end_time timestamptz not null,
  reason text,
  metadata jsonb default '{}'::jsonb
);

create index if not exists bookings_tenant_id_idx on public.bookings(tenant_id);
create index if not exists bookings_start_time_idx on public.bookings(start_time);
create index if not exists booking_blocks_tenant_id_idx on public.booking_blocks(tenant_id);
create index if not exists booking_blocks_start_time_idx on public.booking_blocks(start_time);

alter table public.bookings enable row level security;
alter table public.booking_blocks enable row level security;
