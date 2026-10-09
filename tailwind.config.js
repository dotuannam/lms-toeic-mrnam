/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        clever: {
          primary: "#00b4d8",
          cyan: "#72d5cd",
          dark: "#1e2738",
          darker: "#151b26",
          accent: "#f59e0b",
          gold: "#e67e22",
          bg: "#f4f7f9",
          surface: "#ffffff",
          muted: "#64748b",
          border: "#e2e8f0",
        },
      },
      fontFamily: {
        sans: ["'Plus Jakarta Sans'", "sans-serif"],
        heading: ["'Montserrat'", "sans-serif"],
        mono: ["'JetBrains Mono'", "monospace"],
      },
    },
  },
  plugins: [],
};
