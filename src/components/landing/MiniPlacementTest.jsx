import React, { useState, useEffect } from "react";
import {
  MINI_PLACEMENT_TEST_QUESTIONS,
  getPlacementScoreEvaluation,
  TEACHER_PROFILE,
} from "../../data/portfolioData";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../../config/firebase";
import { logActivity, ACTION_TYPES } from "../../services/auditLogService";
import { sendEmailNotification } from "../../services/api";

const TARGET_GOAL_OPTIONS = [
  "Mất gốc / Căn bản (Mục tiêu 350 — 450+ TOEIC)",
  "Chuẩn đầu ra tốt nghiệp (Mục tiêu 500 — 600+ TOEIC)",
  "Bứt phá đi làm / Đa quốc gia (Mục tiêu 650 — 750+ TOEIC)",
  "Master TOEIC Thực chiến (Mục tiêu 800 — 900+ TOEIC)",
];

export const MiniPlacementTest = ({ onSelectConsultation, className = "" }) => {
  // Candidate Info State
  const [hasStarted, setHasStarted] = useState(false);
  const [candidateInfo, setCandidateInfo] = useState({
    fullName: "",
    phone: "",
    email: "",
    targetGoal: TARGET_GOAL_OPTIONS[1],
  });
  const [infoError, setInfoError] = useState("");

  // Quiz Navigation & State
  const [currentIndex, setCurrentIndex] = useState(0);
  const [userAnswers, setUserAnswers] = useState(
    Array(MINI_PLACEMENT_TEST_QUESTIONS.length).fill(null)
  );
  const [timeLeft, setTimeLeft] = useState(420); // 7 minutes (420s)
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const [testResults, setTestResults] = useState(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [reviewFilter, setReviewFilter] = useState("all"); // 'all' | 'incorrect' | 'correct'

  const totalQuestions = MINI_PLACEMENT_TEST_QUESTIONS.length;
  const currentQ = MINI_PLACEMENT_TEST_QUESTIONS[currentIndex];

  // Countdown Timer
  useEffect(() => {
    if (!hasStarted || isCompleted) return;

    if (timeLeft <= 0) {
      handleFinalSubmit();
      return;
    }

    const timer = setInterval(() => {
      setTimeLeft((prev) => prev - 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [hasStarted, isCompleted, timeLeft]);

  // Format time mm:ss
  const formatTime = (secs) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  // Start Test Handler
  const handleStartTest = (e) => {
    e.preventDefault();
    if (!candidateInfo.fullName.trim()) {
      setInfoError("Vui lòng nhập họ và tên của bạn để bắt đầu bài thi!");
      return;
    }
    if (!candidateInfo.phone.trim()) {
      setInfoError("Vui lòng nhập số điện thoại (Zalo) để nhận kết quả đánh giá!");
      return;
    }
    setInfoError("");
    setHasStarted(true);
    setCurrentIndex(0);
    setTimeLeft(420);
    setUserAnswers(Array(totalQuestions).fill(null));
    setIsCompleted(false);
    setTestResults(null);
  };

  // Select Option Handler
  const handleSelectOption = (optIdx) => {
    setUserAnswers((prev) => {
      const updated = [...prev];
      updated[currentIndex] = optIdx;
      return updated;
    });
  };

  // Quick Navigation to Question
  const handleJumpToQuestion = (idx) => {
    setCurrentIndex(idx);
  };

  // Calculate & Submit Test
  const handleFinalSubmit = async () => {
    setShowConfirmModal(false);
    setIsSubmitting(true);

    // 1. Calculate Score & Question-by-Question Results
    let correctCount = 0;
    const detailedResults = MINI_PLACEMENT_TEST_QUESTIONS.map((q, idx) => {
      const userChoiceIdx = userAnswers[idx];
      const isCorrect = userChoiceIdx === q.answer;
      if (isCorrect) correctCount++;
      const userLetter =
        userChoiceIdx !== null && userChoiceIdx !== undefined
          ? String.fromCharCode(65 + userChoiceIdx)
          : "Chưa chọn";
      const correctLetter = String.fromCharCode(65 + q.answer);

      return {
        qNum: q.id,
        part: q.part,
        section: q.section,
        question: q.question,
        userChoiceIdx,
        userChoice: userLetter,
        correctChoice: correctLetter,
        isCorrect,
        explanation: q.explanation || "",
        tier: q.tier || "",
      };
    });

    const evaluation = getPlacementScoreEvaluation(correctCount);
    const timeSpent = Math.max(0, 420 - timeLeft);

    const resultPayload = {
      candidateName: candidateInfo.fullName.trim(),
      phone: candidateInfo.phone.trim(),
      email: candidateInfo.email.trim(),
      score: correctCount,
      totalQuestions,
      percentage: Math.round((correctCount / totalQuestions) * 100),
      evaluation,
      detailedResults,
      timeSpent,
    };

    setTestResults(resultPayload);

    // Save to localStorage for seamless Consultation form auto-fill
    try {
      localStorage.setItem("toeic_last_placement_result", JSON.stringify(resultPayload));
    } catch (e) {}

    // 2. Save Submission to Firestore: 'placement_test_submissions'
    try {
      await addDoc(collection(db, "placement_test_submissions"), {
        candidateName: candidateInfo.fullName.trim(),
        phone: candidateInfo.phone.trim(),
        email: candidateInfo.email.trim(),
        targetGoal: candidateInfo.targetGoal,
        score: correctCount,
        totalQuestions,
        percentage: Math.round((correctCount / totalQuestions) * 100),
        tier: evaluation.range,
        recommendedCourse: evaluation.recommendedCourse,
        results: detailedResults,
        timeSpentSeconds: timeSpent,
        submittedAt: serverTimestamp(),
        createdAt: new Date().toISOString(),
        source: "landing_placement_test",
      });
    } catch (saveErr) {
      console.warn("[PlacementTest] Firestore save error (non-blocking):", saveErr);
    }

    // 3. Write to Firestore 'activity_logs' to trigger Discord Bot listener
    try {
      await logActivity({
        action: ACTION_TYPES.PLACEMENT_TEST_SUBMISSION || "PLACEMENT_TEST_SUBMISSION",
        resource: "placement_test",
        targetName: candidateInfo.fullName.trim(),
        details: `Thí sinh ${candidateInfo.fullName.trim()} (SĐT: ${candidateInfo.phone.trim()}) vừa hoàn thành TOEIC Reading Placement Test: ${correctCount}/${totalQuestions} câu đúng (${evaluation.range}). Khóa học đề xuất: ${evaluation.recommendedCourse}`,
        metadata: {
          candidateName: candidateInfo.fullName.trim(),
          phone: candidateInfo.phone.trim(),
          email: candidateInfo.email.trim(),
          targetGoal: candidateInfo.targetGoal,
          score: correctCount,
          totalQuestions,
          percentage: Math.round((correctCount / totalQuestions) * 100),
          tier: evaluation.range,
          recommendedCourse: evaluation.recommendedCourse,
          results: detailedResults,
          timeSpentSeconds: timeSpent,
        },
      });
    } catch (logErr) {
      console.warn("[PlacementTest] Activity log error (non-blocking):", logErr);
    }

    // 4. Send Email Notification to Teacher (dotuannamwork2809@gmail.com)
    try {
      const emailRecipient = TEACHER_PROFILE?.adminEmail || "dotuannamwork2809@gmail.com";
      const tableRowsHtml = detailedResults
        .map((r) => {
          const rowBg = r.isCorrect ? "#f0fdf4" : "#fef2f2";
          const statusText = r.isCorrect ? "✅ ĐÚNG" : "❌ SAI";
          const userColor = r.isCorrect ? "#15803d" : "#b91c1c";
          return `
            <tr style="background-color: ${rowBg}; border-bottom: 1px solid #e2e8f0;">
              <td style="padding: 10px 8px; text-align: center; font-weight: bold; color: #0f172a;">Câu ${r.qNum}</td>
              <td style="padding: 10px 8px; color: #334155;"><strong>${r.part}</strong></td>
              <td style="padding: 10px 8px; text-align: center; font-weight: bold; color: ${userColor}; font-size: 14px;">${r.userChoice}</td>
              <td style="padding: 10px 8px; text-align: center; font-weight: bold; color: #0284c7; font-size: 14px;">${r.correctChoice}</td>
              <td style="padding: 10px 8px; text-align: center; font-weight: bold; font-size: 13px;">${statusText}</td>
            </tr>
          `;
        })
        .join("");

      const emailHtmlBody = `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 650px; margin: 0 auto; background-color: #faf9f6; border: 1px solid #e7e5e4; border-radius: 20px; overflow: hidden; box-shadow: 0 4px 16px rgba(0,0,0,0.06);">
          <div style="background-color: #1c1610; padding: 26px 24px; text-align: center; border-bottom: 4px solid #c27803;">
            <h2 style="color: #ffffff; margin: 0 0 6px; font-size: 21px; font-weight: 800; letter-spacing: 0.5px;">TOEIC MR.NAM — HỆ THỐNG LMS</h2>
            <p style="color: #f59e0b; margin: 0; font-size: 13px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px;">Thí Sinh Vừa Nộp Bài Reading Placement Test</p>
          </div>
          
          <div style="padding: 24px;">
            <div style="background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 14px; padding: 18px 20px; margin-bottom: 20px;">
              <h3 style="margin: 0 0 12px; color: #0f172a; font-size: 15px; border-bottom: 2px solid #f8fafc; padding-bottom: 8px;">👤 Thông Tin Thí Sinh</h3>
              <table style="width: 100%; font-size: 14px; line-height: 1.6; border-collapse: collapse;">
                <tr><td style="padding: 5px 0; color: #64748b; width: 35%;">Họ và tên:</td><td style="padding: 5px 0; color: #0f172a; font-weight: bold; font-size: 15px;">${candidateInfo.fullName.trim()}</td></tr>
                <tr><td style="padding: 5px 0; color: #64748b;">Số điện thoại:</td><td style="padding: 5px 0; color: #0f172a; font-weight: bold;"><a href="tel:${candidateInfo.phone.trim()}" style="color: #0284c7; text-decoration: none;">${candidateInfo.phone.trim()}</a></td></tr>
                <tr><td style="padding: 5px 0; color: #64748b;">Email:</td><td style="padding: 5px 0; color: #0f172a; font-weight: bold;"><a href="mailto:${candidateInfo.email.trim()}" style="color: #0284c7; text-decoration: none;">${candidateInfo.email.trim() || "Chưa cung cấp"}</a></td></tr>
                <tr><td style="padding: 5px 0; color: #64748b;">Mục tiêu mong muốn:</td><td style="padding: 5px 0; color: #d97706; font-weight: bold;">${candidateInfo.targetGoal}</td></tr>
                <tr><td style="padding: 5px 0; color: #64748b;">Thời gian hoàn thành:</td><td style="padding: 5px 0; color: #0f172a;">${formatTime(timeSpent)} / 7 phút</td></tr>
                <tr><td style="padding: 5px 0; color: #64748b;">Thời điểm nộp:</td><td style="padding: 5px 0; color: #0f172a;">${new Date().toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" })}</td></tr>
              </table>
            </div>

            <div style="background-color: #fefce8; border: 2px solid #f59e0b; border-radius: 14px; padding: 18px 20px; text-align: center; margin-bottom: 22px;">
              <div style="font-size: 12px; font-weight: 800; color: #92400e; text-transform: uppercase; letter-spacing: 0.5px;">Điểm Số & Xếp Lớp Năng Lực</div>
              <div style="font-size: 36px; font-weight: 900; color: #b45309; margin: 6px 0;">${correctCount} <span style="font-size: 18px; color: #78716c;">/ ${totalQuestions}</span></div>
              <div style="font-size: 14px; font-weight: bold; color: #0f172a; margin-bottom: 8px;">Độ chính xác: ${Math.round((correctCount / totalQuestions) * 100)}% • Trình độ ước tính: <span style="color: #0369a1;">${evaluation.range}</span></div>
              <div style="display: inline-block; background-color: #ffffff; border: 1px solid #fbbf24; border-radius: 8px; padding: 6px 14px; font-size: 13px; font-weight: bold; color: #78350f;">
                Khóa học đề xuất: ${evaluation.recommendedCourse}
              </div>
            </div>

            <h3 style="margin: 0 0 10px; color: #0f172a; font-size: 15px;">📝 Chi Tiết Bài Làm (${totalQuestions} Câu):</h3>
            <table style="width: 100%; border-collapse: collapse; font-size: 13px; background-color: #ffffff; border-radius: 10px; overflow: hidden; border: 1px solid #e2e8f0; margin-bottom: 22px;">
              <thead>
                <tr style="background-color: #0f172a; color: #ffffff;">
                  <th style="padding: 9px 8px; text-align: center; width: 55px;">Câu</th>
                  <th style="padding: 9px 8px; text-align: left;">Phần thi</th>
                  <th style="padding: 9px 8px; text-align: center; width: 65px;">Thí sinh</th>
                  <th style="padding: 9px 8px; text-align: center; width: 65px;">Đáp án</th>
                  <th style="padding: 9px 8px; text-align: center; width: 85px;">Kết quả</th>
                </tr>
              </thead>
              <tbody>
                ${tableRowsHtml}
              </tbody>
            </table>

            <div style="background-color: #f1f5f9; border-radius: 10px; padding: 12px 14px; font-size: 12px; color: #475569; line-height: 1.5;">
              💡 <strong>Lưu ý Giảng viên:</strong> Thông tin thí sinh và bài nộp đã được cập nhật đồng thời lên Discord Bot. Thầy có thể liên hệ ngay với thí sinh qua số điện thoại hoặc email trên để tư vấn xếp lớp.
            </div>
          </div>

          <div style="background-color: #f8fafc; padding: 14px; text-align: center; border-top: 1px solid #e2e8f0; font-size: 12px; color: #94a3b8;">
            Hệ thống LMS TOEIC MR.NAM • Giảng viên Thầy Đỗ Tuấn Nam (${TEACHER_PROFILE.phone})
          </div>
        </div>
      `;

      await sendEmailNotification({
        to: emailRecipient,
        subject: `🎯 [LMS Placement Test] ${candidateInfo.fullName.trim()} - Điểm: ${correctCount}/${totalQuestions} (${evaluation.range})`,
        htmlBody: emailHtmlBody,
        replyTo: candidateInfo.email.trim() || emailRecipient,
        senderName: "TOEIC MR.NAM LMS Portal",
      });
    } catch (mailErr) {
      console.warn("[PlacementTest] Email dispatch error (non-blocking):", mailErr);
    }

    setIsSubmitting(false);
    setIsCompleted(true);
  };

  const answeredCount = userAnswers.filter((a) => a !== null).length;

  return (
    <div
      className={`bg-white rounded-3xl shadow-xl border border-neutral-200/90 transition-all overflow-hidden ${className}`}
    >
      {/* 1. INITIAL CANDIDATE FORM STATE */}
      {!hasStarted && !isCompleted && (
        <div className="p-6 md:p-10 space-y-8">
          <div className="text-center space-y-4 max-w-2xl mx-auto">
            <div className="w-16 h-16 mx-auto bg-amber-100 border border-amber-300 rounded-2xl flex items-center justify-center shadow-xs">
              <svg
                className="w-8 h-8 text-amber-700"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
                <rect x="8" y="2" width="8" height="4" rx="1" ry="1" />
                <path d="m9 14 2 2 4-4" />
              </svg>
            </div>

            <div className="space-y-2">
              <span className="inline-block px-3 py-1 bg-amber-100 text-amber-900 font-extrabold text-xs uppercase tracking-wider rounded-full border border-amber-300">
                Chuẩn Định Dạng ETS • 7 Phút
              </span>
              <h3 className="text-2xl sm:text-3xl font-heading font-black text-neutral-950 tracking-tight">
                TOEIC Reading Placement Test (Part 5 - 7)
              </h3>
              <p className="text-sm text-neutral-700 font-medium leading-relaxed">
                Đánh giá toàn diện năng lực Ngữ pháp & Đọc hiểu: <strong>Part 5 (Từ loại, Đảo ngữ)</strong>, <strong>Part 6 (Văn bản Memorandum)</strong> và <strong>Part 7 (Thông báo Notice)</strong>. Hệ thống tự động chấm điểm và gửi phân tích chi tiết cho bạn ngay sau khi nộp bài.
              </p>
            </div>
          </div>

          {/* Test Rules Badges */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 max-w-2xl mx-auto text-xs text-neutral-800 font-semibold">
            <div className="p-3.5 bg-neutral-50 rounded-xl border border-neutral-200 flex items-center gap-3">
              <span className="text-xl text-amber-600 font-black">⏱️</span>
              <div>
                <span className="block font-bold text-neutral-900">Thời gian 7 Phút</span>
                <span className="text-[11px] text-neutral-600 font-normal">Đồng hồ đếm ngược tự động</span>
              </div>
            </div>
            <div className="p-3.5 bg-neutral-50 rounded-xl border border-neutral-200 flex items-center gap-3">
              <span className="text-xl text-sky-600 font-black">📖</span>
              <div>
                <span className="block font-bold text-neutral-900">Chuẩn Part 5 - 7 ETS</span>
                <span className="text-[11px] text-neutral-600 font-normal">Từ loại, Đoạn văn & Đọc hiểu</span>
              </div>
            </div>
            <div className="p-3.5 bg-neutral-50 rounded-xl border border-neutral-200 flex items-center gap-3">
              <span className="text-xl text-emerald-600 font-black">📊</span>
              <div>
                <span className="block font-bold text-neutral-900">Xếp Lớp Tức Thì</span>
                <span className="text-[11px] text-neutral-600 font-normal">Định vị Foundation, 550+, 650+</span>
              </div>
            </div>
          </div>

          {/* Candidate Form */}
          <form
            onSubmit={handleStartTest}
            className="max-w-xl mx-auto bg-neutral-50/80 border border-neutral-200 rounded-2xl p-6 md:p-8 space-y-4 text-left"
          >
            <div className="border-b border-neutral-200/80 pb-3">
              <h4 className="font-heading font-black text-neutral-950 text-base">
                Thông Tin Thí Sinh Trước Khi Bắt Đầu
              </h4>
              <p className="text-xs text-neutral-600">
                Để hệ thống lưu bài làm, chấm điểm và gửi kết quả phân tích cá nhân hóa cho bạn:
              </p>
            </div>

            {infoError && (
              <div className="p-3 bg-rose-50 border border-rose-300 rounded-xl text-xs text-rose-800 font-bold flex items-center gap-2">
                <span>⚠️</span>
                <span>{infoError}</span>
              </div>
            )}

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-neutral-800 uppercase tracking-wider mb-1">
                  Họ và Tên <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ví dụ: Nguyễn Văn An"
                  value={candidateInfo.fullName}
                  onChange={(e) =>
                    setCandidateInfo((prev) => ({ ...prev, fullName: e.target.value }))
                  }
                  className="w-full px-4 py-2.5 bg-white border border-neutral-300 rounded-xl text-sm text-neutral-900 font-medium focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-hidden transition"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-neutral-800 uppercase tracking-wider mb-1">
                    Số Điện Thoại / Zalo <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="tel"
                    required
                    placeholder="Ví dụ: 0912 345 678"
                    value={candidateInfo.phone}
                    onChange={(e) =>
                      setCandidateInfo((prev) => ({ ...prev, phone: e.target.value }))
                    }
                    className="w-full px-4 py-2.5 bg-white border border-neutral-300 rounded-xl text-sm text-neutral-900 font-medium focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-hidden transition"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-neutral-800 uppercase tracking-wider mb-1">
                    Email (Nhận kết quả)
                  </label>
                  <input
                    type="email"
                    placeholder="email@example.com"
                    value={candidateInfo.email}
                    onChange={(e) =>
                      setCandidateInfo((prev) => ({ ...prev, email: e.target.value }))
                    }
                    className="w-full px-4 py-2.5 bg-white border border-neutral-300 rounded-xl text-sm text-neutral-900 font-medium focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-hidden transition"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-neutral-800 uppercase tracking-wider mb-1">
                  Mục Tiêu Điểm Số TOEIC Của Bạn
                </label>
                <select
                  value={candidateInfo.targetGoal}
                  onChange={(e) =>
                    setCandidateInfo((prev) => ({ ...prev, targetGoal: e.target.value }))
                  }
                  className="w-full px-4 py-2.5 bg-white border border-neutral-300 rounded-xl text-sm text-neutral-900 font-semibold focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-hidden transition"
                >
                  {TARGET_GOAL_OPTIONS.map((goal, idx) => (
                    <option key={idx} value={goal}>
                      {goal}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="pt-3">
              <button
                type="submit"
                className="w-full py-4 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-heading font-black text-sm uppercase tracking-wider rounded-xl shadow-lg hover:shadow-amber-500/25 transition-all transform hover:-translate-y-0.5 cursor-pointer flex items-center justify-center gap-2"
              >
                <span>Bắt Đầu Làm Bài Thi (7 Phút)</span>
                <span className="text-lg">→</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* 2. QUIZ IN-PROGRESS STATE */}
      {hasStarted && !isCompleted && (
        <div className="p-4 sm:p-6 md:p-8 space-y-6">
          {/* Top Sticky Header: Timer & Actions */}
          <div className="bg-neutral-900 text-white p-4 rounded-2xl shadow-md flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-400/40 flex items-center justify-center text-amber-400 font-bold text-lg">
                ⏱️
              </div>
              <div>
                <span className="text-[11px] uppercase tracking-wider text-neutral-400 font-bold block">
                  Thời Gian Còn Lại
                </span>
                <span
                  className={`text-xl sm:text-2xl font-mono font-black tracking-wider ${
                    timeLeft < 90 ? "text-rose-400 animate-pulse" : "text-amber-400"
                  }`}
                >
                  {formatTime(timeLeft)}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-4 text-xs">
              <div className="hidden sm:block text-right">
                <span className="text-neutral-400 block font-semibold">Tiến độ bài làm</span>
                <span className="font-bold text-emerald-400">
                  {answeredCount} / {totalQuestions} câu đã chọn
                </span>
              </div>

              <button
                type="button"
                onClick={() => setShowConfirmModal(true)}
                className="px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white font-heading font-black text-xs uppercase tracking-wider rounded-xl shadow-md transition cursor-pointer"
              >
                Nộp Bài Thi
              </button>
            </div>
          </div>

          {/* Question Jump Palette (1 to 7 pills) */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs text-neutral-600 font-semibold">
              <span>Bảng câu hỏi ({answeredCount}/{totalQuestions} hoàn thành):</span>
              <span className="text-[11px] text-neutral-500">
                Click vào số câu để chuyển nhanh
              </span>
            </div>

            <div className="flex flex-wrap gap-2">
              {MINI_PLACEMENT_TEST_QUESTIONS.map((q, idx) => {
                const isCurrent = idx === currentIndex;
                const isAnswered = userAnswers[idx] !== null;

                let pillStyle = "bg-neutral-100 text-neutral-700 border-neutral-300 hover:bg-neutral-200";
                if (isAnswered) {
                  pillStyle = "bg-emerald-100 text-emerald-900 border-emerald-400 font-bold";
                }
                if (isCurrent) {
                  pillStyle =
                    "bg-amber-500 text-slate-950 border-amber-600 font-black shadow-md ring-2 ring-amber-300";
                }

                return (
                  <button
                    key={q.id}
                    type="button"
                    onClick={() => handleJumpToQuestion(idx)}
                    className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl border text-xs font-heading transition-all cursor-pointer flex items-center justify-center ${pillStyle}`}
                    title={`Câu ${q.id} (${q.part})`}
                  >
                    {q.id}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Current Question Main Display Box */}
          <div className="border-2 border-neutral-200 rounded-3xl p-5 sm:p-7 space-y-6 bg-white shadow-xs">
            {/* Question Part Badge & Category */}
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-neutral-200 pb-3">
              <div className="flex items-center gap-2">
                <span className="px-3 py-1 bg-neutral-900 text-white font-heading font-black text-xs uppercase tracking-wider rounded-lg">
                  {currentQ.part}
                </span>
                <span className="text-xs font-bold text-amber-700 bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-200">
                  {currentQ.tier}
                </span>
              </div>

              <span className="text-xs text-neutral-600 font-mono font-bold">
                Câu {currentIndex + 1} / {totalQuestions}
              </span>
            </div>

            {/* Part 6 & 7: Reading Passage Text */}
            {currentQ.passage && (
              <div className="p-5 bg-neutral-50 rounded-2xl border border-neutral-300 font-mono text-xs sm:text-sm text-neutral-900 leading-relaxed whitespace-pre-wrap max-h-72 overflow-y-auto">
                {currentQ.passage}
              </div>
            )}

            {/* Question Stem */}
            <div className="p-4 bg-neutral-50/80 rounded-2xl border border-neutral-200">
              <p className="font-heading font-bold text-neutral-950 text-sm sm:text-base leading-relaxed">
                {currentQ.question}
              </p>
            </div>

            {/* Options Selection */}
            <div className="space-y-3">
              {currentQ.options.map((option, optIdx) => {
                const letter = String.fromCharCode(65 + optIdx);
                const isSelected = userAnswers[currentIndex] === optIdx;

                let optClass =
                  "bg-white border-2 border-neutral-200 hover:border-amber-400 hover:bg-amber-50/30 text-neutral-900";
                if (isSelected) {
                  optClass =
                    "bg-amber-50 border-2 border-amber-500 text-amber-950 font-bold shadow-xs";
                }

                return (
                  <button
                    key={optIdx}
                    type="button"
                    onClick={() => handleSelectOption(optIdx)}
                    className={`w-full text-left p-4 rounded-xl border text-sm transition-all flex items-center justify-between cursor-pointer ${optClass}`}
                  >
                    <div className="flex items-center gap-3">
                      <span
                        className={`w-8 h-8 rounded-lg flex items-center justify-center font-mono font-black text-xs ${
                          isSelected
                            ? "bg-amber-500 text-slate-950 shadow-xs"
                            : "bg-neutral-200 text-neutral-800"
                        }`}
                      >
                        {letter}
                      </span>
                      <span className="font-medium text-neutral-900">{option}</span>
                    </div>

                    {isSelected && (
                      <span className="w-5 h-5 rounded-full bg-amber-500 text-slate-950 flex items-center justify-center text-xs font-bold shrink-0">
                        ✓
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Previous / Next Controls */}
            <div className="flex items-center justify-between pt-4 border-t border-neutral-200">
              <button
                type="button"
                disabled={currentIndex === 0}
                onClick={() => setCurrentIndex((prev) => Math.max(0, prev - 1))}
                className="px-5 py-2.5 bg-neutral-100 hover:bg-neutral-200 disabled:opacity-30 disabled:cursor-not-allowed text-neutral-800 font-heading font-bold text-xs uppercase tracking-wider rounded-xl transition cursor-pointer"
              >
                ← Câu Trước
              </button>

              {currentIndex < totalQuestions - 1 ? (
                <button
                  type="button"
                  onClick={() => setCurrentIndex((prev) => Math.min(totalQuestions - 1, prev + 1))}
                  className="px-6 py-2.5 bg-neutral-950 hover:bg-neutral-800 text-white font-heading font-black text-xs uppercase tracking-wider rounded-xl transition cursor-pointer shadow-sm"
                >
                  Câu Tiếp Theo →
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setShowConfirmModal(true)}
                  className="px-6 py-2.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-heading font-black text-xs uppercase tracking-wider rounded-xl shadow-md transition cursor-pointer"
                >
                  Xem Lại & Nộp Bài →
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 3. CONFIRMATION MODAL BEFORE SUBMISSION */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl border border-neutral-200 space-y-6 animate-scaleUp text-center">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-amber-100 border border-amber-300 flex items-center justify-center text-2xl">
              📝
            </div>

            <div className="space-y-2">
              <h4 className="text-xl font-heading font-black text-neutral-950">
                Xác Nhận Nộp Bài Thi
              </h4>
              <p className="text-sm text-neutral-700">
                Bạn đã làm <strong>{answeredCount}</strong> / {totalQuestions} câu hỏi.
                {answeredCount < totalQuestions && (
                  <span className="block mt-1 text-rose-700 font-bold text-xs">
                    ⚠️ Còn {totalQuestions - answeredCount} câu chưa chọn đáp án. Các câu chưa chọn sẽ được tính là 0 điểm.
                  </span>
                )}
              </p>
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setShowConfirmModal(false)}
                className="flex-1 py-3 bg-neutral-100 hover:bg-neutral-200 text-neutral-800 font-bold text-xs uppercase tracking-wider rounded-xl transition cursor-pointer"
              >
                Tiếp tục làm bài
              </button>
              <button
                type="button"
                disabled={isSubmitting}
                onClick={handleFinalSubmit}
                className="flex-1 py-3 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-heading font-black text-xs uppercase tracking-wider rounded-xl shadow-lg transition cursor-pointer"
              >
                {isSubmitting ? "Đang Chấm Điểm..." : "Nộp Bài Ngay"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 4. COMPLETED RESULTS STATE */}
      {isCompleted && testResults && (
        <div className="p-6 md:p-10 space-y-8 animate-fadeIn">
          {/* Header Badge */}
          <div className="text-center space-y-3">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-100 text-emerald-900 font-extrabold text-xs uppercase tracking-wider rounded-full border border-emerald-300">
              <span>✓</span> Hoàn Thành TOEIC Reading Placement Test
            </span>
            <h3 className="text-2xl sm:text-3xl font-heading font-black text-neutral-950">
              Bảng Đánh Giá Năng Lực & Phân Tích Lộ Trình
            </h3>
            <p className="text-xs sm:text-sm text-neutral-600 font-medium max-w-lg mx-auto">
              Thí sinh: <strong>{candidateInfo.fullName}</strong> • SĐT: <strong>{candidateInfo.phone}</strong> • Thời gian làm bài: <strong>{formatTime(testResults.timeSpent)}</strong>
            </p>
          </div>

          {/* Score & Evaluation Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl mx-auto">
            <div className="p-6 bg-neutral-50 rounded-2xl border border-neutral-200 text-center space-y-1 shadow-xs">
              <span className="text-xs uppercase tracking-wider font-extrabold text-neutral-700">
                Điểm Trắc Nghiệm Reading
              </span>
              <div className="text-4xl sm:text-5xl font-heading font-black text-amber-600">
                {testResults.score} <span className="text-xl text-neutral-500">/ {totalQuestions}</span>
              </div>
              <p className="text-xs text-neutral-700 font-bold">
                Độ chính xác: {testResults.percentage}%
              </p>
            </div>

            <div
              className={`p-6 rounded-2xl border-2 ${testResults.evaluation.color} space-y-1 text-center shadow-xs flex flex-col justify-center`}
            >
              <span className="text-xs uppercase tracking-wider font-extrabold text-neutral-700">
                Trình Độ Ước Tính
              </span>
              <div className="text-2xl font-heading font-black text-neutral-950">
                {testResults.evaluation.range}
              </div>
              <span className="text-xs font-bold block text-neutral-800">
                Khóa đề xuất: {testResults.evaluation.recommendedCourse.split("(")[0]}
              </span>
            </div>
          </div>

          {/* Teacher Recommendation Box */}
          <div className="p-5 bg-amber-50 rounded-2xl border border-amber-200 text-xs sm:text-sm space-y-2 max-w-2xl mx-auto">
            <div className="flex items-center gap-2 text-amber-950 font-bold font-heading text-sm">
              <span>🎯</span>
              <span className="uppercase tracking-wider">
                Nhận xét & Lộ trình đề xuất từ Thầy Đỗ Tuấn Nam:
              </span>
            </div>
            <p className="text-neutral-800 font-medium leading-relaxed">
              {testResults.evaluation.desc}
            </p>
            <p className="text-neutral-600 italic text-xs pt-1 border-t border-amber-200/80">
              * Toàn bộ kết quả và chi tiết câu làm bài của bạn đã được chuyển thẳng tới Thầy Đỗ Tuấn Nam qua Email và kênh điều hành Discord.
            </p>
          </div>

          {/* Question Review Section with Filter */}
          <div className="max-w-3xl mx-auto space-y-4 pt-4 border-t border-neutral-200">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h4 className="font-heading font-black text-neutral-950 text-base">
                Chi Tiết Đáp Án & Lời Giải {totalQuestions} Câu
              </h4>
              <div className="flex items-center gap-1.5 text-xs">
                <button
                  type="button"
                  onClick={() => setReviewFilter("all")}
                  className={`px-3 py-1 rounded-lg font-bold transition cursor-pointer ${
                    reviewFilter === "all"
                      ? "bg-neutral-950 text-white"
                      : "bg-neutral-100 text-neutral-700 hover:bg-neutral-200"
                  }`}
                >
                  Tất cả ({totalQuestions})
                </button>
                <button
                  type="button"
                  onClick={() => setReviewFilter("incorrect")}
                  className={`px-3 py-1 rounded-lg font-bold transition cursor-pointer ${
                    reviewFilter === "incorrect"
                      ? "bg-rose-600 text-white"
                      : "bg-neutral-100 text-neutral-700 hover:bg-neutral-200"
                  }`}
                >
                  Câu sai ({totalQuestions - testResults.score})
                </button>
                <button
                  type="button"
                  onClick={() => setReviewFilter("correct")}
                  className={`px-3 py-1 rounded-lg font-bold transition cursor-pointer ${
                    reviewFilter === "correct"
                      ? "bg-emerald-600 text-white"
                      : "bg-neutral-100 text-neutral-700 hover:bg-neutral-200"
                  }`}
                >
                  Câu đúng ({testResults.score})
                </button>
              </div>
            </div>

            {/* List of Questions */}
            <div className="space-y-4">
              {testResults.detailedResults
                .filter((r) => {
                  if (reviewFilter === "incorrect") return !r.isCorrect;
                  if (reviewFilter === "correct") return r.isCorrect;
                  return true;
                })
                .map((r) => {
                  return (
                    <div
                      key={r.qNum}
                      className={`p-5 rounded-2xl border-2 transition-all space-y-3 ${
                        r.isCorrect
                          ? "bg-emerald-50/40 border-emerald-300"
                          : "bg-rose-50/40 border-rose-300"
                      }`}
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span
                            className={`w-6 h-6 rounded-md flex items-center justify-center font-bold text-xs ${
                              r.isCorrect ? "bg-emerald-600 text-white" : "bg-rose-600 text-white"
                            }`}
                          >
                            {r.isCorrect ? "✓" : "✗"}
                          </span>
                          <span className="font-heading font-black text-sm text-neutral-950">
                            Câu {r.qNum}: {r.part}
                          </span>
                        </div>

                        <div className="flex items-center gap-2 text-xs font-bold">
                          <span className="text-neutral-600">
                            Bạn chọn:{" "}
                            <strong className={r.isCorrect ? "text-emerald-700" : "text-rose-700"}>
                              ({r.userChoice})
                            </strong>
                          </span>
                          <span>•</span>
                          <span className="text-neutral-900">
                            Đáp án: <strong className="text-sky-700">({r.correctChoice})</strong>
                          </span>
                        </div>
                      </div>

                      <p className="text-xs sm:text-sm font-semibold text-neutral-900">
                        {r.question}
                      </p>

                      {/* Explanation */}
                      <div className="p-3 bg-amber-50/90 rounded-xl border border-amber-200 text-xs text-neutral-900 space-y-1">
                        <span className="font-bold text-amber-900 block">
                          💡 Giải thích chi tiết từ Thầy Nam:
                        </span>
                        <p className="leading-relaxed font-medium">{r.explanation}</p>
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>

          {/* Action CTAs */}
          <div className="flex flex-col sm:flex-row gap-3 pt-6 border-t border-neutral-200 max-w-2xl mx-auto">
            <button
              onClick={() => {
                if (onSelectConsultation) {
                  onSelectConsultation({
                    name: candidateInfo.fullName,
                    phone: candidateInfo.phone,
                    email: candidateInfo.email,
                    quizScore: testResults.score,
                    quizMaxScore: totalQuestions,
                    quizLevel: testResults.evaluation.range,
                    recommendedCourse: testResults.evaluation.recommendedCourse,
                  });
                }
              }}
              className="flex-1 py-4 px-6 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-heading font-black text-xs uppercase tracking-wider rounded-xl shadow-lg transition text-center cursor-pointer"
            >
              Đăng Ký Tư Vấn 1-1 Theo Trình Độ Này →
            </button>
            <button
              onClick={() => {
                setHasStarted(false);
                setIsCompleted(false);
                setTestResults(null);
                setCurrentIndex(0);
                setUserAnswers(Array(totalQuestions).fill(null));
                setTimeLeft(420);
              }}
              className="py-4 px-5 border border-neutral-300 text-neutral-800 hover:bg-neutral-100 font-bold text-xs rounded-xl transition cursor-pointer"
            >
              Làm lại bài test
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default MiniPlacementTest;
