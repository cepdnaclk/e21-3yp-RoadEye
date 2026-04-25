// src/utils/NavigationSession.js
//
// Changes from original:
//   • updateNavStep() still calls HelmetUDP.send({ type:'step', ... })
//     which is a no-op in the binary protocol (extend PCLink.h to add
//     PKT_NAV_STEP if you want step text on the helmet display).
//   • stopNavSession() still calls HelmetUDP.send({ type:'clear' }) — no-op
//     in binary protocol, harmless.
//   • Everything else is identical to your original NavigationSession.js.
//
// To push weather into PKT_TELEMETRY from a WeatherCard component:
//   import HelmetUDP from './HelmetUDP'
//   HelmetUDP.setWeather({ tempC: 28.5, humidity: 78, pressure: 1008,
//                          altitudeM: 10, weatherIcon: 1 })
// HelmetUDP will merge these into every subsequent GPS telemetry packet.

import { useEffect, useState } from 'react'
import * as Location from 'expo-location'
import * as TaskManager from 'expo-task-manager'
import * as Notifications from 'expo-notifications'
import HelmetUDP from './HelmetUDP'

export const NAV_TASK = 'ROADEYE_NAV_TASK'

// ── Internal singleton state ──────────────────────────────────────────────────
let _state = {
  active:      false,
  destination: null,   // { name, lat, lng }
  distKm:      null,
  etaMin:      null,
  currentStep: null,   // { arrow, text, dist }
  speed:       0,
  helmetView:  false,
}
let _listeners    = new Set()
let _destWeatherCb = null

const notify = () => _listeners.forEach(fn => fn({ ..._state }))

// ── WeatherCard destination bridge ────────────────────────────────────────────
export const registerDestWeatherListener   = (cb) => { _destWeatherCb = cb }
export const unregisterDestWeatherListener = ()    => { _destWeatherCb = null }

export const setDestinationWeatherTarget = (target) => {
  if (_destWeatherCb) _destWeatherCb(target)
}

// ── Helmet view state ─────────────────────────────────────────────────────────
export const setHelmetView = (active) => {
  _state = { ..._state, helmetView: active }
  notify()
}

export const isHelmetViewActive = () => _state.helmetView

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

  // Binary protocol: PKT_NAV_STEP not defined in PCLink.h yet — send() is a
  // no-op for type:'step'. Add it to PCLink.h + HelmetUDP.js to enable.
  if (step) {
    HelmetUDP.send({
      type:  'step',
      arrow: step.arrow,
      text:  step.text,
      dist:  step.dist,
    })
  }
}

export const updateNavSpeed = (speed) => {
  _state = { ..._state, speed }
  notify()
}

export const stopNavSession = async () => {
  _state = {
    active:      false,
    destination: null,
    distKm:      null,
    etaMin:      null,
    currentStep: null,
    speed:       0,
    helmetView:  false,
  }
  notify()
  setDestinationWeatherTarget(null)
  HelmetUDP.send({ type: 'clear' })
  await Notifications.dismissAllNotificationsAsync()
  try { await Location.stopLocationUpdatesAsync(NAV_TASK) } catch (_) {}
}

export const getNavState = () => ({ ..._state })

// ── React hook ────────────────────────────────────────────────────────────────
export const useNavSession = () => {
  const [state, setState] = useState({ ..._state })
  useEffect(() => {
    _listeners.add(setState)
    setState({ ..._state })
    return () => _listeners.delete(setState)
  }, [])
  return state
}

// ── Background location task ──────────────────────────────────────────────────
// Sends PKT_TELEMETRY to the helmet even when the app is backgrounded.
TaskManager.defineTask(NAV_TASK, ({ data, error }) => {
  if (error) { console.warn('[NavTask]', error); return }
  if (data?.locations?.length) {
    const { latitude, longitude, speed, heading } = data.locations[0].coords
    const kmh = speed ? Math.round(speed * 3.6) : _state.speed
    updateNavSpeed(kmh)

    // ── UDP: background GPS → PKT_TELEMETRY ──────────────────────────────
    HelmetUDP.send({
      type:    'gps',
      lat:     latitude,
      lng:     longitude,
      speed:   kmh,
      heading: heading ?? 0,
    })

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