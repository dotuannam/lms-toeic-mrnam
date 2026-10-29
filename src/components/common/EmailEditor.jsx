import React, { useState, useRef, useEffect } from "react";
import { AVAILABLE_VARIABLES, wrapEmailInHtml, replaceVariables } from "../../services/emailService";

export const EmailEditor = ({
  subject = "",
  onSubjectChange = () => {},
  content = "",
  onChange = () => {},
  templates = [],
  selectedTemplateId = "",
  onSelectTemplate = null,
  onSaveTemplate = null,
  previewData = {},
  readOnly = false,
  showTemplateSelector = true,
}) => {
  const [editorMode, setEditorMode] = useState("visual"); // 'visual' | 'html' | 'preview'
  const [previewDevice, setPreviewDevice] = useState("desktop"); // 'desktop' | 'mobile'
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showBgPicker, setShowBgPicker] = useState(false);
  const [savedRange, setSavedRange] = useState(null);

  const editorRef = useRef(null);
  const subjectInputRef = useRef(null);

  // Synchronize initial or external content into contentEditable
  useEffect(() => {
    if (editorRef.current && editorMode === "visual") {
      if (editorRef.current.innerHTML !== content) {
        editorRef.current.innerHTML = content || "";
      }
    }
  }, [content, editorMode]);

  // Save selection before clicking toolbar items
  const saveSelection = () => {
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0) {
      setSavedRange(sel.getRangeAt(0));
    }
  };

  const restoreSelection = () => {
    if (savedRange) {
      const sel = window.getSelection();
      sel.removeAllRanges();
      sel.addRange(savedRange);
    }
  };

  // Execute standard formatting commands
  const executeCommand = (command, value = null) => {
    if (readOnly) return;
    restoreSelection();
    document.execCommand(command, false, value);
    if (editorRef.current) {
      onChange(editorRef.current.innerHTML);
    }
  };

  // Handle inserting HTML or dynamic variables
  const insertHtmlAtCursor = (htmlToInsert) => {
    if (readOnly) return;

    if (editorMode === "html") {
      onChange((content || "") + htmlToInsert);
      return;
    }

    if (editorRef.current) {
      editorRef.current.focus();
      restoreSelection();

      const sel = window.getSelection();
      if (sel && sel.rangeCount > 0) {
        const range = sel.getRangeAt(0);
        range.deleteContents();
        const el = document.createElement("div");
        el.innerHTML = htmlToInsert;
        const frag = document.createDocumentFragment();
        let node;
        let lastNode;
        while ((node = el.firstChild)) {
          lastNode = frag.appendChild(node);
        }
        range.insertNode(frag);
        if (lastNode) {
          const newRange = range.cloneRange();
          newRange.setStartAfter(lastNode);
          newRange.collapse(true);
          sel.removeAllRanges();
          sel.addRange(newRange);
        }
      } else {
        editorRef.current.innerHTML += htmlToInsert;
      }
      onChange(editorRef.current.innerHTML);
    }
  };

  // Insert variable tag into subject or editor
  const handleInsertVariable = (varKey) => {
    if (document.activeElement === subjectInputRef.current) {
      const input = subjectInputRef.current;
      const start = input.selectionStart || subject.length;
      const end = input.selectionEnd || subject.length;
      const newSubject = subject.substring(0, start) + varKey + subject.substring(end);
      onSubjectChange(newSubject);
      setTimeout(() => {
        input.setSelectionRange(start + varKey.length, start + varKey.length);
        input.focus();
      }, 0);
    } else {
      insertHtmlAtCursor(`<strong>${varKey}</strong>&nbsp;`);
    }
  };

  // Insert custom UI widgets
  const insertCalloutBox = (type = "info") => {
    if (type === "info") {
      insertHtmlAtCursor(`
<div style="background-color: #f1f5f9; border-left: 4px solid #4f46e5; padding: 14px 18px; border-radius: 8px; margin: 16px 0;">
  <strong style="color: #1e293b; display: block; margin-bottom: 6px;">📌 Lưu ý quan trọng:</strong>
  <span style="color: #475569; font-size: 13.5px;">Nhập nội dung lưu ý tại đây...</span>
</div><p></p>`);
    } else if (type === "warning") {
      insertHtmlAtCursor(`
<div style="background-color: #fffbeb; border: 1px solid #fef3c7; border-radius: 8px; padding: 14px 18px; margin: 16px 0;">
  <span style="color: #92400e; font-size: 13.5px;">💡 Nhập mẹo học tập hoặc nhắc nhở tại đây...</span>
</div><p></p>`);
    }
  };

  const insertLinkPrompt = () => {
    const url = window.prompt("Nhập đường dẫn URL (vd: https://classroom.google.com):", "https://");
    if (url && url !== "https://") {
      const text = window.prompt("Nhập văn bản hiển thị cho liên kết:", "Truy cập đường dẫn");
      insertHtmlAtCursor(`<a href="${url}" target="_blank" style="color: #4f46e5; font-weight: 600; text-decoration: underline;">${text || url}</a> `);
    }
  };

  const insertButtonPrompt = () => {
    const text = window.prompt("Nhập chữ hiển thị trên nút:", "Vào Lớp Học");
    const url = window.prompt("Nhập đường dẫn liên kết:", "https://");
    if (text && url) {
      insertHtmlAtCursor(`
<a href="${url}" target="_blank" style="background-color: #4f46e5; color: #ffffff; padding: 10px 18px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 13.5px; display: inline-block; margin: 12px 0;">
  ${text}
</a> `);
    }
  };

  // Preview data computed
  const renderedSubject = replaceVariables(subject, previewData);
  const renderedContent = replaceVariables(content, previewData);
  const fullPreviewHtml = wrapEmailInHtml({
    title: renderedSubject,
    contentHtml: renderedContent,
    centerName: previewData["{{ten_trung_tam}}"] || "TOEIC MR.NAM",
    adminEmail: previewData["{{email_trung_tam}}"] || "support@center.edu.vn",
  });

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col overflow-hidden">
      {/* Top Header: Template selector & Mode Tabs */}
      <div className="p-3.5 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
        {/* Template Selector */}
        {showTemplateSelector && templates.length > 0 && onSelectTemplate && (
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-600 uppercase flex items-center gap-1">
              <span>📋</span> Mẫu thư:
            </span>
            <select
              value={selectedTemplateId}
              onChange={(e) => onSelectTemplate(e.target.value)}
              className="py-1.5 px-3 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 shadow-2xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            >
              {templates.map((tpl) => (
                <option key={tpl.id} value={tpl.id}>
                  {tpl.icon || "✉️"} {tpl.name}
                </option>
              ))}
            </select>

            {onSaveTemplate && (
              <button
                type="button"
                onClick={onSaveTemplate}
                className="inline-flex items-center gap-1 px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl text-xs font-bold shadow-2xs transition"
                title="Lưu nội dung đang soạn vào mẫu này"
              >
                <span>💾</span> Lưu mẫu
              </button>
            )}
          </div>
        )}

        {/* View Mode Tabs */}
        <div className="inline-flex p-1 bg-white border border-slate-200 rounded-xl shadow-2xs text-xs font-bold ml-auto">
          <button
            type="button"
            onClick={() => setEditorMode("visual")}
            className={`py-1.5 px-3 rounded-lg transition flex items-center gap-1.5 text-xs ${
              editorMode === "visual"
                ? "bg-[#c27803] text-white font-heading font-bold shadow-xs"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-50 font-medium"
            }`}
          >
            <span>📝</span> Soạn thảo
          </button>
          <button
            type="button"
            onClick={() => setEditorMode("html")}
            className={`py-1.5 px-3 rounded-lg transition flex items-center gap-1.5 text-xs ${
              editorMode === "html"
                ? "bg-[#c27803] text-white font-heading font-bold shadow-xs"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-50 font-medium"
            }`}
          >
            <span>💻</span> Mã HTML
          </button>
          <button
            type="button"
            onClick={() => setEditorMode("preview")}
            className={`py-1.5 px-3 rounded-lg transition flex items-center gap-1.5 text-xs ${
              editorMode === "preview"
                ? "bg-[#c27803] text-white font-heading font-bold shadow-xs"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-50 font-medium"
            }`}
          >
            <span>👁️</span> Xem trước (Live)
          </button>
        </div>
      </div>

      {/* Subject Line */}
      <div className="p-3.5 border-b border-slate-200 bg-white flex items-center gap-3">
        <label className="text-xs font-extrabold text-slate-700 uppercase shrink-0 w-28">
          Tiêu đề thư *
        </label>
        <div className="flex-1 relative">
          <input
            ref={subjectInputRef}
            type="text"
            required
            disabled={readOnly}
            value={subject}
            onChange={(e) => onSubjectChange(e.target.value)}
            placeholder="vd: [{{ten_trung_tam}}] Thông báo lịch khai giảng lớp {{ten_lop}}"
            className="w-full px-3 py-2 bg-slate-50/70 border border-slate-200 rounded-xl text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 focus:bg-white transition"
          />
        </div>
      </div>

      {/* Dynamic Variable Chips Bar */}
      <div className="p-2.5 bg-slate-50/80 border-b border-slate-200">
        <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs scrollbar-thin">
          <span className="text-[11px] font-bold text-slate-500 uppercase shrink-0 mr-1 flex items-center gap-1">
            <span>🏷️</span> Biến động:
          </span>
          {AVAILABLE_VARIABLES.map((v) => (
            <button
              key={v.key}
              type="button"
              onClick={() => handleInsertVariable(v.key)}
              title={`Bấm để chèn ${v.key} (VD: ${v.sample})`}
              className="inline-flex items-center gap-1 px-2.5 py-1 bg-white hover:bg-indigo-50 hover:text-indigo-700 hover:border-indigo-300 text-slate-700 border border-slate-200 rounded-lg text-[11px] font-mono font-semibold transition shrink-0 shadow-2xs"
            >
              <span className="text-indigo-600 font-bold">+</span>
              <span>{v.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* WYSIWYG Formatting Toolbar (Visible in Visual Mode) */}
      {editorMode === "visual" && !readOnly && (
        <div className="p-2 bg-white border-b border-slate-200 flex flex-wrap items-center gap-1 text-xs">
          {/* Format Block (Headings) */}
          <select
            onChange={(e) => {
              executeCommand("formatBlock", e.target.value);
              e.target.value = "";
            }}
            defaultValue=""
            className="py-1 px-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 mr-1"
          >
            <option value="" disabled>
              Kiểu chữ...
            </option>
            <option value="p">Đoạn văn (Normal)</option>
            <option value="h2">Tiêu đề lớn (H2)</option>
            <option value="h3">Tiêu đề phụ (H3)</option>
          </select>

          {/* Bold, Italic, Underline, Strike */}
          <div className="flex items-center border-r border-slate-200 pr-1.5 mr-1 gap-0.5">
            <button
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                executeCommand("bold");
              }}
              className="p-1.5 hover:bg-slate-100 rounded text-slate-700 font-bold w-7 h-7 flex items-center justify-center transition"
              title="In đậm (Bold)"
            >
              B
            </button>
            <button
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                executeCommand("italic");
              }}
              className="p-1.5 hover:bg-slate-100 rounded text-slate-700 italic font-serif w-7 h-7 flex items-center justify-center transition"
              title="In nghiêng (Italic)"
            >
              I
            </button>
            <button
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                executeCommand("underline");
              }}
              className="p-1.5 hover:bg-slate-100 rounded text-slate-700 underline w-7 h-7 flex items-center justify-center transition"
              title="Gạch chân (Underline)"
            >
              U
            </button>
            <button
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                executeCommand("strikeThrough");
              }}
              className="p-1.5 hover:bg-slate-100 rounded text-slate-700 line-through w-7 h-7 flex items-center justify-center transition"
              title="Gạch ngang (Strikethrough)"
            >
              S
            </button>
          </div>

          {/* Color Chooser */}
          <div className="relative border-r border-slate-200 pr-1.5 mr-1 flex items-center gap-1">
            <button
              type="button"
              onClick={() => {
                saveSelection();
                setShowColorPicker(!showColorPicker);
                setShowBgPicker(false);
              }}
              className="p-1.5 hover:bg-slate-100 rounded text-slate-700 flex items-center gap-1 transition"
              title="Màu chữ"
            >
              <span className="font-extrabold text-indigo-600 border-b-2 border-indigo-600">A</span>
              <span className="text-[10px]">▼</span>
            </button>

            {showColorPicker && (
              <div className="absolute top-full left-0 z-20 mt-1 bg-white border border-slate-200 rounded-xl shadow-xl p-2 grid grid-cols-5 gap-1.5 w-36">
                {[
                  { color: "#1e293b", name: "Đen xám" },
                  { color: "#4f46e5", name: "Chàm Indigo" },
                  { color: "#2563eb", name: "Xanh dương" },
                  { color: "#059669", name: "Xanh lục" },
                  { color: "#e11d48", name: "Đỏ hồng" },
                  { color: "#d97706", name: "Hổ phách" },
                  { color: "#7c3aed", name: "Tím" },
                  { color: "#64748b", name: "Xám nhạt" },
                ].map((c) => (
                  <button
                    key={c.color}
                    type="button"
                    onClick={() => {
                      executeCommand("foreColor", c.color);
                      setShowColorPicker(false);
                    }}
                    style={{ backgroundColor: c.color }}
                    className="w-5 h-5 rounded-md border border-slate-200 hover:scale-110 transition shadow-2xs"
                    title={c.name}
                  />
                ))}
              </div>
            )}

            {/* Background highlight */}
            <button
              type="button"
              onClick={() => {
                saveSelection();
                setShowBgPicker(!showBgPicker);
                setShowColorPicker(false);
              }}
              className="p-1.5 hover:bg-slate-100 rounded text-slate-700 flex items-center gap-1 transition"
              title="Đánh dấu màu nền (Highlight)"
            >
              <span className="bg-amber-200 px-1 rounded font-bold text-[11px]">HL</span>
              <span className="text-[10px]">▼</span>
            </button>

            {showBgPicker && (
              <div className="absolute top-full left-10 z-20 mt-1 bg-white border border-slate-200 rounded-xl shadow-xl p-2 grid grid-cols-4 gap-1.5 w-32">
                {[
                  { color: "#fef08a", name: "Vàng" },
                  { color: "#bbf7d0", name: "Xanh lá" },
                  { color: "#bfdbfe", name: "Xanh biển" },
                  { color: "#fbcfe8", name: "Hồng" },
                  { color: "transparent", name: "Bỏ tô màu" },
                ].map((c) => (
                  <button
                    key={c.color}
                    type="button"
                    onClick={() => {
                      executeCommand("hiliteColor", c.color);
                      setShowBgPicker(false);
                    }}
                    style={{ backgroundColor: c.color }}
                    className="w-5 h-5 rounded-md border border-slate-300 hover:scale-110 transition shadow-2xs"
                    title={c.name}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Alignment */}
          <div className="flex items-center border-r border-slate-200 pr-1.5 mr-1 gap-0.5">
            <button
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                executeCommand("justifyLeft");
              }}
              className="p-1.5 hover:bg-slate-100 rounded text-slate-700 w-7 h-7 flex items-center justify-center transition"
              title="Căn trái"
            >
              ⬅️
            </button>
            <button
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                executeCommand("justifyCenter");
              }}
              className="p-1.5 hover:bg-slate-100 rounded text-slate-700 w-7 h-7 flex items-center justify-center transition"
              title="Căn giữa"
            >
              ↔️
            </button>
            <button
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                executeCommand("justifyRight");
              }}
              className="p-1.5 hover:bg-slate-100 rounded text-slate-700 w-7 h-7 flex items-center justify-center transition"
              title="Căn phải"
            >
              ➡️
            </button>
          </div>

          {/* Lists */}
          <div className="flex items-center border-r border-slate-200 pr-1.5 mr-1 gap-0.5">
            <button
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                executeCommand("insertUnorderedList");
              }}
              className="p-1.5 hover:bg-slate-100 rounded text-slate-700 w-7 h-7 flex items-center justify-center transition"
              title="Danh sách gạch đầu dòng"
            >
              •☰
            </button>
            <button
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                executeCommand("insertOrderedList");
              }}
              className="p-1.5 hover:bg-slate-100 rounded text-slate-700 w-7 h-7 flex items-center justify-center transition"
              title="Danh sách số thứ tự"
            >
              1☰
            </button>
          </div>

          {/* Custom Blocks: Link, Callouts, Button */}
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={insertLinkPrompt}
              className="px-2 py-1 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg text-slate-700 font-semibold transition flex items-center gap-1"
              title="Chèn liên kết đường dẫn"
            >
              <span>🔗</span> Link
            </button>
            <button
              type="button"
              onClick={insertButtonPrompt}
              className="px-2 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-lg font-bold transition flex items-center gap-1"
              title="Chèn nút bấm hành động trong email"
            >
              <span>🔘</span> Nút bấm
            </button>
            <button
              type="button"
              onClick={() => insertCalloutBox("info")}
              className="px-2 py-1 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg text-slate-700 font-semibold transition"
              title="Chèn hộp ghi chú khung nổi bật"
            >
              📌 Khung lưu ý
            </button>
            <button
              type="button"
              onClick={() => insertCalloutBox("warning")}
              className="px-2 py-1 bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-800 rounded-lg font-semibold transition"
              title="Chèn hộp nhắc nhở màu vàng"
            >
              💡 Khung mẹo
            </button>
            <button
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                executeCommand("insertHorizontalRule");
              }}
              className="px-2 py-1 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg text-slate-700 font-semibold transition"
              title="Đường kẻ ngang phân cách"
            >
              ➖ Đường kẻ
            </button>
          </div>
        </div>
      )}

      {/* Editor Body */}
      <div className="flex-1 min-h-[360px] max-h-[560px] overflow-y-auto">
        {/* Mode 1: Visual WYSIWYG */}
        {editorMode === "visual" && (
          <div
            ref={editorRef}
            contentEditable={!readOnly}
            onInput={() => {
              if (editorRef.current) {
                onChange(editorRef.current.innerHTML);
              }
            }}
            onMouseUp={saveSelection}
            onKeyUp={saveSelection}
            className="p-6 min-h-[360px] focus:outline-none text-slate-800 leading-relaxed font-sans text-sm prose max-w-none"
            style={{ minHeight: "360px" }}
          />
        )}

        {/* Mode 2: HTML Source Code */}
        {editorMode === "html" && (
          <textarea
            disabled={readOnly}
            value={content}
            onChange={(e) => onChange(e.target.value)}
            className="w-full h-full min-h-[360px] p-4 bg-slate-900 text-slate-100 font-mono text-xs leading-relaxed focus:outline-none resize-none"
            placeholder="<html><body>Nhập mã HTML tại đây...</body></html>"
          />
        )}

        {/* Mode 3: Live Preview */}
        {editorMode === "preview" && (
          <div className="bg-slate-100 p-4 min-h-[360px]">
            {/* Device Switcher */}
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-200">
              <div className="text-xs font-semibold text-slate-600 flex items-center gap-2">
                <span>📧 Giao diện khi học viên nhận được thư:</span>
                <span className="px-2 py-0.5 bg-indigo-100 text-indigo-700 rounded font-bold text-[11px]">
                  {renderedSubject || "(Chưa có tiêu đề)"}
                </span>
              </div>
              <div className="inline-flex p-0.5 bg-white border border-slate-200 rounded-lg text-xs font-bold">
                <button
                  type="button"
                  onClick={() => setPreviewDevice("desktop")}
                  className={`px-2.5 py-1 rounded transition ${
                    previewDevice === "desktop"
                      ? "bg-slate-800 text-white"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  🖥️ Máy tính
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewDevice("mobile")}
                  className={`px-2.5 py-1 rounded transition ${
                    previewDevice === "mobile"
                      ? "bg-slate-800 text-white"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  📱 Điện thoại
                </button>
              </div>
            </div>

            {/* Email Container Frame */}
            <div className="flex justify-center">
              <div
                className={`transition-all duration-300 w-full ${
                  previewDevice === "mobile"
                    ? "max-w-[375px] border-4 border-slate-800 rounded-3xl overflow-hidden shadow-2xl bg-white"
                    : "max-w-[640px]"
                }`}
              >
                {/* Mock Client Top Bar */}
                <div className="bg-slate-200/80 px-4 py-2 border-b border-slate-300 text-[11px] text-slate-600 flex items-center justify-between">
                  <div>
                    <strong>Từ:</strong> {previewData["{{ten_trung_tam}}"] || "TOEIC MR.NAM"} &lt;{previewData["{{email_trung_tam}}"] || "admin@center.edu.vn"}&gt;
                  </div>
                  <div>Vừa xong</div>
                </div>

                {/* Rendered HTML */}
                <div
                  className="bg-white overflow-hidden"
                  dangerouslySetHtml={{ __html: fullPreviewHtml }}
                >
                  <iframe
                    title="Live Email Preview"
                    srcDoc={fullPreviewHtml}
                    className="w-full border-none"
                    style={{ minHeight: "480px", height: "100%" }}
                  />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Editor Footer Status */}
      <div className="px-4 py-2 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
        <div>
          {editorMode === "visual"
            ? "💡 Chế độ soạn thảo trực quan. Bấm các biến động phía trên để chèn nhanh vào nội dung."
            : editorMode === "html"
            ? "💻 Chế độ mã nguồn HTML. Dành cho người dùng tùy biến sâu."
            : "👁️ Chế độ xem trước thời gian thực (đã tự động điền dữ liệu mẫu của học viên)."}
        </div>
        <div className="font-mono text-[11px]">
          {content ? `${content.length} ký tự` : "Trống"}
        </div>
      </div>
    </div>
  );
};

export default EmailEditor;
