'use client'

import { useState } from 'react'
import { ComposableMap, Geographies, Geography, Marker } from 'react-simple-maps'
import { motion } from 'framer-motion'
import { Reveal } from './reveal'

const CITIES: { name: string; coordinates: [number, number] }[] = [
  { name: 'Groningen', coordinates: [6.5665, 53.2194] },
  { name: 'Zwolle', coordinates: [6.083, 52.5168] },
  { name: 'Amsterdam', coordinates: [4.9041, 52.3676] },
  { name: 'Den Haag', coordinates: [4.3007, 52.0705] },
  { name: 'Utrecht', coordinates: [5.1214, 52.0907] },
  { name: 'Rotterdam', coordinates: [4.4777, 51.9244] },
  { name: 'Arnhem', coordinates: [5.8987, 51.9851] },
  { name: 'Nijmegen', coordinates: [5.852, 51.8126] },
  { name: 'Tilburg', coordinates: [5.0913, 51.5555] },
  { name: 'Eindhoven', coordinates: [5.4697, 51.4416] },
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

        <Reveal delay={0.1}>
          <div className="relative mx-auto mt-12 max-w-2xl rounded-3xl border border-border bg-[#0c0c10] p-4 sm:p-8">
            <ComposableMap
              projection="geoMercator"
              projectionConfig={{ center: [5.4, 52.2], scale: 6800 }}
              width={600}
              height={620}
              style={{ width: '100%', height: 'auto' }}
            >
              <Geographies geography="/geo/netherlands.json">
                {({ geographies }) =>
                  geographies.map((geo) => (
                    <Geography
                      key={geo.rsmKey}
                      geography={geo}
                      fill="rgba(255,255,255,0.04)"
                      stroke="rgba(139,92,246,0.35)"
                      strokeWidth={0.6}
                      style={{
                        default: { outline: 'none' },
                        hover: { outline: 'none', fill: 'rgba(139,92,246,0.12)' },
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
                      <circle
                        r={isActive ? 16 : 11}
                        fill="rgba(139,92,246,0.18)"
                        className="transition-all"
                      />
                      <circle
                        r={isActive ? 6 : 4.5}
                        fill="#a855f7"
                        stroke="#fff"
                        strokeWidth={1}
                        className="transition-all"
                      />
                      <circle r={4.5} fill="#a855f7">
                        <animate
                          attributeName="r"
                          from="4.5"
                          to="16"
                          dur="1.8s"
                          begin="0s"
                          repeatCount="indefinite"
                        />
                        <animate
                          attributeName="opacity"
                          from="0.6"
                          to="0"
                          dur="1.8s"
                          begin="0s"
                          repeatCount="indefinite"
                        />
                      </circle>
                      {isActive && (
                        <g>
                          <rect
                            x={-city.name.length * 4 - 8}
                            y={-34}
                            width={city.name.length * 8 + 16}
                            height={20}
                            rx={6}
                            fill="#18181b"
                            stroke="rgba(139,92,246,0.5)"
                            strokeWidth={0.8}
                          />
                          <text
                            textAnchor="middle"
                            y={-20}
                            fill="#fff"
                            style={{ fontSize: 11, fontWeight: 600 }}
                          >
                            {city.name}
                          </text>
                        </g>
                      )}
                    </g>
                  </Marker>
                )
              })}
            </ComposableMap>

            <div className="mt-4 flex flex-wrap justify-center gap-2">
              {CITIES.map((city) => (
                <button
                  key={city.name}
                  onMouseEnter={() => setActive(city.name)}
                  onMouseLeave={() => setActive(null)}
                  className={`rounded-full border px-3 py-1 text-xs transition-colors ${
                    active === city.name
                      ? 'border-primary bg-primary/20 text-foreground'
                      : 'border-border bg-secondary text-muted-foreground'
                  }`}
                >
                  {city.name}
                </button>
              ))}
            </div>
          </div>
        </Reveal>

        <Reveal delay={0.15}>
          <motion.p className="mt-10 text-lg text-muted-foreground text-pretty">
            Участники ВОЗНИ живут по всей стране.
          </motion.p>
        </Reveal>
      </div>
    </section>
  )
}
