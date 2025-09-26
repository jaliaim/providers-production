import { flags } from '@/entrypoint/utils/targets';
import { SourcererOutput, makeSourcerer } from '@/providers/base';
import { MovieScrapeContext, ShowScrapeContext } from '@/utils/context';
import { NotFoundError } from '@/utils/errors';

const comboScraper = async (ctx: MovieScrapeContext | ShowScrapeContext): Promise<SourcererOutput> => {
  let urlPath;

  if (ctx.media.type === 'movie') {
    urlPath = `/movie/${ctx.media.tmdbId}`;
  } else if (ctx.media.type === 'show') {
    urlPath = `/tv/${ctx.media.tmdbId}/${ctx.media.season.number}/${ctx.media.episode.number}`;
  } else {
    throw new Error('Unsupported media type');
  }

  const scrapeUrl = `https://scrape.lordflix.club/api/scrape?url=https://111movies.com${urlPath}&waitForDomain="https://nebulavault823.xyz`;

  const networkLog = await ctx.fetcher<any>(scrapeUrl);

  const streamRequest = networkLog.requests.find((req: any) => req.url.includes('.m3u8'));

  if (!streamRequest) {
    throw new NotFoundError('No M3U8 stream found in network requests');
  }

  return {
    embeds: [],
    stream: [
      {
        id: 'primary',
        type: 'hls',
        playlist: streamRequest.url,
        flags: [flags.CORS_ALLOWED],
        captions: [],
      },
    ],
  };
};
//sasdasdsad 
export const oneoneoneScraper = makeSourcerer({
  id: '111movie',
  name: 'Rocket',
  rank: 400,
  flags: [flags.CORS_ALLOWED],
  scrapeMovie: comboScraper,
  scrapeShow: comboScraper,
});