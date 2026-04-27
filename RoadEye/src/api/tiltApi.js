// src/api/tiltApi.js

const BASE_URL = "http://192.168.137.174:8080/api"

// 🔹 Send tilt event
export async function sendTiltEvent(data, token) {
  try {
    const res = await fetch(`${BASE_URL}/tilt/event`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(data),
    })

    const result = await res.json()

    if (!res.ok) {
      console.error("Tilt API error:", result)
      return { triggered: false }
    }

    console.log("⚠️ Tilt response:", result)

    return result   // 👈 IMPORTANT
  } catch (err) {
    console.error("❌ Tilt send error:", err)
    return { triggered: false }
  }
}