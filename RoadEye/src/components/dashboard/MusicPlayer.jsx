import { useState, useEffect } from 'react'
import { View, Text, TouchableOpacity, StyleSheet, Linking, Alert, AppState } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import * as NL from 'react-native-android-notification-listener'
console.log('NL exports:', JSON.stringify(Object.keys(NL)))

import NotificationListener from 'react-native-android-notification-listener'
export default function MusicPlayer() {
  const [activeTab, setActiveTab]   = useState('spotify')
  const [trackName, setTrackName]   = useState(null)
  const [artist,    setArtist]      = useState(null)
  const [isPlaying, setIsPlaying]   = useState(false)
  const [hasPermission, setHasPermission] = useState(false)

  useEffect(() => {
    checkPermission()
  }, [])

  useEffect(() => {
  if (!hasPermission || !NotificationListener) return

  const sub = NotificationListener.addListener((notification) => {
    if (notification?.app === 'com.spotify.music') {
      setTrackName(notification.title || null)
      setArtist(notification.text || null)
      setIsPlaying(true)
    }
  })

  return () => { try { sub?.remove() } catch(e) {} }
}, [hasPermission])

const checkPermission = async () => {
  try {
    if (!NotificationListener) {
      console.log('NotificationListener not available')
      return
    }
    const status = await NotificationListener.getPermissionStatus()
    const granted = status === 'authorized'
    setHasPermission(granted)
    if (!granted) {
      Alert.alert(
        'Permission Required',
        'Allow RoadEye to read notifications to show Spotify.',
        [
          { text: 'Allow', onPress: () => NotificationListener.requestPermission() },
          { text: 'Cancel' }
        ]
      )
    }
  } catch (e) {
    console.log('Permission check error:', e)
  }
}

  const openApp = async (url, fallback) => {
    try {
      const canOpen = await Linking.canOpenURL(url)
      await Linking.openURL(canOpen ? url : fallback)
    } catch (e) {
      await Linking.openURL(fallback)
    }
  }

  const apps = {
    spotify: { url: 'spotify://', fallback: 'https://play.google.com/store/apps/details?id=com.spotify.music', color: '#1DB954', name: 'Spotify' },
    youtube: { url: 'vnd.youtube.music://', fallback: 'https://music.youtube.com', color: '#FF0000', name: 'YT Music' },
    apple:   { url: 'music://', fallback: 'https://music.apple.com', color: '#fc3c44', name: 'Apple Music' },
  }

  const NowPlayingCard = ({ app }) => (
    <View style={styles.nowPlaying}>
      <LinearGradient colors={[app.color, '#191414']} style={styles.albumArt}>
        <Text style={styles.albumIcon}>🎵</Text>
      </LinearGradient>

      <View style={styles.trackInfo}>
        <Text style={styles.trackName} numberOfLines={1}>
          {activeTab === 'spotify' && trackName ? trackName : `Open ${app.name}`}
        </Text>
        <Text style={styles.artistName} numberOfLines={1}>
          {activeTab === 'spotify' && artist ? artist : 'Tap to launch'}
        </Text>
      </View>

      <View style={styles.progressBg}>
        <View style={[styles.progressFill, { width: isPlaying ? '45%' : '0%' }]} />
      </View>

      <View style={styles.controls}>
        <TouchableOpacity style={styles.ctrlBtn} onPress={() => openApp(app.url, app.fallback)}>
          <Text style={styles.ctrlIcon}>⏮</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.playBtn, { backgroundColor: app.color }]}
          onPress={() => openApp(app.url, app.fallback)}
        >
          <Text style={styles.playIcon}>{isPlaying && activeTab === 'spotify' ? '⏸' : '▶'}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.ctrlBtn} onPress={() => openApp(app.url, app.fallback)}>
          <Text style={styles.ctrlIcon}>⏭</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity
        style={[styles.openBtn, { backgroundColor: app.color }]}
        onPress={() => openApp(app.url, app.fallback)}
      >
        <Text style={styles.openBtnText}>Open {app.name} →</Text>
      </TouchableOpacity>
    </View>
  )

  return (
    <LinearGradient
      colors={['#2d2d2d', '#1a1a2e']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.card}
    >
      <View style={styles.header}>
        <Text style={styles.title}>🎧 Music Player</Text>
        <View style={styles.helmetBadge}>
          <Text style={styles.helmetText}>Helmet Module</Text>
        </View>
      </View>

      <View style={styles.tabBar}>
        {['spotify', 'youtube', 'apple'].map(tab => (
          <TouchableOpacity
            key={tab}
            style={[styles.tab, activeTab === tab && styles.tabActive]}
            onPress={() => setActiveTab(tab)}
          >
            <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
              {apps[tab].name}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <NowPlayingCard app={apps[activeTab]} />
    </LinearGradient>
  )
}

const styles = StyleSheet.create({
  card:          { borderRadius: 16, padding: 16, marginBottom: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 12, elevation: 6 },
  header:        { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  title:         { fontSize: 16, fontWeight: '800', color: '#fff' },
  helmetBadge:   { backgroundColor: '#4F46E5', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 },
  helmetText:    { fontSize: 10, fontWeight: '700', color: '#fff' },
  tabBar:        { flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 10, padding: 3, marginBottom: 16 },
  tab:           { flex: 1, paddingVertical: 7, alignItems: 'center', borderRadius: 8 },
  tabActive:     { backgroundColor: 'rgba(255,255,255,0.2)' },
  tabText:       { fontSize: 11, color: '#9ca3af', fontWeight: '600' },
  tabTextActive: { color: '#fff' },
  nowPlaying:    { alignItems: 'center' },
  albumArt:      { width: 80, height: 80, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  albumIcon:     { fontSize: 32 },
  trackInfo:     { alignItems: 'center', marginBottom: 12, width: '100%' },
  trackName:     { fontSize: 16, fontWeight: '800', color: '#fff', marginBottom: 4 },
  artistName:    { fontSize: 12, color: '#9ca3af' },
  progressBg:    { width: '100%', backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 99, height: 3, marginBottom: 16 },
  progressFill:  { height: '100%', backgroundColor: '#fff', borderRadius: 99 },
  controls:      { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 24, marginBottom: 16 },
  ctrlBtn:       { backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 18, width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  ctrlIcon:      { fontSize: 14, color: '#fff' },
  playBtn:       { borderRadius: 22, width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  playIcon:      { fontSize: 16, color: '#fff' },
  openBtn:       { paddingHorizontal: 24, paddingVertical: 10, borderRadius: 25, marginTop: 4 },
  openBtnText:   { color: '#fff', fontWeight: '700', fontSize: 13 },
})