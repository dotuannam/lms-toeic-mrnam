import React from "react";
import { useLanguage } from "../../context/LanguageContext";

export const LanguageSwitcher = ({ className = "" }) => {
  const { lang, setLang } = useLanguage();

  return (
    <div
      className={`inline-flex items-center p-1 bg-slate-100/90 hover:bg-slate-100 dark:bg-[#151b26] rounded-xl border border-slate-200/80 dark:border-[#2a354b] text-xs font-semibold shadow-inner transition ${className}`}
      role="group"
      aria-label="Language Selector"
    >
      <button
        type="button"
        onClick={() => setLang("vi")}
        className={`px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-lg transition-all duration-150 flex items-center gap-1.5 ${
          lang === "vi"
            ? "bg-[#00b4d8] text-white shadow-md shadow-[#00b4d8]/25 font-heading font-bold scale-[1.02]"
            : "text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-white/60 dark:hover:bg-white/10 font-medium"
        }`}
        title="Tiếng Việt (Vietnamese)"
      >
        <span className="text-sm">🇻🇳</span>
        <span className="hidden sm:inline font-bold">Tiếng Việt</span>
        <span className="sm:hidden font-bold">VI</span>
      </button>

      <button
        type="button"
        onClick={() => setLang("en")}
        className={`px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-lg transition-all duration-150 flex items-center gap-1.5 ${
          lang === "en"
            ? "bg-[#00b4d8] text-white shadow-md shadow-[#00b4d8]/25 font-heading font-bold scale-[1.02]"
            : "text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-white/60 dark:hover:bg-white/10 font-medium"
        }`}
        title="English"
      >
        <span className="text-sm">🇬🇧</span>
        <span className="hidden sm:inline font-bold">English</span>
        <span className="sm:hidden font-bold">EN</span>
      </button>
    </div>
  );
};

export default LanguageSwitcher;
