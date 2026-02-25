import { useState } from 'react'
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
} from 'react-native'
import { GoogleIcon, AppleIcon } from './SocialIcons'
import { colors } from '../../utils/theme'

const C = colors

export default function LoginForm({ onLogin, onNavigateSignup }) {
  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [showPw,   setShowPw]   = useState(false)
  const [focused,  setFocused]  = useState('')

  return (
    <View style={styles.container}>
      {/* Heading */}
      <Text style={styles.heading}>Welcome back 👋</Text>

      {/* Email */}
      <Text style={styles.label}>Email</Text>
      <View style={[styles.inputWrap, focused === 'email' && styles.inputWrapFocused]}>
        <TextInput
          style={styles.input}
          placeholder="Enter email"
          placeholderTextColor="#AAAAB8"
          keyboardType="email-address"
          autoCapitalize="none"
          value={email}
          onChangeText={setEmail}
          onFocus={() => setFocused('email')}
          onBlur={() => setFocused('')}
        />
      </View>

      {/* Password */}
      <Text style={[styles.label, { marginTop: 16 }]}>Password</Text>
      <View style={[styles.inputWrap, focused === 'pw' && styles.inputWrapFocused]}>
        <TextInput
          style={[styles.input, { flex: 1 }]}
          placeholder="Enter password"
          placeholderTextColor="#AAAAB8"
          secureTextEntry={!showPw}
          value={password}
          onChangeText={setPassword}
          onFocus={() => setFocused('pw')}
          onBlur={() => setFocused('')}
        />
        <TouchableOpacity onPress={() => setShowPw(!showPw)} style={styles.eyeBtn}>
          <Text style={{ fontSize: 16 }}>{showPw ? '🙈' : '👁️'}</Text>
        </TouchableOpacity>
      </View>

      {/* Forgot */}
      <TouchableOpacity style={styles.forgotWrap}>
        <Text style={styles.forgotText}>Forgot password?</Text>
      </TouchableOpacity>

      {/* Sign In */}
      <TouchableOpacity onPress={onLogin} style={styles.primaryBtn}>
        <Text style={styles.primaryBtnText}>Sign In</Text>
      </TouchableOpacity>

      {/* Divider */}
      <View style={styles.divider}>
        <View style={styles.dividerLine} />
        <Text style={styles.dividerText}>OR LOG IN WITH</Text>
        <View style={styles.dividerLine} />
      </View>

      {/* Social */}
      <View style={styles.socialRow}>
        {[<GoogleIcon />, <AppleIcon />].map((icon, i) => (
          <TouchableOpacity key={i} style={styles.socialBtn}>{icon}</TouchableOpacity>
        ))}
      </View>

      {/* Sign up link */}
      <View style={styles.signupRow}>
        <Text style={styles.signupText}>Don't have an account? </Text>
        <TouchableOpacity onPress={onNavigateSignup}>
          <Text style={styles.signupLink}>Sign up</Text>
        </TouchableOpacity>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container:          { flex: 1, paddingHorizontal: 28, paddingTop: 48 },
  heading:            { fontSize: 36, fontWeight: '800', color: C.text, textAlign: 'center', marginBottom: 52 },
  label:              { fontSize: 13, fontWeight: '600', color: '#4B5563', marginBottom: 6 },
  inputWrap:          { backgroundColor: '#F3F4F8', borderRadius: 14, borderWidth: 2, borderColor: 'transparent', flexDirection: 'row', alignItems: 'center' },
  inputWrapFocused:   { borderColor: C.primary },
  input:              { padding: 14, fontSize: 15, color: C.text },
  eyeBtn:             { paddingHorizontal: 14 },
  forgotWrap:         { alignItems: 'flex-end', marginTop: 8, marginBottom: 32 },
  forgotText:         { color: C.primary, fontSize: 13, fontWeight: '600' },
  primaryBtn:         { backgroundColor: C.primary, borderRadius: 14, padding: 16, alignItems: 'center', shadowColor: C.primary, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.4, shadowRadius: 10, elevation: 6 },
  primaryBtnText:     { color: '#fff', fontSize: 16, fontWeight: '800' },
  divider:            { flexDirection: 'row', alignItems: 'center', gap: 12, marginVertical: 24 },
  dividerLine:        { flex: 1, height: 1, backgroundColor: '#E5E7EB' },
  dividerText:        { fontSize: 11, color: C.muted, fontWeight: '600', letterSpacing: 1 },
  socialRow:          { flexDirection: 'row', justifyContent: 'center', gap: 20 },
  socialBtn:          { width: 56, height: 56, borderRadius: 16, borderWidth: 1.5, borderColor: '#E5E7EB', backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  signupRow:          { flexDirection: 'row', justifyContent: 'center', marginTop: 'auto', paddingBottom: 32, paddingTop: 24 },
  signupText:         { fontSize: 14, color: C.muted },
  signupLink:         { fontSize: 14, color: C.primary, fontWeight: '700' },
})
