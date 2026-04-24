import { useState, useCallback } from 'react'
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native'
import { useNavigation } from '@react-navigation/native'
import { useAuth } from '../hooks/useAuth'
import { colors } from '../utils/theme'
import Svg, { Path } from 'react-native-svg'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useNavSession, stopNavSession } from '../utils/NavigationSession'

import DashboardHeader from '../components/dashboard/DashboardHeader'
import WeatherCard     from '../components/dashboard/WeatherCard'
import MusicPlayer     from '../components/dashboard/MusicPlayer'
import StatsChart      from '../components/dashboard/StatsChart'
import BottomNav       from '../components/dashboard/BottomNav'

const C = colors

// ── Static fallback stats (shown before helmet connects) ──────────────────────
const DEFAULT_WEEK_STATS = [
  { icon: '🚴', label: 'Stability score',      val: 68,  helmetKey: 'stability' },
  { icon: '🛑', label: 'Aggressive Brakings',  val: 35,  helmetKey: 'brakingCount' },
  { icon: '🏍️', label: 'Sudden Accelerations', val: 56,  helmetKey: 'accelCount' },
  { icon: '↪️', label: 'Sharp turns',           val: 10,  helmetKey: 'sharpTurnCount' },
]

const highlights = [
  { label: 'Duration',      value: '11,857',  sub: 'updated 15 min ago', colors: ['#5B47E0','#7B5CF5'], icon: '⏱' },
  { label: 'Average Speed', value: '40 km/h', sub: 'updated 5s ago',     colors: ['#7B5CF5','#A78BFA'], icon: '🚴' },
]

export default function DashboardPage() {
  const insets     = useSafeAreaInsets()
  const { logout } = useAuth()
  const navigation = useNavigation()
  const [activeTab, setActiveTab] = useState('overview')

  // ── Live helmet data state ────────────────────────────────────────────────
  const [helmetData, setHelmetData]             = useState(null)
  const [helmetConnected, setHelmetConnected]   = useState(false)

  // Called by DashboardHeader → HelmetConnectButton whenever new data arrives
  const handleHelmetData = useCallback((data) => {
    if (data) setHelmetData(data)
  }, [])

  // Called by DashboardHeader → HelmetConnectButton on state changes
  const handleConnectionChange = useCallback((state) => {
    setHelmetConnected(state === 'connected')
  }, [])

  // ── Merge live helmet data into weekStats ─────────────────────────────────
  // If helmet is connected and has a value for a stat's helmetKey, use it.
  // Otherwise fall back to the static default value.
  const weekStats = DEFAULT_WEEK_STATS.map(stat => ({
    ...stat,
    val: (helmetConnected && helmetData?.[stat.helmetKey] !== undefined)
      ? helmetData[stat.helmetKey]
      : stat.val,
    live: helmetConnected && helmetData?.[stat.helmetKey] !== undefined,
  }))

  // Live session state
  const navSession = useNavSession()

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      {/* DashboardHeader now owns the helmet connect button and bubbles data up */}
      <DashboardHeader
        onLogout={logout}
        onHelmetData={handleHelmetData}
        onConnectionChange={handleConnectionChange}
      />

      {/* ── Live navigation banner ── */}
      {navSession.active && (
        <NavLiveBanner
          session={navSession}
          onResume={() => navigation.navigate('Navigation')}
          onStop={async () => await stopNavSession()}
        />
      )}

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        <WeatherCard />
        <MusicPlayer />

        <SectionHeader title="Overview" />
        <View style={styles.odometerWrap}>
          <Svg width={180} height={110} viewBox="0 0 180 110">
            <Path d="M 20 100 A 50 50 0 0 1 160 100" fill="none" stroke="#E5E7EB" strokeWidth={10} strokeLinecap="round" />
            <Path d="M 20 100 A 50 50 0 0 1 160 100" fill="none" stroke="#4F46E5" strokeWidth={10} strokeLinecap="round" strokeDasharray={240} strokeDashoffset={60} />
          </Svg>
          <View style={styles.odometerLabel}>
            <Text style={styles.odometerVal}>11,857</Text>
            <View style={styles.odometerBadge}>
              <Text style={styles.odometerBadgeText}>Total Distance</Text>
            </View>
          </View>
        </View>

        <SectionHeader title="Highlights" />
        <View style={styles.grid}>
          {highlights.map(h => (
            <View key={h.label} style={[styles.highlightCard, { backgroundColor: h.colors[0] }]}>
              <View style={styles.highlightTop}>
                <Text style={styles.highlightLabel}>{h.label}</Text>
                <Text style={styles.highlightIcon}>{h.icon}</Text>
              </View>
              <Text style={styles.highlightVal}>{h.value}</Text>
              <Text style={styles.highlightSub}>{h.sub}</Text>
            </View>
          ))}
        </View>

        {/* ── This week report — updates live when helmet is connected ── */}
        <SectionHeader title="This week report" />
        <View style={styles.grid}>
          {weekStats.map(s => (
            <View key={s.label} style={[styles.statCard, s.live && styles.statCardLive]}>
              <View style={styles.statCardTop}>
                <Text style={{ fontSize: 16 }}>{s.icon}</Text>
                {/* Green pulse dot when this value is live from helmet */}
                {s.live && <View style={styles.liveDot} />}
              </View>
              <Text style={styles.statLabel}>{s.label}</Text>
              <Text style={[styles.statVal, s.live && styles.statValLive]}>{s.val}</Text>
            </View>
          ))}
        </View>

        <SectionHeader title="Navigation" />

        {/* Navigation button — changes appearance when active */}
        <TouchableOpacity
          style={[styles.navBtn, navSession.active && styles.navBtnActive]}
          onPress={() => navigation.navigate('Navigation')}
          activeOpacity={0.85}
        >
          <Text style={styles.navBtnIcon}>{navSession.active ? '🔴' : '🗺'}</Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.navBtnTitle}>
              {navSession.active
                ? `To: ${navSession.destination?.name || 'Destination'}`
                : 'Start Navigation'}
            </Text>
            <Text style={styles.navBtnSub}>
              {navSession.active
                ? `${navSession.distKm} km  •  ${navSession.etaMin} min  •  ${navSession.speed} km/h`
                : 'Turn-by-turn  •  Helmet HUD sync'}
            </Text>
          </View>
          {navSession.active && <PulseDot />}
          <Text style={styles.navBtnArrow}>›</Text>
        </TouchableOpacity>

        <SectionHeader title="Statistics" />
        <StatsChart />

        <View style={{ height: 20 }} />
      </ScrollView>

      <BottomNav active={activeTab} onChange={setActiveTab} />
    </View>
  )
}

