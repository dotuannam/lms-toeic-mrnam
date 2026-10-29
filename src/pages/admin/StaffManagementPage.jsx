import React, { useState, useEffect } from "react";
import { useAuth } from "../../context/AuthContext";
import { useLanguage } from "../../context/LanguageContext";
import { subscribeClasses } from "../../services/classService";
import {
  getStaffList,
  subscribeStaff,
  addStaffMember,
  updateStaffMember,
  deleteStaffMember,
  STAFF_ROLES,
  SUPER_ADMIN_EMAIL,
  isSuperAdmin,
} from "../../services/staffService";

export const StaffManagementPage = () => {
  const { currentUser } = useAuth();
  const { t, lang } = useLanguage();
  const isVi = lang === "vi";

  const operatorEmail = (currentUser?.email || "").toLowerCase().trim();
  const canManageStaff = isSuperAdmin(operatorEmail);

  const [staffList, setStaffList] = useState([]);
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingStaff, setEditingStaff] = useState(null);
  const [actionMessage, setActionMessage] = useState(null);

  // Form State
  const [formData, setFormData] = useState({
    email: "",
    fullName: "",
    role: "consultant", // "consultant" | "instructor" | "admin"
    phone: "",
    assignedClassIds: [],
    notes: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");

  useEffect(() => {
    const unsubStaff = subscribeStaff((list) => {
      setStaffList(list);
      setLoading(false);
    });

    const unsubClasses = subscribeClasses((clsList) => {
      setClasses(clsList);
    });

    return () => {
      unsubStaff();
      unsubClasses();
    };
  }, []);

  const handleOpenAdd = () => {
    setFormError("");
    setEditingStaff(null);
    setFormData({
      email: "",
      fullName: "",
      role: "consultant",
      phone: "",
      assignedClassIds: [],
      notes: "",
    });
    setShowAddModal(true);
  };

  const handleOpenEdit = (staff) => {
    setFormError("");
    setEditingStaff(staff);
    setFormData({
      email: staff.email || "",
      fullName: staff.fullName || "",
      role: staff.role || "consultant",
      phone: staff.phone || "",
      assignedClassIds: staff.assignedClassIds || [],
      notes: staff.notes || "",
    });
    setShowAddModal(true);
  };

  const handleToggleClass = (classId) => {
    setFormData((prev) => {
      const exists = prev.assignedClassIds.includes(classId);
      return {
        ...prev,
        assignedClassIds: exists
          ? prev.assignedClassIds.filter((id) => id !== classId)
          : [...prev.assignedClassIds, classId],
      };
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError("");
    setSubmitting(true);

    try {
      if (editingStaff) {
        await updateStaffMember(
          editingStaff.staffId,
          {
            fullName: formData.fullName,
            role: formData.role,
            phone: formData.phone,
            assignedClassIds: formData.assignedClassIds,
            notes: formData.notes,
          },
          operatorEmail
        );
        setActionMessage(isVi ? "Đã cập nhật thông tin nhân sự thành công!" : "Staff updated successfully!");
      } else {
        await addStaffMember(formData, operatorEmail);
        setActionMessage(
          isVi
            ? `Đã thêm thành viên "${formData.email}" với vai trò ${STAFF_ROLES[formData.role?.toUpperCase()]?.labelVi || formData.role}!`
            : `Added staff member "${formData.email}"!`
        );
      }

      setShowAddModal(false);
      setTimeout(() => setActionMessage(null), 5000);
    } catch (err) {
      setFormError(err.message || "An error occurred");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (staff) => {
    if (!canManageStaff) return;
    const confirmMsg = isVi
      ? `Bạn có chắc chắn muốn xóa nhân sự "${staff.fullName || staff.email}" khỏi hệ thống?`
      : `Are you sure you want to remove staff "${staff.fullName || staff.email}"?`;

    if (!window.confirm(confirmMsg)) return;

    try {
      await deleteStaffMember(staff.staffId, staff.email, operatorEmail);
      setActionMessage(isVi ? "Đã xóa nhân sự khỏi hệ thống!" : "Staff removed successfully!");
      setTimeout(() => setActionMessage(null), 4000);
    } catch (err) {
      alert("Lỗi khi xóa nhân sự: " + err.message);
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. Page Header Card */}
      <div className="bg-white dark:bg-[#1c1610] p-6 rounded-2xl border border-slate-200/90 dark:border-[#2a354b] shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4 transition-colors">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <h2 className="text-lg sm:text-xl font-heading font-black text-slate-900 dark:text-white uppercase tracking-tight">
              {isVi ? "Quản lý Đội ngũ & Phân quyền" : "Staff & Role Management"}
            </h2>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-heading font-bold uppercase tracking-wider bg-[#c27803]/15 text-[#c27803] border border-[#c27803]/30">
              Access Control
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {isVi
              ? "Thêm tài khoản Gmail cho Người chăm sóc học vụ (Consultants) và Giáo viên (Instructors) với quyền hạn phân định rõ ràng."
              : "Provision Gmail accounts for Academic Consultants and Instructors with strict role permissions."}
          </p>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          {canManageStaff ? (
            <button
              onClick={handleOpenAdd}
              className="w-full sm:w-auto px-5 py-2.5 bg-[#c27803] hover:bg-[#92400e] text-white rounded-xl text-xs font-heading font-bold uppercase tracking-wider shadow-sm transition active:scale-95 flex items-center justify-center gap-2"
            >
              <span>+</span>
              <span>{isVi ? "Thêm Thành Viên Mới" : "Add Staff Member"}</span>
            </button>
          ) : (
            <div className="px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-xs font-semibold flex items-center gap-2">
              <span>🔒</span>
              <span>{isVi ? "Chế độ xem quyền hạn" : "View-only access"}</span>
            </div>
          )}
        </div>
      </div>

      {/* 2. Super Admin Authorization Policy Notice */}
      <div
        className={`p-4 rounded-2xl border text-xs leading-relaxed flex items-start gap-3 transition-colors ${
          canManageStaff
            ? "bg-amber-50/80 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800 text-amber-950 dark:text-amber-200"
            : "bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300"
        }`}
      >
        <span className="text-lg">👑</span>
        <div className="space-y-1">
          <p className="font-heading font-bold">
            {isVi ? "Chính sách bảo mật phân quyền:" : "Authorization Policy:"}
          </p>
          <p className="text-[11px] opacity-90">
            {isVi ? (
              <>
                Chỉ duy nhất tài khoản Super Admin{" "}
                <strong className="underline text-amber-900 dark:text-amber-100 font-mono">
                  {SUPER_ADMIN_EMAIL}
                </strong>{" "}
                có toàn quyền thêm, sửa và xóa tài khoản của các đối tượng Consultants và Instructors. Các thành viên
                khác khi đăng nhập chỉ được truy cập vào đúng các chức năng tương ứng với vai trò được giao.
              </>
            ) : (
              <>
                Only the Super Admin account{" "}
                <strong className="underline font-mono">{SUPER_ADMIN_EMAIL}</strong> has full authority to add,
                edit, and delete Consultant and Instructor profiles.
              </>
            )}
          </p>
        </div>
      </div>

      {/* Action Success Alert */}
      {actionMessage && (
        <div className="p-3.5 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 rounded-xl text-xs font-semibold flex items-center gap-2 animate-fade-in">
          <span>✓</span>
          <span>{actionMessage}</span>
        </div>
      )}

      {/* 3. Role Summary Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Super Admin Card */}
        <div className="bg-white dark:bg-[#1c1610] p-5 rounded-2xl border border-amber-200/80 dark:border-amber-900/50 shadow-xs space-y-2 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-heading font-bold text-slate-900 dark:text-white uppercase tracking-wider">
              Super Admin
            </span>
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 dark:bg-amber-900/50 text-amber-800 dark:text-amber-300">
              Chủ sở hữu
            </span>
          </div>
          <p className="text-sm font-heading font-extrabold text-amber-600 dark:text-amber-400 font-mono truncate">
            {SUPER_ADMIN_EMAIL}
          </p>
          <p className="text-[11px] text-slate-500 dark:text-slate-400">
            {isVi
              ? "Toàn quyền quản trị hệ thống, cấp phát quyền, cấu hình API, quản lý tài chính và xóa nhân sự."
              : "Full system authority, role delegation, API configurations, and finance oversight."}
          </p>
        </div>

        {/* Consultants Card */}
        <div className="bg-white dark:bg-[#1c1610] p-5 rounded-2xl border border-blue-200/80 dark:border-blue-900/50 shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-heading font-bold text-slate-900 dark:text-white uppercase tracking-wider">
              {isVi ? "Chăm sóc học vụ" : "Consultants"}
            </span>
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-300">
              {staffList.filter((s) => s.role === "consultant").length} thành viên
            </span>
          </div>
          <p className="text-xs font-heading font-bold text-blue-600 dark:text-blue-400">
            {isVi ? "Phân quyền vận hành học vụ" : "Academic Operations"}
          </p>
          <p className="text-[11px] text-slate-500 dark:text-slate-400">
            {isVi
              ? "Quyền: Quản lý học viên, theo dõi học phí & công nợ, điểm danh, chia sẻ tài liệu Drive. Không thể xóa lớp hay sửa phân quyền."
              : "Permissions: Students, tuition tracking, attendance, Drive materials. No deletion or role config rights."}
          </p>
        </div>

        {/* Instructors Card */}
        <div className="bg-white dark:bg-[#1c1610] p-5 rounded-2xl border border-emerald-200/80 dark:border-emerald-900/50 shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-heading font-bold text-slate-900 dark:text-white uppercase tracking-wider">
              {isVi ? "Giáo viên / Giảng viên" : "Instructors"}
            </span>
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 dark:bg-emerald-900/50 text-emerald-800 dark:text-emerald-300">
              {staffList.filter((s) => s.role === "instructor").length} thành viên
            </span>
          </div>
          <p className="text-xs font-heading font-bold text-emerald-600 dark:text-emerald-400">
            {isVi ? "Phân quyền giảng dạy" : "Teaching & Assessment"}
          </p>
          <p className="text-[11px] text-slate-500 dark:text-slate-400">
            {isVi
              ? "Quyền: Xem lớp phụ trách, vào điểm thi, kéo điểm Google Classroom, điểm danh và tải tài liệu lớp. Không xem tài chính."
              : "Permissions: Assigned classes, grading sheet, Classroom grade sync, attendance, class uploads. No finance access."}
          </p>
        </div>
      </div>

      {/* 4. Staff Directory Table */}
      <div className="bg-white dark:bg-[#1c1610] rounded-2xl border border-slate-200/90 dark:border-[#2a354b] shadow-xs overflow-hidden transition-colors">
        <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-[#2a354b] flex items-center justify-between">
          <div>
            <h3 className="font-heading font-black text-sm text-slate-900 dark:text-white uppercase tracking-tight">
              {isVi ? "Danh Sách Thành Viên Đội Ngũ" : "Staff Directory"}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {staffList.length} {isVi ? "tài khoản nhân sự đang hoạt động" : "active staff profiles"}
            </p>
          </div>
        </div>

        {loading ? (
          <div className="py-16 text-center text-slate-400 text-xs">Đang tải danh sách nhân sự...</div>
        ) : staffList.length === 0 ? (
          <div className="py-16 text-center text-slate-400 space-y-2">
            <p className="font-semibold text-slate-700 dark:text-slate-300 text-sm">
              {isVi ? "Chưa có tài khoản nhân sự bổ sung nào" : "No staff accounts added yet"}
            </p>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              {isVi
                ? "Bấm '+ Thêm Thành Viên Mới' ở trên để phân quyền Gmail cho Người chăm sóc học vụ hoặc Giáo viên."
                : "Click '+ Add Staff Member' to authorize Gmail addresses."}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600 dark:text-slate-300">
              <thead className="bg-slate-50 dark:bg-[#121824] border-b border-slate-100 dark:border-[#2a354b] text-[10px] font-heading font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                <tr>
                  <th className="py-3 px-4">Thành viên</th>
                  <th className="py-3 px-4">Gmail đăng nhập</th>
                  <th className="py-3 px-4 text-center">Vai trò & Quyền hạn</th>
                  <th className="py-3 px-4">Lớp phụ trách</th>
                  <th className="py-3 px-4 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-[#2a354b]">
                {staffList.map((st) => {
                  const roleConfig = STAFF_ROLES[st.role?.toUpperCase()] || STAFF_ROLES.CONSULTANT;
                  const assignedClassNames = classes
                    .filter((c) => st.assignedClassIds?.includes(c.classId))
                    .map((c) => c.code || c.name);

                  return (
                    <tr
                      key={st.staffId}
                      className="hover:bg-slate-50/60 dark:hover:bg-[#1a2334] transition-colors"
                    >
                      <td className="py-3.5 px-4">
                        <div className="font-heading font-bold text-slate-900 dark:text-white">
                          {st.fullName || "—"}
                        </div>
                        {st.phone && <div className="text-[11px] text-slate-400 font-mono">{st.phone}</div>}
                      </td>

                      <td className="py-3.5 px-4 font-mono font-medium text-slate-800 dark:text-slate-200">
                        {st.email}
                      </td>

                      <td className="py-3.5 px-4 text-center">
                        <span
                          className={`inline-block px-2.5 py-1 rounded-full text-[10px] font-heading font-bold uppercase tracking-wider border ${roleConfig.badgeColor}`}
                        >
                          {isVi ? roleConfig.labelVi : roleConfig.labelEn}
                        </span>
                        <div className="text-[10px] text-slate-400 mt-1 max-w-xs mx-auto line-clamp-1">
                          {isVi ? roleConfig.descriptionVi : roleConfig.descriptionEn}
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        {assignedClassNames.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {assignedClassNames.map((cn, i) => (
                              <span
                                key={i}
                                className="px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300"
                              >
                                {cn}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-[11px] text-slate-400 italic">
                            {st.role === "instructor" ? "Chưa gán lớp" : "Toàn bộ học viên"}
                          </span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        {canManageStaff ? (
                          <div className="inline-flex items-center gap-1.5">
                            <button
                              onClick={() => handleOpenEdit(st)}
                              className="px-2.5 py-1 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 font-semibold text-xs transition"
                            >
                              Sửa
                            </button>
                            <button
                              onClick={() => handleDelete(st)}
                              className="px-2.5 py-1 rounded-lg text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 font-semibold text-xs transition"
                            >
                              Xóa
                            </button>
                          </div>
                        ) : (
                          <span className="text-[11px] text-slate-400">Chỉ xem</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 5. Add / Edit Staff Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto animate-fade-in">
          <div className="bg-white dark:bg-[#1c1610] rounded-3xl shadow-2xl border border-slate-200 dark:border-[#2a354b] w-full max-w-lg overflow-hidden my-auto">
            {/* Modal Header */}
            <div className="p-6 bg-gradient-to-r from-[#261e16] to-[#1c1610] text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#c27803]/20 flex items-center justify-center text-xl">
                  {editingStaff ? "✏️" : "👤"}
                </div>
                <div>
                  <h3 className="font-heading font-black text-base text-white tracking-tight">
                    {editingStaff
                      ? isVi ? "Chỉnh Sửa Quyền Nhân Sự" : "Edit Staff Permissions"
                      : isVi ? "Thêm Nhân Sự & Phân Quyền Mới" : "Add Staff & Assign Role"}
                  </h3>
                  <p className="text-[11px] text-slate-300">
                    Chỉ Super Admin ({SUPER_ADMIN_EMAIL}) có quyền thực hiện
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center text-sm font-bold transition"
              >
                ✕
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {formError && (
                <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs rounded-xl font-medium flex items-center gap-2">
                  <span>⚠️</span>
                  <span>{formError}</span>
                </div>
              )}

              {/* Email Input */}
              <div className="space-y-1">
                <label className="block text-xs font-heading font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  Gmail Tài Khoản <span className="text-rose-500">*</span>
                </label>
                <input
                  type="email"
                  required
                  disabled={!!editingStaff}
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="giaovien@gmail.com hoặc tuvanvien@gmail.com"
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-[#1a2232] border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#c27803]/20 focus:border-[#c27803] disabled:opacity-50"
                />
                <p className="text-[10px] text-slate-400">
                  Thành viên sẽ đăng nhập bằng nút "Đăng nhập với Google" sử dụng đúng Gmail này.
                </p>
              </div>

              {/* Full Name & Phone */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="block text-xs font-heading font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                    Họ và Tên
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.fullName}
                    onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                    placeholder="Nguyễn Văn A"
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-[#1a2232] border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#c27803]/20 focus:border-[#c27803]"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-heading font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                    Số Điện Thoại
                  </label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="0912 345 678"
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-[#1a2232] border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#c27803]/20 focus:border-[#c27803]"
                  />
                </div>
              </div>

              {/* Role Selection */}
              <div className="space-y-1.5">
                <label className="block text-xs font-heading font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  Vai Trò & Phân Quyền <span className="text-rose-500">*</span>
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <label
                    className={`p-3 rounded-xl border cursor-pointer transition flex items-start gap-2.5 ${
                      formData.role === "consultant"
                        ? "bg-blue-50/70 dark:bg-blue-950/40 border-blue-300 dark:border-blue-700"
                        : "bg-slate-50 dark:bg-[#1a2232] border-slate-200 dark:border-slate-700"
                    }`}
                  >
                    <input
                      type="radio"
                      name="role"
                      value="consultant"
                      checked={formData.role === "consultant"}
                      onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                      className="mt-0.5 text-blue-600"
                    />
                    <div>
                      <div className="text-xs font-heading font-bold text-slate-900 dark:text-white">
                        Chăm sóc học vụ
                      </div>
                      <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 leading-snug">
                        Quản lý học viên, theo dõi học phí, điểm danh & tài liệu
                      </div>
                    </div>
                  </label>

                  <label
                    className={`p-3 rounded-xl border cursor-pointer transition flex items-start gap-2.5 ${
                      formData.role === "instructor"
                        ? "bg-emerald-50/70 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-700"
                        : "bg-slate-50 dark:bg-[#1a2232] border-slate-200 dark:border-slate-700"
                    }`}
                  >
                    <input
                      type="radio"
                      name="role"
                      value="instructor"
                      checked={formData.role === "instructor"}
                      onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                      className="mt-0.5 text-emerald-600"
                    />
                    <div>
                      <div className="text-xs font-heading font-bold text-slate-900 dark:text-white">
                        Giáo viên (Instructor)
                      </div>
                      <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 leading-snug">
                        Vào điểm số, kéo điểm Classroom, điểm danh lớp dạy
                      </div>
                    </div>
                  </label>
                </div>
              </div>

              {/* Assigned Classes (Especially useful for Instructors) */}
              <div className="space-y-1.5">
                <label className="block text-xs font-heading font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  Lớp Phụ Trách ({formData.assignedClassIds.length} lớp đã chọn)
                </label>
                <div className="max-h-32 overflow-y-auto p-2 bg-slate-50 dark:bg-[#1a2232] border border-slate-200 dark:border-slate-700 rounded-xl space-y-1">
                  {classes.map((cls) => {
                    const isChecked = formData.assignedClassIds.includes(cls.classId);
                    return (
                      <label
                        key={cls.classId}
                        className="flex items-center gap-2 p-1.5 hover:bg-white dark:hover:bg-slate-800 rounded-lg text-xs cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => handleToggleClass(cls.classId)}
                          className="rounded text-[#c27803]"
                        />
                        <span className="font-bold text-slate-800 dark:text-slate-200">{cls.code}</span>
                        <span className="text-slate-500 truncate">- {cls.name}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Modal Actions */}
              <div className="pt-3 border-t border-slate-100 dark:border-[#2a354b] flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-xs font-heading font-bold uppercase tracking-wider hover:bg-slate-100 transition"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-6 py-2.5 rounded-xl bg-[#c27803] hover:bg-[#92400e] disabled:opacity-50 text-white text-xs font-heading font-bold uppercase tracking-wider shadow-sm transition active:scale-95"
                >
                  {submitting ? "Đang lưu..." : editingStaff ? "Lưu Thay Đổi" : "Cấp Quyền Nhân Sự"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default StaffManagementPage;
