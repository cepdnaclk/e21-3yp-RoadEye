import { useState } from 'react'
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, ActivityIndicator, ScrollView,
} from 'react-native'
import { useNavigation } from '@react-navigation/native'
import { useAuth } from '../hooks/useAuth'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

export default function SignupPage() {
  const { login }    = useAuth()
  const navigation   = useNavigation()
  const insets       = useSafeAreaInsets()

  const [username, setUsername] = useState('')
  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [confirm,  setConfirm]  = useState('')
  const [showPw1,  setShowPw1]  = useState(false)
  const [showPw2,  setShowPw2]  = useState(false)
  const [error,    setError]    = useState('')
  const [loading,  setLoading]  = useState(false)
  const [focused,  setFocused]  = useState('')

  const handleSignup = async () => {
    if (!username || !email || !password || !confirm) {
      setError('Please fill in all fields'); return
    }
    if (password !== confirm) {
      setError('Passwords do not match'); return
    }
    setError(''); setLoading(true)
    await new Promise(r => setTimeout(r, 700))
    login()
  }

  const field = (name) => [
    styles.input,
    focused === name && styles.inputFocused,
  ]

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={[styles.container, { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 32 }]}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={styles.title}>Sign up</Text>

      {!!error && (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>⚠️  {error}</Text>
        </View>
      )}

      <Text style={styles.label}>Username</Text>
      <TextInput style={field('username')} placeholder="Enter username" placeholderTextColor="#AAAAB8"
        value={username} onChangeText={setUsername}
        onFocus={() => setFocused('username')} onBlur={() => setFocused('')} />

      <Text style={styles.label}>Email</Text>
      <TextInput style={field('email')} placeholder="Enter email" placeholderTextColor="#AAAAB8"
        keyboardType="email-address" autoCapitalize="none"
        value={email} onChangeText={setEmail}
        onFocus={() => setFocused('email')} onBlur={() => setFocused('')} />

      <Text style={styles.label}>Password</Text>
      <View style={[styles.inputWrap, focused === 'pw1' && styles.inputFocused]}>
        <TextInput style={[styles.input, { flex: 1, borderWidth: 0 }]} placeholder="Enter password" placeholderTextColor="#AAAAB8"
          secureTextEntry={!showPw1} value={password} onChangeText={setPassword}
          onFocus={() => setFocused('pw1')} onBlur={() => setFocused('')} />
        <TouchableOpacity onPress={() => setShowPw1(!showPw1)} style={styles.eyeBtn}>
          <Text>{showPw1 ? '🙈' : '👁️'}</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.label}>Re-enter Password</Text>
      <View style={[styles.inputWrap, focused === 'pw2' && styles.inputFocused]}>
        <TextInput style={[styles.input, { flex: 1, borderWidth: 0 }]} placeholder="Enter password" placeholderTextColor="#AAAAB8"
          secureTextEntry={!showPw2} value={confirm} onChangeText={setConfirm}
          onFocus={() => setFocused('pw2')} onBlur={() => setFocused('')} />
        <TouchableOpacity onPress={() => setShowPw2(!showPw2)} style={styles.eyeBtn}>
          <Text>{showPw2 ? '🙈' : '👁️'}</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity onPress={handleSignup} disabled={loading} style={[styles.btn, loading && styles.btnDisabled]}>
        {loading && <ActivityIndicator color="#fff" style={{ marginRight: 10 }} />}
        <Text style={styles.btnText}>{loading ? 'Creating account...' : 'Create Account'}</Text>
      </TouchableOpacity>

      <View style={styles.loginRow}>
        <Text style={styles.loginText}>Already have an account? </Text>
        <TouchableOpacity onPress={() => navigation.navigate('Login')}>
          <Text style={styles.loginLink}>Log in</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  scroll:       { backgroundColor: '#F8F8FC' },
  container:    { paddingHorizontal: 28 },
  title:        { fontSize: 30, fontWeight: '900', color: '#1a1a2e', textAlign: 'center', marginBottom: 40 },
  label:        { fontSize: 14, fontWeight: '700', color: '#1a1a2e', marginBottom: 8, marginTop: 18 },
  input:        { backgroundColor: '#F0F0F5', borderWidth: 2, borderColor: 'transparent', borderRadius: 14, padding: 15, fontSize: 15, color: '#1a1a2e' },
  inputFocused: { borderColor: '#5B57F5' },
  inputWrap:    { backgroundColor: '#F0F0F5', borderWidth: 2, borderColor: 'transparent', borderRadius: 14, flexDirection: 'row', alignItems: 'center' },
  eyeBtn:       { paddingHorizontal: 14 },
  errorBox:     { backgroundColor: '#FEE2E2', borderWidth: 1, borderColor: '#FCA5A5', borderRadius: 12, padding: 12, marginBottom: 16 },
  errorText:    { color: '#DC2626', fontSize: 13, fontWeight: '600' },
  btn:          { backgroundColor: '#5B57F5', borderRadius: 99, padding: 17, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', marginTop: 40, shadowColor: '#5B57F5', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.4, shadowRadius: 12, elevation: 6 },
  btnDisabled:  { backgroundColor: '#9CA3AF', shadowOpacity: 0 },
  btnText:      { color: '#fff', fontSize: 16, fontWeight: '800' },
  loginRow:     { flexDirection: 'row', justifyContent: 'center', marginTop: 24 },
  loginText:    { fontSize: 14, color: '#8892A4' },
  loginLink:    { fontSize: 14, color: '#5B57F5', fontWeight: '700' },
})
