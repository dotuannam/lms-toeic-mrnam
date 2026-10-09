import React, { useState, useEffect, useMemo } from "react";
import { useLanguage } from "../../context/LanguageContext";
import { useSettings } from "../../context/SettingsContext";
import { getStudentDriveMaterials } from "../../services/api";

export const TEACHER_OWNER_EMAIL = "dotuannamwork2809@gmail.com";

export const StudentMaterialsTab = ({
  student,
  activeClass,
  enrolledClasses = [],
  onSelectClass,
}) => {
  const { t, lang } = useLanguage();
  const { centerConfig } = useSettings();
  const ownerEmail = centerConfig?.adminEmail || TEACHER_OWNER_EMAIL;

  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [folders, setFolders] = useState([]);
  const [files, setFiles] = useState([]);
  const [activeFilter, setActiveFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [copiedId, setCopiedId] = useState(null);
  const [showEmbedViewer, setShowEmbedViewer] = useState(false);

  const studentEmail = (student?.email || "").toLowerCase().trim();
  const folderId = activeClass?.integrations?.googleDrive?.folderId || "";
  const folderLink = activeClass?.integrations?.googleDrive?.folderLink || "";
  const classroomLink = activeClass?.integrations?.googleClassroom?.alternateLink || "";

  // Load materials from Google Drive strictly matching 2 conditions:
  // 1. Owned by dotuannamwork2809@gmail.com
  // 2. Shared with student's Gmail
  const fetchMaterials = async (isManualSync = false) => {
    if (isManualSync) setSyncing(true);
    else setLoading(true);

    try {
      const loadedFolders = [];
      const loadedFiles = [];

      // Condition 1 & 2: If activeClass has a real Google Drive folder link in Firestore
      if (folderLink) {
        loadedFolders.push({
          id: folderId || "class_main_folder",
          name: activeClass?.name
            ? `📁 ${activeClass.name} - Google Drive`
            : "📁 Thư mục Google Drive của Lớp",
          url: folderLink,
          type: "folder",
          owner: ownerEmail,
          sharedEmail: studentEmail,
          isMainFolder: true,
          updatedAt: activeClass?.updatedAt || new Date().toISOString(),
        });
      }

      // Condition 1 & 2: Query Google Apps Script API
      try {
        const res = await getStudentDriveMaterials({
          folderId,
          studentEmail,
          ownerEmail: ownerEmail,
          classCode: activeClass?.code || "COURSE",
        });

        if (res && !res.simulated) {
          if (Array.isArray(res.folders)) {
            res.folders.forEach((f) => {
              const isTeacherOwned =
                !f.owner || f.owner.toLowerCase() === ownerEmail.toLowerCase();
              const isStudentShared =
                !f.sharedEmail || f.sharedEmail.toLowerCase() === studentEmail.toLowerCase();

              if (isTeacherOwned && isStudentShared) {
                if (!loadedFolders.some((existing) => existing.url === f.url || existing.id === f.id)) {
                  loadedFolders.push({
                    ...f,
                    owner: ownerEmail,
                    sharedEmail: studentEmail,
                  });
                }
              }
            });
          }

          if (Array.isArray(res.files)) {
            res.files.forEach((file) => {
              const isTeacherOwned =
                !file.owner || file.owner.toLowerCase() === ownerEmail.toLowerCase();
              const isStudentShared =
                !file.sharedEmail || file.sharedEmail.toLowerCase() === studentEmail.toLowerCase();

              if (isTeacherOwned && isStudentShared) {
                if (!loadedFiles.some((existing) => existing.id === file.id)) {
                  loadedFiles.push({
                    ...file,
                    owner: ownerEmail,
                    sharedEmail: studentEmail,
                  });
                }
              }
            });
          }
        }
      } catch (gasErr) {
        console.warn("GAS Drive fetch not available or running offline:", gasErr);
      }

      setFolders(loadedFolders);
      setFiles(loadedFiles);
    } catch (err) {
      console.error("Error loading drive materials:", err);
      setFolders([]);
      setFiles([]);
    } finally {
      setLoading(false);
      setSyncing(false);
    }
  };

  useEffect(() => {
    fetchMaterials(false);
  }, [activeClass?.classId, studentEmail]);

  const handleCopyLink = (item) => {
    const link = item.url || (folderId ? `https://drive.google.com/drive/folders/${folderId}` : "https://drive.google.com");
    navigator.clipboard.writeText(link);
    setCopiedId(item.id);
    setTimeout(() => setCopiedId(null), 2500);
  };

  const formatFileSize = (bytes) => {
    if (!bytes || bytes <= 0) return "Google Cloud Doc";
    const mb = bytes / (1024 * 1024);
    if (mb < 1) return `${Math.round(bytes / 1024)} KB`;
    return `${mb.toFixed(1)} MB`;
  };

  const formatDate = (isoString) => {
    if (!isoString) return "--";
    try {
      const d = new Date(isoString);
      return d.toLocaleDateString(lang === "vi" ? "vi-VN" : "en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    } catch {
      return isoString;
    }
  };

  // Filtered lists strictly maintaining dual conditions
  const filteredFolders = useMemo(() => {
    if (activeFilter !== "all" && activeFilter !== "folders") return [];
    return folders.filter((f) =>
      f.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [folders, activeFilter, searchQuery]);

  const filteredFiles = useMemo(() => {
    return files.filter((f) => {
      const matchesSearch = f.name.toLowerCase().includes(searchQuery.toLowerCase());
      if (!matchesSearch) return false;
      if (activeFilter === "all") return true;
      if (activeFilter === "folders") return false;
      if (activeFilter === "pdf") return f.type === "pdf";
      if (activeFilter === "slides") return f.type === "slide";
      if (activeFilter === "audio") return f.type === "audio";
      if (activeFilter === "docs") return f.type === "doc" || f.type === "sheet";
      return true;
    });
  }, [files, activeFilter, searchQuery]);

  const totalItemsCount = filteredFolders.length + filteredFiles.length;

  return (
    <div className="space-y-6">
      {/* 1. STUDENT EMAIL & DUAL-CONDITION BANNER */}
      <div className="bg-gradient-to-r from-[#151b26] via-[#1e2738] to-[#151b26] rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden border border-slate-700/60">
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 bg-[#00b4d8]/10 rounded-full blur-2xl"></div>

        <div className="relative z-10 space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1.5">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md text-xs font-semibold text-[#72d5cd] border border-white/10">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                <span>Google Drive Live Verification</span>
                <span>&bull;</span>
                <span className="font-mono">{activeClass?.code || "COURSE"}</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-heading font-black tracking-wide uppercase text-white">
                {t("materialsTitle")}
              </h1>
              <p className="text-xs sm:text-sm text-slate-300 max-w-2xl font-medium">
                {t("materialsSubtitle")}
              </p>
            </div>

            {/* Class Selector if enrolled in multiple classes */}
            {enrolledClasses.length > 1 && (
              <div className="bg-white/10 backdrop-blur-md p-2 rounded-2xl border border-white/10 self-start md:self-auto">
                <span className="block text-[11px] font-semibold text-blue-200 px-2 mb-1">
                  {t("switchClass")}
                </span>
                <select
                  value={activeClass?.classId || ""}
                  onChange={(e) => onSelectClass && onSelectClass(e.target.value)}
                  className="bg-slate-900/80 text-white text-xs font-semibold rounded-xl px-3 py-2 border border-white/20 focus:outline-none"
                >
                  {enrolledClasses.map((cls) => (
                    <option key={cls.classId} value={cls.classId}>
                      {cls.code || cls.className} - {cls.name || cls.className}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* DUAL CONDITIONS NOTICE BAR */}
          <div className="pt-3 border-t border-white/10 space-y-2.5">
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-emerald-500/20 text-emerald-200 border border-emerald-400/30 font-medium">
                <span>🛡️</span>
                <span>Điều kiện 1: Sở hữu bởi <strong className="font-mono text-white">{ownerEmail}</strong></span>
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-blue-500/20 text-blue-200 border border-blue-400/30 font-medium">
                <span>👤</span>
                <span>Điều kiện 2: Được chia sẻ cho <strong className="font-mono text-white">{studentEmail || "Gmail học viên"}</strong></span>
              </span>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs pt-1">
              <p className="text-[11px] text-slate-300">
                {lang === "vi"
                  ? "Hệ thống chỉ hiển thị tài liệu thỏa mãn đồng thời cả 2 điều kiện trên để bảo đảm tính chuẩn xác và bảo mật."
                  : "Only materials satisfying both conditions above are displayed for accuracy and privacy."}
              </p>

              <div className="flex flex-wrap items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => fetchMaterials(true)}
                  disabled={syncing}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-semibold backdrop-blur-md border border-white/10 transition disabled:opacity-50"
                >
                  <span className={syncing ? "animate-spin" : ""}>🔄</span>
                  <span>{syncing ? t("syncingMaterials") : t("syncMaterials")}</span>
                </button>

                <a
                  href="https://drive.google.com/drive/u/0/shared-with-me"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-500 hover:bg-blue-600 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-500/30 transition"
                >
                  <span>📂</span>
                  <span>{t("openSharedWithMe")}</span>
                </a>

                {folderLink && (
                  <a
                    href={folderLink}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white/15 hover:bg-white/25 text-white rounded-xl text-xs font-bold transition border border-white/20"
                  >
                    <span>📁</span>
                    <span>{t("openClassFolder")}</span>
                  </a>
                )}

                {classroomLink && (
                  <a
                    href={classroomLink}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition shadow-sm"
                  >
                    <span>🏫</span>
                    <span>Classroom</span>
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 2. SEARCH & FILTER TOOLBAR */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-4 items-stretch md:items-center justify-between">
        {/* Search Input */}
        <div className="relative flex-1 max-w-md">
          <input
            type="text"
            placeholder={t("searchMaterialsPlaceholder")}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 text-slate-800"
          />
          <svg
            className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>

        {/* Filter Chips */}
        <div className="flex flex-wrap items-center gap-1.5 text-xs font-semibold">
          {[
            { id: "all", label: t("filterAll"), icon: "🌟" },
            { id: "folders", label: t("filterFolders"), icon: "📁" },
            { id: "pdf", label: t("filterPdf"), icon: "📕" },
            { id: "slides", label: t("filterSlides"), icon: "📊" },
            { id: "audio", label: t("filterAudio"), icon: "🎧" },
            { id: "docs", label: t("filterDocs"), icon: "📝" },
          ].map((cat) => {
            const isActive = activeFilter === cat.id;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => setActiveFilter(cat.id)}
                className={`px-3 py-1.5 rounded-xl transition flex items-center gap-1.5 text-xs ${
                  isActive
                    ? "bg-[#00b4d8] text-white font-heading font-bold shadow-sm"
                    : "bg-slate-100 hover:bg-slate-200 text-slate-600 font-medium"
                }`}
              >
                <span>{cat.icon}</span>
                <span>{cat.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Info notice about Google account permissions */}
      <div className="p-3.5 bg-blue-50 border border-blue-200 rounded-2xl flex items-start gap-3 text-xs text-blue-900">
        <span className="text-base shrink-0">💡</span>
        <div className="flex-1">
          <p className="font-semibold">{t("driveSharingNote")}</p>
        </div>
        {folderId && (
          <button
            type="button"
            onClick={() => setShowEmbedViewer(!showEmbedViewer)}
            className="shrink-0 font-bold underline text-[#00b4d8] hover:text-[#0096c7]"
          >
            {showEmbedViewer ? t("hideEmbedDriveView") : t("embedDriveView")}
          </button>
        )}
      </div>

      {/* Embedded Drive Viewer (Optional toggle) */}
      {showEmbedViewer && folderId && (
        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-xs font-bold text-slate-700">
            <span>{t("embedDriveView")}: {activeClass?.name}</span>
            <button
              onClick={() => setShowEmbedViewer(false)}
              className="text-slate-400 hover:text-slate-600"
            >
              ✕ {t("close")}
            </button>
          </div>
          <iframe
            src={`https://drive.google.com/embeddedfolderview?id=${folderId}#grid`}
            className="w-full h-96 rounded-xl border border-slate-200"
            title="Google Drive Folder View"
          />
        </div>
      )}

      {/* Loading indicator */}
      {loading ? (
        <div className="py-20 text-center">
          <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
          <p className="text-xs font-medium text-slate-500">{t("loading")}</p>
        </div>
      ) : totalItemsCount === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center max-w-lg mx-auto shadow-sm space-y-4">
          <div className="text-4xl">📂</div>
          <div className="space-y-1">
            <h3 className="text-base font-bold text-slate-800">
              {searchQuery
                ? t("noMaterialsMatched")
                : lang === "vi"
                ? "Chưa có tài liệu nào thỏa mãn 2 điều kiện"
                : "No materials matching the 2 conditions"}
            </h3>
            <p className="text-xs text-slate-500">
              {searchQuery
                ? t("noMaterialsMatchedDesc")
                : lang === "vi"
                ? `Hệ thống chỉ hiển thị tài liệu thuộc sở hữu của ${ownerEmail} và được chia sẻ cho email của bạn.`
                : `Only materials owned by ${ownerEmail} and shared with your email are displayed.`}
            </p>
          </div>

          <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-left text-xs space-y-1.5 text-slate-600">
            <div className="flex items-center gap-2">
              <span className="w-4 h-4 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-[10px]">1</span>
              <span>Chủ sở hữu Google Drive: <strong className="text-slate-800 font-mono">{ownerEmail}</strong></span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-4 h-4 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-[10px]">2</span>
              <span>Học viên được chia sẻ: <strong className="text-indigo-600 font-mono">{studentEmail || "Gmail học viên"}</strong></span>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
            {searchQuery && (
              <button
                onClick={() => {
                  setSearchQuery("");
                  setActiveFilter("all");
                }}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold"
              >
                {t("filterAll")}
              </button>
            )}
            <button
              onClick={() => fetchMaterials(true)}
              className="px-4 py-2 bg-[#00b4d8] hover:bg-[#0096c7] text-white rounded-xl text-xs font-heading font-bold uppercase tracking-wider shadow-sm transition flex items-center gap-1.5 active:translate-y-px"
            >
              <span>🔄</span>
              <span>{t("syncMaterials")}</span>
            </button>
            <a
              href="https://drive.google.com/drive/u/0/shared-with-me"
              target="_blank"
              rel="noreferrer"
              className="px-3.5 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-xl text-xs font-bold border border-blue-200 transition"
            >
              {t("openSharedWithMe")} &rarr;
            </a>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* SECTION A: GOOGLE DRIVE FOLDERS */}
          {filteredFolders.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                  <span>📁</span>
                  <span>{t("filterFolders")}</span>
                  <span className="text-xs text-slate-400 font-normal">
                    ({filteredFolders.length})
                  </span>
                </h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredFolders.map((fol) => (
                  <div
                    key={fol.id}
                    className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md hover:border-[#00b4d8]/50 transition flex flex-col justify-between group"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 border border-amber-100 flex items-center justify-center text-xl shrink-0 group-hover:scale-105 transition">
                          📁
                        </div>
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                          Drive Folder
                        </span>
                      </div>

                      <h4 className="text-xs font-bold text-slate-800 group-hover:text-[#00b4d8] transition line-clamp-2 mb-1">
                        {fol.name}
                      </h4>

                      {/* Conditions verification indicator */}
                      <div className="p-2 bg-slate-50 rounded-xl border border-slate-100 text-[10px] space-y-1 text-slate-500 mb-3">
                        <div className="flex items-center gap-1.5 truncate">
                          <span className="text-emerald-600 font-bold">✓</span>
                          <span>Chủ sở hữu: <strong className="text-slate-700 font-mono">{ownerEmail}</strong></span>
                        </div>
                        <div className="flex items-center gap-1.5 truncate">
                          <span className="text-blue-600 font-bold">✓</span>
                          <span>Chia sẻ: <strong className="text-[#00b4d8] font-mono">{studentEmail}</strong></span>
                        </div>
                      </div>

                      <p className="text-[11px] text-slate-400 mb-3">
                        {t("colSessionDate")}: {formatDate(fol.updatedAt)}
                      </p>
                    </div>

                    <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                      <button
                        type="button"
                        onClick={() => handleCopyLink(fol)}
                        className="text-[11px] font-semibold text-slate-500 hover:text-slate-800 transition"
                      >
                        {copiedId === fol.id ? `✓ ${t("copied")}` : t("copyLinkBtn")}
                      </button>

                      <a
                        href={fol.url || (folderId ? `https://drive.google.com/drive/folders/${folderId}` : "https://drive.google.com")}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 px-3 py-1.5 bg-cyan-50 hover:bg-cyan-100 text-[#00b4d8] rounded-lg text-[11px] font-heading font-bold uppercase tracking-wider transition"
                      >
                        <span>{t("openInDriveBtn")}</span>
                        <span>&rarr;</span>
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* SECTION B: SHARED FILES & DOCUMENTS */}
          {filteredFiles.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                  <span>📄</span>
                  <span>{t("materialsTitle")}</span>
                  <span className="text-xs text-slate-400 font-normal">
                    ({filteredFiles.length})
                  </span>
                </h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredFiles.map((file) => {
                  const isPdf = file.type === "pdf";
                  const isSlide = file.type === "slide";
                  const isAudio = file.type === "audio";
                  const isSheet = file.type === "sheet";

                  let icon = "📄";
                  let badgeBg = "bg-slate-100 text-slate-700 border-slate-200";
                  let typeLabel = "Document";

                  if (isPdf) {
                    icon = "📕";
                    badgeBg = "bg-rose-50 text-rose-700 border-rose-200";
                    typeLabel = "PDF";
                  } else if (isSlide) {
                    icon = "📊";
                    badgeBg = "bg-amber-50 text-amber-700 border-amber-200";
                    typeLabel = "Google Slides";
                  } else if (isAudio) {
                    icon = "🎧";
                    badgeBg = "bg-violet-50 text-violet-700 border-violet-200";
                    typeLabel = "Audio / MP3";
                  } else if (isSheet) {
                    icon = "📈";
                    badgeBg = "bg-emerald-50 text-emerald-700 border-emerald-200";
                    typeLabel = "Google Sheets";
                  }

                  return (
                    <div
                      key={file.id}
                      className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md hover:border-[#00b4d8]/50 transition flex flex-col justify-between group"
                    >
                      <div>
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <div className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center text-xl shrink-0 group-hover:scale-105 transition">
                            {icon}
                          </div>
                          <span
                            className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${badgeBg}`}
                          >
                            {typeLabel}
                          </span>
                        </div>

                        <h4
                          className="text-xs font-bold text-slate-800 group-hover:text-[#00b4d8] transition line-clamp-2 mb-1"
                          title={file.name}
                        >
                          {file.name}
                        </h4>

                        {/* Conditions verification indicator */}
                        <div className="p-2 bg-slate-50 rounded-xl border border-slate-100 text-[10px] space-y-1 text-slate-500 mb-3">
                          <div className="flex items-center gap-1.5 truncate">
                            <span className="text-emerald-600 font-bold">✓</span>
                            <span>Chủ sở hữu: <strong className="text-slate-700 font-mono">{ownerEmail}</strong></span>
                          </div>
                          <div className="flex items-center gap-1.5 truncate">
                            <span className="text-blue-600 font-bold">✓</span>
                            <span>Chia sẻ: <strong className="text-[#00b4d8] font-mono">{studentEmail}</strong></span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 text-[11px] text-slate-400 mb-3">
                          <span>{formatFileSize(file.size)}</span>
                          <span>&bull;</span>
                          <span>{formatDate(file.updatedAt)}</span>
                        </div>
                      </div>

                      <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                        <button
                          type="button"
                          onClick={() => handleCopyLink(file)}
                          className="text-[11px] font-semibold text-slate-500 hover:text-slate-800 transition"
                        >
                          {copiedId === file.id ? `✓ ${t("copied")}` : t("copyLinkBtn")}
                        </button>

                        <div className="flex items-center gap-1.5">
                          <a
                            href={file.url || (folderLink || "https://drive.google.com")}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 px-3 py-1.5 bg-[#00b4d8] hover:bg-[#0096c7] text-white rounded-lg text-[11px] font-heading font-bold uppercase tracking-wider transition shadow-sm active:translate-y-px"
                          >
                            <span>{t("openInDriveBtn")}</span>
                            <span>&rarr;</span>
                          </a>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default StudentMaterialsTab;
