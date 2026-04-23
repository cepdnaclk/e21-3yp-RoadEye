import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useNavigation } from '@react-navigation/native'
import { colors } from '../../utils/theme'

const C = colors

const tabs = [
  { id: 'overview',  label: 'Overview',  icon: '📊' },
 //{ id: 'explore',   label: 'Explore',   icon: '🧭' },
  { id: 'emergency', label: 'Emergency', icon: '📞' },
]

export default function BottomNav({ active, onChange }) {
  const insets     = useSafeAreaInsets()
  const navigation = useNavigation()

  const handlePress = (tab) => {
    onChange(tab.id)
    if (tab.id === 'emergency') {
      navigation.navigate('Emergency')
    }
  }

  return (
    <View style={[styles.container, { paddingBottom: insets.bottom + 10 }]}>
      {tabs.map(tab => (
        <TouchableOpacity
          key={tab.id}
          onPress={() => handlePress(tab)}
          style={styles.tab}
        >
          <Text style={styles.icon}>{tab.icon}</Text>
          <Text style={[styles.label, active === tab.id && styles.labelActive]}>
            {tab.label}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  )
}

const styles = StyleSheet.create({
  container:   { backgroundColor: C.white, borderTopWidth: 1, borderTopColor: '#F3F4F6', paddingTop: 10, flexDirection: 'row', justifyContent: 'space-around' },
  tab:         { alignItems: 'center', gap: 3, paddingHorizontal: 20 },
  icon:        { fontSize: 22 },
  label:       { fontSize: 10, fontWeight: '700', color: C.muted },
  labelActive: { color: C.primary },
})