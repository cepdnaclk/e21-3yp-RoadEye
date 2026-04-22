import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth.jsx'

export default function SignupPage() {
  const { login }  = useAuth()
  const navigate   = useNavigate()

  const [username, setUsername] = useState('')
  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [confirm,  setConfirm]  = useState('')
  const [showPw1,  setShowPw1]  = useState(false)
  const [showPw2,  setShowPw2]  = useState(false)
  const [error,    setError]    = useState('')
  const [loading,  setLoading]  = useState(false)
  const [focused,  setFocused]  = useState('')

  const handleSignup = async () => {
    if (!username || !email || !password || !confirm) {
      setError('Please fill in all fields')
      return
    }
    if (password !== confirm) {
      setError('Passwords do not match')
      return
    }
    setError('')
    setLoading(true)
    await new Promise(r => setTimeout(r, 700))
    login(username)
    navigate('/dashboard', { replace: true })
  }

  const fieldStyle = (name) => ({
    width: '100%',
    background: '#F0F0F5',
    border: '2px solid ' + (focused === name ? '#5B57F5' : 'transparent'),
    borderRadius: 14,
    padding: '15px 18px',
    fontSize: 15,
    color: '#1a1a2e',
    fontFamily: 'Plus Jakarta Sans, sans-serif',
    outline: 'none',
    boxSizing: 'border-box',
    transition: 'border-color 0.2s',
  })

  return (
    <div style={{
      background: '#F8F8FC',
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      padding: '0 28px',
      fontFamily: 'Plus Jakarta Sans, sans-serif',
    }}>

      {/* ── Status bar spacer ── */}
      <div style={{ height: 52 }} />

      {/* ── Title ── */}
      <h1 style={{
        fontSize: 30,
        fontWeight: 900,
        color: '#1a1a2e',
        textAlign: 'center',
        margin: '0 0 40px',
        letterSpacing: -0.5,
      }}>
        Sign up
      </h1>

      {/* ── Error banner ── */}
      {error && (
        <div style={{
          background: '#FEE2E2',
          border: '1px solid #FCA5A5',
          borderRadius: 12,
          padding: '11px 16px',
          marginBottom: 16,
          color: '#DC2626',
          fontSize: 13,
          fontWeight: 600,
          display: 'flex',
          alignItems: 'center',
          gap: 8,
        }}>
          ⚠️ {error}
        </div>
      )}

      {/* ── Username ── */}
      <div style={{ marginBottom: 18 }}>
        <label style={S.label}>Username</label>
        <input
          type="text"
          placeholder="Enter email"
          value={username}
          onChange={e => setUsername(e.target.value)}
          onFocus={() => setFocused('username')}
          onBlur={() => setFocused('')}
          style={fieldStyle('username')}
        />
      </div>

      {/* ── Email ── */}
      <div style={{ marginBottom: 18 }}>
        <label style={S.label}>Email</label>
        <input
          type="email"
          placeholder="Enter email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          onFocus={() => setFocused('email')}
          onBlur={() => setFocused('')}
          style={fieldStyle('email')}
        />
      </div>

      {/* ── Password ── */}
      <div style={{ marginBottom: 18 }}>
        <label style={S.label}>Password</label>
        <div style={{ position: 'relative' }}>
          <input
            type={showPw1 ? 'text' : 'password'}
            placeholder="Enter password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            onFocus={() => setFocused('pw1')}
            onBlur={() => setFocused('')}
            style={{ ...fieldStyle('pw1'), paddingRight: 50 }}
          />
          <button
            onClick={() => setShowPw1(!showPw1)}
            tabIndex={-1}
            style={S.eyeBtn}
          >
            {showPw1 ? <EyeOpen /> : <EyeOff />}
          </button>
        </div>
      </div>

      {/* ── Re-enter Password ── */}
      <div style={{ marginBottom: 40 }}>
        <label style={S.label}>Re enter password</label>
        <div style={{ position: 'relative' }}>
          <input
            type={showPw2 ? 'text' : 'password'}
            placeholder="Enter password"
            value={confirm}
            onChange={e => setConfirm(e.target.value)}
            onFocus={() => setFocused('pw2')}
            onBlur={() => setFocused('')}
            onKeyDown={e => e.key === 'Enter' && handleSignup()}
            style={{ ...fieldStyle('pw2'), paddingRight: 50 }}
          />
          <button
            onClick={() => setShowPw2(!showPw2)}
            tabIndex={-1}
            style={S.eyeBtn}
          >
            {showPw2 ? <EyeOpen /> : <EyeOff />}
          </button>
        </div>
      </div>

      {/* ── Create Account button ── */}
      <button
        onClick={handleSignup}
        disabled={loading}
        style={{
          width: '100%',
          background: loading
            ? '#9CA3AF'
            : 'linear-gradient(135deg, #5B57F5, #6366F1)',
          color: '#fff',
          border: 'none',
          borderRadius: 99,          // fully rounded — matches design
          padding: '17px',
          fontSize: 16,
          fontWeight: 800,
          cursor: loading ? 'not-allowed' : 'pointer',
          fontFamily: 'inherit',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 10,
          boxShadow: loading ? 'none' : '0 6px 24px rgba(91,87,245,0.40)',
          transition: 'all 0.2s',
          letterSpacing: 0.2,
        }}
      >
        {loading && <Spinner />}
        {loading ? 'Creating account...' : 'Create Account'}
      </button>

      {/* ── Already have account ── */}
      <p style={{ textAlign: 'center', marginTop: 24, fontSize: 14, color: '#8892A4' }}>
        Already have an account?{' '}
        <Link to="/login" style={{ color: '#5B57F5', fontWeight: 700, textDecoration: 'none' }}>
          Log in
        </Link>
      </p>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        input::placeholder { color: #AAAAB8; }
      `}</style>
    </div>
  )
}

// ── Shared styles ─────────────────────────────────────────────────────────
const S = {
  label: {
    display: 'block',
    fontSize: 14,
    fontWeight: 700,
    color: '#1a1a2e',
    marginBottom: 8,
  },
  eyeBtn: {
    position: 'absolute',
    right: 16,
    top: '50%',
    transform: 'translateY(-50%)',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    padding: 4,
    display: 'flex',
    alignItems: 'center',
    color: '#AAAAB8',
  },
}

// ── SVG icons — match the strikethrough eye in the design ────────────────
function EyeOff() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94"/>
      <path d="M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19"/>
      <line x1="1" y1="1" x2="23" y2="23"/>
    </svg>
  )
}
function EyeOpen() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
      <circle cx="12" cy="12" r="3"/>
    </svg>
  )
}
function Spinner() {
  return (
    <span style={{
      width: 18, height: 18,
      border: '2px solid rgba(255,255,255,0.35)',
      borderTop: '2px solid #fff',
      borderRadius: '50%',
      display: 'inline-block',
      animation: 'spin 0.8s linear infinite',
      flexShrink: 0,
    }} />
  )
}
