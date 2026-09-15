-- For Hollie V8.0 reconstruction migration
create table if not exists public.fh_deal_feedback (
 id uuid primary key default gen_random_uuid(), owner_user_id uuid not null references auth.users(id) on delete cascade,
 profile_id uuid references public.fh_profiles(id) on delete cascade, product_id uuid not null references public.fh_products(id) on delete cascade,
 variant_id uuid references public.fh_product_variants(id) on delete cascade, deal_id uuid references public.fh_deals(id) on delete set null,
 reason text not null, note text, suppress boolean not null default true, created_at timestamptz not null default now(), updated_at timestamptz not null default now());
create unique index if not exists fh_deal_feedback_owner_product_variant_uq on public.fh_deal_feedback(owner_user_id,product_id,coalesce(variant_id,'00000000-0000-0000-0000-000000000000'::uuid));
alter table public.fh_deal_feedback enable row level security;
drop policy if exists fh_deal_feedback_owner_all on public.fh_deal_feedback;
create policy fh_deal_feedback_owner_all on public.fh_deal_feedback for all to authenticated using(owner_user_id=auth.uid()) with check(owner_user_id=auth.uid());

create table if not exists public.fh_deal_quarantine (
 id bigint generated always as identity primary key, product_id uuid references public.fh_products(id) on delete cascade,
 variant_id uuid references public.fh_product_variants(id) on delete cascade, deal_id uuid references public.fh_deals(id) on delete set null,
 retailer_id uuid references public.fh_retailers(id) on delete cascade, reason text not null, details jsonb not null default '{}'::jsonb,
 active boolean not null default true, created_at timestamptz not null default now(), resolved_at timestamptz);
alter table public.fh_deal_quarantine enable row level security;
drop policy if exists fh_deal_quarantine_auth_read on public.fh_deal_quarantine;
create policy fh_deal_quarantine_auth_read on public.fh_deal_quarantine for select to authenticated using(true);

create table if not exists public.fh_system_meta (key text primary key, value text not null, updated_at timestamptz not null default now());
insert into public.fh_system_meta(key,value) values ('schema_version','8'),('deal_engine','V8 Accurate Broad Feed'),('scanner_version','8.0') on conflict(key) do update set value=excluded.value,updated_at=now();
alter table public.fh_system_meta enable row level security;
drop policy if exists fh_system_meta_auth_read on public.fh_system_meta;
create policy fh_system_meta_auth_read on public.fh_system_meta for select to authenticated using(true);

-- Invalidate obviously impossible historical markdowns before V8 renders them.
update public.fh_deals d set qualifies_for_feed=false
from public.fh_products p where d.product_id=p.id and (
 d.sale_price is null or d.sale_price<=0 or d.regular_price is null or d.regular_price<=d.sale_price or
 d.regular_price > case p.primary_category when 'Tops' then 250 when 'Layers' then 600 when 'Bottoms' then 350 when 'Dresses' then 400 when 'Intimates' then 200 when 'Lounge' then 250 when 'Shoes' then 300 when 'Active' then 300 when 'Swim' then 300 when 'Accessories' then 500 else 500 end or
 d.regular_price/nullif(d.sale_price,0) > case p.primary_category when 'Layers' then 7 when 'Dresses' then 7 when 'Accessories' then 8 else 6 end
);
