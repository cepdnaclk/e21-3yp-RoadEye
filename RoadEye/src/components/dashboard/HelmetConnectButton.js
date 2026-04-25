// src/components/dashboard/HelmetConnectButton.js
//
// Changes from original:
//   • onConnectionChange now receives the full HELMET_STATE string on every
//     transition, not just when connected (parent can compare against the
//     imported HELMET_STATE constant).
//   • onDataReceived is called whenever ESP32 sends sensor / IMU / wear data
//     (wired through useHelmetConnection → HelmetUDP callbacks).
//   • DataPill values are pulled from live helmetData fields that HelmetUDP
//     actually receives: forwardAccel (accel), temperature, wearState.
//     Battery is shown as '—' until the ESP32 protocol exposes it.
//   • Everything else (UI, styles, log modal) is identical to the original.

import React, { useState } from 'react'
import {
  View, Text, TouchableOpacity, TextInput,
  StyleSheet, ActivityIndicator, Modal, FlatList, Platform,
} from 'react-native'
import { useHelmetConnection, HELMET_STATE } from '../../hooks/useHelmetConnection'

// ─── Signal strength bars ──────────────────────────────────────────────────────
function SignalBars({ level }) {
  const heights = [6, 10, 14, 18]
  return (
    <View style={styles.signalBars}>
      {heights.map((h, i) => (
        <View
          key={i}
          style={[
            styles.bar,
            { height: h },
            i < level ? styles.barActive : styles.barInactive,
          ]}
        />
      ))}
    </View>
  )
}

// ─── Log item ─────────────────────────────────────────────────────────────────
function LogItem({ item }) {
  const color = {
    info:    '#a0a8c0',
    success: '#2ecc71',
    error:   '#e74c3c',
    data:    '#7b8cde',
  }[item.type] || '#a0a8c0'
  return (
    <Text style={[styles.logLine, { color }]}>
      {new Date(item.ts).toLocaleTimeString([], {
        hour: '2-digit', minute: '2-digit', second: '2-digit',
      })}{'  '}{item.msg}
    </Text>
  )
}

