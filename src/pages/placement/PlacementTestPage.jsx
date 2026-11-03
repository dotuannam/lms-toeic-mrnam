import React from "react";
import { MiniPlacementTest } from "../../components/landing/MiniPlacementTest";
import { TEACHER_PROFILE } from "../../data/portfolioData";

export const PlacementTestPage = ({ onBackToHome, onSelectConsultation }) => {
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
    <div className="min-h-screen bg-[#FAF9F6] text-neutral-900 flex flex-col font-sans">
      {/* 1. TOP HEADER NAVIGATION */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-neutral-200/90 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          {/* Back button & Brand */}
          <div className="flex items-center gap-3 sm:gap-4">
            <button
              type="button"
              onClick={handleBack}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-neutral-100 hover:bg-neutral-200 text-neutral-800 rounded-xl text-xs font-heading font-black uppercase tracking-wider transition cursor-pointer border border-neutral-300/80"
              title="Quay lại trang chủ"
            >
              <span>←</span>
              <span className="hidden sm:inline">Quay lại Trang Chủ</span>
              <span className="sm:hidden">Trang Chủ</span>
            </button>

            <div className="h-5 w-px bg-neutral-300 hidden sm:block"></div>

            <div className="flex items-center gap-2">
              <span className="w-8 h-8 rounded-lg bg-neutral-950 text-amber-400 font-serif font-black text-sm flex items-center justify-center shadow-xs">
                TN
              </span>
              <div>
                <span className="font-heading font-black text-xs sm:text-sm text-neutral-950 tracking-tight block">
                  {TEACHER_PROFILE.brandName || "TOEIC MR.NAM"}
                </span>
                <span className="text-[10px] uppercase tracking-wider text-amber-700 font-extrabold hidden md:block">
                  Cổng Đánh Giá Năng Lực Trực Tuyến
                </span>
              </div>
            </div>
          </div>

          {/* Right Help info */}
          <div className="flex items-center gap-3">
            <div className="hidden md:flex flex-col text-right">
              <span className="text-[11px] text-neutral-500 font-medium">Hỗ trợ học viên:</span>
              <a
                href={`tel:${TEACHER_PROFILE.phone?.replace(/\s/g, "") || "0773452809"}`}
                className="text-xs font-bold text-amber-700 hover:text-amber-800 transition"
              >
                Hotline: {TEACHER_PROFILE.phone || "077 345 2809"}
              </a>
            </div>

            <span className="px-3 py-1 bg-amber-100 text-amber-900 border border-amber-300 rounded-full text-[11px] font-extrabold uppercase tracking-wider">
              Chuẩn ETS 2026
            </span>
          </div>
        </div>
      </header>

      {/* 2. SUBPAGE INTRO BANNER */}
      <section className="bg-gradient-to-b from-white via-amber-50/30 to-[#FAF9F6] border-b border-neutral-200/70 pt-8 pb-6 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-amber-500/10 border border-amber-400/40 rounded-full text-xs font-mono font-black text-amber-900 uppercase tracking-widest">
            <span>🎯</span>
            <span>BÀI TEST XẾP LỚP 7 PHÚT • TOEIC READING (PART 5 - 7)</span>
          </div>

          <h1 className="text-2xl sm:text-4xl font-serif font-bold text-neutral-950 tracking-tight">
            TOEIC Reading Placement Test
          </h1>

          <p className="text-xs sm:text-sm text-neutral-700 font-medium max-w-2xl mx-auto leading-relaxed">
            Đánh giá chính xác kiến thức <strong>Từ loại, Ngữ pháp nâng cao (Part 5)</strong> và kỹ năng <strong>Đọc hiểu văn bản (Part 6, Part 7)</strong> theo chuẩn định dạng ETS. Sau khi nộp bài, hệ thống sẽ tự động chấm điểm, ước tính cấp độ và gửi kết quả chi tiết tới Thầy Đỗ Tuấn Nam.
          </p>
        </div>
      </section>

      {/* 3. MAIN TEST CONTAINER */}
      <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-10">
        <MiniPlacementTest
          onSelectConsultation={handleConsultationFromTest}
          className="shadow-2xl border-neutral-200"
        />
      </main>

      {/* 4. FOOTER */}
      <footer className="bg-white border-t border-neutral-200/90 py-6 text-center text-xs text-neutral-600 space-y-2">
        <div className="flex items-center justify-center gap-3 font-semibold text-neutral-700">
          <button
            type="button"
            onClick={handleBack}
            className="hover:text-amber-700 transition cursor-pointer"
          >
            ← Quay lại Trang Chủ
          </button>
          <span>•</span>
          <span>Thầy Đỗ Tuấn Nam - 077 345 2809</span>
          <span>•</span>
          <span>Email: dotuannamwork2809@gmail.com</span>
        </div>
        <p className="text-[11px] text-neutral-500 font-medium">
          © 2026 {TEACHER_PROFILE.brandName || "TOEIC MR.NAM"}. Cổng Đánh Giá Năng Lực Trực Tuyến & Luyện Thi TOEIC Chuẩn ETS.
        </p>
      </footer>
    </div>
  );
};

export default PlacementTestPage;
