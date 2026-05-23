import { useState, useRef, useEffect, useCallback } from 'react'
import mapboxgl from 'mapbox-gl'
import { api } from '../api/client'
import BoroughSelector from '../components/BoroughSelector'
import StatCard from '../components/StatCard'

mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN

const BOROUGH_CENTERS = {
  BROOKLYN:      [-73.9442, 40.6782],
  MANHATTAN:     [-73.9857, 40.7484],
  QUEENS:        [-73.7949, 40.7282],
  BRONX:         [-73.8648, 40.8448],
  'STATEN ISLAND': [-74.1502, 40.5795],
}

const TIME_BUCKETS = ['morning', 'afternoon', 'evening', 'night', 'overnight']

const inputStyle = {
  background: 'var(--surface)',
  border: '1px solid var(--border)',
  borderRadius: '6px',
  color: 'var(--text)',
  padding: '0.6rem 0.9rem',
  fontSize: '0.85rem',
  width: '100%',
  fontFamily: 'Syne, sans-serif',
  outline: 'none',
}

const labelStyle = {
  fontSize: '0.7rem',
  fontFamily: 'DM Mono, monospace',
  color: 'var(--text-muted)',
  letterSpacing: '0.1em',
  textTransform: 'uppercase',
  marginBottom: '0.4rem',
  display: 'block',
}

function riskColor(risk) {
  return risk === 'High' ? '#ff4757' : risk === 'Medium' ? '#ff9f43' : '#2ed573'
}

