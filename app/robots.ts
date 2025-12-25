import { MetadataRoute } from 'next';

/**
 * Robots.txt Generator
 * 
 * Controls search engine crawling behavior.
 * Accessible at: https://ans.dev/robots.txt
 */

export default function robots(): MetadataRoute.Robots {
    const baseUrl = 'https://ans.dev';

    return {
        rules: [
            {
                userAgent: '*',
                allow: '/',
                disallow: [
                    '/api/',           // Don't crawl API routes
                    '/dashboard/',     // Private user pages
                    '/_next/',         // Next.js internals
                    '/admin/',         // Admin pages if any
                ],
            },
            {
                userAgent: 'GPTBot',     // OpenAI crawler
                allow: '/',
            },
            {
                userAgent: 'anthropic-ai', // Anthropic crawler
                allow: '/',
            },
        ],
        sitemap: `${baseUrl}/sitemap.xml`,
        host: baseUrl,
    };
}
