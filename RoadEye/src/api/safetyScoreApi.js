// src/api/safetyScoreApi.js
const BASE_URL = 'http://roadeye.eu-north-1.elasticbeanstalk.com'

export async function getSafetyScore(userId, token) {
  try {
    const res = await fetch(`${BASE_URL}/safety-score/${userId}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    if (!res.ok) throw new Error(`Safety score API error: ${res.status}`)
    return await res.json()
  } catch (err) {
    console.error('[safetyScoreApi] ❌', err)
    return null
  }
}