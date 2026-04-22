// src/utils/NavigationSession.js
import { useEffect, useState } from 'react'
import * as Location from 'expo-location'
import * as TaskManager from 'expo-task-manager'
import * as Notifications from 'expo-notifications'

export const NAV_TASK = 'ROADEYE_NAV_TASK'

// ── Internal singleton state ─────────────────────────────────────────────────
let _state = {
  active:      false,
  destination: null,   // { name, lat, lng }
  distKm:      null,
  etaMin:      null,
  currentStep: null,   // { arrow, text, dist }
  speed:       0,
}
let _listeners    = new Set()
let _destWeatherCb = null   // WeatherCard registers here

const notify = () => _listeners.forEach(fn => fn({ ..._state }))

// ── WeatherCard destination bridge ───────────────────────────────────────────
// WeatherCard calls this to register itself on mount
export const registerDestWeatherListener = (cb) => { _destWeatherCb = cb }
export const unregisterDestWeatherListener = ()  => { _destWeatherCb = null }

// Called by NavigationScreen when route starts / clears
export const setDestinationWeatherTarget = (target) => {
  if (_destWeatherCb) _destWeatherCb(target)
}

// ── Public API ────────────────────────────────────────────────────────────────
export const startNavSession = async ({ destination, distKm, etaMin }) => {
  _state = { ..._state, active: true, destination, distKm, etaMin }
  notify()
  await showNavNotification(destination?.name, distKm, etaMin)
  await startBackgroundLocation()
}

export const updateNavStep = (step) => {
  _state = { ..._state, currentStep: step }
  notify()
  updateNotification(step?.text, step?.dist)
}

export const updateNavSpeed = (speed) => {
  _state = { ..._state, speed }
  notify()
}

export const stopNavSession = async () => {
  _state = { active: false, destination: null, distKm: null, etaMin: null, currentStep: null, speed: 0 }
  notify()
  // Also clear destination weather in WeatherCard
  setDestinationWeatherTarget(null)
  await Notifications.dismissAllNotificationsAsync()
  try { await Location.stopLocationUpdatesAsync(NAV_TASK) } catch (_) {}
}

export const getNavState = () => ({ ..._state })

// ── React hook ────────────────────────────────────────────────────────────────
export const useNavSession = () => {
  const [state, setState] = useState({ ..._state })
  useEffect(() => {
    _listeners.add(setState)
    setState({ ..._state })   // sync immediately on mount
    return () => _listeners.delete(setState)
  }, [])
  return state
}

// ── Background location task ──────────────────────────────────────────────────
TaskManager.defineTask(NAV_TASK, ({ data, error }) => {
  if (error) { console.warn('[NavTask]', error); return }
  if (data?.locations?.length) {
    const { latitude, longitude, speed } = data.locations[0].coords
    const kmh = speed ? Math.round(speed * 3.6) : _state.speed
    updateNavSpeed(kmh)
    try {
      const { broadcastHelmet } = require('./HelmetBridge')
      broadcastHelmet({ type: 'location', lat: latitude, lng: longitude, speed: kmh })
    } catch (_) {}
  }
})

const startBackgroundLocation = async () => {
  const { status } = await Location.requestBackgroundPermissionsAsync()
  if (status !== 'granted') {
    console.warn('[NavSession] Background location denied')
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