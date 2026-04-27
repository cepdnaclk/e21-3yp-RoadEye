import { NavigationContainer } from '@react-navigation/native'
import { createNativeStackNavigator } from '@react-navigation/native-stack'
import { ActivityIndicator, View } from 'react-native'
import { useRef, useEffect } from 'react'
import * as Notifications from 'expo-notifications'
import { AuthProvider, useAuth } from './hooks/useAuth'
import LoginPage        from './pages/LoginPage'
import SignupPage       from './pages/SignupPage'
import DashboardPage    from './pages/DashboardPage'
import EmergencyPage    from './pages/EmergencyPage'
import NavigationScreen from './pages/NavigationScreen'
import { requestNotificationPermission } from './utils/pushNotifications'
import { startESP32Discovery } from './utils/ESP32Discovery'   // ← ADD THIS

const Stack = createNativeStackNavigator()

function RootNavigator() {
  const { isLoggedIn, isLoading } = useAuth()
  const emergencyActionRef = useRef(null)

  // ── START ESP32 DISCOVERY ONCE ON APP LAUNCH ──────────────────────────────
  useEffect(() => {
    startESP32Discovery((ip) => {
      console.log('[App] ESP32 discovered at:', ip)
    })
  }, [])
  // ─────────────────────────────────────────────────────────────────────────

  useEffect(() => {
    if (isLoggedIn) {
      requestNotificationPermission()
    }
  }, [isLoggedIn])

  useEffect(() => {
    const subscription = Notifications.addNotificationReceivedListener(notification => {
      const data = notification.request.content.data
      if (data?.triggered) {
        console.log('[Notification] Tilt alert received — triggering SMS')
        emergencyActionRef.current?.()
      }
    })
    return () => subscription.remove()
  }, [])

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0f172a' }}>
        <ActivityIndicator size="large" color="#f97316" />
      </View>
    )
  }

  return (
    <Stack.Navigator
      screenOptions={{ headerShown: false }}
      detachInactiveScreens={false}
    >
      {isLoggedIn ? (
        <>
          <Stack.Screen name="Dashboard" component={DashboardPage} />
          <Stack.Screen name="Emergency">
            {props => (
              <EmergencyPage
                {...props}
                onRegisterAction={(fn) => { emergencyActionRef.current = fn }}
              />
            )}
          </Stack.Screen>
          <Stack.Screen name="Navigation" component={NavigationScreen} />
        </>
      ) : (
        <>
          <Stack.Screen name="Login"  component={LoginPage} />
          <Stack.Screen name="Signup" component={SignupPage} />
        </>
      )}
    </Stack.Navigator>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <NavigationContainer>
        <RootNavigator />
      </NavigationContainer>
    </AuthProvider>
  )
}