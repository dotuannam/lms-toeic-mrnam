import React, { useState, useEffect } from "react";
import {
  getVocabWords,
  subscribeVocabWords,
  createVocabWord,
  updateVocabWord,
  deleteVocabWord,
  batchAddVocabWords,
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
        await createVocabWord(wordFormData);
      }
      setShowWordModal(false);
    } catch (err) {
      alert("Lỗi khi lưu từ vựng: " + err.message);
    } finally {
      setWordSubmitting(false);
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

  // Quick import parser (accepts lines like "Accommodate - /əˈkɒm.ə.deɪt/ - Đáp ứng, chứa được")
  const handleBatchImport = async () => {
    if (!importText.trim()) return;
    setImporting(true);
    try {
      const lines = importText.split("\n").filter((l) => l.trim().length > 0);
      const parsedWords = [];
      lines.forEach((line) => {
        const parts = line.split(/[-–—|:]/).map((p) => p.trim());
        if (parts.length >= 2) {
          const word = parts[0];
          const hasIpa = parts[1].startsWith("/") && parts[1].endsWith("/");
          const ipa = hasIpa ? parts[1] : "";
          const meaning = hasIpa && parts[2] ? parts[2] : parts[1];
          const example = parts[3] || "";
          parsedWords.push({
            word,
            ipa,
            pos: "n.",
            meaning,
            example,
            topic: "Imported Vocab",
            level: "B1",
          });
        }
      });

      if (parsedWords.length > 0) {
        await batchAddVocabWords(parsedWords);
        alert(`Đã nạp thành công ${parsedWords.length} từ vựng mới vào kho!`);
        setShowImportModal(false);
        setImportText("");
      } else {
        alert("Không nhận diện được định dạng từ vựng. Vui lòng kiểm tra lại từng dòng theo mẫu: Từ vựng - /IPA/ - Nghĩa tiếng Việt");
      }
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
              onClick={() => setShowImportModal(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-heading font-bold uppercase tracking-wider transition border border-white/20"
            >
              <span>📥</span>
              <span>{isVi ? "Import Nhanh" : "Batch Import"}</span>
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

      {/* 6. MODAL BATCH IMPORT TỪ VỰNG */}
      {showImportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 shadow-2xl border border-slate-100 max-h-[90vh] overflow-y-auto space-y-4">
            <div className="flex items-start justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-lg font-heading font-black text-slate-900 uppercase">
                  Import Nhanh Danh Sách Từ Vựng
                </h3>
                <p className="text-xs text-slate-500">
                  Dán danh sách từ vựng theo dòng để nạp hàng loạt vào kho Mini Game.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowImportModal(false)}
                className="text-slate-400 hover:text-slate-600 text-lg font-bold p-1"
              >
                ✕
              </button>
            </div>

            <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-900 space-y-1">
              <strong>Định dạng mỗi dòng hỗ trợ:</strong>
              <div className="font-mono text-[11px] text-amber-800">
                Từ vựng - /Phiên âm IPA/ - Nghĩa tiếng Việt - Câu ví dụ
              </div>
              <div className="text-[10px] text-amber-700">
                Ví dụ: Expand - /ɪkˈspænd/ - Mở rộng, phát triển - The company plans to expand abroad.
              </div>
            </div>

            <div>
              <textarea
                rows={8}
                placeholder={`Candidate - /ˈkæn.dɪ.dət/ - Ứng viên xin việc\nSupervisor - /ˈsuː.pə.vaɪ.zər/ - Người giám sát\nRevenue - /ˈrev.ən.juː/ - Doanh thu`}
                value={importText}
                onChange={(e) => setImportText(e.target.value)}
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono leading-relaxed"
              />
            </div>

            <div className="flex gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowImportModal(false)}
                className="flex-1 py-2.5 px-4 border border-slate-200 text-slate-600 rounded-xl text-xs font-semibold hover:bg-slate-50"
              >
                Hủy
              </button>
              <button
                type="button"
                disabled={importing || !importText.trim()}
                onClick={handleBatchImport}
                className="flex-1 py-2.5 px-4 bg-[#c27803] text-white rounded-xl text-xs font-heading font-extrabold uppercase tracking-wider hover:bg-[#b45309] shadow-sm disabled:opacity-50"
              >
                {importing ? "Đang xử lý..." : "Bắt Đầu Import"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
