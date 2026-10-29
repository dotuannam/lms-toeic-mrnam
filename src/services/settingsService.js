import { doc, getDoc, setDoc, onSnapshot, serverTimestamp } from "firebase/firestore";
import { db } from "../config/firebase";
import { CENTER_CONFIG } from "../config/appConfig";
import { VIETQR_CONFIG } from "../config/vietqr";

const SETTINGS_COLLECTION = "system_settings";
const SHIFTS_DOC_ID = "teaching_shifts";
const CENTER_CONFIG_DOC_ID = "center_config";
const BANKING_CONFIG_DOC_ID = "banking_config";
const ANNOUNCEMENT_CONFIG_DOC_ID = "global_announcement";
const CLASSROOM_RULES_DOC_ID = "classroom_rules";

// Danh sách ngân hàng phổ biến tại Việt Nam hỗ trợ chuẩn VietQR
export const VIETNAMESE_BANKS = [
  { code: "TCB", shortName: "Techcombank", name: "Ngân hàng Kỹ thương Việt Nam", bin: "970407" },
  { code: "VCB", shortName: "Vietcombank", name: "Ngân hàng Ngoại thương Việt Nam", bin: "970436" },
  { code: "MB", shortName: "MBBank", name: "Ngân hàng Quân đội", bin: "970422" },
  { code: "ICB", shortName: "VietinBank", name: "Ngân hàng Công thương Việt Nam", bin: "970415" },
  { code: "BIDV", shortName: "BIDV", name: "Ngân hàng Đầu tư và Phát triển Việt Nam", bin: "970418" },
  { code: "ACB", shortName: "ACB", name: "Ngân hàng Á Châu", bin: "970416" },
  { code: "VPB", shortName: "VPBank", name: "Ngân hàng Việt Nam Thịnh Vượng", bin: "970432" },
  { code: "TPB", shortName: "TPBank", name: "Ngân hàng Tiên Phong", bin: "970423" },
  { code: "VIB", shortName: "VIB", name: "Ngân hàng Quốc tế", bin: "970441" },
  { code: "STB", shortName: "Sacombank", name: "Ngân hàng Sài Gòn Thương Tín", bin: "970403" },
  { code: "HDB", shortName: "HDBank", name: "Ngân hàng Phát triển TP.HCM", bin: "970437" },
  { code: "SHB", shortName: "SHB", name: "Ngân hàng Sài Gòn - Hà Nội", bin: "970443" },
  { code: "MSB", shortName: "MSB", name: "Ngân hàng Hàng Hải", bin: "970426" },
  { code: "OCB", shortName: "OCB", name: "Ngân hàng Phương Đông", bin: "970448" },
  { code: "LPB", shortName: "LPBank", name: "Ngân hàng Lộc Phát Việt Nam", bin: "970449" },
  { code: "SEAB", shortName: "SeABank", name: "Ngân hàng Đông Nam Á", bin: "970440" },
  { code: "VAB", shortName: "VietABank", name: "Ngân hàng Việt Á", bin: "970427" },
  { code: "ABB", shortName: "ABBank", name: "Ngân hàng An Bình", bin: "970425" },
  { code: "NAB", shortName: "Nam A Bank", name: "Ngân hàng Nam Á", bin: "970428" },
  { code: "BAB", shortName: "Bac A Bank", name: "Ngân hàng Bắc Á", bin: "970409" },
  { code: "BVB", shortName: "BVBank", name: "Ngân hàng Bản Việt", bin: "970454" },
  { code: "CAKE", shortName: "CAKE by VPBank", name: "Ngân hàng số CAKE by VPBank", bin: "546034" },
  { code: "TIMO", shortName: "Timo by BVBank", name: "Ngân hàng số Timo", bin: "963388" },
  { code: "VIETTELMONEY", shortName: "Viettel Money", name: "Viettel Money", bin: "971005" },
  { code: "VNPTMONEY", shortName: "VNPT Money", name: "VNPT Money", bin: "971011" },
];

export const VIETQR_TEMPLATES = [
  { id: "compact2", name: "Mẫu chuẩn (Logo + Thông tin)", description: "Được khuyên dùng nhiều nhất, chuyên nghiệp & rõ ràng." },
  { id: "compact", name: "Mẫu thu gọn", description: "Bố cục nhỏ gọn, chiếm ít diện tích hiển thị." },
  { id: "qr_only", name: "Chỉ mã QR thuần", description: "Chỉ hiển thị hình ảnh QR, không kèm khung thông tin văn bản." },
  { id: "print", name: "Mẫu in hóa đơn", description: "Độ tương phản cao, tối ưu cho máy in phiếu học phí hoặc giấy A4/A5." },
];

