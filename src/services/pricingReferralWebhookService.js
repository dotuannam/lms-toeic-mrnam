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
  where,
  orderBy,
  limit,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "../config/firebase";
import { recordTuitionPayment, addLedgerTransaction } from "./financeService";

const PRICING_COLLECTION = "tuition_pricing_tiers";
const REFERRALS_COLLECTION = "referrals";
const POS_RECEIPTS_COLLECTION = "pos_receipts";
const WEBHOOK_LOGS_COLLECTION = "bank_webhook_logs";
const WEBHOOK_CONFIG_DOC = "system_settings/bank_webhook_config";

// =========================================================================
// 1. BIỂU PHÍ CHUẨN (TUITION PRICING TIERS)
// =========================================================================
/**
 * Tự động tính toán và tạo danh sách các gói học phí (Tiêu chuẩn, Đóng Sớm, Combo)
 * Đảm bảo 100% học phí tiêu chuẩn luôn khớp với Học phí niêm yết (originalPrice)
 * và các gói ưu đãi được chiết khấu chính xác theo tỉ lệ admin cấu hình.
 */
export const buildTierPackages = ({
  originalPrice = 0,
  earlyBirdRate = 10,
  comboRate = 15,
  earlyBirdDescription,
  comboDescription,
  stdDescription,
} = {}) => {
  const basePrice = Math.max(0, Number(originalPrice) || 0);
  const ebRate = Math.max(0, Math.min(100, Number(earlyBirdRate) || 0));
  const cbRate = Math.max(0, Math.min(100, Number(comboRate) || 0));

  // Làm tròn tiền giảm giá tới hàng nghìn đồng
  const earlyBirdDiscount = Math.round((basePrice * (ebRate / 100)) / 1000) * 1000;
  const earlyBirdPrice = Math.max(0, basePrice - earlyBirdDiscount);

  const comboDiscount = Math.round((basePrice * (cbRate / 100)) / 1000) * 1000;
  const comboPrice = Math.max(0, basePrice - comboDiscount);

  return [
    {
      id: "std",
      name: "Học phí Tiêu chuẩn",
      price: basePrice,
      discount: 0,
      rate: 0,
      description: stdDescription || "Học phí niêm yết chuẩn của khóa học",
    },
    {
      id: "early_bird",
      name: `Ưu đãi Đóng Sớm (Early Bird -${ebRate}%)`,
      price: earlyBirdPrice,
      discount: earlyBirdDiscount,
      rate: ebRate,
      description:
        earlyBirdDescription || "Áp dụng hoàn tất học phí trước ngày khai giảng tối thiểu 5 ngày",
    },
    {
      id: "combo",
      name: `Ưu đãi Đóng Theo Combo (-${cbRate}%)`,
      price: comboPrice,
      discount: comboDiscount,
      rate: cbRate,
      description:
        comboDescription || "Áp dụng đăng ký combo từ 2 khóa trở lên hoặc đăng ký theo nhóm",
    },
  ];
};

/**
 * Chuẩn hóa dữ liệu Biểu Phí:
 * - Tự động đồng bộ các gói học phí với originalPrice hiện hành (khắc phục hoàn toàn lệch giá)
 * - Tự động bổ sung gói Combo nếu trước đó chưa có
 */
