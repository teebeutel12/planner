alter table public.shopping_items
  add column if not exists list_name text not null default 'Allgemein';

update public.shopping_items
set list_name = 'Allgemein'
where coalesce(btrim(list_name), '') = '';
