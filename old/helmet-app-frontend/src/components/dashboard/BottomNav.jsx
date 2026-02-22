import { colors } from '../../utils/theme'

const C = colors

const tabs = [
  { id: 'overview',   label: 'Overview',   icon: '📊' },
  { id: 'explore',    label: 'Explore',    icon: '🧭' },
  { id: 'emergency',  label: 'Emergency',  icon: '📞' },
]

export default function BottomNav({ active, onChange }) {
  return (
    <div style={{ position: 'sticky', bottom: 0, background: C.white, borderTop: '1px solid #F3F4F6', padding: '10px 0 20px', display: 'flex', justifyContent: 'space-around', zIndex: 100 }}>
      {tabs.map(tab => (
        <button key={tab.id} onClick={() => onChange(tab.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, padding: '0 20px' }}>
          <span style={{ fontSize: 22 }}>{tab.icon}</span>
          <span style={{ fontSize: 10, fontWeight: 700, color: active === tab.id ? C.primary : C.muted, fontFamily: 'inherit' }}>{tab.label}</span>
        </button>
      ))}
    </div>
  )
}