export const normalizeTier = (tier) => {
  if (!tier) return null;
  const originalPrice = Math.max(0, Number(tier.originalPrice) || 0);

  let earlyBirdRate = tier.earlyBirdRate !== undefined ? Number(tier.earlyBirdRate) : 10;
  let comboRate = tier.comboRate !== undefined ? Number(tier.comboRate) : 15;

  let stdDesc = "Học phí niêm yết chuẩn của khóa học";
  let ebDesc = "Áp dụng hoàn tất học phí trước ngày khai giảng tối thiểu 5 ngày";
  let comboDesc = "Áp dụng đăng ký combo từ 2 khóa trở lên hoặc đăng ký theo nhóm";

  if (Array.isArray(tier.packages)) {
    const stdPkg = tier.packages.find((p) => p.id === "std");
    if (stdPkg?.description) stdDesc = stdPkg.description;

    const ebPkg = tier.packages.find((p) => p.id === "early_bird" || p.id?.includes("early"));
    if (ebPkg) {
      if (ebPkg.description) ebDesc = ebPkg.description;
      if (tier.earlyBirdRate === undefined && ebPkg.rate !== undefined) {
        earlyBirdRate = Number(ebPkg.rate);
      }
    }

    const comboPkg = tier.packages.find((p) => p.id === "combo" || p.id?.includes("combo") || p.id === "group");
    if (comboPkg) {
      if (comboPkg.description) comboDesc = comboPkg.description;
      if (tier.comboRate === undefined && comboPkg.rate !== undefined) {
        comboRate = Number(comboPkg.rate);
      }
    }
  }

  earlyBirdRate = isNaN(earlyBirdRate) || earlyBirdRate < 0 ? 10 : Math.min(100, earlyBirdRate);
  comboRate = isNaN(comboRate) || comboRate < 0 ? 15 : Math.min(100, comboRate);

  const packages = buildTierPackages({
    originalPrice,
    earlyBirdRate,
    comboRate,
    stdDescription: stdDesc,
    earlyBirdDescription: ebDesc,
    comboDescription: comboDesc,
  });

  return {
    ...tier,
    originalPrice,
    earlyBirdRate,
    comboRate,
    packages,
  };
};

export const DEFAULT_PRICING_TIERS = [
  {
    id: "tier_toeic_550",
    name: "TOEIC Target 550+ (Mục tiêu Chuẩn Đầu Ra)",
    courseType: "TOEIC",
    originalPrice: 4500000,
    earlyBirdRate: 10,
    comboRate: 15,
    packages: [
      { id: "std", name: "Học phí Tiêu chuẩn", price: 4500000, discount: 0, rate: 0, description: "Áp dụng đóng từng kỳ hoặc tiêu chuẩn" },
      { id: "early_bird", name: "Ưu đãi Đóng Sớm (Early Bird -10%)", price: 4050000, discount: 450000, rate: 10, description: "Đóng trước ngày khai giảng tối thiểu 5 ngày" },
      { id: "combo", name: "Ưu đãi Đóng Theo Combo (-15%)", price: 3825000, discount: 675000, rate: 15, description: "Áp dụng khi đăng ký từ 2 khóa trở lên hoặc combo trọn gói" },
    ],
    durationSessions: 24,
    materialsIncluded: true,
    isPopular: true,
    status: "active",
  },
  {
    id: "tier_toeic_750",
    name: "TOEIC Target 750+ (Chuyên Sâu Điểm Cao)",
    courseType: "TOEIC",
    originalPrice: 5500000,
    earlyBirdRate: 10,
    comboRate: 15,
    packages: [
      { id: "std", name: "Học phí Tiêu chuẩn", price: 5500000, discount: 0, rate: 0, description: "Khóa học chuyên sâu giải đề ETS Part 5, 6, 7" },
      { id: "early_bird", name: "Ưu đãi Đóng Sớm (Early Bird -10%)", price: 4950000, discount: 550000, rate: 10, description: "Giảm trực tiếp khi hoàn tất thủ tục sớm" },
      { id: "combo", name: "Ưu đãi Đóng Theo Combo (-15%)", price: 4675000, discount: 825000, rate: 15, description: "Ưu đãi đăng ký combo 2 cấp độ hoặc học nhóm" },
    ],
    durationSessions: 30,
    materialsIncluded: true,
    isPopular: false,
    status: "active",
  },
  {
    id: "tier_ielts_foundation",
    name: "IELTS Foundation (Nền Tảng 4 Kỹ Năng)",
    courseType: "IELTS",
    originalPrice: 6500000,
    earlyBirdRate: 10,
    comboRate: 15,
    packages: [
      { id: "std", name: "Học phí Tiêu chuẩn", price: 6500000, discount: 0, rate: 0, description: "Xây gốc Ngữ pháp, Phát âm & Từ vựng Academic" },
      { id: "early_bird", name: "Ưu đãi Đóng Sớm (Early Bird -10%)", price: 5850000, discount: 650000, rate: 10, description: "Tặng kèm toàn bộ giáo trình gốc" },
      { id: "combo", name: "Ưu đãi Đóng Theo Combo (-15%)", price: 5525000, discount: 975000, rate: 15, description: "Đăng ký liên cấp Foundation + Intensive" },
    ],
    durationSessions: 36,
    materialsIncluded: true,
    isPopular: false,
    status: "active",
  },
  {
    id: "tier_ielts_intensive",
    name: "IELTS Intensive 6.5+ (Luyện Thi Cấp Tốc)",
    courseType: "IELTS",
    originalPrice: 8500000,
    earlyBirdRate: 10,
    comboRate: 15,
    packages: [
      { id: "std", name: "Học phí Tiêu chuẩn", price: 8500000, discount: 0, rate: 0, description: "Luyện đề thực chiến với giáo viên 8.5 IELTS" },
      { id: "early_bird", name: "Ưu đãi Đóng Sớm (Early Bird -10%)", price: 7650000, discount: 850000, rate: 10, description: "Tặng 3 lượt thi thử Mock Test chuẩn khảo thí" },
      { id: "combo", name: "Ưu đãi Đóng Theo Combo (-15%)", price: 7225000, discount: 1275000, rate: 15, description: "Combo IELTS Chuyên Sâu + Luyện Đề VIP" },
    ],
    durationSessions: 40,
    materialsIncluded: true,
    isPopular: false,
    status: "active",
  },
  {
    id: "tier_aptis_esol",
    name: "APTIS ESOL B1 - B2 (Luyện Thi Cấp Tốc)",
    courseType: "APTIS",
    originalPrice: 4200000,
    earlyBirdRate: 10,
    comboRate: 15,
    packages: [
      { id: "std", name: "Học phí Tiêu chuẩn", price: 4200000, discount: 0, rate: 0, description: "Chinh phục chứng chỉ Hội Đồng Anh" },
      { id: "early_bird", name: "Ưu đãi Đóng Sớm (Early Bird -10%)", price: 3780000, discount: 420000, rate: 10, description: "Hỗ trợ phần mềm luyện đề máy tính" },
      { id: "combo", name: "Ưu đãi Đóng Theo Combo (-15%)", price: 3570000, discount: 630000, rate: 15, description: "Combo Luyện Thi B1 + B2 trọn gói" },
    ],
    durationSessions: 20,
    materialsIncluded: true,
    isPopular: false,
    status: "active",
  },
];

