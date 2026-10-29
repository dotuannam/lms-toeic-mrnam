import React, { useState, useEffect } from "react";
import {
  getResources,
  subscribeResources,
  createResource,
  updateResource,
  deleteResource,
  RESOURCE_CATEGORIES,
} from "../../services/resourceService";
import { GRAMMAR_CURRICULUM } from "../../data/grammarCurriculum";
import { useLanguage } from "../../context/LanguageContext";

export const LearningResourcesPage = () => {
  const { lang } = useLanguage();
  const isVi = lang === "vi";

  const [resources, setResources] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("all"); // "all" | "primary" | "supplementary" | "livestream"
  const [searchQuery, setSearchQuery] = useState("");
  const [courseFilter, setCourseFilter] = useState("all");

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [editingResource, setEditingResource] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // Grammar curriculum preview modal
  const [previewGrammarUnit, setPreviewGrammarUnit] = useState(null);

  const [formData, setFormData] = useState({
    title: "",
    category: "primary",
    author: "Mr. Nam & Ban Học thuật",
    format: "pdf",
    badge: "Tài liệu",
    courseType: "ALL",
    description: "",
    fileUrl: "",
    videoUrl: "",
    notesUrl: "",
    duration: "",
    hasInteractiveViewer: false,
  });

  useEffect(() => {
    const unsub = subscribeResources((data) => {
      setResources(data);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const openCreateModal = () => {
    setEditingResource(null);
    setFormData({
      title: "",
      category: activeTab !== "all" ? activeTab : "primary",
      author: "Mr. Nam & Ban Học thuật",
      format: activeTab === "livestream" ? "video" : "pdf",
      badge: activeTab === "livestream" ? "Replay Livestream" : "Tài liệu Chính khóa",
      courseType: "ALL",
      description: "",
      fileUrl: "",
      videoUrl: "",
      notesUrl: "",
      duration: "",
      hasInteractiveViewer: false,
    });
    setShowModal(true);
  };

  const openEditModal = (res) => {
    setEditingResource(res);
    setFormData({
      title: res.title || "",
      category: res.category || "primary",
      author: res.author || "",
      format: res.format || "pdf",
      badge: res.badge || "",
      courseType: res.courseType || "ALL",
      description: res.description || "",
      fileUrl: res.fileUrl || "",
      videoUrl: res.videoUrl || "",
      notesUrl: res.notesUrl || "",
      duration: res.duration || "",
      hasInteractiveViewer: Boolean(res.hasInteractiveViewer),
    });
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (editingResource) {
        await updateResource(editingResource.resourceId, formData);
      } else {
        await createResource(formData);
      }
      setShowModal(false);
    } catch (err) {
      alert("Lỗi khi lưu tài liệu: " + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (res) => {
    if (window.confirm(`Bạn có chắc chắn muốn xóa tài liệu "${res.title}"?`)) {
      try {
        await deleteResource(res.resourceId);
      } catch (err) {
        alert("Lỗi khi xóa: " + err.message);
      }
    }
  };

  // Filtered resources
  const filteredResources = resources.filter((res) => {
    const matchesCat = activeTab === "all" || res.category === activeTab;
    const matchesCourse = courseFilter === "all" || res.courseType === courseFilter || res.courseType === "ALL";
    const matchesSearch =
      (res.title || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (res.description || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (res.author || "").toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCat && matchesCourse && matchesSearch;
  });

  // Category counts
  const countPrimary = resources.filter((r) => r.category === "primary").length;
  const countSupp = resources.filter((r) => r.category === "supplementary").length;
  const countLive = resources.filter((r) => r.category === "livestream").length;

  return (
    <div className="space-y-6">
      {/* 1. TOP STATS & HEADER */}
      <div className="bg-gradient-to-r from-[#261e16] via-[#1c1610] to-[#261e16] rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden border border-[#c27803]/40">
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 bg-[#c27803]/20 rounded-full blur-3xl pointer-events-none"></div>

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#c27803]/20 text-[#f59e0b] border border-[#c27803]/40 text-xs font-heading font-bold uppercase tracking-wider">
              <span>📚</span>
              <span>{isVi ? "Kho Học Liệu Tập Trung (3 Phân Khu)" : "3-Tier Courseware Repository"}</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-heading font-black tracking-wide text-white uppercase">
              {isVi ? "Quản Lý Kho Học Liệu & Bài Giảng" : "Learning Resources Manager"}
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 max-w-2xl leading-relaxed">
              {isVi
                ? "Tổ chức và phân loại học liệu thành 3 phân khu: Học liệu chính (kèm Giáo trình ngữ pháp tinh chỉnh), Học liệu phụ và Livestream Replay phục vụ toàn bộ khóa học."
                : "Manage and publish courseware categorized into 3 tiers: Primary Courseware, Supplementary Materials, and Livestream Replays."}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => setPreviewGrammarUnit(GRAMMAR_CURRICULUM[0])}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-heading font-bold uppercase tracking-wider transition border border-white/20"
            >
              <span>📖</span>
              <span>{isVi ? "Xem Giáo Trình Ngữ Pháp" : "Preview Grammar Book"}</span>
            </button>

            <button
              type="button"
              onClick={openCreateModal}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#c27803] hover:bg-[#b45309] text-white rounded-xl text-xs font-heading font-extrabold uppercase tracking-wider shadow-lg shadow-amber-950/40 transition active:translate-y-px"
            >
              <span>+</span>
              <span>{isVi ? "Thêm Học Liệu Mới" : "Add New Resource"}</span>
            </button>
          </div>
        </div>

        {/* 3 Categories Summary Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-6 mt-6 border-t border-white/10 text-xs">
          <div className="p-3.5 bg-white/5 rounded-2xl border border-white/10 flex items-center justify-between">
            <div>
              <div className="text-slate-400 font-medium">1. Học liệu chính</div>
              <div className="text-xl font-heading font-extrabold text-[#f59e0b] mt-0.5">{countPrimary} tài liệu</div>
              <div className="text-[11px] text-slate-400">Giáo trình & Ngữ pháp</div>
            </div>
            <span className="text-2xl">📘</span>
          </div>

          <div className="p-3.5 bg-white/5 rounded-2xl border border-white/10 flex items-center justify-between">
            <div>
              <div className="text-slate-400 font-medium">2. Học liệu phụ</div>
              <div className="text-xl font-heading font-extrabold text-amber-300 mt-0.5">{countSupp} tài liệu</div>
              <div className="text-[11px] text-slate-400">Bổ trợ & Đề thi luyện thêm</div>
            </div>
            <span className="text-2xl">📙</span>
          </div>

          <div className="p-3.5 bg-white/5 rounded-2xl border border-white/10 flex items-center justify-between">
            <div>
              <div className="text-slate-400 font-medium">3. Livestream & Replays</div>
              <div className="text-xl font-heading font-extrabold text-amber-400 mt-0.5">{countLive} video</div>
              <div className="text-[11px] text-slate-400">Video thực chiến & Notes</div>
            </div>
            <span className="text-2xl">🎥</span>
          </div>
        </div>
      </div>

      {/* 2. TAB NAVIGATION & SEARCH TOOLBAR */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/90 shadow-2xs space-y-4">
        {/* Category Tabs */}
        <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 pb-3">
          {[
            { id: "all", label: "Tất cả học liệu", count: resources.length, icon: "🌟" },
            { id: "primary", label: "1. Học liệu chính", count: countPrimary, icon: "📘" },
            { id: "supplementary", label: "2. Học liệu phụ", count: countSupp, icon: "📙" },
            { id: "livestream", label: "3. Livestream", count: countLive, icon: "🎥" },
          ].map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => setActiveTab(cat.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-heading font-bold uppercase tracking-wider transition ${
                activeTab === cat.id
                  ? "bg-[#c27803] text-white shadow-sm"
                  : "bg-slate-100 hover:bg-slate-200 text-slate-600"
              }`}
            >
              <span>{cat.icon}</span>
              <span>{cat.label}</span>
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${activeTab === cat.id ? "bg-amber-800 text-amber-100" : "bg-slate-200 text-slate-700"}`}>
                {cat.count}
              </span>
            </button>
          ))}
        </div>

        {/* Search & Course Filters */}
        <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
          <div className="relative flex-1 max-w-md">
            <input
              type="text"
              placeholder="Tìm kiếm tài liệu theo tên, mô tả, tác giả..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#c27803]/20 focus:border-[#c27803]"
            />
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs">🔍</span>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Khóa học:</span>
            <select
              value={courseFilter}
              onChange={(e) => setCourseFilter(e.target.value)}
              className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none"
            >
              <option value="all">Tất cả khóa học</option>
              <option value="TOEIC">TOEIC</option>
              <option value="IELTS">IELTS</option>
              <option value="APTIS">APTIS</option>
            </select>
          </div>
        </div>
      </div>

      {/* 3. RESOURCES GRID LIST */}
      {loading ? (
        <div className="py-20 text-center">
          <div className="w-10 h-10 border-4 border-[#c27803] border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
          <p className="text-xs font-semibold text-slate-500">Đang tải kho học liệu...</p>
        </div>
      ) : filteredResources.length === 0 ? (
        <div className="bg-white p-12 rounded-3xl border border-slate-200 text-center max-w-md mx-auto shadow-sm space-y-3">
          <span className="text-4xl block">📂</span>
          <h3 className="text-base font-bold text-slate-800">Không tìm thấy tài liệu phù hợp</h3>
          <p className="text-xs text-slate-500">
            Thử thay đổi từ khóa tìm kiếm hoặc bấm nút "Thêm Học Liệu Mới" ở trên.
          </p>
          <button
            type="button"
            onClick={openCreateModal}
            className="px-4 py-2 bg-[#c27803] hover:bg-[#b45309] text-white rounded-xl text-xs font-heading font-bold uppercase tracking-wider transition"
          >
            + Thêm Tài Liệu Mới
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredResources.map((res) => {
            const isLive = res.category === "livestream";
            const isGrammar = res.hasInteractiveViewer;

            return (
              <div
                key={res.resourceId}
                className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs hover:shadow-md hover:border-[#c27803]/40 transition-all flex flex-col justify-between overflow-hidden group"
              >
                <div className="p-5">
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-heading font-bold uppercase tracking-wider ${
                        res.category === "primary"
                          ? "bg-amber-100 text-amber-900 border border-amber-200"
                          : res.category === "supplementary"
                          ? "bg-orange-100 text-orange-900 border border-orange-200"
                          : "bg-red-100 text-red-900 border border-red-200"
                      }`}
                    >
                      {res.category === "primary"
                        ? "1. Học liệu chính"
                        : res.category === "supplementary"
                        ? "2. Học liệu phụ"
                        : "3. Livestream"}
                    </span>

                    <span className="px-2 py-0.5 rounded font-mono font-bold text-[10px] bg-slate-100 text-slate-700">
                      {res.format?.toUpperCase() || "PDF"}
                    </span>
                  </div>

                  <h3 className="text-sm font-heading font-bold text-slate-900 group-hover:text-[#c27803] transition line-clamp-2 mb-1.5">
                    {res.title}
                  </h3>

                  <p className="text-xs text-slate-500 line-clamp-3 mb-3 leading-relaxed">
                    {res.description || "Tài liệu học tập chính thức được biên soạn bởi trung tâm."}
                  </p>

                  <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100 text-[11px] space-y-1 text-slate-600 mb-2">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Tác giả / GV:</span>
                      <span className="font-semibold text-slate-800">{res.author || "Mr. Nam"}</span>
                    </div>
                    {isLive && res.duration && (
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400">Thời lượng:</span>
                        <span className="font-semibold text-rose-700">⏱️ {res.duration}</span>
                      </div>
                    )}
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Khóa áp dụng:</span>
                      <span className="font-mono font-bold text-[#c27803]">{res.courseType || "ALL"}</span>
                    </div>
                  </div>
                </div>

                <div className="p-4 pt-0 border-t border-slate-100 mt-auto">
                  <div className="flex items-center justify-between gap-2 pt-3">
                    <div className="flex items-center gap-1">
                      {isGrammar && (
                        <button
                          type="button"
                          onClick={() => setPreviewGrammarUnit(GRAMMAR_CURRICULUM[0])}
                          className="px-2.5 py-1.5 bg-[#c27803]/10 hover:bg-[#c27803] text-[#c27803] hover:text-white rounded-lg text-xs font-heading font-bold uppercase tracking-wider transition"
                        >
                          📖 Đọc sách
                        </button>
                      )}

                      {(res.videoUrl || res.fileUrl) && (
                        <a
                          href={res.videoUrl || res.fileUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="px-2.5 py-1.5 bg-slate-900 hover:bg-[#c27803] text-white rounded-lg text-xs font-heading font-bold uppercase tracking-wider transition inline-flex items-center gap-1"
                        >
                          <span>{isLive ? "▶ Xem Video" : "Mở File"}</span>
                          <span>↗</span>
                        </a>
                      )}
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => openEditModal(res)}
                        className="px-2 py-1 text-slate-600 hover:text-[#c27803] hover:bg-slate-100 rounded-lg text-xs font-semibold transition"
                      >
                        Sửa
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(res)}
                        className="px-2 py-1 text-rose-600 hover:text-rose-700 hover:bg-rose-50 rounded-lg text-xs font-semibold transition"
                      >
                        Xóa
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 4. MODAL THÊM / SỬA HỌC LIỆU */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 shadow-2xl border border-slate-100 max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between pb-4 border-b border-slate-100 mb-4">
              <div>
                <h3 className="text-lg font-heading font-black text-slate-900 uppercase">
                  {editingResource ? "Chỉnh Sửa Học Liệu" : "Thêm Học Liệu Mới"}
                </h3>
                <p className="text-xs text-slate-500">
                  Phân loại rõ vào 3 nhóm: Học liệu chính, Học liệu phụ hoặc Livestream.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="text-slate-400 hover:text-slate-600 text-lg font-bold p-1"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                  Phân Khu Học Liệu *
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: "primary", label: "1. Học liệu chính", icon: "📘" },
                    { id: "supplementary", label: "2. Học liệu phụ", icon: "📙" },
                    { id: "livestream", label: "3. Livestream", icon: "🎥" },
                  ].map((cat) => (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setFormData({ ...formData, category: cat.id })}
                      className={`p-2.5 rounded-xl border text-center transition font-heading font-bold text-xs flex flex-col items-center gap-1 ${
                        formData.category === cat.id
                          ? "bg-[#c27803] text-white border-[#c27803] shadow-xs"
                          : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                      }`}
                    >
                      <span className="text-base">{cat.icon}</span>
                      <span>{cat.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                  Tiêu Đề Học Liệu *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ví dụ: Giáo trình Ngữ pháp Tiếng Anh Tinh chỉnh..."
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                    Tác Giả / Giảng Viên
                  </label>
                  <input
                    type="text"
                    value={formData.author}
                    onChange={(e) => setFormData({ ...formData, author: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                    Định Dạng File
                  </label>
                  <select
                    value={formData.format}
                    onChange={(e) => setFormData({ ...formData, format: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold"
                  >
                    <option value="pdf">Tài liệu PDF</option>
                    <option value="video">Video Livestream (YouTube / Drive)</option>
                    <option value="sheet">Google Sheet Từ vựng</option>
                    <option value="doc">Tài liệu Google Doc</option>
                    <option value="interactive_doc">Ebook Tương tác</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                    Khóa Học Áp Dụng
                  </label>
                  <select
                    value={formData.courseType}
                    onChange={(e) => setFormData({ ...formData, courseType: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold"
                  >
                    <option value="ALL">Tất cả khóa học</option>
                    <option value="TOEIC">TOEIC</option>
                    <option value="IELTS">IELTS</option>
                    <option value="APTIS">APTIS</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                    Badge Nhãn
                  </label>
                  <input
                    type="text"
                    placeholder="VD: Giáo trình cốt lõi / Replay"
                    value={formData.badge}
                    onChange={(e) => setFormData({ ...formData, badge: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                  Đường Link File / Drive / PDF
                </label>
                <input
                  type="url"
                  placeholder="https://drive.google.com/..."
                  value={formData.fileUrl}
                  onChange={(e) => setFormData({ ...formData, fileUrl: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono"
                />
              </div>

              {formData.category === "livestream" && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl space-y-3">
                  <div>
                    <label className="block text-[11px] font-bold text-red-900 uppercase mb-1">
                      Link Video YouTube / Drive Livestream
                    </label>
                    <input
                      type="url"
                      placeholder="https://www.youtube.com/watch?v=..."
                      value={formData.videoUrl}
                      onChange={(e) => setFormData({ ...formData, videoUrl: e.target.value })}
                      className="w-full px-3 py-2 bg-white border border-red-200 rounded-xl text-xs font-mono"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold text-red-900 uppercase mb-1">
                        Link File Ghi Chú (Notes)
                      </label>
                      <input
                        type="url"
                        placeholder="Link file notes bài giảng..."
                        value={formData.notesUrl}
                        onChange={(e) => setFormData({ ...formData, notesUrl: e.target.value })}
                        className="w-full px-3 py-2 bg-white border border-red-200 rounded-xl text-xs font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-red-900 uppercase mb-1">
                        Thời Lượng Video
                      </label>
                      <input
                        type="text"
                        placeholder="VD: 1h 30m"
                        value={formData.duration}
                        onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
                        className="w-full px-3 py-2 bg-white border border-red-200 rounded-xl text-xs font-semibold"
                      />
                    </div>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                  Mô Tả Nội Dung Học Liệu
                </label>
                <textarea
                  rows={3}
                  placeholder="Tóm tắt nội dung chính của tài liệu..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs leading-relaxed"
                />
              </div>

              <div className="flex gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 py-2.5 px-4 border border-slate-200 text-slate-600 rounded-xl text-xs font-semibold hover:bg-slate-50"
                >
                  Hủy Bỏ
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 py-2.5 px-4 bg-[#c27803] text-white rounded-xl text-xs font-heading font-extrabold uppercase tracking-wider hover:bg-[#b45309] shadow-sm disabled:opacity-50"
                >
                  {submitting ? "Đang lưu..." : editingResource ? "Lưu Thay Đổi" : "Tạo Học Liệu"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 5. MODAL XEM TRƯỚC GIÁO TRÌNH NGỮ PHÁP TINH CHỈNH */}
      {previewGrammarUnit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl max-w-3xl w-full p-6 sm:p-8 shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto space-y-5">
            <div className="flex items-start justify-between pb-4 border-b border-slate-100">
              <div>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-heading font-bold uppercase tracking-wider bg-amber-100 text-amber-900 border border-amber-200">
                  {previewGrammarUnit.badge}
                </span>
                <h2 className="text-lg sm:text-xl font-heading font-black text-slate-900 uppercase mt-1">
                  {previewGrammarUnit.title}
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Thời lượng học dự kiến: {previewGrammarUnit.readingTime} &bull; Giáo trình chính thức LMS
                </p>
              </div>
              <button
                type="button"
                onClick={() => setPreviewGrammarUnit(null)}
                className="text-slate-400 hover:text-slate-600 text-lg font-bold p-1"
              >
                ✕
              </button>
            </div>

            {/* Unit Selector Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-2">
              {GRAMMAR_CURRICULUM.map((unit) => (
                <button
                  key={unit.id}
                  type="button"
                  onClick={() => setPreviewGrammarUnit(unit)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-heading font-bold uppercase tracking-wider whitespace-nowrap transition ${
                    previewGrammarUnit.id === unit.id
                      ? "bg-[#c27803] text-white shadow-xs"
                      : "bg-slate-100 hover:bg-slate-200 text-slate-700"
                  }`}
                >
                  Bài {unit.unitNumber}
                </button>
              ))}
            </div>

            <div className="p-4 bg-amber-50/70 border border-amber-200 rounded-2xl text-xs text-amber-950 leading-relaxed">
              <strong>Tóm tắt chuyên đề:</strong> {previewGrammarUnit.summary}
            </div>

            {/* Sections content */}
            <div className="space-y-4">
              {previewGrammarUnit.sections.map((sec, idx) => (
                <div key={idx} className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
                  <h4 className="font-heading font-bold text-sm text-slate-900 text-[#c27803]">
                    {sec.heading}
                  </h4>
                  <pre className="text-xs text-slate-700 font-sans whitespace-pre-line leading-relaxed">
                    {sec.content}
                  </pre>
                </div>
              ))}
            </div>

            {/* Practice Exercises */}
            {previewGrammarUnit.exercises?.length > 0 && (
              <div className="p-5 bg-white border-2 border-amber-300 rounded-2xl space-y-3">
                <h4 className="font-heading font-bold text-xs uppercase tracking-wider text-amber-900 flex items-center gap-1.5">
                  <span>🎯</span>
                  <span>Bài Tập Trắc Nghiệm Thực Hành Nhanh</span>
                </h4>
                {previewGrammarUnit.exercises.map((ex, exIdx) => (
                  <div key={exIdx} className="p-3 bg-amber-50/50 rounded-xl border border-amber-100 text-xs space-y-2">
                    <div className="font-semibold text-slate-900">{ex.question}</div>
                    <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-700">
                      {ex.options.map((opt, oIdx) => (
                        <div key={oIdx} className="p-1.5 bg-white rounded-lg border border-slate-200">
                          {opt}
                        </div>
                      ))}
                    </div>
                    <div className="p-2 bg-emerald-50 text-emerald-800 rounded-lg text-[11px] border border-emerald-200">
                      <strong>Đáp án: {ex.answer}</strong> &bull; {ex.explanation}
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="flex justify-end pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setPreviewGrammarUnit(null)}
                className="px-5 py-2.5 bg-slate-900 hover:bg-[#c27803] text-white rounded-xl text-xs font-heading font-bold uppercase tracking-wider transition"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
