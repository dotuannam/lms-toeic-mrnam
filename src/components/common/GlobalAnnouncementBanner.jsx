import React, { useState, useEffect } from "react";
import { useSettings } from "../../context/SettingsContext";

export const GlobalAnnouncementBanner = () => {
  const { announcementConfig } = useSettings();
  const [isDismissed, setIsDismissed] = useState(false);

  // If announcement is disabled or content is empty -> hide completely (zero height)
  const isVisible =
    announcementConfig?.enabled &&
    typeof announcementConfig?.content === "string" &&
    announcementConfig.content.trim().length > 0;

  // Reset dismissed state whenever content or updated timestamp changes
  useEffect(() => {
    setIsDismissed(false);
  }, [announcementConfig?.content, announcementConfig?.updatedAt]);

  if (!isVisible || isDismissed) {
    return null;
  }

  const { content, type = "info", linkText, linkUrl } = announcementConfig;

  // Visual variants
  const typeStyles = {
    info: {
      bg: "bg-gradient-to-r from-[#0077b6] via-[#0096c7] to-[#00b4d8]",
      text: "text-white",
      border: "border-b border-[#48cae4]/30",
      icon: "📢",
      badge: "Thông báo",
      badgeClass: "bg-white/20 text-white",
      btnClass: "bg-white text-[#0077b6] hover:bg-white/90",
    },
    warning: {
      bg: "bg-gradient-to-r from-amber-600 via-amber-500 to-amber-600",
      text: "text-white",
      border: "border-b border-amber-300/30",
      icon: "⚠️",
      badge: "Lưu ý",
      badgeClass: "bg-black/20 text-white",
      btnClass: "bg-white text-amber-700 hover:bg-white/90",
    },
    alert: {
      bg: "bg-gradient-to-r from-rose-700 via-rose-600 to-rose-700",
      text: "text-white",
      border: "border-b border-rose-300/30",
      icon: "🚨",
      badge: "Khẩn cấp",
      badgeClass: "bg-white/20 text-white",
      btnClass: "bg-white text-rose-700 hover:bg-white/90",
    },
    success: {
      bg: "bg-gradient-to-r from-emerald-700 via-emerald-600 to-emerald-700",
      text: "text-white",
      border: "border-b border-emerald-300/30",
      icon: "🎉",
      badge: "Tin vui",
      badgeClass: "bg-white/20 text-white",
      btnClass: "bg-white text-emerald-700 hover:bg-white/90",
    },
  };

  const style = typeStyles[type] || typeStyles.info;

  return (
    <div
      role="alert"
      className={`relative z-[9999] w-full ${style.bg} ${style.text} ${style.border} shadow-md transition-all duration-300 animate-fadeIn`}
    >
      <div className="max-w-7xl mx-auto px-4 py-2.5 sm:px-6 lg:px-8 flex items-center justify-between gap-3 text-xs sm:text-sm">
        <div className="flex items-center gap-2.5 flex-1 min-w-0">
          <span className="text-base sm:text-lg shrink-0" aria-hidden="true">
            {style.icon}
          </span>
          <span
            className={`hidden sm:inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${style.badgeClass}`}
          >
            {style.badge}
          </span>
          <p className="font-medium truncate sm:whitespace-normal leading-tight">
            {content}
          </p>
          {linkUrl && linkText && (
            <a
              href={linkUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={`shrink-0 ml-2 px-2.5 py-0.5 rounded-full font-bold text-xs shadow-xs transition-colors duration-150 ${style.btnClass}`}
            >
              {linkText} &rarr;
            </a>
          )}
        </div>

        {/* Close / Dismiss button */}
        <button
          onClick={() => setIsDismissed(true)}
          className="shrink-0 p-1 rounded-md text-white/80 hover:text-white hover:bg-white/10 transition cursor-pointer"
          title="Tạm ẩn thông báo này"
          aria-label="Đóng thông báo"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  );
};

export default GlobalAnnouncementBanner;
