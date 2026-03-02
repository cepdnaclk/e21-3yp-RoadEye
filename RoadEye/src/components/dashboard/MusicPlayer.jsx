import { useState, useEffect, useRef } from 'react'
import { View, Text, TouchableOpacity, StyleSheet, Alert, AppState } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { ApiScope, auth as SpotifyAuth, remote as SpotifyRemote } from 'react-native-spotify-remote'

const SPOTIFY_CONFIG = {
  clientID:     '6a50dffacf9f4cd4a3ba9189a52059d2',
  redirectURL:  'com.roadeye.app://callback',
  scopes: [
    ApiScope.AppRemoteControlScope,
    ApiScope.UserReadCurrentlyPlayingScope,
  ],
  showDialog: false,
}

const formatTime = (ms) => {
  const totalSec = Math.floor((ms || 0) / 1000)
  const min = Math.floor(totalSec / 60)
  const sec = totalSec % 60
  return `${min}:${sec.toString().padStart(2, '0')}`
}

export default function MusicPlayer() {
  const [isPlaying,   setIsPlaying]   = useState(false)
  const [connected,   setConnected]   = useState(false)
  const [connecting,  setConnecting]  = useState(false)
  const [trackName,   setTrackName]   = useState(null)
  const [artist,      setArtist]      = useState(null)
  const [progress,    setProgress]    = useState(0)
  const [currentTime, setCurrentTime] = useState('0:00')
  const [totalTime,   setTotalTime]   = useState('0:00')
  const listenerRef = useRef(null)

  const updateFromState = (state) => {
    if (!state) return
    setIsPlaying(!state.isPaused)
    setTrackName(state.track?.name || 'Unknown')
    setArtist(state.track?.artist?.name || 'Unknown')
    const pos      = state.playbackPosition || 0
    const duration = state.track?.duration  || 1
    setProgress(pos / duration)
    setCurrentTime(formatTime(pos))
    setTotalTime(formatTime(duration))
  }

  const connectSpotify = async () => {
    if (connecting || connected) return
    setConnecting(true)
    try {
      const session = await SpotifyAuth.authorize(SPOTIFY_CONFIG)
      await SpotifyRemote.connect(session.accessToken)
      setConnected(true)
      const state = await SpotifyRemote.getPlayerState()
      if (state) updateFromState(state)
      listenerRef.current = SpotifyRemote.addListener('playerStateChanged', updateFromState)
    } catch (e) {
      Alert.alert('Spotify Error', e.message || 'Could not connect to Spotify.')
    } finally {
      setConnecting(false)
    }
  }

  useEffect(() => {
    connectSpotify()
    return () => {
      try {
        if (listenerRef.current) listenerRef.current.remove()
        SpotifyRemote.disconnect()
      } catch (e) {}
    }
  }, [])

  useEffect(() => {
    const sub = AppState.addEventListener('change', (appState) => {
      if (appState === 'active' && !connected) connectSpotify()
    })
    return () => sub.remove()
  }, [connected])

  const togglePlay = async () => {
    if (!connected) { connectSpotify(); return }
    try {
      isPlaying
        ? await SpotifyRemote.pausePlayback()
        : await SpotifyRemote.resumePlayback()
      setIsPlaying(!isPlaying)
    } catch (e) {}
  }

  const skipNext = async () => {
    if (!connected) return
    try { await SpotifyRemote.skipToNext() } catch (e) {}
  }

  const skipPrev = async () => {
    if (!connected) return
    try { await SpotifyRemote.skipToPrevious() } catch (e) {}
  }

  return (
    <LinearGradient
      colors={['#2d2d2d', '#1a1a2e']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.card}
    >
      <View style={styles.topRow}>
        <View style={{ flex: 1, marginRight: 8 }}>
          <Text style={styles.trackName} numberOfLines={1}>
            {connecting ? 'Connecting to Spotify...' : trackName || 'Tap ▶ to connect Spotify'}
          </Text>
          <Text style={styles.artist} numberOfLines={1}>
            {artist || 'No track playing'}
          </Text>
        </View>
        <View style={styles.badges}>
          <View style={styles.helmetBadge}>
            <Text style={styles.helmetText}>🎧 Helmet Module</Text>
          </View>
          <Text style={[styles.spotifyText, connected && styles.spotifyConnected]}>
            {connected ? '● SPOTIFY' : '○ SPOTIFY'}
          </Text>
        </View>
      </View>

      <View style={styles.progressBg}>
        <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
      </View>
      <View style={styles.timeRow}>
        <Text style={styles.timeText}>{currentTime}</Text>
        <Text style={styles.timeText}>{totalTime}</Text>
      </View>

      <View style={styles.controls}>
        <TouchableOpacity style={styles.ctrlBtn} onPress={skipPrev}>
          <Text style={styles.ctrlIcon}>⏮</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={togglePlay} style={styles.playBtn}>
          <Text style={styles.playIcon}>{isPlaying ? '⏸' : '▶'}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.ctrlBtn} onPress={skipNext}>
          <Text style={styles.ctrlIcon}>⏭</Text>
        </TouchableOpacity>
      </View>
    </LinearGradient>
  )
}

const styles = StyleSheet.create({
  card:             { borderRadius: 16, padding: 16, marginBottom: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 12, elevation: 6 },
  topRow:           { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 },
  trackName:        { fontSize: 17, fontWeight: '800', color: '#fff' },
  artist:           { fontSize: 12, color: '#9ca3af' },
  badges:           { flexDirection: 'row', alignItems: 'center', gap: 6 },
  helmetBadge:      { backgroundColor: '#4F46E5', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 },
  helmetText:       { fontSize: 10, fontWeight: '700', color: '#fff' },
  spotifyText:      { fontSize: 10, color: '#6b7280', fontWeight: '700' },
  spotifyConnected: { color: '#1DB954' },
  progressBg:       { backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 99, height: 3, marginBottom: 8 },
  progressFill:     { height: '100%', backgroundColor: '#fff', borderRadius: 99 },
  timeRow:          { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  timeText:         { fontSize: 10, color: '#9ca3af' },
  controls:         { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 24 },
  ctrlBtn:          { backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 18, width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  ctrlIcon:         { fontSize: 14 },
  playBtn:          { backgroundColor: '#fff', borderRadius: 22, width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  playIcon:         { fontSize: 16 },
})