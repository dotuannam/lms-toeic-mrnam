import React, { useState } from "react";
import { useLanguage } from "../../context/LanguageContext";
import { compileWeeklyReport, dispatchWeeklyReport } from "../../services/reportService";
import { CENTER_CONFIG } from "../../config/appConfig";

export const ReportsPage = () => {
  const { t, lang } = useLanguage();
  const getInitialDates = () => {
    const end = new Date();
    const start = new Date();
    start.setDate(end.getDate() - 7);
    return {
      start: start.toISOString().split("T")[0],
      end: end.toISOString().split("T")[0],
    };
  };

  const dates = getInitialDates();
  const [startDate, setStartDate] = useState(dates.start);
  const [endDate, setEndDate] = useState(dates.end);
  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState(null);

  const [recipients, setRecipients] = useState(CENTER_CONFIG.managementReportEmail || "management@center.edu.vn");
  const [dispatching, setDispatching] = useState(false);
  const [dispatchStatus, setDispatchStatus] = useState("");

  const handleCompile = async (e) => {
    e.preventDefault();
    setLoading(true);
    setDispatchStatus("");
    try {
      const data = await compileWeeklyReport(startDate, endDate);
      setReportData(data);
    } catch (err) {
      alert("Error compiling report: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDispatch = async () => {
    if (!reportData || !recipients) return;

    setDispatching(true);
    setDispatchStatus("");
    try {
      const recipientList = recipients
        .split(",")
        .map((r) => r.trim())
        .filter(Boolean);

      await dispatchWeeklyReport(recipientList, reportData);
      setDispatchStatus("Report successfully emailed to management team!");
    } catch (err) {
      alert("Email delivery failed: " + err.message);
    } finally {
      setDispatching(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Date Range Selection Bar */}
      <form
        onSubmit={handleCompile}
        className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-end gap-4 justify-between"
      >
        <div className="flex flex-wrap items-center gap-4 w-full sm:w-auto">
          <div>
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
              {lang === "vi" ? "Từ ngày" : "Start Date"}
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="py-2 px-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800"
            />
          </div>
          <div>
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
              {lang === "vi" ? "Đến ngày" : "End Date"}
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="py-2 px-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full sm:w-auto py-2.5 px-6 bg-[#c27803] hover:bg-[#92400e] text-white rounded-xl text-xs font-heading font-bold uppercase tracking-wider shadow-sm transition disabled:opacity-50 active:translate-y-px"
        >
          {loading ? t("loading") : (lang === "vi" ? "Tổng hợp Báo cáo" : "Generate Summary")}
        </button>
      </form>

      {/* Generated Report View */}
      {reportData ? (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-4 border-b border-slate-100 gap-2">
            <div>
              <h2 className="text-lg font-heading font-bold text-slate-900 uppercase">
                {t("weeklyReportTitle")}
              </h2>
              <p className="text-xs text-slate-500">
                Data compiled for period: {reportData.period.from} → {reportData.period.to}
              </p>
            </div>
            <span className="px-3 py-1 bg-cyan-50 border border-[#c27803]/30 text-[#c27803] rounded-full text-xs font-heading font-bold uppercase tracking-wide">
              Ready for Dispatch
            </span>
          </div>

          {/* Metric Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
              <span className="text-[11px] font-heading font-bold text-slate-500 uppercase tracking-wider">New Students</span>
              <div className="text-2xl font-bold text-slate-900 mt-1">
                {reportData.metrics.newStudents}
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5">Enrolled this period</p>
            </div>

            <div className="p-4 bg-emerald-50/60 rounded-xl border border-emerald-100">
              <span className="text-[11px] font-heading font-bold text-emerald-700 uppercase tracking-wider">Tuition Collected</span>
              <div className="text-2xl font-bold text-emerald-700 mt-1">
                {reportData.metrics.tuitionCollected.toLocaleString("vi-VN")} ₫
              </div>
              <p className="text-[11px] text-emerald-600 mt-0.5">Recorded in ledger</p>
            </div>

            <div className="p-4 bg-rose-50/60 rounded-xl border border-rose-100">
              <span className="text-[11px] font-heading font-bold text-rose-700 uppercase tracking-wider">Outstanding Debt</span>
              <div className="text-2xl font-bold text-rose-700 mt-1">
                {reportData.metrics.outstandingDebt.toLocaleString("vi-VN")} ₫
              </div>
              <p className="text-[11px] text-rose-600 mt-0.5">Total center receivables</p>
            </div>

            <div className="p-4 bg-amber-50/60 rounded-xl border border-amber-100">
              <span className="text-[11px] font-heading font-bold text-amber-700 uppercase tracking-wider">Student Absences</span>
              <div className="text-2xl font-bold text-amber-700 mt-1">
                {reportData.metrics.totalAbsences}
              </div>
              <p className="text-[11px] text-amber-600 mt-0.5">
                {reportData.metrics.unexcusedAbsences} unexcused absences
              </p>
            </div>
          </div>

          {/* Email Dispatch Section */}
          <div className="p-5 bg-gradient-to-r from-slate-50 to-cyan-50/30 rounded-xl border border-[#c27803]/20 space-y-3">
            <h3 className="text-sm font-heading font-bold text-[#261e16] uppercase">Dispatch Report via Email</h3>
            <p className="text-xs text-slate-500">
              Send this report directly to stakeholders via our free-tier Gmail integration.
            </p>

            <div className="flex flex-col sm:flex-row gap-3">
              <input
                type="text"
                placeholder="Comma separated emails (e.g. boss@center.edu.vn, team@...)"
                value={recipients}
                onChange={(e) => setRecipients(e.target.value)}
                className="flex-1 px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#c27803]/20 focus:border-[#c27803]"
              />
              <button
                type="button"
                onClick={handleDispatch}
                disabled={dispatching || !recipients}
                className="py-2.5 px-6 bg-[#c27803] hover:bg-[#92400e] text-white rounded-xl text-xs font-heading font-bold uppercase tracking-wider shadow-sm transition disabled:opacity-50 active:translate-y-px"
              >
                {dispatching ? "Sending..." : "Send Report Now"}
              </button>
            </div>

            {dispatchStatus && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl font-medium flex items-center gap-2">
                <span>✓</span>
                <span>{dispatchStatus}</span>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 p-16 text-center shadow-sm">
          <div className="text-3xl mb-2">📊</div>
          <h3 className="text-base font-semibold text-slate-800">No report generated yet</h3>
          <p className="text-xs text-slate-500 mt-1">
            Select a date range and click "Generate Summary" to compile weekly statistics.
          </p>
        </div>
      )}
    </div>
  );
};

export default ReportsPage;
