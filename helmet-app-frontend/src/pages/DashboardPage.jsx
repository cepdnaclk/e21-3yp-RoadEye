import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth.jsx'
import { colors } from '../utils/theme'

import StatusBar          from '../components/shared/StatusBar'
import DashboardHeader    from '../components/dashboard/DashboardHeader'
import WeatherCard        from '../components/dashboard/WeatherCard'
import MusicPlayer        from '../components/dashboard/MusicPlayer'
import StatsChart         from '../components/dashboard/StatsChart'
import BottomNav          from '../components/dashboard/BottomNav'

const C = colors

const highlights = [
  { label: 'Duration',      value: '11,857', sub: 'updated 15 min ago', grad: 'linear-gradient(135deg,#5B47E0,#7B5CF5)', icon: '⏱' },
  { label: 'Average Speed', value: '40 km/h', sub: 'updated 5s ago',    grad: 'linear-gradient(135deg,#7B5CF5,#A78BFA)', icon: '🚴' },
]

const weekStats = [
  { icon: '🚴', label: 'Stability score',       val: 68 },
  { icon: '🛑', label: 'Aggressive Brakings',   val: 35 },
  { icon: '🏍️', label: 'Sudden Accelerations',  val: 56 },
  { icon: '↪️', label: 'Sharp turns',            val: 10 },
]

export default function DashboardPage() {
  const { logout } = useAuth()
  const navigate   = useNavigate()
  const [activeTab, setActiveTab] = useState('overview')

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', background: C.bg, overflowX: 'hidden' }}>
      <StatusBar bg={C.white} />
      <DashboardHeader onLogout={handleLogout} />

      <div style={{ padding: '0 16px', flex: 1 }}>
        <WeatherCard />
        <MusicPlayer />

        {/* Overview heading */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <div style={{ fontSize: 20, fontWeight: 800, color: C.text }}>Overview</div>
          <div style={{ background: C.purpleSoft, borderRadius: 20, padding: '6px 12px', fontSize: 11, fontWeight: 700, color: C.primary }}>📊 All data</div>
        </div>

        {/* Odometer */}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 20 }}>
          <div style={{ position: 'relative', width: 160, height: 90 }}>
            <svg width="160" height="90" viewBox="0 0 160 90">
              <path d="M 15 85 A 70 70 0 0 1 145 85" fill="none" stroke="#E5E7EB" strokeWidth="10" strokeLinecap="round"/>
              <path d="M 15 85 A 70 70 0 0 1 145 85" fill="none" stroke={C.primary} strokeWidth="10" strokeLinecap="round" strokeDasharray="220" strokeDashoffset="55"/>
            </svg>
            <div style={{ position: 'absolute', top: '30%', left: '50%', transform: 'translateX(-50%)', textAlign: 'center', whiteSpace: 'nowrap' }}>
              <div style={{ fontSize: 22, fontWeight: 800, color: C.text }}>11,857</div>
              <div style={{ fontSize: 10, color: C.muted, fontWeight: 500, border: '1px solid #E5E7EB', borderRadius: 6, padding: '2px 8px', marginTop: 2 }}>Total Distance</div>
            </div>
          </div>
        </div>

        {/* Highlights */}
        <SectionHeader title="Highlights" />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
          {highlights.map(h => (
            <div key={h.label} style={{ background: h.grad, borderRadius: 16, padding: 14, color: '#fff' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <div style={{ fontSize: 11, fontWeight: 700, opacity: 0.9 }}>{h.label}</div>
                <span style={{ fontSize: 20 }}>{h.icon}</span>
              </div>
              <div style={{ fontSize: 22, fontWeight: 800, margin: '6px 0 4px' }}>{h.value}</div>
              <div style={{ fontSize: 10, opacity: 0.8 }}>{h.sub}</div>
            </div>
          ))}
        </div>

        {/* Weekly report */}
        <SectionHeader title="This week report" />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
          {weekStats.map(s => (
            <div key={s.label} style={{ background: C.white, borderRadius: 14, padding: 12, boxShadow: '0 1px 8px rgba(0,0,0,0.06)' }}>
              <div style={{ fontSize: 16 }}>{s.icon}</div>
              <div style={{ fontSize: 11, color: C.muted, fontWeight: 500, margin: '4px 0 2px', lineHeight: 1.3 }}>{s.label}</div>
              <div style={{ fontSize: 22, fontWeight: 800, color: C.text }}>{s.val}</div>
            </div>
          ))}
        </div>

        {/* Statistics */}
        <SectionHeader title="Statistics" />
        <StatsChart />
      </div>

      <BottomNav active={activeTab} onChange={setActiveTab} />
    </div>
  )
}

function SectionHeader({ title }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
      <div style={{ fontSize: 17, fontWeight: 800, color: colors.text }}>{title}</div>
      <span style={{ fontSize: 12, color: colors.muted, fontWeight: 500, cursor: 'pointer' }}>View more ›</span>
    </div>
  )
}
