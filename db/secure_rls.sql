-- SECURE RLS MIGRATION
-- Reverts the "Public Access" introduced in `fix_endpoints_rls.sql`
-- Enforces strict ownership checks.

-- 1. SECURE ENDPOINTS
-- Drop the insecure "Enable ... for all" policies
drop policy if exists "Enable Read for all" on endpoints;
drop policy if exists "Enable Insert for all" on endpoints;
drop policy if exists "Enable Update for all" on endpoints;

-- Re-enable Row Level Security (Should already be on, but let's be safe)
alter table endpoints enable row level security;

-- Policies:
-- Everyone can READ endpoints (to resolve them)
create policy "Endpoints are viewable by everyone."
  on endpoints for select
  using ( true );

-- Only Domain Owners can INSERT endpoints for their domains
create policy "Domain owners can Insert endpoints."
  on endpoints for insert
  with check ( 
    exists ( 
      select 1 from domains 
      where id = domain_id 
      and owner_id = auth.uid() 
    ) 
  );

-- Only Domain Owners can UPDATE endpoints for their domains
create policy "Domain owners can Update endpoints."
  on endpoints for update
  using ( 
    exists ( 
      select 1 from domains 
      where id = domain_id 
      and owner_id = auth.uid() 
    ) 
  );

-- Only Domain Owners can DELETE endpoints for their domains
create policy "Domain owners can Delete endpoints."
  on endpoints for delete
  using ( 
    exists ( 
      select 1 from domains 
      where id = domain_id 
      and owner_id = auth.uid() 
    ) 
  );


-- 2. SECURE SECRETS
-- Drop the insecure "Enable ... for all" policies
drop policy if exists "Enable Read for all" on secrets;
drop policy if exists "Enable Insert for all" on secrets;
drop policy if exists "Enable Update for all" on secrets;
drop policy if exists "Enable Delete for all" on secrets;

-- Re-enable RLS
alter table secrets enable row level security;

-- Policies:
-- users can ONLY see/edit their own secrets.
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
