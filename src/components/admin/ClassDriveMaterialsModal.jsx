import React, { useState, useEffect, useMemo, useRef } from "react";
import { useLanguage } from "../../context/LanguageContext";
import {
  uploadFileToDrive,
  batchShareDriveFolder,
  getClassFolderFiles,
} from "../../services/api";

const formatBytes = (bytes, decimals = 2) => {
  if (!bytes || bytes === 0) return "0 Bytes";
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + " " + sizes[i];
};

const getFileIcon = (mimeType = "", fileName = "") => {
  const name = fileName.toLowerCase();
  const mime = mimeType.toLowerCase();

  if (mime.includes("pdf") || name.endsWith(".pdf")) return "📄";
  if (
    mime.includes("presentation") ||
    mime.includes("powerpoint") ||
    name.endsWith(".ppt") ||
    name.endsWith(".pptx")
  )
    return "📊";
  if (
    mime.includes("audio") ||
    name.endsWith(".mp3") ||
    name.endsWith(".wav") ||
    name.endsWith(".m4a")
  )
    return "🎧";
  if (
    mime.includes("video") ||
    name.endsWith(".mp4") ||
    name.endsWith(".mkv")
  )
    return "🎬";
  if (
    mime.includes("word") ||
    mime.includes("document") ||
    name.endsWith(".doc") ||
    name.endsWith(".docx")
  )
    return "📝";
  if (
    mime.includes("spreadsheet") ||
    mime.includes("excel") ||
    name.endsWith(".xls") ||
    name.endsWith(".xlsx")
  )
    return "📈";
  if (
    mime.includes("zip") ||
    mime.includes("rar") ||
    name.endsWith(".zip") ||
    name.endsWith(".rar")
  )
    return "📦";
  if (mime.includes("image")) return "🖼️";
  return "📁";
};

