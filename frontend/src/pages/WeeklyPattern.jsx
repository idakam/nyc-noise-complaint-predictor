import { useState } from 'react'
import { api } from '../api/client'
import BoroughSelector from '../components/BoroughSelector'
import StatCard from '../components/StatCard'

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
const TIMES = ['morning', 'afternoon', 'evening', 'night', 'overnight']

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

function heatColor(value, max) {
  if (!max) return 'var(--border)'
  const t = value / max
  if (t > 0.7) return `rgba(255,71,87,${0.3 + t * 0.6})`
  if (t > 0.4) return `rgba(255,159,67,${0.3 + t * 0.5})`
  return `rgba(46,213,115,${0.15 + t * 0.4})`
}

export default function WeeklyPattern() {
  const [borough, setBorough] = useState('BROOKLYN')
  const [neighborhood, setNeighborhood] = useState('')
  const [date, setDate] = useState(() => {
    const d = new Date(); d.setDate(d.getDate() + 7)
    return d.toISOString().split('T')[0]
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [results, setResults] = useState(null)

  const handleGenerate = async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await api.predictWeekly({ borough, neighborhood, date })
      setResults(data)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  // Find max for color scaling
  const allValues = results
    ? DAYS.flatMap(d => TIMES.map(t => results.pattern[d]?.[t] || 0))
    : []
  const max = Math.max(...allValues, 1)

  return (
    <div style={{ padding: '2rem', maxWidth: '1100px', margin: '0 auto' }}>
      <div style={{ marginBottom: '2rem' }}>
        <h2 style={{ fontWeight: 800, fontSize: '1.4rem', marginBottom: '0.25rem' }}>
          Weekly Pattern
        </h2>
        <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontFamily: 'DM Mono, monospace' }}>
          Expected complaint volume across all time buckets
        </p>
      </div>

      {/* Controls */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
        <BoroughSelector
          borough={borough} setBorough={setBorough}
          neighborhood={neighborhood} setNeighborhood={setNeighborhood}
        />
        <div>
          <label style={labelStyle}>Week of</label>
          <input type="date" style={inputStyle} value={date}
            onChange={e => setDate(e.target.value)} />
        </div>
        <div style={{ display: 'flex', alignItems: 'flex-end' }}>
          <button
            onClick={handleGenerate}
            disabled={loading}
            style={{
              background: loading ? 'var(--border)' : 'var(--accent)',
              color: '#0a0a0f',
              border: 'none',
              borderRadius: '6px',
              padding: '0.75rem 1.5rem',
              fontWeight: 700,
              fontSize: '0.85rem',
              cursor: loading ? 'not-allowed' : 'pointer',
              fontFamily: 'Syne, sans-serif',
              width: '100%',
              transition: 'background 0.15s',
            }}
          >
            {loading ? 'Loading…' : 'Generate'}
          </button>
        </div>
      </div>

      {error && (
        <div style={{
          background: '#ff475720', border: '1px solid #ff4757',
          borderRadius: '6px', padding: '0.75rem', fontSize: '0.8rem',
          color: '#ff4757', marginBottom: '1rem',
        }}>
          {error}
        </div>
      )}

      {results && (
        <>
          {/* Summary stats */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
            <StatCard label="Total Weekly" value={results.week_total} sub="complaints" accent />
            <StatCard label="Season" value={results.season} />
            <StatCard label="Peak Time"
              value={results.peak_times[0]?.day.slice(0, 3)}
              sub={results.peak_times[0]?.time}
            />
            <StatCard label="Peak Volume" value={results.peak_times[0]?.volume} sub="complaints" />
          </div>

          {/* Heatmap grid */}
          <div style={{
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: '8px',
            overflow: 'hidden',
            marginBottom: '2rem',
          }}>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '600px' }}>
                <thead>
                  <tr>
                    <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.7rem',
                      fontFamily: 'DM Mono, monospace', color: 'var(--text-muted)',
                      letterSpacing: '0.1em', fontWeight: 500 }}>
                      TIME
                    </th>
                    {DAYS.map(d => (
                      <th key={d} style={{ padding: '0.75rem 0.5rem', textAlign: 'center',
                        fontSize: '0.7rem', fontFamily: 'DM Mono, monospace',
                        color: 'var(--text-muted)', letterSpacing: '0.05em', fontWeight: 500 }}>
                        {d.slice(0, 3).toUpperCase()}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {TIMES.map(time => (
                    <tr key={time}>
                      <td style={{ padding: '0.6rem 1rem', fontSize: '0.75rem',
                        fontFamily: 'DM Mono, monospace', color: 'var(--text-muted)',
                        borderTop: '1px solid var(--border)', whiteSpace: 'nowrap' }}>
                        {time}
                      </td>
                      {DAYS.map(day => {
                        const val = results.pattern[day]?.[time] || 0
                        return (
                          <td key={day} style={{
                            padding: '0.6rem 0.5rem',
                            textAlign: 'center',
                            borderTop: '1px solid var(--border)',
                            background: heatColor(val, max),
                            fontSize: '0.8rem',
                            fontFamily: 'DM Mono, monospace',
                            fontWeight: 500,
                            transition: 'background 0.3s',
                          }}>
                            {val.toFixed(1)}
                          </td>
                        )
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Peak times */}
          <div>
            <div style={{ fontSize: '0.7rem', fontFamily: 'DM Mono, monospace',
              color: 'var(--text-muted)', letterSpacing: '0.1em', textTransform: 'uppercase',
              marginBottom: '0.75rem' }}>
              Top 5 Peak Times
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {results.peak_times.map((p, i) => (
                <div key={i} style={{
                  display: 'flex', alignItems: 'center', gap: '1rem',
                  background: 'var(--surface)', border: '1px solid var(--border)',
                  borderRadius: '6px', padding: '0.75rem 1rem',
                }}>
                  <span style={{ fontFamily: 'DM Mono, monospace', fontSize: '0.7rem',
                    color: 'var(--accent)', width: '20px' }}>
                    #{i + 1}
                  </span>
                  <span style={{ flex: 1, fontWeight: 600, fontSize: '0.85rem' }}>
                    {p.day} · {p.time}
                  </span>
                  <span style={{ fontFamily: 'DM Mono, monospace', fontSize: '0.8rem',
                    color: 'var(--text-muted)' }}>
                    {p.volume} complaints
                  </span>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
