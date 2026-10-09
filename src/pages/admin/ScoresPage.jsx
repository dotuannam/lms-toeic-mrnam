import React, { useState, useEffect } from "react";
import { useLanguage } from "../../context/LanguageContext";
import { subscribeClasses } from "../../services/classService";
import { subscribeStudents } from "../../services/studentService";
import { saveBatchScores, calculateTotalScore } from "../../services/scoreService";
import { ClassroomScoresSyncModal } from "../../components/admin/ClassroomScoresSyncModal";

export const ScoresPage = () => {
  const { t, lang } = useLanguage();
  const [classes, setClasses] = useState([]);
  const [students, setStudents] = useState([]);
  const [selectedClassId, setSelectedClassId] = useState("");
  const [testType, setTestType] = useState("TOEIC"); // "TOEIC" | "IELTS" | "APTIS"
  const [testTitle, setTestTitle] = useState("Progress Test 01");
  const [testDate, setTestDate] = useState(new Date().toISOString().split("T")[0]);
  const [targetScore, setTargetScore] = useState("550");
  const [studentScores, setStudentScores] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [showClassroomModal, setShowClassroomModal] = useState(false);

  useEffect(() => {
    const unsubClasses = subscribeClasses((clsList) => {
      setClasses(clsList);
      if (clsList.length > 0 && !selectedClassId) {
        setSelectedClassId(clsList[0].classId);
        setTestType(clsList[0].courseType || "TOEIC");
        setTargetScore(clsList[0].courseType === "IELTS" ? "6.5" : clsList[0].courseType === "APTIS" ? "140" : "550");
      }
    });

    const unsubStudents = subscribeStudents((stdList) => {
      setStudents(stdList);
    });

    return () => {
      unsubClasses();
      unsubStudents();
    };
  }, []);

  // Update testType & target when class changes
  const handleClassChange = (newClassId) => {
    setSelectedClassId(newClassId);
    const cls = classes.find((c) => c.classId === newClassId);
    if (cls) {
      const type = cls.courseType || "TOEIC";
      setTestType(type);
      setTargetScore(type === "IELTS" ? "6.5" : type === "APTIS" ? "140" : "550");
    }
  };

  const classStudents = students.filter((s) =>
    s.currentClassIds?.includes(selectedClassId)
  );

  const updateSkillScore = (studentId, skillName, value) => {
    setStudentScores((prev) => {
      const current = prev[studentId] || { skills: {}, feedback: "" };
      return {
        ...prev,
        [studentId]: {
          ...current,
          skills: {
            ...current.skills,
            [skillName]: Number(value) || 0,
          },
        },
      };
    });
  };

  const updateFeedback = (studentId, feedback) => {
    setStudentScores((prev) => {
      const current = prev[studentId] || { skills: {}, feedback: "" };
      return {
        ...prev,
        [studentId]: {
          ...current,
          feedback,
        },
      };
    });
  };

  const handleSaveScores = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setMessage("");

    try {
      const entries = classStudents.map((st) => ({
        studentId: st.studentId,
        studentName: st.fullName,
        skills: studentScores[st.studentId]?.skills || {},
        feedback: studentScores[st.studentId]?.feedback || "",
      }));

      await saveBatchScores({
        classId: selectedClassId,
        testTitle,
        testType,
        testDate,
        targetScore: Number(targetScore) || 0,
        entries,
      });

      setMessage("Scores recorded and student profiles updated!");
      setTimeout(() => setMessage(""), 4000);
    } catch (err) {
      alert("Failed to save scores: " + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const selectedClass = classes.find((c) => c.classId === selectedClassId);

  const handleApplyClassroomScores = ({ testTitle: newTitle, scoresToUpdate, matchedCount }) => {
    if (newTitle) setTestTitle(newTitle);
    setStudentScores((prev) => {
      const next = { ...prev };
      Object.keys(scoresToUpdate).forEach((stdId) => {
        next[stdId] = {
          ...next[stdId],
          skills: {
            ...(next[stdId]?.skills || {}),
            ...scoresToUpdate[stdId].skills,
          },
          feedback: scoresToUpdate[stdId].feedback || next[stdId]?.feedback || "",
        };
      });
      return next;
    });

    setMessage(
      lang === "vi"
        ? `Đã điền điểm thành công cho ${matchedCount} học viên từ bài tập Google Classroom: "${newTitle}"!`
        : `Successfully populated grades for ${matchedCount} students from Google Classroom: "${newTitle}"!`
    );
    setTimeout(() => setMessage(""), 5000);
  };

  return (
    <div className="space-y-6">
      {/* Test Setup Header Card */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
              {t("classLabel")}
            </label>
            <select
              value={selectedClassId}
              onChange={(e) => handleClassChange(e.target.value)}
              className="w-full py-2.5 px-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#00b4d8]/20 focus:border-[#00b4d8]"
            >
              {classes.map((c) => (
                <option key={c.classId} value={c.classId}>
                  {c.code} - {c.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
              {t("testTypeLabel")}
            </label>
            <select
              value={testType}
              onChange={(e) => setTestType(e.target.value)}
              className="w-full py-2.5 px-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#00b4d8]/20 focus:border-[#00b4d8]"
            >
              <option value="TOEIC">TOEIC (Max 990)</option>
              <option value="IELTS">IELTS (Max 9.0)</option>
              <option value="APTIS">APTIS (5 Components)</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
              {t("testTitleLabel")}
            </label>
            <input
              type="text"
              value={testTitle}
              onChange={(e) => setTestTitle(e.target.value)}
              placeholder="e.g. Midterm Evaluation"
              className="w-full py-2.5 px-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#00b4d8]/20 focus:border-[#00b4d8]"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
              {t("targetScoreLabel")}
            </label>
            <input
              type="number"
              step="any"
              value={targetScore}
              onChange={(e) => setTargetScore(e.target.value)}
              className="w-full py-2.5 px-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-[#1e2738] focus:outline-none focus:ring-2 focus:ring-[#00b4d8]/20 focus:border-[#00b4d8]"
            />
          </div>
        </div>

        {/* Classroom Sync Action Strip */}
        <div className="flex flex-wrap items-center justify-between pt-3 border-t border-slate-100 gap-3">
          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
            <span className="font-semibold text-slate-700">
              {lang === "vi" ? "Lớp đang chọn:" : "Active Class:"}
            </span>
            <span className="font-bold text-[#1e2738]">
              {selectedClass ? `${selectedClass.code} - ${selectedClass.name}` : "—"}
            </span>
            {selectedClass?.integrations?.googleClassroom?.courseId ? (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                <span>✓</span>
                <span>Classroom: {selectedClass.integrations.googleClassroom.courseId}</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium bg-slate-100 text-slate-500">
                {lang === "vi" ? "Chưa lưu mã Classroom" : "No Classroom ID saved"}
              </span>
            )}
          </div>

          <button
            type="button"
            onClick={() => setShowClassroomModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-xl text-xs font-heading font-bold uppercase tracking-wider shadow-sm transition active:scale-95"
          >
            <span>⚡</span>
            <span>{t("syncClassroomGradesBtn")}</span>
          </button>
        </div>
      </div>

      {message && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-semibold flex items-center gap-2">
          <span>✓</span>
          <span>{message}</span>
        </div>
      )}

      {/* Batch Scores Table */}
      <form onSubmit={handleSaveScores}>
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
          {classStudents.length === 0 ? (
            <div className="py-16 text-center text-slate-500">
              <p className="font-semibold text-slate-700">No students enrolled in this class</p>
              <p className="text-xs text-slate-400 mt-1">Enroll students into this class first.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-600">
                <thead className="bg-slate-50 border-b border-slate-200 text-xs uppercase font-semibold text-slate-500 tracking-wider">
                  <tr>
                    <th className="py-3 px-4">Student</th>

                    {/* Dynamic Columns based on Test Type */}
                    {testType === "TOEIC" && (
                      <>
                        <th className="py-3 px-3 text-center">Listening (495)</th>
                        <th className="py-3 px-3 text-center">Reading (495)</th>
                      </>
                    )}

                    {testType === "IELTS" && (
                      <>
                        <th className="py-3 px-2 text-center">Listening</th>
                        <th className="py-3 px-2 text-center">Reading</th>
                        <th className="py-3 px-2 text-center">Writing</th>
                        <th className="py-3 px-2 text-center">Speaking</th>
                      </>
                    )}

                    {testType === "APTIS" && (
                      <>
                        <th className="py-3 px-2 text-center">Grammar (50)</th>
                        <th className="py-3 px-2 text-center">Listening (50)</th>
                        <th className="py-3 px-2 text-center">Reading (50)</th>
                        <th className="py-3 px-2 text-center">Speaking (50)</th>
                        <th className="py-3 px-2 text-center">Writing (50)</th>
                      </>
                    )}

                    <th className="py-3 px-4 text-center">Overall</th>
                    <th className="py-3 px-4">Instructor Feedback</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {classStudents.map((st) => {
                    const studentSkills = studentScores[st.studentId]?.skills || {};
                    const total = calculateTotalScore(testType, studentSkills);
                    const isPassed = total >= (Number(targetScore) || 0);

                    return (
                      <tr key={st.studentId} className="hover:bg-slate-50/60 transition">
                        <td className="py-3.5 px-4">
                          <div className="font-semibold text-slate-900">{st.fullName}</div>
                          <div className="text-xs font-mono font-medium text-slate-500">{st.studentId}</div>
                        </td>

                        {/* TOEIC Inputs */}
                        {testType === "TOEIC" && (
                          <>
                            <td className="py-3 px-3 text-center">
                              <input
                                type="number"
                                min="0"
                                max="495"
                                placeholder="0"
                                value={studentSkills.listening || ""}
                                onChange={(e) => updateSkillScore(st.studentId, "listening", e.target.value)}
                                className="w-20 text-center py-1.5 px-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-semibold focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#00b4d8]"
                              />
                            </td>
                            <td className="py-3 px-3 text-center">
                              <input
                                type="number"
                                min="0"
                                max="495"
                                placeholder="0"
                                value={studentSkills.reading || ""}
                                onChange={(e) => updateSkillScore(st.studentId, "reading", e.target.value)}
                                className="w-20 text-center py-1.5 px-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-semibold focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#00b4d8]"
                              />
                            </td>
                          </>
                        )}

                        {/* IELTS Inputs */}
                        {testType === "IELTS" && (
                          <>
                            {["listening", "reading", "writing", "speaking"].map((sk) => (
                              <td key={sk} className="py-3 px-2 text-center">
                                <input
                                  type="number"
                                  min="0"
                                  max="9"
                                  step="0.5"
                                  placeholder="0"
                                  value={studentSkills[sk] || ""}
                                  onChange={(e) => updateSkillScore(st.studentId, sk, e.target.value)}
                                  className="w-16 text-center py-1.5 px-1 bg-slate-50 border border-slate-200 rounded-lg text-sm font-semibold focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#00b4d8]"
                                />
                              </td>
                            ))}
                          </>
                        )}

                        {/* APTIS Inputs */}
                        {testType === "APTIS" && (
                          <>
                            {["grammar_vocab", "listening", "reading", "speaking", "writing"].map((sk) => (
                              <td key={sk} className="py-3 px-2 text-center">
                                <input
                                  type="number"
                                  min="0"
                                  max="50"
                                  placeholder="0"
                                  value={studentSkills[sk] || ""}
                                  onChange={(e) => updateSkillScore(st.studentId, sk, e.target.value)}
                                  className="w-16 text-center py-1.5 px-1 bg-slate-50 border border-slate-200 rounded-lg text-sm font-semibold focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#00b4d8]"
                                />
                              </td>
                            ))}
                          </>
                        )}

                        {/* Overall Badge */}
                        <td className="py-3.5 px-4 text-center">
                          <span
                            className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold ${
                              isPassed
                                ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                : "bg-rose-50 text-rose-700 border border-rose-200"
                            }`}
                          >
                            {total}
                          </span>
                        </td>

                        {/* Feedback */}
                        <td className="py-3.5 px-4">
                          <input
                            type="text"
                            placeholder="Add recommendations..."
                            value={studentScores[st.studentId]?.feedback || ""}
                            onChange={(e) => updateFeedback(st.studentId, e.target.value)}
                            className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#00b4d8]"
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {classStudents.length > 0 && (
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
              <span className="text-xs text-slate-500 font-medium">
                {classStudents.length} students queued for score commit
              </span>
              <button
                type="submit"
                disabled={submitting}
                className="py-2.5 px-6 bg-[#00b4d8] hover:bg-[#0096c7] text-white rounded-xl text-xs font-heading font-bold uppercase tracking-wider shadow-sm transition disabled:opacity-50 active:translate-y-px"
              >
                {submitting ? t("saving") : t("saveScores")}
              </button>
            </div>
          )}
        </div>
      </form>

      {/* Classroom Scores Sync Modal */}
      <ClassroomScoresSyncModal
        isOpen={showClassroomModal}
        onClose={() => setShowClassroomModal(false)}
        selectedClass={selectedClass}
        classStudents={classStudents}
        testType={testType}
        onApplyScores={handleApplyClassroomScores}
      />
    </div>
  );
};

export default ScoresPage;