// =========================================================================
// 1. THÔNG TIN TRUNG TÂM (CENTER CONFIG)
// =========================================================================
export const DEFAULT_CENTER_CONFIG = {
  centerName: CENTER_CONFIG?.centerName || "TOEIC MR.NAM",
  adminEmail: CENTER_CONFIG?.adminEmail || "dotuannamwork2809@gmail.com",
  managementReportEmail: CENTER_CONFIG?.managementReportEmail || "dotuannamwork2809@gmail.com",
  hotline: "0912 345 678",
  address: "Hà Nội, Việt Nam",
  websiteUrl: "https://auto-lms-43b1d.web.app",
  fanpageUrl: "https://facebook.com",
  slogan: "Trung tâm đào tạo Ngoại ngữ & Luyện thi chứng chỉ TOEIC chất lượng cao",
  logoText: "MR.NAM",
};

const LOCAL_CENTER_CONFIG_KEY = "lms_center_config_cache";

export const getLocalCenterConfig = () => {
  try {
    const raw = localStorage.getItem(LOCAL_CENTER_CONFIG_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === "object") {
        return { ...DEFAULT_CENTER_CONFIG, ...parsed };
      }
    }
  } catch (e) {
    console.warn("Could not read center config from localStorage:", e);
  }
  return DEFAULT_CENTER_CONFIG;
};

export const setLocalCenterConfig = (config) => {
  try {
    localStorage.setItem(LOCAL_CENTER_CONFIG_KEY, JSON.stringify(config));
  } catch (e) {
    console.warn("Could not write center config to localStorage:", e);
  }
};

export const getCenterConfig = async () => {
  try {
    const docRef = doc(db, SETTINGS_COLLECTION, CENTER_CONFIG_DOC_ID);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      const data = snap.data();
      const merged = { ...DEFAULT_CENTER_CONFIG, ...data };
      setLocalCenterConfig(merged);
      return merged;
    }
  } catch (err) {
    console.warn("Could not fetch center config from Firestore, fallback to cache:", err);
  }
  return getLocalCenterConfig();
};

export const subscribeCenterConfig = (callback) => {
  const docRef = doc(db, SETTINGS_COLLECTION, CENTER_CONFIG_DOC_ID);
  callback(getLocalCenterConfig());

  return onSnapshot(
    docRef,
    (snap) => {
      if (snap.exists()) {
        const merged = { ...DEFAULT_CENTER_CONFIG, ...snap.data() };
        setLocalCenterConfig(merged);
        callback(merged);
      } else {
        callback(getLocalCenterConfig());
      }
    },
    (err) => {
      console.warn("Center config subscription warning, fallback to cache:", err);
      callback(getLocalCenterConfig());
    }
  );
};

export const saveCenterConfig = async (configData) => {
  const updated = { ...DEFAULT_CENTER_CONFIG, ...configData, updatedAt: new Date().toISOString() };
  setLocalCenterConfig(updated);

  try {
    const docRef = doc(db, SETTINGS_COLLECTION, CENTER_CONFIG_DOC_ID);
    await setDoc(docRef, { ...updated, updatedAt: serverTimestamp() }, { merge: true });
  } catch (err) {
    console.warn("Firestore sync warning for center config, saved locally:", err);
  }
  return updated;
};

// =========================================================================
// 2. CẤU HÌNH NGÂN HÀNG & MÃ VIETQR (BANKING CONFIG)
// =========================================================================
export const DEFAULT_BANKING_CONFIG = {
  bankId: VIETQR_CONFIG?.bankId || "TCB",
  accountNo: VIETQR_CONFIG?.accountNo || "280931081998",
  accountName: VIETQR_CONFIG?.accountName || "TOEIC MR.NAM",
  template: VIETQR_CONFIG?.template || "compact2",
  defaultTransferSyntax: "HP {{ma_hoc_vien}} {{ma_lop}}",
};

const LOCAL_BANKING_CONFIG_KEY = "lms_banking_config_cache";

export const getLocalBankingConfig = () => {
  try {
    const raw = localStorage.getItem(LOCAL_BANKING_CONFIG_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === "object") {
        return { ...DEFAULT_BANKING_CONFIG, ...parsed };
      }
    }
  } catch (e) {
    console.warn("Could not read banking config from localStorage:", e);
  }
  return DEFAULT_BANKING_CONFIG;
};

