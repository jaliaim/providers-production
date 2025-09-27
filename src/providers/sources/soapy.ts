import { flags } from '@/entrypoint/utils/targets';
import { getCaptionTypeFromUrl, isValidLanguageCode, labelToLanguageCode } from '@/providers/captions';
import { SourcererOutput, makeSourcerer } from '@/providers/base';
import { MovieScrapeContext } from '@/utils/context';
import { NotFoundError } from '@/utils/errors';
import { createM3U8ProxyUrl } from '@/utils/proxy';

const SOAPY_ORIGIN = 'https://soapy.to';
const SOAPY_HEADERS = { Referer: `${SOAPY_ORIGIN}/`, Origin: SOAPY_ORIGIN };

function extractIframeSrc(html: string): string | null {
  const m = html.match(/<iframe[^>]+src="([^"]+)"/i);
  return m ? m[1] : null;
}

function extractIdFromEmbedHtml(html: string): string | null {
  const mData = html.match(/data-id=\"([A-Za-z0-9]+)\"/);
  if (mData) return mData[1];
  const mTitle = html.match(/File\s+#([A-Za-z0-9]+)\s+-/);
  if (mTitle) return mTitle[1];
  return null;
}

function extractKToken(html: string): string | null {
  // Try multiple formats as provided
  const meta = html.match(/<meta\s+name="_gg_fb"\s+content="([^"]+)"/i);
  if (meta) return meta[1];
  const win = html.match(/window\._xy_ws\s*=\s*"([^"]+)"/);
  if (win) return win[1];
  const lkdb = html.match(/window\._lk_db\s*=\s*\{\s*x:\s*"([^"]+)",\s*y:\s*"([^"]+)",\s*z:\s*"([^"]+)"\s*\}/);
  if (lkdb) return `${lkdb[1]}${lkdb[2]}${lkdb[3]}`;
  const comment = html.match(/<!--\s*_is_th:([^\s>]+)\s*-->/);
  if (comment) return comment[1];
  const dpi = html.match(/data-dpi="([^"]+)"/);
  if (dpi) return dpi[1];
  const nonce = html.match(/<script[^>]*nonce="([^"]+)"/i);
  if (nonce) return nonce[1];
  return null;
}

type SourcesResponse = {
  sources?: Array<{ file: string; type: string }>;
  tracks?: Array<{ file: string; label: string; kind: string }>;
};

async function scrapeMovie(ctx: MovieScrapeContext): Promise<SourcererOutput> {
  // 1) soapy embed page for movies by tmdb id
  const soapyUrl = `${SOAPY_ORIGIN}/embed/movies.php`;
  const soapyHtml = await ctx.proxiedFetcher<string>(soapyUrl, {
    query: { tmdbid: String(ctx.media.tmdbId), player: 'romio' },
    headers: SOAPY_HEADERS,
  });
  const iframeUrl = extractIframeSrc(soapyHtml);
  if (!iframeUrl) throw new NotFoundError('No iframe found');

  // 2) load streameeeeee embed html and attempt to get sources (with retries)
  const embedOrigin = new URL(iframeUrl).origin;
  const STREAM_HEADERS = { Referer: `${embedOrigin}/`, Origin: embedOrigin } as Record<string, string>;
  let file: string | null = null;
  let captions: any[] = [];

  for (let attempt = 0; attempt < 3 && !file; attempt++) {
    // fetch full response to capture set-cookie
    const iframeRes = await ctx.proxiedFetcher.full<string>(iframeUrl, {
      headers: {
        ...STREAM_HEADERS,
        'User-Agent': 'Mozilla/5.0',
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
      },
      readHeaders: ['set-cookie'],
    });
    const embedHtml = iframeRes.body;
    const setCookieHeader = iframeRes.headers.get('set-cookie') || '';
    const cookie = setCookieHeader
      .split(',')
      .map((c) => c.split(';')[0].trim())
      .filter((c) => c.length > 0)
      .join('; ');

    const id = extractIdFromEmbedHtml(embedHtml);
    const k = extractKToken(embedHtml);
    if (!id || !k) continue;

    // 3) get sources
    const sourcesRes = await ctx.proxiedFetcher<SourcesResponse>(`/embed-1/v3/e-1/getSources`, {
      baseUrl: embedOrigin,
      query: { id, _k: k },
      headers: {
        ...STREAM_HEADERS,
        'User-Agent': 'Mozilla/5.0',
        Accept: 'application/json, text/plain, */*',
        'Accept-Language': 'en-US,en;q=0.9',
        ...(cookie ? { Cookie: cookie } : {}),
      },
    });

    const candidate = sourcesRes?.sources?.[0]?.file || null;
    if (candidate) {
      file = candidate;
      captions = (sourcesRes?.tracks || [])
        .map((t, i) => {
          const language = labelToLanguageCode(t.label || '');
          const type = getCaptionTypeFromUrl(t.file || '');
          if (!type || !isValidLanguageCode(language)) return null;
          return {
            id: `soapy-${i + 1}`,
            url: t.file,
            type,
            language: language!,
            hasCorsRestrictions: true,
          };
        })
        .filter((x) => x !== null) as any[];

      // build and return immediately
      return {
        embeds: [],
        stream: [
          {
            id: 'primary',
            type: 'hls',
            playlist: createM3U8ProxyUrl(file, {
              ...STREAM_HEADERS,
              ...(cookie ? { Cookie: cookie } : {}),
            }),
            flags: [flags.CORS_ALLOWED],
            captions,
          },
        ],
      };
    }
  }

  if (!file) throw new NotFoundError('No HLS file');

  // fallback (should not be reached due to early return)
  throw new NotFoundError('No HLS file');
}

export const soapyScraper = makeSourcerer({
  id: 'soapy',
  name: 'Soapy',
  rank: 1,
  flags: [flags.CORS_ALLOWED],
  scrapeMovie,
});


