import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import StatusBar from '../components/shared/StatusBar'
import LoginForm from '../components/login/LoginForm'
import PermissionModal from '../components/shared/PermissionModal'
import { useAuth } from '../hooks/useAuth.jsx'

export default function LoginPage() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [showPermissions, setShowPermissions] = useState(false)

  const handleLogin = () => {
    // Trigger permission prompts before entering the app
    setShowPermissions(true)
  }

  const handlePermissionsComplete = (results) => {
    // results = { location: true/false, bluetooth: true/false }
    login()
    navigate('/dashboard')
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', background: '#fff' }}>
      <StatusBar />
      <LoginForm onLogin={handleLogin} />

      {showPermissions && (
        <PermissionModal onComplete={handlePermissionsComplete} />
      )}
    </div>
  )
}