export const setLocalBankingConfig = (config) => {
  try {
    localStorage.setItem(LOCAL_BANKING_CONFIG_KEY, JSON.stringify(config));
  } catch (e) {
    console.warn("Could not write banking config to localStorage:", e);
  }
};

export const getBankingConfig = async () => {
  try {
    const docRef = doc(db, SETTINGS_COLLECTION, BANKING_CONFIG_DOC_ID);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      const data = snap.data();
      const merged = { ...DEFAULT_BANKING_CONFIG, ...data };
      setLocalBankingConfig(merged);
      return merged;
    }
  } catch (err) {
    console.warn("Could not fetch banking config from Firestore, fallback to cache:", err);
  }
  return getLocalBankingConfig();
};

export const subscribeBankingConfig = (callback) => {
  const docRef = doc(db, SETTINGS_COLLECTION, BANKING_CONFIG_DOC_ID);
  callback(getLocalBankingConfig());

  return onSnapshot(
    docRef,
    (snap) => {
      if (snap.exists()) {
        const merged = { ...DEFAULT_BANKING_CONFIG, ...snap.data() };
        setLocalBankingConfig(merged);
        callback(merged);
      } else {
        callback(getLocalBankingConfig());
      }
    },
    (err) => {
      console.warn("Banking config subscription warning, fallback to cache:", err);
      callback(getLocalBankingConfig());
    }
  );
};

export const saveBankingConfig = async (configData) => {
  const updated = {
    ...DEFAULT_BANKING_CONFIG,
    ...configData,
    accountName: (configData.accountName || "").trim().toUpperCase(),
    accountNo: (configData.accountNo || "").trim().replace(/\s+/g, ""),
    updatedAt: new Date().toISOString(),
  };
  setLocalBankingConfig(updated);

  try {
    const docRef = doc(db, SETTINGS_COLLECTION, BANKING_CONFIG_DOC_ID);
    await setDoc(docRef, { ...updated, updatedAt: serverTimestamp() }, { merge: true });
  } catch (err) {
    console.warn("Firestore sync warning for banking config, saved locally:", err);
  }
  return updated;
};

/**
 * Trình tạo URL mã VietQR tương thích cao
 */
export const buildDynamicVietQrUrl = ({
  amount = 0,
  transferDescription = "",
  customConfig = null,
}) => {
  const active = customConfig || getLocalBankingConfig();
  const bankId = active.bankId || "TCB";
  const accountNo = (active.accountNo || "280931081998").trim().replace(/\s+/g, "");
  const template = active.template || "compact2";
  const accountName = encodeURIComponent((active.accountName || "TOEIC MR.NAM").trim());
  const encodedDesc = encodeURIComponent((transferDescription || "").trim().slice(0, 50));

  return `https://img.vietqr.io/image/${bankId}-${accountNo}-${template}.png?amount=${amount}&addInfo=${encodedDesc}&accountName=${accountName}`;
};

// =========================================================================
// 3. CẤU HÌNH CA DẠY (TEACHING SHIFTS)
// =========================================================================
export const DEFAULT_SHIFTS = [
  { id: "shift_1", name: "Ca Tối 1", startTime: "18:00", endTime: "19:30" },
  { id: "shift_2", name: "Ca Tối 2", startTime: "19:30", endTime: "21:00" },
  { id: "shift_3", name: "Ca Sáng", startTime: "08:30", endTime: "10:00" },
  { id: "shift_4", name: "Ca Chiều", startTime: "14:00", endTime: "15:30" },
];

const LOCAL_SHIFTS_KEY = "lms_teaching_shifts_cache";

