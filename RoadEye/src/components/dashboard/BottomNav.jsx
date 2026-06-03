import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useNavigation } from '@react-navigation/native'
import { colors } from '../../utils/theme'

const C = colors

const tabs = [
  { id: 'overview', label: 'Overview', icon: '📊' },
  { id: 'emergency', label: 'Emergency', icon: '📞' },
]

export default function BottomNav({
  active,
  onChange,
  darkMode = false,
  textScale = 1,
}) {
  const insets = useSafeAreaInsets()
  const navigation = useNavigation()

  const handlePress = (tab) => {
    onChange(tab.id)

    if (tab.id === 'emergency') {
      navigation.navigate('Emergency')
    }

    if (tab.id === 'overview') {
      navigation.navigate('Dashboard')
    }
  }

  return (
    <View
      style={[
        styles.container,
        { paddingBottom: insets.bottom + 10 },
        darkMode && styles.containerDark,
      ]}
    >
      {tabs.map(tab => (
        <TouchableOpacity
          key={tab.id}
          onPress={() => handlePress(tab)}
          style={styles.tab}
          activeOpacity={0.8}
        >
          <Text style={[styles.icon, { fontSize: 22 * textScale },darkMode && styles.iconDark,active === tab.id && styles.iconActive,]}>
            {tab.icon}
          </Text>

          <Text
            style={[
              styles.label,
              { fontSize: 10 * textScale },
              darkMode && styles.labelDark,
              active === tab.id && styles.labelActive,
            ]}
          >
            {tab.label}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: C.white,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    paddingTop: 10,
    flexDirection: 'row',
    justifyContent: 'space-around',
  },

  containerDark: {
    backgroundColor: '#1f2937',
    borderTopColor: '#374151',
  },

  tab: {
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 20,
  },

  icon: {
    fontSize: 22,
  },

  label: {
    fontSize: 10,
    fontWeight: '700',
    color: C.muted,
  },

  labelDark: {
    color: '#d1d5db',
  },

  labelActive: {
    color: C.primary,
  },
    iconDark: {
    color: '#d1d5db',
  },

  iconActive: {
    color: C.primary,
  },
})