// ─── Main component ────────────────────────────────────────────────────────────
export default function HelmetConnectButton({ onDataReceived, onConnectionChange }) {
  const [showLog,    setShowLog]    = useState(false)
  const [editingIp,  setEditingIp]  = useState(false)
  const [ipDraft,    setIpDraft]    = useState('')

  const {
    connectionState,
    helmetData,
    error,
    signal,
    log,
    helmetIp,
    setHelmetIp,
    connect,
    disconnect,
    isConnected,
    isScanning,
  } = useHelmetConnection()

  // ── Bubble state up to parent on every transition ─────────────────────────
  // Pass the full HELMET_STATE string so parent can import + compare the constant
  React.useEffect(() => {
    onConnectionChange?.(connectionState)
  }, [connectionState])

  // ── Bubble sensor / IMU / wear data up to parent ──────────────────────────
  React.useEffect(() => {
    if (helmetData) onDataReceived?.(helmetData)
  }, [helmetData])

  // ── Button press ──────────────────────────────────────────────────────────
  const handlePress = () => {
    if (isScanning) return
    if (isConnected) {
      disconnect()
    } else {
      connect(helmetIp)
    }
  }

  // ── Button appearance per state ───────────────────────────────────────────
  const buttonConfig = {
    [HELMET_STATE.DISCONNECTED]: {
      dotColor: 'rgba(255,255,255,0.5)',
      label:    'Connect to the helmet',
      bgColor:  '#4B3FE4',
    },
    [HELMET_STATE.SCANNING]: {
      dotColor: '#fff',
      label:    'Scanning for helmet…',
      bgColor:  '#3a30c2',
    },
    [HELMET_STATE.CONNECTING]: {
      dotColor: '#fff',
      label:    'Connecting…',
      bgColor:  '#3a30c2',
    },
    [HELMET_STATE.CONNECTED]: {
      dotColor: '#2ecc71',
      label:    'Connected to the helmet',
      bgColor:  '#4B3FE4',
    },
    [HELMET_STATE.ERROR]: {
      dotColor: '#e74c3c',
      label:    'Retry connection',
      bgColor:  '#c0392b',
    },
  }[connectionState]

  // ── Live data pills — mapped to what ESP32 actually sends ─────────────────
  // PKT_SENSOR_OUT delivers: forwardAccel, roll, temperature, humidity,
  //                          distLeft, distRight, distRear, vibration, isRiding
  // PKT_WEAR_OUT delivers:   wearState ('ACTIVE' | 'IDLE' | 'SLEEPING')
  // Speed comes from GPS telemetry (set in helmetData.speed via NavigationScreen)
  const pillSpeed = helmetData?.speed        != null ? `${helmetData.speed} km/h`                   : '— km/h'
  const pillAccel = helmetData?.forwardAccel != null ? `${helmetData.forwardAccel.toFixed(2)} g`     : '— g'
  const pillTemp  = helmetData?.temperature  != null ? `${helmetData.temperature.toFixed(1)} °C`     : '—'

  return (
    <View style={styles.wrapper}>

      {/* ── IP Address row ──────────────────────────────────────────────── */}
      <View style={styles.ipRow}>
        <Text style={styles.ipLabel}>Helmet IP</Text>

        {editingIp ? (
          <TextInput
            style={styles.ipInput}
            value={ipDraft}
            onChangeText={setIpDraft}
            keyboardType="decimal-pad"
            autoFocus
            onBlur={() => {
              if (ipDraft.trim()) setHelmetIp(ipDraft.trim())
              setEditingIp(false)
            }}
            returnKeyType="done"
            onSubmitEditing={() => {
              if (ipDraft.trim()) setHelmetIp(ipDraft.trim())
              setEditingIp(false)
            }}
          />
        ) : (
          <TouchableOpacity
            onPress={() => { setIpDraft(helmetIp); setEditingIp(true) }}
            style={styles.ipDisplay}
          >
            <Text style={styles.ipText}>{helmetIp}</Text>
            <Text style={styles.ipEdit}>Edit</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* ── Main connect button ──────────────────────────────────────────── */}
      <TouchableOpacity
        style={[styles.connectBtn, { backgroundColor: buttonConfig.bgColor }]}
        onPress={handlePress}
        onLongPress={() => setShowLog(true)}
        activeOpacity={0.85}
        disabled={isScanning}
      >
        <View style={[styles.dot, { backgroundColor: buttonConfig.dotColor }]} />

        {isScanning ? (
          <View style={styles.scanningRow}>
            <ActivityIndicator size="small" color="#fff" style={{ marginRight: 8 }} />
            <Text style={styles.btnLabel}>{buttonConfig.label}</Text>
          </View>
        ) : (
          <Text style={styles.btnLabel}>{buttonConfig.label}</Text>
        )}

        {isConnected && <SignalBars level={signal} />}
      </TouchableOpacity>

      {/* ── Error message ────────────────────────────────────────────────── */}
      {connectionState === HELMET_STATE.ERROR && error && (
        <Text style={styles.errorText}>{error}</Text>
      )}

      {/* ── Connected data strip ─────────────────────────────────────────── */}
      {isConnected && helmetData && (
        <View style={styles.dataStrip}>
          <DataPill label="Speed"  value={pillSpeed} />
          <DataPill label="Accel"  value={pillAccel} />
          <DataPill label="Temp"   value={pillTemp}  />
        </View>
      )}

      {/* ── Wear state label ─────────────────────────────────────────────── */}
      {isConnected && helmetData?.wearState && (
        <View style={styles.wearRow}>
          <View style={[
            styles.wearDot,
            helmetData.wearState === 'ACTIVE'   && styles.wearDotActive,
            helmetData.wearState === 'IDLE'     && styles.wearDotIdle,
            helmetData.wearState === 'SLEEPING' && styles.wearDotSleeping,
          ]} />
          <Text style={styles.wearLabel}>
            Helmet is {helmetData.wearState.toLowerCase()}
          </Text>
        </View>
      )}

      {/* ── Long-press log modal ─────────────────────────────────────────── */}
      <Modal visible={showLog} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Connection Log</Text>
              <TouchableOpacity onPress={() => setShowLog(false)}>
                <Text style={styles.modalClose}>Close</Text>
              </TouchableOpacity>
            </View>
            <FlatList
              data={[...log].reverse()}
              keyExtractor={(_, i) => String(i)}
              renderItem={({ item }) => <LogItem item={item} />}
              style={styles.logList}
            />
          </View>
        </View>
      </Modal>

    </View>
  )
}

// ─── Small data pill ──────────────────────────────────────────────────────────
function DataPill({ label, value }) {
  return (
    <View style={styles.pill}>
      <Text style={styles.pillLabel}>{label}</Text>
      <Text style={styles.pillValue}>{value}</Text>
    </View>
  )
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  wrapper: { marginVertical: 8 },

  // IP row
  ipRow:     { flexDirection: 'row', alignItems: 'center', marginBottom: 8, paddingHorizontal: 4 },
  ipLabel:   { fontSize: 13, color: '#888', fontWeight: '600', marginRight: 10, width: 65 },
  ipDisplay: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  ipText:    { fontSize: 14, fontWeight: '600', color: '#1a1a2e', fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace' },
  ipEdit:    { fontSize: 13, color: '#4B3FE4', fontWeight: '600' },
  ipInput:   { flex: 1, borderWidth: 1.5, borderColor: '#4B3FE4', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6, fontSize: 14, fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace', color: '#1a1a2e' },

  // Connect button
  connectBtn:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderRadius: 50, paddingVertical: 16, paddingHorizontal: 24, gap: 10 },
  dot:         { width: 9, height: 9, borderRadius: 5 },
  btnLabel:    { color: '#fff', fontWeight: '600', fontSize: 15, letterSpacing: 0.2, flex: 1, textAlign: 'center' },
  scanningRow: { flexDirection: 'row', alignItems: 'center', flex: 1, justifyContent: 'center' },

  // Error
  errorText: { color: '#e74c3c', fontSize: 13, marginTop: 8, textAlign: 'center', fontWeight: '500' },

  // Data strip
  dataStrip: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 10, gap: 8 },
  pill:      { flex: 1, backgroundColor: '#fff', borderRadius: 12, padding: 10, alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 6, shadowOffset: { width: 0, height: 2 }, elevation: 2 },
  pillLabel: { fontSize: 11, color: '#999', fontWeight: '600', marginBottom: 3 },
  pillValue: { fontSize: 14, color: '#1a1a2e', fontWeight: '700' },

  // Wear state
  wearRow:         { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8, paddingHorizontal: 4 },
  wearDot:         { width: 8, height: 8, borderRadius: 4, backgroundColor: '#94a3b8' },
  wearDotActive:   { backgroundColor: '#22c55e' },
  wearDotIdle:     { backgroundColor: '#eab308' },
  wearDotSleeping: { backgroundColor: '#6366f1' },
  wearLabel:       { fontSize: 12, color: '#64748b', fontWeight: '500' },

  // Signal bars
  signalBars: { flexDirection: 'row', alignItems: 'flex-end', gap: 3, height: 20, marginLeft: 4 },
  bar:        { width: 5, borderRadius: 2 },
  barActive:  { backgroundColor: '#2ecc71' },
  barInactive:{ backgroundColor: 'rgba(255,255,255,0.3)' },

  // Log modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalCard:    { backgroundColor: '#1a1a2e', borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '60%', padding: 20 },
  modalHeader:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  modalTitle:   { color: '#fff', fontSize: 16, fontWeight: '700' },
  modalClose:   { color: '#4B3FE4', fontWeight: '600' },
  logList:      { flex: 1 },
  logLine:      { fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace', fontSize: 12, lineHeight: 20 },
})