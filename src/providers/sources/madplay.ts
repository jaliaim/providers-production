import { flags } from '@/entrypoint/utils/targets';
import { SourcererOutput, makeSourcerer } from '@/providers/base';
import { MovieScrapeContext, ShowScrapeContext } from '@/utils/context';

async function comboScraper(ctx: ShowScrapeContext | MovieScrapeContext): Promise<SourcererOutput> {
  const query = {
    type: ctx.media.type,
    title: ctx.media.title,
    tmdbId: ctx.media.tmdbId,
    imdbId: ctx.media.imdbId,
    ...(ctx.media.type === 'show' && {
      season: ctx.media.season.number,
      episode: ctx.media.episode.number,
    }),
    releaseYear: ctx.media.releaseYear,
  };

  return {
    embeds: [
      {
        embedId: 'madplay-base',
        url: JSON.stringify(query),
      },
      {
        embedId: 'madplay-nsapi',
        url: JSON.stringify(query),
      },
      {
        embedId: 'madplay-roper',
        url: JSON.stringify(query),
      },
      {
        embedId: 'madplay-vidfast',
        url: JSON.stringify(query),
      },
    ],
  };
}

export const madplayScraper = makeSourcerer({
  id: 'madplay',
  name: 'Flicky',
  rank: 155,
  disabled: true,
  flags: [flags.CORS_ALLOWED],
  scrapeMovie: comboScraper,
  scrapeShow: comboScraper,
});
