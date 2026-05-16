'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import Map from '@/components/Map'
import { site } from '@/lib/site'
import type { PoiCollection, PoiFeature } from '@/lib/data'

export default function MapPageClient() {
  const searchParams = useSearchParams()
  const countryParam = searchParams.get('country')

  const [all, setAll] = useState<PoiFeature[]>([])
  const [loading, setLoading] = useState(true)
  const [q, setQ] = useState('')
  const [selected, setSelected] = useState<PoiFeature | null>(null)
  const fittedRef = useRef<string | null>(null)

  useEffect(() => {
    let cancelled = false
    fetch('/data/points.geojson')
      .then(r => r.json())
      .then((gj: PoiCollection) => {
        if (cancelled) return
        setAll(gj.features || [])
        setLoading(false)
      })
      .catch(() => setLoading(false))
    return () => { cancelled = true }
  }, [])

  // Country filter (from ?country= or the search box implicitly).
  const countryFiltered = useMemo(() => {
    if (!countryParam) return all
    const c = countryParam.toLowerCase()
    return all.filter(f => (f.properties.country || '').toLowerCase() === c)
  }, [all, countryParam])

  const visible = useMemo(() => {
    const term = q.trim().toLowerCase()
    if (!term) return countryFiltered
    return countryFiltered.filter(f => {
      const p = f.properties
      return (
        p.name.toLowerCase().includes(term) ||
        (p.country || '').toLowerCase().includes(term) ||
        (p.locality || '').toLowerCase().includes(term)
      )
    })
  }, [countryFiltered, q])

  // Fit to the country subset once after data loads / param changes.
  const fitTo = useMemo(() => {
    if (!countryParam) return null
    const key = countryParam
    if (fittedRef.current === key) return null
    if (countryFiltered.length === 0) return null
    fittedRef.current = key
    return countryFiltered
  }, [countryParam, countryFiltered])

  const searchResults = useMemo(() => {
    const term = q.trim().toLowerCase()
    if (term.length < 2) return []
    return countryFiltered
      .filter(f => f.properties.name.toLowerCase().includes(term))
      .slice(0, 12)
  }, [countryFiltered, q])

  return (
    <main style={{ position: 'relative', width: '100vw', height: '100vh', overflow: 'hidden', background: 'var(--c-bg)' }}>
      {/* Sidebar */}
      <aside
        style={{
          position: 'absolute', top: 0, left: 0, bottom: 0, width: 300, zIndex: 1000,
          background: 'var(--c-panel)', borderRight: '1px solid var(--c-line)',
          display: 'flex', flexDirection: 'column', backdropFilter: 'blur(6px)',
        }}
        className="wm-hide-mobile"
      >
        <div style={{ padding: '1.1rem 1.25rem', borderBottom: '1px solid var(--c-line)' }}>
          <Link href="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.5rem', fontFamily: 'var(--font-serif)', color: 'var(--c-primary)', fontSize: '1.15rem', fontWeight: 600 }}>
            <span>{site.emoji}</span><span>{site.name}</span>
          </Link>
        </div>
        <div style={{ padding: '1rem 1.25rem' }}>
          <input
            value={q}
            onChange={e => setQ(e.target.value)}
            placeholder={`Search ${site.itemPlural}…`}
            style={{
              width: '100%', padding: '0.6rem 0.8rem', borderRadius: 6,
              border: '1px solid var(--c-line)', fontFamily: 'var(--font-sans)',
              fontSize: '0.9rem', color: 'var(--c-ink)', background: '#fff', outline: 'none',
            }}
          />
          {countryParam && (
            <div style={{ marginTop: '0.7rem', fontSize: '0.8rem', fontFamily: 'var(--font-sans)', color: 'var(--c-mute)' }}>
              Filtered to <strong style={{ color: 'var(--c-primary)' }}>{countryParam}</strong> ·{' '}
              <Link href="/map" style={{ color: 'var(--c-accent)' }}>clear</Link>
            </div>
          )}
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: '0 1.25rem 1.25rem' }}>
          {searchResults.length > 0 ? (
            searchResults.map(f => (
              <button
                key={f.properties.id}
                onClick={() => setSelected(f)}
                style={{
                  display: 'block', width: '100%', textAlign: 'left', background: 'transparent',
                  border: 'none', borderBottom: '1px solid var(--c-line)', padding: '0.6rem 0',
                  cursor: 'pointer', fontFamily: 'var(--font-sans)',
                }}
              >
                <div style={{ color: 'var(--c-ink)', fontWeight: 500, fontSize: '0.9rem' }}>{f.properties.name}</div>
                <div style={{ color: 'var(--c-mute)', fontSize: '0.78rem' }}>
                  {[f.properties.locality, f.properties.country].filter(Boolean).join(', ') || f.properties.badge}
                </div>
              </button>
            ))
          ) : (
            <p style={{ fontFamily: 'var(--font-sans)', fontSize: '0.82rem', color: 'var(--c-mute)', lineHeight: 1.6 }}>
              {loading
                ? 'Loading data…'
                : `${visible.length.toLocaleString('en-US')} ${site.itemPlural} shown. Type to search, or click a marker.`}
            </p>
          )}
        </div>
        <div style={{ padding: '0.9rem 1.25rem', borderTop: '1px solid var(--c-line)', fontFamily: 'var(--font-sans)', fontSize: '0.72rem', color: 'var(--c-mute)' }}>
          Data: <a href={site.dataCreditUrl} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--c-accent)' }}>{site.dataCredit}</a>
        </div>
      </aside>

      {/* Map */}
      <div style={{ position: 'absolute', inset: 0 }} className="wm-map-viewport">
        <Map features={visible} selected={selected} onSelect={setSelected} fitTo={fitTo} />
      </div>

      {/* Info panel */}
      {selected && (
        <div
          className="wm-info-panel"
          style={{
            position: 'absolute', top: 16, right: 16, width: 320, zIndex: 1200,
            background: 'var(--c-panel)', border: '1px solid var(--c-line)',
            borderRadius: 12, padding: '1.2rem 1.3rem', backdropFilter: 'blur(8px)',
            boxShadow: '0 12px 36px -10px rgba(20,20,20,0.3)',
          }}
        >
          <button
            onClick={() => setSelected(null)}
            aria-label="Close"
            style={{ position: 'absolute', top: 10, right: 12, background: 'transparent', border: 'none', color: 'var(--c-mute)', fontSize: '1.1rem', cursor: 'pointer' }}
          >×</button>
          <div style={{ fontFamily: 'var(--font-sans)', fontSize: '0.7rem', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--c-accent)' }}>
            {selected.properties.badge}
          </div>
          <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.5rem', color: 'var(--c-primary)', margin: '0.3rem 0 0.5rem', fontWeight: 600 }}>
            {selected.properties.name}
          </h2>
          <div style={{ fontFamily: 'var(--font-sans)', fontSize: '0.88rem', color: 'var(--c-warm)' }}>
            {[selected.properties.locality, selected.properties.region, selected.properties.country].filter(Boolean).join(', ')}
          </div>
          {selected.properties.stat && (
            <div style={{ marginTop: '0.8rem', fontFamily: 'var(--font-sans)', fontSize: '0.9rem', color: 'var(--c-ink)' }}>
              {selected.properties.stat}
            </div>
          )}
          {selected.properties.tags.length > 0 && (
            <div style={{ marginTop: '0.8rem', display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
              {selected.properties.tags.map(t => (
                <span key={t} style={{ fontFamily: 'var(--font-sans)', fontSize: '0.72rem', background: 'var(--c-bg)', color: 'var(--c-warm)', border: '1px solid var(--c-line)', borderRadius: 999, padding: '0.15rem 0.6rem' }}>{t}</span>
              ))}
            </div>
          )}
          {selected.properties.website && (
            <a
              href={selected.properties.website}
              target="_blank"
              rel="noopener noreferrer"
              style={{ display: 'inline-block', marginTop: '1rem', fontFamily: 'var(--font-sans)', fontSize: '0.85rem', color: 'var(--c-accent)', textDecoration: 'none', fontWeight: 500 }}
            >
              Visit website →
            </a>
          )}
        </div>
      )}
    </main>
  )
}
