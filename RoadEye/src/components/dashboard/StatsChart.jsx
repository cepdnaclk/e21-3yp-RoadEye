import { useState } from 'react'
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import { colors } from '../../utils/theme'

const C = colors

const weekData = [62, 45, 78, 55, 40, 90, 30]
const days = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su']
const maxVal = Math.max(...weekData)

export default function StatsChart({ darkMode = false, textScale = 1 }) {
  const [activeTab, setActiveTab] = useState('Weekly')

  return (
    <View style={[styles.card, darkMode && styles.cardDark]}>
      <Text
        style={[
          styles.title,
          { fontSize: 12 * textScale },
          darkMode && styles.textWhite,
        ]}
      >
        Speed Vs Time
      </Text>

      <View style={[styles.tabs, darkMode && styles.tabsDark]}>
        {['Today', 'Weekly', 'Monthly'].map(t => (
          <TouchableOpacity
            key={t}
            onPress={() => setActiveTab(t)}
            style={[
              styles.tab,
              activeTab === t && styles.tabActive,
            ]}
          >
            <Text
              style={[
                styles.tabText,
                { fontSize: 12 * textScale },
                darkMode && styles.tabTextDark,
                activeTab === t && styles.tabTextActive,
              ]}
            >
              {t}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.chartRow}>
        {weekData.map((val, i) => (
          <View key={i} style={styles.barCol}>
            <View
              style={[
                styles.bar,
                {
                  height: (val / maxVal) * 80,
                  backgroundColor:
                    i === 5
                      ? C.primary
                      : darkMode
                        ? 'rgba(167,139,250,0.35)'
                        : 'rgba(124,92,245,0.25)',
                },
              ]}
            />

            <Text
              style={[
                styles.dayLabel,
                { fontSize: 10 * textScale },
                darkMode && styles.dayLabelDark,
              ]}
            >
              {days[i]}
            </Text>
          </View>
        ))}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: C.white,
    borderRadius: 16,
    padding: 14,
    marginBottom: 80,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },

  cardDark: {
    backgroundColor: '#1f2937',
  },

  title: {
    fontWeight: '700',
    color: C.text,
    marginBottom: 10,
  },

  textWhite: {
    color: '#fff',
  },

  tabs: {
    flexDirection: 'row',
    backgroundColor: C.purpleSoft,
    borderRadius: 20,
    padding: 3,
    alignSelf: 'flex-start',
    marginBottom: 16,
  },

  tabsDark: {
    backgroundColor: '#374151',
  },

  tab: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 17,
  },

  tabActive: {
    backgroundColor: C.primary,
  },

  tabText: {
    fontWeight: '700',
    color: C.muted,
  },

  tabTextDark: {
    color: '#d1d5db',
  },

  tabTextActive: {
    color: '#fff',
  },

  chartRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    height: 100,
    gap: 8,
  },

  barCol: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
    justifyContent: 'flex-end',
  },

  bar: {
    width: '100%',
    borderTopLeftRadius: 6,
    borderTopRightRadius: 6,
  },

  dayLabel: {
    color: C.muted,
    fontWeight: '600',
  },

  dayLabelDark: {
    color: '#d1d5db',
  },
})