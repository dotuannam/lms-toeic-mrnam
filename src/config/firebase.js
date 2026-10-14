import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const isInvalidOrPlaceholder = (val) => {
  if (!val || typeof val !== "string") return true;
  const lower = val.toLowerCase();
  return (
    lower.includes("your") ||
    lower.includes("placeholder") ||
    lower.includes("123456789012") ||
    lower.includes("abcdef123456") ||
    val === "your-app-id" ||
    val.trim() === ""
  );
};

// Official project credentials for auto-lms-43b1d
const OFFICIAL_CONFIG = {
  apiKey: "AIzaSyDnJ0Y2bI09ZLmnPMRtoN2qXyH_9dkG4cc",
  authDomain: "auto-lms-43b1d.firebaseapp.com",
  projectId: "auto-lms-43b1d",
  storageBucket: "auto-lms-43b1d.firebasestorage.app",
  messagingSenderId: "109707658171",
  appId: "1:109707658171:web:a4d20cbf52298eea98ba9e",
};

// Configuration loaded from Vite environment variables (.env) with safe fallbacks
const firebaseConfig = {
  apiKey: !isInvalidOrPlaceholder(import.meta.env.VITE_FIREBASE_API_KEY)
    ? import.meta.env.VITE_FIREBASE_API_KEY
    : OFFICIAL_CONFIG.apiKey,
  authDomain: !isInvalidOrPlaceholder(import.meta.env.VITE_FIREBASE_AUTH_DOMAIN)
    ? import.meta.env.VITE_FIREBASE_AUTH_DOMAIN
    : OFFICIAL_CONFIG.authDomain,
  projectId: !isInvalidOrPlaceholder(import.meta.env.VITE_FIREBASE_PROJECT_ID)
    ? import.meta.env.VITE_FIREBASE_PROJECT_ID
    : OFFICIAL_CONFIG.projectId,
  storageBucket: !isInvalidOrPlaceholder(import.meta.env.VITE_FIREBASE_STORAGE_BUCKET)
    ? import.meta.env.VITE_FIREBASE_STORAGE_BUCKET
    : OFFICIAL_CONFIG.storageBucket,
  messagingSenderId: !isInvalidOrPlaceholder(import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID)
    ? import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID
    : OFFICIAL_CONFIG.messagingSenderId,
  appId: !isInvalidOrPlaceholder(import.meta.env.VITE_FIREBASE_APP_ID)
    ? import.meta.env.VITE_FIREBASE_APP_ID
    : OFFICIAL_CONFIG.appId,
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
