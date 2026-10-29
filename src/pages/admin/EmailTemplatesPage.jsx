import React, { useState, useEffect } from "react";
import { EmailEditor } from "../../components/common/EmailEditor";
import {
  subscribeEmailTemplates,
  saveEmailTemplate,
  deleteEmailTemplate,
  resetDefaultEmailTemplates,
  buildVariableMap,
  replaceVariables,
  wrapEmailInHtml,
} from "../../services/emailService";
import { CENTER_CONFIG } from "../../config/appConfig";
import { sendEmailNotification } from "../../services/api";
import { useLanguage } from "../../context/LanguageContext";
import { useSettings } from "../../context/SettingsContext";

export const EmailTemplatesPage = () => {
  const { t, lang } = useLanguage();
  const { centerConfig } = useSettings();
  const currentAdminEmail = centerConfig?.adminEmail || CENTER_CONFIG.adminEmail;
  const currentCenterName = centerConfig?.centerName || CENTER_CONFIG.centerName;

  const [templates, setTemplates] = useState([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState("");
  const [activeTemplate, setActiveTemplate] = useState(null);
  const [subject, setSubject] = useState("");
  const [content, setContent] = useState("");
  const [templateName, setTemplateName] = useState("");
  const [templateDescription, setTemplateDescription] = useState("");
  const [templateIcon, setTemplateIcon] = useState("✉️");

  const [saving, setSaving] = useState(false);
  const [sendingTest, setSendingTest] = useState(false);
  const [testSentSuccess, setTestSentSuccess] = useState(false);
  const [isCreatingNew, setIsCreatingNew] = useState(false);

  // Subscribe to templates
  useEffect(() => {
    const unsub = subscribeEmailTemplates((tpls) => {
      setTemplates(tpls);
      if (tpls.length > 0 && !selectedTemplateId) {
        selectTemplate(tpls[0]);
      } else if (selectedTemplateId) {
        const found = tpls.find((t) => t.id === selectedTemplateId);
        if (found) selectTemplate(found);
      }
    });
    return () => unsub();
  }, [selectedTemplateId]);

  const selectTemplate = (tpl) => {
    setIsCreatingNew(false);
    setSelectedTemplateId(tpl.id);
    setActiveTemplate(tpl);
    setTemplateName(tpl.name || "");
    setTemplateDescription(tpl.description || "");
    setTemplateIcon(tpl.icon || "✉️");
    setSubject(tpl.subject || "");
    setContent(tpl.content || "");
  };

  const handleStartCreateNew = () => {
    setIsCreatingNew(true);
    setSelectedTemplateId("");
    setActiveTemplate(null);
    setTemplateName("Mẫu Email Mới");
    setTemplateDescription("Mô tả mục đích sử dụng của mẫu email này...");
    setTemplateIcon("📝");
    setSubject(`[${CENTER_CONFIG.centerName}] Tiêu đề email mới`);
    setContent(`
<p>Chào bạn <strong>{{ten_hoc_vien}}</strong>,</p>
<p>Trung tâm <strong>{{ten_trung_tam}}</strong> xin gửi thông báo đến bạn...</p>
<div style="background-color: #f1f5f9; padding: 14px 18px; border-radius: 8px; margin: 16px 0;">
  <p style="margin: 0;">Nội dung chi tiết...</p>
</div>
<p>Trân trọng,<br><strong>{{ten_trung_tam}}</strong></p>
    `.trim());
  };

  const handleSaveCurrent = async () => {
    if (!templateName.trim()) {
      alert("Vui lòng nhập tên mẫu email.");
      return;
    }
    if (!subject.trim()) {
      alert("Vui lòng nhập tiêu đề email.");
      return;
    }

    setSaving(true);
    try {
      const templateToSave = {
        id: isCreatingNew ? `custom_${Date.now()}` : activeTemplate?.id || `tpl_${Date.now()}`,
        name: templateName.trim(),
        description: templateDescription.trim(),
        icon: templateIcon || "✉️",
        subject: subject.trim(),
        content: content.trim(),
        isBuiltIn: !isCreatingNew && activeTemplate?.isBuiltIn,
      };

      const updated = await saveEmailTemplate(templateToSave);
      if (updated && updated.length > 0) {
        setTemplates(updated);
      }
      setIsCreatingNew(false);
      setSelectedTemplateId(templateToSave.id);
      alert("Đã lưu mẫu email thành công!");
    } catch (err) {
      alert("Lỗi khi lưu mẫu email: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteTemplate = async (templateId, name) => {
    if (window.confirm(`Bạn có chắc chắn muốn xóa mẫu email "${name}"?`)) {
      try {
        const updated = await deleteEmailTemplate(templateId);
        if (updated) {
          setTemplates(updated);
          if (updated.length > 0) {
            selectTemplate(updated[0]);
          }
        }
      } catch (err) {
        alert("Lỗi khi xóa mẫu: " + err.message);
      }
    }
  };

  const handleResetDefaults = async () => {
    if (
      window.confirm(
        "Bạn có chắc muốn khôi phục danh sách mẫu email về mặc định ban đầu của hệ thống?"
      )
    ) {
      try {
        const defaults = await resetDefaultEmailTemplates();
        if (defaults) {
          setTemplates(defaults);
          if (defaults.length > 0) {
            selectTemplate(defaults[0]);
          }
        }
        alert("Đã khôi phục các mẫu mặc định thành công!");
      } catch (err) {
        alert("Lỗi khôi phục mẫu: " + err.message);
      }
    }
  };

  // Send Test Email to Admin
  const handleSendTestToAdmin = async () => {
    if (!currentAdminEmail) {
      alert("Chưa cấu hình Email quản trị của trung tâm.");
      return;
    }
    setSendingTest(true);
    setTestSentSuccess(false);

    try {
      const dummyStudent = {
        fullName: "Nguyễn Văn An",
        studentId: "HV_TEST_01",
        email: "test.student@example.com",
        phone: "0912 345 678",
      };
      const dummyClass = {
        name: "TOEIC Target 550 - K01",
        code: "TO55001",
        startDate: "2026-10-15",
        schedule: "Thứ 2 - 4 - 6 (18:00 - 19:30)",
        teacherName: "Thầy Nam",
        tuitionFee: 4500000,
        integrations: {
          googleClassroom: { alternateLink: "https://classroom.google.com" },
          googleDrive: { folderLink: "https://drive.google.com" },
        },
      };

      const varMap = buildVariableMap(dummyStudent, dummyClass);
      const testSubject = `[TEST GỬI THỬ] ${replaceVariables(subject, varMap)}`;
      const testBodyInner = replaceVariables(content, varMap);
      const finalHtml = wrapEmailInHtml({
        title: testSubject,
        contentHtml: testBodyInner,
        centerName: currentCenterName,
        adminEmail: currentAdminEmail,
      });

      await sendEmailNotification({
        to: currentAdminEmail,
        subject: testSubject,
        htmlBody: finalHtml,
        senderName: currentCenterName,
      });

      setTestSentSuccess(true);
      setTimeout(() => setTestSentSuccess(false), 5000);
    } catch (err) {
      alert("Lỗi khi gửi email thử: " + err.message);
    } finally {
      setSendingTest(false);
    }
  };

  const previewData = buildVariableMap(
    { fullName: "Nguyễn Văn An", studentId: "HV_PREVIEW", phone: "0912 345 678" },
    {
      name: "TOEIC Target 550 - K01",
      code: "TO55001",
      startDate: "2026-10-15",
      schedule: "Thứ 2 - 4 - 6 (18:00 - 19:30)",
      teacherName: "Thầy Nam",
      tuitionFee: 4500000,
    }
  );

  return (
    <div className="space-y-6">
      {/* Top Banner & Action Controls */}
      <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900 flex items-center gap-2">
            <span>✉️</span>
            <span>Quản Lý Mẫu Email & Trình Soạn Thảo</span>
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Thiết kế, tùy biến và lưu trữ các mẫu email thông báo khai giảng, nhắc học phí, lịch học và thông báo chung cho toàn hệ thống.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            type="button"
            onClick={handleResetDefaults}
            className="px-3.5 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-xl text-xs font-bold transition shadow-2xs flex items-center gap-1.5"
            title="Khôi phục các mẫu email chuẩn mặc định"
          >
            <span>🔄</span> Khôi phục mặc định
          </button>

          <button
            type="button"
            onClick={handleStartCreateNew}
            className="px-4 py-2.5 bg-[#c27803] hover:bg-[#92400e] text-white rounded-xl text-xs font-heading font-bold uppercase tracking-wider transition shadow-sm flex items-center gap-1.5 active:translate-y-px"
          >
            <span>+</span> Tạo Mẫu Mới
          </button>
        </div>
      </div>

      {/* Main Grid: Template List Sidebar (4 cols) & Editor Canvas (8 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Templates List */}
        <div className="lg:col-span-4 space-y-3">
          <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
              <h3 className="text-xs font-heading font-extrabold text-[#261e16] uppercase flex items-center gap-1.5">
                <span>📑</span> Danh Sách Mẫu Email ({templates.length})
              </h3>
            </div>

            <div className="space-y-2">
              {templates.map((tpl) => {
                const isSelected = !isCreatingNew && selectedTemplateId === tpl.id;

                return (
                  <div
                    key={tpl.id}
                    onClick={() => selectTemplate(tpl)}
                    className={`p-3 rounded-xl border cursor-pointer transition flex items-start justify-between gap-3 ${
                      isSelected
                        ? "bg-cyan-50/60 border-[#c27803] ring-1 ring-[#c27803]/30 shadow-2xs"
                        : "bg-slate-50/60 border-slate-200 hover:bg-white hover:border-slate-300"
                    }`}
                  >
                    <div className="flex items-start gap-2.5 min-w-0">
                      <span className="text-xl shrink-0 mt-0.5">{tpl.icon || "✉️"}</span>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <h4 className="text-xs font-bold text-slate-900 truncate">
                            {tpl.name}
                          </h4>
                          {tpl.isBuiltIn && (
                            <span className="px-1.5 py-0.2 bg-slate-200 text-slate-600 text-[9px] font-bold rounded">
                              Hệ thống
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-500 line-clamp-2 mt-0.5">
                          {tpl.description || tpl.subject}
                        </p>
                      </div>
                    </div>

                    {!tpl.isBuiltIn && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteTemplate(tpl.id, tpl.name);
                        }}
                        className="text-slate-400 hover:text-rose-600 p-1 rounded transition text-xs shrink-0"
                        title="Xóa mẫu này"
                      >
                        🗑️
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Quick Guide Card */}
          <div className="bg-cyan-50/40 border border-[#c27803]/30 rounded-2xl p-4 text-xs text-slate-800 space-y-2">
            <h4 className="font-heading font-bold text-[#261e16] flex items-center gap-1.5 uppercase">
              <span>💡</span> Hướng dẫn sử dụng Biến Động
            </h4>
            <p className="text-[11.5px] text-slate-600 leading-relaxed font-medium">
              Bạn có thể chèn các thẻ như <code>{`{{ten_hoc_vien}}`}</code>, <code>{`{{ngay_khai_giang}}`}</code>, <code>{`{{ca_hoc}}`}</code> vào tiêu đề hoặc nội dung. Khi gửi, hệ thống sẽ tự động điền dữ liệu tương ứng của từng học viên.
            </p>
          </div>
        </div>

        {/* Right Column: Template Meta + Email Editor */}
        <div className="lg:col-span-8 space-y-4">
          {/* Template Details Card */}
          <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
              <div className="sm:col-span-2">
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                  Biểu tượng
                </label>
                <select
                  value={templateIcon}
                  onChange={(e) => setTemplateIcon(e.target.value)}
                  className="w-full px-2.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-base text-center"
                >
                  <option value="🎓">🎓 Khai giảng</option>
                  <option value="⏰">⏰ Nhắc nhở</option>
                  <option value="💳">💳 Học phí</option>
                  <option value="📊">📊 Điểm thi</option>
                  <option value="🏖️">🏖️ Nghỉ học</option>
                  <option value="📢">📢 Thông báo</option>
                  <option value="✉️">✉️ Thư tín</option>
                  <option value="🌟">🌟 Chúc mừng</option>
                </select>
              </div>

              <div className="sm:col-span-6">
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                  Tên mẫu email *
                </label>
                <input
                  type="text"
                  value={templateName}
                  onChange={(e) => setTemplateName(e.target.value)}
                  placeholder="vd: Thông báo khai giảng & Chào mừng"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:bg-white"
                />
              </div>

              <div className="sm:col-span-4">
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                  Mô tả ngắn
                </label>
                <input
                  type="text"
                  value={templateDescription}
                  onChange={(e) => setTemplateDescription(e.target.value)}
                  placeholder="Mục đích sử dụng của mẫu..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 focus:bg-white"
                />
              </div>
            </div>
          </div>

          {/* Integrated Email Editor */}
          <EmailEditor
            subject={subject}
            onSubjectChange={setSubject}
            content={content}
            onChange={setContent}
            previewData={previewData}
            showTemplateSelector={false}
          />

          {/* Action Footer */}
          <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={sendingTest}
                onClick={handleSendTestToAdmin}
                className="px-4 py-2 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl text-xs font-bold transition flex items-center gap-1.5 disabled:opacity-50"
                title={`Gửi bản xem trước đến email: ${currentAdminEmail}`}
              >
                <span>🧪</span>
                <span>{sendingTest ? "Đang gửi..." : "Gửi thử tới Email Admin"}</span>
              </button>

              {testSentSuccess && (
                <span className="text-xs font-bold text-emerald-600 flex items-center gap-1 animate-pulse">
                  <span>✓</span> Đã gửi bản test tới {currentAdminEmail}!
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={saving}
                onClick={handleSaveCurrent}
                className="px-6 py-2.5 bg-[#c27803] hover:bg-[#92400e] text-white rounded-xl text-xs font-heading font-bold uppercase tracking-wider transition shadow-sm flex items-center gap-2 disabled:opacity-60 active:translate-y-px"
              >
                <span>💾</span>
                <span>{saving ? "Đang lưu..." : isCreatingNew ? "Lưu Mẫu Mới" : "Lưu Thay Đổi"}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EmailTemplatesPage;
