// Single source of per-site variation. The three world-map sites
// (climbing / sailing / fishing) share identical components and only
// differ in this file, the colour tokens in globals.css, and
// public/data/points.geojson.

export interface SiteConfig {
  key: string
  name: string
  shortName: string
  emoji: string
  url: string
  tagline: string
  heroKicker: string
  heroTitleA: string
  heroTitleEm: string
  heroSub: (count: string, countries: string) => string
  metaTitle: string
  metaDescription: string
  mapTitle: string
  mapDescription: string
  itemSingular: string
  itemPlural: string
  dataCredit: string
  dataCreditUrl: string
  /** Leaflet marker / cluster colours (JS strings — CSS vars can't reach Leaflet). */
  marker: { dot: string; ring: string; cluster1: string; cluster2: string; cluster3: string; pulse: string }
}

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ||
  (process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : 'https://fishingworldmap.vercel.app')

export const site: SiteConfig = {
  key: 'fishing',
  name: 'Fishing World Map',
  shortName: 'Fishing World Map',
  emoji: '🎣',
  url: SITE_URL,
  tagline: 'Every fishing spot on Earth, on one map',
  heroKicker: 'The fishing world, mapped',
  heroTitleA: 'Every lake, every bank,',
  heroTitleEm: 'one map.',
  heroSub: (count, countries) =>
    `Browse ${count} fishing spots across ${countries} countries — from stocked still-waters to wild river banks and coastal marks. Pan the globe, search a water, see what's there at a glance.`,
  metaTitle: 'Fishing World Map — Interactive Map of Fishing Spots Worldwide',
  metaDescription:
    'Explore every fishing spot on Earth on one interactive map. Search waters, see access and species, and find your next session.',
  mapTitle: 'Interactive Fishing Map — Every Fishing Spot Worldwide | Fishing World Map',
  mapDescription:
    'Pan and zoom a world map of fishing spots. Click any water for its access, species and website.',
  itemSingular: 'fishing spot',
  itemPlural: 'fishing spots',
  dataCredit: 'OpenStreetMap contributors',
  dataCreditUrl: 'https://www.openstreetmap.org/copyright',
  marker: {
    dot: '#4a7d3f',
    ring: '#f5f1e6',
    cluster1: 'rgba(106,156,74,0.85)',
    cluster2: 'rgba(122,104,52,0.92)',
    cluster3: 'rgba(74,70,38,0.93)',
    pulse: '#6a9c4a',
  },
}
