/**
 * Instagram bio scraping utilities for bio-based verification.
 * Uses public HTML scraping (no API key required).
 */

export async function fetchInstagramBio(username: string): Promise<string | null> {
  try {
    const res = await fetch(`https://www.instagram.com/${username}/`, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        "Accept": "text/html",
        "Accept-Language": "en-US,en;q=0.9",
        ...(process.env.INSTAGRAM_SCRAPER_SESSION && {
          "Cookie": `sessionid=${process.env.INSTAGRAM_SCRAPER_SESSION}`,
        }),
      },
      signal: AbortSignal.timeout(10000),
    });

    if (!res.ok) return null;

    return await res.text();
  } catch {
    return null;
  }
}

function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&#x27;/g, "'");
}
