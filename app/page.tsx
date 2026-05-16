import Link from 'next/link'
import SiteNav from '@/components/SiteNav'
import { site } from '@/lib/site'
import { loadPoints } from '@/lib/data'

export const revalidate = 3600

export default async function Home() {
  const { features } = await loadPoints()

  const byCountry = new Map<string, number>()
  for (const f of features) {
    const c = f.properties.country
    if (c) byCountry.set(c, (byCountry.get(c) || 0) + 1)
  }
  const countries = [...byCountry.entries()].sort((a, b) => b[1] - a[1])
  const total = features.length.toLocaleString('en-US')
  const countryCount = byCountry.size.toLocaleString('en-US')
  const topCountries = countries.slice(0, 24)

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: site.name,
    url: site.url,
    description: site.metaDescription,
  }

  return (
    <div style={{ minHeight: '100vh' }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <SiteNav />

      <header
        style={{
          background: 'linear-gradient(180deg, var(--c-bg-light) 0%, var(--c-bg) 100%)',
          borderBottom: '1px solid var(--c-line)',
          padding: '5rem 2rem 3.5rem',
        }}
      >
        <div className="wm-fade-up" style={{ maxWidth: 1100, margin: '0 auto' }}>
          <p style={{ fontFamily: 'var(--font-sans)', fontSize: '0.78rem', letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--c-accent)', marginBottom: '1.1rem' }}>
            {site.heroKicker}
          </p>
          <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: 'clamp(2.4rem, 6vw, 4.4rem)', color: 'var(--c-primary)', lineHeight: 1.05, margin: 0, fontWeight: 500, letterSpacing: '-0.015em', maxWidth: 820 }}>
            {site.heroTitleA}<br />
            <em style={{ fontStyle: 'italic', color: 'var(--c-accent)' }}>{site.heroTitleEm}</em>
          </h1>
          <p style={{ fontFamily: 'var(--font-sans)', fontSize: '1.1rem', color: 'var(--c-warm)', marginTop: '1.4rem', lineHeight: 1.65, maxWidth: 640 }}>
            {site.heroSub(total, countryCount)}
          </p>
          <div style={{ marginTop: '2rem', display: 'flex', gap: '0.9rem', flexWrap: 'wrap' }}>
            <Link href="/map" style={{ background: 'var(--c-primary)', color: 'var(--c-accent)', padding: '0.9rem 1.6rem', borderRadius: 6, textDecoration: 'none', fontFamily: 'var(--font-sans)', fontWeight: 500, fontSize: '0.95rem', boxShadow: '0 4px 14px -4px rgba(44,48,52,0.4)' }}>
              Open the map →
            </Link>
          </div>

          <div style={{ marginTop: '3.5rem', display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', borderTop: '1px solid var(--c-line)', borderBottom: '1px solid var(--c-line)', padding: '1.25rem 0' }} className="wm-stack-mobile">
            {[
              [site.itemPlural.replace(/^\w/, c => c.toUpperCase()), total],
              ['Countries', countryCount],
            ].map(([label, value]) => (
              <div key={label} style={{ textAlign: 'center', padding: '0.4rem 0' }}>
                <div style={{ fontFamily: 'var(--font-serif)', fontSize: '2.4rem', color: 'var(--c-primary)', fontWeight: 500, lineHeight: 1 }}>{value}</div>
                <div style={{ fontFamily: 'var(--font-sans)', fontSize: '0.72rem', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--c-mute)', marginTop: '0.4rem' }}>{label}</div>
              </div>
            ))}
          </div>
        </div>
      </header>

      <main style={{ maxWidth: 1100, margin: '0 auto', padding: '4rem 2rem' }}>
        <section>
          <h2 className="wm-section-title">Top countries by {site.itemPlural}</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '0.75rem' }}>
            {topCountries.map(([name, n]) => (
              <Link key={name} href={`/map?country=${encodeURIComponent(name)}`} className="wm-card" style={{ padding: '0.85rem 1rem' }}>
                <strong style={{ display: 'block', color: 'var(--c-ink)', fontFamily: 'var(--font-serif)', fontSize: '1.1rem', fontWeight: 500 }}>{name}</strong>
                <span style={{ fontFamily: 'var(--font-sans)', fontSize: '0.78rem', color: 'var(--c-mute)' }}>
                  {n.toLocaleString('en-US')} {n === 1 ? site.itemSingular : site.itemPlural}
                </span>
              </Link>
            ))}
          </div>
        </section>
      </main>

      <footer style={{ background: 'var(--c-primary)', borderTop: '2px solid var(--c-accent)', padding: '2.5rem 2rem' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem', alignItems: 'baseline' }} className="wm-stack-mobile">
          <div style={{ fontFamily: 'var(--font-serif)', color: 'var(--c-accent)', fontSize: '1.1rem' }}>{site.emoji} {site.name}</div>
          <div style={{ fontFamily: 'var(--font-sans)', color: '#aaa', fontSize: '0.82rem' }}>
            Data: <a href={site.dataCreditUrl} target="_blank" rel="noopener noreferrer" style={{ color: '#ccc' }}>{site.dataCredit}</a> · {countryCount} countries · {total} {site.itemPlural}
          </div>
          <Link href="/map" style={{ color: '#e8e3dc', textDecoration: 'none', fontFamily: 'var(--font-sans)', fontSize: '0.85rem' }}>Open map →</Link>
        </div>
      </footer>
    </div>
  )
}
