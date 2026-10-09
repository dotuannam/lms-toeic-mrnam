import { doc, getDoc, setDoc, onSnapshot, serverTimestamp } from "firebase/firestore";
import { db } from "../config/firebase";
import { CENTER_CONFIG } from "../config/appConfig";
import { sendEmailNotification } from "./api";
import { getLocalCenterConfig } from "./settingsService";

const SETTINGS_COLLECTION = "system_settings";
const EMAIL_TEMPLATES_DOC_ID = "email_templates";

/**
 * Danh sách biến động (Dynamic Variables) được hỗ trợ trên toàn hệ thống
 */
export const AVAILABLE_VARIABLES = [
  { key: "{{ten_hoc_vien}}", label: "Tên học viên", sample: "Nguyễn Văn An", category: "student" },
  { key: "{{ma_hoc_vien}}", label: "Mã học viên", sample: "TO550_01", category: "student" },
  { key: "{{email_hoc_vien}}", label: "Email học viên", sample: "an.nguyen@example.com", category: "student" },
  { key: "{{sdt_hoc_vien}}", label: "Số điện thoại", sample: "0912 345 678", category: "student" },
  { key: "{{ten_lop}}", label: "Tên lớp học", sample: "TOEIC Target 550 - K01", category: "class" },
  { key: "{{ma_lop}}", label: "Mã lớp", sample: "TO55001", category: "class" },
  { key: "{{ngay_khai_giang}}", label: "Ngày khai giảng", sample: "15/10/2026", category: "class" },
  { key: "{{ca_hoc}}", label: "Lịch học / Ca dạy", sample: "Thứ 2 - 4 - 6 (18:00 - 19:30)", category: "class" },
  { key: "{{giang_vien}}", label: "Giảng viên phụ trách", sample: "Thầy Nam", category: "class" },
  { key: "{{hoc_phi}}", label: "Học phí", sample: "4.500.000 ₫", category: "class" },
  { key: "{{link_classroom}}", label: "Link Google Classroom", sample: "https://classroom.google.com", category: "links" },
  { key: "{{link_drive}}", label: "Link Thư mục Drive", sample: "https://drive.google.com", category: "links" },
  { key: "{{ten_trung_tam}}", label: "Tên trung tâm", sample: CENTER_CONFIG.centerName || "TOEIC MR.NAM", category: "center" },
  { key: "{{email_trung_tam}}", label: "Email trung tâm", sample: CENTER_CONFIG.adminEmail || "support@center.edu.vn", category: "center" },
  { key: "{{hotline_trung_tam}}", label: "Hotline trung tâm", sample: "0912 345 678", category: "center" },
];

/**
 * Các mẫu Email chuẩn mặc định của hệ thống
 */
