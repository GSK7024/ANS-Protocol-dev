
import { MetadataRoute } from 'next';
import { supabase } from '@/utils/supabase/client';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
    const baseUrl = 'https://ans.gg'; // CHANGE THIS TO YOUR PRODUCTION DOMAIN

    // 1. Static Routes
    const routes = [
        '',
        '/marketplace',
        '/manifesto',
        '/docs',
    ].map((route) => ({
        url: `${baseUrl}${route}`,
        lastModified: new Date(),
        changeFrequency: 'daily' as const,
        priority: 1,
    }));

    // 2. Fetch all active agents
    const { data: domains } = await supabase
        .from('domains')
        .select('name, created_at')
        .eq('status', 'active'); // Only index active domains

    const agentRoutes = (domains || []).map((domain) => ({
        url: `${baseUrl}/agent/${domain.name}`,
        lastModified: new Date(domain.created_at),
        changeFrequency: 'weekly' as const,
        priority: 0.8,
    }));

    return [...routes, ...agentRoutes];
}
