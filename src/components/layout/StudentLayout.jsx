import React from "react";
import { useAuth } from "../../context/AuthContext";
import { useLanguage } from "../../context/LanguageContext";
import { useSettings } from "../../context/SettingsContext";
import { DEFAULT_CENTER_CONFIG } from "../../services/settingsService";
import { LanguageSwitcher } from "../common/LanguageSwitcher";
import { ThemeToggle } from "../common/ThemeToggle";

export const StudentLayout = ({ children, studentProfile, onSwitchToAdminView }) => {
  const { currentUser, logout, isStaff } = useAuth();
  const { t, lang } = useLanguage();
  const { centerConfig } = useSettings();
  const isVi = lang === "vi";

  // Đồng nhất tuyệt đối thông tin trung tâm với system_settings/center_config
  const hotline = centerConfig?.hotline || centerConfig?.phone || DEFAULT_CENTER_CONFIG.hotline;
  const adminEmail = centerConfig?.adminEmail || centerConfig?.email || DEFAULT_CENTER_CONFIG.adminEmail;
  const centerName = centerConfig?.centerName || DEFAULT_CENTER_CONFIG.centerName;
  const address = centerConfig?.address || DEFAULT_CENTER_CONFIG.address;
  const slogan = centerConfig?.slogan || DEFAULT_CENTER_CONFIG.slogan;
  const websiteUrl = centerConfig?.websiteUrl || DEFAULT_CENTER_CONFIG.websiteUrl;
  const fanpageUrl = centerConfig?.fanpageUrl || DEFAULT_CENTER_CONFIG.fanpageUrl;

  const cleanHotline = (hotline || "").replace(/\s+/g, "");

  const handleSignOut = async () => {
    try {
      await logout();
      window.location.reload();
    } catch (e) {
      console.error("Sign out error", e);
    }
  };

  return (
    <div className="min-h-screen bg-[#f4f7f9] dark:bg-[#0b0f19] flex flex-col font-sans transition-colors duration-200">
      {/* 1. Clever Course Top Navigation Bar */}
      <div className="bg-[#1e2738] text-slate-300 text-xs border-b border-[#2a354b]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2 flex flex-col sm:flex-row items-center justify-between gap-2">
          {/* Top Contact Info */}
          <div className="flex items-center gap-4 text-[11px] text-slate-300 flex-wrap">
            <a
              href={`tel:${cleanHotline}`}
              className="flex items-center gap-1.5 hover:text-[#00b4d8] transition cursor-pointer"
              title={isVi ? "Gọi Hotline trung tâm" : "Call center hotline"}
            >
              <span className="text-[#00b4d8]">📞</span>
              <span className="font-semibold text-white">{hotline}</span>
            </a>
            <span className="text-slate-600">|</span>
            <a
              href={`mailto:${adminEmail}`}
              className="flex items-center gap-1.5 hover:text-[#00b4d8] transition cursor-pointer"
              title={isVi ? "Gửi email hỗ trợ học viên" : "Send support email"}
            >
              <span className="text-[#00b4d8]">✉️</span>
              <span className="text-slate-200">{adminEmail}</span>
            </a>
            {websiteUrl && (
              <>
                <span className="text-slate-600 hidden md:inline">|</span>
                <a
                  href={websiteUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="hidden md:flex items-center gap-1.5 hover:text-[#00b4d8] transition cursor-pointer text-slate-300"
                  title={isVi ? "Truy cập website trung tâm" : "Visit center website"}
                >
                  <span className="text-[#00b4d8]">🌐</span>
                  <span className="truncate max-w-[160px]">{websiteUrl.replace(/^https?:\/\//, "")}</span>
                </a>
              </>
            )}
          </div>

          {/* Top Right Controls */}
          <div className="flex items-center gap-2.5 sm:gap-3">
            <ThemeToggle variant="pill" />
            <LanguageSwitcher />

            <span className="hidden sm:inline-block w-px h-3 bg-slate-700"></span>

            <div className="flex items-center gap-2">
              {onSwitchToAdminView && (
                <button
                  type="button"
                  onClick={onSwitchToAdminView}
                  className="px-2.5 py-1 bg-[#00b4d8] text-white hover:bg-[#0096c7] rounded-lg transition text-[11px] font-heading font-bold uppercase tracking-wider shadow-xs"
                >
                  🛡️ Admin Panel &rarr;
                </button>
              )}
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#00b4d8]/20 text-[#00b4d8] border border-[#00b4d8]/30">
                <span className="w-1.5 h-1.5 rounded-full bg-[#00b4d8] animate-pulse"></span>
                <span>{t("learnerView")}</span>
              </span>

              <button
                onClick={handleSignOut}
                className="px-2.5 py-1 text-slate-300 hover:text-rose-400 hover:bg-white/10 rounded transition text-[11px] font-medium"
              >
                {t("signOut")}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Clever Course Main Header */}
      <header className="bg-white dark:bg-[#151b26] border-b border-slate-200/90 dark:border-[#2a354b] sticky top-0 z-30 shadow-xs transition-colors duration-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          {/* Logo & Brand */}
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-[#1e2738] via-[#00b4d8] to-[#72d5cd] flex items-center justify-center font-heading font-extrabold text-white text-xl shadow-md shadow-cyan-500/20 shrink-0">
              🎓
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-heading font-extrabold text-slate-900 dark:text-white text-base sm:text-lg tracking-tight uppercase">
                  {centerName}
                </h1>
                <span className="px-2 py-0.5 bg-[#f59e0b] text-white font-heading font-bold text-[10px] rounded tracking-wide uppercase">
                  LMS
                </span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium tracking-wide">
                {t("studentPortal")} &bull; Academic Excellence System
              </p>
            </div>
          </div>

          {/* Student Profile Widget */}
          <div className="flex items-center gap-3.5">
            <div className="hidden sm:flex flex-col text-right">
              <span className="text-xs font-heading font-bold text-slate-900 dark:text-white">
                {studentProfile?.fullName || currentUser?.displayName || "Student"}
              </span>
              <span className="text-[11px] font-mono font-semibold text-[#00b4d8]">
                ID: {studentProfile?.studentId || currentUser?.email?.split("@")[0]}
              </span>
            </div>

            <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-[#00b4d8] to-[#72d5cd] text-white flex items-center justify-center font-heading font-bold text-sm shadow-xs border-2 border-white ring-2 ring-[#00b4d8]/30">
              {(studentProfile?.fullName || currentUser?.email || "S").charAt(0).toUpperCase()}
            </div>
          </div>
        </div>
      </header>

      {/* 3. Main Body */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        {children}
      </main>

      {/* 4. Clever Course Footer */}
      <footer className="bg-[#1e2738] text-slate-300 border-t border-[#2a354b] mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 grid grid-cols-1 md:grid-cols-3 gap-8 text-xs">
          {/* Col 1: Center Brand & Slogan */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-[#00b4d8] to-[#72d5cd] flex items-center justify-center text-white font-heading font-bold text-base shadow-sm">
                🎓
              </div>
              <div>
                <span className="font-heading font-black text-white text-sm tracking-wide block uppercase">
                  {centerName}
                </span>
                <span className="text-[10px] text-[#00b4d8] font-bold uppercase tracking-wider">
                  Clever Course LMS
                </span>
              </div>
            </div>

            {slogan && (
              <p className="text-slate-300 text-xs italic font-medium leading-relaxed">
                "{slogan}"
              </p>
            )}

            <p className="text-slate-400 text-xs leading-relaxed">
              {isVi
                ? "Nền tảng quản lý học tập và luyện thi chuyên nghiệp chuẩn Clever Course LMS. Đồng bộ học liệu Google Drive, Google Classroom và kết quả học tập tự động."
                : "Professional Clever Course LMS learning management system. Real-time Google Drive courseware sync, Google Classroom integration, and automated progress tracking."}
            </p>

            {/* Quick links to website / fanpage */}
            <div className="flex flex-wrap items-center gap-2 pt-1">
              {websiteUrl && (
                <a
                  href={websiteUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="px-2.5 py-1 bg-white/5 hover:bg-white/10 text-[#00b4d8] border border-slate-700 hover:border-[#00b4d8]/40 rounded-lg text-[11px] font-semibold transition inline-flex items-center gap-1.5"
                >
                  <span>🌐</span>
                  <span>Website</span>
                </a>
              )}
              {fanpageUrl && (
                <a
                  href={fanpageUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="px-2.5 py-1 bg-white/5 hover:bg-white/10 text-[#72d5cd] border border-slate-700 hover:border-[#72d5cd]/40 rounded-lg text-[11px] font-semibold transition inline-flex items-center gap-1.5"
                >
                  <span>💬</span>
                  <span>Fanpage / Zalo</span>
                </a>
              )}
            </div>
          </div>

          {/* Col 2: Center Contact & Support */}
          <div className="space-y-3">
            <h4 className="font-heading font-bold text-white uppercase tracking-wider text-xs border-b border-slate-700 pb-2">
              {isVi ? "Thông tin liên hệ trung tâm" : "Center Contact & Support"}
            </h4>
            <div className="space-y-2.5 text-slate-300 text-xs">
              <div className="flex items-start gap-2">
                <span className="text-sm leading-none text-[#00b4d8] mt-0.5">📍</span>
                <div>
                  <span className="text-slate-400 text-[11px] block">{isVi ? "Địa chỉ cơ sở:" : "Address:"}</span>
                  <span className="text-white font-medium">{address}</span>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-sm leading-none text-[#00b4d8] mt-0.5">📞</span>
                <div>
                  <span className="text-slate-400 text-[11px] block">{isVi ? "Đường dây nóng (Hotline):" : "Hotline:"}</span>
                  <a
                    href={`tel:${cleanHotline}`}
                    className="text-white font-bold hover:text-[#00b4d8] transition text-sm cursor-pointer"
                  >
                    {hotline}
                  </a>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-sm leading-none text-[#00b4d8] mt-0.5">✉️</span>
                <div>
                  <span className="text-slate-400 text-[11px] block">{isVi ? "Email hỗ trợ học vụ:" : "Support Email:"}</span>
                  <a
                    href={`mailto:${adminEmail}`}
                    className="text-[#00b4d8] font-medium hover:underline break-all cursor-pointer"
                  >
                    {adminEmail}
                  </a>
                </div>
              </div>
            </div>
          </div>

          {/* Col 3: LMS Capabilities */}
          <div className="space-y-3">
            <h4 className="font-heading font-bold text-white uppercase tracking-wider text-xs border-b border-slate-700 pb-2">
              {isVi ? "Tiện ích đào tạo" : "LMS Capabilities"}
            </h4>
            <div className="space-y-1.5 text-slate-400">
              <div className="flex items-center gap-2">
                <span className="text-[#00b4d8]">✓</span>
                <span>{isVi ? "Tài liệu Google Drive trực tiếp" : "Direct Google Drive Courseware"}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[#00b4d8]">✓</span>
                <span>{isVi ? "Thanh toán học phí VietQR tự động" : "Automated VietQR Tuition Payment"}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[#00b4d8]">✓</span>
                <span>{isVi ? "Theo dõi chuyên cần & điểm số Realtime" : "Realtime Attendance & Score Tracking"}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Copyright */}
        <div className="border-t border-[#2a354b] py-4 bg-[#151b26] text-center text-[11px] text-slate-500">
          <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
            <span>Theme Clever Course LMS &bull; GoodLayers Design Concept</span>
            <span>&copy; {new Date().getFullYear()} {centerName}. All rights reserved.</span>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default StudentLayout;
