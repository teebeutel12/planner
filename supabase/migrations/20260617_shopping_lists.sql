create table if not exists public.shopping_lists (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families (id) on delete cascade,
  name text not null,
  created_by uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default timezone('utc', now()),
  constraint shopping_lists_family_id_name_key unique (family_id, name)
);

alter table public.shopping_lists enable row level security;

alter table public.shopping_items
  add column if not exists list_name text not null default 'Allgemein';

update public.shopping_items
set list_name = 'Allgemein'
where coalesce(btrim(list_name), '') = '';

insert into public.shopping_lists (family_id, name, created_by)
select distinct shopping_items.family_id, shopping_items.list_name, shopping_items.added_by
from public.shopping_items
where coalesce(btrim(shopping_items.list_name), '') <> ''
on conflict (family_id, name) do nothing;

drop policy if exists "family members can read shopping lists" on public.shopping_lists;
create policy "family members can read shopping lists"
on public.shopping_lists
for select
using (
  exists (
    select 1 from public.family_members fm
    where fm.family_id = shopping_lists.family_id and fm.profile_id = auth.uid()
  )
);

drop policy if exists "family members can create shopping lists" on public.shopping_lists;
create policy "family members can create shopping lists"
on public.shopping_lists
for insert
with check (
  created_by = auth.uid()
  and exists (
    select 1 from public.family_members fm
    where fm.family_id = shopping_lists.family_id and fm.profile_id = auth.uid()
  )
);

drop policy if exists "family members can update shopping lists" on public.shopping_lists;
create policy "family members can update shopping lists"
on public.shopping_lists
for update
using (
  exists (
    select 1 from public.family_members fm
    where fm.family_id = shopping_lists.family_id and fm.profile_id = auth.uid()
  )
)
with check (
  exists (
    select 1 from public.family_members fm
    where fm.family_id = shopping_lists.family_id and fm.profile_id = auth.uid()
  )
);

drop policy if exists "family members can delete shopping lists" on public.shopping_lists;
create policy "family members can delete shopping lists"
on public.shopping_lists
for delete
using (
  exists (
    select 1 from public.family_members fm
    where fm.family_id = shopping_lists.family_id and fm.profile_id = auth.uid()
  )
);