export const ClassDriveMaterialsModal = ({
  cls,
  allStudents = [],
  onClose,
}) => {
  const { t, lang } = useLanguage();
  const isVi = lang === "vi";

  const folderId = cls?.integrations?.googleDrive?.folderId;
  const folderLink = cls?.integrations?.googleDrive?.folderLink;

  // Filter students belonging to this class
  const classStudents = useMemo(() => {
    if (!cls || !cls.classId) return [];
    return allStudents.filter(
      (s) =>
        s.currentClassIds?.includes(cls.classId) ||
        s.enrolledClasses?.some((e) => e.classId === cls.classId)
    );
  }, [cls, allStudents]);

  const validStudentEmails = useMemo(() => {
    return classStudents
      .map((s) => (s.email || "").toLowerCase().trim())
      .filter((e) => e.includes("@"));
  }, [classStudents]);

  // Upload state
  const [selectedFile, setSelectedFile] = useState(null);
  const [fileDescription, setFileDescription] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadSuccessMsg, setUploadSuccessMsg] = useState(null);
  const [uploadError, setUploadError] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef(null);

  // Batch permission state
  const [isSharingBatch, setIsSharingBatch] = useState(false);
  const [shareBatchResult, setShareBatchResult] = useState(null);
  const [shareBatchError, setShareBatchError] = useState(null);

  // Folder contents explorer state
  const [folderFiles, setFolderFiles] = useState([]);
  const [isLoadingFiles, setIsLoadingFiles] = useState(false);
  const [loadFilesError, setLoadFilesError] = useState(null);
  const [copiedId, setCopiedId] = useState(null);

  // Fetch folder files on mount if folderId exists
  const fetchClassFiles = async () => {
    if (!folderId) return;
    setIsLoadingFiles(true);
    setLoadFilesError(null);
    try {
      const res = await getClassFolderFiles({ folderId });
      if (res && res.files) {
        setFolderFiles(res.files);
      }
    } catch (err) {
      console.warn("Could not fetch folder files:", err);
      setLoadFilesError(err.message || "Failed to load files from Drive");
    } finally {
      setIsLoadingFiles(false);
    }
  };

  useEffect(() => {
    fetchClassFiles();
  }, [folderId]);

  // Drag and drop handlers
  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileSelected(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFileSelected(e.target.files[0]);
    }
  };

  const handleFileSelected = (file) => {
    // 25MB safety limit
    if (file.size > 25 * 1024 * 1024) {
      setUploadError(
        isVi
          ? "Kích thước tệp vượt quá 25MB. Vui lòng chọn tệp nhỏ hơn."
          : "File size exceeds 25MB. Please choose a smaller file."
      );
      setSelectedFile(null);
      return;
    }
    setUploadError(null);
    setUploadSuccessMsg(null);
    setSelectedFile(file);
  };

  const readFileAsBase64 = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result;
        const base64 = result.substring(result.indexOf(",") + 1);
        resolve(base64);
      };
      reader.onerror = (err) => reject(err);
      reader.readAsDataURL(file);
    });
  };

  const handleUploadSubmit = async (e) => {
    e.preventDefault();
    if (!selectedFile) return;
    if (!folderId) {
      setUploadError(
        isVi
          ? "Lớp này chưa có ID thư mục Google Drive."
          : "Class does not have a Google Drive folder ID."
      );
      return;
    }

    setIsUploading(true);
    setUploadProgress(20);
    setUploadError(null);
    setUploadSuccessMsg(null);

    try {
      setUploadProgress(45);
      const base64Content = await readFileAsBase64(selectedFile);
      setUploadProgress(70);

      const res = await uploadFileToDrive({
        folderId,
        fileName: selectedFile.name,
        mimeType: selectedFile.type || "application/octet-stream",
        base64Content,
        description: fileDescription,
      });

      setUploadProgress(100);
      setUploadSuccessMsg({
        name: selectedFile.name,
        url: res?.fileUrl || folderLink,
      });

      // Clear selection
      setSelectedFile(null);
      setFileDescription("");
      if (fileInputRef.current) fileInputRef.current.value = "";

      // Refresh files list
      fetchClassFiles();
    } catch (err) {
      console.error("Upload error:", err);
      setUploadError(err.message || "Failed to upload file to Google Drive");
    } finally {
      setIsUploading(false);
    }
  };

  // Batch share Drive folder with all class students
  const handleBatchShare = async () => {
    if (!folderId) {
      setShareBatchError(
        isVi
          ? "Chưa có thư mục Drive cho lớp này."
          : "No Drive folder for this class."
      );
      return;
    }

    if (validStudentEmails.length === 0) {
      setShareBatchError(
        isVi
          ? "Lớp này chưa có học viên nào có email hợp lệ."
          : "No enrolled students with valid emails found in this class."
      );
      return;
    }

    setIsSharingBatch(true);
    setShareBatchError(null);
    setShareBatchResult(null);

    try {
      const res = await batchShareDriveFolder({
        folderId,
        studentEmails: validStudentEmails,
      });

      setShareBatchResult({
        count: res?.totalShared ?? validStudentEmails.length,
        emails: validStudentEmails,
      });
    } catch (err) {
      console.error("Batch share error:", err);
      setShareBatchError(err.message || "Failed to share folder with students");
    } finally {
      setIsSharingBatch(false);
    }
  };

  const copyToClipboard = (text, id) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-4xl overflow-hidden my-8 animate-in fade-in zoom-in-95 duration-200">
        {/* Modal Header */}
        <div className="px-6 py-5 bg-gradient-to-r from-[#1c1610] via-[#261e16] to-[#1c1610] text-white flex items-center justify-between border-b border-slate-700/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#261e16] border border-[#c27803]/40 flex items-center justify-center text-xl shadow-inner ring-2 ring-[#c27803]/20">
              📁
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-heading font-extrabold text-white uppercase tracking-wide">
                  {t("driveUploadTitle")}
                </h2>
                <span className="px-2 py-0.5 rounded-full bg-[#c27803]/20 text-[#f59e0b] font-mono text-[11px] font-bold">
                  {cls.code}
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5 font-medium">
                {cls.name} &bull; {cls.teacherName || "N/A"}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition text-sm"
          >
            ✕
          </button>
        </div>

        {/* Dual Condition & Ownership Notice */}
        <div className="bg-blue-50/70 border-b border-blue-100 px-6 py-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 text-blue-900 font-medium">
            <span className="text-base">🛡️</span>
            <div>
              <span>{t("ownerNotice")}</span>
              <div className="text-[11px] text-blue-700 font-normal">
                {isVi
                  ? "Tài liệu tải lên tại đây sẽ tự động hiển thị trong Student Portal của các học viên được cấp quyền."
                  : "Materials uploaded here will automatically show up in the Student Portal for authorized students."}
              </div>
            </div>
          </div>

          {folderLink && (
            <a
              href={folderLink}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg text-xs shadow-xs transition shrink-0"
            >
              <span>↗</span>
              <span>{t("openInDriveBtn")}</span>
            </a>
          )}
        </div>

        {/* Main Body Grid */}
        <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
          {/* Top Row: 1. Batch Grant Permissions + 2. Class Folder Status */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Box 1: Drive Folder Details */}
            <div className="p-4 bg-slate-50 border border-slate-200/80 rounded-xl space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                  <span>📂</span>
                  <span>{isVi ? "Thư mục Drive của lớp" : "Class Drive Folder"}</span>
                </span>
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                    folderId
                      ? "bg-emerald-100 text-emerald-800"
                      : "bg-amber-100 text-amber-800"
                  }`}
                >
                  {folderId ? t("driveFolderConnected") : t("noDriveFolder")}
                </span>
              </div>

              {folderId ? (
                <div className="space-y-1 text-xs">
                  <div className="text-slate-500 flex items-center justify-between">
                    <span>Folder ID:</span>
                    <span className="font-mono text-slate-800 bg-white px-1.5 py-0.5 rounded border border-slate-200 text-[11px] select-all">
                      {folderId}
                    </span>
                  </div>
                  <div className="text-slate-500 flex items-center justify-between pt-1">
                    <span>{isVi ? "Chế độ xem:" : "Sharing mode:"}</span>
                    <span className="text-slate-700 font-semibold">
                      Viewer (Học viên xem & tải)
                    </span>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-amber-700 italic">
                  {isVi
                    ? "Lớp này chưa có thư mục Google Drive. Khi tạo lớp mới với tùy chọn tạo Drive, thư mục sẽ tự động được khởi tạo."
                    : "No Google Drive folder associated with this class."}
                </p>
              )}
            </div>

            {/* Box 2: Batch Share Drive Permission */}
            <div className="p-4 bg-cyan-50/60 border border-[#c27803]/30 rounded-xl space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-heading font-bold text-[#261e16] uppercase tracking-wider flex items-center gap-1.5">
                  <span>👥</span>
                  <span>{isVi ? "Cấp quyền xem Drive" : "Drive View Permissions"}</span>
                </span>
                <span className="text-xs font-bold text-[#c27803] bg-white px-2 py-0.5 rounded-full border border-[#c27803]/20">
                  {validStudentEmails.length} {isVi ? "học viên" : "students"}
                </span>
              </div>

              <p className="text-[11px] text-slate-600 leading-relaxed font-medium">
                {isVi
                  ? "Cấp quyền Viewer cho toàn bộ email Gmail của học viên trong lớp để họ truy cập được mọi tài liệu trong thư mục."
                  : "Batch grant viewer permissions to all enrolled students' Gmail accounts."}
              </p>

              <button
                type="button"
                onClick={handleBatchShare}
                disabled={isSharingBatch || !folderId || validStudentEmails.length === 0}
                className="w-full py-2.5 px-4 bg-[#c27803] hover:bg-[#92400e] disabled:opacity-50 text-white rounded-lg text-xs font-heading font-bold uppercase tracking-wider shadow-xs transition flex items-center justify-center gap-2 active:translate-y-px"
              >
                {isSharingBatch ? (
                  <>
                    <svg className="animate-spin h-3.5 w-3.5 text-white" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                    </svg>
                    <span>{t("grantingDriveAccess")}</span>
                  </>
                ) : (
                  <>
                    <span>✨</span>
                    <span>
                      {isVi
                        ? `Cấp quyền Drive cho tất cả (${validStudentEmails.length}) học viên`
                        : `Grant Drive Access to All (${validStudentEmails.length}) Students`}
                    </span>
                  </>
                )}
              </button>

              {shareBatchResult && (
                <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-lg text-[11px] text-emerald-800 flex items-center gap-2">
                  <span>✅</span>
                  <span>
                    {isVi
                      ? `Đã cấp quyền xem Drive thành công cho ${shareBatchResult.count} học viên!`
                      : `Successfully granted Drive view access to ${shareBatchResult.count} students!`}
                  </span>
                </div>
              )}

              {shareBatchError && (
                <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-lg text-[11px] text-rose-800 flex items-center gap-2">
                  <span>⚠️</span>
                  <span>{shareBatchError}</span>
                </div>
              )}
            </div>
          </div>

          {/* Section: Upload File Directly to Google Drive */}
          <div className="p-5 bg-white border border-slate-200 rounded-2xl shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                <span>🚀</span>
                <span>{isVi ? "Tải tài liệu mới lên Google Drive" : "Upload New File to Google Drive"}</span>
              </h3>
              <span className="text-[11px] text-slate-400 font-medium">
                {t("maxFileSizeNote")}
              </span>
            </div>

            <form onSubmit={handleUploadSubmit} className="space-y-3.5">
              {/* Drag and Drop Box */}
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-xl p-5 text-center cursor-pointer transition ${
                  isDragging
                    ? "border-indigo-500 bg-indigo-50/50"
                    : selectedFile
                    ? "border-emerald-400 bg-emerald-50/30"
                    : "border-slate-200 hover:border-indigo-400 bg-slate-50/50 hover:bg-indigo-50/20"
                }`}
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  className="hidden"
                  disabled={isUploading}
                />

                {selectedFile ? (
                  <div className="flex items-center justify-center gap-3">
                    <span className="text-3xl">
                      {getFileIcon(selectedFile.type, selectedFile.name)}
                    </span>
                    <div className="text-left">
                      <div className="text-xs font-bold text-slate-900 break-all">
                        {selectedFile.name}
                      </div>
                      <div className="text-[11px] text-slate-500">
                        {formatBytes(selectedFile.size)} &bull; {selectedFile.type || "Document"}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedFile(null);
                        if (fileInputRef.current) fileInputRef.current.value = "";
                      }}
                      className="ml-3 text-slate-400 hover:text-rose-600 text-sm p-1"
                      title={isVi ? "Hủy chọn" : "Cancel"}
                    >
                      ✕
                    </button>
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    <div className="text-2xl">📤</div>
                    <div className="text-xs font-bold text-slate-700">
                      {t("selectFileToUpload")}
                    </div>
                    <div className="text-[11px] text-slate-400">
                      {isVi
                        ? "Hỗ trợ PDF bài giảng, Slide PowerPoint, Audio nghe MP3, Đề thi Word..."
                        : "Supports Lecture PDF, PowerPoint slides, MP3 audio, Word tests..."}
                    </div>
                  </div>
                )}
              </div>

              {/* Description Input */}
              <div>
                <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                  {t("fileDescription")}
                </label>
                <input
                  type="text"
                  value={fileDescription}
                  onChange={(e) => setFileDescription(e.target.value)}
                  placeholder={
                    isVi
                      ? "VD: Giáo trình Buổi 1, Đề thi thử Listening Test 01..."
                      : "E.g. Unit 1 Coursebook, Listening Practice Test 01..."
                  }
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
                  disabled={isUploading}
                />
              </div>

              {/* Progress bar */}
              {isUploading && (
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-[11px] text-indigo-700 font-semibold">
                    <span>{t("uploadingToDrive")}</span>
                    <span>{uploadProgress}%</span>
                  </div>
                  <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-indigo-600 transition-all duration-300 rounded-full"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Success Alert */}
              {uploadSuccessMsg && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <span className="text-base">🎉</span>
                    <div>
                      <div className="font-bold">{t("uploadSuccess")}</div>
                      <div className="text-[11px] text-emerald-700 break-all">
                        {uploadSuccessMsg.name}
                      </div>
                    </div>
                  </div>
                  {uploadSuccessMsg.url && (
                    <a
                      href={uploadSuccessMsg.url}
                      target="_blank"
                      rel="noreferrer"
                      className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-[11px] whitespace-nowrap transition"
                    >
                      {isVi ? "Xem trên Drive" : "View on Drive"} →
                    </a>
                  )}
                </div>
              )}

              {/* Error Alert */}
              {uploadError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-center gap-2">
                  <span>⚠️</span>
                  <span>{uploadError}</span>
                </div>
              )}

              {/* Submit Button */}
              <div className="flex justify-end pt-1">
                <button
                  type="submit"
                  disabled={!selectedFile || isUploading || !folderId}
                  className="px-5 py-2.5 bg-[#c27803] hover:bg-[#92400e] disabled:opacity-50 text-white rounded-xl text-xs font-heading font-bold uppercase tracking-wider shadow-sm transition flex items-center gap-2 active:translate-y-px"
                >
                  {isUploading ? (
                    <>
                      <svg className="animate-spin h-3.5 w-3.5 text-white" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                      </svg>
                      <span>{t("uploadingToDrive")}</span>
                    </>
                  ) : (
                    <>
                      <span>⬆️</span>
                      <span>{t("uploadToDriveBtn")}</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>

          {/* Section: Live Class Materials Explorer */}
          <div className="p-5 bg-white border border-slate-200 rounded-2xl shadow-xs space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <span className="text-base">🗂️</span>
                <h3 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider">
                  {t("classMaterialsList")}
                </h3>
                <span className="text-[11px] text-slate-400 font-semibold">
                  ({folderFiles.length})
                </span>
              </div>

              <button
                type="button"
                onClick={fetchClassFiles}
                disabled={isLoadingFiles || !folderId}
                className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 hover:underline disabled:opacity-50"
              >
                <span>🔄</span>
                <span>{isLoadingFiles ? "..." : t("refreshMaterials")}</span>
              </button>
            </div>

            {isLoadingFiles && (
              <div className="py-8 text-center text-xs text-slate-400 animate-pulse">
                {isVi ? "Đang đồng bộ danh sách tài liệu từ Google Drive..." : "Syncing materials from Google Drive..."}
              </div>
            )}

            {!isLoadingFiles && folderFiles.length === 0 && (
              <div className="py-8 text-center text-xs text-slate-400 italic">
                {t("noFilesYet")}
              </div>
            )}

            {!isLoadingFiles && folderFiles.length > 0 && (
              <div className="space-y-2">
                {folderFiles.map((file) => (
                  <div
                    key={file.id}
                    className="p-3 bg-slate-50 hover:bg-slate-100/80 rounded-xl border border-slate-200/80 flex items-center justify-between gap-3 transition group"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="text-2xl shrink-0">
                        {getFileIcon(file.mimeType, file.name)}
                      </span>
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-slate-900 truncate">
                          {file.name}
                        </div>
                        <div className="text-[11px] text-slate-400 flex items-center gap-2">
                          <span>{formatBytes(file.size)}</span>
                          {file.updatedAt && (
                            <>
                              <span>&bull;</span>
                              <span>{new Date(file.updatedAt).toLocaleDateString("vi-VN")}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => copyToClipboard(file.url, file.id)}
                        className="px-2.5 py-1 text-[11px] font-bold text-slate-600 hover:text-slate-900 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg transition"
                      >
                        {copiedId === file.id ? "✓ Đã chép" : t("copyLinkBtn")}
                      </button>

                      <a
                        href={file.url}
                        target="_blank"
                        rel="noreferrer"
                        className="px-2.5 py-1 text-[11px] font-bold text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 rounded-lg transition flex items-center gap-1"
                      >
                        <span>↗</span>
                        <span>{t("openInDriveBtn")}</span>
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <div className="text-[11px] text-slate-400">
            {isVi
              ? "Tự động kết nối Google Drive API thông qua Google Apps Script."
              : "Directly connected to Google Drive API via Google Apps Script."}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-xl text-xs font-bold transition"
          >
            {isVi ? "Đóng" : "Close"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ClassDriveMaterialsModal;
