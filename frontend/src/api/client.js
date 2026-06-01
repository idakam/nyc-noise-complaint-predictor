const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:7860'

async function request(path, options = {}) {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.detail || `Request failed: ${res.status}`)
  }
  return res.json()
}

export const api = {
  getBoroughs: () =>
    request('/api/boroughs'),

  predictDate: (body) =>
    request('/api/predict/date', { method: 'POST', body: JSON.stringify(body) }),

  predictWeekly: (body) =>
    request('/api/predict/weekly', { method: 'POST', body: JSON.stringify(body) }),

  predictHotspot: (body) =>
    request('/api/predict/hotspot', { method: 'POST', body: JSON.stringify(body) }),

  getAccuracy: () =>
    request('/api/accuracy'),

  getPipelineStatus: () =>
    request('/api/pipeline/status'),

  getTypeDistribution: (borough, season, timeBucket) =>
    request(`/api/predict/type?borough=${borough}&season=${season}&time_bucket=${timeBucket}`),
}