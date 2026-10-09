import React, { useState, useEffect } from "react";
import { useAuth } from "../../context/AuthContext";
import { useLanguage } from "../../context/LanguageContext";
import { doc, getDoc, collection, query, where, getDocs } from "firebase/firestore";
import { db } from "../../config/firebase";
import { RadarChart } from "../../components/charts/RadarChart";
import { getStudentScores } from "../../services/scoreService";
import { VIETQR_CONFIG, buildVietQrUrl } from "../../config/vietqr";
import { useSettings } from "../../context/SettingsContext";
import { DEFAULT_CENTER_CONFIG } from "../../services/settingsService";
import { StudentMaterialsTab } from "../../components/student/StudentMaterialsTab";
import { StudentClassroomGradesTab } from "../../components/student/StudentClassroomGradesTab";
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
          const q = query(
            collection(db, "students"),
            where("email", "==", currentUser.email.toLowerCase().trim())
          );
          const snap = await getDocs(q);
          if (!snap.empty) {
            studentData = { studentId: snap.docs[0].id, ...snap.docs[0].data() };
            studentId = studentData.studentId;
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
      } catch (err) {
        console.error("Error switching student class:", err);
      }
    }
  };

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
  const radarData = latestScore?.normalizedRadarScales || {};
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
                ? "bg-[#00b4d8] text-white shadow-sm"
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
                ? "bg-[#00b4d8] text-white shadow-sm"
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
                ? "bg-[#00b4d8] text-white shadow-sm"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
            }`}
          >
            <span>📁</span>
            <span>{t("tabMaterials")}</span>
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
              className="py-1.5 px-3 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 shadow-2xs focus:outline-none focus:ring-2 focus:ring-[#00b4d8]/20 focus:border-[#00b4d8]"
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
      {activeTab === "materials" ? (
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
          <div className="bg-gradient-to-r from-[#1e2738] via-[#161c28] to-[#1e2738] border border-[#2a354b] rounded-2xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
            <div className="absolute top-0 right-0 -mr-16 -mt-16 w-72 h-72 bg-[#00b4d8]/15 rounded-full blur-3xl pointer-events-none"></div>

            <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="space-y-2.5">
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded font-heading font-bold text-[11px] uppercase tracking-wider bg-[#00b4d8] text-white shadow-2xs">
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
                  <span className="text-[#00b4d8] font-bold">
                    {activeClass?.teacherName || "Assigned Instructor"}
                  </span>{" "}
                  &bull; ⏰ {t("weeklySchedule")}: <span className="text-white font-medium">{activeClass?.schedule || "Weekly Schedule"}</span>
                </p>
              </div>

              {/* Quick Launch Buttons */}
              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={() => setActiveTab("classroom_grades")}
                  className="inline-flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white rounded-xl text-xs font-heading font-bold uppercase tracking-wider shadow-lg shadow-amber-500/20 transition active:translate-y-px cursor-pointer"
                >
                  <span>📝</span>
                  <span>{isVi ? "Điểm Classroom" : "Classroom Grades"}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab("materials")}
                  className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#00b4d8] hover:bg-[#0096c7] text-white rounded-xl text-xs font-heading font-bold uppercase tracking-wider shadow-lg shadow-cyan-500/20 transition active:translate-y-px"
                >
                  <span>📂</span>
                  <span>{t("tabMaterials")}</span>
                </button>

                {activeClass?.integrations?.googleClassroom?.alternateLink && (
                  <a
                    href={activeClass.integrations.googleClassroom.alternateLink}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#20b2aa] hover:bg-[#1a938c] text-white rounded-xl text-xs font-heading font-bold uppercase tracking-wider shadow-lg shadow-teal-500/20 transition active:translate-y-px"
                  >
                    <span>🏫</span>
                    <span>Classroom</span>
                  </a>
                )}

                {activeClass?.integrations?.googleDrive?.folderLink && (
                  <a
                    href={activeClass.integrations.googleDrive.folderLink}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-2.5 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-heading font-semibold uppercase tracking-wider backdrop-blur-md border border-white/15 transition"
                  >
                    <span>📁</span>
                    <span>Drive</span>
                  </a>
                )}
              </div>
            </div>
          </div>

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
                <div className="text-2xl font-heading font-extrabold text-[#00b4d8] mt-1">
                  {latestScore ? latestScore.totalScore : "N/A"}
                </div>
                <span className="text-[11px] text-slate-400 font-medium">
                  {latestScore ? latestScore.testTitle : t("noTestsCompleted")}
                </span>
              </div>
              <div className="w-12 h-12 rounded-xl bg-[#00b4d8]/10 text-[#00b4d8] flex items-center justify-center text-xl font-bold shadow-2xs">
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
                      className="text-[11px] text-[#00b4d8] hover:text-[#0077b6] font-heading font-bold uppercase tracking-wider underline"
                    >
                      {t("payViaVietQr")} &rarr;
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
                    <span className="px-2.5 py-1 bg-indigo-50 border border-indigo-100 text-indigo-700 text-xs font-bold rounded-lg font-mono">
                      {t("scoreBadge")}: {latestScore.totalScore}
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
                      className="font-bold text-[#00b4d8] hover:underline"
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
                  className="px-3 py-1.5 bg-[#00b4d8]/10 hover:bg-[#00b4d8] text-[#00b4d8] hover:text-white rounded-xl text-xs font-heading font-bold uppercase tracking-wider border border-[#00b4d8]/20 transition flex items-center gap-1.5 cursor-pointer"
                >
                  <span>📝</span>
                  <span>{isVi ? "Điểm Classroom" : "Classroom Grades"} &rarr;</span>
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
                          <td className="py-3 px-4 text-right font-bold text-indigo-600">
                            {sc.totalScore}
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
