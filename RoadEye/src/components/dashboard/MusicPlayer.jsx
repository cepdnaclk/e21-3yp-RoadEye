import { useState, useEffect, useRef } from 'react'
import {
  View, Text, TouchableOpacity, StyleSheet,
  Linking, Alert,
} from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import NotificationListener from 'react-native-android-notification-listener'
import * as DocumentPicker from 'expo-document-picker'
import * as FileSystem from 'expo-file-system'
import { WebView } from 'react-native-webview'
import HelmetUDP from '../../utils/HelmetUDP'

// ── Patch HelmetUDP with audio sender ────────────────────────────────────────
if (!HelmetUDP.sendAudio) {
  HelmetUDP.sendAudio = function (pcmChunk) {
    // Bypass _enqueue entirely — it silently pushes to _queue when _ready is
    // false, which happens any time the socket rebinds (navigation, reconnect).
    // Instead, grab the live socket reference directly at send-time.
    const socket = this._socket
    const ip     = this._targetIp
    const port   = this._targetPort
    if (!socket || !ip) {
      console.warn('[sendAudio] skipped — socket or targetIp not ready')
      return
    }

    const frameId = this._nextFrameId()

    // FIX (bug 2): byte[4] was hardcoded to 1 — a leftover from an older
    // protocol draft.  PCLink.h treats byte[4] as reserved and expects 0.
    // A non-zero value caused the parser to misinterpret or misroute the
    // packet on some firmware builds.
    //
    // Header layout (must match PCLink.h exactly):
    //   [0]  0x02          PKT_AUDIO type
    //   [1]  frameId low   sequence number (low byte)
    //   [2]  frameId high  sequence number (high byte)
    //   [3]  0x00          reserved
    //   [4]  0x00          reserved  ← was 1, now correctly 0
    //   [5]  payloadLen    length of PCM data that follows
    const payload = [
      0x02,
      frameId & 0xFF,
      (frameId >> 8) & 0xFF,
      0,
      0,              // FIX: was 1, must be 0 (reserved byte)
      pcmChunk.length,
      ...pcmChunk,
    ]

    // react-native-udp requires a Buffer, not Uint8Array — passing Uint8Array
    // fails silently on some RN versions (zero bytes sent, no error callback).
    const buf = Buffer.from(payload)
    socket.send(buf, 0, buf.length, port, ip, (err) => {
      if (err) console.warn('[sendAudio] UDP send error:', err.message)
    })
  }.bind(HelmetUDP)
}

// ─────────────────────────────────────────────────────────────────────────────
//  AUDIO CONSTANTS — must match AudioDriver.cpp on ESP32
//    .sample_rate = 22050
//    .dma_buf_len = 512
// ─────────────────────────────────────────────────────────────────────────────
const TARGET_SAMPLE_RATE = 22050

// FIX (bug 1): CHUNK_SIZE was 240, which exceeds MAX_CHUNK_PAYLOAD = 220
// defined in PCLinkConstants.js (and mirrored in PCLink.h).
//
// PCLink.cpp guards every incoming audio packet with:
//   if (payloadLen > MAX_CHUNK_PAYLOAD) return;   // MAX_CHUNK_PAYLOAD = 220
//
// Since 240 > 220, every single audio packet was silently dropped on the
// ESP32 before onAudioChunk was ever called.  The phone reported "streaming"
// because UDP send() succeeded — but the ESP32 discarded every packet.
//
// Fix: 200 samples per chunk.
//   200 < 220  → passes the MAX_CHUNK_PAYLOAD guard in PCLink
//   200 < 256  → fits in header byte[5] (uint8) with no truncation
//   200 / 22050 ≈ 9.07 ms per chunk — still fine for real-time streaming
const CHUNK_SIZE       = 200
const MS_PER_CHUNK     = (CHUNK_SIZE / TARGET_SAMPLE_RATE) * 1000
const SEND_HEADROOM_MS = 2

import { getESP32IP } from '../../utils/ESP32Discovery'

