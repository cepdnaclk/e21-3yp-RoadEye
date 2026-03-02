import { useState } from 'react'
import { View, Text, TouchableOpacity, StyleSheet, Linking, Alert } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'

export default function MusicPlayer() {
  const [activeTab, setActiveTab] = useState('spotify')

  const openSpotify = async () => {
    try {
      const canOpen = await Linking.canOpenURL('spotify://')
      if (canOpen) {
        await Linking.openURL('spotify://')
      } else {
        Alert.alert(
          'Spotify Not Installed',
          'Please install Spotify to use this feature.',
          [
            { text: 'Install', onPress: () => Linking.openURL('https://play.google.com/store/apps/details?id=com.spotify.music') },
            { text: 'Cancel' }
          ]
        )
      }
    } catch (e) {
      await Linking.openURL('https://open.spotify.com')
    }
  }

  const openYouTubeMusic = async () => {
    try {
      await Linking.openURL('https://music.youtube.com')
    } catch (e) {}
  }

  const openAppleMusic = async () => {
    try {
      await Linking.openURL('https://music.apple.com')
    } catch (e) {}
  }

  return (
    <LinearGradient
      colors={['#2d2d2d', '#1a1a2e']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.card}
    >
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>🎧 Music Player</Text>
        <View style={styles.helmetBadge}>
          <Text style={styles.helmetText}>Helmet Module</Text>
        </View>
      </View>

      {/* Tab bar */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'spotify' && styles.tabActive]}
          onPress={() => setActiveTab('spotify')}
        >
          <Text style={[styles.tabText, activeTab === 'spotify' && styles.tabTextActive]}>Spotify</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'youtube' && styles.tabActive]}
          onPress={() => setActiveTab('youtube')}
        >
          <Text style={[styles.tabText, activeTab === 'youtube' && styles.tabTextActive]}>YouTube Music</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'apple' && styles.tabActive]}
          onPress={() => setActiveTab('apple')}
        >
          <Text style={[styles.tabText, activeTab === 'apple' && styles.tabTextActive]}>Apple Music</Text>
        </TouchableOpacity>
      </View>

      {/* Content */}
      {activeTab === 'spotify' && (
        <View style={styles.content}>
          <Text style={styles.serviceIcon}>🟢</Text>
          <Text style={styles.serviceName}>Spotify</Text>
          <Text style={styles.serviceDesc}>Stream millions of songs and podcasts</Text>
          <TouchableOpacity style={[styles.openBtn, styles.spotifyBtn]} onPress={openSpotify}>
            <Text style={styles.openBtnText}>Open Spotify</Text>
          </TouchableOpacity>
        </View>
      )}

      {activeTab === 'youtube' && (
        <View style={styles.content}>
          <Text style={styles.serviceIcon}>🔴</Text>
          <Text style={styles.serviceName}>YouTube Music</Text>
          <Text style={styles.serviceDesc}>Music and videos from YouTube</Text>
          <TouchableOpacity style={[styles.openBtn, styles.youtubeBtn]} onPress={openYouTubeMusic}>
            <Text style={styles.openBtnText}>Open YouTube Music</Text>
          </TouchableOpacity>
        </View>
      )}

      {activeTab === 'apple' && (
        <View style={styles.content}>
          <Text style={styles.serviceIcon}>🎵</Text>
          <Text style={styles.serviceName}>Apple Music</Text>
          <Text style={styles.serviceDesc}>Your entire music library, ad-free</Text>
          <TouchableOpacity style={[styles.openBtn, styles.appleBtn]} onPress={openAppleMusic}>
            <Text style={styles.openBtnText}>Open Apple Music</Text>
          </TouchableOpacity>
        </View>
      )}
    </LinearGradient>
  )
}

const styles = StyleSheet.create({
  card:            { borderRadius: 16, padding: 16, marginBottom: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 12, elevation: 6 },
  header:          { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  title:           { fontSize: 16, fontWeight: '800', color: '#fff' },
  helmetBadge:     { backgroundColor: '#4F46E5', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 },
  helmetText:      { fontSize: 10, fontWeight: '700', color: '#fff' },
  tabBar:          { flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 10, padding: 3, marginBottom: 16 },
  tab:             { flex: 1, paddingVertical: 7, alignItems: 'center', borderRadius: 8 },
  tabActive:       { backgroundColor: 'rgba(255,255,255,0.2)' },
  tabText:         { fontSize: 11, color: '#9ca3af', fontWeight: '600' },
  tabTextActive:   { color: '#fff' },
  content:         { alignItems: 'center', paddingVertical: 12 },
  serviceIcon:     { fontSize: 36, marginBottom: 8 },
  serviceName:     { fontSize: 18, fontWeight: '800', color: '#fff', marginBottom: 6 },
  serviceDesc:     { fontSize: 12, color: '#9ca3af', marginBottom: 16, textAlign: 'center' },
  openBtn:         { paddingHorizontal: 32, paddingVertical: 12, borderRadius: 25 },
  spotifyBtn:      { backgroundColor: '#1DB954' },
  youtubeBtn:      { backgroundColor: '#FF0000' },
  appleBtn:        { backgroundColor: '#fc3c44' },
  openBtnText:     { color: '#fff', fontWeight: '700', fontSize: 14 },
})