import { useState, useEffect } from 'react'
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, Switch, Alert, Modal, FlatList,
  TextInput, Linking, Platform, ActivityIndicator
} from 'react-native'
import * as Contacts from 'expo-contacts'
import * as SecureStore from 'expo-secure-store'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { colors } from '../utils/theme'

const C = colors

const KEY_CONTACTS = 'emergency_contacts'
const KEY_MESSAGE  = 'emergency_custom_message'

// ─── SecureStore helpers ────────────────────────────────────────────────────
const save = async (key, value) => {
  try {
    const serialized = JSON.stringify(value)
    if (serialized.length > 2000) {
      console.warn(`SecureStore save [${key}]: value too large (${serialized.length} bytes)`)
      return false
    }
    await SecureStore.setItemAsync(key, serialized)
    return true
  } catch (e) {
    console.error(`SecureStore save [${key}]:`, e)
    return false
  }
}

const load = async (key) => {
  try {
    const raw = await SecureStore.getItemAsync(key)
    return raw ? JSON.parse(raw) : null
  } catch (e) {
    console.error(`SecureStore load [${key}]:`, e)
    return null
  }
}

const remove = async (key) => {
  try {
    await SecureStore.deleteItemAsync(key)
  } catch (e) {
    console.error(`SecureStore remove [${key}]:`, e)
  }
}

// ─── Call this from your Login screen after successful login ───────────────
export const requestContactsPermissionOnLogin = async () => {
  try {
    const { status } = await Contacts.requestPermissionsAsync()
    console.log('Contacts permission on login:', status)
    return status === 'granted'
  } catch (e) {
    console.error('requestContactsPermissionOnLogin error:', e)
    return false
  }
}

const avatarColors = ['#4F46E5', '#7C3AED', '#2563EB', '#059669', '#DC2626']

