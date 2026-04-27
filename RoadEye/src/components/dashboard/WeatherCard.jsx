// src/components/dashboard/WeatherCard.jsx

import { useEffect, useState, useRef } from 'react'
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native'
import * as Location from 'expo-location'
import { colors } from '../../utils/theme'
import {
  registerDestWeatherListener,
  unregisterDestWeatherListener,
  setNavWeather,
} from '../../utils/NavigationSession'
import HelmetUDP, { WeatherIcon } from '../../utils/HelmetUDP'

const C = colors

// ── Open-Meteo — free, no API key ─────────────────────────────────────────────
const fetchWeather = async (lat, lng) => {
  const url =
    `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}` +
    `&current=temperature_2m,relative_humidity_2m,wind_speed_10m,weather_code` +
    `&daily=temperature_2m_max,temperature_2m_min&timezone=auto&forecast_days=1`
  const res  = await fetch(url)
  const data = await res.json()
  const c = data.current
  const d = data.daily
  return {
    temp:     Math.round(c.temperature_2m),
    humidity: c.relative_humidity_2m,
    wind:     Math.round(c.wind_speed_10m),
    code:     c.weather_code,           // raw WMO code — forwarded to HelmetUDP
    high:     Math.round(d.temperature_2m_max[0]),
    low:      Math.round(d.temperature_2m_min[0]),
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

// ── WMO code → display icon + label ───────────────────────────────────────────
const wmoIcon = (code) => {
  if (code === 0)  return { icon: '☀️',  label: 'Clear' }
  if (code <= 2)   return { icon: '🌤️', label: 'Partly Cloudy' }
  if (code === 3)  return { icon: '☁️',  label: 'Overcast' }
  if (code <= 49)  return { icon: '🌫️', label: 'Foggy' }
  if (code <= 59)  return { icon: '🌦️', label: 'Drizzle' }
  if (code <= 69)  return { icon: '🌧️', label: 'Rain' }
  if (code <= 79)  return { icon: '❄️',  label: 'Snow' }
  if (code <= 84)  return { icon: '🌧️', label: 'Showers' }
  if (code <= 94)  return { icon: '⛈️',  label: 'Thunderstorm' }
  return                  { icon: '⛈️',  label: 'Storm' }
}

// ── WMO code → PCLink WeatherIcon constant (1=sunny 2=cloudy 3=rain) ──────────
// Mirrors wmoToWeatherIcon() in NavigationSession.js and speedApi.js.
function wmoToWeatherIcon(code) {
  if (code == null) return WeatherIcon.SUNNY
  if (code <= 2)    return WeatherIcon.SUNNY
  if (code === 3)   return WeatherIcon.CLOUDY
  if (code <= 49)   return WeatherIcon.CLOUDY
  if (code <= 69)   return WeatherIcon.RAIN
  if (code <= 79)   return WeatherIcon.CLOUDY
  if (code <= 94)   return WeatherIcon.RAIN
  return                   WeatherIcon.RAIN
}

// ── COMPONENT ──────────────────────────────────────────────────────────────────
export default function WeatherCard() {
  const [origin,      setOrigin]      = useState(null)
  const [dest,        setDest]        = useState(null)
  const [loading,     setLoading]     = useState(true)
  const [destLoading, setDestLoading] = useState(false)
  const refreshTimer = useRef(null)

  // Keep a ref to latest origin so the dest-weather callback can read it
  // when pushing combined WMO codes to NavigationSession.
  const originRef = useRef(null)

  // ── Push weather to helmet (PKT_WEATHER) and NavigationSession ─────────────
  // Called whenever origin or dest weather is refreshed.
  const pushWeatherToHelmet = (originData, destData) => {
    // PKT_WEATHER — local ambient conditions sent to the helmet display
    if (originData && HelmetUDP.hasPeerIP()) {
      HelmetUDP.sendWeather({
        tempC:       originData.temp,
        humidity:    originData.humidity,
        weatherIcon: wmoToWeatherIcon(originData.code),
      })
    }

    // Forward WMO codes to NavigationSession so PKT_NAVIGATION startWeather /
    // destWeather fields stay in sync with what WeatherCard is showing.
    setNavWeather({
      startWmoCode: originData?.code ?? null,
      destWmoCode:  destData?.code   ?? null,
    })
  }

  // ── Register with NavigationSession — destination weather ──────────────────
  useEffect(() => {
    registerDestWeatherListener(async (target) => {
      if (!target) {
        setDest(null)
        setDestLoading(false)
        // Clear dest WMO code in NavigationSession
        setNavWeather({ startWmoCode: originRef.current?.code ?? null, destWmoCode: null })
        return
      }
      setDestLoading(true)
      try {
        const w = await fetchWeather(target.lat, target.lng)
        const destData = { ...w, name: target.name || 'Destination' }
        setDest(destData)
        pushWeatherToHelmet(originRef.current, destData)
      } catch {
        setDest(null)
      } finally {
        setDestLoading(false)
      }
    })
    return () => unregisterDestWeatherListener()
  }, [])

  // ── Origin weather (live location, refreshes every 1 min) ──────────────────
  const loadOrigin = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync()
      if (status !== 'granted') {
        const fallback = { temp: '--', humidity: '--', wind: '--', code: 0, high: '--', low: '--', name: 'Location denied' }
        setOrigin(fallback)
        originRef.current = fallback
        setLoading(false)
        return
      }
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced })
      const { latitude: lat, longitude: lng } = loc.coords
      const [w, name] = await Promise.all([fetchWeather(lat, lng), reverseGeocode(lat, lng)])
      const originData = { ...w, name }
      setOrigin(originData)
      originRef.current = originData
      // Push fresh origin weather to helmet and NavigationSession
      pushWeatherToHelmet(originData, dest)
    } catch {
      const fallback = { temp: '--', humidity: '--', wind: '--', code: 0, high: '--', low: '--', name: 'Unavailable' }
      setOrigin(fallback)
      originRef.current = fallback
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadOrigin()
    refreshTimer.current = setInterval(loadOrigin, 60 * 1000)
    return () => clearInterval(refreshTimer.current)
  }, [])

  // ── Loading state ───────────────────────────────────────────────────────────
  if (loading) {
    return (
      <View style={[styles.card, styles.loadingCard]}>
        <ActivityIndicator color={C.primary || '#5B47E0'} />
        <Text style={styles.loadingText}>Fetching weather…</Text>
      </View>
    )
  }

  const hasDest = !!dest || destLoading

  // ── No destination: full-width single card ──────────────────────────────────
  if (!hasDest) {
    return (
      <View style={styles.card}>
        <FullWeatherBlock data={origin} />
      </View>
    )
  }

  // ── Destination active: split two-column card ───────────────────────────────
  return (
    <View style={styles.card}>
      <SplitWeatherBlock data={origin} label="MY LOCATION" accent="#5B47E0" />
      <View style={styles.divider} />
      {destLoading ? (
        <View style={styles.destLoading}>
          <ActivityIndicator size="small" color="#E05B47" />
          <Text style={styles.destLoadingText}>Destination…</Text>
        </View>
      ) : (
        <SplitWeatherBlock data={dest} label="DESTINATION" accent="#E05B47" />
      )}
    </View>
  )
}

