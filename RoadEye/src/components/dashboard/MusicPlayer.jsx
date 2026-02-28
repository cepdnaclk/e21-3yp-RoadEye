import { useState, useEffect } from 'react'
import { View, Text, TouchableOpacity, StyleSheet, Linking, Alert } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import Spotify, { ApiScope, SpotifyRemote } from 'react-native-spotify-remote'

const SPOTIFY_CONFIG = {
  clientID:        process.env.SPOTIFY_CLIENT_ID,
  redirectURL:     'roadeye://callback',
  tokenSwapURL:    process.env.SPOTIFY_TOKEN_SWAP_URL,
  tokenRefreshURL: process.env.SPOTIFY_TOKEN_REFRESH_URL,
  scopes: [
    ApiScope.AppRemoteControlScope,
    ApiScope.UserReadCurrentlyPlayingScope,
  ],
}

export default function MusicPlayer() {
  const [isPlaying,  setIsPlaying]  = useState(false)
  const [connected,  setConnected]  = useState(false)
  const [trackName,  setTrackName]  = useState('Sway')
  const [artist,     setArtist]     = useState('Michael Bublé')
  const [progress,   setProgress]   = useState(0.54)   // 0.0 – 1.0
  const [currentTime, setCurrentTime] = useState('1:42')
  const [totalTime,  setTotalTime]  = useState('3:08')

  // ── Connect to Spotify ──────────────────────────────────────────────
  const connectSpotify = async () => {
    try {
      const installed = await Linking.canOpenURL('spotify://')
      if (!installed) {
        Alert.alert(
          'Spotify Not Found',
          'Please install Spotify to use this feature.',
          [
            { text: 'Install', onPress: () => Linking.openURL('https://www.spotify.com/download') },
            { text: 'Cancel' }
          ]
        )
        return
      }

      const session = await Spotify.authorize(SPOTIFY_CONFIG)
      await SpotifyRemote.connect(session.accessToken)
      setConnected(true)

      // Listen to player state changes
      SpotifyRemote.addListener('playerStateChanged', (state) => {
        setIsPlaying(!state.isPaused)
        setTrackName(state.track?.name           || 'Unknown')
        setArtist(state.track?.artist?.name      || 'Unknown')

        // calculate progress
        const pos      = state.playbackPosition  || 0
        const duration = state.track?.duration   || 1
        setProgress(pos / duration)

        // format time
        setCurrentTime(formatTime(pos))
        setTotalTime(formatTime(duration))
      })

    } catch (e) {
      Alert.alert('Spotify Error', e.message)
    }
  }

  // ── Auto connect on mount ───────────────────────────────────────────
  useEffect(() => {
    connectSpotify()
    return () => {
      SpotifyRemote.removeAllListeners('playerStateChanged')
      SpotifyRemote.disconnect()
    }
  }, [])

  // ── Controls ────────────────────────────────────────────────────────
  const togglePlay = async () => {
    if (!connected) { connectSpotify(); return }
    isPlaying
      ? await SpotifyRemote.pausePlayback()
      : await SpotifyRemote.resumePlayback()
    setIsPlaying(!isPlaying)
  }

  const skipNext = async () => {
    if (!connected) return
    await SpotifyRemote.skipToNext()
  }

  const skipPrev = async () => {
    if (!connected) return
    await SpotifyRemote.skipToPrevious()
  }

  // ── Helper ──────────────────────────────────────────────────────────
  const formatTime = (ms) => {
    const totalSec = Math.floor(ms / 1000)
    const min = Math.floor(totalSec / 60)
    const sec = totalSec % 60
    return `${min}:${sec.toString().padStart(2, '0')}`
  }

  // ── UI (unchanged) ──────────────────────────────────────────────────
  return (
    <LinearGradient
      colors={['#2d2d2d', '#1a1a2e']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.card}
    >
      {/* Track info */}
      <View style={styles.topRow}>
        <View>
          <Text style={styles.trackName}>{trackName}</Text>
          <Text style={styles.artist}>{artist}</Text>
        </View>
        <View style={styles.badges}>
          <View style={styles.helmetBadge}>
            <Text style={styles.helmetText}>🎧 Helmet Module</Text>
          </View>
          <Text style={[styles.spotifyText, connected && styles.spotifyConnected]}>
            {connected ? '● SPOTIFY' : 'SPOTIFY'}
          </Text>
        </View>
      </View>

      {/* Progress bar */}
      <View style={styles.progressBg}>
        <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
      </View>
      <View style={styles.timeRow}>
        <Text style={styles.timeText}>{currentTime}</Text>
        <Text style={styles.timeText}>{totalTime}</Text>
      </View>

      {/* Controls */}
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
  spotifyText:      { fontSize: 10, color: '#4ade80', fontWeight: '700' },
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