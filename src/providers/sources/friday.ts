import { flags } from '@/entrypoint/utils/targets';
import { getCaptionTypeFromUrl, isValidLanguageCode, labelToLanguageCode } from '@/providers/captions';
import { SourcererOutput, makeSourcerer } from '@/providers/base';
import { createM3U8ProxyUrl } from '@/utils/proxy';
import { MovieScrapeContext, ShowScrapeContext } from '@/utils/context';
import { NotFoundError } from '@/utils/errors';

const BASE = 'https://friday123.vercel.app';

type FridaySearchItem = {
  id: string;
  title: string;
  type: 'Movie' | 'TV';
  year?: string;
};

type FridaySearchResponse = {
  items: FridaySearchItem[];
};

type FridayDetailsResponse = {
  title: string;
  type: 'movie' | 'tv';
  episodeId?: string; // present for tv
};

type FridayServer = {
  server: string;
  type: string;
  source: string;
};

type FridaySourcesResponse = {
  sources?: Array<{ file: string; type: string }>;
  tracks?: Array<{ file: string; label: string; kind: string }>;
};

async function fridayFlow(ctx: MovieScrapeContext | ShowScrapeContext): Promise<SourcererOutput> {
  const soapyHeaders = { Referer: 'https://soapy.to/', Origin: 'https://soapy.to' };
  // 1) search by title
  const search = await ctx.proxiedFetcher<FridaySearchResponse>(`${BASE}/search`, {
    query: { q: ctx.media.title },
  });
  const list = Array.isArray(search?.items) ? search.items : [];
  if (list.length === 0) throw new NotFoundError('No search results');

  // naive pick: exact title match else first
  const exact = list.find((it) => it.title?.toLowerCase() === ctx.media.title.toLowerCase());
  const picked = exact ?? list[0];
  if (!picked?.id) throw new NotFoundError('No matching item');

  // 2) get details
  const details = await ctx.proxiedFetcher<FridayDetailsResponse>(`${BASE}/details`, {
    query: { id: String(picked.id) },
  });

  // 3) resolve episode id (movie uses episodeId as well per example)
  let episodeId: string | undefined = details?.episodeId as string | undefined;
  if (!episodeId) {
    // try fallback: some endpoints may require a second lookup by title/year; for now rely on details
    throw new NotFoundError('No episode id');
  }

  // 4) list servers
  const servers = await ctx.proxiedFetcher<FridayServer[]>(`${BASE}/servers`, {
    query: { episode: String(episodeId) },
  });
  if (!Array.isArray(servers) || servers.length === 0) throw new NotFoundError('No servers');

  // prefer UpCloud as in example, else first
  const upcloud = servers.find((s) => /upcloud/i.test(s.server));
  const chosen = upcloud ?? servers[0];
  if (!chosen?.source) throw new NotFoundError('No server source');

  // 5) fetch embed html to get window._lk_db
  const embedHtml = await ctx.proxiedFetcher<string>(chosen.source, { headers: soapyHeaders });
  const keyParts = embedHtml.match(/window\._lk_db\s*=\s*\{\s*x:\s*"([^"]+)",\s*y:\s*"([^"]+)",\s*z:\s*"([^"]+)"\s*\}/);
  if (!keyParts) throw new NotFoundError('Failed to extract _lk_db keys');
  const k = `${keyParts[1]}${keyParts[2]}${keyParts[3]}`;

  // extract id from data-id or title pattern
  let id: string | null = null;
  const mData = embedHtml.match(/data-id=\"([A-Za-z0-9]+)\"/);
  if (mData) id = mData[1];
  if (!id) {
    const mTitle = embedHtml.match(/File\s+#([A-Za-z0-9]+)\s+-/);
    if (mTitle) id = mTitle[1];
  }
  if (!id) throw new NotFoundError('Failed to extract embed id');

  // 6) get sources JSON
  const embedOrigin = new URL(chosen.source).origin;
  const res = await ctx.proxiedFetcher<FridaySourcesResponse>(`/embed-1/v3/e-1/getSources`, {
    baseUrl: embedOrigin,
    query: { id, _k: k },
    headers: soapyHeaders,
  });

  const file = res?.sources?.[0]?.file;
  if (!file) throw new NotFoundError('No HLS file');

  // captions
  const captions = (res?.tracks || [])
    .map((t, i) => {
      const language = labelToLanguageCode(t.label || '');
      const type = getCaptionTypeFromUrl(t.file || '');
      if (!type || !isValidLanguageCode(language)) return null;
      return {
        id: `friday-${i + 1}`,
        url: t.file,
        type,
        language: language!,
        hasCorsRestrictions: true,
      };
    })
    .filter((x) => x !== null);

  return {
    embeds: [],
    stream: [
      {
        id: 'primary',
        type: 'hls',
        playlist: createM3U8ProxyUrl(file, soapyHeaders),
        flags: [flags.CORS_ALLOWED],
        captions: captions as any,
      },
    ],
  };
}

export const fridayScraper = makeSourcerer({
  id: 'friday',
  name: 'Friday',
  rank: 20,
  flags: [flags.CORS_ALLOWED],
  scrapeMovie: fridayFlow,
  scrapeShow: fridayFlow,
});


