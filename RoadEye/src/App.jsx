import { NavigationContainer } from '@react-navigation/native'
import { createNativeStackNavigator } from '@react-navigation/native-stack'
import { AuthProvider, useAuth } from './hooks/useAuth'
import LoginPage     from './pages/LoginPage'
import SignupPage    from './pages/SignupPage'
import DashboardPage from './pages/DashboardPage'
import EmergencyPage from './pages/EmergencyPage'

const Stack = createNativeStackNavigator()

function RootNavigator() {
  const { isLoggedIn } = useAuth()
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {isLoggedIn ? (
        <>
          <Stack.Screen name="Dashboard"  component={DashboardPage} />
          <Stack.Screen name="Emergency"  component={EmergencyPage} />
        </>
      ) : (
        <>
          <Stack.Screen name="Login"   component={LoginPage} />
          <Stack.Screen name="Signup"  component={SignupPage} />
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