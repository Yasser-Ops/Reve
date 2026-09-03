create type tier as enum ('basic', 'managed', 'custom');
create type order_status as enum (
  'pending_payment', 'paid', 'in_design', 'review', 'delivered', 'cancelled'
);
create type invitation_status as enum ('draft', 'published', 'archived');
create type template_status as enum ('draft', 'published');

create table templates (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  description text not null default '',
  tier_floor tier not null default 'basic',
  preview_images text[] not null default '{}',
  is_new boolean not null default false,
  is_bestseller boolean not null default false,
  sort_order integer not null default 0,
  status template_status not null default 'draft',
  created_at timestamptz not null default now()
);

create table orders (
  id uuid primary key default gen_random_uuid(),
  reference text not null unique,
  customer_name text not null,
  customer_phone text not null,
  customer_email text,
  event_date date,
  template_slug text not null references templates(slug),
  tier tier not null,
  status order_status not null default 'pending_payment',
  amount numeric(10,2) not null,
  payment_proof_url text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table invitations (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders(id) on delete restrict,
  slug text not null unique,
  template_slug text not null references templates(slug),
  content jsonb not null default '{}'::jsonb,
  theme jsonb not null default '{}'::jsonb,
  entitlements jsonb not null default '{}'::jsonb,
  manage_token_hash text,
  status invitation_status not null default 'draft',
  published_at timestamptz,
  expires_at timestamptz,
  created_at timestamptz not null default now()
);

create index invitations_slug_published_idx
  on invitations (slug) where status = 'published';

create table guests (
  id uuid primary key default gen_random_uuid(),
  invitation_id uuid not null references invitations(id) on delete cascade,
  name text not null,
  phone text,
  party_size integer not null default 1,
  notes text,
  created_at timestamptz not null default now()
);

create table rsvps (
  id uuid primary key default gen_random_uuid(),
  invitation_id uuid not null references invitations(id) on delete cascade,
  guest_id uuid references guests(id) on delete set null,
  name text not null,
  attending boolean not null,
  party_size integer not null default 1,
  dietary_notes text,
  message text,
  created_at timestamptz not null default now()
);

create index rsvps_invitation_idx on rsvps (invitation_id, created_at desc);

create table custom_leads (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  phone text not null,
  event_date date,
  brief text not null,
  budget_note text,
  status text not null default 'new',
  created_at timestamptz not null default now()
);

create table admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null default 'admin',
  created_at timestamptz not null default now()
);
