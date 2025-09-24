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
        embedId: 'vidify-alfa',
        url: JSON.stringify(query),
      },
      {
        embedId: 'vidify-bravo',
        url: JSON.stringify(query),
      },
      {
        embedId: 'vidify-charlie',
        url: JSON.stringify(query),
      },
      {
        embedId: 'vidify-delta',
        url: JSON.stringify(query),
      },
      {
        embedId: 'vidify-echo',
        url: JSON.stringify(query),
      },
      {
        embedId: 'vidify-foxtrot',
        url: JSON.stringify(query),
      },
      {
        embedId: 'vidify-golf',
        url: JSON.stringify(query),
      },
      {
        embedId: 'vidify-hotel',
        url: JSON.stringify(query),
      },
      {
        embedId: 'vidify-india',
        url: JSON.stringify(query),
      },
      {
        embedId: 'vidify-juliett',
        url: JSON.stringify(query),
      },
    ],
  };
}

export const vidifyScraper = makeSourcerer({
  id: 'vidify',
  name: 'Vidify',
  rank: 124,
  disabled: true,
  flags: [],
  scrapeMovie: comboScraper,
  scrapeShow: comboScraper,
});
