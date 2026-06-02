import { useEffect, useState } from 'react'
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Pressable,
} from 'react-native'

import { useNavigation } from '@react-navigation/native'
import { useAuth } from '../../hooks/useAuth'
import { colors } from '../../utils/theme'
import HelmetConnectButton from './HelmetConnectButton'
import { useHelmetConnection } from '../../hooks/useHelmetConnection'
import { useAppSettings } from '../../hooks/useAppSettings'

const C = colors

export default function DashboardHeader({
  onLogout,
  onHelmetData,
  onConnectionChange,
}) {
  const { user } = useAuth()
  const navigation = useNavigation()

  const [dropdown, setDropdown] = useState(false)

  const helmet = useHelmetConnection()
  const { darkMode, textScale } = useAppSettings()

  useEffect(() => {
    onConnectionChange?.(helmet.connectionState)
  }, [helmet.connectionState, onConnectionChange])

  useEffect(() => {
    if (helmet.helmetData) {
      onHelmetData?.(helmet.helmetData)
    }
  }, [helmet.helmetData, onHelmetData])

  const username = user?.username || 'User'
  const initial = (username?.[0] || 'U').toUpperCase()
<<<<<<< HEAD

  const dateText = new Date()
    .toLocaleDateString('en-US', {
      weekday: 'short',
      day: '2-digit',
      month: 'short',
    })
    .toUpperCase()
=======
>>>>>>> c2cbe41c33815e7b6b5e40c374504cb550233b7c

  // ── Current date ─────────────────────────────────────────────
  const today = new Date()

  const dateText = today
    .toLocaleDateString('en-US', {
      weekday: 'short',
      day: '2-digit',
      month: 'short',
    })
    .toUpperCase()

  // ── Logout ───────────────────────────────────────────────────
  const handleLogout = () => {
    setDropdown(false)

    helmet.disconnect()

    onLogout()
<<<<<<< HEAD
=======

>>>>>>> c2cbe41c33815e7b6b5e40c374504cb550233b7c
    navigation.reset({
      index: 0,
      routes: [{ name: 'Login' }],
    })
  }

  return (
<<<<<<< HEAD
    <View style={[styles.container, darkMode && styles.containerDark]}>
      <View style={styles.topRow}>
        <View>
          <Text
            style={[
              styles.greeting,
              { fontSize: 22 * textScale },
              darkMode && styles.textWhite,
            ]}
          >
            Hi {username},
          </Text>

          <Text
            style={[
              styles.date,
              { fontSize: 11 * textScale },
            ]}
          >
=======
    <View style={styles.container}>
      {/* ── Top row ─────────────────────────────────────────── */}
      <View style={styles.topRow}>
        <View>
          <Text style={styles.greeting}>
            Hi {username},
          </Text>

          <Text style={styles.date}>
>>>>>>> c2cbe41c33815e7b6b5e40c374504cb550233b7c
            {dateText}
          </Text>
        </View>

        <View style={styles.actions}>
          <TouchableOpacity style={styles.iconBtn}>
<<<<<<< HEAD
            <Text style={[styles.iconText, { fontSize: 18 * textScale }]}>
              🔔
            </Text>
=======
            <Text style={styles.iconText}>🔔</Text>
>>>>>>> c2cbe41c33815e7b6b5e40c374504cb550233b7c
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setDropdown(true)}
            style={styles.avatar}
            activeOpacity={0.8}
          >
<<<<<<< HEAD
            <Text style={[styles.avatarText, { fontSize: 14 * textScale }]}>
=======
            <Text style={styles.avatarText}>
>>>>>>> c2cbe41c33815e7b6b5e40c374504cb550233b7c
              {initial}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* ── Helmet connect ─────────────────────────────────── */}
      <HelmetConnectButton helmet={helmet} />

<<<<<<< HEAD
=======
      {/* ── Dropdown menu ──────────────────────────────────── */}
>>>>>>> c2cbe41c33815e7b6b5e40c374504cb550233b7c
      <Modal
        visible={dropdown}
        transparent
        animationType="fade"
        onRequestClose={() => setDropdown(false)}
      >
        <Pressable
          style={styles.backdrop}
          onPress={() => setDropdown(false)}
        >
          <Pressable