export const getPricingTiers = async () => {
  try {
    const q = query(collection(db, PRICING_COLLECTION), orderBy("courseType", "asc"));
    const snapshot = await getDocs(q);
    if (snapshot.empty) return DEFAULT_PRICING_TIERS.map(normalizeTier);
    return snapshot.docs.map((d) => normalizeTier({ id: d.id, ...d.data() }));
  } catch (err) {
    console.warn("Pricing tiers fetch fallback to defaults:", err);
    return DEFAULT_PRICING_TIERS.map(normalizeTier);
  }
};

export const subscribePricingTiers = (callback) => {
  try {
    const q = query(collection(db, PRICING_COLLECTION), orderBy("courseType", "asc"));
    return onSnapshot(
      q,
      (snapshot) => {
        if (snapshot.empty) callback(DEFAULT_PRICING_TIERS.map(normalizeTier));
        else callback(snapshot.docs.map((d) => normalizeTier({ id: d.id, ...d.data() })));
      },
      (err) => {
        console.warn("Pricing tiers subscription error:", err);
        callback(DEFAULT_PRICING_TIERS.map(normalizeTier));
      }
    );
  } catch (err) {
    console.warn("Pricing tiers setup error:", err);
    callback(DEFAULT_PRICING_TIERS.map(normalizeTier));
    return () => {};
  }
};

export const savePricingTier = async (tierData) => {
  const normalized = normalizeTier(tierData);
  const id = normalized.id || `tier_${Date.now()}`;
  const docRef = doc(db, PRICING_COLLECTION, id);
  const data = {
    ...normalized,
    id,
    updatedAt: new Date().toISOString(),
  };
  await setDoc(docRef, data, { merge: true });
  return data;
};

