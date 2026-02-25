import { useState } from 'react'
import { View, StyleSheet } from 'react-native'
import { useNavigation } from '@react-navigation/native'
import { useAuth } from '../hooks/useAuth'
import StatusBar from '../components/shared/StatusBar'
import LoginForm from '../components/login/LoginForm'
import PermissionModal from '../components/shared/PermissionModal'

export default function LoginPage() {
  const { login }      = useAuth()
  const navigation     = useNavigation()
  const [showPerms, setShowPerms] = useState(false)

  const handleLogin = () => setShowPerms(true)

  const handlePermissionsComplete = () => {
    login()
    // Navigation handled automatically by RootNavigator
  }

  return (
    <View style={styles.container}>
      <StatusBar />
      <LoginForm
        onLogin={handleLogin}
        onNavigateSignup={() => navigation.navigate('Signup')}
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
