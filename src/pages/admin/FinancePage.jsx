import React, { useState, useEffect, useMemo } from "react";
import { useLanguage } from "../../context/LanguageContext";
import {
  getTuitions,
  recordTuitionPayment,
  getLedgerTransactions,
  addLedgerTransaction,
  getMonthlySummaries,
} from "../../services/financeService";
import { subscribeClasses } from "../../services/classService";
import { subscribeStudents } from "../../services/studentService";
import { VIETQR_CONFIG, buildVietQrUrl } from "../../config/vietqr";
import { useSettings } from "../../context/SettingsContext";
import {
  subscribePricingTiers,
  savePricingTier,
  deletePricingTier,
  buildTierPackages,
  normalizeTier,
  subscribeReferrals,
  createReferral,
  settleReferralCommission,
  processPosSale,
} from "../../services/pricingReferralWebhookService";

export const FinancePage = () => {
  const { t, lang } = useLanguage();
  const { bankingConfig, buildQrUrl } = useSettings();

  // Subtab: "pos" | "pricing" | "referrals" | "tuition" | "ledger" | "profit_loss"
  const [activeSubTab, setActiveSubTab] = useState("pos");

  // Core Data
  const [classes, setClasses] = useState([]);
  const [students, setStudents] = useState([]);
  const [tuitions, setTuitions] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [monthlySummaries, setMonthlySummaries] = useState([]);
  const [loading, setLoading] = useState(true);

  // Giai đoạn 4 Data
  const [pricingTiers, setPricingTiers] = useState([]);
  const [referrals, setReferrals] = useState([]);

  // Filter
  const [selectedClassFilter, setSelectedClassFilter] = useState("all");
  const [referralFilterStatus, setReferralFilterStatus] = useState("all");
  const [referralFilterType, setReferralFilterType] = useState("all");

  // VietQR Modal
  const [showQrModal, setShowQrModal] = useState(false);
  const [qrData, setQrData] = useState(null);

  // Payment Recording Modal (From Tuition Tab)
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentTarget, setPaymentTarget] = useState(null);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("bank_transfer");
  const [paymentNote, setPaymentNote] = useState("");
  const [submittingPayment, setSubmittingPayment] = useState(false);

  // Ledger New Tx Modal
  const [showTxModal, setShowTxModal] = useState(false);
  const [txData, setTxData] = useState({
    type: "expense",
    category: "salary",
    amount: "",
    description: "",
    paymentMethod: "bank_transfer",
  });
  const [submittingTx, setSubmittingTx] = useState(false);

  // ==========================================
  // STATE: POS CASHIER
  // ==========================================
  const [posMode, setPosMode] = useState("existing"); // "existing" | "new"
  const [posStudentId, setPosStudentId] = useState("");
  const [posNewStudent, setPosNewStudent] = useState({
    studentId: `HV${Date.now().toString().slice(-4)}`,
    fullName: "",
    phone: "",
    email: "",
  });
  const [posClassId, setPosClassId] = useState("");
  const [posTierId, setPosTierId] = useState("");
  const [posPkgId, setPosPkgId] = useState("std");
  const [posPaymentMethod, setPosPaymentMethod] = useState("bank_transfer");
  const [posNote, setPosNote] = useState("");

  // Referral at POS
  const [posHasReferral, setPosHasReferral] = useState(false);
  const [posReferral, setPosReferral] = useState({
    referrerType: "student", // "student" | "external"
    referrerStudentId: "",
    externalName: "",
    externalPhone: "",
    externalIdCard: "",
    externalBank: "",
    rewardType: "cash", // "tuition_deduction" | "cash"
    referrerReward: 300000,
    newStudentDiscount: 200000,
  });

  const [posSubmitting, setPosSubmitting] = useState(false);
  const [posCompletedReceipt, setPosCompletedReceipt] = useState(null);

  // ==========================================
  // STATE: PRICING MODAL
  // ==========================================
  const [showTierModal, setShowTierModal] = useState(false);
  const [editingTier, setEditingTier] = useState(null);
  const [tierForm, setTierForm] = useState(() =>
    normalizeTier({
      id: "",
      name: "",
      courseType: "TOEIC",
      originalPrice: 4500000,
      earlyBirdRate: 10,
      comboRate: 15,
      durationSessions: 24,
      materialsIncluded: true,
      isPopular: false,
      status: "active",
    })
  );

  const handleTierFieldChange = (field, value) => {
    setTierForm((prev) => {
      const next = { ...prev, [field]: value };
      if (field === "originalPrice" || field === "earlyBirdRate" || field === "comboRate") {
        const pkgs = buildTierPackages({
          originalPrice: field === "originalPrice" ? Number(value) : next.originalPrice,
          earlyBirdRate: field === "earlyBirdRate" ? Number(value) : next.earlyBirdRate,
          comboRate: field === "comboRate" ? Number(value) : next.comboRate,
        });
        next.packages = pkgs;
      }
      return next;
    });
  };

  // ==========================================
  // STATE: REFERRAL CREATE MODAL
  // ==========================================
  const [showRefModal, setShowRefModal] = useState(false);
  const [refFormData, setRefFormData] = useState({
    referrerType: "student",
    referrerStudentId: "",
    externalName: "",
    externalPhone: "",
    externalIdCard: "",
    externalBank: "",
    rewardType: "cash",
    referrerReward: 300000,
    studentName: "",
    studentPhone: "",
    notes: "",
  });

  // ==========================================
  // DATA LOAD & REALTIME LISTENERS
  // ==========================================
  const loadFinanceData = async () => {
    setLoading(true);
    try {
      const [tList, txList, sumList] = await Promise.all([
        getTuitions(selectedClassFilter),
        getLedgerTransactions(50),
        getMonthlySummaries(),
      ]);
      setTuitions(tList);
      setTransactions(txList);
      setMonthlySummaries(sumList);
    } catch (err) {
      console.error("Finance data loading error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFinanceData();
  }, [selectedClassFilter]);

  useEffect(() => {
    const unsubClasses = subscribeClasses((cls) => setClasses(cls));
    const unsubStudents = subscribeStudents((stus) => setStudents(stus));
    const unsubTiers = subscribePricingTiers((tiers) => {
      setPricingTiers(tiers);
      if (tiers.length > 0 && !posTierId) {
        setPosTierId(tiers[0].id);
      }
    });
    const unsubRefs = subscribeReferrals((refs) => setReferrals(refs));

    return () => {
      unsubClasses();
      unsubStudents();
      unsubTiers();
      unsubRefs();
    };
  }, []);

  // ==========================================
  // POS CALCULATION
  // ==========================================
  const selectedTier = useMemo(() => {
    return pricingTiers.find((t) => t.id === posTierId) || pricingTiers[0] || null;
  }, [pricingTiers, posTierId]);

  const selectedPackage = useMemo(() => {
    if (!selectedTier || !selectedTier.packages) return null;
    return selectedTier.packages.find((p) => p.id === posPkgId) || selectedTier.packages[0] || null;
  }, [selectedTier, posPkgId]);

  const posCalculations = useMemo(() => {
    const originalPrice = selectedTier?.originalPrice || 4500000;
    const pkgPrice = selectedPackage?.price ?? originalPrice;
    const tierDiscount = Math.max(0, originalPrice - pkgPrice);
    const referralDiscount = posHasReferral ? Number(posReferral.newStudentDiscount || 0) : 0;
    const finalAmount = Math.max(0, originalPrice - tierDiscount - referralDiscount);

    return {
      originalPrice,
      tierDiscount,
      referralDiscount,
      finalAmount,
    };
  }, [selectedTier, selectedPackage, posHasReferral, posReferral]);

  // Generate dynamic VietQR for POS
  const posQrUrl = useMemo(() => {
    const amount = posCalculations.finalAmount;
    const targetStudentId = posMode === "existing" ? posStudentId : posNewStudent.studentId;
    const desc = `HP ${targetStudentId || "HV"} POS`.slice(0, 50);

    return buildQrUrl
      ? buildQrUrl({ amount, transferDescription: desc })
      : buildVietQrUrl({ amount, transferDescription: desc });
  }, [posCalculations.finalAmount, posMode, posStudentId, posNewStudent.studentId, buildQrUrl]);

  // ==========================================
  // HANDLERS: POS SALE SUBMIT
  // ==========================================
  const handleProcessPos = async (e) => {
    e.preventDefault();
    const effectiveStudentId = posMode === "existing" ? posStudentId : posNewStudent.studentId;
    const effectiveStudent =
      posMode === "existing"
        ? students.find((s) => s.studentId === posStudentId)
        : posNewStudent;

    if (!effectiveStudentId) {
      alert(lang === "vi" ? "Vui lòng chọn hoặc nhập mã học viên!" : "Please select a student!");
      return;
    }
    if (!posClassId) {
      alert(lang === "vi" ? "Vui lòng chọn lớp học!" : "Please select a class!");
      return;
    }

    const cls = classes.find((c) => c.classId === posClassId);

    // Chuẩn bị payload
    const payload = {
      studentId: effectiveStudentId,
      studentName: effectiveStudent?.fullName || effectiveStudent?.name || "Học viên",
      studentPhone: effectiveStudent?.phone || "",
      studentEmail: effectiveStudent?.email || "",
      classId: posClassId,
      className: cls ? `${cls.code} - ${cls.name}` : posClassId,
      tierId: selectedTier?.id,
      tierName: selectedTier?.name,
      packageId: selectedPackage?.id,
      packageName: selectedPackage?.name,
      originalPrice: posCalculations.originalPrice,
      tierDiscount: posCalculations.tierDiscount,
      referralDiscount: posCalculations.referralDiscount,
      finalAmount: posCalculations.finalAmount,
      paidAmount: posCalculations.finalAmount, // Thu đủ tại POS
      paymentMethod: posPaymentMethod,
      receivedBy: "Admin POS",
      note: posNote,
    };

    if (posHasReferral) {
      let referrerInfo = {};
      if (posReferral.referrerType === "student") {
        const refStu = students.find((s) => s.studentId === posReferral.referrerStudentId);
        referrerInfo = {
          studentId: refStu?.studentId || posReferral.referrerStudentId,
          name: refStu?.fullName || refStu?.name || "Học viên",
          phone: refStu?.phone || "",
          className: refStu?.classId || "",
        };
      } else {
        referrerInfo = {
          name: posReferral.externalName,
          phone: posReferral.externalPhone,
          idCard: posReferral.externalIdCard,
          bankAccount: posReferral.externalBank,
        };
      }

      payload.referral = {
        referrerType: posReferral.referrerType,
        referrerInfo,
        rewardType: posReferral.rewardType,
        referrerReward: Number(posReferral.referrerReward || 0),
        newStudentDiscount: Number(posReferral.newStudentDiscount || 0),
      };
    }

    setPosSubmitting(true);
    try {
      const result = await processPosSale(payload);
      setPosCompletedReceipt(result);
      await loadFinanceData();
      alert(lang === "vi" ? "Thanh toán POS & lập phiếu thu thành công!" : "POS payment recorded successfully!");
    } catch (err) {
      console.error("POS Sale error:", err);
      alert("Lỗi khi xử lý POS: " + err.message);
    } finally {
      setPosSubmitting(false);
    }
  };

  // ==========================================
  // HANDLERS: REFERRAL SETTLEMENT
  // ==========================================
  const handleSettleReferral = async (ref) => {
    const confirmMsg =
      ref.rewardType === "tuition_deduction"
        ? lang === "vi"
          ? `Khấu trừ ${ref.referrerReward?.toLocaleString("vi-VN")}₫ trực tiếp vào học phí của học viên ${ref.referrerInfo?.name} (${ref.referrerInfo?.studentId})?`
          : `Deduct ${ref.referrerReward?.toLocaleString()} VND from tuition balance of ${ref.referrerInfo?.name}?`
        : lang === "vi"
        ? `Xác nhận đã thanh toán tiền mặt/chuyển khoản ${ref.referrerReward?.toLocaleString("vi-VN")}₫ hoa hồng cho ${ref.referrerInfo?.name}? (Tự động ghi sổ quỹ chi)`
        : `Confirm cash payout of ${ref.referrerReward?.toLocaleString()} VND to ${ref.referrerInfo?.name}?`;

    if (!window.confirm(confirmMsg)) return;

    try {
      const res = await settleReferralCommission(ref.id, "Admin");
      if (res.success) {
        alert(
          lang === "vi"
            ? `✅ Quyết toán thành công! ${
                ref.rewardType === "tuition_deduction"
                  ? "Đã tự động khấu trừ vào công nợ học phí của học viên giới thiệu."
                  : "Đã tạo phiếu chi trong Sổ quỹ nội bộ."
              }`
            : "Referral commission settled successfully!"
        );
        await loadFinanceData();
      }
    } catch (err) {
      alert("Lỗi quyết toán: " + err.message);
    }
  };

  // ==========================================
  // HANDLERS: TUITION PAYMENT RECORDING (Modal)
  // ==========================================
  const openPayment = (t) => {
    setPaymentTarget(t);
    setPaymentAmount(t.debtAmount ? t.debtAmount.toString() : "0");
    setShowPaymentModal(true);
  };

  const handlePaymentSubmit = async (e) => {
    e.preventDefault();
    if (!paymentTarget || !paymentAmount) return;

    setSubmittingPayment(true);
    try {
      await recordTuitionPayment({
        tuitionId: paymentTarget.tuitionId,
        studentId: paymentTarget.studentId,
        classId: paymentTarget.classId,
        studentName: paymentTarget.studentName,
        amount: Number(paymentAmount),
        paymentMethod,
        note: paymentNote,
        receivedBy: "Admin",
      });

      setShowPaymentModal(false);
      await loadFinanceData();
    } catch (err) {
      alert("Payment processing failed: " + err.message);
    } finally {
      setSubmittingPayment(false);
    }
  };

  const openVietQr = (t) => {
    const amount = t.debtAmount || 0;
    const desc = `HP ${t.studentId} ${t.className || ""}`.trim().slice(0, 50);
    const qrUrl = buildQrUrl
      ? buildQrUrl({ amount, transferDescription: desc })
      : buildVietQrUrl({ amount, transferDescription: desc });

    setQrData({
      qrUrl,
      studentName: t.studentName,
      studentId: t.studentId,
      amount,
      desc,
      accountNo: bankingConfig?.accountNo || VIETQR_CONFIG.accountNo,
      accountName: bankingConfig?.accountName || VIETQR_CONFIG.accountName,
      bank: bankingConfig?.bankId || VIETQR_CONFIG.bankId,
    });
    setShowQrModal(true);
  };

  // ==========================================
  // HANDLERS: LEDGER TX SUBMIT
  // ==========================================
  const handleTxSubmit = async (e) => {
    e.preventDefault();
    if (!txData.amount) return;

    setSubmittingTx(true);
    try {
      await addLedgerTransaction({
        type: txData.type,
        category: txData.category,
        amount: Number(txData.amount),
        description: txData.description,
        paymentMethod: txData.paymentMethod,
        date: new Date().toISOString().split("T")[0],
        createdBy: "Admin",
      });

      setShowTxModal(false);
      setTxData({
        type: "expense",
        category: "salary",
        amount: "",
        description: "",
        paymentMethod: "bank_transfer",
      });
      await loadFinanceData();
    } catch (err) {
      alert("Ledger save error: " + err.message);
    } finally {
      setSubmittingTx(false);
    }
  };

  // ==========================================
  // FILTERED REFERRALS
  // ==========================================
  const filteredReferrals = useMemo(() => {
    return referrals.filter((r) => {
      if (referralFilterStatus !== "all" && r.status !== referralFilterStatus) return false;
      if (referralFilterType !== "all" && r.referrerType !== referralFilterType) return false;
      return true;
    });
  }, [referrals, referralFilterStatus, referralFilterType]);

  // KPIs
  const totalIncome = transactions
    .filter((tx) => tx.type === "income")
    .reduce((sum, tx) => sum + (tx.amount || 0), 0);
  const totalExpense = transactions
    .filter((tx) => tx.type === "expense")
    .reduce((sum, tx) => sum + (tx.amount || 0), 0);
  const runningBalance = totalIncome - totalExpense;

  const totalTuitionRevenue = tuitions.reduce((sum, t) => sum + (t.paidAmount || 0), 0);
  const totalTuitionDebt = tuitions.reduce((sum, t) => sum + (t.debtAmount || 0), 0);
  const totalTuitionExpected = tuitions.reduce((sum, t) => sum + (t.finalAmount || t.totalAmount || 0), 0);

  const pendingReferralCommissions = referrals
    .filter((r) => r.status === "pending")
    .reduce((sum, r) => sum + (r.referrerReward || 0), 0);

  return (
    <div className="space-y-6">
      {/* ========================================== */}
      {/* SUBTAB NAVIGATION (Vàng đất #c27803 chủ đạo) */}
      {/* ========================================== */}
      <div className="flex border-b border-amber-900/10 overflow-x-auto gap-1 sm:gap-2 no-scrollbar">
        <button
          onClick={() => setActiveSubTab("pos")}
          className={`py-3 px-4 sm:px-5 text-xs font-heading font-bold uppercase tracking-wider border-b-2 whitespace-nowrap transition flex items-center gap-2 ${
            activeSubTab === "pos"
              ? "border-[#c27803] text-[#c27803] bg-amber-50/50"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <rect x="2" y="5" width="20" height="14" rx="2" strokeWidth="2"/>
            <line x1="2" y1="10" x2="22" y2="10" strokeWidth="2"/>
          </svg>
          <span>{lang === "vi" ? "Thu Ngân POS" : "POS Cashier"}</span>
          <span className="text-[10px] bg-[#c27803] text-white px-1.5 py-0.2 rounded-full font-sans">
            Mới
          </span>
        </button>

        <button
          onClick={() => setActiveSubTab("pricing")}
          className={`py-3 px-4 sm:px-5 text-xs font-heading font-bold uppercase tracking-wider border-b-2 whitespace-nowrap transition flex items-center gap-2 ${
            activeSubTab === "pricing"
              ? "border-[#c27803] text-[#c27803] bg-amber-50/50"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 7h.01M7 3h5a1.99 1.99 0 011.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V5a2 2 0 012-2z"/>
          </svg>
          <span>{lang === "vi" ? "Biểu Phí Chuẩn" : "Pricing Tiers"}</span>
        </button>

        <button
          onClick={() => setActiveSubTab("referrals")}
          className={`py-3 px-4 sm:px-5 text-xs font-heading font-bold uppercase tracking-wider border-b-2 whitespace-nowrap transition flex items-center gap-2 ${
            activeSubTab === "referrals"
              ? "border-[#c27803] text-[#c27803] bg-amber-50/50"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"/>
          </svg>
          <span>{lang === "vi" ? "Quản Lý Referral" : "Referrals"}</span>
          {pendingReferralCommissions > 0 && (
            <span className="text-[10px] bg-rose-500 text-white px-1.5 py-0.2 rounded-full font-sans">
              {(pendingReferralCommissions / 1000).toLocaleString("vi-VN")}k
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveSubTab("tuition")}
          className={`py-3 px-4 sm:px-5 text-xs font-heading font-bold uppercase tracking-wider border-b-2 whitespace-nowrap transition flex items-center gap-2 ${
            activeSubTab === "tuition"
              ? "border-[#c27803] text-[#c27803] bg-amber-50/50"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"/>
          </svg>
          <span>{lang === "vi" ? "Theo Dõi Học Phí" : "Tuition Tracking"}</span>
        </button>

        <button
          onClick={() => setActiveSubTab("ledger")}
          className={`py-3 px-4 sm:px-5 text-xs font-heading font-bold uppercase tracking-wider border-b-2 whitespace-nowrap transition flex items-center gap-2 ${
            activeSubTab === "ledger"
              ? "border-[#c27803] text-[#c27803] bg-amber-50/50"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
          </svg>
          <span>{lang === "vi" ? "Sổ Quỹ Thu - Chi" : "Internal Ledger"}</span>
        </button>

        <button
          onClick={() => setActiveSubTab("profit_loss")}
          className={`py-3 px-4 sm:px-5 text-xs font-heading font-bold uppercase tracking-wider border-b-2 whitespace-nowrap transition flex items-center gap-2 ${
            activeSubTab === "profit_loss"
              ? "border-[#c27803] text-[#c27803] bg-amber-50/50"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/>
          </svg>
          <span>{lang === "vi" ? "Báo Cáo P&L" : "Monthly P&L"}</span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* 1. POS CASHIER SUBTAB (MÀN HÌNH THU NGÂN POS) */}
      {/* ========================================================================= */}
      {activeSubTab === "pos" && (
        <div className="space-y-6">
          <div className="bg-gradient-to-r from-[#261e16] to-[#3a2c20] text-amber-50 p-6 rounded-2xl border border-amber-900/30 shadow-md">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <span className="text-[11px] font-heading font-bold uppercase tracking-widest text-[#e89e24] bg-amber-950/60 px-2.5 py-1 rounded-full border border-amber-800/40">
                  POS Cashier Terminal v2.0
                </span>
                <h2 className="text-xl sm:text-2xl font-bold font-heading text-white mt-2">
                  {lang === "vi" ? "Quầy Thu Ngân & Ghi Nhận Học Phí" : "Point of Sale Cashier Terminal"}
                </h2>
                <p className="text-xs text-amber-200/80 mt-1 max-w-2xl">
                  {lang === "vi"
                    ? "Tự động áp dụng Biểu phí chuẩn, khấu trừ ưu đãi Referral đa cấp (Học viên hiện tại / Người ngoài), tự sinh mã VietQR động để học viên quét chuyển khoản tức thì."
                    : "Automated standard pricing tiers, referral dual-group deductions, and dynamic VietQR generation."}
                </p>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={() => {
                    setPosCompletedReceipt(null);
                    setPosMode("existing");
                    setPosHasReferral(false);
                  }}
                  className="px-4 py-2 bg-amber-800/50 hover:bg-amber-800 text-amber-100 rounded-xl text-xs font-heading font-bold uppercase tracking-wider transition border border-amber-700/50"
                >
                  {lang === "vi" ? "Làm mới Form" : "Reset Form"}
                </button>
              </div>
            </div>
          </div>

          {/* Form POS 2 cột */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Cột trái: Thông tin học viên, Lớp học, Biểu phí, Referral (7 cols) */}
            <div className="lg:col-span-7 space-y-6">
              <form onSubmit={handleProcessPos} className="space-y-6">
                {/* Bước 1: Học viên */}
                <div className="bg-white p-5 rounded-2xl border border-amber-900/10 shadow-sm space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-heading font-bold uppercase tracking-wider text-slate-800 flex items-center gap-2">
                      <span className="w-6 h-6 rounded-full bg-[#c27803] text-white flex items-center justify-center text-xs">
                        1
                      </span>
                      {lang === "vi" ? "Thông Tin Học Viên" : "Student Information"}
                    </h3>
                    <div className="flex bg-slate-100 p-0.5 rounded-lg text-xs font-semibold">
                      <button
                        type="button"
                        onClick={() => setPosMode("existing")}
                        className={`px-3 py-1 rounded-md transition ${
                          posMode === "existing"
                            ? "bg-white text-slate-900 shadow-sm"
                            : "text-slate-500 hover:text-slate-800"
                        }`}
                      >
                        {lang === "vi" ? "Đã có hồ sơ" : "Existing"}
                      </button>
                      <button
                        type="button"
                        onClick={() => setPosMode("new")}
                        className={`px-3 py-1 rounded-md transition ${
                          posMode === "new"
                            ? "bg-white text-slate-900 shadow-sm"
                            : "text-slate-500 hover:text-slate-800"
                        }`}
                      >
                        {lang === "vi" ? "Học viên mới" : "New Student"}
                      </button>
                    </div>
                  </div>

                  {posMode === "existing" ? (
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        {lang === "vi" ? "Chọn học viên từ hệ thống:" : "Select Student:"}
                      </label>
                      <select
                        value={posStudentId}
                        onChange={(e) => setPosStudentId(e.target.value)}
                        className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#c27803]"
                      >
                        <option value="">{lang === "vi" ? "-- Chọn học viên --" : "-- Select student --"}</option>
                        {students.map((s) => (
                          <option key={s.studentId} value={s.studentId}>
                            [{s.studentId}] {s.fullName || s.name} - {s.phone || "Không có SĐT"}
                          </option>
                        ))}
                      </select>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">Mã Học Viên:</label>
                        <input
                          type="text"
                          value={posNewStudent.studentId}
                          onChange={(e) => setPosNewStudent({ ...posNewStudent, studentId: e.target.value })}
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">Họ và Tên (*):</label>
                        <input
                          type="text"
                          required
                          placeholder="Nguyễn Văn A"
                          value={posNewStudent.fullName}
                          onChange={(e) => setPosNewStudent({ ...posNewStudent, fullName: e.target.value })}
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-800"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">Số Điện Thoại (*):</label>
                        <input
                          type="tel"
                          required
                          placeholder="0912345678"
                          value={posNewStudent.phone}
                          onChange={(e) => setPosNewStudent({ ...posNewStudent, phone: e.target.value })}
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-800"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">Email:</label>
                        <input
                          type="email"
                          placeholder="hocvien@gmail.com"
                          value={posNewStudent.email}
                          onChange={(e) => setPosNewStudent({ ...posNewStudent, email: e.target.value })}
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-800"
                        />
                      </div>
                    </div>
                  )}

                  {/* Chọn Lớp Học */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      {lang === "vi" ? "Lớp Học Đăng Ký (*):" : "Enrolling Class (*):"}
                    </label>
                    <select
                      value={posClassId}
                      onChange={(e) => setPosClassId(e.target.value)}
                      required
                      className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#c27803]"
                    >
                      <option value="">{lang === "vi" ? "-- Chọn lớp học --" : "-- Select class --"}</option>
                      {classes.map((c) => (
                        <option key={c.classId} value={c.classId}>
                          {c.code} - {c.name} ({c.schedule || "Lịch linh hoạt"})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Bước 2: Biểu Phí Chuẩn & Gói Ưu Đãi */}
                <div className="bg-white p-5 rounded-2xl border border-amber-900/10 shadow-sm space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-heading font-bold uppercase tracking-wider text-slate-800 flex items-center gap-2">
                      <span className="w-6 h-6 rounded-full bg-[#c27803] text-white flex items-center justify-center text-xs">
                        2
                      </span>
                      {lang === "vi" ? "Biểu Phí Chuẩn & Gói Khóa Học" : "Standard Pricing Tier & Package"}
                    </h3>
                  </div>

                  {/* Chọn Khóa học / Biểu phí */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      {lang === "vi" ? "Chọn Biểu phí chuẩn:" : "Select Pricing Tier:"}
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {pricingTiers.map((tier) => (
                        <div
                          key={tier.id}
                          onClick={() => {
                            setPosTierId(tier.id);
                            if (tier.packages?.length > 0) {
                              setPosPkgId(tier.packages[0].id);
                            }
                          }}
                          className={`p-3 rounded-xl border cursor-pointer transition text-left ${
                            posTierId === tier.id
                              ? "bg-amber-50/70 border-[#c27803] ring-1 ring-[#c27803]"
                              : "bg-slate-50/70 border-slate-200 hover:border-slate-300"
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-slate-900 line-clamp-1">{tier.name}</span>
                            <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-amber-100 text-amber-800">
                              {tier.courseType}
                            </span>
                          </div>
                          <div className="text-xs font-semibold text-[#c27803] mt-1">
                            {tier.originalPrice?.toLocaleString("vi-VN")} ₫
                          </div>
                          <div className="text-[11px] text-slate-500 mt-0.5">
                            {tier.durationSessions} {lang === "vi" ? "buổi học" : "sessions"} • {tier.materialsIncluded ? "Kèm giáo trình" : "Tự túc sách"}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Chọn Gói trong biểu phí (Standard, Early bird, Combo...) */}
                  {selectedTier && selectedTier.packages && selectedTier.packages.length > 0 && (
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                        {lang === "vi" ? "Gói ưu đãi áp dụng:" : "Applied Package:"}
                      </label>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                        {selectedTier.packages.map((pkg) => (
                          <div
                            key={pkg.id}
                            onClick={() => setPosPkgId(pkg.id)}
                            className={`p-2.5 rounded-xl border cursor-pointer transition ${
                              posPkgId === pkg.id
                                ? "bg-amber-100/60 border-[#c27803] ring-1 ring-[#c27803]"
                                : "bg-white border-slate-200 hover:bg-slate-50"
                            }`}
                          >
                            <div className="text-xs font-bold text-slate-900">{pkg.name}</div>
                            <div className="text-xs font-bold text-[#c27803] mt-0.5">
                              {pkg.price?.toLocaleString("vi-VN")} ₫
                            </div>
                            {pkg.discount > 0 && (
                              <div className="text-[10px] text-emerald-600 font-semibold">
                                -{pkg.discount?.toLocaleString("vi-VN")} ₫
                              </div>
                            )}
                            <div className="text-[10px] text-slate-400 line-clamp-1 mt-0.5">{pkg.description}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Bước 3: Cơ chế Referral (Bắt buộc ghi nhận 2 nhóm thông tin) */}
                <div className="bg-white p-5 rounded-2xl border border-amber-900/10 shadow-sm space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-heading font-bold uppercase tracking-wider text-slate-800 flex items-center gap-2">
                      <span className="w-6 h-6 rounded-full bg-[#c27803] text-white flex items-center justify-center text-xs">
                        3
                      </span>
                      {lang === "vi" ? "Cơ Chế Referral (Giới Thiệu Học Viên)" : "Referral Program"}
                    </h3>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={posHasReferral}
                        onChange={(e) => setPosHasReferral(e.target.checked)}
                        className="w-4 h-4 rounded text-[#c27803] focus:ring-[#c27803]"
                      />
                      <span className="text-xs font-bold text-slate-700">
                        {lang === "vi" ? "Có Người Giới Thiệu" : "Has Referral"}
                      </span>
                    </label>
                  </div>

                  {posHasReferral && (
                    <div className="p-4 bg-amber-50/50 rounded-xl border border-amber-200/60 space-y-4 animate-fadeIn">
                      {/* NHÓM 1: PHÂN LOẠI NGƯỜI GIỚI THIỆU */}
                      <div className="p-3 bg-white rounded-lg border border-amber-200/80 space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-amber-900 uppercase tracking-wider">
                            Nhóm 1: Phân loại Người giới thiệu
                          </span>
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <button
                            type="button"
                            onClick={() => setPosReferral({ ...posReferral, referrerType: "student" })}
                            className={`py-2 px-3 rounded-lg text-xs font-bold border transition ${
                              posReferral.referrerType === "student"
                                ? "bg-[#c27803] text-white border-[#c27803] shadow-sm"
                                : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                            }`}
                          >
                            Học viên hiện tại
                          </button>
                          <button
                            type="button"
                            onClick={() => setPosReferral({ ...posReferral, referrerType: "external" })}
                            className={`py-2 px-3 rounded-lg text-xs font-bold border transition ${
                              posReferral.referrerType === "external"
                                ? "bg-[#c27803] text-white border-[#c27803] shadow-sm"
                                : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                            }`}
                          >
                            Người ngoài
                          </button>
                        </div>

                        {posReferral.referrerType === "student" ? (
                          <div>
                            <label className="block text-xs font-semibold text-slate-700 mb-1">
                              Chọn Học Viên Giới Thiệu:
                            </label>
                            <select
                              value={posReferral.referrerStudentId}
                              onChange={(e) =>
                                setPosReferral({ ...posReferral, referrerStudentId: e.target.value })
                              }
                              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-800"
                            >
                              <option value="">-- Chọn học viên giới thiệu --</option>
                              {students.map((s) => (
                                <option key={s.studentId} value={s.studentId}>
                                  [{s.studentId}] {s.fullName || s.name} - Lớp: {s.classId || "Chưa xếp"} - SĐT: {s.phone || "N/A"}
                                </option>
                              ))}
                            </select>
                            <p className="text-[11px] text-amber-700 mt-1">
                              ✓ Hệ thống sẽ tự động liên kết với hồ sơ và cho phép khấu trừ học phí của học viên này.
                            </p>
                          </div>
                        ) : (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                            <div>
                              <label className="block font-semibold text-slate-700 mb-0.5">Họ tên người ngoài (*):</label>
                              <input
                                type="text"
                                required={posHasReferral}
                                placeholder="Nguyễn Văn B"
                                value={posReferral.externalName}
                                onChange={(e) =>
                                  setPosReferral({ ...posReferral, externalName: e.target.value })
                                }
                                className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                              />
                            </div>
                            <div>
                              <label className="block font-semibold text-slate-700 mb-0.5">Số điện thoại (*):</label>
                              <input
                                type="tel"
                                required={posHasReferral}
                                placeholder="0987654321"
                                value={posReferral.externalPhone}
                                onChange={(e) =>
                                  setPosReferral({ ...posReferral, externalPhone: e.target.value })
                                }
                                className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                              />
                            </div>
                            <div>
                              <label className="block font-semibold text-slate-700 mb-0.5">Số CCCD / CMND (*):</label>
                              <input
                                type="text"
                                placeholder="00120100xxxx"
                                value={posReferral.externalIdCard}
                                onChange={(e) =>
                                  setPosReferral({ ...posReferral, externalIdCard: e.target.value })
                                }
                                className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                              />
                            </div>
                            <div>
                              <label className="block font-semibold text-slate-700 mb-0.5">STK & Ngân hàng nhận hoa hồng (*):</label>
                              <input
                                type="text"
                                placeholder="MB 0987654321 NGUYEN VAN B"
                                value={posReferral.externalBank}
                                onChange={(e) =>
                                  setPosReferral({ ...posReferral, externalBank: e.target.value })
                                }
                                className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                              />
                            </div>
                          </div>
                        )}
                      </div>

                      {/* NHÓM 2: HÌNH THỨC NHẬN COMMISSION */}
                      <div className="p-3 bg-white rounded-lg border border-amber-200/80 space-y-3">
                        <span className="text-xs font-bold text-amber-900 uppercase tracking-wider block">
                          Nhóm 2: Hình thức nhận Commission (Hoa hồng)
                        </span>

                        <div className="grid grid-cols-2 gap-2">
                          <button
                            type="button"
                            onClick={() => setPosReferral({ ...posReferral, rewardType: "cash" })}
                            className={`py-2 px-3 rounded-lg text-xs font-bold border transition ${
                              posReferral.rewardType === "cash"
                                ? "bg-emerald-600 text-white border-emerald-600 shadow-sm"
                                : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                            }`}
                          >
                            Tiền mặt / Chuyển khoản (Ghi nhận khoản phải chi)
                          </button>
                          <button
                            type="button"
                            disabled={posReferral.referrerType === "external"}
                            onClick={() => setPosReferral({ ...posReferral, rewardType: "tuition_deduction" })}
                            className={`py-2 px-3 rounded-lg text-xs font-bold border transition ${
                              posReferral.rewardType === "tuition_deduction"
                                ? "bg-[#c27803] text-white border-[#c27803] shadow-sm"
                                : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100 disabled:opacity-40"
                            }`}
                          >
                            🎓 Trừ trực tiếp vào học phí người giới thiệu
                          </button>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                          <div>
                            <label className="block font-semibold text-slate-700 mb-1">
                              Hoa hồng người giới thiệu (₫):
                            </label>
                            <input
                              type="number"
                              step="50000"
                              value={posReferral.referrerReward}
                              onChange={(e) =>
                                setPosReferral({ ...posReferral, referrerReward: Number(e.target.value) })
                              }
                              className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-emerald-600"
                            />
                          </div>
                          <div>
                            <label className="block font-semibold text-slate-700 mb-1">
                              Giảm giá trực tiếp cho học viên mới (₫):
                            </label>
                            <input
                              type="number"
                              step="50000"
                              value={posReferral.newStudentDiscount}
                              onChange={(e) =>
                                setPosReferral({ ...posReferral, newStudentDiscount: Number(e.target.value) })
                              }
                              className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-[#c27803]"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Bước 4: Phương thức thanh toán & Ghi chú */}
                <div className="bg-white p-5 rounded-2xl border border-amber-900/10 shadow-sm space-y-4">
                  <h3 className="text-sm font-heading font-bold uppercase tracking-wider text-slate-800 flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-[#c27803] text-white flex items-center justify-center text-xs">
                      4
                    </span>
                    {lang === "vi" ? "Phương Thức & Hoàn Tất POS" : "Payment Method & Complete"}
                  </h3>

                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => setPosPaymentMethod("bank_transfer")}
                      className={`py-2.5 px-3 rounded-xl border text-xs font-bold flex flex-col items-center gap-1 transition ${
                        posPaymentMethod === "bank_transfer"
                          ? "bg-amber-50 border-[#c27803] text-[#c27803] ring-1 ring-[#c27803]"
                          : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                      }`}
                    >
                      <span className="text-base">📱</span>
                      <span>Chuyển khoản VietQR</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setPosPaymentMethod("cash")}
                      className={`py-2.5 px-3 rounded-xl border text-xs font-bold flex flex-col items-center gap-1 transition ${
                        posPaymentMethod === "cash"
                          ? "bg-amber-50 border-[#c27803] text-[#c27803] ring-1 ring-[#c27803]"
                          : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                      }`}
                    >
                      <span className="text-base">💵</span>
                      <span>Tiền mặt tại quầy</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setPosPaymentMethod("pos_card")}
                      className={`py-2.5 px-3 rounded-xl border text-xs font-bold flex flex-col items-center gap-1 transition ${
                        posPaymentMethod === "pos_card"
                          ? "bg-amber-50 border-[#c27803] text-[#c27803] ring-1 ring-[#c27803]"
                          : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                      }`}
                    >
                      <svg className="w-4 h-4 shrink-0 text-blue-700" fill="none" viewBox="0 0 24 24" stroke="currentColor"><rect x="2" y="5" width="20" height="14" rx="2" strokeWidth="2"/><line x1="2" y1="10" x2="22" y2="10" strokeWidth="2"/></svg>
                      <span>Quẹt thẻ POS</span>
                    </button>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Ghi chú phiếu thu:</label>
                    <input
                      type="text"
                      placeholder="VD: Học viên đóng đủ 1 lần tại quầy, tặng kèm balo..."
                      value={posNote}
                      onChange={(e) => setPosNote(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={posSubmitting}
                    className="w-full py-3.5 bg-gradient-to-r from-[#c27803] to-[#92400e] text-white font-heading font-bold text-sm uppercase tracking-wider rounded-xl shadow-lg hover:shadow-xl hover:from-[#d97706] hover:to-[#78350f] active:scale-[0.99] transition disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {posSubmitting ? (
                      <>
                        <span className="animate-spin text-base">⏳</span>
                        <span>Đang xử lý thanh toán & in phiếu...</span>
                      </>
                    ) : (
                      <>
                        <span>🧾</span>
                        <span>
                          {lang === "vi"
                            ? `Xác Nhận Thu ${posCalculations.finalAmount.toLocaleString("vi-VN")} ₫ & Tạo Phiếu POS`
                            : `Confirm Payment ${posCalculations.finalAmount.toLocaleString()} VND`}
                        </span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>

            {/* Cột phải: Bảng kê tính tiền tự động + VietQR động + Phiếu thu kết quả (5 cols) */}
            <div className="lg:col-span-5 space-y-6">
              {/* Card Bảng kê tính tiền tự động */}
              <div className="bg-white p-5 rounded-2xl border border-amber-900/10 shadow-sm space-y-4 sticky top-6">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <span className="text-xs font-heading font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                    <span>🧾</span>
                    {lang === "vi" ? "Bảng Kê Học Phí POS" : "POS Billing Summary"}
                  </span>
                  <span className="text-[10px] bg-emerald-50 text-emerald-700 font-bold px-2 py-0.5 rounded-full border border-emerald-200">
                    Live Calculator
                  </span>
                </div>

                <div className="space-y-2.5 text-xs">
                  <div className="flex justify-between text-slate-600">
                    <span>Khóa học đã chọn:</span>
                    <span className="font-semibold text-slate-900 text-right">
                      {selectedTier?.name || "Chưa chọn"}
                    </span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>Gói áp dụng:</span>
                    <span className="font-semibold text-slate-900 text-right">
                      {selectedPackage?.name || "Tiêu chuẩn"}
                    </span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>Học phí gốc niêm yết:</span>
                    <span className="font-semibold text-slate-800">
                      {posCalculations.originalPrice.toLocaleString("vi-VN")} ₫
                    </span>
                  </div>

                  {posCalculations.tierDiscount > 0 && (
                    <div className="flex justify-between text-emerald-600">
                      <span>Ưu đãi gói (Early Bird / Combo):</span>
                      <span className="font-bold">
                        -{posCalculations.tierDiscount.toLocaleString("vi-VN")} ₫
                      </span>
                    </div>
                  )}

                  {posHasReferral && posCalculations.referralDiscount > 0 && (
                    <div className="flex justify-between text-[#c27803]">
                      <span>Ưu đãi Giới thiệu (Referral):</span>
                      <span className="font-bold">
                        -{posCalculations.referralDiscount.toLocaleString("vi-VN")} ₫
                      </span>
                    </div>
                  )}

                  <div className="pt-3 border-t border-slate-200 flex justify-between items-baseline">
                    <span className="text-sm font-heading font-bold text-slate-900 uppercase">
                      Tổng thực thu:
                    </span>
                    <div className="text-right">
                      <div className="text-2xl font-bold font-heading text-[#c27803]">
                        {posCalculations.finalAmount.toLocaleString("vi-VN")} ₫
                      </div>
                      <span className="text-[10px] text-slate-400">
                        (Đã bao gồm VAT & tài liệu học tập)
                      </span>
                    </div>
                  </div>
                </div>

                {/* VietQR Dynamic Code Preview */}
                {posPaymentMethod === "bank_transfer" && (
                  <div className="pt-3 border-t border-dashed border-slate-200 text-center space-y-2">
                    <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block">
                      Mã VietQR Động Cho Khách Quét Ngay:
                    </span>
                    <div className="p-2 bg-slate-50 border border-slate-200 rounded-xl inline-block shadow-inner">
                      <img
                        src={posQrUrl}
                        alt="POS VietQR Dynamic"
                        className="w-48 h-48 object-contain mx-auto rounded-lg"
                      />
                    </div>
                    <div className="text-[11px] text-slate-500 bg-amber-50 p-2 rounded-lg border border-amber-200/50">
                      <strong>Nội dung CK:</strong>{" "}
                      <span className="font-mono text-[#c27803] font-bold">
                        HP {posMode === "existing" ? posStudentId || "HV" : posNewStudent.studentId} POS
                      </span>
                    </div>
                  </div>
                )}

                {/* Kết quả sau khi POS thành công */}
                {posCompletedReceipt && (
                  <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-200 space-y-2 animate-fadeIn text-xs">
                    <div className="flex items-center gap-1.5 font-bold text-emerald-800">
                      <span>✅</span>
                      <span>ĐÃ LẬP PHIẾU THU THÀNH CÔNG #{posCompletedReceipt.receiptId?.slice(-6)}</span>
                    </div>
                    <div className="text-emerald-700 space-y-0.5">
                      <p>• Học viên: <strong>{posCompletedReceipt.studentName}</strong></p>
                      <p>• Số tiền: <strong>{posCompletedReceipt.finalAmount?.toLocaleString("vi-VN")} ₫</strong></p>
                      <p>• Đã ghi tự động vào <strong>Sổ quỹ Ledger</strong> và <strong>Công nợ Học phí</strong>.</p>
                      {posCompletedReceipt.referral && (
                        <p>
                          • Đã ghi nhận hoa hồng Referral:{" "}
                          <strong>{posCompletedReceipt.referral.referrerReward?.toLocaleString("vi-VN")} ₫</strong> (
                          {posCompletedReceipt.referral.rewardType === "tuition_deduction"
                            ? "Trừ nợ học phí"
                            : "Tiền mặt/CK"}
                          )
                        </p>
                      )}
                    </div>
                    <button
                      onClick={() => window.print()}
                      className="w-full mt-2 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-[11px] transition"
                    >
                      In Hóa Đơn / Phiếu Thu POS
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. BIỂU PHÍ CHUẨN (TUITION PRICING TIERS) */}
      {/* ========================================================================= */}
      {activeSubTab === "pricing" && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-amber-900/10 shadow-sm">
            <div>
              <h2 className="text-lg font-bold font-heading text-slate-900">
                {lang === "vi" ? "Danh Mục Biểu Phí Chuẩn Các Khóa Học" : "Standard Tuition Pricing Tiers"}
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                {lang === "vi"
                  ? "Cấu hình học phí niêm yết, các gói ưu đãi đóng sớm, combo và chính sách giáo trình để hiển thị minh bạch khi tư vấn hoặc tạo phiếu thu."
                  : "Manage base tuition pricing, early bird discounts, and course packages."}
              </p>
            </div>

            <button
              onClick={() => {
                const defaultNew = normalizeTier({
                  id: `tier_${Date.now()}`,
                  name: "",
                  courseType: "TOEIC",
                  originalPrice: 4500000,
                  earlyBirdRate: 10,
                  comboRate: 15,
                  durationSessions: 24,
                  materialsIncluded: true,
                  isPopular: false,
                  status: "active",
                });
                setEditingTier(null);
                setTierForm(defaultNew);
                setShowTierModal(true);
              }}
              className="py-2.5 px-4 bg-[#c27803] hover:bg-[#92400e] text-white rounded-xl text-xs font-heading font-bold uppercase tracking-wider transition shadow-sm flex items-center gap-2 shrink-0"
            >
              <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4"/>
              </svg>
              <span>{lang === "vi" ? "Thêm Biểu Phí Mới" : "New Pricing Tier"}</span>
            </button>
          </div>

          {/* Cards Biểu phí */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {pricingTiers.map((tier) => (
              <div
                key={tier.id}
                className="bg-white rounded-2xl border border-amber-900/10 shadow-sm p-5 flex flex-col justify-between hover:shadow-md transition"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-[#c27803] border border-amber-200">
                      {tier.courseType}
                    </span>
                    {tier.isPopular && (
                      <span className="text-[10px] bg-rose-500 text-white font-bold px-2 py-0.5 rounded-full">
                        Phổ Biến Nhất
                      </span>
                    )}
                  </div>

                  <h3 className="text-base font-bold text-slate-900 mt-2">{tier.name}</h3>

                  <div className="mt-3 p-3 bg-amber-50/50 rounded-xl border border-amber-100">
                    <div className="text-[11px] text-slate-500 uppercase font-semibold">Học phí chuẩn:</div>
                    <div className="text-xl font-bold text-[#c27803]">
                      {tier.originalPrice?.toLocaleString("vi-VN")} ₫
                    </div>
                    <div className="text-xs text-slate-600 mt-1.5 flex items-center gap-3">
                      <span className="flex items-center gap-1">
                        <svg className="w-3.5 h-3.5 text-slate-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <circle cx="12" cy="12" r="10" strokeWidth="2"/>
                          <polyline points="12 6 12 12 16 14" strokeWidth="2"/>
                        </svg>
                        {tier.durationSessions} {lang === "vi" ? "buổi học" : "sessions"}
                      </span>
                      <span className="flex items-center gap-1">
                        <svg className="w-3.5 h-3.5 text-slate-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"/>
                        </svg>
                        {tier.materialsIncluded
                          ? lang === "vi"
                            ? "Đã gồm tài liệu"
                            : "Materials incl."
                          : lang === "vi"
                          ? "Chưa gồm sách"
                          : "Books excl."}
                      </span>
                    </div>
                  </div>

                  {/* Danh sách gói ưu đãi */}
                  <div className="mt-4 space-y-2">
                    <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                      Các gói áp dụng:
                    </span>
                    {tier.packages?.map((pkg) => {
                      const isCombo = pkg.id === "combo" || pkg.id?.includes("combo") || pkg.id === "group";
                      const isEarlyBird = pkg.id === "early_bird" || pkg.id?.includes("early");

                      return (
                        <div
                          key={pkg.id}
                          className={`p-2.5 rounded-xl border flex items-center justify-between text-xs transition ${
                            isCombo
                              ? "bg-purple-50/40 border-purple-200/80"
                              : isEarlyBird
                              ? "bg-amber-50/40 border-amber-200/80"
                              : "bg-slate-50 border-slate-100"
                          }`}
                        >
                          <div className="pr-2">
                            <div className="font-bold text-slate-800 flex items-center gap-1.5 flex-wrap">
                              <span>{pkg.name}</span>
                              {isCombo && (
                                <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.2 rounded bg-purple-100 text-purple-700">
                                  Combo
                                </span>
                              )}
                            </div>
                            <div className="text-[10px] text-slate-400 mt-0.5">{pkg.description}</div>
                          </div>
                          <div className="text-right shrink-0">
                            <div
                              className={`font-bold ${
                                isCombo
                                  ? "text-purple-900"
                                  : isEarlyBird
                                  ? "text-amber-900"
                                  : "text-slate-900"
                              }`}
                            >
                              {pkg.price?.toLocaleString("vi-VN")} ₫
                            </div>
                            {pkg.discount > 0 ? (
                              <div className="text-[10px] text-emerald-600 font-semibold">
                                Tiết kiệm {pkg.discount?.toLocaleString("vi-VN")} ₫
                              </div>
                            ) : (
                              <div className="text-[10px] text-slate-400 font-medium">Học phí gốc</div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="pt-4 mt-4 border-t border-slate-100 flex gap-2">
                  <button
                    onClick={() => {
                      const normalized = normalizeTier(tier);
                      setEditingTier(normalized);
                      setTierForm(normalized);
                      setShowTierModal(true);
                    }}
                    className="flex-1 py-2 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition flex items-center justify-center gap-1.5"
                  >
                    <svg className="w-3.5 h-3.5 text-slate-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 4H4a2 2 0 00-2 2v14a2 2 0 00 2 2h14a2 2 0 00 2-2v-7M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
                    </svg>
                    <span>{lang === "vi" ? "Sửa Biểu Phí" : "Edit Tier"}</span>
                  </button>
                  <button
                    onClick={async () => {
                      if (window.confirm(`Xóa biểu phí "${tier.name}"?`)) {
                        await deletePricingTier(tier.id);
                      }
                    }}
                    title={lang === "vi" ? "Xóa biểu phí" : "Delete tier"}
                    className="py-2 px-3 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-xl text-xs font-semibold transition flex items-center justify-center"
                  >
                    <svg className="w-3.5 h-3.5 text-rose-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                    </svg>
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Modal Thêm/Sửa Biểu Phí */}
          {showTierModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
              <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-slate-100 max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between mb-4 border-b pb-3">
                  <div className="flex items-center gap-2.5">
                    <span className="p-2 rounded-xl bg-amber-50 text-[#c27803]">
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 7h.01M7 3h5a1.99 1.99 0 011.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V5a2 2 0 012-2z"/>
                      </svg>
                    </span>
                    <div>
                      <h3 className="text-base font-bold font-heading text-slate-900">
                        {editingTier ? "Chỉnh Sửa Biểu Phí Chuẩn" : "Thêm Biểu Phí Chuẩn Mới"}
                      </h3>
                      <p className="text-[11px] text-slate-500">
                        Học phí chuẩn và các gói ưu đãi (đóng sớm, combo) sẽ tự động khớp và đồng bộ 100%.
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowTierModal(false)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
                  >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"/>
                    </svg>
                  </button>
                </div>

                <form
                  onSubmit={async (e) => {
                    e.preventDefault();
                    await savePricingTier(tierForm);
                    setShowTierModal(false);
                  }}
                  className="space-y-4 text-xs"
                >
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Tên Khóa Học / Biểu Phí (*):</label>
                    <input
                      type="text"
                      required
                      value={tierForm.name}
                      onChange={(e) => handleTierFieldChange("name", e.target.value)}
                      placeholder="VD: TOEIC Target 650+ Bứt Phá"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:border-[#c27803] focus:ring-1 focus:ring-[#c27803] outline-none"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Phân Loại Khóa Học:</label>
                      <select
                        value={tierForm.courseType}
                        onChange={(e) => handleTierFieldChange("courseType", e.target.value)}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:bg-white focus:border-[#c27803] outline-none"
                      >
                        <option value="TOEIC">TOEIC</option>
                        <option value="IELTS">IELTS</option>
                        <option value="APTIS">APTIS</option>
                        <option value="GIAOTIEP">Giao Tiếp</option>
                        <option value="OTHER">Khác</option>
                      </select>
                    </div>

                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">
                        Học Phí Gốc Chuẩn (₫) (*):
                      </label>
                      <input
                        type="number"
                        step="10000"
                        min="0"
                        required
                        value={tierForm.originalPrice}
                        onChange={(e) =>
                          handleTierFieldChange("originalPrice", Math.max(0, Number(e.target.value)))
                        }
                        className="w-full px-3 py-2 bg-amber-50/50 border border-amber-200 rounded-xl text-xs font-bold text-[#c27803] focus:bg-white focus:border-[#c27803] outline-none"
                      />
                    </div>
                  </div>

                  {/* CẤU HÌNH TỈ LỆ ƯU ĐÃI (ADMIN CÓ THỂ CHỈNH SỬA) */}
                  <div className="p-3.5 bg-gradient-to-br from-amber-50/60 to-slate-50 rounded-xl border border-amber-200/70 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                        <svg className="w-4 h-4 text-[#c27803]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                        </svg>
                        Tỉ Lệ Ưu Đãi (Tự Động Tính & Đồng Bộ)
                      </span>
                      <span className="text-[10px] text-slate-500 font-medium">
                        Admin có thể chỉnh sửa %
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="bg-white p-2.5 rounded-lg border border-slate-200 shadow-2xs">
                        <div className="flex items-center justify-between mb-1">
                          <label className="font-semibold text-slate-700 text-[11px]">
                            Ưu đãi Đóng Sớm (Early Bird):
                          </label>
                          <span className="text-[11px] font-bold text-amber-700">
                            {tierForm.earlyBirdRate ?? 10}%
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            min="0"
                            max="90"
                            step="1"
                            value={tierForm.earlyBirdRate ?? 10}
                            onChange={(e) =>
                              handleTierFieldChange(
                                "earlyBirdRate",
                                Math.max(0, Math.min(90, Number(e.target.value)))
                              )
                            }
                            className="w-20 px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-center"
                          />
                          <span className="text-xs text-slate-500">%</span>
                          <div className="text-[10px] text-slate-500 flex-1 text-right">
                            Giảm: -
                            {(
                              Math.round(
                                ((Number(tierForm.originalPrice || 0) * (tierForm.earlyBirdRate ?? 10)) / 100) / 1000
                              ) * 1000
                            ).toLocaleString("vi-VN")}{" "}
                            ₫
                          </div>
                        </div>
                      </div>

                      <div className="bg-white p-2.5 rounded-lg border border-purple-200 shadow-2xs">
                        <div className="flex items-center justify-between mb-1">
                          <label className="font-semibold text-purple-950 text-[11px]">
                            Ưu đãi Đóng Theo Combo:
                          </label>
                          <span className="text-[11px] font-bold text-purple-700">
                            {tierForm.comboRate ?? 15}%
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            min="0"
                            max="90"
                            step="1"
                            value={tierForm.comboRate ?? 15}
                            onChange={(e) =>
                              handleTierFieldChange(
                                "comboRate",
                                Math.max(0, Math.min(90, Number(e.target.value)))
                              )
                            }
                            className="w-20 px-2 py-1.5 bg-purple-50/50 border border-purple-200 rounded-lg text-xs font-bold text-purple-800 text-center"
                          />
                          <span className="text-xs text-purple-700 font-semibold">%</span>
                          <div className="text-[10px] text-purple-600 flex-1 text-right">
                            Giảm: -
                            {(
                              Math.round(
                                ((Number(tierForm.originalPrice || 0) * (tierForm.comboRate ?? 15)) / 100) / 1000
                              ) * 1000
                            ).toLocaleString("vi-VN")}{" "}
                            ₫
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* LIVE PREVIEW CÁC GÓI SẼ LƯU */}
                    <div className="pt-2 border-t border-amber-200/60">
                      <div className="text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-2 flex items-center justify-between">
                        <span>Bản xem trước các gói học phí áp dụng:</span>
                        <span className="text-emerald-600 font-bold normal-case text-[10px]">
                          ✓ Khớp hoàn toàn
                        </span>
                      </div>
                      <div className="space-y-1.5">
                        {tierForm.packages?.map((pkg) => (
                          <div
                            key={pkg.id}
                            className="p-2 rounded-lg bg-white border border-slate-200 flex items-center justify-between"
                          >
                            <div>
                              <div className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                                {pkg.name}
                                {pkg.id === "combo" && (
                                  <span className="text-[9px] px-1.5 py-0.2 rounded font-bold uppercase bg-purple-100 text-purple-800">
                                    Combo
                                  </span>
                                )}
                              </div>
                              <div className="text-[10px] text-slate-400">{pkg.description}</div>
                            </div>
                            <div className="text-right">
                              <div className="font-bold text-slate-900 text-xs">
                                {pkg.price?.toLocaleString("vi-VN")} ₫
                              </div>
                              {pkg.discount > 0 ? (
                                <div className="text-[10px] text-emerald-600 font-semibold">
                                  Tiết kiệm {pkg.discount?.toLocaleString("vi-VN")} ₫
                                </div>
                              ) : (
                                <div className="text-[10px] text-slate-400 font-medium">Học phí gốc</div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Tổng Số Buổi Học:</label>
                      <input
                        type="number"
                        min="1"
                        value={tierForm.durationSessions}
                        onChange={(e) =>
                          handleTierFieldChange("durationSessions", Number(e.target.value))
                        }
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:bg-white outline-none"
                      />
                    </div>

                    <div className="flex flex-col justify-center space-y-2 pt-2">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={tierForm.materialsIncluded}
                          onChange={(e) =>
                            handleTierFieldChange("materialsIncluded", e.target.checked)
                          }
                          className="w-4 h-4 rounded text-[#c27803] focus:ring-[#c27803]"
                        />
                        <span className="font-semibold text-slate-700">Đã bao gồm giáo trình trọn bộ</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={tierForm.isPopular || false}
                          onChange={(e) => handleTierFieldChange("isPopular", e.target.checked)}
                          className="w-4 h-4 rounded text-rose-500 focus:ring-rose-500"
                        />
                        <span className="font-semibold text-slate-700">Gắn huy hiệu Phổ biến nhất (Best seller)</span>
                      </label>
                    </div>
                  </div>

                  <div className="flex gap-2 pt-3 border-t">
                    <button
                      type="button"
                      onClick={() => setShowTierModal(false)}
                      className="flex-1 py-2.5 px-3 border border-slate-200 text-slate-600 rounded-xl font-bold uppercase hover:bg-slate-50 transition"
                    >
                      Hủy
                    </button>
                    <button
                      type="submit"
                      className="flex-1 py-2.5 px-3 bg-[#c27803] text-white rounded-xl font-bold uppercase hover:bg-[#92400e] shadow-sm transition"
                    >
                      Lưu Biểu Phí
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. CƠ CHẾ REFERRAL (GIỚI THIỆU HỌC VIÊN - BẮT BUỘC 2 NHÓM THÔNG TIN) */}
      {/* ========================================================================= */}
      {activeSubTab === "referrals" && (
        <div className="space-y-6">
          {/* Header & KPI Thống kê Referral */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-amber-900/10 shadow-sm">
              <span className="text-xs font-heading font-bold text-slate-500 uppercase tracking-wider block">
                Tổng Lượt Giới Thiệu
              </span>
              <div className="text-2xl font-bold text-slate-900 mt-1">{referrals.length}</div>
              <p className="text-[11px] text-slate-400 mt-1">Được ghi nhận từ POS và hệ thống</p>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-amber-900/10 shadow-sm">
              <span className="text-xs font-heading font-bold text-rose-600 uppercase tracking-wider block">
                Hoa Hồng Chờ Quyết Toán
              </span>
              <div className="text-2xl font-bold text-rose-600 mt-1">
                {pendingReferralCommissions.toLocaleString("vi-VN")} ₫
              </div>
              <p className="text-[11px] text-slate-400 mt-1">Bao gồm nợ tiền mặt & khấu trừ học phí</p>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-amber-900/10 shadow-sm">
              <span className="text-xs font-heading font-bold text-emerald-600 uppercase tracking-wider block">
                Hoa Hồng Đã Quyết Toán
              </span>
              <div className="text-2xl font-bold text-emerald-600 mt-1">
                {referrals
                  .filter((r) => r.status === "settled")
                  .reduce((sum, r) => sum + (r.referrerReward || 0), 0)
                  .toLocaleString("vi-VN")}{" "}
                ₫
              </div>
              <p className="text-[11px] text-slate-400 mt-1">Đã khấu trừ hoặc chi tiền mặt</p>
            </div>
          </div>

          {/* Bộ lọc & Danh sách Referral */}
          <div className="bg-white rounded-2xl border border-amber-900/10 shadow-sm overflow-hidden">
            <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-sm font-bold font-heading text-slate-900 uppercase tracking-wider">
                  {lang === "vi" ? "Danh Sách Lượt Giới Thiệu (Referral)" : "Referral Ledger"}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Ghi nhận đầy đủ: <strong>Nhóm 1</strong> (Phân loại Người giới thiệu: Học viên vs Người ngoài) và{" "}
                  <strong>Nhóm 2</strong> (Hình thức nhận Commission: Tiền mặt vs Khấu trừ học phí).
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <select
                  value={referralFilterStatus}
                  onChange={(e) => setReferralFilterStatus(e.target.value)}
                  className="py-1.5 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700"
                >
                  <option value="all">Tất cả trạng thái</option>
                  <option value="pending">Chờ quyết toán</option>
                  <option value="settled">Đã quyết toán</option>
                </select>

                <select
                  value={referralFilterType}
                  onChange={(e) => setReferralFilterType(e.target.value)}
                  className="py-1.5 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700"
                >
                  <option value="all">Tất cả đối tượng</option>
                  <option value="student">Học viên hiện tại</option>
                  <option value="external">Người ngoài</option>
                </select>

                <button
                  onClick={() => setShowRefModal(true)}
                  className="py-1.5 px-3 bg-[#c27803] hover:bg-[#92400e] text-white rounded-xl text-xs font-heading font-bold uppercase tracking-wider transition shadow-sm"
                >
                  + Thêm Referral
                </button>
              </div>
            </div>

            {/* Bảng Referral */}
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-amber-50/50 border-b border-amber-900/10 text-slate-700 font-heading font-bold uppercase tracking-wider">
                    <th className="py-3 px-4">Mã Ref / Ngày</th>
                    <th className="py-3 px-4">Nhóm 1: Người Giới Thiệu (Định danh)</th>
                    <th className="py-3 px-4">Học Viên Được Giới Thiệu</th>
                    <th className="py-3 px-4">Nhóm 2: Hình Thức Commission</th>
                    <th className="py-3 px-4 text-right">Hoa Hồng</th>
                    <th className="py-3 px-4 text-center">Trạng Thái</th>
                    <th className="py-3 px-4 text-center">Hành Động</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredReferrals.length === 0 ? (
                    <tr>
                      <td colSpan="7" className="py-8 text-center text-slate-400">
                        Chưa có dữ liệu referral phù hợp
                      </td>
                    </tr>
                  ) : (
                    filteredReferrals.map((r) => {
                      const isStudent = r.referrerType === "student";
                      const isTuitionDeduction = r.rewardType === "tuition_deduction";

                      return (
                        <tr key={r.id} className="hover:bg-slate-50 transition">
                          <td className="py-3.5 px-4">
                            <span className="font-mono font-bold text-slate-900 block">
                              #{r.id?.slice(-6)}
                            </span>
                            <span className="text-[10px] text-slate-400">{r.createdAt?.slice(0, 10)}</span>
                          </td>

                          {/* NHÓM 1: PHÂN LOẠI NGƯỜI GIỚI THIỆU */}
                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-1.5 mb-1">
                              {isStudent ? (
                                <span className="text-[10px] bg-amber-100 text-[#c27803] font-bold px-1.5 py-0.5 rounded border border-amber-200">
                                  Học viên hiện tại
                                </span>
                              ) : (
                                <span className="text-[10px] bg-purple-100 text-purple-700 font-bold px-1.5 py-0.5 rounded border border-purple-200">
                                  Người ngoài
                                </span>
                              )}
                            </div>
                            <div className="font-bold text-slate-900">
                              {r.referrerInfo?.name || "N/A"}{" "}
                              {isStudent && (
                                <span className="text-slate-500 font-mono text-[11px]">
                                  ({r.referrerInfo?.studentId})
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-slate-500">
                              SĐT: {r.referrerInfo?.phone || "N/A"}
                            </div>
                            {!isStudent && (
                              <div className="text-[10px] text-slate-400 mt-0.5">
                                CCCD: {r.referrerInfo?.idCard || "N/A"} • STK:{" "}
                                {r.referrerInfo?.bankAccount || "N/A"}
                              </div>
                            )}
                          </td>

                          {/* Học viên mới */}
                          <td className="py-3.5 px-4">
                            <div className="font-bold text-slate-900">
                              {r.studentName || "Học viên mới"}
                            </div>
                            <div className="text-[11px] text-slate-500">
                              {r.studentId && <span className="font-mono">[{r.studentId}] </span>}
                              {r.studentPhone}
                            </div>
                            {r.className && (
                              <div className="text-[10px] text-[#c27803] font-semibold mt-0.5">
                                {r.className}
                              </div>
                            )}
                          </td>

                          {/* NHÓM 2: HÌNH THỨC COMMISSION */}
                          <td className="py-3.5 px-4">
                            {isTuitionDeduction ? (
                              <div>
                                <span className="text-[10px] bg-blue-100 text-blue-700 font-bold px-1.5 py-0.5 rounded border border-blue-200 inline-block mb-0.5">
                                  Trừ vào học phí
                                </span>
                                <div className="text-[11px] text-slate-500">
                                  Khấu trừ công nợ của HV giới thiệu
                                </div>
                              </div>
                            ) : (
                              <div>
                                <span className="text-[10px] bg-emerald-100 text-emerald-700 font-bold px-1.5 py-0.5 rounded border border-emerald-200 inline-block mb-0.5">
                                  Tiền mặt / Chuyển khoản
                                </span>
                                <div className="text-[11px] text-slate-500">
                                  Khoản phải chi từ Sổ quỹ
                                </div>
                              </div>
                            )}
                          </td>

                          {/* Số tiền hoa hồng */}
                          <td className="py-3.5 px-4 text-right">
                            <div className="font-bold text-emerald-600 text-sm">
                              +{r.referrerReward?.toLocaleString("vi-VN")} ₫
                            </div>
                            {r.newStudentDiscount > 0 && (
                              <div className="text-[10px] text-[#c27803]">
                                (Giảm HV mới {r.newStudentDiscount?.toLocaleString("vi-VN")} ₫)
                              </div>
                            )}
                          </td>

                          {/* Trạng thái */}
                          <td className="py-3.5 px-4 text-center">
                            {r.status === "settled" ? (
                              <span className="text-[10px] bg-emerald-50 text-emerald-700 font-bold px-2 py-0.5 rounded-full border border-emerald-200">
                                Đã quyết toán
                              </span>
                            ) : (
                              <span className="text-[10px] bg-amber-50 text-amber-700 font-bold px-2 py-0.5 rounded-full border border-amber-200">
                                Chờ chi trả
                              </span>
                            )}
                          </td>

                          {/* Action Button */}
                          <td className="py-3.5 px-4 text-center">
                            {r.status === "pending" ? (
                              <button
                                onClick={() => handleSettleReferral(r)}
                                className="py-1 px-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[11px] font-bold transition shadow-sm"
                              >
                                {isTuitionDeduction ? "Khấu trừ nợ" : "Duyệt chi"}
                              </button>
                            ) : (
                              <span className="text-[11px] text-slate-400">Hoàn tất</span>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Modal Thêm Referral Thủ Công */}
          {showRefModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
              <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between mb-4 border-b pb-3">
                  <h3 className="text-base font-bold font-heading text-slate-900">
                    Ghi Nhận Lượt Referral Mới
                  </h3>
                  <button onClick={() => setShowRefModal(false)} className="text-slate-400 hover:text-slate-600">
                    ✕
                  </button>
                </div>

                <form
                  onSubmit={async (e) => {
                    e.preventDefault();
                    let referrerInfo = {};
                    if (refFormData.referrerType === "student") {
                      const stu = students.find((s) => s.studentId === refFormData.referrerStudentId);
                      referrerInfo = {
                        studentId: stu?.studentId || refFormData.referrerStudentId,
                        name: stu?.fullName || stu?.name || "Học viên",
                        phone: stu?.phone || "",
                        className: stu?.classId || "",
                      };
                    } else {
                      referrerInfo = {
                        name: refFormData.externalName,
                        phone: refFormData.externalPhone,
                        idCard: refFormData.externalIdCard,
                        bankAccount: refFormData.externalBank,
                      };
                    }

                    await createReferral({
                      referrerType: refFormData.referrerType,
                      referrerInfo,
                      rewardType: refFormData.rewardType,
                      referrerReward: Number(refFormData.referrerReward || 300000),
                      studentName: refFormData.studentName,
                      studentPhone: refFormData.studentPhone,
                      notes: refFormData.notes,
                    });

                    setShowRefModal(false);
                    alert("Đã thêm lượt referral mới!");
                  }}
                  className="space-y-4 text-xs"
                >
                  {/* Nhóm 1 */}
                  <div className="p-3 bg-amber-50 rounded-xl space-y-2">
                    <span className="font-bold text-amber-900 uppercase block">
                      📌 Nhóm 1: Định danh người giới thiệu
                    </span>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setRefFormData({ ...refFormData, referrerType: "student" })}
                        className={`py-1.5 rounded-lg font-bold border ${
                          refFormData.referrerType === "student"
                            ? "bg-[#c27803] text-white border-[#c27803]"
                            : "bg-white text-slate-700 border-slate-200"
                        }`}
                      >
                        Học viên hiện tại
                      </button>
                      <button
                        type="button"
                        onClick={() => setRefFormData({ ...refFormData, referrerType: "external" })}
                        className={`py-1.5 rounded-lg font-bold border ${
                          refFormData.referrerType === "external"
                            ? "bg-[#c27803] text-white border-[#c27803]"
                            : "bg-white text-slate-700 border-slate-200"
                        }`}
                      >
                        Người ngoài
                      </button>
                    </div>

                    {refFormData.referrerType === "student" ? (
                      <select
                        value={refFormData.referrerStudentId}
                        onChange={(e) =>
                          setRefFormData({ ...refFormData, referrerStudentId: e.target.value })
                        }
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-semibold"
                      >
                        <option value="">-- Chọn học viên --</option>
                        {students.map((s) => (
                          <option key={s.studentId} value={s.studentId}>
                            [{s.studentId}] {s.fullName || s.name} - {s.phone}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <div className="grid grid-cols-2 gap-2">
                        <input
                          type="text"
                          required
                          placeholder="Họ tên người ngoài (*)"
                          value={refFormData.externalName}
                          onChange={(e) =>
                            setRefFormData({ ...refFormData, externalName: e.target.value })
                          }
                          className="px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg"
                        />
                        <input
                          type="tel"
                          required
                          placeholder="Số điện thoại (*)"
                          value={refFormData.externalPhone}
                          onChange={(e) =>
                            setRefFormData({ ...refFormData, externalPhone: e.target.value })
                          }
                          className="px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg"
                        />
                        <input
                          type="text"
                          placeholder="CCCD / CMND"
                          value={refFormData.externalIdCard}
                          onChange={(e) =>
                            setRefFormData({ ...refFormData, externalIdCard: e.target.value })
                          }
                          className="px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg"
                        />
                        <input
                          type="text"
                          placeholder="STK & Ngân hàng nhận"
                          value={refFormData.externalBank}
                          onChange={(e) =>
                            setRefFormData({ ...refFormData, externalBank: e.target.value })
                          }
                          className="px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg"
                        />
                      </div>
                    )}
                  </div>

                  {/* Nhóm 2 */}
                  <div className="p-3 bg-slate-50 rounded-xl space-y-2">
                    <span className="font-bold text-slate-800 uppercase block">
                      💰 Nhóm 2: Hình thức Commission
                    </span>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setRefFormData({ ...refFormData, rewardType: "cash" })}
                        className={`py-1.5 rounded-lg font-bold border ${
                          refFormData.rewardType === "cash"
                            ? "bg-emerald-600 text-white border-emerald-600"
                            : "bg-white text-slate-700 border-slate-200"
                        }`}
                      >
                        Tiền mặt / Chuyển khoản
                      </button>
                      <button
                        type="button"
                        disabled={refFormData.referrerType === "external"}
                        onClick={() =>
                          setRefFormData({ ...refFormData, rewardType: "tuition_deduction" })
                        }
                        className={`py-1.5 rounded-lg font-bold border ${
                          refFormData.rewardType === "tuition_deduction"
                            ? "bg-[#c27803] text-white border-[#c27803]"
                            : "bg-white text-slate-700 border-slate-200 disabled:opacity-40"
                        }`}
                      >
                        Trừ trực tiếp vào học phí
                      </button>
                    </div>

                    <div>
                      <label className="block font-semibold text-slate-700 mb-0.5">Số tiền hoa hồng (₫):</label>
                      <input
                        type="number"
                        step="50000"
                        value={refFormData.referrerReward}
                        onChange={(e) =>
                          setRefFormData({ ...refFormData, referrerReward: Number(e.target.value) })
                        }
                        className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg font-bold text-emerald-600"
                      />
                    </div>
                  </div>

                  {/* Thông tin học viên mới */}
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block font-semibold text-slate-700 mb-0.5">Họ tên học viên mới (*):</label>
                      <input
                        type="text"
                        required
                        placeholder="Học viên mới"
                        value={refFormData.studentName}
                        onChange={(e) =>
                          setRefFormData({ ...refFormData, studentName: e.target.value })
                        }
                        className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-700 mb-0.5">SĐT học viên mới (*):</label>
                      <input
                        type="tel"
                        required
                        placeholder="0912..."
                        value={refFormData.studentPhone}
                        onChange={(e) =>
                          setRefFormData({ ...refFormData, studentPhone: e.target.value })
                        }
                        className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg"
                      />
                    </div>
                  </div>

                  <div className="flex gap-2 pt-3 border-t">
                    <button
                      type="button"
                      onClick={() => setShowRefModal(false)}
                      className="flex-1 py-2 px-3 border border-slate-200 text-slate-600 rounded-xl font-bold uppercase"
                    >
                      Hủy
                    </button>
                    <button
                      type="submit"
                      className="flex-1 py-2 px-3 bg-[#c27803] text-white rounded-xl font-bold uppercase hover:bg-[#92400e]"
                    >
                      Lưu Referral
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* 4. THEO DÕI HỌC PHÍ (TUITION TRACKING) */}
      {/* ========================================================================= */}
      {activeSubTab === "tuition" && (
        <div className="space-y-5">
          {/* Tuition KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-heading font-bold text-emerald-600 uppercase tracking-wider">
                  {lang === "vi" ? "Doanh thu thực thu" : "Collected Revenue"}
                </span>
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-bold border border-emerald-200">
                  {lang === "vi" ? "Đã thu" : "Collected"}
                </span>
              </div>
              <div className="text-2xl font-bold text-slate-900 mt-2">
                {totalTuitionRevenue.toLocaleString("vi-VN")} ₫
              </div>
              <p className="text-[11px] text-slate-400 mt-1">
                {lang === "vi"
                  ? "Chỉ tính số tiền học viên đã thực đóng vào doanh thu"
                  : "Counted strictly from verified payments"}
              </p>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-heading font-bold text-rose-600 uppercase tracking-wider">
                  {lang === "vi" ? "Công nợ còn lại (Chưa thu)" : "Pending Debt / Balance"}
                </span>
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 font-bold border border-rose-200">
                  {lang === "vi" ? "Chưa tính doanh thu" : "Excluded from revenue"}
                </span>
              </div>
              <div className="text-2xl font-bold text-rose-600 mt-2">
                {totalTuitionDebt.toLocaleString("vi-VN")} ₫
              </div>
              <p className="text-[11px] text-slate-400 mt-1">
                {lang === "vi"
                  ? "Bao gồm nợ học phí & các đợt trả góp chưa đến hạn"
                  : "Includes tuition debts & pending installment balances"}
              </p>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-heading font-bold text-[#c27803] uppercase tracking-wider">
                  {lang === "vi" ? "Tổng học phí cam kết" : "Total Expected Tuition"}
                </span>
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-amber-50 text-[#c27803] font-bold border border-[#c27803]/20">
                  {lang === "vi" ? "Tổng khóa" : "Total"}
                </span>
              </div>
              <div className="text-2xl font-bold text-slate-900 mt-2">
                {totalTuitionExpected.toLocaleString("vi-VN")} ₫
              </div>
              <p className="text-[11px] text-slate-400 mt-1">
                {lang === "vi"
                  ? "Tổng giá trị khóa học của toàn bộ học viên"
                  : "Total value across all enrolled students"}
              </p>
            </div>
          </div>

          {/* Filter & Table */}
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
            <div className="flex items-center gap-2">
              <label className="text-xs font-semibold text-slate-500 uppercase">
                {lang === "vi" ? "Lọc theo lớp:" : "Class Filter:"}
              </label>
              <select
                value={selectedClassFilter}
                onChange={(e) => setSelectedClassFilter(e.target.value)}
                className="py-1.5 px-3 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-700"
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
              onClick={loadFinanceData}
              className="py-1.5 px-3 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg text-xs font-medium transition"
            >
              ↻ Refresh
            </button>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-heading font-bold uppercase tracking-wider">
                    <th className="py-3 px-4">{lang === "vi" ? "Học viên" : "Student"}</th>
                    <th className="py-3 px-4">{lang === "vi" ? "Lớp học" : "Class"}</th>
                    <th className="py-3 px-4">{lang === "vi" ? "Phương thức" : "Plan"}</th>
                    <th className="py-3 px-4 text-right">{lang === "vi" ? "Học phí gốc" : "Original"}</th>
                    <th className="py-3 px-4 text-right">{lang === "vi" ? "Thực thu cam kết" : "Committed"}</th>
                    <th className="py-3 px-4 text-right text-emerald-600">
                      {lang === "vi" ? "Đã thu (Doanh thu)" : "Collected"}
                    </th>
                    <th className="py-3 px-4 text-right text-rose-600">
                      {lang === "vi" ? "Công nợ còn lại" : "Debt"}
                    </th>
                    <th className="py-3 px-4 text-center">{lang === "vi" ? "Trạng thái" : "Status"}</th>
                    <th className="py-3 px-4 text-center">{lang === "vi" ? "Hành động" : "Actions"}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {tuitions.length === 0 ? (
                    <tr>
                      <td colSpan="9" className="py-8 text-center text-slate-400">
                        {lang === "vi" ? "Không có dữ liệu học phí" : "No tuition data found"}
                      </td>
                    </tr>
                  ) : (
                    tuitions.map((item) => {
                      const isFullyPaid = (item.debtAmount || 0) <= 0;
                      return (
                        <tr key={item.tuitionId} className="hover:bg-slate-50/70 transition">
                          <td className="py-3.5 px-4">
                            <span className="font-bold text-slate-900 block">{item.studentName}</span>
                            <span className="text-[10px] text-slate-400 font-mono">{item.studentId}</span>
                          </td>
                          <td className="py-3.5 px-4 font-medium text-slate-700">{item.className || item.classId}</td>
                          <td className="py-3.5 px-4">
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600">
                              {item.paymentPlan === "installment" ? "Trả góp" : "Đóng 1 lần"}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-right text-slate-500">
                            {(item.totalAmount || 0).toLocaleString("vi-VN")} ₫
                          </td>
                          <td className="py-3.5 px-4 text-right font-bold text-slate-900">
                            {(item.finalAmount || item.totalAmount || 0).toLocaleString("vi-VN")} ₫
                          </td>
                          <td className="py-3.5 px-4 text-right font-bold text-emerald-600">
                            {(item.paidAmount || 0).toLocaleString("vi-VN")} ₫
                          </td>
                          <td className="py-3.5 px-4 text-right font-bold text-rose-600">
                            {(item.debtAmount || 0).toLocaleString("vi-VN")} ₫
                          </td>
                          <td className="py-3.5 px-4 text-center">
                            {isFullyPaid ? (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                {lang === "vi" ? "Hoàn tất" : "Paid"}
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                                {lang === "vi" ? "Còn nợ" : "Debt"}
                              </span>
                            )}
                          </td>
                          <td className="py-3.5 px-4 text-center space-x-1.5 whitespace-nowrap">
                            {!isFullyPaid && (
                              <>
                                <button
                                  onClick={() => openPayment(item)}
                                  className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[11px] font-bold transition"
                                >
                                  {lang === "vi" ? "Thu tiền" : "Collect"}
                                </button>
                                <button
                                  onClick={() => openVietQr(item)}
                                  className="px-2.5 py-1 bg-[#c27803] hover:bg-[#92400e] text-white rounded-lg text-[11px] font-bold transition"
                                >
                                  VietQR
                                </button>
                              </>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 6. SỔ QUỸ THU - CHI (INTERNAL LEDGER) */}
      {/* ========================================================================= */}
      {activeSubTab === "ledger" && (
        <div className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
              <span className="text-xs font-heading font-bold text-emerald-600 uppercase tracking-wider block">
                Tổng Thu (Inflow)
              </span>
              <div className="text-2xl font-bold text-emerald-600 mt-2">
                +{totalIncome.toLocaleString("vi-VN")} ₫
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
              <span className="text-xs font-heading font-bold text-rose-600 uppercase tracking-wider block">
                Tổng Chi (Outflow)
              </span>
              <div className="text-2xl font-bold text-rose-600 mt-2">
                -{totalExpense.toLocaleString("vi-VN")} ₫
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
              <span className="text-xs font-heading font-bold text-slate-800 uppercase tracking-wider block">
                Tồn Quỹ Thực Tế
              </span>
              <div className={`text-2xl font-bold mt-2 ${runningBalance >= 0 ? "text-emerald-700" : "text-rose-700"}`}>
                {runningBalance.toLocaleString("vi-VN")} ₫
              </div>
            </div>
          </div>

          <div className="flex justify-between items-center">
            <h3 className="text-sm font-bold font-heading text-slate-900 uppercase tracking-wider">
              Nhật Ký Thu - Chi Nội Bộ
            </h3>
            <button
              onClick={() => setShowTxModal(true)}
              className="py-1.5 px-3 bg-[#c27803] hover:bg-[#92400e] text-white rounded-xl text-xs font-heading font-bold uppercase tracking-wider transition shadow-sm"
            >
              ➕ Thêm Phiếu Thu/Chi
            </button>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-heading font-bold uppercase tracking-wider">
                    <th className="py-3 px-4">Ngày</th>
                    <th className="py-3 px-4">Loại</th>
                    <th className="py-3 px-4">Hạng Mục</th>
                    <th className="py-3 px-4">Diễn Giải</th>
                    <th className="py-3 px-4 text-right">Số Tiền</th>
                    <th className="py-3 px-4">Người Ghi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {transactions.map((tx) => (
                    <tr key={tx.transactionId || tx.id} className="hover:bg-slate-50 transition">
                      <td className="py-3 px-4 text-slate-500">{tx.date || tx.createdAt?.slice(0, 10)}</td>
                      <td className="py-3 px-4">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            tx.type === "income"
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                              : "bg-rose-50 text-rose-700 border border-rose-200"
                          }`}
                        >
                          {tx.type === "income" ? "Thu" : "Chi"}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-semibold text-slate-700 uppercase text-[10px]">
                        {tx.category}
                      </td>
                      <td className="py-3 px-4 text-slate-800">{tx.description}</td>
                      <td
                        className={`py-3 px-4 text-right font-bold ${
                          tx.type === "income" ? "text-emerald-600" : "text-rose-600"
                        }`}
                      >
                        {tx.type === "income" ? "+" : "-"}
                        {(tx.amount || 0).toLocaleString("vi-VN")} ₫
                      </td>
                      <td className="py-3 px-4 text-slate-500">{tx.createdBy || "Admin"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 7. BÁO CÁO P&L (MONTHLY PROFIT & LOSS) */}
      {/* ========================================================================= */}
      {activeSubTab === "profit_loss" && (
        <div className="space-y-5">
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
            <h3 className="text-sm font-bold font-heading text-slate-900 uppercase tracking-wider mb-4">
              Báo Cáo Doanh Thu & Lợi Nhuận Từng Tháng (P&L)
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-heading font-bold uppercase tracking-wider">
                    <th className="py-3 px-4">Tháng</th>
                    <th className="py-3 px-4 text-right text-emerald-600">Doanh Thu Thuần</th>
                    <th className="py-3 px-4 text-right text-rose-600">Tổng Chi Phí</th>
                    <th className="py-3 px-4 text-right font-bold">Lợi Nhuận Ròng</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {monthlySummaries.map((m) => {
                    const profit = (m.totalRevenue || 0) - (m.totalExpense || 0);
                    return (
                      <tr key={m.month} className="hover:bg-slate-50 transition">
                        <td className="py-3 px-4 font-bold text-slate-900">{m.month}</td>
                        <td className="py-3 px-4 text-right font-semibold text-emerald-600">
                          {(m.totalRevenue || 0).toLocaleString("vi-VN")} ₫
                        </td>
                        <td className="py-3 px-4 text-right font-semibold text-rose-600">
                          {(m.totalExpense || 0).toLocaleString("vi-VN")} ₫
                        </td>
                        <td
                          className={`py-3 px-4 text-right font-bold ${
                            profit >= 0 ? "text-emerald-700" : "text-rose-700"
                          }`}
                        >
                          {profit.toLocaleString("vi-VN")} ₫
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SHARED MODALS: VIETQR, RECORD PAYMENT, NEW LEDGER TX */}
      {/* ========================================================================= */}
      {/* Payment Recording Modal */}
      {showPaymentModal && paymentTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-slate-100">
            <h3 className="text-base font-bold text-slate-900 mb-2">Ghi Nhận Thu Tiền Học Phí</h3>
            <p className="text-xs text-slate-500 mb-4">
              Học viên: <strong>{paymentTarget.studentName}</strong> ({paymentTarget.studentId})
            </p>

            <form onSubmit={handlePaymentSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Số tiền thu (VND):</label>
                <input
                  type="number"
                  required
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-[#c27803]"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Phương thức:</label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                >
                  <option value="bank_transfer">Chuyển khoản VietQR</option>
                  <option value="cash">Tiền mặt</option>
                  <option value="pos_card">Thẻ POS</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Ghi chú:</label>
                <input
                  type="text"
                  placeholder="Ghi chú đợt thanh toán..."
                  value={paymentNote}
                  onChange={(e) => setPaymentNote(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowPaymentModal(false)}
                  className="flex-1 py-2 px-3 border border-slate-200 text-slate-600 rounded-xl font-bold uppercase"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={submittingPayment}
                  className="flex-1 py-2 px-3 bg-[#c27803] text-white rounded-xl font-bold uppercase hover:bg-[#92400e]"
                >
                  {submittingPayment ? "Đang lưu..." : "Xác Nhận"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* VietQR View Modal */}
      {showQrModal && qrData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-slate-100 text-center">
            <h3 className="text-base font-bold text-slate-900 mb-1">Mã Chuyển Khoản VietQR</h3>
            <p className="text-xs text-slate-500 mb-4">{qrData.studentName} ({qrData.studentId})</p>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 mb-4 inline-block">
              <img src={qrData.qrUrl} alt="VietQR" className="w-56 h-56 object-contain mx-auto rounded-lg" />
            </div>

            <div className="text-xs text-slate-600 space-y-1 mb-5 text-left bg-slate-50 p-3 rounded-xl border border-slate-100">
              <div><strong>Số tiền:</strong> <span className="font-bold text-rose-600">{qrData.amount.toLocaleString("vi-VN")} ₫</span></div>
              <div><strong>Tài khoản:</strong> {qrData.accountNo} ({qrData.bank})</div>
              <div><strong>Chủ tài khoản:</strong> {qrData.accountName}</div>
              <div><strong>Nội dung:</strong> {qrData.desc}</div>
            </div>

            <button
              onClick={() => setShowQrModal(false)}
              className="w-full py-2 bg-slate-900 text-white rounded-xl text-xs font-semibold hover:bg-slate-800 transition"
            >
              Đóng
            </button>
          </div>
        </div>
      )}

      {/* Ledger Tx Modal */}
      {showTxModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-slate-100">
            <h3 className="text-base font-bold text-slate-900 mb-4">Ghi Nhận Phiếu Thu/Chi</h3>

            <form onSubmit={handleTxSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 uppercase mb-1">Loại Phiếu</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setTxData({ ...txData, type: "income" })}
                    className={`py-2 rounded-xl font-bold border ${
                      txData.type === "income"
                        ? "bg-emerald-600 text-white border-emerald-600"
                        : "bg-slate-50 text-slate-600 border-slate-200"
                    }`}
                  >
                    Thu (Income)
                  </button>
                  <button
                    type="button"
                    onClick={() => setTxData({ ...txData, type: "expense" })}
                    className={`py-2 rounded-xl font-bold border ${
                      txData.type === "expense"
                        ? "bg-rose-600 text-white border-rose-600"
                        : "bg-slate-50 text-slate-600 border-slate-200"
                    }`}
                  >
                    Chi (Expense)
                  </button>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 uppercase mb-1">Hạng Mục</label>
                <select
                  value={txData.category}
                  onChange={(e) => setTxData({ ...txData, category: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                >
                  <option value="tuition">Học phí</option>
                  <option value="referral_payout">Chi trả hoa hồng Referral</option>
                  <option value="salary">Lương giáo viên / Nhân viên</option>
                  <option value="rent">Tiền thuê mặt bằng</option>
                  <option value="utilities">Điện / Nước / Internet</option>
                  <option value="marketing">Marketing / Quảng cáo</option>
                  <option value="other">Khác</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 uppercase mb-1">Số Tiền (₫)</label>
                <input
                  type="number"
                  required
                  placeholder="0"
                  value={txData.amount}
                  onChange={(e) => setTxData({ ...txData, amount: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 uppercase mb-1">Diễn Giải</label>
                <input
                  type="text"
                  required
                  placeholder="Chi tiết giao dịch..."
                  value={txData.description}
                  onChange={(e) => setTxData({ ...txData, description: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowTxModal(false)}
                  className="flex-1 py-2 px-3 border border-slate-200 text-slate-600 rounded-xl font-bold uppercase"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={submittingTx}
                  className="flex-1 py-2 px-3 bg-[#c27803] text-white rounded-xl font-bold uppercase hover:bg-[#92400e]"
                >
                  {submittingTx ? "Đang lưu..." : "Lưu Phiếu"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default FinancePage;
