import { format } from "date-fns";

/**
 * Format currency to Vietnamese Dong (VND)
 */
export const formatVND = (amount) => {
  const num = Number(amount) || 0;
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
  }).format(num);
};

/**
 * Format timestamp or ISO string to VN date (DD/MM/YYYY)
 */
export const formatDateVN = (dateInput) => {
  if (!dateInput) return "N/A";
  try {
    const d =
      typeof dateInput.toDate === "function"
        ? dateInput.toDate()
        : new Date(dateInput);
    if (isNaN(d.getTime())) return String(dateInput);
    return format(d, "dd/MM/yyyy");
  } catch (e) {
    return String(dateInput);
  }
};

/**
 * Format timestamp or ISO string to VN date-time (HH:mm:ss DD/MM/YYYY)
 */
export const formatDateTimeVN = (dateInput) => {
  if (!dateInput) return "N/A";
  try {
    const d =
      typeof dateInput.toDate === "function"
        ? dateInput.toDate()
        : new Date(dateInput);
    if (isNaN(d.getTime())) return String(dateInput);
    return format(d, "HH:mm:ss dd/MM/yyyy");
  } catch (e) {
    return String(dateInput);
  }
};

/**
 * Safe string truncate for Discord limits
 */
export const truncate = (text, maxLength = 100) => {
  if (!text) return "";
  const str = String(text);
  if (str.length <= maxLength) return str;
  return str.slice(0, maxLength - 3) + "...";
};

/**
 * Human readable role labels
 */
export const translateRole = (role) => {
  const map = {
    superadmin: "👑 Tổng Quản trị (Super Admin)",
    admin: "⭐ Quản trị viên (Admin)",
    instructor: "👨‍🏫 Giảng viên (Instructor)",
    consultant: "💬 Tư vấn viên (Consultant)",
    student: "🎓 Học viên (Student)",
  };
  return map[role?.toLowerCase()] || role || "Người dùng";
};

/**
 * Human readable action descriptions with emojis
 */
export const translateAction = (action) => {
  const map = {
    USER_LOGIN: "🔑 Đăng nhập hệ thống",
    USER_LOGOUT: "🚪 Đăng xuất",
    STUDENT_CREATE: "➕ Thêm học viên mới",
    STUDENT_UPDATE: "✏️ Cập nhật học viên",
    STUDENT_DELETE: "🗑️ Xóa học viên",
    CLASS_CREATE: "🏫 Tạo lớp học mới",
    CLASS_UPDATE: "📝 Sửa thông tin lớp",
    ATTENDANCE_SAVE: "📋 Điểm danh lớp học",
    SCORE_SAVE: "📊 Nhập điểm bài thi",
    SCORE_DELETE: "❌ Xóa điểm bài thi",
    PAYMENT_RECORD: "💰 Thu học phí",
    LEDGER_ADD: "📒 Ghi sổ Thu/Chi",
    VOCAB_PRACTICE: "📚 Luyện tập từ vựng",
    GENERIC_ACTION: "⚙️ Thao tác hệ thống",
  };
  return map[action] || `⚡ ${action}`;
};
