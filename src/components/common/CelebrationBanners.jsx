import React, { useState } from "react";
import { useLanguage } from "../../context/LanguageContext";
import {
  getTodayHoliday,
  checkIsStudentBirthday,
  checkCourseEndReminder,
} from "../../utils/holidayUtils";

export const CelebrationBanners = ({
  studentName = "",
  studentDob = "",
  activeClass = null,
  centerName = "Clever Course LMS",
}) => {
  const { lang } = useLanguage();
  const isVi = lang === "vi";

  const [dismissedBanners, setDismissedBanners] = useState({});

  const dismiss = (id) => {
    setDismissedBanners((prev) => ({ ...prev, [id]: true }));
  };

  const isBirthday = checkIsStudentBirthday(studentDob);
  const holiday = getTodayHoliday();
  const courseReminder = activeClass ? checkCourseEndReminder(activeClass.endDate, new Date(), 7) : null;

  return (
    <div className="space-y-3.5 mb-6">
      {/* 1. STUDENT BIRTHDAY CELEBRATION BANNER */}
      {isBirthday && !dismissedBanners["birthday"] && (
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-amber-500 via-rose-500 to-pink-600 text-white p-5 sm:p-6 shadow-xl border border-white/20 animate-fade-in">
          {/* Decorative floating balloons / sparkles */}
          <div className="absolute top-0 right-0 translate-x-8 -translate-y-8 w-44 h-44 rounded-full bg-white/15 blur-2xl pointer-events-none" />
          <div className="absolute bottom-0 right-16 translate-y-6 w-32 h-32 rounded-full bg-amber-300/20 blur-xl pointer-events-none" />

          <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-start sm:items-center gap-3.5">
              <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center text-2xl sm:text-3xl shrink-0 shadow-inner border border-white/30 animate-bounce">
                🎂
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-heading font-black uppercase tracking-wider bg-white text-rose-600 shadow-sm">
                    {isVi ? "Sinh nhật của bạn" : "Birthday Celebration"}
                  </span>
                  <span className="text-xs font-semibold text-amber-100">🎉 Happy Birthday!</span>
                </div>
                <h3 className="text-base sm:text-xl font-heading font-black text-white tracking-tight">
                  {isVi
                    ? `Chúc mừng sinh nhật, ${studentName || "bạn học viên"}! 🎈✨`
                    : `Happy Birthday, ${studentName || "Learner"}! 🎈✨`}
                </h3>
                <p className="text-xs sm:text-sm text-rose-50 leading-relaxed max-w-2xl">
                  {isVi
                    ? `${centerName} thân gửi lời chúc mừng sinh nhật ấm áp nhất đến bạn! Chúc bạn tuổi mới ngập tràn niềm vui, nhiều sức khỏe và đạt kết quả học tập xuất sắc! 🎁💖`
                    : `${centerName} sends you the warmest birthday greetings! Wishing you immense joy, vibrant health, and brilliant academic accomplishments! 🎁💖`}
                </p>
              </div>
            </div>

            <button
              onClick={() => dismiss("birthday")}
              className="self-end sm:self-center px-3 py-1.5 rounded-xl bg-white/20 hover:bg-white/30 text-white text-xs font-semibold backdrop-blur-sm transition active:scale-95 shrink-0"
              title="Đóng thông báo"
            >
              ✕ {isVi ? "Đóng" : "Dismiss"}
            </button>
          </div>
        </div>
      )}

      {/* 2. COURSE END REMINDER BANNER (1 WEEK NOTICE) */}
      {courseReminder && !dismissedBanners["course_end"] && (
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-amber-600 via-orange-500 to-amber-700 text-white p-4 sm:p-5 shadow-lg border border-amber-300/30 animate-fade-in">
          <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3.5">
            <div className="flex items-start sm:items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center text-2xl shrink-0 shadow-inner border border-white/25">
                ⏳
              </div>
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded-md text-[10px] font-heading font-bold uppercase tracking-wider bg-black/25 text-amber-100">
                    {isVi ? "Nhắc nhở khóa học" : "Course Reminder"}
                  </span>
                  <span className="text-xs font-bold text-amber-200">
                    {courseReminder.daysRemaining === 0
                      ? isVi ? "Hôm nay là buổi cuối!" : "Today is the final day!"
                      : isVi
                      ? `Còn ${courseReminder.daysRemaining} ngày nữa`
                      : `${courseReminder.daysRemaining} days remaining`}
                  </span>
                </div>
                <h4 className="text-sm sm:text-base font-heading font-extrabold text-white">
                  {isVi
                    ? `Khóa học "${activeClass.name || activeClass.code}" sẽ kết thúc vào ngày ${courseReminder.endDateFormatted}`
                    : `Course "${activeClass.name || activeClass.code}" ends on ${courseReminder.endDateFormatted}`}
                </h4>
                <p className="text-xs text-amber-100 leading-relaxed max-w-2xl">
                  {isVi
                    ? "Hãy rà soát lại các bài tập, kiểm tra điểm số và chuẩn bị sẵn sàng cho bài thi đánh giá cuối khóa nhé!"
                    : "Make sure to review remaining assignments, check your grades, and get ready for your final assessment!"}
                </p>
              </div>
            </div>

            <button
              onClick={() => dismiss("course_end")}
              className="self-end sm:self-center px-3 py-1.5 rounded-xl bg-white/20 hover:bg-white/30 text-white text-xs font-semibold backdrop-blur-sm transition active:scale-95 shrink-0"
            >
              ✕ {isVi ? "Đã hiểu" : "Got it"}
            </button>
          </div>
        </div>
      )}

      {/* 3. PUBLIC HOLIDAY CELEBRATION BANNER */}
      {holiday && !dismissedBanners["holiday"] && (
        <div
          className={`relative overflow-hidden rounded-2xl bg-gradient-to-r ${holiday.gradient} text-white p-4 sm:p-5 shadow-lg border border-white/20 animate-fade-in`}
        >
          <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3.5">
            <div className="flex items-start sm:items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center text-2xl shrink-0 shadow-inner border border-white/25">
                {holiday.icon}
              </div>
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded-md text-[10px] font-heading font-bold uppercase tracking-wider bg-white/20 text-white">
                    {isVi ? "Kỳ nghỉ lễ" : "Public Holiday"}
                  </span>
                  <span className="text-xs font-medium text-white/90">{holiday.dateStr}</span>
                </div>
                <h4 className="text-sm sm:text-base font-heading font-extrabold text-white">
                  {isVi ? holiday.titleVi : holiday.titleEn}
                </h4>
                <p className="text-xs text-white/90 leading-relaxed max-w-2xl">
                  {isVi ? holiday.messageVi : holiday.messageEn}
                </p>
              </div>
            </div>

            <button
              onClick={() => dismiss("holiday")}
              className="self-end sm:self-center px-3 py-1.5 rounded-xl bg-white/20 hover:bg-white/30 text-white text-xs font-semibold backdrop-blur-sm transition active:scale-95 shrink-0"
            >
              ✕ {isVi ? "Đóng" : "Dismiss"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default CelebrationBanners;
