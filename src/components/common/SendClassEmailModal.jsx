import React, { useState, useEffect, useMemo } from "react";
import { EmailEditor } from "./EmailEditor";
import {
  getEmailTemplates,
  subscribeEmailTemplates,
  buildVariableMap,
  sendPersonalizedBatchEmails,
  replaceVariables,
  wrapEmailInHtml,
} from "../../services/emailService";
import { CENTER_CONFIG } from "../../config/appConfig";
import { sendEmailNotification } from "../../services/api";
import { useSettings } from "../../context/SettingsContext";

export const SendClassEmailModal = ({ cls, allStudents = [], onClose }) => {
  const { centerConfig } = useSettings();
  const currentCenterName = centerConfig?.centerName || CENTER_CONFIG.centerName;
  const currentAdminEmail = centerConfig?.adminEmail || CENTER_CONFIG.adminEmail;

  const [templates, setTemplates] = useState([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState("opening_notice");
  const [subject, setSubject] = useState("");
  const [content, setContent] = useState("");

  // Student recipient selection
  const classStudents = useMemo(() => {
    if (!cls || !cls.classId) return [];
    return allStudents.filter(
      (s) =>
        s.currentClassIds?.includes(cls.classId) ||
        s.enrolledClasses?.some((e) => e.classId === cls.classId)
    );
  }, [cls, allStudents]);

  const [selectedStudentIds, setSelectedStudentIds] = useState([]);
  const [previewStudentId, setPreviewStudentId] = useState("");

  // Sending progress state
  const [isSending, setIsSending] = useState(false);
  const [sendingProgress, setSendingProgress] = useState(null); // { current, total, student, status }
  const [sendResult, setSendResult] = useState(null);
  const [isSendingTest, setIsSendingTest] = useState(false);
  const [testSendSuccess, setTestSendSuccess] = useState(false);

  // Subscribe to templates
  useEffect(() => {
    const unsub = subscribeEmailTemplates((tpls) => {
      setTemplates(tpls);
      // Auto-load opening_notice or first template
      const defaultTpl = tpls.find((t) => t.id === "opening_notice") || tpls[0];
      if (defaultTpl) {
        setSelectedTemplateId(defaultTpl.id);
        setSubject(defaultTpl.subject);
        setContent(defaultTpl.content);
      }
    });
    return () => unsub();
  }, []);

  // Initialize selected students (auto-select all students with valid email)
  useEffect(() => {
    const validIds = classStudents.filter((s) => s.email && s.email.includes("@")).map((s) => s.studentId);
    setSelectedStudentIds(validIds);
    if (classStudents.length > 0) {
      setPreviewStudentId(classStudents[0].studentId);
    }
  }, [classStudents]);

  // Handle template selection change
  const handleSelectTemplate = (templateId) => {
    setSelectedTemplateId(templateId);
    const chosen = templates.find((t) => t.id === templateId);
    if (chosen) {
      setSubject(chosen.subject);
      setContent(chosen.content);
    }
  };

  // Toggle single student
  const handleToggleStudent = (studentId) => {
    setSelectedStudentIds((prev) =>
      prev.includes(studentId) ? prev.filter((id) => id !== studentId) : [...prev, studentId]
    );
  };

  // Toggle select all
  const handleToggleSelectAll = () => {
    const validIds = classStudents.filter((s) => s.email && s.email.includes("@")).map((s) => s.studentId);
    if (selectedStudentIds.length === validIds.length) {
      setSelectedStudentIds([]);
    } else {
      setSelectedStudentIds(validIds);
    }
  };

  // Active student for real-time live preview
  const currentPreviewStudent = useMemo(() => {
    return classStudents.find((s) => s.studentId === previewStudentId) || classStudents[0] || {
      fullName: "Nguyễn Văn An",
      studentId: "HV_PREVIEW",
      email: "an.nguyen@example.com",
      phone: "0912 345 678",
    };
  }, [classStudents, previewStudentId]);

  const previewData = useMemo(() => {
    return buildVariableMap(currentPreviewStudent, cls);
  }, [currentPreviewStudent, cls]);

  // Send Test Email to Admin
  const handleSendTestToAdmin = async () => {
    if (!currentAdminEmail) {
      alert("Chưa cấu hình Email quản trị của trung tâm.");
      return;
    }
    setIsSendingTest(true);
    setTestSendSuccess(false);

    try {
      const varMap = buildVariableMap(currentPreviewStudent, cls);
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

      setTestSendSuccess(true);
      setTimeout(() => setTestSendSuccess(false), 5000);
    } catch (err) {
      alert("Lỗi khi gửi email thử nghiệm: " + err.message);
    } finally {
      setIsSendingTest(false);
    }
  };

  // Dispatch Batch Emails
  const handleDispatchBatch = async () => {
    const targetStudents = classStudents.filter((s) => selectedStudentIds.includes(s.studentId));

    if (targetStudents.length === 0) {
      alert("Vui lòng chọn ít nhất 1 học viên có email để gửi.");
      return;
    }

    if (!subject.trim()) {
      alert("Vui lòng nhập tiêu đề email.");
      return;
    }

    const confirmMsg = `Bạn có chắc chắn muốn gửi email này đến ${targetStudents.length} học viên lớp "${cls.name}"?`;
    if (!window.confirm(confirmMsg)) return;

    setIsSending(true);
    setSendingProgress({ current: 0, total: targetStudents.length, studentName: "" });
    setSendResult(null);

    try {
      const results = await sendPersonalizedBatchEmails({
        students: targetStudents,
        cls,
        subjectTemplate: subject,
        bodyHtmlTemplate: content,
        senderName: currentCenterName,
        onProgress: ({ index, total, currentStudent, success, error }) => {
          setSendingProgress({
            current: index,
            total,
            studentName: currentStudent.fullName,
            success,
            error,
          });
        },
      });

      setSendResult(results);
    } catch (err) {
      alert("Lỗi tiến trình gửi: " + err.message);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-5xl w-full max-h-[94vh] shadow-2xl border border-slate-100 flex flex-col overflow-hidden my-auto">
        {/* Top Header Bar */}
        <div className="p-5 bg-gradient-to-r from-[#151b26] via-[#1e2738] to-[#151b26] text-white flex items-center justify-between shrink-0 border-b border-slate-700/60">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-[#1e2738] border border-[#00b4d8]/40 flex items-center justify-center text-xl shadow-lg ring-2 ring-[#00b4d8]/20">
              ✉️
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 bg-[#00b4d8]/20 border border-[#00b4d8]/30 rounded text-[11px] font-mono font-bold uppercase tracking-wider text-[#72d5cd]">
                  {cls.code || "LỚP HỌC"}
                </span>
                <h3 className="text-base font-heading font-extrabold text-white uppercase tracking-wide">
                  Gửi Email Khai Giảng & Thông Báo Lớp Học
                </h3>
              </div>
              <p className="text-xs text-slate-300 mt-0.5 font-medium">
                Lớp: <strong className="text-white">{cls.name}</strong> &bull; Khai giảng:{" "}
                <strong className="text-amber-300">{cls.startDate || "Chưa định"}</strong> &bull; Lịch:{" "}
                <span className="text-white font-medium">{cls.schedule || "N/A"}</span>
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-xl bg-white/10 hover:bg-white/20 text-white flex items-center justify-center text-lg font-bold transition"
            title="Đóng modal"
          >
            ✕
          </button>
        </div>

        {/* Modal Main Content (Split: Recipient Panel + Editor) */}
        <div className="flex-1 overflow-y-auto p-5 grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* Left Column: Student Recipients Picker (4 cols) */}
          <div className="lg:col-span-4 bg-slate-50 rounded-2xl border border-slate-200 p-4 flex flex-col justify-between space-y-4">
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                <div>
                  <h4 className="text-xs font-extrabold text-slate-800 uppercase flex items-center gap-1.5">
                    <span>👥</span> Danh sách người nhận
                  </h4>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Sĩ số lớp: <b>{classStudents.length} học viên</b>
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleToggleSelectAll}
                  className="px-2.5 py-1 bg-white border border-slate-200 hover:border-[#00b4d8] text-[#00b4d8] rounded-lg text-xs font-bold transition shadow-2xs"
                >
                  {selectedStudentIds.length === classStudents.filter((s) => s.email).length
                    ? "Bỏ chọn"
                    : "Chọn tất cả"}
                </button>
              </div>

              {/* Recipient summary badge */}
              <div className="my-3 p-2.5 bg-cyan-50/60 border border-[#00b4d8]/30 rounded-xl text-xs flex items-center justify-between text-slate-800 font-medium">
                <span>Đã chọn để gửi:</span>
                <span className="font-extrabold text-[#00b4d8] bg-white px-2 py-0.5 rounded-lg border border-[#00b4d8]/20 shadow-2xs font-mono">
                  {selectedStudentIds.length} / {classStudents.length} học viên
                </span>
              </div>

              {/* Student list checkboxes */}
              <div className="space-y-2 max-h-[360px] overflow-y-auto pr-1">
                {classStudents.length === 0 ? (
                  <div className="text-center py-10 text-xs text-slate-400 italic bg-white rounded-xl border border-dashed border-slate-200 p-4">
                    Chưa có học viên nào được xếp vào lớp này.
                  </div>
                ) : (
                  classStudents.map((std) => {
                    const isSelected = selectedStudentIds.includes(std.studentId);
                    const hasEmail = Boolean(std.email && std.email.includes("@"));

                    return (
                      <div
                        key={std.studentId}
                        className={`p-2.5 rounded-xl border transition flex items-center justify-between gap-2.5 ${
                          !hasEmail
                            ? "bg-slate-100/70 border-slate-200 opacity-60"
                            : isSelected
                            ? "bg-white border-indigo-400 shadow-2xs"
                            : "bg-white/60 border-slate-200 hover:border-slate-300"
                        }`}
                      >
                        <label className="flex items-center gap-2.5 cursor-pointer flex-1 min-w-0">
                          <input
                            type="checkbox"
                            disabled={!hasEmail}
                            checked={isSelected}
                            onChange={() => handleToggleStudent(std.studentId)}
                            className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500 shrink-0"
                          />
                          <div className="min-w-0 flex-1">
                            <div className="text-xs font-bold text-slate-800 truncate flex items-center gap-1.5">
                              <span>{std.fullName}</span>
                              <span className="text-[10px] font-mono text-slate-400 bg-slate-100 px-1 py-0.2 rounded">
                                {std.studentId}
                              </span>
                            </div>
                            <div className="text-[11px] text-slate-500 truncate">
                              {hasEmail ? std.email : <span className="text-amber-600 font-semibold">Chưa có email</span>}
                            </div>
                          </div>
                        </label>

                        {/* Button to preview this student */}
                        <button
                          type="button"
                          onClick={() => setPreviewStudentId(std.studentId)}
                          className={`px-1.5 py-0.5 rounded text-[10px] font-bold shrink-0 transition ${
                            previewStudentId === std.studentId
                              ? "bg-indigo-600 text-white"
                              : "bg-slate-100 hover:bg-slate-200 text-slate-600"
                          }`}
                          title="Xem thử email với thông tin học viên này"
                        >
                          👁️
                        </button>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Quick Preview Selector */}
            <div className="pt-3 border-t border-slate-200">
              <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                Xem trước với học viên:
              </label>
              <select
                value={previewStudentId}
                onChange={(e) => setPreviewStudentId(e.target.value)}
                className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-800"
              >
                {classStudents.map((s) => (
                  <option key={s.studentId} value={s.studentId}>
                    {s.fullName} ({s.studentId})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Right Column: Full Email Editor (8 cols) */}
          <div className="lg:col-span-8 flex flex-col">
            <EmailEditor
              subject={subject}
              onSubjectChange={setSubject}
              content={content}
              onChange={setContent}
              templates={templates}
              selectedTemplateId={selectedTemplateId}
              onSelectTemplate={handleSelectTemplate}
              previewData={previewData}
              showTemplateSelector={true}
            />
          </div>
        </div>

        {/* Modal Footer Bar */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={isSendingTest || isSending}
              onClick={handleSendTestToAdmin}
              className="px-3.5 py-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl text-xs font-bold transition shadow-2xs flex items-center gap-1.5 disabled:opacity-50"
              title={`Gửi bản xem trước đến hòm thư Admin: ${currentAdminEmail}`}
            >
              <span>🧪</span>
              <span>{isSendingTest ? "Đang gửi thử..." : "Gửi thử tới Email Admin"}</span>
            </button>

            {testSendSuccess && (
              <span className="text-xs font-bold text-emerald-600 flex items-center gap-1 animate-pulse">
                <span>✓</span> Đã gửi bản test tới {currentAdminEmail}!
              </span>
            )}
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              disabled={isSending}
              onClick={onClose}
              className="py-2.5 px-4 bg-white hover:bg-slate-100 text-slate-600 border border-slate-200 rounded-xl text-xs font-semibold transition"
            >
              Hủy
            </button>

            <button
              type="button"
              disabled={isSending || selectedStudentIds.length === 0}
              onClick={handleDispatchBatch}
              className="py-2.5 px-6 bg-[#00b4d8] hover:bg-[#0096c7] text-white rounded-xl text-xs font-heading font-bold uppercase tracking-wider transition shadow-md shadow-[#00b4d8]/25 flex items-center gap-2 disabled:opacity-50 active:translate-y-px"
            >
              <span>🚀</span>
              <span>Gửi Email Cho {selectedStudentIds.length} Học Viên</span>
            </button>
          </div>
        </div>

        {/* Sending Progress Modal Overlay */}
        {isSending && (
          <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-6 z-50">
            <div className="bg-white rounded-2xl max-w-md w-full p-6 text-center shadow-2xl border border-slate-100 space-y-4">
              <div className="w-14 h-14 rounded-2xl bg-cyan-50 text-[#00b4d8] flex items-center justify-center mx-auto text-2xl font-bold animate-pulse">
                📨
              </div>
              <div>
                <h3 className="text-base font-heading font-extrabold text-[#1e2738] uppercase">
                  Đang Gửi Email Cho Học Viên...
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  Hệ thống đang cá nhân hóa nội dung và gửi qua máy chủ Gmail của trung tâm.
                </p>
              </div>

              {/* Progress bar */}
              {sendingProgress && (
                <div className="space-y-2">
                  <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden">
                    <div
                      className="bg-[#00b4d8] h-full rounded-full transition-all duration-300"
                      style={{
                        width: `${Math.round((sendingProgress.current / sendingProgress.total) * 100)}%`,
                      }}
                    />
                  </div>
                  <div className="flex justify-between text-xs font-bold text-slate-700">
                    <span>
                      {sendingProgress.current} / {sendingProgress.total} hoàn thành
                    </span>
                    <span>
                      {Math.round((sendingProgress.current / sendingProgress.total) * 100)}%
                    </span>
                  </div>
                  <div className="text-xs text-[#00b4d8] font-semibold truncate">
                    Đang gửi tới: {sendingProgress.studentName}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Send Result Summary Modal Overlay */}
        {sendResult && (
          <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-6 z-50">
            <div className="bg-white rounded-2xl max-w-md w-full p-6 text-center shadow-2xl border border-slate-100 space-y-4">
              <div className="w-14 h-14 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto text-2xl font-bold">
                🎉
              </div>
              <div>
                <h3 className="text-base font-extrabold text-slate-900">
                  Gửi Email Thành Công!
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  Đã hoàn tất gửi thư thông báo khai giảng cho học viên lớp <b>{cls.name}</b>.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 text-center">
                <div className="p-3 bg-emerald-50 border border-emerald-100 rounded-xl">
                  <div className="text-xl font-extrabold text-emerald-600">
                    {sendResult.sent}
                  </div>
                  <div className="text-[11px] font-bold text-emerald-800 uppercase mt-0.5">
                    Đã gửi thành công
                  </div>
                </div>
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                  <div className="text-xl font-extrabold text-slate-700">
                    {sendResult.failed}
                  </div>
                  <div className="text-[11px] font-bold text-slate-500 uppercase mt-0.5">
                    Thất bại
                  </div>
                </div>
              </div>

              {sendResult.errors?.length > 0 && (
                <div className="text-left max-h-32 overflow-y-auto p-2 bg-rose-50 border border-rose-200 rounded-xl text-[11px] text-rose-700 space-y-1">
                  {sendResult.errors.map((e, idx) => (
                    <div key={idx}>
                      • {e.student} ({e.email}): {e.error}
                    </div>
                  ))}
                </div>
              )}

              <button
                type="button"
                onClick={() => {
                  setSendResult(null);
                  onClose();
                }}
                className="w-full py-2.5 px-4 bg-[#00b4d8] hover:bg-[#0096c7] text-white rounded-xl text-xs font-heading font-bold uppercase tracking-wider transition shadow-sm active:translate-y-px"
              >
                Đóng
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SendClassEmailModal;
