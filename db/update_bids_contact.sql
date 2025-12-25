-- Add Contact Info column to Bids table
alter table public.bids 
add column if not exists contact_info text;

-- (Optional) If starting fresh, the full schema is:
/*
create table if not exists public.bids (
  id uuid default gen_random_uuid() primary key,
  domain_name text not null,
  bidder_wallet text not null,
  amount numeric(10, 2) not null,
  signature text,
  contact_info text, -- NEW: For settlement
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);
*/