// ─── Props: userName (display name), userInitial (letter for avatar) ────────
export default function EmergencyPage({ userName = 'Alex', userInitial = 'H' }) {
  const insets = useSafeAreaInsets()

  // ── Core state ────────────────────────────────────────────────────────────
  const [emergencyContacts, setEmergencyContacts] = useState([])
  const [sendDefault,       setSendDefault]       = useState(true)
  const [sendAlerts,        setSendAlerts]         = useState(true)
  const [sending,           setSending]            = useState(false)

  // Contact picker modal (phone contacts list)
  const [showPicker,   setShowPicker]   = useState(false)
  const [allContacts,  setAllContacts]  = useState([])
  const [searchQuery,  setSearchQuery]  = useState('')
  const [loadingConts, setLoadingConts] = useState(false)

  // Contact detail bottom sheet (tap a saved contact)
  const [selectedContact,   setSelectedContact]   = useState(null)
  const [showContactDetail, setShowContactDetail] = useState(false)

  // Profile dropdown menu (H avatar)
  const [showProfileMenu, setShowProfileMenu] = useState(false)

  // Section open/close
  const [detailsOpen,  setDetailsOpen]  = useState(true)
  const [contactsOpen, setContactsOpen] = useState(true)
  const [messagesOpen, setMessagesOpen] = useState(true)

  // Message
  const defaultMessage = `🚨 EMERGENCY ALERT!!\n\nYour friend/child ${userName} is in an emergency situation. Please reach him/her immediately.`
  const [isEditingMessage, setIsEditingMessage] = useState(false)
  const [customMessage,    setCustomMessage]    = useState('')
  const [savedMessage,     setSavedMessage]     = useState('')
  const [messageError,     setMessageError]     = useState('')
  const activeMessage = savedMessage || defaultMessage

  // ── Init: request permission + load saved data ────────────────────────────
  useEffect(() => {
    const init = async () => {
      // Ask for contacts permission as soon as page mounts (simulates login-time request)
      try {
        const { status } = await Contacts.requestPermissionsAsync()
        console.log('contacts permission on mount:', status)
      } catch (e) {
        console.error('permission request error:', e)
      }

      // Load persisted emergency contacts & message
      try {
        const [contacts, message] = await Promise.all([
          load(KEY_CONTACTS),
          load(KEY_MESSAGE),
        ])
        if (contacts) setEmergencyContacts(contacts)
        if (message)  setSavedMessage(message)
      } catch (e) {
        console.error('Failed to load persisted data:', e)
      }
    }
    init()
  }, [])

  // ── Open contact picker ───────────────────────────────────────────────────
  const loadContacts = async () => {
    if (emergencyContacts.length >= 5) {
      Alert.alert('Limit Reached', 'You can add up to 5 emergency contacts.')
      return
    }
    setLoadingConts(true)
    console.log('=== loadContacts called ===')
    try {
      const { status, canAskAgain } = await Contacts.requestPermissionsAsync()
      console.log('permission status:', status, '| canAskAgain:', canAskAgain)

      if (status !== 'granted') {
        Alert.alert(
          canAskAgain ? 'Permission Required' : 'Permission Blocked',
          canAskAgain
            ? 'Please allow contacts access to add emergency contacts.'
            : 'Contacts permission was permanently denied. Please enable it in Settings.',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Open Settings', onPress: () => Linking.openSettings() },
          ]
        )
        return
      }

      const { data } = await Contacts.getContactsAsync({
        fields: [Contacts.Fields.Name, Contacts.Fields.PhoneNumbers],
      })
      console.log('total contacts fetched:', data?.length ?? 0)

      const filtered = (data || [])
        .filter(c => c.name && c.phoneNumbers?.length > 0)
        .map((c, i) => ({ ...c, id: c.id ?? `contact_${i}_${Date.now()}` }))
        .sort((a, b) => a.name.localeCompare(b.name))
      console.log('filtered contacts with phone numbers:', filtered.length)

      if (filtered.length === 0) {
        Alert.alert('No Contacts Found', 'No contacts with phone numbers were found on this device.')
        return
      }
      setAllContacts(filtered)
      setShowPicker(true)
    } catch (err) {
      console.error('loadContacts error:', err)
      Alert.alert(
        'Could Not Load Contacts',
        'Please check contacts permission and try again.',
        [
          { text: 'OK', style: 'cancel' },
          { text: 'Open Settings', onPress: () => Linking.openSettings() },
        ]
      )
    } finally {
      setLoadingConts(false)
    }
  }

  // ── Add contact from picker ───────────────────────────────────────────────
  const handleSelectContact = async (contact) => {
    if (emergencyContacts.length >= 5) {
      Alert.alert('Limit Reached', 'You can add up to 5 emergency contacts.')
      return
    }
    const phone = contact.phoneNumbers?.[0]?.number || ''
    const already = emergencyContacts.find(
      c => c.id === contact.id || (phone && c.phone === phone)
    )
    if (already) {
      Alert.alert('Already Added', `${contact.name} is already in your emergency contacts.`)
      return
    }
    const updated = [
      ...emergencyContacts,
      { id: contact.id ?? `${Date.now()}`, name: contact.name, phone },
    ]
    const saved = await save(KEY_CONTACTS, updated)
    if (!saved) {
      Alert.alert('Save Failed', 'Could not save this contact. Please try again.')
      return
    }
    setEmergencyContacts(updated)
    setShowPicker(false)
    setSearchQuery('')
  }

  // ── Tap saved contact → show detail sheet ────────────────────────────────
  const handleViewContact = (contact) => {
    setSelectedContact(contact)
    setShowContactDetail(true)
  }

  // ── Long press / remove ───────────────────────────────────────────────────
  const handleRemoveContact = (id) => {
    Alert.alert('Remove Contact', 'Remove this emergency contact?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          const updated = emergencyContacts.filter(c => c.id !== id)
          setEmergencyContacts(updated)
          const saved = await save(KEY_CONTACTS, updated)
          if (!saved) {
            setEmergencyContacts(emergencyContacts)
            Alert.alert('Error', 'Could not remove contact. Please try again.')
          }
        },
      },
    ])
  }

  // ── Save / reset message ──────────────────────────────────────────────────
  const handleSaveMessage = async () => {
    if (!customMessage.trim()) {
      setMessageError('Message cannot be empty.')
      return
    }
    setMessageError('')
    const msg = customMessage.trim()
    const saved = await save(KEY_MESSAGE, msg)
    if (!saved) {
      Alert.alert('Save Failed', 'Could not save your message. Please try again.')
      return
    }
    setSavedMessage(msg)
    Alert.alert('Saved!', 'Your custom emergency message has been saved.')
    setIsEditingMessage(false)
  }

  const handleResetMessage = () => {
    setSavedMessage('')
    setCustomMessage(defaultMessage)
    setMessageError('')
    remove(KEY_MESSAGE)
    setIsEditingMessage(false)
  }

  // ── Send emergency SMS to all contacts ───────────────────────────────────
  const handleTestSend = async () => {
    const contactsWithPhone = emergencyContacts.filter(c => c.phone?.trim())
    if (emergencyContacts.length === 0) {
      Alert.alert('No Contacts', 'Please add at least one emergency contact first.')
      return
    }
    if (contactsWithPhone.length === 0) {
      Alert.alert('No Phone Numbers', "Your emergency contacts don't have phone numbers.")
      return
    }
    Alert.alert(
      '🚨 Test Emergency Message',
      `This will open SMS for ${contactsWithPhone.length} contact(s):\n\n${contactsWithPhone.map(c => `• ${c.name} (${c.phone})`).join('\n')}\n\nProceed?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Send Now',
          style: 'destructive',
          onPress: async () => {
            setSending(true)
            let successCount = 0
            const failed = []
            try {
              for (const contact of contactsWithPhone) {
                const phone = contact.phone.replace(/\s/g, '')
                const smsUrl = Platform.OS === 'android'
                  ? `smsto:${phone}?body=${encodeURIComponent(activeMessage)}`
                  : `sms:${phone}&body=${encodeURIComponent(activeMessage)}`
                try {
                  await Linking.openURL(smsUrl)
                  successCount++
                  await new Promise(res => setTimeout(res, 1500))
                } catch (linkErr) {
                  console.error(`SMS error for ${contact.name}:`, linkErr)
                  failed.push(contact.name)
                }
              }
            } finally {
              setSending(false)
              if (failed.length === 0) {
                Alert.alert('Done', `SMS opened for ${successCount} contact(s).`)
              } else {
                Alert.alert('Partially Sent', `Sent to ${successCount}.\nFailed: ${failed.join(', ')}`)
              }
            }
          },
        },
      ]
    )
  }

  const filteredContacts = allContacts.filter(c =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>

      {/* ══════════════════════════════════════════════════════
          SHARED HEADER — same across all pages in the app.
          Move this into a shared HeaderBar component and
          import it on every screen for consistent behaviour.
      ══════════════════════════════════════════════════════ */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Emergency</Text>
        <View style={styles.headerIcons}>
          <TouchableOpacity style={styles.iconBtn}>
            <Text style={styles.iconText}>⚙️</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.iconBtn}>
            <Text style={styles.iconText}>🔔</Text>
          </TouchableOpacity>
          {/* Tapping the H avatar opens the profile dropdown */}
          <TouchableOpacity
            style={styles.avatar}
            onPress={() => setShowProfileMenu(true)}
            activeOpacity={0.8}
          >
            <Text style={styles.avatarText}>{userInitial}</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        <TouchableOpacity style={styles.actionCard}>
          <Text style={styles.actionCardText}>Health Info</Text>
          <Text style={styles.actionCardIcon}>➕</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionCard, { marginTop: 10 }]}
          onPress={() => setDetailsOpen(!detailsOpen)}
          activeOpacity={0.85}
        >
          <Text style={styles.actionCardText}>Emergency Details</Text>
          <Text style={styles.actionCardIcon}>{detailsOpen ? '▲' : '▼'}</Text>
        </TouchableOpacity>

        {detailsOpen && (
          <View style={styles.dropdownContent}>

            {/* Contacts */}
            <TouchableOpacity style={styles.subHeader} onPress={() => setContactsOpen(!contactsOpen)} activeOpacity={0.8}>
              <View style={styles.subHeaderLeft}>
                <Text style={styles.subHeaderIcon}>📞</Text>
                <Text style={styles.subHeaderTitle}>Contacts</Text>
              </View>
              <Text style={styles.subHeaderArrow}>{contactsOpen ? '▲' : '▼'}</Text>
            </TouchableOpacity>

            {contactsOpen && (
              <View style={styles.subContent}>
                <Text style={styles.cardDesc}>
                  Add up to 5 emergency contacts. In an emergency, the system will automatically send them a message.
                </Text>

                <View style={styles.contactsRow}>
                  {emergencyContacts.length === 0 && (
                    <Text style={styles.emptyText}>No contacts added yet.</Text>
                  )}

                  {emergencyContacts.map((c, i) => (
                    <TouchableOpacity
                      key={c.id}
                      onPress={() => handleViewContact(c)}
                      onLongPress={() => handleRemoveContact(c.id)}
                      style={styles.contactItem}
                    >
                      <View style={[styles.contactAvatar, { backgroundColor: avatarColors[i % avatarColors.length] }]}>
                        <Text style={styles.contactAvatarText}>{c.name[0].toUpperCase()}</Text>
                      </View>
                      <Text style={styles.contactName} numberOfLines={1}>{c.name}</Text>
                      {c.phone
                        ? <Text style={styles.phoneIndicator}>📱</Text>
                        : <Text style={styles.noPhoneIndicator}>⚠️</Text>
                      }
                    </TouchableOpacity>
                  ))}

                  {/* Add button — hidden once 5 contacts added */}
                  {emergencyContacts.length < 5 && (
                    <TouchableOpacity onPress={loadContacts} style={styles.contactItem} disabled={loadingConts}>
                      <View style={styles.addContactBtn}>
                        {loadingConts
                          ? <ActivityIndicator size="small" color={C.primary} />
                          : <Text style={styles.addContactIcon}>+</Text>
                        }
                      </View>
                      <Text style={styles.contactName}>Add</Text>
                    </TouchableOpacity>
                  )}
                </View>
                <Text style={styles.hintText}>Tap to view • Long press to remove</Text>
              </View>
            )}

            <View style={styles.sectionDivider} />

            {/* Emergency Message */}
            <TouchableOpacity style={styles.subHeader} onPress={() => setMessagesOpen(!messagesOpen)} activeOpacity={0.8}>
              <View style={styles.subHeaderLeft}>
                <Text style={styles.subHeaderIcon}>💬</Text>
                <Text style={styles.subHeaderTitle}>Emergency Message</Text>
              </View>
              <Text style={styles.subHeaderArrow}>{messagesOpen ? '▲' : '▼'}</Text>
            </TouchableOpacity>

            {messagesOpen && (
              <View style={styles.subContent}>
                <View style={styles.switchRow}>
                  <Text style={styles.switchLabel}>Send default message</Text>
                  <Switch
                    value={sendDefault}
                    onValueChange={(val) => { setSendDefault(val); if (!val) setIsEditingMessage(false) }}
                    trackColor={{ false: '#E5E7EB', true: C.primary }}
                    thumbColor="#fff"
                  />
                </View>

                {sendDefault && (
                  <View style={styles.messagePreviewBox}>
                    <View style={styles.msgLabelRow}>
                      <Text style={styles.msgLabelDot}>●</Text>
                      <Text style={styles.messagePreviewLabel}>
                        {savedMessage ? 'Custom message saved' : 'Default message'}
                      </Text>
                    </View>
                    {!isEditingMessage ? (
                      <>
                        <Text style={styles.messagePreviewText}>{activeMessage}</Text>
                        <TouchableOpacity
                          style={styles.editMsgBtn}
                          onPress={() => { setCustomMessage(savedMessage || defaultMessage); setMessageError(''); setIsEditingMessage(true) }}
                        >
                          <Text style={styles.editMsgBtnText}>✏️  Edit Message</Text>
                        </TouchableOpacity>
                      </>
                    ) : (
                      <View style={styles.editMsgArea}>
                        <TextInput
                          style={[styles.msgInput, messageError ? styles.msgInputError : null]}
                          value={customMessage}
                          onChangeText={(text) => { setCustomMessage(text); if (messageError) setMessageError('') }}
                          multiline
                          textAlignVertical="top"
                          placeholderTextColor="#9CA3AF"
                          autoFocus
                        />
                        {messageError ? <Text style={styles.msgErrorText}>{messageError}</Text> : null}
                        <View style={styles.editMsgActions}>
                          <TouchableOpacity style={styles.resetBtn} onPress={handleResetMessage}>
                            <Text style={styles.resetBtnText}>↩ Reset</Text>
                          </TouchableOpacity>
                          <TouchableOpacity style={styles.cancelBtn} onPress={() => { setIsEditingMessage(false); setMessageError('') }}>
                            <Text style={styles.cancelBtnText}>Cancel</Text>
                          </TouchableOpacity>
                          <TouchableOpacity style={styles.saveMsgBtn} onPress={handleSaveMessage}>
                            <Text style={styles.saveMsgBtnText}>💾 Save</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    )}
                  </View>
                )}

                <View style={styles.divider} />

                <View style={styles.switchRow}>
                  <Text style={styles.switchLabel}>Send Emergency Alerts</Text>
                  <Switch
                    value={sendAlerts}
                    onValueChange={setSendAlerts}
                    trackColor={{ false: '#E5E7EB', true: C.primary }}
                    thumbColor="#fff"
                  />
                </View>
              </View>
            )}

          </View>
        )}

        <TouchableOpacity
          style={[styles.testBtn, sending && styles.testBtnDisabled]}
          onPress={handleTestSend}
          disabled={sending}
          activeOpacity={0.85}
        >
          <Text style={styles.testBtnIcon}>🧪</Text>
          <Text style={styles.testBtnText}>{sending ? 'Sending...' : 'Test — Send Emergency Message'}</Text>
        </TouchableOpacity>
        <Text style={styles.testHint}>Temporary test button — remove before production</Text>
        <View style={{ height: 20 }} />
      </ScrollView>

      {/* ══════════════════════════════════════════════════════
          PROFILE DROPDOWN MENU
          Share this logic across all pages via a shared
          HeaderBar component + context/navigation props.
      ══════════════════════════════════════════════════════ */}
      <Modal
        visible={showProfileMenu}
        transparent
        animationType="fade"
        onRequestClose={() => setShowProfileMenu(false)}
      >
        <TouchableOpacity
          style={styles.profileOverlay}
          activeOpacity={1}
          onPress={() => setShowProfileMenu(false)}
        >
          <View style={[styles.profileMenu, { top: insets.top + 60 }]}>
            <View style={styles.profileMenuHeader}>
              <View style={[styles.profileMenuAvatar, { backgroundColor: '#f97316' }]}>
                <Text style={styles.profileMenuAvatarText}>{userInitial}</Text>
              </View>
              <Text style={styles.profileMenuName}>Hirushi</Text>
            </View>

            <View style={styles.profileMenuDivider} />

            <TouchableOpacity
              style={styles.profileMenuItem}
              onPress={() => {
                setShowProfileMenu(false)
                // TODO: navigation.navigate('ChangeProfile')
                Alert.alert('Change Profile', 'Hook up your navigation here.')
              }}
            >
              <Text style={styles.profileMenuItemIcon}>👤</Text>
              <Text style={styles.profileMenuItemText}>Change Profile</Text>
              <Text style={styles.profileMenuItemArrow}>›</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.profileMenuItem}
              onPress={() => {
                setShowProfileMenu(false)
                // TODO: navigation.navigate('Settings')
                Alert.alert('Settings', 'Hook up your navigation here.')
              }}
            >
              <Text style={styles.profileMenuItemIcon}>⚙️</Text>
              <Text style={styles.profileMenuItemText}>Settings</Text>
              <Text style={styles.profileMenuItemArrow}>›</Text>
            </TouchableOpacity>

            <View style={styles.profileMenuDivider} />

            <TouchableOpacity
              style={styles.profileMenuItem}
              onPress={() => {
                setShowProfileMenu(false)
                Alert.alert('Log Out', 'Are you sure you want to log out?', [
                  { text: 'Cancel', style: 'cancel' },
                  {
                    text: 'Log Out',
                    style: 'destructive',
                    onPress: () => {
                      // TODO: Clear auth token and navigate to Login
                      // navigation.reset({ index: 0, routes: [{ name: 'Login' }] })
                    },
                  },
                ])
              }}
            >
              <Text style={styles.profileMenuItemIcon}>🚪</Text>
              <Text style={[styles.profileMenuItemText, { color: '#EF4444' }]}>Log Out</Text>
              <Text style={[styles.profileMenuItemArrow, { color: '#EF4444' }]}>›</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* ══════════════════════════════════════════════════════
          CONTACT DETAIL BOTTOM SHEET
          Shown when user taps a saved contact bubble
      ══════════════════════════════════════════════════════ */}
      <Modal
        visible={showContactDetail}
        transparent
        animationType="slide"
        onRequestClose={() => setShowContactDetail(false)}
      >
        <View style={styles.detailOverlay}>
          <View style={styles.detailSheet}>
            {selectedContact && (() => {
              const idx = emergencyContacts.findIndex(c => c.id === selectedContact.id)
              return (
                <>
                  <View style={[styles.detailAvatar, { backgroundColor: avatarColors[idx % avatarColors.length] }]}>
                    <Text style={styles.detailAvatarText}>{selectedContact.name[0].toUpperCase()}</Text>
                  </View>
                  <Text style={styles.detailName}>{selectedContact.name}</Text>
                  <Text style={styles.detailPhone}>{selectedContact.phone || 'No phone number'}</Text>

                  <View style={styles.detailActions}>
                    <TouchableOpacity
                      style={styles.detailCallBtn}
                      onPress={() => {
                        if (selectedContact.phone) {
                          Linking.openURL(`tel:${selectedContact.phone.replace(/\s/g, '')}`)
                        }
                      }}
                    >
                      <Text style={styles.detailCallBtnText}>📞  Call</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.detailSmsBtn}
                      onPress={() => {
                        if (selectedContact.phone) {
                          const phone = selectedContact.phone.replace(/\s/g, '')
                          const smsUrl = Platform.OS === 'android'
                            ? `smsto:${phone}?body=${encodeURIComponent(activeMessage)}`
                            : `sms:${phone}&body=${encodeURIComponent(activeMessage)}`
                          Linking.openURL(smsUrl)
                        }
                      }}
                    >
                      <Text style={styles.detailSmsBtnText}>💬  SMS</Text>
                    </TouchableOpacity>
                  </View>

                  <TouchableOpacity
                    style={styles.detailRemoveBtn}
                    onPress={() => { setShowContactDetail(false); handleRemoveContact(selectedContact.id) }}
                  >
                    <Text style={styles.detailRemoveBtnText}>🗑  Remove Contact</Text>
                  </TouchableOpacity>

                  <TouchableOpacity style={styles.detailCloseBtn} onPress={() => setShowContactDetail(false)}>
                    <Text style={styles.detailCloseBtnText}>Close</Text>
                  </TouchableOpacity>
                </>
              )
            })()}
          </View>
        </View>
      </Modal>

      {/* ══════════════════════════════════════════════════════
          CONTACT PICKER MODAL
          Phone contacts list with search
      ══════════════════════════════════════════════════════ */}
      <Modal
        visible={showPicker}
        animationType="slide"
        onRequestClose={() => { setShowPicker(false); setSearchQuery('') }}
      >
        <View style={[styles.modalScreen, { paddingTop: insets.top }]}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Select Contact</Text>
            <TouchableOpacity onPress={() => { setShowPicker(false); setSearchQuery('') }}>
              <Text style={styles.modalClose}>✕</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.searchWrap}>
            <Text style={styles.searchIcon}>🔍</Text>
            <TextInput
              style={styles.searchInput}
              placeholder="Search contacts..."
              placeholderTextColor="#AAAAB8"
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoCorrect={false}
            />
          </View>

          <FlatList
            data={filteredContacts}
            keyExtractor={(item, index) => item.id ?? `${index}`}
            renderItem={({ item, index }) => (
              <TouchableOpacity
                style={styles.contactListItem}
                onPress={() => handleSelectContact(item)}
                activeOpacity={0.7}
              >
                <View style={[styles.listAvatar, { backgroundColor: avatarColors[index % avatarColors.length] }]}>
                  <Text style={styles.listAvatarText}>{item.name[0].toUpperCase()}</Text>
                </View>
                <View style={styles.listInfo}>
                  <Text style={styles.listName}>{item.name}</Text>
                  <Text style={styles.listPhone}>{item.phoneNumbers?.[0]?.number || ''}</Text>
                </View>
              </TouchableOpacity>
            )}
            ItemSeparatorComponent={() => <View style={styles.listDivider} />}
            ListEmptyComponent={
              <View style={styles.loadingWrap}>
                <Text style={styles.loadingText}>No contacts found.</Text>
              </View>
            }
          />
        </View>
      </Modal>

    </View>
  )
}

const styles = StyleSheet.create({
  screen:               { flex: 1, backgroundColor: '#F5F6FA' },
  scroll:               { paddingHorizontal: 16, paddingBottom: 20 },

  // Header
  header:               { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 14, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#F0F0F5' },
  headerTitle:          { fontSize: 24, fontWeight: '900', color: '#1a1a2e' },
  headerIcons:          { flexDirection: 'row', alignItems: 'center', gap: 10 },
  iconBtn:              { padding: 4 },
  iconText:             { fontSize: 18 },
  avatar:               { width: 34, height: 34, borderRadius: 17, backgroundColor: '#f97316', alignItems: 'center', justifyContent: 'center' },
  avatarText:           { color: '#fff', fontWeight: '800', fontSize: 14 },

  // Action cards
  actionCard:           { backgroundColor: C.primary, borderRadius: 14, padding: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 16 },
  actionCardText:       { color: '#fff', fontSize: 16, fontWeight: '700' },
  actionCardIcon:       { fontSize: 16, color: '#fff' },

  // Dropdown
  dropdownContent:      { backgroundColor: '#fff', borderRadius: 16, marginTop: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 6, elevation: 2, overflow: 'hidden' },
  subHeader:            { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, backgroundColor: '#fff' },
  subHeaderLeft:        { flexDirection: 'row', alignItems: 'center', gap: 8 },
  subHeaderIcon:        { fontSize: 18 },
  subHeaderTitle:       { fontSize: 15, fontWeight: '800', color: '#1a1a2e' },
  subHeaderArrow:       { fontSize: 12, color: '#8892A4' },
  subContent:           { paddingHorizontal: 16, paddingBottom: 16 },
  sectionDivider:       { height: 1, backgroundColor: '#F0F0F5', marginHorizontal: 16 },
  cardDesc:             { fontSize: 12, color: '#6B7280', lineHeight: 18, marginBottom: 16 },

  // Contacts row
  contactsRow:          { flexDirection: 'row', flexWrap: 'wrap', gap: 16, marginBottom: 8 },
  contactItem:          { alignItems: 'center', width: 56 },
  contactAvatar:        { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  contactAvatarText:    { color: '#fff', fontWeight: '800', fontSize: 18 },
  contactName:          { fontSize: 11, color: '#4B5563', fontWeight: '500', textAlign: 'center' },
  phoneIndicator:       { fontSize: 9, marginTop: 2 },
  noPhoneIndicator:     { fontSize: 9, marginTop: 2 },
  emptyText:            { fontSize: 12, color: '#9CA3AF', fontStyle: 'italic', marginBottom: 12, width: '100%' },
  addContactBtn:        { width: 48, height: 48, borderRadius: 24, backgroundColor: '#EDE9FE', alignItems: 'center', justifyContent: 'center', marginBottom: 4, borderWidth: 2, borderColor: '#DDD6FE', borderStyle: 'dashed' },
  addContactIcon:       { fontSize: 24, color: C.primary, fontWeight: '300' },
  hintText:             { fontSize: 10, color: '#9CA3AF', marginTop: 4 },

  // Switches
  switchRow:            { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10 },
  switchLabel:          { fontSize: 14, fontWeight: '600', color: '#1a1a2e' },
  divider:              { height: 1, backgroundColor: '#F3F4F6', marginVertical: 4 },

  // Message
  messagePreviewBox:    { backgroundColor: '#FFF7ED', borderRadius: 12, padding: 14, marginTop: 2, marginBottom: 10, borderLeftWidth: 3, borderLeftColor: '#F97316' },
  msgLabelRow:          { flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 8 },
  msgLabelDot:          { fontSize: 8, color: '#F97316' },
  messagePreviewLabel:  { fontSize: 10, fontWeight: '700', color: '#F97316', textTransform: 'uppercase', letterSpacing: 0.6 },
  messagePreviewText:   { fontSize: 13, color: '#374151', lineHeight: 20, fontWeight: '500', marginBottom: 10 },
  editMsgBtn:           { alignSelf: 'flex-start', backgroundColor: '#EDE9FE', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  editMsgBtnText:       { fontSize: 12, color: C.primary, fontWeight: '700' },
  editMsgArea:          { marginTop: 4 },
  msgInput:             { backgroundColor: '#fff', borderWidth: 1.5, borderColor: '#DDD6FE', borderRadius: 10, padding: 12, fontSize: 13, color: '#1a1a2e', minHeight: 100, lineHeight: 20 },
  msgInputError:        { borderColor: '#EF4444' },
  msgErrorText:         { fontSize: 11, color: '#EF4444', marginTop: 4 },
  editMsgActions:       { flexDirection: 'row', gap: 8, marginTop: 10, justifyContent: 'flex-end', alignItems: 'center' },
  resetBtn:             { paddingHorizontal: 10, paddingVertical: 7, borderRadius: 8, backgroundColor: '#F3F4F6' },
  resetBtnText:         { fontSize: 12, color: '#6B7280', fontWeight: '600' },
  cancelBtn:            { paddingHorizontal: 10, paddingVertical: 7, borderRadius: 8, backgroundColor: '#F3F4F6' },
  cancelBtnText:        { fontSize: 12, color: '#6B7280', fontWeight: '600' },
  saveMsgBtn:           { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 8, backgroundColor: C.primary },
  saveMsgBtnText:       { fontSize: 12, color: '#fff', fontWeight: '700' },

  // Test button
  testBtn:              { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#1a1a2e', borderRadius: 14, padding: 16, marginTop: 20, borderWidth: 2, borderColor: '#F97316', borderStyle: 'dashed' },
  testBtnDisabled:      { opacity: 0.5 },
  testBtnIcon:          { fontSize: 18 },
  testBtnText:          { color: '#F97316', fontSize: 15, fontWeight: '800' },
  testHint:             { textAlign: 'center', fontSize: 10, color: '#9CA3AF', marginTop: 6 },

  // Profile dropdown
  profileOverlay:       { flex: 1, backgroundColor: 'rgba(0,0,0,0.3)' },
  profileMenu:          { position: 'absolute', right: 16, backgroundColor: '#fff', borderRadius: 16, width: 220, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 12, elevation: 10, overflow: 'hidden' },
  profileMenuHeader:    { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16 },
  profileMenuAvatar:    { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  profileMenuAvatarText:{ color: '#fff', fontWeight: '800', fontSize: 16 },
  profileMenuName:      { fontSize: 16, fontWeight: '800', color: '#1a1a2e' },
  profileMenuDivider:   { height: 1, backgroundColor: '#F3F4F6' },
  profileMenuItem:      { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, gap: 12 },
  profileMenuItemIcon:  { fontSize: 18, width: 24, textAlign: 'center' },
  profileMenuItemText:  { flex: 1, fontSize: 15, fontWeight: '600', color: '#1a1a2e' },
  profileMenuItemArrow: { fontSize: 18, color: '#9CA3AF' },

  // Contact detail sheet
  detailOverlay:        { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  detailSheet:          { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, alignItems: 'center', paddingBottom: 40 },
  detailAvatar:         { width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  detailAvatarText:     { color: '#fff', fontWeight: '900', fontSize: 30 },
  detailName:           { fontSize: 22, fontWeight: '800', color: '#1a1a2e', marginBottom: 4 },
  detailPhone:          { fontSize: 15, color: '#6B7280', marginBottom: 24 },
  detailActions:        { flexDirection: 'row', gap: 12, marginBottom: 16, width: '100%' },
  detailCallBtn:        { flex: 1, backgroundColor: '#EDE9FE', paddingVertical: 12, borderRadius: 12, alignItems: 'center' },
  detailCallBtnText:    { fontSize: 15, fontWeight: '700', color: '#4F46E5' },
  detailSmsBtn:         { flex: 1, backgroundColor: '#FFF7ED', paddingVertical: 12, borderRadius: 12, alignItems: 'center' },
  detailSmsBtnText:     { fontSize: 15, fontWeight: '700', color: '#F97316' },
  detailRemoveBtn:      { width: '100%', paddingVertical: 12, borderRadius: 12, alignItems: 'center', backgroundColor: '#FEF2F2', marginBottom: 8 },
  detailRemoveBtnText:  { fontSize: 15, fontWeight: '700', color: '#EF4444' },
  detailCloseBtn:       { paddingVertical: 10 },
  detailCloseBtnText:   { fontSize: 14, color: '#9CA3AF', fontWeight: '600' },

  // Contact picker modal
  modalScreen:          { flex: 1, backgroundColor: '#fff' },
  modalHeader:          { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#F0F0F5' },
  modalTitle:           { fontSize: 20, fontWeight: '800', color: '#1a1a2e' },
  modalClose:           { fontSize: 18, color: '#6B7280', padding: 4 },
  searchWrap:           { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F3F4F8', margin: 16, borderRadius: 12, paddingHorizontal: 12 },
  searchIcon:           { fontSize: 16, marginRight: 8 },
  searchInput:          { flex: 1, paddingVertical: 12, fontSize: 15, color: '#1a1a2e' },
  contactListItem:      { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 12, gap: 14 },
  listAvatar:           { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  listAvatarText:       { color: '#fff', fontWeight: '800', fontSize: 16 },
  listInfo:             { flex: 1 },
  listName:             { fontSize: 15, fontWeight: '700', color: '#1a1a2e' },
  listPhone:            { fontSize: 13, color: '#6B7280', marginTop: 2 },
  listDivider:          { height: 1, backgroundColor: '#F3F4F6' },
  loadingWrap:          { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 },
  loadingText:          { fontSize: 15, color: '#6B7280' },
})