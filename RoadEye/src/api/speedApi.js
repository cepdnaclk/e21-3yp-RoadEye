// src/api/speedApi.js

import { getNavState } from '../utils/NavigationSession'
import { wmoToWeatherIcon } from '../utils/PCLinkConstants'

const BASE_URL = 'http://roadeye.eu-north-1.elasticbeanstalk.com'

export async function sendSpeedEvent(data, token) {
  if (!token) {
    console.warn('[speedApi] ⚠️ No auth token — speed event skipped')
    return null
  }

  const navState = getNavState()

  const distRemaining = navState.distKm ?? 0
  const etaMin = navState.etaMin ?? 0
  const destination = navState.destination?.name ?? null
  const isNavigating = navState.active ?? false

  let completionPct = 0
  if (isNavigating && data.totalDistKm > 0) {
    const elapsed = data.totalDistKm - distRemaining
    completionPct = Math.min(
      100,
      Math.max(0, (elapsed / data.totalDistKm) * 100)
    )
  }

  const startWeather = wmoToWeatherIcon(data.startWmoCode ?? null)
  const destWeather = wmoToWeatherIcon(data.destWmoCode ?? null)

  const payload = {
    speed: data.speed ?? 0,
    timestamp: data.timestamp ?? Date.now(),
    userId: data.userId ?? null,

    isNavigating,
    destination,
    distRemaining,
    etaMin,
    completionPct,

    startWeather,
    destWeather,
  }

  try {
    const res = await fetch(`${BASE_URL}/speed/event`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
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