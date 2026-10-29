import React, { useState, useEffect, useMemo } from "react";
import { useLanguage } from "../../context/LanguageContext";
import { syncStudentClassroomGrades, getStudentClassroomGrades } from "../../services/scoreService";

export const StudentClassroomGradesTab = ({
  student,
  activeClass,
  enrolledClasses = [],
  onSelectClass,
}) => {
  const { t, lang } = useLanguage();
  const isVi = lang === "vi";

  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [grades, setGrades] = useState([]);
  const [lastSynced, setLastSynced] = useState(null);
  const [activeFilter, setActiveFilter] = useState("all"); // "all" | "graded" | "turned_in" | "assigned"
  const [searchQuery, setSearchQuery] = useState("");
  const [syncMessage, setSyncMessage] = useState(null);

  const studentEmail = (student?.email || "").toLowerCase().trim();
  const studentId = student?.studentId || "";
  const classId = activeClass?.classId || "";

  // Extract Classroom courseId or alternateLink
  const classroomLink = activeClass?.integrations?.googleClassroom?.alternateLink || "";
  const rawCourseId =
    activeClass?.integrations?.googleClassroom?.courseId ||
    (classroomLink.match(/\/c\/([a-zA-Z0-9_-]+)/)?.[1]) ||
    "";

  // 1. Initial Load cached grades from Firestore
  useEffect(() => {
    let isMounted = true;
    const loadCachedGrades = async () => {
      if (!studentId) return;
      setLoading(true);
      try {
        const cached = await getStudentClassroomGrades({ studentId, classId });
        if (isMounted) {
          setGrades(cached);
          if (cached.length > 0 && cached[0].syncedAt) {
            setLastSynced(cached[0].syncedAt);
          }
        }
      } catch (err) {
        console.warn("Could not load cached classroom grades:", err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    loadCachedGrades();
    return () => {
      isMounted = false;
    };
  }, [studentId, classId]);

  // 2. Sync from Google Classroom
  const handleSyncClassroomGrades = async () => {
    setSyncing(true);
    setSyncMessage(null);

    try {
      const res = await syncStudentClassroomGrades({
        studentId,
        studentEmail,
        classId,
        courseId: rawCourseId || (activeClass?.code || "COURSE"),
      });

      if (res && Array.isArray(res.grades)) {
        setGrades(res.grades);
        setLastSynced(new Date().toISOString());
        setSyncMessage({
          type: "success",
          text: isVi
            ? `Đã kéo thành công ${res.grades.length} bài tập/bài thi từ Google Classroom!`
            : `Successfully pulled ${res.grades.length} coursework items from Google Classroom!`,
        });
      } else {
        setSyncMessage({
          type: "info",
          text: isVi
            ? "Không tìm thấy bài tập hoặc bài thi mới trên Google Classroom."
            : "No coursework found on Google Classroom.",
        });
      }
    } catch (err) {
      console.error("Failed to sync grades from Classroom:", err);
      setSyncMessage({
        type: "error",
        text: isVi
          ? `Lỗi khi kết nối Google Classroom: ${err.message}`
          : `Classroom sync failed: ${err.message}`,
      });
    } finally {
      setSyncing(false);
      setTimeout(() => setSyncMessage(null), 6000);
    }
  };

  // 3. Filtered coursework
  const filteredGrades = useMemo(() => {
    return grades.filter((item) => {
      const titleMatch = (item.title || "").toLowerCase().includes(searchQuery.toLowerCase());
      if (!titleMatch) return false;

      const isGraded = item.grade !== null && typeof item.grade !== "undefined";
      const isTurnedIn = item.state === "TURNED_IN" || item.state === "RETURNED";

      if (activeFilter === "graded") return isGraded;
      if (activeFilter === "turned_in") return isTurnedIn && !isGraded;
      if (activeFilter === "assigned") return !isTurnedIn && !isGraded;
      return true;
    });
  }, [grades, activeFilter, searchQuery]);

  // 4. Statistics
  const stats = useMemo(() => {
    const total = grades.length;
    const gradedList = grades.filter((g) => g.grade !== null && typeof g.grade !== "undefined");
    const gradedCount = gradedList.length;

    let totalPoints = 0;
    let totalMax = 0;
    gradedList.forEach((g) => {
      totalPoints += Number(g.grade) || 0;
      totalMax += Number(g.maxPoints) || 100;
    });

    const averagePercentage = totalMax > 0 ? Math.round((totalPoints / totalMax) * 100) : 0;
    const onTimeCount = grades.filter((g) => !g.late && (g.state === "TURNED_IN" || g.state === "RETURNED")).length;
    const completionRate = total > 0 ? Math.round(((gradedCount + grades.filter((g) => g.state === "TURNED_IN" && g.grade === null).length) / total) * 100) : 0;

    return {
      total,
      gradedCount,
      averagePercentage,
      onTimeCount,
      completionRate,
    };
  }, [grades]);

  const formatDate = (isoString) => {
    if (!isoString) return "--";
    try {
      const d = new Date(isoString);
      return d.toLocaleDateString(isVi ? "vi-VN" : "en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return isoString;
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. HERO BANNER: GOOGLE CLASSROOM SYNC HEADER */}
      <div className="bg-gradient-to-r from-[#1c1610] via-[#261e16] to-[#1c1610] rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden border border-slate-700/60">
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 bg-[#c27803]/10 rounded-full blur-2xl pointer-events-none"></div>

        <div className="relative z-10 space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1.5">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md text-xs font-semibold text-[#f59e0b] border border-white/10">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                <span>Google Classroom Live Sync</span>
                <span>&bull;</span>
                <span className="font-mono">{activeClass?.code || "COURSE"}</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-heading font-black tracking-wide uppercase text-white">
                {isVi ? "Điểm Bài Tập & Kiểm Tra Classroom" : "Google Classroom Grades & Tests"}
              </h1>
              <p className="text-xs sm:text-sm text-slate-300 max-w-2xl font-medium">
                {isVi
                  ? "Tự động đồng bộ các bài tập, câu hỏi và bài thi trực tiếp từ lớp học Google Classroom. Theo dõi điểm số, nhận xét và hạn nộp bài tập thời gian thực."
                  : "Real-time synchronization of assignments, quizzes, and tests from your Google Classroom course. Monitor scores, feedback, and submission deadlines."}
              </p>
            </div>

            {/* Class Selector if enrolled in multiple classes */}
            {enrolledClasses.length > 1 && (
              <div className="bg-white/10 backdrop-blur-md p-2 rounded-2xl border border-white/10 self-start md:self-auto">
                <span className="block text-[11px] font-semibold text-blue-200 px-2 mb-1">
                  {t("switchClass")}
                </span>
                <select
                  value={activeClass?.classId || ""}
                  onChange={(e) => onSelectClass && onSelectClass(e.target.value)}
                  className="bg-slate-900/80 text-white text-xs font-semibold rounded-xl px-3 py-2 border border-white/20 focus:outline-none"
                >
                  {enrolledClasses.map((cls) => (
                    <option key={cls.classId} value={cls.classId}>
                      {cls.code || cls.className} - {cls.name || cls.className}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Action Row & Sync Status */}
          <div className="pt-3 border-t border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-emerald-500/20 text-emerald-200 border border-emerald-400/30 font-medium">
                <span>🛡️</span>
                <span>Học viên: <strong className="font-mono text-white">{studentEmail || student?.studentId}</strong></span>
              </span>
              {lastSynced && (
                <span className="text-[11px] text-slate-400">
                  {isVi ? "Đồng bộ gần nhất:" : "Last synced:"} {formatDate(lastSynced)}
                </span>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={handleSyncClassroomGrades}
                disabled={syncing}
                className="inline-flex items-center gap-2 px-4 py-2 bg-[#c27803] hover:bg-[#92400e] text-white rounded-xl text-xs font-heading font-bold uppercase tracking-wider transition shadow-md shadow-[#c27803]/25 disabled:opacity-60 active:translate-y-px cursor-pointer"
              >
                <span className={syncing ? "animate-spin" : ""}>🔄</span>
                <span>{syncing ? (isVi ? "Đang kéo điểm..." : "Syncing Grades...") : (isVi ? "Kéo Điểm Từ Classroom" : "Sync From Classroom")}</span>
              </button>

              {classroomLink && (
                <a
                  href={classroomLink}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold border border-white/15 transition backdrop-blur-md"
                >
                  <span>↗</span>
                  <span>{isVi ? "Mở Google Classroom" : "Open Classroom"}</span>
                </a>
              )}
            </div>
          </div>

          {/* Feedback notification toast */}
          {syncMessage && (
            <div
              className={`p-3 rounded-xl text-xs flex items-center gap-2 border animate-fadeIn ${
                syncMessage.type === "success"
                  ? "bg-emerald-500/20 border-emerald-400/40 text-emerald-200"
                  : syncMessage.type === "error"
                  ? "bg-rose-500/20 border-rose-400/40 text-rose-200"
                  : "bg-blue-500/20 border-blue-400/40 text-blue-200"
              }`}
            >
              <span>{syncMessage.type === "success" ? "✓" : "ℹ️"}</span>
              <span className="font-medium">{syncMessage.text}</span>
            </div>
          )}
        </div>
      </div>

      {/* 2. 4 CLEVER COURSE LMS STAT CARDS */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Coursework */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-2xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-heading font-bold text-slate-500 uppercase tracking-wider">
              {isVi ? "Tổng số bài tập" : "Total Coursework"}
            </span>
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center text-sm font-bold">
              📚
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-heading font-black text-slate-900">{stats.total}</span>
            <span className="text-xs text-slate-400">{isVi ? "bài" : "tasks"}</span>
          </div>
          <p className="text-[11px] text-slate-400">
            {isVi ? "Bài tập & kiểm tra trên lớp" : "Assignments & quizzes"}
          </p>
        </div>

        {/* Card 2: Completed & Graded */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-2xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-heading font-bold text-slate-500 uppercase tracking-wider">
              {isVi ? "Đã chấm điểm" : "Graded & Returned"}
            </span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center text-sm font-bold">
              ✅
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-heading font-black text-emerald-600">{stats.gradedCount}</span>
            <span className="text-xs text-slate-400">/ {stats.total}</span>
          </div>
          <p className="text-[11px] text-slate-400">
            {isVi ? `Đạt tỷ lệ ${stats.completionRate}% hoàn thành` : `${stats.completionRate}% completion rate`}
          </p>
        </div>

        {/* Card 3: Average Score */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-2xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-heading font-bold text-slate-500 uppercase tracking-wider">
              {isVi ? "Điểm trung bình" : "Average Score"}
            </span>
            <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center text-sm font-bold">
              🎯
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-heading font-black text-[#f59e0b]">
              {stats.gradedCount > 0 ? `${stats.averagePercentage}%` : "--"}
            </span>
            {stats.gradedCount > 0 && (
              <span className="text-xs text-slate-500 font-semibold font-mono">
                ({(stats.averagePercentage / 10).toFixed(1)}/10)
              </span>
            )}
          </div>
          <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
            <div
              className="bg-gradient-to-r from-amber-400 to-amber-500 h-full rounded-full transition-all duration-500"
              style={{ width: `${Math.min(100, stats.averagePercentage)}%` }}
            ></div>
          </div>
        </div>

        {/* Card 4: On-time Delivery */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-2xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-heading font-bold text-slate-500 uppercase tracking-wider">
              {isVi ? "Nộp đúng hạn" : "On-Time Rate"}
            </span>
            <div className="w-8 h-8 rounded-lg bg-violet-50 text-violet-600 flex items-center justify-center text-sm font-bold">
              ⏱️
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-heading font-black text-violet-700">{stats.onTimeCount}</span>
            <span className="text-xs text-slate-400">{isVi ? "bài đúng hạn" : "on-time"}</span>
          </div>
          <p className="text-[11px] text-slate-400">
            {isVi ? "Chuyên cần & đúng tiến độ" : "Punctual submissions"}
          </p>
        </div>
      </div>

      {/* 3. TOOLBAR: FILTER PILLS + SEARCH INPUT */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Filters */}
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={() => setActiveFilter("all")}
            className={`px-3 py-1.5 rounded-xl text-xs font-heading font-bold uppercase tracking-wider transition ${
              activeFilter === "all"
                ? "bg-[#261e16] text-white shadow-2xs"
                : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            {isVi ? "Tất cả" : "All"} ({grades.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveFilter("graded")}
            className={`px-3 py-1.5 rounded-xl text-xs font-heading font-bold uppercase tracking-wider transition ${
              activeFilter === "graded"
                ? "bg-emerald-600 text-white shadow-2xs"
                : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            {isVi ? "Đã có điểm" : "Graded"} ({stats.gradedCount})
          </button>
          <button
            type="button"
            onClick={() => setActiveFilter("turned_in")}
            className={`px-3 py-1.5 rounded-xl text-xs font-heading font-bold uppercase tracking-wider transition ${
              activeFilter === "turned_in"
                ? "bg-blue-600 text-white shadow-2xs"
                : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            {isVi ? "Chờ chấm điểm" : "Turned In"} (
            {grades.filter((g) => (g.state === "TURNED_IN" || g.state === "RETURNED") && g.grade === null).length}
            )
          </button>
          <button
            type="button"
            onClick={() => setActiveFilter("assigned")}
            className={`px-3 py-1.5 rounded-xl text-xs font-heading font-bold uppercase tracking-wider transition ${
              activeFilter === "assigned"
                ? "bg-amber-600 text-white shadow-2xs"
                : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            {isVi ? "Đang làm / Chưa nộp" : "Assigned"} (
            {grades.filter((g) => g.state !== "TURNED_IN" && g.state !== "RETURNED" && g.grade === null).length}
            )
          </button>
        </div>

        {/* Search */}
        <div className="relative w-full md:w-64">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={isVi ? "Tìm bài tập, bài quiz..." : "Search assignments..."}
            className="w-full pl-9 pr-3.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:border-[#c27803] focus:ring-2 focus:ring-[#c27803]/20 transition"
          />
          <span className="absolute left-3 top-2 text-slate-400 text-xs">🔍</span>
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-2 text-slate-400 hover:text-slate-600 text-xs"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* 4. MAIN ASSIGNMENT CARDS GRID */}
      {loading ? (
        <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center space-y-3">
          <div className="w-10 h-10 border-4 border-[#c27803] border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-xs font-heading font-bold text-slate-500 uppercase tracking-wider">
            {isVi ? "Đang tải dữ liệu bài tập..." : "Loading coursework data..."}
          </p>
        </div>
      ) : filteredGrades.length === 0 ? (
        <div className="bg-white rounded-3xl border border-slate-200 p-10 sm:p-14 text-center max-w-xl mx-auto shadow-sm space-y-4">
          <div className="w-16 h-16 rounded-3xl bg-blue-50 text-blue-600 flex items-center justify-center text-3xl mx-auto shadow-inner">
            📝
          </div>
          <div>
            <h3 className="text-base font-heading font-extrabold text-slate-800">
              {searchQuery
                ? (isVi ? "Không tìm thấy bài tập nào khớp" : "No assignments matched")
                : grades.length === 0
                ? (isVi ? "Chưa có dữ liệu bài tập từ Google Classroom" : "No Classroom coursework data yet")
                : (isVi ? "Không có bài tập trong bộ lọc này" : "No items in this filter")}
            </h3>
            <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto leading-relaxed">
              {grades.length === 0
                ? (isVi
                    ? "Nhấn nút 'Kéo Điểm Từ Classroom' phía trên để đồng bộ các bài tập và bài kiểm tra mới nhất về tài khoản của bạn."
                    : "Click 'Sync From Classroom' above to pull the latest coursework and scores into your portal.")
                : (isVi ? "Thử chuyển sang bộ lọc 'Tất cả' hoặc nhập từ khóa tìm kiếm khác." : "Try clearing your search or switching filter tabs.")}
            </p>
          </div>

          <div className="pt-2 flex flex-wrap items-center justify-center gap-2.5">
            <button
              type="button"
              onClick={handleSyncClassroomGrades}
              disabled={syncing}
              className="px-4 py-2 bg-[#c27803] hover:bg-[#92400e] text-white rounded-xl text-xs font-heading font-bold uppercase tracking-wider transition shadow-sm flex items-center gap-2 cursor-pointer"
            >
              <span className={syncing ? "animate-spin" : ""}>🔄</span>
              <span>{isVi ? "Kéo điểm ngay" : "Sync Now"}</span>
            </button>
            {classroomLink && (
              <a
                href={classroomLink}
                target="_blank"
                rel="noreferrer"
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition"
              >
                {isVi ? "Mở Google Classroom" : "Open Classroom"} →
              </a>
            )}
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredGrades.map((item) => {
            const isGraded = item.grade !== null && typeof item.grade !== "undefined";
            const percent = isGraded && item.maxPoints > 0 ? Math.round((Number(item.grade) / Number(item.maxPoints)) * 100) : null;

            // Icon by workType
            let icon = "📝";
            let typeLabel = "Bài tập (Assignment)";
            if (item.workType === "MULTIPLE_CHOICE_QUESTION" || (item.title || "").toLowerCase().includes("quiz")) {
              icon = "⏱️";
              typeLabel = "Quiz Trắc Nghiệm";
            } else if (item.workType === "SHORT_ANSWER_QUESTION") {
              icon = "❓";
              typeLabel = "Câu hỏi ngắn";
            } else if ((item.title || "").toLowerCase().includes("test") || (item.title || "").toLowerCase().includes("thi")) {
              icon = "🎓";
              typeLabel = "Bài Kiểm Tra";
            }

            return (
              <div
                key={item.submissionId || item.courseWorkId}
                className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-2xs hover:shadow-md hover:border-[#c27803]/40 transition flex flex-col justify-between group"
              >
                <div className="space-y-3">
                  {/* Top line: Icon + Type Badge + State Badge */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center text-xl shrink-0 group-hover:scale-105 transition">
                      {icon}
                    </div>

                    <div className="flex flex-col items-end gap-1">
                      {isGraded ? (
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                          <span>✓</span>
                          <span>{isVi ? "Đã có điểm" : "Graded"}</span>
                        </span>
                      ) : item.state === "TURNED_IN" || item.state === "RETURNED" ? (
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200 flex items-center gap-1">
                          <span>📤</span>
                          <span>{isVi ? "Đã nộp bài" : "Turned In"}</span>
                        </span>
                      ) : (
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200 flex items-center gap-1">
                          <span>⏳</span>
                          <span>{isVi ? "Chưa nộp" : "Assigned"}</span>
                        </span>
                      )}

                      {item.late && (
                        <span className="px-2 py-0.5 rounded-md text-[9px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                          {isVi ? "Nộp muộn" : "Late"}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Title & Description */}
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                      {typeLabel}
                    </span>
                    <h4
                      className="text-sm font-bold text-slate-900 group-hover:text-[#c27803] transition line-clamp-2"
                      title={item.title}
                    >
                      {item.title}
                    </h4>
                    {item.description && (
                      <p className="text-xs text-slate-500 line-clamp-2 mt-1 leading-relaxed">
                        {item.description}
                      </p>
                    )}
                  </div>

                  {/* Score Highlight Box */}
                  <div className="p-3 bg-slate-50/80 rounded-xl border border-slate-100 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-500 font-medium">
                        {isVi ? "Điểm số đạt được:" : "Achieved Grade:"}
                      </span>
                      {isGraded ? (
                        <div className="flex items-baseline gap-1">
                          <span className="text-lg font-heading font-black text-emerald-600">
                            {item.grade}
                          </span>
                          <span className="text-xs font-bold text-slate-400">
                            / {item.maxPoints}
                          </span>
                        </div>
                      ) : (
                        <span className="text-xs italic text-slate-400 font-medium">
                          {isVi ? "Chưa chấm điểm" : "Pending grade"}
                        </span>
                      )}
                    </div>

                    {isGraded && percent !== null && (
                      <div>
                        <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono mb-1">
                          <span>Tỷ lệ đạt</span>
                          <span className="font-bold text-slate-700">{percent}%</span>
                        </div>
                        <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${
                              percent >= 80
                                ? "bg-emerald-500"
                                : percent >= 50
                                ? "bg-amber-500"
                                : "bg-rose-500"
                            }`}
                            style={{ width: `${Math.min(100, percent)}%` }}
                          ></div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Deadline & Meta */}
                  <div className="space-y-1 text-[11px] text-slate-400">
                    {item.dueDate && (
                      <div className="flex items-center gap-1.5">
                        <span>⏰</span>
                        <span>
                          {isVi ? "Hạn nộp:" : "Due:"} <strong className="text-slate-600">{item.dueDate}</strong>
                        </span>
                      </div>
                    )}
                    <div className="flex items-center gap-1.5 truncate">
                      <span>👤</span>
                      <span>
                        Học viên: <strong className="text-slate-600 font-mono">{studentEmail}</strong>
                      </span>
                    </div>
                  </div>
                </div>

                {/* Footer Action */}
                <div className="pt-3 mt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                  <span className="text-[10px] text-slate-400">
                    Google Classroom
                  </span>
                  <a
                    href={item.alternateLink || classroomLink || "https://classroom.google.com"}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 px-3 py-1.5 bg-[#261e16] hover:bg-[#c27803] text-white rounded-lg text-[11px] font-heading font-bold uppercase tracking-wider transition shadow-2xs active:translate-y-px"
                  >
                    <span>{isVi ? "Xem Bài Nộp" : "View Submission"}</span>
                    <span>↗</span>
                  </a>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default StudentClassroomGradesTab;
