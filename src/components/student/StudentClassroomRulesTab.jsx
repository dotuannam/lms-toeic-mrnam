import React from "react";
import { useSettings } from "../../context/SettingsContext";
import { DEFAULT_CLASSROOM_RULES } from "../../services/settingsService";

export const StudentClassroomRulesTab = () => {
  const { classroomRules, centerConfig } = useSettings();
  const rulesData = classroomRules || DEFAULT_CLASSROOM_RULES;

  const getSectionIcon = (icon) => {
    switch (icon) {
      case "calendar":
        return "📅";
      case "assignment":
        return "📝";
      case "verified":
        return "🛡️";
      case "policy":
        return "💳";
      default:
        return "📜";
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* 1. Header Banner */}
      <div className="bg-gradient-to-r from-[#1e2738] via-[#243046] to-[#1e2738] text-white p-6 sm:p-8 rounded-2xl shadow-lg border border-[#00b4d8]/30 relative overflow-hidden">
        <div className="absolute -right-10 -bottom-10 w-48 h-48 bg-[#00b4d8]/10 rounded-full blur-2xl pointer-events-none"></div>

        <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full bg-[#00b4d8]/20 border border-[#00b4d8]/40 text-[#00b4d8] text-[11px] font-heading font-bold uppercase tracking-wider">
                Nội quy trung tâm
              </span>
              <span className="text-slate-400 text-xs">
                Cập nhật: {rulesData.lastUpdated || "2026-10-29"}
              </span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-heading font-black tracking-tight text-white">
              {rulesData.title || "Quy Định & Nội Quy Lớp Học"}
            </h2>
            <p className="text-sm text-slate-300 max-w-2xl leading-relaxed">
              {rulesData.subtitle ||
                "Vui lòng đọc kỹ và thực hiện nghiêm túc các quy định dưới đây để đảm bảo quyền lợi học tập và chất lượng cam kết chuẩn đầu ra của bạn."}
            </p>
          </div>

          <button
            onClick={() => window.print()}
            className="shrink-0 px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-heading font-bold uppercase tracking-wider border border-white/20 transition flex items-center gap-2 cursor-pointer"
          >
            <span>🖨️</span>
            <span>In quy định</span>
          </button>
        </div>
      </div>

      {/* 2. Rules List Accordion / Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {(rulesData.sections || []).map((sec, idx) => (
          <div
            key={sec.id || idx}
            className="bg-white dark:bg-[#1a2234] rounded-2xl p-6 shadow-sm border border-slate-200/80 dark:border-slate-800 space-y-4 hover:shadow-md transition-shadow"
          >
            <div className="flex items-center gap-3 border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-xl shrink-0">
                {getSectionIcon(sec.icon)}
              </div>
              <div>
                <h3 className="font-heading font-bold text-slate-900 dark:text-white text-base">
                  {sec.title}
                </h3>
                <span className="text-[11px] text-slate-400 font-mono">
                  {sec.rules ? `${sec.rules.length} điều khoản` : ""}
                </span>
              </div>
            </div>

            <ul className="space-y-3">
              {(sec.rules || []).map((rule, rIdx) => (
                <li
                  key={rIdx}
                  className="flex items-start gap-3 text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed"
                >
                  <span className="w-5 h-5 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 flex items-center justify-center text-xs shrink-0 font-bold mt-0.5">
                    ✓
                  </span>
                  <span>{rule}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      {/* 3. Support & Hotline Footer */}
      <div className="p-5 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-800/40 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="text-2xl">💡</span>
          <div className="text-xs text-amber-900 dark:text-amber-300 space-y-0.5">
            <p className="font-bold font-heading">
              Cần hỗ trợ về lịch học bù, bảo lưu hoặc thắc mắc bài tập?
            </p>
            <p className="text-amber-800 dark:text-amber-400">
              Liên hệ trực tiếp với Thầy Đỗ Tuấn Nam hoặc bộ phận học vụ để được giải đáp nhanh nhất.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <a
            href={`tel:${(centerConfig?.hotline || "077 345 2809").replace(/\s+/g, "")}`}
            className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-heading font-bold text-xs uppercase tracking-wider rounded-xl shadow-xs transition"
          >
            📞 Hotline: {centerConfig?.hotline || "077 345 2809"}
          </a>
        </div>
      </div>
    </div>
  );
};

export default StudentClassroomRulesTab;
