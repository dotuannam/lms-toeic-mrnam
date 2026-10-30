import React, { useState, useEffect, useMemo } from "react";
import { useAuth } from "../../context/AuthContext";
import { useLanguage } from "../../context/LanguageContext";
import { doc, getDoc, collection, query, where, getDocs } from "firebase/firestore";
import { db } from "../../config/firebase";
import { RadarChart } from "../../components/charts/RadarChart";
import { getStudentScores, getStudentClassroomGrades, syncStudentClassroomGrades, calculateRadarScale } from "../../services/scoreService";
import { VIETQR_CONFIG, buildVietQrUrl } from "../../config/vietqr";
import { useSettings } from "../../context/SettingsContext";
import { DEFAULT_CENTER_CONFIG } from "../../services/settingsService";
import { StudentMaterialsTab } from "../../components/student/StudentMaterialsTab";
import { StudentClassroomGradesTab } from "../../components/student/StudentClassroomGradesTab";
import { StudentClassroomRulesTab } from "../../components/student/StudentClassroomRulesTab";
import { StudentResourcesTab } from "../../components/student/StudentResourcesTab";
import { StudentVocabGamesTab } from "../../components/student/StudentVocabGamesTab";
import { CelebrationBanners } from "../../components/common/CelebrationBanners";

