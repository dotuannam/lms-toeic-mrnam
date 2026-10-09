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
import { StudentDashboard } from "./pages/student/StudentDashboard";

const AppContent = () => {
  const { currentUser, role, isStaff, userProfile, loading } = useAuth();
  const [adminTab, setAdminTab] = useState(() => (role === "instructor" ? "classes" : "students"));
  const [viewMode, setViewMode] = useState("admin"); // 'admin' | 'student_preview'

  // Update tab default if instructor logs in
  useEffect(() => {
    if (role === "instructor" && adminTab === "students") {
      setAdminTab("classes");
    }
  }, [role]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#151b26] flex flex-col items-center justify-center text-white">
        <div className="w-12 h-12 border-4 border-[#00b4d8] border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="text-sm font-heading font-bold tracking-wider uppercase text-slate-300">Initializing LMS Platform...</p>
      </div>
    );
  }

  // Unauthenticated -> Render Login
  if (!currentUser) {
    return <Login />;
  }

  // Admin & Staff Portal View (for Super Admin, Admin, Consultants, Instructors)
  if (isStaff && viewMode === "admin") {
    return (
      <div className="relative">
        <AdminLayout
          activeTab={adminTab}
          onTabChange={setAdminTab}
          onSwitchToStudentView={() => setViewMode("student_preview")}
        >
          {adminTab === "students" && <StudentsPage />}
          {adminTab === "classes" && <ClassesPage />}
          {adminTab === "attendance" && <AttendancePage />}
          {adminTab === "scores" && <ScoresPage />}
          {adminTab === "finance" && <FinancePage />}
          {adminTab === "reports" && <ReportsPage />}
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
    <div className="relative">
      {isStaff && (
        <div className="bg-[#1e2738] text-white px-4 py-2.5 flex items-center justify-between text-xs font-semibold shadow-md border-b border-[#00b4d8]/40 sticky top-0 z-50">
          <div className="flex items-center gap-2">
            <span className="text-amber-400">🛡️</span>
            <span className="font-heading font-medium tracking-wide">Bạn đang xem thử giao diện Học viên (Preview Mode)</span>
          </div>
          <button
            onClick={() => setViewMode("admin")}
            className="px-3 py-1 bg-[#00b4d8] text-white hover:bg-[#0096c7] rounded-lg text-xs font-heading font-bold uppercase tracking-wider transition shadow-sm"
          >
            Quay lại Admin/Staff Dashboard &rarr;
          </button>
        </div>
      )}
      <StudentLayout
        studentProfile={userProfile}
        onSwitchToAdminView={isStaff ? () => setViewMode("admin") : undefined}
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
