import type { Metadata } from 'next'
import { Suspense } from 'react'
import MapPageClient from '@/components/MapPageClient'
import { site } from '@/lib/site'

export const metadata: Metadata = {
  title: site.mapTitle,
  description: site.mapDescription,
  alternates: { canonical: `${site.url}/map` },
  openGraph: { title: site.mapTitle, description: site.mapDescription, url: `${site.url}/map`, type: 'website' },
}

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'WebApplication',
  name: site.name,
  applicationCategory: 'TravelApplication',
  url: `${site.url}/map`,
  description: site.mapDescription,
  offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
  operatingSystem: 'Any',
}

export default function MapPage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <Suspense fallback={<div style={{ background: 'var(--c-primary-deep)', color: 'var(--c-accent)', height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-serif)' }}>Loading map…</div>}>
        <MapPageClient />
      </Suspense>
    </>
  )
}

export const dynamic = 'force-dynamic'
