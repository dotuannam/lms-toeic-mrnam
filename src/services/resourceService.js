import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  orderBy,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "../config/firebase";

const COLLECTION_NAME = "learning_resources";

export const RESOURCE_CATEGORIES = [
  {
    id: "primary",
    labelVi: "Học liệu chính",
    labelEn: "Primary Courseware",
    descVi: "Giáo trình trọng tâm, sách bài giảng chính thức và chuyên đề ngữ pháp bắt buộc.",
    icon: "📘",
    color: "#c27803",
  },
  {
    id: "supplementary",
    labelVi: "Học liệu phụ",
    labelEn: "Supplementary Materials",
    descVi: "Tài liệu mở rộng, cẩm nang bổ trợ từ vựng, mẹo làm bài thi và đề luyện thêm.",
    icon: "📙",
    color: "#d97706",
  },
  {
    id: "livestream",
    labelVi: "Livestream",
    labelEn: "Livestream & Replays",
    descVi: "Video ghi lại các buổi phát trực tiếp, chữa đề thi thực chiến và ghi chú bài giảng.",
    icon: "🎥",
    color: "#b45309",
  },
];

export const DEFAULT_LEARNING_RESOURCES = [
  {
    resourceId: "res_grammar_curriculum",
    title: "Giáo trình Ngữ pháp Tiếng Anh Tinh chỉnh (TOEIC / IELTS Standard)",
    category: "primary",
    author: "Mr. Nam & Ban Học thuật",
    format: "interactive_doc",
    badge: "Giáo trình Cốt lõi",
    courseType: "ALL",
    description: "Bộ chuyên đề ngữ pháp toàn diện đã tinh chỉnh theo bám sát format đề thi quốc tế: 12 thì, Bị động, Mệnh đề quan hệ, To-V/V-ing, Câu điều kiện và Hòa hợp chủ vị kèm ví dụ phân tích và bài tập áp dụng.",
    fileUrl: "https://drive.google.com",
    hasInteractiveViewer: true,
    viewCount: 1420,
    downloadCount: 385,
    updatedAt: "2026-10-25T08:00:00Z",
  },
  {
    resourceId: "res_primary_ets_handbook",
    title: "Sổ tay Chiến thuật Giải Đề ETS TOEIC 2024 - 2026",
    category: "primary",
    author: "Thầy Đỗ Tuấn Nam",
    format: "pdf",
    badge: "Tài liệu Chính khóa",
    courseType: "TOEIC",
    description: "Tổng hợp các dạng bẫy phổ biến nhất trong đề thi TOEIC Listening & Reading, ma trận phân bổ thời gian từng Part và phương pháp loại trừ đáp án nhiễu.",
    fileUrl: "https://drive.google.com",
    viewCount: 980,
    downloadCount: 420,
    updatedAt: "2026-10-20T10:00:00Z",
  },
  {
    resourceId: "res_supp_vocab_600",
    title: "Tuyển tập 600 Từ Vựng TOEIC Trọng Tâm Theo Chủ Đề Văn Phòng",
    category: "supplementary",
    author: "Bộ phận Học liệu",
    format: "sheet",
    badge: "Bổ trợ Từ vựng",
    courseType: "TOEIC",
    description: "Từ vựng kèm phiên âm IPA, nghĩa tiếng Việt, câu ví dụ và các collocations thường gặp trong môi trường văn phòng thương mại quốc tế.",
    fileUrl: "https://docs.google.com/spreadsheets",
    viewCount: 860,
    downloadCount: 310,
    updatedAt: "2026-10-18T14:30:00Z",
  },
  {
    resourceId: "res_supp_phrasal_verbs",
    title: "Top 50 Phrasal Verbs & Giới Từ Đắt Giá Chinh Phục Điểm 750+",
    category: "supplementary",
    author: "Mr. Nam",
    format: "pdf",
    badge: "Tài liệu Mở rộng",
    courseType: "ALL",
    description: "Bảng tra cứu cụm động từ thường gặp nhất trong hội thoại và email thương mại, kèm bài tập trắc nghiệm tự chấm điểm.",
    fileUrl: "https://drive.google.com",
    viewCount: 640,
    downloadCount: 195,
    updatedAt: "2026-10-15T09:00:00Z",
  },
  {
    resourceId: "res_live_01_part5",
    title: "Livestream #01: Phá Bẫy 50 Câu Ngữ Pháp ETS Part 5 Trong 15 Phút",
    category: "livestream",
    author: "Thầy Đỗ Tuấn Nam",
    format: "video",
    badge: "Replay Livestream",
    courseType: "TOEIC",
    videoUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    notesUrl: "https://drive.google.com",
    duration: "1h 24m",
    description: "Buổi livestream giải đề thực chiến, hướng dẫn kỹ thuật quét cấu trúc câu nhanh và chọn đáp án không cần dịch toàn bộ câu.",
    viewCount: 1530,
    downloadCount: 520,
    updatedAt: "2026-10-26T20:00:00Z",
  },
  {
    resourceId: "res_live_02_part7",
    title: "Livestream #02: Kỹ Thuật Đọc Quét Skim & Scan Xử Lý Part 7 Kịp Giờ",
    category: "livestream",
    author: "Thầy Đỗ Tuấn Nam",
    format: "video",
    badge: "Replay Livestream",
    courseType: "TOEIC",
    videoUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    notesUrl: "https://drive.google.com",
    duration: "1h 40m",
    description: "Giải mã đoạn văn kép và đoạn văn ba trong bài thi TOEIC Reading, cách đối chiếu chéo thông tin để không bị đánh lừa.",
    viewCount: 1210,
    downloadCount: 410,
    updatedAt: "2026-10-22T20:00:00Z",
  },
];

