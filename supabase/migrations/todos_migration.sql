create table if not exists public.todos (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families (id) on delete cascade,
  title text not null,
  description text,
  assigned_to uuid references public.profiles (id) on delete set null,
  due_date date,
  priority text not null default 'medium' check (priority in ('low', 'medium', 'high')),
  is_done boolean not null default false,
  created_by uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default timezone('utc', now())
);

alter table public.todos enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'todos' and policyname = 'family members can read todos'
  ) then
    create policy "family members can read todos"
    on public.todos
    for select
    using (
      exists (
        select 1 from public.family_members fm
        where fm.family_id = todos.family_id and fm.profile_id = auth.uid()
      )
    );
  end if;

  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'todos' and policyname = 'family members can create todos'
  ) then
    create policy "family members can create todos"
    on public.todos
    for insert
    with check (
      auth.uid() = created_by
      and exists (
        select 1 from public.family_members fm
        where fm.family_id = todos.family_id and fm.profile_id = auth.uid()
      )
    );
  end if;

  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'todos' and policyname = 'family members can update todos'
  ) then
    create policy "family members can update todos"
    on public.todos
    for update
    using (
      exists (
        select 1 from public.family_members fm
        where fm.family_id = todos.family_id and fm.profile_id = auth.uid()
      )
    )
    with check (
      exists (
        select 1 from public.family_members fm
        where fm.family_id = todos.family_id and fm.profile_id = auth.uid()
      )
    );
  end if;

  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'todos' and policyname = 'family members can delete todos'
  ) then
    create policy "family members can delete todos"
    on public.todos
    for delete
    using (
      exists (
        select 1 from public.family_members fm
        where fm.family_id = todos.family_id and fm.profile_id = auth.uid()
      )
    );
  end if;
end $$;
