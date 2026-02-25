// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyAwshmnuU0ft4PXAm_D8nWANKS_zVNOEyg",
  authDomain: "roadeye-73a0c.firebaseapp.com",
  projectId: "roadeye-73a0c",
  storageBucket: "roadeye-73a0c.firebasestorage.app",
  messagingSenderId: "270104159056",
  appId: "1:270104159056:web:f36c9b146678e427a90255",
  measurementId: "G-CH3H2PZT31"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);