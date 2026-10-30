import { initializeApp, getApps } from "firebase/app";
import {
  getAuth,
  createUserWithEmailAndPassword,
  signOut,
} from "firebase/auth";

// Secondary Firebase app instance to create student accounts without logging out current Admin
const SECONDARY_APP_NAME = "StudentAccountManagementApp";

const getSecondaryAuth = () => {
  const existingApp = getApps().find((app) => app.name === SECONDARY_APP_NAME);
  const firebaseConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyDnJ0Y2bI09ZLmnPMRtoN2qXyH_9dkG4cc",
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "auto-lms-43b1d.firebaseapp.com",
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "auto-lms-43b1d",
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "auto-lms-43b1d.firebasestorage.app",
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "109707658171",
    appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:109707658171:web:a4d20cbf52298eea98ba9e",
  };
  const secondaryApp = existingApp || initializeApp(firebaseConfig, SECONDARY_APP_NAME);
  return getAuth(secondaryApp);
};

/**
 * Normalizes any login identifier (email, phone number, student code)
 * into a valid Firebase Auth email address.
 * E.g.:
 *  - "student@gmail.com" -> "student@gmail.com"
 *  - "0912 345 678" -> "0912345678@hocvien.local"
 *  - "TO55001HV01" -> "to55001hv01@hocvien.local"
 */
export const normalizeLoginIdentifier = (rawIdentifier) => {
  if (!rawIdentifier) return "";
  const trimmed = rawIdentifier.trim();
  if (trimmed.includes("@")) {
    return trimmed.toLowerCase();
  }
  // Remove spaces, dots, dashes, parentheses
  const cleanId = trimmed.replace(/[\s\.\-\(\)\+]/g, "").toLowerCase();
  return `${cleanId}@hocvien.local`;
};

/**
 * Creates a student authentication account in Firebase Auth
 * using secondary auth app so current admin is never signed out.
 */
export const registerStudentAuthAccount = async (identifier, password) => {
  const email = normalizeLoginIdentifier(identifier);
  const secondaryAuth = getSecondaryAuth();

  try {
    const userCredential = await createUserWithEmailAndPassword(secondaryAuth, email, password);
    const user = userCredential.user;
    await signOut(secondaryAuth);
    return { success: true, email, uid: user.uid, created: true };
  } catch (err) {
    await signOut(secondaryAuth).catch(() => {});
    if (err.code === "auth/email-already-in-use") {
      return { success: true, email, alreadyExisted: true };
    }
    throw err;
  }
};

/**
 * Generates ready-to-share message for students (e.g. via Zalo or SMS)
 */
export const generateLoginShareText = (identifier, password, studentName = "Học viên") => {
  return `Chào ${studentName}! Dưới đây là thông tin đăng nhập Portal Học Viên LMS Thầy Đỗ Tuấn Nam:
🔗 Link đăng nhập: https://dotuannam.github.io/lms-toeic-mrnam/
👤 Tên đăng nhập: ${identifier} (Có thể dùng Số điện thoại hoặc Email)
🔑 Mật khẩu: ${password}

Bạn hãy truy cập link trên, bấm "Đăng Nhập" và điền thông tin để bắt đầu học tập và luyện thi nhé!`;
};
