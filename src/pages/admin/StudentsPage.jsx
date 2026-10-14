import React, { useState, useEffect } from "react";
import { useLanguage } from "../../context/LanguageContext";
import {
  subscribeStudents,
  createStudent,
  updateStudent,
  deleteStudent,
  grantStudentDriveAccess,
} from "../../services/studentService";
import { subscribeClasses } from "../../services/classService";
import { generateStudentId, formatPhoneNumber } from "../../utils/idGenerator";
import {
  PRICING_PACKAGES,
  SINGLE_COURSES,
  COMBO_PACKAGES,
  GROUP_DISCOUNTS,
  REFERRAL_UPGRADE_REWARDS,
  PROFIT_GUARDRAILS,
  calculateTuitionBreakdown,
  detectPackageFromClassCode,
} from "../../constants/pricingPolicy";

export const StudentsPage = () => {
  const { t, lang } = useLanguage();
  const [students, setStudents] = useState([]);
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [editingStudent, setEditingStudent] = useState(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [classFilter, setClassFilter] = useState("all");

  const [formData, setFormData] = useState({
    studentId: "",
    fullName: "",
    email: "",
    phone: "",
    dob: "",
    classId: "",
    status: "active",
    sendClassroomInvite: true,
    packageCode: "FOUNDATION",
    customBaseFee: 1680000,
    customSessions: 24,
    groupDiscountType: "NONE",
    isReferredByOldStudent: false,
    referrerCode: "",
    referrerUpgradeRewardType: "NONE",
    tuitionStatus: "completed", // "completed" | "debt" | "installment"
    tuitionFee: 1680000,
    paidAmount: 1680000,
    installmentNote: "",
    referralCount: 0,
    referralCreditsAvailable: 0,
  });

  useEffect(() => {
    const unsubStudents = subscribeStudents((data) => {
      setStudents(data);
      setLoading(false);
    });
    const unsubClasses = subscribeClasses((data) => {
      setClasses(data);
    });

    return () => {
      unsubStudents();
      unsubClasses();
    };
  }, []);

  // Compute live breakdown based on current formData
  const activeBreakdown = calculateTuitionBreakdown({
    packageCode: formData.packageCode,
    customBaseFee: formData.customBaseFee,
    customSessions: formData.customSessions,
    groupDiscountType: formData.groupDiscountType,
    isReferredByOldStudent: formData.isReferredByOldStudent,
    referrerCode: formData.referrerCode,
    referrerUpgradeRewardType: formData.referrerUpgradeRewardType,
  });

  const handleClassSelectionChange = (selectedClassId) => {
    const selectedClass = classes.find((c) => c.classId === selectedClassId);
    let nextId = formData.studentId;

    if (selectedClass && !editingStudent) {
      const allStudentIds = students.map((s) => s.studentId);
      nextId = generateStudentId(selectedClass.code, allStudentIds);
    }

    const detectedPkg = selectedClass ? detectPackageFromClassCode(selectedClass.code) : "FOUNDATION";
    const newBreakdown = calculateTuitionBreakdown({
      packageCode: detectedPkg,
      customBaseFee: selectedClass?.tuitionFee || 0,
      customSessions: 24,
      groupDiscountType: formData.groupDiscountType || "NONE",
      isReferredByOldStudent: formData.isReferredByOldStudent,
      referrerCode: formData.referrerCode,
      referrerUpgradeRewardType: formData.referrerUpgradeRewardType,
    });

    setFormData((prev) => ({
      ...prev,
      classId: selectedClassId,
      studentId: nextId,
      packageCode: detectedPkg,
      customBaseFee: newBreakdown.baseFee,
      customSessions: newBreakdown.sessions,
      tuitionFee: newBreakdown.totalFee,
      paidAmount: prev.tuitionStatus === "completed" ? newBreakdown.totalFee : prev.paidAmount,
    }));
  };

  const handlePackageChange = (newPackageCode) => {
    const pkg = PRICING_PACKAGES[newPackageCode] || PRICING_PACKAGES.FOUNDATION;
    const newBreakdown = calculateTuitionBreakdown({
      packageCode: newPackageCode,
      customBaseFee: pkg.baseFee,
      customSessions: pkg.sessions,
      groupDiscountType: formData.groupDiscountType,
      isReferredByOldStudent: formData.isReferredByOldStudent,
      referrerCode: formData.referrerCode,
      referrerUpgradeRewardType: formData.referrerUpgradeRewardType,
    });

    setFormData((prev) => ({
      ...prev,
      packageCode: newPackageCode,
      customBaseFee: pkg.baseFee,
      customSessions: pkg.sessions,
      tuitionFee: newBreakdown.totalFee,
      paidAmount: prev.tuitionStatus === "completed" ? newBreakdown.totalFee : prev.paidAmount,
    }));
  };

  const openCreateModal = () => {
    setEditingStudent(null);
    const defaultClass = classes[0];
    const allStudentIds = students.map((s) => s.studentId);
    const initialId = defaultClass
      ? generateStudentId(defaultClass.code, allStudentIds)
      : generateStudentId("GEN", allStudentIds);

    const detectedPkg = defaultClass ? detectPackageFromClassCode(defaultClass.code) : "FOUNDATION";
    const initialBreakdown = calculateTuitionBreakdown({
      packageCode: detectedPkg,
      customBaseFee: defaultClass?.tuitionFee || 0,
      customSessions: 24,
      groupDiscountType: "NONE",
      isReferredByOldStudent: false,
      referrerCode: "",
      referrerUpgradeRewardType: "NONE",
    });

    setFormData({
      studentId: initialId,
      fullName: "",
      email: "",
      phone: "",
      dob: "",
      classId: defaultClass ? defaultClass.classId : "",
      status: "active",
      sendClassroomInvite: true,
      packageCode: detectedPkg,
      customBaseFee: initialBreakdown.baseFee,
      customSessions: initialBreakdown.sessions,
      groupDiscountType: "NONE",
      isReferredByOldStudent: false,
      referrerCode: "",
      referrerUpgradeRewardType: "NONE",
      tuitionStatus: "completed",
      tuitionFee: initialBreakdown.totalFee,
      paidAmount: initialBreakdown.totalFee,
      installmentNote: "",
      referralCount: 0,
      referralCreditsAvailable: 0,
    });
    setShowModal(true);
  };

  const openEditModal = (std) => {
    setEditingStudent(std);
    const overview = std.tuitionOverview || {};
    const pkgCode = overview.packageCode || "FOUNDATION";
    const grp = overview.groupDiscountType || "NONE";
    const isRef = Boolean(overview.isReferredByOldStudent);
    const refCode = overview.referrerCode || "";
    const refUp = overview.referrerUpgradeRewardType || "NONE";

    const initialBreakdown = calculateTuitionBreakdown({
      packageCode: pkgCode,
      customBaseFee: overview.baseFee || overview.totalAmount || 0,
      customSessions: overview.sessions || 24,
      groupDiscountType: grp,
      isReferredByOldStudent: isRef,
      referrerCode: refCode,
      referrerUpgradeRewardType: refUp,
    });

    setFormData({
      studentId: std.studentId,
      fullName: std.fullName || "",
      email: std.email || "",
      phone: std.phone || "",
      dob: std.dob || "",
      classId: std.currentClassIds?.[0] || "",
      status: std.status || "active",
      sendClassroomInvite: false,
      packageCode: pkgCode,
      customBaseFee: overview.baseFee || initialBreakdown.baseFee,
      customSessions: overview.sessions || initialBreakdown.sessions,
      groupDiscountType: grp,
      isReferredByOldStudent: isRef,
      referrerCode: refCode,
      referrerUpgradeRewardType: refUp,
      tuitionStatus: overview.tuitionStatus || "completed",
      tuitionFee: overview.totalFee ?? overview.totalAmount ?? initialBreakdown.totalFee,
      paidAmount: overview.paidAmount ?? overview.paid ?? 0,
      installmentNote: "",
      referralCount: std.referralCount || 0,
      referralCreditsAvailable: std.referralCreditsAvailable || 0,
    });
    setShowModal(true);
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const selectedClass = classes.find((c) => c.classId === formData.classId) || null;

      if (editingStudent) {
        await updateStudent(editingStudent.studentId, {
          fullName: formData.fullName,
          email: formData.email,
          phone: formData.phone,
          dob: formData.dob,
          status: formData.status,
          tuitionOverview: {
            ...(editingStudent.tuitionOverview || {}),
            packageCode: activeBreakdown.packageCode,
            packageName: activeBreakdown.packageName,
            sessions: activeBreakdown.sessions,
            baseFee: activeBreakdown.baseFee,
            comboDiscountPct: activeBreakdown.comboDiscountPct,
            groupDiscountType: activeBreakdown.groupDiscountType,
            groupDiscountPct: activeBreakdown.groupDiscountPct,
            isReferredByOldStudent: activeBreakdown.isReferredByOldStudent,
            referrerCode: activeBreakdown.referrerCode,
            referrerUpgradeRewardType: activeBreakdown.referrerUpgradeRewardType,
            totalDiscountAmount: activeBreakdown.totalDiscountAmount,
            effectivePricePerSession: activeBreakdown.effectivePricePerSession,
            isCappedAt20Pct: activeBreakdown.isCappedAt20Pct,
            isFloorEnforced: activeBreakdown.isFloorEnforced,
            totalFee: activeBreakdown.totalFee,
            totalAmount: activeBreakdown.totalFee,
            tuitionStatus: formData.tuitionStatus,
            paidAmount:
              formData.tuitionStatus === "completed"
                ? activeBreakdown.totalFee
                : Number(formData.paidAmount) || 0,
            paid:
              formData.tuitionStatus === "completed"
                ? activeBreakdown.totalFee
                : Number(formData.paidAmount) || 0,
            totalDebt: Math.max(
              0,
              activeBreakdown.totalFee -
                (formData.tuitionStatus === "completed"
                  ? activeBreakdown.totalFee
                  : Number(formData.paidAmount) || 0)
            ),
            debt: Math.max(
              0,
              activeBreakdown.totalFee -
                (formData.tuitionStatus === "completed"
                  ? activeBreakdown.totalFee
                  : Number(formData.paidAmount) || 0)
            ),
          },
        });
      } else {
        await createStudent(
          {
            studentId: formData.studentId,
            fullName: formData.fullName,
            email: formData.email,
            phone: formData.phone,
            dob: formData.dob,
            status: formData.status,
            tuitionStatus: formData.tuitionStatus,
            tuitionFee: activeBreakdown.totalFee,
            paidAmount:
              formData.tuitionStatus === "completed"
                ? activeBreakdown.totalFee
                : Number(formData.paidAmount) || 0,
            installmentNote: formData.installmentNote || "",
            packageCode: activeBreakdown.packageCode,
            baseFee: activeBreakdown.baseFee,
            sessions: activeBreakdown.sessions,
            groupDiscountType: activeBreakdown.groupDiscountType,
            isReferredByOldStudent: activeBreakdown.isReferredByOldStudent,
            referrerCode: activeBreakdown.referrerCode,
            referrerUpgradeRewardType: activeBreakdown.referrerUpgradeRewardType,
            pricingBreakdown: activeBreakdown,
          },
          selectedClass,
          formData.sendClassroomInvite
        );
      }
      setShowModal(false);
    } catch (err) {
      alert("Error saving student: " + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (studentId, studentName, classId) => {
    if (window.confirm(`Delete student "${studentName}" (${studentId})?`)) {
      try {
        await deleteStudent(studentId, classId);
      } catch (err) {
        alert("Failed to delete student: " + err.message);
      }
    }
  };

  const filteredStudents = students.filter((s) => {
    const matchesSearch =
      s.fullName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.studentId?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.phone?.includes(searchQuery);

    const matchesClass =
      classFilter === "all" || s.currentClassIds?.includes(classFilter);

    return matchesSearch && matchesClass;
  });

  return (
    <div className="space-y-6">
      {/* Action Toolbar */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
          {/* Search */}
          <div className="relative flex-1 sm:w-72">
            <input
              type="text"
              placeholder={t("searchStudents")}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#00b4d8]/20 focus:border-[#00b4d8] transition"
            />
            <svg
              className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>

          {/* Class Filter */}
          <select
            value={classFilter}
            onChange={(e) => setClassFilter(e.target.value)}
            className="py-2.5 px-3 bg-white border border-slate-200 rounded-xl text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#00b4d8]/20 focus:border-[#00b4d8] transition"
          >
            <option value="all">{t("allClasses")}</option>
            {classes.map((c) => (
              <option key={c.classId} value={c.classId}>
                {c.code} - {c.name}
              </option>
            ))}
          </select>
        </div>

        <button
          onClick={openCreateModal}
          className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-[#00b4d8] hover:bg-[#0096c7] text-white rounded-xl text-xs font-heading font-bold uppercase tracking-wider shadow-sm transition active:translate-y-px"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
          </svg>
          <span>{t("enrollStudent")}</span>
        </button>
      </div>

      {/* Students Data Table */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        {loading ? (
          <div className="py-20 text-center text-slate-400">{t("loadingStudents")}</div>
        ) : filteredStudents.length === 0 ? (
          <div className="py-16 text-center text-slate-500">
            <div className="text-3xl mb-2">🎓</div>
            <p className="font-semibold text-slate-700">{t("noStudents")}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600">
              <thead className="bg-slate-50 border-b border-slate-200 text-xs uppercase font-semibold text-slate-500 tracking-wider">
                <tr>
                  <th className="py-3.5 px-4">{t("studentIdLabel")}</th>
                  <th className="py-3.5 px-4">{t("fullNameLabel")}</th>
                  <th className="py-3.5 px-4">{lang === "vi" ? "Liên hệ" : "Contact"}</th>
                  <th className="py-3.5 px-4">{t("classLabel")}</th>
                  <th className="py-3.5 px-4">{lang === "vi" ? "Học phí" : "Tuition Status"}</th>
                  <th className="py-3.5 px-4">{t("status")}</th>
                  <th className="py-3.5 px-4 text-right">{t("actions")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredStudents.map((std) => {
                  const assignedClass = classes.find(
                    (c) => c.classId === std.currentClassIds?.[0]
                  );
                  const debt = std.tuitionOverview?.totalDebt || 0;

                  return (
                    <tr key={std.studentId} className="hover:bg-slate-50/80 transition">
                      <td className="py-3.5 px-4 font-mono font-semibold text-[#1e2738] text-xs">
                        <span className="px-2 py-1 bg-slate-100 border border-slate-200 rounded-md">
                          {std.studentId}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-slate-900 flex items-center gap-1.5 flex-wrap">
                          <span>{std.fullName}</span>
                          {(std.referralCount > 0 || std.referralCreditsAvailable > 0) && (
                            <span
                              className="text-[10px] px-1.5 py-0.5 rounded-md bg-amber-50 text-amber-700 font-bold border border-amber-200"
                              title={`Đã giới thiệu ${std.referralCount || 0} học viên (${std.referralCreditsAvailable || 0} lượt thưởng khả dụng)`}
                            >
                              👑 {std.referralCount || 0} GT ({std.referralCreditsAvailable || 0} khả dụng)
                            </span>
                          )}
                        </div>
                        {std.tuitionOverview?.packageCode && (
                          <div className="text-[11px] text-[#00b4d8] font-medium mt-0.5">
                            🏷️ {std.tuitionOverview.packageName || std.tuitionOverview.packageCode}
                            {std.tuitionOverview.effectivePricePerSession ? (
                              <span className="text-slate-400 ml-1">
                                ({std.tuitionOverview.effectivePricePerSession.toLocaleString("vi-VN")}đ/b)
                              </span>
                            ) : null}
                          </div>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-xs text-slate-500">
                        <div>{std.email}</div>
                        <div className="text-slate-400">{formatPhoneNumber(std.phone)}</div>
                      </td>
                      <td className="py-3.5 px-4 text-xs">
                        {assignedClass ? (
                          <span className="font-medium text-slate-800">
                            {assignedClass.code} &bull; {assignedClass.name}
                          </span>
                        ) : (
                          <span className="text-slate-400 italic">None</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-xs">
                        {(() => {
                          const status = std.tuitionOverview?.tuitionStatus;
                          const paid = std.tuitionOverview?.paidAmount || 0;
                          if (status === "installment" && debt > 0) {
                            return (
                              <div className="space-y-0.5">
                                <span className="inline-flex items-center gap-1 font-semibold text-amber-700 bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-200">
                                  💳 {lang === "vi" ? "Trả góp" : "Installment"}: {debt.toLocaleString("vi-VN")} ₫
                                </span>
                                {paid > 0 && (
                                  <div className="text-[10px] text-slate-400 pl-1 font-medium">
                                    {lang === "vi" ? "Đã đóng:" : "Paid:"} {paid.toLocaleString("vi-VN")} ₫
                                  </div>
                                )}
                              </div>
                            );
                          }
                          if (debt > 0 || status === "debt") {
                            return (
                              <div className="space-y-0.5">
                                <span className="inline-flex items-center gap-1 font-semibold text-rose-600 bg-rose-50 px-2.5 py-0.5 rounded-full border border-rose-100">
                                  ⚠️ {lang === "vi" ? "Còn nợ" : "Debt"}: {debt.toLocaleString("vi-VN")} ₫
                                </span>
                                {paid > 0 && (
                                  <div className="text-[10px] text-slate-400 pl-1 font-medium">
                                    {lang === "vi" ? "Đã đóng:" : "Paid:"} {paid.toLocaleString("vi-VN")} ₫
                                  </div>
                                )}
                              </div>
                            );
                          }
                          return (
                            <span className="inline-flex items-center gap-1 font-semibold text-emerald-600 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-100">
                              ✓ {lang === "vi" ? "Đã hoàn tất" : "Completed"}
                            </span>
                          );
                        })()}
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`text-[11px] font-semibold px-2 py-0.5 rounded-full capitalize ${
                            std.status === "active"
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                              : "bg-slate-100 text-slate-600"
                          }`}
                        >
                          {std.status}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="inline-flex items-center gap-2">
                          {assignedClass?.integrations?.googleDrive?.folderId && std.email && (
                            <>
                              <button
                                type="button"
                                onClick={async () => {
                                  try {
                                    await grantStudentDriveAccess(
                                      assignedClass.integrations.googleDrive.folderId,
                                      std.email
                                    );
                                    alert(
                                      lang === "vi"
                                        ? `Đã cấp quyền xem Drive thành công cho học viên ${std.fullName} (${std.email})!`
                                        : `Granted Drive viewer access to ${std.fullName} (${std.email}) successfully!`
                                    );
                                  } catch (err) {
                                    alert("Lỗi cấp quyền Drive: " + err.message);
                                  }
                                }}
                                className="text-xs font-semibold text-blue-600 hover:text-blue-800 transition"
                                title={lang === "vi" ? "Cấp quyền xem Drive lớp học" : "Grant class Drive access"}
                              >
                                📁 Drive
                              </button>
                              <span className="text-slate-300">&bull;</span>
                            </>
                          )}
                          <button
                            onClick={() => openEditModal(std)}
                            className="text-xs font-semibold text-slate-600 hover:text-[#00b4d8] transition"
                          >
                            Edit
                          </button>
                          <span className="text-slate-300">&bull;</span>
                          <button
                            onClick={() =>
                              handleDelete(
                                std.studentId,
                                std.fullName,
                                std.currentClassIds?.[0]
                              )
                            }
                            className="text-xs font-semibold text-rose-600 hover:text-rose-700 transition"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add / Edit Student Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100">
            <h3 className="text-lg font-bold text-slate-900 mb-1">
              {editingStudent ? "Edit Student Details" : "Enroll New Student"}
            </h3>
            <p className="text-xs text-slate-500 mb-5">
              Enter student credentials and assign to an initial class.
            </p>

            <form onSubmit={handleFormSubmit} className="space-y-4">
              {/* Class Selection First to drive Auto-ID */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                  Assign to Class
                </label>
                <select
                  disabled={Boolean(editingStudent)}
                  value={formData.classId}
                  onChange={(e) => handleClassSelectionChange(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm disabled:opacity-60"
                >
                  <option value="">-- No Class Assignment --</option>
                  {classes.map((c) => (
                    <option key={c.classId} value={c.classId}>
                      {c.code} - {c.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Student ID with Auto-Gen indicator */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-semibold text-slate-700 uppercase">
                    Auto-Generated Student ID *
                  </label>
                  {!editingStudent && (
                    <span className="text-[11px] text-[#00b4d8] font-bold">
                      Auto-computed from class
                    </span>
                  )}
                </div>
                <input
                  type="text"
                  required
                  disabled={Boolean(editingStudent)}
                  value={formData.studentId}
                  onChange={(e) =>
                    setFormData({ ...formData, studentId: e.target.value.toUpperCase() })
                  }
                  placeholder="e.g. TO55001HV01"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono font-bold text-[#1e2738] disabled:opacity-60 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#00b4d8]/20 focus:border-[#00b4d8]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                  Full Name *
                </label>
                <input
                  type="text"
                  required
                  value={formData.fullName}
                  onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                  placeholder="e.g. Nguyen Van A"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#00b4d8]/20 focus:border-[#00b4d8]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                    Email *
                  </label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="student@gmail.com"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#00b4d8]/20 focus:border-[#00b4d8]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                    Phone
                  </label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="0912345678"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#00b4d8]/20 focus:border-[#00b4d8]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                    Date of Birth
                  </label>
                  <input
                    type="date"
                    value={formData.dob}
                    onChange={(e) => setFormData({ ...formData, dob: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#00b4d8]/20 focus:border-[#00b4d8]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                    Status
                  </label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#00b4d8]/20 focus:border-[#00b4d8]"
                  >
                    <option value="active">Active</option>
                    <option value="graduated">Graduated</option>
                    <option value="dropped">Dropped</option>
                  </select>
                </div>
              </div>

              {/* SMART PRICING & DISCOUNT CALCULATOR (PHƯƠNG ÁN B - PHÂN TẦNG) */}
              {formData.classId && (
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-200/80 pb-2.5">
                    <div>
                      <h4 className="text-xs font-heading font-extrabold text-[#1e2738] uppercase tracking-wider flex items-center gap-1.5">
                        <span>🏷️</span>
                        <span>{lang === "vi" ? "Chính sách Học phí & Ưu đãi Phân tầng" : "Tiered Pricing & Discount Engine"}</span>
                      </h4>
                      <p className="text-[11px] text-slate-500">
                        {lang === "vi" ? "Phương án B: Bảo toàn đơn giá sàn >= 56.000đ/buổi, trần giảm tối đa 20%" : "Method B: Profit guardrails enforced"}
                      </p>
                    </div>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#00b4d8]/10 text-[#00b4d8] border border-[#00b4d8]/20 uppercase">
                      {formData.packageCode}
                    </span>
                  </div>

                  {/* 1. Chọn Gói Học (packageCode) */}
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 uppercase tracking-wide mb-1">
                      1. {lang === "vi" ? "Chọn Gói Học & Lộ trình (Package):" : "Select Course / Combo Package:"}
                    </label>
                    <select
                      value={formData.packageCode}
                      onChange={(e) => handlePackageChange(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#00b4d8]/20 focus:border-[#00b4d8]"
                    >
                      <optgroup label={lang === "vi" ? "--- KHÓA LẺ (SINGLE COURSES) ---" : "--- SINGLE COURSES ---"}>
                        <option value="FOUNDATION">1. Foundation - 24 buổi (70.000đ/buổi - 1.680.000đ)</option>
                        <option value="TARGET_550">2. Target 550 - 24 buổi (80.000đ/buổi - 1.920.000đ)</option>
                        <option value="TARGET_650">3. Target 650+ - 16 buổi (100.000đ/buổi - 1.600.000đ)</option>
                      </optgroup>
                      <optgroup label={lang === "vi" ? "--- COMBO LỘ TRÌNH (BULK DISCOUNT 1) ---" : "--- COMBO PACKAGES ---"}>
                        <option value="COMBO_FO_550">Combo 2 khóa: Foundation + Target 550 (48b - Giảm 10% → 3.240.000đ)</option>
                        <option value="COMBO_550_650">Combo 2 khóa: Target 550 + Target 650+ (40b - Giảm 10% → 3.168.000đ)</option>
                        <option value="COMBO_FULL_3">Combo 3 khóa: Trọn lộ trình Foundation → 650+ (64b - Giảm 15% → 4.420.000đ)</option>
                        <option value="CUSTOM">Khóa khác (TOSW / APTIS / IELTS - Nhập tay)</option>
                      </optgroup>
                    </select>
                  </div>

                  {/* Custom course fields if CUSTOM */}
                  {formData.packageCode === "CUSTOM" && (
                    <div className="grid grid-cols-2 gap-3 p-3 bg-white border border-slate-200 rounded-xl">
                      <div>
                        <label className="block text-[10px] font-semibold text-slate-600 uppercase mb-1">
                          {lang === "vi" ? "Học phí gốc (VNĐ)" : "Base Fee (VND)"}
                        </label>
                        <input
                          type="number"
                          value={formData.customBaseFee}
                          onChange={(e) =>
                            setFormData((prev) => ({ ...prev, customBaseFee: Number(e.target.value) || 0 }))
                          }
                          className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-semibold text-slate-600 uppercase mb-1">
                          {lang === "vi" ? "Số buổi học" : "Sessions"}
                        </label>
                        <input
                          type="number"
                          value={formData.customSessions}
                          onChange={(e) =>
                            setFormData((prev) => ({ ...prev, customSessions: Number(e.target.value) || 1 }))
                          }
                          className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold"
                        />
                      </div>
                    </div>
                  )}

                  {/* 2. Ưu đãi Nhóm (Bulk Discount 2) */}
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 uppercase tracking-wide mb-1.5">
                      2. {lang === "vi" ? "Ưu đãi đăng ký theo Nhóm (Bulk Discount 2):" : "Group Discount:"}
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {Object.values(GROUP_DISCOUNTS).map((grp) => {
                        const isSelected = formData.groupDiscountType === grp.code;
                        return (
                          <button
                            key={grp.code}
                            type="button"
                            onClick={() => setFormData((prev) => ({ ...prev, groupDiscountType: grp.code }))}
                            className={`py-2 px-2 rounded-xl text-xs font-heading font-bold transition flex flex-col items-center justify-center border ${
                              isSelected
                                ? "bg-[#1e2738] text-white border-[#1e2738] shadow-sm"
                                : "bg-white text-slate-700 border-slate-200 hover:bg-slate-100"
                            }`}
                          >
                            <span>{grp.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* 3. Ưu đãi Học viên mới (Referral - New Student) */}
                  <div className="p-3 bg-white border border-slate-200 rounded-xl space-y-2">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.isReferredByOldStudent}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            isReferredByOldStudent: e.target.checked,
                            referrerCode: e.target.checked ? prev.referrerCode : "",
                          }))
                        }
                        className="w-4 h-4 text-[#00b4d8] rounded focus:ring-[#00b4d8]"
                      />
                      <span className="text-xs font-heading font-bold text-slate-800 uppercase tracking-wide">
                        3. {lang === "vi" ? "Có HV cũ giới thiệu (-5% học phí)" : "Referred by old student (-5%)"}
                      </span>
                    </label>

                    {formData.isReferredByOldStudent && (
                      <div className="pt-2 border-t border-slate-100 space-y-1.5">
                        <label className="block text-[11px] font-semibold text-slate-600">
                          {lang === "vi" ? "Mã Học viên người giới thiệu (referrerCode):" : "Referrer Student Code:"}
                        </label>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            placeholder="VD: TO55001HV01..."
                            value={formData.referrerCode}
                            onChange={(e) =>
                              setFormData((prev) => ({ ...prev, referrerCode: e.target.value.toUpperCase() }))
                            }
                            className="flex-1 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono font-bold text-[#1e2738] uppercase"
                          />
                          {students.length > 0 && (
                            <select
                              onChange={(e) => {
                                if (e.target.value) {
                                  setFormData((prev) => ({ ...prev, referrerCode: e.target.value }));
                                }
                              }}
                              className="px-2 py-1.5 bg-slate-100 border border-slate-200 rounded-lg text-xs text-slate-700 max-w-[150px]"
                            >
                              <option value="">{lang === "vi" ? "Chọn HV cũ..." : "Pick student..."}</option>
                              {students.map((s) => (
                                <option key={s.studentId} value={s.studentId}>
                                  {s.studentId} - {s.fullName}
                                </option>
                              ))}
                            </select>
                          )}
                        </div>
                        <p className="text-[10px] text-emerald-600 font-medium">
                          💡 {lang === "vi" ? "Khi ghi danh thành công, học viên giới thiệu sẽ tự động được tích lũy 1 lượt thưởng (referralCount +1) để dùng khi học lên khóa sau!" : "Referrer will be credited +1 referral reward point automatically."}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* 4. Quyền lợi Người giới thiệu học lên khóa sau (Referral Upgrade) */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-[11px] font-semibold text-slate-700 uppercase tracking-wide">
                        4. {lang === "vi" ? "Quyền lợi Người giới thiệu học lên khóa sau:" : "Referral Reward Upgrade:"}
                      </label>
                      {formData.referralCreditsAvailable > 0 && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-bold border border-emerald-200">
                          🎁 {formData.referralCreditsAvailable} {lang === "vi" ? "lượt khả dụng" : "available"}
                        </span>
                      )}
                    </div>
                    <select
                      value={formData.referrerUpgradeRewardType}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, referrerUpgradeRewardType: e.target.value }))
                      }
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#00b4d8]/20 focus:border-[#00b4d8]"
                    >
                      <option value="NONE">{lang === "vi" ? "Không áp dụng" : "None"}</option>
                      <option value="PERCENT_5">{lang === "vi" ? "Dùng thưởng 5% (-5% học phí)" : "Use 5% discount"}</option>
                      <option value="FLAT_100K">{lang === "vi" ? "Dùng thưởng 100.000đ (-100.000đ trực tiếp)" : "Use 100,000 VND flat deduction"}</option>
                    </select>
                  </div>

                  {/* 5. Real-time Guardrail & Summary Box */}
                  <div className="p-3.5 bg-gradient-to-br from-slate-900 to-[#1e2738] text-white rounded-xl space-y-2.5 shadow-sm">
                    <div className="flex items-center justify-between text-xs border-b border-white/10 pb-2">
                      <span className="text-slate-300">{lang === "vi" ? "Học phí gốc:" : "Base Fee:"}</span>
                      <span className="font-bold font-mono">
                        {activeBreakdown.baseFee.toLocaleString("vi-VN")} ₫ ({activeBreakdown.sessions} {lang === "vi" ? "buổi" : "sessions"})
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-300">{lang === "vi" ? "Tổng mức giảm & Tiết kiệm:" : "Discount & Savings:"}</span>
                      <div className="text-right">
                        <span className="font-bold text-amber-300 mr-2">
                          -{activeBreakdown.rawPercentDiscount}%
                          {activeBreakdown.useFlat100kReward ? " + 100k" : ""}
                        </span>
                        <span className="font-bold font-mono text-emerald-400">
                          (-{activeBreakdown.totalDiscountAmount.toLocaleString("vi-VN")} ₫)
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-300">{lang === "vi" ? "Đơn giá thực tế TB/buổi:" : "Effective per Session:"}</span>
                      <span className={`font-bold font-mono ${activeBreakdown.effectivePricePerSession >= 56000 ? "text-cyan-300" : "text-rose-400"}`}>
                        {activeBreakdown.effectivePricePerSession.toLocaleString("vi-VN")} ₫/buổi
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-sm font-heading font-extrabold pt-2 border-t border-white/10 text-white">
                      <span className="uppercase tracking-wider">{lang === "vi" ? "Học phí thực thu (totalFee):" : "Final Tuition Due:"}</span>
                      <span className="text-xl text-[#00b4d8] font-mono">
                        {activeBreakdown.totalFee.toLocaleString("vi-VN")} ₫
                      </span>
                    </div>

                    {/* Warning Guardrail: 20% Max Discount Cap */}
                    {activeBreakdown.isCappedAt20Pct && (
                      <div className="p-2 bg-amber-500/20 border border-amber-400/40 rounded-lg text-[11px] text-amber-200 flex items-start gap-1.5">
                        <span className="shrink-0 text-sm">⚠️</span>
                        <span>
                          {lang === "vi"
                            ? "Đã chạm trần ưu đãi tối đa 20%/HV (Đơn giá bảo toàn >= 56.000đ/buổi theo quy chuẩn trung tâm)."
                            : "Hit max 20% discount cap. Session rate preserved >= 56,000 VND."}
                        </span>
                      </div>
                    )}

                    {/* Floor price enforced notice */}
                    {activeBreakdown.isFloorEnforced && (
                      <div className="p-2 bg-cyan-500/20 border border-cyan-400/40 rounded-lg text-[11px] text-cyan-200 flex items-start gap-1.5">
                        <span className="shrink-0 text-sm">🛡️</span>
                        <span>
                          {lang === "vi"
                            ? "Đã kích hoạt bảo toàn giá sàn 56.000đ/buổi để đảm bảo biên lợi nhuận lớp."
                            : "Floor rate 56,000 VND/session enforced."}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* 6. Tình trạng thanh toán & Đóng tiền */}
                  <div className="space-y-3 pt-2 border-t border-slate-200">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-heading font-bold text-slate-800 uppercase tracking-wide">
                        {lang === "vi" ? "Tình trạng thanh toán" : "Payment Status"}
                      </label>
                    </div>

                    {/* 3 Status choices: Completed, Debt, Installment */}
                    <div className="grid grid-cols-3 gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setFormData((prev) => ({
                            ...prev,
                            tuitionStatus: "completed",
                            paidAmount: activeBreakdown.totalFee,
                          }));
                        }}
                        className={`py-2 px-2.5 rounded-xl text-xs font-bold transition flex flex-col items-center justify-center gap-1 border ${
                          formData.tuitionStatus === "completed"
                            ? "bg-emerald-600 text-white border-emerald-600 shadow-sm"
                            : "bg-white text-slate-700 border-slate-200 hover:bg-slate-100"
                        }`}
                      >
                        <span>✓</span>
                        <span>{lang === "vi" ? "Đã hoàn tất" : "Completed"}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setFormData((prev) => ({
                            ...prev,
                            tuitionStatus: "debt",
                            paidAmount: 0,
                          }));
                        }}
                        className={`py-2 px-2.5 rounded-xl text-xs font-bold transition flex flex-col items-center justify-center gap-1 border ${
                          formData.tuitionStatus === "debt"
                            ? "bg-rose-600 text-white border-rose-600 shadow-sm"
                            : "bg-white text-slate-700 border-slate-200 hover:bg-slate-100"
                        }`}
                      >
                        <span>⚠️</span>
                        <span>{lang === "vi" ? "Còn nợ" : "Debt"}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setFormData((prev) => ({
                            ...prev,
                            tuitionStatus: "installment",
                            paidAmount:
                              prev.paidAmount > 0 && prev.paidAmount < activeBreakdown.totalFee
                                ? prev.paidAmount
                                : Math.round(activeBreakdown.totalFee / 2),
                          }));
                        }}
                        className={`py-2 px-2.5 rounded-xl text-xs font-bold transition flex flex-col items-center justify-center gap-1 border ${
                          formData.tuitionStatus === "installment"
                            ? "bg-amber-500 text-white border-amber-500 shadow-sm"
                            : "bg-white text-slate-700 border-slate-200 hover:bg-slate-100"
                        }`}
                      >
                        <span>💳</span>
                        <span>{lang === "vi" ? "Trả góp" : "Installment"}</span>
                      </button>
                    </div>

                    {formData.tuitionStatus !== "completed" && (
                      <div className="space-y-3 pt-2">
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-600 uppercase mb-1">
                            {formData.tuitionStatus === "installment"
                              ? lang === "vi"
                                ? "Số tiền đóng đợt 1 / đặt cọc (VNĐ)"
                                : "Initial Payment / Deposit (VND)"
                              : lang === "vi"
                              ? "Số tiền đã trả trước (nếu có) (VNĐ)"
                              : "Prepaid Amount (if any) (VND)"}
                          </label>
                          <input
                            type="number"
                            value={formData.paidAmount}
                            onChange={(e) =>
                              setFormData((prev) => ({ ...prev, paidAmount: Number(e.target.value) || 0 }))
                            }
                            className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#00b4d8]/20 focus:border-[#00b4d8]"
                          />
                        </div>

                        <div className="p-3 bg-amber-50/90 border border-amber-200 rounded-xl space-y-1">
                          <div className="flex items-center justify-between text-xs font-bold text-amber-900">
                            <span>{lang === "vi" ? "Số tiền còn lại (Còn nợ):" : "Remaining Balance (Debt):"}</span>
                            <span className="text-rose-600 font-extrabold text-sm">
                              {Math.max(
                                0,
                                activeBreakdown.totalFee - (Number(formData.paidAmount) || 0)
                              ).toLocaleString("vi-VN")}{" "}
                              ₫
                            </span>
                          </div>
                          <p className="text-[11px] text-amber-800 leading-tight">
                            🛡️{" "}
                            {lang === "vi"
                              ? "Quy tắc tài chính: Số tiền còn nợ sẽ KHÔNG được tính vào doanh thu trung tâm cho đến khi hoàn tất."
                              : "Financial Rule: Remaining debt will NOT be counted into center revenue until paid."}
                          </p>
                        </div>

                        <div>
                          <label className="block text-[11px] font-semibold text-slate-600 uppercase mb-1">
                            {lang === "vi" ? "Ghi chú kỳ hạn đóng / Trả góp" : "Installment Note / Due Date"}
                          </label>
                          <input
                            type="text"
                            placeholder={
                              lang === "vi"
                                ? "VD: Đợt 2 hạn chót ngày 15/10/2026..."
                                : "e.g. Next installment due on Oct 15, 2026..."
                            }
                            value={formData.installmentNote}
                            onChange={(e) =>
                              setFormData((prev) => ({ ...prev, installmentNote: e.target.value }))
                            }
                            className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#00b4d8]/20 focus:border-[#00b4d8]"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {!editingStudent && formData.classId && (
                <div className="p-3.5 bg-cyan-50/60 border border-[#00b4d8]/30 rounded-xl">
                  <label className="flex items-center gap-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.sendClassroomInvite}
                      onChange={(e) =>
                        setFormData({ ...formData, sendClassroomInvite: e.target.checked })
                      }
                      className="w-4 h-4 mt-0.5 text-[#00b4d8] rounded focus:ring-[#00b4d8]"
                    />
                    <div>
                      <span className="text-xs font-heading font-bold text-[#1e2738] block uppercase tracking-wide">
                        {lang === "vi"
                          ? "Tự động mời Google Classroom & cấp quyền Google Drive"
                          : "Auto invite to Classroom & grant Google Drive folder access"}
                      </span>
                      <p className="text-[11px] text-slate-600 mt-0.5">
                        {lang === "vi"
                          ? "Email học viên sẽ được thêm làm Người xem (Viewer) thư mục Drive lớp do dotuannamwork2809@gmail.com sở hữu."
                          : "Student will be added as Viewer to the class Drive folder owned by dotuannamwork2809@gmail.com."}
                      </p>
                    </div>
                  </label>
                </div>
              )}

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 py-2.5 px-4 border border-slate-200 text-slate-600 rounded-xl text-xs font-heading font-bold uppercase tracking-wider hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 py-2.5 px-4 bg-[#00b4d8] text-white rounded-xl text-xs font-heading font-bold uppercase tracking-wider hover:bg-[#0096c7] disabled:opacity-60 shadow-sm transition active:translate-y-px"
                >
                  {submitting ? "Saving..." : editingStudent ? "Save Changes" : "Confirm Enrollment"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default StudentsPage;
