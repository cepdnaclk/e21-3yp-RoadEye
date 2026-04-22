import { useEffect, useState, useRef } from 'react'
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native'
import * as Location from 'expo-location'
import { colors } from '../../utils/theme'

const C = colors

// ── Open-Meteo — free, no API key ──────────────────────────────────────────
const fetchWeather = async (lat, lng) => {
  const url =
    `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}` +
    `&current=temperature_2m,relative_humidity_2m,wind_speed_10m,weather_code` +
    `&daily=temperature_2m_max,temperature_2m_min&timezone=auto&forecast_days=1`
  const res  = await fetch(url)
  const data = await res.json()
  const c    = data.current
  const d    = data.daily
  return {
    temp:      Math.round(c.temperature_2m),
    humidity:  c.relative_humidity_2m,
    wind:      Math.round(c.wind_speed_10m),
    code:      c.weather_code,
    high:      Math.round(d.temperature_2m_max[0]),
    low:       Math.round(d.temperature_2m_min[0]),
  }
}

const reverseGeocode = async (lat, lng) => {
  try {
    const res  = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`
    )
    const data = await res.json()
    return data.address?.city || data.address?.town || data.address?.village || 'Your Location'
  } catch { return 'Your Location' }
}

// WMO weather codes → emoji + label
const wmoIcon = (code) => {
  if (code === 0)               return { icon: '☀️',  label: 'Clear' }
  if (code <= 2)                return { icon: '🌤️', label: 'Partly Cloudy' }
  if (code === 3)               return { icon: '☁️',  label: 'Overcast' }
  if (code <= 49)               return { icon: '🌫️', label: 'Foggy' }
  if (code <= 59)               return { icon: '🌦️', label: 'Drizzle' }
  if (code <= 69)               return { icon: '🌧️', label: 'Rain' }
  if (code <= 79)               return { icon: '❄️',  label: 'Snow' }
  if (code <= 84)               return { icon: '🌧️', label: 'Showers' }
  if (code <= 94)               return { icon: '⛈️',  label: 'Thunderstorm' }
  return                               { icon: '⛈️',  label: 'Storm' }
}

// Shared event bus — NavigationScreen calls this when destination changes
// Usage from NavigationScreen.js:
//   import { setDestinationWeatherTarget } from '../components/dashboard/WeatherCard'
//   setDestinationWeatherTarget({ lat, lng, name })   // when route set
//   setDestinationWeatherTarget(null)                  // when route cleared
let _destListener = null
export const setDestinationWeatherTarget = (target) => {
  if (_destListener) _destListener(target)
}

// ── COMPONENT ──────────────────────────────────────────────────────────────
export default function WeatherCard() {
  const [origin, setOrigin]   = useState(null)   // { temp, humidity, wind, code, high, low, name }
  const [dest,   setDest]     = useState(null)   // same shape + name
  const [loading, setLoading] = useState(true)
  const [destLoading, setDestLoading] = useState(false)
  const refreshTimer = useRef(null)
  const destTarget   = useRef(null)

  // Register destination listener
  useEffect(() => {
    _destListener = async (target) => {
      destTarget.current = target
      if (!target) { setDest(null); return }
      setDestLoading(true)
      try {
        const w = await fetchWeather(target.lat, target.lng)
        setDest({ ...w, name: target.name || 'Destination' })
      } catch { setDest(null) }
      finally { setDestLoading(false) }
    }
    return () => { _destListener = null }
  }, [])

  // Fetch origin weather (live location)
  const loadOrigin = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync()
      if (status !== 'granted') {
        setOrigin({ temp: '--', humidity: '--', wind: '--', code: 0, high: '--', low: '--', name: 'Location denied' })
        setLoading(false)
        return
      }
      const loc  = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced })
      const { latitude: lat, longitude: lng } = loc.coords
      const [w, name] = await Promise.all([fetchWeather(lat, lng), reverseGeocode(lat, lng)])
      setOrigin({ ...w, name })
    } catch (e) {
      setOrigin({ temp: '--', humidity: '--', wind: '--', code: 0, high: '--', low: '--', name: 'Unavailable' })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadOrigin()
    // Refresh every 1 minutes
    refreshTimer.current = setInterval(loadOrigin, 60 * 1000)
    return () => clearInterval(refreshTimer.current)
  }, [])

  if (loading) {
    return (
      <View style={[styles.card, styles.loadingCard]}>
        <ActivityIndicator color={C.primary || '#5B47E0'} />
        <Text style={styles.loadingText}>Fetching weather…</Text>
      </View>
    )
  }

  const hasDest = !!dest || destLoading

  return (
    <View style={styles.card}>
      {/* ── Origin ── */}
      <WeatherBlock data={origin} label="MY LOCATION" accent="#5B47E0" />

      {/* ── Divider (only when destination present) ── */}
      {hasDest && <View style={styles.divider} />}

      {/* ── Destination ── */}
      {destLoading && (
        <View style={styles.destLoading}>
          <ActivityIndicator size="small" color="#E05B47" />
          <Text style={styles.destLoadingText}>Destination…</Text>
        </View>
      )}
      {dest && !destLoading && (
        <WeatherBlock data={dest} label="DESTINATION" accent="#E05B47" />
      )}
    </View>
  )
}

// ── Sub-component: one weather column ──────────────────────────────────────
function WeatherBlock({ data, label, accent }) {
  const { icon, label: condition } = wmoIcon(data.code || 0)
  return (
    <View style={styles.block}>
      <Text style={[styles.blockLabel, { color: accent }]}>{label}</Text>
      <Text style={styles.locationName} numberOfLines={1}>{data.name}</Text>

      <View style={styles.tempRow}>
        <Text style={styles.weatherIcon}>{icon}</Text>
        <Text style={styles.temp}>{data.temp}°</Text>
        <Text style={styles.unit}>C</Text>
      </View>

      <Text style={styles.condition}>{condition}</Text>
      <Text style={styles.range}>H: {data.high}°  L: {data.low}°</Text>

      <View style={styles.metaRow}>
        <Text style={styles.metaItem}>💧 {data.humidity}%</Text>
        <Text style={styles.metaItem}>🌬️ {data.wind} km/h</Text>
      </View>
    </View>
  )
}

// ── Styles ─────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  card: {
    backgroundColor: C.white,
    borderRadius: 16,
    padding: 16,
    marginVertical: 10,
    flexDirection: 'row',
    alignItems: 'flex-start',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
    gap: 0,
  },
  loadingCard: {
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
    minHeight: 80,
  },
  loadingText: { fontSize: 12, color: C.muted },

  // Blocks
  block: { flex: 1, paddingHorizontal: 4 },
  blockLabel: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  locationName: {
    fontSize: 11,
    fontWeight: '600',
    color: C.muted,
    marginBottom: 6,
  },

  tempRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 4, marginBottom: 2 },
  weatherIcon: { fontSize: 24, lineHeight: 32 },
  temp:  { fontSize: 30, fontWeight: '800', color: C.text, lineHeight: 34 },
  unit:  { fontSize: 11, color: C.muted, marginBottom: 4 },

  condition: { fontSize: 11, fontWeight: '600', color: C.text },
  range:     { fontSize: 10, color: C.muted, marginTop: 1, marginBottom: 6 },

  metaRow:  { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  metaItem: { fontSize: 10, color: C.text, fontWeight: '500' },

  // Divider
  divider: {
    width: 1,
    alignSelf: 'stretch',
    backgroundColor: '#E5E7EB',
    marginHorizontal: 8,
  },

  // Dest loading state
  destLoading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 4,
  },
  destLoadingText: { fontSize: 11, color: C.muted },
})