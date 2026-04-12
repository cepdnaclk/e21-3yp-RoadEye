import { useState, useEffect } from 'react'
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, Switch, Alert, Modal, FlatList, TextInput
} from 'react-native'
import * as Contacts from 'expo-contacts'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { colors } from '../utils/theme'

const C = colors

export default function EmergencyPage() {
  const insets = useSafeAreaInsets()

  const [emergencyContacts, setEmergencyContacts] = useState([
    { id: '1', name: 'Mom', phone: '' },
    { id: '2', name: 'Dad', phone: '' },
    { id: '3', name: 'Peachy', phone: '' },
  ])
  const [sendDefault,   setSendDefault]   = useState(true)
  const [sendAlerts,    setSendAlerts]    = useState(true)
  const [showPicker,    setShowPicker]    = useState(false)
  const [allContacts,   setAllContacts]   = useState([])
  const [searchQuery,   setSearchQuery]   = useState('')
  const [loadingConts,  setLoadingConts]  = useState(false)

  // ── Load phone contacts ─────────────────────────────────────────────
  const loadContacts = async () => {
    setLoadingConts(true)
    const { status } = await Contacts.requestPermissionsAsync()
    if (status !== 'granted') {
      Alert.alert('Permission Denied', 'Please allow contacts access to add emergency contacts.')
      setLoadingConts(false)
      return
    }
    const { data } = await Contacts.getContactsAsync({
      fields: [Contacts.Fields.Name, Contacts.Fields.PhoneNumbers],
    })
    const filtered = data
      .filter(c => c.name && c.phoneNumbers?.length > 0)
      .sort((a, b) => a.name.localeCompare(b.name))
    setAllContacts(filtered)
    setLoadingConts(false)
    setShowPicker(true)
  }

  // ── Add contact from phone ──────────────────────────────────────────
  const handleSelectContact = (contact) => {
    if (emergencyContacts.length >= 5) {
      Alert.alert('Limit Reached', 'You can add up to 5 emergency contacts.')
      return
    }
    const already = emergencyContacts.find(c => c.id === contact.id)
    if (already) {
      Alert.alert('Already Added', `${contact.name} is already in your emergency contacts.`)
      return
    }
    const phone = contact.phoneNumbers?.[0]?.number || ''
    setEmergencyContacts([...emergencyContacts, {
      id:    contact.id,
      name:  contact.name,
      phone,
    }])
    setShowPicker(false)
    setSearchQuery('')
  }

  // ── Remove contact ──────────────────────────────────────────────────
  const handleRemoveContact = (id) => {
    Alert.alert(
      'Remove Contact',
      'Remove this emergency contact?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Remove', style: 'destructive', onPress: () =>
          setEmergencyContacts(emergencyContacts.filter(c => c.id !== id))
        },
      ]
    )
  }

  // ── Filtered contacts for search ────────────────────────────────────
  const filteredContacts = allContacts.filter(c =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  // ── Avatar color ────────────────────────────────────────────────────
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

        {/* ── Emergency Details ── */}
        <TouchableOpacity style={styles.actionCard}>
          <Text style={styles.actionCardText}>Emergency Details</Text>
          <Text style={styles.actionCardIcon}>⬇️</Text>
        </TouchableOpacity>

        {/* ── Contacts ── */}
        <View style={styles.card}>
          <View style={styles.cardTitleRow}>
            <Text style={styles.cardIcon}>📞</Text>
            <Text style={styles.cardTitle}>Contacts</Text>
          </View>
          <Text style={styles.cardDesc}>
            You already added these contacts as emergency contacts. When an emergency situation, system will automatically send emergency calls for them
          </Text>

          {/* Contact avatars */}
          <View style={styles.contactsRow}>
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
              </TouchableOpacity>
            ))}

            {/* Add button */}
            <TouchableOpacity onPress={loadContacts} style={styles.contactItem}>
              <View style={styles.addContactBtn}>
                <Text style={styles.addContactIcon}>+</Text>
              </View>
              <Text style={styles.contactName}>Add</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.hintText}>Long press a contact to remove</Text>
        </View>

        {/* ── Emergency Message ── */}
        <View style={styles.card}>
          <View style={styles.cardTitleRow}>
            <Text style={styles.cardIcon}>💬</Text>
            <Text style={styles.cardTitle}>Emergency message</Text>
          </View>

          <View style={styles.switchRow}>
            <Text style={styles.switchLabel}>Send default message</Text>
            <Switch
              value={sendDefault}
              onValueChange={setSendDefault}
              trackColor={{ false: '#E5E7EB', true: C.primary }}
              thumbColor="#fff"
            />
          </View>

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

        <View style={{ height: 20 }} />
      </ScrollView>

      {/* ── Contact Picker Modal ── */}
      <Modal visible={showPicker} animationType="slide" onRequestClose={() => setShowPicker(false)}>
        <View style={[styles.modalScreen, { paddingTop: insets.top }]}>

          {/* Modal header */}
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Select Contact</Text>
            <TouchableOpacity onPress={() => { setShowPicker(false); setSearchQuery('') }}>
              <Text style={styles.modalClose}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* Search */}
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

          {/* Contact list */}
          {loadingConts ? (
            <View style={styles.loadingWrap}>
              <Text style={styles.loadingText}>Loading contacts...</Text>
            </View>
          ) : (
            <FlatList
              data={filteredContacts}
              keyExtractor={item => item.id}
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
              ItemSeparatorComponent={() => <View style={styles.divider} />}
            />
          )}
        </View>
      </Modal>

    </View>
  )
}