export const DEFAULT_EMAIL_TEMPLATES = [
  {
    id: "opening_notice",
    isBuiltIn: true,
    name: "Thông báo khai giảng & Chào mừng",
    category: "opening",
    icon: "🎓",
    subject: "[{{ten_trung_tam}}] Chào mừng & Thông báo lịch khai giảng lớp {{ten_lop}}",
    description: "Gửi nhắc nhở ngày khai giảng, ca học, giảng viên và tài liệu học tập trước ngày bắt đầu.",
    content: `
<p>Chào bạn <strong>{{ten_hoc_vien}}</strong>,</p>

<p>Trung tâm <strong>{{ten_trung_tam}}</strong> xin chúc mừng và nhiệt liệt chào đón bạn đã chính thức gia nhập lớp học <strong>{{ten_lop}}</strong>!</p>

<div style="background-color: #f1f5f9; border-left: 4px solid #4f46e5; padding: 16px 20px; border-radius: 8px; margin: 20px 0;">
  <h3 style="margin-top: 0; margin-bottom: 12px; color: #1e293b; font-size: 16px;">📌 THÔNG TIN KHÓA HỌC CỦA BẠN:</h3>
  <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
    <tr>
      <td style="padding: 6px 0; color: #64748b; width: 140px;">Mã học viên:</td>
      <td style="padding: 6px 0; font-weight: 600; color: #0f172a;">{{ma_hoc_vien}}</td>
    </tr>
    <tr>
      <td style="padding: 6px 0; color: #64748b;">Lớp học:</td>
      <td style="padding: 6px 0; font-weight: 600; color: #0f172a;">{{ten_lop}} ({{ma_lop}})</td>
    </tr>
    <tr>
      <td style="padding: 6px 0; color: #64748b;">Ngày khai giảng:</td>
      <td style="padding: 6px 0; font-weight: 700; color: #4f46e5; font-size: 15px;">{{ngay_khai_giang}}</td>
    </tr>
    <tr>
      <td style="padding: 6px 0; color: #64748b;">Thời gian & Ca học:</td>
      <td style="padding: 6px 0; font-weight: 600; color: #0f172a;">{{ca_hoc}}</td>
    </tr>
    <tr>
      <td style="padding: 6px 0; color: #64748b;">Giảng viên:</td>
      <td style="padding: 6px 0; font-weight: 600; color: #0f172a;">{{giang_vien}}</td>
    </tr>
  </table>
</div>

<h3 style="color: #1e293b; font-size: 15px; margin-top: 24px;">🔗 KHÔNG GIAN HỌC TẬP TRỰC TUYẾN:</h3>
<p style="color: #475569; font-size: 14px;">Để chuẩn bị tốt nhất cho buổi học đầu tiên, bạn vui lòng truy cập các đường dẫn tài liệu và lớp học bên dưới:</p>

<div style="margin: 20px 0; display: flex; gap: 12px;">
  <a href="{{link_classroom}}" style="background-color: #059669; color: #ffffff; padding: 10px 18px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 13px; display: inline-block; margin-right: 10px;">
    🏫 Vào Google Classroom Lớp
  </a>
  <a href="{{link_drive}}" style="background-color: #2563eb; color: #ffffff; padding: 10px 18px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 13px; display: inline-block;">
    📁 Thư Mục Giáo Trình Drive
  </a>
</div>

<div style="background-color: #fffbeb; border: 1px solid #fef3c7; border-radius: 8px; padding: 14px 18px; margin-top: 20px;">
  <p style="margin: 0; color: #92400e; font-size: 13px; line-height: 1.5;">
    💡 <strong>Lưu ý cho buổi học đầu:</strong> Bạn vui lòng có mặt trước giờ học 10 phút để ổn định vị trí, chuẩn bị sẵn sổ tay, tai nghe và kiểm tra kết nối thiết bị.
  </p>
</div>

<p style="margin-top: 24px; color: #475569;">Nếu cần hỗ trợ kỹ thuật hoặc có thắc mắc, bạn có thể phản hồi trực tiếp email này hoặc liên hệ hotline trung tâm.</p>
<p style="color: #1e293b; font-weight: 600;">Chúc bạn có một khóa học nhiều hứng khởi và đạt điểm số mục tiêu thật xuất sắc!</p>
    `.trim(),
  },
  {
    id: "first_day_reminder",
    isBuiltIn: true,
    name: "Nhắc lịch học buổi 01 (Ngày mai)",
    category: "reminder",
    icon: "⏰",
    subject: "[{{ten_trung_tam}}] Nhắc lịch học buổi đầu tiên lớp {{ten_lop}} vào ngày mai",
    description: "Nhắc nhở học viên 24h trước buổi học khai giảng đầu tiên.",
    content: `
<p>Chào bạn <strong>{{ten_hoc_vien}}</strong>,</p>

<p>Đây là tin nhắn nhắc nhở thân mật từ <strong>{{ten_trung_tam}}</strong>: Lớp học <strong>{{ten_lop}}</strong> của bạn sẽ chính thức bắt đầu buổi học đầu tiên vào <strong>ngày mai ({{ngay_khai_giang}})</strong>.</p>

<div style="background-color: #eff6ff; border-left: 4px solid #3b82f6; padding: 16px; border-radius: 8px; margin: 16px 0;">
  <p style="margin: 0 0 8px 0; font-size: 14px;">⏰ <strong>Ca học:</strong> {{ca_hoc}}</p>
  <p style="margin: 0 0 8px 0; font-size: 14px;">👨‍🏫 <strong>Giảng viên phụ trách:</strong> {{giang_vien}}</p>
  <p style="margin: 0; font-size: 14px;">🏫 <strong>Lớp học trực tuyến:</strong> <a href="{{link_classroom}}" style="color: #2563eb; font-weight: 600;">Google Classroom</a></p>
</div>

<p>Bạn nhớ vào lớp sớm 10 phút để điểm danh và nhận tài liệu khởi động nhé. Hẹn gặp bạn trong buổi học ngày mai!</p>
    `.trim(),
  },
  {
    id: "tuition_notice",
    isBuiltIn: true,
    name: "Thông báo hoàn tất học phí",
    category: "finance",
    icon: "💳",
    subject: "[{{ten_trung_tam}}] Thông báo học phí khóa học {{ten_lop}} - Học viên: {{ten_hoc_vien}}",
    description: "Gửi nhắc nhở và thông tin chuyển khoản học phí cho học viên.",
    content: `
<p>Chào bạn <strong>{{ten_hoc_vien}}</strong>,</p>

<p>Phòng Đào tạo <strong>{{ten_trung_tam}}</strong> xin gửi thông báo về tình trạng học phí khóa học <strong>{{ten_lop}}</strong> (Mã học viên: <strong>{{ma_hoc_vien}}</strong>).</p>

<div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 18px; margin: 18px 0;">
  <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
    <tr>
      <td style="padding: 8px 0; color: #64748b;">Học phí khóa học:</td>
      <td style="padding: 8px 0; font-weight: 700; color: #0f172a; text-align: right;">{{hoc_phi}}</td>
    </tr>
    <tr>
      <td style="padding: 8px 0; color: #64748b;">Lớp áp dụng:</td>
      <td style="padding: 8px 0; font-weight: 600; color: #4f46e5; text-align: right;">{{ten_lop}}</td>
    </tr>
  </table>
</div>

<p>Bạn có thể quét mã VietQR hoặc chuyển khoản trực tiếp qua thông tin tài khoản của trung tâm. Sau khi chuyển khoản, hệ thống sẽ tự động cập nhật biên lai trong vòng 15-30 phút.</p>

<p>Trân trọng cảm ơn sự hợp tác của bạn!</p>
    `.trim(),
  },
  {
    id: "progress_report",
    isBuiltIn: true,
    name: "Báo cáo kết quả kiểm tra định kỳ",
    category: "score",
    icon: "📊",
    subject: "[{{ten_trung_tam}}] Báo cáo kết quả kiểm tra định kỳ lớp {{ten_lop}} - {{ten_hoc_vien}}",
    description: "Thông báo điểm thi định kỳ, đánh giá kỹ năng và lời khuyên từ giáo viên.",
    content: `
<p>Chào bạn <strong>{{ten_hoc_vien}}</strong>,</p>

<p>Giảng viên phụ trách <strong>{{giang_vien}}</strong> vừa hoàn tất chấm và tổng kết bài kiểm tra định kỳ của lớp <strong>{{ten_lop}}</strong>.</p>

<p>Kết quả chi tiết và nhận xét đánh giá kỹ năng đã được cập nhật đầy đủ trên Cổng Học Viên của bạn.</p>

<div style="margin: 20px 0;">
  <a href="https://classroom.google.com" style="background-color: #4f46e5; color: #ffffff; padding: 12px 20px; text-decoration: none; border-radius: 8px; font-weight: 600; display: inline-block;">
    📊 Xem Bảng Điểm & Nhận Xét Chi Tiết
  </a>
</div>

<p>Hãy duy trì phong độ và liên hệ ngay với giáo viên nếu cần giải đáp thêm các câu hỏi trong bài thi nhé!</p>
    `.trim(),
  },
  {
    id: "holiday_reschedule",
    isBuiltIn: true,
    name: "Thông báo nghỉ học / Học bù",
    category: "announcement",
    icon: "🏖️",
    subject: "[{{ten_trung_tam}}] Thông báo lịch nghỉ học & học bù lớp {{ten_lop}}",
    description: "Thông báo lịch nghỉ lễ hoặc dời lịch học, ngày học bù.",
    content: `
<p>Kính gửi quý học viên lớp <strong>{{ten_lop}}</strong>,</p>

<p>Trung tâm <strong>{{ten_trung_tam}}</strong> xin trân trọng thông báo về lịch nghỉ học và kế hoạch học bù như sau:</p>

<div style="background-color: #fef2f2; border-left: 4px solid #ef4444; padding: 16px; border-radius: 8px; margin: 16px 0;">
  <p style="margin: 0; color: #991b1b; font-size: 14px; font-weight: 500;">
    Lớp <strong>{{ten_lop}}</strong> sẽ tạm nghỉ học theo lịch nghỉ của trung tâm và sẽ tiếp tục học lại vào buổi kế tiếp theo lịch: <strong>{{ca_hoc}}</strong>.
  </p>
</div>

<p>Mọi bài tập và tài liệu tự học trong thời gian nghỉ đã được giảng viên <strong>{{giang_vien}}</strong> cập nhật trên thư mục Google Drive của lớp.</p>

<p>Chúc bạn và gia đình có kỳ nghỉ an lành và vui vẻ!</p>
    `.trim(),
  },
  {
    id: "general_notice",
    isBuiltIn: true,
    name: "Thông báo chung từ trung tâm",
    category: "general",
    icon: "📢",
    subject: "[{{ten_trung_tam}}] Thông báo quan trọng gửi lớp {{ten_lop}}",
    description: "Mẫu thông báo thông tin chung, quy chế hoặc cập nhật mới.",
    content: `
<p>Chào bạn <strong>{{ten_hoc_vien}}</strong>,</p>

<p>Trung tâm <strong>{{ten_trung_tam}}</strong> xin gửi thông báo mới nhất đến toàn thể học viên lớp <strong>{{ten_lop}}</strong>:</p>

<div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 18px; margin: 16px 0;">
  <p style="margin: 0; font-size: 14px; color: #334155;">
    [Nhập nội dung thông báo chi tiết tại đây...]
  </p>
</div>

<p>Nếu bạn có bất kỳ câu hỏi nào, xin vui lòng phản hồi email này để được giải đáp sớm nhất.</p>
<p>Trân trọng,<br><strong>Đội ngũ Đào tạo {{ten_trung_tam}}</strong></p>
    `.trim(),
  },
];

