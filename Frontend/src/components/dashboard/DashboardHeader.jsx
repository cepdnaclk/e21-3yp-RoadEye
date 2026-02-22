import { colors } from '../../utils/theme'

const C = colors

export default function DashboardHeader({ onLogout }) {
  return (
    <div style={{ background: C.white, padding: '14px 20px 16px' }}>
      {/* Name row */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
        <div>
          <div style={{ fontSize: 22, fontWeight: 800, color: C.text }}>Hi Hirushi,</div>
          <div style={{ fontSize: 11, color: C.muted, fontWeight: 500, letterSpacing: '0.06em', textTransform: 'uppercase' }}>Tues 11 Feb</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <button onClick={onLogout} style={styles.iconBtn} title="Settings / Logout">⚙️</button>
          <button style={styles.iconBtn}>🔔</button>
          <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'linear-gradient(135deg,#f97316,#ec4899)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800, fontSize: 14 }}>H</div>
        </div>
      </div>

      {/* Connection pills */}
      <div style={{ display: 'flex', gap: 10, marginTop: 14 }}>
        <div style={styles.connectedPill}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#4ade80' }} />
          Connected to the helmet
        </div>
        <div style={styles.navPill}>🗺️ Navigation</div>
      </div>
    </div>
  )
}

const styles = {
  iconBtn: { background: 'none', border: 'none', cursor: 'pointer', fontSize: 18 },
  connectedPill: { background: C.primary, borderRadius: 20, padding: '8px 14px', color: '#fff', fontSize: 12, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6 },
  navPill: { background: C.purpleSoft, borderRadius: 20, padding: '8px 14px', color: C.primary, fontSize: 12, fontWeight: 700, border: `1px solid #DDD6FE` },
}
