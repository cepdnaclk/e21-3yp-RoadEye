// src/api/speedApi.js

const BASE_URL = "http://10.30.12.231:8080/api"

/**
 * Send a speed reading to the backend.
 * Returns { id, speed, eventTime } so dashboard can show confirmed speed.
 */
export async function sendSpeedEvent(data, token) {
  try {
    const res = await fetch(`${BASE_URL}/speed/event`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(data),
    })

    if (!res.ok) {
      const text = await res.text()
      console.error("Speed API error:", text)
      return
    }

    const result = await res.json()
    console.log("✅ Speed saved:", result)
    return result // returns { id, speed, eventTime }

  } catch (err) {
    console.error("❌ Speed send error:", err)
    return null
  }
}


/**
 * Get today's speed readings for the chart.
 */
export async function getTodaySpeed(userId, token) {
  try {
    const res = await fetch(`${BASE_URL}/speed/today/${userId}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    if (!res.ok) throw new Error("Failed to fetch speed data")
    return await res.json()
  } catch (err) {
    console.error("❌ Fetch speed error:", err)
    return []
  }
}