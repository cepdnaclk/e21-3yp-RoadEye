import { useEffect } from 'react'
import { DeviceEventEmitter, Platform } from 'react-native'
import HelmetUDP from '../utils/HelmetUDP'

export default function useNowPlayingToHelmet() {
  useEffect(() => {
    if (Platform.OS !== 'android') return

    const sub = DeviceEventEmitter.addListener('NowPlayingChanged', data => {
      const title = data?.title || 'Unknown Song'
      const artist = data?.artist || 'Unknown Artist'

      console.log('[NowPlaying] Received:', title, artist)

      HelmetUDP.sendMedia({
        progressPct: 0,
        songName: title,
        author: artist,
      })
    })

    return () => sub.remove()
  }, [])
}