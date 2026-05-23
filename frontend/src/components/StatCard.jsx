export default function StatCard({ label, value, sub, accent = false }) {
  return (
    <div style={{
      background: 'var(--surface)',
      border: `1px solid ${accent ? 'var(--accent)' : 'var(--border)'}`,
      borderRadius: '8px',
      padding: '1.25rem 1.5rem',
    }}>
      <div style={{
        fontSize: '0.7rem',
        fontFamily: 'DM Mono, monospace',
        color: accent ? 'var(--accent)' : 'var(--text-muted)',
        letterSpacing: '0.12em',
        textTransform: 'uppercase',
        marginBottom: '0.5rem',
      }}>
        {label}
      </div>
      <div style={{
        fontSize: '2rem',
        fontWeight: 800,
        lineHeight: 1,
        color: accent ? 'var(--accent)' : 'var(--text)',
      }}>
        {value}
      </div>
      {sub && (
        <div style={{
          fontSize: '0.75rem',
          color: 'var(--text-muted)',
          marginTop: '0.4rem',
          fontFamily: 'DM Mono, monospace',
        }}>
          {sub}
        </div>
      )}
    </div>
  )
}
