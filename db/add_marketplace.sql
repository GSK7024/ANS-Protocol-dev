-- Migration to add marketplace columns
alter table domains
add column list_price numeric;

alter table domains
add column marketplace_status text default 'inactive' check (marketplace_status in ('active', 'sold', 'inactive'));

-- Index for searching listings
create index idx_domains_marketplace on domains(marketplace_status) where marketplace_status = 'active';

-- RLS: Listing Items
-- Allow owners to update list_price
create policy "Owners can list domains"
  on domains for update
  using ( (auth.uid() = owner_id) or (owner_wallet = (current_setting('request.jwt.claim.wallet_address', true)::text)) );
