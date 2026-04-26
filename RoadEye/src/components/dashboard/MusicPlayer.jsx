import { useState, useEffect, useRef } from 'react'
import { View, Text, TouchableOpacity, StyleSheet, Linking, Alert } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import NotificationListener from 'react-native-android-notification-listener'
import * as DocumentPicker from 'expo-document-picker'
import * as FileSystem from 'expo-file-system'
import { Audio } from 'expo-av'
import HelmetUDP from '../../utils/HelmetUDP'

// ── Patch HelmetUDP with audio sender ────────────────────────────────────────
if (!HelmetUDP.sendAudio) {
  HelmetUDP.sendAudio = function(pcmChunk) {
    const frameId = this._nextFrameId()
    const hdr = [
      0x02,
      frameId & 0xFF,
      (frameId >> 8) & 0xFF,
      0,
      1,
      pcmChunk.length,
    ]
    this._enqueue([...hdr, ...pcmChunk])
  }.bind(HelmetUDP)
}

const ESP32_URL  = `http://192.168.137.210/track`
const CHUNK_SIZE = 240

export default function MusicPlayer() {
  const [activeTab, setActiveTab]         = useState('spotify')
  const [trackName, setTrackName]         = useState(null)
  const [artist, setArtist]               = useState(null)
  const [isPlaying, setIsPlaying]         = useState(false)
  const [hasPermission, setHasPermission] = useState(false)

  const [shareFile, setShareFile]         = useState(null)
  const [shareStatus, setShareStatus]     = useState('idle')
  const [shareProgress, setShareProgress] = useState(0)

  const streamingRef = useRef(false)
  const soundRef     = useRef(null)

  useEffect(() => { checkPermission() }, [])

  useEffect(() => {
    if (!hasPermission || !NotificationListener) return
    const sub = NotificationListener.addListener((notification) => {
      if (notification?.app === 'com.spotify.music') {
        const track = notification.title || null
        const art   = notification.text  || null
        setTrackName(track)
        setArtist(art)
        setIsPlaying(true)
        sendTrackToESP32(track, art)
      }
    })
    return () => { try { sub?.remove() } catch(e) {} }
  }, [hasPermission])

  // Cleanup sound on unmount
  useEffect(() => {
    return () => {
      if (soundRef.current) {
        soundRef.current.unloadAsync().catch(() => {})
      }
    }
  }, [])

  const sendTrackToESP32 = async (track, artist) => {
    try {
      await fetch(ESP32_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ track: track ?? '', artist: artist ?? '' }),
      })
    } catch (e) { console.warn('ESP32 send failed:', e.message) }
  }

  const checkPermission = async () => {
    try {
      if (!NotificationListener) return
      const status = await NotificationListener.getPermissionStatus()
      const granted = status === 'authorized'
      setHasPermission(granted)
      if (!granted) {
        Alert.alert('Permission Required',
          'Allow RoadEye to read notifications to show Spotify.',
          [
            { text: 'Allow', onPress: () => NotificationListener.requestPermission() },
            { text: 'Cancel' }
          ]
        )
      }
    } catch (e) { console.log('Permission check error:', e) }
  }

  const openApp = async (url, fallback) => {
    try {
      const canOpen = await Linking.canOpenURL(url)
      await Linking.openURL(canOpen ? url : fallback)
    } catch (e) { await Linking.openURL(fallback) }
  }

  // ── Pick audio → stream via HelmetUDP ────────────────────────────────────
  // Strategy: expo-av loads and plays the file locally while we
  // simultaneously read the raw file bytes and stream them in chunks.
  // For true PCM conversion on-device without FFmpeg, we stream the
  // raw audio bytes directly — the ESP32 firmware handles decoding.
  const pickAndStream = async () => {
    try {
      // Stop any existing stream
      streamingRef.current = false
      if (soundRef.current) {
        await soundRef.current.unloadAsync().catch(() => {})
        soundRef.current = null
      }

      const result = await DocumentPicker.getDocumentAsync({
        type: 'audio/*',
        copyToCacheDirectory: true,
      })
      if (result.canceled) return

      const asset = result.assets[0]
      setShareFile({ name: asset.name })
      setShareProgress(0)

      // Request audio permissions
      const { granted } = await Audio.requestPermissionsAsync()
      if (!granted) {
        Alert.alert('Permission needed', 'Audio permission is required.')
        return
      }

      await Audio.setAudioModeAsync({ allowsRecordingIOS: false, playsInSilentModeIOS: true })

      setShareStatus('converting')

      // Load sound to verify file is valid
      const { sound } = await Audio.Sound.createAsync(
        { uri: asset.uri },
        { shouldPlay: false }
      )
      soundRef.current = sound

      const status = await sound.getStatusAsync()
      if (!status.isLoaded) {
        setShareStatus('error')
        Alert.alert('Error', 'Could not load audio file.')
        return
      }

      // Read raw file bytes and stream them
      const fileInfo = await FileSystem.getInfoAsync(asset.uri)
      if (!fileInfo.exists) {
        setShareStatus('error')
        Alert.alert('Error', 'File not found.')
        return
      }

      streamingRef.current = true
      setShareStatus('streaming')

      await streamFileBytes(asset.uri, fileInfo.size)

      await sound.unloadAsync().catch(() => {})
      soundRef.current = null

    } catch (e) {
      setShareStatus('error')
      Alert.alert('Error', e.message)
    }
  }

  const streamFileBytes = async (fileUri, totalSize) => {
    // Read entire file as base64 then stream in chunks
    const b64 = await FileSystem.readAsStringAsync(fileUri, {
      encoding: FileSystem.EncodingType.Base64,
    })

    const bytes = Uint8Array.from(atob(b64), c => c.charCodeAt(0))
    let offset = 0

    while (offset < bytes.length && streamingRef.current) {
      const slice = Array.from(bytes.slice(offset, offset + CHUNK_SIZE))
      HelmetUDP.sendAudio(slice)
      offset += CHUNK_SIZE
      setShareProgress(offset / bytes.length)
      await new Promise(r => setTimeout(r, 28))
    }

    setShareStatus(streamingRef.current ? 'done' : 'idle')
    setShareProgress(streamingRef.current ? 1 : 0)
  }

  const stopStream = () => {
    streamingRef.current = false
    if (soundRef.current) {
      soundRef.current.unloadAsync().catch(() => {})
      soundRef.current = null
    }
    setShareStatus('idle')
    setShareProgress(0)
  }

  // ── UI helpers ────────────────────────────────────────────────────────────
  const STATUS_COLOR = {
    idle:      '#9ca3af',
    converting:'#f59e0b',
    streaming: '#1DB954',
    done:      '#60a5fa',
    error:     '#ef4444',
  }
  const STATUS_LABEL = {
    idle:      'Pick an audio file to stream',
    converting:'⏳ Loading audio…',
    streaming: '● Streaming to helmet…',
    done:      '✓ Done',
    error:     '✗ Error — try again',
  }

  const apps = {
    spotify: { url: 'spotify://',           fallback: 'https://play.google.com/store/apps/details?id=com.spotify.music', color: '#1DB954', name: 'Spotify' },
    youtube: { url: 'vnd.youtube.music://', fallback: 'https://music.youtube.com',  color: '#FF0000', name: 'YT Music' },
    apple:   { url: 'music://',             fallback: 'https://music.apple.com',    color: '#fc3c44', name: 'Apple Music' },
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
        <View style={[styles.progressFill, { width: isPlaying ? '45%' : '0%', backgroundColor: app.color }]} />
      </View>
      <View style={styles.controls}>
        <TouchableOpacity style={styles.ctrlBtn} onPress={() => openApp(app.url, app.fallback)}>
          <Text style={styles.ctrlIcon}>⏮</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.playBtn, { backgroundColor: app.color }]} onPress={() => openApp(app.url, app.fallback)}>
          <Text style={styles.playIcon}>{isPlaying && activeTab === 'spotify' ? '⏸' : '▶'}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.ctrlBtn} onPress={() => openApp(app.url, app.fallback)}>
          <Text style={styles.ctrlIcon}>⏭</Text>
        </TouchableOpacity>
      </View>
      <TouchableOpacity style={[styles.openBtn, { backgroundColor: app.color }]} onPress={() => openApp(app.url, app.fallback)}>
        <Text style={styles.openBtnText}>Open {app.name} →</Text>
      </TouchableOpacity>
    </View>
  )

  return (
    <LinearGradient
      colors={['#2d2d2d', '#1a1a2e']}
      start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
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

      <View style={styles.divider} />

      <View style={styles.shareSection}>
        <Text style={styles.shareTitle}>📡  Share to Helmet</Text>

        {shareFile && (
          <Text style={styles.shareFileName} numberOfLines={1}>
            {shareFile.name}
          </Text>
        )}

        <Text style={[styles.shareStatusText, { color: STATUS_COLOR[shareStatus] }]}>
          {STATUS_LABEL[shareStatus]}
        </Text>

        {(shareStatus === 'converting' || shareStatus === 'streaming') && (
          <View style={styles.sharePbBg}>
            <View style={[
              styles.sharePbFill,
              {
                width: shareStatus === 'converting'
                  ? '100%'
                  : `${(shareProgress * 100).toFixed(0)}%`,
                backgroundColor: shareStatus === 'converting' ? '#f59e0b' : '#1DB954',
                opacity: shareStatus === 'converting' ? 0.6 : 1,
              }
            ]} />
          </View>
        )}

        <View style={styles.shareButtons}>
          <TouchableOpacity
            style={[
              styles.sharePickBtn,
              (shareStatus === 'converting' || shareStatus === 'streaming') && styles.sharePickBtnDisabled,
            ]}
            onPress={pickAndStream}
            disabled={shareStatus === 'converting' || shareStatus === 'streaming'}
          >
            <Text style={styles.sharePickText}>
              {shareStatus === 'converting' ? '⏳ Loading…'
               : shareStatus === 'streaming' ? '● Streaming…'
               : '📂  Pick Audio & Stream'}
            </Text>
          </TouchableOpacity>

          {shareStatus === 'streaming' && (
            <TouchableOpacity style={styles.shareStopBtn} onPress={stopStream}>
              <Text style={styles.shareStopText}>⏹</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </LinearGradient>
  )
}

const styles = StyleSheet.create({
  card:                 { borderRadius: 16, padding: 16, marginBottom: 10, elevation: 6 },
  header:               { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  title:                { fontSize: 16, fontWeight: '800', color: '#fff' },
  helmetBadge:          { backgroundColor: '#4F46E5', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 },
  helmetText:           { fontSize: 10, fontWeight: '700', color: '#fff' },
  tabBar:               { flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 10, padding: 3, marginBottom: 16 },
  tab:                  { flex: 1, paddingVertical: 7, alignItems: 'center', borderRadius: 8 },
  tabActive:            { backgroundColor: 'rgba(255,255,255,0.2)' },
  tabText:              { fontSize: 11, color: '#9ca3af', fontWeight: '600' },
  tabTextActive:        { color: '#fff' },
  nowPlaying:           { alignItems: 'center' },
  albumArt:             { width: 80, height: 80, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  albumIcon:            { fontSize: 32 },
  trackInfo:            { alignItems: 'center', marginBottom: 12, width: '100%' },
  trackName:            { fontSize: 16, fontWeight: '800', color: '#fff', marginBottom: 4 },
  artistName:           { fontSize: 12, color: '#9ca3af' },
  progressBg:           { width: '100%', backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 99, height: 3, marginBottom: 16 },
  progressFill:         { height: '100%', borderRadius: 99 },
  controls:             { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 24, marginBottom: 16 },
  ctrlBtn:              { backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 18, width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  ctrlIcon:             { fontSize: 14, color: '#fff' },
  playBtn:              { borderRadius: 22, width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  playIcon:             { fontSize: 16, color: '#fff' },
  openBtn:              { paddingHorizontal: 24, paddingVertical: 10, borderRadius: 25, marginTop: 4 },
  openBtnText:          { color: '#fff', fontWeight: '700', fontSize: 13 },
  divider:              { height: 1, backgroundColor: 'rgba(255,255,255,0.1)', marginVertical: 16 },
  shareSection:         { gap: 8 },
  shareTitle:           { fontSize: 13, fontWeight: '700', color: '#fff' },
  shareFileName:        { fontSize: 11, color: '#d1d5db', backgroundColor: 'rgba(255,255,255,0.07)', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4 },
  shareStatusText:      { fontSize: 11 },
  sharePbBg:            { width: '100%', height: 3, backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 99 },
  sharePbFill:          { height: '100%', borderRadius: 99 },
  shareButtons:         { flexDirection: 'row', gap: 10, marginTop: 4 },
  sharePickBtn:         { flex: 1, backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: 10, paddingVertical: 10, alignItems: 'center' },
  sharePickBtnDisabled: { opacity: 0.5 },
  sharePickText:        { color: '#fff', fontWeight: '600', fontSize: 12 },
  shareStopBtn:         { backgroundColor: 'rgba(239,68,68,0.2)', borderRadius: 10, paddingHorizontal: 16, alignItems: 'center', justifyContent: 'center' },
  shareStopText:        { color: '#ef4444', fontSize: 16 },
})