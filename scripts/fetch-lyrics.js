/**
 * fetch-lyrics.js
 * Fetches hymn lyrics from hymnal.net by searching for each hymn title.
 * Run once: node scripts/fetch-lyrics.js
 *
 * Test first: node scripts/fetch-lyrics.js --debug
 */
require('dotenv').config();
const https = require('https');
const http = require('http');
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

function get(url, redirectCount = 0) {
  if (redirectCount > 5) return Promise.reject(new Error('Too many redirects'));
  return new Promise((resolve, reject) => {
    const lib = url.startsWith('https') ? https : http;
    const req = lib.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
      }
    }, res => {
      if (res.statusCode === 301 || res.statusCode === 302 || res.statusCode === 303) {
        const loc = res.headers.location;
        const next = loc.startsWith('http') ? loc : new URL(loc, url).href;
        return get(next, redirectCount + 1).then(resolve).catch(reject);
      }
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => resolve(body));
    });
    req.on('error', reject);
    req.setTimeout(15000, () => { req.destroy(); reject(new Error('Timeout')); });
  });
}

function decode(str) {
  return str
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/&ldquo;/g, '“')
    .replace(/&rdquo;/g, '”')
    .replace(/&lsquo;/g, '‘')
    .replace(/&rsquo;/g, '’')
    .replace(/&#8216;/g, '‘')
    .replace(/&#8217;/g, '’')
    .replace(/&#8220;/g, '“')
    .replace(/&#8221;/g, '”');
}

function stripTags(html) {
  return html.replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]+>/g, '');
}

// Parse lyrics from a hymnal.net hymn page
function parseLyrics(html) {
  const verses = [];

  // hymnal.net: each verse is in <div class="verse"> containing <p> lines
  const verseRe = /<div[^>]*\bclass="[^"]*\bverse\b[^"]*"[^>]*>([\s\S]*?)<\/div>/gi;
  let m;
  while ((m = verseRe.exec(html)) !== null) {
    const text = decode(stripTags(m[1])).replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n').trim();
    if (text.length > 8) verses.push(text);
  }
  // Filter out browser/UI messages that get picked up as "verses"
  const clean = verses.filter(v => !/cannot be played|your browser|javascript required/i.test(v));
  if (clean.length > 0) return clean.join('\n\n');

  // Fallback: <div class="lyrics"> or similar container
  const blockRe = /<div[^>]*\bclass="[^"]*\b(?:lyrics?|stanza|hymn.?text)\b[^"]*"[^>]*>([\s\S]*?)<\/div>/i;
  const block = html.match(blockRe);
  if (block) {
    const text = decode(stripTags(block[1])).replace(/\n{3,}/g, '\n\n').trim();
    if (text.length > 30) return text;
  }

  return null;
}

// Search hymnal.net for a hymn by title; return first matching hymn page URL
async function findHymnUrl(title) {
  const attempts = [
    title,
    // Try just the first 4 words (catches "O for a thousand tongues to sing" → "O for a thousand")
    title.split(/\s+/).slice(0, 4).join(' '),
    // Try first 3 words as last resort
    title.split(/\s+/).slice(0, 3).join(' '),
  ].filter((t, i, arr) => arr.indexOf(t) === i); // deduplicate

  for (const attempt of attempts) {
    const query = encodeURIComponent(attempt.replace(/[^\w\s]/g, ' ').trim());
    const searchUrl = `https://www.hymnal.net/en/search/all/all/${query}`;
    try {
      const html = await get(searchUrl);
      const linkMatch = html.match(/href="(\/en\/hymn\/[a-z]+\/\d+)"/);
      if (linkMatch) return `https://www.hymnal.net${linkMatch[1]}`;
    } catch {
      // try next attempt
    }
    await sleep(400);
  }
  return null;
}

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function debugHtml() {
  const title = process.argv[3] || 'Amazing Grace';
  console.log(`\nSearching hymnal.net for: "${title}"\n`);

  const query = encodeURIComponent(title.replace(/[^\w\s]/g, ' ').trim());
  const searchUrl = `https://www.hymnal.net/en/search/all/all/${query}`;
  console.log('Search URL:', searchUrl);

  const searchHtml = await get(searchUrl);
  console.log('Search HTML length:', searchHtml.length);

  // Show hymn links found
  const links = [...searchHtml.matchAll(/href="(\/en\/hymn\/[^"]+)"/g)].map(m => m[1]);
  console.log(`\nHymn links found in search results (first 5):`);
  links.slice(0, 5).forEach(l => console.log(' ', l));

  if (!links.length) {
    console.log('\nNo hymn links found. Search result snippet:');
    console.log(searchHtml.slice(0, 3000));
    return;
  }

  const hymnUrl = `https://www.hymnal.net${links[0]}`;
  console.log(`\nFetching first result: ${hymnUrl}`);
  const hymnHtml = await get(hymnUrl);
  console.log('Hymn page HTML length:', hymnHtml.length);

  const lyrics = parseLyrics(hymnHtml);
  if (lyrics) {
    console.log('\n=== PARSED LYRICS ===');
    console.log(lyrics.slice(0, 800));
    console.log('=== END ===');
  } else {
    console.log('\nNo lyrics parsed. Showing first 3000 chars of hymn page:');
    console.log(hymnHtml.slice(0, 3000));
  }
}

async function main() {
  if (process.argv[2] === '--debug') {
    await debugHtml();
    return;
  }

  const { data: hymns, error } = await supabase
    .from('church_hymns')
    .select('id, number, title')
    .is('lyrics', null)
    .order('number');

  if (error) {
    console.error('Could not read hymns table:', error.message);
    console.error('Make sure you have run the schema migration in Supabase first.');
    process.exit(1);
  }

  if (!hymns || hymns.length === 0) {
    console.log('All hymns already have lyrics!');
    return;
  }

  console.log(`Fetching lyrics for ${hymns.length} hymns from hymnal.net...\n`);
  let found = 0, skipped = 0, failed = 0;

  for (const hymn of hymns) {
    try {
      const hymnUrl = await findHymnUrl(hymn.title);
      if (!hymnUrl) {
        console.log(`— ${hymn.number}. ${hymn.title} (not found in search)`);
        skipped++;
        await sleep(800);
        continue;
      }

      const html = await get(hymnUrl);
      const lyrics = parseLyrics(html);

      if (lyrics && lyrics.length > 20) {
        const { error: upErr } = await supabase
          .from('church_hymns')
          .update({ lyrics, updated_at: new Date().toISOString() })
          .eq('id', hymn.id);

        if (upErr) {
          console.log(`✗ ${hymn.number}. ${hymn.title} — DB error: ${upErr.message}`);
          failed++;
        } else {
          console.log(`✓ ${hymn.number}. ${hymn.title}`);
          found++;
        }
      } else {
        console.log(`— ${hymn.number}. ${hymn.title} (lyrics not parsed from page)`);
        skipped++;
      }
    } catch (err) {
      console.log(`✗ ${hymn.number}. ${hymn.title} — ${err.message}`);
      failed++;
    }

    // Polite delay between requests
    await sleep(1200);
  }

  console.log(`\nFinished: ${found} updated, ${skipped} not found, ${failed} errors.`);
  if (skipped > 0) {
    console.log(`Remaining hymns can be added manually at /admin/hymnal`);
  }
}

main().catch(err => {
  console.error('Fatal error:', err.message);
  process.exit(1);
});
