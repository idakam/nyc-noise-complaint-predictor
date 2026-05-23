import { BrowserRouter, Routes, Route, NavLink } from 'react-router-dom'
import HotspotMap from './pages/HotspotMap'
import WeeklyPattern from './pages/WeeklyPattern'
import DatePrediction from './pages/DatePrediction'

const NAV = [
  { to: '/',        label: 'Hotspot Map' },
  { to: '/weekly',  label: 'Weekly Pattern' },
  { to: '/predict', label: 'Date Prediction' },
]

export default function App() {
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
        </header>

        {/* Page content */}
        <main style={{ flex: 1 }}>
          <Routes>
            <Route path="/"        element={<HotspotMap />} />
            <Route path="/weekly"  element={<WeeklyPattern />} />
            <Route path="/predict" element={<DatePrediction />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  )
}
