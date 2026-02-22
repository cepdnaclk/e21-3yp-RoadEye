import { useState } from 'react'
import { GoogleIcon, AppleIcon } from './SocialIcons'
import { colors } from '../../utils/theme'

const C = colors

export default function LoginForm({ onLogin }) {
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw]     = useState(false)
  const [focused, setFocused]   = useState('')

  const inputWrap = (field) => ({
    position: 'relative',
    background: '#F3F4F8',
    borderRadius: 14,
    border: `2px solid ${focused === field ? C.primary : 'transparent'}`,
    boxShadow: focused === field ? `0 0 0 3px ${C.primary}22` : 'none',
    transition: 'border-color 0.2s, box-shadow 0.2s',
  })

  return (
    <div style={{ padding: '0 28px', paddingTop: 48, flex: 1, display: 'flex', flexDirection: 'column' }}>
      {/* Heading */}
      <div style={{ textAlign: 'center', marginBottom: 52 }}>
        <h1 style={{ fontSize: 36, fontWeight: 800, color: C.text, lineHeight: 1.2 }}>
          Welcome back 👋
        </h1>
      </div>

      {/* Email */}
      <div style={{ marginBottom: 16 }}>
        <label style={styles.label}>Email</label>
        <div style={inputWrap('email')}>
          <input
            type="email"
            placeholder="Enter email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            onFocus={() => setFocused('email')}
            onBlur={() => setFocused('')}
            style={styles.input}
          />
        </div>
      </div>

      {/* Password */}
      <div style={{ marginBottom: 10 }}>
        <label style={styles.label}>Password</label>
        <div style={inputWrap('pw')}>
          <input
            type={showPw ? 'text' : 'password'}
            placeholder="Enter password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            onFocus={() => setFocused('pw')}
            onBlur={() => setFocused('')}
            style={{ ...styles.input, paddingRight: 44 }}
          />
          <button
            onClick={() => setShowPw(!showPw)}
            style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: C.muted }}
          >
            {showPw ? '🙈' : '👁️'}
          </button>
        </div>
      </div>

      {/* Forgot */}
      <div style={{ textAlign: 'right', marginBottom: 32 }}>
        <span style={{ color: C.primary, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Forgot password?</span>
      </div>

      {/* Sign In */}
      <button onClick={onLogin} style={styles.primaryBtn}>Sign In</button>

      {/* Divider */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '24px 0' }}>
        <div style={{ flex: 1, height: 1, background: '#E5E7EB' }} />
        <span style={{ fontSize: 11, color: C.muted, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase' }}>or log in with</span>
        <div style={{ flex: 1, height: 1, background: '#E5E7EB' }} />
      </div>

      {/* Social */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: 20 }}>
        {[<GoogleIcon />, <AppleIcon />].map((ic, i) => (
          <button key={i} style={styles.socialBtn}>{ic}</button>
        ))}
      </div>

      {/* Sign up */}
      <div style={{ textAlign: 'center', marginTop: 'auto', paddingBottom: 32, paddingTop: 24, fontSize: 14, color: C.muted }}>
        Don't have an account? <span style={{ color: C.primary, fontWeight: 700, cursor: 'pointer' }}>Sign up</span>
      </div>
    </div>
  )
}

const styles = {
  label: { display: 'block', fontSize: 13, fontWeight: 600, color: '#4B5563', marginBottom: 6 },
  input: { width: '100%', background: 'transparent', border: 'none', padding: '14px 16px', fontSize: 15, color: '#1a1a2e', fontFamily: 'inherit', fontWeight: 500 },
  primaryBtn: { width: '100%', background: 'linear-gradient(135deg,#4F46E5,#6366F1)', color: '#fff', border: 'none', borderRadius: 14, padding: 16, fontSize: 16, fontWeight: 800, cursor: 'pointer', boxShadow: '0 6px 20px rgba(79,70,229,0.4)', fontFamily: 'inherit' },
  socialBtn: { width: 56, height: 56, borderRadius: 16, border: '1.5px solid #E5E7EB', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' },
}
