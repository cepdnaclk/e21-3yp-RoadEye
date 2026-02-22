import { useState } from 'react'
import { colors } from '../../utils/theme'

const C = colors

const PERMISSIONS = [
  {
    key: 'location',
    icon: '📍',
    title: 'Allow Location Access',
    description:
      'HelmetApp needs your location to show real-time navigation, track your ride route, and display accurate weather conditions along your journey.',
    allowLabel: 'Allow While Using App',
    denyLabel: "Don't Allow",
    gradient: 'linear-gradient(135deg, #4F46E5, #7C3AED)',
    glow: 'rgba(79,70,229,0.25)',
    bg: '#EDE9FE',
    iconBg: '#DDD6FE',
  },
  {
    key: 'bluetooth',
    icon: '🎧',
    title: 'Allow Bluetooth Access',
    description:
      "HelmetApp uses Bluetooth to connect to your smart helmet for audio alerts, music playback, and real-time sensor data from your helmet's built-in modules.",
    allowLabel: 'Allow Bluetooth',
    denyLabel: "Don't Allow",
    gradient: 'linear-gradient(135deg, #0EA5E9, #6366F1)',
    glow: 'rgba(14,165,233,0.25)',
    bg: '#E0F2FE',
    iconBg: '#BAE6FD',
  },
]

export default function PermissionModal({ onComplete }) {
  const [step, setStep] = useState(0)
  const [results, setResults] = useState({})

  const current = PERMISSIONS[step]
  const isLast = step === PERMISSIONS.length - 1

  const handleChoice = async (allowed) => {
    const newResults = { ...results, [current.key]: allowed }
    setResults(newResults)

    // Actually request the browser permission where possible
    if (allowed) {
      try {
        if (current.key === 'location') {
          navigator.geolocation?.getCurrentPosition(() => {}, () => {})
        }
        // Bluetooth Web API requires user gesture — this is the gesture
        if (current.key === 'bluetooth' && navigator.bluetooth) {
          navigator.bluetooth.requestDevice({ acceptAllDevices: true }).catch(() => {})
        }
      } catch (_) {}
    }

    if (isLast) {
      onComplete(newResults)
    } else {
      setStep(step + 1)
    }
  }

  return (
    <div style={overlay}>
      <div style={backdrop} />
      <div style={sheet}>
        {/* Step dots */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: 6, marginBottom: 28 }}>
          {PERMISSIONS.map((_, i) => (
            <div
              key={i}
              style={{
                width: i === step ? 22 : 8,
                height: 8,
                borderRadius: 99,
                background: i === step ? C.primary : '#DDD6FE',
                transition: 'width 0.3s ease, background 0.3s ease',
              }}
            />
          ))}
        </div>

        {/* Icon bubble */}
        <div
          style={{
            width: 80,
            height: 80,
            borderRadius: 24,
            background: current.iconBg,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 38,
            margin: '0 auto 24px',
            boxShadow: `0 8px 24px ${current.glow}`,
          }}
        >
          {current.icon}
        </div>

        {/* Text */}
        <h2
          style={{
            fontSize: 22,
            fontWeight: 800,
            color: C.text,
            textAlign: 'center',
            marginBottom: 12,
            lineHeight: 1.25,
          }}
        >
          {current.title}
        </h2>
        <p
          style={{
            fontSize: 14,
            color: C.muted,
            textAlign: 'center',
            lineHeight: 1.65,
            marginBottom: 32,
            padding: '0 4px',
          }}
        >
          {current.description}
        </p>

        {/* Info pill */}
        <div
          style={{
            background: current.bg,
            borderRadius: 12,
            padding: '12px 16px',
            marginBottom: 28,
            display: 'flex',
            alignItems: 'flex-start',
            gap: 10,
          }}
        >
          <span style={{ fontSize: 16, marginTop: 1 }}>ℹ️</span>
          <span style={{ fontSize: 12, color: '#5B21B6', fontWeight: 500, lineHeight: 1.5 }}>
            You can change this permission anytime in your device Settings.
          </span>
        </div>

        {/* Buttons */}
        <button
          onClick={() => handleChoice(true)}
          style={{
            width: '100%',
            background: current.gradient,
            color: '#fff',
            border: 'none',
            borderRadius: 14,
            padding: '15px 0',
            fontSize: 15,
            fontWeight: 700,
            cursor: 'pointer',
            marginBottom: 12,
            boxShadow: `0 6px 20px ${current.glow}`,
            fontFamily: 'inherit',
          }}
        >
          {current.allowLabel}
        </button>
        <button
          onClick={() => handleChoice(false)}
          style={{
            width: '100%',
            background: 'transparent',
            color: C.muted,
            border: '1.5px solid #E5E7EB',
            borderRadius: 14,
            padding: '14px 0',
            fontSize: 15,
            fontWeight: 600,
            cursor: 'pointer',
            fontFamily: 'inherit',
          }}
        >
          {current.denyLabel}
        </button>
      </div>
    </div>
  )
}

const overlay = {
  position: 'fixed',
  inset: 0,
  zIndex: 1000,
  display: 'flex',
  alignItems: 'flex-end',
}

const backdrop = {
  position: 'absolute',
  inset: 0,
  background: 'rgba(10,10,30,0.55)',
  backdropFilter: 'blur(4px)',
}

const sheet = {
  position: 'relative',
  width: '100%',
  background: '#fff',
  borderRadius: '28px 28px 0 0',
  padding: '28px 28px 40px',
  boxShadow: '0 -8px 40px rgba(0,0,0,0.18)',
  animation: 'slideUp 0.35s cubic-bezier(0.34,1.56,0.64,1)',
}
