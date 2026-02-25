import { View, Text, StyleSheet } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import Svg, { Rect, Path } from 'react-native-svg'

export default function StatusBar({ bg = '#fff' }) {
  const insets = useSafeAreaInsets()
  return (
    <View style={[styles.container, { backgroundColor: bg, paddingTop: insets.top }]}>
      <Text style={styles.time}>9:41</Text>
      <View style={styles.icons}>
        {/* Signal bars */}
        <Svg width={17} height={12} viewBox="0 0 17 12">
          <Rect x="0" y="3" width="3" height="9" rx="1" fill="#1a1a2e" />
          <Rect x="4.5" y="2" width="3" height="10" rx="1" fill="#1a1a2e" />
          <Rect x="9" y="0.5" width="3" height="11.5" rx="1" fill="#1a1a2e" />
          <Rect x="13.5" y="0" width="3" height="12" rx="1" fill="#1a1a2e" />
        </Svg>
        {/* Wifi */}
        <Svg width={16} height={12} viewBox="0 0 16 12">
          <Path
            d="M8 3c2.5 0 4.7 1 6.3 2.7L8 12 1.7 5.7C3.3 4 5.5 3 8 3z"
            fill="none"
            stroke="#1a1a2e"
            strokeWidth={1.5}
          />
        </Svg>
        {/* Battery */}
        <View style={styles.battery}>
          <View style={styles.batteryFill} />
        </View>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingBottom: 8 },
  time:        { fontWeight: '700', fontSize: 15, color: '#1a1a2e' },
  icons:       { flexDirection: 'row', alignItems: 'center', gap: 6 },
  battery:     { width: 25, height: 12, borderWidth: 1.5, borderColor: '#1a1a2e', borderRadius: 3, padding: 1.5, justifyContent: 'center' },
  batteryFill: { width: '75%', height: '100%', backgroundColor: '#1a1a2e', borderRadius: 1.5 },
})
