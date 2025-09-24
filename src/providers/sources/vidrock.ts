import { makeSourcerer, SourcererOutput } from '@/providers/base';
import { flags } from '@/entrypoint/utils/targets';
import { MovieScrapeContext, ShowScrapeContext } from '@/utils/context';

function base64Encode(input: string): string {

  try {
    
    if (typeof btoa === 'function') return btoa(input);
  } catch {}
  const nodeBuffer = (globalThis as any)?.Buffer;
  if (nodeBuffer && typeof nodeBuffer.from === 'function') {
    return nodeBuffer.from(input, 'utf-8').toString('base64');
  }
  
  const utf8 = new TextEncoder().encode(input);
  let binary = '';
  for (let i = 0; i < utf8.length; i++) binary += String.fromCharCode(utf8[i]);
  
  return typeof btoa === 'function' ? btoa(binary) : '';
}

function encodeTmdbId(tmdbId: number | string): string {
  const map = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j'];
  const mapped = String(tmdbId)
    .split('')
    .map((d) => map[parseInt(d, 10)])
    .join('');
  const reversed = mapped.split('').reverse().join('');
  const once = base64Encode(reversed);
  const twice = base64Encode(once);
  return twice;
}

function encodeShowId(tmdbId: number | string, season: number | string, episode: number | string): string {
  const reversedTmdb = String(tmdbId).split('').reverse().join('');
  const raw = `${episode}-${season}-${reversedTmdb}`;
  const once = base64Encode(raw);
  const twice = base64Encode(once);
  return twice;
}

type VidrockResponse = {
  source1?: { url?: string };
  source2?: { url?: string };
  source3?: { url?: string };
  source4?: { url?: string };
  [key: string]: any;
};

function urlsFromVidrock(data: VidrockResponse): string[] {
  const urls: string[] = [];
  for (const [key, value] of Object.entries(data)) {
    if (/^source\d+$/i.test(key)) {
      const u = (value as any)?.url;
      if (u && typeof u === 'string') urls.push(u);
    }
  }
  return urls;
}

function headerCandidates(url: string): Record<string, string>[] {
  // Vidrock requires vidrock.net as referer/origin
  return [{ Referer: 'https://vidrock.net/', Origin: 'https://vidrock.net' }];
}

async function chooseHeadersFor(url: string, ctx: MovieScrapeContext | ShowScrapeContext): Promise<{ ok: boolean; headers: Record<string, string> }> {
  for (const headers of headerCandidates(url)) {
    try {
      const res = await ctx.proxiedFetcher.full(url, { method: 'GET', headers });
      if (res.statusCode >= 200 && res.statusCode < 400) return { ok: true, headers };
    } catch {}
  }
  return { ok: false, headers: {} };
}

async function scrapeMovie(ctx: MovieScrapeContext): Promise<SourcererOutput> {
  const encoded = encodeTmdbId(ctx.media.tmdbId);
  const url = `https://vidrock.net/api/movie/${encoded}`;
  const data = await ctx.fetcher<VidrockResponse>(url);

  const urls = urlsFromVidrock(data);
  const candidates = await Promise.all(urls.map(async (u, idx) => {
    const id = `vidrock-${idx + 1}`;
    const isHlsHeuristic = /\.m3u8(\b|$)/i.test(u) || /\/playlist\//i.test(u) || /\/proxy\//i.test(u);
    if (isHlsHeuristic) {
      const { ok, headers } = await chooseHeadersFor(u, ctx);
      return {
        id,
        type: 'hls' as const,
        playlist: u,
        flags: [flags.CORS_ALLOWED],
        captions: [],
        headers,
        __isHls: true,
        __ok: ok,
      } as const;
    }
    return {
      id,
      type: 'file' as const,
      qualities: { unknown: { type: 'mp4' as const, url: u } },
      flags: [flags.CORS_ALLOWED],
      captions: [],
      __isHls: false,
      __ok: false,
    } as const;
  }));
  // Prefer HLS first, then playable probes first
  const stream = candidates
    .sort((a, b) => {
      if (a.__isHls !== b.__isHls) return a.__isHls ? -1 : 1;
      if (a.__ok !== b.__ok) return a.__ok ? -1 : 1;
      return 0;
    })
    .map(({ __isHls, __ok, ...s }) => s as any);

  return { embeds: [], stream };
}

async function scrapeShow(ctx: ShowScrapeContext): Promise<SourcererOutput> {
  const encoded = encodeShowId(ctx.media.tmdbId, ctx.media.season.number, ctx.media.episode.number);
  const url = `https://vidrock.net/api/tv/${encoded}`;
  const data = await ctx.fetcher<VidrockResponse>(url);

  const urls = urlsFromVidrock(data);
  const candidates = await Promise.all(urls.map(async (u, idx) => {
    const id = `vidrock-${idx + 1}`;
    const isHlsHeuristic = /\.m3u8(\b|$)/i.test(u) || /\/playlist\//i.test(u) || /\/proxy\//i.test(u);
    if (isHlsHeuristic) {
      const { ok, headers } = await chooseHeadersFor(u, ctx);
      return {
        id,
        type: 'hls' as const,
        playlist: u,
        flags: [flags.CORS_ALLOWED],
        captions: [],
        headers,
        __isHls: true,
        __ok: ok,
      } as const;
    }
    return {
      id,
      type: 'file' as const,
      qualities: { unknown: { type: 'mp4' as const, url: u } },
      flags: [flags.CORS_ALLOWED],
      captions: [],
      __isHls: false,
      __ok: false,
    } as const;
  }));
  const stream = candidates
    .sort((a, b) => {
      if (a.__isHls !== b.__isHls) return a.__isHls ? -1 : 1;
      if (a.__ok !== b.__ok) return a.__ok ? -1 : 1;
      return 0;
    })
    .map(({ __isHls, __ok, ...s }) => s as any);

  return { embeds: [], stream };
}

export const vidrockScraper = makeSourcerer({
  id: 'vidrock',
  name: 'Vidrock',
  rank: 10,
  flags: [flags.CORS_ALLOWED],
  scrapeMovie,
  scrapeShow,
});


