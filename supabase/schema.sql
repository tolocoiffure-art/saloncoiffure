-- Enable pgcrypto for gen_random_uuid
create extension if not exists "pgcrypto";

-- Agencies own the workspace data. The owner_id links back to auth.users.
create table if not exists public.agencies (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  name text not null,
  owner_id uuid references auth.users(id) on delete set null,
  timezone text,
  domain text
);

-- Each Supabase auth user who joins an agency is mirrored here for quick lookup.
create table if not exists public.agency_members (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  agency_id uuid not null references public.agencies(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  full_name text,
  email text,
  role text default 'member',
  timezone text,
  unique (agency_id, user_id)
);

create table if not exists public.leads (
  id bigint primary key generated always as identity,
  created_at timestamptz not null default now(),
  tenant_id text,
  source text,
  name text,
  email text,
  company text,
  message text
);

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

create table if not exists public.clients (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  agency_id uuid references public.agencies(id) on delete cascade,
  company_name text not null,
  primary_contact text,
  email text,
  phone text,
  status text default 'lead',
  services text[] default '{}',
  notes text,
  metadata jsonb default '{}'::jsonb
);

alter table public.clients
  add column if not exists agency_id uuid references public.agencies(id) on delete cascade,
  add column if not exists company_name text,
  add column if not exists primary_contact text,
  add column if not exists phone text,
  add column if not exists status text default 'lead',
  add column if not exists services text[] default '{}',
  add column if not exists notes text,
  add column if not exists metadata jsonb default '{}'::jsonb;

create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  agency_id uuid references public.agencies(id) on delete cascade,
  client_id uuid references public.clients(id) on delete set null,
  name text not null,
  status text default 'discovery',
  start_date date,
  due_date date,
  budget numeric(12,2),
  currency text,
  notes text,
  metadata jsonb default '{}'::jsonb,
  preview_url text,
  public_url text
);

alter table public.projects
  add column if not exists agency_id uuid references public.agencies(id) on delete cascade,
  add column if not exists name text,
  add column if not exists start_date date,
  add column if not exists due_date date,
  add column if not exists budget numeric(12,2),
  add column if not exists currency text,
  add column if not exists notes text,
  alter column status set default 'discovery',
  alter column metadata set default '{}'::jsonb;

create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  agency_id uuid references public.agencies(id) on delete cascade,
  project_id uuid references public.projects(id) on delete cascade,
  assignee_id uuid references auth.users(id) on delete set null,
  title text not null,
  description text,
  status text default 'todo',
  priority text default 'medium',
  due_date date
);

create table if not exists public.documents (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  agency_id uuid references public.agencies(id) on delete cascade,
  title text not null,
  document_type text default 'proposal',
  status text default 'draft',
  storage_path text not null,
  metadata jsonb default '{}'::jsonb
);

create table if not exists public.invoices (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  agency_id uuid references public.agencies(id) on delete cascade,
  client_id uuid references public.clients(id) on delete set null,
  project_id uuid references public.projects(id) on delete set null,
  invoice_number text not null,
  status text default 'draft',
  issue_date date,
  due_date date,
  currency text,
  amount numeric(12,2),
  line_items jsonb default '[]'::jsonb,
  notes text
);

create table if not exists public.activities (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  agency_id uuid references public.agencies(id) on delete cascade,
  action text not null,
  entity_type text,
  entity_id text,
  metadata jsonb default '{}'::jsonb
);

create table if not exists public.orders (
  id bigint primary key generated always as identity,
  created_at timestamptz not null default now(),
  order_number text unique not null,
  agency_id uuid references public.agencies(id) on delete set null,
  tenant_id text,
  stripe_session_id text unique,
  subscription_id text,
  customer_email text,
  customer_name text,
  company text,
  phone text,
  plan text,
  template_key text,
  amount_total bigint,
  currency text,
  mode text,
  status text,
  metadata jsonb default '{}'::jsonb
);

alter table public.orders
  add column if not exists agency_id uuid references public.agencies(id) on delete set null,
  add column if not exists tenant_id text;
alter table public.leads
  add column if not exists tenant_id text;
