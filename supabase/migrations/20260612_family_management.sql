drop policy if exists "family owners can update family" on public.families;
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

drop policy if exists "family owners can remove members" on public.family_members;
create policy "family owners can remove members"
on public.family_members
for delete
using (
  exists (
    select 1 from public.families f
    where f.id = family_members.family_id and f.owner_id = auth.uid()
  )
);
