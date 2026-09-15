-- For Hollie: image uploads + monitoring support
alter table public.fh_wardrobe_items add column if not exists product_url text;
alter table public.fh_wardrobe_items add column if not exists image_gallery jsonb not null default '[]'::jsonb;

-- Public bucket for product/wardrobe images. Only authenticated users may upload into their own folder.
insert into storage.buckets (id,name,public,file_size_limit,allowed_mime_types)
values ('wardrobe-images','wardrobe-images',true,8388608,array['image/jpeg','image/png','image/webp','image/heic','image/heif'])
on conflict (id) do update set public=true,file_size_limit=8388608;

drop policy if exists "fh wardrobe image insert" on storage.objects;
create policy "fh wardrobe image insert" on storage.objects for insert to authenticated
with check (bucket_id='wardrobe-images' and (storage.foldername(name))[1]=auth.uid()::text);

drop policy if exists "fh wardrobe image update" on storage.objects;
create policy "fh wardrobe image update" on storage.objects for update to authenticated
using (bucket_id='wardrobe-images' and (storage.foldername(name))[1]=auth.uid()::text)
with check (bucket_id='wardrobe-images' and (storage.foldername(name))[1]=auth.uid()::text);

drop policy if exists "fh wardrobe image delete" on storage.objects;
create policy "fh wardrobe image delete" on storage.objects for delete to authenticated
using (bucket_id='wardrobe-images' and (storage.foldername(name))[1]=auth.uid()::text);

-- Helpful indexes for scheduled scans.
create index if not exists fh_products_retailer_last_seen on public.fh_products(retailer_id,last_seen_at);
create index if not exists fh_deals_product_variant on public.fh_deals(product_id,variant_id,last_verified_at desc);