export default function HotspotMap() {
  const mapContainer = useRef(null)
  const map = useRef(null)
  const markersRef = useRef([])

  const [borough, setBorough] = useState('BROOKLYN')
  const [neighborhood, setNeighborhood] = useState('')
  const [date, setDate] = useState(() => {
    const d = new Date(); d.setDate(d.getDate() + 7)
    return d.toISOString().split('T')[0]
  })
  const [timeBucket, setTimeBucket] = useState('evening')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [results, setResults] = useState(null)

  // Init map
  useEffect(() => {
    if (map.current) return
    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/dark-v11',
      center: BOROUGH_CENTERS['BROOKLYN'],
      zoom: 11,
    })
    map.current.addControl(new mapboxgl.NavigationControl(), 'bottom-right')
  }, [])

  const clearMarkers = () => {
    markersRef.current.forEach(m => m.remove())
    markersRef.current = []
  }

  const plotMarkers = useCallback((data) => {
    clearMarkers()
    const max = data.max_volume

    data.neighborhoods.forEach(n => {
      const size = Math.max(10, Math.min((n.volume / max) * 40, 40))
      const color = riskColor(n.risk_level)

      const el = document.createElement('div')

      const circle = document.createElement('div')

      circle.style.cssText = `
        width: ${size}px;
        height: ${size}px;
        border-radius: 50%;
        background: ${color}33;
        border: 2px solid ${color};
        cursor: pointer;
        transition: transform 0.15s ease;
        display: flex;
        align-items: center;
        justify-content: center;
      `

      circle.addEventListener('mouseenter', () => {
        circle.style.transform = 'scale(1.2)'
      })

      circle.addEventListener('mouseleave', () => {
        circle.style.transform = 'scale(1)'
      })

      el.appendChild(circle)

      const popup = new mapboxgl.Popup({ offset: 12, closeButton: false })
        .setHTML(`
          <div style="font-family: Syne, sans-serif;">
            <div style="font-weight: 700; font-size: 0.9rem; margin-bottom: 6px;">${n.neighborhood}</div>
            <div style="font-family: DM Mono, monospace; font-size: 0.75rem; color: ${color};">
              ${n.volume} complaints/week
            </div>
            <div style="font-size: 0.75rem; color: #6b6b80; margin-top: 2px;">
              Risk: ${n.risk_level}
            </div>
          </div>
        `)

      const marker = new mapboxgl.Marker(el)
        .setLngLat([n.lon, n.lat])
        .setPopup(popup)
        .addTo(map.current)

      markersRef.current.push(marker)
    })

    // Fly to borough center
    const center = BOROUGH_CENTERS[data.borough] || [-73.9857, 40.7484]
    map.current.flyTo({ center, zoom: 11, duration: 1000 })
  }, [])

  const handleGenerate = async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await api.predictHotspot({ borough, date, time_bucket: timeBucket })
      setResults(data)
      plotMarkers(data)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  const topTen = results?.neighborhoods.slice(0, 10) || []

  return (
    <div style={{ display: 'flex', height: 'calc(100vh - 56px)' }}>
      {/* Sidebar */}
      <div style={{
        width: '300px',
        flexShrink: 0,
        background: 'var(--surface)',
        borderRight: '1px solid var(--border)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}>
        <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--border)' }}>
          <h2 style={{ fontWeight: 800, fontSize: '1.1rem', marginBottom: '0.25rem' }}>
            Hotspot Map
          </h2>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontFamily: 'DM Mono, monospace' }}>
            Expected complaint density by area
          </p>
        </div>

        <div style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <BoroughSelector
            borough={borough} setBorough={setBorough}
            neighborhood={neighborhood} setNeighborhood={setNeighborhood}
            showNeighborhood={false}
          />

          <div>
            <label style={labelStyle}>Date</label>
            <input type="date" style={inputStyle} value={date}
              onChange={e => setDate(e.target.value)} />
          </div>

          <div>
            <label style={labelStyle}>Time of Day</label>
            <select style={inputStyle} value={timeBucket}
              onChange={e => setTimeBucket(e.target.value)}>
              {TIME_BUCKETS.map(t => (
                <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>
              ))}
            </select>
          </div>

          <button
            onClick={handleGenerate}
            disabled={loading}
            style={{
              background: loading ? 'var(--border)' : 'var(--accent)',
              color: '#0a0a0f',
              border: 'none',
              borderRadius: '6px',
              padding: '0.75rem',
              fontWeight: 700,
              fontSize: '0.85rem',
              cursor: loading ? 'not-allowed' : 'pointer',
              fontFamily: 'Syne, sans-serif',
              letterSpacing: '0.04em',
              transition: 'background 0.15s',
            }}
          >
            {loading ? 'Generating…' : 'Generate Map'}
          </button>

          {error && (
            <div style={{
              background: '#ff475720',
              border: '1px solid #ff4757',
              borderRadius: '6px',
              padding: '0.75rem',
              fontSize: '0.8rem',
              color: '#ff4757',
            }}>
              {error}
            </div>
          )}
        </div>

        {/* Top 10 list */}
        {topTen.length > 0 && (
          <div style={{ flex: 1, overflow: 'auto', borderTop: '1px solid var(--border)' }}>
            <div style={{
              padding: '0.75rem 1.25rem',
              fontSize: '0.7rem',
              fontFamily: 'DM Mono, monospace',
              color: 'var(--text-muted)',
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
            }}>
              Top 10 Areas
            </div>
            {topTen.map((n, i) => (
              <div key={n.neighborhood} style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                padding: '0.6rem 1.25rem',
                borderBottom: '1px solid var(--border)',
              }}>
                <span style={{
                  fontSize: '0.65rem',
                  fontFamily: 'DM Mono, monospace',
                  color: 'var(--text-muted)',
                  width: '16px',
                }}>
                  {String(i + 1).padStart(2, '0')}
                </span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '0.8rem', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {n.neighborhood}
                  </div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontFamily: 'DM Mono, monospace' }}>
                    {n.volume} / week
                  </div>
                </div>
                <div style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  background: riskColor(n.risk_level),
                  flexShrink: 0,
                }} />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Map */}
      <div ref={mapContainer} style={{ flex: 1 }} />
    </div>
  )
}