<<<<<<< HEAD
            style={[styles.menu, darkMode && styles.menuDark]}
            onPress={e => e.stopPropagation()}
          >
            <View style={styles.menuHeader}>
              <View style={styles.menuAvatar}>
                <Text style={[styles.menuAvatarText, { fontSize: 16 * textScale }]}>
=======
            style={styles.menu}
            onPress={e => e.stopPropagation()}
          >
            {/* Header */}
            <View style={styles.menuHeader}>
              <View style={styles.menuAvatar}>
                <Text style={styles.menuAvatarText}>
>>>>>>> c2cbe41c33815e7b6b5e40c374504cb550233b7c
                  {initial}
                </Text>
              </View>

              <View>
<<<<<<< HEAD
                <Text
                  style={[
                    styles.menuName,
                    { fontSize: 15 * textScale },
                    darkMode && styles.textWhite,
                  ]}
                >
                  {username}
                </Text>

                <Text style={[styles.menuEmail, { fontSize: 12 * textScale }]}>
=======
                <Text style={styles.menuName}>
                  {username}
                </Text>

                <Text style={styles.menuEmail}>
>>>>>>> c2cbe41c33815e7b6b5e40c374504cb550233b7c
                  {user?.email || ''}
                </Text>
              </View>
            </View>

            <View style={styles.divider} />

<<<<<<< HEAD
=======
            {/* Change Profile */}
>>>>>>> c2cbe41c33815e7b6b5e40c374504cb550233b7c
            <TouchableOpacity
              style={styles.menuItem}
              activeOpacity={0.7}
              onPress={() => {
                setDropdown(false)
                navigation.navigate('ChangeProfile')
              }}
            >
<<<<<<< HEAD
              <Text style={[styles.menuItemIcon, { fontSize: 18 * textScale }]}>👤</Text>
              <Text
                style={[
                  styles.menuItemText,
                  { fontSize: 15 * textScale },
                  darkMode && styles.textWhite,
                ]}
              >
                Change Profile
              </Text>
              <Text style={[styles.menuArrow, { fontSize: 18 * textScale }]}>›</Text>
            </TouchableOpacity>

=======
              <Text style={styles.menuItemIcon}>👤</Text>

              <Text style={styles.menuItemText}>
                Change Profile
              </Text>

              <Text style={styles.menuArrow}>›</Text>
            </TouchableOpacity>

            {/* Settings */}
>>>>>>> c2cbe41c33815e7b6b5e40c374504cb550233b7c
            <TouchableOpacity
              style={styles.menuItem}
              activeOpacity={0.7}
              onPress={() => {
                setDropdown(false)
                navigation.navigate('Settings')
              }}
            >
<<<<<<< HEAD
              <Text style={[styles.menuItemIcon, { fontSize: 18 * textScale }]}>⚙️</Text>
              <Text
                style={[
                  styles.menuItemText,
                  { fontSize: 15 * textScale },
                  darkMode && styles.textWhite,
                ]}
              >
                Settings
              </Text>
              <Text style={[styles.menuArrow, { fontSize: 18 * textScale }]}>›</Text>
=======
              <Text style={styles.menuItemIcon}>⚙️</Text>

              <Text style={styles.menuItemText}>
                Settings
              </Text>

              <Text style={styles.menuArrow}>›</Text>
>>>>>>> c2cbe41c33815e7b6b5e40c374504cb550233b7c
            </TouchableOpacity>

            <View style={styles.divider} />

<<<<<<< HEAD
=======
            {/* Logout */}
>>>>>>> c2cbe41c33815e7b6b5e40c374504cb550233b7c
            <TouchableOpacity
              style={styles.menuItem}
              onPress={handleLogout}
              activeOpacity={0.7}
            >
