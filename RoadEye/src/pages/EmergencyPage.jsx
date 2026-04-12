import { useState, useEffect } from 'react'
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, Switch, Alert, Modal, FlatList,
  TextInput, Linking, Platform
} from 'react-native'
import * as Contacts from 'expo-contacts'
import * as SecureStore from 'expo-secure-store'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { colors } from '../utils/theme'

const C = colors

const KEY_CONTACTS = 'emergency_contacts'
const KEY_MESSAGE  = 'emergency_custom_message'

// SecureStore has a 2048 byte value limit — store as base64-safe JSON
// FIX: save() now returns a boolean so callers know if it succeeded
const save = async (key, value) => {
  try {
    const serialized = JSON.stringify(value)
    // FIX: guard against exceeding SecureStore's 2048-byte limit
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

export default function EmergencyPage() {
  const insets = useSafeAreaInsets()

  // ── State ───────────────────────────────────────────────────────────
  const [emergencyContacts, setEmergencyContacts] = useState([])
  const [sendDefault,      setSendDefault]      = useState(true)
  const [sendAlerts,       setSendAlerts]        = useState(true)
  const [showPicker,       setShowPicker]        = useState(false)
  const [allContacts,      setAllContacts]       = useState([])
  const [searchQuery,      setSearchQuery]       = useState('')
  const [loadingConts,     setLoadingConts]      = useState(false)
  const [sending,          setSending]           = useState(false)

  // ── Dropdown state ─────────────────────────────────────────────────
  const [detailsOpen,  setDetailsOpen]  = useState(false)
  const [contactsOpen, setContactsOpen] = useState(true)
  const [messagesOpen, setMessagesOpen] = useState(true)

  // ── Emergency message state ─────────────────────────────────────────
  const userName           = 'Alex' // Replace with actual user name
  const [isEditingMessage, setIsEditingMessage] = useState(false)
  const [customMessage,    setCustomMessage]    = useState('')
  const [savedMessage,     setSavedMessage]     = useState('')
  // FIX: track inline warning for empty message save attempt
  const [messageError,     setMessageError]     = useState('')

  const defaultMessage = `🚨 EMERGENCY ALERT!!\n\nYour friend/child ${userName} is in an emergency situation. Please reach him/her immediately.`
  const activeMessage  = savedMessage || defaultMessage

  // ── Load persisted data on mount ────────────────────────────────────
  useEffect(() => {
    const loadPersistedData = async () => {
      try {
        const [contacts, message] = await Promise.all([
          load(KEY_CONTACTS),
          load(KEY_MESSAGE),
        ])
        if (contacts) setEmergencyContacts(contacts)
        if (message)  setSavedMessage(message)
      } catch (e) {
        // Non-fatal — app works fine with empty defaults
        console.error('Failed to load persisted data:', e)
      }
    }
    loadPersistedData()
  }, [])

  // ── Load phone contacts ─────────────────────────────────────────────
  // FIX: entire function wrapped in try/catch/finally so loadingConts
  // always resets, permission denial offers "Open Settings", and API
  // errors show a user-visible message instead of silently hanging.
  const loadContacts = async () => {
    setLoadingConts(true)
    try {
      const { status } = await Contacts.requestPermissionsAsync()
      if (status !== 'granted') {
        Alert.alert(
          'Permission Denied',
          'Please allow contacts access to add emergency contacts.',
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

      if (!data || data.length === 0) {
        Alert.alert('No Contacts', 'No contacts with phone numbers were found on this device.')
        return
      }

      const filtered = data
        .filter(c => c.name && c.phoneNumbers?.length > 0)
        .map((c, i) => ({ ...c, id: c.id ?? `contact_${i}_${Date.now()}` }))
        .sort((a, b) => a.name.localeCompare(b.name))

      setAllContacts(filtered)
      setShowPicker(true)
    } catch (err) {
      console.error('loadContacts error:', err)
      Alert.alert(
        'Could Not Load Contacts',
        'Please check that the app has contacts permission and try again.',
        [
          { text: 'OK', style: 'cancel' },
          { text: 'Open Settings', onPress: () => Linking.openSettings() },
        ]
      )
    } finally {
      // FIX: always resets loading state, even if an error is thrown
      setLoadingConts(false)
    }
  }

  // ── Add contact ─────────────────────────────────────────────────────
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

    // FIX: check if save succeeded before updating UI
    const saved = await save(KEY_CONTACTS, updated)
    if (!saved) {
      Alert.alert('Save Failed', 'Could not save this contact. Your contacts list may be full or storage is unavailable.')
      return
    }

    setEmergencyContacts(updated)
    setShowPicker(false)
    setSearchQuery('')
  }

  // ── Remove contact ───────────────────────────────────────────────────
  const handleRemoveContact = (id) => {
    Alert.alert(
      'Remove Contact',
      'Remove this emergency contact?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            const updated = emergencyContacts.filter(c => c.id !== id)
            setEmergencyContacts(updated)
            // FIX: save after optimistic update; restore on failure
            const saved = await save(KEY_CONTACTS, updated)
            if (!saved) {
              setEmergencyContacts(emergencyContacts) // rollback
              Alert.alert('Error', 'Could not remove contact. Please try again.')
            }
          },
        },
      ]
    )
  }

  // ── Save / reset custom message ─────────────────────────────────────
  const handleSaveMessage = async () => {
    // FIX: show inline warning instead of silently discarding empty input
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

  // ── Send emergency SMS to all contacts via Linking ───────────────────
  const handleTestSend = async () => {
    const contactsWithPhone = emergencyContacts.filter(c => c.phone && c.phone.trim() !== '')

    if (emergencyContacts.length === 0) {
      Alert.alert('No Contacts', 'Please add at least one emergency contact first.')
      return
    }

    if (contactsWithPhone.length === 0) {
      Alert.alert(
        'No Phone Numbers',
        "Your emergency contacts don't have phone numbers. Remove and re-add them from your contact list."
      )
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
                  // FIX: openURL wrapped in its own try/catch — canOpenURL
                  // is unreliable on Android and can return true even when
                  // the URL fails to open.
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
              // FIX: always show outcome, success or partial failure
              if (failed.length === 0) {
                Alert.alert('Done', `SMS opened for ${successCount} contact(s).`)
              } else {
                Alert.alert(
                  'Partially Sent',
                  `Sent to ${successCount} contact(s).\nCould not open SMS for: ${failed.join(', ')}`
                )
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

  const avatarColors = ['#4F46E5', '#7C3AED', '#2563EB', '#059669', '#DC2626']

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>

      {/* ── Header ── */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Emergency</Text>
        <View style={styles.headerIcons}>
          <TouchableOpacity style={styles.iconBtn}>
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

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* ── Health Info ── */}
        <TouchableOpacity style={styles.actionCard}>
          <Text style={styles.actionCardText}>Health Info</Text>
          <Text style={styles.actionCardIcon}>➕</Text>
        </TouchableOpacity>

        {/* ── Emergency Details Dropdown ── */}
        <TouchableOpacity
          style={[styles.actionCard, { marginTop: 10 }]}
          onPress={() => setDetailsOpen(!detailsOpen)}
          activeOpacity={0.85}
        >
          <Text style={styles.actionCardText}>Emergency Details</Text>
          <Text style={styles.actionCardIcon}>{detailsOpen ? '▲' : '▼'}</Text>
        </TouchableOpacity>

        {/* ── Dropdown Content ── */}
        {detailsOpen && (
          <View style={styles.dropdownContent}>

            {/* ── Contacts Section ── */}
            <TouchableOpacity
              style={styles.subHeader}
              onPress={() => setContactsOpen(!contactsOpen)}
              activeOpacity={0.8}
            >
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
                      onLongPress={() => handleRemoveContact(c.id)}
                      style={styles.contactItem}
                    >
                      <View style={[styles.contactAvatar, { backgroundColor: avatarColors[i % avatarColors.length] }]}>
                        <Text style={styles.contactAvatarText}>
                          {c.name[0].toUpperCase()}
                        </Text>
                      </View>
                      <Text style={styles.contactName} numberOfLines={1}>{c.name}</Text>
                      {c.phone
                        ? <Text style={styles.phoneIndicator}>📱</Text>
                        : <Text style={styles.noPhoneIndicator}>⚠️</Text>
                      }
                    </TouchableOpacity>
                  ))}

                  {emergencyContacts.length < 5 && (
                    <TouchableOpacity onPress={loadContacts} style={styles.contactItem}>
                      <View style={styles.addContactBtn}>
                        <Text style={styles.addContactIcon}>+</Text>
                      </View>
                      <Text style={styles.contactName}>Add</Text>
                    </TouchableOpacity>
                  )}
                </View>
                <Text style={styles.hintText}>Long press a contact to remove</Text>
              </View>
            )}

            <View style={styles.sectionDivider} />

            {/* ── Emergency Message Section ── */}
            <TouchableOpacity
              style={styles.subHeader}
              onPress={() => setMessagesOpen(!messagesOpen)}
              activeOpacity={0.8}
            >
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
                    onValueChange={(val) => {
                      setSendDefault(val)
                      if (!val) setIsEditingMessage(false)
                    }}
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
                          onPress={() => {
                            setCustomMessage(savedMessage || defaultMessage)
                            setMessageError('')
                            setIsEditingMessage(true)
                          }}
                        >
                          <Text style={styles.editMsgBtnText}>✏️  Edit Message</Text>
                        </TouchableOpacity>
                      </>
                    ) : (
                      <View style={styles.editMsgArea}>
                        <TextInput
                          style={[styles.msgInput, messageError ? styles.msgInputError : null]}
                          value={customMessage}
                          onChangeText={(text) => {
                            setCustomMessage(text)
                            if (messageError) setMessageError('')
                          }}
                          multiline
                          textAlignVertical="top"
                          placeholderTextColor="#9CA3AF"
                          autoFocus
                        />
                        {/* FIX: inline error instead of silently discarding empty input */}
                        {messageError ? (
                          <Text style={styles.msgErrorText}>{messageError}</Text>
                        ) : null}
                        <View style={styles.editMsgActions}>
                          <TouchableOpacity
                            style={styles.resetBtn}
                            onPress={handleResetMessage}
                          >
                            <Text style={styles.resetBtnText}>↩ Reset</Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={styles.cancelBtn}
                            onPress={() => { setIsEditingMessage(false); setMessageError('') }}
                          >
                            <Text style={styles.cancelBtnText}>Cancel</Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={styles.saveMsgBtn}
                            onPress={handleSaveMessage}
                          >
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

        {/* ── TEST BUTTON ── */}
        <TouchableOpacity
          style={[styles.testBtn, sending && styles.testBtnDisabled]}
          onPress={handleTestSend}
          disabled={sending}
          activeOpacity={0.85}
        >
          <Text style={styles.testBtnIcon}>🧪</Text>
          <Text style={styles.testBtnText}>
            {sending ? 'Sending...' : 'Test — Send Emergency Message'}
          </Text>
        </TouchableOpacity>

        <Text style={styles.testHint}>
          Temporary test button — remove before production
        </Text>

        <View style={{ height: 20 }} />
      </ScrollView>

      {/* ── Contact Picker Modal ── */}
      <Modal visible={showPicker} animationType="slide" onRequestClose={() => setShowPicker(false)}>
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

          {loadingConts ? (
            <View style={styles.loadingWrap}>
              <Text style={styles.loadingText}>Loading contacts...</Text>
            </View>
          ) : (
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
            />
          )}
        </View>
      </Modal>

    </View>
  )
}

