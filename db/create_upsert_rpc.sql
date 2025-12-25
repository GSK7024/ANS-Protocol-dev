-- Create a function to safely insert/update crawler data
-- This is "Security Definer" meaning it bypasses RLS (Runs as Admin)

create or replace function upsert_agent_data(
    p_name text,
    p_skills jsonb,
    p_last_crawled_at timestamp with time zone,
    p_category text default null,
    p_tags text[] default null,
    p_peers text[] default null,
    p_payment_config jsonb default null
)
returns void as $$
begin
    -- Try to update existing domain
    update domains
    set 
        skills = p_skills,
        last_crawled_at = p_last_crawled_at,
        category = coalesce(p_category, category), -- Update if new value provided
        tags = coalesce(p_tags, tags),
        peers = p_peers,
        payment_config = p_payment_config
    where name = p_name;

    -- If no row updated, we could insert, but usually domains must be 'minted' first?
    -- Let's assume for the crawler, we primarily UPDATE existing minted domains.
    -- Or if we want to auto-discover completely new domains (unowned), we insert them as 'discovered'.
    
    if not found then
        insert into domains (name, status, skills, last_crawled_at, category, tags, peers, payment_config)
        values (
            p_name, 
            'active', -- Auto-activate discovered agents? Or 'discovered'?
            p_skills, 
            p_last_crawled_at,
            p_category, 
            p_tags, 
            p_peers, 
            p_payment_config
        );
    end if;
end;
$$ language plpgsql security definer;

-- Grant access to everyone (The Crawler running with Anon Key)
grant execute on function upsert_agent_data to anon;
grant execute on function upsert_agent_data to authenticated;
grant execute on function upsert_agent_data to service_role;