// ── Full-width block ───────────────────────────────────────────────────────────
function FullWeatherBlock({ data }) {
  if (!data) return null
  const { icon, label: condition } = wmoIcon(data.code || 0)
  return (
    <View style={styles.fullBlock}>
      <View style={styles.fullLeft}>
        <Text style={styles.fullTemp}>
          {data.temp}°<Text style={styles.fullUnit}>C</Text>
        </Text>
        <Text style={styles.fullCondition}>{condition}</Text>
        <Text style={styles.fullRange}>H: {data.high}°  L: {data.low}°</Text>
      </View>
      <View style={styles.fullMeta}>
        <View style={styles.fullMetaRow}>
          <Text>💧</Text>
          <Text style={styles.fullMetaLabel}>Humidity</Text>
          <Text style={styles.fullMetaVal}>{data.humidity}%</Text>
        </View>
        <View style={styles.fullMetaRow}>
          <Text>🌬️</Text>
          <Text style={styles.fullMetaLabel}>Wind</Text>
          <Text style={styles.fullMetaVal}>{data.wind} km/h</Text>
        </View>
        <Text style={styles.fullLocation} numberOfLines={1}>{data.name}</Text>
      </View>
      <View style={styles.fullIconBox}>
        <Text style={styles.fullIcon}>{icon}</Text>
      </View>
    </View>
  )
}

