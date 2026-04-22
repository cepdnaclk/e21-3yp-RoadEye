import { useState } from 'react'

const STEPS = ['location', 'bluetooth']

export default function PermissionModal({ onComplete }) {
  const [step,    setStep]    = useState(0)   // 0 = location, 1 = bluetooth
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState({})
  const [denied,  setDenied]  = useState(false)

  const current = STEPS[step]

  // ── Request location via browser Geolocation API ──────────────────────
  const requestLocation = async () => {
    setLoading(true)
    setDenied(false)
    return new Promise((resolve) => {
      if (!navigator.geolocation) {
        resolve(false)
        return
      }
      navigator.geolocation.getCurrentPosition(
        ()  => resolve(true),
        ()  => resolve(false),
        { timeout: 8000 }
      )
    })
  }

  // ── Simulate Bluetooth permission (Web Bluetooth API) ─────────────────
  const requestBluetooth = async () => {
    setLoading(true)
    setDenied(false)
    await new Promise(r => setTimeout(r, 1200)) // simulate scan
    return true  // always grant in simulation
  }

  const handleAllow = async () => {
    setLoading(true)
    let granted = false

    if (current === 'location') {
      granted = await requestLocation()
    } else {
      granted = await requestBluetooth()
    }

    setLoading(false)

    const updated = { ...results, [current]: granted }
    setResults(updated)

    if (!granted) {
      setDenied(true)   // show inline denied message, stay on step
      return
    }

    advance(updated)
  }

  const handleSkip = () => {
    const updated = { ...results, [current]: false }
    setResults(updated)
    advance(updated)
  }

  const advance = (updated) => {
    if (step < STEPS.length - 1) {
      setStep(step + 1)
      setDenied(false)
    } else {
      onComplete(updated)   // all steps done → tell LoginPage
    }
  }

  // ── Config per step ───────────────────────────────────────────────────
  const CONFIG = {
    location: {
      icon:        '📍',
      iconBg:      '#ECFDF5',
      iconColor:   '#059669',
      title:       'Allow Location Access',
      description: 'RoadEye needs your location to show weather conditions, traffic alerts, and your ride route on the map.',
      allowLabel:  'Allow Location',
      allowColor:  '#059669',
      allowShadow: '0 6px 20px rgba(5,150,105,0.35)',
      deniedMsg:   'Location was denied. Some features like weather and map tracking will be limited.',
    },
    bluetooth: {
      icon:        '🔵',
      iconBg:      '#EFF6FF',
      iconColor:   '#2563EB',
      title:       'Allow Bluetooth Access',
      description: 'RoadEye needs Bluetooth to connect to your smart helmet for live data, alerts, and music control.',
      allowLabel:  'Allow Bluetooth',
      allowColor:  '#2563EB',
      allowShadow: '0 6px 20px rgba(37,99,235,0.35)',
      deniedMsg:   'Bluetooth was denied. You won\'t be able to connect to your helmet.',
    },
  }

  const cfg = CONFIG[current]

  return (
    <>
      {/* ── Backdrop ── */}
      <div style={{
        position:   'fixed',
        inset:      0,
        background: 'rgba(0,0,0,0.5)',
        zIndex:     200,
        display:    'flex',
        alignItems: 'flex-end',
        justifyContent: 'center',
      }}>

        {/* ── Modal sheet ── */}
        <div style={{
          width:        '100%',
          maxWidth:     420,
          background:   '#fff',
          borderRadius: '24px 24px 0 0',
          padding:      '12px 28px 44px',
          fontFamily:   'Plus Jakarta Sans, sans-serif',
          animation:    'slideUp 0.3s ease',
        }}>

          {/* drag handle */}
          <div style={{ width: 40, height: 4, background: '#E5E7EB', borderRadius: 99, margin: '0 auto 28px' }} />

          {/* step dots */}
          <div style={{ display: 'flex', justifyContent: 'center', gap: 6, marginBottom: 28 }}>
            {STEPS.map((s, i) => (
              <div key={s} style={{
                width:        i === step ? 20 : 8,
                height:       8,
                borderRadius: 99,
                background:   i === step ? '#4F46E5' : i < step ? '#4ADE80' : '#E5E7EB',
                transition:   'all 0.3s',
              }} />
            ))}
          </div>

          {/* icon */}
          <div style={{
            width:          72,
            height:         72,
            borderRadius:   20,
            background:     cfg.iconBg,
            display:        'flex',
            alignItems:     'center',
            justifyContent: 'center',
            fontSize:       36,
            margin:         '0 auto 20px',
          }}>
            {loading ? <Spinner color={cfg.allowColor} /> : cfg.icon}
          </div>

          {/* title */}
          <h2 style={{
            textAlign:  'center',
            fontSize:    22,
            fontWeight:  800,
            color:       '#1a1a2e',
            margin:      '0 0 12px',
          }}>
            {cfg.title}
          </h2>

          {/* description */}
          <p style={{
            textAlign:  'center',
            fontSize:    14,
            color:       '#6B7280',
            lineHeight:  1.6,
            margin:      '0 0 24px',
          }}>
            {cfg.description}
          </p>

          {/* denied warning */}
          {denied && (
            <div style={{
              background:   '#FEF3C7',
              border:       '1px solid #FCD34D',
              borderRadius: 12,
              padding:      '10px 14px',
              marginBottom: 16,
              fontSize:     13,
              color:        '#92400E',
              fontWeight:   600,
              display:      'flex',
              gap:          8,
              alignItems:   'flex-start',
            }}>
              <span style={{ flexShrink: 0 }}>⚠️</span>
              {cfg.deniedMsg}
            </div>
          )}

          {/* Allow button */}
          <button
            onClick={handleAllow}
            disabled={loading}
            style={{
              width:        '100%',
              background:   loading ? '#E5E7EB' : cfg.allowColor,
              color:        loading ? '#9CA3AF' : '#fff',
              border:       'none',
              borderRadius: 14,
              padding:      '15px',
              fontSize:     16,
              fontWeight:   800,
              cursor:       loading ? 'not-allowed' : 'pointer',
              fontFamily:   'inherit',
              marginBottom: 12,
              boxShadow:    loading ? 'none' : cfg.allowShadow,
              transition:   'all 0.2s',
              display:      'flex',
              alignItems:   'center',
              justifyContent: 'center',
              gap:          8,
            }}
          >
            {loading && <Spinner color="#fff" size={18} />}
            {loading ? 'Requesting...' : cfg.allowLabel}
          </button>

          {/* Skip button */}
          <button
            onClick={handleSkip}
            disabled={loading}
            style={{
              width:        '100%',
              background:   'none',
              border:       '1.5px solid #E5E7EB',
              borderRadius: 14,
              padding:      '14px',
              fontSize:     15,
              fontWeight:   700,
              color:        '#6B7280',
              cursor:       loading ? 'not-allowed' : 'pointer',
              fontFamily:   'inherit',
            }}
          >
            Skip for now
          </button>
        </div>
      </div>

      <style>{`
        @keyframes slideUp {
          from { transform: translateY(100%); opacity: 0; }
          to   { transform: translateY(0);    opacity: 1; }
        }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </>
  )
}

function Spinner({ color = '#fff', size = 24 }) {
  return (
    <span style={{
      width:       size,
      height:      size,
      border:      `2.5px solid ${color}44`,
      borderTop:   `2.5px solid ${color}`,
      borderRadius: '50%',
      display:     'inline-block',
      flexShrink:  0,
      animation:   'spin 0.8s linear infinite',
    }} />
  )
}
