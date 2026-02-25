import { useState } from 'react'
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'

export default function MusicPlayer() {
  const [isPlaying, setIsPlaying] = useState(true)

  return (
    <LinearGradient colors={['#2d2d2d', '#1a1a2e']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.card}>
      {/* Track info */}
      <View style={styles.topRow}>
        <View>
          <Text style={styles.trackName}>Sway</Text>
          <Text style={styles.artist}>Michael Bublé</Text>
        </View>
        <View style={styles.badges}>
          <View style={styles.helmetBadge}>
            <Text style={styles.helmetText}>🎧 Helmet Module</Text>
          </View>
          <Text style={styles.spotifyText}>SPOTIFY</Text>
        </View>
      </View>

      {/* Progress bar */}
      <View style={styles.progressBg}>
        <View style={styles.progressFill} />
      </View>
      <View style={styles.timeRow}>
        <Text style={styles.timeText}>1:42</Text>
        <Text style={styles.timeText}>3:08</Text>
      </View>

      {/* Controls */}
      <View style={styles.controls}>
        <TouchableOpacity style={styles.ctrlBtn}>
          <Text style={styles.ctrlIcon}>⏮</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => setIsPlaying(!isPlaying)} style={styles.playBtn}>
          <Text style={styles.playIcon}>{isPlaying ? '⏸' : '▶'}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.ctrlBtn}>
          <Text style={styles.ctrlIcon}>⏭</Text>
        </TouchableOpacity>
      </View>
    </LinearGradient>
  )
}

const styles = StyleSheet.create({
  card:        { borderRadius: 16, padding: 16, marginBottom: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 12, elevation: 6 },
  topRow:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 },
  trackName:   { fontSize: 17, fontWeight: '800', color: '#fff' },
  artist:      { fontSize: 12, color: '#9ca3af' },
  badges:      { flexDirection: 'row', alignItems: 'center', gap: 6 },
  helmetBadge: { backgroundColor: '#4F46E5', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 },
  helmetText:  { fontSize: 10, fontWeight: '700', color: '#fff' },
  spotifyText: { fontSize: 10, color: '#4ade80', fontWeight: '700' },
  progressBg:  { backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 99, height: 3, marginBottom: 8 },
  progressFill:{ width: '54%', height: '100%', backgroundColor: '#fff', borderRadius: 99 },
  timeRow:     { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  timeText:    { fontSize: 10, color: '#9ca3af' },
  controls:    { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 24 },
  ctrlBtn:     { backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 18, width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  ctrlIcon:    { fontSize: 14 },
  playBtn:     { backgroundColor: '#fff', borderRadius: 22, width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  playIcon:    { fontSize: 16 },
})
