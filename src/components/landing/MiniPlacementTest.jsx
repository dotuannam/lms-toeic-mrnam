import React, { useState } from "react";
import {
  MINI_PLACEMENT_TEST_QUESTIONS,
  getPlacementScoreEvaluation,
} from "../../data/portfolioData";

export const MiniPlacementTest = ({ onSelectConsultation, className = "" }) => {
  const [hasStarted, setHasStarted] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState(null);
  const [isAnswerChecked, setIsAnswerChecked] = useState(false);
  const [score, setScore] = useState(0);
  const [isCompleted, setIsCompleted] = useState(false);
  const [userAnswers, setUserAnswers] = useState([]);

  const currentQ = MINI_PLACEMENT_TEST_QUESTIONS[currentIndex];
  const totalQuestions = MINI_PLACEMENT_TEST_QUESTIONS.length;

  const handleStart = () => {
    setHasStarted(true);
    setCurrentIndex(0);
    setSelectedOption(null);
    setIsAnswerChecked(false);
    setScore(0);
    setIsCompleted(false);
    setUserAnswers([]);
  };

  const handleSelectOption = (idx) => {
    if (isAnswerChecked) return;
    setSelectedOption(idx);
  };

  const handleCheckAnswer = () => {
    if (selectedOption === null) return;
    setIsAnswerChecked(true);
    const isCorrect = selectedOption === currentQ.answer;
    if (isCorrect) {
      setScore((prev) => prev + 1);
    }
    setUserAnswers((prev) => [
      ...prev,
      {
        questionId: currentQ.id,
        selected: selectedOption,
        correct: currentQ.answer,
        isCorrect,
      },
    ]);
  };

  const handleNext = () => {
    if (currentIndex < totalQuestions - 1) {
      setCurrentIndex((prev) => prev + 1);
      setSelectedOption(null);
      setIsAnswerChecked(false);
    } else {
      setIsCompleted(true);
    }
  };

  const evaluation = getPlacementScoreEvaluation(score);

  return (
    <div
      className={`bg-white rounded-3xl shadow-xl border border-neutral-200/90 p-6 md:p-8 transition-all ${className}`}
    >
      {/* 1. INITIAL STATE */}
      {!hasStarted && !isCompleted && (
        <div className="text-center space-y-6 py-4">
          <div className="w-16 h-16 mx-auto bg-amber-100 border border-amber-300 rounded-2xl flex items-center justify-center text-3xl shadow-xs">
            📝
          </div>

          <div className="space-y-2 max-w-lg mx-auto">
            <span className="inline-block px-3 py-1 bg-amber-100 text-amber-900 font-extrabold text-xs uppercase tracking-wider rounded-full border border-amber-300">
              Thử thách đầu vào 3 phút
            </span>
            <h3 className="text-2xl sm:text-3xl font-heading font-black text-neutral-950 tracking-tight">
              TOEIC Mini Placement Challenge
            </h3>
            <p className="text-sm text-neutral-700 font-medium leading-relaxed">
              Hoàn thành nhanh 5 câu hỏi chọn lọc chuẩn đề thi thật ETS để hệ thống ước tính trình độ hiện tại và gợi ý lộ trình bứt phá điểm số tối ưu nhất cho bạn!
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 max-w-lg mx-auto text-left text-xs text-neutral-800 font-semibold">
            <div className="p-3 bg-neutral-50 rounded-xl border border-neutral-200 flex items-center gap-2.5">
              <span className="text-lg text-emerald-600 font-bold">✓</span>
              <span>5 câu trắc nghiệm cốt lõi</span>
            </div>
            <div className="p-3 bg-neutral-50 rounded-xl border border-neutral-200 flex items-center gap-2.5">
              <span className="text-lg text-sky-600 font-bold">✓</span>
              <span>Giải thích ngữ pháp chi tiết</span>
            </div>
            <div className="p-3 bg-neutral-50 rounded-xl border border-neutral-200 flex items-center gap-2.5">
              <span className="text-lg text-amber-600 font-bold">✓</span>
              <span>Định vị lộ trình cá nhân hóa</span>
            </div>
          </div>

          <div>
            <button
              onClick={handleStart}
              className="inline-flex items-center gap-2.5 px-8 py-3.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-heading font-black text-sm uppercase tracking-wider rounded-xl shadow-lg hover:shadow-amber-500/25 transition-all transform hover:-translate-y-0.5 cursor-pointer"
            >
              <span>Bắt Đầu Làm 5 Câu Test Ngay</span>
              <span className="text-lg font-bold">→</span>
            </button>
          </div>
        </div>
      )}

      {/* 2. QUIZ QUESTIONS IN PROGRESS */}
      {hasStarted && !isCompleted && (
        <div className="space-y-6">
          {/* Header & Progress Bar */}
          <div className="space-y-2 border-b border-neutral-200 pb-4">
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <span className="font-heading font-black text-amber-800 uppercase tracking-wider">
                  Câu hỏi {currentIndex + 1} / {totalQuestions}
                </span>
                <span className="text-neutral-400">•</span>
                <span className="text-neutral-700 font-bold">Đúng: {score} câu</span>
              </div>
              <button
                onClick={handleStart}
                className="text-neutral-600 hover:text-neutral-900 font-semibold text-xs transition cursor-pointer hover:underline"
              >
                Làm lại từ đầu
              </button>
            </div>

            {/* Visual progress bar */}
            <div className="w-full bg-neutral-100 h-2.5 rounded-full overflow-hidden border border-neutral-200">
              <div
                className="bg-amber-500 h-full transition-all duration-300 rounded-full"
                style={{ width: `${((currentIndex + 1) / totalQuestions) * 100}%` }}
              ></div>
            </div>
          </div>

          {/* Question Text */}
          <div className="p-5 bg-neutral-50 rounded-2xl border border-neutral-200">
            <p className="font-heading font-bold text-neutral-950 text-sm sm:text-base leading-relaxed">
              {currentQ.question}
            </p>
          </div>

          {/* 4 Options */}
          <div className="space-y-2.5">
            {currentQ.options.map((option, optIdx) => {
              const letter = String.fromCharCode(65 + optIdx);
              const isSelected = selectedOption === optIdx;

              let optionStyle =
                "bg-white border-2 border-neutral-200 text-neutral-900 font-semibold hover:border-amber-500 hover:bg-amber-50/30";

              if (isSelected && !isAnswerChecked) {
                optionStyle =
                  "bg-amber-50 border-2 border-amber-500 text-amber-950 font-bold shadow-xs";
              }

              if (isAnswerChecked) {
                if (optIdx === currentQ.answer) {
                  optionStyle =
                    "bg-emerald-50 border-2 border-emerald-600 text-emerald-950 font-bold shadow-xs";
                } else if (isSelected) {
                  optionStyle =
                    "bg-rose-50 border-2 border-rose-500 text-rose-950 font-bold shadow-xs";
                } else {
                  optionStyle =
                    "opacity-60 bg-neutral-50 border-2 border-neutral-200 text-neutral-600 font-medium";
                }
              }

              return (
                <button
                  key={optIdx}
                  type="button"
                  disabled={isAnswerChecked}
                  onClick={() => handleSelectOption(optIdx)}
                  className={`w-full text-left p-4 rounded-xl border text-sm transition-all flex items-center justify-between cursor-pointer ${optionStyle}`}
                >
                  <div className="flex items-center gap-3">
                    <span
                      className={`w-7 h-7 rounded-lg flex items-center justify-center font-mono font-bold text-xs ${
                        isAnswerChecked && optIdx === currentQ.answer
                          ? "bg-emerald-600 text-white"
                          : isAnswerChecked && isSelected
                          ? "bg-rose-600 text-white"
                          : isSelected
                          ? "bg-amber-500 text-slate-950"
                          : "bg-neutral-200 text-neutral-800"
                      }`}
                    >
                      {letter}
                    </span>
                    <span className="font-medium text-neutral-900">{option}</span>
                  </div>

                  {isAnswerChecked && optIdx === currentQ.answer && (
                    <span className="text-emerald-700 font-bold text-xs flex items-center gap-1 shrink-0 ml-2">
                      ✓ Đáp án đúng
                    </span>
                  )}
                  {isAnswerChecked && isSelected && optIdx !== currentQ.answer && (
                    <span className="text-rose-700 font-bold text-xs flex items-center gap-1 shrink-0 ml-2">
                      ✗ Chưa chính xác
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Explanation Box */}
          {isAnswerChecked && (
            <div className="p-4 rounded-xl bg-amber-50 border-l-4 border-amber-500 text-xs text-neutral-900 space-y-1.5 animate-fadeIn">
              <span className="font-bold text-amber-900 uppercase tracking-wider block">
                💡 Giải thích chi tiết từ Thầy Đỗ Tuấn Nam:
              </span>
              <p className="leading-relaxed font-medium text-neutral-800">{currentQ.explanation}</p>
            </div>
          )}

          {/* Action Button */}
          <div className="pt-2 flex justify-end">
            {!isAnswerChecked ? (
              <button
                type="button"
                disabled={selectedOption === null}
                onClick={handleCheckAnswer}
                className="w-full sm:w-auto px-6 py-3 bg-neutral-950 text-white font-heading font-bold text-xs uppercase tracking-wider rounded-xl hover:bg-neutral-800 disabled:opacity-40 transition cursor-pointer shadow-md"
              >
                Kiểm Tra Đáp Án
              </button>
            ) : (
              <button
                type="button"
                onClick={handleNext}
                className="w-full sm:w-auto px-6 py-3 bg-amber-500 hover:bg-amber-600 text-slate-950 font-heading font-black text-xs uppercase tracking-wider rounded-xl shadow-md transition cursor-pointer"
              >
                {currentIndex === totalQuestions - 1
                  ? "Xem Kết Quả & Phân Tích Lộ Trình →"
                  : "Câu Tiếp Theo →"}
              </button>
            )}
          </div>
        </div>
      )}

      {/* 3. COMPLETED RESULTS STATE */}
      {isCompleted && (
        <div className="space-y-6 animate-fadeIn">
          {/* Header Badge */}
          <div className="text-center space-y-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-100 text-emerald-900 font-bold text-xs uppercase tracking-wider rounded-full border border-emerald-300">
              <span>✓</span> Hoàn Thành Mini Placement Test
            </span>
            <h3 className="text-2xl font-heading font-black text-neutral-950">
              Kết Quả Đánh Giá Năng Lực
            </h3>
          </div>

          {/* Score & Evaluation Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-5 bg-neutral-50 rounded-2xl border border-neutral-200 text-center space-y-1">
              <span className="text-xs uppercase tracking-wider font-extrabold text-neutral-700">
                Điểm Trắc Nghiệm
              </span>
              <div className="text-4xl font-heading font-black text-amber-600">
                {score} <span className="text-lg text-neutral-500">/ {totalQuestions}</span>
              </div>
              <p className="text-xs text-neutral-700 font-medium">
                Độ chính xác: {Math.round((score / totalQuestions) * 100)}%
              </p>
            </div>

            <div className={`p-5 rounded-2xl border-2 ${evaluation.color} space-y-1 text-center shadow-xs`}>
              <span className="text-xs uppercase tracking-wider font-extrabold text-neutral-700">
                Trình Độ Ước Tính
              </span>
              <div className="text-2xl font-heading font-black text-neutral-950">
                {evaluation.range}
              </div>
              <span className="text-xs font-bold block text-neutral-800">
                Khuyến nghị: {evaluation.recommendedCourse.split("(")[0]}
              </span>
            </div>
          </div>

          {/* Teacher Recommendation Analysis */}
          <div className="p-4 bg-amber-50 rounded-2xl border border-amber-200 text-xs space-y-2">
            <div className="flex items-center gap-2 text-amber-950 font-bold font-heading">
              <span>🎯</span>
              <span className="uppercase tracking-wider">Phân tích lộ trình từ Thầy Đỗ Tuấn Nam:</span>
            </div>
            <p className="text-neutral-800 font-medium leading-relaxed">
              {evaluation.desc}
            </p>
            <p className="text-neutral-600 italic pt-1 border-t border-amber-200/60 font-medium">
              * Kết quả này sẽ được tự động đính kèm khi bạn gửi form đăng ký tư vấn để Thầy Nam nắm bắt được năng lực của bạn ngay từ đầu.
            </p>
          </div>

          {/* Action CTAs */}
          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <button
              onClick={() => {
                if (onSelectConsultation) {
                  onSelectConsultation({
                    quizScore: score,
                    quizMaxScore: totalQuestions,
                    quizLevel: evaluation.range,
                    recommendedCourse: evaluation.recommendedCourse,
                  });
                }
              }}
              className="flex-1 py-3.5 px-6 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-heading font-black text-xs uppercase tracking-wider rounded-xl shadow-lg transition text-center cursor-pointer"
            >
              Đăng Ký Tư Vấn Theo Trình Độ Này →
            </button>
            <button
              onClick={handleStart}
              className="py-3.5 px-5 border border-neutral-300 text-neutral-800 hover:bg-neutral-100 font-bold text-xs rounded-xl transition cursor-pointer"
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
