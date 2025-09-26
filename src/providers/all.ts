import { Embed, Sourcerer } from '@/providers/base';
import { doodScraper } from '@/providers/embeds/dood';
import { mixdropScraper } from '@/providers/embeds/mixdrop';
import { turbovidScraper } from '@/providers/embeds/turbovid';
import { upcloudScraper } from '@/providers/embeds/upcloud';
import { autoembedScraper } from '@/providers/sources/autoembed';
import { ee3Scraper } from '@/providers/sources/ee3';
import { fsharetvScraper } from '@/providers/sources/fsharetv';
import { insertunitScraper } from '@/providers/sources/insertunit';
import { mp4hydraScraper } from '@/providers/sources/mp4hydra';
import { nepuScraper } from '@/providers/sources/nepu';
import { pirxcyScraper } from '@/providers/sources/pirxcy';
import { tugaflixScraper } from '@/providers/sources/tugaflix';
import { vidsrcScraper } from '@/providers/sources/vidsrc';
import { vidsrcvipScraper } from '@/providers/sources/vidsrcvip';
import { zoechipScraper } from '@/providers/sources/zoechip';
import { mappleTvScraper } from '@/providers/sources/mapple';

import { AnimetsuEmbeds } from './embeds/animetsu';
import {
  autoembedBengaliScraper,
  autoembedEnglishScraper,
  autoembedHindiScraper,
  autoembedTamilScraper,
  autoembedTeluguScraper,
} from './embeds/autoembed';
import { cinemaosEmbeds } from './embeds/cinemaos';
import { closeLoadScraper } from './embeds/closeload';
import { madplayBaseEmbed, madplayNsapiEmbed, madplayNsapiVidFastEmbed, madplayRoperEmbed } from './embeds/madplay';
import { mp4hydraServer1Scraper, mp4hydraServer2Scraper } from './embeds/mp4hydra';
import { myanimedubScraper } from './embeds/myanimedub';
import { myanimesubScraper } from './embeds/myanimesub';
import { ridooScraper } from './embeds/ridoo';
import { streamtapeLatinoScraper, streamtapeScraper } from './embeds/streamtape';
import { streamvidScraper } from './embeds/streamvid';
import {
  streamwishEnglishScraper,
  streamwishJapaneseScraper,
  streamwishLatinoScraper,
  streamwishSpanishScraper,
} from './embeds/streamwish';
import { vidCloudScraper } from './embeds/vidcloud';
import { vidifyEmbeds } from './embeds/vidify';
import {
  vidnestAllmoviesEmbed,
  vidnestFlixhqEmbed,
  vidnestHollymoviehdEmbed,
  vidnestOfficialEmbed,
} from './embeds/vidnest';
import {
  VidsrcsuServer10Scraper,
  VidsrcsuServer11Scraper,
  VidsrcsuServer12Scraper,
  VidsrcsuServer1Scraper,
  VidsrcsuServer20Scraper,
  VidsrcsuServer2Scraper,
  VidsrcsuServer3Scraper,
  VidsrcsuServer4Scraper,
  VidsrcsuServer5Scraper,
  VidsrcsuServer6Scraper,
  VidsrcsuServer7Scraper,
  VidsrcsuServer8Scraper,
  VidsrcsuServer9Scraper,
} from './embeds/vidsrcsu';
import { viperScraper } from './embeds/viper';
import { warezcdnembedHlsScraper } from './embeds/warezcdn/hls';
import { warezcdnembedMp4Scraper } from './embeds/warezcdn/mp4';
import { warezPlayerScraper } from './embeds/warezcdn/warezplayer';
import { zunimeEmbeds } from './embeds/zunime';
import { vidrockScraper } from './sources/vidrock';
import { hydrahdScraper } from './sources/hydrahd';
import { cosmicScraper } from './sources/cosmic';
import { fridayScraper } from './sources/friday';
import { easyScraper } from './sources/easy';
import { oneoneoneScraper } from './sources/111movies';

export function gatherAllSources(): Array<Sourcerer> {
  return [vidrockScraper, cosmicScraper, fridayScraper, mappleTvScraper, easyScraper, oneoneoneScraper,];
}

export function gatherAllEmbeds(): Array<Embed> {
  // all embeds are gathered here
  return [
    upcloudScraper,
    vidCloudScraper,
    mixdropScraper,
    ridooScraper,
    closeLoadScraper,
    doodScraper,
    streamvidScraper,
    streamtapeScraper,
    warezcdnembedHlsScraper,
    warezcdnembedMp4Scraper,
    warezPlayerScraper,
    autoembedEnglishScraper,
    autoembedHindiScraper,
    autoembedBengaliScraper,
    autoembedTamilScraper,
    autoembedTeluguScraper,
    turbovidScraper,
    mp4hydraServer1Scraper,
    mp4hydraServer2Scraper,
    VidsrcsuServer1Scraper,
    VidsrcsuServer2Scraper,
    VidsrcsuServer3Scraper,
    VidsrcsuServer4Scraper,
    VidsrcsuServer5Scraper,
    VidsrcsuServer6Scraper,
    VidsrcsuServer7Scraper,
    VidsrcsuServer8Scraper,
    VidsrcsuServer9Scraper,
    VidsrcsuServer10Scraper,
    VidsrcsuServer11Scraper,
    VidsrcsuServer12Scraper,
    VidsrcsuServer20Scraper,
    viperScraper,
    streamwishJapaneseScraper,
    streamwishLatinoScraper,
    streamwishSpanishScraper,
    streamwishEnglishScraper,
    streamtapeLatinoScraper,
    ...cinemaosEmbeds,
    // ...cinemaosHexaEmbeds,
    // vidsrcNovaEmbed,
    // vidsrcCometEmbed,
    // vidsrcPulsarEmbed,
    madplayBaseEmbed,
    madplayNsapiEmbed,
    madplayRoperEmbed,
    madplayNsapiVidFastEmbed,
    ...vidifyEmbeds,
    ...zunimeEmbeds,
    ...AnimetsuEmbeds,
    vidnestHollymoviehdEmbed,
    vidnestAllmoviesEmbed,
    vidnestFlixhqEmbed,
    vidnestOfficialEmbed,
    myanimesubScraper,
    myanimedubScraper,
  ];
}
