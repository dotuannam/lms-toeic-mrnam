import React, { useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { useLanguage } from "../../context/LanguageContext";
import { useSettings } from "../../context/SettingsContext";
import { LanguageSwitcher } from "../common/LanguageSwitcher";
import { ThemeToggle } from "../common/ThemeToggle";

export const AdminLayout = ({ activeTab, onTabChange, onSwitchToStudentView, onViewLandingPage, children }) => {
  const { userProfile, currentUser, logout, role, isSuperAdmin, isConsultant, isInstructor } = useAuth();
  const { centerConfig } = useSettings();
  const { t, lang } = useLanguage();
  const isVi = lang === "vi";
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navigationItems = [
    {
      id: "students",
      label: t("studentsTab"),
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
        </svg>
      ),
      badge: null,
    },
    {
      id: "classes",
      label: t("classesTab"),
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
        </svg>
      ),
    },
    {
      id: "attendance",
      label: t("attendanceTab"),
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
        </svg>
      ),
    },
    {
      id: "scores",
      label: t("scoresTab"),
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      ),
    },
    {
      id: "finance",
      label: t("financeTab"),
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
    {
      id: "reports",
      label: t("reportsTab"),
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      ),
    },
    {
      id: "resources",
      label: isVi ? "Kho Học Liệu (3 Nhóm)" : "Courseware (3-Tier)",
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
        </svg>
      ),
      badge: "Mới",
    },
    {
      id: "vocab-games",
      label: isVi ? "Mini Game Từ Vựng" : "Vocab Mini Games",
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      badge: "Game",
    },
    {
      id: "website-admin",
      label: t("websiteAdminTab") || "Quản trị Website",
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      ),
    },
    {
      id: "staff",
      label: isVi ? "Đội ngũ & Phân quyền" : "Staff & Roles",
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
      ),
      badge: isSuperAdmin ? "👑" : null,
    },
  ];

  // Role-based navigation filtering
  const filteredNavItems = navigationItems.filter((item) => {
    if (isSuperAdmin || role === "superadmin" || role === "admin") return true;
    if (isConsultant) {
      return ["students", "classes", "attendance", "finance", "resources"].includes(item.id);
    }
    if (isInstructor) {
      return ["classes", "attendance", "scores", "resources", "vocab-games"].includes(item.id);
    }
    return true;
  });

  const handleSignOut = async () => {
    try {
      await logout();
      window.location.reload();
    } catch (e) {
      console.error("Sign out error", e);
    }
  };

  return (
    <div className="min-h-screen bg-[#faf7f2] dark:bg-[#0b0f19] flex flex-col md:flex-row font-sans transition-colors duration-200">
      {/* Mobile Header Bar */}
      <div className="md:hidden bg-[#261e16] text-white px-4 py-3 flex items-center justify-between border-b border-[#2a354b]">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-[#c27803] to-[#f59e0b] flex items-center justify-center font-heading font-extrabold text-white text-base shadow-sm">
            🎓
          </div>
          <span className="font-heading font-bold text-white text-sm tracking-wide">
            {centerConfig?.centerName || "Clever Course LMS"}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <ThemeToggle variant="icon" />
          <LanguageSwitcher />
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 text-slate-300 hover:text-white"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        </div>
      </div>

      {/* Sidebar Navigation */}
      <aside
        className={`fixed md:sticky top-0 z-40 inset-y-0 left-0 w-64 bg-[#261e16] text-slate-300 flex flex-col border-r border-[#2a354b] transition-transform duration-200 ease-in-out md:translate-x-0 ${
          mobileMenuOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Brand Header */}
        <div className="p-5 border-b border-[#2a354b] flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#c27803] to-[#f59e0b] flex items-center justify-center font-heading font-extrabold text-white text-xl shadow-md shadow-amber-600/20 shrink-0">
            🎓
          </div>
          <div className="overflow-hidden">
            <h2 className="text-sm font-heading font-extrabold text-white tracking-wide truncate uppercase">
              {centerConfig?.centerName || "Clever Course"}
            </h2>
            <p className="text-[11px] text-[#c27803] font-semibold tracking-wider uppercase">
              LMS &bull; Admin Portal
            </p>
          </div>
        </div>

        {/* Menu Items */}
        <nav className="flex-1 p-3.5 space-y-1.5 overflow-y-auto">
          {filteredNavItems.map((item) => {
            const isActive =
              activeTab === item.id ||
              (item.id === "website-admin" && activeTab === "email-templates");
            return (
              <button
                key={item.id}
                onClick={() => {
                  onTabChange(item.id);
                  setMobileMenuOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-heading font-bold uppercase tracking-wider transition-all duration-200 ${
                  isActive
                    ? "bg-[#c27803] text-white shadow-md shadow-amber-600/25 translate-x-1"
                    : "text-slate-300 hover:text-white hover:bg-[#28334a]"
                }`}
              >
                <span className={isActive ? "text-white" : "text-slate-400"}>{item.icon}</span>
                <span className="flex-1 text-left">{item.label}</span>
                {item.badge && (
                  <span className="text-xs" title="Super Admin exclusive">
                    {item.badge}
                  </span>
                )}
                {isActive && (
                  <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse"></span>
                )}
              </button>
            );
          })}
        </nav>

        {/* User Card & Sign Out */}
        <div className="p-4 border-t border-[#2a354b] bg-[#1c1610]">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-[#c27803] to-[#f59e0b] flex items-center justify-center text-white font-heading font-bold text-xs border border-white/20">
              {userProfile?.displayName ? userProfile.displayName.charAt(0).toUpperCase() : "A"}
            </div>
            <div className="overflow-hidden flex-1">
              <div className="flex items-center gap-1.5">
                <p className="text-xs font-heading font-bold text-white truncate">
                  {userProfile?.displayName || t("systemAdmin")}
                </p>
              </div>
              <p className="text-[10px] text-[#c27803] font-heading font-bold uppercase tracking-wider truncate">
                {isSuperAdmin
                  ? "👑 Super Admin"
                  : isConsultant
                  ? "💼 Consultant"
                  : isInstructor
                  ? "👨‍🏫 Instructor"
                  : "🛡️ Administrator"}
              </p>
              <p className="text-[10px] text-slate-400 truncate font-mono">
                {currentUser?.email || "admin@center.edu.vn"}
              </p>
            </div>
          </div>
          <button
            onClick={handleSignOut}
            className="w-full py-2 px-3 bg-[#261e16] hover:bg-rose-900/40 text-rose-300 hover:text-rose-200 text-xs font-semibold rounded-lg flex items-center justify-center gap-2 border border-rose-500/20 transition"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            <span>{t("signOut")}</span>
          </button>
        </div>
      </aside>

      {/* Main Content Pane */}
      <main className="flex-1 min-w-0 flex flex-col bg-[#faf7f2] dark:bg-[#0b0f19] transition-colors duration-200">
        {/* Top Header Bar */}
        <header className="bg-white dark:bg-[#1c1610] border-b border-slate-200/90 dark:border-[#2a354b] px-6 py-4 flex items-center justify-between sticky top-0 z-20 shadow-xs transition-colors duration-200">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg sm:text-xl font-heading font-extrabold text-slate-900 dark:text-white uppercase tracking-tight">
                {navigationItems.find(
                  (n) =>
                    n.id === activeTab ||
                    (n.id === "website-admin" && activeTab === "email-templates")
                )?.label || "Dashboard"}
              </h1>
              <span className="w-2 h-2 rounded-full bg-[#c27803]"></span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {t("adminDesc")}
            </p>
          </div>
          <div className="flex items-center gap-2.5 sm:gap-3">
            <ThemeToggle variant="pill" />
            <LanguageSwitcher />

            {onViewLandingPage && (
              <button
                type="button"
                onClick={onViewLandingPage}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-heading font-bold uppercase tracking-wider border border-slate-300 dark:border-slate-700 transition"
                title="Xem Landing Page"
              >
                <span>🌐</span>
                <span className="hidden sm:inline">Landing Page</span>
              </button>
            )}

            {onSwitchToStudentView && (
              <button
                type="button"
                onClick={onSwitchToStudentView}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#c27803]/10 hover:bg-[#c27803] text-[#c27803] hover:text-white rounded-xl text-xs font-heading font-bold uppercase tracking-wider border border-[#c27803]/20 dark:border-[#c27803]/40 transition"
              >
                <span>🎓</span>
                <span className="hidden sm:inline">{t("switchToStudentView")}</span>
              </button>
            )}

            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              {t("liveStatus")}
            </span>
          </div>
        </header>

        {/* Page Content Container */}
        <div className="flex-1 p-6 max-w-7xl w-full mx-auto">{children}</div>
      </main>
    </div>
  );
};

export default AdminLayout;