export const deletePricingTier = async (tierId) => {
  const docRef = doc(db, PRICING_COLLECTION, tierId);
  await deleteDoc(docRef);
};

// =========================================================================
// 2. CƠ CHẾ REFERRAL (GIỚI THIỆU HỌC VIÊN)
// =========================================================================
/**
 * Referral Data Model:
 * - referralId
 * - referredStudentId, referredStudentName, classId, className
 * - referrerType: "current_student" | "external"
 * - referrerStudentId, referrerStudentName, referrerPhone (nếu là học viên)
 * - referrerName, referrerPhone, referrerIdCard, bankName, bankAccountNo, bankAccountName (nếu là người ngoài)
 * - commissionAmount: tiền hoa hồng (VD: 300.000₫)
 * - commissionType: "cash" (nhận tiền mặt/chuyển khoản) | "tuition_deduction" (trừ vào học phí của HV giới thiệu)
 * - discountForReferred: tiền giảm giá cho học viên mới (VD: 200.000₫)
 * - status: "pending" | "settled" (đã chi/đã trừ)
 */
export const getReferrals = async () => {
  try {
    const q = query(collection(db, REFERRALS_COLLECTION), orderBy("createdAt", "desc"));
    const snapshot = await getDocs(q);
    return snapshot.docs.map((d) => ({ referralId: d.id, ...d.data() }));
  } catch (err) {
    console.warn("Error getting referrals:", err);
    return [];
  }
};

export const subscribeReferrals = (callback) => {
  try {
    const q = query(collection(db, REFERRALS_COLLECTION), orderBy("createdAt", "desc"));
    return onSnapshot(
      q,
      (snapshot) => {
        callback(snapshot.docs.map((d) => ({ referralId: d.id, ...d.data() })));
      },
      (err) => {
        console.warn("Referrals subscription error:", err);
        callback([]);
      }
    );
  } catch (err) {
    console.warn("Referrals subscription init error:", err);
    callback([]);
    return () => {};
  }
};

export const createReferral = async (referralData) => {
  const referralId = `REF_${Date.now().toString().slice(-6)}`;
  const docRef = doc(db, REFERRALS_COLLECTION, referralId);

  const newReferral = {
    referralId,
    referredStudentId: referralData.referredStudentId || "",
    referredStudentName: referralData.referredStudentName || "",
    classId: referralData.classId || "",
    className: referralData.className || "",
    tuitionId: referralData.tuitionId || "",
    // Nhóm 1: Phân loại người giới thiệu
    referrerType: referralData.referrerType || "current_student", // "current_student" | "external"
    referrerStudentId: referralData.referrerStudentId || "",
    referrerStudentName: referralData.referrerStudentName || "",
    referrerClass: referralData.referrerClass || "",
    referrerPhone: referralData.referrerPhone || "",
    // Người ngoài
    referrerName: referralData.referrerName || "",
    referrerIdCard: referralData.referrerIdCard || "",
    bankName: referralData.bankName || "",
    bankAccountNo: referralData.bankAccountNo || "",
    bankAccountName: referralData.bankAccountName || "",
    // Nhóm 2: Hình thức nhận hoa hồng
    commissionAmount: Number(referralData.commissionAmount) || 300000,
    commissionType: referralData.commissionType || "tuition_deduction", // "cash" | "tuition_deduction"
    discountForReferred: Number(referralData.discountForReferred) || 200000,
    status: referralData.status || "pending", // "pending" | "settled"
    notes: referralData.notes || "",
    createdAt: new Date().toISOString(),
    settledAt: null,
  };

  await setDoc(docRef, newReferral);
  return newReferral;
};

/**
 * Xử lý chi trả hoặc khấu trừ hoa hồng Referral:
 * - Nếu commissionType === "tuition_deduction": Tự động tìm học phí của học viên giới thiệu và khấu trừ trực tiếp!
 * - Nếu commissionType === "cash": Ghi nhận giao dịch chi trong Sổ quỹ nội bộ (Ledger Expense).
 */
