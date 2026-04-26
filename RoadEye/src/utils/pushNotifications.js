// utils/pushNotifications.js

import * as Notifications from 'expo-notifications'

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
})

// Call this once on app start — just asks for permission, no Firebase, no backend
export const requestNotificationPermission = async () => {
  try {
    const { status: existing } = await Notifications.getPermissionsAsync()
    if (existing === 'granted') return true

    const { status } = await Notifications.requestPermissionsAsync()
    return status === 'granted'
  } catch (e) {
    console.error('[Notifications] Permission error:', e)
    return false
  }
}

// Call this when tilt exceeds 21° — fires instantly, works offline, no Firebase
export const triggerTiltAlert = async (tiltAngle) => {
  try {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: '🚨 Emergency Alert',
        body: `Tilt angle ${tiltAngle.toFixed(1)}° detected. Sending emergency SMS...`,
        data: { triggered: true, tiltAngle },
        sound: true,
      },
      trigger: null, // null = fire immediately
    })
    console.log('[Notifications] Tilt alert fired locally')
  } catch (e) {
    console.error('[Notifications] Failed to fire alert:', e)
  }
}