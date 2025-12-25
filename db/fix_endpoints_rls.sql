-- FIX: Relax constraints for Endpoints and Secrets (Dashboard & Vault usage)

-- 1. ENDPOINTS Check
drop policy if exists "Endpoints are viewable by everyone." on endpoints;
drop policy if exists "Domain owners can Insert endpoints." on endpoints;
drop policy if exists "Domain owners can Update endpoints." on endpoints;

-- Allow anyone to edit endpoints (MVP Mode - No auth.uid() check)
create policy "Enable Read for all" on endpoints for select using (true);
create policy "Enable Insert for all" on endpoints for insert with check (true);
create policy "Enable Update for all" on endpoints for update using (true);


-- 2. SECRETS Check (Preparing for Phase 5)
drop policy if exists "Users can view their own secrets." on secrets;
drop policy if exists "Users can insert their own secrets." on secrets;
drop policy if exists "Users can update their own secrets." on secrets;
drop policy if exists "Users can delete their own secrets." on secrets;

-- Allow anyone to edit secrets (MVP Mode)
create policy "Enable Read for all" on secrets for select using (true);
create policy "Enable Insert for all" on secrets for insert with check (true);
create policy "Enable Update for all" on secrets for update using (true);
create policy "Enable Delete for all" on secrets for delete using (true);
