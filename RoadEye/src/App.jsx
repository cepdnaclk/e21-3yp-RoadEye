import { NavigationContainer } from '@react-navigation/native'
import { createStackNavigator } from '@react-navigation/stack'   // JS stack — supports detachInactiveScreens
import { ActivityIndicator, View } from 'react-native'
import { AuthProvider, useAuth } from './hooks/useAuth'
import LoginPage        from './pages/LoginPage'
import SignupPage       from './pages/SignupPage'
import DashboardPage    from './pages/DashboardPage'
import EmergencyPage    from './pages/EmergencyPage'
import NavigationScreen from './pages/NavigationScreen'

const Stack = createStackNavigator()

function RootNavigator() {
  const { isLoggedIn, isLoading } = useAuth()

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
      detachInactiveScreens={false}   // ← keeps NavigationScreen (WebView) alive when you go back to Dashboard
    >
      {isLoggedIn ? (
        <>
          <Stack.Screen name="Dashboard"  component={DashboardPage} />
          <Stack.Screen name="Emergency"  component={EmergencyPage} />
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