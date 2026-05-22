// src/api/tiltApi.js

<<<<<<< HEAD
const BASE_URL = "http://192.168.137.251:8080/api"
=======
const BASE_URL = "http://10.30.12.231:8080/api"
>>>>>>> 5c8dbf4ad536e74b19ac6ab29fb930f97952437e

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