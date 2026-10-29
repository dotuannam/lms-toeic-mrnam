import React from "react";
import { useAuth } from "../../context/AuthContext";

export const ProtectedRoute = ({ children, requiredRole, fallbackPath = "/login" }) => {
  const { currentUser, role, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#1c1610] text-white">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-[#c27803] border-t-transparent rounded-full animate-spin"></div>
          <span className="text-sm font-heading font-medium tracking-wide uppercase text-slate-300">Checking permissions...</span>
        </div>
      </div>
    );
  }

  // Not authenticated
  if (!currentUser) {
    window.location.href = fallbackPath;
    return null;
  }

  // Role validation mismatch
  if (requiredRole && role !== requiredRole) {
    // If student tries to access admin, send to /student
    // If admin accesses student portal, allow or send to /admin
    if (requiredRole === "admin" && role !== "admin") {
      window.location.href = "/student";
      return null;
    }
  }

  return children;
};

export default ProtectedRoute;
