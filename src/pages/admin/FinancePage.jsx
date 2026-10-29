import React, { useState, useEffect } from "react";
import { useLanguage } from "../../context/LanguageContext";
import {
  getTuitions,
  recordTuitionPayment,
  getLedgerTransactions,
  addLedgerTransaction,
  getMonthlySummaries,
} from "../../services/financeService";
import { subscribeClasses } from "../../services/classService";
import { VIETQR_CONFIG, buildVietQrUrl } from "../../config/vietqr";
import { useSettings } from "../../context/SettingsContext";

export const FinancePage = () => {
  const { t, lang } = useLanguage();
  const { bankingConfig, buildQrUrl } = useSettings();
  const [activeSubTab, setActiveSubTab] = useState("tuition"); // "tuition" | "ledger" | "profit_loss"
  const [classes, setClasses] = useState([]);
  const [tuitions, setTuitions] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [monthlySummaries, setMonthlySummaries] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filter
  const [selectedClassFilter, setSelectedClassFilter] = useState("all");

  // Payment Recording Modal
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentTarget, setPaymentTarget] = useState(null);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("bank_transfer");
  const [paymentNote, setPaymentNote] = useState("");
  const [submittingPayment, setSubmittingPayment] = useState(false);

  // VietQR Modal
  const [showQrModal, setShowQrModal] = useState(false);
  const [qrData, setQrData] = useState(null);

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

  const loadData = async () => {
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
    const unsub = subscribeClasses((cls) => setClasses(cls));
    loadData();
    return () => unsub();
  }, [selectedClassFilter]);

  // Open Payment Modal
  const openPayment = (t) => {
    setPaymentTarget(t);
    setPaymentAmount(t.debtAmount ? t.debtAmount.toString() : "0");
    setShowPaymentModal(true);
  };

  // Submit Payment
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
      await loadData();
    } catch (err) {
      alert("Payment processing failed: " + err.message);
    } finally {
      setSubmittingPayment(false);
    }
  };

  // Open VietQR
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

  // Submit Ledger Tx
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
      await loadData();
    } catch (err) {
      alert("Ledger save error: " + err.message);
    } finally {
      setSubmittingTx(false);
    }
  };

  // Ledger KPIs
  const totalIncome = transactions
    .filter((tx) => tx.type === "income")
    .reduce((sum, tx) => sum + (tx.amount || 0), 0);
  const totalExpense = transactions
    .filter((tx) => tx.type === "expense")
    .reduce((sum, tx) => sum + (tx.amount || 0), 0);
  const runningBalance = totalIncome - totalExpense;

  return (
    <div className="space-y-6">
      {/* Subtab Navigation */}
      <div className="flex border-b border-slate-200 gap-2">
        <button
          onClick={() => setActiveSubTab("tuition")}
          className={`py-3 px-5 text-xs font-heading font-bold uppercase tracking-wider border-b-2 transition ${
            activeSubTab === "tuition"
              ? "border-[#c27803] text-[#c27803]"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          {lang === "vi" ? "Theo dõi Học phí" : "Tuition Tracking"}
        </button>
        <button
          onClick={() => setActiveSubTab("ledger")}
          className={`py-3 px-5 text-xs font-heading font-bold uppercase tracking-wider border-b-2 transition ${
            activeSubTab === "ledger"
              ? "border-[#c27803] text-[#c27803]"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          {lang === "vi" ? "Sổ quỹ Thu - Chi" : "Internal Ledger"}
        </button>
        <button
          onClick={() => setActiveSubTab("profit_loss")}
          className={`py-3 px-5 text-xs font-heading font-bold uppercase tracking-wider border-b-2 transition ${
            activeSubTab === "profit_loss"
              ? "border-[#c27803] text-[#c27803]"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          {lang === "vi" ? "Báo cáo Doanh thu & Lợi nhuận" : "Monthly Profit & Loss"}
        </button>
      </div>

      {/* 1. TUITION TRACKING SUBTAB */}
      {activeSubTab === "tuition" && (
        <div className="space-y-5">
          {/* Tuition KPI Cards: Revenue vs Debt */}
          {(() => {
            const totalTuitionRevenue = tuitions.reduce((sum, t) => sum + (t.paidAmount || 0), 0);
            const totalTuitionDebt = tuitions.reduce((sum, t) => sum + (t.debtAmount || 0), 0);
            const totalTuitionExpected = tuitions.reduce((sum, t) => sum + (t.finalAmount || t.totalAmount || 0), 0);

            return (
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
                    <span className="text-[11px] px-2 py-0.5 rounded-full bg-cyan-50 text-[#c27803] font-bold border border-[#c27803]/20">
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
            );
          })()}

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
              onClick={loadData}
              className="py-1.5 px-3 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg text-xs font-medium transition"
            >
              ↻ Refresh
            </button>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
            {loading ? (
              <div className="py-20 text-center text-slate-400">Loading tuition records...</div>
            ) : tuitions.length === 0 ? (
              <div className="py-16 text-center text-slate-500">
                <p className="font-semibold text-slate-700">No tuition entries found</p>
                <p className="text-xs text-slate-400 mt-1">Tuition records are created automatically when students enroll.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-slate-600">
                  <thead className="bg-slate-50 border-b border-slate-200 text-xs uppercase font-semibold text-slate-500 tracking-wider">
                    <tr>
                      <th className="py-3.5 px-4">{lang === "vi" ? "Học viên" : "Student"}</th>
                      <th className="py-3.5 px-4">{lang === "vi" ? "Lớp học" : "Class"}</th>
                      <th className="py-3.5 px-4 text-right">{lang === "vi" ? "Tổng học phí" : "Total Fee"}</th>
                      <th className="py-3.5 px-4 text-right">{lang === "vi" ? "Đã thu (Doanh thu)" : "Paid (Revenue)"}</th>
                      <th className="py-3.5 px-4 text-right">{lang === "vi" ? "Còn lại (Công nợ)" : "Remaining Debt"}</th>
                      <th className="py-3.5 px-4 text-center">{lang === "vi" ? "Tình trạng" : "Status"}</th>
                      <th className="py-3.5 px-4 text-right">{lang === "vi" ? "Thao tác" : "Actions"}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {tuitions.map((t) => (
                      <tr key={t.tuitionId} className="hover:bg-slate-50/60 transition">
                        <td className="py-3.5 px-4">
                          <div className="font-semibold text-slate-900">{t.studentName}</div>
                          <div className="text-xs font-mono font-medium text-slate-500">{t.studentId}</div>
                        </td>
                        <td className="py-3.5 px-4 text-xs font-medium text-slate-700">
                          {t.className || t.classId}
                        </td>
                        <td className="py-3.5 px-4 text-xs font-semibold text-slate-800 text-right">
                          {(t.finalAmount || t.totalAmount || 0).toLocaleString("vi-VN")} ₫
                        </td>
                        <td className="py-3.5 px-4 text-xs font-semibold text-emerald-600 text-right">
                          {(t.paidAmount || 0).toLocaleString("vi-VN")} ₫
                        </td>
                        <td className="py-3.5 px-4 text-xs font-bold text-rose-600 text-right">
                          {(t.debtAmount || 0).toLocaleString("vi-VN")} ₫
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          {(() => {
                            const status = t.tuitionStatus;
                            const debt = t.debtAmount || 0;
                            if (status === "installment" && debt > 0) {
                              return (
                                <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                                  💳 {lang === "vi" ? "Trả góp" : "Installment"}
                                </span>
                              );
                            }
                            if (debt > 0 || status === "debt") {
                              return (
                                <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200">
                                  ⚠️ {lang === "vi" ? "Còn nợ" : "Debt"}
                                </span>
                              );
                            }
                            return (
                              <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                                ✓ {lang === "vi" ? "Đã hoàn tất" : "Completed"}
                              </span>
                            );
                          })()}
                          {t.installmentNote && (
                            <div
                              className="text-[10px] text-slate-400 truncate max-w-[140px] mx-auto mt-0.5"
                              title={t.installmentNote}
                            >
                              {t.installmentNote}
                            </div>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <div className="inline-flex items-center gap-2">
                            {t.debtAmount > 0 && (
                              <button
                                onClick={() => openVietQr(t)}
                                className="px-2.5 py-1 bg-cyan-50 hover:bg-cyan-100 text-[#c27803] border border-[#c27803]/30 rounded-lg text-xs font-bold transition"
                              >
                                VietQR
                              </button>
                            )}
                            <button
                              onClick={() => openPayment(t)}
                              className="px-3 py-1 bg-[#261e16] hover:bg-[#1c1610] text-white rounded-lg text-xs font-heading font-bold uppercase tracking-wider transition"
                            >
                              Record Payment
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 2. INTERNAL LEDGER (THU - CHI) SUBTAB */}
      {activeSubTab === "ledger" && (
        <div className="space-y-6">
          {/* Running Balance KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
              <span className="text-xs font-heading font-bold text-emerald-600 uppercase tracking-wider">Total Income (Thu)</span>
              <div className="text-2xl font-bold text-slate-900 mt-1">
                {totalIncome.toLocaleString("vi-VN")} ₫
              </div>
            </div>
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
              <span className="text-xs font-heading font-bold text-rose-600 uppercase tracking-wider">Total Expense (Chi)</span>
              <div className="text-2xl font-bold text-slate-900 mt-1">
                {totalExpense.toLocaleString("vi-VN")} ₫
              </div>
            </div>
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
              <span className="text-xs font-heading font-bold text-[#c27803] uppercase tracking-wider">Running Balance</span>
              <div className="text-2xl font-bold text-[#c27803] mt-1">
                {runningBalance.toLocaleString("vi-VN")} ₫
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <h3 className="text-base font-heading font-bold text-[#261e16] uppercase">Recent Transactions</h3>
            <button
              onClick={() => setShowTxModal(true)}
              className="py-2.5 px-4 bg-[#c27803] hover:bg-[#92400e] text-white rounded-xl text-xs font-heading font-bold uppercase tracking-wider shadow-sm transition active:translate-y-px"
            >
              + Add Transaction
            </button>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-600">
                <thead className="bg-slate-50 border-b border-slate-200 text-xs uppercase font-semibold text-slate-500 tracking-wider">
                  <tr>
                    <th className="py-3 px-4">Date</th>
                    <th className="py-3 px-4">Type</th>
                    <th className="py-3 px-4">Category</th>
                    <th className="py-3 px-4">Description</th>
                    <th className="py-3 px-4 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {transactions.map((tx) => (
                    <tr key={tx.transactionId} className="hover:bg-slate-50/60 transition">
                      <td className="py-3 px-4 text-xs font-mono text-slate-500">{tx.date}</td>
                      <td className="py-3 px-4">
                        <span
                          className={`text-[11px] font-bold uppercase px-2 py-0.5 rounded-full ${
                            tx.type === "income"
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                              : "bg-rose-50 text-rose-700 border border-rose-200"
                          }`}
                        >
                          {tx.type}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-xs capitalize font-medium text-slate-700">
                        {tx.category}
                      </td>
                      <td className="py-3 px-4 text-xs text-slate-800">{tx.description}</td>
                      <td
                        className={`py-3 px-4 text-right text-xs font-bold ${
                          tx.type === "income" ? "text-emerald-600" : "text-rose-600"
                        }`}
                      >
                        {tx.type === "income" ? "+" : "-"}{" "}
                        {tx.amount.toLocaleString("vi-VN")} ₫
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 3. MONTHLY PROFIT & LOSS CHART */}
      {activeSubTab === "profit_loss" && (
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6">
          <div>
            <h3 className="text-base font-bold text-slate-800">Monthly Profit & Loss Breakdown</h3>
            <p className="text-xs text-slate-500">
              Aggregated from pre-computed rollups (Zero read penalty)
            </p>
          </div>

          {monthlySummaries.length === 0 ? (
            <div className="py-12 text-center text-slate-400">
              No historical monthly summary data yet.
            </div>
          ) : (
            <div className="space-y-4">
              {monthlySummaries.map((m) => {
                const income = m.totalIncome || 0;
                const expense = m.totalExpense || 0;
                const profit = m.netProfit || 0;
                const maxVal = Math.max(income, expense, 1);

                const incomePct = Math.round((income / maxVal) * 100);
                const expensePct = Math.round((expense / maxVal) * 100);

                return (
                  <div key={m.yearMonth} className="p-4 bg-slate-50 rounded-xl space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-bold text-sm text-slate-800">
                        Month: {m.yearMonth}
                      </span>
                      <span
                        className={`text-xs font-bold ${
                          profit >= 0 ? "text-emerald-700" : "text-rose-700"
                        }`}
                      >
                        Net: {profit.toLocaleString("vi-VN")} ₫
                      </span>
                    </div>

                    {/* Income Bar */}
                    <div className="space-y-1">
                      <div className="flex justify-between text-[11px] text-slate-600">
                        <span>Income</span>
                        <span className="font-semibold text-emerald-600">
                          {income.toLocaleString("vi-VN")} ₫
                        </span>
                      </div>
                      <div className="w-full bg-slate-200 h-2.5 rounded-full overflow-hidden">
                        <div
                          className="bg-emerald-500 h-full rounded-full transition-all duration-300"
                          style={{ width: `${incomePct}%` }}
                        ></div>
                      </div>
                    </div>

                    {/* Expense Bar */}
                    <div className="space-y-1">
                      <div className="flex justify-between text-[11px] text-slate-600">
                        <span>Expense</span>
                        <span className="font-semibold text-rose-600">
                          {expense.toLocaleString("vi-VN")} ₫
                        </span>
                      </div>
                      <div className="w-full bg-slate-200 h-2.5 rounded-full overflow-hidden">
                        <div
                          className="bg-rose-500 h-full rounded-full transition-all duration-300"
                          style={{ width: `${expensePct}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Record Payment Modal */}
      {showPaymentModal && paymentTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-slate-100">
            <h3 className="text-lg font-bold text-slate-900 mb-1">Record Tuition Payment</h3>
            <p className="text-xs text-slate-500 mb-4">
              Student: <span className="font-bold text-slate-800">{paymentTarget.studentName}</span>
            </p>

            <form onSubmit={handlePaymentSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                  Payment Amount (VND)
                </label>
                <input
                  type="number"
                  required
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                  Payment Method
                </label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm"
                >
                  <option value="bank_transfer">Bank Transfer (Chuyển khoản)</option>
                  <option value="cash">Cash (Tiền mặt)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                  Note / Reference
                </label>
                <input
                  type="text"
                  placeholder="e.g. 2nd Installment"
                  value={paymentNote}
                  onChange={(e) => setPaymentNote(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowPaymentModal(false)}
                  className="flex-1 py-2.5 px-3 border border-slate-200 text-slate-600 rounded-xl text-xs font-heading font-bold uppercase tracking-wider hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingPayment}
                  className="flex-1 py-2.5 px-3 bg-[#c27803] text-white rounded-xl text-xs font-heading font-bold uppercase tracking-wider hover:bg-[#92400e] disabled:opacity-50 transition active:translate-y-px"
                >
                  {submittingPayment ? "Processing..." : "Confirm Payment"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* VietQR Modal */}
      {showQrModal && qrData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-slate-100 text-center">
            <h3 className="text-base font-bold text-slate-900 mb-1">VietQR Payment Code</h3>
            <p className="text-xs text-slate-500 mb-4">Scan with any banking app in Vietnam</p>

            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl inline-block mb-4">
              <img
                src={qrData.qrUrl}
                alt="VietQR Code"
                className="w-60 h-60 object-contain mx-auto rounded-lg"
              />
            </div>

            <div className="text-xs text-slate-600 space-y-1 mb-5 text-left bg-slate-50 p-3 rounded-xl border border-slate-100">
              <div>
                <strong>Amount:</strong>{" "}
                <span className="font-bold text-rose-600">{qrData.amount.toLocaleString("vi-VN")} ₫</span>
              </div>
              <div>
                <strong>Account:</strong> {qrData.accountNo} ({qrData.bank})
              </div>
              <div>
                <strong>Beneficiary:</strong> {qrData.accountName}
              </div>
              <div>
                <strong>Description:</strong> {qrData.desc}
              </div>
            </div>

            <button
              onClick={() => setShowQrModal(false)}
              className="w-full py-2 bg-slate-900 text-white rounded-xl text-xs font-semibold hover:bg-slate-800 transition"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Add Ledger Transaction Modal */}
      {showTxModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-slate-100">
            <h3 className="text-base font-bold text-slate-900 mb-4">Add Ledger Transaction</h3>

            <form onSubmit={handleTxSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                  Type
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setTxData({ ...txData, type: "income" })}
                    className={`py-2 text-xs font-semibold rounded-xl border ${
                      txData.type === "income"
                        ? "bg-emerald-600 text-white border-emerald-600"
                        : "bg-slate-50 text-slate-600 border-slate-200"
                    }`}
                  >
                    Income (Thu)
                  </button>
                  <button
                    type="button"
                    onClick={() => setTxData({ ...txData, type: "expense" })}
                    className={`py-2 text-xs font-semibold rounded-xl border ${
                      txData.type === "expense"
                        ? "bg-rose-600 text-white border-rose-600"
                        : "bg-slate-50 text-slate-600 border-slate-200"
                    }`}
                  >
                    Expense (Chi)
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                  Category
                </label>
                <select
                  value={txData.category}
                  onChange={(e) => setTxData({ ...txData, category: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm"
                >
                  <option value="tuition">Tuition (Học phí)</option>
                  <option value="salary">Salary (Lương GV/NV)</option>
                  <option value="rent">Premises Rent (Mặt bằng)</option>
                  <option value="utilities">Utilities (Điện/Nước/Net)</option>
                  <option value="marketing">Marketing / Ads</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                  Amount (VND)
                </label>
                <input
                  type="number"
                  required
                  placeholder="0"
                  value={txData.amount}
                  onChange={(e) => setTxData({ ...txData, amount: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                  Description
                </label>
                <input
                  type="text"
                  required
                  placeholder="Transaction details..."
                  value={txData.description}
                  onChange={(e) => setTxData({ ...txData, description: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowTxModal(false)}
                  className="flex-1 py-2.5 px-3 border border-slate-200 text-slate-600 rounded-xl text-xs font-heading font-bold uppercase tracking-wider hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingTx}
                  className="flex-1 py-2.5 px-3 bg-[#c27803] text-white rounded-xl text-xs font-heading font-bold uppercase tracking-wider hover:bg-[#92400e] disabled:opacity-50 transition active:translate-y-px"
                >
                  {submittingTx ? "Saving..." : "Save Entry"}
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
