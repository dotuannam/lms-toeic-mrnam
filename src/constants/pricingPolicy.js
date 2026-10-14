/**
 * PRICING & DISCOUNT POLICY CONSTANTS (PHƯƠNG ÁN B - PHÂN TẦNG)
 * Centralized business logic and profit guardrails for LMS TOEIC MR.NAM
 */

// 1. Single Courses (Khóa lẻ)
export const SINGLE_COURSES = {
  FOUNDATION: {
    code: "FOUNDATION",
    name: "1. Foundation",
    prefixes: ["TOFO", "FO"],
    sessions: 24,
    pricePerSession: 70000,
    baseFee: 1680000,
    comboDiscountPct: 0,
    category: "single",
    description: "Khóa nền tảng từ mất gốc - 24 buổi (70.000đ/buổi)",
  },
  TARGET_550: {
    code: "TARGET_550",
    name: "2. Target 550",
    prefixes: ["TO-550", "TO550", "550"],
    sessions: 24,
    pricePerSession: 80000,
    baseFee: 1920000,
    comboDiscountPct: 0,
    category: "single",
    description: "Khóa mục tiêu 550+ - 24 buổi (80.000đ/buổi)",
  },
  TARGET_650: {
    code: "TARGET_650",
    name: "3. Target 650+",
    prefixes: ["TO-650", "TO650", "650"],
    sessions: 16,
    pricePerSession: 100000,
    baseFee: 1600000,
    comboDiscountPct: 0,
    category: "single",
    description: "Khóa nâng cao mục tiêu 650+ - 16 buổi (100.000đ/buổi)",
  },
};

// 2. Combo Packages (Bulk Discount 1 - Lộ trình)
export const COMBO_PACKAGES = {
  COMBO_FO_550: {
    code: "COMBO_FO_550",
    name: "Combo 2 khóa: Foundation + Target 550",
    sessions: 48,
    baseFee: 3600000,
    comboDiscountPct: 10,
    netAfterCombo: 3240000,
    category: "combo",
    description: "Lộ trình 2 khóa: Tiết kiệm 10% (360.000đ)",
  },
  COMBO_550_650: {
    code: "COMBO_550_650",
    name: "Combo 2 khóa: Target 550 + Target 650+",
    sessions: 40,
    baseFee: 3520000,
    comboDiscountPct: 10,
    netAfterCombo: 3168000,
    category: "combo",
    description: "Lộ trình bứt phá 550->650+: Tiết kiệm 10% (352.000đ)",
  },
  COMBO_FULL_3: {
    code: "COMBO_FULL_3",
    name: "Combo 3 khóa: Trọn lộ trình (Foundation -> 650+)",
    sessions: 64,
    baseFee: 5200000,
    comboDiscountPct: 15,
    netAfterCombo: 4420000,
    category: "combo",
    description: "Trọn gói từ mất gốc đến 650+: Tiết kiệm 15% (780.000đ)",
  },
  CUSTOM: {
    code: "CUSTOM",
    name: "Khóa khác (TOSW / APTIS / IELTS - Nhập tay)",
    sessions: 24,
    baseFee: 0,
    comboDiscountPct: 0,
    category: "custom",
    description: "Chương trình đào tạo riêng / Tự điều chỉnh",
  },
};

// All Available Packages Map
export const PRICING_PACKAGES = {
  ...SINGLE_COURSES,
  ...COMBO_PACKAGES,
};

// 3. Stackable Discounts (Bulk Discount 2 & Referral)
export const GROUP_DISCOUNTS = {
  NONE: {
    code: "NONE",
    label: "Cá nhân (0%)",
    discountPct: 0,
  },
  GROUP_2: {
    code: "GROUP_2",
    label: "Nhóm 2 HV (-5%)",
    discountPct: 5,
  },
  GROUP_3_PLUS: {
    code: "GROUP_3_PLUS",
    label: "Nhóm 3+ HV (-10%)",
    discountPct: 10,
  },
};

export const REFERRAL_UPGRADE_REWARDS = {
  NONE: {
    code: "NONE",
    label: "Không áp dụng",
    discountPct: 0,
    flatDeduction: 0,
  },
  PERCENT_5: {
    code: "PERCENT_5",
    label: "Dùng thưởng 5% (-5%)",
    discountPct: 5,
    flatDeduction: 0,
  },
  FLAT_100K: {
    code: "FLAT_100K",
    label: "Dùng thưởng 100.000đ (-100k)",
    discountPct: 0,
    flatDeduction: 100000,
  },
};

// 4. Strict Profit Guardrails (CRITICAL BUSINESS RULES)
export const PROFIT_GUARDRAILS = {
  MAX_DISCOUNT_PERCENT: 20, // Max 20% total discount per student
  FLOOR_PRICE_PER_SESSION: 56000, // Minimum 56,000 VND / session
  CLASS_TARGET_STUDENTS_MIN: 8,
  CLASS_TARGET_STUDENTS_MAX: 10,
  MIN_CLASS_SESSION_REVENUE: 500000, // Revenue standard >= 500,000 VND / session
};

/**
 * Auto-detect package code from class code
 */
export const detectPackageFromClassCode = (classCode = "") => {
  const upper = String(classCode || "").toUpperCase();
  if (upper.includes("TOFO") || upper.includes("FOUNDATION") || upper.startsWith("FO")) {
    return "FOUNDATION";
  }
  if (upper.includes("550") || upper.includes("TO-550") || upper.includes("TO550")) {
    return "TARGET_550";
  }
  if (upper.includes("650") || upper.includes("TO-650") || upper.includes("TO650")) {
    return "TARGET_650";
  }
  return "FOUNDATION";
};