/**
 * Thay thế biến động {{key}} bằng giá trị tương ứng
 */
export const replaceVariables = (templateText = "", variableMap = {}) => {
  if (!templateText) return "";
  let result = templateText;
  Object.keys(variableMap).forEach((key) => {
    const val = variableMap[key] !== undefined && variableMap[key] !== null ? String(variableMap[key]) : "";
    // Regex replace all occurrences
    const escapedKey = key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    result = result.replace(new RegExp(escapedKey, "g"), val);
  });
  return result;
};

/**
 * Bọc nội dung email bên trong khung chuẩn HTML đẹp mắt, tương thích Gmail & thiết bị di động
 */
export const wrapEmailInHtml = ({
  title = "Thông báo từ trung tâm",
  contentHtml = "",
  centerName = null,
  adminEmail = null,
}) => {
  const activeCenter = getLocalCenterConfig();
  const effectiveCenterName = centerName || activeCenter?.centerName || CENTER_CONFIG.centerName || "TOEIC MR.NAM";
  const effectiveAdminEmail = adminEmail || activeCenter?.adminEmail || CENTER_CONFIG.adminEmail || "support@center.edu.vn";

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    body {
      margin: 0;
      padding: 0;
      background-color: #f8fafc;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      color: #1e293b;
      line-height: 1.6;
    }
    .wrapper {
      max-width: 620px;
      margin: 20px auto;
      background-color: #ffffff;
      border-radius: 16px;
      overflow: hidden;
      border: 1px solid #e2e8f0;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
    }
    .header {
      background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%);
      color: #ffffff;
      padding: 28px 24px;
      text-align: center;
    }
    .header h1 {
      margin: 0;
      font-size: 20px;
      font-weight: 800;
      letter-spacing: 0.5px;
    }
    .header p {
      margin: 6px 0 0 0;
      opacity: 0.9;
      font-size: 13px;
    }
    .body-content {
      padding: 28px 24px;
      font-size: 14.5px;
      color: #334155;
    }
    .body-content p {
      margin: 0 0 16px 0;
    }
    .body-content ul, .body-content ol {
      margin: 0 0 16px 0;
      padding-left: 24px;
    }
    .body-content li {
      margin-bottom: 6px;
    }
    .footer {
      background-color: #f8fafc;
      border-top: 1px solid #e2e8f0;
      padding: 20px 24px;
      text-align: center;
      font-size: 12px;
      color: #94a3b8;
    }
    .footer a {
      color: #6366f1;
      text-decoration: none;
    }
    @media only screen and (max-width: 600px) {
      .wrapper {
        margin: 0 !important;
        border-radius: 0 !important;
        border: none !important;
      }
      .body-content {
        padding: 20px 16px !important;
      }
    }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="header">
      <h1>${effectiveCenterName}</h1>
      <p>Hệ Thống Đào Tạo & Quản Lý Học Viên Trực Tuyến</p>
    </div>
    <div class="body-content">
      ${contentHtml}
    </div>
    <div class="footer">
      <p style="margin: 0 0 4px 0;"><strong>${effectiveCenterName}</strong> &bull; Hỗ trợ học viên: <a href="mailto:${effectiveAdminEmail}">${effectiveAdminEmail}</a></p>
      <p style="margin: 0;">Email này được gửi tự động từ hệ thống quản lý học viên LMS.</p>
    </div>
  </div>
