// src/api/rideApi.js
const BASE_URL = 'http://roadeye.eu-north-1.elasticbeanstalk.com'

export async function getTotalDistance(userId, token) {
  try {
    const res = await fetch(`${BASE_URL}/rides/user/${userId}/total-distance`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    if (!res.ok) throw new Error(`Ride API error: ${res.status}`)
    return await res.json()
  } catch (err) {
    console.error('[rideApi] ❌', err)
    return { totalDistance: 0 }
  }
}