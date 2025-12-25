-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- 1. PROFILES TABLE: Stores public user info linked to Auth
create table profiles (
  id uuid references auth.users on delete cascade not null primary key,
  wallet_address text unique,
  email text,
  full_name text,
  avatar_url text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Turn on RLS
alter table profiles enable row level security;

-- Policies
create policy "Public profiles are viewable by everyone."
  on profiles for select
  using ( true );

create policy "Users can insert their own profile."
  on profiles for insert
  with check ( auth.uid() = id );

create policy "Users can update own profile."
  on profiles for update
  using ( auth.uid() = id );

-- 2. DOMAINS TABLE: The Registry
create table domains (
  id uuid default uuid_generate_v4() primary key,
  name text unique not null,
  owner_id uuid references profiles(id) on delete set null,
  status text not null check (status in ('active', 'reserved', 'locked', 'restricted', 'suspended')),
  price_paid numeric,
  expiry_date timestamp with time zone,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Turn on RLS
alter table domains enable row level security;

-- Policies
create policy "Domains are viewable by everyone."
  on domains for select
  using ( true );

create policy "Users can update their own domains."
  on domains for update
  using ( auth.uid() = owner_id );

-- 3. ENDPOINTS TABLE: The Map (Where Agents go)
create table endpoints (
  domain_id uuid references domains(id) on delete cascade primary key,
  url text,
  docs_url text,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Turn on RLS
alter table endpoints enable row level security;

-- Policies
create policy "Endpoints are viewable by everyone."
  on endpoints for select
  using ( true );

create policy "Domain owners can Insert endpoints."
  on endpoints for insert
  with check ( exists ( select 1 from domains where id = domain_id and owner_id = auth.uid() ) );

create policy "Domain owners can Update endpoints."
  on endpoints for update
  using ( exists ( select 1 from domains where id = domain_id and owner_id = auth.uid() ) );

-- 4. SECRETS TABLE: The Vault (Encrypted Keys)
create table secrets (
  id uuid default uuid_generate_v4() primary key,
  owner_id uuid references profiles(id) on delete cascade not null,
  key_name text not null,
  encrypted_value text not null, -- Must be AES encrypted before insertion
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Turn on RLS
alter table secrets enable row level security;

-- Policies
-- CRITICAL: Only the owner can see their secrets.
create policy "Users can view their own secrets."
  on secrets for select
  using ( auth.uid() = owner_id );

create policy "Users can insert their own secrets."
  on secrets for insert
  with check ( auth.uid() = owner_id );

create policy "Users can update their own secrets."
  on secrets for update
  using ( auth.uid() = owner_id );

create policy "Users can delete their own secrets."
  on secrets for delete
  using ( auth.uid() = owner_id );

-- 5. RESERVED NAMES TABLE (System Control)
create table reserved_names (
  name text primary key,
  min_offer numeric,
  category text -- 'brand', 'protocol', 'gov'
);

alter table reserved_names enable row level security;

create policy "Reserved names are viewable by everyone."
  on reserved_names for select
  using ( true );

-- Function to handle new user signup automatically
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, wallet_address)
  values (new.id, new.email, new.raw_user_meta_data->>'wallet_address');
  return new;
end;
$$ language plpgsql security definer;

-- Trigger the function every time a user is created
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