export const StudentDashboard = () => {
  const { currentUser, userProfile } = useAuth();
  const { centerConfig, bankingConfig, buildQrUrl } = useSettings();
  const { t, lang } = useLanguage();
  const isVi = lang === "vi";

  // Center contact info for student support & payment verification
  const centerHotline = centerConfig?.hotline || centerConfig?.phone || DEFAULT_CENTER_CONFIG.hotline;
  const centerEmail = centerConfig?.adminEmail || centerConfig?.email || DEFAULT_CENTER_CONFIG.adminEmail;
  const centerName = centerConfig?.centerName || DEFAULT_CENTER_CONFIG.centerName;
  const cleanCenterHotline = (centerHotline || "").replace(/\s+/g, "");

  const [activeTab, setActiveTab] = useState("overview"); // "overview" | "materials"
  const [student, setStudent] = useState(null);
  const [enrolledClasses, setEnrolledClasses] = useState([]);
  const [activeClass, setActiveClass] = useState(null);
  const [tuition, setTuition] = useState(null);
  const [scores, setScores] = useState([]);
  const [attendanceLogs, setAttendanceLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showQrModal, setShowQrModal] = useState(false);
  const [classroomGrades, setClassroomGrades] = useState([]);
  const [syncingClassroom, setSyncingClassroom] = useState(false);
  const [syncStatusMsg, setSyncStatusMsg] = useState(null);

  useEffect(() => {
    const fetchStudentData = async () => {
      setLoading(true);
      try {
        let studentData = null;
        let studentId = userProfile?.studentId;

        // 1. Resolve student record
        if (studentId) {
          const sSnap = await getDoc(doc(db, "students", studentId));
          if (sSnap.exists()) studentData = { studentId, ...sSnap.data() };
        } else if (currentUser?.email) {
          const emailLower = currentUser.email.toLowerCase().trim();
          const q = query(
            collection(db, "students"),
            where("email", "==", emailLower)
          );
          const snap = await getDocs(q);
          if (!snap.empty) {
            studentData = { studentId: snap.docs[0].id, ...snap.docs[0].data() };
            studentId = studentData.studentId;
          } else if (emailLower.endsWith("@hocvien.local")) {
            const rawId = emailLower.replace("@hocvien.local", "");
            const phoneSnap = await getDocs(query(collection(db, "students"), where("phone", "==", rawId)));
            if (!phoneSnap.empty) {
              studentData = { studentId: phoneSnap.docs[0].id, ...phoneSnap.docs[0].data() };
              studentId = studentData.studentId;
            } else {
              const idSnap = await getDoc(doc(db, "students", rawId.toUpperCase()));
              if (idSnap.exists()) {
                studentData = { studentId: idSnap.id, ...idSnap.data() };
                studentId = studentData.studentId;
              }
            }
          }
        }

        if (!studentData) {
          setLoading(false);
          return;
        }

        setStudent(studentData);

        // 2. Fetch all enrolled classes
        const classIds = studentData.currentClassIds || [];
        const loadedClasses = [];
        for (const cid of classIds) {
          const cSnap = await getDoc(doc(db, "classes", cid));
          if (cSnap.exists()) {
            loadedClasses.push({ classId: cid, ...cSnap.data() });
          }
        }
        setEnrolledClasses(loadedClasses);

        // Choose initial active class
        const currentSelectedClass = loadedClasses[0] || null;
        setActiveClass(currentSelectedClass);

        if (currentSelectedClass) {
          // 3. Fetch Tuition
          const tSnap = await getDoc(
            doc(db, "tuitions", `${studentId}_${currentSelectedClass.classId}`)
          );
          if (tSnap.exists()) setTuition({ tuitionId: tSnap.id, ...tSnap.data() });

          // 4. Fetch Attendance Sessions for this class
          const attQ = query(
            collection(db, "attendance_sessions"),
            where("classId", "==", currentSelectedClass.classId)
          );
          const attSnap = await getDocs(attQ);
          const studentAttLogs = [];
          attSnap.docs.forEach((d) => {
            const session = d.data();
            const record = session.records?.[studentId];
            if (record) {
              studentAttLogs.push({
                date: session.date,
                status: record.status,
                note: record.note,
              });
            }
          });
          studentAttLogs.sort((a, b) => b.date.localeCompare(a.date));
          setAttendanceLogs(studentAttLogs);
        }

        // 5. Fetch Score History
        const scoreList = await getStudentScores(studentId);
        setScores(scoreList);

        // 6. Fetch / Sync Google Classroom Homework & Grades
        if (currentSelectedClass) {
          try {
            const cachedGrades = await getStudentClassroomGrades({
              studentId,
              classId: currentSelectedClass.classId,
            });
            if (cachedGrades && cachedGrades.length > 0) {
              setClassroomGrades(cachedGrades);
            } else {
              const syncRes = await syncStudentClassroomGrades({
                studentId,
                studentEmail: studentData.email || currentUser?.email || "",
                classId: currentSelectedClass.classId,
                courseId:
                  currentSelectedClass.integrations?.googleClassroom?.courseId ||
                  currentSelectedClass.code ||
                  "COURSE",
              });
              if (syncRes?.grades) {
                setClassroomGrades(syncRes.grades);
              }
            }
          } catch (cgErr) {
            console.warn("Classroom grades initial load error:", cgErr);
          }
        }
      } catch (err) {
        console.error("Student portal load failed:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchStudentData();
  }, [currentUser, userProfile]);

  // Load class-specific tuition and attendance when active class is switched
  const handleSelectClass = async (classId) => {
    const selected = enrolledClasses.find((c) => c.classId === classId);
    if (!selected) return;
    setActiveClass(selected);

    if (student?.studentId) {
      try {
        const tSnap = await getDoc(doc(db, "tuitions", `${student.studentId}_${classId}`));
        if (tSnap.exists()) setTuition({ tuitionId: tSnap.id, ...tSnap.data() });
        else setTuition(null);

        const attQ = query(
          collection(db, "attendance_sessions"),
          where("classId", "==", classId)
        );
        const attSnap = await getDocs(attQ);
        const studentAttLogs = [];
        attSnap.docs.forEach((d) => {
          const session = d.data();
          const record = session.records?.[student.studentId];
          if (record) {
            studentAttLogs.push({
              date: session.date,
              status: record.status,
              note: record.note,
            });
          }
        });
        studentAttLogs.sort((a, b) => b.date.localeCompare(a.date));
        setAttendanceLogs(studentAttLogs);

        // Switch cached classroom grades
        try {
          const cachedGrades = await getStudentClassroomGrades({
            studentId: student.studentId,
            classId,
          });
          if (cachedGrades && cachedGrades.length > 0) {
            setClassroomGrades(cachedGrades);
          } else {
            const syncRes = await syncStudentClassroomGrades({
              studentId: student.studentId,
              studentEmail: student.email || currentUser?.email || "",
              classId,
              courseId:
                selected.integrations?.googleClassroom?.courseId ||
                selected.code ||
                "COURSE",
            });
            if (syncRes?.grades) {
              setClassroomGrades(syncRes.grades);
            }
          }
        } catch (cgErr) {
          console.warn("Classroom grades switch error:", cgErr);
        }
      } catch (err) {
        console.error("Error switching student class:", err);
      }
    }
  };

  const handleManualSyncClassroom = async () => {
    if (!student?.studentId || !activeClass?.classId) return;
    setSyncingClassroom(true);
    setSyncStatusMsg(null);
    try {
      const res = await syncStudentClassroomGrades({
        studentId: student.studentId,
        studentEmail: student.email || currentUser?.email || "",
        classId: activeClass.classId,
        courseId:
          activeClass.integrations?.googleClassroom?.courseId ||
          activeClass.code ||
          "COURSE",
      });
      if (res?.grades) {
        setClassroomGrades(res.grades);
        setSyncStatusMsg({
          type: "success",
          text: isVi
            ? `Đã đồng bộ thành công ${res.grades.length} bài tập từ Google Classroom!`
            : `Synced ${res.grades.length} items from Classroom!`,
        });
      }
    } catch (err) {
      setSyncStatusMsg({
        type: "error",
        text: isVi ? `Lỗi đồng bộ: ${err.message}` : `Sync failed: ${err.message}`,
      });
    } finally {
      setSyncingClassroom(false);
      setTimeout(() => setSyncStatusMsg(null), 5000);
    }
  };

  const pendingHomeworks = useMemo(() => {
    return classroomGrades.filter(
      (g) => g.state !== "TURNED_IN" && g.state !== "RETURNED"
    );
  }, [classroomGrades]);

  const overdueHomeworks = useMemo(() => {
    const now = new Date();
    return pendingHomeworks.filter(
      (g) => g.late || (g.dueDate && new Date(g.dueDate) < now)
    );
  }, [pendingHomeworks]);

  if (loading) {
    return (
      <div className="py-24 text-center">
        <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
        <p className="text-sm font-medium text-slate-500">{t("loadingDashboard")}</p>
      </div>
    );
  }

  if (!student) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center max-w-lg mx-auto shadow-sm">
        <div className="text-4xl mb-3">🎓</div>
        <h2 className="text-lg font-bold text-slate-800">{t("noStudentProfile")}</h2>
        <p className="text-xs text-slate-500 mt-2">
          {t("noStudentProfileDesc")}
        </p>
      </div>
    );
  }

  // Latest score computation for Radar Chart
  const latestScore = scores[0] || student.latestScoreSummary || null;
  const radarData =
    latestScore?.normalizedRadarScales && Object.keys(latestScore.normalizedRadarScales).length > 0
      ? latestScore.normalizedRadarScales
      : latestScore
      ? calculateRadarScale(latestScore.testType, latestScore.skills, latestScore.gradingMode, latestScore.config)
      : {};
  const rawSkills = latestScore?.skills || {};

  // VietQR parameters
  const debt = tuition?.debtAmount ?? student.tuitionOverview?.totalDebt ?? 0;
  const rawTransferDesc = `HP ${student.studentId} ${activeClass?.code || ""}`.trim();
  const vietQrUrl = buildQrUrl
    ? buildQrUrl({ amount: debt, transferDescription: rawTransferDesc })
    : buildVietQrUrl({ amount: debt, transferDescription: rawTransferDesc });

  // Attendance stats
  const totalSessions = attendanceLogs.length;
  const presentCount = attendanceLogs.filter((l) => l.status === "present").length;
  const attendanceRate = totalSessions > 0 ? Math.round((presentCount / totalSessions) * 100) : 100;

  const renderStatusBadge = (status) => {
    switch (status) {
      case "present":
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
            {t("statusPresent")}
          </span>
        );
      case "late":
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
            {t("statusLate")}
          </span>
        );
      case "excused":
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
            {t("statusExcused")}
          </span>
        );
      default:
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
            {t("statusUnexcused")}
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* FESTIVE & REMINDER BANNERS: Student Birthday, 1-Week Course End, Holidays */}
      <CelebrationBanners
        studentName={student?.fullName}
        studentDob={student?.dob}
        activeClass={activeClass}
        centerName={centerName}
      />

      {/* 0. CLEVER COURSE STUDENT NAVIGATION TABS */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="inline-flex items-center p-1 bg-white rounded-xl border border-slate-200/90 shadow-2xs">
          <button
            type="button"
            onClick={() => setActiveTab("overview")}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-heading font-bold uppercase tracking-wider transition-all ${
              activeTab === "overview"
                ? "bg-[#c27803] text-white shadow-sm"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
            }`}
          >
            <span>📊</span>
            <span>{t("tabOverview")}</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("classroom_grades")}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-heading font-bold uppercase tracking-wider transition-all ${
              activeTab === "classroom_grades"
                ? "bg-[#c27803] text-white shadow-sm"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
            }`}
          >
            <span>📝</span>
            <span>{t("tabClassroomGrades")}</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("materials")}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-heading font-bold uppercase tracking-wider transition-all ${
              activeTab === "materials"
                ? "bg-[#c27803] text-white shadow-sm"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
            }`}
          >
            <span>📁</span>
            <span>{t("tabMaterials")}</span>
          </button>

          {/* Tạm thời ẩn Kho học liệu mô phỏng theo yêu cầu GV cho đến khi biên soạn xong tài liệu chính thức
          <button
            type="button"
            onClick={() => setActiveTab("resources")}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-heading font-bold uppercase tracking-wider transition-all ${
              activeTab === "resources"
                ? "bg-[#c27803] text-white shadow-sm"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
            }`}
          >
            <span>📚</span>
            <span>{isVi ? "Kho Học Liệu" : "Resources"}</span>
          </button>
          */}

          <button
            type="button"
            onClick={() => setActiveTab("vocab_games")}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-heading font-bold uppercase tracking-wider transition-all ${
              activeTab === "vocab_games"
                ? "bg-[#c27803] text-white shadow-sm"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
            }`}
          >
            <span>🎮</span>
            <span>{isVi ? "Mini Game Từ Vựng" : "Vocab Games"}</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("rules")}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-heading font-bold uppercase tracking-wider transition-all ${
              activeTab === "rules"
                ? "bg-[#c27803] text-white shadow-sm"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
            }`}
          >
            <span>📜</span>
            <span>{isVi ? "Quy Định Lớp Học" : "Classroom Rules"}</span>
          </button>
        </div>

        {/* Quick class switcher if enrolled in multiple courses */}
        {enrolledClasses.length > 1 && (
          <div className="flex items-center gap-2 self-start sm:self-auto">
            <span className="text-xs font-heading font-bold text-slate-500 uppercase tracking-wider">
              {t("switchClass")}
            </span>
            <select
              value={activeClass?.classId || ""}
              onChange={(e) => handleSelectClass(e.target.value)}
              className="py-1.5 px-3 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 shadow-2xs focus:outline-none focus:ring-2 focus:ring-[#c27803]/20 focus:border-[#c27803]"
            >
              {enrolledClasses.map((c) => (
                <option key={c.classId} value={c.classId}>
                  {c.code} - {c.name}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* RENDER ACTIVE TAB */}
      {activeTab === "rules" ? (
        <StudentClassroomRulesTab />
      ) : activeTab === "resources" ? (
        <StudentResourcesTab student={student} activeClass={activeClass} />
      ) : activeTab === "vocab_games" ? (
        <StudentVocabGamesTab student={student} activeClass={activeClass} />
      ) : activeTab === "materials" ? (
        <StudentMaterialsTab
          student={student}
          activeClass={activeClass}
          enrolledClasses={enrolledClasses}
          onSelectClass={handleSelectClass}
        />
      ) : activeTab === "classroom_grades" ? (
        <StudentClassroomGradesTab
          student={student}
          activeClass={activeClass}
          enrolledClasses={enrolledClasses}
          onSelectClass={handleSelectClass}
        />
      ) : (
        /* TAB: ACADEMIC OVERVIEW */
        <div className="space-y-6">
          {/* 1. CLEVER COURSE HERO COURSE BANNER */}
          <div className="bg-gradient-to-r from-[#261e16] via-[#161c28] to-[#261e16] border border-[#2a354b] rounded-2xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
            <div className="absolute top-0 right-0 -mr-16 -mt-16 w-72 h-72 bg-[#c27803]/15 rounded-full blur-3xl pointer-events-none"></div>

            <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="space-y-2.5">
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded font-heading font-bold text-[11px] uppercase tracking-wider bg-[#c27803] text-white shadow-2xs">
                    {activeClass?.code || "COURSE"}
                  </span>
                  <span className="px-2.5 py-0.5 rounded font-heading font-semibold text-[11px] uppercase tracking-wider bg-white/10 text-slate-200 border border-white/10">
                    {activeClass?.courseType || "General English"}
                  </span>
                </div>
                <h1 className="text-xl sm:text-2xl lg:text-3xl font-heading font-extrabold text-white tracking-tight uppercase">
                  {activeClass?.name || t("welcomeBack")}
                </h1>
                <p className="text-xs sm:text-sm text-slate-300 max-w-xl leading-relaxed">
                  👨‍🏫 {t("assignedInstructor")}:{" "}
                  <span className="text-[#c27803] font-bold">
                    {activeClass?.teacherName || "Assigned Instructor"}
                  </span>{" "}
                  &bull; ⏰ {t("weeklySchedule")}: <span className="text-white font-medium">{activeClass?.schedule || "Weekly Schedule"}</span>
                </p>
              </div>

              {/* Quick Launch Buttons */}
              <div className="flex flex-wrap items-center gap-2.5">
                {/* 1. Google Meet Direct Room */}
                <a
                  href={activeClass?.meetLink || activeClass?.integrations?.googleMeet?.link || "https://meet.google.com/new"}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-heading font-extrabold uppercase tracking-wider shadow-lg shadow-emerald-900/40 transition active:translate-y-px border border-emerald-400/30"
                  title="Vào lớp trực tuyến qua Google Meet"
                >
                  <span className="w-2 h-2 rounded-full bg-emerald-200 animate-ping"></span>
                  <span>🎥 {isVi ? "Vào Meet Trực Tuyến" : "Join Meet Room"}</span>
                </a>

                {/* 2. Vocabulary Sheet */}
                {activeClass?.integrations?.vocabularySheet?.sheetUrl && (
                  <a
                    href={activeClass.integrations.vocabularySheet.sheetUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-2 px-3.5 py-2.5 bg-[#c27803] hover:bg-[#b45309] text-white rounded-xl text-xs font-heading font-bold uppercase tracking-wider shadow-lg shadow-amber-900/30 transition active:translate-y-px border border-amber-400/30"
                    title="Mở Sổ tay từ vựng Google Sheet (3 cột: Từ vựng - IPA - Nghĩa tự động)"
                  >
                    <span>📖</span>
                    <span>{isVi ? "Sổ Từ Vựng" : "Vocab Sheet"}</span>
                  </a>
                )}

                {/* 3. Google Classroom (Hệ thống sao lưu) */}
                {activeClass?.integrations?.googleClassroom?.alternateLink && (
                  <a
                    href={activeClass.integrations.googleClassroom.alternateLink}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 px-3.5 py-2.5 bg-[#20b2aa]/20 hover:bg-[#20b2aa] text-[#4dd0e1] hover:text-white rounded-xl text-xs font-heading font-bold uppercase tracking-wider transition border border-[#20b2aa]/40"
                    title="Google Classroom (Hệ Thống Sao Lưu / Backup)"
                  >
                    <span>🏫</span>
                    <span>Classroom</span>
                    <span className="text-[10px] px-1 py-0.2 bg-teal-950/60 text-teal-200 rounded font-normal lowercase">backup</span>
                  </a>
                )}

                {/* 4. Drive Folders */}
                {activeClass?.integrations?.googleDrive?.folderLink && (
                  <a
                    href={activeClass.integrations.googleDrive.folderLink}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-2.5 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-heading font-semibold uppercase tracking-wider backdrop-blur-md border border-white/15 transition"
                  >
                    <span>📁</span>
                    <span>Drive</span>
                  </a>
                )}

                {/* Tạm thời ẩn nút Kho học liệu mô phỏng
                <button
                  type="button"
                  onClick={() => setActiveTab("resources")}
                  className="inline-flex items-center gap-1.5 px-3 py-2.5 bg-[#c27803] hover:bg-[#b45309] text-white rounded-xl text-xs font-heading font-bold uppercase tracking-wider transition shadow-sm"
                >
                  <span>📚</span>
                  <span>{isVi ? "Kho Học Liệu" : "Resources"}</span>
                </button>
                */}

                <button
                  type="button"
                  onClick={() => setActiveTab("vocab_games")}
                  className="inline-flex items-center gap-1.5 px-3 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white rounded-xl text-xs font-heading font-extrabold uppercase tracking-wider transition shadow-sm"
                >
                  <span>🎮</span>
                  <span>{isVi ? "Mini Game" : "Games"}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab("materials")}
                  className="inline-flex items-center gap-1.5 px-3 py-2.5 bg-white/10 hover:bg-white/20 text-slate-200 hover:text-white rounded-xl text-xs font-heading font-semibold uppercase tracking-wider backdrop-blur-md border border-white/15 transition"
                >
                  <span>📂</span>
                  <span>{t("tabMaterials")}</span>
                </button>
              </div>
            </div>
          </div>

          {/* 1.1 ONLINE LEARNING & BACKUP SYSTEM STRIP */}
          <div className="p-4 bg-gradient-to-r from-amber-500/10 via-amber-600/5 to-transparent border border-[#c27803]/30 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs shadow-2xs">
            <div className="flex items-center gap-3">
              <span className="w-9 h-9 rounded-xl bg-[#c27803]/15 text-[#c27803] flex items-center justify-center text-lg shrink-0">
                🌐
              </span>
              <div>
                <div className="font-heading font-bold text-slate-900 flex items-center gap-2">
                  <span>{isVi ? "Định hướng vận hành: LMS là hệ thống học tập chính yếu" : "Operating Workflow: Primary LMS"}</span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#c27803]/15 text-[#c27803]">
                    Official LMS
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  {isVi
                    ? "Học viên học trực tuyến qua Google Meet và truy cập tài liệu tại LMS. Google Classroom đóng vai trò hệ thống sao lưu và đồng bộ điểm số bài tập."
                    : "Attend live classes via Google Meet & access lectures on LMS. Google Classroom serves as the backup system for homework synchronization."}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
              <a
                href={activeClass?.meetLink || activeClass?.integrations?.googleMeet?.link || "https://meet.google.com/new"}
                target="_blank"
                rel="noreferrer"
                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-heading font-bold uppercase tracking-wider text-[11px] transition shadow-xs flex items-center gap-1"
              >
                <span>🎥</span>
                <span>{isVi ? "Vào Meet" : "Meet Room"}</span>
              </a>
              {activeClass?.integrations?.vocabularySheet?.sheetUrl && (
                <a
                  href={activeClass.integrations.vocabularySheet.sheetUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="px-3 py-1.5 bg-[#c27803] hover:bg-[#b45309] text-white rounded-lg font-heading font-bold uppercase tracking-wider text-[11px] transition shadow-xs flex items-center gap-1"
                >
                  <span>📖</span>
                  <span>{isVi ? "Sổ Từ Vựng" : "Vocab"}</span>
                </a>
              )}
            </div>
          </div>

          {/* 1.2 PENDING HOMEWORK & DUE DATE ALERT BANNER */}
          {pendingHomeworks.length > 0 ? (
            <div className={`p-5 rounded-2xl border transition-all shadow-sm ${
              overdueHomeworks.length > 0
                ? "bg-rose-50/80 border-rose-300 text-rose-950"
                : "bg-amber-50/80 border-amber-300 text-amber-950"
            }`}>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-black/10">
                <div className="flex items-center gap-2.5">
                  <span className="text-2xl animate-bounce">
                    {overdueHomeworks.length > 0 ? "🚨" : "⚠️"}
                  </span>
                  <div>
                    <h3 className="font-heading font-extrabold text-sm uppercase tracking-wide flex items-center gap-2">
                      <span>{isVi ? "Nhắc nhở Bài tập về nhà chưa hoàn thành" : "Pending Homework Reminder"}</span>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-mono font-bold ${
                        overdueHomeworks.length > 0 ? "bg-rose-600 text-white" : "bg-[#c27803] text-white"
                      }`}>
                        {pendingHomeworks.length} {isVi ? "bài" : "tasks"}
                      </span>
                    </h3>
                    <p className="text-xs opacity-85 mt-0.5">
                      {overdueHomeworks.length > 0
                        ? isVi
                          ? `Chú ý: Bạn có ${overdueHomeworks.length} bài tập đã QUÁ HẠN! Hãy khẩn trương hoàn thành và nộp qua Google Classroom.`
                          : `Warning: You have ${overdueHomeworks.length} OVERDUE homework tasks! Please complete and submit.`
                        : isVi
                          ? "Bạn có bài tập về nhà đang chờ nộp. Hãy hoàn thành đúng hạn để giáo viên chấm điểm nhé!"
                          : "You have pending homework. Please submit on time for teacher evaluation!"}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={handleManualSyncClassroom}
                    disabled={syncingClassroom}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-white text-slate-800 border border-slate-200 text-xs font-semibold shadow-xs hover:bg-slate-50 transition disabled:opacity-50"
                    title="Đồng bộ lại điểm & trạng thái nộp bài từ Google Classroom"
                  >
                    <span className={syncingClassroom ? "animate-spin" : ""}>🔄</span>
                    <span>{syncingClassroom ? (isVi ? "Đang đồng bộ..." : "Syncing...") : (isVi ? "Đồng bộ lại" : "Sync")}</span>
                  </button>

                  {activeClass?.integrations?.googleClassroom?.alternateLink && (
                    <a
                      href={activeClass.integrations.googleClassroom.alternateLink}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-[#20b2aa] hover:bg-[#1a938c] text-white text-xs font-heading font-bold uppercase tracking-wider shadow-xs transition"
                    >
                      <span>🏫</span>
                      <span>{isVi ? "Mở Classroom" : "Classroom"}</span>
                      <span>→</span>
                    </a>
                  )}
                </div>
              </div>

              {/* List of Pending Homework Tasks */}
              <div className="mt-3.5 space-y-2">
                {pendingHomeworks.slice(0, 4).map((hw, idx) => {
                  const isLate = hw.late || (hw.dueDate && new Date(hw.dueDate) < new Date());
                  return (
                    <div
                      key={hw.submissionId || hw.courseWorkId || idx}
                      className="p-3 bg-white/90 rounded-xl border border-black/5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
                    >
                      <div className="flex items-center gap-2.5">
                        <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${isLate ? "bg-rose-500 animate-pulse" : "bg-amber-500"}`}></span>
                        <div>
                          <div className="font-bold text-slate-900 line-clamp-1">{hw.title}</div>
                          <div className="text-[11px] text-slate-500 flex items-center gap-2 mt-0.5">
                            <span>📅 {isVi ? "Hạn nộp" : "Due"}: <strong className="font-mono text-slate-700">{hw.dueDate || "Không giới hạn"}</strong></span>
                            <span>&bull;</span>
                            <span>🎯 {isVi ? "Thang điểm" : "Max"}: {hw.maxPoints || 100}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
                        <span className={`px-2 py-0.5 rounded-md font-heading font-bold text-[10px] uppercase tracking-wider ${
                          isLate
                            ? "bg-rose-100 text-rose-700 border border-rose-200"
                            : "bg-amber-100 text-amber-800 border border-amber-200"
                        }`}>
                          {isLate ? (isVi ? "Quá hạn" : "Overdue") : (isVi ? "Chưa nộp" : "Pending")}
                        </span>

                        <a
                          href={hw.alternateLink || activeClass?.integrations?.googleClassroom?.alternateLink || "https://classroom.google.com"}
                          target="_blank"
                          rel="noreferrer"
                          className="px-2.5 py-1 bg-slate-900 hover:bg-[#c27803] text-white rounded-lg text-[11px] font-heading font-bold uppercase tracking-wider transition"
                        >
                          {isVi ? "Nộp bài" : "Turn In"} →
                        </a>
                      </div>
                    </div>
                  );
                })}

                {pendingHomeworks.length > 4 && (
                  <div className="text-center pt-1">
                    <button
                      type="button"
                      onClick={() => setActiveTab("classroom_grades")}
                      className="text-xs font-heading font-bold uppercase tracking-wider text-[#c27803] hover:underline"
                    >
                      {isVi ? `Xem thêm ${pendingHomeworks.length - 4} bài tập khác →` : `View ${pendingHomeworks.length - 4} more tasks →`}
                    </button>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="p-3.5 bg-emerald-50/80 border border-emerald-200 rounded-2xl flex items-center justify-between text-xs text-emerald-900 shadow-2xs">
              <div className="flex items-center gap-2">
                <span className="text-base">🎉</span>
                <span>
                  <strong>{isVi ? "Rất tốt!" : "Great job!"}</strong>{" "}
                  {isVi ? "Bạn đã nộp đầy đủ tất cả các bài tập về nhà được giao." : "You have completed all assigned coursework."}
                </span>
              </div>
              <button
                type="button"
                onClick={handleManualSyncClassroom}
                disabled={syncingClassroom}
                className="text-[11px] font-bold text-emerald-700 hover:underline flex items-center gap-1"
              >
                <span className={syncingClassroom ? "animate-spin" : ""}>🔄</span>
                <span>{isVi ? "Đồng bộ điểm" : "Sync grades"}</span>
              </button>
            </div>
          )}

          {/* 2. CLEVER COURSE STATS OVERVIEW CARDS */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Attendance Rate */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs hover:shadow-md transition-shadow flex items-center justify-between">
              <div>
                <span className="text-[11px] font-heading font-bold text-slate-500 uppercase tracking-wider">
                  {t("attendanceRate")}
                </span>
                <div className="text-2xl font-heading font-extrabold text-slate-900 mt-1">{attendanceRate}%</div>
                <span className="text-[11px] text-slate-400 font-medium">
                  {presentCount} / {totalSessions} {t("sessionsAttended")}
                </span>
              </div>
              <div className="w-12 h-12 rounded-xl bg-[#20b2aa]/10 text-[#20b2aa] flex items-center justify-center text-xl font-bold shadow-2xs">
                📅
              </div>
            </div>

            {/* Latest Test Score */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs hover:shadow-md transition-shadow flex items-center justify-between">
              <div>
                <span className="text-[11px] font-heading font-bold text-slate-500 uppercase tracking-wider">
                  {t("latestTestResult")}
                </span>
                <div className="text-2xl font-heading font-extrabold text-[#c27803] mt-1">
                  {latestScore ? latestScore.totalScore : "N/A"}
                </div>
                <span className="text-[11px] text-slate-400 font-medium">
                  {latestScore ? latestScore.testTitle : t("noTestsCompleted")}
                </span>
              </div>
              <div className="w-12 h-12 rounded-xl bg-[#c27803]/10 text-[#c27803] flex items-center justify-center text-xl font-bold shadow-2xs">
                🎯
              </div>
            </div>

            {/* Tuition Status */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs hover:shadow-md transition-shadow flex items-center justify-between">
              <div>
                <div className="flex items-center gap-1.5 mb-1">
                  <span className="text-[11px] font-heading font-bold text-slate-500 uppercase tracking-wider">
                    {t("tuitionBalance")}
                  </span>
                  {tuition?.tuitionStatus === "installment" ? (
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200 uppercase">
                      {isVi ? "Trả góp" : "Installment"}
                    </span>
                  ) : debt > 0 || tuition?.tuitionStatus === "debt" ? (
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200 uppercase">
                      {isVi ? "Còn nợ" : "Debt"}
                    </span>
                  ) : (
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 uppercase">
                      {isVi ? "Đã hoàn tất" : "Settled"}
                    </span>
                  )}
                </div>
                <div
                  className={`text-2xl font-heading font-extrabold ${
                    debt > 0 ? "text-rose-600" : "text-emerald-600"
                  }`}
                >
                  {debt > 0 ? `${debt.toLocaleString("vi-VN")} ₫` : t("fullySettled")}
                </div>
                {debt > 0 ? (
                  <div className="flex items-center gap-2 mt-0.5">
                    <button
                      onClick={() => setShowQrModal(true)}
                      className="text-[11px] text-[#c27803] hover:text-[#b45309] font-heading font-bold uppercase tracking-wider underline"
                    >
                      {t("payViaVietQr")} →
                    </button>
                    {tuition?.paidAmount > 0 && (
                      <span className="text-[10px] text-slate-400">
                        ({isVi ? "Đã đóng" : "Paid"}: {tuition.paidAmount.toLocaleString("vi-VN")} ₫)
                      </span>
                    )}
                  </div>
                ) : (
                  <span className="text-[11px] text-slate-400 font-medium">{t("receiptsCleared")}</span>
                )}
              </div>
              <div className="w-12 h-12 rounded-xl bg-[#f59e0b]/10 text-[#f59e0b] flex items-center justify-center text-xl font-bold shadow-2xs">
                💳
              </div>
            </div>
          </div>

          {/* 3. RADAR CHART & SKILL BREAKDOWN */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-base font-bold text-slate-900">{t("skillRadar")}</h3>
                    <p className="text-xs text-slate-500">
                      {latestScore
                        ? `${latestScore.testType} - ${latestScore.testTitle}`
                        : t("skillMapping")}
                    </p>
                  </div>
                  {latestScore && (
                    <span className="px-2.5 py-1 bg-amber-50 border border-amber-200 text-[#c27803] text-xs font-bold rounded-lg font-mono">
                      {t("scoreBadge")}: {latestScore.totalScore}
                      {latestScore.config?.totalScore ? ` / ${latestScore.config.totalScore}` : ""}
                      {radarData["Tổng kết (Overall)"] !== undefined
                        ? ` (${radarData["Tổng kết (Overall)"]}%)`
                        : latestScore.config?.totalScore
                        ? ` (${Math.round((latestScore.totalScore / latestScore.config.totalScore) * 100)}%)`
                        : ""}
                    </span>
                  )}
                </div>

                <RadarChart
                  normalizedData={radarData}
                  rawData={rawSkills}
                  testType={latestScore?.testType || "IELTS"}
                  size={300}
                />
              </div>

              {latestScore?.feedback && (
                <div className="mt-4 p-3 bg-indigo-50/70 border border-indigo-100 rounded-xl text-xs text-indigo-900">
                  <span className="font-bold">{t("instructorFeedback")} </span>
                  {latestScore.feedback}
                </div>
              )}
            </div>

            {/* Tuition & VietQR Preview Panel */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <h3 className="text-base font-bold text-slate-900">{t("tuitionOverview")}</h3>
                  {tuition?.tuitionStatus === "installment" ? (
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
                      💳 {isVi ? "Thanh toán trả góp" : "Installment Plan"}
                    </span>
                  ) : debt > 0 || tuition?.tuitionStatus === "debt" ? (
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200">
                      ⚠️ {isVi ? "Còn nợ học phí" : "Outstanding Tuition"}
                    </span>
                  ) : (
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                      ✓ {isVi ? "Đã hoàn tất 100%" : "Fully Settled"}
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-500 mb-4">
                  {t("vietQrDesc")}
                </p>

                {tuition?.installmentNote && (
                  <div className="p-2.5 mb-3 bg-amber-50/70 border border-amber-200/80 rounded-xl text-xs text-amber-900 flex items-start gap-2">
                    <span className="shrink-0 text-sm">🗓️</span>
                    <div>
                      <span className="font-bold">{isVi ? "Kế hoạch / Ghi chú:" : "Schedule / Note:"}</span>{" "}
                      {tuition.installmentNote}
                    </div>
                  </div>
                )}

                <div className="space-y-3 mb-6">
                  <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl text-xs">
                    <span className="text-slate-500 font-medium">{t("totalCourseFee")}</span>
                    <span className="font-bold text-slate-800">
                      {(
                        tuition?.finalAmount ||
                        tuition?.totalAmount ||
                        activeClass?.tuitionFee ||
                        0
                      ).toLocaleString("vi-VN")}{" "}
                      ₫
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-emerald-50 rounded-xl text-xs">
                    <span className="text-emerald-700 font-medium">{t("amountPaid")}</span>
                    <span className="font-bold text-emerald-700">
                      {(tuition?.paidAmount || 0).toLocaleString("vi-VN")} ₫
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-rose-50 rounded-xl text-xs">
                    <span className="text-rose-700 font-medium">
                      {tuition?.tuitionStatus === "installment"
                        ? isVi
                          ? "Số tiền còn lại cần trả"
                          : "Remaining Installment Due"
                        : t("remainingDebt")}
                    </span>
                    <span className="font-bold text-rose-700">
                      {debt.toLocaleString("vi-VN")} ₫
                    </span>
                  </div>
                </div>
              </div>

              {debt > 0 ? (
                <div className="p-4 bg-gradient-to-br from-indigo-50 to-violet-50 rounded-2xl border border-indigo-100 text-center">
                  <p className="text-xs font-semibold text-slate-700 mb-3">
                    {t("scanToPayPrompt")}
                  </p>
                  <button
                    onClick={() => setShowQrModal(true)}
                    className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-md shadow-indigo-600/30 transition flex items-center justify-center gap-2"
                  >
                    <span>📱</span>
                    <span>{t("openQrPayment")}</span>
                  </button>
                  <div className="mt-3 pt-3 border-t border-indigo-100/80 flex flex-col sm:flex-row items-center justify-between text-[11px] text-slate-500 gap-1.5">
                    <span>
                      {isVi ? "Hỗ trợ học phí & đối soát:" : "Tuition support & receipt:"}
                    </span>
                    <a
                      href={`tel:${cleanCenterHotline}`}
                      className="font-bold text-[#c27803] hover:underline"
                    >
                      Hotline: {centerHotline}
                    </a>
                  </div>
                </div>
              ) : (
                <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-100 text-center space-y-1">
                  <p className="text-xs font-semibold text-emerald-800">
                    {t("tuitionClearedNotice")}
                  </p>
                  <p className="text-[11px] text-emerald-700/80">
                    {isVi ? `Mọi thắc mắc vui lòng liên hệ Hotline: ${centerHotline}` : `For inquiries, contact Hotline: ${centerHotline}`}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* 4. SCORE & ATTENDANCE HISTORY TABLES */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Score History */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="p-5 border-b border-slate-100 flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h3 className="text-base font-bold text-slate-900">{t("scoreHistory")}</h3>
                  <p className="text-xs text-slate-500">{t("scoreHistoryDesc")}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveTab("classroom_grades")}
                  className="px-3 py-1.5 bg-[#c27803]/10 hover:bg-[#c27803] text-[#c27803] hover:text-white rounded-xl text-xs font-heading font-bold uppercase tracking-wider border border-[#c27803]/20 transition flex items-center gap-1.5 cursor-pointer"
                >
                  <span>📝</span>
                  <span>{isVi ? "Điểm Classroom" : "Classroom Grades"} →</span>
                </button>
              </div>
              {scores.length === 0 ? (
                <div className="py-12 text-center text-xs text-slate-400">{t("noScoresYet")}</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-slate-600">
                    <thead className="bg-slate-50 text-[11px] font-bold text-slate-500 uppercase">
                      <tr>
                        <th className="py-3 px-4">{t("colDate")}</th>
                        <th className="py-3 px-4">{t("colTitle")}</th>
                        <th className="py-3 px-4 text-center">{t("colType")}</th>
                        <th className="py-3 px-4 text-right">{t("colScore")}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {scores.map((sc) => (
                        <tr key={sc.scoreId} className="hover:bg-slate-50/60">
                          <td className="py-3 px-4 font-mono text-slate-500">{sc.testDate}</td>
                          <td className="py-3 px-4 font-semibold text-slate-800">{sc.testTitle}</td>
                          <td className="py-3 px-4 text-center">
                            <span className="px-2 py-0.5 rounded bg-slate-100 font-bold text-[10px]">
                              {sc.testType}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right font-bold text-[#c27803]">
                            {sc.totalScore}{sc.config?.totalScore ? ` / ${sc.config.totalScore}` : ""}
                            {sc.normalizedRadarScales?.["Tổng kết (Overall)"] !== undefined
                              ? ` (${sc.normalizedRadarScales["Tổng kết (Overall)"]}%)`
                              : sc.config?.totalScore
                              ? ` (${Math.round((sc.totalScore / sc.config.totalScore) * 100)}%)`
                              : ""}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Attendance History */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="p-5 border-b border-slate-100">
                <h3 className="text-base font-bold text-slate-900">{t("attendanceLog")}</h3>
                <p className="text-xs text-slate-500">{t("attendanceLogDesc")}</p>
              </div>
              {attendanceLogs.length === 0 ? (
                <div className="py-12 text-center text-xs text-slate-400">
                  {t("noAttendanceYet")}
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-slate-600">
                    <thead className="bg-slate-50 text-[11px] font-bold text-slate-500 uppercase">
                      <tr>
                        <th className="py-3 px-4">{t("colSessionDate")}</th>
                        <th className="py-3 px-4">{t("colStatus")}</th>
                        <th className="py-3 px-4">{t("colNote")}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {attendanceLogs.map((log, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/60">
                          <td className="py-3 px-4 font-mono text-slate-500">{log.date}</td>
                          <td className="py-3 px-4">
                            {renderStatusBadge(log.status)}
                          </td>
                          <td className="py-3 px-4 text-slate-400 italic">
                            {log.note || "--"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>

          {/* VietQR Payment Modal */}
          {showQrModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
              <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-slate-100 text-center animate-scaleUp">
                <h3 className="text-lg font-bold text-slate-900 mb-1">
                  {t("vietQrModalTitle")}
                </h3>
                <p className="text-xs text-slate-500 mb-4">
                  {t("vietQrModalDesc")}
                </p>

                <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl inline-block mb-4 shadow-inner">
                  <img
                    src={vietQrUrl}
                    alt="VietQR Payment"
                    className="w-64 h-64 object-contain mx-auto rounded-xl"
                  />
                </div>

                <div className="text-xs text-slate-600 space-y-1.5 mb-5 text-left bg-slate-50 p-3.5 rounded-2xl border border-slate-100">
                  <div className="flex justify-between">
                    <span className="text-slate-400">{t("qrAmount")}</span>
                    <span className="font-bold text-rose-600">
                      {debt.toLocaleString("vi-VN")} ₫
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">{t("qrBank")}</span>
                    <span className="font-medium text-slate-800">
                      {bankingConfig?.bankId || VIETQR_CONFIG.bankId}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">{t("qrAccount")}</span>
                    <span className="font-mono font-semibold text-slate-800">
                      {bankingConfig?.accountNo || VIETQR_CONFIG.accountNo}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">{t("qrBeneficiary")}</span>
                    <span className="font-medium text-slate-800">
                      {bankingConfig?.accountName || VIETQR_CONFIG.accountName}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">{t("qrNote")}</span>
                    <span className="font-mono text-indigo-600 font-semibold">
                      {rawTransferDesc}
                    </span>
                  </div>
                </div>

                {/* Center Support Contact Notice in Modal */}
                <div className="p-3 bg-amber-50/80 border border-amber-200/80 rounded-2xl text-[11px] text-left text-amber-900 space-y-1 mb-4 shadow-xs">
                  <div className="flex items-center gap-1.5 font-bold text-amber-950">
                    <span>📞</span>
                    <span>{isVi ? "Hỗ trợ đối soát & xác nhận học phí:" : "Payment verification support:"}</span>
                  </div>
                  <p className="text-amber-800">
                    {centerName} &bull; Hotline:{" "}
                    <a href={`tel:${cleanCenterHotline}`} className="font-bold underline text-amber-950">
                      {centerHotline}
                    </a>
                  </p>
                  <p className="text-amber-800 truncate">
                    Email:{" "}
                    <a href={`mailto:${centerEmail}`} className="underline text-amber-950">
                      {centerEmail}
                    </a>
                  </p>
                </div>

                <button
                  onClick={() => setShowQrModal(false)}
                  className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition"
                >
                  {t("close")}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default StudentDashboard;
