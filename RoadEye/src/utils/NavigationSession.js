// src/utils/NavigationSession.js

import { useEffect, useState } from 'react'
import * as Location from 'expo-location'
import * as TaskManager from 'expo-task-manager'
import * as Notifications from 'expo-notifications'
import HelmetUDP, { WeatherIcon } from './HelmetUDP'

export const NAV_TASK = 'ROADEYE_NAV_TASK'

// ── Internal singleton state ──────────────────────────────────────────────────
let _state = {
  active:       false,
  destination:  null,   // { name, lat, lng }
  distKm:       null,
  totalDistKm:  null,   // set once when route starts — used for completionPct
  etaMin:       null,
  currentStep:  null,   // { arrow, text, dist }
  speed:        0,
  helmetView:   false,
  // Weather WMO codes — set by WeatherCard via setNavWeather()
  startWmoCode: null,
  destWmoCode:  null,
}
let _listeners     = new Set()
let _destWeatherCb = null

const notify = () => _listeners.forEach(fn => fn({ ..._state }))

// ── WeatherCard destination bridge ────────────────────────────────────────────
export const registerDestWeatherListener   = (cb) => { _destWeatherCb = cb }
export const unregisterDestWeatherListener = ()    => { _destWeatherCb = null }

export const setDestinationWeatherTarget = (target) => {
  if (_destWeatherCb) _destWeatherCb(target)
}

// ── Weather WMO code bridge (called by WeatherCard) ───────────────────────────
// WeatherCard calls this whenever it fetches fresh weather so NavigationSession
// always has the latest WMO codes to forward in UDP navigation packets.
export const setNavWeather = ({ startWmoCode = null, destWmoCode = null } = {}) => {
  _state = { ..._state, startWmoCode, destWmoCode }
  // If a nav session is active, push a fresh navigation packet with updated icons
  if (_state.active) _sendNavigationPacket()
}

// ── Helmet view state ─────────────────────────────────────────────────────────
export const setHelmetView = (active) => {
  _state = { ..._state, helmetView: active }
  notify()
}

export const isHelmetViewActive = () => _state.helmetView

// ── Internal UDP helpers ──────────────────────────────────────────────────────

// Maps a WMO weather code to the PCLink WeatherIcon constant (1/2/3).
// Mirrors wmoToWeatherIcon() in speedApi.js — keep in sync.
function wmoToWeatherIcon(code) {
  if (code == null) return WeatherIcon.SUNNY
  if (code <= 2)    return WeatherIcon.SUNNY
  if (code === 3)   return WeatherIcon.CLOUDY
  if (code <= 49)   return WeatherIcon.CLOUDY   // fog
  if (code <= 69)   return WeatherIcon.RAIN     // drizzle + rain
  if (code <= 79)   return WeatherIcon.CLOUDY   // snow → closest match
  if (code <= 94)   return WeatherIcon.RAIN     // showers + thunderstorm
  return                   WeatherIcon.RAIN     // severe storm
}

// Derives completionPct (0–100) from current distKm vs total route distance.
function _completionPct() {
  const { distKm, totalDistKm } = _state
  if (!totalDistKm || totalDistKm <= 0) return 0
  const elapsed = totalDistKm - (distKm ?? totalDistKm)
  return Math.min(100, Math.max(0, (elapsed / totalDistKm) * 100))
}

// Sends PKT_NAVIGATION with current session state.
function _sendNavigationPacket() {
  if (!HelmetUDP.hasPeerIP()) return
  HelmetUDP.sendNavigation({
    speed:         _state.speed,
    distRemaining: _state.distKm      ?? 0,
    completionPct: _completionPct(),
    startWeather:  wmoToWeatherIcon(_state.startWmoCode),
    destWeather:   wmoToWeatherIcon(_state.destWmoCode),
  })
}

// ── Public API ────────────────────────────────────────────────────────────────
export const startNavSession = async ({ destination, distKm, etaMin }) => {
  _state = {
    ..._state,
    active:      true,
    destination,
    distKm,
    totalDistKm: distKm,   // snapshot total distance at route start
    etaMin,
  }
  notify()
  await showNavNotification(destination?.name, distKm, etaMin)
  await startBackgroundLocation()

  // Send initial navigation + datetime packets to the helmet
  _sendNavigationPacket()
  HelmetUDP.sendDateTime(new Date())
}

export const updateNavStep = (step) => {
  _state = { ..._state, currentStep: step }
  notify()
  updateNotification(step?.text, step?.dist)
  // PKT_NAV_STEP is not defined in PCLink.h yet — send a navigation refresh
  // instead so the helmet display stays in sync with remaining distance.
  if (_state.active) _sendNavigationPacket()
}

export const updateNavSpeed = (speed) => {
  _state = { ..._state, speed }
  notify()
  // Push a fresh navigation packet on every speed update so the helmet
  // always shows the current speed (PKT_NAVIGATION.speed field).
  if (_state.active) _sendNavigationPacket()
}

// Call this when the routing engine updates remaining distance mid-route.
export const updateNavDist = (distKm) => {
  _state = { ..._state, distKm }
  notify()
  if (_state.active) _sendNavigationPacket()
}

export const stopNavSession = async () => {
  _state = {
    active:       false,
    destination:  null,
    distKm:       null,
    totalDistKm:  null,
    etaMin:       null,
    currentStep:  null,
    speed:        0,
    helmetView:   false,
    startWmoCode: null,
    destWmoCode:  null,
  }
  notify()
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
    setState({ ..._state })
    return () => _listeners.delete(setState)
  }, [])
  return state
}

// ── Background location task ──────────────────────────────────────────────────
// Fires every 2 s / 10 m while navigation is active (even when backgrounded).
// Sends PKT_NAVIGATION so the helmet always has fresh speed.
TaskManager.defineTask(NAV_TASK, ({ data, error }) => {
  if (error) { console.warn('[NavTask]', error); return }
  if (data?.locations?.length) {
    const { speed } = data.locations[0].coords
    const kmh = speed ? Math.round(speed * 3.6) : _state.speed
    _state = { ..._state, speed: kmh }
    _sendNavigationPacket()

    try {
      const { latitude, longitude } = data.locations[0].coords
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
      accuracy:                          Location.Accuracy.BestForNavigation,
      timeInterval:                      2000,
      distanceInterval:                  10,
      foregroundService: {
        notificationTitle: 'RoadEye Navigation',
        notificationBody:  'Navigating to ' + (_state.destination?.name || 'destination'),
        notificationColor: '#5B47E0',
      },
      pausesUpdatesAutomatically:        false,
      showsBackgroundLocationIndicator:  true,
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
      title:       '🗺 RoadEye Navigation Active',
      body:        `To: ${destName || 'Destination'}  •  ${distKm} km  •  ${etaMin} min`,
      data:        { screen: 'Navigation' },
      sticky:      true,
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
      title:       '🗺 RoadEye Navigation',
      body:        `${stepText}  ${stepDist || ''}`,
      data:        { screen: 'Navigation' },
      sticky:      true,
      autoDismiss: false,
    },
    trigger: null,
  })
}