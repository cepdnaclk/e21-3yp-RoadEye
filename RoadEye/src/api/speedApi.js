// src/api/speedApi.js

const BASE_URL = "http://YOUR-IP:8080/api"

// 🔹 Send speed event
export async function sendSpeedEvent(data, token) {
  // ── Skip if no token — speeds won't be saved without auth ──────────────────
  if (!token) {
    console.warn('[speedApi] ⚠️ No auth token — speed event skipped')
    return null
  }

  // ── Pull live navigation context ──────────────────────────────────────────
  const navState = getNavState()

  const distRemaining = navState.distKm    ?? 0
  const etaMin        = navState.etaMin    ?? 0
  const destination   = navState.destination?.name ?? null
  const isNavigating  = navState.active    ?? false

  // completionPct: we don't store the original total distance, so we derive it
  // from the ratio of elapsed distance to total. If not navigating, default 0.
  // Callers that track total distance can pass data.totalDistKm to override.
  let completionPct = 0
  if (isNavigating && data.totalDistKm > 0) {
    const elapsed = data.totalDistKm - distRemaining
    completionPct = Math.min(100, Math.max(0, (elapsed / data.totalDistKm) * 100))
  }

  // ── Map WMO codes to PCLink WeatherIcon constants ─────────────────────────
  const startWeather = wmoToWeatherIcon(data.startWmoCode ?? null)
  const destWeather  = wmoToWeatherIcon(data.destWmoCode  ?? null)

  // ── Build full payload ────────────────────────────────────────────────────
  const payload = {
    // Core speed
    speed:          data.speed ?? 0,             // km/h
    timestamp:      data.timestamp ?? Date.now(),
    userId:         data.userId ?? null,

    // Navigation context (mirrors NavigationPacket fields in PCLink.h)
    isNavigating,
    destination,
    distRemaining,                               // km
    etaMin,
    completionPct,                               // 0.0–100.0

    // Weather icons (1=sunny 2=cloudy 3=rain — matches PCLink WeatherIcon)
    startWeather,
    destWeather,
  }

  try {
    const res = await fetch(`${BASE_URL}/speed/event`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization:  `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    })

    if (!res.ok) {
      const text = await res.text()
      console.error('[speedApi] Speed API error:', text)
      return null
    }

    const result = await res.json()
    console.log('[speedApi] ✅ Speed event saved:', result)
    return result
  } catch (err) {
    console.error('[speedApi] ❌ Speed send error:', err)
    return null
  }
}

// ── getTodaySpeed ─────────────────────────────────────────────────────────────
// Fetches all speed events for today for the given user (for chart rendering).
// Unchanged from original — read-only, no nav fields needed.
//
// @param {string} userId
// @param {string} token  Bearer token
// @returns {Promise<Array>}  array of speed event objects, or [] on error
export async function getTodaySpeed(userId, token) {
  try {
    const res = await fetch(`${BASE_URL}/speed/today/${userId}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })

    if (!res.ok) {
      throw new Error(`[speedApi] Failed to fetch speed data: ${res.status}`)
    }

    return await res.json()
  } catch (err) {
    console.error('[speedApi] ❌ Fetch speed error:', err)
    return []
  }
}