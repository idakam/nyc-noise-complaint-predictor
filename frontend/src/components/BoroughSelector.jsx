import { useState, useEffect } from 'react'
import { api } from '../api/client'

const selectStyle = {
  background: 'var(--surface)',
  border: '1px solid var(--border)',
  borderRadius: '6px',
  color: 'var(--text)',
  padding: '0.6rem 0.9rem',
  fontSize: '0.85rem',
  width: '100%',
  fontFamily: 'Syne, sans-serif',
  cursor: 'pointer',
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

export default function BoroughSelector({
  borough, setBorough,
  neighborhood, setNeighborhood,
  showNeighborhood = true,
}) {
  const [boroughMap, setBoroughMap] = useState({})

  useEffect(() => {
    api.getBoroughs().then(data => {
      setBoroughMap(data.boroughs)
      const first = Object.keys(data.boroughs)[0]
      if (first) {
        setBorough(first)
        if (showNeighborhood) setNeighborhood(data.boroughs[first][0])
      }
    })
  }, [])

  const neighborhoods = boroughMap[borough] || []

  return (
    <>
      <div>
        <label style={labelStyle}>Borough</label>
        <select
          style={selectStyle}
          value={borough}
          onChange={e => {
            setBorough(e.target.value)
            if (showNeighborhood) setNeighborhood(boroughMap[e.target.value]?.[0] || '')
          }}
        >
          {Object.keys(boroughMap).map(b => (
            <option key={b} value={b}>{b}</option>
          ))}
        </select>
      </div>

      {showNeighborhood && (
        <div>
          <label style={labelStyle}>Neighborhood</label>
          <select
            style={selectStyle}
            value={neighborhood}
            onChange={e => setNeighborhood(e.target.value)}
          >
            {neighborhoods.map(n => (
              <option key={n} value={n}>{n}</option>
            ))}
          </select>
        </div>
      )}
    </>
  )
}
