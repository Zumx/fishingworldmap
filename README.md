# Fishing World Map

Every fishing spot on Earth on one interactive map. Next.js 16 + Leaflet,
data served as a single static GeoJSON file (no database).

## Stack

- Next.js 16 (App Router) + React 19
- Leaflet + Leaflet.markercluster (client-only map)
- Static `public/data/points.geojson` — read server-side for home-page
  counts, fetched client-side by the map.

## Data

`points.geojson` is built from OpenStreetMap (`leisure=fishing`) via the
Overpass API and tagged with country borders from Natural Earth:

```bash
npm run data
```

The world is fetched in bounding-box tiles to stay under Overpass limits
and de-duplicated by OSM type+id. Natural Earth borders are cached in
`../_worldmap_data/` and shared across the sibling world-map sites.

## Develop

```bash
npm install
npm run dev
```

## Theme

All per-site variation lives in `lib/site.ts` (copy, marker colours) and
the token block at the top of `app/globals.css`. Everything else is
generic and shared with the sibling sites (climbing / sailing world maps).

Data © OpenStreetMap contributors.
