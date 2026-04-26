import { useState } from 'react'
import { View, StyleSheet } from 'react-native'
import { useNavigation } from '@react-navigation/native'
import { useAuth } from '../hooks/useAuth'
import LoginForm from '../components/login/LoginForm'
import PermissionModal from '../components/shared/PermissionModal'

// ── Same BASE_URL as SignupPage ─────────────────────────────────────────────
// Android emulator  → 'http://10.0.2.2:8080'
// iOS simulator     → 'http://localhost:8080'
// Physical device   → 'http://10.30.1.169:8080'
const BASE_URL = 'http://10.30.1.169:8080'
// ───────────────────────────────────────────────────────────────────────────

export default function LoginPage() {
  const { login }  = useAuth()
  const navigation = useNavigation()

  const [showPerms,  setShowPerms]  = useState(false)
  const [loginError, setLoginError] = useState('')
  const [loading,    setLoading]    = useState(false)

  // Temporarily hold token + user between handleLogin and handlePermissionsComplete
  // so we can pass them to login() only after the permissions modal is done
  const [pendingToken, setPendingToken] = useState(null)
  const [pendingUser,  setPendingUser]  = useState(null)

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
        throw new Error(data.error || 'Login failed')
      }

      // ✅ Backend returns { token: "...", user: { id, email, firstName, ... } }
      const { token, user } = data

      console.log('Login success, user:', user)

      // Hold token + user until permissions are accepted, then pass to login()
      // login() now handles saving to AsyncStorage — no need to do it here
      setPendingToken(token)
      setPendingUser(user)

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
    // ✅ Pass token + user to login() — it saves to AsyncStorage and sets state
    login(pendingToken, pendingUser)
  }

  return (
    <View style={styles.container}>
      <LoginForm
        onLogin={handleLogin}
        onNavigateSignup={() => navigation.navigate('Signup')}
        error={loginError}
        loading={loading}
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