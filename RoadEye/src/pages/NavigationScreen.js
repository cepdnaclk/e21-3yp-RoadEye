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
  setHelmetView,
} from '../utils/NavigationSession'
import HelmetUDP from '../utils/HelmetUDP'

export default function NavigationScreen({ navigation }) {
  const webViewRef    = useRef(null)
  const locationSub   = useRef(null)
  const appStateRef   = useRef(AppState.currentState)
  const sessionActive = useRef(false)
  const webViewReady  = useRef(false)

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

  // ── Helmet view helpers ───────────────────────────────────────────────────
  // Switch the WebView map to dark-bg / white-roads tile layer for helmet cast.
  // Also fires a UDP packet so the helmet ESP32 display knows the theme.
  const enableHelmetView = useCallback(() => {
    injectMessage({ type: 'helmetView', active: true })
    setHelmetView(true)
    HelmetUDP.send({ type: 'helmetViewActive', theme: 'dark' })
  }, [injectMessage])

  const disableHelmetView = useCallback(() => {
    injectMessage({ type: 'helmetView', active: false })
    setHelmetView(false)
    HelmetUDP.send({ type: 'helmetViewActive', theme: 'normal' })
  }, [injectMessage])

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
    locationSub.current?.remove()
    locationSub.current = await Location.watchPositionAsync(
      { accuracy: Location.Accuracy.BestForNavigation, timeInterval: 1000, distanceInterval: 5 },
      (loc) => {
        const { latitude, longitude, speed, heading } = loc.coords
        const speedKmh = speed ? Math.round(speed * 3.6) : 0
        setGpsStatus('GPS ✓')
        updateNavSpeed(speedKmh)

        // Push GPS to WebView map
        injectMessage({ type: 'gps', lat: latitude, lng: longitude, speed: speedKmh })

        // ── UDP → helmet: live position packet ───────────────────────────
        HelmetUDP.send({
          type:    'gps',
          lat:     latitude,
          lng:     longitude,
          speed:   speedKmh,
          heading: heading ?? 0,
        })
      }
    )
  }, [injectMessage])

  // ── WebView ready — restore existing session OR start fresh GPS ───────────
  const onWebViewLoad = useCallback(() => {
    webViewReady.current = true
    const existing = getNavState()
    if (existing.active && existing.destination) {
      sessionActive.current = true

      setDestinationWeatherTarget({
        lat:  existing.destination.lat,
        lng:  existing.destination.lng,
        name: existing.destination.name,
      })

      setTimeout(() => {
        injectMessage({
          type:        'restoreRoute',
          destination: existing.destination.name,
          destLat:     existing.destination.lat,
          destLng:     existing.destination.lng,
          distKm:      existing.distKm,
          etaMin:      existing.etaMin,
        })

        // ── UDP: restore route on helmet display ─────────────────────────
        HelmetUDP.send({
          type:        'route',
          destination: existing.destination.name,
          destLat:     existing.destination.lat,
          destLng:     existing.destination.lng,
          distKm:      existing.distKm,
          etaMin:      existing.etaMin,
        })

        if (existing.helmetView) {
          setTimeout(() => enableHelmetView(), 800)
        }
      }, 500)
    }
    startGPS()
  }, [startGPS, injectMessage, enableHelmetView])

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

        // ── UDP: send full route to helmet ───────────────────────────────
        HelmetUDP.send({
          type:        'route',
          destination: msg.destination,
          destLat:     msg.destLat,
          destLng:     msg.destLng,
          distKm:      msg.distKm,
          etaMin:      msg.etaMin,
        })
      }

      if (msg.type === 'step') {
        updateNavStep({ arrow: msg.arrow, text: msg.text, dist: msg.dist })

        // ── UDP: current turn instruction to helmet ──────────────────────
        HelmetUDP.send({
          type:  'step',
          arrow: msg.arrow,
          text:  msg.text,
          dist:  msg.dist,
        })
      }

      if (msg.type === 'clear' || msg.type === 'arrived') {
        sessionActive.current = false
        await stopNavSession()

        // ── UDP: tell helmet to clear the route ──────────────────────────
        HelmetUDP.send({ type: 'clear' })
      }

      if (msg.type === 'helmetViewToggled') {
        setHelmetView(msg.active)
      }

    } catch (_) {}
  }, [])

  // ── Helmet connect / disconnect (called by BT/WiFi bridge) ───────────────
  // Set the helmet IP before enabling the UDP stream.
  const sendHelmetConnected = useCallback((helmetIp) => {
    // Configure UDP target — default port 4210, matches ESP32 firmware
    if (helmetIp) HelmetUDP.setTarget(helmetIp, 4210)

    injectMessage({ type: 'helmetConnected' })
    enableHelmetView()
  }, [injectMessage, enableHelmetView])

  const sendHelmetDisconnected = useCallback(() => {
    HelmetUDP.send({ type: 'clear' })
    HelmetUDP.destroy()

    injectMessage({ type: 'helmetDisconnected' })
    disableHelmetView()
  }, [injectMessage, disableHelmetView])

  // ── App background / foreground ───────────────────────────────────────────
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

  // ── Mount / unmount ───────────────────────────────────────────────────────
  useEffect(() => {
    const existing = getNavState()
    if (existing.active) sessionActive.current = true

    return () => {
      locationSub.current?.remove()
      webViewReady.current = false
      // Session intentionally NOT stopped — must survive screen changes
      // UDP stays open so background location still feeds the helmet
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
              HelmetUDP.send({ type: 'clear' })
              await stopNavSession()
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