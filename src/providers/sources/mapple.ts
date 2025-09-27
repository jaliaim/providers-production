import { flags } from '@/entrypoint/utils/targets';
import { SourcererOutput, makeSourcerer } from '@/providers/base';
import { MovieScrapeContext, ShowScrapeContext } from '@/utils/context';
import { NotFoundError } from '@/utils/errors';
import { createM3U8ProxyUrl } from '@/utils/proxy';

const baseUrl = 'https://mapple.uk';

async function comboScraper(ctx: ShowScrapeContext | MovieScrapeContext): Promise<SourcererOutput> {
  const mediaType = ctx.media.type;
  const tmdbId = ctx.media.tmdbId;

  let url = '';
  let body: any = [];

  if (mediaType === 'movie') {
    url = `${baseUrl}/watch/movie/${tmdbId}?autoPlay=false`;
    body = [
      {
        mediaId: Number(tmdbId),
        mediaType: 'movie',
        tv_slug: '',
      },
    ];
  } else {
    url = `${baseUrl}/watch/tv/${tmdbId}-${ctx.media.season.number}/${ctx.media.episode.number}?autoPlay=false&autoNext=false`;
    body = [
      {
        mediaId: Number(tmdbId),
        mediaType: 'tv',
        tv_slug: `${ctx.media.season.number}-${ctx.media.episode.number}`,
      },
    ];
  }

  const response = (
    await ctx.proxiedFetcher<string>(url, {
      method: 'POST',
      headers: {
        Accept: 'text/x-component',
        'Accept-Encoding': 'gzip, deflate, br, zstd',
        'Accept-Language': 'en-US,en;q=0.5',
        Connection: 'keep-alive',
        'Content-Type': 'text/plain;charset=UTF-8',
        Host: 'mapple.uk',
        'Next-Action': '40b6aee60efbf1ae586fc60e3bf69babebf2ceae2c',
        'Next-Router-State-Tree':
          '%5B%22%22%2C%7B%22children%22%3A%5B%22watch%22%2C%7B%22children%22%3A%5B%22movie%22%2C%7B%22children%22%3A%5B%5B%22id%22%2C%22557%22%2C%22d%22%5D%2C%7B%22children%22%3A%5B%22__PAGE__%3F%7B%5C%22autoPlay%5C%22%3A%5C%22false%5C%22%7D%22%2C%7B%7D%2C%22%2Fwatch%2Fmovie%2F557%3FautoPlay%3Dfalse%22%2C%22refresh%22%5D%7D%5D%7D%5D%7D%5D%7D%2Cnull%2Cnull%2Ctrue%5D',
        Origin: 'https://mapple.uk',
        Priority: 'u=4',
        Referer: 'https://mapple.uk/',
        'Sec-Fetch-Dest': 'empty',
        'Sec-Fetch-Mode': 'cors',
        'Sec-Fetch-Site': 'same-origin',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:142.0) Gecko/20100101 Firefox/142.0',
      },
      body: JSON.stringify(body),
    })
  )
    .split('\n')
    .find((p) => p.startsWith('1:'));

  if (!response) throw new NotFoundError('Could not find stream data in response');

  const streamData = JSON.parse(response.substring(2));

  if (!streamData.success || !streamData.data.stream_url) {
    throw new NotFoundError('Stream data indicates failure or is missing URL');
  }

  const streamUrl = streamData.data.stream_url;

  return {
    stream: [
      {
        id: 'primary',
        type: 'hls',
        playlist: createM3U8ProxyUrl(streamUrl, {
          Origin: 'https://mapple.uk',
          Referer: 'https://mapple.uk/',
        }),
        flags: [flags.CORS_ALLOWED],
        captions: [],
      },
    ],
    embeds: [],
  };
}

export const mappleTvScraper = makeSourcerer({
  id: 'mappletv',
  name: 'Kirk (4K)',
  rank: 10,
  flags: [flags.CORS_ALLOWED],
  scrapeMovie: comboScraper,
  scrapeShow: comboScraper,
});