import { useState } from 'react'
import { colors } from '../../utils/theme'

const C = colors
const weekData = [62, 45, 78, 55, 40, 90, 30]
const days = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su']

export default function StatsChart() {
  const [activeTab, setActiveTab] = useState('Weekly')
  const maxVal = Math.max(...weekData)

  return (
    <div style={{ background: C.white, borderRadius: 16, padding: 14, marginBottom: 80, boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
      <div style={{ fontSize: 12, fontWeight: 700, color: C.text, marginBottom: 10 }}>Speed Vs Time</div>

      {/* Tab switcher */}
      <div style={{ display: 'flex', background: C.purpleSoft, borderRadius: 20, padding: 3, marginBottom: 16, width: 'fit-content' }}>
        {['Today', 'Weekly', 'Monthly'].map(t => (
          <button key={t} onClick={() => setActiveTab(t)} style={{
            padding: '6px 14px', borderRadius: 17, border: 'none', cursor: 'pointer',
            fontSize: 12, fontWeight: 700, fontFamily: 'inherit',
            background: activeTab === t ? C.primary : 'transparent',
            color: activeTab === t ? '#fff' : C.muted,
            transition: 'all 0.2s',
          }}>{t}</button>
        ))}
      </div>

      {/* Bar chart */}
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, height: 90 }}>
        {weekData.map((val, i) => (
          <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
            <div style={{ width: '100%', height: `${(val / maxVal) * 80}px`, background: i === 5 ? C.primary : 'rgba(124,92,245,0.25)', borderRadius: '6px 6px 0 0', transition: 'height 0.4s ease' }} />
            <div style={{ fontSize: 10, color: C.muted, fontWeight: 600 }}>{days[i]}</div>
          </div>
        ))}
      </div>
    </div>
  )
}
