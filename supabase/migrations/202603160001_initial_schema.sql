create extension if not exists pgcrypto;

create type public.app_role as enum ('admin', 'manager', 'operator');
create type public.catalog_job_status as enum (
  'draft',
  'uploaded',
  'parsing',
  'matching',
  'needs_review',
  'ready_to_generate',
  'generating_pdf',
  'pdf_ready',
  'converting_flipbook',
  'completed',
  'failed',
  'cancelled'
);
create type public.catalog_item_status as enum (
  'pending',
  'matched',
  'needs_review',
  'approved',
  'rejected',
  'rendered'
);
create type public.asset_source as enum ('makro', 'manual_upload', 'manual_mapping', 'cached');
create type public.flipbook_mode as enum ('manual', 'client_id', 'disabled');
create type public.generated_file_type as enum (
  'raw_upload',
  'generated_pdf',
  'manual_asset',
  'preview_snapshot',
  'flipbook_pdf'
);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and role = 'admin'
  );
$$;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  role public.app_role not null default 'operator',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table public.catalog_templates (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  page_size text not null default 'A4',
  columns integer not null default 3 check (columns > 0 and columns <= 6),
  rows integer not null default 3 check (rows > 0 and rows <= 6),
  variant text not null default 'promo',
  show_normal_price boolean not null default true,
  show_promo_price boolean not null default true,
  show_discount_amount boolean not null default true,
  show_discount_percent boolean not null default false,
  show_sku boolean not null default true,
  show_pack_size boolean not null default true,
  theme_json jsonb not null default '{}'::jsonb,
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table public.catalog_jobs (
  id uuid primary key default gen_random_uuid(),
  created_by uuid not null references auth.users(id) on delete cascade,
  template_id uuid references public.catalog_templates(id) on delete set null,
  job_name text not null,
  source_file_bucket text,
  source_file_path text,
  source_file_name text,
  status public.catalog_job_status not null default 'draft',
  parsed_row_count integer not null default 0 check (parsed_row_count >= 0),
  matched_row_count integer not null default 0 check (matched_row_count >= 0),
  review_required_count integer not null default 0 check (review_required_count >= 0),
  page_count integer not null default 0 check (page_count >= 0),
  flipbook_mode public.flipbook_mode not null default 'manual',
  column_mapping_json jsonb not null default '{}'::jsonb,
  style_options_json jsonb not null default '{}'::jsonb,
  error_message text,
  started_at timestamptz,
  finished_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table public.product_assets (
  id uuid primary key default gen_random_uuid(),
  source public.asset_source not null,
  source_product_id text,
  sku text,
  normalized_sku text,
  product_name text not null,
  normalized_name text,
  product_url text,
  image_url text,
  storage_bucket text,
  storage_path text,
  fetched_at timestamptz,
  metadata_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table public.catalog_items (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.catalog_jobs(id) on delete cascade,
  row_no integer not null check (row_no > 0),
  sku text,
  product_name text not null,
  pack_size text,
  unit text,
  normal_price numeric(12,2),
  promo_price numeric(12,2),
  discount_amount numeric(12,2),
  discount_percent numeric(5,2),
  normalized_sku text,
  normalized_name text,
  display_name_override text,
  display_order integer not null default 0,
  render_variant text default 'promo',
  is_visible boolean not null default true,
  match_status public.catalog_item_status not null default 'pending',
  selected_asset_id uuid references public.product_assets(id) on delete set null,
  confidence numeric(5,4),
  review_note text,
  metadata_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (job_id, row_no)
);

create table public.product_match_candidates (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references public.catalog_items(id) on delete cascade,
  asset_id uuid not null references public.product_assets(id) on delete cascade,
  rank_no integer not null check (rank_no > 0),
  confidence numeric(5,4) not null check (confidence >= 0 and confidence <= 1),
  match_reason text,
  created_at timestamptz not null default timezone('utc', now()),
  unique (item_id, asset_id),
  unique (item_id, rank_no)
);

create table public.manual_mappings (
  id uuid primary key default gen_random_uuid(),
  sku text not null,
  normalized_sku text not null unique,
  preferred_asset_id uuid not null references public.product_assets(id) on delete cascade,
  locked_image boolean not null default true,
  locked_name boolean not null default false,
  created_by uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table public.generated_files (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.catalog_jobs(id) on delete cascade,
  file_type public.generated_file_type not null,
  storage_bucket text not null,
  storage_path text not null,
  public_url text,
  file_size_bytes bigint,
  checksum text,
  created_at timestamptz not null default timezone('utc', now())
);

create table public.flipbooks (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.catalog_jobs(id) on delete cascade,
  provider text not null default 'heyzine',
  mode public.flipbook_mode not null default 'manual',
  pdf_file_id uuid references public.generated_files(id) on delete set null,
  flipbook_url text,
  thumbnail_url text,
  provider_state text,
  provider_response_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (job_id, provider)
);

create table public.catalog_job_events (
  id bigint generated always as identity primary key,
  job_id uuid not null references public.catalog_jobs(id) on delete cascade,
  level text not null default 'info',
  step text not null,
  message text not null,
  metadata_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

create index idx_profiles_role on public.profiles(role);
create index idx_catalog_templates_variant_active on public.catalog_templates(variant, is_active);
create index idx_catalog_jobs_created_by on public.catalog_jobs(created_by);
create index idx_catalog_jobs_status on public.catalog_jobs(status);
create index idx_catalog_jobs_template_id on public.catalog_jobs(template_id);
create index idx_catalog_items_job_id on public.catalog_items(job_id);
create index idx_catalog_items_match_status on public.catalog_items(match_status);
create index idx_catalog_items_display_order on public.catalog_items(job_id, display_order);
create index idx_catalog_items_normalized_sku on public.catalog_items(normalized_sku);
create index idx_catalog_items_normalized_name on public.catalog_items(normalized_name);
create index idx_product_assets_source_sku on public.product_assets(source, normalized_sku);
create index idx_product_assets_normalized_name on public.product_assets(normalized_name);
create index idx_product_match_candidates_item_rank on public.product_match_candidates(item_id, rank_no);
create index idx_manual_mappings_created_by on public.manual_mappings(created_by);
create index idx_generated_files_job_type on public.generated_files(job_id, file_type);
create index idx_flipbooks_job_id on public.flipbooks(job_id);
create index idx_catalog_job_events_job_id_created_at on public.catalog_job_events(job_id, created_at desc);

create trigger set_profiles_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

create trigger set_catalog_templates_updated_at
before update on public.catalog_templates
for each row execute function public.set_updated_at();

create trigger set_catalog_jobs_updated_at
before update on public.catalog_jobs
for each row execute function public.set_updated_at();

create trigger set_catalog_items_updated_at
before update on public.catalog_items
for each row execute function public.set_updated_at();

create trigger set_product_assets_updated_at
before update on public.product_assets
for each row execute function public.set_updated_at();

create trigger set_manual_mappings_updated_at
before update on public.manual_mappings
for each row execute function public.set_updated_at();

create trigger set_flipbooks_updated_at
before update on public.flipbooks
for each row execute function public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'full_name', new.email))
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();

alter table public.profiles enable row level security;
alter table public.catalog_templates enable row level security;
alter table public.catalog_jobs enable row level security;
alter table public.catalog_items enable row level security;
alter table public.product_assets enable row level security;
alter table public.product_match_candidates enable row level security;
alter table public.manual_mappings enable row level security;
alter table public.generated_files enable row level security;
alter table public.flipbooks enable row level security;
alter table public.catalog_job_events enable row level security;

create policy "profiles_select_own_or_admin"
on public.profiles
for select
using (id = auth.uid() or public.is_admin());

create policy "profiles_update_own_or_admin"
on public.profiles
for update
using (id = auth.uid() or public.is_admin())
with check (id = auth.uid() or public.is_admin());

create policy "catalog_templates_read_authenticated"
on public.catalog_templates
for select
using (auth.role() = 'authenticated');

create policy "catalog_templates_admin_manage"
on public.catalog_templates
for all
using (public.is_admin())
with check (public.is_admin());

create policy "catalog_jobs_own_or_admin"
on public.catalog_jobs
for all
using (created_by = auth.uid() or public.is_admin())
with check (created_by = auth.uid() or public.is_admin());

create policy "catalog_items_own_or_admin"
on public.catalog_items
for all
using (
  exists (
    select 1
    from public.catalog_jobs jobs
    where jobs.id = catalog_items.job_id
      and (jobs.created_by = auth.uid() or public.is_admin())
  )
)
with check (
  exists (
    select 1
    from public.catalog_jobs jobs
    where jobs.id = catalog_items.job_id
      and (jobs.created_by = auth.uid() or public.is_admin())
  )
);

create policy "product_assets_read_authenticated"
on public.product_assets
for select
using (auth.role() = 'authenticated');

create policy "product_assets_admin_manage"
on public.product_assets
for all
using (public.is_admin())
with check (public.is_admin());

create policy "product_match_candidates_own_or_admin"
on public.product_match_candidates
for all
using (
  exists (
    select 1
    from public.catalog_items items
    join public.catalog_jobs jobs on jobs.id = items.job_id
    where items.id = product_match_candidates.item_id
      and (jobs.created_by = auth.uid() or public.is_admin())
  )
)
with check (
  exists (
    select 1
    from public.catalog_items items
    join public.catalog_jobs jobs on jobs.id = items.job_id
    where items.id = product_match_candidates.item_id
      and (jobs.created_by = auth.uid() or public.is_admin())
  )
);

create policy "manual_mappings_own_or_admin"
on public.manual_mappings
for all
using (created_by = auth.uid() or public.is_admin())
with check (created_by = auth.uid() or public.is_admin());

create policy "generated_files_own_or_admin"
on public.generated_files
for all
using (
  exists (
    select 1
    from public.catalog_jobs jobs
    where jobs.id = generated_files.job_id
      and (jobs.created_by = auth.uid() or public.is_admin())
  )
)
with check (
  exists (
    select 1
    from public.catalog_jobs jobs
    where jobs.id = generated_files.job_id
      and (jobs.created_by = auth.uid() or public.is_admin())
  )
);

create policy "flipbooks_own_or_admin"
on public.flipbooks
for all
using (
  exists (
    select 1
    from public.catalog_jobs jobs
    where jobs.id = flipbooks.job_id
      and (jobs.created_by = auth.uid() or public.is_admin())
  )
)
with check (
  exists (
    select 1
    from public.catalog_jobs jobs
    where jobs.id = flipbooks.job_id
      and (jobs.created_by = auth.uid() or public.is_admin())
  )
);

create policy "catalog_job_events_own_or_admin"
on public.catalog_job_events
for all
using (
  exists (
    select 1
    from public.catalog_jobs jobs
    where jobs.id = catalog_job_events.job_id
      and (jobs.created_by = auth.uid() or public.is_admin())
  )
)
with check (
  exists (
    select 1
    from public.catalog_jobs jobs
    where jobs.id = catalog_job_events.job_id
      and (jobs.created_by = auth.uid() or public.is_admin())
  )
);

insert into public.catalog_templates (
  name,
  page_size,
  columns,
  rows,
  variant,
  show_normal_price,
  show_promo_price,
  show_discount_amount,
  show_discount_percent,
  show_sku,
  show_pack_size,
  theme_json
)
values
  (
    'Promo Flyer',
    'A4',
    3,
    3,
    'promo',
    true,
    true,
    true,
    false,
    true,
    true,
    jsonb_build_object(
      'background', '#fff6ef',
      'surface', '#ffffff',
      'accent', '#eb4529',
      'accentStrong', '#bf250e',
      'highlight', '#ffd55e',
      'text', '#241b15'
    )
  ),
  (
    'Clean Grid',
    'A4',
    3,
    3,
    'clean',
    true,
    true,
    false,
    false,
    true,
    true,
    jsonb_build_object(
      'background', '#ffffff',
      'surface', '#ffffff',
      'accent', '#20344f',
      'accentStrong', '#132237',
      'highlight', '#dde7f5',
      'text', '#1d2430'
    )
  )
on conflict (name) do nothing;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('raw-uploads', 'raw-uploads', false, 10485760, array['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet']),
  ('asset-cache', 'asset-cache', false, 10485760, array['image/jpeg', 'image/png', 'image/webp']),
  ('generated-pdfs', 'generated-pdfs', false, 52428800, array['application/pdf']),
  ('manual-assets', 'manual-assets', false, 10485760, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

create policy "raw_uploads_owner_read"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'raw-uploads'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "raw_uploads_owner_write"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'raw-uploads'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "raw_uploads_owner_update"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'raw-uploads'
  and (storage.foldername(name))[1] = auth.uid()::text
)
with check (
  bucket_id = 'raw-uploads'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "manual_assets_owner_read"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'manual-assets'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "manual_assets_owner_write"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'manual-assets'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "manual_assets_owner_update"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'manual-assets'
  and (storage.foldername(name))[1] = auth.uid()::text
)
with check (
  bucket_id = 'manual-assets'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "generated_pdfs_owner_read"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'generated-pdfs'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "generated_pdfs_owner_write"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'generated-pdfs'
  and (storage.foldername(name))[1] = auth.uid()::text
);