const getLocalShifts = () => {
  try {
    const raw = localStorage.getItem(LOCAL_SHIFTS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch (e) {
    console.warn("Could not read shifts from localStorage:", e);
  }
  return null;
};

const setLocalShifts = (shifts) => {
  try {
    localStorage.setItem(LOCAL_SHIFTS_KEY, JSON.stringify(shifts));
  } catch (e) {
    console.warn("Could not write shifts to localStorage:", e);
  }
};

export const getTeachingShifts = async () => {
  try {
    const docRef = doc(db, SETTINGS_COLLECTION, SHIFTS_DOC_ID);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      const data = docSnap.data();
      if (data.shifts && data.shifts.length > 0) {
        setLocalShifts(data.shifts);
        return data.shifts;
      }
    }
  } catch (err) {
    console.warn("Could not fetch teaching shifts from Firestore, using cache fallback:", err);
  }

  const cached = getLocalShifts();
  if (cached && cached.length > 0) {
    return cached;
  }

  return DEFAULT_SHIFTS;
};

export const subscribeTeachingShifts = (callback) => {
  const docRef = doc(db, SETTINGS_COLLECTION, SHIFTS_DOC_ID);
  const initial = getLocalShifts() || DEFAULT_SHIFTS;
  callback(initial);

  return onSnapshot(
    docRef,
    (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data.shifts && data.shifts.length > 0) {
          setLocalShifts(data.shifts);
          callback(data.shifts);
          return;
        }
      }
      callback(getLocalShifts() || DEFAULT_SHIFTS);
    },
    (err) => {
      console.warn("Shifts subscription error, fallback to cache:", err);
      callback(getLocalShifts() || DEFAULT_SHIFTS);
    }
  );
};

export const saveTeachingShifts = async (shiftsList) => {
  setLocalShifts(shiftsList);

  try {
    const docRef = doc(db, SETTINGS_COLLECTION, SHIFTS_DOC_ID);
    await setDoc(
      docRef,
      {
        shifts: shiftsList,
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );
  } catch (err) {
    console.warn("Could not sync shifts to Firestore, saved locally:", err);
  }

  return shiftsList;
};

// =========================================================================
// 4. CẤU HÌNH GOOGLE APPS SCRIPT WEB APP (GAS CONFIG)
// =========================================================================
const GAS_CONFIG_DOC_ID = "gas_config";
const LOCAL_GAS_CONFIG_KEY = "lms_gas_config_cache";

export const DEFAULT_GAS_CONFIG = {
  webAppUrl: import.meta.env.VITE_GAS_API_URL || "https://script.google.com/macros/s/AKfycbxxzJsYWS8O6BirSoUEvuPGC53EP2HD-5lRD4UhpM-X6UdKtVADjx3_VXzsi8INGJQ/exec",
  apiSecret: import.meta.env.VITE_GAS_API_SECRET || "TheArchangel",
};

export const getLocalGasConfig = () => {
  try {
    const raw = localStorage.getItem(LOCAL_GAS_CONFIG_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === "object") {
        return { ...DEFAULT_GAS_CONFIG, ...parsed };
      }
    }
  } catch (e) {
    console.warn("Could not read GAS config from localStorage:", e);
  }
  return DEFAULT_GAS_CONFIG;
};

export const setLocalGasConfig = (config) => {
  try {
    localStorage.setItem(LOCAL_GAS_CONFIG_KEY, JSON.stringify(config));
  } catch (e) {
    console.warn("Could not write GAS config to localStorage:", e);
  }
};

export const getGasConfig = async () => {
  try {
    const docRef = doc(db, SETTINGS_COLLECTION, GAS_CONFIG_DOC_ID);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      const data = snap.data();
      const merged = { ...DEFAULT_GAS_CONFIG, ...data };
      setLocalGasConfig(merged);
      return merged;
    }
  } catch (err) {
    console.warn("Could not fetch GAS config from Firestore, fallback to cache:", err);
  }
  return getLocalGasConfig();
};

export const subscribeGasConfig = (callback) => {
  const docRef = doc(db, SETTINGS_COLLECTION, GAS_CONFIG_DOC_ID);
  callback(getLocalGasConfig());

  return onSnapshot(
    docRef,
    (snap) => {
      if (snap.exists()) {
        const merged = { ...DEFAULT_GAS_CONFIG, ...snap.data() };
        setLocalGasConfig(merged);
        callback(merged);
      } else {
        callback(getLocalGasConfig());
      }
    },
    (err) => {
      console.warn("GAS config subscription warning, fallback to cache:", err);
      callback(getLocalGasConfig());
    }
  );
};

export const saveGasConfig = async (configData) => {
  const updated = {
    ...DEFAULT_GAS_CONFIG,
    ...configData,
    webAppUrl: (configData.webAppUrl || "").trim(),
    apiSecret: (configData.apiSecret || "TheArchangel").trim(),
    updatedAt: new Date().toISOString(),
  };
  setLocalGasConfig(updated);

  try {
    const docRef = doc(db, SETTINGS_COLLECTION, GAS_CONFIG_DOC_ID);
    await setDoc(docRef, { ...updated, updatedAt: serverTimestamp() }, { merge: true });
  } catch (err) {
    console.warn("Firestore sync warning for GAS config, saved locally:", err);
  }
  return updated;
};

