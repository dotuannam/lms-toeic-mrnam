import React, { useState, useEffect, useRef } from "react";
import {
  MINI_PLACEMENT_TEST_QUESTIONS,
  PLACEMENT_LISTENING_CONVERSATION,
  getPlacementScoreEvaluation,
  TEACHER_PROFILE,
} from "../../data/portfolioData";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../../config/firebase";
import { logActivity, ACTION_TYPES } from "../../services/auditLogService";
import { sendEmailNotification } from "../../services/api";
import { PrivacyPolicyModal } from "../common/PrivacyPolicyModal";

// Helper to resolve asset paths for both Firebase root and GitHub Pages repository subpath
export const getAssetUrl = (path) => {
  if (!path) return "";
  if (path.startsWith("http")) return path;
  const clean = path.startsWith("/") ? path.slice(1) : path;
  const base =
    typeof window !== "undefined" && window.location.pathname.startsWith("/lms-toeic-mrnam")
      ? "/lms-toeic-mrnam"
      : "";
  return base ? `${base}/${clean}` : `/${clean}`;
};

// Official Audio File Path (52-second cut)
export const OFFICIAL_AUDIO_SRC = "/audio/TOEIC_Placement_Test_Listening_Full.wav";

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
  const [consentGiven, setConsentGiven] = useState(false);
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);

  // Quiz Navigation & Section Switcher ("listening" | "reading")
  const totalQuestions = MINI_PLACEMENT_TEST_QUESTIONS.length; // 17
  const [activeSection, setActiveSection] = useState("listening"); // "listening" | "reading"
  const [currentReadingIndex, setCurrentReadingIndex] = useState(10); // Index 10 to 16 for Reading

  // Independent array of 17 answers
  const [userAnswers, setUserAnswers] = useState(() =>
    Array.from({ length: totalQuestions }, () => ({ choiceIdx: null, text: "" }))
  );

  const [timeLeft, setTimeLeft] = useState(600); // 10 minutes (600s)
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const [testResults, setTestResults] = useState(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [reviewFilter, setReviewFilter] = useState("all"); // 'all' | 'incorrect' | 'correct'

  // Audio Player State: Khóa tua sau khi bấm play
  const audioRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [hasPlayed, setHasPlayed] = useState(false); // Once played, seeking is locked!
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(52); // Exact 52 seconds audio
  const lastAllowedTimeRef = useRef(0);

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

  // Audio Event Listeners (Enforcing lock-seeking after play)
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleTimeUpdate = () => {
      lastAllowedTimeRef.current = audio.currentTime;
      setCurrentTime(audio.currentTime);
    };
    const handleLoadedMetadata = () => {
      if (audio.duration && !isNaN(audio.duration)) {
        setDuration(audio.duration);
      }
    };
    const handleEnded = () => setIsPlaying(false);
    const handlePause = () => setIsPlaying(false);
    const handlePlay = () => {
      setIsPlaying(true);
      setHasPlayed(true);
    };
    const handleSeeking = () => {
      // Khóa tua: if user attempts to seek forward or back after play, snap back
      if (hasPlayed && Math.abs(audio.currentTime - lastAllowedTimeRef.current) > 1) {
        audio.currentTime = lastAllowedTimeRef.current;
      }
    };

    audio.addEventListener("timeupdate", handleTimeUpdate);
    audio.addEventListener("loadedmetadata", handleLoadedMetadata);
    audio.addEventListener("ended", handleEnded);
    audio.addEventListener("pause", handlePause);
    audio.addEventListener("play", handlePlay);
    audio.addEventListener("seeking", handleSeeking);

    return () => {
      audio.removeEventListener("timeupdate", handleTimeUpdate);
      audio.removeEventListener("loadedmetadata", handleLoadedMetadata);
      audio.removeEventListener("ended", handleEnded);
      audio.removeEventListener("pause", handlePause);
      audio.removeEventListener("play", handlePlay);
      audio.removeEventListener("seeking", handleSeeking);
    };
  }, [hasStarted, hasPlayed]);

  const toggleAudio = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      // If audio already reached the end, restart from the beginning cleanly
      if (audioRef.current.currentTime >= (duration || 52) - 0.5) {
        lastAllowedTimeRef.current = 0;
        audioRef.current.currentTime = 0;
      }
      audioRef.current.play().then(() => {
        setHasPlayed(true);
      }).catch((e) => {
        console.warn("[Audio] Playback notice:", e);
      });
    }
  };

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
    if (!consentGiven) {
      setInfoError("Vui lòng tích chọn đồng ý với điều khoản bảo vệ dữ liệu cá nhân (Luật 91/2025/QH15) trước khi bắt đầu bài thi!");
      return;
    }
    setInfoError("");
    setHasStarted(true);
    setActiveSection("listening");
    setCurrentReadingIndex(10);
    setTimeLeft(600);
    setUserAnswers(Array.from({ length: totalQuestions }, () => ({ choiceIdx: null, text: "" })));
    setIsCompleted(false);
    setTestResults(null);
    setHasPlayed(false);
  };

  // Handle direct text typing in Listening blanks (0 to 9)
  const handleListeningInputChange = (blankIdx, value) => {
    setUserAnswers((prev) => {
      const updated = [...prev];
      updated[blankIdx] = {
        choiceIdx: null,
        text: value,
      };
      return updated;
    });
  };

  // Handle option selection for Reading questions (10 to 16)
  const handleReadingSelectOption = (optIdx) => {
    setUserAnswers((prev) => {
      const updated = [...prev];
      const q = MINI_PLACEMENT_TEST_QUESTIONS[currentReadingIndex];
      updated[currentReadingIndex] = {
        choiceIdx: optIdx,
        text: q?.options?.[optIdx] || "",
      };
      return updated;
    });
  };

  // Calculate & Submit Test
  const handleFinalSubmit = async () => {
    setShowConfirmModal(false);
    setIsSubmitting(true);

    if (audioRef.current) {
      audioRef.current.pause();
    }

    // 1. Calculate Score & Question-by-Question Results
    let correctCount = 0;
    const detailedResults = MINI_PLACEMENT_TEST_QUESTIONS.map((q, idx) => {
      const ansObj = userAnswers[idx] || { choiceIdx: null, text: "" };
      let isCorrect = false;

      if (q.section === "listening" && q.targetWord) {
        const typed = (ansObj.text || "").trim().toLowerCase();
        isCorrect = Boolean(typed && typed === q.targetWord.toLowerCase());
      } else {
        isCorrect = ansObj.choiceIdx === q.answer;
      }

      if (isCorrect) correctCount++;

      let userChoiceStr = "Chưa làm";
      if (q.section === "listening") {
        userChoiceStr = ansObj.text?.trim() || "Chưa điền";
      } else if (ansObj.choiceIdx !== null && ansObj.choiceIdx !== undefined) {
        userChoiceStr = `${String.fromCharCode(65 + ansObj.choiceIdx)} - ${q.options[ansObj.choiceIdx] || ""}`;
      }

      let correctChoiceStr = "";
      if (q.targetWord) {
        correctChoiceStr = `${q.targetWord} (${q.meaning || ""})`;
      } else {
        correctChoiceStr = `${String.fromCharCode(65 + q.answer)} - ${q.options[q.answer] || ""}`;
      }

      return {
        qNum: q.id,
        part: q.part,
        section: q.section,
        question: q.question,
        targetWord: q.targetWord || null,
        meaning: q.meaning || null,
        userChoiceIdx: ansObj.choiceIdx,
        userChoice: userChoiceStr,
        correctChoice: correctChoiceStr,
        isCorrect,
        explanation: q.explanation || "",
        tier: q.tier || "",
      };
    });

    const evaluation = getPlacementScoreEvaluation(correctCount);
    const timeSpent = Math.max(0, 600 - timeLeft);

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
        details: `Thí sinh ${candidateInfo.fullName.trim()} (SĐT: ${candidateInfo.phone.trim()}) vừa hoàn thành TOEIC Mini Placement Test: ${correctCount}/${totalQuestions} câu đúng (${evaluation.range}). Khóa học đề xuất: ${evaluation.recommendedCourse}`,
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
            <p style="color: #f59e0b; margin: 0; font-size: 13px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px;">Thí Sinh Vừa Nộp Bài Mini Placement Test (17 Câu)</p>
          </div>
          
          <div style="padding: 24px;">
            <div style="background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 14px; padding: 18px 20px; margin-bottom: 20px;">
              <h3 style="margin: 0 0 12px; color: #0f172a; font-size: 15px; border-bottom: 2px solid #f8fafc; padding-bottom: 8px;">👤 Thông Tin Thí Sinh</h3>
              <table style="width: 100%; font-size: 14px; line-height: 1.6; border-collapse: collapse;">
                <tr><td style="padding: 5px 0; color: #64748b; width: 35%;">Họ và tên:</td><td style="padding: 5px 0; color: #0f172a; font-weight: bold; font-size: 15px;">${candidateInfo.fullName.trim()}</td></tr>
                <tr><td style="padding: 5px 0; color: #64748b;">Số điện thoại:</td><td style="padding: 5px 0; color: #0f172a; font-weight: bold;"><a href="tel:${candidateInfo.phone.trim()}" style="color: #0284c7; text-decoration: none;">${candidateInfo.phone.trim()}</a></td></tr>
                <tr><td style="padding: 5px 0; color: #64748b;">Email:</td><td style="padding: 5px 0; color: #0f172a; font-weight: bold;"><a href="mailto:${candidateInfo.email.trim()}" style="color: #0284c7; text-decoration: none;">${candidateInfo.email.trim() || "Chưa cung cấp"}</a></td></tr>
                <tr><td style="padding: 5px 0; color: #64748b;">Mục tiêu mong muốn:</td><td style="padding: 5px 0; color: #d97706; font-weight: bold;">${candidateInfo.targetGoal}</td></tr>
                <tr><td style="padding: 5px 0; color: #64748b;">Thời gian hoàn thành:</td><td style="padding: 5px 0; color: #0f172a;">${formatTime(timeSpent)} / 10 phút</td></tr>
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

            <div style="background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 14px; padding: 18px 20px; margin-bottom: 20px;">
              <h3 style="margin: 0 0 12px; color: #0f172a; font-size: 15px; border-bottom: 2px solid #f8fafc; padding-bottom: 8px;">📊 Chi Tiết Bài Làm 17 Câu</h3>
              <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
                <thead>
                  <tr style="background-color: #f1f5f9; color: #475569; text-transform: uppercase; font-size: 11px;">
                    <th style="padding: 8px;">Câu</th>
                    <th style="padding: 8px; text-align: left;">Phần thi</th>
                    <th style="padding: 8px;">Thí sinh chọn</th>
                    <th style="padding: 8px;">Đáp án đúng</th>
                    <th style="padding: 8px;">Kết quả</th>
                  </tr>
                </thead>
                <tbody>
                  ${tableRowsHtml}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      `;

      await sendEmailNotification({
        to: emailRecipient,
        subject: `[LMS TOEIC] Thí sinh ${candidateInfo.fullName.trim()} vừa nộp bài Placement Test: ${correctCount}/${totalQuestions} câu (${evaluation.tier})`,
        body: emailHtmlBody,
      });
    } catch (emailErr) {
      console.warn("[PlacementTest] Email notification error (non-blocking):", emailErr);
    }

    setIsSubmitting(false);
    setIsCompleted(true);
  };

  // Progress counters
  const answeredListeningCount = userAnswers
    .slice(0, 10)
    .filter((ans) => ans && ans.text && ans.text.trim().length > 0).length;

  const answeredReadingCount = userAnswers
    .slice(10, 17)
    .filter((ans) => ans && ans.choiceIdx !== null && ans.choiceIdx !== undefined).length;

  const totalAnsweredCount = answeredListeningCount + answeredReadingCount;
  const currentReadingQ = MINI_PLACEMENT_TEST_QUESTIONS[currentReadingIndex];

  return (
    <div
      className={`bg-white rounded-3xl border border-neutral-200 shadow-xl overflow-hidden ${className}`}
    >
      {/* 1. INITIAL CANDIDATE FORM STATE */}
      {!hasStarted && (
        <div className="p-6 sm:p-8 md:p-12 max-w-2xl mx-auto space-y-8">
          <div className="text-center space-y-3">
            <span className="inline-flex items-center gap-2 px-3 py-1 bg-amber-100 text-amber-900 border border-amber-300 rounded-full text-xs font-heading font-black uppercase tracking-wider">
              <span>⚡</span> Khảo Sát Năng Lực Toàn Diện
            </span>
            <h3 className="text-2xl sm:text-3xl font-serif font-black text-neutral-950 tracking-tight">
              BÀI TEST XẾP LỚP 10 PHÚT
            </h3>
            <p className="text-xs sm:text-sm text-neutral-600 font-medium leading-relaxed">
              Khảo sát 2 kỹ năng: <strong>Nghe điền từ trực tiếp (Part 3 Cloze - 10 chỗ trống)</strong> và{" "}
              <strong>Đọc hiểu & Ngữ pháp (Part 5 - 7: 7 câu)</strong>. Hệ thống tự động chấm điểm tức thì và gợi ý lộ trình bứt phá điểm số cùng Thầy Đỗ Tuấn Nam.
            </p>

            {/* Disclaimer Callout */}
            <div className="p-3.5 bg-amber-50/90 border border-amber-300/80 rounded-2xl flex items-center justify-center gap-2.5 text-xs text-amber-900 font-medium text-left">
              <span className="text-base shrink-0">ℹ️</span>
              <p className="leading-relaxed">
                <strong>Lưu ý quan trọng:</strong> Bài kiểm tra này chỉ mang tính chất tham khảo và đánh giá năng lực sơ bộ, không phải format bài thi tiêu chuẩn.
              </p>
            </div>
          </div>

          {/* Key Test Specs Badge */}
          <div className="grid grid-cols-3 gap-3 p-4 bg-amber-50/60 rounded-2xl border border-amber-200/80 text-center">
            <div className="space-y-0.5">
              <span className="text-[10px] uppercase font-bold text-neutral-500 block">Thời gian</span>
              <span className="text-sm sm:text-base font-black text-neutral-950 font-mono">10 Phút</span>
            </div>
            <div className="space-y-0.5 border-x border-amber-200">
              <span className="text-[10px] uppercase font-bold text-neutral-500 block">Số lượng</span>
              <span className="text-sm sm:text-base font-black text-amber-800 font-mono">17 Câu hỏi</span>
            </div>
            <div className="space-y-0.5">
              <span className="text-[10px] uppercase font-bold text-neutral-500 block">Kỹ năng</span>
              <span className="text-sm sm:text-base font-black text-neutral-950 font-mono">LC + RC</span>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleStartTest} className="space-y-4">
            {infoError && (
              <div className="p-3 bg-rose-50 border border-rose-300 rounded-xl text-rose-700 text-xs font-semibold animate-shake">
                {infoError}
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

              {/* Consent Checkbox compliant with Luật Bảo vệ dữ liệu cá nhân 91/2025/QH15 */}
              <div className="p-3.5 bg-amber-50/80 border border-amber-300 rounded-2xl space-y-2">
                <label className="flex items-start gap-3 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={consentGiven}
                    onChange={(e) => {
                      setConsentGiven(e.target.checked);
                      if (e.target.checked && infoError.includes("đồng ý")) setInfoError("");
                    }}
                    className="mt-0.5 w-4 h-4 text-amber-600 border-neutral-300 rounded-md focus:ring-amber-500 cursor-pointer shrink-0"
                  />
                  <span className="text-xs text-neutral-800 leading-relaxed font-medium">
                    Tôi đồng ý cung cấp thông tin để phục vụ chấm điểm và nhận phân tích lộ trình học TOEIC từ Thầy Đỗ Tuấn Nam (tuân thủ <strong>Luật Bảo vệ dữ liệu cá nhân số 91/2025/QH15</strong>).
                  </span>
                </label>
                <div className="text-[11px] text-neutral-600 pl-7 flex flex-wrap items-center gap-2">
                  <span>🔒 Thông tin được bảo mật tuyệt đối, không chia sẻ cho bên thứ ba.</span>
                  <button
                    type="button"
                    onClick={() => setShowPrivacyModal(true)}
                    className="text-amber-800 underline font-bold hover:text-amber-900 cursor-pointer"
                  >
                    Xem chính sách bảo mật
                  </button>
                </div>
              </div>
            </div>

            <div className="pt-3">
              <button
                type="submit"
                className="w-full py-4 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-heading font-black text-sm uppercase tracking-wider rounded-xl shadow-lg hover:shadow-amber-500/25 transition-all transform hover:-translate-y-0.5 cursor-pointer flex items-center justify-center gap-2"
              >
                <span>Bắt Đầu Làm Bài Thi (10 Phút)</span>
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
                <span className="text-neutral-400 block font-semibold">Tiến độ hoàn thành</span>
                <span className="font-bold text-emerald-400">
                  {totalAnsweredCount} / {totalQuestions} câu đã làm
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

          {/* Section Navigation Tabs */}
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-neutral-200 pb-2">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setActiveSection("listening")}
                className={`px-4 py-2.5 rounded-xl text-xs font-heading font-black uppercase tracking-wider transition cursor-pointer flex items-center gap-2 ${
                  activeSection === "listening"
                    ? "bg-amber-500 text-slate-950 shadow-md ring-2 ring-amber-300"
                    : "bg-neutral-100 hover:bg-neutral-200 text-neutral-700"
                }`}
              >
                <span>🎧 Phần 1: Nghe Điền Từ</span>
                <span className="px-1.5 py-0.5 rounded-md bg-black/10 text-[10px] font-mono">
                  {answeredListeningCount}/10
                </span>
              </button>

              <button
                type="button"
                onClick={() => setActiveSection("reading")}
                className={`px-4 py-2.5 rounded-xl text-xs font-heading font-black uppercase tracking-wider transition cursor-pointer flex items-center gap-2 ${
                  activeSection === "reading"
                    ? "bg-amber-500 text-slate-950 shadow-md ring-2 ring-amber-300"
                    : "bg-neutral-100 hover:bg-neutral-200 text-neutral-700"
                }`}
              >
                <span>📖 Phần 2: Đọc Hiểu & Ngữ Pháp</span>
                <span className="px-1.5 py-0.5 rounded-md bg-black/10 text-[10px] font-mono">
                  {answeredReadingCount}/7
                </span>
              </button>
            </div>

            <span className="text-xs text-neutral-500 font-medium hidden sm:inline">
              Tổng số: {totalAnsweredCount}/{totalQuestions} câu
            </span>
          </div>

          {/* =========================================================================
              SECTION 1: LISTENING CLOZE (AUDIO WITH LOCKED SEEKING + INLINE INPUTS)
              ========================================================================= */}
          {activeSection === "listening" && (
            <div className="space-y-6">
              {/* Audio Player Card with LOCKED SEEKING (Khóa tua sau khi bấm Play) */}
              <div className="bg-neutral-900 text-white p-4 sm:p-5 rounded-2xl border border-amber-500/40 space-y-3 shadow-md">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-neutral-800 pb-2.5">
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-1 bg-amber-500 text-slate-950 font-black text-xs uppercase tracking-wider rounded-md">
                      🎧 Listening Audio
                    </span>
                    <span className="text-xs text-neutral-300 font-semibold">
                      Part 3: Đoạn Đối Thoại Hội Thoại (52 Giây)
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-xs font-mono text-neutral-400">
                    <span>{formatTime(currentTime)}</span>
                    <span>/</span>
                    <span>{duration ? formatTime(duration) : "00:52"}</span>
                  </div>
                </div>

                {/* Hidden HTML5 Audio Element */}
                <audio
                  ref={audioRef}
                  src={getAssetUrl(OFFICIAL_AUDIO_SRC)}
                  preload="metadata"
                />

                {/* Notice: Audio Info & Locked Seeking Disclaimer */}
                <div className="px-3.5 py-2.5 bg-amber-500/15 border border-amber-400/40 rounded-xl text-xs text-amber-200 font-medium flex items-start gap-2.5">
                  <span className="text-amber-400 shrink-0 mt-0.5 text-base">ℹ️</span>
                  <div className="leading-relaxed space-y-1">
                    <p>
                      <strong>Hướng dẫn:</strong> Bấm nút <em>▶ Bật Âm Thanh Nghe</em> để bắt đầu bài nghe 52 giây. Bạn hãy gõ trực tiếp từ nghe được vào các ô chỗ trống tương ứng bên dưới.
                    </p>
                    <p className="text-[11px] text-amber-300 font-normal">
                      ⚠️ <em>Lưu ý: Bài kiểm tra này chỉ mang tính chất tham khảo và đánh giá năng lực sơ bộ, không phải format bài thi tiêu chuẩn. Tính năng tua âm thanh sẽ được tự động khóa sau khi phát.</em>
                    </p>
                  </div>
                </div>

                {/* Player Controls Bar */}
                <div className="flex flex-col sm:flex-row items-center gap-3 pt-1">
                  <button
                    type="button"
                    onClick={toggleAudio}
                    className={`w-full sm:w-auto px-6 py-2.5 rounded-xl font-heading font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition cursor-pointer shadow-sm shrink-0 ${
                      isPlaying
                        ? "bg-amber-600 hover:bg-amber-700 text-white"
                        : "bg-neutral-800 hover:bg-neutral-700 text-neutral-100"
                    }`}
                  >
                    <span>{isPlaying ? "⏸ Tạm Dừng" : "▶ Bật Âm Thanh Nghe"}</span>
                  </button>

                  {/* Non-scrubbable Visual Progress Bar (KHÓA TUA TUYỆT ĐỐI) */}
                  <div className="w-full flex items-center gap-3">
                    <div
                      className="flex-1 h-3 bg-neutral-800 rounded-full overflow-hidden p-0.5 border border-neutral-700/80 relative select-none"
                      title={hasPlayed ? "Tính năng tua audio đã bị khóa trong bài kiểm tra" : "Tiến độ bài nghe"}
                    >
                      <div
                        className="h-full bg-gradient-to-r from-amber-500 to-amber-400 rounded-full transition-all duration-150 ease-linear"
                        style={{ width: `${Math.min(100, (currentTime / (duration || 52)) * 100)}%` }}
                      />
                    </div>
                    {hasPlayed && (
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-400 shrink-0 bg-neutral-800 px-2.5 py-1 rounded-md border border-neutral-700">
                        🔒 Khóa tua
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* LISTENING CONVERSATION BOX WITH DIRECT INLINE INPUTS */}
              <div className="bg-gradient-to-br from-amber-50/50 via-white to-amber-50/30 border-2 border-amber-300 rounded-3xl p-5 sm:p-7 space-y-5 shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-amber-200 pb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">💬</span>
                    <div>
                      <h4 className="font-heading font-black text-sm sm:text-base text-neutral-950 uppercase tracking-wide">
                        Đoạn Đối Thoại Hội Thoại — Điền Từ Trực Tiếp Vào 10 Chỗ Trống
                      </h4>
                      <p className="text-xs text-neutral-600">
                        Gõ từ tiếng Anh bạn nghe được vào ô tương ứng trong từng câu thoại (có thể nhấn phím <strong>Tab</strong> để chuyển nhanh sang chỗ trống tiếp theo):
                      </p>
                    </div>
                  </div>
                  <span className="text-xs font-bold text-amber-900 bg-amber-100 px-3 py-1 rounded-full border border-amber-300 shrink-0">
                    Đã điền: {answeredListeningCount} / 10 từ
                  </span>
                </div>

                {/* 10 Dialogue Lines with Inline Text Input Fields */}
                <div className="space-y-3.5 font-sans text-xs sm:text-sm text-neutral-900 leading-loose">
                  {PLACEMENT_LISTENING_CONVERSATION.map((item) => {
                    const blankIdx = item.blankNum - 1;
                    const parts = item.text.split(`(${item.blankNum}) ________`);
                    const val = userAnswers[blankIdx]?.text || "";

                    return (
                      <div
                        key={item.blankNum}
                        className="p-3.5 sm:p-4 rounded-2xl bg-white border border-neutral-200/90 shadow-xs hover:border-amber-300 transition-all flex flex-col sm:flex-row items-start gap-2.5 sm:gap-3"
                      >
                        <div className="shrink-0 flex items-center gap-1.5 mt-0.5">
                          <span className="font-heading font-black text-xs px-2.5 py-1 bg-neutral-900 text-amber-400 rounded-lg">
                            {item.speakerName}
                          </span>
                        </div>

                        <div className="flex-1 leading-loose text-neutral-900 font-medium">
                          <span>{parts[0]}</span>
                          <span className="inline-flex items-center mx-1.5 align-baseline">
                            <span className="text-xs font-mono font-bold text-amber-900 bg-amber-100 px-2.5 py-1 rounded-l-xl border-y border-l border-amber-300 select-none">
                              ({item.blankNum})
                            </span>
                            <input
                              type="text"
                              id={`blank-input-${item.blankNum}`}
                              placeholder="gõ từ nghe được..."
                              value={val}
                              autoComplete="off"
                              spellCheck="false"
                              autoCorrect="off"
                              autoCapitalize="none"
                              onChange={(e) => handleListeningInputChange(blankIdx, e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter" && item.blankNum < 10) {
                                  const nextInput = document.getElementById(`blank-input-${item.blankNum + 1}`);
                                  if (nextInput) nextInput.focus();
                                }
                              }}
                              className={`w-36 sm:w-48 px-3 py-1 text-xs sm:text-sm font-bold text-neutral-950 bg-white border-y border-r rounded-r-xl outline-hidden transition shadow-xs text-center focus:ring-2 focus:ring-amber-400 ${
                                val.trim()
                                  ? "border-emerald-500 bg-emerald-50/50 text-emerald-950 font-mono"
                                  : "border-amber-400 focus:border-amber-600"
                              }`}
                            />
                          </span>
                          <span>{parts[1]}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Navigation CTA: Proceed to Section 2 Reading */}
                <div className="pt-4 border-t border-amber-200 flex flex-col sm:flex-row items-center justify-between gap-3">
                  <span className="text-xs text-neutral-600 font-medium">
                    * Bạn có thể quay lại sửa các từ nghe bất kỳ lúc nào trước khi nộp bài.
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setActiveSection("reading");
                      setCurrentReadingIndex(10);
                    }}
                    className="w-full sm:w-auto px-6 py-3 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-heading font-black text-xs uppercase tracking-wider rounded-xl shadow-md transition cursor-pointer flex items-center justify-center gap-2"
                  >
                    <span>Chuyển Sang Phần 2: Đọc Hiểu (Câu 11 — 17)</span>
                    <span className="text-base">→</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* =========================================================================
              SECTION 2: READING COMPREHENSION (QUESTIONS 11 — 17: PART 5, 6, 7)
              ========================================================================= */}
          {activeSection === "reading" && (
            <div className="space-y-6">
              {/* Reading Questions Jump Palette (11 to 17) */}
              <div className="p-4 bg-neutral-50 rounded-2xl border border-neutral-200 space-y-2">
                <div className="flex items-center justify-between text-xs text-neutral-700 font-bold">
                  <span>Phần 2: Đọc Hiểu & Ngữ Pháp (Câu 11 — 17):</span>
                  <span className="text-neutral-500 font-normal">
                    {answeredReadingCount}/7 câu đã chọn
                  </span>
                </div>

                <div className="flex flex-wrap gap-2">
                  {MINI_PLACEMENT_TEST_QUESTIONS.slice(10, 17).map((q, qSubIdx) => {
                    const qIdx = 10 + qSubIdx;
                    const isCurrent = qIdx === currentReadingIndex;
                    const isAnswered =
                      userAnswers[qIdx]?.choiceIdx !== null &&
                      userAnswers[qIdx]?.choiceIdx !== undefined;

                    let pillStyle = "bg-white text-neutral-700 border-neutral-300 hover:bg-neutral-100";
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
                        onClick={() => setCurrentReadingIndex(qIdx)}
                        className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl border text-xs font-heading transition-all cursor-pointer flex items-center justify-center ${pillStyle}`}
                        title={`Câu ${q.id} (${q.part})`}
                      >
                        {q.id}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Current Reading Question Card */}
              <div className="border-2 border-neutral-200 rounded-3xl p-5 sm:p-7 space-y-6 bg-white shadow-xs">
                {/* Header: Part badge & Question Number */}
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-neutral-200 pb-3">
                  <div className="flex items-center gap-2">
                    <span className="px-3 py-1 bg-neutral-900 text-white font-heading font-black text-xs uppercase tracking-wider rounded-lg">
                      {currentReadingQ.part}
                    </span>
                    <span className="text-xs font-bold text-amber-700 bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-200">
                      {currentReadingQ.tier}
                    </span>
                  </div>

                  <span className="text-xs text-neutral-600 font-mono font-bold">
                    Câu {currentReadingIndex + 1} / {totalQuestions}
                  </span>
                </div>

                {/* Part 6 & 7: Reading Passage Text */}
                {currentReadingQ.passage && (
                  <div className="p-5 bg-neutral-50 rounded-2xl border border-neutral-300 font-mono text-xs sm:text-sm text-neutral-900 leading-relaxed whitespace-pre-wrap max-h-72 overflow-y-auto">
                    {currentReadingQ.passage}
                  </div>
                )}

                {/* Question Stem */}
                <div className="p-4 bg-neutral-50/80 rounded-2xl border border-neutral-200">
                  <p className="font-heading font-bold text-neutral-950 text-sm sm:text-base leading-relaxed">
                    {currentReadingQ.question}
                  </p>
                </div>

                {/* Multiple-Choice Options */}
                <div className="space-y-3">
                  <div className="text-xs font-bold text-neutral-600 uppercase tracking-wider">
                    Chọn đáp án đúng (A, B, C, D):
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {currentReadingQ.options.map((option, optIdx) => {
                      const letter = String.fromCharCode(65 + optIdx);
                      const isSelected = userAnswers[currentReadingIndex]?.choiceIdx === optIdx;

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
                          onClick={() => handleReadingSelectOption(optIdx)}
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
                </div>

                {/* Previous / Next Controls */}
                <div className="flex items-center justify-between pt-4 border-t border-neutral-200">
                  {currentReadingIndex === 10 ? (
                    <button
                      type="button"
                      onClick={() => setActiveSection("listening")}
                      className="px-5 py-2.5 bg-neutral-100 hover:bg-neutral-200 text-neutral-800 font-heading font-bold text-xs uppercase tracking-wider rounded-xl transition cursor-pointer"
                    >
                      ← Về Phần 1: Nghe Điền Từ
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setCurrentReadingIndex((prev) => Math.max(10, prev - 1))}
                      className="px-5 py-2.5 bg-neutral-100 hover:bg-neutral-200 text-neutral-800 font-heading font-bold text-xs uppercase tracking-wider rounded-xl transition cursor-pointer"
                    >
                      ← Câu Trước
                    </button>
                  )}

                  {currentReadingIndex < totalQuestions - 1 ? (
                    <button
                      type="button"
                      onClick={() => setCurrentReadingIndex((prev) => Math.min(totalQuestions - 1, prev + 1))}
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
                Bạn đã hoàn thành <strong>{totalAnsweredCount}</strong> / {totalQuestions} câu hỏi.
                {totalAnsweredCount < totalQuestions && (
                  <span className="block mt-1 text-rose-700 font-bold text-xs">
                    ⚠️ Còn {totalQuestions - totalAnsweredCount} câu chưa điền hoặc chưa chọn đáp án. Các câu chưa làm sẽ tính là 0 điểm.
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
              <span>✓</span> Hoàn Thành TOEIC Mini Placement Test
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
                Tổng Điểm Đạt Được
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

          {/* Download Word DOCX Transcript CTA */}
          <div className="max-w-2xl mx-auto p-4 bg-sky-50 border-2 border-sky-200 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-3 text-left">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-sky-600 text-white flex items-center justify-center font-bold text-xl shrink-0">
                📄
              </div>
              <div>
                <h5 className="font-heading font-black text-xs sm:text-sm text-sky-950">
                  Tải Bản Word Transcript & Đáp Án Giải Thích Chi Tiết
                </h5>
                <p className="text-[11px] text-sky-800">
                  Bao gồm đoạn hội thoại song ngữ Part 3 điền từ, đáp án 10 từ vựng và giải thích Part 5 - 7 (.docx)
                </p>
              </div>
            </div>
            <a
              href={getAssetUrl("/TOEIC_Placement_Test_Listening_Transcript.docx")}
              download="TOEIC_Placement_Test_Listening_Transcript.docx"
              className="px-4 py-2.5 bg-sky-600 hover:bg-sky-700 text-white font-heading font-black text-xs uppercase tracking-wider rounded-xl shadow-xs transition whitespace-nowrap"
            >
              Tải File Word ↓
            </a>
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
                            Bạn điền:{" "}
                            <strong className={r.isCorrect ? "text-emerald-700" : "text-rose-700"}>
                              {r.userChoice}
                            </strong>
                          </span>
                          <span>•</span>
                          <span className="text-neutral-900">
                            Đáp án: <strong className="text-sky-700">{r.correctChoice}</strong>
                          </span>
                        </div>
                      </div>

                      <p className="text-xs sm:text-sm font-semibold text-neutral-900">
                        {r.question}
                      </p>

                      {/* Cloze Vocabulary Meaning */}
                      {r.targetWord && r.meaning && (
                        <div className="p-3 bg-white/90 rounded-xl border border-neutral-200 text-xs text-neutral-800 space-y-1">
                          <span className="font-bold text-sky-800 block">
                            🔑 Từ vựng cốt lõi & Dịch nghĩa:
                          </span>
                          <p className="text-neutral-700 font-medium">
                            <strong>{r.targetWord}</strong>: {r.meaning}
                          </p>
                        </div>
                      )}

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

          {/* Disclaimer Reference Footnote */}
          <div className="p-4 bg-amber-50/80 border border-amber-200/90 rounded-2xl text-center text-xs text-amber-900 font-medium max-w-2xl mx-auto leading-relaxed">
            ℹ️ <strong>Lưu ý:</strong> Bài kiểm tra này chỉ mang tính chất tham khảo và đánh giá năng lực sơ bộ, không phải format bài thi tiêu chuẩn.
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
                setActiveSection("listening");
                setCurrentReadingIndex(10);
                setUserAnswers(Array.from({ length: totalQuestions }, () => ({ choiceIdx: null, text: "" })));
                setTimeLeft(600);
                setHasPlayed(false);
              }}
              className="py-4 px-5 border border-neutral-300 text-neutral-800 hover:bg-neutral-100 font-bold text-xs rounded-xl transition cursor-pointer"
            >
              Làm lại bài test
            </button>
          </div>
        </div>
      )}

      {/* Privacy Policy Modal */}
      <PrivacyPolicyModal
        isOpen={showPrivacyModal}
        onClose={() => setShowPrivacyModal(false)}
      />
    </div>
  );
};

export default MiniPlacementTest;
