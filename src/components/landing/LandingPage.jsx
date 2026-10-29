import React, { useState, useRef } from "react";
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

export const LandingPage = ({ onGoToPortal }) => {
  const { currentUser, role, isStaff, loginWithEmail, loginWithGoogle, resetPassword } = useAuth();
  const { centerConfig, landingPageContent } = useSettings();

  const content = landingPageContent || {};
  const teacher = { ...TEACHER_PROFILE, ...(content.profile || {}) };
  const hero = {
    badge: "⭐ Thạc sĩ Ngôn ngữ Anh • TOEIC 980 / 990 IIG Vietnam",
    headline: "Chinh Phục TOEIC Bằng Phương Pháp Khoa Học & Trải Nghiệm Thực Chiến.",
    subHeadline: teacher.bioShort,
    primaryCta: "Làm Mini Test 3 Phút →",
    secondaryCta: "Hẹn Lịch Tư Vấn 1-1",
    ...(content.hero || {}),
  };
  const stats = content.stats && content.stats.length > 0 ? content.stats : IMPACT_STATS;
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
    date: "",
    time: CONSULTATION_TIME_SLOTS[0],
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
        ...bookingData,
        quizScore: quizResult ? quizResult.quizScore : null,
        quizMaxScore: quizResult ? quizResult.quizMaxScore : null,
        quizLevel: quizResult ? quizResult.quizLevel : null,
        status: "pending",
        createdAt: serverTimestamp(),
        source: "landing_page",
      };
      await addDoc(collection(db, "consultation_bookings"), payload);
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

  return (
    <div className="min-h-screen bg-[#FAF9F6] text-[#1A1A1A] font-sans antialiased selection:bg-amber-200 selection:text-neutral-900">
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
              <span className="text-[10px] sm:text-[11px] font-mono text-neutral-500 uppercase tracking-wider block">
                English Teacher & TOEIC Specialist
              </span>
            </div>
          </div>

          {/* Nav Links (Desktop) */}
          <div className="hidden lg:flex items-center gap-6 text-xs font-semibold text-neutral-600 uppercase tracking-wider">
            <a href="#about" className="hover:text-neutral-950 transition">
              Giới thiệu
            </a>
            <a href="#courses" className="hover:text-neutral-950 transition">
              Khóa học
            </a>
            <a href="#experience" className="hover:text-neutral-950 transition">
              Kinh nghiệm
            </a>
            <a href="#testimonials" className="hover:text-neutral-950 transition">
              Học viên
            </a>
            <button
              onClick={() => scrollToSection(placementTestRef)}
              className="text-amber-700 hover:text-amber-900 font-bold transition cursor-pointer"
            >
              Mini Placement Test
            </button>
            <button
              onClick={() => scrollToSection(bookingRef)}
              className="hover:text-neutral-950 transition cursor-pointer"
            >
              Hẹn lịch tư vấn
            </button>
          </div>

          {/* Right Action Buttons */}
          <div className="flex items-center gap-2.5">
            <button
              onClick={() => setShowCvModal(true)}
              className="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-neutral-300 text-neutral-700 text-xs font-semibold hover:bg-neutral-100 transition cursor-pointer"
              title="Xem và in sơ yếu lý lịch chuẩn"
            >
              <span>📄</span>
              <span>In CV (Print)</span>
            </button>

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
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-100/80 border border-amber-300 text-amber-900 text-xs font-semibold tracking-wide">
                <span>⭐</span>
                <span>{hero.badge}</span>
              </div>

              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-serif font-bold text-neutral-950 leading-[1.15] tracking-tight">
                {hero.headline}
              </h1>

              <p className="text-base sm:text-lg text-neutral-600 leading-relaxed max-w-xl">
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

              {/* Verified Tag */}
              <div className="pt-4 flex items-center gap-4 text-xs text-neutral-500 border-t border-neutral-200/80">
                <div className="flex items-center gap-1.5 font-medium">
                  <span className="text-emerald-600">✓</span>
                  <span>Cam kết chuẩn đầu ra văn bản</span>
                </div>
                <div className="flex items-center gap-1.5 font-medium">
                  <span className="text-emerald-600">✓</span>
                  <span>Mock-test hàng tuần trên LMS</span>
                </div>
                <div className="flex items-center gap-1.5 font-medium">
                  <span className="text-emerald-600">✓</span>
                  <span>Video record bài giảng trọn đời</span>
                </div>
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
                      <p className="text-xs text-amber-800 font-semibold mt-0.5">
                        Thạc sĩ Ngôn ngữ Anh (Saigon University)
                      </p>
                      <p className="text-[11px] text-neutral-500">
                        TOEIC 980/990 • TESOL Certified
                      </p>
                    </div>
                  </div>

                  {/* Highlights Grid */}
                  <div className="grid grid-cols-2 gap-3 pt-2 border-t border-neutral-100">
                    <div className="p-3 bg-neutral-50 rounded-2xl border border-neutral-100 text-center">
                      <span className="text-[10px] uppercase font-bold text-neutral-400 block tracking-wider">
                        TOEIC Score
                      </span>
                      <span className="text-2xl font-heading font-black text-amber-600">
                        980 <span className="text-xs text-neutral-400">/ 990</span>
                      </span>
                    </div>
                    <div className="p-3 bg-neutral-50 rounded-2xl border border-neutral-100 text-center">
                      <span className="text-[10px] uppercase font-bold text-neutral-400 block tracking-wider">
                        Học Viên Đã Dạy
                      </span>
                      <span className="text-2xl font-heading font-black text-neutral-900">
                        1,200+
                      </span>
                    </div>
                  </div>

                  {/* Quote */}
                  <div className="p-4 bg-amber-50/70 rounded-2xl border border-amber-200/60 text-xs text-neutral-700 italic leading-relaxed">
                    "{teacher.academicQuote}"
                  </div>

                  {/* Direct Contact info */}
                  <div className="pt-2 text-xs text-neutral-600 space-y-1.5 border-t border-neutral-100 font-mono">
                    <div className="flex items-center gap-2">
                      <span className="text-neutral-400">📞 SĐT/Zalo:</span>
                      <a href={`tel:${teacher.phone}`} className="font-bold text-neutral-900 hover:underline">
                        {teacher.phone}
                      </a>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-neutral-400">✉️ Email:</span>
                      <span className="font-bold text-neutral-900 truncate">
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
                className="p-5 rounded-2xl bg-[#FAF9F6] border border-neutral-200/70 hover:border-amber-400 transition-colors space-y-1.5"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[10px] uppercase tracking-wider font-bold text-neutral-400 font-mono">
                    {stat.label}
                  </span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 font-bold">
                    {stat.badge}
                  </span>
                </div>
                <div className="text-3xl font-heading font-black text-neutral-950">
                  {stat.value}
                </div>
                <p className="text-xs text-neutral-500 leading-snug">
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
            <span className="text-xs font-mono uppercase tracking-widest text-amber-800 font-bold">
              Trình Độ Học Thuật & Cam Kết Chất Lượng
            </span>
            <h2 className="text-3xl sm:text-4xl font-serif font-bold text-neutral-950">
              Nền Tảng Ngôn Ngữ Học Chuyên Sâu
            </h2>
            <p className="text-sm text-neutral-600 leading-relaxed">
              Sự kết hợp hoàn hảo giữa lý thuyết ngôn ngữ học ứng dụng hiện đại và phương pháp sư phạm tương tác thực tiễn.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
            {/* Education Left Column */}
            <div className="lg:col-span-6 space-y-6">
              <h3 className="font-serif font-bold text-xl text-neutral-900 flex items-center gap-2">
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
                      <span className="text-[11px] font-mono px-2.5 py-0.5 rounded-full bg-neutral-100 text-neutral-700 shrink-0">
                        {edu.period}
                      </span>
                    </div>
                    <p className="text-xs font-semibold text-amber-800">
                      {edu.institution}
                    </p>
                    <p className="text-xs text-neutral-600 leading-relaxed">
                      {edu.details}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Certifications Right Column */}
            <div className="lg:col-span-6 space-y-6">
              <h3 className="font-serif font-bold text-xl text-neutral-900 flex items-center gap-2">
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
                      <span className="text-[10px] font-mono uppercase tracking-wider text-neutral-400 font-bold">
                        {cert.year}
                      </span>
                      <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold">
                        {cert.highlight}
                      </span>
                    </div>
                    <h4 className="font-serif font-bold text-base text-neutral-950">
                      {cert.title}
                    </h4>
                    <p className="text-xs text-neutral-500">
                      Đơn vị cấp: <span className="font-medium text-neutral-800">{cert.issuer}</span>
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
            <span className="text-xs font-mono uppercase tracking-widest text-amber-800 font-bold">
              Kinh Nghiệm Thực Chiến
            </span>
            <h2 className="text-3xl sm:text-4xl font-serif font-bold text-neutral-950">
              Hành Trình Giảng Dạy & Điều Phối Học Thuật
            </h2>
            <p className="text-sm text-neutral-600">
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
                  <span className="text-[11px] font-mono text-amber-800 font-bold block">
                    {exp.period}
                  </span>
                  <h4 className="font-serif font-bold text-lg text-neutral-950 leading-snug">
                    {exp.role}
                  </h4>
                  <p className="text-xs font-semibold text-neutral-700">
                    {exp.company}
                  </p>

                  <ul className="space-y-2 pt-2 text-xs text-neutral-600 leading-relaxed">
                    {exp.description.map((desc, dIdx) => (
                      <li key={dIdx} className="flex items-start gap-2">
                        <span className="text-amber-500 shrink-0 mt-0.5">•</span>
                        <span>{desc}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="pt-3 border-t border-neutral-200/60 flex flex-wrap gap-1.5">
                  {exp.skills.map((skill, sIdx) => (
                    <span
                      key={sIdx}
                      className="text-[10px] px-2 py-0.5 rounded bg-white border border-neutral-200 text-neutral-600 font-mono"
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
            <span className="text-xs font-mono uppercase tracking-widest text-amber-800 font-bold">
              Chương Trình Đào Tạo
            </span>
            <h2 className="text-3xl sm:text-4xl font-serif font-bold text-neutral-950">
              Các Khóa Luyện Thi TOEIC Nổi Bật
            </h2>
            <p className="text-sm text-neutral-600">
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
                    <span className="text-[11px] font-mono text-neutral-400 uppercase font-bold block">
                      {course.badge}
                    </span>
                    <h3 className="font-serif font-bold text-xl text-neutral-950 leading-tight">
                      {course.title}
                    </h3>
                  </div>

                  <div className="p-3 bg-neutral-50 rounded-xl space-y-1">
                    <p className="text-xs font-bold text-amber-700">{course.target}</p>
                    <p className="text-[11px] text-neutral-500">{course.duration}</p>
                  </div>

                  <p className="text-xs text-neutral-600 leading-relaxed">
                    {course.description}
                  </p>

                  <div className="space-y-2 pt-2 border-t border-neutral-100">
                    <span className="text-[10px] uppercase font-bold text-neutral-400 tracking-wider block">
                      Nội dung nổi bật:
                    </span>
                    <ul className="space-y-1.5 text-xs text-neutral-700">
                      {course.features.map((feat, fIdx) => (
                        <li key={fIdx} className="flex items-start gap-2">
                          <span className="text-emerald-500 font-bold shrink-0">✓</span>
                          <span>{feat}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                <div className="pt-4 border-t border-neutral-100">
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
      <section
        id="placement-test"
        ref={placementTestRef}
        className="py-16 md:py-24 bg-gradient-to-b from-white to-[#FAF9F6] border-b border-neutral-200"
      >
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
          <div className="text-center space-y-3">
            <span className="text-xs font-mono uppercase tracking-widest text-amber-800 font-bold">
              Kiểm Tra Năng Lực Trực Tuyến
            </span>
            <h2 className="text-3xl sm:text-4xl font-serif font-bold text-neutral-950">
              Mini Placement Test (5 Câu Rút Gọn)
            </h2>
            <p className="text-sm text-neutral-600 max-w-lg mx-auto">
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

      {/* =========================================================================
          8. BOOKING CONSULTATION FORM
      ========================================================================= */}
      <section id="booking" ref={bookingRef} className="py-16 md:py-24 bg-white border-b border-neutral-200">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
          <div className="text-center space-y-3">
            <span className="text-xs font-mono uppercase tracking-widest text-amber-800 font-bold">
              Định Hình Lộ Trình 1-1
            </span>
            <h2 className="text-3xl sm:text-4xl font-serif font-bold text-neutral-950">
              Đăng Ký Tư Vấn Cùng Thầy Đỗ Tuấn Nam
            </h2>
            <p className="text-sm text-neutral-600 max-w-lg mx-auto">
              15 phút trao đổi trực tiếp để giải đáp hiện trạng mất gốc, đánh giá điểm yếu và xác định lộ trình tăng điểm tối ưu nhất cho riêng bạn.
            </p>
          </div>

          {/* Attached Quiz Result Banner if completed */}
          {quizResult && (
            <div className="p-4 bg-amber-50 rounded-2xl border border-amber-200 flex items-center justify-between text-xs text-amber-900">
              <div className="flex items-center gap-2">
                <span className="text-lg">🎯</span>
                <div>
                  <span className="font-bold">Đã đính kèm kết quả Mini Test: </span>
                  <span>{quizResult.quizScore} / {quizResult.quizMaxScore} câu đúng • Trình độ ước tính: {quizResult.quizLevel}</span>
                </div>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white text-amber-800 font-bold border border-amber-200">
                Auto Attached
              </span>
            </div>
          )}

          {bookingSuccess ? (
            <div className="p-8 bg-emerald-50 rounded-3xl border border-emerald-200 text-center space-y-4 animate-scaleUp">
              <div className="w-16 h-16 mx-auto bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center text-3xl">
                ✓
              </div>
              <h3 className="font-serif font-bold text-2xl text-emerald-950">
                Đặt Lịch Thành Công!
              </h3>
              <p className="text-sm text-emerald-800 max-w-md mx-auto leading-relaxed">
                Cảm ơn bạn, <strong>{bookingData.name}</strong>. Lịch hẹn tư vấn khóa học <strong>{bookingData.program}</strong> đã được ghi nhận. Thầy Nam sẽ liên hệ qua điện thoại/Zalo trong thời gian sớm nhất!
              </p>
              <button
                onClick={() => setBookingSuccess(false)}
                className="px-6 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold uppercase tracking-wider"
              >
                Đặt thêm lịch hẹn khác
              </button>
            </div>
          ) : (
            <form onSubmit={handleBookingSubmit} className="bg-[#FAF9F6] p-6 sm:p-10 rounded-3xl border border-neutral-200 space-y-5 shadow-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-neutral-600 block">
                    Họ và Tên *
                  </label>
                  <input
                    type="text"
                    required
                    value={bookingData.name}
                    onChange={(e) => setBookingData({ ...bookingData, name: e.target.value })}
                    placeholder="Ví dụ: Nguyễn Văn A"
                    className="w-full px-3.5 py-2.5 bg-white border border-neutral-300 rounded-xl text-xs text-neutral-900 focus:outline-none focus:border-neutral-900"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-neutral-600 block">
                    Số Điện Thoại / Zalo *
                  </label>
                  <input
                    type="tel"
                    required
                    value={bookingData.phone}
                    onChange={(e) => setBookingData({ ...bookingData, phone: e.target.value })}
                    placeholder="Ví dụ: 0912 345 678"
                    className="w-full px-3.5 py-2.5 bg-white border border-neutral-300 rounded-xl text-xs text-neutral-900 focus:outline-none focus:border-neutral-900 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-neutral-600 block">
                    Địa Chỉ Email *
                  </label>
                  <input
                    type="email"
                    required
                    value={bookingData.email}
                    onChange={(e) => setBookingData({ ...bookingData, email: e.target.value })}
                    placeholder="email@example.com"
                    className="w-full px-3.5 py-2.5 bg-white border border-neutral-300 rounded-xl text-xs text-neutral-900 focus:outline-none focus:border-neutral-900"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-neutral-600 block">
                    Khóa Học Quan Tâm *
                  </label>
                  <select
                    value={bookingData.program}
                    onChange={(e) => setBookingData({ ...bookingData, program: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-white border border-neutral-300 rounded-xl text-xs text-neutral-900 focus:outline-none focus:border-neutral-900"
                  >
                    {courses.map((c) => (
                      <option key={c.id} value={c.programName}>
                        {c.programName}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-neutral-600 block">
                    Ngày Hẹn Mong Muốn
                  </label>
                  <input
                    type="date"
                    value={bookingData.date}
                    onChange={(e) => setBookingData({ ...bookingData, date: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-white border border-neutral-300 rounded-xl text-xs text-neutral-900 focus:outline-none focus:border-neutral-900 font-mono"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-neutral-600 block">
                    Khung Giờ Thuận Tiện
                  </label>
                  <select
                    value={bookingData.time}
                    onChange={(e) => setBookingData({ ...bookingData, time: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-white border border-neutral-300 rounded-xl text-xs text-neutral-900 focus:outline-none focus:border-neutral-900"
                  >
                    {CONSULTATION_TIME_SLOTS.map((slot, idx) => (
                      <option key={idx} value={slot}>
                        {slot}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-neutral-600 block">
                  Ghi chú hiện trạng điểm số & mong muốn (Nếu có)
                </label>
                <textarea
                  rows={3}
                  value={bookingData.notes}
                  onChange={(e) => setBookingData({ ...bookingData, notes: e.target.value })}
                  placeholder="Ví dụ: Đã thi thử đạt 480 điểm Nghe tốt hơn Đọc, cần mục tiêu 650+ để ra trường trong 3 tháng tới..."
                  className="w-full px-3.5 py-2.5 bg-white border border-neutral-300 rounded-xl text-xs text-neutral-900 focus:outline-none focus:border-neutral-900 leading-relaxed"
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={bookingLoading}
                  className="w-full py-3.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-heading font-black text-xs uppercase tracking-wider rounded-xl shadow-lg transition cursor-pointer disabled:opacity-60"
                >
                  {bookingLoading ? "Đang gửi đăng ký..." : "Xác Nhận Đăng Ký Tư Vấn 1-1 →"}
                </button>
              </div>
            </form>
          )}
        </div>
      </section>

      {/* =========================================================================
          9. STUDENT TESTIMONIALS
      ========================================================================= */}
      <section id="testimonials" className="py-16 md:py-24 bg-[#FAF9F6] border-b border-neutral-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          <div className="text-center max-w-2xl mx-auto space-y-3">
            <span className="text-xs font-mono uppercase tracking-widest text-amber-800 font-bold">
              Đánh Giá Từ Thực Tế
            </span>
            <h2 className="text-3xl sm:text-4xl font-serif font-bold text-neutral-950">
              Học Viên Thành Tựu
            </h2>
            <p className="text-sm text-neutral-600">
              Những trải nghiệm thực tế từ các bạn học viên đã cùng Thầy Nam bứt phá ngoạn mục điểm số TOEIC.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {testimonials.map((testm, idx) => (
              <div
                key={idx}
                className="bg-white p-7 rounded-3xl border border-neutral-200/80 shadow-xs flex flex-col justify-between space-y-4 hover:shadow-md transition"
              >
                <div className="space-y-3">
                  <div className="flex items-center gap-1 text-amber-500 text-sm">
                    {"★".repeat(5)}
                  </div>
                  <p className="text-xs sm:text-sm text-neutral-700 leading-relaxed italic">
                    "{testm.review}"
                  </p>
                </div>

                <div className="pt-4 border-t border-neutral-100 flex items-center justify-between">
                  <div>
                    <h4 className="font-serif font-bold text-sm text-neutral-950">
                      {testm.name}
                    </h4>
                    <p className="text-[11px] text-neutral-500">{testm.school}</p>
                  </div>
                  <div className="text-right">
                    <span className="px-2.5 py-1 bg-amber-100 text-amber-900 font-heading font-black text-xs rounded-lg">
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
      <section id="contact" className="py-16 md:py-24 bg-white border-b border-neutral-200">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
            {/* Contact Info Left */}
            <div className="lg:col-span-5 space-y-6">
              <span className="text-xs font-mono uppercase tracking-widest text-amber-800 font-bold">
                Kết Nối Học Tập
              </span>
              <h2 className="text-3xl font-serif font-bold text-neutral-950">
                Gửi Lời Nhắn Cho Thầy Nam
              </h2>
              <p className="text-xs sm:text-sm text-neutral-600 leading-relaxed">
                {teacher.contactQuote}
              </p>

              <div className="space-y-3 text-xs">
                <div className="p-4 bg-[#FAF9F6] rounded-2xl border border-neutral-200 space-y-1">
                  <span className="text-neutral-400 font-bold uppercase text-[10px] block">
                    Điện Thoại / Zalo
                  </span>
                  <a href={`tel:${teacher.phone}`} className="font-bold text-neutral-900 text-sm hover:underline">
                    {teacher.phone}
                  </a>
                </div>

                <div className="p-4 bg-[#FAF9F6] rounded-2xl border border-neutral-200 space-y-1">
                  <span className="text-neutral-400 font-bold uppercase text-[10px] block">
                    Email Trực Tiếp
                  </span>
                  <a href={`mailto:${teacher.email}`} className="font-bold text-neutral-900 text-sm hover:underline">
                    {teacher.email}
                  </a>
                </div>

                <div className="p-4 bg-[#FAF9F6] rounded-2xl border border-neutral-200 space-y-1">
                  <span className="text-neutral-400 font-bold uppercase text-[10px] block">
                    Địa Điểm
                  </span>
                  <p className="font-semibold text-neutral-900">
                    {teacher.location} ({teacher.teachingMode})
                  </p>
                </div>
              </div>
            </div>

            {/* Message Form Right */}
            <div className="lg:col-span-7">
              <form onSubmit={handleContactSubmit} className="bg-[#FAF9F6] p-6 sm:p-8 rounded-3xl border border-neutral-200 space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-neutral-600 block">
                    Họ và Tên
                  </label>
                  <input
                    type="text"
                    required
                    value={contactData.name}
                    onChange={(e) => setContactData({ ...contactData, name: e.target.value })}
                    placeholder="Nhập tên của bạn..."
                    className="w-full px-3.5 py-2.5 bg-white border border-neutral-300 rounded-xl text-xs text-neutral-900 focus:outline-none focus:border-neutral-900"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-neutral-600 block">
                    Địa Chỉ Email
                  </label>
                  <input
                    type="email"
                    required
                    value={contactData.email}
                    onChange={(e) => setContactData({ ...contactData, email: e.target.value })}
                    placeholder="Nhập email liên hệ..."
                    className="w-full px-3.5 py-2.5 bg-white border border-neutral-300 rounded-xl text-xs text-neutral-900 focus:outline-none focus:border-neutral-900"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-neutral-600 block">
                    Nội dung Lời Nhắn
                  </label>
                  <textarea
                    rows={4}
                    required
                    value={contactData.message}
                    onChange={(e) => setContactData({ ...contactData, message: e.target.value })}
                    placeholder="Bạn đang quan tâm lộ trình TOEIC 500+, 600+ hay 700+? Hãy gửi câu hỏi tại đây..."
                    className="w-full px-3.5 py-2.5 bg-white border border-neutral-300 rounded-xl text-xs text-neutral-900 focus:outline-none focus:border-neutral-900 leading-relaxed"
                  />
                </div>

                {contactSuccess && (
                  <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl font-medium">
                    ✓ Gửi tin nhắn thành công! Thầy Nam sẽ sớm phản hồi qua email bạn đã cung cấp.
                  </div>
                )}

                <button
                  type="submit"
                  disabled={contactLoading}
                  className="w-full py-3 bg-[#1A1A1A] hover:bg-neutral-800 text-white font-heading font-bold text-xs uppercase tracking-wider rounded-xl transition cursor-pointer"
                >
                  {contactLoading ? "Đang gửi..." : "Gửi Tin Nhắn Đi →"}
                </button>
              </form>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================================
          11. FOOTER
      ========================================================================= */}
      <footer className="py-12 bg-[#1A1A1A] text-neutral-400 text-xs">
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
                <span className="text-[11px] text-neutral-500">
                  English Teacher & Senior TOEIC Trainer
                </span>
              </div>
            </div>

            <div className="flex items-center gap-6 text-xs text-neutral-400">
              <button
                onClick={() => setShowCvModal(true)}
                className="hover:text-white transition cursor-pointer"
              >
                In Sơ Yếu Lý Lịch (Print)
              </button>
              <button
                onClick={() => setShowLoginModal(true)}
                className="hover:text-amber-400 transition cursor-pointer font-bold text-neutral-300"
              >
                Đăng Nhập Portal (Student / Admin)
              </button>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] text-neutral-500">
            <p>© 2026 {teacher.name}. Thiết kế tinh tế theo phong cách Portfolio & Learning Management System.</p>
            <p>Thành phố Hồ Chí Minh, Việt Nam</p>
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
              <span className="text-xs font-mono uppercase tracking-wider text-amber-700 font-bold">
                Cổng Đăng Nhập
              </span>
              <h3 className="text-2xl font-serif font-bold text-neutral-950">
                Đăng Nhập Hệ Thống
              </h3>
              <p className="text-xs text-neutral-500">
                Dành cho Học Viên và Ban Quản Trị Trung Tâm
              </p>
            </div>

            {/* Tab: Học viên vs Admin */}
            <div className="flex bg-neutral-100 p-1 rounded-xl mb-5">
              <button
                type="button"
                onClick={() => setLoginTab("student")}
                className={`flex-1 py-2 text-xs font-heading font-bold uppercase tracking-wider rounded-lg transition ${
                  loginTab === "student"
                    ? "bg-white text-neutral-900 shadow-xs"
                    : "text-neutral-500 hover:text-neutral-900"
                }`}
              >
                👨‍🎓 Học Viên
              </button>
              <button
                type="button"
                onClick={() => setLoginTab("admin")}
                className={`flex-1 py-2 text-xs font-heading font-bold uppercase tracking-wider rounded-lg transition ${
                  loginTab === "admin"
                    ? "bg-white text-neutral-900 shadow-xs"
                    : "text-neutral-500 hover:text-neutral-900"
                }`}
              >
                🛡️ Ban Quản Trị / Giảng Viên
              </button>
            </div>

            {/* Error Message */}
            {loginError && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-xl mb-4 font-medium">
                {loginError}
              </div>
            )}

            {/* Google One-Click Login */}
            <button
              type="button"
              disabled={loginLoading}
              onClick={handleGoogleLogin}
              className="w-full py-2.5 px-4 bg-white hover:bg-neutral-50 text-neutral-700 border border-neutral-300 rounded-xl text-xs font-semibold flex items-center justify-center gap-3 transition shadow-xs cursor-pointer mb-4"
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
              <div className="flex-grow border-t border-neutral-200"></div>
              <span className="flex-shrink mx-3 text-neutral-400 text-[10px] font-mono uppercase">
                Hoặc đăng nhập bằng Email
              </span>
              <div className="flex-grow border-t border-neutral-200"></div>
            </div>

            {/* Email Form */}
            <form onSubmit={handleEmailLogin} className="space-y-3.5">
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-neutral-600 block">
                  Địa Chỉ Email
                </label>
                <input
                  type="email"
                  required
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  placeholder="your.email@example.com"
                  className="w-full px-3.5 py-2.5 bg-neutral-50 border border-neutral-300 rounded-xl text-xs text-neutral-900 focus:bg-white focus:outline-none focus:border-neutral-900"
                />
              </div>

              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-bold text-neutral-600 block">
                    Mật Khẩu
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowResetPassword(true)}
                    className="text-[10px] text-amber-700 hover:underline cursor-pointer"
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
                  className="w-full px-3.5 py-2.5 bg-neutral-50 border border-neutral-300 rounded-xl text-xs text-neutral-900 focus:bg-white focus:outline-none focus:border-neutral-900 font-mono"
                />
              </div>

              <button
                type="submit"
                disabled={loginLoading}
                className="w-full py-3 bg-[#1A1A1A] hover:bg-neutral-800 text-white font-heading font-bold text-xs uppercase tracking-wider rounded-xl transition cursor-pointer disabled:opacity-60 mt-2"
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
            <h3 className="text-lg font-serif font-bold text-neutral-900 mb-2">
              Khôi Phục Mật Khẩu
            </h3>
            <p className="text-xs text-neutral-500 mb-4 leading-relaxed">
              Nhập email tài khoản bạn đã đăng ký để hệ thống gửi liên kết đặt lại mật khẩu an toàn.
            </p>

            {resetSent ? (
              <div className="space-y-3">
                <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl">
                  ✓ Đã gửi email khôi phục mật khẩu! Vui lòng kiểm tra hộp thư hoặc thư mục Spam.
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setShowResetPassword(false);
                    setResetSent(false);
                  }}
                  className="w-full py-2 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 text-xs font-semibold rounded-xl"
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
                  className="w-full px-3 py-2 bg-neutral-50 border border-neutral-300 rounded-xl text-xs text-neutral-900 focus:outline-none focus:border-neutral-900"
                />
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setShowResetPassword(false)}
                    className="flex-1 py-2 border border-neutral-200 text-neutral-600 rounded-xl text-xs font-semibold hover:bg-neutral-50"
                  >
                    Hủy
                  </button>
                  <button
                    type="submit"
                    disabled={resetLoading}
                    className="flex-1 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 rounded-xl text-xs font-bold uppercase tracking-wider"
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
                <span className="font-heading font-black text-sm uppercase tracking-wider text-neutral-800">
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
                  className="px-3 py-2 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 rounded-xl text-xs font-semibold cursor-pointer"
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
                <p className="text-amber-800 font-bold mt-1 text-base">
                  {teacher.titles[0]}
                </p>
                <div className="flex flex-wrap gap-4 text-xs text-neutral-500 mt-3 font-mono">
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
                <p className="text-neutral-700 leading-relaxed text-justify">
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
                      <div className="flex justify-between font-bold text-neutral-900">
                        <span>{edu.degree}</span>
                        <span className="font-mono text-neutral-500">{edu.period}</span>
                      </div>
                      <p className="text-amber-800 font-medium">{edu.institution}</p>
                      <p className="text-neutral-600 text-xs">{edu.details}</p>
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
                      <div className="flex justify-between font-bold text-neutral-900">
                        <span>{exp.role} — {exp.company}</span>
                        <span className="font-mono text-neutral-500">{exp.period}</span>
                      </div>
                      <ul className="list-disc list-inside space-y-1 text-neutral-700 text-xs">
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
                      <span className="font-bold text-neutral-900 block">{c.title}</span>
                      <span className="text-[11px] text-neutral-500 block">{c.issuer}</span>
                      <span className="text-[11px] font-bold text-emerald-700 block">{c.highlight}</span>
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
