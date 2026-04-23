// src/pages/NavigationScreen.js
import React, { useRef, useEffect, useState, useCallback } from 'react'
import {
  View, StyleSheet, Platform, StatusBar,
  Text, TouchableOpacity, Alert, AppState,
} from 'react-native'
import { WebView } from 'react-native-webview'
import * as Location from 'expo-location'
import {
  startNavSession,
  stopNavSession,
  updateNavStep,
  updateNavSpeed,
  getNavState,
  setDestinationWeatherTarget,
} from '../utils/NavigationSession'

export default function NavigationScreen({ navigation }) {
  const webViewRef    = useRef(null)
  const locationSub   = useRef(null)
  const appStateRef   = useRef(AppState.currentState)
  const sessionActive = useRef(false)
  const webViewReady  = useRef(false)   // guard so we don't inject before load

  const [gpsStatus, setGpsStatus] = useState('Acquiring GPS…')

  // ── Inject helper ─────────────────────────────────────────────────────────
  const injectMessage = useCallback((data) => {
    if (!webViewReady.current) return
    const script = `
      try {
        window.dispatchEvent(new MessageEvent('message', {
          data: ${JSON.stringify(JSON.stringify(data))}
        }));
      } catch(e) {}
      true;
    `
    webViewRef.current?.injectJavaScript(script)
  }, [])

  // ── GPS ───────────────────────────────────────────────────────────────────
  const startGPS = useCallback(async () => {
    const { status } = await Location.requestForegroundPermissionsAsync()
    if (status !== 'granted') {
      Alert.alert('Location Permission', 'GPS permission is required for navigation.', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ])
      return
    }
    setGpsStatus('GPS acquiring…')
    locationSub.current?.remove()   // clear any stale sub
    locationSub.current = await Location.watchPositionAsync(
      { accuracy: Location.Accuracy.BestForNavigation, timeInterval: 1000, distanceInterval: 5 },
      (loc) => {
        const { latitude, longitude, speed } = loc.coords
        const speedKmh = speed ? Math.round(speed * 3.6) : 0
        setGpsStatus('GPS ✓')
        updateNavSpeed(speedKmh)
        injectMessage({ type: 'gps', lat: latitude, lng: longitude, speed: speedKmh })
      }
    )
  }, [injectMessage])

  // ── WebView ready — restore existing session OR start fresh GPS ───────────
  const onWebViewLoad = useCallback(() => {
    webViewReady.current = true
    const existing = getNavState()
    if (existing.active && existing.destination) {
      sessionActive.current = true

      // Restore weather card immediately
      setDestinationWeatherTarget({
        lat:  existing.destination.lat,
        lng:  existing.destination.lng,
        name: existing.destination.name,
      })

      // Small delay so the map JS finishes attaching its message listener
      setTimeout(() => {
        injectMessage({
          type:        'restoreRoute',
          destination: existing.destination.name,
          destLat:     existing.destination.lat,
          destLng:     existing.destination.lng,
          distKm:      existing.distKm,
          etaMin:      existing.etaMin,
        })
      }, 500)
    }
    startGPS()
  }, [startGPS, injectMessage])

  // ── WebView messages ──────────────────────────────────────────────────────
  const onWebViewMessage = useCallback(async (event) => {
    try {
      const msg = JSON.parse(event.nativeEvent.data)

      if (msg.type === 'route') {
        sessionActive.current = true
        await startNavSession({
          destination: { name: msg.destination, lat: msg.destLat, lng: msg.destLng },
          distKm: msg.distKm,
          etaMin: msg.etaMin,
        })
        setDestinationWeatherTarget({
          lat:  msg.destLat,
          lng:  msg.destLng,
          name: msg.destination,
        })
      }

      if (msg.type === 'step') {
        updateNavStep({ arrow: msg.arrow, text: msg.text, dist: msg.dist })
      }

      if (msg.type === 'clear' || msg.type === 'arrived') {
        sessionActive.current = false
        await stopNavSession()   // this also clears WeatherCard via NavigationSession
      }

    } catch (_) {}
  }, [])

  // ── App background/foreground ─────────────────────────────────────────────
  useEffect(() => {
    const sub = AppState.addEventListener('change', (nextState) => {
      if (appStateRef.current === 'active' && nextState.match(/inactive|background/)) {
        if (sessionActive.current) {
          locationSub.current?.remove()
          locationSub.current = null
        }
      }
      if (appStateRef.current.match(/inactive|background/) && nextState === 'active') {
        if (sessionActive.current && !locationSub.current) {
          startGPS()
        }
      }
      appStateRef.current = nextState
    })
    return () => sub.remove()
  }, [startGPS])

  // ── Mount/unmount ─────────────────────────────────────────────────────────
  useEffect(() => {
    const existing = getNavState()
    if (existing.active) sessionActive.current = true
    // GPS starts in onWebViewLoad — not here — so WebView is ready first
    return () => {
      locationSub.current?.remove()
      webViewReady.current = false
      // Do NOT stop session — must survive screen unmount
    }
  }, [])

  // ── Back handler ──────────────────────────────────────────────────────────
  const handleBack = () => {
    if (sessionActive.current) {
      Alert.alert(
        'Navigation Active',
        'Navigation is still running in the background. Stop it?',
        [
          { text: 'Keep Running', style: 'cancel', onPress: () => navigation.goBack() },
          {
            text: 'Stop Navigation', style: 'destructive',
            onPress: async () => {
              await stopNavSession()   // clears WeatherCard too
              sessionActive.current = false
              navigation.goBack()
            },
          },
        ]
      )
    } else {
      navigation.goBack()
    }
  }

  const mapSource = Platform.select({
    android: { uri: 'file:///android_asset/navigation-map.html' },
    ios:     { uri: 'navigation-map.html' },
  })

  return (
    <View style={styles.container}>
      <StatusBar hidden />
      <WebView
        ref={webViewRef}
        source={mapSource}
        style={styles.webview}
        onMessage={onWebViewMessage}
        onLoad={onWebViewLoad}
        javaScriptEnabled
        domStorageEnabled
        geolocationEnabled
        allowFileAccess
        allowUniversalAccessFromFileURLs
        mixedContentMode="always"
      />
      {gpsStatus !== 'GPS ✓' && (
        <View style={styles.gpsBadge} pointerEvents="none">
          <Text style={styles.gpsBadgeText}>{gpsStatus}</Text>
        </View>
      )}
      <TouchableOpacity style={styles.backBtn} onPress={handleBack}>
        <Text style={styles.backBtnText}>‹</Text>
      </TouchableOpacity>
    </View>
  )
}

const ACCENT = '#00dca0'
const BG     = 'rgba(10, 12, 16, 0.88)'
const BORDER = 'rgba(0, 220, 180, 0.18)'

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0c10' },
  webview:   { flex: 1, backgroundColor: '#0a0c10' },
  gpsBadge: {
    position: 'absolute', top: 80, alignSelf: 'center',
    backgroundColor: BG, borderWidth: 1, borderColor: BORDER,
    borderRadius: 4, paddingHorizontal: 16, paddingVertical: 6,
  },
  gpsBadgeText: {
    color: ACCENT,
    fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace',
    fontSize: 11, letterSpacing: 1.5, textTransform: 'uppercase',
  },
  backBtn: {
    position: 'absolute', top: 12, left: 12,
    width: 36, height: 36, backgroundColor: BG,
    borderWidth: 1, borderColor: BORDER, borderRadius: 5,
    alignItems: 'center', justifyContent: 'center',
  },
  backBtnText: { color: ACCENT, fontSize: 24, lineHeight: 28, marginTop: -2 },
})