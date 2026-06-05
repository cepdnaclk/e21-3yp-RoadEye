import React, { useState } from 'react'
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Image,
  StyleSheet,
  Alert,
} from 'react-native'
import * as ImagePicker from 'expo-image-picker'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { apiMultipart } from '../utils/apiClient'
import { useAppSettings } from '../hooks/useAppSettings'

export default function ChangeProfilePage({ navigation }) {
  const { darkMode, textScale } = useAppSettings()

  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [rePassword, setRePassword] = useState('')
  const [image, setImage] = useState(null)

  const pickImage = () => {
    Alert.alert('Profile Picture', 'Choose image source', [
      { text: 'Camera', onPress: openCamera },
      { text: 'Gallery', onPress: openGallery },
      { text: 'Cancel', style: 'cancel' },
    ])
  }

  const openCamera = async () => {
    const permission = await ImagePicker.requestCameraPermissionsAsync()
    if (!permission.granted) return

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    })

    if (!result.canceled) setImage(result.assets[0].uri)
  }

  const openGallery = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync()
    if (!permission.granted) return

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    })

    if (!result.canceled) setImage(result.assets[0].uri)
  }

  const saveProfile = async () => {
    if (password && password !== rePassword) {
      Alert.alert('Error', 'Passwords do not match')
      return
    }

    try {
      const userId = await AsyncStorage.getItem('userId')

      if (!userId) {
        Alert.alert('Error', 'User ID not found. Please login again.')
        return
      }

      const formData = new FormData()

      if (username.trim()) {
        formData.append('firstName', username.trim())
      }

      if (email.trim()) {
        formData.append('email', email.trim())
      }

      if (password.trim()) {
        formData.append('password', password.trim())
      }

      if (image) {
        formData.append('profileImage', {
          uri: image,
          name: 'profile.jpg',
          type: 'image/jpeg',
        })
      }

      await apiMultipart(`/users/${userId}/profile`, formData, 'PUT')

      Alert.alert('Success', 'Profile updated successfully')
      navigation.goBack()
    } catch (e) {
      console.log(e)
      Alert.alert('Error', e.message || 'Profile update failed')
    }
  }

  return (
    <View style={[styles.container, darkMode && styles.containerDark]}>
      <TouchableOpacity style={styles.imageBox} onPress={pickImage}>
        {image ? (
          <Image source={{ uri: image }} style={styles.profileImage} />
        ) : (
          <Text style={styles.cameraIcon}>📷</Text>
        )}
      </TouchableOpacity>

      <Text style={[styles.label, { fontSize: 16 * textScale }, darkMode && styles.textWhite]}>
        Change User name
      </Text>
      <TextInput
        style={[styles.input, darkMode && styles.inputDark]}
        placeholder="Enter username"
        placeholderTextColor={darkMode ? '#d1d5db' : '#9ca3af'}
        value={username}
        onChangeText={setUsername}
      />

      <Text style={[styles.label, { fontSize: 16 * textScale }, darkMode && styles.textWhite]}>
        Change Email
      </Text>
      <TextInput
        style={[styles.input, darkMode && styles.inputDark]}
        placeholder="Enter email"
        placeholderTextColor={darkMode ? '#d1d5db' : '#9ca3af'}
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
      />

      <Text style={[styles.label, { fontSize: 16 * textScale }, darkMode && styles.textWhite]}>
        Change Password
      </Text>
      <TextInput
        style={[styles.input, darkMode && styles.inputDark]}
        placeholder="Enter password"
        placeholderTextColor={darkMode ? '#d1d5db' : '#9ca3af'}
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />

      <Text style={[styles.label, { fontSize: 16 * textScale }, darkMode && styles.textWhite]}>
        Re enter password
      </Text>
      <TextInput
        style={[styles.input, darkMode && styles.inputDark]}
        placeholder="Enter password"
        placeholderTextColor={darkMode ? '#d1d5db' : '#9ca3af'}
        value={rePassword}
        onChangeText={setRePassword}
        secureTextEntry
      />

      <TouchableOpacity style={styles.saveBtn} onPress={saveProfile}>
        <Text style={[styles.saveText, { fontSize: 16 * textScale }]}>
          Save
        </Text>
      </TouchableOpacity>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    paddingHorizontal: 24,
    paddingTop: 70,
  },

  containerDark: {
    backgroundColor: '#111827',
  },

  imageBox: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: '#e5e7eb',
    alignSelf: 'center',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 35,
  },

  profileImage: {
    width: 90,
    height: 90,
    borderRadius: 45,
  },

  cameraIcon: {
    fontSize: 24,
  },

  label: {
    color: '#374151',
    marginBottom: 6,
  },

  textWhite: {
    color: '#fff',
  },

  input: {
    backgroundColor: '#f1f2f6',
    borderRadius: 22,
    paddingHorizontal: 14,
    height: 68,
    marginBottom: 14,
    color: '#111827',
  },

  inputDark: {
    backgroundColor: '#1f2937',
    color: '#fff',
    borderWidth: 1,
    borderColor: '#374151',
  },

  saveBtn: {
    backgroundColor: '#6846af',
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 35,
  },

  saveText: {
    color: '#fff',
    fontWeight: '700',
  },
})