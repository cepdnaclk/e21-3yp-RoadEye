import React, {
  createContext,
  useContext,
  useEffect,
  useState,
} from 'react'

import AsyncStorage from '@react-native-async-storage/async-storage'

const AppSettingsContext = createContext(null)

const STORAGE_KEY = 'roadeye_app_settings'

const DEFAULT_SETTINGS = {
  darkMode: false,
  textScale: 1.0,
  voiceGuidance: 'Full navigation voice',
}

export function AppSettingsProvider({ children }) {
  const [darkMode, setDarkModeState] = useState(DEFAULT_SETTINGS.darkMode)
  const [textScale, setTextScaleState] = useState(DEFAULT_SETTINGS.textScale)
  const [voiceGuidance, setVoiceGuidanceState] = useState(
    DEFAULT_SETTINGS.voiceGuidance
  )
  const [isSettingsLoaded, setIsSettingsLoaded] = useState(false)

  useEffect(() => {
    loadSettings()
  }, [])

  const loadSettings = async () => {
    try {
      const saved = await AsyncStorage.getItem(STORAGE_KEY)

      if (saved) {
        const parsed = JSON.parse(saved)

        setDarkModeState(parsed.darkMode ?? DEFAULT_SETTINGS.darkMode)
        setTextScaleState(parsed.textScale ?? DEFAULT_SETTINGS.textScale)
        setVoiceGuidanceState(
          parsed.voiceGuidance ?? DEFAULT_SETTINGS.voiceGuidance
        )
      }
    } catch (e) {
      console.warn('[AppSettings] Failed to load settings:', e)
    } finally {
      setIsSettingsLoaded(true)
    }
  }

  const saveSettings = async (nextSettings) => {
    try {
      await AsyncStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(nextSettings)
      )
    } catch (e) {
      console.warn('[AppSettings] Failed to save settings:', e)
    }
  }

  const updateSettings = async (updates) => {
    const nextSettings = {
      darkMode,
      textScale,
      voiceGuidance,
      ...updates,
    }

    setDarkModeState(nextSettings.darkMode)
    setTextScaleState(nextSettings.textScale)
    setVoiceGuidanceState(nextSettings.voiceGuidance)

    await saveSettings(nextSettings)
  }

  const setDarkMode = (value) => {
    updateSettings({ darkMode: value })
  }

  const setTextScale = (value) => {
    updateSettings({ textScale: value })
  }

  const setVoiceGuidance = (value) => {
    updateSettings({ voiceGuidance: value })
  }

  const resetTextScale = () => {
    updateSettings({ textScale: DEFAULT_SETTINGS.textScale })
  }

  const resetAllSettings = () => {
    updateSettings(DEFAULT_SETTINGS)
  }

  return (
    <AppSettingsContext.Provider
      value={{
        darkMode,
        textScale,
        voiceGuidance,
        isSettingsLoaded,

        setDarkMode,
        setTextScale,
        setVoiceGuidance,
        resetTextScale,
        resetAllSettings,
      }}
    >
      {children}
    </AppSettingsContext.Provider>
  )
}

export function useAppSettings() {
  const context = useContext(AppSettingsContext)

  if (!context) {
    throw new Error(
      'useAppSettings must be used inside AppSettingsProvider'
    )
  }

  return context
}