import React, { useState, useEffect } from "react";
import {
  getResources,
  subscribeResources,
  RESOURCE_CATEGORIES,
} from "../../services/resourceService";
import { GRAMMAR_CURRICULUM } from "../../data/grammarCurriculum";
import { useLanguage } from "../../context/LanguageContext";

export const StudentResourcesTab = ({ student, activeClass }) => {
  const { lang } = useLanguage();
  const isVi = lang === "vi";

  const [resources, setResources] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState("primary"); // "primary" | "supplementary" | "livestream"
  const [searchQuery, setSearchQuery] = useState("");
  const [activeUnit, setActiveUnit] = useState(GRAMMAR_CURRICULUM[0]);
  const [showGrammarReader, setShowGrammarReader] = useState(false);

  // Student test practice states inside grammar reader
  const [selectedAnswers, setSelectedAnswers] = useState({});
  const [submittedAnswers, setSubmittedAnswers] = useState({});

  useEffect(() => {
    const unsub = subscribeResources((data) => {
      setResources(data);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const filteredResources = resources.filter((res) => {
    const matchesCat = res.category === activeCategory;
    const matchesSearch =
      (res.title || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (res.description || "").toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCat && matchesSearch;
  });

  const countPrimary = resources.filter((r) => r.category === "primary").length;
  const countSupp = resources.filter((r) => r.category === "supplementary").length;
  const countLive = resources.filter((r) => r.category === "livestream").length;

  const handleSelectOption = (exIdx, optLetter) => {
    setSelectedAnswers((prev) => ({
      ...prev,
      [`${activeUnit.id}_${exIdx}`]: optLetter,
    }));
  };

  const handleCheckAnswer = (exIdx) => {
    setSubmittedAnswers((prev) => ({
      ...prev,
      [`${activeUnit.id}_${exIdx}`]: true,
    }));
  };

  return (
    <div className="space-y-6">
      {/* 1. HERO BANNER */}
      <div className="bg-gradient-to-r from-[#261e16] via-[#1c1610] to-[#261e16] rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden border border-[#c27803]/40">
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 bg-[#c27803]/20 rounded-full blur-3xl pointer-events-none"></div>

        <div className="relative z-10 space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1.5">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#c27803]/20 text-[#f59e0b] border border-[#c27803]/40 text-xs font-heading font-bold uppercase tracking-wider">
                <span>📚</span>
                <span>{isVi ? "Kho Học Liệu Tập Trung (3 Phân Khu)" : "3-Tier Courseware"}</span>
                <span>&bull;</span>
                <span className="font-mono">{activeClass?.code || "COURSE"}</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-heading font-black tracking-wide text-white uppercase">
                {isVi ? "Kho Học Liệu Chính Khóa & Livestream" : "Learning Resources Repository"}
              </h1>
              <p className="text-xs sm:text-sm text-slate-300 max-w-2xl font-medium leading-relaxed">
                {isVi
                  ? "Truy cập không giới hạn giáo trình cốt lõi, tài liệu mở rộng và video bài giảng livestream thực chiến để nâng band điểm."
                  : "Access core textbooks, supplementary grammar guides, and livestream recording replays."}
              </p>
            </div>

            <button
              type="button"
              onClick={() => {
                setShowGrammarReader(true);
                setActiveUnit(GRAMMAR_CURRICULUM[0]);
              }}
              className="inline-flex items-center gap-2 px-5 py-3 bg-[#c27803] hover:bg-[#b45309] text-white rounded-xl text-xs font-heading font-extrabold uppercase tracking-wider shadow-lg shadow-amber-950/40 transition active:translate-y-px self-start md:self-auto cursor-pointer"
            >
              <span>📖</span>
              <span>{isVi ? "Đọc Giáo Trình Ngữ Pháp" : "Open Grammar Book"}</span>
              <span>→</span>
            </button>
          </div>

          {/* 3 Categories Navigation Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3 border-t border-white/10 text-xs">
            <button
              type="button"
              onClick={() => setActiveCategory("primary")}
              className={`p-3.5 rounded-2xl border text-left transition ${
                activeCategory === "primary"
                  ? "bg-[#c27803] text-white border-amber-400 shadow-md"
                  : "bg-white/5 hover:bg-white/10 text-slate-300 border-white/10"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-heading font-bold uppercase text-[11px] tracking-wider">
                  1. Học Liệu Chính
                </span>
                <span className="text-xl">📘</span>
              </div>
              <div className="text-base font-heading font-black mt-1">
                {countPrimary} tài liệu
              </div>
              <p className="text-[11px] opacity-80 mt-0.5">
                Giáo trình ngữ pháp tinh chỉnh & sách học chính khóa
              </p>
            </button>

            <button
              type="button"
              onClick={() => setActiveCategory("supplementary")}
              className={`p-3.5 rounded-2xl border text-left transition ${
                activeCategory === "supplementary"
                  ? "bg-[#c27803] text-white border-amber-400 shadow-md"
                  : "bg-white/5 hover:bg-white/10 text-slate-300 border-white/10"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-heading font-bold uppercase text-[11px] tracking-wider">
                  2. Học Liệu Phụ
                </span>
                <span className="text-xl">📙</span>
              </div>
              <div className="text-base font-heading font-black mt-1">
                {countSupp} tài liệu
              </div>
              <p className="text-[11px] opacity-80 mt-0.5">
                Cẩm nang bổ trợ, đề thi thử & tài liệu tham khảo
              </p>
            </button>

            <button
              type="button"
              onClick={() => setActiveCategory("livestream")}
              className={`p-3.5 rounded-2xl border text-left transition ${
                activeCategory === "livestream"
                  ? "bg-[#c27803] text-white border-amber-400 shadow-md"
                  : "bg-white/5 hover:bg-white/10 text-slate-300 border-white/10"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-heading font-bold uppercase text-[11px] tracking-wider">
                  3. Livestream
                </span>
                <span className="text-xl">🎥</span>
              </div>
              <div className="text-base font-heading font-black mt-1">
                {countLive} video
              </div>
              <p className="text-[11px] opacity-80 mt-0.5">
                Video bài giảng trực tiếp, giải đề thực chiến & notes
              </p>
            </button>
          </div>
        </div>
      </div>

      {/* 2. SPECIAL SPOTLIGHT: GIÁO TRÌNH NGỮ PHÁP TIẾNG ANH TINH CHỈNH */}
      {activeCategory === "primary" && (
        <div className="bg-gradient-to-r from-amber-500/10 via-amber-600/5 to-amber-500/15 border-2 border-amber-300/80 rounded-3xl p-5 sm:p-6 shadow-sm space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-heading font-bold uppercase tracking-wider bg-[#c27803] text-white shadow-2xs">
                  Bộ Giáo Trình Độc Quyền
                </span>
                <span className="text-xs font-semibold text-amber-900">
                  Mr. Nam & Ban Học thuật
                </span>
              </div>
              <h2 className="text-base sm:text-lg font-heading font-black text-slate-900 uppercase">
                Giáo Trình Ngữ Pháp Tiếng Anh Tinh Chỉnh (TOEIC & IELTS Standard)
              </h2>
              <p className="text-xs text-slate-600 max-w-2xl leading-relaxed">
                Biên soạn cô đọng 6 chuyên đề ngữ pháp cốt lõi hay gặp nhất trong đề thi quốc tế: 12 thì, Câu bị động, Mệnh đề quan hệ, To-V/V-ing, Câu điều kiện và Hòa hợp chủ vị. Có bài tập thực hành tự chấm điểm tức thì.
              </p>
            </div>

            <button
              type="button"
              onClick={() => {
                setShowGrammarReader(true);
                setActiveUnit(GRAMMAR_CURRICULUM[0]);
              }}
              className="px-5 py-3 bg-[#c27803] hover:bg-[#b45309] text-white rounded-xl text-xs font-heading font-extrabold uppercase tracking-wider shadow-md shadow-amber-900/20 transition active:translate-y-px inline-flex items-center justify-center gap-2 shrink-0 cursor-pointer"
            >
              <span>Mở Đọc Trực Tuyến</span>
              <span>↗</span>
            </button>
          </div>

          {/* Chapters Preview Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2 pt-2">
            {GRAMMAR_CURRICULUM.map((unit) => (
              <button
                key={unit.id}
                type="button"
                onClick={() => {
                  setActiveUnit(unit);
                  setShowGrammarReader(true);
                }}
                className="p-2.5 bg-white rounded-xl border border-amber-200 hover:border-[#c27803] text-left transition group shadow-2xs"
              >
                <span className="block font-mono text-[10px] font-bold text-[#c27803]">
                  Bài 0{unit.unitNumber}
                </span>
                <span className="font-heading font-bold text-xs text-slate-800 line-clamp-1 group-hover:text-[#c27803]">
                  {unit.title.split(":")[1]?.trim() || unit.title}
                </span>
                <span className="block text-[9px] text-slate-400 mt-1">
                  ⏱️ {unit.readingTime}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 3. SEARCH TOOLBAR */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-2xs flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
        <div className="relative flex-1 max-w-md">
          <input
            type="text"
            placeholder={
              activeCategory === "livestream"
                ? "Tìm video bài giảng livestream..."
                : "Tìm kiếm giáo trình, tài liệu học tập..."
            }
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#c27803]/20 focus:border-[#c27803]"
          />
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs">🔍</span>
        </div>

        <div className="text-xs text-slate-500 font-semibold">
          Hiển thị <strong>{filteredResources.length}</strong> học liệu
        </div>
      </div>

      {/* 4. RESOURCES LIST */}
      {loading ? (
        <div className="py-20 text-center">
          <div className="w-10 h-10 border-4 border-[#c27803] border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
          <p className="text-xs font-semibold text-slate-500">Đang tải kho học liệu...</p>
        </div>
      ) : filteredResources.length === 0 ? (
        <div className="bg-white p-12 rounded-3xl border border-slate-200 text-center max-w-md mx-auto shadow-sm space-y-3">
          <span className="text-4xl block">📂</span>
          <h3 className="text-base font-bold text-slate-800">Không có tài liệu nào</h3>
          <p className="text-xs text-slate-500">
            {searchQuery ? "Thử nhập từ khóa tìm kiếm khác." : "Học liệu sẽ sớm được cập nhật."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredResources.map((res) => {
            const isLive = res.category === "livestream";
            const isGrammar = res.hasInteractiveViewer;

            return (
              <div
                key={res.resourceId}
                className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs hover:shadow-md hover:border-[#c27803]/50 transition-all flex flex-col justify-between overflow-hidden group"
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
                      {res.badge || "Học liệu"}
                    </span>

                    <span className="px-2 py-0.5 rounded font-mono font-bold text-[10px] bg-slate-100 text-slate-700">
                      {res.format?.toUpperCase() || "PDF"}
                    </span>
                  </div>

                  <h3 className="text-sm font-heading font-extrabold text-slate-900 group-hover:text-[#c27803] transition line-clamp-2 mb-1.5">
                    {res.title}
                  </h3>

                  <p className="text-xs text-slate-500 line-clamp-3 mb-3 leading-relaxed">
                    {res.description}
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
                    {isGrammar ? (
                      <button
                        type="button"
                        onClick={() => {
                          setActiveUnit(GRAMMAR_CURRICULUM[0]);
                          setShowGrammarReader(true);
                        }}
                        className="w-full py-2 bg-[#c27803] hover:bg-[#b45309] text-white rounded-xl text-xs font-heading font-extrabold uppercase tracking-wider transition text-center shadow-xs"
                      >
                        📖 Đọc Sách Trực Tuyến →
                      </button>
                    ) : isLive ? (
                      <div className="flex items-center gap-2 w-full">
                        {res.videoUrl && (
                          <a
                            href={res.videoUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="flex-1 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-heading font-bold uppercase tracking-wider transition text-center inline-flex items-center justify-center gap-1.5"
                          >
                            <span>▶</span>
                            <span>Xem Replay</span>
                          </a>
                        )}
                        {res.notesUrl && (
                          <a
                            href={res.notesUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition"
                            title="Tải ghi chú buổi học"
                          >
                            📝 Notes
                          </a>
                        )}
                      </div>
                    ) : (
                      <a
                        href={res.fileUrl || "https://drive.google.com"}
                        target="_blank"
                        rel="noreferrer"
                        className="w-full py-2 bg-slate-900 hover:bg-[#c27803] text-white rounded-xl text-xs font-heading font-bold uppercase tracking-wider transition text-center inline-flex items-center justify-center gap-1.5"
                      >
                        <span>Mở Tài Liệu</span>
                        <span>↗</span>
                      </a>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 5. INTERACTIVE GRAMMAR CURRICULUM READER MODAL */}
      {showGrammarReader && activeUnit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-3 sm:p-4">
          <div className="bg-white rounded-3xl max-w-4xl w-full p-5 sm:p-8 shadow-2xl border border-slate-200 max-h-[92vh] overflow-y-auto space-y-5">
            {/* Modal Header */}
            <div className="flex items-start justify-between pb-4 border-b border-slate-100">
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-heading font-bold uppercase tracking-wider bg-amber-100 text-amber-900 border border-amber-200">
                    {activeUnit.badge}
                  </span>
                  <span className="text-xs text-slate-400 font-medium">
                    Thời lượng học: {activeUnit.readingTime}
                  </span>
                </div>
                <h2 className="text-lg sm:text-2xl font-heading font-black text-slate-900 uppercase mt-1">
                  {activeUnit.title}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setShowGrammarReader(false)}
                className="text-slate-400 hover:text-slate-600 text-xl font-bold p-1"
              >
                ✕
              </button>
            </div>

            {/* Units Selector Slider */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-2 scrollbar-thin">
              {GRAMMAR_CURRICULUM.map((unit) => (
                <button
                  key={unit.id}
                  type="button"
                  onClick={() => setActiveUnit(unit)}
                  className={`px-3.5 py-2 rounded-xl text-xs font-heading font-bold uppercase tracking-wider whitespace-nowrap transition ${
                    activeUnit.id === unit.id
                      ? "bg-[#c27803] text-white shadow-xs"
                      : "bg-slate-100 hover:bg-slate-200 text-slate-700"
                  }`}
                >
                  Bài {unit.unitNumber}: {unit.title.split(":")[1]?.trim() || unit.title}
                </button>
              ))}
            </div>

            {/* Summary Box */}
            <div className="p-4 bg-amber-50/70 border border-amber-200 rounded-2xl text-xs text-amber-950 leading-relaxed flex items-start gap-3">
              <span className="text-lg shrink-0">💡</span>
              <div>
                <strong>Trọng tâm chuyên đề:</strong> {activeUnit.summary}
              </div>
            </div>

            {/* Sections Theory */}
            <div className="space-y-4">
              {activeUnit.sections.map((sec, idx) => (
                <div key={idx} className="p-5 bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
                  <h4 className="font-heading font-bold text-sm text-[#c27803] uppercase tracking-wide">
                    {sec.heading}
                  </h4>
                  <pre className="text-xs text-slate-800 font-sans whitespace-pre-line leading-relaxed">
                    {sec.content}
                  </pre>
                </div>
              ))}
            </div>

            {/* Practice Exercises With Instant Checking */}
            {activeUnit.exercises?.length > 0 && (
              <div className="p-5 bg-white border-2 border-amber-300 rounded-2xl space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-heading font-bold text-xs uppercase tracking-wider text-amber-900 flex items-center gap-1.5">
                    <span>🎯</span>
                    <span>Thực Hành Tự Chấm Điểm Nhanh ({activeUnit.exercises.length} câu)</span>
                  </h4>
                  <span className="text-[11px] text-slate-400 font-medium">Chọn đáp án và bấm Kiểm tra</span>
                </div>

                {activeUnit.exercises.map((ex, exIdx) => {
                  const key = `${activeUnit.id}_${exIdx}`;
                  const selected = selectedAnswers[key];
                  const submitted = submittedAnswers[key];
                  const isCorrect = selected === ex.answer;

                  return (
                    <div key={exIdx} className="p-4 bg-amber-50/40 rounded-xl border border-amber-100 text-xs space-y-3">
                      <div className="font-bold text-slate-900 leading-relaxed">
                        Câu {exIdx + 1}: {ex.question}
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                        {ex.options.map((opt, oIdx) => {
                          const letter = opt.slice(0, 1);
                          const isOptSelected = selected === letter;
                          return (
                            <button
                              key={oIdx}
                              type="button"
                              onClick={() => handleSelectOption(exIdx, letter)}
                              className={`p-2.5 rounded-xl border text-left font-medium transition ${
                                isOptSelected
                                  ? "bg-[#c27803] text-white border-[#c27803] shadow-xs"
                                  : "bg-white hover:bg-slate-50 text-slate-700 border-slate-200"
                              }`}
                            >
                              {opt}
                            </button>
                          );
                        })}
                      </div>

                      <div className="flex items-center justify-between pt-1">
                        <button
                          type="button"
                          disabled={!selected}
                          onClick={() => handleCheckAnswer(exIdx)}
                          className="px-3.5 py-1.5 bg-slate-900 hover:bg-[#c27803] text-white rounded-lg text-xs font-heading font-bold uppercase tracking-wider transition disabled:opacity-40"
                        >
                          Kiểm Tra Đáp Án
                        </button>

                        {submitted && (
                          <span
                            className={`font-heading font-bold text-xs px-2.5 py-1 rounded-lg ${
                              isCorrect
                                ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                                : "bg-rose-100 text-rose-800 border border-rose-200"
                            }`}
                          >
                            {isCorrect ? "✓ Chính Xác!" : `✗ Sai rồi! Đáp án đúng: ${ex.answer}`}
                          </span>
                        )}
                      </div>

                      {submitted && (
                        <div className="p-2.5 bg-emerald-50 text-emerald-900 rounded-xl text-[11px] border border-emerald-200">
                          <strong>Giải thích:</strong> {ex.explanation}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Modal Bottom Bar */}
            <div className="flex items-center justify-between pt-3 border-t border-slate-100">
              <span className="text-xs text-slate-400">
                LMS Primary Educational Core &bull; Tiếng Anh Mr. Nam
              </span>
              <button
                type="button"
                onClick={() => setShowGrammarReader(false)}
                className="px-6 py-2.5 bg-slate-900 hover:bg-[#c27803] text-white rounded-xl text-xs font-heading font-bold uppercase tracking-wider transition"
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
