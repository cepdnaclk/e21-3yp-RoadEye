import { useState } from 'react'
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import { colors } from '../../utils/theme'

const C = colors
const weekData = [62, 45, 78, 55, 40, 90, 30]
const days     = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su']
const maxVal   = Math.max(...weekData)

export default function StatsChart() {
  const [activeTab, setActiveTab] = useState('Weekly')

  return (
    <View style={styles.card}>
      <Text style={styles.title}>Speed Vs Time</Text>

      {/* Tab switcher */}
      <View style={styles.tabs}>
        {['Today', 'Weekly', 'Monthly'].map(t => (
          <TouchableOpacity key={t} onPress={() => setActiveTab(t)}
            style={[styles.tab, activeTab === t && styles.tabActive]}>
            <Text style={[styles.tabText, activeTab === t && styles.tabTextActive]}>{t}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Bar chart */}
      <View style={styles.chartRow}>
        {weekData.map((val, i) => (
          <View key={i} style={styles.barCol}>
            <View style={[
              styles.bar,
              { height: (val / maxVal) * 80,
                backgroundColor: i === 5 ? C.primary : 'rgba(124,92,245,0.25)' }
            ]} />
            <Text style={styles.dayLabel}>{days[i]}</Text>
          </View>
        ))}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  card:         { backgroundColor: C.white, borderRadius: 16, padding: 14, marginBottom: 80, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 2 },
  title:        { fontSize: 12, fontWeight: '700', color: C.text, marginBottom: 10 },
  tabs:         { flexDirection: 'row', backgroundColor: C.purpleSoft, borderRadius: 20, padding: 3, alignSelf: 'flex-start', marginBottom: 16 },
  tab:          { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 17 },
  tabActive:    { backgroundColor: C.primary },
  tabText:      { fontSize: 12, fontWeight: '700', color: C.muted },
  tabTextActive:{ color: '#fff' },
  chartRow:     { flexDirection: 'row', alignItems: 'flex-end', height: 100, gap: 8 },
  barCol:       { flex: 1, alignItems: 'center', gap: 4, justifyContent: 'flex-end' },
  bar:          { width: '100%', borderTopLeftRadius: 6, borderTopRightRadius: 6 },
  dayLabel:     { fontSize: 10, color: C.muted, fontWeight: '600' },
})
