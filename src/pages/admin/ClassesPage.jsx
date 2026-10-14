import React, { useState, useEffect } from "react";
import { subscribeClasses, createClass, updateClass, deleteClass } from "../../services/classService";
import { subscribeTeachingShifts, saveTeachingShifts, DEFAULT_SHIFTS } from "../../services/settingsService";
import { subscribeStudents } from "../../services/studentService";
import { SendClassEmailModal } from "../../components/common/SendClassEmailModal";
import { ClassDriveMaterialsModal } from "../../components/admin/ClassDriveMaterialsModal";
import { useLanguage } from "../../context/LanguageContext";

import {
  parseClassSchedule,
  composeScheduleString,
  isClassInShift,
  isClassOnDate,
  getLocalDateString,
  sortClassesByTime,
} from "../../utils/scheduleUtils";
import { checkClassRevenueHealth, PROFIT_GUARDRAILS } from "../../constants/pricingPolicy";

export const ClassesPage = () => {
  const { t, lang } = useLanguage();
  const isVi = lang === "vi";

  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [editingClass, setEditingClass] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");

  // Center Teaching Shifts Configuration State
  const [shifts, setShifts] = useState(DEFAULT_SHIFTS);
  const [showShiftsModal, setShowShiftsModal] = useState(false);
  const [editingShifts, setEditingShifts] = useState(DEFAULT_SHIFTS);
  const [savingShifts, setSavingShifts] = useState(false);

  // Form Schedule Helper State
  const [selectedShiftId, setSelectedShiftId] = useState("");
  const [selectedDays, setSelectedDays] = useState(["mon", "wed", "fri"]);
  const [customScheduleMode, setCustomScheduleMode] = useState(false);

  // VIEW MODE: "default" | "weekly" | "monthly" | "hourly"
  const [viewMode, setViewMode] = useState("default");

  // Monthly calendar state (current viewed date)
  const [calendarDate, setCalendarDate] = useState(new Date());

  const [formData, setFormData] = useState({
    code: "",
    name: "",
    courseType: "TOEIC",
    teacherName: "",
    startDate: "",
    endDate: "",
    schedule: "Mon - Wed - Fri (18:00 - 20:00)",
    tuitionFee: "4500000",
    status: "in_progress",
    autoCreateClassroom: true,
  });

  const [allStudents, setAllStudents] = useState([]);
  const [emailModalClass, setEmailModalClass] = useState(null);
  const [driveModalClass, setDriveModalClass] = useState(null);

  useEffect(() => {
    const unsubClasses = subscribeClasses((data) => {
      setClasses(data);
      setLoading(false);
    });

    const unsubShifts = subscribeTeachingShifts((data) => {
      if (data && data.length > 0) {
        setShifts(data);
        setEditingShifts(data);
      }
    });

    const unsubStudents = subscribeStudents((data) => {
      setAllStudents(data);
    });

    return () => {
      unsubClasses();
      unsubShifts();
      unsubStudents();
    };
  }, []);

  const openCreateModal = () => {
    setEditingClass(null);
    const defaultShift = shifts.length > 0 ? shifts[0] : DEFAULT_SHIFTS[0];
    const initialDays = ["mon", "wed", "fri"];
    const initialSchedule = composeScheduleString(initialDays, defaultShift, lang === "vi");

    setSelectedShiftId(defaultShift.id);
    setSelectedDays(initialDays);
    setCustomScheduleMode(false);

    setFormData({
      code: "",
      name: "",
      courseType: "TOEIC",
      teacherName: "",
      startDate: getLocalDateString(),
      endDate: "",
      schedule: initialSchedule,
      tuitionFee: "4500000",
      status: "in_progress",
      autoCreateClassroom: true,
    });
    setShowModal(true);
  };

  const openEditModal = (cls) => {
    setEditingClass(cls);
    const parsed = parseClassSchedule(cls.schedule);

    // Try finding matched shift
    const matchedShift = shifts.find((s) => s.startTime === parsed.startTime) || shifts[0];
    const matchedDays = Object.keys(parsed.days).filter((k) => parsed.days[k]);

    setSelectedShiftId(matchedShift?.id || (shifts[0]?.id || ""));
    setSelectedDays(matchedDays.length > 0 ? matchedDays : ["mon", "wed", "fri"]);
    setCustomScheduleMode(false);

    setFormData({
      code: cls.code || "",
      name: cls.name || "",
      courseType: cls.courseType || "TOEIC",
      teacherName: cls.teacherName || "",
      startDate: cls.startDate || "",
      endDate: cls.endDate || "",
      schedule: cls.schedule || "",
      tuitionFee: cls.tuitionFee?.toString() || "0",
      status: cls.status || "in_progress",
      autoCreateClassroom: false,
    });
    setShowModal(true);
  };

  const handleShiftChange = (shiftId) => {
    setSelectedShiftId(shiftId);
    const chosen = shifts.find((s) => s.id === shiftId);
    if (chosen && !customScheduleMode) {
      const newSched = composeScheduleString(selectedDays, chosen, lang === "vi");
      setFormData((prev) => ({ ...prev, schedule: newSched }));
    }
  };

  const handleToggleDay = (dayKey) => {
    const nextDays = selectedDays.includes(dayKey)
      ? selectedDays.filter((d) => d !== dayKey)
      : [...selectedDays, dayKey];
    setSelectedDays(nextDays);
    const chosen = shifts.find((s) => s.id === selectedShiftId) || shifts[0];
    if (!customScheduleMode) {
      const newSched = composeScheduleString(nextDays, chosen, lang === "vi");
      setFormData((prev) => ({ ...prev, schedule: newSched }));
    }
  };

  const handleApplyPreset = (presetDays) => {
    setSelectedDays(presetDays);
    const chosen = shifts.find((s) => s.id === selectedShiftId) || shifts[0];
    if (!customScheduleMode) {
      const newSched = composeScheduleString(presetDays, chosen, lang === "vi");
      setFormData((prev) => ({ ...prev, schedule: newSched }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (editingClass) {
        await updateClass(editingClass.classId, {
          name: formData.name,
          courseType: formData.courseType,
          teacherName: formData.teacherName,
          startDate: formData.startDate,
          endDate: formData.endDate,
          schedule: formData.schedule,
          tuitionFee: Number(formData.tuitionFee) || 0,
          status: formData.status,
        });
      } else {
        await createClass(
          {
            code: formData.code,
            name: formData.name,
            courseType: formData.courseType,
            teacherName: formData.teacherName,
            startDate: formData.startDate,
            endDate: formData.endDate,
            schedule: formData.schedule,
            tuitionFee: Number(formData.tuitionFee) || 0,
            status: formData.status,
          },
          formData.autoCreateClassroom
        );
      }
      setShowModal(false);
    } catch (err) {
      alert("Failed to save class: " + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (classId, className) => {
    if (window.confirm(`Are you sure you want to delete class "${className}"?`)) {
      try {
        await deleteClass(classId);
      } catch (err) {
        alert("Failed to delete class: " + err.message);
      }
    }
  };

  const filteredClasses = classes.filter((c) => {
    const matchesSearch =
      c.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.code?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.teacherName?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = typeFilter === "all" || c.courseType === typeFilter;
    return matchesSearch && matchesType;
  });

  // Days list for weekly view
  const weeklyDays = [
    { key: "mon", label: t("dayMon") },
    { key: "tue", label: t("dayTue") },
    { key: "wed", label: t("dayWed") },
    { key: "thu", label: t("dayThu") },
    { key: "fri", label: t("dayFri") },
    { key: "sat", label: t("daySat") },
    { key: "sun", label: t("daySun") },
  ];

  // Helper for monthly calendar generation
  const year = calendarDate.getFullYear();
  const month = calendarDate.getMonth();
  const firstDayOfMonth = new Date(year, month, 1).getDay(); // 0 = Sun
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const adjustedFirstDay = (firstDayOfMonth + 6) % 7; // 0 = Mon, 6 = Sun

  const prevMonth = () => setCalendarDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCalendarDate(new Date(year, month + 1, 1));
  const resetToToday = () => setCalendarDate(new Date());

  return (
    <div className="space-y-6">
      {/* View Mode Switcher & Top Action Bar */}
      <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
        {/* 4 View Options Segmented Tabs */}
        <div className="inline-flex p-1 bg-white border border-slate-200/90 rounded-2xl shadow-2xs text-xs font-semibold overflow-x-auto max-w-full">
          <button
            type="button"
            onClick={() => setViewMode("default")}
            className={`py-2 px-3.5 rounded-xl transition flex items-center gap-1.5 whitespace-nowrap font-heading text-xs uppercase tracking-wider ${
              viewMode === "default"
                ? "bg-[#00b4d8] text-white shadow-sm font-bold"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
            }`}
          >
            <span>🔲</span>
            <span>{t("viewDefault")}</span>
          </button>

          <button
            type="button"
            onClick={() => setViewMode("weekly")}
            className={`py-2 px-3.5 rounded-xl transition flex items-center gap-1.5 whitespace-nowrap font-heading text-xs uppercase tracking-wider ${
              viewMode === "weekly"
                ? "bg-[#00b4d8] text-white shadow-sm font-bold"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
            }`}
          >
            <span>📅</span>
            <span>{t("viewWeekly")}</span>
          </button>

          <button
            type="button"
            onClick={() => setViewMode("monthly")}
            className={`py-2 px-3.5 rounded-xl transition flex items-center gap-1.5 whitespace-nowrap font-heading text-xs uppercase tracking-wider ${
              viewMode === "monthly"
                ? "bg-[#00b4d8] text-white shadow-sm font-bold"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
            }`}
          >
            <span>🗓️</span>
            <span>{t("viewMonthly")}</span>
          </button>

          <button
            type="button"
            onClick={() => setViewMode("hourly")}
            className={`py-2 px-3.5 rounded-xl transition flex items-center gap-1.5 whitespace-nowrap font-heading text-xs uppercase tracking-wider ${
              viewMode === "hourly"
                ? "bg-[#00b4d8] text-white shadow-sm font-bold"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
            }`}
          >
            <span>⏰</span>
            <span>{t("viewHourly")}</span>
          </button>
        </div>

        {/* Search & New Class CTA */}
        <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
          <div className="relative flex-1 sm:w-60">
            <input
              type="text"
              placeholder={t("searchClasses")}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3.5 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
            />
            <svg
              className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>

          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="py-2 px-3 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-700"
          >
            <option value="all">{t("allCourses")}</option>
            <option value="TOEIC">TOEIC</option>
            <option value="IELTS">IELTS</option>
            <option value="APTIS">APTIS</option>
          </select>

          <button
            type="button"
            onClick={() => {
              setEditingShifts(shifts);
              setShowShiftsModal(true);
            }}
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-xl text-xs font-bold shadow-sm transition"
            title={t("manageShifts")}
          >
            <span>⚙️</span>
            <span>{t("manageShifts")}</span>
          </button>

          <button
            onClick={openCreateModal}
            className="inline-flex items-center gap-2 px-4 py-2 bg-[#00b4d8] hover:bg-[#0096c7] text-white rounded-xl text-xs font-heading font-bold uppercase tracking-wider shadow-sm transition active:translate-y-px"
          >
            <span>+</span>
            <span>{t("newClass")}</span>
          </button>
        </div>
      </div>

      {loading ? (
        <div className="py-20 text-center text-slate-400">Loading courses...</div>
      ) : filteredClasses.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center">
          <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center mx-auto mb-3 text-xl">
            📚
          </div>
          <h3 className="text-base font-semibold text-slate-800">No classes found</h3>
          <p className="text-xs text-slate-500 mt-1">Get started by creating your first course.</p>
        </div>
      ) : (
        <>
          {/* Class Revenue Health Standard Ribbon (Kiểm định Doanh thu >= 500.000đ/buổi) */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-2xs flex flex-wrap items-center justify-between gap-3 text-xs mb-5">
            <div className="flex items-center gap-2.5">
              <span className="p-2 bg-[#00b4d8]/10 text-[#00b4d8] rounded-xl text-base font-bold shadow-2xs">
                📈
              </span>
              <div>
                <span className="font-heading font-extrabold text-slate-800 uppercase tracking-wide block">
                  {isVi ? "Chuẩn kiểm định Doanh thu Lớp học (Phương án B)" : "Class Revenue Health Benchmark"}
                </span>
                <span className="text-slate-500 text-[11px]">
                  {isVi
                    ? "Mục tiêu 8-10 học viên/lớp & Doanh thu thực thu >= 500.000 ₫/buổi (bảo toàn đơn giá sàn 56k/b)"
                    : "Standard: 8-10 students, Revenue >= 500k VND/session"}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                <span>
                  {classes.filter((c) => checkClassRevenueHealth(allStudents.filter((s) => s.currentClassIds?.includes(c.classId))).isHealthy).length}{" "}
                  {isVi ? "Đạt chuẩn (>= 500k)" : "Healthy"}
                </span>
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
                <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                <span>
                  {classes.filter((c) => !checkClassRevenueHealth(allStudents.filter((s) => s.currentClassIds?.includes(c.classId))).isHealthy).length}{" "}
                  {isVi ? "Cần tuyển sinh thêm" : "Below target"}
                </span>
              </span>
            </div>
          </div>

          {/* ======================================================== */}
          {/* 1. MẶC ĐỊNH (DEFAULT CARDS GRID VIEW)                    */}
          {/* ======================================================== */}
          {viewMode === "default" && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredClasses.map((cls) => {
                const hasClassroom = Boolean(cls.integrations?.googleClassroom?.alternateLink);
                const hasDrive = Boolean(cls.integrations?.googleDrive?.folderLink);
                const classStudents = allStudents.filter((s) => s.currentClassIds?.includes(cls.classId));
                const revenueHealth = checkClassRevenueHealth(classStudents);

                return (
                  <div
                    key={cls.classId}
                    className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs hover:shadow-lg transition-all duration-300 flex flex-col justify-between overflow-hidden group"
                  >
                    <div>
                      {/* Clever Course Thumbnail / Header Banner */}
                      <div className="h-28 bg-gradient-to-r from-[#1e2738] via-[#253247] to-[#1e2738] p-4 flex flex-col justify-between relative overflow-hidden">
                        <div className="absolute right-0 bottom-0 translate-x-3 translate-y-3 opacity-10 text-6xl select-none pointer-events-none">
                          🎓
                        </div>
                        <div className="flex items-center justify-between gap-2 relative z-10">
                          <div className="flex items-center gap-1.5">
                            <span className="px-2 py-0.5 rounded font-mono font-bold text-[11px] bg-white text-slate-900 shadow-2xs">
                              {cls.code || "COURSE"}
                            </span>
                            <span className="px-2 py-0.5 rounded font-heading font-semibold text-[10px] uppercase tracking-wider bg-white/15 text-slate-200">
                              {cls.courseType || "TOEIC"}
                            </span>
                          </div>

                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-heading font-bold uppercase tracking-wider ${
                              cls.status === "in_progress"
                                ? "bg-emerald-500/90 text-white"
                                : cls.status === "completed"
                                ? "bg-slate-500 text-white"
                                : "bg-[#f59e0b] text-white"
                            }`}
                          >
                            {cls.status === "in_progress" ? t("statusInProgress") : cls.status === "completed" ? t("statusCompleted") : t("statusPlanned")}
                          </span>
                        </div>

                        {/* Clever Course Floating Price Badge */}
                        <div className="flex items-center justify-between relative z-10 pt-1">
                          <span className="text-[11px] text-slate-300 font-medium truncate max-w-[150px]">
                            {cls.schedule?.split("(")[0] || "Lịch học"}
                          </span>
                          <span className="px-2.5 py-1 rounded-md text-xs font-heading font-bold text-white shadow-md bg-[#00b4d8]">
                            {Number(cls.tuitionFee || 0).toLocaleString("vi-VN")} ₫
                          </span>
                        </div>
                      </div>

                      {/* Content Area */}
                      <div className="p-5 pb-3">
                        <h3 className="font-heading font-extrabold text-slate-900 text-base mb-1 line-clamp-2 group-hover:text-[#00b4d8] transition-colors">
                          {cls.name}
                        </h3>
                        <p className="text-xs text-slate-500 mb-4 flex items-center gap-1.5">
                          <span>👨‍🏫</span>
                          <span>{t("teacher")}:</span>
                          <span className="font-semibold text-slate-700">{cls.teacherName || "Unassigned"}</span>
                        </p>

                        <div className="space-y-2 text-xs text-slate-600 border-t border-slate-100 pt-3">
                          <div className="flex items-center justify-between">
                            <span className="text-slate-400">⏰ {t("schedule")}:</span>
                            <span className="font-semibold text-slate-800 truncate max-w-[190px]">{cls.schedule || "TBD"}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-slate-400">📅 {t("duration")}:</span>
                            <span className="font-medium text-slate-700">
                              {cls.startDate || "?"} &rarr; {cls.endDate || "Ongoing"}
                            </span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-slate-400">👥 {t("enrolled")}:</span>
                            <span className="font-heading font-bold text-[#00b4d8]">{cls.studentCount || 0} students</span>
                          </div>

                          {/* Class Revenue Health Metric Badge */}
                          <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                            <span className="text-slate-400 font-medium">💰 {isVi ? "Doanh thu/buổi:" : "Rev/session:"}</span>
                            {revenueHealth.isHealthy ? (
                              <span
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-heading font-bold bg-emerald-50 text-emerald-700 border border-emerald-200"
                                title={`Đạt chuẩn lợi nhuận (>= 500.000đ/buổi). Thực tế: ${revenueHealth.sessionRevenue.toLocaleString("vi-VN")} ₫/buổi với ${revenueHealth.studentCount} học viên`}
                              >
                                <span>✓</span>
                                <span>{revenueHealth.sessionRevenue.toLocaleString("vi-VN")} ₫/buổi</span>
                                <span className="text-[10px] opacity-75">({isVi ? "Đạt chuẩn" : "Healthy"})</span>
                              </span>
                            ) : (
                              <span
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-heading font-bold bg-amber-50 text-amber-700 border border-amber-200"
                                title={`Chưa đạt mốc 500.000đ/buổi. Thực tế: ${revenueHealth.sessionRevenue.toLocaleString("vi-VN")} ₫/buổi (Cần thêm học viên)`}
                              >
                                <span>⚠️</span>
                                <span>{revenueHealth.sessionRevenue.toLocaleString("vi-VN")} ₫/buổi</span>
                                <span className="text-[10px] opacity-75">({isVi ? "< 500k" : "< 500k"})</span>
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="p-5 pt-0">
                      <div className="pt-3 border-t border-slate-100">
                        <div className="flex items-center gap-2 mb-3">
                          {hasClassroom ? (
                            <a
                              href={cls.integrations.googleClassroom.alternateLink}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-[#20b2aa]/10 hover:bg-[#20b2aa] text-[#20b2aa] hover:text-white rounded-lg text-xs font-heading font-bold uppercase tracking-wider border border-[#20b2aa]/20 transition"
                            >
                              <span>🏫</span>
                              <span>Classroom</span>
                            </a>
                          ) : (
                            <span className="text-[11px] text-slate-400 italic">No Classroom</span>
                          )}

                          {hasDrive ? (
                            <div className="inline-flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => setDriveModalClass(cls)}
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-[#00b4d8]/10 hover:bg-[#00b4d8] text-[#00b4d8] hover:text-white font-heading font-bold uppercase tracking-wider rounded-lg text-xs border border-[#00b4d8]/20 transition"
                                title={t("manageClassMaterials")}
                              >
                                <span>📁</span>
                                <span>{isVi ? "Tài liệu & Upload" : "Materials & Upload"}</span>
                              </button>
                              <a
                                href={cls.integrations.googleDrive.folderLink}
                                target="_blank"
                                rel="noreferrer"
                                className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg text-xs border border-slate-200 transition"
                                title={t("openInDriveBtn")}
                              >
                                ↗
                              </a>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setDriveModalClass(cls)}
                              className="inline-flex items-center gap-1 px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg text-xs font-semibold transition"
                              title={t("noDriveFolder")}
                            >
                              <span>📁</span>
                              <span>{isVi ? "Tài liệu" : "Materials"}</span>
                            </button>
                          )}
                        </div>

                        <div className="flex items-center justify-between gap-2">
                          <button
                            type="button"
                            onClick={() => setEmailModalClass(cls)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-heading font-bold uppercase tracking-wider text-[#f59e0b] hover:text-white bg-[#f59e0b]/10 hover:bg-[#f59e0b] border border-[#f59e0b]/20 rounded-lg transition shadow-2xs"
                            title={lang === "vi" ? "Gửi email thông báo & khai giảng cho học viên" : "Send Opening Email"}
                          >
                            <span>✉️</span>
                            <span>{lang === "vi" ? "Gửi Email" : "Send Email"}</span>
                          </button>

                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={() => openEditModal(cls)}
                              className="px-2.5 py-1 text-xs font-semibold text-slate-600 hover:text-[#00b4d8] hover:bg-slate-50 rounded-lg transition"
                            >
                              {t("editClass")}
                            </button>
                            <button
                              onClick={() => handleDelete(cls.classId, cls.name)}
                              className="px-2.5 py-1 text-xs font-semibold text-rose-600 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition"
                            >
                              {t("deleteClass")}
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* ======================================================== */}
          {/* 2. THEO TUẦN (WEEKLY SCHEDULE TIMETABLE MATRIX)          */}
          {/* ======================================================== */}
          {viewMode === "weekly" && (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 overflow-x-auto">
              <div className="grid grid-cols-7 gap-3 min-w-[900px]">
                {weeklyDays.map((day) => {
                  const dayClasses = sortClassesByTime(
                    filteredClasses.filter((c) => {
                      const parsed = parseClassSchedule(c.schedule, `${c.name || ""} ${c.code || ""}`);
                      return parsed.days[day.key];
                    })
                  );

                  return (
                    <div key={day.key} className="flex flex-col bg-slate-50/70 rounded-xl p-3 border border-slate-100 min-h-[360px]">
                      <div className="text-center pb-2.5 border-b border-slate-200/80 mb-3">
                        <span className="text-xs font-extrabold text-slate-800 uppercase tracking-wide">
                          {day.label}
                        </span>
                        <div className="text-[11px] text-slate-400 mt-0.5">
                          {dayClasses.length} lớp học
                        </div>
                      </div>

                      <div className="space-y-2.5 flex-1 overflow-y-auto">
                        {dayClasses.map((cls) => {
                          const parsed = parseClassSchedule(cls.schedule);

                          return (
                            <div
                              key={cls.classId}
                              className="bg-white p-3 rounded-xl border border-slate-200/90 shadow-sm hover:border-indigo-400 transition space-y-1.5"
                            >
                              <div className="flex items-center justify-between">
                                <span className="px-1.5 py-0.5 bg-indigo-50 text-indigo-700 font-mono font-bold text-[10px] rounded">
                                  {cls.code}
                                </span>
                                <span className="text-[10px] font-bold text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded">
                                  {parsed.startTime} - {parsed.endTime}
                                </span>
                              </div>

                              <div className="font-bold text-xs text-slate-900 line-clamp-2">
                                {cls.name}
                              </div>

                              <div className="text-[11px] text-slate-500">
                                👨‍🏫 {cls.teacherName || "N/A"}
                              </div>

                              <div className="flex flex-col gap-1 pt-1">
                                {cls.integrations?.googleClassroom?.alternateLink && (
                                  <a
                                    href={cls.integrations.googleClassroom.alternateLink}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="text-[10px] font-semibold text-emerald-600 hover:underline block"
                                  >
                                    🏫 Mở Classroom &rarr;
                                  </a>
                                )}
                                <button
                                  type="button"
                                  onClick={() => setDriveModalClass(cls)}
                                  className="text-[10px] font-semibold text-blue-600 hover:underline block text-left"
                                >
                                  📁 {isVi ? "Tài liệu & Upload" : "Materials & Upload"} &rarr;
                                </button>
                              </div>
                            </div>
                          );
                        })}

                        {dayClasses.length === 0 && (
                          <div className="h-full flex items-center justify-center text-[11px] text-slate-300 italic">
                            Trống
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* 3. THEO THÁNG (MONTHLY CALENDAR GRID)                    */}
          {/* ======================================================== */}
          {viewMode === "monthly" && (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
              {/* Month Navigation */}
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-3">
                  <h3 className="text-base font-extrabold text-slate-900">
                    {lang === "vi"
                      ? `Tháng ${month + 1} / Năm ${year}`
                      : `${calendarDate.toLocaleString("en-US", { month: "long" })} ${year}`}
                  </h3>
                  <button
                    onClick={resetToToday}
                    className="px-2.5 py-1 text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-semibold transition"
                  >
                    Hôm nay
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={prevMonth}
                    className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold transition"
                  >
                    &larr; Tháng trước
                  </button>
                  <button
                    onClick={nextMonth}
                    className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold transition"
                  >
                    Tháng sau &rarr;
                  </button>
                </div>
              </div>

              {/* Calendar Grid */}
              <div className="grid grid-cols-7 gap-2">
                {/* Header days */}
                {weeklyDays.map((d) => (
                  <div key={d.key} className="text-center py-2 text-xs font-bold text-slate-500 uppercase bg-slate-50 rounded-lg">
                    {d.label}
                  </div>
                ))}

                {/* Empty cells before month start */}
                {Array.from({ length: adjustedFirstDay }).map((_, i) => (
                  <div key={`empty-${i}`} className="min-h-[90px] bg-slate-50/40 rounded-xl border border-transparent"></div>
                ))}

                {/* Days of Month */}
                {Array.from({ length: daysInMonth }).map((_, i) => {
                  const dayNum = i + 1;
                  const dateObj = new Date(year, month, dayNum);
                  const dayOfWeek = (dateObj.getDay() + 6) % 7; // 0 = Mon, ..., 6 = Sun
                  const dayKey = weeklyDays[dayOfWeek].key;
                  const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(dayNum).padStart(2, "0")}`;

                  // Find classes scheduled on this day
                  const classesToday = sortClassesByTime(
                    filteredClasses.filter((c) => isClassOnDate(c, dateStr, dayKey))
                  );

                  const isToday = getLocalDateString() === dateStr;

                  return (
                    <div
                      key={dayNum}
                      className={`min-h-[90px] p-2 rounded-xl border flex flex-col justify-between transition ${
                        isToday
                          ? "bg-indigo-50/40 border-indigo-400"
                          : "bg-white border-slate-100 hover:border-slate-300"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span
                          className={`text-xs font-bold ${
                            isToday
                              ? "w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center text-[11px]"
                              : "text-slate-700"
                          }`}
                        >
                          {dayNum}
                        </span>
                        {classesToday.length > 0 && (
                          <span className="text-[10px] font-bold text-indigo-600">
                            {classesToday.length} ca
                          </span>
                        )}
                      </div>

                      <div className="space-y-1 overflow-y-auto max-h-[64px]">
                        {classesToday.map((cls) => {
                          const parsed = parseClassSchedule(cls.schedule);
                          return (
                            <div
                              key={cls.classId}
                              title={`${cls.name} (${parsed.startTime} - ${parsed.endTime})`}
                              className="px-1.5 py-0.5 bg-indigo-100 text-indigo-900 rounded text-[10px] font-bold truncate flex items-center justify-between"
                            >
                              <span className="truncate">{cls.code}</span>
                              <span className="text-[9px] text-indigo-600 font-semibold ml-1 shrink-0">
                                {parsed.startTime}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* 4. THEO GIỜ TRONG NGÀY (DAILY TIME SLOTS / SHIFTS VIEW)  */}
          {/* ======================================================== */}
          {viewMode === "hourly" && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center text-lg font-bold">
                    ⏰
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">
                      {lang === "vi" ? "Lịch Học Theo Ca Dạy Trung Tâm" : "Class Timetable By Teaching Shifts"}
                    </h3>
                    <p className="text-xs text-slate-500">
                      {lang === "vi"
                        ? `Đang áp dụng ${shifts.length} ca dạy chuẩn cho trung tâm TOEIC MR.NAM.`
                        : `Displaying classes grouped across ${shifts.length} configured shifts.`}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setEditingShifts(shifts);
                    setShowShiftsModal(true);
                  }}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-xl text-xs font-bold transition shadow-sm"
                >
                  <span>⚙️</span>
                  <span>{t("manageShifts")}</span>
                </button>
              </div>

              {shifts.map((shift, idx) => {
                const shiftClasses = sortClassesByTime(filteredClasses.filter((c) => isClassInShift(c, shift)));
                const gradients = [
                  "from-indigo-500/10 to-transparent",
                  "from-purple-500/10 to-transparent",
                  "from-amber-500/10 to-transparent",
                  "from-emerald-500/10 to-transparent",
                  "from-blue-500/10 to-transparent",
                  "from-rose-500/10 to-transparent",
                ];
                const icons = ["🌅", "☀️", "🌙", "⭐", "⚡", "✨"];
                const currentGradient = gradients[idx % gradients.length];
                const currentIcon = icons[idx % icons.length];

                return (
                  <div
                    key={shift.id || idx}
                    className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden"
                  >
                    <div className={`p-4 bg-gradient-to-r ${currentGradient} border-b border-slate-100 flex items-center justify-between`}>
                      <div className="flex items-center gap-3">
                        <span className="text-xl">{currentIcon}</span>
                        <div>
                          <h3 className="text-sm font-bold text-slate-900">{shift.name}</h3>
                          <span className="text-xs font-mono font-semibold text-indigo-600 bg-white px-2 py-0.5 rounded border border-indigo-100 shadow-2xs">
                            ⏰ {shift.startTime} - {shift.endTime}
                          </span>
                        </div>
                      </div>
                      <span className="px-2.5 py-0.5 bg-white border border-slate-200 rounded-full text-xs font-bold text-slate-600 shadow-2xs">
                        {shiftClasses.length} {lang === "vi" ? "lớp học" : "classes"}
                      </span>
                    </div>

                    <div className="p-4">
                      {shiftClasses.length === 0 ? (
                        <div className="text-center py-6 text-xs text-slate-400 italic">
                          {lang === "vi" ? "Chưa có lớp học nào trong ca này." : "No classes assigned to this shift."}
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                          {shiftClasses.map((cls) => {
                            const parsed = parseClassSchedule(cls.schedule);

                            return (
                              <div
                                key={cls.classId}
                                className="p-4 bg-slate-50/80 rounded-xl border border-slate-200 hover:border-indigo-500 transition space-y-2"
                              >
                                <div className="flex items-center justify-between">
                                  <span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 font-mono font-bold text-xs rounded">
                                    {cls.code}
                                  </span>
                                  <span className="px-2 py-0.5 bg-indigo-600 text-white font-bold text-xs rounded-lg shadow-sm">
                                    ⏰ {parsed.startTime} - {parsed.endTime}
                                  </span>
                                </div>

                                <h4 className="font-bold text-sm text-slate-900">{cls.name}</h4>

                                <div className="text-xs text-slate-600 space-y-1">
                                  <div>👨‍🏫 {t("teacher")}: <b>{cls.teacherName || "N/A"}</b></div>
                                  <div>🗓️ {t("schedule")}: <b>{cls.schedule}</b></div>
                                  <div>👥 {t("enrolled")}: <b className="text-indigo-600">{cls.studentCount || 0} {lang === "vi" ? "học viên" : "students"}</b></div>
                                </div>

                                <div className="pt-2 border-t border-slate-200 flex items-center justify-between text-xs">
                                  {cls.integrations?.googleClassroom?.alternateLink ? (
                                    <a
                                      href={cls.integrations.googleClassroom.alternateLink}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="font-bold text-emerald-600 hover:underline"
                                    >
                                      🏫 Google Classroom &rarr;
                                    </a>
                                  ) : (
                                    <span className="text-slate-400 italic">Chưa liên kết</span>
                                  )}
                                  <div className="flex items-center gap-2">
                                    <button
                                      type="button"
                                      onClick={() => setDriveModalClass(cls)}
                                      className="text-blue-600 hover:text-blue-800 font-bold flex items-center gap-1"
                                      title={t("manageClassMaterials")}
                                    >
                                      <span>📁</span>
                                      <span>Drive</span>
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => setEmailModalClass(cls)}
                                      className="text-indigo-600 hover:text-indigo-800 font-bold flex items-center gap-1"
                                      title="Gửi email khai giảng"
                                    >
                                      <span>✉️</span>
                                      <span>Email</span>
                                    </button>
                                    <button
                                      onClick={() => openEditModal(cls)}
                                      className="text-slate-500 hover:text-indigo-600 font-semibold"
                                    >
                                      {lang === "vi" ? "Chi tiết" : "Details"}
                                    </button>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}

              {/* Fallback for classes with irregular schedules that don't match any configured shift */}
              {(() => {
                const otherClasses = sortClassesByTime(filteredClasses.filter((c) => !shifts.some((s) => isClassInShift(c, s))));
                if (otherClasses.length === 0) return null;
                return (
                  <div className="bg-white rounded-2xl border border-dashed border-slate-300 shadow-sm overflow-hidden">
                    <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">📌</span>
                        <h3 className="text-sm font-bold text-slate-700">
                          {lang === "vi" ? "Các Khung Giờ Khác (Lịch tự do)" : "Other Timetables"}
                        </h3>
                      </div>
                      <span className="px-2.5 py-0.5 bg-white border rounded-full text-xs font-bold text-slate-600">
                        {otherClasses.length} {lang === "vi" ? "lớp học" : "classes"}
                      </span>
                    </div>
                    <div className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {otherClasses.map((cls) => {
                        const parsed = parseClassSchedule(cls.schedule);
                        return (
                          <div
                            key={cls.classId}
                            className="p-4 bg-slate-50/80 rounded-xl border border-slate-200 hover:border-indigo-500 transition space-y-2"
                          >
                            <div className="flex items-center justify-between">
                              <span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 font-mono font-bold text-xs rounded">
                                {cls.code}
                              </span>
                              <span className="px-2 py-0.5 bg-slate-600 text-white font-bold text-xs rounded-lg shadow-sm">
                                ⏰ {parsed.startTime} - {parsed.endTime}
                              </span>
                            </div>
                            <h4 className="font-bold text-sm text-slate-900">{cls.name}</h4>
                            <div className="text-xs text-slate-600 space-y-1">
                              <div>👨‍🏫 {t("teacher")}: <b>{cls.teacherName || "N/A"}</b></div>
                              <div>🗓️ {t("schedule")}: <b>{cls.schedule}</b></div>
                            </div>
                            <div className="pt-2 border-t border-slate-200 flex items-center justify-between text-xs">
                              <button
                                onClick={() => openEditModal(cls)}
                                className="text-slate-500 hover:text-indigo-600 font-semibold ml-auto"
                              >
                                {lang === "vi" ? "Chi tiết" : "Details"}
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })()}
            </div>
          )}
        </>
      )}

      {/* Class Create / Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 overflow-y-auto max-h-[90vh]">
            <h3 className="text-lg font-bold text-slate-900 mb-1">
              {editingClass ? t("editClass") : t("newClass")}
            </h3>
            <p className="text-xs text-slate-500 mb-5">
              Fill in class details and configure Google Classroom automation.
            </p>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                    Class Code *
                  </label>
                  <input
                    type="text"
                    required
                    disabled={Boolean(editingClass)}
                    placeholder="e.g. TO55001"
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold uppercase disabled:opacity-60"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                    Course Type
                  </label>
                  <select
                    value={formData.courseType}
                    onChange={(e) => setFormData({ ...formData, courseType: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm"
                  >
                    <option value="TOEIC">TOEIC</option>
                    <option value="IELTS">IELTS</option>
                    <option value="APTIS">APTIS</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                  Class Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. TOEIC Target 550 - K01"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                    Instructor
                  </label>
                  <input
                    type="text"
                    placeholder="Teacher name"
                    value={formData.teacherName}
                    onChange={(e) => setFormData({ ...formData, teacherName: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                    Tuition Fee (VND)
                  </label>
                  <input
                    type="number"
                    value={formData.tuitionFee}
                    onChange={(e) => setFormData({ ...formData, tuitionFee: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold"
                  />
                </div>
              </div>

              {/* Schedule Configuration via Configured Shifts */}
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-800 uppercase flex items-center gap-1.5">
                    <span>⏰</span>
                    <span>{t("selectShift")}</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setEditingShifts(shifts);
                      setShowShiftsModal(true);
                    }}
                    className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800 hover:underline flex items-center gap-1"
                  >
                    <span>⚙️</span>
                    <span>{t("manageShifts")}</span>
                  </button>
                </div>

                {/* Shift Selector Dropdown */}
                <div>
                  <select
                    value={selectedShiftId}
                    onChange={(e) => handleShiftChange(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
                  >
                    {shifts.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.startTime} - {s.endTime})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Days of Week Selection */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[11px] font-bold text-slate-600 uppercase">
                      {t("daysOfWeek")}
                    </span>
                    {/* Quick Presets */}
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => handleApplyPreset(["mon", "wed", "fri"])}
                        className="px-2 py-0.5 text-[10px] bg-white border border-slate-200 hover:border-indigo-400 text-slate-700 rounded-md font-bold transition"
                      >
                        {lang === "vi" ? "2-4-6" : "MWF"}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleApplyPreset(["tue", "thu", "sat"])}
                        className="px-2 py-0.5 text-[10px] bg-white border border-slate-200 hover:border-indigo-400 text-slate-700 rounded-md font-bold transition"
                      >
                        {lang === "vi" ? "3-5-7" : "TTS"}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleApplyPreset(["sat", "sun"])}
                        className="px-2 py-0.5 text-[10px] bg-white border border-slate-200 hover:border-indigo-400 text-slate-700 rounded-md font-bold transition"
                      >
                        {lang === "vi" ? "T7-CN" : "Wknd"}
                      </button>
                    </div>
                  </div>

                  {/* Day Pills */}
                  <div className="grid grid-cols-7 gap-1">
                    {weeklyDays.map((d) => {
                      const isSelected = selectedDays.includes(d.key);
                      return (
                        <button
                          key={d.key}
                          type="button"
                          onClick={() => handleToggleDay(d.key)}
                          className={`py-1.5 px-1 text-center rounded-lg text-xs font-bold transition ${
                            isSelected
                              ? "bg-indigo-600 text-white shadow-sm"
                              : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-100"
                          }`}
                        >
                          {lang === "vi"
                            ? d.key === "sun"
                              ? "CN"
                              : `T${d.key === "mon" ? "2" : d.key === "tue" ? "3" : d.key === "wed" ? "4" : d.key === "thu" ? "5" : d.key === "fri" ? "6" : "7"}`
                            : d.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Auto-composed or manual schedule text field */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[11px] font-bold text-slate-600 uppercase">
                      {t("schedule")}
                    </label>
                    <label className="flex items-center gap-1.5 text-[11px] text-slate-500 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={customScheduleMode}
                        onChange={(e) => setCustomScheduleMode(e.target.checked)}
                        className="rounded text-indigo-600 w-3.5 h-3.5"
                      />
                      <span>{t("customSchedule")}</span>
                    </label>
                  </div>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Thứ 2 - 4 - 6 (18:00 - 19:30)"
                    value={formData.schedule}
                    onChange={(e) => {
                      setCustomScheduleMode(true);
                      setFormData({ ...formData, schedule: e.target.value });
                    }}
                    className={`w-full px-3 py-2 border rounded-xl text-xs font-semibold ${
                      customScheduleMode
                        ? "bg-amber-50/50 border-amber-300 text-slate-900"
                        : "bg-white border-slate-200 text-slate-800"
                    }`}
                  />
                  <p className="text-[10px] text-slate-400 mt-1">
                    💡 {lang === "vi" ? "Tự động tạo theo ca & thứ chọn ở trên. Bạn cũng có thể sửa trực tiếp." : "Auto-generated from shift & days selected above. You can also edit directly."}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                    Start Date
                  </label>
                  <input
                    type="date"
                    value={formData.startDate}
                    onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                    End Date
                  </label>
                  <input
                    type="date"
                    value={formData.endDate}
                    onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm"
                  />
                </div>
              </div>

              {!editingClass && (
                <div className="p-3 bg-indigo-50/70 border border-indigo-100 rounded-xl">
                  <label className="flex items-center gap-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.autoCreateClassroom}
                      onChange={(e) =>
                        setFormData({ ...formData, autoCreateClassroom: e.target.checked })
                      }
                      className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500"
                    />
                    <span className="text-xs font-medium text-indigo-900">
                      Provision Google Classroom Course & Google Drive Folder automatically
                    </span>
                  </label>
                </div>
              )}

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 py-2.5 px-4 border border-slate-200 text-slate-600 rounded-xl text-xs font-semibold hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 py-2.5 px-4 bg-indigo-600 text-white rounded-xl text-xs font-semibold hover:bg-indigo-700 disabled:opacity-60 shadow-sm"
                >
                  {submitting ? "Processing..." : editingClass ? "Save Changes" : "Create Class"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Center Teaching Shifts Settings Modal */}
      {showShiftsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-slate-100 overflow-y-auto max-h-[90vh]">
            <div className="flex items-start justify-between pb-4 border-b border-slate-100 mb-4">
              <div>
                <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <span>⚙️</span>
                  <span>{t("shiftsTitle")}</span>
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  {t("shiftsDesc")}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowShiftsModal(false)}
                className="text-slate-400 hover:text-slate-600 text-lg font-bold p-1"
              >
                ✕
              </button>
            </div>

            {/* List of shifts */}
            <div className="space-y-3 mb-5">
              {editingShifts.map((shift, index) => (
                <div
                  key={shift.id || index}
                  className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5"
                >
                  <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-xs shrink-0">
                    {index + 1}
                  </div>

                  <div className="flex-1">
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-0.5">
                      {t("shiftName")}
                    </label>
                    <input
                      type="text"
                      value={shift.name}
                      onChange={(e) => {
                        const updated = [...editingShifts];
                        updated[index] = { ...updated[index], name: e.target.value };
                        setEditingShifts(updated);
                      }}
                      placeholder="e.g. Ca Tối 1"
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold"
                    />
                  </div>

                  <div className="w-28 shrink-0">
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-0.5">
                      {t("startTime")}
                    </label>
                    <input
                      type="time"
                      value={shift.startTime}
                      onChange={(e) => {
                        const updated = [...editingShifts];
                        updated[index] = { ...updated[index], startTime: e.target.value };
                        setEditingShifts(updated);
                      }}
                      className="w-full px-2 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-mono font-bold"
                    />
                  </div>

                  <div className="w-28 shrink-0">
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-0.5">
                      {t("endTime")}
                    </label>
                    <input
                      type="time"
                      value={shift.endTime}
                      onChange={(e) => {
                        const updated = [...editingShifts];
                        updated[index] = { ...updated[index], endTime: e.target.value };
                        setEditingShifts(updated);
                      }}
                      className="w-full px-2 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-mono font-bold"
                    />
                  </div>

                  <div className="flex sm:flex-col justify-end pt-2 sm:pt-0">
                    <button
                      type="button"
                      onClick={() => {
                        if (editingShifts.length <= 1) {
                          alert(lang === "vi" ? "Cần giữ lại ít nhất 1 ca dạy." : "At least one shift is required.");
                          return;
                        }
                        setEditingShifts(editingShifts.filter((_, i) => i !== index));
                      }}
                      className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg text-xs transition"
                      title="Xóa ca này"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-between mb-5">
              <button
                type="button"
                onClick={() => {
                  const nextIdx = editingShifts.length + 1;
                  setEditingShifts([
                    ...editingShifts,
                    {
                      id: `shift_${Date.now()}`,
                      name: `Ca ${nextIdx}`,
                      startTime: "18:00",
                      endTime: "19:30",
                    },
                  ]);
                }}
                className="px-3.5 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold rounded-xl text-xs transition border border-indigo-200"
              >
                {t("addShift")}
              </button>

              <button
                type="button"
                onClick={() => {
                  if (window.confirm(lang === "vi" ? "Khôi phục về các ca chuẩn mặc định?" : "Reset to default shifts?")) {
                    setEditingShifts(DEFAULT_SHIFTS);
                  }
                }}
                className="text-xs text-slate-500 hover:text-slate-800 underline"
              >
                {lang === "vi" ? "Khôi phục mặc định" : "Reset defaults"}
              </button>
            </div>

            <div className="flex gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowShiftsModal(false)}
                className="flex-1 py-2.5 px-4 border border-slate-200 text-slate-600 rounded-xl text-xs font-semibold hover:bg-slate-50"
              >
                {lang === "vi" ? "Hủy" : "Cancel"}
              </button>
              <button
                type="button"
                disabled={savingShifts}
                onClick={async () => {
                  try {
                    setSavingShifts(true);
                    await saveTeachingShifts(editingShifts);
                    setShowShiftsModal(false);
                  } catch (err) {
                    alert("Lỗi khi lưu ca dạy: " + err.message);
                  } finally {
                    setSavingShifts(false);
                  }
                }}
                className="flex-1 py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold disabled:opacity-60 shadow-sm"
              >
                {savingShifts ? (lang === "vi" ? "Đang lưu..." : "Saving...") : t("saveShifts")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Send Class / Opening Email Modal */}
      {emailModalClass && (
        <SendClassEmailModal
          cls={emailModalClass}
          allStudents={allStudents}
          onClose={() => setEmailModalClass(null)}
        />
      )}

      {/* Class Google Drive Materials & Upload Modal */}
      {driveModalClass && (
        <ClassDriveMaterialsModal
          cls={driveModalClass}
          allStudents={allStudents}
          onClose={() => setDriveModalClass(null)}
        />
      )}
    </div>
  );
};

export default ClassesPage;
