import { createContext, useContext, useState, useEffect } from 'react'
import AsyncStorage from '@react-native-async-storage/async-storage'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [isLoading,  setIsLoading]  = useState(true)

  // On app open — check if already logged in
  useEffect(() => {
    AsyncStorage.getItem('isLoggedIn')
      .then(val => { if (val === 'true') setIsLoggedIn(true) })
      .catch(() => {})
      .finally(() => setIsLoading(false))
  }, [])

  const login = async () => {
    await AsyncStorage.setItem('isLoggedIn', 'true')
    setIsLoggedIn(true)
  }

  const logout = async () => {
    await AsyncStorage.removeItem('isLoggedIn')
    setIsLoggedIn(false)
  }

  return (
    <AuthContext.Provider value={{ isLoggedIn, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}