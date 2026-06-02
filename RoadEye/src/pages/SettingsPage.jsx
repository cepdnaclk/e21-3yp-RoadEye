import React, { useState } from 'react'
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  LayoutAnimation,
  Platform,
  UIManager,
  ScrollView,
  Switch,
} from 'react-native'
import Slider from '@react-native-community/slider'
import { useAuth } from '../hooks/useAuth'
import { useAppSettings } from '../hooks/useAppSettings'

if (Platform.OS === 'android') {
  UIManager.setLayoutAnimationEnabledExperimental?.(true)
}

export default function SettingsPage() {
  const { user } = useAuth()
  const [open, setOpen] = useState(null)

  const [darkMode, setDarkMode] = useState(false)
  const [textScale, setTextScale] = useState(1)
  const [voiceOpen, setVoiceOpen] = useState(false)
  const [voiceMode, setVoiceMode] = useState('Full navigation voice')

  const username = user?.username || 'User'
  const initial = (username?.[0] || 'U').toUpperCase()

  const today = new Date()
  const dateText = today.toLocaleDateString('en-US', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
  }).toUpperCase()

  const toggle = (section) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut)
    setOpen(open === section ? null : section)
  }

  return (
    <View style={[styles.screen, darkMode && styles.screenDark]}>
      <View style={[styles.topHeader, darkMode && styles.cardDark]}>
        <View>
          <Text style={[styles.greeting, darkMode && styles.textWhite]}>Hi {username},</Text>
          <Text style={styles.date}>{dateText}</Text>
        </View>

        <View style={styles.icons}>
          <TouchableOpacity style={styles.iconBtn}>
            <Text style={styles.iconText}>🔔</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.avatar}>
            <Text style={styles.avatarText}>{initial}</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
        <Text style={[styles.title, darkMode && styles.textWhite]}>Settings</Text>

        <SimpleCard title="Helmet Settings" open={open === 'helmet'} onPress={() => toggle('helmet')} items={['Auto connect helmet', 'HUD brightness', 'Navigation HUD', 'Music controls']} darkMode={darkMode} />

        <View style={[styles.card, darkMode && styles.cardDark]}>
          <TouchableOpacity style={styles.header} onPress={() => toggle('access')} activeOpacity={0.8}>
            <Text style={[styles.headerText, darkMode && styles.textWhite]}>Accessibility</Text>
            <Text style={styles.arrow}>{open === 'access' ? '⌃' : '⌄'}</Text>
          </TouchableOpacity>

          {open === 'access' && (
            <View style={styles.content}>
              <View style={styles.settingRow}>
                <Text style={[styles.itemText, darkMode && styles.textWhite]}>Dark mode</Text>
                <Switch value={darkMode} onValueChange={setDarkMode} />
              </View>

              <View style={styles.sliderBox}>
                <Text style={[styles.itemText, darkMode && styles.textWhite]}>
                  Text scaling: {textScale.toFixed(1)}x
                </Text>
                <Slider
                  minimumValue={0.8}
                  maximumValue={1.5}
                  step={0.1}
                  value={textScale}
                  onValueChange={setTextScale}
                />
                <Text style={[styles.previewText, { fontSize: 16 * textScale }, darkMode && styles.textWhite]}>
                  Preview navigation text
                </Text>
              </View>

              <TouchableOpacity
                style={styles.voiceHeader}
                onPress={() => setVoiceOpen(!voiceOpen)}
              >
                <Text style={[styles.itemText, darkMode && styles.textWhite]}>Voice guidance</Text>
                <Text style={styles.voiceValue}>{voiceMode}  {voiceOpen ? '⌃' : '⌄'}</Text>
              </TouchableOpacity>

              {voiceOpen && (
                <View style={styles.voiceOptions}>
                  {['Off', 'Important turns only', 'Full navigation voice'].map(option => (
                    <TouchableOpacity
                      key={option}
                      style={styles.voiceOption}
                      onPress={() => {
                        setVoiceMode(option)
                        setVoiceOpen(false)
                      }}
                    >
                      <Text style={[styles.voiceOptionText, darkMode && styles.textWhite]}>
                        {option === voiceMode ? '✓ ' : ''}{option}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>
          )}
        </View>

        <SimpleCard title="Notifications Settings" open={open === 'notify'} onPress={() => toggle('notify')} items={['Speed alerts', 'Weather alerts', 'Crash notifications']} darkMode={darkMode} />
        <SimpleCard title="Connectivity Settings" open={open === 'connect'} onPress={() => toggle('connect')} items={['Hotspot auto connect', 'ESP32 connection', 'Bluetooth audio']} darkMode={darkMode} />
        <SimpleCard title="About" open={open === 'about'} onPress={() => toggle('about')} items={['RoadEye v1.0', 'Smart Riding Assistant', 'Final Year Project']} darkMode={darkMode} />
      </ScrollView>
    </View>
  )
}

function SimpleCard({ title, open, onPress, items, darkMode }) {
  return (
    <View style={[styles.card, darkMode && styles.cardDark]}>
      <TouchableOpacity style={styles.header} onPress={onPress} activeOpacity={0.8}>
        <Text style={[styles.headerText, darkMode && styles.textWhite]}>{title}</Text>
        <Text style={styles.arrow}>{open ? '⌃' : '⌄'}</Text>
      </TouchableOpacity>

      {open && (
        <View style={styles.content}>
          {items.map((item) => (
            <Text key={item} style={[styles.item, darkMode && styles.textWhite]}>• {item}</Text>
          ))}
        </View>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#f5f5f5' },
  screenDark: { backgroundColor: '#111827' },
  topHeader: {
    backgroundColor: '#fff',
    paddingTop: 48,
    paddingHorizontal: 20,
    paddingBottom: 22,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  greeting: { fontSize: 22, fontWeight: '800', color: '#111827' },
  date: { fontSize: 11, color: '#6b7280', fontWeight: '500', letterSpacing: 1, marginTop: 2 },
  icons: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  iconBtn: { padding: 2 },
  iconText: { fontSize: 18 },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#f97316',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { color: '#fff', fontWeight: '800', fontSize: 14 },
  container: { flex: 1, paddingHorizontal: 14 },
  scrollContent: { paddingTop: 34, paddingBottom: 30 },
  title: { fontSize: 25, fontWeight: '800', marginBottom: 26, color: '#111827' },
  card: {
    backgroundColor: '#fff',
    borderRadius: 18,
    marginBottom: 22,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
  },
  cardDark: { backgroundColor: '#1f2937' },
  header: {
    height: 74,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 22,
  },
  headerText: { fontSize: 18, fontWeight: '700', color: '#1f2937' },
  arrow: { fontSize: 18, color: '#6b7280' },
  content: { paddingHorizontal: 24, paddingBottom: 22 },
  item: { fontSize: 16, color: '#4b5563', marginBottom: 12 },
  itemText: { fontSize: 16, color: '#4b5563', fontWeight: '500' },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 18,
  },
  sliderBox: { marginBottom: 20 },
  previewText: { marginTop: 8, color: '#4b5563' },
  voiceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  voiceValue: {
    fontSize: 13,
    color: '#6b7280',
  },
  voiceOptions: {
    marginTop: 12,
    backgroundColor: 'rgba(0,0,0,0.04)',
    borderRadius: 12,
    padding: 10,
  },
  voiceOption: {
    paddingVertical: 8,
  },
  voiceOptionText: {
    fontSize: 15,
    color: '#374151',
  },
  textWhite: {
    color: '#fff',
  },
})