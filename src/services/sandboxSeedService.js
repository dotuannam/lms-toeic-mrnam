import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  getDocs,
  query,
  where,
  writeBatch,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "../config/firebase";

export const SANDBOX_CLASS_ID = "CLASS_SANDBOX_TOEIC_650";
export const SANDBOX_STUDENT_1_ID = "HV_SANDBOX_01"; // Người giới thiệu
export const SANDBOX_STUDENT_2_ID = "HV_SANDBOX_02"; // Học viên mới được giới thiệu

/**
 * Khởi tạo dữ liệu mẫu toàn diện (Seed Sandbox Data) để kiểm thử End-to-End
 * Kích hoạt đồng thời 4 giai đoạn nâng cấp
 */
export const seedSandboxEnvironment = async () => {
  const batch = writeBatch(db);
  const nowIso = new Date().toISOString();
  const yesterdayIso = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const tomorrowIso = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

  // =========================================================================
  // 1. LỚP HỌC THỬ NGHIỆM SANDBOX (CLASS)
  // Giai đoạn 2: Meet link, Classroom backup, Drive 24 buổi, Sheet từ vựng 3 cột
  // =========================================================================
  const sessionFolders = [];
  for (let i = 1; i <= 24; i++) {
    const numStr = i < 10 ? `0${i}` : `${i}`;
    sessionFolders.push({
      sessionNumber: i,
      name: `Buổi ${numStr} - Bài giảng & Slide tài liệu`,
      folderId: `sandbox_folder_b${numStr}`,
      folderLink: `https://drive.google.com/drive/folders/sandbox_folder_b${numStr}`,
    });
  }

  const sandboxClassDoc = {
    classId: SANDBOX_CLASS_ID,
    code: "TO650-SANDBOX",
    name: "TOEIC Target 650+ Master Sandbox (Thử Nghiệm Toàn Diện)",
    courseType: "TOEIC",
    schedule: "Thứ 2 - 4 - 6 (19:30 - 21:00)",
    tuitionFee: 4500000,
    totalSessions: 24,
    studentCount: 2,
    teacherName: "Mr. Đỗ Tuấn Nam (8.5 IELTS / 990 TOEIC)",
    meetLink: "https://meet.google.com/nam-sandbox-2026",
    classroomLink: "https://classroom.google.com/c/sandbox-backup-lms",
    isSandbox: true,
    classroomRules: [
      "1. Đi học đúng giờ (vào phòng Google Meet trước 5 phút để ổn định đường truyền).",
      "2. Bật webcam trong suốt buổi học tương tác và chuẩn bị sẵn micro để luyện phát âm.",
      "3. Hoàn thành 100% bài tập về nhà trên LMS trước 23h59 ngày hôm sau.",
      "4. Tích cực tham gia Mini Game từ vựng mỗi ngày để tích điểm rèn luyện.",
      "5. Nghỉ học có phép phải xem lại video bài giảng lưu trong Thư mục buổi học Google Drive.",
    ],
    integrations: {
      googleMeet: {
        link: "https://meet.google.com/nam-sandbox-2026",
      },
      googleClassroom: {
        courseId: "CR_SANDBOX_2026",
        alternateLink: "https://classroom.google.com/c/sandbox-backup-lms",
        enrollmentCode: "sb2026",
        isBackup: true,
      },
      googleDrive: {
        folderId: "sandbox_root_drive_folder",
        folderLink: "https://drive.google.com/drive/folders/sandbox_root_drive_folder",
        totalSessions: 24,
        sessionFolders,
      },
      vocabularySheet: {
        sheetId: "sandbox_sheet_vocab_id",
        sheetUrl: "https://docs.google.com/spreadsheets/d/sandbox-sheet-vocab-toeic-650/edit",
        name: "Sổ tay Từ Vựng TOEIC 650+ (Cấu trúc 3 cột tự chạy hàm tra cứu)",
      },
    },
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  batch.set(doc(db, "classes", SANDBOX_CLASS_ID), sandboxClassDoc);

  // =========================================================================
  // 2. HỌC VIÊN 1: NGƯỜI GIỚI THIỆU (HV_SANDBOX_01)
  // Đang còn nợ 500.000₫ học phí để test tính năng "Trừ trực tiếp vào học phí"
  // =========================================================================
  const student1Doc = {
    studentId: SANDBOX_STUDENT_1_ID,
    fullName: "Nguyễn Văn Anh (Người Giới Thiệu Sandbox)",
    email: "nguyenvananh.sandbox@gmail.com",
    phone: "0901234567",
    dob: "2002-05-15",
    status: "active",
    isSandbox: true,
    currentClassIds: [SANDBOX_CLASS_ID],
    enrolledClasses: [
      {
        classId: SANDBOX_CLASS_ID,
        className: sandboxClassDoc.name,
        classCode: sandboxClassDoc.code,
        enrolledAt: nowIso,
      },
    ],
    tuitionOverview: {
      tuitionStatus: "installment",
      rawAmount: 4500000,
      discountAmount: 0,
      totalAmount: 4500000,
      paidAmount: 4000000,
      totalDebt: 500000, // Đang nợ 500k để chờ khấu trừ referral!
      lastPaymentDate: nowIso,
    },
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  batch.set(doc(db, "students", SANDBOX_STUDENT_1_ID), student1Doc);

  // Bản ghi công nợ học phí của Học viên 1
  const tuition1Doc = {
    tuitionId: `${SANDBOX_STUDENT_1_ID}_${SANDBOX_CLASS_ID}`,
    studentId: SANDBOX_STUDENT_1_ID,
    studentName: student1Doc.fullName,
    studentEmail: student1Doc.email,
    classId: SANDBOX_CLASS_ID,
    className: sandboxClassDoc.name,
    tuitionStatus: "installment",
    totalAmount: 4500000,
    discountAmount: 0,
    finalAmount: 4500000,
    paidAmount: 4000000,
    debtAmount: 500000, // Nợ 500.000₫
    status: "partial",
    installmentNote: "Kỳ cuối 500k - Sẽ được khấu trừ khi quyết toán Referral",
    paymentHistory: [
      {
        receiptId: "REC_INIT_HV01",
        amount: 4000000,
        method: "bank_transfer",
        paidAt: nowIso,
        receivedBy: "Admin",
        note: "Đóng đợt 1 tại quầy",
      },
    ],
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  batch.set(doc(db, "tuitions", tuition1Doc.tuitionId), tuition1Doc);

  // =========================================================================
  // 3. HỌC VIÊN 2: HỌC VIÊN MỚI ĐƯỢC GIỚI THIỆU (HV_SANDBOX_02)
  // Giai đoạn 4: Được giảm 200k từ Referral, hoa hồng 300k cho HV_SANDBOX_01
  // =========================================================================
  const student2Doc = {
    studentId: SANDBOX_STUDENT_2_ID,
    fullName: "Trần Thị Mai (Học Viên Thử Nghiệm Portal)",
    email: "tranthimai.sandbox@gmail.com",
    phone: "0988776655",
    dob: "2003-09-20",
    status: "active",
    isSandbox: true,
    currentClassIds: [SANDBOX_CLASS_ID],
    enrolledClasses: [
      {
        classId: SANDBOX_CLASS_ID,
        className: sandboxClassDoc.name,
        classCode: sandboxClassDoc.code,
        enrolledAt: nowIso,
      },
    ],
    tuitionOverview: {
      tuitionStatus: "completed",
      rawAmount: 4500000,
      discountAmount: 200000, // Giảm giá Referral
      totalAmount: 4300000,
      paidAmount: 4300000,
      totalDebt: 0,
      lastPaymentDate: nowIso,
    },
    referral: {
      referrerType: "student",
      referrerInfo: {
        studentId: SANDBOX_STUDENT_1_ID,
        name: student1Doc.fullName,
        phone: student1Doc.phone,
        className: sandboxClassDoc.code,
      },
      rewardType: "tuition_deduction",
      referrerReward: 300000,
      newStudentDiscount: 200000,
      createdAt: nowIso,
    },
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  batch.set(doc(db, "students", SANDBOX_STUDENT_2_ID), student2Doc);

  // Bản ghi công nợ học phí của Học viên 2
  const tuition2Doc = {
    tuitionId: `${SANDBOX_STUDENT_2_ID}_${SANDBOX_CLASS_ID}`,
    studentId: SANDBOX_STUDENT_2_ID,
    studentName: student2Doc.fullName,
    studentEmail: student2Doc.email,
    classId: SANDBOX_CLASS_ID,
    className: sandboxClassDoc.name,
    tuitionStatus: "completed",
    totalAmount: 4500000,
    discountAmount: 200000,
    finalAmount: 4300000,
    paidAmount: 4300000,
    debtAmount: 0,
    status: "paid",
    installmentNote: "Đã thu đủ qua POS - Áp dụng giảm giá Referral 200.000₫",
    referral: student2Doc.referral,
    paymentHistory: [
      {
        receiptId: "REC_POS_SANDBOX_02",
        amount: 4300000,
        method: "pos_cashier",
        paidAt: nowIso,
        receivedBy: "Admin POS",
        note: "Thanh toán POS đủ 1 lần (Đã giảm 200k Referral)",
      },
    ],
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  batch.set(doc(db, "tuitions", tuition2Doc.tuitionId), tuition2Doc);

  // Bản ghi Referral chờ quyết toán (Collection referrals)
  const referralDocId = `ref_sandbox_${SANDBOX_STUDENT_1_ID}_${SANDBOX_STUDENT_2_ID}`;
  const referralDoc = {
    id: referralDocId,
    referrerType: "student",
    referrerInfo: {
      studentId: SANDBOX_STUDENT_1_ID,
      name: student1Doc.fullName,
      phone: student1Doc.phone,
      className: sandboxClassDoc.code,
    },
    rewardType: "tuition_deduction", // Trừ vào học phí
    referrerReward: 300000, // 300k hoa hồng
    newStudentDiscount: 200000, // 200k giảm giá
    studentId: SANDBOX_STUDENT_2_ID,
    studentName: student2Doc.fullName,
    studentPhone: student2Doc.phone,
    classId: SANDBOX_CLASS_ID,
    className: sandboxClassDoc.name,
    status: "pending", // Chờ quyết toán (để Admin vào bấm "Khấu trừ nợ"!)
    notes: "Lượt giới thiệu Sandbox để kiểm thử tính năng Khấu trừ học phí",
    createdAt: nowIso,
  };

  batch.set(doc(db, "referrals", referralDocId), referralDoc);

  // =========================================================================
  // 4. BÀI TẬP VỀ NHÀ CLASSROOM & CẢNH BÁO NHẮC NHỞ BTVN (STUDENT 2)
  // Giai đoạn 2: Kéo điểm về LMS + Hiển thị nhắc nhở BTVN chưa hoàn thành
  // =========================================================================
  const homeworks = [
    {
      courseWorkId: "cw_sb_01",
      submissionId: "sub_sb_01",
      title: "ETS Part 5 Mini Test - Thì & Mệnh đề quan hệ",
      state: "RETURNED", // Đã chấm điểm
      grade: 9.0,
      maxPoints: 10,
      late: false,
      dueDate: yesterdayIso,
      alternateLink: "https://classroom.google.com/c/sandbox-backup-lms/a/cw_sb_01",
    },
    {
      courseWorkId: "cw_sb_02",
      submissionId: "sub_sb_02",
      title: "ETS Part 7 Reading Comprehension - Đọc hiểu đoạn văn kép",
      state: "NEW", // Chưa nộp
      grade: null,
      maxPoints: 100,
      late: false,
      dueDate: tomorrowIso,
      alternateLink: "https://classroom.google.com/c/sandbox-backup-lms/a/cw_sb_02",
    },
    {
      courseWorkId: "cw_sb_03",
      submissionId: "sub_sb_03",
      title: "Listening Dictation Practice - Nghe chép chính tả Buổi 03",
      state: "NEW", // Chưa nộp + QUÁ HẠN!
      grade: null,
      maxPoints: 100,
      late: true, // Kích hoạt chuông cảnh báo đỏ 🚨 trên Student Portal!
      dueDate: yesterdayIso,
      alternateLink: "https://classroom.google.com/c/sandbox-backup-lms/a/cw_sb_03",
    },
  ];

  homeworks.forEach((hw) => {
    const cgDocRef = doc(db, "classroom_grades", `CG_${SANDBOX_STUDENT_2_ID}_${hw.submissionId}`);
    batch.set(cgDocRef, {
      ...hw,
      studentId: SANDBOX_STUDENT_2_ID,
      classId: SANDBOX_CLASS_ID,
      courseId: "CR_SANDBOX_2026",
      syncedAt: nowIso,
      updatedAt: serverTimestamp(),
    });
  });

  // =========================================================================
  // 5. BANNER THÔNG BÁO TỔNG & QUY ĐỊNH LỚP HỌC TOÀN HỆ THỐNG
  // Giai đoạn 1: Banner xuất hiện trên toàn bộ giao diện; Quy định đính kèm Portal
  // =========================================================================
  batch.set(
    doc(db, "system_settings", "global_banner"),
    {
      enabled: true,
      title: "THÔNG BÁO LỚP HỌC SANDBOX KHỞI TẠO THÀNH CÔNG",
      message:
        "Hệ thống đã kích hoạt đầy đủ 4 giai đoạn: Meet/Classroom, Thư mục Drive 24 buổi + Sheet từ vựng tự động, Kho học liệu 3 phân khu, Mini Game có lưu lịch sử và Quầy thu ngân POS có Referral!",
      type: "info",
      linkText: "Vào Lớp Ngay",
      linkUrl: "#",
      updatedAt: nowIso,
    },
    { merge: true }
  );

  batch.set(
    doc(db, "system_settings", "classroom_rules"),
    {
      content:
        "1. Tham gia lớp học trực tuyến đầy đủ và đúng giờ trên Google Meet.\n2. Tích cực làm bài tập về nhà trên LMS trước hạn chót để tránh bị cảnh báo nhắc nhở BTVN.\n3. Học từ vựng mỗi ngày trên Webapp Mini Game và hoàn thành các bài ôn tập.\n4. Giữ thái độ văn minh, tôn trọng giảng viên và các bạn học viên trong lớp.",
      updatedAt: nowIso,
    },
    { merge: true }
  );

  // =========================================================================
  // 6. KHO HỌC LIỆU 3 PHÂN KHU (CHÍNH - PHỤ - LIVESTREAM)
  // Giai đoạn 3: Kho học liệu tập trung có Giáo trình ngữ pháp tiếng Anh tinh chỉnh
  // =========================================================================
  const sampleMaterials = [
    {
      materialId: "mat_sb_primary_01",
      title: "Giáo Trình Ngữ Pháp Tiếng Anh Tinh Chỉnh (Ebook Tương Tác)",
      category: "primary", // Học liệu Chính
      courseType: "TOEIC",
      description: "Bộ giáo trình trọng tâm 12 chủ điểm ngữ pháp TOEIC biên soạn độc quyền bởi Mr. Nam.",
      fileUrl: "https://dotuannamportfolio.ai.studio/",
      format: "ebook",
      isFreePreview: true,
      order: 1,
      createdAt: nowIso,
    },
    {
      materialId: "mat_sb_supp_01",
      title: "Bộ Flashcards 600 Từ Vựng TOEIC Căn Bản & Audio Pronunciation",
      category: "supplementary", // Học liệu Phụ
      courseType: "TOEIC",
      description: "Tổng hợp từ vựng kèm phiên âm IPA chuẩn Oxford và file nghe giọng bản xứ.",
      fileUrl: "https://drive.google.com/drive/folders/sandbox_flashcards_600",
      format: "audio_pdf",
      isFreePreview: false,
      order: 2,
      createdAt: nowIso,
    },
    {
      materialId: "mat_sb_live_01",
      title: "Video Livestream Chữa Đề ETS 2026 Part 5 - Chiến Thuật Tốc Độ",
      category: "livestream", // Livestream
      courseType: "TOEIC",
      description: "Buổi livestream phân tích 30 câu ngữ pháp bẫy điểm cao phát trực tiếp tuần qua.",
      fileUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
      format: "video",
      isFreePreview: true,
      order: 3,
      createdAt: nowIso,
    },
  ];

  sampleMaterials.forEach((m) => {
    batch.set(doc(db, "materials", m.materialId), m);
  });

  // =========================================================================
  // 7. TỪ VỰNG & LỊCH SỬ CHƠI MINI GAME CHO HỌC VIÊN 2 (HV_SANDBOX_02)
  // Giai đoạn 3: Mini Game có cơ chế lưu lịch sử học và lịch sử chơi game
  // =========================================================================
  const sampleWords = [
    {
      wordId: "word_sb_01",
      word: "reconciliation",
      ipa: "/ˌrek.ənˌsɪl.iˈeɪ.ʃən/",
      meaning: "Sự đối soát, hòa giải, khớp sổ",
      example: "The accountant completed the bank reconciliation.",
      category: "Finance & Banking",
    },
    {
      wordId: "word_sb_02",
      word: "curriculum",
      ipa: "/kəˈrɪk.jə.ləm/",
      meaning: "Khung chương trình giảng dạy",
      example: "Our English curriculum covers all 4 core skills.",
      category: "Education",
    },
    {
      wordId: "word_sb_03",
      word: "commission",
      ipa: "/kəˈmɪʃ.ən/",
      meaning: "Tiền hoa hồng, tiền thù lao môi giới",
      example: "Students receive a generous referral commission.",
      category: "Referral & Sales",
    },
  ];

  sampleWords.forEach((w) => {
    batch.set(doc(db, "vocab_words", w.wordId), { ...w, createdAt: nowIso });
  });

  // Lịch sử chơi game của HV_SANDBOX_02
  const sampleGameSessions = [
    {
      id: "sess_sb_flashcard_01",
      studentId: SANDBOX_STUDENT_2_ID,
      studentName: student2Doc.fullName,
      gameType: "flashcard",
      score: 100,
      accuracy: 100,
      totalCards: 15,
      completedAt: nowIso,
    },
    {
      id: "sess_sb_speedrun_01",
      studentId: SANDBOX_STUDENT_2_ID,
      studentName: student2Doc.fullName,
      gameType: "speedrun",
      score: 950,
      accuracy: 95,
      totalCards: 20,
      completedAt: nowIso,
    },
    {
      id: "sess_sb_match_01",
      studentId: SANDBOX_STUDENT_2_ID,
      studentName: student2Doc.fullName,
      gameType: "memory_match",
      score: 800,
      accuracy: 85,
      totalCards: 12,
      completedAt: nowIso,
    },
  ];

  sampleGameSessions.forEach((sess) => {
    batch.set(doc(db, "vocab_game_history", sess.id), sess);
  });

  // Commit toàn bộ dữ liệu mẫu trong 1 Atomic Batch duy nhất
  await batch.commit();

  return {
    success: true,
    sandboxClass: sandboxClassDoc,
    student1: student1Doc,
    student2: student2Doc,
    referral: referralDoc,
    homeworks,
  };
};

/**
 * Xóa sạch dữ liệu thử nghiệm Sandbox (Clean up)
 */
export const clearSandboxEnvironment = async () => {
  const batch = writeBatch(db);

  // 1. Xóa class
  batch.delete(doc(db, "classes", SANDBOX_CLASS_ID));

  // 2. Xóa 2 học viên
  batch.delete(doc(db, "students", SANDBOX_STUDENT_1_ID));
  batch.delete(doc(db, "students", SANDBOX_STUDENT_2_ID));

  // 3. Xóa tuitions
  batch.delete(doc(db, "tuitions", `${SANDBOX_STUDENT_1_ID}_${SANDBOX_CLASS_ID}`));
  batch.delete(doc(db, "tuitions", `${SANDBOX_STUDENT_2_ID}_${SANDBOX_CLASS_ID}`));

  // 4. Xóa referral
  batch.delete(doc(db, "referrals", `ref_sandbox_${SANDBOX_STUDENT_1_ID}_${SANDBOX_STUDENT_2_ID}`));

  // 5. Xóa classroom grades
  batch.delete(doc(db, "classroom_grades", `CG_${SANDBOX_STUDENT_2_ID}_sub_sb_01`));
  batch.delete(doc(db, "classroom_grades", `CG_${SANDBOX_STUDENT_2_ID}_sub_sb_02`));
  batch.delete(doc(db, "classroom_grades", `CG_${SANDBOX_STUDENT_2_ID}_sub_sb_03`));

  // 6. Xóa materials mẫu
  batch.delete(doc(db, "materials", "mat_sb_primary_01"));
  batch.delete(doc(db, "materials", "mat_sb_supp_01"));
  batch.delete(doc(db, "materials", "mat_sb_live_01"));

  await batch.commit();
  return { success: true };
};
