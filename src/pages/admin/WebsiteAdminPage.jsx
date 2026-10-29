import React, { useState, useEffect } from "react";
import { useSettings } from "../../context/SettingsContext";
import { useLanguage } from "../../context/LanguageContext";
import {
  VIETNAMESE_BANKS,
  VIETQR_TEMPLATES,
  DEFAULT_CENTER_CONFIG,
  DEFAULT_BANKING_CONFIG,
  DEFAULT_SHIFTS,
  DEFAULT_GAS_CONFIG,
  DEFAULT_ANNOUNCEMENT_CONFIG,
  DEFAULT_CLASSROOM_RULES,
} from "../../services/settingsService";
import { EmailTemplatesPage } from "./EmailTemplatesPage";
import { callGasApi } from "../../services/api";
import { GAS_CODE_TEMPLATE } from "../../services/gasCodeSnippet";

export const WebsiteAdminPage = ({ initialSubTab = "email-templates" }) => {
  const { t, lang } = useLanguage();
  const {
    centerConfig,
    bankingConfig,
    teachingShifts,
    gasConfig,
    announcementConfig,
    classroomRules,
    updateCenterConfig,
    updateBankingConfig,
    updateTeachingShifts,
    updateGasConfig,
    updateAnnouncementConfig,
    updateClassroomRules,
  } = useSettings();

  const [activeSubTab, setActiveSubTab] = useState(initialSubTab);

  // =========================================================================
  // SUB-TAB 2: THÔNG TIN TRUNG TÂM STATE
  // =========================================================================
  const [centerForm, setCenterForm] = useState(centerConfig || DEFAULT_CENTER_CONFIG);
  const [savingCenter, setSavingCenter] = useState(false);
  const [centerSaveSuccess, setCenterSaveSuccess] = useState(false);

  useEffect(() => {
    if (centerConfig) {
      setCenterForm((prev) => ({ ...prev, ...centerConfig }));
    }
  }, [centerConfig]);

  const handleSaveCenter = async (e) => {
    e.preventDefault();
    if (!centerForm.centerName.trim()) {
      alert("Vui lòng nhập tên trung tâm.");
      return;
    }
    setSavingCenter(true);
    setCenterSaveSuccess(false);
    try {
      await updateCenterConfig(centerForm);
      setCenterSaveSuccess(true);
      setTimeout(() => setCenterSaveSuccess(false), 4000);
    } catch (err) {
      alert("Lỗi khi lưu thông tin trung tâm: " + err.message);
    } finally {
      setSavingCenter(false);
    }
  };

  // =========================================================================
  // SUB-TAB 3: NGÂN HÀNG & MÃ VIETQR STATE
  // =========================================================================
  const [bankingForm, setBankingForm] = useState(bankingConfig || DEFAULT_BANKING_CONFIG);
  const [savingBanking, setSavingBanking] = useState(false);
  const [bankingSaveSuccess, setBankingSaveSuccess] = useState(false);

  // Interactive Live Simulator for VietQR
  const [testAmount, setTestAmount] = useState(1500000);
  const [testDescription, setTestDescription] = useState("HP HV01 LOP1");
  const [copiedLink, setCopiedLink] = useState(false);

  useEffect(() => {
    if (bankingConfig) {
      setBankingForm((prev) => ({ ...prev, ...bankingConfig }));
    }
  }, [bankingConfig]);

  const handleSaveBanking = async (e) => {
    e.preventDefault();
    if (!bankingForm.accountNo.trim()) {
      alert("Vui lòng nhập số tài khoản ngân hàng.");
      return;
    }
    if (!bankingForm.accountName.trim()) {
      alert("Vui lòng nhập tên chủ tài khoản.");
      return;
    }
    setSavingBanking(true);
    setBankingSaveSuccess(false);
    try {
      await updateBankingConfig(bankingForm);
      setBankingSaveSuccess(true);
      setTimeout(() => setBankingSaveSuccess(false), 4000);
    } catch (err) {
      alert("Lỗi khi lưu cấu hình ngân hàng: " + err.message);
    } finally {
      setSavingBanking(false);
    }
  };

  const previewQrUrl = `https://img.vietqr.io/image/${bankingForm.bankId || "TCB"}-${(bankingForm.accountNo || "280931081998").trim().replace(/\s+/g, "")}-${bankingForm.template || "compact2"}.png?amount=${testAmount}&addInfo=${encodeURIComponent(testDescription.trim().slice(0, 50))}&accountName=${encodeURIComponent(bankingForm.accountName || "TOEIC MR.NAM")}`;

  const handleCopyQrLink = () => {
    navigator.clipboard.writeText(previewQrUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 3000);
  };

  // =========================================================================
  // SUB-TAB 4: CA DẠY STATE
  // =========================================================================
  const [shiftsList, setShiftsList] = useState(teachingShifts || DEFAULT_SHIFTS);
  const [savingShifts, setSavingShifts] = useState(false);
  const [shiftsSaveSuccess, setShiftsSaveSuccess] = useState(false);

  useEffect(() => {
    if (teachingShifts && teachingShifts.length > 0) {
      setShiftsList(teachingShifts);
    }
  }, [teachingShifts]);

  const handleShiftChange = (index, field, value) => {
    const updated = [...shiftsList];
    updated[index] = { ...updated[index], [field]: value };
    setShiftsList(updated);
  };

  const handleAddShift = () => {
    const nextNum = shiftsList.length + 1;
    setShiftsList([
      ...shiftsList,
      {
        id: `shift_${Date.now()}`,
        name: `Ca ${nextNum}`,
        startTime: "18:00",
        endTime: "19:30",
      },
    ]);
  };

  const handleRemoveShift = (index) => {
    if (shiftsList.length <= 1) {
      alert("Cần giữ lại ít nhất 1 ca học.");
      return;
    }
    setShiftsList(shiftsList.filter((_, i) => i !== index));
  };

  const handleResetShifts = () => {
    if (window.confirm("Khôi phục danh sách ca dạy về mặc định ban đầu?")) {
      setShiftsList(DEFAULT_SHIFTS);
    }
  };

  const handleSaveShifts = async () => {
    setSavingShifts(true);
    setShiftsSaveSuccess(false);
    try {
      await updateTeachingShifts(shiftsList);
      setShiftsSaveSuccess(true);
      setTimeout(() => setShiftsSaveSuccess(false), 4000);
    } catch (err) {
      alert("Lỗi khi lưu ca dạy: " + err.message);
    } finally {
      setSavingShifts(false);
    }
  };

  // =========================================================================
  // SUB-TAB 5: TÍCH HỢP TỰ ĐỘNG HÓA STATE
  // =========================================================================
  const [gasForm, setGasForm] = useState(gasConfig || DEFAULT_GAS_CONFIG);
  const [savingGas, setSavingGas] = useState(false);
  const [gasSaveSuccess, setGasSaveSuccess] = useState(false);
  const [copiedGasCode, setCopiedGasCode] = useState(false);

  useEffect(() => {
    if (gasConfig) {
      setGasForm((prev) => ({ ...prev, ...gasConfig }));
    }
  }, [gasConfig]);

  const handleSaveGas = async (e) => {
    e?.preventDefault();
    if (!gasForm.webAppUrl.trim()) {
      alert("Vui lòng nhập Google Apps Script Web App URL.");
      return;
    }
    setSavingGas(true);
    setGasSaveSuccess(false);
    try {
      await updateGasConfig(gasForm);
      setGasSaveSuccess(true);
      setTimeout(() => setGasSaveSuccess(false), 4000);
    } catch (err) {
      alert("Lỗi khi lưu cấu hình GAS: " + err.message);
    } finally {
      setSavingGas(false);
    }
  };

  const handleCopyGasCode = () => {
    navigator.clipboard.writeText(GAS_CODE_TEMPLATE);
    setCopiedGasCode(true);
    setTimeout(() => setCopiedGasCode(false), 3000);
  };

  const [pingStatus, setPingStatus] = useState(null);
  const [testingPing, setTestingPing] = useState(false);

  const handleTestPing = async () => {
    setTestingPing(true);
    setPingStatus(null);
    try {
      const res = await callGasApi("ping");
      setPingStatus({
        success: true,
        data: res,
        time: new Date().toLocaleTimeString("vi-VN"),
      });
    } catch (err) {
      setPingStatus({
        success: false,
        error: err.message,
        time: new Date().toLocaleTimeString("vi-VN"),
      });
    } finally {
      setTestingPing(false);
    }
  };

  // =========================================================================
  // SUB-TAB 6: BANNER THÔNG BÁO TỔNG STATE
  // =========================================================================
  const [announcementForm, setAnnouncementForm] = useState(
    announcementConfig || DEFAULT_ANNOUNCEMENT_CONFIG
  );
  const [savingAnnouncement, setSavingAnnouncement] = useState(false);
  const [announcementSaveSuccess, setAnnouncementSaveSuccess] = useState(false);

  useEffect(() => {
    if (announcementConfig) {
      setAnnouncementForm(announcementConfig);
    }
  }, [announcementConfig]);

  const handleSaveAnnouncement = async (e) => {
    e.preventDefault();
    setSavingAnnouncement(true);
    setAnnouncementSaveSuccess(false);
    try {
      await updateAnnouncementConfig(announcementForm);
      setAnnouncementSaveSuccess(true);
      setTimeout(() => setAnnouncementSaveSuccess(false), 4000);
    } catch (err) {
      alert("Lỗi khi lưu banner thông báo: " + err.message);
    } finally {
      setSavingAnnouncement(false);
    }
  };

  // =========================================================================
  // SUB-TAB 7: QUY ĐỊNH LỚP HỌC STATE
  // =========================================================================
  const [rulesForm, setRulesForm] = useState(
    classroomRules || DEFAULT_CLASSROOM_RULES
  );
  const [savingRules, setSavingRules] = useState(false);
  const [rulesSaveSuccess, setRulesSaveSuccess] = useState(false);

  useEffect(() => {
    if (classroomRules) {
      setRulesForm(classroomRules);
    }
  }, [classroomRules]);

  const handleAddRuleSection = () => {
    const newSec = {
      id: "sec_" + Date.now(),
      title: `${(rulesForm.sections?.length || 0) + 1}. Tiêu đề mục mới`,
      icon: "verified",
      rules: ["Nội dung điều khoản mới..."],
    };
    setRulesForm({
      ...rulesForm,
      sections: [...(rulesForm.sections || []), newSec],
    });
  };

  const handleRemoveRuleSection = (idx) => {
    const updated = (rulesForm.sections || []).filter((_, i) => i !== idx);
    setRulesForm({ ...rulesForm, sections: updated });
  };

  const handleAddRuleItem = (secIdx) => {
    const updated = [...(rulesForm.sections || [])];
    updated[secIdx].rules = [...(updated[secIdx].rules || []), "Điều khoản quy định mới..."];
    setRulesForm({ ...rulesForm, sections: updated });
  };

  const handleRemoveRuleItem = (secIdx, itemIdx) => {
    const updated = [...(rulesForm.sections || [])];
    updated[secIdx].rules = updated[secIdx].rules.filter((_, i) => i !== itemIdx);
    setRulesForm({ ...rulesForm, sections: updated });
  };

  const handleUpdateRuleItem = (secIdx, itemIdx, val) => {
    const updated = [...(rulesForm.sections || [])];
    updated[secIdx].rules[itemIdx] = val;
    setRulesForm({ ...rulesForm, sections: updated });
  };

  const handleUpdateSectionTitle = (secIdx, val) => {
    const updated = [...(rulesForm.sections || [])];
    updated[secIdx].title = val;
    setRulesForm({ ...rulesForm, sections: updated });
  };

  const handleSaveRules = async (e) => {
    e.preventDefault();
    setSavingRules(true);
    setRulesSaveSuccess(false);
    try {
      await updateClassroomRules(rulesForm);
      setRulesSaveSuccess(true);
      setTimeout(() => setRulesSaveSuccess(false), 4000);
    } catch (err) {
      alert("Lỗi khi lưu quy định lớp học: " + err.message);
    } finally {
      setSavingRules(false);
    }
  };

  const currentBankObj = VIETNAMESE_BANKS.find((b) => b.code === bankingForm.bankId) || {
    code: bankingForm.bankId,
    shortName: bankingForm.bankId,
    name: "Ngân hàng đã chọn",
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Header */}
      <div className="bg-gradient-to-r from-[#151b26] via-[#1e2738] to-[#151b26] rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden border border-slate-700/60">
        <div className="absolute top-0 right-0 -mt-10 -mr-10 w-72 h-72 bg-[#00b4d8]/10 rounded-full blur-3xl pointer-events-none"></div>

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-3 py-1 bg-[#00b4d8]/20 border border-[#00b4d8]/30 rounded-full text-xs font-heading font-bold text-[#72d5cd] uppercase tracking-wider flex items-center gap-1.5">
                <span>⚙️</span> Trung Tâm Quản Trị Hệ Thống
              </span>
              <span className="px-2.5 py-1 bg-emerald-500/20 border border-emerald-400/30 rounded-full text-[11px] font-bold text-emerald-300 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                Đồng bộ Cloud
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-heading font-black text-white tracking-wide uppercase">
              Quản Trị Website & Cấu Hình
            </h1>
            <p className="text-slate-300 text-sm mt-1 max-w-2xl font-medium">
              Tùy chỉnh thông tin thương hiệu trung tâm, tài khoản ngân hàng nhận học phí qua VietQR,
              ca học và hệ thống mẫu email thông báo tự động.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-3 border border-white/10 text-right hidden sm:block">
              <p className="text-[11px] text-slate-300 font-medium">Trung tâm hiện tại</p>
              <p className="text-sm font-heading font-bold text-[#00b4d8] truncate max-w-[200px]">
                {centerForm.centerName || "TOEIC MR.NAM"}
              </p>
            </div>
          </div>
        </div>

        {/* Sub-Tabs Navigation Bar */}
        <div className="mt-8 pt-4 border-t border-slate-800 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveSubTab("email-templates")}
            className={`px-4 py-2.5 rounded-xl text-xs font-heading font-bold uppercase tracking-wider transition flex items-center gap-2 ${
              activeSubTab === "email-templates"
                ? "bg-[#00b4d8] text-white shadow-lg shadow-[#00b4d8]/30"
                : "bg-slate-800/80 hover:bg-slate-800 text-slate-300 hover:text-white"
            }`}
          >
            <span>✉️</span>
            <span>{lang === "vi" ? "Mẫu Email Thông Báo" : "Email Templates"}</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab("center-info")}
            className={`px-4 py-2.5 rounded-xl text-xs font-heading font-bold uppercase tracking-wider transition flex items-center gap-2 ${
              activeSubTab === "center-info"
                ? "bg-[#00b4d8] text-white shadow-lg shadow-[#00b4d8]/30"
                : "bg-slate-800/80 hover:bg-slate-800 text-slate-300 hover:text-white"
            }`}
          >
            <span>🏫</span>
            <span>{lang === "vi" ? "Thông Tin Trung Tâm" : "Center Information"}</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab("banking-vietqr")}
            className={`px-4 py-2.5 rounded-xl text-xs font-heading font-bold uppercase tracking-wider transition flex items-center gap-2 ${
              activeSubTab === "banking-vietqr"
                ? "bg-[#00b4d8] text-white shadow-lg shadow-[#00b4d8]/30"
                : "bg-slate-800/80 hover:bg-slate-800 text-slate-300 hover:text-white"
            }`}
          >
            <span>💳</span>
            <span>{lang === "vi" ? "Ngân Hàng & Mã VietQR" : "Banking & VietQR"}</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab("teaching-shifts")}
            className={`px-4 py-2.5 rounded-xl text-xs font-heading font-bold uppercase tracking-wider transition flex items-center gap-2 ${
              activeSubTab === "teaching-shifts"
                ? "bg-[#00b4d8] text-white shadow-lg shadow-[#00b4d8]/30"
                : "bg-slate-800/80 hover:bg-slate-800 text-slate-300 hover:text-white"
            }`}
          >
            <span>⏰</span>
            <span>{lang === "vi" ? "Ca Dạy & Khung Giờ" : "Teaching Shifts"}</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab("integrations")}
            className={`px-4 py-2.5 rounded-xl text-xs font-heading font-bold uppercase tracking-wider transition flex items-center gap-2 ${
              activeSubTab === "integrations"
                ? "bg-[#00b4d8] text-white shadow-lg shadow-[#00b4d8]/30"
                : "bg-slate-800/80 hover:bg-slate-800 text-slate-300 hover:text-white"
            }`}
          >
            <span>⚡</span>
            <span>{lang === "vi" ? "Tự Động Hóa & API" : "Automations & API"}</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab("announcement-banner")}
            className={`px-4 py-2.5 rounded-xl text-xs font-heading font-bold uppercase tracking-wider transition flex items-center gap-2 relative ${
              activeSubTab === "announcement-banner"
                ? "bg-[#00b4d8] text-white shadow-lg shadow-[#00b4d8]/30"
                : "bg-slate-800/80 hover:bg-slate-800 text-slate-300 hover:text-white"
            }`}
          >
            <span>📢</span>
            <span>{lang === "vi" ? "Banner Thông Báo Tổng" : "Global Banner"}</span>
            {announcementConfig?.enabled && announcementConfig?.content?.trim() && (
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab("classroom-rules")}
            className={`px-4 py-2.5 rounded-xl text-xs font-heading font-bold uppercase tracking-wider transition flex items-center gap-2 ${
              activeSubTab === "classroom-rules"
                ? "bg-[#00b4d8] text-white shadow-lg shadow-[#00b4d8]/30"
                : "bg-slate-800/80 hover:bg-slate-800 text-slate-300 hover:text-white"
            }`}
          >
            <span>📜</span>
            <span>{lang === "vi" ? "Quy Định Lớp Học" : "Classroom Rules"}</span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 1. SUB-TAB: MẪU EMAIL THÔNG BÁO                                           */}
      {/* ========================================================================= */}
      {activeSubTab === "email-templates" && (
        <div className="transition-opacity duration-300">
          <EmailTemplatesPage />
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. SUB-TAB: THÔNG TIN TRUNG TÂM                                           */}
      {/* ========================================================================= */}
      {activeSubTab === "center-info" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 transition-opacity duration-300">
          {/* Left Column: Center Form (8 cols) */}
          <div className="lg:col-span-8 bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-sm">
            <div className="flex items-center justify-between pb-5 border-b border-slate-100 mb-6">
              <div>
                <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                  <span>🏢</span> Cấu Hình Thông Tin Trung Tâm & Thương Hiệu
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Các thông tin này sẽ tự động xuất hiện trên tiêu đề email, chân trang, giao diện học viên và báo cáo.
                </p>
              </div>

              {centerSaveSuccess && (
                <span className="px-3 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-xl text-xs font-bold flex items-center gap-1.5 animate-pulse">
                  <span>✓</span> Đã lưu thành công!
                </span>
              )}
            </div>

            <form onSubmit={handleSaveCenter} className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5">
                    Tên Trung Tâm *
                  </label>
                  <input
                    type="text"
                    required
                    value={centerForm.centerName}
                    onChange={(e) => setCenterForm({ ...centerForm, centerName: e.target.value })}
                    placeholder="vd: TOEIC MR.NAM"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-900 focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5">
                    Hotline / Số Điện Thoại Liên Hệ *
                  </label>
                  <input
                    type="text"
                    value={centerForm.hotline}
                    onChange={(e) => setCenterForm({ ...centerForm, hotline: e.target.value })}
                    placeholder="vd: 0912 345 678"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5">
                  Slogan / Khẩu Hiệu Đào Tạo
                </label>
                <input
                  type="text"
                  value={centerForm.slogan}
                  onChange={(e) => setCenterForm({ ...centerForm, slogan: e.target.value })}
                  placeholder="vd: Trung tâm đào tạo Ngoại ngữ & Luyện thi chứng chỉ TOEIC chất lượng cao"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5">
                    Email Quản Trị / Hỗ Trợ Học Viên *
                  </label>
                  <input
                    type="email"
                    required
                    value={centerForm.adminEmail}
                    onChange={(e) => setCenterForm({ ...centerForm, adminEmail: e.target.value })}
                    placeholder="admin@center.edu.vn"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition"
                  />
                  <p className="text-[11px] text-slate-400 mt-1">
                    Email đại diện gửi thông báo & hỗ trợ học viên giải đáp.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5">
                    Email Nhận Báo Cáo Tuần (KPI / Thu Chi)
                  </label>
                  <input
                    type="email"
                    value={centerForm.managementReportEmail}
                    onChange={(e) =>
                      setCenterForm({ ...centerForm, managementReportEmail: e.target.value })
                    }
                    placeholder="management@center.edu.vn"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition"
                  />
                  <p className="text-[11px] text-slate-400 mt-1">
                    Hòm thư nhận bản tổng kết báo cáo tự động từ tab Báo Cáo.
                  </p>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5">
                  Địa Chỉ Cơ Sở Trung Tâm
                </label>
                <input
                  type="text"
                  value={centerForm.address}
                  onChange={(e) => setCenterForm({ ...centerForm, address: e.target.value })}
                  placeholder="vd: Tầng 3, Tòa nhà Tri Thức, Số 123 Đường Cầu Giấy, Hà Nội"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5">
                    Đường Dẫn Website
                  </label>
                  <input
                    type="url"
                    value={centerForm.websiteUrl}
                    onChange={(e) => setCenterForm({ ...centerForm, websiteUrl: e.target.value })}
                    placeholder="https://auto-lms-43b1d.web.app"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5">
                    Link Fanpage / Kênh Tư Vấn Zalo
                  </label>
                  <input
                    type="url"
                    value={centerForm.fanpageUrl}
                    onChange={(e) => setCenterForm({ ...centerForm, fanpageUrl: e.target.value })}
                    placeholder="https://facebook.com/trungtam"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition"
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
                <button
                  type="submit"
                  disabled={savingCenter}
                  className="px-6 py-2.5 bg-[#00b4d8] hover:bg-[#0096c7] text-white rounded-xl text-xs font-heading font-bold uppercase tracking-wider transition shadow-md shadow-[#00b4d8]/25 flex items-center gap-2 disabled:opacity-60 active:translate-y-px"
                >
                  <span>💾</span>
                  <span>{savingCenter ? "Đang lưu..." : "Lưu Thông Tin Trung Tâm"}</span>
                </button>
              </div>
            </form>
          </div>

          {/* Right Column: Live Brand Preview Card (4 cols) */}
          <div className="lg:col-span-4 space-y-4">
            <div className="bg-slate-900 rounded-3xl p-6 text-white border border-slate-800 shadow-md">
              <span className="text-[11px] font-bold text-indigo-400 uppercase tracking-wider block mb-3">
                👁️ Xem Trước Thẻ Nhận Diện Trung Tâm
              </span>

              <div className="bg-slate-800/80 rounded-2xl p-5 border border-slate-700 space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-indigo-500 to-violet-600 flex items-center justify-center font-black text-lg text-white shadow-lg">
                    {centerForm.centerName ? centerForm.centerName.charAt(0) : "L"}
                  </div>
                  <div>
                    <h4 className="font-extrabold text-white text-base">
                      {centerForm.centerName || "TOEIC MR.NAM"}
                    </h4>
                    <span className="px-2 py-0.5 bg-indigo-500/20 text-indigo-300 rounded text-[10px] font-semibold">
                      Chính thức
                    </span>
                  </div>
                </div>

                <p className="text-xs text-slate-300 italic">
                  "{centerForm.slogan || "Trung tâm đào tạo Ngoại ngữ & Luyện thi chứng chỉ chất lượng cao"}"
                </p>

                <div className="pt-3 border-t border-slate-700/80 space-y-2 text-xs text-slate-300">
                  <div className="flex items-center gap-2">
                    <span className="text-amber-400">📞</span>
                    <span className="font-medium text-white">{centerForm.hotline || "0912 345 678"}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-indigo-400">✉️</span>
                    <span className="truncate">{centerForm.adminEmail || "admin@center.edu.vn"}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-emerald-400">📍</span>
                    <span className="truncate">{centerForm.address || "Hà Nội, Việt Nam"}</span>
                  </div>
                </div>
              </div>

              <div className="mt-4 p-3 bg-indigo-950/60 rounded-xl border border-indigo-800/60 text-[11px] text-indigo-200 leading-relaxed space-y-1">
                <p>
                  💡 <strong>Đồng bộ thời gian thực (Realtime):</strong> Khi nhấn Lưu, toàn bộ Cổng Học Viên (Student Portal: Thanh liên hệ đầu trang, Header, Chân trang, Hotline hỗ trợ học phí & mã VietQR, Tab tài liệu Google Drive) và các biến mẫu email (
                  <code className="bg-indigo-900/80 px-1 py-0.5 rounded text-amber-300">{"{{ten_trung_tam}}"}</code>,{" "}
                  <code className="bg-indigo-900/80 px-1 py-0.5 rounded text-amber-300">{"{{email_trung_tam}}"}</code>
                  ) sẽ tự động đồng bộ ngay lập tức!
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. SUB-TAB: NGÂN HÀNG & MÃ VIETQR                                         */}
      {/* ========================================================================= */}
      {activeSubTab === "banking-vietqr" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 transition-opacity duration-300">
          {/* Left Column: Bank Configuration Form (7 cols) */}
          <div className="lg:col-span-7 bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-sm">
            <div className="flex items-center justify-between pb-5 border-b border-slate-100 mb-6">
              <div>
                <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                  <span>💳</span> Cấu Hình Tài Khoản Thu Học Phí (VietQR)
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Thiết lập tài khoản ngân hàng để tự động sinh mã QR chuyển khoản chuẩn VietQR cho học viên.
                </p>
              </div>

              {bankingSaveSuccess && (
                <span className="px-3 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-xl text-xs font-bold flex items-center gap-1.5 animate-pulse">
                  <span>✓</span> Đã lưu cấu hình QR!
                </span>
              )}
            </div>

            <form onSubmit={handleSaveBanking} className="space-y-5">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5">
                  Ngân Hàng Thụ Hưởng (VietQR Bank) *
                </label>
                <select
                  value={bankingForm.bankId}
                  onChange={(e) => setBankingForm({ ...bankingForm, bankId: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 focus:bg-white focus:border-indigo-500 transition"
                >
                  {VIETNAMESE_BANKS.map((b) => (
                    <option key={b.code} value={b.code}>
                      {b.shortName} ({b.code}) - {b.name}
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-slate-400 mt-1">
                  Đang chọn: <strong>{currentBankObj.shortName}</strong> ({currentBankObj.name})
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5">
                    Số Tài Khoản Ngân Hàng *
                  </label>
                  <input
                    type="text"
                    required
                    value={bankingForm.accountNo}
                    onChange={(e) =>
                      setBankingForm({
                        ...bankingForm,
                        accountNo: e.target.value.replace(/\s+/g, ""),
                      })
                    }
                    placeholder="vd: 280931081998"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono font-bold text-indigo-700 focus:bg-white focus:border-indigo-500 transition"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5">
                    Tên Chủ Tài Khoản *
                  </label>
                  <input
                    type="text"
                    required
                    value={bankingForm.accountName}
                    onChange={(e) =>
                      setBankingForm({
                        ...bankingForm,
                        accountName: e.target.value.toUpperCase(),
                      })
                    }
                    placeholder="vd: TOEIC MR.NAM"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold uppercase text-slate-900 focus:bg-white focus:border-indigo-500 transition"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5">
                  Mẫu Giao Diện Hiển Thị Mã QR
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {VIETQR_TEMPLATES.map((tpl) => {
                    const isSelected = bankingForm.template === tpl.id;
                    return (
                      <div
                        key={tpl.id}
                        onClick={() => setBankingForm({ ...bankingForm, template: tpl.id })}
                        className={`p-3 rounded-2xl border cursor-pointer transition flex flex-col justify-between ${
                          isSelected
                            ? "bg-indigo-50/70 border-indigo-500 ring-2 ring-indigo-200"
                            : "bg-slate-50 border-slate-200 hover:bg-slate-100"
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-bold text-slate-900">{tpl.name}</span>
                          {isSelected && <span className="text-indigo-600 text-xs font-bold">● Chọn</span>}
                        </div>
                        <p className="text-[11px] text-slate-500 leading-tight">{tpl.description}</p>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5">
                  Cú Pháp Nội Dung Chuyển Khoản Mặc Định
                </label>
                <input
                  type="text"
                  value={bankingForm.defaultTransferSyntax || "HP {{ma_hoc_vien}} {{ma_lop}}"}
                  onChange={(e) =>
                    setBankingForm({ ...bankingForm, defaultTransferSyntax: e.target.value })
                  }
                  placeholder="HP {{ma_hoc_vien}} {{ma_lop}}"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono text-slate-800 focus:bg-white focus:border-indigo-500 transition"
                />
                <div className="flex items-center gap-2 mt-1.5 text-[11px] text-slate-400">
                  <span>Gợi ý biến:</span>
                  <span className="px-1.5 py-0.5 bg-slate-100 rounded text-slate-600 font-mono">{"{{ma_hoc_vien}}"}</span>
                  <span className="px-1.5 py-0.5 bg-slate-100 rounded text-slate-600 font-mono">{"{{ma_lop}}"}</span>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
                <button
                  type="submit"
                  disabled={savingBanking}
                  className="px-6 py-2.5 bg-[#00b4d8] hover:bg-[#0096c7] text-white rounded-xl text-xs font-heading font-bold uppercase tracking-wider transition shadow-md shadow-[#00b4d8]/25 flex items-center gap-2 disabled:opacity-60 active:translate-y-px"
                >
                  <span>💾</span>
                  <span>{savingBanking ? "Đang lưu..." : "Lưu Cấu Hình Ngân Hàng"}</span>
                </button>
              </div>
            </form>
          </div>

          {/* Right Column: Live VietQR Simulator (5 cols) */}
          <div className="lg:col-span-5 space-y-4">
            <div className="bg-gradient-to-b from-[#1e2738] to-[#151b26] rounded-3xl p-6 text-white border border-slate-700 shadow-xl flex flex-col items-center text-center">
              <div className="w-full flex items-center justify-between pb-3 border-b border-slate-750 mb-4">
                <span className="text-xs font-heading font-bold text-[#00b4d8] uppercase flex items-center gap-1.5">
                  <span>📱</span> Trình Quét Thử VietQR Trực Tiếp
                </span>
                <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-300 rounded text-[10px] font-bold">
                  Live Preview
                </span>
              </div>

              {/* QR Code Container */}
              <div className="bg-white p-3.5 rounded-2xl shadow-2xl border border-slate-200 max-w-[260px] w-full flex items-center justify-center transition-all duration-300">
                <img
                  src={previewQrUrl}
                  alt="Mã QR VietQR thử nghiệm"
                  className="w-full h-auto object-contain rounded-lg"
                  onError={(e) => {
                    e.target.onerror = null;
                    e.target.src = "https://via.placeholder.com/260?text=Loi+Sinh+QR";
                  }}
                />
              </div>

              {/* Simulator Controls */}
              <div className="w-full mt-5 space-y-3 text-left">
                <div>
                  <label className="block text-[11px] font-bold text-indigo-200 uppercase mb-1">
                    Nhập thử số tiền:
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      value={testAmount}
                      onChange={(e) => setTestAmount(Number(e.target.value) || 0)}
                      className="w-full px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-xl text-xs font-bold text-amber-300 focus:outline-none"
                    />
                    <span className="text-xs font-bold text-slate-300">₫</span>
                  </div>
                  {/* Quick Chips */}
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {[500000, 1500000, 3000000, 4500000].map((amt) => (
                      <button
                        key={amt}
                        type="button"
                        onClick={() => setTestAmount(amt)}
                        className="px-2 py-0.5 bg-slate-800/80 hover:bg-indigo-700 rounded text-[10px] font-semibold text-slate-200 transition"
                      >
                        {amt.toLocaleString("vi-VN")} đ
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-indigo-200 uppercase mb-1">
                    Nhập thử nội dung chuyển khoản:
                  </label>
                  <input
                    type="text"
                    value={testDescription}
                    onChange={(e) => setTestDescription(e.target.value)}
                    className="w-full px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-xl text-xs font-mono text-white focus:outline-none"
                  />
                </div>

                <div className="pt-3 border-t border-slate-800 flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={handleCopyQrLink}
                    className="flex-1 py-2 px-3 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5"
                  >
                    <span>🔗</span>
                    <span>{copiedLink ? "Đã sao chép link!" : "Copy Link QR"}</span>
                  </button>

                  <a
                    href={previewQrUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="py-2 px-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5"
                  >
                    <span>↗</span>
                    <span>Xem Toàn Màn Hình</span>
                  </a>
                </div>
              </div>

              <div className="mt-4 p-2.5 bg-amber-500/10 border border-amber-500/30 rounded-xl text-[11px] text-amber-200 leading-relaxed text-left w-full">
                🔍 <strong>Mẹo kiểm tra:</strong> Bạn có thể mở ứng dụng Ngân hàng trên điện thoại (VCB Digibank, Techcombank, MB...) và quét thử mã QR ở trên để đảm bảo đúng tên thụ hưởng <strong>{bankingForm.accountName}</strong>.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 4. SUB-TAB: CA DẠY & KHUNG GIỜ                                            */}
      {/* ========================================================================= */}
      {activeSubTab === "teaching-shifts" && (
        <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-sm transition-opacity duration-300">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-5 border-b border-slate-100 mb-6 gap-3">
            <div>
              <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                <span>⏰</span> Quản Lý Các Ca Dạy Của Trung Tâm
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Các khung giờ ca học này sẽ tự động hiển thị trong menu chọn ca khi Quản trị viên mở lớp mới.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleResetShifts}
                className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-xs font-bold transition"
              >
                Khôi Phục Mặc Định
              </button>

              <button
                type="button"
                onClick={handleAddShift}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5"
              >
                <span>+</span>
                <span>Thêm Ca Học</span>
              </button>

              <button
                type="button"
                onClick={handleSaveShifts}
                disabled={savingShifts}
                className="px-5 py-2.5 bg-[#00b4d8] hover:bg-[#0096c7] text-white rounded-xl text-xs font-heading font-bold uppercase tracking-wider transition shadow-sm flex items-center gap-1.5 disabled:opacity-60 active:translate-y-px"
              >
                <span>💾</span>
                <span>{savingShifts ? "Đang lưu..." : "Lưu Ca Dạy"}</span>
              </button>
            </div>
          </div>

          {shiftsSaveSuccess && (
            <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 rounded-2xl text-xs font-bold text-emerald-800 flex items-center gap-2 animate-pulse">
              <span>✓</span> Đã lưu danh sách ca dạy thành công vào hệ thống!
            </div>
          )}

          <div className="space-y-3">
            {shiftsList.map((shift, index) => (
              <div
                key={shift.id || index}
                className="p-4 bg-slate-50 rounded-2xl border border-slate-200 flex flex-col md:flex-row items-center justify-between gap-4"
              >
                <div className="flex items-center gap-3 w-full md:w-auto">
                  <span className="w-8 h-8 rounded-xl bg-indigo-100 text-indigo-700 font-extrabold text-xs flex items-center justify-center shrink-0">
                    {index + 1}
                  </span>
                  <input
                    type="text"
                    value={shift.name}
                    onChange={(e) => handleShiftChange(index, "name", e.target.value)}
                    placeholder="Tên ca học (vd: Ca Tối 1)"
                    className="px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:border-indigo-500 w-full md:w-48"
                  />
                </div>

                <div className="flex items-center gap-3 w-full md:w-auto justify-end">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-500 font-medium">Bắt đầu:</span>
                    <input
                      type="time"
                      value={shift.startTime}
                      onChange={(e) => handleShiftChange(index, "startTime", e.target.value)}
                      className="px-2.5 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-800"
                    />
                  </div>

                  <span className="text-slate-400 font-bold">&rarr;</span>

                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-500 font-medium">Kết thúc:</span>
                    <input
                      type="time"
                      value={shift.endTime}
                      onChange={(e) => handleShiftChange(index, "endTime", e.target.value)}
                      className="px-2.5 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-800"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={() => handleRemoveShift(index)}
                    className="p-2 text-rose-500 hover:bg-rose-50 rounded-xl transition"
                    title="Xóa ca này"
                  >
                    ✕
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 5. SUB-TAB: TỰ ĐỘNG HÓA & API INTEGRATIONS                                 */}
      {/* ========================================================================= */}
      {activeSubTab === "integrations" && (
        <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-sm space-y-6 transition-opacity duration-300">
          {/* Top action header */}
          <div className="pb-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                <span>⚡</span> Tích Hợp Google Apps Script & Tự Động Hóa (Free Tier)
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Cung cấp máy chủ kết nối trung gian hoàn toàn miễn phí (0 GCP Billing) để tự động tạo Google Classroom và gửi Gmail.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleCopyGasCode}
                className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition flex items-center gap-1.5"
                title="Sao chép toàn bộ mã nguồn Code.gs chuẩn vào bộ nhớ đệm"
              >
                <span>{copiedGasCode ? "✓" : "📋"}</span>
                <span>{copiedGasCode ? "Đã copy Code.gs!" : "Sao Chép Code.gs"}</span>
              </button>

              <button
                type="button"
                onClick={handleTestPing}
                disabled={testingPing}
                className="px-4 py-2 bg-[#00b4d8] hover:bg-[#0096c7] text-white rounded-xl text-xs font-heading font-bold uppercase tracking-wider transition flex items-center gap-1.5 shadow-sm disabled:opacity-60 active:translate-y-px"
              >
                <span>🧪</span>
                <span>{testingPing ? "Đang kiểm tra..." : "Kiểm Tra Kết Nối (Ping Test)"}</span>
              </button>
            </div>
          </div>

          {/* Diagnostic Alert Box */}
          {pingStatus && (
            <div
              className={`p-5 rounded-2xl border text-xs leading-relaxed transition-all ${
                pingStatus.success
                  ? "bg-emerald-50 border-emerald-200 text-emerald-900 shadow-sm"
                  : "bg-amber-50/80 border-amber-300 text-amber-950 shadow-sm"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-2.5">
                  <span className="text-base">{pingStatus.success ? "✅" : "⚠️"}</span>
                  <div className="space-y-1">
                    <p className="font-extrabold text-sm">
                      {pingStatus.success
                        ? "Kết Nối Web App Thành Công Rực Rỡ!"
                        : "Lỗi Kết Nối Đến Google Apps Script (Failed to fetch)"}
                    </p>
                    <p className="text-xs opacity-90">
                      {pingStatus.success
                        ? "Phản hồi từ Google Apps Script: " + JSON.stringify(pingStatus.data)
                        : pingStatus.error}
                    </p>
                  </div>
                </div>
                <span className="text-[11px] opacity-70 shrink-0 font-mono">Lúc: {pingStatus.time}</span>
              </div>

              {!pingStatus.success && (
                <div className="mt-4 pt-3.5 border-t border-amber-200/80 space-y-2.5 text-xs text-amber-900">
                  <div className="font-bold flex items-center gap-1.5 text-amber-900">
                    <span>💡</span>
                    <span>NGUYÊN NHÂN & CÁCH KHẮC PHỤC CHỈ TRONG 30 GIÂY:</span>
                  </div>
                  <p className="text-[12px] text-amber-800">
                    Khi kiểm tra từ máy chủ, Google trả về: <strong>"Không tìm thấy hàm tập lệnh: doPost"</strong>.
                    Lỗi này xảy ra vì bản triển khai Web App hiện tại đang chạy ở <strong>phiên bản cũ (Version 1)</strong> trước khi có mã xử lý.
                    Trình duyệt nhận trang báo lỗi của Google và chặn CORS gây ra lỗi <code>Failed to fetch</code>.
                  </p>
                  <div className="bg-white/80 p-3.5 rounded-xl border border-amber-200 space-y-2 text-slate-800 font-medium">
                    <p className="font-bold text-indigo-700">📌 Các bước cập nhật rất đơn giản:</p>
                    <ol className="list-decimal list-inside space-y-1.5 text-xs text-slate-700 pl-1">
                      <li>
                        Bấm nút <strong>"Sao Chép Code.gs"</strong> ở trên để copy toàn bộ mã backend chuẩn.
                      </li>
                      <li>
                        Mở dự án tại{" "}
                        <a
                          href="https://script.google.com"
                          target="_blank"
                          rel="noreferrer"
                          className="text-indigo-600 underline font-bold"
                        >
                          script.google.com
                        </a>{" "}
                        và dán đè vào file <code>Code.gs</code>, sau đó bấm <strong>Lưu (Ctrl + S)</strong>.
                      </li>
                      <li>
                        Bấm nút xanh <strong>Triển khai (Deploy)</strong> ở góc trên bên phải &rarr; Chọn{" "}
                        <strong>Quản lý các bản triển khai (Manage deployments)</strong>.
                      </li>
                      <li>
                        Bấm biểu tượng ✏️ <strong>Chỉnh sửa (Cây bút chì)</strong> tại bản Web App.
                      </li>
                      <li>
                        Tại dòng <strong>Phiên bản (Version)</strong>, bấm chọn:{" "}
                        <strong className="text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded">Phiên bản mới (New version)</strong>{" "}
                        <em>(Bước bắt buộc để Google nạp hàm doPost mới)</em>.
                      </li>
                      <li>
                        Đảm bảo mục Quyền truy cập là <strong>Bất kỳ ai (Anyone)</strong> rồi bấm <strong>Triển khai (Deploy)</strong>.
                      </li>
                    </ol>
                    <p className="text-[11px] text-slate-500 italic pt-1">
                      Sau khi tạo Phiên bản mới xong, bạn quay lại đây bấm <strong>"Kiểm Tra Kết Nối (Ping Test)"</strong> là sẽ nhận kết quả xanh ngay!
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* GAS Configuration Form */}
          <div className="bg-slate-50 rounded-2xl border border-slate-200 p-5 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div>
                <h4 className="text-xs font-bold text-slate-800 uppercase flex items-center gap-1.5">
                  <span>🔗</span> Cấu Hình Đường Dẫn Web App & Khóa Bảo Mật
                </h4>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Bạn có thể cập nhật Web App URL mới tại đây bất cứ lúc nào mà không cần chỉnh sửa code hay build lại web.
                </p>
              </div>

              {gasSaveSuccess && (
                <span className="px-2.5 py-1 bg-emerald-100 text-emerald-700 rounded-lg text-xs font-bold animate-pulse">
                  ✓ Đã lưu cấu hình!
                </span>
              )}
            </div>

            <form onSubmit={handleSaveGas} className="space-y-4">
              <div>
                <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                  Google Apps Script Web App URL *
                </label>
                <input
                  type="url"
                  required
                  value={gasForm.webAppUrl}
                  onChange={(e) => setGasForm({ ...gasForm, webAppUrl: e.target.value })}
                  placeholder="https://script.google.com/macros/s/AKfycb.../exec"
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-mono text-slate-900 focus:border-indigo-500 transition"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                    Mã Khóa Bảo Mật (API Secret) *
                  </label>
                  <input
                    type="text"
                    required
                    value={gasForm.apiSecret}
                    onChange={(e) => setGasForm({ ...gasForm, apiSecret: e.target.value })}
                    placeholder="TheArchangel"
                    className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-xs font-mono font-bold text-indigo-700 focus:border-indigo-500 transition"
                  />
                </div>

                <div className="flex items-end justify-end gap-2.5">
                  <a
                    href="https://script.google.com"
                    target="_blank"
                    rel="noreferrer"
                    className="px-4 py-2.5 bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 rounded-xl text-xs font-bold transition flex items-center gap-1.5"
                  >
                    <span>↗</span>
                    <span>Mở Google Apps Script</span>
                  </a>

                  <button
                    type="submit"
                    disabled={savingGas}
                    className="px-5 py-2.5 bg-[#00b4d8] hover:bg-[#0096c7] text-white rounded-xl text-xs font-heading font-bold uppercase tracking-wider transition shadow-sm flex items-center gap-1.5 disabled:opacity-60 active:translate-y-px"
                  >
                    <span>💾</span>
                    <span>{savingGas ? "Đang lưu..." : "Lưu Cấu Hình GAS"}</span>
                  </button>
                </div>
              </div>
            </form>
          </div>

          {/* Feature Integrations Info Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-5 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800">🏫 Google Classroom</span>
                <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded text-[10px] font-bold">
                  Sẵn sàng
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Tự động tạo lớp Google Classroom, mời học viên, và đồng bộ kéo điểm các bài tập / bài kiểm tra về Student Portal & bảng điểm giáo viên.
              </p>
            </div>

            <div className="p-5 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800">📨 Gmail Dispatcher</span>
                <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded text-[10px] font-bold">
                  Sẵn sàng
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Tự động gửi email cá nhân hóa (HTML đẹp mắt) thông báo ngày khai giảng, ca học và link lớp học.
              </p>
            </div>

            <div className="p-5 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800">🔥 Cloud Firestore</span>
                <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded text-[10px] font-bold">
                  Rules Live
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Đồng bộ bảo mật theo thời gian thực (Real-time). Lưu trữ dữ liệu học viên, ca dạy và mẫu email.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 6. SUB-TAB: BANNER THÔNG BÁO TỔNG (GLOBAL ANNOUNCEMENT BANNER)            */}
      {/* ========================================================================= */}
      {activeSubTab === "announcement-banner" && (
        <div className="space-y-6">
          <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-slate-200 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-5">
              <div>
                <h3 className="text-lg font-heading font-bold text-slate-800 flex items-center gap-2">
                  <span>📢</span>
                  <span>Quản Lý Banner Thông Báo Toàn Hệ Thống</span>
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  Hiển thị thông báo khẩn cấp, lịch nghỉ lễ, ưu đãi hoặc lịch thi thử trên đầu trang của toàn bộ người dùng.
                </p>
              </div>

              {/* Status Badge */}
              <div className="flex items-center gap-2">
                <span
                  className={`px-3 py-1 rounded-full text-xs font-heading font-bold uppercase tracking-wider flex items-center gap-1.5 ${
                    announcementForm.enabled && announcementForm.content?.trim()
                      ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                      : "bg-slate-100 text-slate-600 border border-slate-200"
                  }`}
                >
                  <span
                    className={`w-2 h-2 rounded-full ${
                      announcementForm.enabled && announcementForm.content?.trim()
                        ? "bg-emerald-500 animate-pulse"
                        : "bg-slate-400"
                    }`}
                  ></span>
                  <span>
                    {announcementForm.enabled && announcementForm.content?.trim()
                      ? "Đang hiển thị trực tiếp"
                      : "Đang ẩn (Không chiếm diện tích)"}
                  </span>
                </span>
              </div>
            </div>

            {/* Form */}
            <form onSubmit={handleSaveAnnouncement} className="space-y-6">
              {/* Toggle Switch */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between gap-4">
                <div className="space-y-0.5">
                  <label className="text-sm font-heading font-bold text-slate-800 cursor-pointer" htmlFor="toggle-banner">
                    Bật hiển thị Banner thông báo
                  </label>
                  <p className="text-xs text-slate-500">
                    Nếu tắt hoặc nội dung trống, banner sẽ ẩn hoàn toàn và không chiếm bất kỳ diện tích giao diện nào.
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer shrink-0">
                  <input
                    id="toggle-banner"
                    type="checkbox"
                    checked={!!announcementForm.enabled}
                    onChange={(e) =>
                      setAnnouncementForm({ ...announcementForm, enabled: e.target.checked })
                    }
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#00b4d8]"></div>
                </label>
              </div>

              {/* Content Textarea */}
              <div className="space-y-1.5">
                <label className="text-xs font-heading font-bold uppercase tracking-wider text-slate-700 block">
                  Nội Dung Thông Báo *
                </label>
                <textarea
                  rows={3}
                  value={announcementForm.content}
                  onChange={(e) =>
                    setAnnouncementForm({ ...announcementForm, content: e.target.value })
                  }
                  placeholder="Ví dụ: 📢 Lịch nghỉ lễ và dời lịch học bù: Toàn bộ các lớp 2-4-6 và 3-5-7 sẽ nghỉ ngày 30/4, lịch học bù bắt đầu từ tuần kế tiếp. Chúc các bạn học viên kỳ nghỉ vui vẻ!"
                  className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#00b4d8]/20 focus:border-[#00b4d8] leading-relaxed"
                />
              </div>

              {/* Notification Type / Color Selection */}
              <div className="space-y-2">
                <label className="text-xs font-heading font-bold uppercase tracking-wider text-slate-700 block">
                  Phân Loại Thông Báo & Màu Sắc
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {[
                    { id: "info", label: "Thông Báo Chuẩn (Xanh dương)", icon: "📢", color: "bg-[#0077b6] text-white" },
                    { id: "warning", label: "Lưu Ý Quan Trọng (Vàng hổ phách)", icon: "⚠️", color: "bg-amber-600 text-white" },
                    { id: "alert", label: "Khẩn Cấp / Báo Động (Đỏ)", icon: "🚨", color: "bg-rose-700 text-white" },
                    { id: "success", label: "Tin Vui / Chúc Mừng (Xanh lục)", icon: "🎉", color: "bg-emerald-700 text-white" },
                  ].map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setAnnouncementForm({ ...announcementForm, type: item.id })}
                      className={`p-3 rounded-xl border text-left flex items-center gap-2.5 transition cursor-pointer ${
                        announcementForm.type === item.id
                          ? "border-[#00b4d8] ring-2 ring-[#00b4d8]/30 bg-slate-50 font-bold"
                          : "border-slate-200 hover:border-slate-300 bg-white"
                      }`}
                    >
                      <span className="text-lg">{item.icon}</span>
                      <div className="min-w-0">
                        <span className="text-xs font-semibold text-slate-800 block truncate">
                          {item.label}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Optional Link & Button Text */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-heading font-bold uppercase tracking-wider text-slate-700 block">
                    Nhãn Nút Bấm Liên Kết (Tùy chọn)
                  </label>
                  <input
                    type="text"
                    value={announcementForm.linkText || ""}
                    onChange={(e) =>
                      setAnnouncementForm({ ...announcementForm, linkText: e.target.value })
                    }
                    placeholder="Ví dụ: Xem chi tiết &rarr;"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:outline-none focus:border-[#00b4d8]"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-heading font-bold uppercase tracking-wider text-slate-700 block">
                    Đường Dẫn URL (Tùy chọn)
                  </label>
                  <input
                    type="text"
                    value={announcementForm.linkUrl || ""}
                    onChange={(e) =>
                      setAnnouncementForm({ ...announcementForm, linkUrl: e.target.value })
                    }
                    placeholder="https://... hoặc #placement-test"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:outline-none focus:border-[#00b4d8] font-mono"
                  />
                </div>
              </div>

              {/* LIVE PREVIEW SECTION */}
              <div className="space-y-2 pt-2">
                <span className="text-xs font-heading font-bold uppercase tracking-wider text-slate-500 block">
                  Xem Trước Trực Quan (Live Preview)
                </span>
                <div className="p-4 bg-slate-100 rounded-2xl border border-slate-200 space-y-2">
                  {announcementForm.enabled && announcementForm.content?.trim() ? (
                    <div
                      className={`p-3.5 rounded-xl shadow-md text-white flex items-center justify-between gap-3 text-xs sm:text-sm ${
                        announcementForm.type === "warning"
                          ? "bg-gradient-to-r from-amber-600 via-amber-500 to-amber-600"
                          : announcementForm.type === "alert"
                          ? "bg-gradient-to-r from-rose-700 via-rose-600 to-rose-700"
                          : announcementForm.type === "success"
                          ? "bg-gradient-to-r from-emerald-700 via-emerald-600 to-emerald-700"
                          : "bg-gradient-to-r from-[#0077b6] via-[#0096c7] to-[#00b4d8]"
                      }`}
                    >
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <span className="text-lg">
                          {announcementForm.type === "warning"
                            ? "⚠️"
                            : announcementForm.type === "alert"
                            ? "🚨"
                            : announcementForm.type === "success"
                            ? "🎉"
                            : "📢"}
                        </span>
                        <span className="font-semibold truncate">
                          {announcementForm.content}
                        </span>
                        {announcementForm.linkText && (
                          <span className="shrink-0 ml-2 px-2.5 py-0.5 rounded-full bg-white text-slate-900 font-bold text-xs shadow-xs">
                            {announcementForm.linkText}
                          </span>
                        )}
                      </div>
                      <span className="text-white/70 text-xs">✕</span>
                    </div>
                  ) : (
                    <div className="py-6 text-center text-xs text-slate-400 italic">
                      Banner đang tắt hoặc chưa có nội dung. Người dùng sẽ không nhìn thấy bất kỳ thanh thông báo nào trên màn hình.
                    </div>
                  )}
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                <div>
                  {announcementSaveSuccess && (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-100 text-emerald-800 rounded-lg text-xs font-bold animate-fadeIn">
                      ✓ Đã lưu banner thông báo thành công và áp dụng trực tiếp!
                    </span>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={savingAnnouncement}
                  className="px-6 py-2.5 bg-[#00b4d8] hover:bg-[#0096c7] text-white rounded-xl text-xs font-heading font-bold uppercase tracking-wider shadow-sm transition cursor-pointer disabled:opacity-60 flex items-center gap-2"
                >
                  <span>💾</span>
                  <span>{savingAnnouncement ? "Đang lưu..." : "Lưu Banner Thông Báo"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 7. SUB-TAB: QUY ĐỊNH LỚP HỌC (CLASSROOM RULES & REGULATIONS)             */}
      {/* ========================================================================= */}
      {activeSubTab === "classroom-rules" && (
        <div className="space-y-6">
          <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-slate-200 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-5">
              <div>
                <h3 className="text-lg font-heading font-bold text-slate-800 flex items-center gap-2">
                  <span>📜</span>
                  <span>Quản Lý Quy Định & Nội Quy Lớp Học</span>
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  Chỉnh sửa các điều khoản nội quy chuyên cần, làm bài tập, tác phong và chính sách bảo lưu hiển thị trên Student Portal của học viên.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleAddRuleSection}
                  className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-heading font-bold uppercase tracking-wider transition flex items-center gap-1.5 cursor-pointer"
                >
                  <span>➕</span>
                  <span>Thêm Mục Mới</span>
                </button>
              </div>
            </div>

            <form onSubmit={handleSaveRules} className="space-y-6">
              {/* Header Title & Subtitle */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-heading font-bold uppercase tracking-wider text-slate-700 block">
                    Tiêu Đề Chính *
                  </label>
                  <input
                    type="text"
                    required
                    value={rulesForm.title || ""}
                    onChange={(e) => setRulesForm({ ...rulesForm, title: e.target.value })}
                    placeholder="Quy Định & Nội Quy Lớp Học"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:outline-none focus:border-[#00b4d8]"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-heading font-bold uppercase tracking-wider text-slate-700 block">
                    Mô Tả / Tiêu Đề Phụ
                  </label>
                  <input
                    type="text"
                    value={rulesForm.subtitle || ""}
                    onChange={(e) => setRulesForm({ ...rulesForm, subtitle: e.target.value })}
                    placeholder="Áp dụng cho toàn bộ học viên các khóa học..."
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:outline-none focus:border-[#00b4d8]"
                  />
                </div>
              </div>

              {/* Sections List */}
              <div className="space-y-6">
                {(rulesForm.sections || []).map((sec, secIdx) => (
                  <div
                    key={sec.id || secIdx}
                    className="p-5 bg-slate-50 rounded-2xl border border-slate-200 space-y-4 relative"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200/60 pb-3">
                      <div className="flex items-center gap-3 flex-1">
                        <select
                          value={sec.icon || "verified"}
                          onChange={(e) => {
                            const updated = [...rulesForm.sections];
                            updated[secIdx].icon = e.target.value;
                            setRulesForm({ ...rulesForm, sections: updated });
                          }}
                          className="px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs"
                        >
                          <option value="calendar">📅 Lịch / Chuyên cần</option>
                          <option value="assignment">📝 Bài tập / Thi thử</option>
                          <option value="verified">🛡️ Kỷ luật / Tác phong</option>
                          <option value="policy">💳 Học phí / Bảo lưu</option>
                        </select>

                        <input
                          type="text"
                          value={sec.title || ""}
                          onChange={(e) => handleUpdateSectionTitle(secIdx, e.target.value)}
                          placeholder="Tiêu đề mục (ví dụ: 1. Chuyên cần & Điểm danh)"
                          className="flex-1 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-heading font-bold text-slate-800"
                        />
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleAddRuleItem(secIdx)}
                          className="px-2.5 py-1 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-lg text-[11px] font-semibold transition cursor-pointer"
                        >
                          + Thêm Điều Khoản
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRemoveRuleSection(secIdx)}
                          className="px-2.5 py-1 text-rose-600 hover:bg-rose-50 border border-rose-200 rounded-lg text-[11px] font-semibold transition cursor-pointer"
                        >
                          Xóa Mục
                        </button>
                      </div>
                    </div>

                    {/* Rules Bullet Points */}
                    <div className="space-y-2">
                      {(sec.rules || []).map((rule, rIdx) => (
                        <div key={rIdx} className="flex items-start gap-2">
                          <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-xs font-bold shrink-0 mt-1">
                            ✓
                          </span>
                          <textarea
                            rows={2}
                            value={rule}
                            onChange={(e) => handleUpdateRuleItem(secIdx, rIdx, e.target.value)}
                            className="flex-1 p-2 bg-white border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:border-[#00b4d8] leading-relaxed"
                          />
                          <button
                            type="button"
                            onClick={() => handleRemoveRuleItem(secIdx, rIdx)}
                            className="p-2 text-slate-400 hover:text-rose-600 transition"
                            title="Xóa điều khoản này"
                          >
                            ✕
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              {/* Submit Button */}
              <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                <div>
                  {rulesSaveSuccess && (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-100 text-emerald-800 rounded-lg text-xs font-bold animate-fadeIn">
                      ✓ Đã lưu Quy Định Lớp Học thành công! Học viên có thể xem ngay trên Student Portal.
                    </span>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={savingRules}
                  className="px-6 py-2.5 bg-[#00b4d8] hover:bg-[#0096c7] text-white rounded-xl text-xs font-heading font-bold uppercase tracking-wider shadow-sm transition cursor-pointer disabled:opacity-60 flex items-center gap-2"
                >
                  <span>💾</span>
                  <span>{savingRules ? "Đang lưu..." : "Lưu Quy Định Lớp Học"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default WebsiteAdminPage;