<<<<<<< HEAD
              <Text style={[styles.menuItemIcon, { fontSize: 18 * textScale }]}>🚪</Text>
              <Text
                style={[
                  styles.menuItemText,
                  { color: '#DC2626', fontSize: 15 * textScale },
=======
              <Text style={styles.menuItemIcon}>🚪</Text>

              <Text
                style={[
                  styles.menuItemText,
                  { color: '#DC2626' },
>>>>>>> c2cbe41c33815e7b6b5e40c374504cb550233b7c
                ]}
              >
                Log Out
              </Text>
<<<<<<< HEAD
              <Text
                style={[
                  styles.menuArrow,
                  { color: '#DC2626', fontSize: 18 * textScale },
=======

              <Text
                style={[
                  styles.menuArrow,
                  { color: '#DC2626' },
>>>>>>> c2cbe41c33815e7b6b5e40c374504cb550233b7c
                ]}
              >
                ›
              </Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: C.white,
    padding: 20,
    paddingBottom: 16,
  },
<<<<<<< HEAD
  containerDark: {
    backgroundColor: '#1f2937',
  },
=======

>>>>>>> c2cbe41c33815e7b6b5e40c374504cb550233b7c
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
<<<<<<< HEAD
  greeting: {
    fontWeight: '800',
    color: C.text,
  },
  date: {
=======

  greeting: {
    fontSize: 22,
    fontWeight: '800',
    color: C.text,
  },

  date: {
    fontSize: 11,
>>>>>>> c2cbe41c33815e7b6b5e40c374504cb550233b7c
    color: C.muted,
    fontWeight: '500',
    letterSpacing: 1,
  },
<<<<<<< HEAD
=======

>>>>>>> c2cbe41c33815e7b6b5e40c374504cb550233b7c
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
<<<<<<< HEAD
  iconBtn: {
    padding: 2,
  },
  iconText: {},
=======

  iconBtn: {
    padding: 2,
  },

  iconText: {
    fontSize: 18,
  },

>>>>>>> c2cbe41c33815e7b6b5e40c374504cb550233b7c
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#f97316',
    alignItems: 'center',
    justifyContent: 'center',
  },
<<<<<<< HEAD
  avatarText: {
    color: '#fff',
    fontWeight: '800',
  },
=======

  avatarText: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 14,
  },

>>>>>>> c2cbe41c33815e7b6b5e40c374504cb550233b7c
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
<<<<<<< HEAD
=======

>>>>>>> c2cbe41c33815e7b6b5e40c374504cb550233b7c
  menu: {
    position: 'absolute',
    top: 70,
    right: 16,
    width: 240,
<<<<<<< HEAD
    backgroundColor: '#fff',
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 10,
    overflow: 'hidden',
  },
  menuDark: {
    backgroundColor: '#1f2937',
  },
=======

    backgroundColor: '#fff',
    borderRadius: 16,

    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 8,
    },

    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 10,

    overflow: 'hidden',
  },

>>>>>>> c2cbe41c33815e7b6b5e40c374504cb550233b7c
  menuHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
  },
<<<<<<< HEAD
=======

>>>>>>> c2cbe41c33815e7b6b5e40c374504cb550233b7c
  menuAvatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
<<<<<<< HEAD
    backgroundColor: '#f97316',
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuAvatarText: {
    color: '#fff',
    fontWeight: '800',
  },
  menuName: {
    fontWeight: '800',
    color: C.text,
  },
  menuEmail: {
    color: C.muted,
    marginTop: 2,
  },
=======

    backgroundColor: '#f97316',

    alignItems: 'center',
    justifyContent: 'center',
  },

  menuAvatarText: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 16,
  },

  menuName: {
    fontSize: 15,
    fontWeight: '800',
    color: C.text,
  },

  menuEmail: {
    fontSize: 12,
    color: C.muted,
    marginTop: 2,
  },

>>>>>>> c2cbe41c33815e7b6b5e40c374504cb550233b7c
  divider: {
    height: 1,
    backgroundColor: '#F3F4F6',
  },
<<<<<<< HEAD
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
  },
  menuItemIcon: {
    width: 24,
  },
  menuItemText: {
    flex: 1,
    fontWeight: '600',
    color: C.text,
  },
  menuArrow: {
    color: C.muted,
  },
  textWhite: {
    color: '#fff',
  },
=======

  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',

    paddingHorizontal: 16,
    paddingVertical: 14,

    gap: 12,
  },

  menuItemIcon: {
    fontSize: 18,
    width: 24,
  },

  menuItemText: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: C.text,
  },

  menuArrow: {
    fontSize: 18,
    color: C.muted,
  },
>>>>>>> c2cbe41c33815e7b6b5e40c374504cb550233b7c
})