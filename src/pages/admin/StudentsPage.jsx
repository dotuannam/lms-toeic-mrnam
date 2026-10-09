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
    });
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
        await createStudent(
          {
            studentId: formData.studentId,
            fullName: formData.fullName,
            email: formData.email,
            phone: formData.phone,
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
                      <td className="py-3.5 px-4 font-semibold text-slate-900">
                        {std.fullName}
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
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#00b4d8]/20 focus:border-[#00b4d8]"
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
                          className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#00b4d8]/20 focus:border-[#00b4d8]"
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
                          className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#00b4d8]/20 focus:border-[#00b4d8]"
                        />
                      </div>
                    </>
                  )}
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
