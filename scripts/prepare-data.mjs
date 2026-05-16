// Build public/data/points.geojson from OpenStreetMap via the Overpass
// API, tagging each point with its country using Natural Earth borders.
//
// Usage: SITE=climbing node scripts/prepare-data.mjs
//        (SITE defaults to the `key` in lib/site.ts via package name)
//
// The world is fetched in longitude/latitude tiles so no single Overpass
// query times out, then de-duplicated by OSM type+id.

import { promises as fs } from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import whichPolygonFactory from 'which-polygon'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.join(__dirname, '..')
const SHARED = path.join(ROOT, '..', '_worldmap_data')

// ---- Per-site config -------------------------------------------------
const SITES = {
  climbing: {
    selector: '["sport"="climbing"]',
    badge: 'Climbing spot',
    stat: (t) => {
      if (t['climbing:sport'] === 'yes' || t.climbing === 'route_bottom') return 'Sport climbing'
      if (t['climbing:boulder'] === 'yes' || t.climbing === 'boulder') return 'Bouldering'
      if (t['climbing:trad'] === 'yes') return 'Trad climbing'
      if (t.leisure === 'sports_centre' || t.building) return 'Indoor climbing gym'
      if (t.natural === 'cliff' || t['climbing:rock']) return 'Natural crag'
      return 'Climbing area'
    },
    tags: (t) => {
      const out = []
      if (t['climbing:sport'] === 'yes') out.push('Sport')
      if (t['climbing:boulder'] === 'yes') out.push('Boulder')
      if (t['climbing:trad'] === 'yes') out.push('Trad')
      if (t['climbing:multipitch'] === 'yes') out.push('Multipitch')
      if (t['climbing:rock']) out.push(cap(t['climbing:rock']))
      if (t['climbing:grade:uiaa:max'] || t['climbing:grade:french:max']) out.push('Graded routes')
      if (t.indoor === 'yes' || t.leisure === 'sports_centre') out.push('Indoor')
      return out.slice(0, 6)
    },
  },
  sailing: {
    selector: '["leisure"="marina"]',
    badge: 'Marina',
    stat: (t) => {
      if (t.capacity) return `${t.capacity} berths`
      if (t.seamark_harbour_category) return cap(String(t.seamark_harbour_category).replace(/_/g, ' '))
      return 'Marina'
    },
    tags: (t) => {
      const out = []
      if (t.capacity) out.push(`${t.capacity} berths`)
      if (t.fuel === 'yes' || t['fuel:diesel'] === 'yes') out.push('Fuel')
      if (t.power_supply === 'yes' || t.electricity === 'yes') out.push('Shore power')
      if (t.drinking_water === 'yes') out.push('Water')
      if (t.shower === 'yes') out.push('Showers')
      if (t.toilets === 'yes') out.push('Toilets')
      if (t.sanitary_dump_station === 'yes') out.push('Pump-out')
      return out.slice(0, 6)
    },
  },
  fishing: {
    selector: '["leisure"="fishing"]',
    badge: 'Fishing spot',
    stat: (t) => {
      if (t.fishing && t.fishing !== 'yes') return cap(String(t.fishing).replace(/_/g, ' ')) + ' fishing'
      if (t.access === 'private') return 'Private fishing'
      if (t.access === 'customers' || t.fee === 'yes') return 'Paid / permit fishing'
      return 'Fishing area'
    },
    tags: (t) => {
      const out = []
      if (t.fishing && t.fishing !== 'yes') out.push(cap(String(t.fishing).replace(/_/g, ' ')))
      if (t.fish) out.push(cap(String(t.fish).replace(/[_;]/g, ' ')))
      if (t.access === 'private') out.push('Private')
      if (t.fee === 'yes') out.push('Permit / fee')
      if (t.fee === 'no' || t.access === 'yes') out.push('Free access')
      if (t.water || t.natural === 'water') out.push('Waterside')
      return out.slice(0, 6)
    },
  },
}

function cap(s) { return String(s).charAt(0).toUpperCase() + String(s).slice(1) }

const SITE = process.env.SITE || JSON.parse(await fs.readFile(path.join(ROOT, 'package.json'), 'utf8')).name.replace('worldmap', '')
const cfg = SITES[SITE]
if (!cfg) { console.error(`Unknown SITE "${SITE}". Use one of: ${Object.keys(SITES).join(', ')}`); process.exit(1) }
console.log(`[prepare-data] site=${SITE} selector=${cfg.selector}`)

// ---- Natural Earth country borders (cached & shared) -----------------
const NE_FILE = path.join(SHARED, 'ne_110m_admin_0_countries.geojson')
const NE_URL = 'https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_110m_admin_0_countries.geojson'

async function loadCountries() {
  await fs.mkdir(SHARED, { recursive: true })
  let raw
  try {
    raw = await fs.readFile(NE_FILE, 'utf8')
  } catch {
    console.log('[prepare-data] downloading Natural Earth borders…')
    const res = await fetch(NE_URL)
    if (!res.ok) throw new Error(`NE download failed: ${res.status}`)
    raw = await res.text()
    await fs.writeFile(NE_FILE, raw)
  }
  const gj = JSON.parse(raw)
  for (const f of gj.features) {
    const p = f.properties
    p.__name = p.ADMIN || p.NAME || p.NAME_LONG || p.SOVEREIGNT || null
    p.__iso = (p.ISO_A2 && p.ISO_A2 !== '-99') ? p.ISO_A2 : (p.ISO_A2_EH || null)
  }
  return whichPolygonFactory(gj)
}

