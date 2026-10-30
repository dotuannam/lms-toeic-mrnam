import React, { useState, useEffect, useMemo } from "react";
import {
  getVocabWords,
  subscribeVocabWords,
  createVocabWord,
  updateVocabWord,
  deleteVocabWord,
  batchAddVocabWords,
  checkVocabDuplicates,
  restoreDefaultVocabBank,
  getGameSettings,
  saveGameSettings,
  getAllGameLeaderboard,
  DEFAULT_VOCAB_BANK,
} from "../../services/vocabGameService";
import { useLanguage } from "../../context/LanguageContext";

export const VocabGamesAdminPage = () => {
  const { lang } = useLanguage();
  const isVi = lang === "vi";

  const [activeTab, setActiveTab] = useState("words"); // "words" | "settings" | "leaderboard"
  const [words, setWords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTopic, setSelectedTopic] = useState("all");

  // Game Settings State
  const [settings, setSettings] = useState(null);
  const [savingSettings, setSavingSettings] = useState(false);
  const [settingsNotice, setSettingsNotice] = useState(null);

  // Leaderboard State
  const [leaderboardData, setLeaderboardData] = useState({
    recentSessions: [],
    leaderboard: [],
    totalSessionsCount: 0,
  });
  const [loadingLeaderboard, setLoadingLeaderboard] = useState(false);

  // Word Modal State
  const [showWordModal, setShowWordModal] = useState(false);
  const [editingWord, setEditingWord] = useState(null);
  const [wordSubmitting, setWordSubmitting] = useState(false);
  const [wordFormData, setWordFormData] = useState({
    word: "",
    ipa: "",
    pos: "v.",
    meaning: "",
    example: "",
    topic: "Business",
    level: "B1",
  });

  // Batch Import Modal State
  const [showImportModal, setShowImportModal] = useState(false);
  const [importText, setImportText] = useState("");
  const [importing, setImporting] = useState(false);
  const [duplicateAction, setDuplicateAction] = useState("skip"); // "skip" | "update"
  const [previewFilterTab, setPreviewFilterTab] = useState("all"); // "all" | "new" | "duplicates"
  const [importFeedback, setImportFeedback] = useState(null);
  const [restoringDefaults, setRestoringDefaults] = useState(false);

  // Real-time duplicate check for Single Word modal
  const duplicateSingleMatch = useMemo(() => {
    if (!wordFormData.word || editingWord) return null;
    const clean = wordFormData.word.trim().toLowerCase();
    if (!clean) return null;
    return words.find((w) => (w.word || "").trim().toLowerCase() === clean);
  }, [wordFormData.word, editingWord, words]);

  // Smart multi-format parser for vocabulary lines (Supports hyphens, colons, pipes, and Excel/Sheets tabs)
  const parseImportLines = (text) => {
    if (!text || !text.trim()) return [];
    const lines = text.split("\n").map((l) => l.trim()).filter((l) => l.length > 0);
    const parsed = [];

    lines.forEach((line, idx) => {
      // 1. Tab-separated (e.g. copied directly from Excel or Google Sheets)
      if (line.includes("\t")) {
        const parts = line.split("\t").map((p) => p.trim());
        const word = parts[0] || "";
        if (word) {
          let ipa = "";
          let pos = "n.";
          let meaning = "";
          let example = "";
          let topic = "General Business";
          let level = "B1";

          if (parts[1]?.startsWith("/") && parts[1]?.endsWith("/")) {
            ipa = parts[1];
            if (["v.", "n.", "adj.", "adv.", "prep.", "conj."].some((p) => parts[2]?.startsWith(p))) {
              pos = parts[2];
              meaning = parts[3] || "";
              example = parts[4] || "";
            } else {
              meaning = parts[2] || "";
              example = parts[3] || "";
            }
          } else {
            meaning = parts[1] || "";
            example = parts[2] || "";
          }

          parsed.push({
            rawLine: line,
            word,
            ipa,
            pos,
            meaning: meaning || word,
            example,
            topic,
            level,
            lineNumber: idx + 1,
          });
        }
        return;
      }

      // 2. Delimiter separated: " - ", " – ", " — ", " | ", " : ", or standard "-", ":", "|"
      let delimiter = null;
      if (line.includes(" - ")) delimiter = " - ";
      else if (line.includes(" – ")) delimiter = " – ";
      else if (line.includes(" — ")) delimiter = " — ";
      else if (line.includes(" | ")) delimiter = " | ";
      else if (line.includes(" : ")) delimiter = " : ";
      else if (line.includes(":")) delimiter = ":";
      else if (line.includes("-")) delimiter = "-";
      else if (line.includes("|")) delimiter = "|";

      let parts = [];
      if (delimiter) {
        parts = line.split(delimiter).map((p) => p.trim()).filter(Boolean);
      } else {
        parts = [line];
      }

      if (parts.length >= 2) {
        const word = parts[0];
        let ipa = "";
        let pos = "n.";
        let meaning = "";
        let example = "";

        const secondPart = parts[1];
        const hasIpa = secondPart.startsWith("/") && secondPart.endsWith("/");

        if (hasIpa) {
          ipa = secondPart;
          meaning = parts[2] || "";
          example = parts[3] || "";
        } else {
          meaning = secondPart;
          example = parts[2] || "";
        }

        parsed.push({
          rawLine: line,
          word,
          ipa,
          pos,
          meaning: meaning || word,
          example,
          topic: "General Business",
          level: "B1",
          lineNumber: idx + 1,
        });
      } else if (parts.length === 1 && parts[0]) {
        parsed.push({
          rawLine: line,
          word: parts[0],
          ipa: "",
          pos: "n.",
          meaning: parts[0],
          example: "",
          topic: "General Business",
          level: "B1",
          lineNumber: idx + 1,
        });
      }
    });

    return parsed;
  };

  // Real-time reactive analysis of parsed words against database words
  const parsedWords = useMemo(() => {
    return parseImportLines(importText);
  }, [importText]);

  const duplicateAnalysis = useMemo(() => {
    if (!parsedWords || parsedWords.length === 0) return null;
    return checkVocabDuplicates(parsedWords, words);
  }, [parsedWords, words]);

  // Insert sample text for testing with 1 duplicate and 4 new words
  const insertSampleText = () => {
    const sample = `Accommodate - /əˈkɒm.ə.deɪt/ - Cung cấp chỗ ở, đáp ứng (Từ này đã có trong CSDL để thử nghiệm đối chiếu trùng lặp)
Benchmark - /ˈbentʃ.mɑːk/ - Tiêu chuẩn đánh giá hiệu suất - Our service sets the quality benchmark.
Consolidate - /kənˈsɒl.ɪ.deɪt/ - Củng cố, hợp nhất các bộ phận - The firm will consolidate branches.
Downsize - /ˈdaʊn.saɪz/ - Thu hẹp quy mô, tinh giản biên chế - The factory decided to downsize.
Optimize - /ˈɒp.tɪ.maɪz/ - Tối ưu hóa hiệu năng - We need to optimize the operational workflow.`;
    setImportText(sample);
  };

  // Text-To-Speech audio pronunciation test
  const speakWord = (text) => {
    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = "en-US";
      utterance.rate = 0.9;
      window.speechSynthesis.speak(utterance);
    }
  };

  useEffect(() => {
    const unsub = subscribeVocabWords((data) => {
      setWords(data);
      setLoading(false);
    });

    getGameSettings().then((res) => {
      setSettings(res);
    });

    return () => unsub();
  }, []);

  useEffect(() => {
    if (activeTab === "leaderboard") {
      setLoadingLeaderboard(true);
      getAllGameLeaderboard()
        .then((data) => setLeaderboardData(data))
        .finally(() => setLoadingLeaderboard(false));
    }
  }, [activeTab]);

  const openCreateWordModal = () => {
    setEditingWord(null);
    setWordFormData({
      word: "",
      ipa: "",
      pos: "v.",
      meaning: "",
      example: "",
      topic: "Business",
      level: "B1",
    });
    setShowWordModal(true);
  };

  const openEditWordModal = (item) => {
    setEditingWord(item);
    setWordFormData({
      word: item.word || "",
      ipa: item.ipa || "",
      pos: item.pos || "v.",
      meaning: item.meaning || "",
      example: item.example || "",
      topic: item.topic || "Business",
      level: item.level || "B1",
    });
    setShowWordModal(true);
  };

  const handleWordSubmit = async (e) => {
    e.preventDefault();
    setWordSubmitting(true);
    try {
      if (editingWord) {
        await updateVocabWord(editingWord.id, wordFormData);
      } else {
        // If it's a new word but duplicates an existing word in DB
        if (duplicateSingleMatch) {
          const confirmUpdate = window.confirm(
            `Từ "${duplicateSingleMatch.word}" đã tồn tại trong CSDL (Nghĩa: "${duplicateSingleMatch.meaning}").\n\nBạn có muốn CẬP NHẬT thông tin cho từ hiện tại không?\n- Chọn [OK] để Cập nhật nghĩa/thông tin mới\n- Chọn [Cancel] để Hủy và chỉnh sửa lại tên từ`
          );
          if (confirmUpdate) {
            await updateVocabWord(duplicateSingleMatch.id, wordFormData);
            setShowWordModal(false);
            return;
          } else {
            setWordSubmitting(false);
            return;
          }
        }
        await createVocabWord(wordFormData);
      }
      setShowWordModal(false);
    } catch (err) {
      alert("Lỗi khi lưu từ vựng: " + err.message);
    } finally {
      setWordSubmitting(false);
    }
  };

  const handleRestoreDefaults = async () => {
    if (!window.confirm("Bạn có muốn nạp bổ sung 20 từ vựng TOEIC mẫu mặc định vào kho không? (Các từ vựng đã có trong CSDL sẽ được giữ nguyên, không bị ghi đè)")) {
      return;
    }
    setRestoringDefaults(true);
    try {
      const res = await restoreDefaultVocabBank();
      alert(`Đã nạp bổ sung ${res.seededCount} từ mặc định còn thiếu vào kho từ vựng!`);
    } catch (err) {
      alert("Lỗi khi khôi phục từ mặc định: " + err.message);
    } finally {
      setRestoringDefaults(false);
    }
  };

  const handleDeleteWord = async (item) => {
    if (window.confirm(`Bạn có chắc muốn xóa từ "${item.word}"?`)) {
      try {
        await deleteVocabWord(item.id);
      } catch (err) {
        alert("Lỗi khi xóa từ: " + err.message);
      }
    }
  };

  const handleSaveSettings = async (e) => {
    e.preventDefault();
    setSavingSettings(true);
    try {
      await saveGameSettings(settings);
      setSettingsNotice("Đã lưu thông số cấu hình game thành công!");
      setTimeout(() => setSettingsNotice(null), 4000);
    } catch (err) {
      alert("Lỗi khi lưu cấu hình: " + err.message);
    } finally {
      setSavingSettings(false);
    }
  };

  // Cumulative Batch Import with Duplicate Management
  const handleBatchImport = async () => {
    if (!parsedWords || parsedWords.length === 0) {
      alert("Không nhận diện được từ vựng nào. Vui lòng kiểm tra lại từng dòng theo mẫu: Từ vựng - /IPA/ - Nghĩa tiếng Việt");
      return;
    }
    setImporting(true);
    try {
      const res = await batchAddVocabWords(parsedWords, {
        overwriteDuplicates: duplicateAction === "update",
        existingWords: words,
      });

      const summaryText =
        `🎉 Đã cộng dồn thành công ${res.addedCount} từ mới vào kho từ vựng!` +
        (res.updatedCount > 0 ? `\n🔄 Đã cập nhật ${res.updatedCount} từ đã có trong CSDL.` : "") +
        (res.skippedCount > 0 ? `\n⏭️ Đã bỏ qua ${res.skippedCount} từ trùng lặp tiếng Anh.` : "") +
        `\n📊 Tổng số từ vựng trong kho hiện tại: ${words.length + res.addedCount} từ.`;

      setImportFeedback({
        type: "success",
        title: "Cộng Dồn Từ Vựng Thành Công!",
        message: summaryText,
        details: res,
      });

      setImportText("");

      setTimeout(() => {
        setShowImportModal(false);
        setImportFeedback(null);
      }, 2500);
    } catch (err) {
      alert("Lỗi khi import: " + err.message);
    } finally {
      setImporting(false);
    }
  };

  // Filtered Words
  const topics = Array.from(new Set(words.map((w) => w.topic || "General"))).filter(Boolean);
  const filteredWords = words.filter((w) => {
    const matchesTopic = selectedTopic === "all" || w.topic === selectedTopic;
    const matchesSearch =
      (w.word || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (w.meaning || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (w.topic || "").toLowerCase().includes(searchQuery.toLowerCase());
    return matchesTopic && matchesSearch;
  });

  return (
    <div className="space-y-6">
      {/* 1. TOP HERO HEADER */}
      <div className="bg-gradient-to-r from-[#261e16] via-[#1c1610] to-[#261e16] rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden border border-[#c27803]/40">
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 bg-[#c27803]/20 rounded-full blur-3xl pointer-events-none"></div>

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#c27803]/20 text-[#f59e0b] border border-[#c27803]/40 text-xs font-heading font-bold uppercase tracking-wider">
              <span>🎮</span>
              <span>{isVi ? "Phân Hệ Mini Game Từ Vựng (Admin Master)" : "Vocabulary Mini Games Admin"}</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-heading font-black tracking-wide text-white uppercase">
              {isVi ? "Quản Trị Kho Từ Vựng & Cấu Hình Game" : "Vocab Bank & Mini Games Hub"}
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 max-w-2xl leading-relaxed">
              {isVi
                ? "Quản lý ngân hàng từ vựng đa chủ đề, thiết lập thời gian và luật chơi các Mini Game (Speedrun Quiz, Lật thẻ Memory, Sắp xếp chữ cái), đồng thời theo dõi bảng xếp hạng học viên."
                : "Manage the central vocabulary bank, configure mini game parameters, and inspect student leaderboard stats."}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              disabled={restoringDefaults}
              onClick={handleRestoreDefaults}
              className="inline-flex items-center gap-2 px-3.5 py-2 bg-white/5 hover:bg-white/15 text-slate-300 hover:text-white rounded-xl text-[11px] font-heading font-bold uppercase tracking-wider transition border border-white/10 disabled:opacity-50"
              title="Khôi phục hoặc nạp bổ sung 20 từ vựng TOEIC mẫu mặc định nếu bị thiếu"
            >
              <span>🔄</span>
              <span>{restoringDefaults ? "Đang nạp..." : (isVi ? "Nạp 20 Từ Mặc Định" : "Restore Defaults")}</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setShowImportModal(true);
                setImportFeedback(null);
              }}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-heading font-bold uppercase tracking-wider transition border border-white/20"
            >
              <span>📥</span>
              <span>{isVi ? "Thêm Nhanh & Đối Chiếu" : "Batch Import"}</span>
            </button>
            <button
              type="button"
              onClick={openCreateWordModal}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#c27803] hover:bg-[#b45309] text-white rounded-xl text-xs font-heading font-extrabold uppercase tracking-wider shadow-lg shadow-amber-950/40 transition active:translate-y-px"
            >
              <span>+</span>
              <span>{isVi ? "Thêm Từ Vựng Mới" : "Add New Word"}</span>
            </button>
          </div>
        </div>

        {/* 3 Nav Tabs in Banner */}
        <div className="flex items-center gap-2 pt-6 mt-6 border-t border-white/10 overflow-x-auto text-xs">
          <button
            type="button"
            onClick={() => setActiveTab("words")}
            className={`px-4 py-2 rounded-xl font-heading font-bold uppercase tracking-wider transition flex items-center gap-2 ${
              activeTab === "words"
                ? "bg-[#c27803] text-white shadow-sm"
                : "bg-white/10 text-slate-300 hover:bg-white/20"
            }`}
          >
            <span>📖</span>
            <span>Kho Từ Vựng ({words.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("settings")}
            className={`px-4 py-2 rounded-xl font-heading font-bold uppercase tracking-wider transition flex items-center gap-2 ${
              activeTab === "settings"
                ? "bg-[#c27803] text-white shadow-sm"
                : "bg-white/10 text-slate-300 hover:bg-white/20"
            }`}
          >
            <span>⚙️</span>
            <span>Cấu Hình Thông Số Game</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("leaderboard")}
            className={`px-4 py-2 rounded-xl font-heading font-bold uppercase tracking-wider transition flex items-center gap-2 ${
              activeTab === "leaderboard"
                ? "bg-[#c27803] text-white shadow-sm"
                : "bg-white/10 text-slate-300 hover:bg-white/20"
            }`}
          >
            <span>🏆</span>
            <span>Bảng Xếp Hạng & Thống Kê</span>
          </button>
        </div>
      </div>

      {/* 2. TAB CONTENT */}
      {activeTab === "words" && (
        <div className="space-y-4">
          {/* Search & Topic Filters */}
          <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/90 shadow-2xs flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
            <div className="relative flex-1 max-w-md">
              <input
                type="text"
                placeholder="Tìm từ vựng, phiên âm IPA hoặc nghĩa tiếng Việt..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#c27803]/20 focus:border-[#c27803]"
              />
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs">🔍</span>
            </div>

            <div className="flex items-center gap-2 self-start sm:self-auto overflow-x-auto">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">Chủ đề:</span>
              <select
                value={selectedTopic}
                onChange={(e) => setSelectedTopic(e.target.value)}
                className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none"
              >
                <option value="all">Tất cả chủ đề ({words.length})</option>
                {topics.map((top) => (
                  <option key={top} value={top}>
                    {top}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Words Table */}
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#261e16] text-amber-200 uppercase font-heading font-bold text-[11px] tracking-wider">
                  <tr>
                    <th className="py-3 px-4">Từ Vựng & IPA</th>
                    <th className="py-3 px-4">Loại Từ</th>
                    <th className="py-3 px-4">Nghĩa Tiếng Việt</th>
                    <th className="py-3 px-4">Câu Ví Dụ</th>
                    <th className="py-3 px-4">Chủ Đề & Cấp Độ</th>
                    <th className="py-3 px-4 text-right">Thao Tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {loading ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-slate-400">
                        Đang tải kho từ vựng...
                      </td>
                    </tr>
                  ) : filteredWords.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-slate-400">
                        Không tìm thấy từ vựng nào phù hợp.
                      </td>
                    </tr>
                  ) : (
                    filteredWords.map((item) => (
                      <tr key={item.id} className="hover:bg-amber-50/40 transition">
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => speakWord(item.word)}
                              className="w-7 h-7 rounded-lg bg-amber-100 hover:bg-[#c27803] text-amber-800 hover:text-white flex items-center justify-center text-xs transition shrink-0"
                              title="Nghe phát âm chuẩn"
                            >
                              🔊
                            </button>
                            <div>
                              <div className="font-heading font-extrabold text-sm text-slate-900">
                                {item.word}
                              </div>
                              <div className="font-mono text-[11px] text-[#c27803]">{item.ipa}</div>
                            </div>
                          </div>
                        </td>
                        <td className="py-3.5 px-4 font-mono font-bold text-slate-500">
                          {item.pos || "n."}
                        </td>
                        <td className="py-3.5 px-4 font-semibold text-slate-900 max-w-xs">
                          {item.meaning}
                        </td>
                        <td className="py-3.5 px-4 text-slate-500 max-w-sm italic line-clamp-2">
                          "{item.example || "—"}"
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-1.5">
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700">
                              {item.topic || "General"}
                            </span>
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-100 text-amber-900">
                              {item.level || "B1"}
                            </span>
                          </div>
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <div className="inline-flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => openEditWordModal(item)}
                              className="px-2.5 py-1 text-slate-600 hover:text-[#c27803] hover:bg-slate-100 rounded-lg text-xs font-semibold transition"
                            >
                              Sửa
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteWord(item)}
                              className="px-2.5 py-1 text-rose-600 hover:text-rose-800 hover:bg-rose-50 rounded-lg text-xs font-semibold transition"
                            >
                              Xóa
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 3. TAB GAME SETTINGS */}
      {activeTab === "settings" && settings && (
        <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200/90 shadow-2xs max-w-2xl space-y-6">
          <div>
            <h3 className="text-lg font-heading font-black text-slate-900 uppercase">
              Cấu Hình Thông Số & Luật Chơi Mini Game
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Tùy chỉnh thời gian trả lời, số câu hỏi mỗi lượt chơi và hệ thống điểm thưởng để tạo sự hấp dẫn cho học viên.
            </p>
          </div>

          {settingsNotice && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-semibold flex items-center gap-2">
              <span>✓</span>
              <span>{settingsNotice}</span>
            </div>
          )}

          <form onSubmit={handleSaveSettings} className="space-y-4 text-xs">
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
              <h4 className="font-heading font-bold text-xs uppercase tracking-wider text-slate-800 flex items-center gap-2">
                <span>⚡</span>
                <span>Game 1: Trắc Nghiệm Phản Xạ Tốc Độ (Speedrun Quiz)</span>
              </h4>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                    Thời gian mỗi câu hỏi (Giây)
                  </label>
                  <input
                    type="number"
                    min="5"
                    max="60"
                    value={settings.speedrunSeconds}
                    onChange={(e) =>
                      setSettings({ ...settings, speedrunSeconds: Number(e.target.value) })
                    }
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                    Số câu hỏi mỗi lượt chơi
                  </label>
                  <input
                    type="number"
                    min="5"
                    max="30"
                    value={settings.questionsPerGame}
                    onChange={(e) =>
                      setSettings({ ...settings, questionsPerGame: Number(e.target.value) })
                    }
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                    Điểm số mỗi câu đúng
                  </label>
                  <input
                    type="number"
                    min="10"
                    max="500"
                    value={settings.pointsPerCorrect}
                    onChange={(e) =>
                      setSettings({ ...settings, pointsPerCorrect: Number(e.target.value) })
                    }
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                    Chuỗi combo streak thưởng
                  </label>
                  <label className="flex items-center gap-2 mt-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.streakBonus}
                      onChange={(e) => setSettings({ ...settings, streakBonus: e.target.checked })}
                      className="w-4 h-4 text-[#c27803] rounded"
                    />
                    <span className="font-semibold text-slate-700">Nhân 1.5x điểm khi chuỗi đúng &gt; 3</span>
                  </label>
                </div>
              </div>
            </div>

            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
              <h4 className="font-heading font-bold text-xs uppercase tracking-wider text-slate-800 flex items-center gap-2">
                <span>🎴</span>
                <span>Game 2 & 3: Nối Cặp Memory & Sắp Xếp Chữ Cái</span>
              </h4>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                    Số cặp thẻ Memory (Pairs)
                  </label>
                  <select
                    value={settings.memoryPairsCount}
                    onChange={(e) =>
                      setSettings({ ...settings, memoryPairsCount: Number(e.target.value) })
                    }
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800"
                  >
                    <option value={4}>4 cặp (8 thẻ - Dễ)</option>
                    <option value={6}>6 cặp (12 thẻ - Chuẩn)</option>
                    <option value={8}>8 cặp (16 thẻ - Thử thách)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                    Thời gian xếp chữ cái (Giây)
                  </label>
                  <input
                    type="number"
                    min="15"
                    max="90"
                    value={settings.scrambleSeconds}
                    onChange={(e) =>
                      setSettings({ ...settings, scrambleSeconds: Number(e.target.value) })
                    }
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-3">
              <button
                type="submit"
                disabled={savingSettings}
                className="px-6 py-2.5 bg-[#c27803] hover:bg-[#b45309] text-white rounded-xl text-xs font-heading font-extrabold uppercase tracking-wider shadow-sm transition disabled:opacity-50"
              >
                {savingSettings ? "Đang lưu..." : "Lưu Cấu Hình Game"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* 4. TAB LEADERBOARD & STATS */}
      {activeTab === "leaderboard" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-2xs">
              <span className="text-xs font-heading font-bold text-slate-500 uppercase">Tổng Lượt Chơi</span>
              <div className="text-2xl font-heading font-extrabold text-slate-900 mt-1">
                {leaderboardData.totalSessionsCount}
              </div>
              <span className="text-[11px] text-slate-400">Trên cả 3 Mini Game</span>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-2xs">
              <span className="text-xs font-heading font-bold text-slate-500 uppercase">Số Học Viên Tham Gia</span>
              <div className="text-2xl font-heading font-extrabold text-[#c27803] mt-1">
                {leaderboardData.leaderboard.length}
              </div>
              <span className="text-[11px] text-slate-400">Đã tích lũy điểm XP</span>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-2xs">
              <span className="text-xs font-heading font-bold text-slate-500 uppercase">Điểm Cao Kỷ Lục</span>
              <div className="text-2xl font-heading font-extrabold text-emerald-600 mt-1">
                {leaderboardData.leaderboard[0]?.highestScore || 0} pts
              </div>
              <span className="text-[11px] text-slate-400">
                Top 1: {leaderboardData.leaderboard[0]?.studentName || "Chưa có"}
              </span>
            </div>
          </div>

          {/* Leaderboard Table */}
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-heading font-bold text-sm text-slate-900 uppercase flex items-center gap-2">
                <span>🏆</span>
                <span>Bảng Vinh Danh Top Học Viên Chăm Chỉ & Điểm Cao Nhất</span>
              </h3>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#261e16] text-amber-200 uppercase font-heading font-bold text-[11px] tracking-wider">
                  <tr>
                    <th className="py-3 px-4">Hạng</th>
                    <th className="py-3 px-4">Học Viên</th>
                    <th className="py-3 px-4">Email</th>
                    <th className="py-3 px-4">Tổng Điểm XP</th>
                    <th className="py-3 px-4">Điểm Kỷ Lục</th>
                    <th className="py-3 px-4">Số Lượt Chơi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {loadingLeaderboard ? (
                    <tr>
                      <td colSpan={6} className="py-10 text-center text-slate-400">
                        Đang tổng hợp bảng xếp hạng...
                      </td>
                    </tr>
                  ) : leaderboardData.leaderboard.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-10 text-center text-slate-400">
                        Chưa có lượt chơi game nào được ghi nhận.
                      </td>
                    </tr>
                  ) : (
                    leaderboardData.leaderboard.map((item, idx) => (
                      <tr key={item.studentId || idx} className="hover:bg-amber-50/40 transition">
                        <td className="py-3 px-4">
                          <span
                            className={`w-6 h-6 rounded-full inline-flex items-center justify-center font-bold text-xs ${
                              idx === 0
                                ? "bg-amber-400 text-white shadow-xs"
                                : idx === 1
                                ? "bg-slate-300 text-slate-800"
                                : idx === 2
                                ? "bg-amber-700 text-white"
                                : "text-slate-500"
                            }`}
                          >
                            {idx + 1}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-heading font-bold text-slate-900">
                          {item.studentName}
                        </td>
                        <td className="py-3 px-4 text-slate-500 font-mono text-[11px]">
                          {item.studentEmail || "—"}
                        </td>
                        <td className="py-3 px-4 font-heading font-extrabold text-sm text-[#c27803]">
                          {item.totalScore.toLocaleString("vi-VN")} XP
                        </td>
                        <td className="py-3 px-4 font-bold text-emerald-700">
                          {item.highestScore} pts
                        </td>
                        <td className="py-3 px-4 font-semibold text-slate-700">
                          {item.totalGames} lượt
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 5. MODAL THÊM / SỬA TỪ VỰNG */}
      {showWordModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between pb-4 border-b border-slate-100 mb-4">
              <div>
                <h3 className="text-lg font-heading font-black text-slate-900 uppercase">
                  {editingWord ? "Chỉnh Sửa Từ Vựng" : "Thêm Từ Vựng Mới Vào Kho"}
                </h3>
                <p className="text-xs text-slate-500">
                  Từ vựng sẽ tự động nạp vào bộ đề ôn tập và các Mini Game của học viên.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowWordModal(false)}
                className="text-slate-400 hover:text-slate-600 text-lg font-bold p-1"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleWordSubmit} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                    Từ Vựng Tiếng Anh *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="VD: Accommodate"
                    value={wordFormData.word}
                    onChange={(e) => setWordFormData({ ...wordFormData, word: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800"
                  />
                  {duplicateSingleMatch && (
                    <div className="mt-1.5 p-2 bg-amber-50 border border-amber-300 rounded-xl text-[11px] text-amber-900 flex items-start justify-between gap-2 shadow-2xs">
                      <div className="space-y-0.5">
                        <div className="font-bold flex items-center gap-1 text-amber-800">
                          <span>⚠️</span>
                          <span>Từ này đã có trong CSDL!</span>
                        </div>
                        <p className="text-[10px] text-amber-700">
                          Nghĩa: <strong>{duplicateSingleMatch.meaning}</strong> ({duplicateSingleMatch.topic || "Chung"})
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => openEditWordModal(duplicateSingleMatch)}
                        className="px-2 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-[10px] font-bold uppercase tracking-wider whitespace-nowrap shadow-2xs"
                      >
                        ✏️ Sửa từ này
                      </button>
                    </div>
                  )}
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                    Phiên Âm IPA
                  </label>
                  <input
                    type="text"
                    placeholder="VD: /əˈkɒm.ə.deɪt/"
                    value={wordFormData.ipa}
                    onChange={(e) => setWordFormData({ ...wordFormData, ipa: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono text-[#c27803]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                    Từ Loại
                  </label>
                  <select
                    value={wordFormData.pos}
                    onChange={(e) => setWordFormData({ ...wordFormData, pos: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold"
                  >
                    <option value="v.">Động từ (v.)</option>
                    <option value="n.">Danh từ (n.)</option>
                    <option value="adj.">Tính từ (adj.)</option>
                    <option value="adv.">Trạng từ (adv.)</option>
                    <option value="prep.">Giới từ (prep.)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                    Cấp Độ
                  </label>
                  <select
                    value={wordFormData.level}
                    onChange={(e) => setWordFormData({ ...wordFormData, level: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold"
                  >
                    <option value="A2">A2 (Cơ bản)</option>
                    <option value="B1">B1 (Trung cấp)</option>
                    <option value="B2">B2 (Khá)</option>
                    <option value="C1">C1 (Nâng cao)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                    Chủ Đề
                  </label>
                  <input
                    type="text"
                    placeholder="VD: Business"
                    value={wordFormData.topic}
                    onChange={(e) => setWordFormData({ ...wordFormData, topic: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                  Nghĩa Tiếng Việt *
                </label>
                <input
                  type="text"
                  required
                  placeholder="VD: Đáp ứng, cung cấp chỗ ở, chứa được"
                  value={wordFormData.meaning}
                  onChange={(e) => setWordFormData({ ...wordFormData, meaning: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                  Câu Ví Dụ Minh Họa
                </label>
                <textarea
                  rows={2}
                  placeholder="VD: The new auditorium can accommodate up to 600 attendees."
                  value={wordFormData.example}
                  onChange={(e) => setWordFormData({ ...wordFormData, example: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs leading-relaxed"
                />
              </div>

              <div className="flex gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowWordModal(false)}
                  className="flex-1 py-2.5 px-4 border border-slate-200 text-slate-600 rounded-xl text-xs font-semibold hover:bg-slate-50"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={wordSubmitting}
                  className="flex-1 py-2.5 px-4 bg-[#c27803] text-white rounded-xl text-xs font-heading font-extrabold uppercase tracking-wider hover:bg-[#b45309] shadow-sm disabled:opacity-50"
                >
                  {wordSubmitting ? "Đang lưu..." : editingWord ? "Lưu Thay Đổi" : "Thêm Từ Mới"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 6. MODAL THÊM NHANH & ĐỐI CHIẾU TRÙNG LẶP CSDL */}
      {showImportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-3 sm:p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl border border-slate-100 max-h-[92vh] overflow-y-auto space-y-4">
            {/* Header */}
            <div className="flex items-start justify-between pb-3 border-b border-slate-100">
              <div className="space-y-1">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[10px] font-heading font-extrabold uppercase tracking-wider">
                  <span>⚡</span>
                  <span>Cộng dồn thông minh & Đối chiếu CSDL</span>
                </div>
                <h3 className="text-lg font-heading font-black text-slate-900 uppercase">
                  Thêm Nhanh Danh Sách Từ Vựng
                </h3>
                <p className="text-xs text-slate-500">
                  Tự động cộng dồn vào kho từ vựng hiện có, kiểm tra và đối chiếu xem từ vựng tiếng Anh đã tồn tại trong CSDL chưa.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowImportModal(false);
                  setImportFeedback(null);
                }}
                className="text-slate-400 hover:text-slate-600 text-lg font-bold p-1 rounded-lg hover:bg-slate-100"
              >
                ✕
              </button>
            </div>

            {/* Quick Helper Actions */}
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
              <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                Nhập hoặc dán danh sách từ:
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={insertSampleText}
                  className="px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-[#c27803] border border-amber-200 rounded-lg text-[11px] font-semibold transition"
                >
                  📋 Dán mẫu 5 từ (kèm từ test trùng)
                </button>
                {importText && (
                  <button
                    type="button"
                    onClick={() => setImportText("")}
                    className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg text-[11px] font-semibold transition"
                  >
                    🧹 Xóa trắng
                  </button>
                )}
              </div>
            </div>

            {/* Format Instructions Banner */}
            <div className="p-3 bg-amber-50/70 rounded-xl border border-amber-200/80 text-xs text-amber-900 space-y-1">
              <div className="font-bold flex items-center gap-1.5 text-amber-900">
                <span>💡</span>
                <span>Hỗ trợ đa định dạng (Dấu gạch ngang, hai chấm, hoặc copy từ Excel / Google Sheets):</span>
              </div>
              <div className="font-mono text-[11px] text-amber-800 bg-white/70 px-2 py-1 rounded-md border border-amber-200/50">
                Từ vựng - /Phiên âm IPA/ - Nghĩa tiếng Việt - Câu ví dụ
              </div>
            </div>

            {/* Textarea */}
            <div>
              <textarea
                rows={6}
                placeholder={`Accommodate - /əˈkɒm.ə.deɪt/ - Cung cấp chỗ ở, đáp ứng\nBenchmark - /ˈbentʃ.mɑːk/ - Tiêu chuẩn đánh giá hiệu suất\nConsolidate - /kənˈsɒl.ɪ.deɪt/ - Củng cố, hợp nhất các bộ phận`}
                value={importText}
                onChange={(e) => setImportText(e.target.value)}
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono leading-relaxed focus:bg-white focus:border-[#c27803] focus:ring-1 focus:ring-[#c27803] transition"
              />
            </div>

            {/* Live Duplicate Analysis & Cross-Reference Card */}
            {duplicateAnalysis && (
              <div className="space-y-3 p-4 bg-slate-50 rounded-2xl border border-slate-200">
                {/* 3 Metric Badges */}
                <div className="grid grid-cols-3 gap-2.5 text-center">
                  <div className="p-2.5 bg-emerald-50 rounded-xl border border-emerald-200">
                    <div className="text-[10px] font-bold uppercase text-emerald-800 tracking-wider">
                      🟢 Từ Mới Hợp Lệ
                    </div>
                    <div className="text-xl font-heading font-black text-emerald-700 mt-0.5">
                      {duplicateAnalysis.newWords.length}
                    </div>
                    <div className="text-[9px] text-emerald-600">Sẵn sàng cộng dồn</div>
                  </div>

                  <div className="p-2.5 bg-amber-50 rounded-xl border border-amber-200">
                    <div className="text-[10px] font-bold uppercase text-amber-800 tracking-wider">
                      🟡 Trùng Trong CSDL
                    </div>
                    <div className="text-xl font-heading font-black text-amber-700 mt-0.5">
                      {duplicateAnalysis.duplicateWords.length}
                    </div>
                    <div className="text-[9px] text-amber-600">Đã tồn tại trong kho</div>
                  </div>

                  <div className="p-2.5 bg-slate-100 rounded-xl border border-slate-200">
                    <div className="text-[10px] font-bold uppercase text-slate-700 tracking-wider">
                      📊 Tổng Dòng Nhận Diện
                    </div>
                    <div className="text-xl font-heading font-black text-slate-800 mt-0.5">
                      {parsedWords.length}
                    </div>
                    <div className="text-[9px] text-slate-500">
                      {duplicateAnalysis.batchDuplicates.length > 0
                        ? `(${duplicateAnalysis.batchDuplicates.length} lặp trong list)`
                        : "Hợp lệ theo mẫu"}
                    </div>
                  </div>
                </div>

                {/* Duplicate Handling Options (Radio Cards) */}
                {duplicateAnalysis.duplicateWords.length > 0 && (
                  <div className="p-3 bg-white rounded-xl border border-amber-200 space-y-2">
                    <span className="text-[11px] font-bold text-slate-800 uppercase tracking-wider block">
                      ⚙️ Tùy chọn xử lý cho {duplicateAnalysis.duplicateWords.length} từ đã có trong CSDL:
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                      <label
                        className={`flex items-start gap-2.5 p-2.5 rounded-lg border cursor-pointer transition ${
                          duplicateAction === "skip"
                            ? "bg-emerald-50/60 border-emerald-400 text-emerald-950 font-medium"
                            : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100"
                        }`}
                      >
                        <input
                          type="radio"
                          name="duplicateAction"
                          value="skip"
                          checked={duplicateAction === "skip"}
                          onChange={() => setDuplicateAction("skip")}
                          className="mt-0.5 text-emerald-600 focus:ring-emerald-500"
                        />
                        <div>
                          <div className="text-[11px] font-bold">
                            🟢 Bỏ qua từ trùng (Khuyên dùng)
                          </div>
                          <div className="text-[10px] text-slate-500 leading-snug">
                            Giữ nguyên dữ liệu cũ, chỉ cộng dồn {duplicateAnalysis.newWords.length} từ mới vào CSDL.
                          </div>
                        </div>
                      </label>

                      <label
                        className={`flex items-start gap-2.5 p-2.5 rounded-lg border cursor-pointer transition ${
                          duplicateAction === "update"
                            ? "bg-amber-50/70 border-amber-400 text-amber-950 font-medium"
                            : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100"
                        }`}
                      >
                        <input
                          type="radio"
                          name="duplicateAction"
                          value="update"
                          checked={duplicateAction === "update"}
                          onChange={() => setDuplicateAction("update")}
                          className="mt-0.5 text-amber-600 focus:ring-amber-500"
                        />
                        <div>
                          <div className="text-[11px] font-bold">
                            🔄 Cập nhật thông tin mới
                          </div>
                          <div className="text-[10px] text-slate-500 leading-snug">
                            Ghi đè nghĩa và ví dụ mới cho {duplicateAnalysis.duplicateWords.length} từ đã có trong CSDL.
                          </div>
                        </div>
                      </label>
                    </div>
                  </div>
                )}

                {/* Filter Tabs for Preview List */}
                <div className="flex items-center justify-between border-b border-slate-200 pb-1 text-xs">
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setPreviewFilterTab("all")}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition ${
                        previewFilterTab === "all"
                          ? "bg-slate-800 text-white"
                          : "text-slate-600 hover:bg-slate-200"
                      }`}
                    >
                      Tất cả ({parsedWords.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setPreviewFilterTab("new")}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition ${
                        previewFilterTab === "new"
                          ? "bg-emerald-600 text-white"
                          : "text-emerald-700 hover:bg-emerald-100"
                      }`}
                    >
                      🟢 Từ mới ({duplicateAnalysis.newWords.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setPreviewFilterTab("duplicates")}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition ${
                        previewFilterTab === "duplicates"
                          ? "bg-amber-600 text-white"
                          : "text-amber-800 hover:bg-amber-100"
                      }`}
                    >
                      🟡 Trùng CSDL ({duplicateAnalysis.duplicateWords.length})
                    </button>
                  </div>
                </div>

                {/* Preview List Rows */}
                <div className="max-h-44 overflow-y-auto space-y-1.5 pr-1 text-xs">
                  {/* Duplicates Tab or All Tab displaying duplicate cross-reference */}
                  {(previewFilterTab === "all" || previewFilterTab === "duplicates") &&
                    duplicateAnalysis.duplicateWords.map((dup, i) => (
                      <div
                        key={`dup_${i}`}
                        className="p-2.5 bg-amber-50/80 rounded-xl border border-amber-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                      >
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2">
                            <span className="px-1.5 py-0.5 bg-amber-200 text-amber-900 rounded font-bold text-[9px] uppercase">
                              🟡 Trùng CSDL
                            </span>
                            <span className="font-heading font-extrabold text-slate-900 text-xs">
                              {dup.word}
                            </span>
                            {dup.ipa && <span className="text-[11px] font-mono text-[#c27803]">{dup.ipa}</span>}
                          </div>
                          <div className="text-[11px] text-slate-600 space-y-0.5">
                            <div>
                              <span className="font-semibold text-slate-500">Đang có trong CSDL:</span>{" "}
                              <span className="text-slate-800 font-medium">"{dup.existingWord?.meaning}"</span>
                            </div>
                            {dup.meaning !== dup.existingWord?.meaning && (
                              <div>
                                <span className="font-semibold text-amber-700">Nghĩa mới nạp:</span>{" "}
                                <span className="text-amber-900 font-medium">"{dup.meaning}"</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}

                  {/* New Words Tab or All Tab displaying new valid words */}
                  {(previewFilterTab === "all" || previewFilterTab === "new") &&
                    duplicateAnalysis.newWords.map((item, i) => (
                      <div
                        key={`new_${i}`}
                        className="p-2.5 bg-white rounded-xl border border-slate-200 flex items-center justify-between gap-2"
                      >
                        <div className="flex items-center gap-2">
                          <span className="px-1.5 py-0.5 bg-emerald-100 text-emerald-800 rounded font-bold text-[9px] uppercase">
                            🟢 Mới
                          </span>
                          <span className="font-heading font-extrabold text-slate-900 text-xs">
                            {item.word}
                          </span>
                          {item.ipa && <span className="text-[11px] font-mono text-[#c27803]">{item.ipa}</span>}
                          <span className="text-slate-600 text-xs">- {item.meaning}</span>
                        </div>
                        <span className="text-[10px] font-semibold text-slate-400 whitespace-nowrap">
                          {item.pos || "n."}
                        </span>
                      </div>
                    ))}
                </div>
              </div>
            )}

            {/* Success Feedback Notification */}
            {importFeedback && (
              <div className="p-4 bg-emerald-50 border border-emerald-300 rounded-2xl text-xs text-emerald-900 space-y-1">
                <div className="font-heading font-extrabold text-emerald-800 flex items-center gap-1.5 text-sm">
                  <span>✅</span>
                  <span>{importFeedback.title}</span>
                </div>
                <div className="whitespace-pre-line text-emerald-700 font-medium">
                  {importFeedback.message}
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-2.5 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => {
                  setShowImportModal(false);
                  setImportFeedback(null);
                }}
                className="flex-1 py-2.5 px-4 border border-slate-200 text-slate-600 rounded-xl text-xs font-semibold hover:bg-slate-50 transition"
              >
                Đóng
              </button>
              <button
                type="button"
                disabled={
                  importing ||
                  !parsedWords ||
                  parsedWords.length === 0 ||
                  (duplicateAction === "skip" && duplicateAnalysis?.newWords.length === 0)
                }
                onClick={handleBatchImport}
                className="flex-2 py-2.5 px-5 bg-[#c27803] text-white rounded-xl text-xs font-heading font-extrabold uppercase tracking-wider hover:bg-[#b45309] shadow-md transition disabled:opacity-50 active:translate-y-px"
              >
                {importing
                  ? "Đang ghi vào CSDL..."
                  : duplicateAction === "update"
                  ? `📥 Nạp ${duplicateAnalysis?.newWords.length || 0} Từ Mới & Cập Nhật ${duplicateAnalysis?.duplicateWords.length || 0} Từ`
                  : `📥 Xác Nhận Cộng Dồn ${duplicateAnalysis?.newWords.length || 0} Từ Mới Vào Kho`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
