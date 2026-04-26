import { createContext, useContext, useState, useEffect } from 'react'
import AsyncStorage from '@react-native-async-storage/async-storage'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [isLoading,  setIsLoading]  = useState(true)
  const [userId,     setUserId]     = useState(null)
  const [token,      setToken]      = useState(null)

  useEffect(() => {
    const checkToken = async () => {
      try {
        const [storedToken, storedUser] = await Promise.all([
          AsyncStorage.getItem('jwt_token'),
          AsyncStorage.getItem('user'),
        ])

        if (storedToken) {
          setToken(storedToken)
          setIsLoggedIn(true)

          // Pull userId from stored user object if available
          if (storedUser) {
            const parsed = JSON.parse(storedUser)
            setUserId(parsed.id ?? parsed.userId ?? null)
          }
        }
      } catch (e) {
        console.error('[Auth] checkToken error:', e)
        setIsLoggedIn(false)
      } finally {
        setIsLoading(false)
      }
    }
    checkToken()
  }, [])

  // Call this after a successful login API response
  // Pass the JWT string and the user object from your backend
  const login = async (jwtToken, userObject) => {
    try {
      await Promise.all([
        AsyncStorage.setItem('jwt_token', jwtToken),
        AsyncStorage.setItem('user', JSON.stringify(userObject)),
      ])
    } catch (e) {
      console.error('[Auth] login save error:', e)
    }
    setToken(jwtToken)
    setUserId(userObject.id ?? userObject.userId ?? null)
    setIsLoggedIn(true)
  }

  const logout = async () => {
    try {
      await Promise.all([
        AsyncStorage.removeItem('jwt_token'),
        AsyncStorage.removeItem('user'),
      ])
    } catch (e) {
      console.error('[Auth] logout error:', e)
    }
    setToken(null)
    setUserId(null)
    setIsLoggedIn(false)
  }

  return (
    <AuthContext.Provider value={{ isLoggedIn, isLoading, userId, token, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}