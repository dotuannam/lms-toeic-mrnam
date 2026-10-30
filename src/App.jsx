import React, { useState, useEffect } from "react";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { LanguageProvider } from "./context/LanguageContext";
import { SettingsProvider } from "./context/SettingsContext";
import { ThemeProvider } from "./context/ThemeContext";
import { Login } from "./pages/auth/Login";
import { AdminLayout } from "./components/layout/AdminLayout";
import { StudentLayout } from "./components/layout/StudentLayout";
import { StudentsPage } from "./pages/admin/StudentsPage";
import { ClassesPage } from "./pages/admin/ClassesPage";
import { AttendancePage } from "./pages/admin/AttendancePage";
import { ScoresPage } from "./pages/admin/ScoresPage";
import { FinancePage } from "./pages/admin/FinancePage";
import { ReportsPage } from "./pages/admin/ReportsPage";
import { WebsiteAdminPage } from "./pages/admin/WebsiteAdminPage";
import { StaffManagementPage } from "./pages/admin/StaffManagementPage";
import { LearningResourcesPage } from "./pages/admin/LearningResourcesPage";
import { VocabGamesAdminPage } from "./pages/admin/VocabGamesAdminPage";
import { StudentDashboard } from "./pages/student/StudentDashboard";
import { LandingPage } from "./components/landing/LandingPage";
import { GlobalAnnouncementBanner } from "./components/common/GlobalAnnouncementBanner";

const AppContent = () => {
  const { currentUser, role, isStaff, userProfile, loading } = useAuth();
  const [adminTab, setAdminTab] = useState(() => (role === "instructor" ? "classes" : "students"));
  const [viewMode, setViewMode] = useState("admin"); // 'admin' | 'student_preview' | 'landing'

  // Update tab default if instructor logs in
  useEffect(() => {
    if (role === "instructor" && adminTab === "students") {
      setAdminTab("classes");
    }
  }, [role]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#1c1610] flex flex-col items-center justify-center text-white">
        <div className="w-12 h-12 border-4 border-[#c27803] border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="text-sm font-heading font-bold tracking-wider uppercase text-amber-200">Initializing LMS Platform...</p>
      </div>
    );
  }

  // Unauthenticated -> Render Landing Page with Global Announcement & Integrated Login
  if (!currentUser) {
    return (
      <div className="min-h-screen flex flex-col">
        <GlobalAnnouncementBanner />
        <LandingPage onGoToPortal={() => {}} />
      </div>
    );
  }

  // Authenticated user explicitly viewing Landing Page
  if (viewMode === "landing") {
    return (
      <div className="min-h-screen flex flex-col">
        <GlobalAnnouncementBanner />
        <div className="bg-[#261e16] text-amber-100 px-4 py-2.5 flex items-center justify-between text-xs font-semibold shadow-md border-b border-[#c27803]/40 sticky top-0 z-50">
          <div className="flex items-center gap-2">
            <span className="text-amber-400">🌐</span>
            <span className="font-heading font-medium tracking-wide">
              Bạn đang xem Landing Page ({isStaff ? "Admin / Staff" : "Học viên"})
            </span>
          </div>
          <button
            onClick={() => setViewMode(isStaff ? "admin" : "student")}
            className="px-3.5 py-1.5 bg-[#c27803] text-white hover:bg-[#92400e] rounded-lg text-xs font-heading font-bold uppercase tracking-wider transition shadow-sm cursor-pointer"
          >
            Quay lại Portal Dashboard →
          </button>
        </div>
        <LandingPage onGoToPortal={() => setViewMode(isStaff ? "admin" : "student")} />
      </div>
    );
  }

  // Admin & Staff Portal View (for Super Admin, Admin, Consultants, Instructors)
  if (isStaff && viewMode === "admin") {
    return (
      <div className="relative min-h-screen flex flex-col">
        <GlobalAnnouncementBanner />
        <AdminLayout
          activeTab={adminTab}
          onTabChange={setAdminTab}
          onSwitchToStudentView={() => setViewMode("student_preview")}
          onViewLandingPage={() => setViewMode("landing")}
        >
          {adminTab === "students" && <StudentsPage />}
          {adminTab === "classes" && <ClassesPage />}
          {adminTab === "attendance" && <AttendancePage />}
          {adminTab === "scores" && <ScoresPage />}
          {adminTab === "finance" && <FinancePage />}
          {adminTab === "reports" && <ReportsPage />}
          {/* Tạm ẩn Kho học liệu mô phỏng cho đến khi hoàn thiện tài liệu chính thức */}
          {/* adminTab === "resources" && <LearningResourcesPage /> */}
          {adminTab === "vocab-games" && <VocabGamesAdminPage />}
          {adminTab === "staff" && <StaffManagementPage />}
          {(adminTab === "website-admin" || adminTab === "email-templates") && (
            <WebsiteAdminPage
              initialSubTab={adminTab === "email-templates" ? "email-templates" : "email-templates"}
            />
          )}
        </AdminLayout>
      </div>
    );
  }

  // Student Portal View (Default for students, or preview for admins/staff)
  return (
    <div className="relative min-h-screen flex flex-col">
      <GlobalAnnouncementBanner />
      {isStaff && (
        <div className="bg-[#261e16] text-amber-100 px-4 py-2.5 flex items-center justify-between text-xs font-semibold shadow-md border-b border-[#c27803]/40 sticky top-0 z-50">
          <div className="flex items-center gap-2">
            <span className="text-amber-400">🛡️</span>
            <span className="font-heading font-medium tracking-wide">Bạn đang xem thử giao diện Học viên (Preview Mode)</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setViewMode("landing")}
              className="px-3 py-1 bg-stone-700 hover:bg-stone-600 text-white rounded-lg text-xs font-heading font-bold uppercase tracking-wider transition shadow-sm cursor-pointer"
            >
              🌐 Landing Page
            </button>
            <button
              onClick={() => setViewMode("admin")}
              className="px-3 py-1 bg-[#c27803] text-white hover:bg-[#92400e] rounded-lg text-xs font-heading font-bold uppercase tracking-wider transition shadow-sm cursor-pointer"
            >
              Quay lại Admin/Staff Dashboard →
            </button>
          </div>
        </div>
      )}
      <StudentLayout
        studentProfile={userProfile}
        onSwitchToAdminView={isStaff ? () => setViewMode("admin") : undefined}
        onViewLandingPage={() => setViewMode("landing")}
      >
        <StudentDashboard />
      </StudentLayout>
    </div>
  );
};

export const App = () => {
  return (
    <ThemeProvider>
      <LanguageProvider>
        <AuthProvider>
          <SettingsProvider>
            <AppContent />
          </SettingsProvider>
        </AuthProvider>
      </LanguageProvider>
    </ThemeProvider>
  );
};

export default App;