// ── Compact split block ────────────────────────────────────────────────────────
function SplitWeatherBlock({ data, label, accent }) {
  if (!data) return null
  const { icon, label: condition } = wmoIcon(data.code || 0)
  return (
    <View style={styles.splitBlock}>
      <Text style={[styles.splitLabel, { color: accent }]}>{label}</Text>
      <Text style={styles.splitLocation} numberOfLines={1}>{data.name}</Text>
      <View style={styles.splitTempRow}>
        <Text style={styles.splitIcon}>{icon}</Text>
        <Text style={styles.splitTemp}>{data.temp}°</Text>
        <Text style={styles.splitUnit}>C</Text>
      </View>
      <Text style={styles.splitCondition}>{condition}</Text>
      <Text style={styles.splitRange}>H: {data.high}°  L: {data.low}°</Text>
      <View style={styles.splitMeta}>
        <Text style={styles.splitMetaItem}>💧 {data.humidity}%</Text>
        <Text style={styles.splitMetaItem}>🌬️ {data.wind} km/h</Text>
      </View>
    </View>
  )
}

// ── Styles ─────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  card: {
    backgroundColor: C.white,
    borderRadius: 16, padding: 16, marginVertical: 10,
    flexDirection: 'row', alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 8, elevation: 2,
  },
  loadingCard:  { justifyContent: 'center', gap: 10, minHeight: 80 },
  loadingText:  { fontSize: 12, color: C.muted },

  fullBlock:     { flex: 1, flexDirection: 'row', alignItems: 'center' },
  fullLeft:      { marginRight: 4 },
  fullTemp:      { fontSize: 32, fontWeight: '800', color: C.text, lineHeight: 36 },
  fullUnit:      { fontSize: 11, color: C.muted },
  fullCondition: { fontSize: 12, fontWeight: '600', color: C.text, marginTop: 4 },
  fullRange:     { fontSize: 10, color: C.muted },
  fullMeta:      { flex: 1, paddingLeft: 20, gap: 6 },
  fullMetaRow:   { flexDirection: 'row', alignItems: 'center', gap: 6 },
  fullMetaLabel: { fontSize: 12, fontWeight: '600', color: C.text },
  fullMetaVal:   { fontSize: 12, fontWeight: '700', color: C.text, marginLeft: 'auto' },
  fullLocation:  { fontSize: 10, color: C.muted, marginTop: 6 },
  fullIconBox:   { width: 52, height: 52, borderRadius: 14, backgroundColor: '#FFF7ED', alignItems: 'center', justifyContent: 'center', marginLeft: 12 },
  fullIcon:      { fontSize: 26 },

  splitBlock:     { flex: 1, paddingHorizontal: 4 },
  splitLabel:     { fontSize: 9, fontWeight: '800', letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 2 },
  splitLocation:  { fontSize: 10, fontWeight: '600', color: C.muted, marginBottom: 5 },
  splitTempRow:   { flexDirection: 'row', alignItems: 'flex-end', gap: 3, marginBottom: 2 },
  splitIcon:      { fontSize: 22, lineHeight: 30 },
  splitTemp:      { fontSize: 28, fontWeight: '800', color: C.text, lineHeight: 32 },
  splitUnit:      { fontSize: 10, color: C.muted, marginBottom: 3 },
  splitCondition: { fontSize: 11, fontWeight: '600', color: C.text },
  splitRange:     { fontSize: 10, color: C.muted, marginTop: 1, marginBottom: 5 },
  splitMeta:      { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  splitMetaItem:  { fontSize: 10, color: C.text, fontWeight: '500' },

  divider: { width: 1, alignSelf: 'stretch', backgroundColor: '#E5E7EB', marginHorizontal: 8 },

  destLoading:     { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8, paddingHorizontal: 4 },
  destLoadingText: { fontSize: 11, color: C.muted },
})