// ---- Overpass tiled fetch -------------------------------------------
// Primary endpoint is hit repeatedly with patient back-off (rotating
// mirrors just trips their rate limits faster). The mirror is only a
// last resort after several primary failures.
const PRIMARY = 'https://overpass-api.de/api/interpreter'
const MIRROR = 'https://overpass.kumi.systems/api/interpreter'

// A real, identifying User-Agent is required — the public Overpass
// instances answer 403/406 to the bare Node fetch UA.
const HEADERS = {
  'Content-Type': 'application/x-www-form-urlencoded',
  'Accept': 'application/json,*/*',
  'User-Agent': 'worldmap-data-prep/1.0 (+https://github.com/Zumx; zumxet@gmail.com)',
}

const sleep = (ms) => new Promise(r => setTimeout(r, ms))

async function overpass(query, attempt = 0) {
  const ep = attempt >= 4 && attempt % 2 === 1 ? MIRROR : PRIMARY
  try {
    const res = await fetch(ep, { method: 'POST', headers: HEADERS, body: 'data=' + encodeURIComponent(query) })
    if (!res.ok) {
      const body = await res.text().catch(() => '')
      throw new Error(`HTTP ${res.status}${body ? ' ' + body.slice(0, 120).replace(/\s+/g, ' ') : ''}`)
    }
    return await res.json()
  } catch (e) {
    if (attempt >= 12) throw e
    // 429/504 = load — wait long. Others — shorter.
    const slow = /HTTP (429|504|502|403|406)/.test(e.message)
    const wait = Math.min(120000, (slow ? 15000 : 5000) * (attempt + 1))
    console.log(`[prepare-data]   retry #${attempt + 1} (${ep.split('//')[1].split('/')[0]} → ${e.message}) in ${Math.round(wait / 1000)}s`)
    await sleep(wait)
    return overpass(query, attempt + 1)
  }
}

// Longitude bands keep each response well under the Overpass size cap.
const LON_STEP = 30 // 12 bands
const LAT_SPLIT = [[-90, 12], [12, 90]] // dense north hemisphere split

async function fetchAll() {
  const seen = new Set()
  const features = []
  const bands = []
  for (let lon = -180; lon < 180; lon += LON_STEP) {
    for (const [s, n] of LAT_SPLIT) bands.push([s, lon, n, lon + LON_STEP])
  }
  let i = 0
  for (const [s, w, n, e] of bands) {
    i++
    const q = `[out:json][timeout:600];
(
  nwr${cfg.selector}(${s},${w},${n},${e});
);
out tags center;`
    process.stdout.write(`[prepare-data] tile ${i}/${bands.length} bbox(${s},${w},${n},${e}) … `)
    const json = await overpass(q)
    let added = 0
    for (const el of json.elements || []) {
      const key = `${el.type[0]}${el.id}`
      if (seen.has(key)) continue
      const lat = el.type === 'node' ? el.lat : el.center?.lat
      const lon = el.type === 'node' ? el.lon : el.center?.lon
      if (typeof lat !== 'number' || typeof lon !== 'number') continue
      const t = el.tags || {}
      const name = (t.name || t['name:en'] || t.official_name || '').replace(/\s+/g, ' ').trim() || null
      if (!name) continue // unnamed points add noise on a discovery map
      seen.add(key)
      features.push({ key, lat, lon, t, name })
      added++
    }
    console.log(`${added} new (total ${features.length})`)
    await sleep(1200) // be polite to the public endpoint
  }
  return features
}

// ---- Build GeoJSON ---------------------------------------------------
async function main() {
  const findCountry = await loadCountries()
  const raw = await fetchAll()
  console.log(`[prepare-data] tagging ${raw.length} points with country…`)

  const out = []
  for (const r of raw) {
    const hit = findCountry([r.lon, r.lat])
    const t = r.t
    out.push({
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [round(r.lon), round(r.lat)] },
      properties: {
        id: r.key,
        name: r.name,
        country: hit?.__name || t['addr:country'] || null,
        countryCode: hit?.__iso || null,
        region: t['addr:state'] || t['addr:province'] || null,
        locality: t['addr:city'] || t['addr:town'] || t['addr:village'] || null,
        website: clean(t.website || t['contact:website'] || t.url || null),
        badge: cfg.badge,
        stat: cfg.stat(t),
        tags: cfg.tags(t),
      },
    })
  }
  out.sort((a, b) => a.properties.name.localeCompare(b.properties.name))

  const fc = { type: 'FeatureCollection', features: out }
  const dest = path.join(ROOT, 'public', 'data', 'points.geojson')
  await fs.mkdir(path.dirname(dest), { recursive: true })
  await fs.writeFile(dest, JSON.stringify(fc))
  const countries = new Set(out.map(f => f.properties.country).filter(Boolean))
  console.log(`[prepare-data] wrote ${out.length} features, ${countries.size} countries → ${path.relative(ROOT, dest)}`)
}

function round(n) { return Math.round(n * 1e5) / 1e5 }
function clean(u) {
  if (!u) return null
  const s = String(u).trim()
  if (!s) return null
  return /^https?:\/\//i.test(s) ? s : `https://${s}`
}

main().catch(e => { console.error(e); process.exit(1) })
