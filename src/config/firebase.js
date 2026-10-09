import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Configuration loaded from Vite environment variables (.env) with safe fallbacks
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyDnJ0Y2bI09ZLmnPMRtoN2qXyH_9dkG4cc",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "auto-lms-43b1d.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "auto-lms-43b1d",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "auto-lms-43b1d.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "109707658171",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:109707658171:web:a4d20cbf52298eea98ba9e",
};

// Initialize Firebase App
const app = initializeApp(firebaseConfig);

// Initialize Firebase Authentication
export const auth = getAuth(app);

// Configure Google OAuth Provider
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({
  prompt: "select_account",
});

// Initialize Cloud Firestore
export const db = getFirestore(app);

export default app;
