import { useState } from 'react'
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native'
import { useAuth } from '../hooks/useAuth'
import { colors } from '../utils/theme'
import Svg, { Path } from 'react-native-svg'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import DashboardHeader from '../components/dashboard/DashboardHeader'
import WeatherCard     from '../components/dashboard/WeatherCard'
import MusicPlayer     from '../components/dashboard/MusicPlayer'
import StatsChart      from '../components/dashboard/StatsChart'
import BottomNav       from '../components/dashboard/BottomNav'

const C = colors

const highlights = [
  { label: 'Duration',      value: '11,857',  sub: 'updated 15 min ago', colors: ['#5B47E0','#7B5CF5'], icon: '⏱' },
  { label: 'Average Speed', value: '40 km/h', sub: 'updated 5s ago',     colors: ['#7B5CF5','#A78BFA'], icon: '🚴' },
]

const weekStats = [
  { icon: '🚴', label: 'Stability score',      val: 68 },
  { icon: '🛑', label: 'Aggressive Brakings',  val: 35 },
  { icon: '🏍️', label: 'Sudden Accelerations', val: 56 },
  { icon: '↪️', label: 'Sharp turns',           val: 10 },
]

export default function DashboardPage() {
  const insets      = useSafeAreaInsets()  // ← added
  const { logout }  = useAuth()
  const [activeTab, setActiveTab] = useState('overview')

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>  {/* ← changed */}
      <DashboardHeader onLogout={logout} />

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

        <SectionHeader title="This week report" />
        <View style={styles.grid}>
          {weekStats.map(s => (
            <View key={s.label} style={styles.statCard}>
              <Text style={{ fontSize: 16 }}>{s.icon}</Text>
              <Text style={styles.statLabel}>{s.label}</Text>
              <Text style={styles.statVal}>{s.val}</Text>
            </View>
          ))}
        </View>

        <SectionHeader title="Statistics" />
        <StatsChart />

        <View style={{ height: 20 }} />
      </ScrollView>

      <BottomNav active={activeTab} onChange={setActiveTab} />
    </View>
  )
}

function SectionHeader({ title }) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <TouchableOpacity><Text style={styles.viewMore}>View more ›</Text></TouchableOpacity>
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
  highlightSub:      { fontSize: 10, color: 'rgba(255,255,255,0.8)' },
  statCard:          { flex: 1, minWidth: '45%', backgroundColor: C.white, borderRadius: 14, padding: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4, elevation: 1 },
  statLabel:         { fontSize: 11, color: C.muted, fontWeight: '500', marginVertical: 4, lineHeight: 15 },
  statVal:           { fontSize: 22, fontWeight: '800', color: C.text },
})