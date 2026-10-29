import React, { useState, useEffect } from "react";
import { useLanguage } from "../../context/LanguageContext";
import { getClassroomGrades } from "../../services/api";

export const ClassroomScoresSyncModal = ({
  isOpen,
  onClose,
  selectedClass,
  classStudents = [],
  testType = "TOEIC",
  onApplyScores,
}) => {
  const { t, lang } = useLanguage();

  const [courseIdInput, setCourseIdInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [classroomData, setClassroomData] = useState(null);
  const [selectedCourseWorkId, setSelectedCourseWorkId] = useState("");
  const [targetSkill, setTargetSkill] = useState("");
  const [autoScale, setAutoScale] = useState(true);

  // Initialize course input when modal opens or class changes
  useEffect(() => {
    if (isOpen && selectedClass) {
      const existingId =
        selectedClass.integrations?.googleClassroom?.courseId ||
        selectedClass.integrations?.googleClassroom?.alternateLink ||
        "";
      setCourseIdInput(existingId);
      setError("");
      setClassroomData(null);
      setSelectedCourseWorkId("");

      // Default target skills based on testType
      if (testType === "TOEIC") setTargetSkill("listening");
      else if (testType === "IELTS") setTargetSkill("listening");
      else if (testType === "APTIS") setTargetSkill("grammar_vocab");

      // Auto-fetch if course ID exists
      if (existingId) {
        handleFetchGrades(existingId);
      }
    }
  }, [isOpen, selectedClass, testType]);

  if (!isOpen) return null;

  const handleFetchGrades = async (customId) => {
    const cid = (customId || courseIdInput).trim();
    if (!cid) {
      setError(
        lang === "vi"
          ? "Vui lòng nhập Course ID hoặc Link Google Classroom của lớp."
          : "Please enter Classroom Course ID or link."
      );
      return;
    }

    setLoading(true);
    setError("");

    try {
      const res = await getClassroomGrades({ courseId: cid });
      if (!res || !res.grades) {
        throw new Error(
          lang === "vi"
            ? "Không tìm thấy dữ liệu bài tập từ khóa học Classroom này."
            : "No coursework data found for this course."
        );
      }
      setClassroomData(res);
      if (res.courseWorks && res.courseWorks.length > 0) {
        setSelectedCourseWorkId(res.courseWorks[0].id);
      }
    } catch (err) {
      console.error("Fetch classroom grades error:", err);
      setError(err.message || "Failed to fetch grades from Google Classroom");
    } finally {
      setLoading(false);
    }
  };

  const selectedCourseWork =
    classroomData?.courseWorks?.find((cw) => cw.id === selectedCourseWorkId) || null;

  // Filter submissions belonging to the selected coursework
  const cwSubmissions = (classroomData?.grades || []).filter(
    (g) => g.courseWorkId === selectedCourseWorkId
  );

  /**
   * Helper to convert raw classroom grade into LMS skill points
   */
  const convertScore = (rawGrade, maxPoints = 100) => {
    if (rawGrade === null || rawGrade === undefined || isNaN(rawGrade)) return null;
    const gradeNum = Number(rawGrade);
    const maxNum = Number(maxPoints) || 100;

    if (!autoScale) return gradeNum;

    if (testType === "TOEIC") {
      // Max per skill is 495, rounded to nearest 5
      if (targetSkill === "split_both") {
        const fullScore = Math.min(990, Math.round(((gradeNum / maxNum) * 990) / 5) * 5);
        const half = Math.min(495, Math.round((fullScore / 2) / 5) * 5);
        return { listening: half, reading: fullScore - half, total: fullScore };
      }
      const scaled = Math.min(495, Math.round(((gradeNum / maxNum) * 495) / 5) * 5);
      return Math.max(5, scaled);
    }

    if (testType === "IELTS") {
      // Max per skill is 9.0, rounded to nearest 0.5
      const scaled = (gradeNum / maxNum) * 9.0;
      const rounded = Math.round(scaled * 2) / 2;
      return Math.min(9.0, Math.max(0, rounded));
    }

    if (testType === "APTIS") {
      // Max per component is 50
      const scaled = Math.round((gradeNum / maxNum) * 50);
      return Math.min(50, Math.max(0, scaled));
    }

    return gradeNum;
  };

  // Preview matches between class students and classroom submissions
  const studentMatches = classStudents.map((st) => {
    const stEmail = (st.email || "").toLowerCase().trim();
    const submission = cwSubmissions.find((sub) => {
      const subEmail = (sub.studentEmail || "").toLowerCase().trim();
      return (subEmail && subEmail === stEmail) || (sub.studentId && sub.studentId === st.studentId);
    });

    const rawGrade = submission?.grade ?? null;
    const computedScore = convertScore(rawGrade, selectedCourseWork?.maxPoints || 100);

    return {
      student: st,
      submission,
      hasSubmission: !!submission,
      hasGrade: rawGrade !== null,
      rawGrade,
      maxPoints: selectedCourseWork?.maxPoints || 100,
      computedScore,
    };
  });

  const gradedCount = studentMatches.filter((m) => m.hasGrade).length;

  const handleApply = () => {
    if (!selectedCourseWork) return;

    const scoresToUpdate = {};
    studentMatches.forEach((m) => {
      if (m.hasGrade && m.computedScore !== null) {
        if (testType === "TOEIC" && targetSkill === "split_both") {
          scoresToUpdate[m.student.studentId] = {
            skills: {
              listening: m.computedScore.listening,
              reading: m.computedScore.reading,
            },
            feedback: `Classroom: ${selectedCourseWork.title} (${m.rawGrade}/${m.maxPoints} pts)`,
          };
        } else if (testType === "IELTS" && targetSkill === "all_four") {
          scoresToUpdate[m.student.studentId] = {
            skills: {
              listening: m.computedScore,
              reading: m.computedScore,
              writing: m.computedScore,
              speaking: m.computedScore,
            },
            feedback: `Classroom: ${selectedCourseWork.title} (${m.rawGrade}/${m.maxPoints} pts)`,
          };
        } else {
          scoresToUpdate[m.student.studentId] = {
            skills: {
              [targetSkill]: m.computedScore,
            },
            feedback: `Classroom: ${selectedCourseWork.title} (${m.rawGrade}/${m.maxPoints} pts)`,
          };
        }
      }
    });

    onApplyScores({
      testTitle: selectedCourseWork.title,
      scoresToUpdate,
      matchedCount: gradedCount,
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-fade-in">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden my-auto">
        {/* Modal Header */}
        <div className="p-5 sm:p-6 bg-gradient-to-r from-[#261e16] via-[#24334a] to-[#261e16] text-white flex items-center justify-between relative overflow-hidden">
          <div className="absolute right-0 top-0 translate-x-10 -translate-y-10 w-44 h-44 rounded-full bg-[#c27803]/10 blur-2xl pointer-events-none" />
          <div className="flex items-center gap-3.5 relative z-10">
            <div className="w-11 h-11 rounded-2xl bg-[#c27803]/20 border border-[#c27803]/40 flex items-center justify-center text-xl shadow-inner">
              ⚡
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-heading font-black text-lg sm:text-xl text-white tracking-tight">
                  {t("syncClassroomGradesTitle")}
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#c27803]/20 text-[#90e0ef] border border-[#c27803]/30 uppercase">
                  Classroom API
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                {t("syncClassroomGradesDesc")}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center text-sm font-bold transition active:scale-95"
          >
            ✕
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-6 flex-1">
          {/* Step 1: Course ID Connection Bar */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-3">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600">
              {lang === "vi" ? "1. Mã hoặc Đường dẫn Google Classroom" : "1. Google Classroom Course ID or Link"}
            </label>
            <div className="flex flex-col sm:flex-row gap-2.5">
              <input
                type="text"
                value={courseIdInput}
                onChange={(e) => setCourseIdInput(e.target.value)}
                placeholder="https://classroom.google.com/c/Nz... hoặc mã Course ID"
                className="flex-1 px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs sm:text-sm font-mono text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#c27803]/20 focus:border-[#c27803]"
              />
              <button
                type="button"
                onClick={() => handleFetchGrades()}
                disabled={loading}
                className="px-5 py-2.5 bg-[#c27803] hover:bg-[#92400e] disabled:bg-slate-300 text-white font-heading font-bold text-xs uppercase tracking-wider rounded-xl shadow-sm transition active:scale-95 flex items-center justify-center gap-2 whitespace-nowrap"
              >
                {loading ? (
                  <>
                    <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>{lang === "vi" ? "Đang tải..." : "Loading..."}</span>
                  </>
                ) : (
                  <>
                    <span>🔍</span>
                    <span>{t("fetchCourseworkBtn")}</span>
                  </>
                )}
              </button>
            </div>

            {selectedClass?.integrations?.googleClassroom?.alternateLink && (
              <div className="flex items-center gap-2 text-[11px] text-emerald-700 font-medium">
                <span>✓</span>
                <span>
                  {lang === "vi"
                    ? "Lớp học đã liên kết Google Classroom: "
                    : "Class is linked to Google Classroom: "}
                  <a
                    href={selectedClass.integrations.googleClassroom.alternateLink}
                    target="_blank"
                    rel="noreferrer"
                    className="underline hover:text-emerald-900 font-semibold"
                  >
                    {selectedClass.integrations.googleClassroom.courseId}
                  </a>
                </span>
              </div>
            )}
          </div>

          {error && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 font-medium flex items-center gap-2">
              <span>⚠️</span>
              <span>{error}</span>
            </div>
          )}

          {/* Step 2: CourseWork & Target Mapping Selection */}
          {classroomData && classroomData.courseWorks?.length > 0 && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* CourseWork Pick */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                    {t("selectCoursework")}
                  </label>
                  <select
                    value={selectedCourseWorkId}
                    onChange={(e) => setSelectedCourseWorkId(e.target.value)}
                    className="w-full py-2.5 px-3 bg-white border border-slate-200 rounded-xl text-xs sm:text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#c27803]/20 focus:border-[#c27803]"
                  >
                    {classroomData.courseWorks.map((cw) => (
                      <option key={cw.id} value={cw.id}>
                        {cw.title} ({cw.maxPoints || 100} điểm)
                      </option>
                    ))}
                  </select>
                </div>

                {/* Target Skill Mapping */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                    {t("targetSkillLabel")}
                  </label>
                  <select
                    value={targetSkill}
                    onChange={(e) => setTargetSkill(e.target.value)}
                    className="w-full py-2.5 px-3 bg-white border border-slate-200 rounded-xl text-xs sm:text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#c27803]/20 focus:border-[#c27803]"
                  >
                    {testType === "TOEIC" && (
                      <>
                        <option value="listening">Listening (Nghe - Max 495)</option>
                        <option value="reading">Reading (Đọc - Max 495)</option>
                        <option value="split_both">Chia 50/50 sang Listening & Reading (Max 990)</option>
                      </>
                    )}

                    {testType === "IELTS" && (
                      <>
                        <option value="listening">Listening (Nghe - Max 9.0)</option>
                        <option value="reading">Reading (Đọc - Max 9.0)</option>
                        <option value="writing">Writing (Viết - Max 9.0)</option>
                        <option value="speaking">Speaking (Nói - Max 9.0)</option>
                        <option value="all_four">Áp dụng cho cả 4 kỹ năng</option>
                      </>
                    )}

                    {testType === "APTIS" && (
                      <>
                        <option value="grammar_vocab">Grammar & Vocab (Max 50)</option>
                        <option value="listening">Listening (Max 50)</option>
                        <option value="reading">Reading (Max 50)</option>
                        <option value="speaking">Speaking (Max 50)</option>
                        <option value="writing">Writing (Max 50)</option>
                      </>
                    )}
                  </select>
                </div>
              </div>

              {/* Scaling Option Bar */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-cyan-50/60 border border-cyan-100 text-xs">
                <label className="flex items-center gap-2 cursor-pointer font-medium text-cyan-950">
                  <input
                    type="checkbox"
                    checked={autoScale}
                    onChange={(e) => setAutoScale(e.target.checked)}
                    className="w-4 h-4 rounded text-[#c27803] focus:ring-[#c27803]"
                  />
                  <span>
                    {lang === "vi"
                      ? "Tự động quy đổi tỷ lệ theo thang điểm chuẩn của môn học (" + testType + ")"
                      : "Automatically scale scores to standard " + testType + " scale"}
                  </span>
                </label>
                <span className="font-semibold text-cyan-700 text-[11px]">
                  {gradedCount} / {classStudents.length} học viên có điểm
                </span>
              </div>
            </div>
          )}

          {/* Step 3: Match Table Preview */}
          {selectedCourseWork && (
            <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
              <div className="bg-slate-50 px-4 py-3 border-b border-slate-200 flex items-center justify-between">
                <div>
                  <h4 className="font-heading font-bold text-xs uppercase tracking-wider text-slate-700">
                    {lang === "vi" ? "Xem trước kết quả đối chiếu học viên" : "Student Match Preview"}
                  </h4>
                  <p className="text-[11px] text-slate-500">
                    {selectedCourseWork.title} &bull; Tối đa {selectedCourseWork.maxPoints || 100} điểm
                  </p>
                </div>
                <div className="text-right">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" />
                    {gradedCount} sẵn sàng nhập điểm
                  </span>
                </div>
              </div>

              <div className="max-h-60 overflow-y-auto">
                <table className="w-full text-left text-xs text-slate-600">
                  <thead className="bg-white border-b border-slate-100 font-semibold text-slate-500 uppercase text-[10px] tracking-wider sticky top-0 z-10 shadow-sm">
                    <tr>
                      <th className="py-2.5 px-3">Học viên</th>
                      <th className="py-2.5 px-3">Email liên kết</th>
                      <th className="py-2.5 px-3 text-center">Trạng thái nộp</th>
                      <th className="py-2.5 px-3 text-center">Điểm Classroom</th>
                      <th className="py-2.5 px-3 text-right">Điểm LMS quy đổi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {studentMatches.map((m) => (
                      <tr
                        key={m.student.studentId}
                        className={m.hasGrade ? "bg-emerald-50/20 hover:bg-emerald-50/40" : "hover:bg-slate-50/80"}
                      >
                        <td className="py-2 px-3 font-semibold text-slate-900">
                          {m.student.fullName}
                          <div className="text-[10px] text-slate-400 font-mono">{m.student.studentId}</div>
                        </td>
                        <td className="py-2 px-3 text-slate-500 font-mono text-[11px]">
                          {m.student.email || "—"}
                        </td>
                        <td className="py-2 px-3 text-center">
                          {m.submission ? (
                            <span
                              className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                                m.submission.state === "RETURNED"
                                  ? "bg-emerald-100 text-emerald-800"
                                  : m.submission.state === "TURNED_IN"
                                  ? "bg-amber-100 text-amber-800"
                                  : "bg-slate-100 text-slate-600"
                              }`}
                            >
                              {m.submission.state}
                            </span>
                          ) : (
                            <span className="text-[10px] text-slate-400 italic">Chưa nộp</span>
                          )}
                        </td>
                        <td className="py-2 px-3 text-center font-bold">
                          {m.rawGrade !== null ? (
                            <span className="text-slate-800">
                              {m.rawGrade} / {m.maxPoints}
                            </span>
                          ) : (
                            <span className="text-slate-300 font-normal">—</span>
                          )}
                        </td>
                        <td className="py-2 px-3 text-right font-black">
                          {m.computedScore !== null ? (
                            <span className="text-[#c27803] font-mono text-sm">
                              {typeof m.computedScore === "object"
                                ? `${m.computedScore.listening} L / ${m.computedScore.reading} R`
                                : m.computedScore}
                            </span>
                          ) : (
                            <span className="text-slate-300 font-normal">—</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 sm:p-5 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-xs text-slate-500">
            {selectedCourseWork && (
              <span>
                {lang === "vi"
                  ? `Bài kiểm tra "${selectedCourseWork.title}" sẽ tự động cập nhật tiêu đề bài thi.`
                  : `Test title will be updated to "${selectedCourseWork.title}".`}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 text-xs font-heading font-bold uppercase tracking-wider transition"
            >
              {lang === "vi" ? "Đóng" : "Close"}
            </button>
            <button
              type="button"
              disabled={!selectedCourseWork || gradedCount === 0}
              onClick={handleApply}
              className="flex-1 sm:flex-none px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 disabled:opacity-40 text-white text-xs font-heading font-bold uppercase tracking-wider shadow-sm transition active:scale-95"
            >
              {t("applyScoresBtn")} ({gradedCount})
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ClassroomScoresSyncModal;
