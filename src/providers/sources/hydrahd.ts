import { flags } from '@/entrypoint/utils/targets';
import { makeSourcerer, SourcererOutput } from '@/providers/base';
import { Caption, getCaptionTypeFromUrl, isValidLanguageCode, labelToLanguageCode, removeDuplicatedLanguages } from '@/providers/captions';
import { createM3U8ProxyUrl } from '@/utils/proxy';
import { MovieScrapeContext, ShowScrapeContext } from '@/utils/context';

const HYDRA_HEADERS = {
  Referer: 'https://hydrahd.io/movie/194941-watch-nobody-2-2025-online',
  Origin: 'https://hydrahd.io/movie/194941-watch-nobody-2-2025-online',
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
  'Sec-Fetch-Dest': 'iframe',
  'Sec-Fetch-Mode': 'navigate',
  'Sec-Fetch-Site': 'same-origin',
  Cookie: 'PHPSESSID=doi7h4hd52f799vl92fp7grs52',
};

function extractM3U8FromHtml(html: string): string | null {
  // Try a direct m3u8 pattern first
  const direct = html.match(/https?:\/\/[^"'\s]+\.m3u8/);
  if (direct) return direct[0];

  // Fallback: the sample embeds a JS const quality = "...m3u8";
  const jsVar = html.match(/const\s+quality\s*=\s*"(https?:\\\/\\\/[^\"]+\.m3u8)"/);
  if (jsVar) {
    try {
      const decoded = jsVar[1].replace(/\\\//g, '/');
      return decoded;
    } catch {}
  }
  return null;
}

function extractSubtitleUrlsFromHtml(html: string): { url: string; label: string }[] {
  // Attempt to parse the subtitles array from the embedded JS
  const match = html.match(/const\s+subtitles\s*=\s*\[(.*?)\];/s);
  if (!match) return [];
  try {
    // Rebuild JSON array by wrapping in [] and normalizing quotes
    const raw = `[${match[1]}]`;
    // The snippet already appears JSON; try direct parse first
    const arr = JSON.parse(raw);
    if (Array.isArray(arr)) return arr.filter((x) => x && x.file && x.label);
  } catch {}
  // Fallback: naive URL extraction
  const urls: { url: string; label: string }[] = [];
  const re = /\{\s*"file"\s*:\s*"(https?:\\\/\\\/[^\"]+)"\s*,\s*"label"\s*:\s*"([^"]+)"\s*\}/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html))) {
    urls.push({ url: m[1].replace(/\\\//g, '/'), label: m[2] });
  }
  return urls;
}

function buildCaptions(subs: { url: string; label: string }[]): Caption[] {
  const out: Caption[] = [];
  for (let i = 0; i < subs.length; i++) {
    const { url, label } = subs[i];
    const type = getCaptionTypeFromUrl(url) ?? 'vtt';
    const languageCode = labelToLanguageCode(label.toLowerCase());
    if (!isValidLanguageCode(languageCode)) continue;
    out.push({
      id: `hydra-${i + 1}`,
      url,
      type,
      language: languageCode!,
      hasCorsRestrictions: true,
    });
  }
  return removeDuplicatedLanguages(out);
}

async function scrapeMovie(ctx: MovieScrapeContext): Promise<SourcererOutput> {
  const url = `https://hydrahd.io/ajax/1_m1.php?tmdbid=${encodeURIComponent(String(ctx.media.tmdbId))}`;
  const html = await ctx.proxiedFetcher<string>(url, { headers: HYDRA_HEADERS });
  const m3u8 = extractM3U8FromHtml(html);
  if (!m3u8) return { embeds: [], stream: [] };
  const subsRaw = extractSubtitleUrlsFromHtml(html);
  const captions = buildCaptions(subsRaw);
  return {
    embeds: [],
    stream: [
      {
        id: 'hydra-1',
        type: 'hls',
        playlist: createM3U8ProxyUrl(m3u8, { ...HYDRA_HEADERS }),
        flags: [flags.CORS_ALLOWED],
        captions,
      },
    ],
  };
}

async function scrapeShow(ctx: ShowScrapeContext): Promise<SourcererOutput> {
  const url = `https://hydrahd.io/ajax/1_s1.php?tmdbid=${encodeURIComponent(String(ctx.media.tmdbId))}&season=${encodeURIComponent(String(ctx.media.season.number))}&episode=${encodeURIComponent(String(ctx.media.episode.number))}`;
  const html = await ctx.proxiedFetcher<string>(url, { headers: HYDRA_HEADERS });
  const m3u8 = extractM3U8FromHtml(html);
  if (!m3u8) return { embeds: [], stream: [] };
  const subsRaw = extractSubtitleUrlsFromHtml(html);
  const captions = buildCaptions(subsRaw);
  return {
    embeds: [],
    stream: [
      {
        id: 'hydra-1',
        type: 'hls',
        playlist: createM3U8ProxyUrl(m3u8, { ...HYDRA_HEADERS }),
        flags: [flags.CORS_ALLOWED],
        captions,
      },
    ],
  };
}

export const hydrahdScraper = makeSourcerer({
  id: 'hydra',
  name: 'Hydra',
  disabled: false,
  rank: 1,
  flags: [flags.CORS_ALLOWED],
  scrapeMovie,
  scrapeShow,
});


