import React, { useState } from "react";
import { MiniPlacementTest } from "../../components/landing/MiniPlacementTest";
import { TEACHER_PROFILE } from "../../data/portfolioData";
import { PrivacyPolicyModal } from "../../components/common/PrivacyPolicyModal";

export const PlacementTestPage = ({ onBackToHome, onSelectConsultation }) => {
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);
  const getBasePath = () => {
    if (typeof window === "undefined") return "";
    return window.location.pathname.startsWith("/lms-toeic-mrnam") ? "/lms-toeic-mrnam" : "";
  };

  const handleBack = () => {
    if (onBackToHome) {
      onBackToHome();
    } else {
      const base = getBasePath();
      window.history.pushState(null, "", `${base}/`);
      window.dispatchEvent(new PopStateEvent("popstate"));
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const handleConsultationFromTest = (result) => {
    try {
      localStorage.setItem("toeic_last_placement_result", JSON.stringify(result));
    } catch (e) {}

    if (onSelectConsultation) {
      onSelectConsultation(result);
    } else if (onBackToHome) {
      onBackToHome("booking");
    } else {
      const base = getBasePath();
      window.history.pushState(null, "", `${base}/#booking`);
      window.dispatchEvent(new PopStateEvent("popstate"));
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  return (
    <div className="min-h-screen bg-[#14110E] text-white flex flex-col font-sans">
      {/* 1. TOP HEADER NAVIGATION */}
      <header className="sticky top-0 z-40 bg-[#18130E]/95 backdrop-blur-md border-b border-neutral-800 shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          {/* Back button & Brand */}
          <div className="flex items-center gap-3 sm:gap-4">
            <button
              type="button"
              onClick={handleBack}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#231C16] hover:bg-[#2e241c] text-neutral-200 rounded-xl text-xs font-heading font-black uppercase tracking-wider transition cursor-pointer border border-neutral-700"
              title="Quay lại trang chủ"
            >
              <span>←</span>
              <span className="hidden sm:inline">Quay lại Trang Chủ</span>
              <span className="sm:hidden">Trang Chủ</span>
            </button>

            <div className="h-5 w-px bg-neutral-700 hidden sm:block"></div>

            <div className="flex items-center gap-2">
              <span className="w-8 h-8 rounded-lg bg-neutral-900 text-amber-400 font-serif font-black text-sm flex items-center justify-center shadow-xs border border-amber-500/30">
                TN
              </span>
              <div>
                <span className="font-heading font-black text-xs sm:text-sm text-white tracking-tight block">
                  {TEACHER_PROFILE.brandName || "TOEIC MR.NAM"}
                </span>
                <span className="text-[10px] uppercase tracking-wider text-amber-400 font-extrabold hidden md:block">
                  Cổng Đánh Giá Năng Lực Trực Tuyến
                </span>
              </div>
            </div>
          </div>

          {/* Right Help info */}
          <div className="flex items-center gap-3">
            <div className="hidden md:flex flex-col text-right">
              <span className="text-[11px] text-neutral-400 font-medium">Hỗ trợ học viên:</span>
              <a
                href={`tel:${TEACHER_PROFILE.phone?.replace(/\s/g, "") || "0773452809"}`}
                className="text-xs font-bold text-amber-400 hover:text-amber-300 transition"
              >
                Hotline: {TEACHER_PROFILE.phone || "077 345 2809"}
              </a>
            </div>

            <span className="px-3 py-1 bg-amber-500/20 text-amber-300 border border-amber-400/40 rounded-full text-[11px] font-extrabold uppercase tracking-wider">
              Chuẩn ETS 2026
            </span>
          </div>
        </div>
      </header>

      {/* 2. SUBPAGE INTRO BANNER */}
      <section className="bg-gradient-to-b from-[#1C1610] via-[#18130E] to-[#14110E] border-b border-neutral-800 pt-8 pb-6 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-amber-500/20 border border-amber-400/40 rounded-full text-xs font-mono font-black text-amber-400 uppercase tracking-widest">
            <span>🎯</span>
            <span>BÀI TEST XẾP LỚP 10 PHÚT • TOEIC LISTENING & READING (17 CÂU)</span>
          </div>

          <h1 className="text-2xl sm:text-4xl font-serif font-bold text-white tracking-tight">
            TOEIC Comprehensive Placement Test
          </h1>

          <p className="text-xs sm:text-sm text-neutral-300 font-medium max-w-2xl mx-auto leading-relaxed">
            Đánh giá toàn diện <strong>Kỹ năng Nghe điền từ công sở (Part 3 Cloze - 10 chỗ trống)</strong> và kỹ năng <strong>Đọc hiểu - Ngữ pháp nâng cao (Part 5, 6, 7: 7 câu)</strong> theo định dạng chuẩn ETS. Sau khi nộp bài, hệ thống sẽ tự động chấm điểm, ước tính cấp độ và gửi kết quả chi tiết tới Thầy Đỗ Tuấn Nam.
          </p>

          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-amber-500/15 border border-amber-400/40 rounded-xl text-xs text-amber-200 font-medium">
            <span>ℹ️</span>
            <span>Lưu ý: Bài kiểm tra này chỉ mang tính chất tham khảo và đánh giá năng lực sơ bộ, không phải format bài thi tiêu chuẩn.</span>
          </div>
        </div>
      </section>

      {/* 3. MAIN TEST CONTAINER */}
      <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-10">
        <MiniPlacementTest
          onSelectConsultation={handleConsultationFromTest}
          className="shadow-2xl border-neutral-800"
        />
      </main>

      {/* 4. FOOTER */}
      <footer className="bg-[#18130E] border-t border-neutral-800 py-6 text-center text-xs text-neutral-400 space-y-2">
        <div className="flex flex-wrap items-center justify-center gap-3 font-semibold text-neutral-300">
          <button
            type="button"
            onClick={handleBack}
            className="hover:text-amber-400 transition cursor-pointer text-neutral-300"
          >
            ← Quay lại Trang Chủ
          </button>
          <span>•</span>
          <span>Thầy Đỗ Tuấn Nam - 077 345 2809</span>
          <span>•</span>
          <span>Email: dotuannamwork2809@gmail.com</span>
          <span>•</span>
          <button
            type="button"
            onClick={() => setShowPrivacyModal(true)}
            className="text-amber-400 hover:text-amber-300 underline font-bold cursor-pointer"
          >
            Chính Sách Bảo Mật (Luật 91/2025/QH15)
          </button>
        </div>
        <p className="text-[11px] text-neutral-500 font-medium">
          © 2026 {TEACHER_PROFILE.brandName || "TOEIC MR.NAM"}. Cổng Đánh Giá Năng Lực Trực Tuyến & Luyện Thi TOEIC Chuẩn ETS.
        </p>
      </footer>

      {/* Privacy Policy Modal */}
      <PrivacyPolicyModal
        isOpen={showPrivacyModal}
        onClose={() => setShowPrivacyModal(false)}
      />
    </div>
  );
};

export default PlacementTestPage;