export const settleReferralCommission = async (referralId, settledBy = "Admin") => {
  const docRef = doc(db, REFERRALS_COLLECTION, referralId);
  const snap = await getDoc(docRef);
  if (!snap.exists()) throw new Error("Referral record not found.");

  const ref = snap.data();
  if (ref.status === "settled") throw new Error("Hoa hồng referral này đã được chi trả trước đó.");

  const commission = Number(ref.commissionAmount) || 0;
  const now = new Date();

  if (ref.commissionType === "tuition_deduction" && ref.referrerStudentId) {
    // 1. Tự động khấu trừ vào học phí của học viên giới thiệu
    // Tìm bản ghi học phí còn nợ của người giới thiệu
    const qTuition = query(
      collection(db, "tuitions"),
      where("studentId", "==", ref.referrerStudentId)
    );
    const tSnap = await getDocs(qTuition);
    if (!tSnap.empty) {
      // Ưu tiên bản ghi có debtAmount > 0
      const activeTuitionDoc = tSnap.docs.find((d) => (d.data().debtAmount || 0) > 0) || tSnap.docs[0];
      const tuitionData = activeTuitionDoc.data();
      const currentPaid = tuitionData.paidAmount || 0;
      const currentDebt = tuitionData.debtAmount || 0;
      const deduction = Math.min(commission, currentDebt > 0 ? currentDebt : commission);

      await recordTuitionPayment({
        tuitionId: activeTuitionDoc.id,
        studentId: ref.referrerStudentId,
        classId: tuitionData.classId,
        studentName: ref.referrerStudentName,
        amount: deduction,
        paymentMethod: "other",
        note: `Khấu trừ hoa hồng giới thiệu học viên ${ref.referredStudentName} (${ref.referralId})`,
        receivedBy: settledBy,
      });
    }
  } else {
    // 2. Nhận tiền mặt hoặc chuyển khoản -> Tạo phiếu chi Sổ quỹ nội bộ
    await addLedgerTransaction({
      type: "expense",
      category: "commission",
      amount: commission,
      description: `Chi hoa hồng giới thiệu học viên ${ref.referredStudentName} cho ${
        ref.referrerType === "current_student" ? ref.referrerStudentName : ref.referrerName
      }`,
      referenceId: ref.referralId,
      paymentMethod: ref.bankAccountNo ? "bank_transfer" : "cash",
      date: now.toISOString().split("T")[0],
      createdBy: settledBy,
    });
  }

  await updateDoc(docRef, {
    status: "settled",
    settledAt: now.toISOString(),
    settledBy,
  });

  return { success: true, settledAt: now.toISOString() };
};

