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

  const {
    darkMode,
    textScale,
    voiceGuidance,
    setDarkMode,
    setTextScale,
    setVoiceGuidance,
    resetTextScale,
  } = useAppSettings()

  const [open, setOpen] = useState(null)
  const [voiceOpen, setVoiceOpen] = useState(false)

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

    if (section !== 'access') {
      setVoiceOpen(false)
    }
  }

  return (
    <View style={[styles.screen, darkMode && styles.screenDark]}>
      <View style={[styles.topHeader, darkMode && styles.cardDark]}>
        <View>
          <Text style={[styles.greeting, { fontSize: 22 * textScale }, darkMode && styles.textWhite]}>
            Hi {username},
          </Text>
          <Text style={[styles.date, { fontSize: 11 * textScale }]}>
            {dateText}
          </Text>
        </View>

        <View style={styles.icons}>
          <TouchableOpacity style={styles.iconBtn}>
            <Text style={[styles.iconText, { fontSize: 18 * textScale }]}>🔔</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.avatar}>
            <Text style={[styles.avatarText, { fontSize: 14 * textScale }]}>
              {initial}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Text style={[styles.title, { fontSize: 25 * textScale }, darkMode && styles.textWhite]}>
          Settings
        </Text>

        <SimpleCard
          title="Helmet Settings"
          open={open === 'helmet'}
          onPress={() => toggle('helmet')}
          items={['Auto connect helmet', 'HUD brightness', 'Navigation HUD', 'Music controls']}
          darkMode={darkMode}
          textScale={textScale}
        />

        <View style={[styles.card, darkMode && styles.cardDark]}>
          <TouchableOpacity
            style={styles.header}
            onPress={() => toggle('access')}
            activeOpacity={0.8}
          >
            <Text style={[styles.headerText, { fontSize: 18 * textScale }, darkMode && styles.textWhite]}>
              Accessibility
            </Text>
            <Text style={[styles.arrow, { fontSize: 18 * textScale }]}>
              {open === 'access' ? '⌃' : '⌄'}
            </Text>
          </TouchableOpacity>

          {open === 'access' && (
            <View style={styles.content}>
              <View style={styles.settingRow}>
                <Text style={[styles.itemText, { fontSize: 16 * textScale }, darkMode && styles.textWhite]}>
                  Dark mode
                </Text>
                <Switch value={darkMode} onValueChange={setDarkMode} />
              </View>

              <View style={styles.sliderBox}>
                <Text style={[styles.itemText, { fontSize: 16 * textScale }, darkMode && styles.textWhite]}>
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

                <TouchableOpacity
                  style={[styles.resetBtn, darkMode && styles.resetBtnDark]}
                  onPress={resetTextScale}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.resetBtnText, darkMode && styles.textWhite]}>
                    Reset to default
                  </Text>
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                style={styles.voiceHeader}
                onPress={() => setVoiceOpen(!voiceOpen)}
              >
                <Text style={[styles.itemText, { fontSize: 16 * textScale }, darkMode && styles.textWhite]}>
                  Voice guidance
                </Text>
                <Text style={[styles.voiceValue, { fontSize: 13 * textScale }]}>
                  {voiceGuidance} {voiceOpen ? '⌃' : '⌄'}
                </Text>
              </TouchableOpacity>

              {voiceOpen && (
                <View style={[styles.voiceOptions, darkMode && styles.voiceOptionsDark]}>
                  {['Off', 'Important turns only', 'Full navigation voice'].map(option => (
                    <TouchableOpacity
                      key={option}
                      style={styles.voiceOption}
                      onPress={() => {
                        setVoiceGuidance(option)
                        setVoiceOpen(false)
                      }}
                    >
                      <Text style={[styles.voiceOptionText, { fontSize: 15 * textScale }, darkMode && styles.textWhite]}>
                        {option === voiceGuidance ? '✓ ' : ''}{option}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>
          )}
        </View>

        <SimpleCard
          title="Notifications Settings"
          open={open === 'notify'}
          onPress={() => toggle('notify')}
          items={['Speed alerts', 'Weather alerts', 'Crash notifications']}
          darkMode={darkMode}
          textScale={textScale}
        />

        <SimpleCard
          title="Connectivity Settings"
          open={open === 'connect'}
          onPress={() => toggle('connect')}
          items={['Hotspot auto connect', 'ESP32 connection', 'Bluetooth audio']}
          darkMode={darkMode}
          textScale={textScale}
        />

        <SimpleCard
          title="About"
          open={open === 'about'}
          onPress={() => toggle('about')}
          items={['RoadEye v1.0', 'Smart Riding Assistant', 'Final Year Project']}
          darkMode={darkMode}
          textScale={textScale}
        />
      </ScrollView>
    </View>
  )
}

function SimpleCard({ title, open, onPress, items, darkMode, textScale }) {
  return (
    <View style={[styles.card, darkMode && styles.cardDark]}>
      <TouchableOpacity style={styles.header} onPress={onPress} activeOpacity={0.8}>
        <Text style={[styles.headerText, { fontSize: 18 * textScale }, darkMode && styles.textWhite]}>
          {title}
        </Text>
        <Text style={[styles.arrow, { fontSize: 18 * textScale }]}>
          {open ? '⌃' : '⌄'}
        </Text>
      </TouchableOpacity>

      {open && (
        <View style={styles.content}>
          {items.map((item) => (
            <Text key={item} style={[styles.item, { fontSize: 16 * textScale }, darkMode && styles.textWhite]}>
              • {item}
            </Text>
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
  greeting: { fontWeight: '800', color: '#111827' },
  date: { color: '#6b7280', fontWeight: '500', letterSpacing: 1, marginTop: 2 },
  icons: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  iconBtn: { padding: 2 },
  iconText: {},
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#f97316',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { color: '#fff', fontWeight: '800' },
  container: { flex: 1, paddingHorizontal: 14 },
  scrollContent: { paddingTop: 34, paddingBottom: 30 },
  title: { fontWeight: '800', marginBottom: 26, color: '#111827' },
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
  headerText: { fontWeight: '700', color: '#1f2937' },
  arrow: { color: '#6b7280' },
  content: { paddingHorizontal: 24, paddingBottom: 22 },
  item: { color: '#4b5563', marginBottom: 12 },
  itemText: { color: '#4b5563', fontWeight: '500' },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 18,
  },
  sliderBox: { marginBottom: 20 },
  previewText: { marginTop: 8, color: '#4b5563' },
  resetBtn: {
    alignSelf: 'flex-start',
    backgroundColor: '#e5e7eb',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    marginTop: 10,
  },
  resetBtnDark: {
    backgroundColor: '#374151',
  },
  resetBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
  },
  voiceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  voiceValue: { color: '#6b7280', maxWidth: 180, textAlign: 'right' },
  voiceOptions: {
    marginTop: 12,
    backgroundColor: 'rgba(0,0,0,0.04)',
    borderRadius: 12,
    padding: 10,
  },
  voiceOptionsDark: {
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  voiceOption: { paddingVertical: 8 },
  voiceOptionText: { color: '#374151' },
  textWhite: { color: '#fff' },
})