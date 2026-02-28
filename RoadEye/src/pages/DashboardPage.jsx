import { useState } from 'react'
import {
  View, Text, TouchableOpacity, StyleSheet, Modal, Pressable
} from 'react-native'
import { useNavigation } from '@react-navigation/native'
import { useAuth } from '../hooks/useAuth'
import { colors } from '../../utils/theme'

const C = colors

export default function DashboardHeader({ onLogout }) {
  const { user }     = useAuth()
  const navigation   = useNavigation()
  const [dropdown, setDropdown] = useState(false)

  const initial = (user?.username?.[0] || 'U').toUpperCase()

  const handleLogout = () => {
    setDropdown(false)
    onLogout()
    navigation.reset({ index: 0, routes: [{ name: 'Login' }] })
  }

  const handleProfile = () => {
    setDropdown(false)
    // navigation.navigate('Profile')  ← uncomment when you add Profile screen
  }

  const handleSettings = () => {
    setDropdown(false)
    // navigation.navigate('Settings') ← uncomment when you add Settings screen
  }

  return (
    <View style={styles.header}>

      {/* Name row */}
      <View style={styles.row}>
        <View>
          <Text style={styles.greeting}>Hi {user?.username || 'User'},</Text>
          <Text style={styles.date}>Tues 11 Feb</Text>
        </View>

        <View style={styles.actions}>
          {/* Bell */}
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

      {/* Connection pills */}
      <View style={styles.pills}>
        <View style={styles.connectedPill}>
          <View style={styles.dot} />
          <Text style={styles.connectedText}>Connected to the helmet</Text>
        </View>
        <View style={styles.navPill}>
          <Text style={styles.navText}>🗺️ Navigation</Text>
        </View>
      </View>

      {/* ── Dropdown Modal ── */}
      <Modal
        visible={dropdown}
        transparent
        animationType="fade"
        onRequestClose={() => setDropdown(false)}
      >
        {/* backdrop — tap outside to close */}
        <Pressable style={styles.backdrop} onPress={() => setDropdown(false)}>
          {/* stop propagation so tapping inside menu doesn't close */}
          <Pressable style={styles.menu} onPress={e => e.stopPropagation()}>

            {/* User info at top */}
            <View style={styles.menuHeader}>
              <View style={styles.menuAvatar}>
                <Text style={styles.menuAvatarText}>{initial}</Text>
              </View>
              <View>
                <Text style={styles.menuName}>{user?.username || 'User'}</Text>
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
  header:         { backgroundColor: '#fff', paddingHorizontal: 20, paddingTop: 14, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: '#F0F0F5' },
  row:            { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
  greeting:       { fontSize: 22, fontWeight: '800', color: C.text },
  date:           { fontSize: 11, color: C.muted, fontWeight: '500', letterSpacing: 1, textTransform: 'uppercase', marginTop: 2 },
  actions:        { flexDirection: 'row', alignItems: 'center', gap: 10 },
  iconBtn:        { padding: 4 },
  iconText:       { fontSize: 20 },
  avatar:         { width: 38, height: 38, borderRadius: 19, backgroundColor: '#f97316', alignItems: 'center', justifyContent: 'center', shadowColor: '#f97316', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.4, shadowRadius: 4, elevation: 3 },
  avatarText:     { color: '#fff', fontWeight: '800', fontSize: 15 },
  pills:          { flexDirection: 'row', gap: 10, marginTop: 14 },
  connectedPill:  { backgroundColor: C.primary, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8, flexDirection: 'row', alignItems: 'center', gap: 6 },
  dot:            { width: 8, height: 8, borderRadius: 4, backgroundColor: '#4ade80' },
  connectedText:  { color: '#fff', fontSize: 12, fontWeight: '700' },
  navPill:        { backgroundColor: '#EDE9FE', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8, borderWidth: 1, borderColor: '#DDD6FE' },
  navText:        { color: C.primary, fontSize: 12, fontWeight: '700' },

  // Modal
  backdrop:       { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)' },
  menu:           { position: 'absolute', top: 70, right: 16, width: 240, backgroundColor: '#fff', borderRadius: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.15, shadowRadius: 20, elevation: 10, overflow: 'hidden' },
  menuHeader:     { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16 },
  menuAvatar:     { width: 42, height: 42, borderRadius: 21, backgroundColor: '#f97316', alignItems: 'center', justifyContent: 'center' },
  menuAvatarText: { color: '#fff', fontWeight: '800', fontSize: 16 },
  menuName:       { fontSize: 15, fontWeight: '800', color: C.text },
  menuEmail:      { fontSize: 12, color: C.muted, marginTop: 2 },
  divider:        { height: 1, backgroundColor: '#F3F4F6', marginHorizontal: 0 },
  menuItem:       { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, gap: 12 },
  menuItemIcon:   { fontSize: 18, width: 24 },
  menuItemText:   { flex: 1, fontSize: 15, fontWeight: '600', color: C.text },
  menuArrow:      { fontSize: 18, color: C.muted },
})