// ─────────────────────────────────────────────────────────────────────────────
//  WEBVIEW DECODER HTML
//
//  Injected into a hidden (0px) WebView.
//  Uses the phone OS's native AudioContext.decodeAudioData() to decode
//  MP3 / AAC / M4A / WAV / OGG / FLAC — whatever the OS codec supports.
//
//  Pipeline inside WebView:
//    base64 file  →  ArrayBuffer  →  decodeAudioData  →  Float32 mono
//    →  resample to 22050 Hz  →  convert to uint8 (128=silence)
//    →  post chunks back to React Native
//
//  RN → WebView:  { type:'decode', b64:'...', targetSR:22050, chunkSize:200 }
//  WebView → RN:  { type:'ready' }
//                 { type:'info',  sr, ch, dur }
//                 { type:'chunk', data:[0..255,...] }
//                 { type:'done' }
//                 { type:'error', message:'...' }
// ─────────────────────────────────────────────────────────────────────────────
const DECODER_HTML = `<!DOCTYPE html><html><head><meta charset="utf-8"></head><body><script>
(function(){
  function post(obj){ window.ReactNativeWebView.postMessage(JSON.stringify(obj)); }

  function b64ToAB(b64){
    var bin=atob(b64), bytes=new Uint8Array(bin.length);
    for(var i=0;i<bin.length;i++) bytes[i]=bin.charCodeAt(i);
    return bytes.buffer;
  }

  function resample(samples, srcSR, dstSR){
    if(srcSR===dstSR) return samples;
    var ratio=srcSR/dstSR, outLen=Math.floor(samples.length/ratio);
    var out=new Float32Array(outLen);
    for(var i=0;i<outLen;i++){
      var pos=i*ratio, idx=Math.floor(pos), frac=pos-idx;
      out[i]=(samples[idx]||0)+frac*((samples[idx+1]||0)-(samples[idx]||0));
    }
    return out;
  }

  function onMessage(event){
    var msg; try{ msg=JSON.parse(event.data); }catch(e){ return; }
    if(msg.type==='decode') runDecode(msg.b64, msg.targetSR, msg.chunkSize);
  }
  document.addEventListener('message', onMessage);
  window.addEventListener('message',   onMessage);

  function runDecode(b64, targetSR, chunkSize){
    var ctx;
    try{ ctx=new (window.AudioContext||window.webkitAudioContext)(); }
    catch(e){ post({type:'error',message:'AudioContext unavailable: '+e.message}); return; }

    ctx.decodeAudioData(b64ToAB(b64),
      function(buf){
        var srcSR=buf.sampleRate, numCh=buf.numberOfChannels, dur=buf.duration;
        post({type:'info', sr:srcSR, ch:numCh, dur:dur});

        // Mix to mono
        var len=buf.length, mono=new Float32Array(len);
        for(var ch=0;ch<numCh;ch++){
          var d=buf.getChannelData(ch);
          for(var i=0;i<len;i++) mono[i]+=d[i];
        }
        if(numCh>1) for(var i=0;i<len;i++) mono[i]/=numCh;

        // Resample
        var res=resample(mono, srcSR, targetSR);
        var total=res.length, offset=0;

        // Send chunks back with setTimeout(0) to yield between chunks
        function next(){
          if(offset>=total){ post({type:'done'}); return; }
          var end=Math.min(offset+chunkSize,total);
          var chunk=new Array(end-offset);
          for(var i=offset;i<end;i++){
            var s=res[i]; if(s>1)s=1; if(s<-1)s=-1;
            chunk[i-offset]=(Math.round(s*127)+128)&0xFF;
          }
          post({type:'chunk', data:chunk});
          offset+=chunkSize;
          setTimeout(next,0);
        }
        next();
      },
      function(err){ post({type:'error', message:'decodeAudioData failed: '+(err?err.message||String(err):'unknown')}); }
    );
  }

  post({type:'ready'});
})();
<\/script></body></html>`

