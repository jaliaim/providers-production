import { flags } from '@/entrypoint/utils/targets';
import { Caption, getCaptionTypeFromUrl, labelToLanguageCode, removeDuplicatedLanguages } from '@/providers/captions';
import { makeSourcerer, SourcererOutput } from '@/providers/base';
import { MovieScrapeContext, ShowScrapeContext } from '@/utils/context';
import { NotFoundError } from '@/utils/errors';

function slugifyTitle(input: string): string {
  return String(input || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .concat('-online-free');
}

function buildHydraReferer(ctx: MovieScrapeContext | ShowScrapeContext): string {
  if (ctx.media.type === 'show') {
    const slug = slugifyTitle(ctx.media.title);
    return `https://hydrahd.io/watchseries/${slug}/season/${ctx.media.season.number}/episode/${ctx.media.episode.number}`;
  }
  // Fallback to domain root for movies if path scheme changes
  return 'https://hydrahd.io/';
}

function extractFirstM3u8(html: string): string | null {
  const m = html.match(/https?:\/\/[^\s"']+\.m3u8/);
  return m ? m[0] : null;
}

function extractSubtitles(html: string): Caption[] {
  try {
    // Expect pattern: const subtitles = [{...Off...}, ...[ {"file":"...","label":"..."}, ... ]];
    const arrMatch = html.match(/\.\.\.(\[(?:.|\n|\r)*?\])/);
    if (!arrMatch) return [];
    const list = JSON.parse(arrMatch[1]);
    if (!Array.isArray(list)) return [];
    const rawSubs = (list as any[])
      .map((it: any, idx: number) => {
        const url: string = it?.file || '';
        const type = getCaptionTypeFromUrl(url);
        const lang = labelToLanguageCode(String(it?.label || '')) || 'en';
        if (!url || !type) return null;
        return {
          id: `hydrahd-${idx}`,
          url,
          type,
          language: lang,
          hasCorsRestrictions: true,
        } as Caption;
      })
      .filter(Boolean);
    const subs: Caption[] = rawSubs as Caption[];
    return removeDuplicatedLanguages(subs);
  } catch {
    return [];
  }
}

function browserLikeHeaders(referer: string, origin: string): Record<string, string> {
  return {
    Referer: referer,
    Origin: origin,
    'User-Agent':
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    Accept:
      'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.9',
    'Sec-Fetch-Site': 'same-origin',
    'Sec-Fetch-Mode': 'navigate',
    'Sec-Fetch-Dest': 'iframe',
    'Upgrade-Insecure-Requests': '1',
  };
}

async function scrapeShow(ctx: ShowScrapeContext): Promise<SourcererOutput> {
  const iframeUrl = `https://hydrahd.io/ajax/1_s1.php?tmdbid=${encodeURIComponent(String(ctx.media.tmdbId))}&season=${encodeURIComponent(String(ctx.media.season.number))}&episode=${encodeURIComponent(String(ctx.media.episode.number))}`;
  const referer = buildHydraReferer(ctx);
  const html = await ctx.proxiedFetcher<string>(iframeUrl, {
    headers: browserLikeHeaders(referer, 'https://hydrahd.io'),
  });

  const m3u8 = extractFirstM3u8(html);
  if (!m3u8) throw new NotFoundError('HydraHD m3u8 not found');
  const subs = extractSubtitles(html);

  return {
    embeds: [],
    stream: [
      {
        id: 'hydrahd-1',
        type: 'hls',
        playlist: m3u8,
        flags: [flags.CORS_ALLOWED],
        headers: browserLikeHeaders(referer, 'https://hydrahd.io'),
        captions: subs,
      },
    ],
  };
}

async function scrapeMovie(ctx: MovieScrapeContext): Promise<SourcererOutput> {
  const iframeUrl = `https://hydrahd.io/ajax/1_m1.php?tmdbid=${encodeURIComponent(String(ctx.media.tmdbId))}`;
  const referer = 'https://hydrahd.io/';
  const html = await ctx.proxiedFetcher<string>(iframeUrl, {
    headers: browserLikeHeaders(referer, 'https://hydrahd.io'),
  });

  const m3u8 = extractFirstM3u8(html);
  if (!m3u8) throw new NotFoundError('HydraHD m3u8 not found');
  const subs = extractSubtitles(html);

  return {
    embeds: [],
    stream: [
      {
        id: 'hydrahd-1',
        type: 'hls',
        playlist: m3u8,
        flags: [flags.CORS_ALLOWED],
        headers: browserLikeHeaders(referer, 'https://hydrahd.io'),
        captions: subs,
      },
    ],
  };
}

export const hydrahdScraper = makeSourcerer({
  id: 'hydrahd',
  name: 'HydraHD',
  rank: 20,
  flags: [flags.CORS_ALLOWED],
  scrapeMovie,
  scrapeShow,
});


