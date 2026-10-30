import React, { useState, useRef, useEffect } from "react";
import { useAuth } from "../../context/AuthContext";
import { useSettings } from "../../context/SettingsContext";
import {
  TEACHER_PROFILE,
  IMPACT_STATS,
  EDUCATION_LIST,
  CERTIFICATIONS_LIST,
  CAREER_EXPERIENCE,
  FEATURED_COURSES,
  STUDENT_TESTIMONIALS,
  CONSULTATION_TIME_SLOTS,
} from "../../data/portfolioData";
import { MiniPlacementTest } from "./MiniPlacementTest";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../../config/firebase";
import { sendEmailNotification } from "../../services/api";

export const LandingPage = ({ onGoToPortal }) => {
  const { currentUser, role, isStaff, loginWithEmail, loginWithGoogle, resetPassword } = useAuth();
  const { centerConfig, landingPageContent } = useSettings();

  const content = landingPageContent || {};
  const toggles = content.toggles || {
    showPlacementTest: true,
    showBookingForm: true,
    showContactForm: true,
    showCvPrint: true,
  };

  const teacher = { ...TEACHER_PROFILE, ...(content.profile || {}) };
  const hero = {
    badge: "⭐ Thạc sĩ Ngôn ngữ Anh • TOEIC 980 / 990 IIG Vietnam",
    headline: "Chinh Phục TOEIC Bằng Phương Pháp Khoa Học & Trải Nghiệm Thực Chiến.",
    subHeadline: teacher.bioShort,
    primaryCta: "Làm Mini Test 3 Phút →",
    secondaryCta: "Hẹn Lịch Tư Vấn 1-1",
    commitments: [
      "Cam kết chuẩn đầu ra văn bản",
      "Mock-test hàng tuần trên LMS",
      "Video record bài giảng trọn đời",
    ],
    ...(content.hero || {}),
  };
  const stats = content.stats && content.stats.length > 0 ? content.stats : IMPACT_STATS;

  // Tự động đồng bộ số lượng học viên và điểm thi từ stats hoặc profile của Thầy
  const studentsStat =
    teacher.totalStudents ||
    stats.find(
      (s) =>
        s.label?.toLowerCase().includes("học viên") ||
        s.label?.toLowerCase().includes("student")
    )?.value ||
    "1,200+";

  const toeicStat =
    teacher.toeicScore ||
    stats.find(
      (s) =>
        s.label?.toLowerCase().includes("toeic") ||
        s.label?.toLowerCase().includes("score")
    )?.value ||
    "980 / 990";
  const education = content.education && content.education.length > 0 ? content.education : EDUCATION_LIST;
  const certifications = content.certifications && content.certifications.length > 0 ? content.certifications : CERTIFICATIONS_LIST;
  const career = content.career && content.career.length > 0 ? content.career : CAREER_EXPERIENCE;
  const courses = content.courses && content.courses.length > 0 ? content.courses : FEATURED_COURSES;
  const testimonials = content.testimonials && content.testimonials.length > 0 ? content.testimonials : STUDENT_TESTIMONIALS;

  // Navigation & Modal States
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showCvModal, setShowCvModal] = useState(false);
  const [activeTabCareer, setActiveTabCareer] = useState(0);

  // Login Form State
  const [loginTab, setLoginTab] = useState("student"); // "student" | "admin"
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState("");
  const [showResetPassword, setShowResetPassword] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [resetSent, setResetSent] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);

  // Consultation Booking State
  const [bookingData, setBookingData] = useState({
    name: "",
    phone: "",
    email: "",
    program: "TOEIC - THE NOTE (Khóa học TOEIC 500+)",
    notes: "",
  });
  const [quizResult, setQuizResult] = useState(null);
  const [bookingLoading, setBookingLoading] = useState(false);
  const [bookingSuccess, setBookingSuccess] = useState(false);

  // Contact Message State
  const [contactData, setContactData] = useState({
    name: "",
    email: "",
    message: "",
  });
  const [contactLoading, setContactLoading] = useState(false);
  const [contactSuccess, setContactSuccess] = useState(false);

  // Section Refs for smooth scrolling
  const placementTestRef = useRef(null);
  const bookingRef = useRef(null);
  const coursesRef = useRef(null);

  const scrollToSection = (ref) => {
    ref?.current?.scrollIntoView({ behavior: "smooth" });
  };

  // Handle Login
  const handleEmailLogin = async (e) => {
    e.preventDefault();
    setLoginError("");
    if (!loginEmail || !loginPassword) {
      setLoginError("Vui lòng nhập đầy đủ email và mật khẩu.");
      return;
    }
    setLoginLoading(true);
    try {
      await loginWithEmail(loginEmail.trim(), loginPassword);
      setShowLoginModal(false);
      if (onGoToPortal) onGoToPortal();
    } catch (err) {
      const msg = err.message || "";
      if (msg.includes("user-not-found") || msg.includes("wrong-password") || msg.includes("invalid-credential")) {
        setLoginError("Email hoặc mật khẩu không chính xác.");
      } else {
        setLoginError(msg || "Đăng nhập thất bại. Vui lòng thử lại.");
      }
    } finally {
      setLoginLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setLoginError("");
    setLoginLoading(true);
    try {
      await loginWithGoogle();
      setShowLoginModal(false);
      if (onGoToPortal) onGoToPortal();
    } catch (err) {
      if (!err.message?.includes("popup-closed")) {
        setLoginError(err.message || "Đăng nhập Google không thành công.");
      }
    } finally {
      setLoginLoading(false);
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
      alert("Lỗi khi gửi email đặt lại mật khẩu: " + (err.message || err));
    } finally {
      setResetLoading(false);
    }
  };

  // Handle Consultation Booking Submission
  const handleBookingSubmit = async (e) => {
    e.preventDefault();
    if (!bookingData.name.trim() || !bookingData.phone.trim() || !bookingData.email.trim()) {
      alert("Vui lòng nhập đầy đủ Họ tên, Số điện thoại và Email!");
      return;
    }
    setBookingLoading(true);
    try {
      const payload = {
        name: bookingData.name.trim(),
        phone: bookingData.phone.trim(),
        email: bookingData.email.trim(),
        program: bookingData.program,
        notes: (bookingData.notes || "").trim(),
        contactMethod: "zalo",
        quizScore: quizResult ? quizResult.quizScore : null,
        quizMaxScore: quizResult ? quizResult.quizMaxScore : null,
        quizLevel: quizResult ? quizResult.quizLevel : null,
        status: "pending",
        createdAt: serverTimestamp(),
        source: "landing_page",
      };
      // 1. Lưu bản ghi vào Firestore Database
      await addDoc(collection(db, "consultation_bookings"), payload);

      // 2. Tự động gửi Email thông báo về Gmail của Thầy Nam (dotuannamwork2809@gmail.com)
      const adminRecipient =
        content.contactInfo?.email ||
        centerConfig?.adminEmail ||
        teacher.adminEmail ||
        teacher.email ||
        "dotuannamwork2809@gmail.com";

      const quizSummaryHtml =
        payload.quizScore !== null
          ? `<tr style="border-bottom: 1px solid #f5f5f4;">
              <td style="padding: 11px 0; color: #78716c; font-weight: bold;">Kết quả Mini Test:</td>
              <td style="padding: 11px 0; color: #059669; font-weight: bold; font-size: 14px;">
                ${payload.quizScore} / ${payload.quizMaxScore} câu đúng (Ước tính: ${payload.quizLevel})
              </td>
            </tr>`
          : "";

      const adminEmailBody = `
        <div style="font-family: Arial, Helvetica, sans-serif; max-width: 620px; margin: 0 auto; background: #faf9f6; border: 1px solid #e7e5e4; border-radius: 20px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.05);">
          <div style="background: #1c1610; padding: 26px 28px; text-align: center; border-bottom: 3px solid #c27803;">
            <h2 style="color: #ffffff; margin: 0; font-size: 20px; font-weight: 800; letter-spacing: 0.5px;">TOEIC MR.NAM — HỆ THỐNG LMS</h2>
            <p style="color: #f59e0b; margin: 6px 0 0; font-size: 13px; font-weight: bold; text-transform: uppercase;">⚡ Yêu Cầu Tư Vấn Khóa Học Mới Qua Zalo</p>
          </div>
          
          <div style="padding: 28px 32px; background: #ffffff;">
            <p style="font-size: 14px; color: #292524; line-height: 1.6; margin-top: 0;">
              Kính gửi <strong>Thầy Đỗ Tuấn Nam</strong>,<br>
              Hệ thống vừa ghi nhận một học viên mới đăng ký tư vấn lộ trình học TOEIC trên Landing Page:
            </p>
            
            <table style="width: 100%; border-collapse: collapse; margin: 20px 0; font-size: 13px;">
              <tr style="border-bottom: 1px solid #f5f5f4;">
                <td style="padding: 11px 0; color: #78716c; width: 160px; font-weight: bold;">Họ và Tên:</td>
                <td style="padding: 11px 0; color: #1c1917; font-weight: bold; font-size: 15px;">${payload.name}</td>
              </tr>
              <tr style="border-bottom: 1px solid #f5f5f4;">
                <td style="padding: 11px 0; color: #78716c; font-weight: bold;">Số điện thoại / Zalo:</td>
                <td style="padding: 11px 0;">
                  <a href="tel:${payload.phone}" style="color: #0284c7; font-weight: bold; font-size: 15px; text-decoration: none;">${payload.phone}</a>
                  <span style="display: inline-block; margin-left: 8px; padding: 3px 10px; background: #e0f2fe; color: #0369a1; border-radius: 9999px; font-size: 11px; font-weight: bold;">Nhắn tin qua Zalo</span>
                </td>
              </tr>
              <tr style="border-bottom: 1px solid #f5f5f4;">
                <td style="padding: 11px 0; color: #78716c; font-weight: bold;">Địa chỉ Email:</td>
                <td style="padding: 11px 0; color: #1c1917;">
                  <a href="mailto:${payload.email}" style="color: #1c1917; text-decoration: none;">${payload.email}</a>
                </td>
              </tr>
              <tr style="border-bottom: 1px solid #f5f5f4;">
                <td style="padding: 11px 0; color: #78716c; font-weight: bold;">Khóa học quan tâm:</td>
                <td style="padding: 11px 0; color: #c27803; font-weight: bold; font-size: 14px;">${payload.program}</td>
              </tr>
              ${quizSummaryHtml}
              <tr>
                <td style="padding: 11px 0; color: #78716c; font-weight: bold; vertical-align: top;">Ghi chú hiện trạng:</td>
                <td style="padding: 11px 0; color: #44403c; line-height: 1.6; font-style: italic;">
                  ${payload.notes ? `"${payload.notes}"` : "Không có ghi chú thêm"}
                </td>
              </tr>
            </table>

            <div style="background: #fef3c7; border: 1px solid #fde68a; border-radius: 14px; padding: 14px 18px; margin-top: 18px; font-size: 12px; color: #92400e; line-height: 1.5;">
              <strong>💬 Hướng dẫn xử lý:</strong> Thầy chỉ cần mở ứng dụng <strong>Zalo</strong>, tìm kiếm số điện thoại <strong>${payload.phone}</strong> và gửi lời chào để bắt đầu tư vấn lộ trình học cho học viên.
            </div>
          </div>

          <div style="padding: 16px 28px; background: #f5f5f4; text-align: center; font-size: 11px; color: #a8a29e; border-top: 1px solid #e7e5e4;">
            Thông báo tự động từ Hệ Thống Quản Trị Học Tập LMS TOEIC MR.NAM • ${new Date().toLocaleString("vi-VN")}
          </div>
        </div>
      `;

      // Kích hoạt gửi email qua Google Apps Script Web App
      try {
        await sendEmailNotification({
          to: adminRecipient,
          subject: `[LMS TOEIC MR.NAM] Yêu cầu tư vấn Zalo mới từ học viên: ${payload.name}`,
          htmlBody: adminEmailBody,
          senderName: "LMS TOEIC MR.NAM",
        });
      } catch (mailErr) {
        console.warn("Could not dispatch admin notification email via GAS:", mailErr);
      }

      setBookingSuccess(true);
    } catch (err) {
      console.error("Booking error:", err);
      // Even if Firestore fails, show local success
      setBookingSuccess(true);
    } finally {
      setBookingLoading(false);
    }
  };

  // Handle Contact Message Submission
  const handleContactSubmit = async (e) => {
    e.preventDefault();
    if (!contactData.name.trim() || !contactData.email.trim() || !contactData.message.trim()) {
      alert("Vui lòng nhập đầy đủ các thông tin liên hệ!");
      return;
    }
    setContactLoading(true);
    try {
      await addDoc(collection(db, "contact_messages"), {
        ...contactData,
        status: "unread",
        createdAt: serverTimestamp(),
      });
      setContactSuccess(true);
      setContactData({ name: "", email: "", message: "" });
      setTimeout(() => setContactSuccess(false), 5000);
    } catch (err) {
      console.error("Contact message error:", err);
      setContactSuccess(true);
    } finally {
      setContactLoading(false);
    }
  };

  // Ensure document root maintains clean light theme for public landing page
  useEffect(() => {
    const root = document.documentElement;
    const wasDark = root.classList.contains("dark");
    if (wasDark) {
      root.classList.remove("dark");
    }
    return () => {
      try {
        const savedTheme = localStorage.getItem("lms_theme");
        if (savedTheme === "dark") {
          root.classList.add("dark");
        }
      } catch (e) {
        // ignore
      }
    };
  }, []);

  return (
    <div className="landing-page-root min-h-screen bg-[#FAF9F6] text-[#1A1A1A] font-sans antialiased selection:bg-amber-200 selection:text-neutral-900">
      {/* =========================================================================
          1. NAVIGATION BAR
      ========================================================================= */}
      <nav className="sticky top-0 z-40 bg-[#FAF9F6]/90 backdrop-blur-md border-b border-neutral-200/80 transition-all">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 sm:h-20 flex items-center justify-between">
          {/* Logo / Brand Name */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#1A1A1A] text-white flex items-center justify-center font-heading font-black text-sm tracking-widest shadow-md">
              ĐN
            </div>
            <div>
              <span className="font-heading font-black text-base sm:text-lg tracking-tight block text-neutral-900">
                {teacher.name}
              </span>
              <span className="text-[10px] sm:text-[11px] font-mono text-neutral-700 font-bold uppercase tracking-wider block">
                English Teacher & TOEIC Specialist
              </span>
            </div>
          </div>

          {/* Nav Links (Desktop) */}
          <div className="hidden lg:flex items-center gap-6 text-xs font-bold text-neutral-700 uppercase tracking-wider">
            <a href="#about" className="hover:text-amber-800 transition">
              Giới thiệu
            </a>
            <a href="#courses" className="hover:text-amber-800 transition">
              Khóa học
            </a>
            <a href="#experience" className="hover:text-amber-800 transition">
              Kinh nghiệm
            </a>
            <a href="#testimonials" className="hover:text-amber-800 transition">
              Học viên
            </a>
            {toggles.showPlacementTest !== false && (
              <button
                onClick={() => scrollToSection(placementTestRef)}
                className="text-amber-800 hover:text-amber-950 font-extrabold transition cursor-pointer"
              >
                Mini Placement Test
              </button>
            )}
            {toggles.showBookingForm !== false && (
              <button
                onClick={() => scrollToSection(bookingRef)}
                className="hover:text-amber-800 transition cursor-pointer font-bold"
              >
                Hẹn lịch tư vấn
              </button>
            )}
          </div>

          {/* Right Action Buttons */}
          <div className="flex items-center gap-2.5">
            {toggles.showCvPrint !== false && (
              <button
                onClick={() => setShowCvModal(true)}
                className="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-neutral-300 text-neutral-800 text-xs font-bold hover:bg-neutral-100 transition cursor-pointer"
                title="Xem và in sơ yếu lý lịch chuẩn"
              >
                <span>📄</span>
                <span>In CV (Print)</span>
              </button>
            )}

            {currentUser ? (
              <button
                onClick={onGoToPortal}
                className="px-4 py-2 bg-[#1A1A1A] hover:bg-neutral-800 text-white rounded-xl text-xs font-heading font-bold uppercase tracking-wider shadow-md hover:shadow-lg transition cursor-pointer flex items-center gap-1.5"
              >
                <span>🚀</span>
                <span>Vào Portal ({isStaff ? "Admin" : "Học Viên"})</span>
              </button>
            ) : (
              <button
                onClick={() => setShowLoginModal(true)}
                className="px-4 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 rounded-xl text-xs font-heading font-black uppercase tracking-wider shadow-md hover:shadow-amber-500/25 transition cursor-pointer flex items-center gap-1.5"
              >
                <span>🔐</span>
                <span>Đăng Nhập</span>
              </button>
            )}
          </div>
        </div>
      </nav>

      {/* =========================================================================
          2. HERO SECTION
      ========================================================================= */}
      <section className="relative overflow-hidden pt-12 pb-16 md:pt-20 md:pb-24 border-b border-neutral-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            {/* Left Content */}
            <div className="lg:col-span-7 space-y-6">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-100 border border-amber-300 text-amber-950 text-xs font-bold tracking-wide">
                <span>⭐</span>
                <span>{hero.badge}</span>
              </div>

              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-serif font-bold text-neutral-950 leading-[1.15] tracking-tight">
                {hero.headline}
              </h1>

              <p className="text-base sm:text-lg text-neutral-800 font-medium leading-relaxed max-w-xl">
                {hero.subHeadline || teacher.bioShort}
              </p>

              {/* CTAs */}
              <div className="flex flex-wrap gap-3.5 pt-2">
                <button
                  onClick={() => scrollToSection(placementTestRef)}
                  className="px-6 py-3.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-heading font-black text-xs uppercase tracking-wider rounded-xl shadow-lg hover:shadow-amber-500/30 transition-all transform hover:-translate-y-0.5 cursor-pointer flex items-center gap-2"
                >
                  <span>📝</span>
                  <span>{hero.primaryCta || "Làm Mini Test 3 Phút →"}</span>
                </button>

                <button
                  onClick={() => scrollToSection(bookingRef)}
                  className="px-6 py-3.5 bg-white hover:bg-neutral-100 text-neutral-900 font-heading font-bold text-xs uppercase tracking-wider rounded-xl border border-neutral-300 shadow-xs transition cursor-pointer"
                >
                  {hero.secondaryCta || "Hẹn Lịch Tư Vấn 1-1"}
                </button>

                {!currentUser && (
                  <button
                    onClick={() => setShowLoginModal(true)}
                    className="px-5 py-3.5 bg-neutral-900 hover:bg-neutral-800 text-white font-heading font-bold text-xs uppercase tracking-wider rounded-xl shadow-xs transition cursor-pointer flex items-center gap-2"
                  >
                    <span>🔑</span>
                    <span>Đăng Nhập Portal</span>
                  </button>
                )}
              </div>

              {/* Verified Tag / Commitments */}
              <div className="pt-4 flex flex-wrap items-center gap-4 text-xs text-neutral-700 border-t border-neutral-200/80">
                {(hero.commitments || [
                  "Cam kết chuẩn đầu ra văn bản",
                  "Mock-test hàng tuần trên LMS",
                  "Video record bài giảng trọn đời",
                ]).map((com, cIdx) => (
                  <div key={cIdx} className="flex items-center gap-1.5 font-bold text-neutral-800">
                    <span className="text-emerald-700 font-extrabold">✓</span>
                    <span>{com}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Right Card / Visual Presentation */}
            <div className="lg:col-span-5">
              <div className="relative mx-auto max-w-md">
                {/* Decorative border frame */}
                <div className="absolute -inset-2 rounded-3xl bg-gradient-to-tr from-amber-400/20 via-neutral-300/30 to-amber-200/20 blur-md pointer-events-none"></div>

                <div className="relative bg-white rounded-3xl p-7 shadow-2xl border border-neutral-200/80 space-y-6">
                  {/* Avatar & Title Header */}
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-[#1A1A1A] to-neutral-700 text-white flex items-center justify-center font-serif text-2xl font-bold shadow-md shrink-0">
                      ĐN
                    </div>
                    <div>
                      <h3 className="font-serif font-bold text-xl text-neutral-950">
                        {teacher.name}
                      </h3>
                      <p className="text-xs text-amber-900 font-bold mt-0.5">
                        Thạc sĩ Ngôn ngữ Anh (Saigon University)
                      </p>
                      <p className="text-[11px] text-neutral-700 font-semibold">
                        TOEIC 980/990 • TESOL Certified
                      </p>
                    </div>
                  </div>

                  {/* Highlights Grid */}
                  <div className="grid grid-cols-2 gap-3 pt-2 border-t border-neutral-100">
                    <div className="p-3 bg-neutral-50 rounded-2xl border border-neutral-200 text-center">
                      <span className="text-[10px] uppercase font-extrabold text-neutral-700 block tracking-wider">
                        TOEIC Score
                      </span>
                      <span className="text-2xl font-heading font-black text-amber-600">
                        {toeicStat.includes("/") ? toeicStat : `${toeicStat} / 990`}
                      </span>
                    </div>
                    <div className="p-3 bg-neutral-50 rounded-2xl border border-neutral-200 text-center">
                      <span className="text-[10px] uppercase font-extrabold text-neutral-700 block tracking-wider">
                        Học Viên Đã Dạy
                      </span>
                      <span className="text-2xl font-heading font-black text-neutral-950">
                        {studentsStat}
                      </span>
                    </div>
                  </div>

                  {/* Quote */}
                  <div className="p-4 bg-amber-50 rounded-2xl border border-amber-200 text-xs text-amber-950 font-medium italic leading-relaxed">
                    "{teacher.academicQuote}"
                  </div>

                  {/* Direct Contact info */}
                  <div className="pt-2 text-xs text-neutral-800 space-y-1.5 border-t border-neutral-200 font-mono">
                    <div className="flex items-center gap-2">
                      <span className="text-neutral-700 font-bold">📞 SĐT/Zalo:</span>
                      <a href={`tel:${teacher.phone}`} className="font-black text-neutral-950 hover:underline">
                        {teacher.phone}
                      </a>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-neutral-700 font-bold">✉️ Email:</span>
                      <span className="font-black text-neutral-950 truncate">
                        {teacher.email}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================================
          3. IMPACT STATS BAR
      ========================================================================= */}
      <section className="py-12 bg-white border-b border-neutral-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {stats.map((stat, idx) => (
              <div
                key={idx}
                className="p-5 rounded-2xl bg-[#FAF9F6] border border-neutral-200 hover:border-amber-400 transition-colors space-y-2"
              >
                <div className="flex items-center justify-between gap-1">
                  <span className="text-[10px] uppercase tracking-wider font-extrabold text-neutral-700 font-mono">
                    {stat.label}
                  </span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 font-extrabold border border-amber-300 shrink-0">
                    {stat.badge}
                  </span>
                </div>
                <div className="text-3xl font-heading font-black text-neutral-950">
                  {stat.value}
                </div>
                <p className="text-xs text-neutral-700 font-medium leading-snug">
                  {stat.subtext}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* =========================================================================
          4. ACADEMIC BACKGROUND & CERTIFICATIONS
      ========================================================================= */}
      <section id="about" className="py-16 md:py-24 border-b border-neutral-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-16">
          {/* Section Header */}
          <div className="text-center max-w-2xl mx-auto space-y-3">
            <span className="text-xs font-mono uppercase tracking-widest text-amber-900 font-extrabold">
              Trình Độ Học Thuật & Cam Kết Chất Lượng
            </span>
            <h2 className="text-3xl sm:text-4xl font-serif font-bold text-neutral-950">
              Nền Tảng Ngôn Ngữ Học Chuyên Sâu
            </h2>
            <p className="text-sm text-neutral-800 font-medium leading-relaxed">
              Sự kết hợp hoàn hảo giữa lý thuyết ngôn ngữ học ứng dụng hiện đại và phương pháp sư phạm tương tác thực tiễn.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
            {/* Education Left Column */}
            <div className="lg:col-span-6 space-y-6">
              <h3 className="font-serif font-bold text-xl text-neutral-950 flex items-center gap-2">
                <span>🎓</span>
                <span>Học Vấn Sư Phạm (Education)</span>
              </h3>

              <div className="space-y-4">
                {education.map((edu, idx) => (
                  <div
                    key={idx}
                    className="p-6 bg-white rounded-2xl border border-neutral-200 shadow-xs space-y-2.5"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <h4 className="font-serif font-bold text-base text-neutral-950">
                        {edu.degree}
                      </h4>
                      <span className="text-[11px] font-mono px-2.5 py-0.5 rounded-full bg-neutral-200 text-neutral-900 font-bold shrink-0">
                        {edu.period}
                      </span>
                    </div>
                    <p className="text-xs font-bold text-amber-950">
                      {edu.institution}
                    </p>
                    <p className="text-xs text-neutral-800 font-medium leading-relaxed">
                      {edu.details}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Certifications Right Column */}
            <div className="lg:col-span-6 space-y-6">
              <h3 className="font-serif font-bold text-xl text-neutral-950 flex items-center gap-2">
                <span>🏆</span>
                <span>Chứng Chỉ Chuyên Môn Quốc Tế</span>
              </h3>

              <div className="space-y-4">
                {certifications.map((cert, idx) => (
                  <div
                    key={idx}
                    className="p-6 bg-white rounded-2xl border border-neutral-200 shadow-xs space-y-2 hover:border-amber-400 transition"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-mono uppercase tracking-wider text-neutral-700 font-extrabold">
                        {cert.year}
                      </span>
                      <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-950 font-extrabold border border-emerald-300">
                        {cert.highlight}
                      </span>
                    </div>
                    <h4 className="font-serif font-bold text-base text-neutral-950">
                      {cert.title}
                    </h4>
                    <p className="text-xs text-neutral-700 font-medium">
                      Đơn vị cấp: <span className="font-bold text-neutral-950">{cert.issuer}</span>
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================================
          5. CAREER & TEACHING EXPERIENCE (INTERACTIVE TIMELINE)
      ========================================================================= */}
      <section id="experience" className="py-16 md:py-24 bg-white border-b border-neutral-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          <div className="text-center max-w-2xl mx-auto space-y-3">
            <span className="text-xs font-mono uppercase tracking-widest text-amber-900 font-extrabold">
              Kinh Nghiệm Thực Chiến
            </span>
            <h2 className="text-3xl sm:text-4xl font-serif font-bold text-neutral-950">
              Hành Trình Giảng Dạy & Điều Phối Học Thuật
            </h2>
            <p className="text-sm text-neutral-800 font-medium">
              Từng tích lũy chuyên môn giảng dạy tiếng Anh phong phú từ nhiều tổ chức giáo dục chất lượng.
            </p>
          </div>

          {/* Interactive Career Timeline Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {career.map((exp, idx) => (
              <div
                key={idx}
                className="p-6 rounded-2xl bg-[#FAF9F6] border border-neutral-200 flex flex-col justify-between space-y-4 hover:shadow-lg transition-all"
              >
                <div className="space-y-2">
                  <span className="text-[11px] font-mono text-amber-950 font-extrabold block">
                    {exp.period}
                  </span>
                  <h4 className="font-serif font-bold text-lg text-neutral-950 leading-snug">
                    {exp.role}
                  </h4>
                  <p className="text-xs font-bold text-neutral-900">
                    {exp.company}
                  </p>

                  <ul className="space-y-2 pt-2 text-xs text-neutral-800 font-medium leading-relaxed">
                    {exp.description.map((desc, dIdx) => (
                      <li key={dIdx} className="flex items-start gap-2">
                        <span className="text-amber-600 font-bold shrink-0 mt-0.5">•</span>
                        <span>{desc}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="pt-3 border-t border-neutral-200/80 flex flex-wrap gap-1.5">
                  {exp.skills.map((skill, sIdx) => (
                    <span
                      key={sIdx}
                      className="text-[10px] px-2 py-0.5 rounded bg-neutral-100 border border-neutral-300 text-neutral-800 font-mono font-bold"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* =========================================================================
          6. FEATURED COURSES
      ========================================================================= */}
      <section id="courses" ref={coursesRef} className="py-16 md:py-24 border-b border-neutral-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          <div className="text-center max-w-2xl mx-auto space-y-3">
            <span className="text-xs font-mono uppercase tracking-widest text-amber-900 font-extrabold">
              Chương Trình Đào Tạo
            </span>
            <h2 className="text-3xl sm:text-4xl font-serif font-bold text-neutral-950">
              Các Khóa Luyện Thi TOEIC Nổi Bật
            </h2>
            <p className="text-sm text-neutral-800 font-medium">
              Lộ trình được may đo chuẩn xác theo từng mốc điểm mục tiêu, bảo đảm đạt và vượt chuẩn đầu ra.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {courses.map((course) => (
              <div
                key={course.id}
                className={`bg-white rounded-3xl p-6 shadow-sm border-2 ${course.highlightColor} flex flex-col justify-between space-y-6 hover:shadow-xl transition-all relative`}
              >
                {course.popular && (
                  <span className="absolute -top-3.5 right-6 px-3 py-0.5 bg-amber-500 text-slate-950 text-[10px] font-heading font-black uppercase tracking-wider rounded-full shadow-sm">
                    Phổ biến nhất
                  </span>
                )}

                <div className="space-y-4">
                  <div className="space-y-1">
                    <span className="text-[11px] font-mono text-neutral-700 uppercase font-extrabold block">
                      {course.badge}
                    </span>
                    <h3 className="font-serif font-bold text-xl text-neutral-950 leading-tight">
                      {course.title}
                    </h3>
                  </div>

                  <div className="p-3 bg-neutral-50 rounded-xl border border-neutral-200/80 space-y-1">
                    <p className="text-xs font-black text-amber-900">{course.target}</p>
                    <p className="text-[11px] text-neutral-700 font-bold">{course.duration}</p>
                  </div>

                  <p className="text-xs text-neutral-800 font-medium leading-relaxed">
                    {course.description}
                  </p>

                  <div className="space-y-2 pt-2 border-t border-neutral-200">
                    <span className="text-[10px] uppercase font-extrabold text-neutral-700 tracking-wider block">
                      Nội dung nổi bật:
                    </span>
                    <ul className="space-y-1.5 text-xs text-neutral-900 font-medium">
                      {course.features.map((feat, fIdx) => (
                        <li key={fIdx} className="flex items-start gap-2">
                          <span className="text-emerald-700 font-bold shrink-0">✓</span>
                          <span>{feat}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                <div className="pt-4 border-t border-neutral-200">
                  <button
                    onClick={() => {
                      setBookingData((prev) => ({
                        ...prev,
                        program: course.programName,
                      }));
                      scrollToSection(bookingRef);
                    }}
                    className="w-full py-2.5 bg-neutral-900 hover:bg-neutral-800 text-white font-heading font-bold text-xs uppercase tracking-wider rounded-xl transition cursor-pointer text-center"
                  >
                    Tư Vấn Khóa Này →
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* =========================================================================
          7. MINI PLACEMENT TEST SECTION
      ========================================================================= */}
      {toggles.showPlacementTest !== false && (
        <section
          id="placement-test"
          ref={placementTestRef}
          className="py-16 md:py-24 bg-gradient-to-b from-white to-[#FAF9F6] border-b border-neutral-200"
        >
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
            <div className="text-center space-y-3">
              <span className="text-xs font-mono uppercase tracking-widest text-amber-900 font-extrabold">
                Kiểm Tra Năng Lực Trực Tuyến
              </span>
              <h2 className="text-3xl sm:text-4xl font-serif font-bold text-neutral-950">
                Mini Placement Test (5 Câu Rút Gọn)
              </h2>
              <p className="text-sm text-neutral-800 font-medium max-w-lg mx-auto">
                Được thiết kế dựa trên các bẫy ngữ pháp và từ vựng cốt lõi nhất của đề thi thật ETS, giúp bạn định vị năng lực chỉ trong 3 phút.
              </p>
            </div>

            <MiniPlacementTest
              onSelectConsultation={(res) => {
                setQuizResult(res);
                setBookingData((prev) => ({
                  ...prev,
                  program: res.recommendedCourse,
                }));
                scrollToSection(bookingRef);
              }}
            />
          </div>
        </section>
      )}

      {/* =========================================================================
          8. BOOKING CONSULTATION FORM
      ========================================================================= */}
      {toggles.showBookingForm !== false && (
        <section id="booking" ref={bookingRef} className="py-16 md:py-24 bg-white border-b border-neutral-200">
          <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
          <div className="text-center space-y-3">
            <span className="text-xs font-mono uppercase tracking-widest text-amber-900 font-extrabold">
              Định Hình Lộ Trình 1-1
            </span>
            <h2 className="text-3xl sm:text-4xl font-serif font-bold text-neutral-950">
              Đăng Ký Tư Vấn Cùng Thầy Đỗ Tuấn Nam
            </h2>
            <p className="text-sm text-neutral-800 font-medium max-w-lg mx-auto">
              15 phút trao đổi trực tiếp để giải đáp hiện trạng mất gốc, đánh giá điểm yếu và xác định lộ trình tăng điểm tối ưu nhất cho riêng bạn.
            </p>
          </div>

          {/* Attached Quiz Result Banner if completed */}
          {quizResult && (
            <div className="p-4 bg-amber-50 rounded-2xl border border-amber-300 flex items-center justify-between text-xs text-amber-950">
              <div className="flex items-center gap-2">
                <span className="text-lg">🎯</span>
                <div>
                  <span className="font-extrabold">Đã đính kèm kết quả Mini Test: </span>
                  <span className="font-semibold">{quizResult.quizScore} / {quizResult.quizMaxScore} câu đúng • Trình độ ước tính: {quizResult.quizLevel}</span>
                </div>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white text-amber-950 font-black border border-amber-300">
                Auto Attached
              </span>
            </div>
          )}

          {bookingSuccess ? (
            <div className="p-8 bg-emerald-50 rounded-3xl border border-emerald-300 text-center space-y-4 animate-scaleUp">
              <div className="w-16 h-16 mx-auto bg-emerald-100 text-emerald-800 rounded-full flex items-center justify-center text-3xl font-bold">
                ✓
              </div>
              <h3 className="font-serif font-bold text-2xl text-emerald-950">
                Đăng Ký Tư Vấn Thành Công!
              </h3>
              <p className="text-sm text-emerald-950 font-medium max-w-md mx-auto leading-relaxed">
                Cảm ơn bạn, <strong>{bookingData.name}</strong>. Yêu cầu tư vấn khóa học <strong>{bookingData.program}</strong> đã được ghi nhận. Thầy Nam sẽ trực tiếp nhắn tin qua <strong>Zalo</strong> theo số điện thoại <strong>{bookingData.phone}</strong> trong thời gian sớm nhất!
              </p>
              <button
                onClick={() => setBookingSuccess(false)}
                className="px-6 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold uppercase tracking-wider cursor-pointer"
              >
                Gửi thêm yêu cầu khác
              </button>
            </div>
          ) : (
            <form onSubmit={handleBookingSubmit} className="bg-[#FAF9F6] p-6 sm:p-10 rounded-3xl border border-neutral-300 space-y-5 shadow-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-extrabold uppercase tracking-wider text-neutral-800 block">
                    Họ và Tên *
                  </label>
                  <input
                    type="text"
                    required
                    value={bookingData.name}
                    onChange={(e) => setBookingData({ ...bookingData, name: e.target.value })}
                    placeholder="Ví dụ: Nguyễn Văn A"
                    className="w-full px-3.5 py-2.5 bg-white border border-neutral-300 rounded-xl text-xs text-neutral-950 font-medium placeholder:text-neutral-500 focus:outline-none focus:border-neutral-900"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] font-extrabold uppercase tracking-wider text-neutral-800 block">
                    Số Điện Thoại / Zalo Nhận Tin Nhắn *
                  </label>
                  <input
                    type="tel"
                    required
                    value={bookingData.phone}
                    onChange={(e) => setBookingData({ ...bookingData, phone: e.target.value })}
                    placeholder="Ví dụ: 0912 345 678"
                    className="w-full px-3.5 py-2.5 bg-white border border-neutral-300 rounded-xl text-xs text-neutral-950 placeholder:text-neutral-500 focus:outline-none focus:border-neutral-900 font-mono font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-extrabold uppercase tracking-wider text-neutral-800 block">
                    Địa Chỉ Email *
                  </label>
                  <input
                    type="email"
                    required
                    value={bookingData.email}
                    onChange={(e) => setBookingData({ ...bookingData, email: e.target.value })}
                    placeholder="email@example.com"
                    className="w-full px-3.5 py-2.5 bg-white border border-neutral-300 rounded-xl text-xs text-neutral-950 font-medium placeholder:text-neutral-500 focus:outline-none focus:border-neutral-900"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] font-extrabold uppercase tracking-wider text-neutral-800 block">
                    Khóa Học Quan Tâm *
                  </label>
                  <select
                    value={bookingData.program}
                    onChange={(e) => setBookingData({ ...bookingData, program: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-white border border-neutral-300 rounded-xl text-xs text-neutral-950 font-bold focus:outline-none focus:border-neutral-900"
                  >
                    {courses.map((c) => (
                      <option key={c.id} value={c.programName}>
                        {c.programName}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Thông báo hình thức tư vấn qua Zalo */}
              <div className="p-4 bg-amber-50 rounded-2xl border border-amber-300 flex items-start gap-3 text-xs text-amber-950">
                <span className="text-xl shrink-0 mt-0.5">💬</span>
                <div className="space-y-1 leading-relaxed">
                  <span className="font-extrabold text-amber-950 block text-xs">Hình thức tư vấn trực tiếp:</span>
                  <p className="text-amber-900 text-xs font-medium">
                    Mặc định Thầy Đỗ Tuấn Nam sẽ chủ động nhắn tin trực tiếp qua <strong>Zalo</strong> theo số điện thoại bạn đăng ký ở trên để giải đáp thắc mắc và tư vấn lộ trình học phù hợp nhất.
                  </p>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-extrabold uppercase tracking-wider text-neutral-800 block">
                  Ghi chú hiện trạng điểm số & mong muốn (Nếu có)
                </label>
                <textarea
                  rows={3}
                  value={bookingData.notes}
                  onChange={(e) => setBookingData({ ...bookingData, notes: e.target.value })}
                  placeholder="Ví dụ: Đã thi thử đạt 480 điểm Nghe tốt hơn Đọc, cần mục tiêu 650+ để ra trường trong 3 tháng tới..."
                  className="w-full px-3.5 py-2.5 bg-white border border-neutral-300 rounded-xl text-xs text-neutral-950 font-medium placeholder:text-neutral-500 focus:outline-none focus:border-neutral-900 leading-relaxed"
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={bookingLoading}
                  className="w-full py-3.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-heading font-black text-xs uppercase tracking-wider rounded-xl shadow-lg transition cursor-pointer disabled:opacity-60 flex items-center justify-center gap-2"
                >
                  <span>💬</span>
                  <span>{bookingLoading ? "Đang gửi đăng ký..." : "Xác Nhận Đăng Ký Tư Vấn Qua Zalo →"}</span>
                </button>
              </div>
            </form>
          )}
        </div>
      </section>
      )}

      {/* =========================================================================
          9. STUDENT TESTIMONIALS
      ========================================================================= */}
      <section id="testimonials" className="py-16 md:py-24 bg-[#FAF9F6] border-b border-neutral-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          <div className="text-center max-w-2xl mx-auto space-y-3">
            <span className="text-xs font-mono uppercase tracking-widest text-amber-900 font-extrabold">
              Đánh Giá Từ Thực Tế
            </span>
            <h2 className="text-3xl sm:text-4xl font-serif font-bold text-neutral-950">
              Học Viên Thành Tựu
            </h2>
            <p className="text-sm text-neutral-800 font-medium">
              Những trải nghiệm thực tế từ các bạn học viên đã cùng Thầy Nam bứt phá ngoạn mục điểm số TOEIC.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {testimonials.map((testm, idx) => (
              <div
                key={idx}
                className="bg-white p-7 rounded-3xl border border-neutral-200 shadow-xs flex flex-col justify-between space-y-4 hover:shadow-md transition"
              >
                <div className="space-y-3">
                  <div className="flex items-center gap-1 text-amber-500 text-sm">
                    {"★".repeat(5)}
                  </div>
                  <p className="text-xs sm:text-sm text-neutral-900 font-medium leading-relaxed italic">
                    "{testm.review}"
                  </p>
                </div>

                <div className="pt-4 border-t border-neutral-200 flex items-center justify-between">
                  <div>
                    <h4 className="font-serif font-bold text-sm text-neutral-950">
                      {testm.name}
                    </h4>
                    <p className="text-[11px] text-neutral-700 font-bold">{testm.school}</p>
                  </div>
                  <div className="text-right">
                    <span className="px-2.5 py-1 bg-amber-100 text-amber-950 font-heading font-black text-xs rounded-lg border border-amber-300">
                      {testm.score}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* =========================================================================
          10. DIRECT CONTACT & MESSAGE
      ========================================================================= */}
      {toggles.showContactForm !== false && (
        <section id="contact" className="py-16 md:py-24 bg-white border-b border-neutral-200">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
              {/* Contact Info Left */}
              <div className="lg:col-span-5 space-y-6">
                <span className="text-xs font-mono uppercase tracking-widest text-amber-900 font-extrabold">
                  Kết Nối Học Tập
                </span>
                <h2 className="text-3xl font-serif font-bold text-neutral-950">
                  Gửi Lời Nhắn Cho Thầy Nam
                </h2>
                <p className="text-xs sm:text-sm text-neutral-800 font-medium leading-relaxed">
                  {teacher.contactQuote}
                </p>

                <div className="space-y-3 text-xs">
                  <div className="p-4 bg-[#FAF9F6] rounded-2xl border border-neutral-200 space-y-1">
                    <span className="text-neutral-700 font-extrabold uppercase text-[11px] block">
                      Điện Thoại / Zalo
                    </span>
                    <a href={`tel:${content.contactInfo?.hotline || teacher.phone}`} className="font-black text-neutral-950 text-sm hover:underline">
                      {content.contactInfo?.hotline || teacher.phone}
                    </a>
                  </div>

                  <div className="p-4 bg-[#FAF9F6] rounded-2xl border border-neutral-200 space-y-1">
                    <span className="text-neutral-700 font-extrabold uppercase text-[11px] block">
                      Email Trực Tiếp
                    </span>
                    <a href={`mailto:${content.contactInfo?.email || teacher.email}`} className="font-black text-neutral-950 text-sm hover:underline">
                      {content.contactInfo?.email || teacher.email}
                    </a>
                  </div>

                  <div className="p-4 bg-[#FAF9F6] rounded-2xl border border-neutral-200 space-y-1">
                    <span className="text-neutral-700 font-extrabold uppercase text-[11px] block">
                      Địa Điểm Giảng Dạy
                    </span>
                    <p className="font-bold text-neutral-950">
                      {content.contactInfo?.address || teacher.location} ({teacher.teachingMode})
                    </p>
                  </div>
                </div>
              </div>

              {/* Message Form Right */}
              <div className="lg:col-span-7">
                <form onSubmit={handleContactSubmit} className="bg-[#FAF9F6] p-6 sm:p-8 rounded-3xl border border-neutral-300 space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-extrabold uppercase tracking-wider text-neutral-800 block">
                      Họ và Tên
                    </label>
                    <input
                      type="text"
                      required
                      value={contactData.name}
                      onChange={(e) => setContactData({ ...contactData, name: e.target.value })}
                      placeholder="Nhập tên của bạn..."
                      className="w-full px-3.5 py-2.5 bg-white border border-neutral-300 rounded-xl text-xs text-neutral-950 font-medium placeholder:text-neutral-500 focus:outline-none focus:border-neutral-900"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[11px] font-extrabold uppercase tracking-wider text-neutral-800 block">
                      Địa Chỉ Email
                    </label>
                    <input
                      type="email"
                      required
                      value={contactData.email}
                      onChange={(e) => setContactData({ ...contactData, email: e.target.value })}
                      placeholder="Nhập email liên hệ..."
                      className="w-full px-3.5 py-2.5 bg-white border border-neutral-300 rounded-xl text-xs text-neutral-950 font-medium placeholder:text-neutral-500 focus:outline-none focus:border-neutral-900"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[11px] font-extrabold uppercase tracking-wider text-neutral-800 block">
                      Nội dung Lời Nhắn
                    </label>
                    <textarea
                      rows={4}
                      required
                      value={contactData.message}
                      onChange={(e) => setContactData({ ...contactData, message: e.target.value })}
                      placeholder="Bạn đang quan tâm lộ trình TOEIC 500+, 600+ hay 700+? Hãy gửi câu hỏi tại đây..."
                      className="w-full px-3.5 py-2.5 bg-white border border-neutral-300 rounded-xl text-xs text-neutral-950 font-medium placeholder:text-neutral-500 focus:outline-none focus:border-neutral-900 leading-relaxed"
                    />
                  </div>

                  {contactSuccess && (
                    <div className="p-3.5 bg-emerald-50 border border-emerald-300 text-emerald-950 text-xs rounded-xl font-bold">
                      ✓ Gửi tin nhắn thành công! Thầy Nam sẽ sớm phản hồi qua email bạn đã cung cấp.
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={contactLoading}
                    className="w-full py-3 bg-[#1A1A1A] hover:bg-neutral-800 text-white font-heading font-bold text-xs uppercase tracking-wider rounded-xl transition cursor-pointer shadow-md"
                  >
                    {contactLoading ? "Đang gửi..." : "Gửi Tin Nhắn Đi →"}
                  </button>
                </form>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* =========================================================================
          11. FOOTER
      ========================================================================= */}
      <footer className="py-12 bg-[#141414] text-neutral-300 text-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6 pb-8 border-b border-neutral-800">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500 text-slate-950 flex items-center justify-center font-heading font-black text-sm">
                ĐN
              </div>
              <div>
                <span className="font-heading font-black text-base text-white block">
                  {teacher.name}
                </span>
                <span className="text-[11px] text-neutral-300 font-medium">
                  English Teacher & Senior TOEIC Trainer
                </span>
              </div>
            </div>

            <div className="flex items-center gap-6 text-xs text-neutral-300 font-semibold">
              {toggles.showCvPrint !== false && (
                <button
                  onClick={() => setShowCvModal(true)}
                  className="hover:text-amber-300 text-neutral-300 transition cursor-pointer"
                >
                  In Sơ Yếu Lý Lịch (Print)
                </button>
              )}
              <button
                onClick={() => setShowLoginModal(true)}
                className="text-amber-400 hover:text-amber-300 transition cursor-pointer font-bold"
              >
                Đăng Nhập Portal (Student / Admin)
              </button>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] text-neutral-400 font-medium">
            <p>© 2026 {teacher.name}. Thiết kế tinh tế theo phong cách Portfolio & Learning Management System.</p>
            <p>{content.contactInfo?.address || "Thành phố Hồ Chí Minh, Việt Nam"}</p>
          </div>
        </div>
      </footer>

      {/* =========================================================================
          12. INTEGRATED LOGIN MODAL
      ========================================================================= */}
      {showLoginModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-2xl border border-neutral-200 relative animate-scaleUp">
            {/* Close button */}
            <button
              onClick={() => setShowLoginModal(false)}
              className="absolute top-5 right-5 w-8 h-8 rounded-full bg-neutral-100 hover:bg-neutral-200 text-neutral-600 flex items-center justify-center transition cursor-pointer"
              aria-label="Đóng"
            >
              ✕
            </button>

            {/* Modal Title */}
            <div className="text-center space-y-1 mb-6">
              <span className="text-xs font-mono uppercase tracking-wider text-amber-800 font-extrabold">
                Cổng Đăng Nhập
              </span>
              <h3 className="text-2xl font-serif font-bold text-neutral-950">
                Đăng Nhập Hệ Thống
              </h3>
              <p className="text-xs text-neutral-700 font-medium">
                Dành cho Học Viên và Ban Quản Trị Trung Tâm
              </p>
            </div>

            {/* Tab: Học viên vs Admin */}
            <div className="flex bg-neutral-200/80 p-1 rounded-xl mb-5">
              <button
                type="button"
                onClick={() => setLoginTab("student")}
                className={`flex-1 py-2 text-xs font-heading font-black uppercase tracking-wider rounded-lg transition ${
                  loginTab === "student"
                    ? "bg-white text-neutral-950 shadow-xs"
                    : "text-neutral-700 hover:text-neutral-950"
                }`}
              >
                👨‍🎓 Học Viên
              </button>
              <button
                type="button"
                onClick={() => setLoginTab("admin")}
                className={`flex-1 py-2 text-xs font-heading font-black uppercase tracking-wider rounded-lg transition ${
                  loginTab === "admin"
                    ? "bg-white text-neutral-950 shadow-xs"
                    : "text-neutral-700 hover:text-neutral-950"
                }`}
              >
                🛡️ Quản Trị / Giảng Viên
              </button>
            </div>

            {/* Error Message */}
            {loginError && (
              <div className="p-3 bg-rose-50 border border-rose-300 text-rose-950 text-xs rounded-xl mb-4 font-bold">
                {loginError}
              </div>
            )}

            {/* Google One-Click Login */}
            <button
              type="button"
              disabled={loginLoading}
              onClick={handleGoogleLogin}
              className="w-full py-2.5 px-4 bg-white hover:bg-neutral-50 text-neutral-900 border border-neutral-300 rounded-xl text-xs font-bold flex items-center justify-center gap-3 transition shadow-xs cursor-pointer mb-4"
            >
              <svg className="w-4 h-4" viewBox="0 0 48 48">
                <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
                <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
                <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
                <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
              </svg>
              <span>Tiếp tục với Google</span>
            </button>

            <div className="relative flex py-2 items-center mb-4">
              <div className="flex-grow border-t border-neutral-300"></div>
              <span className="flex-shrink mx-3 text-neutral-600 text-[11px] font-mono font-bold uppercase">
                Hoặc đăng nhập bằng SĐT / Email
              </span>
              <div className="flex-grow border-t border-neutral-300"></div>
            </div>

            {/* Email / Phone Form */}
            <form onSubmit={handleEmailLogin} className="space-y-3.5">
              <div className="space-y-1">
                <label className="text-[11px] font-extrabold text-neutral-800 block">
                  Số Điện Thoại hoặc Email / Mã Học Viên
                </label>
                <input
                  type="text"
                  required
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  placeholder="Ví dụ: 0912345678 hoặc email@example.com"
                  className="w-full px-3.5 py-2.5 bg-neutral-50 border border-neutral-300 rounded-xl text-xs text-neutral-950 font-medium placeholder:text-neutral-500 focus:bg-white focus:outline-none focus:border-neutral-900"
                />
                <span className="text-[10px] text-neutral-500 block">
                  💡 Nhập Số điện thoại (hoặc Email) đã được cấp để đăng nhập nhanh
                </span>
              </div>

              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-extrabold text-neutral-800 block">
                    Mật Khẩu
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowResetPassword(true)}
                    className="text-[11px] text-amber-800 font-bold hover:underline cursor-pointer"
                  >
                    Quên mật khẩu?
                  </button>
                </div>
                <input
                  type="password"
                  required
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-3.5 py-2.5 bg-neutral-50 border border-neutral-300 rounded-xl text-xs text-neutral-950 font-bold placeholder:text-neutral-500 focus:bg-white focus:outline-none focus:border-neutral-900 font-mono"
                />
              </div>

              <button
                type="submit"
                disabled={loginLoading}
                className="w-full py-3 bg-[#1A1A1A] hover:bg-neutral-800 text-white font-heading font-bold text-xs uppercase tracking-wider rounded-xl transition cursor-pointer disabled:opacity-60 mt-2 shadow-md"
              >
                {loginLoading ? "Đang xử lý..." : `Đăng Nhập Vào ${loginTab === "student" ? "Portal Học Viên" : "Admin Dashboard"}`}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* =========================================================================
          13. RESET PASSWORD MODAL
      ========================================================================= */}
      {showResetPassword && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fadeIn">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-neutral-200 animate-scaleUp">
            <h3 className="text-lg font-serif font-bold text-neutral-950 mb-2">
              Khôi Phục Mật Khẩu
            </h3>
            <p className="text-xs text-neutral-700 font-medium mb-4 leading-relaxed">
              Nhập email tài khoản bạn đã đăng ký để hệ thống gửi liên kết đặt lại mật khẩu an toàn.
            </p>

            {resetSent ? (
              <div className="space-y-3">
                <div className="p-3 bg-emerald-50 border border-emerald-300 text-emerald-950 text-xs rounded-xl font-bold">
                  ✓ Đã gửi email khôi phục mật khẩu! Vui lòng kiểm tra hộp thư hoặc thư mục Spam.
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setShowResetPassword(false);
                    setResetSent(false);
                  }}
                  className="w-full py-2 bg-neutral-100 hover:bg-neutral-200 text-neutral-800 text-xs font-bold rounded-xl"
                >
                  Đóng
                </button>
              </div>
            ) : (
              <form onSubmit={handlePasswordReset} className="space-y-3">
                <input
                  type="email"
                  required
                  value={resetEmail}
                  onChange={(e) => setResetEmail(e.target.value)}
                  placeholder="your.email@example.com"
                  className="w-full px-3 py-2 bg-neutral-50 border border-neutral-300 rounded-xl text-xs text-neutral-950 font-medium placeholder:text-neutral-500 focus:outline-none focus:border-neutral-900"
                />
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setShowResetPassword(false)}
                    className="flex-1 py-2 border border-neutral-300 text-neutral-700 rounded-xl text-xs font-bold hover:bg-neutral-100"
                  >
                    Hủy
                  </button>
                  <button
                    type="submit"
                    disabled={resetLoading}
                    className="flex-1 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 rounded-xl text-xs font-black uppercase tracking-wider shadow-sm"
                  >
                    {resetLoading ? "Đang gửi..." : "Gửi Liên Kết"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* =========================================================================
          14. PRINTABLE CV MODAL
      ========================================================================= */}
      {showCvModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 overflow-y-auto animate-fadeIn">
          <div className="bg-white text-black p-8 sm:p-12 max-w-4xl w-full rounded-3xl shadow-2xl relative my-8 font-sans leading-relaxed">
            {/* Action Bar */}
            <div className="flex items-center justify-between pb-6 mb-6 border-b border-neutral-200">
              <div className="flex items-center gap-2">
                <span className="text-lg">📄</span>
                <span className="font-heading font-black text-sm uppercase tracking-wider text-neutral-900">
                  Sơ Yếu Lý Lịch Chuẩn (Curriculum Vitae)
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="px-4 py-2 bg-neutral-950 text-white rounded-xl text-xs font-heading font-bold uppercase tracking-wider hover:bg-neutral-800 transition cursor-pointer flex items-center gap-1.5"
                >
                  <span>🖨️</span>
                  <span>In Hồ Sơ (Print)</span>
                </button>
                <button
                  onClick={() => setShowCvModal(false)}
                  className="px-3 py-2 bg-neutral-100 hover:bg-neutral-200 text-neutral-800 rounded-xl text-xs font-bold cursor-pointer"
                >
                  Đóng
                </button>
              </div>
            </div>

            {/* Printable CV Content */}
            <div className="space-y-8 text-xs sm:text-sm">
              {/* Header */}
              <div className="border-b border-neutral-200 pb-6">
                <h1 className="text-3xl font-serif font-black tracking-tight text-neutral-950">
                  {teacher.name}
                </h1>
                <p className="text-amber-900 font-bold mt-1 text-base">
                  {teacher.titles[0]}
                </p>
                <div className="flex flex-wrap gap-4 text-xs text-neutral-700 mt-3 font-mono font-bold">
                  <span>📞 {teacher.phone}</span>
                  <span>✉️ {teacher.email}</span>
                  <span>📍 {teacher.location}</span>
                </div>
              </div>

              {/* Summary */}
              <div className="space-y-2">
                <h2 className="font-serif font-bold text-base text-neutral-900 uppercase tracking-wider border-b border-neutral-100 pb-1">
                  Giới Thiệu Bản Thân
                </h2>
                <p className="text-neutral-900 leading-relaxed text-justify font-medium">
                  {teacher.bioDetailed}
                </p>
              </div>

              {/* Education */}
              <div className="space-y-3">
                <h2 className="font-serif font-bold text-base text-neutral-900 uppercase tracking-wider border-b border-neutral-100 pb-1">
                  Trình Độ Học Thuật & Đào Tạo
                </h2>
                <div className="space-y-3">
                  {education.map((edu, idx) => (
                    <div key={idx} className="space-y-1">
                      <div className="flex justify-between font-bold text-neutral-950">
                        <span>{edu.degree}</span>
                        <span className="font-mono text-neutral-700 font-bold">{edu.period}</span>
                      </div>
                      <p className="text-amber-950 font-bold">{edu.institution}</p>
                      <p className="text-neutral-800 text-xs font-medium">{edu.details}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Experience */}
              <div className="space-y-4">
                <h2 className="font-serif font-bold text-base text-neutral-900 uppercase tracking-wider border-b border-neutral-100 pb-1">
                  Kinh Nghiệm Giảng Dạy & Làm Việc
                </h2>
                <div className="space-y-4">
                  {career.map((exp, idx) => (
                    <div key={idx} className="space-y-1.5">
                      <div className="flex justify-between font-bold text-neutral-950">
                        <span>{exp.role} — {exp.company}</span>
                        <span className="font-mono text-neutral-700 font-bold">{exp.period}</span>
                      </div>
                      <ul className="list-disc list-inside space-y-1 text-neutral-800 text-xs font-medium">
                        {exp.description.map((d, dIdx) => (
                          <li key={dIdx}>{d}</li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </div>

              {/* Certifications */}
              <div className="space-y-3">
                <h2 className="font-serif font-bold text-base text-neutral-900 uppercase tracking-wider border-b border-neutral-100 pb-1">
                  Chứng Chỉ Quốc Tế & Thành Tích
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {certifications.map((c, idx) => (
                    <div key={idx} className="p-3 bg-neutral-50 rounded-xl border border-neutral-200 space-y-1">
                      <span className="font-bold text-neutral-950 block">{c.title}</span>
                      <span className="text-[11px] text-neutral-700 font-medium block">{c.issuer}</span>
                      <span className="text-[11px] font-bold text-emerald-800 block">{c.highlight}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LandingPage;
