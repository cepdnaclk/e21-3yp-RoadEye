import { useNavigate } from 'react-router-dom'
import StatusBar from '../components/shared/StatusBar'
import LoginForm from '../components/login/LoginForm'
import { useAuth } from '../hooks/useAuth.jsx'

export default function LoginPage() {
  const { login } = useAuth()
  const navigate = useNavigate()

  const handleLogin = () => {
    login()
    navigate('/dashboard')
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', background: '#fff' }}>
      <StatusBar />
      <LoginForm onLogin={handleLogin} />
    </div>
  )
}
