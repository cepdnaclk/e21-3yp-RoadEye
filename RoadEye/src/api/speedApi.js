// src/api/speedApi.js

const BASE_URL = "http://YOUR-IP:8080/api"

// 🔹 Send speed event
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
  } catch (err) {
    console.error("❌ Speed send error:", err)
  }
}

// 🔹 Get today's speeds (for chart)
export async function getTodaySpeed(userId, token) {
  try {
    const res = await fetch(`${BASE_URL}/speed/today/${userId}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })

    if (!res.ok) {
      throw new Error("Failed to fetch speed data")
    }

    return await res.json()
  } catch (err) {
    console.error("❌ Fetch speed error:", err)
    return []
  }
}