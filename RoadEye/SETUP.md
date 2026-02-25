# RoadEye – React Native Setup Guide

## Prerequisites
Install these on your machine before starting:

- **Node.js** (v18 or higher) → https://nodejs.org
- **Git** → https://git-scm.com
- **Expo Go app** on your phone → Install from Play Store / App Store

---

## Step 1 — Install Expo CLI globally
```bash
npm install -g expo-cli
```

---

## Step 2 — Place the project files
Copy the `RoadEye/` folder to wherever you keep your projects, e.g.:
```
C:\Projects\RoadEye      (Windows)
~/Projects/RoadEye       (Mac/Linux)
```

---

## Step 3 — Install dependencies
Open a terminal, navigate into the project folder, and run:
```bash
cd RoadEye
npm install
```

---

## Step 4 — Add placeholder assets (required by Expo)
Create an `assets/` folder inside `RoadEye/` and add any PNG images named:
- `icon.png`         (1024×1024 px)
- `splash.png`       (1242×2436 px)
- `adaptive-icon.png` (1024×1024 px)

You can use any placeholder image for now.  
Free tool to generate them: https://www.appicon.co

---

## Step 5 — Start the development server
```bash
npx expo start
```

This will show a **QR code** in your terminal.

---

## Step 6 — Run on your phone
1. Open the **Expo Go** app on your Android or iOS phone
2. Scan the QR code shown in the terminal
3. The RoadEye app will load on your phone instantly ✅

---

## Step 7 — Build an APK (for Android distribution)

### Option A — EAS Build (Recommended, cloud-based, no Android Studio needed)
```bash
# Install EAS CLI
npm install -g eas-cli

# Login to Expo account (create one free at expo.dev)
eas login

# Configure your project
eas build:configure

# Build APK for Android
eas build --platform android --profile preview
```
This uploads your code to Expo's cloud servers and gives you a download link for the APK.

### Option B — Local build (requires Android Studio)
```bash
# Generate the native Android folder
npx expo prebuild

# Open in Android Studio
# File → Open → select the android/ folder
# Then: Build → Build Bundle(s) / APK(s) → Build APK(s)
```

---

## Project File Structure
```
RoadEye/
├── index.js                        ← Entry point
├── app.json                        ← Expo config + permissions
├── package.json                    ← Dependencies
├── babel.config.js
├── assets/                         ← App icons (add manually)
└── src/
    ├── App.jsx                     ← Navigation root
    ├── hooks/
    │   └── useAuth.jsx             ← Auth state
    ├── utils/
    │   └── theme.js                ← Colors
    ├── pages/
    │   ├── LoginPage.jsx
    │   ├── SignupPage.jsx
    │   └── DashboardPage.jsx
    └── components/
        ├── login/
        │   ├── LoginForm.jsx
        │   └── SocialIcons.jsx
        ├── dashboard/
        │   ├── DashboardHeader.jsx
        │   ├── WeatherCard.jsx
        │   ├── MusicPlayer.jsx
        │   ├── StatsChart.jsx
        │   └── BottomNav.jsx
        └── shared/
            ├── StatusBar.jsx
            └── PermissionModal.jsx
```

---

## Key Differences from Your Old Web Code

| Web (Capacitor/React)       | React Native                        |
|-----------------------------|-------------------------------------|
| `<div>`                     | `<View>`                            |
| `<p>`, `<span>`, `<h1>`     | `<Text>`                            |
| `<input>`                   | `<TextInput>`                       |
| `<button>`                  | `<TouchableOpacity>`                |
| CSS `display: grid`         | `flexWrap: 'wrap'`                  |
| `react-router-dom`          | `@react-navigation/native`          |
| `linear-gradient` CSS       | `expo-linear-gradient`              |
| `<svg>`                     | `react-native-svg`                  |
| `navigator.geolocation`     | `expo-location`                     |
| `position: sticky`          | Safe area insets + ScrollView       |

---

## Troubleshooting

**"Module not found" error**
→ Run `npm install` again

**Metro bundler cache issue**
→ Run `npx expo start --clear`

**Expo Go shows blank screen**
→ Check terminal for red error messages and fix them

**Location permission not working on Android**
→ Make sure the `permissions` list in `app.json` is correct and rebuild
