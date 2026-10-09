import React, { useState, useEffect } from "react";
import { useLanguage } from "../../context/LanguageContext";
import { subscribeClasses } from "../../services/classService";
import { subscribeStudents } from "../../services/studentService";
import { getAttendanceSession, saveAttendanceSession } from "../../services/attendanceService";
import { getLocalDateString, isClassOnDate } from "../../utils/scheduleUtils";

export const AttendancePage = () => {
  const { t } = useLanguage();
  const [classes, setClasses] = useState([]);
  const [students, setStudents] = useState([]);
  const [selectedClassId, setSelectedClassId] = useState("");
  const [selectedDate, setSelectedDate] = useState(getLocalDateString());
  const [records, setRecords] = useState({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");

  useEffect(() => {
    const unsubClasses = subscribeClasses((classList) => {
      setClasses(classList);
      if (classList.length > 0 && !selectedClassId) {
        setSelectedClassId(classList[0].classId);
      }
    });

    const unsubStudents = subscribeStudents((studentList) => {
      setStudents(studentList);
    });

    return () => {
      unsubClasses();
      unsubStudents();
    };
  }, []);

  // Filter students enrolled in the selected class
  const classStudents = students.filter((s) =>
    s.currentClassIds?.includes(selectedClassId)
  );

  const selectedClass = classes.find((c) => c.classId === selectedClassId);
  const isScheduledToday = selectedClass ? isClassOnDate(selectedClass, selectedDate) : false;

  // Load existing session whenever class or date changes
  useEffect(() => {
    if (!selectedClassId || !selectedDate) return;

    const loadSession = async () => {
      setLoading(true);
      setSuccessMessage("");
      try {
        const session = await getAttendanceSession(selectedClassId, selectedDate);
        if (session && session.records) {
          setRecords(session.records);
        } else {
          // Initialize default with all 'present'
          const defaultRecords = {};
          classStudents.forEach((st) => {
            defaultRecords[st.studentId] = {
              studentName: st.fullName,
              status: "present",
              note: "",
            };
          });
          setRecords(defaultRecords);
        }
      } catch (err) {
        console.error("Failed to load attendance session:", err);
      } finally {
        setLoading(false);
      }
    };

    loadSession();
  }, [selectedClassId, selectedDate, classStudents.length]);

  const updateStudentStatus = (studentId, studentName, status) => {
    setRecords((prev) => ({
      ...prev,
      [studentId]: {
        studentName,
        status,
        note: prev[studentId]?.note || "",
      },
    }));
  };

  const updateStudentNote = (studentId, studentName, note) => {
    setRecords((prev) => ({
      ...prev,
      [studentId]: {
        studentName,
        status: prev[studentId]?.status || "present",
        note,
      },
    }));
  };

  const handleMarkAll = (status) => {
    const updated = {};
    classStudents.forEach((st) => {
      updated[st.studentId] = {
        studentName: st.fullName,
        status,
        note: records[st.studentId]?.note || "",
      };
    });
    setRecords(updated);
  };

  const handleSaveAttendance = async () => {
    setSaving(true);
    setSuccessMessage("");
    try {
      await saveAttendanceSession({
        classId: selectedClassId,
        dateStr: selectedDate,
        takenBy: "Admin",
        records,
      });
      setSuccessMessage("Attendance saved successfully!");
      setTimeout(() => setSuccessMessage(""), 4000);
    } catch (err) {
      alert("Error saving attendance: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  // Summaries
  const recordValues = Object.values(records);
  const counts = {
    present: recordValues.filter((r) => r.status === "present").length,
    late: recordValues.filter((r) => r.status === "late").length,
    excused: recordValues.filter((r) => r.status === "excused").length,
    unexcused: recordValues.filter((r) => r.status === "unexcused").length,
  };

  return (
    <div className="space-y-6">
      {/* Control Bar: Class Picker & Date Picker */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-4 items-stretch md:items-center justify-between">
        <div className="flex flex-wrap items-center gap-3">
          <div>
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
              {t("selectClass")}
            </label>
            <select
              value={selectedClassId}
              onChange={(e) => setSelectedClassId(e.target.value)}
              className="py-2.5 px-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#00b4d8]/20 focus:border-[#00b4d8]"
            >
              {classes.map((c) => (
                <option key={c.classId} value={c.classId}>
                  {c.code} - {c.name}
                </option>
              ))}
            </select>
            {selectedClass && (
              <div className="flex items-center gap-2 mt-1.5 text-xs">
                <span className="font-semibold text-slate-600">🗓️ {selectedClass.schedule || "Chưa có lịch"}</span>
                {selectedClass.schedule && (
                  isScheduledToday ? (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                      ✓ Đúng lịch dạy
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                      ⚠️ Khác lịch chuẩn
                    </span>
                  )
                )}
              </div>
            )}
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
              {t("sessionDate")}
            </label>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="py-2.5 px-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#00b4d8]/20 focus:border-[#00b4d8]"
            />
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => handleMarkAll("present")}
            className="py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-heading font-bold uppercase tracking-wider transition"
          >
            {t("markAllPresent")}
          </button>
          <button
            onClick={handleSaveAttendance}
            disabled={saving || classStudents.length === 0}
            className="py-2.5 px-5 bg-[#00b4d8] hover:bg-[#0096c7] text-white rounded-xl text-xs font-heading font-bold uppercase tracking-wider shadow-sm transition disabled:opacity-50 flex items-center gap-1.5 active:translate-y-px"
          >
            {saving ? t("saving") : t("saveAttendance")}
          </button>
        </div>
      </div>

      {successMessage && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-medium flex items-center gap-2">
          <span>✓</span>
          <span>{t("attendanceSavedSuccess")}</span>
        </div>
      )}

      {/* Summary KPI Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-emerald-50/70 border border-emerald-200/60 p-3 rounded-xl text-center">
          <div className="text-xl font-bold text-emerald-700">{counts.present}</div>
          <div className="text-[11px] font-semibold text-emerald-600 uppercase">{t("statusPresent")}</div>
        </div>
        <div className="bg-amber-50/70 border border-amber-200/60 p-3 rounded-xl text-center">
          <div className="text-xl font-bold text-amber-700">{counts.late}</div>
          <div className="text-[11px] font-semibold text-amber-600 uppercase">{t("statusLate")}</div>
        </div>
        <div className="bg-blue-50/70 border border-blue-200/60 p-3 rounded-xl text-center">
          <div className="text-xl font-bold text-blue-700">{counts.excused}</div>
          <div className="text-[11px] font-semibold text-blue-600 uppercase">{t("statusExcused")}</div>
        </div>
        <div className="bg-rose-50/70 border border-rose-200/60 p-3 rounded-xl text-center">
          <div className="text-xl font-bold text-rose-700">{counts.unexcused}</div>
          <div className="text-[11px] font-semibold text-rose-600 uppercase">{t("statusUnexcused")}</div>
        </div>
      </div>

      {/* Roster Attendance Table */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        {loading ? (
          <div className="py-20 text-center text-slate-400">Loading class roster...</div>
        ) : classStudents.length === 0 ? (
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
                  <th className="py-3 px-4">Attendance Status</th>
                  <th className="py-3 px-4">Session Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {classStudents.map((st) => {
                  const currentStatus = records[st.studentId]?.status || "present";
                  const currentNote = records[st.studentId]?.note || "";

                  return (
                    <tr key={st.studentId} className="hover:bg-slate-50/60 transition">
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-slate-900">{st.fullName}</div>
                        <div className="text-xs font-mono font-medium text-slate-500">{st.studentId}</div>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="inline-flex p-1 bg-slate-100 rounded-xl gap-1">
                          {[
                            { key: "present", label: "Present", color: "bg-emerald-600 text-white" },
                            { key: "late", label: "Late", color: "bg-amber-500 text-white" },
                            { key: "excused", label: "Excused", color: "bg-blue-600 text-white" },
                            { key: "unexcused", label: "Unexcused", color: "bg-rose-600 text-white" },
                          ].map((opt) => (
                            <button
                              key={opt.key}
                              type="button"
                              onClick={() => updateStudentStatus(st.studentId, st.fullName, opt.key)}
                              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                                currentStatus === opt.key
                                  ? `${opt.color} shadow-sm`
                                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/60"
                              }`}
                            >
                              {opt.label}
                            </button>
                          ))}
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <input
                          type="text"
                          placeholder="Add note (e.g. 15 min late, sickness)..."
                          value={currentNote}
                          onChange={(e) => updateStudentNote(st.studentId, st.fullName, e.target.value)}
                          className="w-full max-w-xs px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700 focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#00b4d8]"
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default AttendancePage;
