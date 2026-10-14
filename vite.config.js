import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Clean dummy placeholders from process.env so Vite doesn't inject invalid keys
[
  "VITE_FIREBASE_API_KEY",
  "VITE_FIREBASE_AUTH_DOMAIN",
  "VITE_FIREBASE_PROJECT_ID",
  "VITE_FIREBASE_STORAGE_BUCKET",
  "VITE_FIREBASE_MESSAGING_SENDER_ID",
  "VITE_FIREBASE_APP_ID",
  "VITE_GAS_API_URL",
  "VITE_GAS_API_SECRET",
].forEach((key) => {
  const val = process.env[key];
  if (
    val &&
    (val.includes("YOUR") ||
      val.includes("your-app") ||
      val.includes("123456789012") ||
      val.includes("abcdef123456") ||
      val === "your-app-id")
  ) {
    delete process.env[key];
  }
});

export default defineConfig({
  base: "./",
  plugins: [react()],
  define: {
    "import.meta.env.VITE_FIREBASE_API_KEY": JSON.stringify(
      "AIzaSyDnJ0Y2bI09ZLmnPMRtoN2qXyH_9dkG4cc"
    ),
    "import.meta.env.VITE_FIREBASE_AUTH_DOMAIN": JSON.stringify(
      "auto-lms-43b1d.firebaseapp.com"
    ),
    "import.meta.env.VITE_FIREBASE_PROJECT_ID": JSON.stringify("auto-lms-43b1d"),
    "import.meta.env.VITE_FIREBASE_STORAGE_BUCKET": JSON.stringify(
      "auto-lms-43b1d.firebasestorage.app"
    ),
    "import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID":
      JSON.stringify("109707658171"),
    "import.meta.env.VITE_FIREBASE_APP_ID": JSON.stringify(
      "1:109707658171:web:a4d20cbf52298eea98ba9e"
    ),
  },
  server: {
    host: "0.0.0.0",
    port: 3000,
  },
});