export default function MusicPlayer() {
  const [activeTab, setActiveTab]         = useState('spotify')
  const [trackName, setTrackName]         = useState(null)
  const [artist, setArtist]               = useState(null)
  const [isPlaying, setIsPlaying]         = useState(false)
  const [hasPermission, setHasPermission] = useState(false)

  const [shareFile, setShareFile]         = useState(null)
  const [shareStatus, setShareStatus]     = useState('idle')
  const [shareProgress, setShareProgress] = useState(0)
  const [shareInfo, setShareInfo]         = useState('')

  const webViewRef       = useRef(null)
  const webViewReady     = useRef(false)
  const streamingRef     = useRef(false)
  const chunksReceived   = useRef(0)
  const totalChunksRef   = useRef(0)
  const pendingDecodeRef = useRef(null)

  useEffect(() => { checkPermission() }, [])

  useEffect(() => {
    if (!hasPermission || !NotificationListener) return
    const sub = NotificationListener.addListener((notification) => {
      if (notification?.app === 'com.spotify.music') {
        const track = notification.title || null
        const art   = notification.text  || null
        setTrackName(track)
        setArtist(art)
        setIsPlaying(true)
        sendTrackToESP32(track, art)
      }
    })
    return () => { try { sub?.remove() } catch (e) {} }
  }, [hasPermission])

  const sendTrackToESP32 = async (track, art) => {
    const ip = getESP32IP()
    if (!ip) return
    try {
      await fetch(`http://${ip}/track`, {   // ✅ dynamic IP
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ track: track ?? '', artist: art ?? '' }),
      })
    } catch (e) { console.warn('ESP32 send failed:', e.message) }
  }

  const checkPermission = async () => {
    try {
      if (!NotificationListener) return
      const status = await NotificationListener.getPermissionStatus()
      const granted = status === 'authorized'
      setHasPermission(granted)
      if (!granted) {
        Alert.alert('Permission Required',
          'Allow RoadEye to read notifications to show Spotify.',
          [
            { text: 'Allow', onPress: () => NotificationListener.requestPermission() },
            { text: 'Cancel' }
          ]
        )
      }
    } catch (e) { console.log('Permission check error:', e) }
  }

  const openApp = async (url, fallback) => {
    try {
      const canOpen = await Linking.canOpenURL(url)
      await Linking.openURL(canOpen ? url : fallback)
    } catch (e) { await Linking.openURL(fallback) }
  }

  // ── WebView message handler ───────────────────────────────────────────────
  const onWebViewMessage = (event) => {
    let msg
    try { msg = JSON.parse(event.nativeEvent.data) } catch (e) { return }

    switch (msg.type) {

      case 'ready':
        webViewReady.current = true
        if (pendingDecodeRef.current) {
          webViewRef.current?.postMessage(JSON.stringify(pendingDecodeRef.current))
          pendingDecodeRef.current = null
        }
        break

      case 'info':
        setShareInfo(`${msg.sr} Hz • ${msg.ch}ch • ${msg.dur.toFixed(1)}s`)
        totalChunksRef.current = Math.ceil((msg.dur * TARGET_SAMPLE_RATE) / CHUNK_SIZE)
        chunksReceived.current = 0
        streamingRef.current   = true
        setShareStatus('streaming')
        break

      case 'chunk':
        if (!streamingRef.current) break
        {
          const idx   = chunksReceived.current++
          const delay = idx * (MS_PER_CHUNK - SEND_HEADROOM_MS)
          setTimeout(() => {
            if (streamingRef.current) HelmetUDP.sendAudio(msg.data)
          }, delay)

          const prog = totalChunksRef.current > 0
            ? Math.min(chunksReceived.current / totalChunksRef.current, 1)
            : 0
          setShareProgress(prog)
        }
        break

      case 'done':
        setTimeout(() => {
          if (streamingRef.current) {
            streamingRef.current = false
            setShareStatus('done')
            setShareProgress(1)
          }
        }, MS_PER_CHUNK * 3)
        break

      case 'error':
        console.error('[AudioDecoder]', msg.message)
        streamingRef.current = false
        setShareStatus('error')
        Alert.alert(
          'Decode failed',
          msg.message + '\n\nTry MP3 or WAV format.'
        )
        break
    }
  }

  // ── Pick file → read as base64 → send to WebView decoder ─────────────────
  const pickAndStream = async () => {
    try {
      streamingRef.current = false
      setShareProgress(0)
      setShareInfo('')

      const result = await DocumentPicker.getDocumentAsync({
        type: 'audio/*',
        copyToCacheDirectory: true,
      })
      if (result.canceled) return

      const asset = result.assets[0]
      setShareFile({ name: asset.name })
      setShareStatus('converting')

      const fileInfo = await FileSystem.getInfoAsync(asset.uri)
      if (!fileInfo.exists) {
        setShareStatus('error')
        Alert.alert('Error', 'File not found.')
        return
      }

      const b64 = await FileSystem.readAsStringAsync(asset.uri, {
        encoding: FileSystem.EncodingType.Base64,
      })

      const decodeMsg = {
        type:      'decode',
        b64,
        targetSR:  TARGET_SAMPLE_RATE,
        chunkSize: CHUNK_SIZE,
      }

      if (webViewReady.current && webViewRef.current) {
        webViewRef.current.postMessage(JSON.stringify(decodeMsg))
      } else {
        pendingDecodeRef.current = decodeMsg
      }

    } catch (e) {
      console.error('pickAndStream error:', e)
      setShareStatus('error')
      Alert.alert('Error', e.message)
    }
  }

  const stopStream = () => {
    streamingRef.current = false
    setShareStatus('idle')
    setShareProgress(0)
    setShareInfo('')
  }

  // ── UI ────────────────────────────────────────────────────────────────────
  const STATUS_COLOR = {
    idle:       '#9ca3af',
    converting: '#f59e0b',
    streaming:  '#1DB954',
    done:       '#60a5fa',
    error:      '#ef4444',
  }
  const STATUS_LABEL = {
    idle:       'Pick any audio file to stream',
    converting: '⏳ Reading file…',
    streaming:  '● Streaming to helmet…',
    done:       '✓ Done',
    error:      '✗ Error — try again',
  }

  const apps = {
    spotify: { url: 'spotify://',            fallback: 'https://play.google.com/store/apps/details?id=com.spotify.music', color: '#1DB954', name: 'Spotify' },
    youtube: { url: 'vnd.youtube.music://',  fallback: 'https://music.youtube.com',  color: '#FF0000', name: 'YT Music' },
    apple:   { url: 'music://',              fallback: 'https://music.apple.com',     color: '#fc3c44', name: 'Apple Music' },
  }

  const NowPlayingCard = ({ app }) => (
    <View style={styles.nowPlaying}>
      <LinearGradient colors={[app.color, '#191414']} style={styles.albumArt}>
        <Text style={styles.albumIcon}>🎵</Text>
      </LinearGradient>
      <View style={styles.trackInfo}>
        <Text style={styles.trackName} numberOfLines={1}>
          {activeTab === 'spotify' && trackName ? trackName : `Open ${app.name}`}
        </Text>
        <Text style={styles.artistName} numberOfLines={1}>
          {activeTab === 'spotify' && artist ? artist : 'Tap to launch'}
        </Text>
      </View>
      <View style={styles.progressBg}>
        <View style={[styles.progressFill, { width: isPlaying ? '45%' : '0%', backgroundColor: app.color }]} />
      </View>
      <View style={styles.controls}>
        <TouchableOpacity style={styles.ctrlBtn} onPress={() => openApp(app.url, app.fallback)}>
          <Text style={styles.ctrlIcon}>⏮</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.playBtn, { backgroundColor: app.color }]} onPress={() => openApp(app.url, app.fallback)}>
          <Text style={styles.playIcon}>{isPlaying && activeTab === 'spotify' ? '⏸' : '▶'}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.ctrlBtn} onPress={() => openApp(app.url, app.fallback)}>
          <Text style={styles.ctrlIcon}>⏭</Text>
        </TouchableOpacity>
      </View>
      <TouchableOpacity style={[styles.openBtn, { backgroundColor: app.color }]} onPress={() => openApp(app.url, app.fallback)}>
        <Text style={styles.openBtnText}>Open {app.name} →</Text>
      </TouchableOpacity>
    </View>
  )

  return (
    <LinearGradient
      colors={['#2d2d2d', '#1a1a2e']}
      start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
      style={styles.card}
    >
      <WebView
        ref={webViewRef}
        source={{ html: DECODER_HTML }}
        style={styles.hiddenWebView}
        onMessage={onWebViewMessage}
        javaScriptEnabled={true}
        originWhitelist={['*']}
        allowFileAccess={true}
        allowUniversalAccessFromFileURLs={true}
        mixedContentMode="always"
        onError={(e) => console.error('[WebView]', e.nativeEvent)}
      />

      <View style={styles.header}>
        <Text style={styles.title}>🎧 Music Player</Text>
        <View style={styles.helmetBadge}>
          <Text style={styles.helmetText}>Helmet Module</Text>
        </View>
      </View>

      <View style={styles.tabBar}>
        {['spotify', 'youtube', 'apple'].map(tab => (
          <TouchableOpacity
            key={tab}
            style={[styles.tab, activeTab === tab && styles.tabActive]}
            onPress={() => setActiveTab(tab)}
          >
            <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
              {apps[tab].name}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <NowPlayingCard app={apps[activeTab]} />

      <View style={styles.divider} />

      <View style={styles.shareSection}>
        <Text style={styles.shareTitle}>📡  Share to Helmet</Text>
        <Text style={styles.shareTip}>
          🎵 MP3 · AAC · M4A · WAV · OGG — decoded on device, no PC needed
        </Text>

        {shareFile && (
          <Text style={styles.shareFileName} numberOfLines={1}>
            {shareFile.name}
          </Text>
        )}

        {shareInfo !== '' && (
          <Text style={styles.shareInfoText}>{shareInfo}</Text>
        )}

        <Text style={[styles.shareStatusText, { color: STATUS_COLOR[shareStatus] }]}>
          {STATUS_LABEL[shareStatus]}
        </Text>

        {(shareStatus === 'converting' || shareStatus === 'streaming') && (
          <View style={styles.sharePbBg}>
            <View style={[
              styles.sharePbFill,
              {
                width: shareStatus === 'converting'
                  ? '15%'
                  : `${(shareProgress * 100).toFixed(0)}%`,
                backgroundColor: shareStatus === 'converting' ? '#f59e0b' : '#1DB954',
                opacity: shareStatus === 'converting' ? 0.8 : 1,
              }
            ]} />
          </View>
        )}

        {shareStatus === 'streaming' && (
          <Text style={styles.shareProgressPct}>
            {(shareProgress * 100).toFixed(0)}%
          </Text>
        )}

        <View style={styles.shareButtons}>
          <TouchableOpacity
            style={[
              styles.sharePickBtn,
              (shareStatus === 'converting' || shareStatus === 'streaming') && styles.sharePickBtnDisabled,
            ]}
            onPress={pickAndStream}
            disabled={shareStatus === 'converting' || shareStatus === 'streaming'}
          >
            <Text style={styles.sharePickText}>
              {shareStatus === 'converting' ? '⏳ Decoding…'
               : shareStatus === 'streaming' ? '● Streaming…'
               : '📂  Pick Audio & Stream'}
            </Text>
          </TouchableOpacity>

          {shareStatus === 'streaming' && (
            <TouchableOpacity style={styles.shareStopBtn} onPress={stopStream}>
              <Text style={styles.shareStopText}>⏹</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </LinearGradient>
  )
}

const styles = StyleSheet.create({
  hiddenWebView:        { height: 0, width: 0, position: 'absolute', opacity: 0 },
  card:                 { borderRadius: 16, padding: 16, marginBottom: 10, elevation: 6 },
  header:               { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  title:                { fontSize: 16, fontWeight: '800', color: '#fff' },
  helmetBadge:          { backgroundColor: '#4F46E5', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 },
  helmetText:           { fontSize: 10, fontWeight: '700', color: '#fff' },
  tabBar:               { flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 10, padding: 3, marginBottom: 16 },
  tab:                  { flex: 1, paddingVertical: 7, alignItems: 'center', borderRadius: 8 },
  tabActive:            { backgroundColor: 'rgba(255,255,255,0.2)' },
  tabText:              { fontSize: 11, color: '#9ca3af', fontWeight: '600' },
  tabTextActive:        { color: '#fff' },
  nowPlaying:           { alignItems: 'center' },
  albumArt:             { width: 80, height: 80, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  albumIcon:            { fontSize: 32 },
  trackInfo:            { alignItems: 'center', marginBottom: 12, width: '100%' },
  trackName:            { fontSize: 16, fontWeight: '800', color: '#fff', marginBottom: 4 },
  artistName:           { fontSize: 12, color: '#9ca3af' },
  progressBg:           { width: '100%', backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 99, height: 3, marginBottom: 16 },
  progressFill:         { height: '100%', borderRadius: 99 },
  controls:             { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 24, marginBottom: 16 },
  ctrlBtn:              { backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 18, width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  ctrlIcon:             { fontSize: 14, color: '#fff' },
  playBtn:              { borderRadius: 22, width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  playIcon:             { fontSize: 16, color: '#fff' },
  openBtn:              { paddingHorizontal: 24, paddingVertical: 10, borderRadius: 25, marginTop: 4 },
  openBtnText:          { color: '#fff', fontWeight: '700', fontSize: 13 },
  divider:              { height: 1, backgroundColor: 'rgba(255,255,255,0.1)', marginVertical: 16 },
  shareSection:         { gap: 8 },
  shareTitle:           { fontSize: 13, fontWeight: '700', color: '#fff' },
  shareTip:             { fontSize: 10, color: '#6b7280', fontStyle: 'italic' },
  shareFileName:        { fontSize: 11, color: '#d1d5db', backgroundColor: 'rgba(255,255,255,0.07)', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4 },
  shareInfoText:        { fontSize: 10, color: '#a3e635', fontWeight: '600' },
  shareStatusText:      { fontSize: 11 },
  sharePbBg:            { width: '100%', height: 3, backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 99 },
  sharePbFill:          { height: '100%', borderRadius: 99 },
  shareProgressPct:     { fontSize: 10, color: '#1DB954', fontWeight: '700', textAlign: 'right' },
  shareButtons:         { flexDirection: 'row', gap: 10, marginTop: 4 },
  sharePickBtn:         { flex: 1, backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: 10, paddingVertical: 10, alignItems: 'center' },
  sharePickBtnDisabled: { opacity: 0.5 },
  sharePickText:        { color: '#fff', fontWeight: '600', fontSize: 12 },
  shareStopBtn:         { backgroundColor: 'rgba(239,68,68,0.2)', borderRadius: 10, paddingHorizontal: 16, alignItems: 'center', justifyContent: 'center' },
  shareStopText:        { color: '#ef4444', fontSize: 16 },
})