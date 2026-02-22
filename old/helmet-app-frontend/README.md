# 🏍️ Helmet Companion App

A React + Vite mobile app for the smart cycling helmet companion.

## 📁 Folder Structure

```
helmet-app/
├── index.html
├── package.json
├── vite.config.js
└── src/
    ├── main.jsx              # App entry point
    ├── index.css             # Global reset & fonts
    ├── App.jsx               # Router (Login → Dashboard)
    │
    ├── pages/
    │   ├── LoginPage.jsx     # Login screen
    │   └── DashboardPage.jsx # Main dashboard screen
    │
    ├── components/
    │   ├── shared/
    │   │   ├── Icon.jsx      # Reusable SVG icon
    │   │   └── StatusBar.jsx # Phone status bar
    │   │
    │   ├── login/
    │   │   ├── LoginForm.jsx    # Email/password form
    │   │   └── SocialIcons.jsx  # Google & Apple icons
    │   │
    │   └── dashboard/
    │       ├── DashboardHeader.jsx  # Top header + pills
    │       ├── WeatherCard.jsx      # Weather widget
    │       ├── MusicPlayer.jsx      # Spotify-style player
    │       ├── StatsChart.jsx       # Bar chart (Speed vs Time)
    │       └── BottomNav.jsx        # Bottom navigation bar
    │
    ├── hooks/
    │   └── useAuth.js        # Login / logout state
    │
    └── utils/
        └── theme.js          # Color tokens & fonts
```

## 🚀 Getting Started

```bash
# 1. Install dependencies
npm install

# 2. Start development server
npm run dev

# 3. Open in browser
http://localhost:5173
```

## 🔐 Auth
Currently uses simple in-memory state. To connect a real backend, update `src/hooks/useAuth.js` with your API calls and JWT handling.

## 🛠️ Tech Stack
- React 18
- React Router v6
- Vite
- Plus Jakarta Sans (Google Fonts)


App Opens
    ↓
SplashScreen (3 seconds)
    ↓ checks SharedPreferences
Already logged in? ──YES──→ DashboardScreen
    ↓ NO
LoginScreen
    ↓ enter email + password
AuthService saves to SharedPreferences
    ↓
DashboardScreen