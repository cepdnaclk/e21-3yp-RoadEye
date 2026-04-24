import { useState } from 'react'
import { View, Text, TouchableOpacity, StyleSheet, Modal, Pressable } from 'react-native'
import { useNavigation } from '@react-navigation/native'
import { useAuth } from '../../hooks/useAuth'
import { colors } from '../../utils/theme'
import HelmetConnectButton from './HelmetConnectButton'

const C = colors

// DashboardHeader now accepts onHelmetData and onConnectionChange
// so DashboardPage can react to live helmet data.
export default function DashboardHeader({ onLogout, onHelmetData, onConnectionChange }) {
  const { user }   = useAuth()
  const navigation = useNavigation()
  const [dropdown, setDropdown] = useState(false)

  const initial = (user?.username?.[0] || 'H').toUpperCase()

  const handleLogout = () => {
    setDropdown(false)
    onLogout()
    navigation.reset({ index: 0, routes: [{ name: 'Login' }] })
  }

  const handleProfile = () => {
    setDropdown(false)
    // navigation.navigate('Profile')
  }

  const handleSettings = () => {
    setDropdown(false)
    // navigation.navigate('Settings')
  }

  return (
    <View style={styles.container}>
      <View style={styles.topRow}>
        <View>
          <Text style={styles.greeting}>Hi {user?.username || 'Hirushi'},</Text>
          <Text style={styles.date}>TUES 11 FEB</Text>
        </View>
        <View style={styles.actions}>
          <TouchableOpacity style={styles.iconBtn}>
            <Text style={styles.iconText}>🔔</Text>
          </TouchableOpacity>

          {/* Avatar — tap opens dropdown */}
          <TouchableOpacity
            onPress={() => setDropdown(true)}
            style={styles.avatar}
            activeOpacity={0.8}
          >
            <Text style={styles.avatarText}>{initial}</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* ── Real helmet connect button replaces the static pill ── */}
      <HelmetConnectButton
        onDataReceived={onHelmetData}
        onConnectionChange={onConnectionChange}
      />

      {/* Dropdown Modal */}
      <Modal
        visible={dropdown}
        transparent
        animationType="fade"
        onRequestClose={() => setDropdown(false)}
      >
        <Pressable style={styles.backdrop} onPress={() => setDropdown(false)}>
          <Pressable style={styles.menu} onPress={e => e.stopPropagation()}>

            {/* User info */}
            <View style={styles.menuHeader}>
              <View style={styles.menuAvatar}>
                <Text style={styles.menuAvatarText}>{initial}</Text>
              </View>
              <View>
                <Text style={styles.menuName}>{user?.username || 'Hirushi'}</Text>
                <Text style={styles.menuEmail}>{user?.email || ''}</Text>
              </View>
            </View>

            <View style={styles.divider} />

            {/* Change Profile */}
            <TouchableOpacity style={styles.menuItem} onPress={handleProfile} activeOpacity={0.7}>
              <Text style={styles.menuItemIcon}>👤</Text>
              <Text style={styles.menuItemText}>Change Profile</Text>
              <Text style={styles.menuArrow}>›</Text>
            </TouchableOpacity>

            {/* Settings */}
            <TouchableOpacity style={styles.menuItem} onPress={handleSettings} activeOpacity={0.7}>
              <Text style={styles.menuItemIcon}>⚙️</Text>
              <Text style={styles.menuItemText}>Settings</Text>
              <Text style={styles.menuArrow}>›</Text>
            </TouchableOpacity>

            <View style={styles.divider} />

            {/* Logout */}
            <TouchableOpacity style={styles.menuItem} onPress={handleLogout} activeOpacity={0.7}>
              <Text style={styles.menuItemIcon}>🚪</Text>
              <Text style={[styles.menuItemText, { color: '#DC2626' }]}>Log Out</Text>
              <Text style={[styles.menuArrow, { color: '#DC2626' }]}>›</Text>
            </TouchableOpacity>

          </Pressable>
        </Pressable>
      </Modal>

    </View>
  )
}

const styles = StyleSheet.create({
  container:      { backgroundColor: C.white, padding: 20, paddingBottom: 16 },
  topRow:         { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  greeting:       { fontSize: 22, fontWeight: '800', color: C.text },
  date:           { fontSize: 11, color: C.muted, fontWeight: '500', letterSpacing: 1 },
  actions:        { flexDirection: 'row', alignItems: 'center', gap: 14 },
  iconBtn:        { padding: 2 },
  iconText:       { fontSize: 18 },
  avatar:         { width: 36, height: 36, borderRadius: 18, backgroundColor: '#f97316', alignItems: 'center', justifyContent: 'center' },
  avatarText:     { color: '#fff', fontWeight: '800', fontSize: 14 },

  // Modal
  backdrop:       { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)' },
  menu:           { position: 'absolute', top: 70, right: 16, width: 240, backgroundColor: '#fff', borderRadius: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.15, shadowRadius: 20, elevation: 10, overflow: 'hidden' },
  menuHeader:     { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16 },
  menuAvatar:     { width: 42, height: 42, borderRadius: 21, backgroundColor: '#f97316', alignItems: 'center', justifyContent: 'center' },
  menuAvatarText: { color: '#fff', fontWeight: '800', fontSize: 16 },
  menuName:       { fontSize: 15, fontWeight: '800', color: C.text },
  menuEmail:      { fontSize: 12, color: C.muted, marginTop: 2 },
  divider:        { height: 1, backgroundColor: '#F3F4F6' },
  menuItem:       { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, gap: 12 },
  menuItemIcon:   { fontSize: 18, width: 24 },
  menuItemText:   { flex: 1, fontSize: 15, fontWeight: '600', color: C.text },
  menuArrow:      { fontSize: 18, color: C.muted },
})