// ── Live navigation banner ────────────────────────────────────────────────────
function NavLiveBanner({ session, onResume, onStop }) {
  return (
    <View style={banner.wrap}>
      <PulseDot />
      <View style={{ flex: 1 }}>
        <Text style={banner.title} numberOfLines={1}>
          🗺  {session.destination?.name || 'Navigation Active'}
        </Text>
        {session.currentStep && (
          <Text style={banner.step} numberOfLines={1}>
            {session.currentStep.arrow}  {session.currentStep.text}  {session.currentStep.dist}
          </Text>
        )}
      </View>
      <TouchableOpacity style={banner.resumeBtn} onPress={onResume}>
        <Text style={banner.resumeText}>OPEN</Text>
      </TouchableOpacity>
      <TouchableOpacity style={banner.stopBtn} onPress={onStop}>
        <Text style={banner.stopText}>■</Text>
      </TouchableOpacity>
    </View>
  )
}

// ── Pulsing red dot ───────────────────────────────────────────────────────────
function PulseDot() {
  return (
    <View style={dot.wrap}>
      <View style={dot.inner} />
    </View>
  )
}

// ── Section header ────────────────────────────────────────────────────────────
function SectionHeader({ title }) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <TouchableOpacity><Text style={styles.viewMore}>View more ›</Text></TouchableOpacity>
    </View>
  )
}

// ── Styles ────────────────────────────────────────────────────────────────────
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
  highlightSub:      { fontSize: 10, color: 'rgba(255,255,255,0.8)' },

  // Stat cards
  statCard:          {
    flex: 1, minWidth: '45%', backgroundColor: C.white, borderRadius: 14,
    padding: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06, shadowRadius: 4, elevation: 1,
  },
  // Subtle green border when showing live data
  statCardLive:      { borderWidth: 1.5, borderColor: '#4ade80' },
  statCardTop:       { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  statLabel:         { fontSize: 11, color: C.muted, fontWeight: '500', marginVertical: 4, lineHeight: 15 },
  statVal:           { fontSize: 22, fontWeight: '800', color: C.text },
  statValLive:       { color: '#16a34a' },   // green when live
  liveDot:           { width: 7, height: 7, borderRadius: 4, backgroundColor: '#4ade80' },

  // Nav button
  navBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: '#1a1a2e', borderRadius: 16, padding: 16, marginBottom: 16,
  },
  navBtnActive: {
    backgroundColor: '#2a0a0a',
    borderWidth: 1.5,
    borderColor: '#ff3b30',
  },
  navBtnIcon:  { fontSize: 28 },
  navBtnTitle: { fontSize: 15, fontWeight: '800', color: '#fff' },
  navBtnSub:   { fontSize: 11, color: 'rgba(255,255,255,0.5)', marginTop: 2 },
  navBtnArrow: { fontSize: 22, color: '#5B47E0', fontWeight: '700' },
})

const banner = StyleSheet.create({
  wrap: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: '#1a0505',
    borderBottomWidth: 1.5, borderBottomColor: '#ff3b30',
    paddingHorizontal: 16, paddingVertical: 10,
  },
  title: { fontSize: 13, fontWeight: '700', color: '#fff' },
  step:  { fontSize: 11, color: 'rgba(255,255,255,0.55)', marginTop: 1 },
  resumeBtn: {
    backgroundColor: 'rgba(255,59,48,0.15)',
    borderWidth: 1, borderColor: '#ff3b30',
    borderRadius: 5, paddingHorizontal: 10, paddingVertical: 5,
  },
  resumeText: { fontSize: 11, fontWeight: '800', color: '#ff3b30', letterSpacing: 0.8 },
  stopBtn: {
    width: 30, height: 30, borderRadius: 5,
    backgroundColor: '#ff3b30',
    alignItems: 'center', justifyContent: 'center',
  },
  stopText: { fontSize: 13, color: '#fff', fontWeight: '800' },
})

const dot = StyleSheet.create({
  wrap: {
    width: 14, height: 14, borderRadius: 7,
    backgroundColor: 'rgba(255,59,48,0.25)',
    alignItems: 'center', justifyContent: 'center',
    flexShrink: 0,
  },
  inner: {
    width: 7, height: 7, borderRadius: 3.5,
    backgroundColor: '#ff3b30',
  },
})