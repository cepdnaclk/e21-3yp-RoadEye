// src/api/accelerationApi.js
const BASE_URL = 'http://roadeye.eu-north-1.elasticbeanstalk.com'

export async function sendAccelerationEvent(data, token) {
  if (!token) {
    console.warn('[accelerationApi] ⚠️ No auth token — skipped')
    return null
  }

  const payload = {
    userId:      data.userId ?? null,
    acceleration: data.acceleration ?? 0,
    tiltAngle:   data.tiltAngle ?? 0,
    latitude:    data.latitude  ?? 0,
    longitude:   data.longitude ?? 0,
    timestamp:   data.timestamp ?? Date.now(),
  }

  try {
    const res = await fetch(`${BASE_URL}/acceleration/event`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    })

    if (!res.ok) {
      const text = await res.text()
      console.error('[accelerationApi] API error:', text)
      return null
    }

    const result = await res.json()
    console.log('[accelerationApi] ✅ Saved:', result)
    return result
  } catch (err) {
    console.error('[accelerationApi] ❌ Error:', err)
    return null
  }
}