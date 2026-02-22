import { colors } from '../../utils/theme'

const C = colors

export default function WeatherCard() {
  return (
    <div style={{ background: C.white, borderRadius: 16, padding: '14px 16px', margin: '12px 0 10px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
      <div>
        <div style={{ fontSize: 32, fontWeight: 800, color: C.text, lineHeight: 1 }}>19°</div>
        <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>C</div>
        <div style={{ fontSize: 12, fontWeight: 600, color: C.text, marginTop: 4 }}>Partly Cloudy</div>
        <div style={{ fontSize: 10, color: C.muted }}>H: 22° L: 14°</div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flex: 1, paddingLeft: 20 }}>
        <div style={styles.metaRow}><span>💧</span><span style={{ fontWeight: 600 }}>Humidity</span><span style={{ marginLeft: 'auto', fontWeight: 700 }}>64%</span></div>
        <div style={styles.metaRow}><span>🌬️</span><span style={{ fontWeight: 600 }}>Wind</span><span style={{ marginLeft: 'auto', fontWeight: 700 }}>12 km/h</span></div>
      </div>
      <div style={{ width: 52, height: 52, borderRadius: 14, background: '#FFF7ED', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26, marginLeft: 12 }}>
        ⛅
      </div>
    </div>
  )
}

const styles = {
  metaRow: { display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#1a1a2e' },
}
