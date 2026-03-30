/**
 * IRS RSS Feed API
 * Fetches and caches IRS news, tax tips, and deadline updates
 */

let feedCache = { data: null, fetchedAt: 0 };
const CACHE_TTL = 6 * 60 * 60 * 1000; // 6 hours

async function fetchIRSFeed() {
  // Return cache if fresh
  if (feedCache.data && Date.now() - feedCache.fetchedAt < CACHE_TTL) {
    return feedCache.data;
  }

  const feeds = [
    'https://www.irs.gov/newsroom/really-simple-syndication',
  ];

  const items = [];

  for (const feedUrl of feeds) {
    try {
      const resp = await fetch(feedUrl, {
        headers: { 'User-Agent': 'RichardsTaxNY/1.0 TaxWise Bot' },
      });
      if (!resp.ok) continue;
      const xml = await resp.text();

      // Simple XML parsing for RSS items
      const itemMatches = xml.match(/<item>([\s\S]*?)<\/item>/gi) || [];
      for (const item of itemMatches.slice(0, 10)) {
        const title = item.match(/<title><!\[CDATA\[(.*?)\]\]>|<title>(.*?)<\/title>/)?.[1] || item.match(/<title>(.*?)<\/title>/)?.[1] || '';
        const link = item.match(/<link>(.*?)<\/link>/)?.[1] || '';
        const description = item.match(/<description><!\[CDATA\[(.*?)\]\]>|<description>(.*?)<\/description>/)?.[1] || '';
        const pubDate = item.match(/<pubDate>(.*?)<\/pubDate>/)?.[1] || '';

        if (title) {
          items.push({
            title: title.trim(),
            link: link.trim(),
            description: description.replace(/<[^>]*>/g, '').trim().substring(0, 300),
            pubDate: pubDate.trim(),
          });
        }
      }
    } catch (err) {
      console.error('IRS feed fetch error:', err.message);
    }
  }

  // Sort by date, newest first
  items.sort((a, b) => new Date(b.pubDate) - new Date(a.pubDate));

  feedCache = { data: items.slice(0, 15), fetchedAt: Date.now() };
  return feedCache.data;
}

export { fetchIRSFeed };

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    const items = await fetchIRSFeed();
    return res.status(200).json({ items: items || [] });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch IRS feed' });
  }
}