alter table public.webhooks
  add column if not exists tenant_id text;
alter table public.project_feedback
  add column if not exists tenant_id text;

create index if not exists orders_agency_id_idx on public.orders(agency_id);
create index if not exists agencies_owner_id_idx on public.agencies(owner_id);
create index if not exists agency_members_user_idx on public.agency_members(user_id);
create index if not exists clients_agency_id_idx on public.clients(agency_id);
create index if not exists projects_agency_id_idx on public.projects(agency_id);
create index if not exists tasks_agency_id_idx on public.tasks(agency_id);
create index if not exists documents_agency_id_idx on public.documents(agency_id);
create index if not exists invoices_agency_id_idx on public.invoices(agency_id);
create index if not exists activities_agency_id_idx on public.activities(agency_id);
create index if not exists websites_agency_id_idx on public.websites(agency_id);
create index if not exists websites_slug_agency_id_idx on public.websites(slug, agency_id);
create index if not exists website_domains_domain_idx on public.website_domains(domain);
create index if not exists website_domains_website_id_idx on public.website_domains(website_id);
create index if not exists support_requests_agency_id_idx on public.support_requests(agency_id);
create index if not exists subscription_events_agency_id_idx on public.subscription_events(agency_id);
create index if not exists leads_tenant_id_idx on public.leads(tenant_id);
create index if not exists bookings_tenant_id_idx on public.bookings(tenant_id);
create index if not exists bookings_start_time_idx on public.bookings(start_time);
create index if not exists booking_blocks_tenant_id_idx on public.booking_blocks(tenant_id);
create index if not exists booking_blocks_start_time_idx on public.booking_blocks(start_time);
create index if not exists orders_tenant_id_idx on public.orders(tenant_id);
create index if not exists webhooks_tenant_id_idx on public.webhooks(tenant_id);
create index if not exists project_feedback_tenant_id_idx on public.project_feedback(tenant_id);