// =========================================================================
// 5. BANNER THÔNG BÁO TỔNG (GLOBAL ANNOUNCEMENT BANNER)
// =========================================================================
export const DEFAULT_ANNOUNCEMENT_CONFIG = {
  enabled: false,
  content: "",
  type: "info", // "info" | "warning" | "alert" | "success"
  linkText: "",
  linkUrl: "",
  updatedAt: null,
};

const LOCAL_STORAGE_ANNOUNCEMENT_KEY = "lms_announcement_config_v1";

const getLocalAnnouncementConfig = () => {
  try {
    const saved = localStorage.getItem(LOCAL_STORAGE_ANNOUNCEMENT_KEY);
    if (saved) return { ...DEFAULT_ANNOUNCEMENT_CONFIG, ...JSON.parse(saved) };
  } catch (e) {
    console.warn("Could not read announcement config from localStorage:", e);
  }
  return DEFAULT_ANNOUNCEMENT_CONFIG;
};

const setLocalAnnouncementConfig = (cfg) => {
  try {
    localStorage.setItem(LOCAL_STORAGE_ANNOUNCEMENT_KEY, JSON.stringify(cfg));
  } catch (e) {
    console.warn("Could not write announcement config to localStorage:", e);
  }
};

export const getAnnouncementConfig = async () => {
  try {
    const docRef = doc(db, SETTINGS_COLLECTION, ANNOUNCEMENT_CONFIG_DOC_ID);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      const merged = { ...DEFAULT_ANNOUNCEMENT_CONFIG, ...snap.data() };
      setLocalAnnouncementConfig(merged);
      return merged;
    }
  } catch (err) {
    console.warn("Could not fetch announcement from Firestore, fallback to cache:", err);
  }
  return getLocalAnnouncementConfig();
};

export const subscribeAnnouncementConfig = (callback) => {
  const docRef = doc(db, SETTINGS_COLLECTION, ANNOUNCEMENT_CONFIG_DOC_ID);
  callback(getLocalAnnouncementConfig());

  return onSnapshot(
    docRef,
    (snap) => {
      if (snap.exists()) {
        const merged = { ...DEFAULT_ANNOUNCEMENT_CONFIG, ...snap.data() };
        setLocalAnnouncementConfig(merged);
        callback(merged);
      } else {
        callback(getLocalAnnouncementConfig());
      }
    },
    (err) => {
      console.warn("Announcement subscription warning, fallback to cache:", err);
      callback(getLocalAnnouncementConfig());
    }
  );
};

export const saveAnnouncementConfig = async (configData) => {
  const updated = {
    ...DEFAULT_ANNOUNCEMENT_CONFIG,
    ...configData,
    content: (configData.content || "").trim(),
    updatedAt: new Date().toISOString(),
  };
  setLocalAnnouncementConfig(updated);

  try {
    const docRef = doc(db, SETTINGS_COLLECTION, ANNOUNCEMENT_CONFIG_DOC_ID);
    await setDoc(docRef, { ...updated, updatedAt: serverTimestamp() }, { merge: true });
  } catch (err) {
    console.warn("Firestore sync warning for announcement config, saved locally:", err);
  }
  return updated;
};

