import React from "react";
import { useTheme } from "../../context/ThemeContext";
import { useLanguage } from "../../context/LanguageContext";

export const ThemeToggle = ({ variant = "pill", className = "", showLabel = false }) => {
  const { theme, isDark, toggleTheme, setTheme } = useTheme();
  const { t, lang } = useLanguage();

  if (variant === "icon") {
    return (
      <button
        type="button"
        onClick={toggleTheme}
        className={`p-2 rounded-xl transition-all duration-200 border flex items-center justify-center ${
          isDark
            ? "bg-[#261e16] hover:bg-[#283548] text-amber-300 border-slate-700 shadow-inner"
            : "bg-white hover:bg-slate-100 text-amber-500 border-slate-200 shadow-xs"
        } ${className}`}
        title={isDark ? t("switchToLight") : t("switchToDark")}
        aria-label={isDark ? t("switchToLight") : t("switchToDark")}
      >
        {isDark ? (
          <span className="text-base leading-none animate-pulse">🌙</span>
        ) : (
          <span className="text-base leading-none">☀️</span>
        )}
        {showLabel && (
          <span className="ml-1.5 text-xs font-heading font-bold uppercase tracking-wider">
            {isDark ? t("darkMode") : t("lightMode")}
          </span>
        )}
      </button>
    );
  }

  // Default: Two-segment segmented pill selector matching LanguageSwitcher aesthetic
  return (
    <div
      className={`inline-flex items-center p-1 rounded-xl border text-xs font-semibold shadow-inner transition-colors duration-200 ${
        isDark
          ? "bg-[#1c1610] border-[#2a354b]"
          : "bg-slate-100/90 hover:bg-slate-100 border-slate-200/80"
      } ${className}`}
      role="group"
      aria-label={t("themeMode")}
    >
      <button
        type="button"
        onClick={() => setTheme("light")}
        className={`px-2 py-1 sm:px-2.5 sm:py-1 rounded-lg transition-all duration-150 flex items-center gap-1.5 ${
          !isDark
            ? "bg-[#c27803] text-white shadow-md shadow-[#c27803]/25 font-heading font-bold scale-[1.02]"
            : "text-slate-400 hover:text-slate-200 font-medium"
        }`}
        title={t("lightMode")}
      >
        <span className="text-xs">☀️</span>
        <span className="font-bold">{lang === "vi" ? "Sáng" : "Light"}</span>
      </button>

      <button
        type="button"
        onClick={() => setTheme("dark")}
        className={`px-2 py-1 sm:px-2.5 sm:py-1 rounded-lg transition-all duration-150 flex items-center gap-1.5 ${
          isDark
            ? "bg-[#c27803] text-white shadow-md shadow-[#c27803]/25 font-heading font-bold scale-[1.02]"
            : "text-slate-600 hover:text-slate-900 font-medium"
        }`}
        title={t("darkMode")}
      >
        <span className="text-xs">🌙</span>
        <span className="font-bold">{lang === "vi" ? "Tối" : "Dark"}</span>
      </button>
    </div>
  );
};

export default ThemeToggle;
