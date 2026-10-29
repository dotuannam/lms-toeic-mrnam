import React, { useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { LanguageSwitcher } from "../../components/common/LanguageSwitcher";
import { ThemeToggle } from "../../components/common/ThemeToggle";

export const Login = ({ onLoginSuccess }) => {
  const { loginWithEmail, loginWithGoogle, resetPassword, role } = useAuth();

  const [activeTab, setActiveTab] = useState("student"); // "student" | "admin"
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [resetSent, setResetSent] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [resetLoading, setResetLoading] = useState(false);

  // Friendly error formatter
  const formatAuthError = (err) => {
    const code = err.code || err.message;
    if (code.includes("user-not-found")) return "No account found with this email.";
    if (code.includes("wrong-password") || code.includes("invalid-credential"))
      return "Invalid email or password.";
    if (code.includes("invalid-email")) return "Please enter a valid email address.";
    if (code.includes("too-many-requests"))
      return "Too many failed attempts. Please try again later.";
    if (code.includes("popup-closed-by-user")) return "Google sign-in popup was cancelled.";
    return err.message || "An error occurred during authentication.";
  };

  const handleEmailSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage("");

    if (!email || !password) {
      setErrorMessage("Please enter both email and password.");
      return;
    }

    setLoading(true);
    try {
      await loginWithEmail(email.trim(), password);
      if (onLoginSuccess) onLoginSuccess();
    } catch (err) {
      setErrorMessage(formatAuthError(err));
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSubmit = async () => {
    setErrorMessage("");
    setLoading(true);
    try {
      await loginWithGoogle();
      if (onLoginSuccess) onLoginSuccess();
    } catch (err) {
      setErrorMessage(formatAuthError(err));
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordReset = async (e) => {
    e.preventDefault();
    if (!resetEmail) return;

    setResetLoading(true);
    try {
      await resetPassword(resetEmail.trim());
      setResetSent(true);
    } catch (err) {
      setErrorMessage(formatAuthError(err));
    } finally {
      setResetLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#1c1610] via-[#261e16] to-[#1c1610] flex items-center justify-center p-4 sm:p-6 lg:p-8 relative">
      {/* Background Decorative Clever Course Elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-[#c27803]/15 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-[#f59e0b]/10 rounded-full blur-3xl"></div>
        {/* Subtle grid pattern */}
        <div className="absolute inset-0 bg-[radial-gradient(#ffffff08_1px,transparent_1px)] [background-size:24px_24px] opacity-60"></div>
      </div>

      {/* Top Floating Controls */}
      <div className="absolute top-4 right-4 z-20 flex items-center gap-2">
        <ThemeToggle variant="icon" />
        <LanguageSwitcher />
      </div>

      <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200/80 overflow-hidden">
        {/* Clever Course Header Banner */}
        <div className="pt-8 pb-6 px-8 text-center bg-gradient-to-b from-slate-50 to-white border-b border-slate-100">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-[#261e16] text-[#c27803] ring-4 ring-[#c27803]/20 shadow-xl mb-3">
            <svg
              className="w-8 h-8"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 14l9-5-9-5-9 5 9 5z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 14v7"
              />
            </svg>
          </div>
          <div className="flex items-center justify-center gap-2 mb-1">
            <h1 className="text-xl font-heading font-black tracking-wider text-[#261e16] uppercase">
              Clever Course
            </h1>
            <span className="bg-[#f59e0b] text-white text-[10px] font-heading font-bold px-1.5 py-0.5 rounded uppercase tracking-wider">
              LMS
            </span>
          </div>
          <p className="text-xs font-medium text-slate-500 tracking-wide">
            Online Learning Management & Course System
          </p>
        </div>

        {/* Tab Toggle: Student vs Admin */}
        <div className="px-8 pt-5 pb-2">
          <div className="grid grid-cols-2 p-1 bg-slate-100 rounded-xl text-xs font-heading font-bold tracking-wider uppercase text-slate-600">
            <button
              type="button"
              onClick={() => {
                setActiveTab("student");
                setErrorMessage("");
              }}
              className={`py-2.5 px-3 rounded-lg transition-all duration-200 ${
                activeTab === "student"
                  ? "bg-[#c27803] text-white shadow-sm font-extrabold"
                  : "hover:text-[#261e16]"
              }`}
            >
              Student Portal
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveTab("admin");
                setErrorMessage("");
              }}
              className={`py-2.5 px-3 rounded-lg transition-all duration-200 ${
                activeTab === "admin"
                  ? "bg-[#261e16] text-white shadow-sm font-extrabold"
                  : "hover:text-[#261e16]"
              }`}
            >
              Admin Access
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-8 pt-4">
          {/* Error Banner */}
          {errorMessage && (
            <div className="mb-5 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-2 animate-fadeIn">
              <svg
                className="w-4 h-4 mt-0.5 shrink-0"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                  clipRule="evenodd"
                />
              </svg>
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Google Sign In Button */}
          <button
            type="button"
            onClick={handleGoogleSubmit}
            disabled={loading}
            className="w-full flex items-center justify-center gap-3 py-2.5 px-4 bg-white border border-slate-200 hover:border-slate-300 rounded-xl text-sm font-medium text-slate-700 hover:bg-slate-50 transition shadow-sm disabled:opacity-60 disabled:cursor-not-allowed"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              />
            </svg>
            <span>Continue with Google</span>
          </button>

          <div className="relative my-6 flex items-center justify-center">
            <div className="border-t border-slate-200 w-full"></div>
            <span className="bg-white px-3 text-xs uppercase font-medium text-slate-400 absolute">
              or with email
            </span>
          </div>

          {/* Form */}
          <form onSubmit={handleEmailSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                {activeTab === "student" ? "Student Email" : "Admin Email"}
              </label>
              <div className="relative">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={
                    activeTab === "student"
                      ? "student@gmail.com"
                      : "admin@center.edu.vn"
                  }
                  required
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#c27803]/20 focus:border-[#c27803] transition"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
                  Password
                </label>
                <button
                  type="button"
                  onClick={() => {
                    setResetSent(false);
                    setResetEmail(email);
                    setShowResetModal(true);
                  }}
                  className="text-xs text-[#c27803] hover:text-[#92400e] font-semibold"
                >
                  Forgot password?
                </button>
              </div>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#c27803]/20 focus:border-[#c27803] transition pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? (
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18"
                      />
                    </svg>
                  ) : (
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                      />
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                      />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-3 px-4 bg-[#c27803] hover:bg-[#92400e] text-white rounded-xl text-xs font-heading font-extrabold uppercase tracking-wider shadow-md shadow-[#c27803]/25 hover:shadow-[#c27803]/40 transition disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <svg
                    className="animate-spin h-4 w-4 text-white"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                  <span>Authenticating...</span>
                </>
              ) : (
                <span>
                  Sign In to {activeTab === "student" ? "Portal" : "Admin Dashboard"}
                </span>
              )}
            </button>
          </form>

          {/* Student Helper Note */}
          {activeTab === "student" && (
            <div className="mt-6 p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-center">
              <p className="text-xs text-slate-500 font-medium">
                First time logging in? Sign in with the Google Account or Email you registered with the center.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Forgot Password Modal */}
      {showResetModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-slate-100 animate-scaleUp">
            <h3 className="text-lg font-heading font-bold text-[#261e16] mb-2 uppercase">Reset Password</h3>
            <p className="text-xs text-slate-500 mb-4">
              Enter your email address and we will send you a link to reset your password.
            </p>

            {resetSent ? (
              <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl mb-4">
                Password reset email sent! Check your inbox or spam folder.
              </div>
            ) : (
              <form onSubmit={handlePasswordReset} className="space-y-4">
                <input
                  type="email"
                  value={resetEmail}
                  onChange={(e) => setResetEmail(e.target.value)}
                  placeholder="your.email@example.com"
                  required
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#c27803]/20 focus:border-[#c27803]"
                />
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setShowResetModal(false)}
                    className="flex-1 py-2 px-3 border border-slate-200 text-slate-600 rounded-xl text-xs font-semibold hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={resetLoading}
                    className="flex-1 py-2.5 px-3 bg-[#c27803] text-white rounded-xl text-xs font-heading font-bold uppercase tracking-wider hover:bg-[#92400e] disabled:opacity-60"
                  >
                    {resetLoading ? "Sending..." : "Send Reset Link"}
                  </button>
                </div>
              </form>
            )}

            {resetSent && (
              <button
                type="button"
                onClick={() => setShowResetModal(false)}
                className="w-full py-2 bg-slate-100 text-slate-700 rounded-xl text-xs font-semibold hover:bg-slate-200"
              >
                Close
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Login;
