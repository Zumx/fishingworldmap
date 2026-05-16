'use client'

import dynamic from 'next/dynamic'

const MapComponent = dynamic(() => import('./MapComponent'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--c-primary-deep)' }}>
      <div style={{ color: 'var(--c-accent)', fontFamily: 'var(--font-serif)', fontSize: '1.1rem' }} className="animate-pulse">Loading map…</div>
    </div>
  ),
})

export default MapComponent
