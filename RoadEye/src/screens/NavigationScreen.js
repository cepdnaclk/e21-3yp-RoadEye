import { useState, useRef, useEffect } from 'react'
import {
  View, Text, StyleSheet, TouchableOpacity,
  Alert, Platform, ActivityIndicator
} from 'react-native'
import { WebView } from 'react-native-webview'
import * as Location from 'expo-location'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

// ─────────────────────────────────────────────────────────────────────────────
// NavigationScreen
//
// Loads navigation-map.html inside a WebView.
// Injects live GPS from expo-location into the map.
// Receives route/step updates from the map and can forward to helmet display.
//
// HELMET DISPLAY SETUP:
//   The helmet's browser should open:
//   http://<phone-ip>:8080
//   Both phone and helmet must be on the same WiFi network.
//   The phone serves the map HTML via a simple HTTP server (or Expo dev server).
//
// For production: host navigation-map.html on your backend and load that URL.
// For development: use the local asset via require('./navigation-map.html')
// ─────────────────────────────────────────────────────────────────────────────

// Change this to your hosted URL in production:
// const MAP_URL = 'https://yourserver.com/navigation-map.html'
// For local development, we use the bundled HTML file:
const MAP_SOURCE = { uri: 'file:///android_asset/navigation-map.html' }
// OR load from web (works immediately, no native asset setup needed):
// const MAP_SOURCE = { uri: 'http://192.168.1.100:8080/navigation-map.html' }

export default function NavigationScreen({ navigation }) {
  const insets = useSafeAreaInsets()
  const webviewRef = useRef(null)

  const [loading,       setLoading]       = useState(true)
  const [currentStep,   setCurrentStep]   = useState(null)
  const [routeInfo,     setRouteInfo]     = useState(null)
  const [helmetSyncing, setHelmetSyncing] = useState(false)
  const [locationGranted, setLocationGranted] = useState(false)

  // ── Request location permission & start watching ──────────────────────────
  useEffect(() => {
    let subscription = null

    const startLocation = async () => {
      const { status } = await Location.requestForegroundPermissionsAsync()
      if (status !== 'granted') {
        Alert.alert(
          'Location Required',
          'Please enable location access for navigation.',
          [{ text: 'OK' }]
        )
        return
      }
      setLocationGranted(true)

      // Watch position and inject into WebView
      subscription = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.BestForNavigation,
          timeInterval: 2000,
          distanceInterval: 5,
        },
        (loc) => {
          const { latitude, longitude, speed } = loc.coords
          injectLocation(latitude, longitude, speed ? Math.round(speed * 3.6) : 0)
        }
      )
    }

    startLocation()
    return () => { if (subscription) subscription.remove() }
  }, [])

  // ── Send location update into the WebView map ─────────────────────────────
  const injectLocation = (lat, lng, speed = 0) => {
    if (!webviewRef.current) return
    webviewRef.current.postMessage(JSON.stringify({
      type: 'location',
      lat,
      lng,
      speed,
    }))
  }

  // ── Receive messages from the map (route found, steps, etc.) ─────────────
  const handleWebViewMessage = (event) => {
    try {
      const msg = JSON.parse(event.nativeEvent.data)

      if (msg.type === 'location') {
        // Map is reporting GPS (from its own watchPosition) — we can forward to helmet
        syncToHelmet(msg)
      }

      if (msg.type === 'route') {
        setRouteInfo({
          distance: msg.distance,
          duration: msg.duration,
          destination: msg.destination,
        })
        // Forward full route to helmet display
        syncToHelmet(msg)
      }

      if (msg.type === 'step') {
        setCurrentStep({
          icon: msg.icon,
          text: msg.text,
          distance: msg.distance,
        })
        // Forward current step to helmet
        syncToHelmet(msg)
      }

    } catch (e) {
      console.error('WebView message parse error:', e)
    }
  }

  // ── Sync data to helmet display over WiFi ─────────────────────────────────
  // The helmet's browser (display) connects to the same map HTML.
  // You can also send step updates via a WebSocket or simple REST endpoint
  // running on the phone. Below is the REST approach (lightweight):
  const syncToHelmet = async (data) => {
    // Replace with your helmet display's IP on the WiFi network
    const HELMET_IP = '192.168.1.200' // ← Change this to your helmet's IP
    const HELMET_PORT = 8080

    try {
      await fetch(`http://${HELMET_IP}:${HELMET_PORT}/update`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
        signal: AbortSignal.timeout(1000), // 1 second timeout
      })
    } catch (_) {
      // Helmet offline or not connected — silently ignore
    }
  }

  // ── Notify map that helmet is connected ───────────────────────────────────
  const notifyHelmetStatus = (connected) => {
    if (!webviewRef.current) return
    webviewRef.current.postMessage(JSON.stringify({
      type: connected ? 'helmetConnected' : 'helmetDisconnected',
    }))
  }

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>

      {/* ── Header ── */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation?.goBack()} style={styles.backBtn}>
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Navigation</Text>
        <View style={styles.headerRight}>
          {routeInfo && (
            <View style={styles.routeBadge}>
              <Text style={styles.routeBadgeText}>
                {routeInfo.distance}km · {routeInfo.duration}
              </Text>
            </View>
          )}
        </View>
      </View>

      {/* ── Current step banner (shown when navigating) ── */}
      {currentStep && (
        <View style={styles.stepBanner}>
          <Text style={styles.stepIcon}>{currentStep.icon}</Text>
          <Text style={styles.stepText} numberOfLines={2}>{currentStep.text}</Text>
          <Text style={styles.stepDist}>{currentStep.distance}</Text>
        </View>
      )}

      {/* ── WebView with Leaflet map ── */}
      <View style={styles.mapContainer}>
        {loading && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="large" color="#4F46E5" />
            <Text style={styles.loadingText}>Loading map...</Text>
          </View>
        )}

        <WebView
          ref={webviewRef}
          // ── OPTION 1: Load bundled HTML asset (recommended for production)
          // source={require('./navigation-map.html')}
          //
          // ── OPTION 2: Load from a local server / your backend URL
          source={{ uri: 'file:///android_asset/navigation-map.html' }}
          //
          // ── OPTION 3: Inline HTML (easiest for testing — paste the HTML string)
          // source={{ html: MAP_HTML_STRING }}

          onMessage={handleWebViewMessage}
          onLoadEnd={() => setLoading(false)}
          javaScriptEnabled
          domStorageEnabled
          geolocationEnabled
          allowsInlineMediaPlayback
          mediaPlaybackRequiresUserAction={false}
          mixedContentMode="always"
          style={styles.webview}

          // Allow geolocation in WebView
          onPermissionRequest={(request) => request.grant(request.resources)}

          // Android: allow file access
          allowFileAccess
          allowUniversalAccessFromFileURLs
          originWhitelist={['*']}
        />
      </View>

    </View>
  )
}

