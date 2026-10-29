/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        clever: {
          primary: "#c27803", // Vàng đất chủ đạo (Warm Earth Ochre)
          primaryHover: "#92400e", // Vàng đất đậm khi hover
          cyan: "#d97706", // Vàng đất ấm
          dark: "#261e16", // Nâu đen đất ấm (thay cho xanh đen lạnh)
          darker: "#1c1610", // Nâu đen đất đậm
          accent: "#b45309", // Vàng đất terracotta
          gold: "#f59e0b", // Vàng hổ phách sáng
          bg: "#faf7f2", // Nền be đất ấm sáng
          surface: "#ffffff",
          muted: "#78716c", // Stone muted ấm
          border: "#e7e2d9", // Đường viền be ấm
        },
      },
      fontFamily: {
        sans: ["'Plus Jakarta Sans'", "sans-serif"],
        heading: ["'Montserrat'", "sans-serif"],
        serif: ["'Fraunces'", "serif"],
        mono: ["'JetBrains Mono'", "monospace"],
      },
    },
  },
  plugins: [],
};
