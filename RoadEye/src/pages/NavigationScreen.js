// src/pages/NavigationScreen.js

import React, { useRef, useEffect, useState, useCallback } from 'react'
import {
  View, StyleSheet, Platform, StatusBar,
  Text, TouchableOpacity, Alert, AppState,
} from 'react-native'
import { WebView } from 'react-native-webview'
import MapView from 'react-native-maps'           // ← NEW: hidden snapshot map
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
import HelmetMapStreamer from '../utils/HelmetMapStreamer'   // ← NEW

export default function NavigationScreen({ navigation }) {
  const webViewRef    = useRef(null)
  const snapshotMapRef = useRef(null)             // ← NEW: ref for hidden MapView
  const locationSub   = useRef(null)
  const appStateRef   = useRef(AppState.currentState)
  const sessionActive = useRef(false)
  const webViewReady  = useRef(false)

  const [gpsStatus,   setGpsStatus]   = useState('Acquiring GPS…')
  const [mapCamera,   setMapCamera]   = useState(null)  // ← NEW: tracks map center
  const [helmetReady, setHelmetReady] = useState(false) // ← NEW: MapView mounted flag

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

        // ── NEW: keep the hidden snapshot MapView centred on user position ──
        // This is what HelmetMapStreamer captures for the ESP32 display.
        setMapCamera({ latitude, longitude, heading: heading ?? 0 })

        // UDP → helmet: PKT_TELEMETRY
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

  // ── WebView ready ─────────────────────────────────────────────────────────
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
        HelmetUDP.send({ type: 'clear' })
      }

      if (msg.type === 'helmetViewToggled') {
        setHelmetView(msg.active)
      }

    } catch (_) {}
  }, [])

  // ── Helmet connect / disconnect ───────────────────────────────────────────
  const sendHelmetConnected = useCallback((helmetIp) => {
    if (helmetIp) HelmetUDP.setTarget(helmetIp, 4210)

    // ← NEW: start streaming map frames to ESP32
    HelmetMapStreamer.start(snapshotMapRef)

    injectMessage({ type: 'helmetConnected' })
    enableHelmetView()
  }, [injectMessage, enableHelmetView])

  const sendHelmetDisconnected = useCallback(() => {
    // ← NEW: stop streaming
    HelmetMapStreamer.stop()

    HelmetUDP.send({ type: 'clear' })
    HelmetUDP.destroy()
    injectMessage({ type: 'helmetDisconnected' })
    disableHelmetView()
  }, [injectMessage, disableHelmetView])

  // ── App background / foreground ───────────────────────────────────────────
  useEffect(() => {
    const sub = AppState.addEventListener('change', (nextState) => {
      if (appStateRef.current === 'active' && nextState.match(/inactive|background/)) {
        // ← NEW: pause streaming — MapView freezes in background
        HelmetMapStreamer.stop()

        if (sessionActive.current) {
          locationSub.current?.remove()
          locationSub.current = null
        }
      }
      if (appStateRef.current.match(/inactive|background/) && nextState === 'active') {
        // ← NEW: resume streaming if helmet still connected
        if (HelmetUDP._targetIp) {
          HelmetMapStreamer.start(snapshotMapRef)
        }

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
      // ← NEW: stop streamer on unmount (UDP session survives for background nav)
      HelmetMapStreamer.stop()
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
              HelmetMapStreamer.stop()
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

      {/* ── Main navigation WebView (unchanged) ─────────────────────────── */}
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

      {/* ── NEW: Hidden MapView used only for takeSnapshot() ────────────────
           Size 120×120 exactly so snapshot doesn't need resizing.
           Positioned off-screen so the user never sees it.
           pitchEnabled/rotateEnabled/scrollEnabled all false — it's a
           passive camera that follows GPS position only.              ── */}
      {mapCamera && (
        <MapView
          ref={snapshotMapRef}
          style={styles.snapshotMap}
          mapType="standard"
          pitchEnabled={false}
          rotateEnabled={false}
          scrollEnabled={false}
          zoomEnabled={false}
          showsUserLocation={true}
          showsMyLocationButton={false}
          showsCompass={false}
          showsScale={false}
          showsTraffic={false}
          onMapReady={() => setHelmetReady(true)}
          camera={{
            center: {
              latitude:  mapCamera.latitude,
              longitude: mapCamera.longitude,
            },
            heading: mapCamera.heading,
            pitch:   0,
            zoom:    17,   // street-level zoom — good for turn-by-turn
            altitude: 500, // iOS uses altitude, Android uses zoom
          }}
        />
      )}

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

  // ← NEW: 120×120, off-screen. Must be non-zero size or takeSnapshot fails.
  snapshotMap: {
    position: 'absolute',
    width:  120,
    height: 120,
    top:    -200,   // above the visible area
    left:   0,
    opacity: 0,     // fully invisible — belt and braces
  },

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