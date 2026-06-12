create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  display_name text not null,
  color text not null default '#3b82f6',
  avatar_url text,
  theme_preference text not null default 'system' check (theme_preference in ('system', 'light', 'dark')),
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.families (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  invite_code text not null unique,
  owner_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.family_members (
  family_id uuid not null references public.families (id) on delete cascade,
  profile_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default timezone('utc', now()),
  primary key (family_id, profile_id)
);

create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families (id) on delete cascade,
  title text not null,
  description text,
  starts_at timestamptz not null,
  ends_at timestamptz,
  created_by uuid not null references public.profiles (id) on delete cascade,
  participant_ids uuid[] not null default '{}',
  reminder_minutes integer check (reminder_minutes is null or reminder_minutes in (5, 10, 30, 60, 1440)),
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.shopping_items (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families (id) on delete cascade,
  title text not null,
  notes text,
  added_by uuid not null references public.profiles (id) on delete cascade,
  assigned_to uuid references public.profiles (id) on delete set null,
  is_done boolean not null default false,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.wishes (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families (id) on delete cascade,
  person_id uuid not null references public.profiles (id) on delete cascade,
  title text not null,
  description text,
  link text,
  created_by uuid not null references public.profiles (id) on delete cascade,
  is_fulfilled boolean not null default false,
  created_at timestamptz not null default timezone('utc', now())
);

alter table public.profiles enable row level security;
alter table public.families enable row level security;
alter table public.family_members enable row level security;
alter table public.events enable row level security;
alter table public.shopping_items enable row level security;
alter table public.wishes enable row level security;

create policy "profiles are viewable by authenticated users"
on public.profiles
for select
using (auth.role() = 'authenticated');

create policy "users can insert own profile"
on public.profiles
for insert
with check (auth.uid() = id);

create policy "users can update own profile"
on public.profiles
for update
using (auth.uid() = id)
with check (auth.uid() = id);

create policy "authenticated users can read families"
on public.families
for select
using (auth.role() = 'authenticated');

create policy "users can create own family"
on public.families
for insert
with check (auth.uid() = owner_id);

create policy "family owners can update family"
on public.families
for update
using (
  exists (
    select 1 from public.families existing_family
    where existing_family.id = families.id and existing_family.owner_id = auth.uid()
  )
)
with check (
  exists (
    select 1 from public.family_members fm
    where fm.family_id = families.id and fm.profile_id = owner_id
  )
);

create policy "family owners can delete family"
on public.families
for delete
using (auth.uid() = owner_id);

create policy "authenticated users can read memberships"
on public.family_members
for select
using (auth.role() = 'authenticated');

create policy "users can join as themselves"
on public.family_members
for insert
with check (auth.uid() = profile_id);

create policy "users can leave own membership"
on public.family_members
for delete
using (auth.uid() = profile_id);

create policy "family owners can remove members"
on public.family_members
for delete
using (
  exists (
    select 1 from public.families f
    where f.id = family_members.family_id and f.owner_id = auth.uid()
  )
);

create policy "family members can read events"
on public.events
for select
using (
  exists (
    select 1 from public.family_members fm
    where fm.family_id = events.family_id and fm.profile_id = auth.uid()
  )
);

create policy "family members can create events"
on public.events
for insert
with check (
  auth.uid() = created_by
  and exists (
    select 1 from public.family_members fm
    where fm.family_id = events.family_id and fm.profile_id = auth.uid()
  )
);

create policy "family members can update events"
on public.events
for update
using (
  exists (
    select 1 from public.family_members fm
    where fm.family_id = events.family_id and fm.profile_id = auth.uid()
  )
)
with check (
  exists (
    select 1 from public.family_members fm
    where fm.family_id = events.family_id and fm.profile_id = auth.uid()
  )
);

create policy "family members can delete events"
on public.events
for delete
using (
  exists (
    select 1 from public.family_members fm
    where fm.family_id = events.family_id and fm.profile_id = auth.uid()
  )
);

create policy "family members can read shopping items"
on public.shopping_items
for select
using (
  exists (
    select 1 from public.family_members fm
    where fm.family_id = shopping_items.family_id and fm.profile_id = auth.uid()
  )
);

create policy "family members can create shopping items"
on public.shopping_items
for insert
with check (
  auth.uid() = added_by
  and exists (
    select 1 from public.family_members fm
    where fm.family_id = shopping_items.family_id and fm.profile_id = auth.uid()
  )
);

create policy "family members can update shopping items"
on public.shopping_items
for update
using (
  exists (
    select 1 from public.family_members fm
    where fm.family_id = shopping_items.family_id and fm.profile_id = auth.uid()
  )
)
with check (
  exists (
    select 1 from public.family_members fm
    where fm.family_id = shopping_items.family_id and fm.profile_id = auth.uid()
  )
);

create policy "family members can delete shopping items"
on public.shopping_items
for delete
using (
  exists (
    select 1 from public.family_members fm
    where fm.family_id = shopping_items.family_id and fm.profile_id = auth.uid()
  )
);

create policy "family members can read wishes"
on public.wishes
for select
using (
  exists (
    select 1 from public.family_members fm
    where fm.family_id = wishes.family_id and fm.profile_id = auth.uid()
  )
);

create policy "family members can create wishes"
on public.wishes
for insert
with check (
  auth.uid() = created_by
  and exists (
    select 1 from public.family_members fm
    where fm.family_id = wishes.family_id and fm.profile_id = auth.uid()
  )
);

create policy "family members can update wishes"
on public.wishes
for update
using (
  exists (
    select 1 from public.family_members fm
    where fm.family_id = wishes.family_id and fm.profile_id = auth.uid()
  )
)
with check (
  exists (
    select 1 from public.family_members fm
    where fm.family_id = wishes.family_id and fm.profile_id = auth.uid()
  )
);

create policy "family members can delete wishes"
on public.wishes
for delete
using (
  exists (
    select 1 from public.family_members fm
    where fm.family_id = wishes.family_id and fm.profile_id = auth.uid()
  )
);

create or replace function public.delete_current_user()
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  delete from auth.users where id = auth.uid();
end;
$$;

revoke all on function public.delete_current_user() from public;
grant execute on function public.delete_current_user() to authenticated;
