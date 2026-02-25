import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import { colors } from '../../utils/theme'

const C = colors

export default function DashboardHeader({ onLogout }) {
  return (
    <View style={styles.container}>
      <View style={styles.topRow}>
        <View>
          <Text style={styles.greeting}>Hi Hirushi,</Text>
          <Text style={styles.date}>TUES 11 FEB</Text>
        </View>
        <View style={styles.actions}>
          <TouchableOpacity onPress={onLogout} style={styles.iconBtn}>
            <Text style={styles.iconText}>⚙️</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.iconBtn}>
            <Text style={styles.iconText}>🔔</Text>
          </TouchableOpacity>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>H</Text>
          </View>
        </View>
      </View>

      <View style={styles.pills}>
        <View style={styles.connectedPill}>
          <View style={styles.greenDot} />
          <Text style={styles.connectedText}>Connected to the helmet</Text>
        </View>
        <View style={styles.navPill}>
          <Text style={styles.navText}>🗺️ Navigation</Text>
        </View>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container:     { backgroundColor: C.white, padding: 20, paddingBottom: 16 },
  topRow:        { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  greeting:      { fontSize: 22, fontWeight: '800', color: C.text },
  date:          { fontSize: 11, color: C.muted, fontWeight: '500', letterSpacing: 1 },
  actions:       { flexDirection: 'row', alignItems: 'center', gap: 14 },
  iconBtn:       { padding: 2 },
  iconText:      { fontSize: 18 },
  avatar:        { width: 36, height: 36, borderRadius: 18, backgroundColor: '#f97316', alignItems: 'center', justifyContent: 'center' },
  avatarText:    { color: '#fff', fontWeight: '800', fontSize: 14 },
  pills:         { flexDirection: 'row', gap: 10 },
  connectedPill: { backgroundColor: C.primary, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8, flexDirection: 'row', alignItems: 'center', gap: 6 },
  greenDot:      { width: 8, height: 8, borderRadius: 4, backgroundColor: '#4ade80' },
  connectedText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  navPill:       { backgroundColor: C.purpleSoft, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8, borderWidth: 1, borderColor: '#DDD6FE' },
  navText:       { color: C.primary, fontSize: 12, fontWeight: '700' },
})
