import { createContext, useContext, useState, useEffect } from 'react'
import AsyncStorage from '@react-native-async-storage/async-storage'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [isLoading,  setIsLoading]  = useState(true)  // ← App.jsx needs this

  // Check for existing token when app starts
  // This keeps the user logged in after closing and reopening the app
  useEffect(() => {
    const checkToken = async () => {
      try {
        const token = await AsyncStorage.getItem('jwt_token')
        setIsLoggedIn(!!token)
      } catch (e) {
        setIsLoggedIn(false)
      } finally {
        setIsLoading(false)  // ← hides the orange spinner in App.jsx
      }
    }
    checkToken()
  }, [])

  const login = () => {
    setIsLoggedIn(true)   // flip flag → App.jsx swaps to Dashboard automatically
  }

  const logout = async () => {
    try {
      await AsyncStorage.removeItem('jwt_token')
      await AsyncStorage.removeItem('user')
    } catch (e) {
      console.log('Logout error:', e)
    }
    setIsLoggedIn(false)  // flip flag → App.jsx swaps to Login automatically
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