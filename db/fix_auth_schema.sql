-- FIX: Relax constraints for "Wallet Only" Auth (No Email/Password required)

-- 1. Decouple profiles from auth.users
-- This allows us to create profiles just with a Wallet Address (no Supabase User ID needed)
alter table profiles drop constraint if exists profiles_id_fkey;
alter table profiles alter column id set default uuid_generate_v4();

-- 2. Drop existing strict RLS policies
drop policy if exists "Public profiles are viewable by everyone." on profiles;
drop policy if exists "Users can insert their own profile." on profiles;
drop policy if exists "Users can update own profile." on profiles;

drop policy if exists "Domains are viewable by everyone." on domains;
drop policy if exists "Users can update their own domains." on domains;

-- 3. Create "MVP" Policies (Allow Anon Read/Write for demo flow)
-- WARNING: This allows anyone to edit, but is necessary since we aren't exchanging Wallet Signatures for JWTs yet.
create policy "Enable Read for all" on profiles for select using (true);
create policy "Enable Insert for all" on profiles for insert with check (true);
create policy "Enable Update for all" on profiles for update using (true);

create policy "Enable Read for all" on domains for select using (true);
create policy "Enable Insert for all" on domains for insert with check (true);
create policy "Enable Update for all" on domains for update using (true);

-- 4. Fix Domains table owner mapping
-- We need to ensure we can just insert with the profile ID we get from the frontend
alter table domains drop constraint if exists domains_owner_id_fkey;
alter table domains add constraint domains_owner_id_fkey foreign key (owner_id) references profiles(id);