const styles = StyleSheet.create({
  screen:          { flex: 1, backgroundColor: '#0f0f1a' },

  // Header
  header:          { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F0F0F5' },
  backBtn:         { padding: 6, marginRight: 8 },
  backIcon:        { fontSize: 22, color: '#1a1a2e', fontWeight: '700' },
  headerTitle:     { fontSize: 18, fontWeight: '900', color: '#1a1a2e', flex: 1 },
  headerRight:     { alignItems: 'flex-end' },
  routeBadge:      { backgroundColor: '#EDE9FE', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  routeBadgeText:  { fontSize: 12, fontWeight: '700', color: '#4F46E5' },

  // Step banner
  stepBanner:      { flexDirection: 'row', alignItems: 'center', backgroundColor: '#4F46E5', paddingHorizontal: 16, paddingVertical: 12, gap: 12 },
  stepIcon:        { fontSize: 22 },
  stepText:        { flex: 1, fontSize: 13, fontWeight: '700', color: '#fff' },
  stepDist:        { fontSize: 13, color: 'rgba(255,255,255,0.8)', fontWeight: '600' },

  // Map
  mapContainer:    { flex: 1, position: 'relative' },
  webview:         { flex: 1 },
  loadingOverlay:  { ...StyleSheet.absoluteFillObject, backgroundColor: '#f5f6fa', alignItems: 'center', justifyContent: 'center', zIndex: 10, gap: 12 },
  loadingText:     { fontSize: 15, color: '#6B7280', fontWeight: '600' },
})