// =========================================================================
// 3. NÂNG CẤP POS (POINT OF SALE) & TẠO PHIẾU THU TỔNG HỢP
// =========================================================================
export const processPosSale = async ({
  studentId,
  studentName,
  classId,
  className,
  pricingTierId,
  packageId,
  packageName,
  basePrice,
  tierDiscount = 0,
  referralInfo = null,
  paymentMethod = "bank_transfer",
  paidAmount = 0,
  receivedBy = "Admin Thu Ngân",
  note = "",
}) => {
  const now = new Date();
  const numBase = Number(basePrice) || 0;
  const numTierDiscount = Number(tierDiscount) || 0;
  const numRefDiscount = referralInfo?.discountForReferred ? Number(referralInfo.discountForReferred) : 0;
  const finalPrice = Math.max(0, numBase - numTierDiscount - numRefDiscount);
  const numPaid = Number(paidAmount) || 0;
  const debt = Math.max(0, finalPrice - numPaid);

  const receiptId = `POS_${Date.now().toString().slice(-6)}`;
  const tuitionDocId = `${studentId}_${classId}`;

  // 1. Tạo hoặc cập nhật hồ sơ Tuitions
  const tuitionRef = doc(db, "tuitions", tuitionDocId);
  const existingTuition = await getDoc(tuitionRef);

  let initialPaid = 0;
  if (existingTuition.exists()) {
    initialPaid = existingTuition.data().paidAmount || 0;
  }

  const updatedPaidTotal = initialPaid + numPaid;
  const updatedDebt = Math.max(0, finalPrice - updatedPaidTotal);
  const status = updatedDebt === 0 ? "paid" : updatedPaidTotal > 0 ? "partial" : "unpaid";

  const receiptItem = {
    receiptId,
    amount: numPaid,
    method: paymentMethod,
    paidAt: now.toISOString(),
    receivedBy,
    note: note || `POS Thanh toán gói ${packageName || "Biểu phí"}`,
  };

  await setDoc(
    tuitionRef,
    {
      tuitionId: tuitionDocId,
      studentId,
      studentName,
      classId,
      className,
      totalAmount: numBase,
      tierDiscount: numTierDiscount,
      referralDiscount: numRefDiscount,
      finalAmount: finalPrice,
      paidAmount: updatedPaidTotal,
      debtAmount: updatedDebt,
      status,
      appliedTier: {
        tierId: pricingTierId,
        packageId,
        packageName,
      },
      updatedAt: serverTimestamp(),
      createdAt: existingTuition.exists() ? existingTuition.data().createdAt : serverTimestamp(),
    },
    { merge: true }
  );

  // Nếu có thanh toán thực tế > 0, ghi nhận receipt
  if (numPaid > 0) {
    await updateDoc(tuitionRef, {
      paymentHistory: existingTuition.exists()
        ? [...(existingTuition.data().paymentHistory || []), receiptItem]
        : [receiptItem],
    });

    // Cập nhật Student Profile
    const studentRef = doc(db, "students", studentId);
    await updateDoc(studentRef, {
      "tuitionOverview.totalDebt": updatedDebt,
      "tuitionOverview.lastPaymentDate": now.toISOString(),
      updatedAt: serverTimestamp(),
    });

    // Ghi nhận vào Sổ quỹ Ledger
    await addLedgerTransaction({
      type: "income",
      category: "tuition",
      amount: numPaid,
      description: `POS Thu học phí - ${studentName} (${classId})`,
      referenceId: receiptId,
      paymentMethod,
      date: now.toISOString().split("T")[0],
      createdBy: receivedBy,
    });
  }

  // 2. Ghi nhận Referral nếu có
  let createdReferral = null;
  if (referralInfo && (referralInfo.referrerStudentId || referralInfo.referrerName)) {
    createdReferral = await createReferral({
      referredStudentId: studentId,
      referredStudentName: studentName,
      classId,
      className,
      tuitionId: tuitionDocId,
      referrerType: referralInfo.referrerType,
      referrerStudentId: referralInfo.referrerStudentId,
      referrerStudentName: referralInfo.referrerStudentName,
      referrerClass: referralInfo.referrerClass,
      referrerPhone: referralInfo.referrerPhone,
      referrerName: referralInfo.referrerName,
      referrerIdCard: referralInfo.referrerIdCard,
      bankName: referralInfo.bankName,
      bankAccountNo: referralInfo.bankAccountNo,
      bankAccountName: referralInfo.bankAccountName,
      commissionAmount: referralInfo.commissionAmount || 300000,
      commissionType: referralInfo.commissionType || "tuition_deduction",
      discountForReferred: numRefDiscount,
      status: "pending",
      notes: `Ghi nhận từ POS lúc tạo phiếu ${receiptId}`,
    });
  }

  // 3. Lưu lịch sử POS Receipt
  const posDocRef = doc(db, POS_RECEIPTS_COLLECTION, receiptId);
  const posRecord = {
    receiptId,
    tuitionId: tuitionDocId,
    studentId,
    studentName,
    classId,
    className,
    pricingTierId,
    packageId,
    packageName,
    basePrice: numBase,
    tierDiscount: numTierDiscount,
    referralDiscount: numRefDiscount,
    finalPrice,
    paidAmount: numPaid,
    debtAmount: updatedDebt,
    paymentMethod,
    referralId: createdReferral?.referralId || null,
    receivedBy,
    note,
    createdAt: now.toISOString(),
  };
  await setDoc(posDocRef, posRecord);

  return {
    receiptId,
    posRecord,
    finalPrice,
    updatedDebt,
    status,
    createdReferral,
  };
};
