alter table public.orders
  add column if not exists agency_id uuid references public.agencies(id) on delete set null;

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
create index if not exists support_requests_agency_id_idx on public.support_requests(agency_id);
create index if not exists subscription_events_agency_id_idx on public.subscription_events(agency_id);

alter table public.agencies enable row level security;
alter table public.agency_members enable row level security;
alter table public.clients enable row level security;
alter table public.projects enable row level security;
alter table public.tasks enable row level security;
alter table public.documents enable row level security;
alter table public.invoices enable row level security;
alter table public.activities enable row level security;
alter table public.orders enable row level security;
alter table public.websites enable row level security;
alter table public.website_sections enable row level security;
alter table public.support_requests enable row level security;
alter table public.subscription_events enable row level security;

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
end
$$;
