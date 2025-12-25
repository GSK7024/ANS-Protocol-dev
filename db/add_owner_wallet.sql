-- Migration to add owner_wallet to domains for wallet-only users
alter table domains
add column owner_wallet text;

-- Add index for fast lookups
create index idx_domains_owner_wallet on domains(owner_wallet);

-- Update RLS policies to allow wallet owners to update their domains
drop policy "Users can update their own domains." on domains;

create policy "Users can update their own domains."
  on domains for update
  using ( 
    (auth.uid() = owner_id) or 
    (owner_wallet is not null and owner_wallet = (current_setting('request.jwt.claim.wallet_address', true)::text))
  );

-- For now, purely public can view, so no change needed to select policy.
