export default function StatusBar({ bg = '#fff' }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 20px 8px', background: bg }}>
      <span style={{ fontWeight: 700, fontSize: 15 }}>9:41</span>
      <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
        {/* Signal */}
        <svg width="17" height="12" viewBox="0 0 17 12" fill="#1a1a2e">
          <rect x="0" y="3" width="3" height="9" rx="1"/>
          <rect x="4.5" y="2" width="3" height="10" rx="1"/>
          <rect x="9" y="0.5" width="3" height="11.5" rx="1"/>
          <rect x="13.5" y="0" width="3" height="12" rx="1"/>
        </svg>
        {/* Wifi */}
        <svg width="16" height="12" viewBox="0 0 16 12" fill="none" stroke="#1a1a2e" strokeWidth="1.5">
          <path d="M8 3c2.5 0 4.7 1 6.3 2.7L8 12 1.7 5.7C3.3 4 5.5 3 8 3z"/>
        </svg>
        {/* Battery */}
        <div style={{ width: 25, height: 12, border: '1.5px solid #1a1a2e', borderRadius: 3, padding: '1.5px', display: 'flex', alignItems: 'center' }}>
          <div style={{ width: '75%', height: '100%', background: '#1a1a2e', borderRadius: 1.5 }} />
        </div>
      </div>
    </div>
  )
}
