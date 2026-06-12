alter table public.profiles
  add column if not exists avatar_url text;

alter table public.profiles
  add column if not exists theme_preference text not null default 'system';

alter table public.profiles
  drop constraint if exists profiles_theme_preference_check;

alter table public.profiles
  add constraint profiles_theme_preference_check
  check (theme_preference in ('system', 'light', 'dark'));

drop policy if exists "family owners can delete family" on public.families;
create policy "family owners can delete family"
on public.families
for delete
using (auth.uid() = owner_id);

drop policy if exists "users can leave own membership" on public.family_members;
create policy "users can leave own membership"
on public.family_members
for delete
using (auth.uid() = profile_id);

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