// =========================================================================
// 6. QUY ĐỊNH LỚP HỌC (CLASSROOM RULES)
// =========================================================================
export const DEFAULT_CLASSROOM_RULES = {
  title: "Quy Định & Nội Quy Lớp Học",
  subtitle: "Áp dụng cho toàn bộ học viên các khóa học TOEIC Thầy Đỗ Tuấn Nam",
  lastUpdated: "2026-10-29",
  sections: [
    {
      id: "attendance",
      title: "1. Chuyên cần & Điểm danh",
      icon: "calendar",
      rules: [
        "Học viên cần tham gia tối thiểu 80% tổng số buổi học của khóa để đủ điều kiện cam kết chuẩn đầu ra.",
        "Nếu có lịch bận đột xuất, học viên vui lòng xin phép giáo viên hoặc tư vấn viên trước giờ vào lớp ít nhất 2 tiếng.",
        "Học viên vắng có phép được cấp tài liệu, bài giảng và video record buổi học qua Google Drive lớp để tự ôn tập bù."
      ]
    },
    {
      id: "homework",
      title: "2. Bài tập về nhà & Thi thử Mock-Test",
      icon: "assignment",
      rules: [
        "Hoàn thành tối thiểu 90% bài tập về nhà (ngữ pháp, từ vựng, audio listening) được giao sau mỗi buổi học trên hệ thống LMS.",
        "Tham gia đầy đủ các bài Mini Test tuần và Full Mock Test giữa kỳ/cuối kỳ để đánh giá chuẩn xác tiến độ nâng điểm.",
        "Chủ động xem lại phần chữa bài chi tiết và ghi chú bẫy đề thi trong hệ thống LMS để khắc phục triệt để lỗi sai."
      ]
    },
    {
      id: "discipline",
      title: "3. Tác phong & Ý thức trong giờ học",
      icon: "verified",
      rules: [
        "Vào lớp đúng giờ (trực tiếp hoặc trực tuyến qua Google Meet). Chuẩn bị sẵn sổ ghi chép, tai nghe và tài liệu bài học.",
        "Giữ thái độ học tập nghiêm túc, tích cực tương tác, phát biểu ý kiến và thực hành luyện tập cùng thầy cô và bạn học.",
        "Tôn trọng không gian học tập chung: để điện thoại ở chế độ rung, không làm việc riêng ngoài môn học."
      ]
    },
    {
      id: "policy",
      title: "4. Chính sách Học phí, Học bù & Bảo lưu",
      icon: "policy",
      rules: [
        "Học phí hoàn thành theo đúng thời hạn và chính sách đăng ký khóa học.",
        "Học viên có nhu cầu bảo lưu (do công tác xa, vấn đề sức khỏe) được bảo lưu kết quả và chuyển sang lớp tương đương trong vòng 06 tháng.",
        "Mọi thắc mắc hoặc khó khăn trong quá trình học tập, học viên liên hệ trực tiếp Hotline/Zalo của Thầy Đỗ Tuấn Nam để được hỗ trợ kịp thời."
      ]
    }
  ]
};

const LOCAL_STORAGE_RULES_KEY = "lms_classroom_rules_v1";

const getLocalClassroomRules = () => {
  try {
    const saved = localStorage.getItem(LOCAL_STORAGE_RULES_KEY);
    if (saved) return { ...DEFAULT_CLASSROOM_RULES, ...JSON.parse(saved) };
  } catch (e) {
    console.warn("Could not read classroom rules from localStorage:", e);
  }
  return DEFAULT_CLASSROOM_RULES;
};

const setLocalClassroomRules = (rules) => {
  try {
    localStorage.setItem(LOCAL_STORAGE_RULES_KEY, JSON.stringify(rules));
  } catch (e) {
    console.warn("Could not write classroom rules to localStorage:", e);
  }
};

export const getClassroomRules = async () => {
  try {
    const docRef = doc(db, SETTINGS_COLLECTION, CLASSROOM_RULES_DOC_ID);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      const merged = { ...DEFAULT_CLASSROOM_RULES, ...snap.data() };
      setLocalClassroomRules(merged);
      return merged;
    }
  } catch (err) {
    console.warn("Could not fetch classroom rules from Firestore, fallback to cache:", err);
  }
  return getLocalClassroomRules();
};

export const subscribeClassroomRules = (callback) => {
  const docRef = doc(db, SETTINGS_COLLECTION, CLASSROOM_RULES_DOC_ID);
  callback(getLocalClassroomRules());

  return onSnapshot(
    docRef,
    (snap) => {
      if (snap.exists()) {
        const merged = { ...DEFAULT_CLASSROOM_RULES, ...snap.data() };
        setLocalClassroomRules(merged);
        callback(merged);
      } else {
        callback(getLocalClassroomRules());
      }
    },
    (err) => {
      console.warn("Classroom rules subscription warning, fallback to cache:", err);
      callback(getLocalClassroomRules());
    }
  );
};

export const saveClassroomRules = async (rulesData) => {
  const updated = {
    ...DEFAULT_CLASSROOM_RULES,
    ...rulesData,
    lastUpdated: new Date().toISOString().split("T")[0],
    updatedAt: new Date().toISOString(),
  };
  setLocalClassroomRules(updated);

  try {
    const docRef = doc(db, SETTINGS_COLLECTION, CLASSROOM_RULES_DOC_ID);
    await setDoc(docRef, { ...updated, updatedAt: serverTimestamp() }, { merge: true });
  } catch (err) {
    console.warn("Firestore sync warning for classroom rules, saved locally:", err);
  }
  return updated;
};
