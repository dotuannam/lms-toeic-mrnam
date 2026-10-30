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
  registerStudentAuthAccount,
  generateLoginShareText,
  normalizeLoginIdentifier,
} from "../../services/studentAuthService";

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
    tuitionStatus: "completed", // "completed" | "debt" | "installment"
    tuitionFee: 0,
    paidAmount: 0,
    installmentNote: "",
    createLoginAccount: true,
    accountPassword: "123456",
  });

  // Account creation info modal
  const [createdAccountInfo, setCreatedAccountInfo] = useState(null);
  const [copySuccess, setCopySuccess] = useState(false);
  const [passwordModalStudent, setPasswordModalStudent] = useState(null);
  const [modalPassword, setModalPassword] = useState("123456");
  const [passwordModalSubmitting, setPasswordModalSubmitting] = useState(false);

  // Referral Program at Student Creation
  const [hasReferral, setHasReferral] = useState(false);
  const [referralData, setReferralData] = useState({
    referrerType: "student", // "student" | "external"
    referrerStudentId: "",
    externalName: "",
    externalPhone: "",
    externalIdCard: "",
    externalBank: "",
    rewardType: "cash", // "cash" | "tuition_deduction"
    referrerReward: 300000,
    newStudentDiscount: 200000,
    notes: "",
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

  const handleClassSelectionChange = (selectedClassId) => {
    const selectedClass = classes.find((c) => c.classId === selectedClassId);
    let nextId = formData.studentId;

    if (selectedClass && !editingStudent) {
      const allStudentIds = students.map((s) => s.studentId);
      nextId = generateStudentId(selectedClass.code, allStudentIds);
    }

    const classFee = selectedClass?.tuitionFee || 0;
    setFormData((prev) => ({
      ...prev,
      classId: selectedClassId,
      studentId: nextId,
      tuitionFee: classFee,
      paidAmount: prev.tuitionStatus === "completed" ? classFee : prev.paidAmount,
    }));
  };

  const openCreateModal = () => {
    setEditingStudent(null);
    const defaultClass = classes[0];
    const allStudentIds = students.map((s) => s.studentId);
    const initialId = defaultClass
      ? generateStudentId(defaultClass.code, allStudentIds)
      : generateStudentId("GEN", allStudentIds);

    const defaultFee = defaultClass?.tuitionFee || 0;

    setFormData({
      studentId: initialId,
      fullName: "",
      email: "",
      phone: "",
      dob: "",
      classId: defaultClass ? defaultClass.classId : "",
      status: "active",
      sendClassroomInvite: true,
      tuitionStatus: "completed",
      tuitionFee: defaultFee,
      paidAmount: defaultFee,
      installmentNote: "",
      createLoginAccount: true,
      accountPassword: "123456",
    });

    setHasReferral(false);
    setReferralData({
      referrerType: "student",
      referrerStudentId: "",
      externalName: "",
      externalPhone: "",
      externalIdCard: "",
      externalBank: "",
      rewardType: "cash",
      referrerReward: 300000,
      newStudentDiscount: 200000,
      notes: "",
    });

    setShowModal(true);
  };

  const openTrialModal = () => {
    setEditingStudent(null);
    const defaultClass = classes[0];
    const allStudentIds = students.map((s) => s.studentId);
    const initialId = defaultClass
      ? generateStudentId(defaultClass.code, allStudentIds)
      : generateStudentId("TRIAL", allStudentIds);

    const defaultFee = defaultClass?.tuitionFee || 0;

    setFormData({
      studentId: initialId,
      fullName: "Học Viên Dùng Thử",
      email: "",
      phone: "",
      dob: "",
      classId: defaultClass ? defaultClass.classId : "",
      status: "active",
      sendClassroomInvite: false,
      tuitionStatus: "completed",
      tuitionFee: defaultFee,
      paidAmount: defaultFee,
      installmentNote: "Tài khoản học viên trải nghiệm",
      createLoginAccount: true,
      accountPassword: "123456",
    });

    setHasReferral(false);
    setShowModal(true);
  };

  const openEditModal = (std) => {
    setEditingStudent(std);
    setFormData({
      studentId: std.studentId,
      fullName: std.fullName || "",
      email: std.email || "",
      phone: std.phone || "",
      dob: std.dob || "",
      classId: std.currentClassIds?.[0] || "",
      status: std.status || "active",
      sendClassroomInvite: false,
      tuitionStatus: std.tuitionOverview?.tuitionStatus || "completed",
      tuitionFee: std.tuitionOverview?.totalAmount || 0,
      paidAmount: std.tuitionOverview?.paidAmount || 0,
      installmentNote: "",
    });
    setHasReferral(false);
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
        });
      } else {
        let effectiveReferral = null;
        if (hasReferral) {
          let referrerInfo = {};
          if (referralData.referrerType === "student") {
            const refStu = students.find((s) => s.studentId === referralData.referrerStudentId);
            referrerInfo = {
              studentId: refStu?.studentId || referralData.referrerStudentId,
              name: refStu?.fullName || refStu?.name || "Học viên",
              phone: refStu?.phone || "",
              className: refStu?.classId || "",
            };
          } else {
            referrerInfo = {
              name: referralData.externalName,
              phone: referralData.externalPhone,
              idCard: referralData.externalIdCard,
              bankAccount: referralData.externalBank,
            };
          }

          effectiveReferral = {
            hasReferral: true,
            referrerType: referralData.referrerType,
            referrerInfo,
            rewardType: referralData.rewardType,
            referrerReward: Number(referralData.referrerReward || 0),
            newStudentDiscount: Number(referralData.newStudentDiscount || 0),
            notes: referralData.notes,
          };
        }

        const effectivePhone = formData.phone ? formData.phone.trim() : "";
        const rawEmail = (formData.email || "").trim();
        const effectiveEmail =
          rawEmail ||
          (effectivePhone
            ? `${effectivePhone.replace(/[\s\.\-\(\)\+]/g, "").toLowerCase()}@hocvien.local`
            : `${formData.studentId.toLowerCase()}@hocvien.local`);

        await createStudent(
          {
            studentId: formData.studentId,
            fullName: formData.fullName,
            email: effectiveEmail,
            phone: effectivePhone,
            dob: formData.dob,
            status: formData.status,
            tuitionStatus: formData.tuitionStatus,
            tuitionFee: Number(formData.tuitionFee) || 0,
            paidAmount:
              formData.tuitionStatus === "completed"
                ? Number(formData.tuitionFee) || 0
                : Number(formData.paidAmount) || 0,
            installmentNote: formData.installmentNote || "",
          },
          selectedClass,
          formData.sendClassroomInvite,
          effectiveReferral
        );

        // Auto create auth account if enabled
        if (formData.createLoginAccount) {
          const loginIdentifier = effectivePhone || effectiveEmail || formData.studentId;
          const loginPass = formData.accountPassword || "123456";
          try {
            await registerStudentAuthAccount(loginIdentifier, loginPass);
            setCreatedAccountInfo({
              name: formData.fullName,
              identifier: loginIdentifier,
              password: loginPass,
              email: effectiveEmail,
            });
          } catch (authErr) {
            console.warn("Auth registration note:", authErr);
            alert("Đã lưu học viên thành công! Lưu ý tạo mật khẩu: " + authErr.message);
          }
        }
      }
      setShowModal(false);
    } catch (err) {
      alert("Error saving student: " + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleSetPasswordSubmit = async (e) => {
    e.preventDefault();
    if (!passwordModalStudent) return;
    setPasswordModalSubmitting(true);
    try {
      const identifier = passwordModalStudent.phone || passwordModalStudent.email || passwordModalStudent.studentId;
      await registerStudentAuthAccount(identifier, modalPassword);
      setCreatedAccountInfo({
        name: passwordModalStudent.fullName,
        identifier,
        password: modalPassword,
        email: passwordModalStudent.email || "",
      });
      setPasswordModalStudent(null);
    } catch (err) {
      alert("Lỗi cấp mật khẩu: " + err.message);
    } finally {
      setPasswordModalSubmitting(false);
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
              className="w-full pl-9 pr-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#c27803]/20 focus:border-[#c27803] transition"
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
            className="py-2.5 px-3 bg-white border border-slate-200 rounded-xl text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#c27803]/20 focus:border-[#c27803] transition"
          >
            <option value="all">{t("allClasses")}</option>
            {classes.map((c) => (
              <option key={c.classId} value={c.classId}>
                {c.code} - {c.name}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto">
          <button
            type="button"
            onClick={openTrialModal}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-4 py-2.5 bg-amber-50 hover:bg-amber-100 text-amber-950 border border-amber-300 rounded-xl text-xs font-heading font-bold uppercase tracking-wider shadow-xs transition cursor-pointer"
            title="Tạo tài khoản học viên trải nghiệm nhanh không cần email thật (dùng SĐT)"
          >
            <span>✨</span>
            <span>+ Tạo Học Viên Dùng Thử</span>
          </button>

          <button
            type="button"
            onClick={openCreateModal}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-[#c27803] hover:bg-[#92400e] text-white rounded-xl text-xs font-heading font-bold uppercase tracking-wider shadow-sm transition active:translate-y-px cursor-pointer"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
            </svg>
            <span>{t("enrollStudent")}</span>
          </button>
        </div>
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
                      <td className="py-3.5 px-4 font-mono font-semibold text-[#261e16] text-xs">
                        <span className="px-2 py-1 bg-slate-100 border border-slate-200 rounded-md">
                          {std.studentId}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-semibold text-slate-900">
                        <div>{std.fullName}</div>
                        {std.referral && (
                          <div className="mt-1 flex items-center gap-1.5 flex-wrap">
                            <span className="inline-flex items-center gap-1 text-[10px] bg-amber-50 text-[#c27803] font-bold px-2 py-0.5 rounded-md border border-amber-200">
                              <span>👥 GT bởi:</span>
                              <span className="font-semibold text-slate-800">
                                {std.referral.referrerInfo?.name || "Người giới thiệu"}
                              </span>
                              <span className="text-[9px] text-amber-700">
                                ({std.referral.referrerType === "student" ? "Học viên" : "Người ngoài"} •{" "}
                                {std.referral.rewardType === "tuition_deduction" ? "Trừ HP" : "Tiền mặt"})
                              </span>
                            </span>
                            {std.referral.newStudentDiscount > 0 && (
                              <span className="text-[10px] text-emerald-600 font-bold">
                                -{(std.referral.newStudentDiscount / 1000).toLocaleString("vi-VN")}k
                              </span>
                            )}
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
                            type="button"
                            onClick={() => {
                              setPasswordModalStudent(std);
                              setModalPassword("123456");
                            }}
                            className="text-xs font-semibold text-amber-700 hover:text-amber-900 transition flex items-center gap-1 cursor-pointer"
                            title="Cấp hoặc đặt lại mật khẩu đăng nhập portal cho học viên này"
                          >
                            <span>🔑</span>
                            <span>Cấp MK</span>
                          </button>
                          <span className="text-slate-300">&bull;</span>
                          <button
                            onClick={() => openEditModal(std)}
                            className="text-xs font-semibold text-slate-600 hover:text-[#c27803] transition"
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
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 max-h-[90vh] overflow-y-auto">
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
                    <span className="text-[11px] text-[#c27803] font-bold">
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
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono font-bold text-[#261e16] disabled:opacity-60 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#c27803]/20 focus:border-[#c27803]"
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
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#c27803]/20 focus:border-[#c27803]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-semibold text-slate-700 uppercase">
                      Email
                    </label>
                    <span className="text-[10px] text-slate-400">Không bắt buộc</span>
                  </div>
                  <input
                    type="text"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="Để trống nếu dùng SĐT"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#c27803]/20 focus:border-[#c27803]"
                  />
                  <span className="text-[10px] text-slate-400 mt-0.5 block">
                    Tự sinh email ảo theo SĐT nếu để trống
                  </span>
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-semibold text-slate-700 uppercase">
                      Số Điện Thoại *
                    </label>
                    <span className="text-[10px] text-emerald-600 font-bold">Dùng đăng nhập</span>
                  </div>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="0912345678"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#c27803]/20 focus:border-[#c27803]"
                  />
                  <span className="text-[10px] text-amber-700 font-medium mt-0.5 block">
                    Học viên dùng SĐT này làm Tên đăng nhập
                  </span>
                </div>
              </div>

              {!editingStudent && (
                <div className="p-4 bg-amber-50/70 border border-amber-200 rounded-2xl space-y-2.5">
                  <div className="flex items-center justify-between">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.createLoginAccount}
                        onChange={(e) =>
                          setFormData({ ...formData, createLoginAccount: e.target.checked })
                        }
                        className="w-4 h-4 text-[#c27803] rounded border-slate-300 focus:ring-[#c27803]"
                      />
                      <span className="text-xs font-bold text-amber-950">
                        Cấp tài khoản đăng nhập Portal ngay
                      </span>
                    </label>
                    <span className="text-[10px] font-bold bg-amber-200 text-amber-900 px-2 py-0.5 rounded-full">
                      Đăng nhập bằng SĐT
                    </span>
                  </div>

                  {formData.createLoginAccount && (
                    <div className="space-y-1.5 pt-1">
                      <label className="block text-[11px] font-semibold text-amber-900">
                        Mật khẩu khởi tạo:
                      </label>
                      <input
                        type="text"
                        value={formData.accountPassword}
                        onChange={(e) =>
                          setFormData({ ...formData, accountPassword: e.target.value })
                        }
                        placeholder="123456"
                        className="w-full px-3.5 py-2 bg-white border border-amber-300 rounded-xl text-xs font-mono font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500/30"
                      />
                      <p className="text-[10px] text-amber-800 leading-snug">
                        💡 Học viên tiềm năng chỉ cần vào trang chủ, gõ <strong>Số Điện Thoại</strong> và mật khẩu trên để vào trải nghiệm ngay mà không cần email!
                      </p>
                    </div>
                  )}
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                    Date of Birth
                  </label>
                  <input
                    type="date"
                    value={formData.dob}
                    onChange={(e) => setFormData({ ...formData, dob: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#c27803]/20 focus:border-[#c27803]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                    Status
                  </label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#c27803]/20 focus:border-[#c27803]"
                  >
                    <option value="active">Active</option>
                    <option value="graduated">Graduated</option>
                    <option value="dropped">Dropped</option>
                  </select>
                </div>
              </div>

              {!editingStudent && formData.classId && (
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-heading font-bold text-slate-800 uppercase tracking-wide">
                      {lang === "vi" ? "Tình trạng học phí" : "Tuition Payment Status"}
                    </label>
                    <span className="text-[11px] text-slate-400 font-medium">
                      {lang === "vi" ? "Ghi danh khóa học" : "Enrollment"}
                    </span>
                  </div>

                  {/* 3 Status choices: Completed, Debt, Installment */}
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        const fee = Number(formData.tuitionFee) || 0;
                        setFormData((prev) => ({
                          ...prev,
                          tuitionStatus: "completed",
                          paidAmount: fee,
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
                        const fee = Number(formData.tuitionFee) || 0;
                        setFormData((prev) => ({
                          ...prev,
                          tuitionStatus: "installment",
                          paidAmount: prev.paidAmount > 0 ? prev.paidAmount : Math.round(fee / 2),
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

                  {/* Fee input */}
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 uppercase mb-1">
                      {lang === "vi" ? "Học phí trọn khóa (VNĐ)" : "Course Tuition Fee (VND)"}
                    </label>
                    <input
                      type="number"
                      value={formData.tuitionFee}
                      onChange={(e) => {
                        const val = Number(e.target.value) || 0;
                        setFormData((prev) => ({
                          ...prev,
                          tuitionFee: val,
                          paidAmount: prev.tuitionStatus === "completed" ? val : prev.paidAmount,
                        }));
                      }}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#c27803]/20 focus:border-[#c27803]"
                    />
                  </div>

                  {/* If Debt or Installment: Show Paid amount & Remaining balance */}
                  {formData.tuitionStatus !== "completed" && (
                    <>
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
                          className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#c27803]/20 focus:border-[#c27803]"
                        />
                      </div>

                      {/* Dynamic Remaining Balance Badge with revenue note */}
                      <div className="p-3 bg-amber-50/90 border border-amber-200 rounded-xl space-y-1">
                        <div className="flex items-center justify-between text-xs font-bold text-amber-900">
                          <span>{lang === "vi" ? "Số tiền còn lại (Còn nợ):" : "Remaining Balance (Debt):"}</span>
                          <span className="text-rose-600 font-extrabold text-sm">
                            {Math.max(
                              0,
                              (Number(formData.tuitionFee) || 0) - (Number(formData.paidAmount) || 0)
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
                          className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#c27803]/20 focus:border-[#c27803]"
                        />
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* Referral Program Integration for New Students */}
              {!editingStudent && (
                <div className="p-4 bg-amber-50/70 border border-amber-200/90 rounded-xl space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={hasReferral}
                        onChange={(e) => setHasReferral(e.target.checked)}
                        className="w-4 h-4 rounded text-[#c27803] focus:ring-[#c27803]"
                      />
                      <span className="text-xs font-heading font-bold uppercase tracking-wide text-amber-950">
                        {lang === "vi" ? "Cơ chế Referral (Có người giới thiệu)" : "Referral Program"}
                      </span>
                    </label>
                    <span className="text-[10px] bg-amber-100 text-[#c27803] font-bold px-2 py-0.5 rounded-full border border-amber-200">
                      Đồng bộ Tab Referral
                    </span>
                  </div>

                  {hasReferral && (
                    <div className="space-y-3 pt-1 text-xs">
                      {/* Nhóm 1: Định danh người giới thiệu */}
                      <div className="p-3 bg-white rounded-lg border border-amber-200 space-y-2.5">
                        <span className="font-bold text-amber-900 uppercase block text-[11px]">
                          📌 Nhóm 1: Phân loại Người giới thiệu
                        </span>
                        <div className="grid grid-cols-2 gap-2">
                          <button
                            type="button"
                            onClick={() => setReferralData({ ...referralData, referrerType: "student" })}
                            className={`py-1.5 px-2 rounded-lg font-bold border transition ${
                              referralData.referrerType === "student"
                                ? "bg-[#c27803] text-white border-[#c27803] shadow-sm"
                                : "bg-slate-50 text-slate-700 border-slate-200"
                            }`}
                          >
                            🎓 Học viên hiện tại
                          </button>
                          <button
                            type="button"
                            onClick={() => setReferralData({ ...referralData, referrerType: "external" })}
                            className={`py-1.5 px-2 rounded-lg font-bold border transition ${
                              referralData.referrerType === "external"
                                ? "bg-[#c27803] text-white border-[#c27803] shadow-sm"
                                : "bg-slate-50 text-slate-700 border-slate-200"
                            }`}
                          >
                            🌐 Người ngoài
                          </button>
                        </div>

                        {referralData.referrerType === "student" ? (
                          <div>
                            <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                              Chọn Học Viên Giới Thiệu:
                            </label>
                            <select
                              value={referralData.referrerStudentId}
                              onChange={(e) =>
                                setReferralData({ ...referralData, referrerStudentId: e.target.value })
                              }
                              className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold"
                            >
                              <option value="">-- Chọn học viên --</option>
                              {students.map((s) => (
                                <option key={s.studentId} value={s.studentId}>
                                  [{s.studentId}] {s.fullName || s.name} - {s.phone || "N/A"}
                                </option>
                              ))}
                            </select>
                          </div>
                        ) : (
                          <div className="grid grid-cols-2 gap-2 text-xs">
                            <div>
                              <label className="block font-semibold text-slate-700 mb-0.5">Họ tên (*):</label>
                              <input
                                type="text"
                                required={hasReferral}
                                placeholder="Nguyễn Văn B"
                                value={referralData.externalName}
                                onChange={(e) =>
                                  setReferralData({ ...referralData, externalName: e.target.value })
                                }
                                className="w-full px-2 py-1 bg-slate-50 border border-slate-200 rounded-md"
                              />
                            </div>
                            <div>
                              <label className="block font-semibold text-slate-700 mb-0.5">Số điện thoại (*):</label>
                              <input
                                type="tel"
                                required={hasReferral}
                                placeholder="0987654321"
                                value={referralData.externalPhone}
                                onChange={(e) =>
                                  setReferralData({ ...referralData, externalPhone: e.target.value })
                                }
                                className="w-full px-2 py-1 bg-slate-50 border border-slate-200 rounded-md"
                              />
                            </div>
                            <div>
                              <label className="block font-semibold text-slate-700 mb-0.5">CCCD / CMND (*):</label>
                              <input
                                type="text"
                                placeholder="00120100xxxx"
                                value={referralData.externalIdCard}
                                onChange={(e) =>
                                  setReferralData({ ...referralData, externalIdCard: e.target.value })
                                }
                                className="w-full px-2 py-1 bg-slate-50 border border-slate-200 rounded-md"
                              />
                            </div>
                            <div>
                              <label className="block font-semibold text-slate-700 mb-0.5">STK & Ngân hàng (*):</label>
                              <input
                                type="text"
                                placeholder="MB 0987... NGUYEN VAN B"
                                value={referralData.externalBank}
                                onChange={(e) =>
                                  setReferralData({ ...referralData, externalBank: e.target.value })
                                }
                                className="w-full px-2 py-1 bg-slate-50 border border-slate-200 rounded-md"
                              />
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Nhóm 2: Hình thức Commission */}
                      <div className="p-3 bg-white rounded-lg border border-amber-200 space-y-2.5">
                        <span className="font-bold text-amber-900 uppercase block text-[11px]">
                          💰 Nhóm 2: Hình thức nhận Commission
                        </span>
                        <div className="grid grid-cols-2 gap-2">
                          <button
                            type="button"
                            onClick={() => setReferralData({ ...referralData, rewardType: "cash" })}
                            className={`py-1.5 px-2 rounded-lg font-bold border transition ${
                              referralData.rewardType === "cash"
                                ? "bg-emerald-600 text-white border-emerald-600 shadow-sm"
                                : "bg-slate-50 text-slate-700 border-slate-200"
                            }`}
                          >
                            💵 Tiền mặt / CK
                          </button>
                          <button
                            type="button"
                            disabled={referralData.referrerType === "external"}
                            onClick={() =>
                              setReferralData({ ...referralData, rewardType: "tuition_deduction" })
                            }
                            className={`py-1.5 px-2 rounded-lg font-bold border transition ${
                              referralData.rewardType === "tuition_deduction"
                                ? "bg-[#c27803] text-white border-[#c27803] shadow-sm"
                                : "bg-slate-50 text-slate-700 border-slate-200 disabled:opacity-40"
                            }`}
                          >
                            🎓 Trừ vào học phí
                          </button>
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="block font-semibold text-slate-700 mb-0.5">
                              Hoa hồng người GT (₫):
                            </label>
                            <input
                              type="number"
                              step="50000"
                              value={referralData.referrerReward}
                              onChange={(e) =>
                                setReferralData({ ...referralData, referrerReward: Number(e.target.value) })
                              }
                              className="w-full px-2 py-1 bg-slate-50 border border-slate-200 rounded-md font-bold text-emerald-600"
                            />
                          </div>
                          <div>
                            <label className="block font-semibold text-slate-700 mb-0.5">
                              Giảm giá HV mới (₫):
                            </label>
                            <input
                              type="number"
                              step="50000"
                              value={referralData.newStudentDiscount}
                              onChange={(e) =>
                                setReferralData({ ...referralData, newStudentDiscount: Number(e.target.value) })
                              }
                              className="w-full px-2 py-1 bg-slate-50 border border-slate-200 rounded-md font-bold text-[#c27803]"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {!editingStudent && formData.classId && (
                <div className="p-3.5 bg-cyan-50/60 border border-[#c27803]/30 rounded-xl">
                  <label className="flex items-center gap-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.sendClassroomInvite}
                      onChange={(e) =>
                        setFormData({ ...formData, sendClassroomInvite: e.target.checked })
                      }
                      className="w-4 h-4 mt-0.5 text-[#c27803] rounded focus:ring-[#c27803]"
                    />
                    <div>
                      <span className="text-xs font-heading font-bold text-[#261e16] block uppercase tracking-wide">
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
                  className="flex-1 py-2.5 px-4 bg-[#c27803] text-white rounded-xl text-xs font-heading font-bold uppercase tracking-wider hover:bg-[#92400e] disabled:opacity-60 shadow-sm transition active:translate-y-px"
                >
                  {submitting ? "Saving..." : editingStudent ? "Save Changes" : "Confirm Enrollment"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 2. Success Created Account Modal with 1-Click Copy */}
      {createdAccountInfo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-2xl border border-slate-200 relative space-y-5 animate-scaleUp">
            <div className="w-12 h-12 mx-auto bg-emerald-100 text-emerald-700 rounded-2xl flex items-center justify-center text-2xl">
              🎉
            </div>

            <div className="text-center space-y-1">
              <h3 className="text-xl font-heading font-black text-slate-900">
                Tài Khoản Đã Sẵn Sàng!
              </h3>
              <p className="text-xs text-slate-500">
                Học viên có thể dùng Số điện thoại và Mật khẩu dưới đây để đăng nhập trực tiếp.
              </p>
            </div>

            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2 text-xs">
              <div className="flex justify-between items-center py-1 border-b border-slate-200/60">
                <span className="text-slate-500 font-semibold">Học viên:</span>
                <span className="font-bold text-slate-900">{createdAccountInfo.name}</span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-slate-200/60">
                <span className="text-slate-500 font-semibold">Tên đăng nhập:</span>
                <span className="font-mono font-black text-emerald-700 text-sm">{createdAccountInfo.identifier}</span>
              </div>
              <div className="flex justify-between items-center py-1">
                <span className="text-slate-500 font-semibold">Mật khẩu:</span>
                <span className="font-mono font-black text-amber-600 text-sm">{createdAccountInfo.password}</span>
              </div>
            </div>

            <div className="space-y-2.5">
              <button
                type="button"
                onClick={() => {
                  const shareText = generateLoginShareText(
                    createdAccountInfo.identifier,
                    createdAccountInfo.password,
                    createdAccountInfo.name
                  );
                  navigator.clipboard.writeText(shareText);
                  setCopySuccess(true);
                  setTimeout(() => setCopySuccess(false), 3000);
                }}
                className="w-full py-3 bg-[#c27803] hover:bg-[#92400e] text-white font-heading font-bold text-xs uppercase tracking-wider rounded-xl shadow-md transition cursor-pointer flex items-center justify-center gap-2"
              >
                <span>📋</span>
                <span>{copySuccess ? "✓ Đã Sao Chép Tin Nhắn!" : "Sao Chép Tin Nhắn Gửi Học Viên (Zalo)"}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setCreatedAccountInfo(null);
                  setCopySuccess(false);
                }}
                className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-xl transition cursor-pointer"
              >
                Hoàn tất & Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3. Password Reset/Set Modal for Existing Student */}
      {passwordModalStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-slate-200 space-y-4 animate-scaleUp">
            <div className="text-center space-y-1">
              <div className="w-10 h-10 mx-auto bg-amber-100 text-amber-800 rounded-xl flex items-center justify-center text-xl mb-2">
                🔑
              </div>
              <h3 className="text-lg font-heading font-black text-slate-900">
                Cấp Mật Khẩu Đăng Nhập
              </h3>
              <p className="text-xs text-slate-500">
                Học viên: <strong className="text-slate-800">{passwordModalStudent.fullName}</strong>
                <br />
                Tên đăng nhập: <strong className="text-emerald-700">{passwordModalStudent.phone || passwordModalStudent.email || passwordModalStudent.studentId}</strong>
              </p>
            </div>

            <form onSubmit={handleSetPasswordSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Mật khẩu mới (Tối thiểu 6 ký tự)
                </label>
                <input
                  type="text"
                  required
                  value={modalPassword}
                  onChange={(e) => setModalPassword(e.target.value)}
                  placeholder="123456"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#c27803]/20"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setPasswordModalStudent(null)}
                  className="flex-1 py-2.5 border border-slate-200 text-slate-600 rounded-xl text-xs font-semibold hover:bg-slate-50"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={passwordModalSubmitting}
                  className="flex-1 py-2.5 bg-[#c27803] hover:bg-[#92400e] text-white rounded-xl text-xs font-heading font-bold uppercase tracking-wider disabled:opacity-60 cursor-pointer"
                >
                  {passwordModalSubmitting ? "Đang xử lý..." : "Cấp Mật Khẩu"}
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
