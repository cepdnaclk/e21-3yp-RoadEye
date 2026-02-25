import { useState } from 'react'
import {
  View, Text, Modal, TouchableOpacity, StyleSheet,
  ActivityIndicator, Animated,
} from 'react-native'
import * as Location from 'expo-location'

const STEPS = ['location', 'bluetooth']

const CONFIG = {
  location: {
    icon:        '📍',
    iconBg:      '#ECFDF5',
    title:       'Allow Location Access',
    description: 'RoadEye needs your location to show weather conditions, traffic alerts, and your ride route on the map.',
    allowLabel:  'Allow Location',
    allowColor:  '#059669',
    deniedMsg:   'Location was denied. Some features like weather and map tracking will be limited.',
  },
  bluetooth: {
    icon:        '🔵',
    iconBg:      '#EFF6FF',
    title:       'Allow Bluetooth Access',
    description: 'RoadEye needs Bluetooth to connect to your smart helmet for live data, alerts, and music control.',
    allowLabel:  'Allow Bluetooth',
    allowColor:  '#2563EB',
    deniedMsg:   "Bluetooth was denied. You won't be able to connect to your helmet.",
  },
}

export default function PermissionModal({ visible, onComplete }) {
  const [step,    setStep]    = useState(0)
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState({})
  const [denied,  setDenied]  = useState(false)

  const current = STEPS[step]
  const cfg     = CONFIG[current]

  const requestLocation = async () => {
    const { status } = await Location.requestForegroundPermissionsAsync()
    return status === 'granted'
  }

  const requestBluetooth = async () => {
    await new Promise(r => setTimeout(r, 1200))
    return true
  }

  const handleAllow = async () => {
    setLoading(true)
    setDenied(false)
    let granted = false
    if (current === 'location') granted = await requestLocation()
    else                        granted = await requestBluetooth()
    setLoading(false)
    const updated = { ...results, [current]: granted }
    setResults(updated)
    if (!granted) { setDenied(true); return }
    advance(updated)
  }

  const handleSkip = () => {
    const updated = { ...results, [current]: false }
    setResults(updated)
    advance(updated)
  }

  const advance = (updated) => {
    if (step < STEPS.length - 1) { setStep(step + 1); setDenied(false) }
    else onComplete(updated)
  }

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          {/* Handle */}
          <View style={styles.handle} />

          {/* Step dots */}
          <View style={styles.dots}>
            {STEPS.map((s, i) => (
              <View key={s} style={[
                styles.dot,
                { width: i === step ? 20 : 8,
                  backgroundColor: i === step ? '#4F46E5' : i < step ? '#4ADE80' : '#E5E7EB' }
              ]} />
            ))}
          </View>

          {/* Icon */}
          <View style={[styles.iconBox, { backgroundColor: cfg.iconBg }]}>
            {loading
              ? <ActivityIndicator color={cfg.allowColor} size="large" />
              : <Text style={styles.iconText}>{cfg.icon}</Text>}
          </View>

          <Text style={styles.title}>{cfg.title}</Text>
          <Text style={styles.desc}>{cfg.description}</Text>

          {denied && (
            <View style={styles.deniedBox}>
              <Text style={styles.deniedText}>⚠️  {cfg.deniedMsg}</Text>
            </View>
          )}

          <TouchableOpacity
            onPress={handleAllow}
            disabled={loading}
            style={[styles.allowBtn, { backgroundColor: loading ? '#E5E7EB' : cfg.allowColor }]}
          >
            <Text style={[styles.allowBtnText, { color: loading ? '#9CA3AF' : '#fff' }]}>
              {loading ? 'Requesting...' : cfg.allowLabel}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={handleSkip} disabled={loading} style={styles.skipBtn}>
            <Text style={styles.skipBtnText}>Skip for now</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  backdrop:     { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end', alignItems: 'center' },
  sheet:        { width: '100%', maxWidth: 420, backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 28, paddingBottom: 44 },
  handle:       { width: 40, height: 4, backgroundColor: '#E5E7EB', borderRadius: 99, alignSelf: 'center', marginBottom: 28 },
  dots:         { flexDirection: 'row', justifyContent: 'center', gap: 6, marginBottom: 28 },
  dot:          { height: 8, borderRadius: 99 },
  iconBox:      { width: 72, height: 72, borderRadius: 20, alignSelf: 'center', alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
  iconText:     { fontSize: 36 },
  title:        { textAlign: 'center', fontSize: 22, fontWeight: '800', color: '#1a1a2e', marginBottom: 12 },
  desc:         { textAlign: 'center', fontSize: 14, color: '#6B7280', lineHeight: 22, marginBottom: 24 },
  deniedBox:    { backgroundColor: '#FEF3C7', borderWidth: 1, borderColor: '#FCD34D', borderRadius: 12, padding: 12, marginBottom: 16 },
  deniedText:   { fontSize: 13, color: '#92400E', fontWeight: '600' },
  allowBtn:     { borderRadius: 14, padding: 15, alignItems: 'center', marginBottom: 12 },
  allowBtnText: { fontSize: 16, fontWeight: '800' },
  skipBtn:      { borderWidth: 1.5, borderColor: '#E5E7EB', borderRadius: 14, padding: 14, alignItems: 'center' },
  skipBtnText:  { fontSize: 15, fontWeight: '700', color: '#6B7280' },
})
