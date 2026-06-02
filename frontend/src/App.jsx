import { useState, useEffect } from 'react'
import { BrowserRouter, Routes, Route, NavLink } from 'react-router-dom'
import HotspotMap from './pages/HotspotMap'
import WeeklyPattern from './pages/WeeklyPattern'
import DatePrediction from './pages/DatePrediction'
import Accuracy from './pages/Accuracy'
import { api } from './api/client'

const NAV = [
  { to: '/',          label: 'Hotspot Map' },
  { to: '/weekly',    label: 'Weekly Pattern' },
  { to: '/predict',   label: 'Date Prediction' },
  // { to: '/accuracy',  label: 'Model Accuracy' },
]

export default function App() {
  const [lastUpdated, setLastUpdated] = useState(null)

  useEffect(() => {
  api.getLastUpdated()
    .then(d => setLastUpdated(d?.last_updated || null))
    .catch(() => null)
}, [])

  // useEffect(() => {
  //   api.getPipelineStatus()
  //     .then(data => {
  //       const d = data?.last_run?.run_at || data?.model_metadata?.train_cutoff
  //       setLastUpdated(d ? d.slice(0, 10) : null)
  //     })
  //     .catch(() => null)
  // }, [])


  return (
    <BrowserRouter>
      <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
        {/* Top nav */}
        <header style={{
          borderBottom: '1px solid var(--border)',
          padding: '0 2rem',
          display: 'flex',
          alignItems: 'center',
          gap: '2rem',
          height: '56px',
          background: 'var(--surface)',
          position: 'sticky',
          top: 0,
          zIndex: 100,
        }}>
          <span style={{
            fontFamily: 'DM Mono, monospace',
            fontSize: '0.75rem',
            color: 'var(--accent)',
            letterSpacing: '0.15em',
            textTransform: 'uppercase',
            whiteSpace: 'nowrap',
          }}>
            NYC 311 // Noise
          </span>

          <nav style={{ display: 'flex', gap: '0.25rem' }}>
            {NAV.map(({ to, label }) => (
              <NavLink
                key={to}
                to={to}
                end={to === '/'}
                style={({ isActive }) => ({
                  padding: '0.35rem 0.85rem',
                  borderRadius: '4px',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  letterSpacing: '0.04em',
                  textDecoration: 'none',
                  background: isActive ? 'var(--accent)' : 'transparent',
                  color: isActive ? '#0a0a0f' : 'var(--text-muted)',
                  transition: 'all 0.15s',
                })}
              >
                {label}
              </NavLink>
            ))}
          </nav>
           {lastUpdated && (
            <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <span style={{
                width: '6px',
                height: '6px',
                borderRadius: '50%',
                background: '#2ed573',
                flexShrink: 0,
              }} />
              <span style={{
                fontFamily: 'DM Mono, monospace',
                fontSize: '0.65rem',
                color: 'var(--text-muted)',
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                whiteSpace: 'nowrap',
              }}>
                Model Last Updated {lastUpdated}
              </span>
            </div>
          )}
        </header>

        {/* Page content */}
        <main style={{ flex: 1 }}>
          <Routes>
            <Route path="/"          element={<HotspotMap />} />
            <Route path="/weekly"    element={<WeeklyPattern />} />
            <Route path="/predict"   element={<DatePrediction />} />
            <Route path="/accuracy"  element={<Accuracy />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  )
}
