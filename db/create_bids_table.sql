-- Create Bids Table for Auction System
create table if not exists public.bids (
  id uuid default gen_random_uuid() primary key,
  domain_name text not null,
  bidder_wallet text not null,
  amount numeric(10, 2) not null,
  signature text, -- Optional: For verifying the bid signature
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Row Level Security
alter table public.bids enable row level security;

-- Allow public read (for Leaderboard)
create policy "Allow public read access" on public.bids
  for select using (true);

-- Allow authenticated insert or just open insert for the MVP (we verify signature in API)
create policy "Allow insert for everyone" on public.bids
  for insert with check (true);

-- Create Index for fast sorting
create index idx_bids_domain_amount on public.bids (domain_name, amount desc);

-- Realtime is usually enabled via Supabase Dashboard, but this table needs it.
-- (User needs to enable Realtime for 'bids' in the dashboard)
