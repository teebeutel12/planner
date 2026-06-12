alter table public.events
  add column if not exists reminder_minutes integer;

alter table public.events
  drop constraint if exists events_reminder_minutes_check;

alter table public.events
  add constraint events_reminder_minutes_check
  check (reminder_minutes is null or reminder_minutes in (5, 10, 30, 60, 1440));

drop policy if exists "family members can delete events" on public.events;
create policy "family members can delete events"
on public.events
for delete
using (
  exists (
    select 1 from public.family_members fm
    where fm.family_id = events.family_id and fm.profile_id = auth.uid()
  )
);

drop policy if exists "family members can delete shopping items" on public.shopping_items;
create policy "family members can delete shopping items"
on public.shopping_items
for delete
using (
  exists (
    select 1 from public.family_members fm
    where fm.family_id = shopping_items.family_id and fm.profile_id = auth.uid()
  )
);

drop policy if exists "family members can delete wishes" on public.wishes;
create policy "family members can delete wishes"
on public.wishes
for delete
using (
  exists (
    select 1 from public.family_members fm
    where fm.family_id = wishes.family_id and fm.profile_id = auth.uid()
  )
);
