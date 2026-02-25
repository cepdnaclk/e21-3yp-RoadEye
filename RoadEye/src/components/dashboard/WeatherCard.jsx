import { View, Text, StyleSheet } from 'react-native'
import { colors } from '../../utils/theme'

const C = colors

export default function WeatherCard() {
  return (
    <View style={styles.card}>
      <View>
        <Text style={styles.temp}>19°</Text>
        <Text style={styles.unit}>C</Text>
        <Text style={styles.condition}>Partly Cloudy</Text>
        <Text style={styles.range}>H: 22° L: 14°</Text>
      </View>

      <View style={styles.meta}>
        <View style={styles.metaRow}>
          <Text>💧</Text>
          <Text style={styles.metaLabel}>Humidity</Text>
          <Text style={styles.metaVal}>64%</Text>
        </View>
        <View style={styles.metaRow}>
          <Text>🌬️</Text>
          <Text style={styles.metaLabel}>Wind</Text>
          <Text style={styles.metaVal}>12 km/h</Text>
        </View>
      </View>

      <View style={styles.iconBox}>
        <Text style={styles.weatherIcon}>⛅</Text>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  card:       { backgroundColor: C.white, borderRadius: 16, padding: 16, marginVertical: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 2 },
  temp:       { fontSize: 32, fontWeight: '800', color: C.text, lineHeight: 36 },
  unit:       { fontSize: 11, color: C.muted, marginTop: 2 },
  condition:  { fontSize: 12, fontWeight: '600', color: C.text, marginTop: 4 },
  range:      { fontSize: 10, color: C.muted },
  meta:       { flex: 1, paddingLeft: 20, gap: 6 },
  metaRow:    { flexDirection: 'row', alignItems: 'center', gap: 6 },
  metaLabel:  { fontSize: 12, fontWeight: '600', color: C.text },
  metaVal:    { fontSize: 12, fontWeight: '700', color: C.text, marginLeft: 'auto' },
  iconBox:    { width: 52, height: 52, borderRadius: 14, backgroundColor: '#FFF7ED', alignItems: 'center', justifyContent: 'center', marginLeft: 12 },
  weatherIcon:{ fontSize: 26 },
})
