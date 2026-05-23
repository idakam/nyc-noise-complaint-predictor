import { useState } from 'react'
import { api } from '../api/client'
import BoroughSelector from '../components/BoroughSelector'
import StatCard from '../components/StatCard'

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

export default function DatePrediction() {
  const [borough, setBorough] = useState('BROOKLYN')
  const [neighborhood, setNeighborhood] = useState('')
  const [date, setDate] = useState(() => {
    const d = new Date(); d.setDate(d.getDate() + 7)
    return d.toISOString().split('T')[0]
  })
  const [timeBucket, setTimeBucket] = useState('evening')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [result, setResult] = useState(null)

  const handlePredict = async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await api.predictDate({
        borough,
        neighborhood,
        date,
        time_bucket: timeBucket,
      })
      setResult(data)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ padding: '2rem', maxWidth: '800px', margin: '0 auto' }}>
      <div style={{ marginBottom: '2rem' }}>
        <h2 style={{ fontWeight: 800, fontSize: '1.4rem', marginBottom: '0.25rem' }}>
          Date Prediction
        </h2>
        <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontFamily: 'DM Mono, monospace' }}>
          Point-in-time complaint volume estimate
        </p>
      </div>

      {/* Controls */}
      <div style={{
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: '8px',
        padding: '1.5rem',
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
        gap: '1rem',
        marginBottom: '1.5rem',
      }}>
        <BoroughSelector
          borough={borough} setBorough={setBorough}
          neighborhood={neighborhood} setNeighborhood={setNeighborhood}
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
      </div>

      <button
        onClick={handlePredict}
        disabled={loading}
        style={{
          background: loading ? 'var(--border)' : 'var(--accent)',
          color: '#0a0a0f',
          border: 'none',
          borderRadius: '6px',
          padding: '0.75rem 2rem',
          fontWeight: 700,
          fontSize: '0.9rem',
          cursor: loading ? 'not-allowed' : 'pointer',
          fontFamily: 'Syne, sans-serif',
          letterSpacing: '0.04em',
          marginBottom: '2rem',
          transition: 'background 0.15s',
        }}
      >
        {loading ? 'Predicting…' : 'Predict'}
      </button>

      {error && (
        <div style={{
          background: '#ff475720', border: '1px solid #ff4757',
          borderRadius: '6px', padding: '0.75rem', fontSize: '0.8rem',
          color: '#ff4757', marginBottom: '1rem',
        }}>
          {error}
        </div>
      )}

      {result && (
        <>
          {/* Main stats */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
            <StatCard label="Predicted Volume" value={result.predicted_volume} sub="complaints / week" accent />
            <StatCard label="Risk Level" value={result.risk_level}
              sub={`color: ${riskColor(result.risk_level)}`} />
            <StatCard label="Expected Range"
              value={`${result.lower_bound}–${result.upper_bound}`}
              sub="±2.9 complaint margin"
            />
            <StatCard label="Day" value={result.day} sub={result.season} />
          </div>

          {/* Confidence bar */}
          <div style={{
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: '8px',
            padding: '1.25rem 1.5rem',
          }}>
            <div style={{ fontSize: '0.7rem', fontFamily: 'DM Mono, monospace',
              color: 'var(--text-muted)', letterSpacing: '0.1em', marginBottom: '1rem' }}>
              PREDICTION RANGE
            </div>

            {/* Range visualization */}
            <div style={{ position: 'relative', height: '32px', marginBottom: '0.5rem' }}>
              {/* Track */}
              <div style={{
                position: 'absolute', top: '50%', transform: 'translateY(-50%)',
                left: 0, right: 0, height: '4px',
                background: 'var(--border)', borderRadius: '2px',
              }} />
              {/* Range fill */}
              <div style={{
                position: 'absolute', top: '50%', transform: 'translateY(-50%)',
                left: '15%', right: '15%', height: '4px',
                background: riskColor(result.risk_level) + '66',
                borderRadius: '2px',
              }} />
              {/* Point estimate */}
              <div style={{
                position: 'absolute', top: '50%', left: '50%',
                transform: 'translate(-50%, -50%)',
                width: '14px', height: '14px',
                borderRadius: '50%',
                background: riskColor(result.risk_level),
                border: '2px solid var(--bg)',
              }} />
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between',
              fontSize: '0.75rem', fontFamily: 'DM Mono, monospace', color: 'var(--text-muted)' }}>
              <span>{result.lower_bound} low</span>
              <span style={{ color: riskColor(result.risk_level), fontWeight: 600 }}>
                {result.predicted_volume} predicted
              </span>
              <span>{result.upper_bound} high</span>
            </div>

            <div style={{ marginTop: '1rem', fontSize: '0.8rem', color: 'var(--text-muted)', lineHeight: 1.6 }}>
              Based on historical patterns, expect approximately <strong style={{ color: 'var(--text)' }}>
                {result.predicted_volume} complaints
              </strong> in {result.neighborhood} during {result.time_bucket} hours
              on {result.day}s in {result.season}.
            </div>
          </div>
        </>
      )}
    </div>
  )
}
