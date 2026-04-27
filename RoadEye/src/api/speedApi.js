// src/api/speedApi.js
//
// HTTP backend API for speed/navigation events.
//
// sendSpeedEvent() builds a complete navigation-aware payload by merging:
//   • live speed passed by the caller
//   • distKm / etaMin / destination from NavigationSession state
//   • startWeather / destWeather mapped from WMO weather codes to the
//     WeatherIcon constants (1=sunny 2=cloudy 3=rain) used by PCLink.h
//
// getTodaySpeed() is unchanged — read-only fetch for chart data.

import { getNavState } from '../utils/NavigationSession'

const BASE_URL = 'http://YOUR-IP:8080/api'

// ── WMO weather-code → PCLink WeatherIcon (1=sunny 2=cloudy 3=rain) ──────────
// Mirrors the wmoIcon() mapping in WeatherCard.jsx but returns the integer
// constant expected by the backend and NavigationPacket.startWeather / destWeather
//
//   WMO 0        → clear sky              → SUNNY  (1)
//   WMO 1–2      → mainly/partly clear    → SUNNY  (1)
//   WMO 3        → overcast               → CLOUDY (2)
//   WMO 45–49    → fog                    → CLOUDY (2)
//   WMO 51–69    → drizzle / rain         → RAIN   (3)
//   WMO 71–79    → snow                   → CLOUDY (2)  — no snow icon in PCLink
//   WMO 80–84    → showers                → RAIN   (3)
//   WMO 85–94    → thunderstorm           → RAIN   (3)
//   WMO 95+      → severe storm           → RAIN   (3)
const WEATHER_ICON = { SUNNY: 1, CLOUDY: 2, RAIN: 3 }

function wmoToWeatherIcon(code) {
  if (code == null)  return WEATHER_ICON.SUNNY
  if (code <= 2)     return WEATHER_ICON.SUNNY
  if (code === 3)    return WEATHER_ICON.CLOUDY
  if (code <= 49)    return WEATHER_ICON.CLOUDY   // fog variants
  if (code <= 69)    return WEATHER_ICON.RAIN     // drizzle + rain
  if (code <= 79)    return WEATHER_ICON.CLOUDY   // snow → closest match
  if (code <= 94)    return WEATHER_ICON.RAIN     // showers + thunderstorm
  return                    WEATHER_ICON.RAIN     // severe storm
}

// ── sendSpeedEvent ────────────────────────────────────────────────────────────
// Call this whenever you have a fresh speed reading.
//
// @param {object} data
//   @param {number}  data.speed          km/h  (required)
//   @param {string}  [data.userId]       user identifier
//   @param {number}  [data.startWmoCode] WMO weather code at origin  (from WeatherCard origin state)
//   @param {number}  [data.destWmoCode]  WMO weather code at destination (from WeatherCard dest state)
//   @param {number}  [data.timestamp]    ms epoch — defaults to Date.now()
// @param {string} token  Bearer token
//
// The function enriches `data` with navigation fields from NavigationSession:
//   distRemaining  (km)       — from navState.distKm
//   completionPct  (0–100)    — derived from distKm + initial distKm
//   startWeather   (1/2/3)    — mapped from data.startWmoCode
//   destWeather    (1/2/3)    — mapped from data.destWmoCode
export async function sendSpeedEvent(data, token) {
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