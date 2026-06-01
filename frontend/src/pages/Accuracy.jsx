import { useState, useEffect } from 'react'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, ReferenceLine
} from 'recharts'
import { api } from '../api/client'
import StatCard from '../components/StatCard'

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div style={{
      background: 'var(--surface)',
      border: '1px solid var(--border)',
      borderRadius: '6px',
      padding: '0.75rem 1rem',
      fontFamily: 'DM Mono, monospace',
      fontSize: '0.75rem',
    }}>
      <div style={{ marginBottom: '6px', color: 'var(--text-muted)' }}>{label}</div>
      {payload.map(p => (
        <div key={p.name} style={{ color: p.color }}>
          {p.name}: {p.value}
        </div>
      ))}
    </div>
  )
}

export default function Accuracy() {
  const [data, setData] = useState(null)
  const [pipeline, setPipeline] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    Promise.all([api.getAccuracy(), api.getPipelineStatus()])
      .then(([acc, pip]) => {
        setData(acc)
        setPipeline(pip)
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return (
    <div style={{ padding: '2rem', color: 'var(--text-muted)', fontFamily: 'DM Mono, monospace', fontSize: '0.8rem' }}>
      Loading accuracy data…
    </div>
  )

  if (error) return (
    <div style={{ padding: '2rem' }}>
      <div style={{
        background: '#ff475720', border: '1px solid #ff4757',
        borderRadius: '6px', padding: '1rem', fontSize: '0.85rem', color: '#ff4757'
      }}>
        {error === 'No accuracy data yet. Run the backfill first.'
          ? 'No accuracy data yet — run the backfill script first: python src/pipeline.py backfill'
          : error}
      </div>
    </div>
  )

  const chartData = data.entries.map(e => ({
    week: e.week_start.slice(0, 10),
    RMSE: e.rmse,
    MAE: e.mae,
    Actual: e.mean_actual,
    Predicted: e.mean_predicted,
  }))

  const trendColor = data.summary.recent_trend === 'improving' ? '#2ed573' : '#ff9f43'

  return (
    <div style={{ padding: '2rem', maxWidth: '1100px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: '2rem' }}>
        <h2 style={{ fontWeight: 800, fontSize: '1.4rem', marginBottom: '0.25rem' }}>
          Model Accuracy
        </h2>
        <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontFamily: 'DM Mono, monospace' }}>
          Predicted vs actual complaint volumes over time
        </p>
      </div>

      {/* Summary stats */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
        gap: '1rem',
        marginBottom: '2rem'
      }}>
        <StatCard label="Avg RMSE" value={data.summary.avg_rmse} sub="complaints margin" accent />
        <StatCard label="Avg MAE" value={data.summary.avg_mae} sub="mean absolute error" />
        <StatCard label="Best RMSE" value={data.summary.best_rmse} sub="best week" />
        <StatCard label="Recent Trend" value={data.summary.recent_trend}
          sub={`last 4 vs prev 4 weeks`} />
        <StatCard label="Weeks Tracked" value={data.summary.total_weeks} />
      </div>

      {/* Actual vs Predicted chart */}
      <div style={{
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: '8px',
        padding: '1.5rem',
        marginBottom: '1.5rem',
      }}>
        <div style={{
          fontSize: '0.7rem', fontFamily: 'DM Mono, monospace',
          color: 'var(--text-muted)', letterSpacing: '0.1em',
          textTransform: 'uppercase', marginBottom: '1.25rem'
        }}>
          Actual vs Predicted — Weekly Mean Complaints
        </div>
        <ResponsiveContainer width="100%" height={280}>
          <LineChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis
              dataKey="week"
              tick={{ fill: 'var(--text-muted)', fontSize: 10, fontFamily: 'DM Mono, monospace' }}
              tickLine={false}
              interval={Math.floor(chartData.length / 6)}
            />
            <YAxis
              tick={{ fill: 'var(--text-muted)', fontSize: 10, fontFamily: 'DM Mono, monospace' }}
              tickLine={false}
              axisLine={false}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend
              wrapperStyle={{ fontSize: '0.75rem', fontFamily: 'DM Mono, monospace', paddingTop: '1rem' }}
            />
            <Line
              type="monotone" dataKey="Actual"
              stroke="#e8ff47" strokeWidth={2}
              dot={false} activeDot={{ r: 4 }}
            />
            <Line
              type="monotone" dataKey="Predicted"
              stroke="#6b6b80" strokeWidth={2}
              strokeDasharray="4 4"
              dot={false} activeDot={{ r: 4 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* RMSE over time chart */}
      <div style={{
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: '8px',
        padding: '1.5rem',
        marginBottom: '1.5rem',
      }}>
        <div style={{
          fontSize: '0.7rem', fontFamily: 'DM Mono, monospace',
          color: 'var(--text-muted)', letterSpacing: '0.1em',
          textTransform: 'uppercase', marginBottom: '1.25rem'
        }}>
          RMSE Over Time — Lower is Better
        </div>
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis
              dataKey="week"
              tick={{ fill: 'var(--text-muted)', fontSize: 10, fontFamily: 'DM Mono, monospace' }}
              tickLine={false}
              interval={Math.floor(chartData.length / 6)}
            />
            <YAxis
              tick={{ fill: 'var(--text-muted)', fontSize: 10, fontFamily: 'DM Mono, monospace' }}
              tickLine={false}
              axisLine={false}
            />
            <Tooltip content={<CustomTooltip />} />
            <ReferenceLine
              y={data.summary.avg_rmse}
              stroke="#6b6b80"
              strokeDasharray="4 4"
              label={{ value: 'avg', fill: 'var(--text-muted)', fontSize: 10 }}
            />
            <Line
              type="monotone" dataKey="RMSE"
              stroke={trendColor} strokeWidth={2}
              dot={false} activeDot={{ r: 4 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Pipeline status */}
      {pipeline && (
        <div style={{
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: '8px',
          padding: '1.25rem 1.5rem',
        }}>
          <div style={{
            fontSize: '0.7rem', fontFamily: 'DM Mono, monospace',
            color: 'var(--text-muted)', letterSpacing: '0.1em',
            textTransform: 'uppercase', marginBottom: '1rem'
          }}>
            Pipeline Status
          </div>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '1rem',
            fontSize: '0.8rem',
          }}>
            {pipeline.model_metadata && (
              <>
                <div>
                  <span style={{ color: 'var(--text-muted)', fontFamily: 'DM Mono, monospace', fontSize: '0.7rem' }}>
                    LAST TRAINED
                  </span>
                  <div style={{ fontWeight: 600, marginTop: '0.25rem' }}>
                    {pipeline.model_metadata.last_trained || '—'}
                  </div>
                </div>
                <div>
                  <span style={{ color: 'var(--text-muted)', fontFamily: 'DM Mono, monospace', fontSize: '0.7rem' }}>
                    TRAINING RECORDS
                  </span>
                  <div style={{ fontWeight: 600, marginTop: '0.25rem' }}>
                    {pipeline.model_metadata.n_records?.toLocaleString() || '—'}
                  </div>
                </div>
                <div>
                  <span style={{ color: 'var(--text-muted)', fontFamily: 'DM Mono, monospace', fontSize: '0.7rem' }}>
                    TRAINING RMSE
                  </span>
                  <div style={{ fontWeight: 600, marginTop: '0.25rem' }}>
                    {pipeline.model_metadata.training_rmse || '—'}
                  </div>
                </div>
                <div>
                  <span style={{ color: 'var(--text-muted)', fontFamily: 'DM Mono, monospace', fontSize: '0.7rem' }}>
                    DATA RANGE
                  </span>
                  <div style={{ fontWeight: 600, marginTop: '0.25rem', fontSize: '0.75rem' }}>
                    {pipeline.model_metadata.week_start_min?.slice(0, 10)} →{' '}
                    {pipeline.model_metadata.week_start_max?.slice(0, 10)}
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Recent runs */}
          {pipeline.recent_runs?.length > 0 && (
            <div style={{ marginTop: '1.25rem' }}>
              <div style={{
                fontSize: '0.7rem', fontFamily: 'DM Mono, monospace',
                color: 'var(--text-muted)', letterSpacing: '0.1em',
                marginBottom: '0.5rem'
              }}>
                RECENT RUNS
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                {[...pipeline.recent_runs].reverse().slice(0, 5).map((run, i) => (
                  <div key={i} style={{
                    display: 'flex', gap: '1rem', alignItems: 'center',
                    fontSize: '0.75rem', fontFamily: 'DM Mono, monospace',
                    color: 'var(--text-muted)',
                  }}>
                    <span style={{
                      width: '8px', height: '8px', borderRadius: '50%', flexShrink: 0,
                      background: run.status === 'success' ? '#2ed573' : '#ff4757'
                    }} />
                    <span>{run.run_date}</span>
                    {run.records_added !== undefined && (
                      <span>+{run.records_added} records</span>
                    )}
                    {run.training_rmse && <span>RMSE {run.training_rmse}</span>}
                    {run.error && <span style={{ color: '#ff4757' }}>{run.error}</span>}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