alter table public.agencies enable row level security;
alter table public.agency_members enable row level security;
alter table public.clients enable row level security;
alter table public.projects enable row level security;
alter table public.tasks enable row level security;
alter table public.documents enable row level security;
alter table public.invoices enable row level security;
alter table public.activities enable row level security;
alter table public.orders enable row level security;
alter table public.bookings enable row level security;
alter table public.booking_blocks enable row level security;
alter table public.websites enable row level security;
alter table public.website_sections enable row level security;
alter table public.support_requests enable row level security;
alter table public.subscription_events enable row level security;
alter table public.leads enable row level security;
alter table public.webhooks enable row level security;
alter table public.project_feedback enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'agencies' and polname = 'Owners manage agencies'
  ) then
    create policy "Owners manage agencies" on public.agencies
      for all
      using (owner_id = auth.uid())
      with check (owner_id = auth.uid());
  end if;

  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'agency_members' and polname = 'Members manage agency membership'
  ) then
    create policy "Members manage agency membership" on public.agency_members
      for all
      using (
        exists (
          select 1 from public.agency_members am
          where am.agency_id = agency_members.agency_id
            and am.user_id = auth.uid()
        )
      )
      with check (
        exists (
          select 1 from public.agency_members am
          where am.agency_id = agency_members.agency_id
            and am.user_id = auth.uid()
        )
      );
  end if;

  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'clients' and polname = 'Agency members manage clients'
  ) then
    create policy "Agency members manage clients" on public.clients
      for all
      using (
        exists (
          select 1 from public.agency_members am
          where am.agency_id = clients.agency_id
            and am.user_id = auth.uid()
        )
      )
      with check (
        exists (
          select 1 from public.agency_members am
          where am.agency_id = clients.agency_id
            and am.user_id = auth.uid()
        )
      );
  end if;

  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'projects' and polname = 'Agency members manage projects'
  ) then
    create policy "Agency members manage projects" on public.projects
      for all
      using (
        exists (
          select 1 from public.agency_members am
          where am.agency_id = projects.agency_id
            and am.user_id = auth.uid()
        )
      )
      with check (
        exists (
          select 1 from public.agency_members am
          where am.agency_id = projects.agency_id
            and am.user_id = auth.uid()
        )
      );
  end if;

  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'tasks' and polname = 'Agency members manage tasks'
  ) then
    create policy "Agency members manage tasks" on public.tasks
      for all
      using (
        exists (
          select 1 from public.agency_members am
          where am.agency_id = tasks.agency_id
            and am.user_id = auth.uid()
        )
      )
      with check (
        exists (
          select 1 from public.agency_members am
          where am.agency_id = tasks.agency_id
            and am.user_id = auth.uid()
        )
      );
  end if;

  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'documents' and polname = 'Agency members manage documents'
  ) then
    create policy "Agency members manage documents" on public.documents
      for all
      using (
        exists (
          select 1 from public.agency_members am
          where am.agency_id = documents.agency_id
            and am.user_id = auth.uid()
        )
      )
      with check (
        exists (
          select 1 from public.agency_members am
          where am.agency_id = documents.agency_id
            and am.user_id = auth.uid()
        )
      );
  end if;

  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'invoices' and polname = 'Agency members manage invoices'
  ) then
    create policy "Agency members manage invoices" on public.invoices
      for all
      using (
        exists (
          select 1 from public.agency_members am
          where am.agency_id = invoices.agency_id
            and am.user_id = auth.uid()
        )
      )
      with check (
        exists (
          select 1 from public.agency_members am
          where am.agency_id = invoices.agency_id
            and am.user_id = auth.uid()
        )
      );
  end if;

  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'activities' and polname = 'Agency members manage activities'
  ) then
    create policy "Agency members manage activities" on public.activities
      for all
      using (
        exists (
          select 1 from public.agency_members am
          where am.agency_id = activities.agency_id
            and am.user_id = auth.uid()
        )
      )
      with check (
        exists (
          select 1 from public.agency_members am
          where am.agency_id = activities.agency_id
            and am.user_id = auth.uid()
        )
      );
  end if;

  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'orders' and polname = 'Agency members manage orders'
  ) then
    create policy "Agency members manage orders" on public.orders
      for all
      using (
        agency_id is null
        or exists (
          select 1 from public.agency_members am
          where am.agency_id = orders.agency_id
            and am.user_id = auth.uid()
        )
      )
      with check (
        agency_id is null
        or exists (
          select 1 from public.agency_members am
          where am.agency_id = orders.agency_id
            and am.user_id = auth.uid()
        )
      );
  end if;

  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'orders' and polname = 'Tenant isolated orders'
  ) then
    create policy "Tenant isolated orders" on public.orders
      for all
      using (
        tenant_id is null
        or tenant_id = coalesce(current_setting('request.jwt.claims', true)::json->>'tenant_id', tenant_id)
      )
      with check (
        tenant_id is null
        or tenant_id = coalesce(current_setting('request.jwt.claims', true)::json->>'tenant_id', tenant_id)
      );
  end if;

  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'websites' and polname = 'Agency members manage websites'
  ) then
    create policy "Agency members manage websites" on public.websites
      for all
      using (
        exists (
          select 1 from public.agency_members am
          where am.agency_id = websites.agency_id
            and am.user_id = auth.uid()
        )
      )
      with check (
        exists (
          select 1 from public.agency_members am
          where am.agency_id = websites.agency_id
            and am.user_id = auth.uid()
        )
      );
  end if;

  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'website_sections' and polname = 'Agency members manage website sections'
  ) then
    create policy "Agency members manage website sections" on public.website_sections
      for all
      using (
        exists (
          select 1 from public.websites w
          join public.agency_members am on am.agency_id = w.agency_id
          where w.id = website_sections.website_id
            and am.user_id = auth.uid()
        )
      )
      with check (
        exists (
          select 1 from public.websites w
          join public.agency_members am on am.agency_id = w.agency_id
          where w.id = website_sections.website_id
            and am.user_id = auth.uid()
        )
      );
  end if;

  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'support_requests' and polname = 'Agency members manage support requests'
  ) then
    create policy "Agency members manage support requests" on public.support_requests
      for all
      using (
        exists (
          select 1 from public.agency_members am
          where am.agency_id = support_requests.agency_id
            and am.user_id = auth.uid()
        )
      )
      with check (
        exists (
          select 1 from public.agency_members am
          where am.agency_id = support_requests.agency_id
            and am.user_id = auth.uid()
        )
      );
  end if;

  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'subscription_events' and polname = 'Agency members manage subscription events'
  ) then
    create policy "Agency members manage subscription events" on public.subscription_events
      for all
      using (
        exists (
          select 1 from public.agency_members am
          where am.agency_id = subscription_events.agency_id
            and am.user_id = auth.uid()
        )
      )
      with check (
        exists (
          select 1 from public.agency_members am
          where am.agency_id = subscription_events.agency_id
            and am.user_id = auth.uid()
        )
      );
  end if;

  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'leads' and polname = 'Tenant isolated leads'
  ) then
    create policy "Tenant isolated leads" on public.leads
      for all
      using (
        tenant_id is null
        or tenant_id = coalesce(current_setting('request.jwt.claims', true)::json->>'tenant_id', tenant_id)
      )
      with check (
        tenant_id is null
        or tenant_id = coalesce(current_setting('request.jwt.claims', true)::json->>'tenant_id', tenant_id)
      );
  end if;

  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'webhooks' and polname = 'Tenant isolated webhooks'
  ) then
    create policy "Tenant isolated webhooks" on public.webhooks
      for all
      using (
        tenant_id is null
        or tenant_id = coalesce(current_setting('request.jwt.claims', true)::json->>'tenant_id', tenant_id)
      )
      with check (
        tenant_id is null
        or tenant_id = coalesce(current_setting('request.jwt.claims', true)::json->>'tenant_id', tenant_id)
      );
  end if;

  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'project_feedback' and polname = 'Tenant isolated feedback'
  ) then
    create policy "Tenant isolated feedback" on public.project_feedback
      for all
      using (
        tenant_id is null
        or tenant_id = coalesce(current_setting('request.jwt.claims', true)::json->>'tenant_id', tenant_id)
      )
      with check (
        tenant_id is null
        or tenant_id = coalesce(current_setting('request.jwt.claims', true)::json->>'tenant_id', tenant_id)
      );
  end if;
