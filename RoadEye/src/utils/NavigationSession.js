// src/utils/NavigationSession.js
// Global navigation session — survives screen changes, app backgrounding.
// Import this anywhere in the app to read or control the active session.

import { useEffect, useState } from 'react'
import * as Location from 'expo-location'
import * as TaskManager from 'expo-task-manager'
import * as Notifications from 'expo-notifications'

export const NAV_TASK = 'ROADEYE_NAV_TASK'

// ── Internal state (module-level singleton) ─────────────────────────────────
let _state = {
  active:      false,
  destination: null,   // { name, lat, lng }
  distKm:      null,
  etaMin:      null,
  currentStep: null,   // { arrow, text, dist }
  speed:       0,
}
let _listeners = new Set()

const notify = () => _listeners.forEach(fn => fn({ ..._state }))

// ── Public API ───────────────────────────────────────────────────────────────

/** Start a navigation session */
export const startNavSession = async ({ destination, distKm, etaMin }) => {
  _state = { ..._state, active: true, destination, distKm, etaMin }
  notify()
  await showNavNotification(destination?.name, distKm, etaMin)
  await startBackgroundLocation()
}

/** Update current turn step (called from NavigationScreen) */
export const updateNavStep = (step) => {
  _state = { ..._state, currentStep: step }
  notify()
  updateNotification(step?.text, step?.dist)
}

/** Update speed */
export const updateNavSpeed = (speed) => {
  _state = { ..._state, speed }
  notify()
}

/** Stop the session entirely */
export const stopNavSession = async () => {
  _state = { active: false, destination: null, distKm: null, etaMin: null, currentStep: null, speed: 0 }
  notify()
  await Notifications.dismissAllNotificationsAsync()
  try { await Location.stopLocationUpdatesAsync(NAV_TASK) } catch (_) {}
}

/** Read current state (non-hook) */
export const getNavState = () => ({ ..._state })

// ── React hook ────────────────────────────────────────────────────────────────
export const useNavSession = () => {
  const [state, setState] = useState({ ..._state })
  useEffect(() => {
    _listeners.add(setState)
    return () => _listeners.delete(setState)
  }, [])
  return state
}

// ── Background location task ─────────────────────────────────────────────────
// Keeps GPS alive when app is backgrounded so helmet stays synced.
TaskManager.defineTask(NAV_TASK, ({ data, error }) => {
  if (error) { console.warn('[NavTask]', error); return }
  if (data?.locations?.length) {
    const { latitude, longitude, speed } = data.locations[0].coords
    const kmh = speed ? Math.round(speed * 3.6) : _state.speed
    updateNavSpeed(kmh)
    // Broadcast to any active helmet WebSocket (imported lazily to avoid cycles)
    try {
      const { broadcastHelmet } = require('./HelmetBridge')
      broadcastHelmet({ type: 'location', lat: latitude, lng: longitude, speed: kmh })
    } catch (_) {}
  }
})

const startBackgroundLocation = async () => {
  const { status } = await Location.requestBackgroundPermissionsAsync()
  if (status !== 'granted') {
    console.warn('[NavSession] Background location denied — GPS paused when backgrounded')
    return
  }
  const running = await Location.hasStartedLocationUpdatesAsync(NAV_TASK).catch(() => false)
  if (!running) {
    await Location.startLocationUpdatesAsync(NAV_TASK, {
      accuracy: Location.Accuracy.BestForNavigation,
      timeInterval: 2000,
      distanceInterval: 10,
      foregroundService: {
        notificationTitle: 'RoadEye Navigation',
        notificationBody:  'Navigating to ' + (_state.destination?.name || 'destination'),
        notificationColor: '#5B47E0',
      },
      pausesUpdatesAutomatically: false,
      showsBackgroundLocationIndicator: true,
    })
  }
}

// ── Notifications ─────────────────────────────────────────────────────────────
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: false,
    shouldSetBadge:  false,
  }),
})

const NAV_NOTIF_ID = 'roadeye-nav-persistent'

const showNavNotification = async (destName, distKm, etaMin) => {
  await Notifications.requestPermissionsAsync()
  await Notifications.scheduleNotificationAsync({
    identifier: NAV_NOTIF_ID,
    content: {
      title: '🗺 RoadEye Navigation Active',
      body:  `To: ${destName || 'Destination'}  •  ${distKm} km  •  ${etaMin} min`,
      data:  { screen: 'Navigation' },
      sticky: true,
      autoDismiss: false,
    },
    trigger: null,
  })
}

const updateNotification = async (stepText, stepDist) => {
  if (!stepText) return
  await Notifications.scheduleNotificationAsync({
    identifier: NAV_NOTIF_ID,
    content: {
      title: '🗺 RoadEye Navigation',
      body:  `${stepText}  ${stepDist || ''}`,
      data:  { screen: 'Navigation' },
      sticky: true,
      autoDismiss: false,
    },
    trigger: null,
  })
}