/**
 * Calculation Engine strictly enforcing business policy:
 * - rawPercentDiscount = Math.min(20, comboDiscountPct + groupDiscountPct + newStudentRefPct + referrerUpgradePct)
 * - calculatedDiscount = (baseFee * rawPercentDiscount / 100) + (useFlat100kReward ? 100000 : 0)
 * - cappedDiscount = Math.min(calculatedDiscount, baseFee * 0.20)
 * - totalFee = Math.max(baseFee - cappedDiscount, sessions * 56000)
 */
export const calculateTuitionBreakdown = ({
  packageCode = "FOUNDATION",
  customBaseFee = 0,
  customSessions = 24,
  groupDiscountType = "NONE",
  isReferredByOldStudent = false,
  referrerCode = "",
  referrerUpgradeRewardType = "NONE",
}) => {
  const pkg = PRICING_PACKAGES[packageCode] || PRICING_PACKAGES.FOUNDATION;
  const isCustom = packageCode === "CUSTOM";

  const sessions = isCustom
    ? Math.max(1, Number(customSessions) || 24)
    : pkg.sessions;

  const baseFee = isCustom
    ? Math.max(0, Number(customBaseFee) || 0)
    : pkg.baseFee;

  const comboDiscountPct = pkg.comboDiscountPct || 0;
  const groupDiscountPct = GROUP_DISCOUNTS[groupDiscountType]?.discountPct || 0;
  const newStudentRefPct = isReferredByOldStudent ? 5 : 0;
  const referrerUpgradePct = referrerUpgradeRewardType === "PERCENT_5" ? 5 : 0;
  const useFlat100kReward = referrerUpgradeRewardType === "FLAT_100K";

  // Raw combined percentage
  const rawSumPercent =
    comboDiscountPct + groupDiscountPct + newStudentRefPct + referrerUpgradePct;

  // Max raw discount percent cannot exceed 20
  const rawPercentDiscount = Math.min(PROFIT_GUARDRAILS.MAX_DISCOUNT_PERCENT, rawSumPercent);

  // Calculated discount with flat rewards
  const calculatedDiscount =
    Math.round((baseFee * rawPercentDiscount) / 100) + (useFlat100kReward ? 100000 : 0);

  // Rule 1: Max discount cap cannot exceed 20% of baseFee
  const maxAllowedDiscount = Math.round(baseFee * (PROFIT_GUARDRAILS.MAX_DISCOUNT_PERCENT / 100));
  const cappedDiscount = Math.min(calculatedDiscount, maxAllowedDiscount);

  // Rule 2: Floor price per session (sessions * 56,000 VND)
  const minAllowedFee = sessions * PROFIT_GUARDRAILS.FLOOR_PRICE_PER_SESSION;
  const tentativeFee = baseFee - cappedDiscount;
  const totalFee = Math.max(0, Math.max(tentativeFee, minAllowedFee));

  // Final realized discount amount
  const totalDiscountAmount = Math.max(0, baseFee - totalFee);
  const effectivePricePerSession = sessions > 0 ? Math.round(totalFee / sessions) : 0;

  // Flag indicators
  const isCappedAt20Pct =
    calculatedDiscount > maxAllowedDiscount || rawSumPercent > PROFIT_GUARDRAILS.MAX_DISCOUNT_PERCENT;
  const isFloorEnforced = tentativeFee < minAllowedFee && baseFee > 0;

  return {
    packageCode,
    packageName: pkg.name,
    sessions,
    baseFee,
    comboDiscountPct,
    groupDiscountType,
    groupDiscountPct,
    isReferredByOldStudent: Boolean(isReferredByOldStudent),
    referrerCode: (referrerCode || "").trim().toUpperCase(),
    referrerUpgradeRewardType,
    useFlat100kReward,
    rawSumPercent,
    rawPercentDiscount,
    calculatedDiscount,
    cappedDiscount,
    totalDiscountAmount,
    totalFee,
    minAllowedFee,
    effectivePricePerSession,
    isCappedAt20Pct,
    isFloorEnforced,
  };
};

/**
 * Health check helper for class revenue per session:
 * Returns { sessionRevenue, targetMin, isHealthy, difference }
 */
export const checkClassRevenueHealth = (studentsInClass = []) => {
  const activeStudents = (studentsInClass || []).filter(
    (s) => s.status === "active" || !s.status
  );

  const totalSessionRevenue = activeStudents.reduce((sum, s) => {
    // Check tuition breakdown or estimate from total fee
    const perSession =
      s.tuitionOverview?.effectivePricePerSession ||
      (s.tuitionOverview?.sessions
        ? Math.round((s.tuitionOverview.totalAmount || 0) / s.tuitionOverview.sessions)
        : Math.round((s.tuitionOverview?.totalAmount || 0) / 24));
    return sum + (Number(perSession) || 0);
  }, 0);

  const targetMin = PROFIT_GUARDRAILS.MIN_CLASS_SESSION_REVENUE;
  const isHealthy = totalSessionRevenue >= targetMin;

  return {
    studentCount: activeStudents.length,
    sessionRevenue: totalSessionRevenue,
    targetMin,
    isHealthy,
    difference: totalSessionRevenue - targetMin,
  };
};
