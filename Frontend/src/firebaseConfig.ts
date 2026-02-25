/// <reference types="vite/client" />

import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: "roadeye-73a0c.firebasestorage.app",
  messagingSenderId: "270104159056",
  appId: "1:270104159056:web:f36c9b146678e427a90255",
  measurementId: "G-CH3H2PZT31"
};

const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);

export default app;