</body>
</html>`;
};

const LOCAL_TEMPLATES_KEY = "lms_email_templates_cache";

/**
 * Trợ giúp đọc bộ nhớ đệm mẫu email cục bộ
 */
const getLocalTemplates = () => {
  try {
    const raw = localStorage.getItem(LOCAL_TEMPLATES_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (err) {
    console.warn("Could not read email templates from localStorage:", err);
  }
  return null;
};

/**
 * Trợ giúp ghi đè bộ nhớ đệm mẫu email cục bộ
 */
const setLocalTemplates = (templates) => {
  try {
    localStorage.setItem(LOCAL_TEMPLATES_KEY, JSON.stringify(templates));
  } catch (err) {
    console.warn("Could not write email templates to localStorage:", err);
  }
};

/**
 * Lấy danh sách mẫu email từ Firestore (có cơ chế dự phòng an toàn qua localStorage và mẫu mặc định)
 */
export const getEmailTemplates = async () => {
  // 1. Thử lấy từ Firestore Cloud
  try {
    const docRef = doc(db, SETTINGS_COLLECTION, EMAIL_TEMPLATES_DOC_ID);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      const data = snap.data();
      if (data.templates && data.templates.length > 0) {
        setLocalTemplates(data.templates);
        return data.templates;
      }
    }
  } catch (err) {
    console.warn("Firestore fetch email templates warning (falling back to cache):", err);
  }

  // 2. Dự phòng lấy từ localStorage nếu Firestore chưa có quyền hoặc offline
  const cached = getLocalTemplates();
  if (cached && cached.length > 0) {
    return cached;
  }

  // 3. Sử dụng mẫu tích hợp mặc định
  return DEFAULT_EMAIL_TEMPLATES;
};

/**
 * Lắng nghe cập nhật danh sách mẫu email realtime với cơ chế dự phòng bộ nhớ đệm
 */
export const subscribeEmailTemplates = (callback) => {
  const docRef = doc(db, SETTINGS_COLLECTION, EMAIL_TEMPLATES_DOC_ID);

  // Gửi ngay dữ liệu đệm ban đầu để giao diện hiển thị tức thì
  const initialData = getLocalTemplates() || DEFAULT_EMAIL_TEMPLATES;
  callback(initialData);

  return onSnapshot(
    docRef,
    (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data.templates && data.templates.length > 0) {
          setLocalTemplates(data.templates);
          callback(data.templates);
          return;
        }
      }
      callback(getLocalTemplates() || DEFAULT_EMAIL_TEMPLATES);
    },
    (err) => {
      console.warn("Email templates subscription permission/network fallback to cache:", err);
      callback(getLocalTemplates() || DEFAULT_EMAIL_TEMPLATES);
    }
  );
};

/**
 * Lưu hoặc cập nhật mẫu email (tự động lưu cả vào localStorage và đồng bộ Firestore)
 */
export const saveEmailTemplate = async (templateData) => {
  const currentTemplates = (await getEmailTemplates()) || DEFAULT_EMAIL_TEMPLATES;
  let updatedList;

  const existingIndex = currentTemplates.findIndex((t) => t.id === templateData.id);
  if (existingIndex >= 0) {
    updatedList = [...currentTemplates];
    updatedList[existingIndex] = {
      ...updatedList[existingIndex],
      ...templateData,
      updatedAt: new Date().toISOString(),
    };
  } else {
    const newId = templateData.id || `tpl_${Date.now()}`;
    updatedList = [
      ...currentTemplates,
      {
        ...templateData,
        id: newId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ];
  }

  // Luôn luôn lưu trước vào LocalStorage để đảm bảo người dùng không bao giờ mất dữ liệu đã soạn
  setLocalTemplates(updatedList);

  // Đồng bộ lên Firestore (bắt lỗi phân quyền nếu rules chưa được deploy lên server)
  try {
    const docRef = doc(db, SETTINGS_COLLECTION, EMAIL_TEMPLATES_DOC_ID);
    await setDoc(docRef, { templates: updatedList, updatedAt: serverTimestamp() }, { merge: true });
  } catch (err) {
    console.warn("Lưu Firestore gặp lỗi phân quyền hoặc kết nối, đã lưu thành công vào bộ nhớ cục bộ:", err);
  }

  return updatedList;
};

/**
 * Xóa một mẫu email
 */
export const deleteEmailTemplate = async (templateId) => {
  const currentTemplates = (await getEmailTemplates()) || DEFAULT_EMAIL_TEMPLATES;
  const updatedList = currentTemplates.filter((t) => t.id !== templateId);

  setLocalTemplates(updatedList);

  try {
    const docRef = doc(db, SETTINGS_COLLECTION, EMAIL_TEMPLATES_DOC_ID);
    await setDoc(docRef, { templates: updatedList, updatedAt: serverTimestamp() }, { merge: true });
  } catch (err) {
    console.warn("Lỗi đồng bộ xóa Firestore, đã xóa trong bộ nhớ cục bộ:", err);
  }

  return updatedList;
};

/**
 * Khôi phục về danh sách mẫu mặc định ban đầu
 */
export const resetDefaultEmailTemplates = async () => {
  setLocalTemplates(DEFAULT_EMAIL_TEMPLATES);

  try {
    const docRef = doc(db, SETTINGS_COLLECTION, EMAIL_TEMPLATES_DOC_ID);
    await setDoc(docRef, { templates: DEFAULT_EMAIL_TEMPLATES, updatedAt: serverTimestamp() }, { merge: true });
  } catch (err) {
    console.warn("Lỗi đồng bộ khôi phục Firestore, đã khôi phục bộ nhớ cục bộ:", err);
  }

  return DEFAULT_EMAIL_TEMPLATES;
};

/**
 * Tạo biến ánh xạ chuẩn cho 1 học viên và 1 lớp học
 */
export const buildVariableMap = (student = {}, cls = {}) => {
  const rawStartDate = cls.startDate || "";
  let formattedStartDate = rawStartDate;
  if (rawStartDate.includes("-")) {
    const parts = rawStartDate.split("-");
    if (parts.length === 3) formattedStartDate = `${parts[2]}/${parts[1]}/${parts[0]}`;
  }

  return {
    "{{ten_hoc_vien}}": student.fullName || student.name || "Học viên",
    "{{ma_hoc_vien}}": student.studentId || "HV_MEMBER",
    "{{email_hoc_vien}}": student.email || "",
    "{{sdt_hoc_vien}}": student.phone || "",
    "{{ten_lop}}": cls.name || "Khóa học",
    "{{ma_lop}}": cls.code || "",
    "{{ngay_khai_giang}}": formattedStartDate || "Sắp thông báo",
    "{{ca_hoc}}": cls.schedule || "Lịch chuẩn trung tâm",
    "{{giang_vien}}": cls.teacherName || "Thầy Nam",
    "{{hoc_phi}}": cls.tuitionFee ? `${Number(cls.tuitionFee).toLocaleString("vi-VN")} ₫` : "Theo thông báo",
    "{{link_classroom}}": cls.integrations?.googleClassroom?.alternateLink || "https://classroom.google.com",
    "{{link_drive}}": cls.integrations?.googleDrive?.folderLink || "https://drive.google.com",
    "{{ten_trung_tam}}": getLocalCenterConfig()?.centerName || CENTER_CONFIG.centerName || "TOEIC MR.NAM",
    "{{email_trung_tam}}": getLocalCenterConfig()?.adminEmail || CENTER_CONFIG.adminEmail || "support@center.edu.vn",
    "{{hotline_trung_tam}}": getLocalCenterConfig()?.hotline || "0912 345 678",
  };
};

/**
 * Gửi email hàng loạt theo danh sách học viên với biến động cá nhân hóa
 */
export const sendPersonalizedBatchEmails = async ({
  students = [],
  cls = {},
  subjectTemplate = "",
  bodyHtmlTemplate = "",
  senderName = null,
  onProgress = null,
}) => {
  const activeCenter = getLocalCenterConfig();
  const effectiveSenderName = senderName || activeCenter?.centerName || CENTER_CONFIG.centerName || "TOEIC MR.NAM";
  const effectiveAdminEmail = activeCenter?.adminEmail || CENTER_CONFIG.adminEmail || "support@center.edu.vn";

  const validRecipients = students.filter((s) => s.email && s.email.includes("@"));
  const total = validRecipients.length;
  const results = {
    total,
    sent: 0,
    failed: 0,
    skipped: students.length - validRecipients.length,
    errors: [],
  };

  if (total === 0) {
    return results;
  }

  for (let i = 0; i < total; i++) {
    const student = validRecipients[i];
    const varMap = buildVariableMap(student, cls);
    const personalizedSubject = replaceVariables(subjectTemplate, varMap);
    const personalizedBodyInner = replaceVariables(bodyHtmlTemplate, varMap);
    const finalHtml = wrapEmailInHtml({
      title: personalizedSubject,
      contentHtml: personalizedBodyInner,
      centerName: effectiveSenderName,
      adminEmail: effectiveAdminEmail,
    });

    try {
      await sendEmailNotification({
        to: student.email,
        subject: personalizedSubject,
        htmlBody: finalHtml,
        senderName: effectiveSenderName,
      });
      results.sent += 1;
      if (onProgress) {
        onProgress({
          index: i + 1,
          total,
          currentStudent: student,
          success: true,
        });
      }
    } catch (err) {
      console.error(`Failed to send email to ${student.email}:`, err);
      results.failed += 1;
      results.errors.push({ student: student.fullName, email: student.email, error: err.message });
      if (onProgress) {
        onProgress({
          index: i + 1,
          total,
          currentStudent: student,
          success: false,
          error: err.message,
        });
      }
    }
  }

  return results;
};
