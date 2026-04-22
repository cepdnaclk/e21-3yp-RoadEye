import { useState } from 'react'

export default function MusicPlayer() {
  const [isPlaying, setIsPlaying] = useState(true)

  return (
    <div style={{ background: 'linear-gradient(135deg,#2d2d2d 0%,#1a1a2e 100%)', borderRadius: 16, padding: '14px 16px', marginBottom: 10, color: '#fff', boxShadow: '0 4px 16px rgba(0,0,0,0.25)' }}>
      {/* Track info */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
        <div>
          <div style={{ fontSize: 17, fontWeight: 800 }}>Sway</div>
          <div style={{ fontSize: 12, color: '#9ca3af' }}>Michael Bublé</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div style={{ background: '#4F46E5', borderRadius: 20, padding: '4px 10px', fontSize: 10, fontWeight: 700 }}>🎧 Helmet Module</div>
          <div style={{ fontSize: 10, color: '#4ade80', fontWeight: 700 }}>SPOTIFY</div>
        </div>
      </div>

      {/* Progress */}
      <div style={{ background: 'rgba(255,255,255,0.2)', borderRadius: 99, height: 3, marginBottom: 8 }}>
        <div style={{ width: '54%', height: '100%', background: '#fff', borderRadius: 99 }} />
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: '#9ca3af', marginBottom: 12 }}>
        <span>1:42</span><span>3:08</span>
      </div>

      {/* Controls */}
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 24 }}>
        <button style={styles.btn}>⏮</button>
        <button onClick={() => setIsPlaying(!isPlaying)} style={{ ...styles.btn, width: 44, height: 44, background: '#fff', color: '#1a1a2e', borderRadius: '50%', fontSize: 16 }}>
          {isPlaying ? '⏸' : '▶'}
        </button>
        <button style={styles.btn}>⏭</button>
      </div>
    </div>
  )
}

const styles = {
  btn: { background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: '50%', width: 36, height: 36, color: '#fff', fontSize: 14, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' },
}
