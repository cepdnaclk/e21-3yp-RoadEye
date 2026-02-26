import { useState } from 'react'
import { View, StyleSheet } from 'react-native'
import { useNavigation } from '@react-navigation/native'
import { useAuth } from '../hooks/useAuth'
import LoginForm from '../components/login/LoginForm'
import PermissionModal from '../components/shared/PermissionModal'

export default function LoginPage() {
  const { login }  = useAuth()
  const navigation = useNavigation()
  const [showPerms, setShowPerms] = useState(false)

  const handleLogin = () => setShowPerms(true)

  const handlePermissionsComplete = () => {
    login()
  }

  return (
    <View style={styles.container}>
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