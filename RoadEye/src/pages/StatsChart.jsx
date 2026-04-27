import { useEffect, useState } from 'react'
import { View, Text } from 'react-native'
import { getTodaySpeed } from '../../api/speedApi'
import { useAuth } from '../../hooks/useAuth'

export default function StatsChart() {
  const [chartData, setChartData] = useState([])

  const { user } = useAuth()
  const token = user?.token

  useEffect(() => {
    if (!userId || !token) return

    async function loadData() {
      const data = await getTodaySpeed(userId, token)
      setChartData(data || [])
    }

    loadData()
  }, [userId, token])

  // 📊 Convert backend data → chart arrays
  const labels = chartData.map(d =>
    new Date(d.eventTime).toLocaleTimeString()
  )

  const speeds = chartData.map(d => d.speed)

  return (
    <View style={{ padding: 10 }}>
      <Text style={{ fontWeight: 'bold', marginBottom: 10 }}>
        Speed Chart
      </Text>

      {/* TEMP VISUAL (replace with real chart lib later) */}
      <Text>Labels:</Text>
      <Text>{JSON.stringify(labels)}</Text>

      <Text>Speeds:</Text>
      <Text>{JSON.stringify(speeds)}</Text>
    </View>
  )
}