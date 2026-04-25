// Keep your existing HelmetConnectButton.js, but it MUST be used as:
// <HelmetConnectButton helmet={helmet} />
// This file is unchanged except for a safety fallback if helmet is missing.

import React, { useState } from 'react'
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, Modal, FlatList, StyleSheet, Platform } from 'react-native'
import { HELMET_STATE } from '../../hooks/useHelmetConnection'

function SignalBars({ level }) {
  const heights = [5, 9, 13, 17]
  return <View style={s.signalBars}>{heights.map((h, i) => <View key={i} style={[s.bar, { height: h }, i < level ? s.barActive : s.barInactive]} />)}</View>
}

function LogModal({ visible, log, onClose }) {
  const typeColor = { info: '#a0a8c0', success: '#2ecc71', error: '#e74c3c', data: '#7b8cde' }
  return <Modal visible={visible} transparent animationType="slide"><View style={s.modalOverlay}><View style={s.modalCard}><View style={s.modalHeader}><Text style={s.modalTitle}>Connection Log</Text><TouchableOpacity onPress={onClose}><Text style={s.modalClose}>Close</Text></TouchableOpacity></View><FlatList data={[...(log || [])].reverse()} keyExtractor={(_, i) => String(i)} renderItem={({ item }) => <Text style={[s.logLine, { color: typeColor[item.type] || '#a0a8c0' }]}>{new Date(item.ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}  {item.msg}</Text>} /></View></View></Modal>
}

export default function HelmetConnectButton({ helmet }) {
  const [showLog, setShowLog] = useState(false)
  const [editingIp, setEditingIp] = useState(false)
  const [ipDraft, setIpDraft] = useState('')

  if (!helmet) return null

  const { connectionState, helmetData, error, signal, log, helmetIp, setHelmetIp, connect, disconnect, isConnected, isScanning } = helmet

  const handlePress = () => {
    if (isScanning) return
    if (isConnected) disconnect()
    else connect(helmetIp)
  }

  const cfg = {
    [HELMET_STATE.DISCONNECTED]: { dot: 'rgba(255,255,255,0.4)', label: 'Connect to the helmet', bg: '#4B3FE4' },
    [HELMET_STATE.SCANNING]: { dot: '#fff', label: 'Scanning for helmet...', bg: '#3a30c2' },
    [HELMET_STATE.CONNECTING]: { dot: '#fff', label: 'Connecting...', bg: '#3a30c2' },
    [HELMET_STATE.CONNECTED]: { dot: '#2ecc71', label: 'Connected to the helmet', bg: '#4B3FE4' },
    [HELMET_STATE.ERROR]: { dot: '#e74c3c', label: 'Retry connection', bg: '#c0392b' },
  }[connectionState]

  return <View style={s.wrapper}><View style={s.ipRow}><Text style={s.ipLabel}>Helmet IP</Text>{editingIp ? <TextInput style={s.ipInput} value={ipDraft} onChangeText={setIpDraft} keyboardType="decimal-pad" autoFocus returnKeyType="done" onBlur={() => { if (ipDraft.trim()) setHelmetIp(ipDraft.trim()); setEditingIp(false) }} onSubmitEditing={() => { if (ipDraft.trim()) setHelmetIp(ipDraft.trim()); setEditingIp(false) }} /> : <TouchableOpacity style={s.ipDisplay} onPress={() => { setIpDraft(helmetIp); setEditingIp(true) }}><Text style={s.ipText}>{helmetIp}</Text><Text style={s.ipEdit}>Edit</Text></TouchableOpacity>}</View><TouchableOpacity style={[s.btn, { backgroundColor: cfg.bg }]} onPress={handlePress} onLongPress={() => setShowLog(true)} activeOpacity={0.85} disabled={isScanning}><View style={[s.dot, { backgroundColor: cfg.dot }]} />{isScanning ? <View style={s.scanRow}><ActivityIndicator size="small" color="#fff" style={{ marginRight: 8 }} /><Text style={s.btnLabel}>{cfg.label}</Text></View> : <Text style={s.btnLabel}>{cfg.label}</Text>}{isConnected && <SignalBars level={signal} />}</TouchableOpacity>{connectionState === HELMET_STATE.ERROR && error && <Text style={s.errorText}>{error}</Text>}{isConnected && helmetData && <View style={s.dataStrip}><DataPill label="Speed" value={`${helmetData.speed ?? '-'} km/h`} /><DataPill label="Accel" value={`${helmetData.accel ?? '-'} g`} /><DataPill label="Wear" value={`${helmetData.wearState ?? '-'}`} /></View>}<LogModal visible={showLog} log={log} onClose={() => setShowLog(false)} /></View>
}

function DataPill({ label, value }) { return <View style={s.pill}><Text style={s.pillLabel}>{label}</Text><Text style={s.pillValue}>{value}</Text></View> }

const s = StyleSheet.create({
  wrapper:{ marginVertical:10 }, ipRow:{ flexDirection:'row', alignItems:'center', marginBottom:8, paddingHorizontal:2 }, ipLabel:{ fontSize:12, color:'#8892A4', fontWeight:'600', width:65 }, ipDisplay:{ flexDirection:'row', alignItems:'center', gap:8 }, ipText:{ fontSize:13, fontWeight:'600', color:'#1a1a2e', fontFamily:Platform.OS === 'ios' ? 'Courier' : 'monospace' }, ipEdit:{ fontSize:12, color:'#4B3FE4', fontWeight:'600' }, ipInput:{ flex:1, borderWidth:1.5, borderColor:'#4B3FE4', borderRadius:8, paddingHorizontal:10, paddingVertical:5, fontSize:13, fontFamily:Platform.OS === 'ios' ? 'Courier' : 'monospace', color:'#1a1a2e' }, btn:{ flexDirection:'row', alignItems:'center', justifyContent:'center', borderRadius:50, paddingVertical:15, paddingHorizontal:20, gap:10 }, dot:{ width:9, height:9, borderRadius:5 }, btnLabel:{ color:'#fff', fontWeight:'700', fontSize:15, flex:1, textAlign:'center' }, scanRow:{ flexDirection:'row', alignItems:'center', flex:1, justifyContent:'center' }, errorText:{ color:'#e74c3c', fontSize:12, marginTop:6, textAlign:'center', fontWeight:'500' }, dataStrip:{ flexDirection:'row', gap:8, marginTop:10 }, pill:{ flex:1, backgroundColor:'#fff', borderRadius:12, padding:10, alignItems:'center', shadowColor:'#000', shadowOpacity:0.05, shadowRadius:4, shadowOffset:{ width:0, height:1 }, elevation:1 }, pillLabel:{ fontSize:10, color:'#8892A4', fontWeight:'600', marginBottom:2 }, pillValue:{ fontSize:13, color:'#1a1a2e', fontWeight:'800' }, signalBars:{ flexDirection:'row', alignItems:'flex-end', gap:3, height:20 }, bar:{ width:5, borderRadius:2 }, barActive:{ backgroundColor:'#2ecc71' }, barInactive:{ backgroundColor:'rgba(255,255,255,0.25)' }, modalOverlay:{ flex:1, backgroundColor:'rgba(0,0,0,0.55)', justifyContent:'flex-end' }, modalCard:{ backgroundColor:'#1a1a2e', borderTopLeftRadius:20, borderTopRightRadius:20, maxHeight:'55%', padding:20 }, modalHeader:{ flexDirection:'row', justifyContent:'space-between', alignItems:'center', marginBottom:12 }, modalTitle:{ color:'#fff', fontSize:15, fontWeight:'700' }, modalClose:{ color:'#4B3FE4', fontWeight:'600' }, logLine:{ fontFamily:Platform.OS === 'ios' ? 'Courier' : 'monospace', fontSize:11, lineHeight:20 },
})