end
$$;

create table if not exists public.webhooks (
  id bigint primary key generated always as identity,
  created_at timestamptz not null default now(),
  tenant_id text,
  provider text,
  type text,
  payload jsonb
);

create table if not exists public.project_feedback (
  id bigint primary key generated always as identity,
  created_at timestamptz not null default now(),
  tenant_id text,
  project_id text,
  order_id text,
  author_name text,
  author_email text,
  message text not null
);

create table if not exists public.websites (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  agency_id uuid references public.agencies(id) on delete cascade,
  client_id uuid references public.clients(id) on delete set null,
  slug text not null,
  name text not null,
  status text default 'draft',
  plan text,
  published_at timestamptz,
  domain text,
  preview_url text,
  production_url text,
  google_doc_id text,
  google_folder_id text,
  template_key text,
  metadata jsonb default '{}'::jsonb
);

create table if not exists public.website_domains (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  website_id uuid references public.websites(id) on delete cascade,
  domain text not null unique,
  is_primary boolean not null default false,
  verified_at timestamptz,
  metadata jsonb default '{}'::jsonb
);

create table if not exists public.website_sections (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  website_id uuid references public.websites(id) on delete cascade,
  section_key text not null,
  heading text,
  content text,
  media jsonb default '[]'::jsonb,
  google_doc_id text,
  google_doc_heading text
);

create table if not exists public.support_requests (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  agency_id uuid references public.agencies(id) on delete cascade,
  website_id uuid references public.websites(id) on delete set null,
  customer_email text,
  customer_name text,
  request_type text not null,
  description text,
  status text default 'open',
  priority text default 'normal',
  metadata jsonb default '{}'::jsonb
);

create table if not exists public.subscription_events (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  agency_id uuid references public.agencies(id) on delete cascade,
  subscription_id text not null,
  customer_email text,
  event_type text not null,
  payload jsonb default '{}'::jsonb
);
