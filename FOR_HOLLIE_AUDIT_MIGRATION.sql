-- FOR HOLLIE — audited app migration
-- Safe to run more than once.

alter table public.fh_wardrobe_items add column if not exists product_url text;

create table if not exists public.fh_retailer_preferences (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  profile_id uuid not null references public.fh_profiles(id) on delete cascade,
  retailer_id uuid not null references public.fh_retailers(id) on delete cascade,
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  unique(profile_id, retailer_id)
);
alter table public.fh_retailer_preferences enable row level security;
drop policy if exists fh_retailer_preferences_owner_all on public.fh_retailer_preferences;
create policy fh_retailer_preferences_owner_all on public.fh_retailer_preferences for all to authenticated using(owner_user_id=auth.uid()) with check(owner_user_id=auth.uid());

create table if not exists public.fh_app_settings (
  owner_user_id uuid primary key references auth.users(id) on delete cascade,
  profile_id uuid not null references public.fh_profiles(id) on delete cascade,
  notifications jsonb not null default '{"immediate":true,"digest":true,"push":true,"email":true}'::jsonb,
  style_preferences jsonb not null default '{"modest":true,"youthful":true,"avoid_boxy":true,"avoid_bright":false}'::jsonb,
  ui_preferences jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);
alter table public.fh_app_settings enable row level security;
drop policy if exists fh_app_settings_owner_all on public.fh_app_settings;
create policy fh_app_settings_owner_all on public.fh_app_settings for all to authenticated using(owner_user_id=auth.uid()) with check(owner_user_id=auth.uid());

-- Seed retailer preferences for the existing For Hollie profile.
insert into public.fh_retailer_preferences(owner_user_id,profile_id,retailer_id,enabled)
select p.owner_user_id,p.id,r.id,true from public.fh_profiles p cross join public.fh_retailers r
on conflict(profile_id,retailer_id) do nothing;

-- Seed app settings for existing profile(s).
insert into public.fh_app_settings(owner_user_id,profile_id)
select owner_user_id,id from public.fh_profiles
on conflict(owner_user_id) do nothing;

-- Seed wardrobe targets only when the exact category/subcategory target is absent.
with targets(category,subcategory,target_min,target_max,priority) as (values
 ('Tops','T-Shirts',10,14,'high_priority'),
 ('Tops','Polished / Church Tops',6,8,'high_priority'),
 ('Bottoms','Jeans',5,7,'high_priority'),
 ('Bottoms','Black / Neutral Pants',1,2,'high_priority'),
 ('Bottoms','Ponte / Knit Pants',2,3,'high_priority'),
 ('Dresses','Church / Versatile Dresses',1,3,'needed'),
 ('Dresses','Date-Night Dresses',1,2,'needed'),
 ('Layers','Cardigans',1,2,'high_priority'),
 ('Layers','Lightweight Coats',1,2,'high_priority'),
 ('Intimates','Everyday Bras',5,7,'high_priority'),
 ('Intimates','Sports Bras',1,2,'needed'),
 ('Intimates','Lift & Shape Bras',1,2,'needed'),
 ('Lounge','Pajama Sets',5,7,'high_priority'),
 ('Active','Workout Tees',3,5,'needed'),
 ('Active','Yoga / Athleisure Pants',3,3,'high_priority'),
 ('Shoes','Everyday Sneakers',2,3,'high_priority'),
 ('Shoes','Flats',2,3,'high_priority'),
 ('Accessories','Crossbody Bags',1,1,'high_priority')
)
insert into public.fh_wardrobe_targets(owner_user_id,profile_id,category,subcategory,target_min,target_max,priority)
select p.owner_user_id,p.id,t.category,t.subcategory,t.target_min,t.target_max,t.priority
from public.fh_profiles p cross join targets t
where not exists(select 1 from public.fh_wardrobe_targets x where x.profile_id=p.id and x.category=t.category and coalesce(x.subcategory,'')=coalesce(t.subcategory,''));
