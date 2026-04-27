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
  updateNavDist,
  getNavState,
  setDestinationWeatherTarget,
  setHelmetView,
} from '../utils/NavigationSession'
import HelmetUDP from '../utils/HelmetUDP'
import HelmetMapStreamer from '../utils/HelmetMapStreamer'
import { sendSpeedEvent } from '../api/speedApi'

const ESP32_IP = 'esp32.local'

// ── Auth — replace with your actual auth context / store ─────────────────────
// These are placeholders; swap in however you retrieve userId and token.
const getCurrentUserId = () => null   // e.g. authStore.userId
const getCurrentToken  = () => null   // e.g. authStore.token

export default function NavigationScreen({ navigation }) {
  const webViewRef    = useRef(null)
  const locationSub   = useRef(null)
  const appStateRef   = useRef(AppState.currentState)
  const sessionActive = useRef(false)
  const webViewReady  = useRef(false)

  // Track total route distance so speedApi can compute completionPct
  const totalDistKmRef = useRef(null)

  // Latest WMO weather codes from WeatherCard — forwarded to speedApi
  const weatherCodesRef = useRef({ startWmoCode: null, destWmoCode: null })

  const [gpsStatus,       setGpsStatus]       = useState('Acquiring GPS…')
  const [helmetConnected, setHelmetConnected] = useState(HelmetMapStreamer.isActive())

  // ── Inject helpers ──────────────────────────────────────────────────────────
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

  const injectJS = useCallback((jsString) => {
    if (!webViewReady.current) return
    webViewRef.current?.injectJavaScript(jsString)
  }, [])

  // ── Helmet view helpers ─────────────────────────────────────────────────────
  const enableHelmetView = useCallback(() => {
    injectMessage({ type: 'helmetView', active: true })
    setHelmetView(true)
  }, [injectMessage])

  const disableHelmetView = useCallback(() => {
    injectMessage({ type: 'helmetView', active: false })
    setHelmetView(false)
  }, [injectMessage])

  // ── GPS ─────────────────────────────────────────────────────────────────────
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
        const { latitude, longitude, speed } = loc.coords
        const speedKmh = speed ? Math.round(speed * 3.6) : 0
        setGpsStatus('GPS ✓')
        updateNavSpeed(speedKmh)

        // Forward location to the WebView map
        injectMessage({ type: 'gps', lat: latitude, lng: longitude, speed: speedKmh })

        // PKT_NAVIGATION — NavigationSession.updateNavSpeed() already calls
        // _sendNavigationPacket() internally, so no duplicate send needed here.

        // POST speed event to HTTP backend with full nav context
        sendSpeedEvent(
          {
            speed:        speedKmh,
            userId:       getCurrentUserId(),
            totalDistKm:  totalDistKmRef.current,
            startWmoCode: weatherCodesRef.current.startWmoCode,
            destWmoCode:  weatherCodesRef.current.destWmoCode,
          },
          getCurrentToken(),
        )
      }
    )
  }, [injectMessage])

  // ── WebView ready ───────────────────────────────────────────────────────────
  const onWebViewLoad = useCallback(() => {
    webViewReady.current = true

    if (HelmetMapStreamer.isActive()) {
      HelmetMapStreamer.updateInject(injectJS)
    }

    const existing = getNavState()
    if (existing.active && existing.destination) {
      sessionActive.current          = true
      totalDistKmRef.current         = existing.totalDistKm ?? existing.distKm
      weatherCodesRef.current        = {
        startWmoCode: existing.startWmoCode ?? null,
        destWmoCode:  existing.destWmoCode  ?? null,
      }
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
        if (existing.helmetView) {
          setTimeout(() => enableHelmetView(), 800)
        }
      }, 500)
    }
    startGPS()
  }, [startGPS, injectMessage, enableHelmetView, injectJS])

  // ── WebView messages ────────────────────────────────────────────────────────
  const onWebViewMessage = useCallback(async (event) => {
    try {
      const msg = JSON.parse(event.nativeEvent.data)

      // ── Map frame from HelmetMapStreamer canvas capture ─────────────────
      if (msg.type === '__mapFrame') {
        if (msg.b64) HelmetMapStreamer.ingestFrame(msg.b64)
        return
      }

      // ── Route started ───────────────────────────────────────────────────
      if (msg.type === 'route') {
        sessionActive.current  = true
        totalDistKmRef.current = msg.distKm   // snapshot for completionPct

        await startNavSession({
          destination: { name: msg.destination, lat: msg.destLat, lng: msg.destLng },
          distKm:  msg.distKm,
          etaMin:  msg.etaMin,
        })
        setDestinationWeatherTarget({
          lat:  msg.destLat,
          lng:  msg.destLng,
          name: msg.destination,
        })
        // PKT_NAVIGATION + PKT_DATETIME sent inside startNavSession()
      }

      // ── Routing step update ─────────────────────────────────────────────
      if (msg.type === 'step') {
        updateNavStep({ arrow: msg.arrow, text: msg.text, dist: msg.dist })
        // If the routing engine also provides a refreshed remaining distance
        // (some map libs include it in step messages), update it now.
        if (msg.distKm != null) updateNavDist(msg.distKm)
        // PKT_NAVIGATION refresh is called inside updateNavStep()
      }

      // ── Route completed / cancelled ─────────────────────────────────────
      if (msg.type === 'clear' || msg.type === 'arrived') {
        sessionActive.current  = false
        totalDistKmRef.current = null
        await stopNavSession()
        // stopNavSession() cleans up state; no extra UDP send needed
      }

      // ── Helmet view toggled from inside the WebView ─────────────────────
      if (msg.type === 'helmetViewToggled') {
        setHelmetView(msg.active)
      }

      // ── Weather codes pushed from WeatherCard (via WebView postMessage) ─
      // Wire this up if your WebView page forwards weather data back here.
      if (msg.type === 'weatherUpdate') {
        weatherCodesRef.current = {
          startWmoCode: msg.startWmoCode ?? null,
          destWmoCode:  msg.destWmoCode  ?? null,
        }
      }

    } catch (_) {}
  }, [])

  // ── Helmet connect / disconnect ─────────────────────────────────────────────
  const sendHelmetConnected = useCallback((helmetIp) => {
    if (helmetIp) HelmetUDP.setTarget(helmetIp, 4210)

    // Send current date/time as soon as the helmet connects
    HelmetUDP.sendDateTime(new Date())

    HelmetMapStreamer.start(injectJS)
    injectMessage({ type: 'helmetConnected' })
    enableHelmetView()
    setHelmetConnected(true)
  }, [injectMessage, injectJS, enableHelmetView])

  const sendHelmetDisconnected = useCallback(() => {
    HelmetMapStreamer.stop()
    HelmetUDP.destroy()
    injectMessage({ type: 'helmetDisconnected' })
    disableHelmetView()
    setHelmetConnected(false)
  }, [injectMessage, disableHelmetView])

  // ── App background / foreground ─────────────────────────────────────────────
  useEffect(() => {
    const sub = AppState.addEventListener('change', (nextState) => {
      if (appStateRef.current === 'active' && nextState.match(/inactive|background/)) {
        HelmetMapStreamer.pause()
        if (sessionActive.current) {
          locationSub.current?.remove()
          locationSub.current = null
        }
      }
      if (appStateRef.current.match(/inactive|background/) && nextState === 'active') {
        if (HelmetMapStreamer.isActive()) {
          HelmetMapStreamer.resume(injectJS)
        }
        if (sessionActive.current && !locationSub.current) {
          startGPS()
        }
        // Resync date/time on foreground if helmet is connected
        if (HelmetUDP.hasPeerIP()) {
          HelmetUDP.sendDateTime(new Date())
        }
      }
      appStateRef.current = nextState
    })
    return () => sub.remove()
  }, [startGPS, injectJS])

  // ── Mount / unmount ─────────────────────────────────────────────────────────
  useEffect(() => {
    const existing = getNavState()
    if (existing.active) {
      sessionActive.current  = true
      totalDistKmRef.current = existing.totalDistKm ?? existing.distKm
    }
    return () => {
      locationSub.current?.remove()
      webViewReady.current = false
      // Do NOT stop HelmetMapStreamer here — it keeps running while backgrounded.
      // It is only stopped explicitly via the disconnect button or Stop Navigation.
    }
  }, [])

  // ── Back handler ────────────────────────────────────────────────────────────
  const handleBack = () => {
    if (sessionActive.current) {
      Alert.alert(
        'Navigation Active',
        'Navigation is still running in the background. Stop it?',
        [
          {
            text:  'Keep Running',
            style: 'cancel',
            onPress: () => navigation.goBack(),
          },
          {
            text:  'Stop Navigation',
            style: 'destructive',
            onPress: async () => {
              HelmetMapStreamer.stop()
              HelmetUDP.destroy()
              await stopNavSession()
              sessionActive.current  = false
              totalDistKmRef.current = null
              setHelmetConnected(false)
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

      <TouchableOpacity
        style={[styles.debugBtn, helmetConnected && styles.debugBtnActive]}
        onPress={() => {
          if (helmetConnected) {
            sendHelmetDisconnected()
          } else {
            sendHelmetConnected(ESP32_IP)
          }
        }}
      >
        <Text style={styles.backBtnText}>{helmetConnected ? '📡' : '📵'}</Text>
      </TouchableOpacity>
    </View>
  )
}

const ACCENT = '#00dca0'
const BG     = 'rgba(10, 12, 16, 0.88)'
const BORDER = 'rgba(0, 220, 180, 0.18)'
const ACTIVE = 'rgba(0, 220, 160, 0.25)'

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
  debugBtn: {
    position: 'absolute', top: 12, right: 12,
    width: 36, height: 36, backgroundColor: BG,
    borderWidth: 1, borderColor: BORDER, borderRadius: 5,
    alignItems: 'center', justifyContent: 'center',
  },
  debugBtnActive: {
    backgroundColor: ACTIVE,
    borderColor:     ACCENT,
  },
})