const styles = StyleSheet.create({
  screen:              { flex: 1, backgroundColor: '#F5F6FA' },
  scroll:              { paddingHorizontal: 16, paddingBottom: 20 },

  // Header
  header:              { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 14, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#F0F0F5' },
  headerTitle:         { fontSize: 24, fontWeight: '900', color: '#1a1a2e' },
  headerIcons:         { flexDirection: 'row', alignItems: 'center', gap: 10 },
  iconBtn:             { padding: 4 },
  iconText:            { fontSize: 18 },
  avatar:              { width: 34, height: 34, borderRadius: 17, backgroundColor: '#f97316', alignItems: 'center', justifyContent: 'center' },
  avatarText:          { color: '#fff', fontWeight: '800', fontSize: 14 },

  // Action cards
  actionCard:          { backgroundColor: C.primary, borderRadius: 14, padding: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 16 },
  actionCardText:      { color: '#fff', fontSize: 16, fontWeight: '700' },
  actionCardIcon:      { fontSize: 16, color: '#fff' },

  // Dropdown
  dropdownContent:     { backgroundColor: '#fff', borderRadius: 16, marginTop: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 6, elevation: 2, overflow: 'hidden' },
  subHeader:           { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, backgroundColor: '#fff' },
  subHeaderLeft:       { flexDirection: 'row', alignItems: 'center', gap: 8 },
  subHeaderIcon:       { fontSize: 18 },
  subHeaderTitle:      { fontSize: 15, fontWeight: '800', color: '#1a1a2e' },
  subHeaderArrow:      { fontSize: 12, color: '#8892A4' },
  subContent:          { paddingHorizontal: 16, paddingBottom: 16 },
  sectionDivider:      { height: 1, backgroundColor: '#F0F0F5', marginHorizontal: 16 },
  cardDesc:            { fontSize: 12, color: '#6B7280', lineHeight: 18, marginBottom: 16 },

  // Contacts row
  contactsRow:         { flexDirection: 'row', flexWrap: 'wrap', gap: 16, marginBottom: 8 },
  contactItem:         { alignItems: 'center', width: 56 },
  contactAvatar:       { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  contactAvatarText:   { color: '#fff', fontWeight: '800', fontSize: 18 },
  contactName:         { fontSize: 11, color: '#4B5563', fontWeight: '500', textAlign: 'center' },
  phoneIndicator:      { fontSize: 9, marginTop: 2 },
  noPhoneIndicator:    { fontSize: 9, marginTop: 2 },
  emptyText:           { fontSize: 12, color: '#9CA3AF', fontStyle: 'italic', marginBottom: 12, width: '100%' },
  addContactBtn:       { width: 48, height: 48, borderRadius: 24, backgroundColor: '#EDE9FE', alignItems: 'center', justifyContent: 'center', marginBottom: 4, borderWidth: 2, borderColor: '#DDD6FE', borderStyle: 'dashed' },
  addContactIcon:      { fontSize: 24, color: C.primary, fontWeight: '300' },
  hintText:            { fontSize: 10, color: '#9CA3AF', marginTop: 4 },

  // Switch rows
  switchRow:           { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10 },
  switchLabel:         { fontSize: 14, fontWeight: '600', color: '#1a1a2e' },
  divider:             { height: 1, backgroundColor: '#F3F4F6', marginVertical: 4 },

  // Message preview
  messagePreviewBox:   { backgroundColor: '#FFF7ED', borderRadius: 12, padding: 14, marginTop: 2, marginBottom: 10, borderLeftWidth: 3, borderLeftColor: '#F97316' },
  msgLabelRow:         { flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 8 },
  msgLabelDot:         { fontSize: 8, color: '#F97316' },
  messagePreviewLabel: { fontSize: 10, fontWeight: '700', color: '#F97316', textTransform: 'uppercase', letterSpacing: 0.6 },
  messagePreviewText:  { fontSize: 13, color: '#374151', lineHeight: 20, fontWeight: '500', marginBottom: 10 },
  editMsgBtn:          { alignSelf: 'flex-start', backgroundColor: '#EDE9FE', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  editMsgBtnText:      { fontSize: 12, color: C.primary, fontWeight: '700' },
  editMsgArea:         { marginTop: 4 },
  msgInput:            { backgroundColor: '#fff', borderWidth: 1.5, borderColor: '#DDD6FE', borderRadius: 10, padding: 12, fontSize: 13, color: '#1a1a2e', minHeight: 100, lineHeight: 20 },
  msgInputError:       { borderColor: '#EF4444' },
  msgErrorText:        { fontSize: 11, color: '#EF4444', marginTop: 4 },
  editMsgActions:      { flexDirection: 'row', gap: 8, marginTop: 10, justifyContent: 'flex-end', alignItems: 'center' },
  resetBtn:            { paddingHorizontal: 10, paddingVertical: 7, borderRadius: 8, backgroundColor: '#F3F4F6' },
  resetBtnText:        { fontSize: 12, color: '#6B7280', fontWeight: '600' },
  cancelBtn:           { paddingHorizontal: 10, paddingVertical: 7, borderRadius: 8, backgroundColor: '#F3F4F6' },
  cancelBtnText:       { fontSize: 12, color: '#6B7280', fontWeight: '600' },
  saveMsgBtn:          { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 8, backgroundColor: C.primary },
  saveMsgBtnText:      { fontSize: 12, color: '#fff', fontWeight: '700' },

  // Test button
  testBtn:             { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#1a1a2e', borderRadius: 14, padding: 16, marginTop: 20, borderWidth: 2, borderColor: '#F97316', borderStyle: 'dashed' },
  testBtnDisabled:     { opacity: 0.5 },
  testBtnIcon:         { fontSize: 18 },
  testBtnText:         { color: '#F97316', fontSize: 15, fontWeight: '800' },
  testHint:            { textAlign: 'center', fontSize: 10, color: '#9CA3AF', marginTop: 6 },

  // Modal
  modalScreen:         { flex: 1, backgroundColor: '#fff' },
  modalHeader:         { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#F0F0F5' },
  modalTitle:          { fontSize: 20, fontWeight: '800', color: '#1a1a2e' },
  modalClose:          { fontSize: 18, color: '#6B7280', padding: 4 },
  searchWrap:          { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F3F4F8', margin: 16, borderRadius: 12, paddingHorizontal: 12 },
  searchIcon:          { fontSize: 16, marginRight: 8 },
  searchInput:         { flex: 1, paddingVertical: 12, fontSize: 15, color: '#1a1a2e' },
  contactListItem:     { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 12, gap: 14 },
  listAvatar:          { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  listAvatarText:      { color: '#fff', fontWeight: '800', fontSize: 16 },
  listInfo:            { flex: 1 },
  listName:            { fontSize: 15, fontWeight: '700', color: '#1a1a2e' },
  listPhone:           { fontSize: 13, color: '#6B7280', marginTop: 2 },
  listDivider:         { height: 1, backgroundColor: '#F3F4F6' },
  loadingWrap:         { flex: 1, alignItems: 'center', justifyContent: 'center' },
  loadingText:         { fontSize: 15, color: '#6B7280' },
})