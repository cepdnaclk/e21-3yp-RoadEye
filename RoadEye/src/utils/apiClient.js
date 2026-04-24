import AsyncStorage from '@react-native-async-storage/async-storage'

// ── Change this to match your environment ──────────────────────────────────
// Android emulator  → 'http://10.0.2.2:8080'
// iOS simulator     → 'http://localhost:8080'
// Physical device   → 'http://<YOUR_PC_LAN_IP>:8080'
const BASE_URL = 'http://10.30.1.169:8081'
// ───────────────────────────────────────────────────────────────────────────

/**
 * Authenticated fetch wrapper.
 *
 * Automatically reads the saved JWT from AsyncStorage and attaches it
 * as an Authorization: Bearer header on every request.
 *
 * Usage:
 *   const rides  = await apiFetch('/api/rides')
 *   const result = await apiFetch('/api/rides', { method: 'POST', body: JSON.stringify(data) })
 */
export async function apiFetch(path, options = {}) {
  const token = await AsyncStorage.getItem('jwt_token')

  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,  // allow callers to override headers
  }

  const response = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers,
  })

  const data = await response.json()

  if (!response.ok) {
    throw new Error(data.error || `Request failed: ${response.status}`)
  }

  return data
}

/**
 * Convenience wrappers for common HTTP methods.
 */
export const api = {
  get:    (path)         => apiFetch(path),
  post:   (path, body)   => apiFetch(path, { method: 'POST',   body: JSON.stringify(body) }),
  put:    (path, body)   => apiFetch(path, { method: 'PUT',    body: JSON.stringify(body) }),
  delete: (path)         => apiFetch(path, { method: 'DELETE' }),
  patch:  (path, body)   => apiFetch(path, { method: 'PATCH',  body: JSON.stringify(body) }),
}
