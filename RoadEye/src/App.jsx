import { NavigationContainer } from '@react-navigation/native'
import { createNativeStackNavigator } from '@react-navigation/native-stack'
import { ActivityIndicator, View } from 'react-native'   // ← add
import { AuthProvider, useAuth } from './hooks/useAuth'
import LoginPage        from './pages/LoginPage'
import SignupPage       from './pages/SignupPage'
import DashboardPage    from './pages/DashboardPage'
import EmergencyPage    from './pages/EmergencyPage'
import NavigationScreen from './pages/NavigationScreen'

const Stack = createNativeStackNavigator()

function RootNavigator() {
  const { isLoggedIn, isLoading } = useAuth()   // ← add isLoading

  // Prevents flash of login screen while AsyncStorage is checked
  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0f172a' }}>
        <ActivityIndicator size="large" color="#f97316" />
      </View>
    )
  }

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
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