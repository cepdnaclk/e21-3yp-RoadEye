import { useState, useCallback, useEffect, useRef } from 'react'
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert } from 'react-native'
import { useNavigation } from '@react-navigation/native'
import { useAuth } from '../hooks/useAuth'
import { useAppSettings } from '../hooks/useAppSettings'
import { colors } from '../utils/theme'
import Svg, { Path } from 'react-native-svg'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useNavSession, stopNavSession } from '../utils/NavigationSession'

import { sendSpeedEvent, getLatestSpeed, getMaxSpeed } from '../api/speedApi'
import { sendTiltEvent } from '../api/tiltApi'

import DashboardHeader from '../components/dashboard/DashboardHeader'
import WeatherCard from '../components/dashboard/WeatherCard'
import MusicPlayer from '../components/dashboard/MusicPlayer'
import StatsChart from '../components/dashboard/StatsChart'
import BottomNav from '../components/dashboard/BottomNav'

const C = colors

export default function DashboardPage() {
  const insets = useSafeAreaInsets()
  const { logout } = useAuth()
  const { darkMode, textScale } = useAppSettings()

  const navigation = useNavigation()
  const [activeTab, setActiveTab] = useState('overview')

  const lastSentRef     = useRef(0)
  const lastTiltSentRef = useRef(0)

  // ── Replace properly later ────────────────────────────────────────────────
  const userId = "1f84393a-7f45-46c8-9261-cb313fc1dce9"
  const token  = "eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJoaXJ1YWRpa2FyaTI4QGdtYWlsLmNvbSIsImlhdCI6MTc3NzI2Mzk0NCwiZXhwIjoxNzc3MzUwMzQ0fQ.XdkilkLkpkIW6EJR3LiP3YDd-snarypxmMhBkxRB-vg"

  // ── State ─────────────────────────────────────────────────────────────────
  const [helmetData,       setHelmetData]       = useState(null)
  const [helmetConnected,  setHelmetConnected]  = useState(false)
  const [confirmedSpeed,   setConfirmedSpeed]   = useState(0)   // ← last speed saved to DB
  const [maxSpeed, setMaxSpeed] = useState(0) // ← max speed from DB

  const handleHelmetData = useCallback((data) => {
    if (data) setHelmetData(data)
  }, [])

  const handleConnectionChange = useCallback((state) => {
    setHelmetConnected(state === 'connected')
  }, [])

  const navSession = useNavSession()

  // ── On mount: load last confirmed speed from backend ─────────────────────
  useEffect(() => {
    const fetchLastSpeed = async () => {
      const result = await getLatestSpeed(userId, token)
      if (result?.speed !== undefined) {
        setConfirmedSpeed(result.speed)
      }
    }
    fetchLastSpeed()
  }, [])

  // ── get max speed ─────────────────────
  useEffect(() => {

    const fetchMaxSpeed = async () => {

      const result = await getMaxSpeed(
        userId,
        token
      )

      if (result?.maxSpeed !== undefined) {
        setMaxSpeed(result.maxSpeed)
      }
    }

    fetchMaxSpeed()

  }, [])

  // ── Send speed every 5s when helmet is connected ──────────────────────────
  useEffect(() => {
    if (!helmetData || !helmetConnected || !userId || !token) return

    const now = Date.now()
    if (now - lastSentRef.current < 5000) return
    lastSentRef.current = now

    const payload = {
      userId,
      speed:     Number(helmetData.speed) || 0,
      latitude:  helmetData.latitude  || 6.9,
      longitude: helmetData.longitude || 79.8,
    }

    console.log("📡 Sending speed:", payload)

    const send = async () => {
      const result = await sendSpeedEvent(payload, token)
      // Update confirmed speed from what backend actually saved
      if (result?.speed !== undefined) {
        setConfirmedSpeed(result.speed)
        if (result.speed > maxSpeed) {
          setMaxSpeed(result.speed)
        }
      }
    }
    send()

  }, [helmetData, helmetConnected])

  // ── Tilt detection ────────────────────────────────────────────────────────
  useEffect(() => {
    if (!helmetData || !helmetConnected || !userId || !token) return

    const roll = helmetData.roll || 0
    const now  = Date.now()

    if (Math.abs(roll) <= 21) return
    if (now - lastTiltSentRef.current < 10000) return

    lastTiltSentRef.current = now

    const payload = {
      userId,
      tiltAngle: roll,
      latitude:  helmetData.latitude  || 6.9,
      longitude: helmetData.longitude || 79.8,
    }

    console.log("⚠️ Sending tilt:", payload)

    const sendTilt = async () => {
      const res = await sendTiltEvent(payload, token)
      if (res?.triggered) {
        Alert.alert(
          "⚠️ Dangerous Tilt Detected",
          `Tilt: ${res.tiltAngle}° (Threshold: ${res.threshold}°)`
        )
      }
    }
    sendTilt()

  }, [helmetData, helmetConnected, userId, token])

  // ── Live speed display ────────────────────────────────────────────────────
  // Priority: live helmet → last confirmed from DB → '--'
  const liveSpeed = helmetConnected && helmetData?.speed !== undefined
    ? Number(helmetData.speed).toFixed(0)
    : confirmedSpeed > 0
      ? Number(confirmedSpeed).toFixed(0)
      : '--'

  const speedSub = helmetConnected
    ? 'live from helmet'
    : confirmedSpeed > 0
      ? 'last saved'
      : 'helmet not connected'

  // ── Highlights — now uses real speed ─────────────────────────────────────
  const highlights = [
    {
      label: 'Max Speed',
      value: `${Number(maxSpeed).toFixed(0)} km/h`,
      sub: 'highest recorded',
      colors: ['#6846af', '#6846af'],
      icon: '🏁',
    },
    {
      label: 'Current Speed',
      value: `${liveSpeed} km/h`,
      sub: speedSub,
      colors: ['#6846af', '#6846af'],
      icon: '🚴',
    },
  ]

  return (
    <View style={[styles.screen, { paddingTop: insets.top },darkMode && styles.screenDark]}>
      <DashboardHeader
        onLogout={logout}
        onHelmetData={handleHelmetData}
        onConnectionChange={handleConnectionChange}
      />

      {navSession.active && (
        <NavLiveBanner
          session={navSession}
          onResume={() => navigation.navigate('Navigation')}
          onStop={async () => await stopNavSession()}
          textScale={textScale}
        />
      )}

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        <WeatherCard darkMode={darkMode} textScale={textScale} />
        <MusicPlayer />

        <SectionHeader
          title="Overview"
          darkMode={darkMode}
          textScale={textScale}
        />

        <View style={styles.odometerWrap}>
          <Svg width={180} height={110} viewBox="0 0 180 110">
            <Path
              d="M 20 100 A 50 50 0 0 1 160 100"
              fill="none"
              stroke={darkMode ? '#374151' : '#E5E7EB'}
              strokeWidth={10}
              strokeLinecap="round"
            />
            <Path
              d="M 20 100 A 50 50 0 0 1 160 100"
              fill="none"
              stroke="#9d7bd7"
              strokeWidth={10}
              strokeLinecap="round"
              strokeDasharray={240}
              strokeDashoffset={60}
            />
          </Svg>

          <View style={styles.odometerLabel}>
            <Text
              style={[
                styles.odometerVal,
                { fontSize: 22 * textScale },
                darkMode && styles.textWhite,
              ]}
            >
              11,857
            </Text>

            <View style={[styles.odometerBadge, darkMode && styles.badgeDark]}>
              <Text
                style={[
                  styles.odometerBadgeText,
                  { fontSize: 10 * textScale },
                ]}
              >
                Total Distance
              </Text>
            </View>
          </View>
        </View>

        <SectionHeader
          title="Highlights"
          darkMode={darkMode}
          textScale={textScale}
        />

        <View style={styles.grid}>
          {highlights.map((h) => (
            <View
              key={h.label}
              style={[styles.highlightCard, { backgroundColor: h.colors[0] }]}
            >
              <View style={styles.highlightTop}>
                <Text
                  style={[
                    styles.highlightLabel,
                    { fontSize: 11 * textScale },
                  ]}
                >
                  {h.label}
                </Text>
                <Text
                  style={[
                    styles.highlightIcon,
                    { fontSize: 20 * textScale },
                  ]}
                >
                  {h.icon}
                </Text>
              </View>

              <Text
                style={[
                  styles.highlightVal,
                  { fontSize: 22 * textScale },
                ]}
              >
                {h.value}
              </Text>

              <Text
                style={[
                  styles.highlightSub,
                  { fontSize: 10 * textScale },
                ]}
              >
                {h.sub}
              </Text>
            </View>
          ))}
        </View>

        <SectionHeader title="Navigation" 
                       darkMode={darkMode}
                       textScale={textScale}
        />
        <TouchableOpacity
          style={[styles.navBtn, navSession.active && styles.navBtnActive]}
          onPress={() => navigation.navigate('Navigation')}
          activeOpacity={0.85}
        >
          <Text style={[styles.navBtnIcon, { fontSize: 28 * textScale }]}>
            {navSession.active ? '🔴' : '🗺'}
          </Text>

          <View style={{ flex: 1 }}>
            <Text
              style={[
                styles.navBtnTitle,
                { fontSize: 15 * textScale },
              ]}
            >
              {navSession.active
                ? `To: ${navSession.destination?.name || 'Destination'}`
                : 'Start Navigation'}
            </Text>

            <Text
              style={[
                styles.navBtnSub,
                { fontSize: 11 * textScale },
              ]}
            >
              {navSession.active
                ? `${navSession.distKm} km  •  ${navSession.etaMin} min  •  ${navSession.speed} km/h`
                : 'Turn-by-turn  •  Helmet HUD sync'}
            </Text>
          </View>

          {navSession.active && <PulseDot />}

          <Text style={[styles.navBtnArrow, { fontSize: 22 * textScale }]}>
            ›
          </Text>
        </TouchableOpacity>

        <SectionHeader
          title="Statistics"
          darkMode={darkMode}
          textScale={textScale}
        />

        <StatsChart darkMode={darkMode} textScale={textScale} />

        <View style={{ height: 20 }} />
      </ScrollView>

      <BottomNav active={activeTab} onChange={setActiveTab} darkMode={darkMode} textScale={textScale} />
    </View>
  )
}

