import { useState } from 'react'
import { View, StyleSheet } from 'react-native'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { useNavigation } from '@react-navigation/native'
import { useAuth } from '../hooks/useAuth'
import LoginForm from '../components/login/LoginForm'
import PermissionModal from '../components/shared/PermissionModal'

// ── Same BASE_URL as SignupPage ─────────────────────────────────────────────
// Android emulator  → 'http://10.0.2.2:8080'
// iOS simulator     → 'http://localhost:8080'
// Physical device   → 'http://192.168.x.x:8080'
const BASE_URL = 'http://192.168.8.122:8080'
// ───────────────────────────────────────────────────────────────────────────

export default function LoginPage() {
  const { login }   = useAuth()
  const navigation  = useNavigation()

  const [showPerms,   setShowPerms]   = useState(false)
  const [loginError,  setLoginError]  = useState('')
  const [loading,     setLoading]     = useState(false)

  const handleLogin = async ({ email, password }) => {
    // ── Validation ──────────────────────────────────────────────────────────
    if (!email || !password) {
      setLoginError('Please fill in all fields')
      return
    }

    // ── Call backend ────────────────────────────────────────────────────────
    try {
      setLoading(true)
      setLoginError('')

      const response = await fetch(`${BASE_URL}/api/users/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })

      const data = await response.json()

      if (!response.ok) {
        // Backend returns { "error": "..." } on failure (wrong password, not found)
        throw new Error(data.error || 'Login failed')
      }

      // ✅ Backend returns { token: "...", user: { id, email, firstName, ... } }
      const { token, user } = data

      // Save JWT so all future API calls can attach it as Bearer token
      await AsyncStorage.setItem('jwt_token', token)
      await AsyncStorage.setItem('user', JSON.stringify(user))

      console.log('Login success, user:', user)

      // Show permissions modal before entering app
      setShowPerms(true)

    } catch (err) {
      if (err.message === 'Network request failed') {
        setLoginError('Cannot reach server. Check your IP / BASE_URL.')
      } else {
        setLoginError(err.message)
      }
    } finally {
      setLoading(false)
    }
  }

  const handlePermissionsComplete = () => {
    // ✅ Only called after real login + token saved
    login()
  }

  return (
    <View style={styles.container}>
      <LoginForm
        onLogin={handleLogin}
        onNavigateSignup={() => navigation.navigate('Signup')}
        error={loginError}      // pass down so LoginForm can show it
        loading={loading}       // pass down so LoginForm can disable button
      />
      <PermissionModal
        visible={showPerms}
        onComplete={handlePermissionsComplete}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
})