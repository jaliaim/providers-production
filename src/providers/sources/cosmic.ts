import { flags } from '@/entrypoint/utils/targets';
import { makeSourcerer, SourcererOutput } from '@/providers/base';
import { MovieScrapeContext, ShowScrapeContext } from '@/utils/context';

function normalizeTitle(s: string) {
  return String(s || '').trim().toLowerCase();
}

async function cosmicSearch(ctx: ShowScrapeContext | MovieScrapeContext, title: string, type: 'movie' | 'tv', year?: number) {
  const base = 'https://mbpdev.pirxcy.dev/search';
  const url = `${base}?q=${encodeURIComponent(title)}&type=${encodeURIComponent(type)}${year ? `&year=${encodeURIComponent(String(year))}` : ''}`;
  const proxyUrl = url; // endpoint appears CORS-enabled server-side via proxiedFetcher
  const data = await ctx.proxiedFetcher<any>(proxyUrl);
  if (!data?.data || !Array.isArray(data.data)) throw new Error('cosmic search empty');
  return data.data as Array<{ id: string; title: string; year?: number }>;
}

function findBestSearchMatch(items: Array<{ id: string; title: string; year?: number }>, title: string, year?: number) {
  const nTitle = normalizeTitle(title);
  const nYear = String(year || '').trim();
  return (
    items.find((it) => normalizeTitle(it.title) === nTitle && (!nYear || String(it.year) === nYear)) ||
    items.find((it) => normalizeTitle(it.title).includes(nTitle)) ||
    items[0]
  );
}

async function cosmicMovieDetails(ctx: MovieScrapeContext, id: string) {
  const url = `https://mbpdev.pirxcy.dev/movie/${encodeURIComponent(String(id))}`;
  return ctx.proxiedFetcher<any>(url);
}

async function cosmicTvDetails(ctx: ShowScrapeContext, id: string, season: number, episode: number) {
  const url = `https://mbpdev.pirxcy.dev/tv/${encodeURIComponent(String(id))}/${encodeURIComponent(String(season))}/${encodeURIComponent(String(episode))}`;
  return ctx.proxiedFetcher<any>(url);
}

function chooseCosmicMp4(details: any): string | null {
  const list = details?.data?.list;
  if (!Array.isArray(list) || !list.length) return null;
  const order = ['2160p', '1440p', '1080p', '720p', '480p', '360p'];
  const candidates = list.filter((it: any) => String(it.quality || '').toLowerCase() !== 'org');
  for (const q of order) {
    const match = candidates.find((it: any) => String(it.quality || '').toLowerCase() === q);
    if (match?.path) return match.path;
  }
  return candidates[0]?.path || list[0]?.path || null;
}

async function scrapeMovie(ctx: MovieScrapeContext): Promise<SourcererOutput> {
  const items = await cosmicSearch(ctx, ctx.media.title, 'movie', ctx.media.releaseYear);
  const match = findBestSearchMatch(items, ctx.media.title, ctx.media.releaseYear);
  if (!match?.id) return { embeds: [], stream: [] };
  const details = await cosmicMovieDetails(ctx, match.id);
  const mp4 = chooseCosmicMp4(details);
  if (!mp4) return { embeds: [], stream: [] };
  return {
    embeds: [],
    stream: [
      {
        id: 'cosmic-1',
        type: 'file',
        qualities: {
          unknown: { type: 'mp4', url: mp4 },
        },
        captions: [],
        flags: [flags.CORS_ALLOWED],
      },
    ],
  };
}

async function scrapeShow(ctx: ShowScrapeContext): Promise<SourcererOutput> {
  const items = await cosmicSearch(ctx, ctx.media.title, 'tv', ctx.media.releaseYear);
  const match = findBestSearchMatch(items, ctx.media.title, ctx.media.releaseYear);
  if (!match?.id) return { embeds: [], stream: [] };
  const details = await cosmicTvDetails(ctx, match.id, ctx.media.season.number, ctx.media.episode.number);
  const mp4 = chooseCosmicMp4(details);
  if (!mp4) return { embeds: [], stream: [] };
  return {
    embeds: [],
    stream: [
      {
        id: 'cosmic-1',
        type: 'file',
        qualities: {
          unknown: { type: 'mp4', url: mp4 },
        },
        captions: [],
        flags: [flags.CORS_ALLOWED],
      },
    ],
  };
}

export const cosmicScraper = makeSourcerer({
  id: 'cosmic',
  name: 'Cosmic',
  rank: 30,
  flags: [flags.CORS_ALLOWED],
  scrapeMovie,
  scrapeShow,
});