const styles = StyleSheet.create({
  screen:           { flex: 1, backgroundColor: '#F5F6FA' },
  scroll:           { paddingHorizontal: 16, paddingBottom: 20 },

  // Header
  header:           { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 14, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#F0F0F5' },
  headerTitle:      { fontSize: 24, fontWeight: '900', color: '#1a1a2e' },
  headerIcons:      { flexDirection: 'row', alignItems: 'center', gap: 10 },
  iconBtn:          { padding: 4 },
  iconText:         { fontSize: 18 },
  avatar:           { width: 34, height: 34, borderRadius: 17, backgroundColor: '#f97316', alignItems: 'center', justifyContent: 'center' },
  avatarText:       { color: '#fff', fontWeight: '800', fontSize: 14 },

  // Action cards
  actionCard:       { backgroundColor: C.primary, borderRadius: 14, padding: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 16 },
  actionCardText:   { color: '#fff', fontSize: 16, fontWeight: '700' },
  actionCardIcon:   { fontSize: 18 },

  // Card
  card:             { backgroundColor: '#fff', borderRadius: 16, padding: 16, marginTop: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 6, elevation: 2 },
  cardTitleRow:     { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  cardIcon:         { fontSize: 20 },
  cardTitle:        { fontSize: 16, fontWeight: '800', color: '#1a1a2e' },
  cardDesc:         { fontSize: 12, color: '#6B7280', lineHeight: 18, marginBottom: 16 },

  // Contacts row
  contactsRow:      { flexDirection: 'row', flexWrap: 'wrap', gap: 16, marginBottom: 8 },
  contactItem:      { alignItems: 'center', width: 56 },
  contactAvatar:    { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  contactAvatarText:{ color: '#fff', fontWeight: '800', fontSize: 18 },
  contactName:      { fontSize: 11, color: '#4B5563', fontWeight: '500', textAlign: 'center' },
  addContactBtn:    { width: 48, height: 48, borderRadius: 24, backgroundColor: '#EDE9FE', alignItems: 'center', justifyContent: 'center', marginBottom: 4, borderWidth: 2, borderColor: '#DDD6FE', borderStyle: 'dashed' },
  addContactIcon:   { fontSize: 24, color: C.primary, fontWeight: '300' },
  hintText:         { fontSize: 10, color: '#9CA3AF', marginTop: 4 },

  // Switch rows
  switchRow:        { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8 },
  switchLabel:      { fontSize: 14, fontWeight: '600', color: '#1a1a2e' },
  divider:          { height: 1, backgroundColor: '#F3F4F6', marginVertical: 4 },

  // Modal
  modalScreen:      { flex: 1, backgroundColor: '#fff' },
  modalHeader:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#F0F0F5' },
  modalTitle:       { fontSize: 20, fontWeight: '800', color: '#1a1a2e' },
  modalClose:       { fontSize: 18, color: '#6B7280', padding: 4 },
  searchWrap:       { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F3F4F8', margin: 16, borderRadius: 12, paddingHorizontal: 12 },
  searchIcon:       { fontSize: 16, marginRight: 8 },
  searchInput:      { flex: 1, paddingVertical: 12, fontSize: 15, color: '#1a1a2e' },
  contactListItem:  { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 12, gap: 14 },
  listAvatar:       { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  listAvatarText:   { color: '#fff', fontWeight: '800', fontSize: 16 },
  listInfo:         { flex: 1 },
  listName:         { fontSize: 15, fontWeight: '700', color: '#1a1a2e' },
  listPhone:        { fontSize: 13, color: '#6B7280', marginTop: 2 },
  loadingWrap:      { flex: 1, alignItems: 'center', justifyContent: 'center' },
  loadingText:      { fontSize: 15, color: '#6B7280' },
})