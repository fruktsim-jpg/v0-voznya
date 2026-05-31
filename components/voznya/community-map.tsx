'use client'

import { useState } from 'react'
import { ComposableMap, Geographies, Geography, Marker } from 'react-simple-maps'
import { Reveal } from './reveal'

type City = {
  name: string
  coordinates: [number, number]
  anchor?: 'start' | 'middle' | 'end'
  dx?: number
  dy?: number
}

const CITIES: City[] = [
  { name: 'Groningen', coordinates: [6.5665, 53.2194], anchor: 'start', dx: 9 },
  { name: 'Zwolle', coordinates: [6.083, 52.5168], anchor: 'start', dx: 9 },
  { name: 'Amsterdam', coordinates: [4.9041, 52.3676], anchor: 'end', dx: -9 },
  { name: 'Den Haag', coordinates: [4.3007, 52.0705], anchor: 'end', dx: -9 },
  { name: 'Utrecht', coordinates: [5.1214, 52.0907], anchor: 'start', dx: 9, dy: 4 },
  { name: 'Rotterdam', coordinates: [4.4777, 51.9244], anchor: 'end', dx: -9, dy: 6 },
  { name: 'Arnhem', coordinates: [5.8987, 51.9851], anchor: 'start', dx: 9 },
  { name: 'Nijmegen', coordinates: [5.852, 51.8126], anchor: 'start', dx: 9 },
  { name: 'Tilburg', coordinates: [5.0913, 51.5555], anchor: 'middle', dy: -12 },
  { name: 'Eindhoven', coordinates: [5.4697, 51.4416], anchor: 'start', dx: 9 },
]

export function CommunityMap() {
  const [active, setActive] = useState<string | null>(null)

  return (
    <section className="relative px-6 py-24 sm:py-32">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute left-1/2 top-1/2 h-[500px] w-[500px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/10 blur-[120px]"
      />
      <div className="relative mx-auto max-w-4xl text-center">
        <Reveal>
          <h2 className="text-4xl font-bold tracking-tight text-balance sm:text-5xl">
            Карта <span className="text-gradient">сообщества</span>
          </h2>
        </Reveal>
        <Reveal delay={0.08}>
          <p className="mx-auto mt-5 max-w-xl text-base text-muted-foreground text-pretty sm:text-lg">
            Участники ВОЗНИ живут в 10+ городах по всей стране.
          </p>
        </Reveal>

        <Reveal delay={0.12}>
          <div className="relative mx-auto mt-12 max-w-xl rounded-3xl border border-border bg-[#0b0b10] p-4 sm:p-6">
            <ComposableMap
              projection="geoMercator"
              projectionConfig={{ center: [5.45, 52.2], scale: 5600 }}
              width={600}
              height={560}
              style={{ width: '100%', height: 'auto', position: 'relative' }}
            >
              <defs>
                <linearGradient id="provinceFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="rgba(168,85,247,0.32)" />
                  <stop offset="100%" stopColor="rgba(124,58,237,0.16)" />
                </linearGradient>
                <filter id="markerGlow" x="-80%" y="-80%" width="260%" height="260%">
                  <feGaussianBlur stdDeviation="4" result="blur" />
                  <feMerge>
                    <feMergeNode in="blur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
              </defs>

              <Geographies geography="/geo/netherlands.json">
                {({ geographies }) =>
                  geographies.map((geo) => (
                    <Geography
                      key={geo.rsmKey}
                      geography={geo}
                      fill="url(#provinceFill)"
                      stroke="rgba(196,150,255,0.8)"
                      strokeWidth={1}
                      style={{
                        default: { outline: 'none' },
                        hover: { outline: 'none', fill: 'rgba(168,85,247,0.45)' },
                        pressed: { outline: 'none' },
                      }}
                    />
                  ))
                }
              </Geographies>

              {CITIES.map((city) => {
                const isActive = active === city.name
                return (
                  <Marker
                    key={city.name}
                    coordinates={city.coordinates}
                    onMouseEnter={() => setActive(city.name)}
                    onMouseLeave={() => setActive(null)}
                  >
                    <g style={{ cursor: 'pointer' }}>
                      {/* pulse */}
                      <circle r={5} fill="#a855f7" opacity={0.5}>
                        <animate
                          attributeName="r"
                          values="5;18;5"
                          dur="2.4s"
                          repeatCount="indefinite"
                        />
                        <animate
                          attributeName="opacity"
                          values="0.5;0;0.5"
                          dur="2.4s"
                          repeatCount="indefinite"
                        />
                      </circle>
                      <circle
                        r={isActive ? 7 : 5}
                        fill="#a855f7"
                        stroke="#fff"
                        strokeWidth={isActive ? 1.6 : 1.2}
                        filter="url(#markerGlow)"
                        className="transition-all"
                      />
                      <text
                        x={city.dx ?? 0}
                        y={(city.dy ?? 0) + 3.5}
                        textAnchor={city.anchor ?? 'start'}
                        fill={isActive ? '#fff' : 'rgba(255,255,255,0.78)'}
                        style={{
                          fontSize: isActive ? 14 : 12.5,
                          fontWeight: 600,
                          paintOrder: 'stroke',
                          stroke: '#0b0b10',
                          strokeWidth: 3.5,
                          strokeLinejoin: 'round',
                        }}
                        className="transition-all"
                      >
                        {city.name}
                      </text>
                    </g>
                  </Marker>
                )
              })}
            </ComposableMap>
          </div>
        </Reveal>

        <Reveal delay={0.16}>
          <div className="mx-auto mt-6 flex max-w-xl flex-wrap justify-center gap-2">
            {CITIES.map((city) => (
              <button
                key={city.name}
                onMouseEnter={() => setActive(city.name)}
                onMouseLeave={() => setActive(null)}
                onFocus={() => setActive(city.name)}
                onBlur={() => setActive(null)}
                className={`rounded-full border px-3.5 py-1.5 text-xs font-medium transition-colors ${
                  active === city.name
                    ? 'border-primary bg-primary/20 text-foreground'
                    : 'border-border bg-secondary text-muted-foreground hover:border-primary/40 hover:text-foreground'
                }`}
              >
                {city.name}
              </button>
            ))}
          </div>
        </Reveal>
      </div>
    </section>
  )
}