function NavLiveBanner({ session, onResume, onStop, textScale = 1, }) {
  return (
    <View style={banner.wrap}>
      <PulseDot />

      <View style={{ flex: 1 }}>
        <Text
          style={[banner.title, { fontSize: 13 * textScale }]}
          numberOfLines={1}
        >
          🗺 {session.destination?.name || 'Navigation Active'}
        </Text>

        {session.currentStep && (
          <Text
            style={[banner.step, { fontSize: 11 * textScale }]}
            numberOfLines={1}
          >
            {session.currentStep.arrow} {session.currentStep.text}{' '}
            {session.currentStep.dist}
          </Text>
        )}
      </View>

      <TouchableOpacity style={banner.resumeBtn} onPress={onResume}>
        <Text style={[banner.resumeText, { fontSize: 11 * textScale }]}>
          OPEN
        </Text>
      </TouchableOpacity>

      <TouchableOpacity style={banner.stopBtn} onPress={onStop}>
        <Text style={banner.stopText}>■</Text>
      </TouchableOpacity>
    </View>
  )
}

function PulseDot() {
  return (
    <View style={dot.wrap}>
      <View style={dot.inner} />
    </View>
  )
}

function SectionHeader({
  title,
  textScale = 1,
  darkMode = false,
}) {
  return (
    <View style={styles.sectionHeader}>
      <Text
        style={[
          styles.sectionTitle,
          { fontSize: 17 * textScale },
          darkMode && styles.textWhite,
        ]}
      >
        {title}
      </Text>

      <TouchableOpacity>
        <Text
          style={[
            styles.viewMore,
            { fontSize: 12 * textScale },
          ]}
        >
          View more ›
        </Text>
      </TouchableOpacity>
    </View>
  )
}
const styles = StyleSheet.create({
  screen:            { flex: 1, backgroundColor: C.bg },
  scroll:            { paddingHorizontal: 16, paddingBottom: 20 },
  odometerWrap:      { alignItems: 'center', marginBottom: 20, position: 'relative' },
  odometerLabel:     { position: 'absolute', bottom: 10, alignItems: 'center' },
  odometerVal:       { fontSize: 22, fontWeight: '800', color: '#1a1a2e' },
  odometerBadge:     { borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 2, marginTop: 2 },
  odometerBadgeText: { fontSize: 10, color: '#8892A4', fontWeight: '500' },
  sectionHeader:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, marginTop: 4 },
  sectionTitle:      { fontSize: 17, fontWeight: '800', color: C.text },
  viewMore:          { fontSize: 12, color: C.muted, fontWeight: '500' },
  grid:              { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 16 },
  highlightCard:     { flex: 1, minWidth: '45%', borderRadius: 16, padding: 14 },
  highlightTop:      { flexDirection: 'row', justifyContent: 'space-between' },
  highlightLabel:    { fontSize: 11, fontWeight: '700', color: 'rgba(255,255,255,0.9)' },
  highlightIcon:     { fontSize: 20 },
  highlightVal:      { fontSize: 22, fontWeight: '800', color: '#fff', marginVertical: 6 },
  highlightSub:      { fontSize: 15, color: 'rgba(255,255,255,0.8)' },
  statCard:          { flex: 1, minWidth: '45%', backgroundColor: C.white, borderRadius: 14, padding: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4, elevation: 1 },
  statCardLive:      { borderWidth: 1.5, borderColor: '#4ade80' },
  statCardTop:       { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  statLabel:         { fontSize: 11, color: C.muted, fontWeight: '500', marginVertical: 4, lineHeight: 15 },
  statVal:           { fontSize: 22, fontWeight: '800', color: C.text },
  statValLive:       { color: '#16a34a' },
  liveDot:           { width: 7, height: 7, borderRadius: 4, backgroundColor: '#4ade80' },
  navBtn:            { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#2a1a2e', borderRadius: 16, padding: 16, marginBottom: 16 },
  navBtnActive:      { backgroundColor: '#2a0a0a', borderWidth: 1.5, borderColor: '#ff3b30' },
  navBtnIcon:        { fontSize: 28 },
  navBtnTitle:       { fontSize: 15, fontWeight: '800', color: '#fff' },
  navBtnSub:         { fontSize: 11, color: 'rgba(255,255,255,0.5)', marginTop: 2 },
  navBtnArrow:       { fontSize: 22, color: '#5B47E0', fontWeight: '700' },
  textWhite:         {color: '#fff',},
  badgeDark:         {borderColor: '#374151',},
  screenDark:        {backgroundColor: '#111827',},
})


const banner = StyleSheet.create({
  wrap:       { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#1a0505', borderBottomWidth: 1.5, borderBottomColor: '#ff3b30', paddingHorizontal: 16, paddingVertical: 10 },
  title:      { fontSize: 13, fontWeight: '700', color: '#fff' },
  step:       { fontSize: 11, color: 'rgba(255,255,255,0.55)', marginTop: 1 },
  resumeBtn:  { backgroundColor: 'rgba(255,59,48,0.15)', borderWidth: 1, borderColor: '#ff3b30', borderRadius: 5, paddingHorizontal: 10, paddingVertical: 5 },
  resumeText: { fontSize: 11, fontWeight: '800', color: '#ff3b30', letterSpacing: 0.8 },
  stopBtn:    { width: 30, height: 30, borderRadius: 5, backgroundColor: '#ff3b30', alignItems: 'center', justifyContent: 'center' },
  stopText:   { fontSize: 13, color: '#fff', fontWeight: '800' },
})

const dot = StyleSheet.create({
  wrap:  { width: 14, height: 14, borderRadius: 7, backgroundColor: 'rgba(255,59,48,0.25)', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  inner: { width: 7, height: 7, borderRadius: 3.5, backgroundColor: '#ff3b30' },
})