/**
 * Fetch all resources
 */
export const getResources = async () => {
  try {
    const q = query(collection(db, COLLECTION_NAME), orderBy("updatedAt", "desc"));
    const snapshot = await getDocs(q);
    if (snapshot.empty) {
      return DEFAULT_LEARNING_RESOURCES;
    }
    return snapshot.docs.map((d) => ({ resourceId: d.id, ...d.data() }));
  } catch (err) {
    console.warn("Error fetching learning resources, fallback to defaults:", err);
    return DEFAULT_LEARNING_RESOURCES;
  }
};

/**
 * Subscribe to resources real-time
 */
export const subscribeResources = (callback) => {
  try {
    const q = query(collection(db, COLLECTION_NAME), orderBy("updatedAt", "desc"));
    return onSnapshot(
      q,
      (snapshot) => {
        if (snapshot.empty) {
          callback(DEFAULT_LEARNING_RESOURCES);
        } else {
          const list = snapshot.docs.map((d) => ({ resourceId: d.id, ...d.data() }));
          callback(list);
        }
      },
      (err) => {
        console.warn("Resources subscription fallback to defaults:", err);
        callback(DEFAULT_LEARNING_RESOURCES);
      }
    );
  } catch (err) {
    console.warn("Resources subscription setup error:", err);
    callback(DEFAULT_LEARNING_RESOURCES);
    return () => {};
  }
};

/**
 * Create a new learning resource
 */
export const createResource = async (resourceData) => {
  const resourceId = `res_${Date.now()}`;
  const docRef = doc(db, COLLECTION_NAME, resourceId);

  const newResource = {
    resourceId,
    title: resourceData.title || "Tài liệu học tập mới",
    category: resourceData.category || "primary", // "primary" | "supplementary" | "livestream"
    author: resourceData.author || "Bộ phận Học thuật",
    format: resourceData.format || "pdf", // "pdf" | "video" | "sheet" | "doc" | "interactive_doc"
    badge: resourceData.badge || "Học liệu",
    courseType: resourceData.courseType || "ALL",
    description: resourceData.description || "",
    fileUrl: resourceData.fileUrl || "",
    videoUrl: resourceData.videoUrl || "",
    notesUrl: resourceData.notesUrl || "",
    duration: resourceData.duration || "",
    hasInteractiveViewer: Boolean(resourceData.hasInteractiveViewer),
    viewCount: 0,
    downloadCount: 0,
    targetClassIds: resourceData.targetClassIds || [], // Empty means all classes
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  await setDoc(docRef, newResource);
  return newResource;
};

/**
 * Update an existing learning resource
 */
export const updateResource = async (resourceId, updateData) => {
  const docRef = doc(db, COLLECTION_NAME, resourceId);
  const dataToUpdate = {
    ...updateData,
    updatedAt: new Date().toISOString(),
  };
  await updateDoc(docRef, dataToUpdate);
};

/**
 * Delete a learning resource
 */
export const deleteResource = async (resourceId) => {
  const docRef = doc(db, COLLECTION_NAME, resourceId);
  await deleteDoc(docRef);
};
