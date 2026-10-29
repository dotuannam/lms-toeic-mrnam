import React, { useState, useEffect, useMemo } from "react";
import {
  getVocabWords,
  subscribeVocabWords,
  getGameSettings,
  saveStudentVocabWordStatus,
  getStudentVocabHistory,
  saveGameSession,
  getStudentGameSessions,
  DEFAULT_VOCAB_BANK,
} from "../../services/vocabGameService";
import { useLanguage } from "../../context/LanguageContext";

export const StudentVocabGamesTab = ({ student, activeClass }) => {
  const { lang } = useLanguage();
  const isVi = lang === "vi";

  const studentId = student?.studentId || "student_guest";
  const studentName = student?.fullName || student?.name || "Học viên";
  const studentEmail = student?.email || "";

  const [mode, setMode] = useState("learn"); // "learn" | "speedrun" | "memory" | "scramble" | "history"
  const [words, setWords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [settings, setSettings] = useState(null);

  // Student Vocab History & Game Sessions
  const [vocabHistory, setVocabHistory] = useState([]);
  const [gameSessions, setGameSessions] = useState([]);

  // Learn Mode State
  const [currentWordIndex, setCurrentWordIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [learnFilter, setLearnFilter] = useState("all"); // "all" | "mastered" | "review"
  const [searchQuery, setSearchQuery] = useState("");

  // Game 1: Speedrun Quiz State
  const [quizState, setQuizState] = useState("idle"); // "idle" | "playing" | "finished"
  const [quizQuestionIndex, setQuizQuestionIndex] = useState(0);
  const [quizQuestions, setQuizQuestions] = useState([]);
  const [quizScore, setQuizScore] = useState(0);
  const [quizStreak, setQuizStreak] = useState(0);
  const [quizTimer, setQuizTimer] = useState(15);
  const [quizCorrectCount, setQuizCorrectCount] = useState(0);

  // Game 2: Memory Matching State
  const [memoryCards, setMemoryCards] = useState([]);
  const [selectedCards, setSelectedCards] = useState([]);
  const [matchedCardIds, setMatchedCardIds] = useState([]);
  const [memoryFlips, setMemoryFlips] = useState(0);
  const [memoryStartTime, setMemoryStartTime] = useState(null);
  const [memoryFinished, setMemoryFinished] = useState(false);

  // Game 3: Word Scramble State
  const [scrambleIndex, setScrambleIndex] = useState(0);
  const [scrambleWords, setScrambleWords] = useState([]);
  const [scrambleLetters, setScrambleLetters] = useState([]);
  const [currentGuess, setCurrentGuess] = useState("");
  const [scrambleScore, setScrambleScore] = useState(0);
  const [scrambleFeedback, setScrambleFeedback] = useState(null);
  const [scrambleFinished, setScrambleFinished] = useState(false);

  // Audio pronunciation
  const speak = (text) => {
    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = "en-US";
      utterance.rate = 0.9;
      window.speechSynthesis.speak(utterance);
    }
  };

  // Initial load
  useEffect(() => {
    const unsub = subscribeVocabWords((list) => {
      setWords(list);
      setLoading(false);
    });

    getGameSettings().then(setSettings);

    loadUserData();

    return () => unsub();
  }, [studentId]);

  const loadUserData = async () => {
    if (studentId) {
      const vHist = await getStudentVocabHistory(studentId);
      setVocabHistory(vHist);
      const gSessions = await getStudentGameSessions(studentId);
      setGameSessions(gSessions);
    }
  };

  // Status mapping for quick lookup
  const wordStatusMap = useMemo(() => {
    const map = {};
    vocabHistory.forEach((item) => {
      map[item.wordId] = item.status;
    });
    return map;
  }, [vocabHistory]);

  const masteredCount = vocabHistory.filter((v) => v.status === "mastered").length;
  const reviewCount = vocabHistory.filter((v) => v.status === "review").length;
  const totalXp = gameSessions.reduce((acc, s) => acc + (s.score || 0), 0);

  // Filtered words for learning
  const filteredWords = useMemo(() => {
    return words.filter((w) => {
      const status = wordStatusMap[w.id];
      if (learnFilter === "mastered" && status !== "mastered") return false;
      if (learnFilter === "review" && status !== "review") return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        return (
          w.word.toLowerCase().includes(q) ||
          w.meaning.toLowerCase().includes(q) ||
          (w.topic || "").toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [words, wordStatusMap, learnFilter, searchQuery]);

  const currentWord = filteredWords[currentWordIndex] || filteredWords[0] || words[0];

  // -------------------------------------------------------------
  // FLASHCARD ACTIONS
  // -------------------------------------------------------------
  const handleMarkWord = async (status) => {
    if (!currentWord) return;
    await saveStudentVocabWordStatus({
      studentId,
      wordId: currentWord.id,
      word: currentWord.word,
      status,
    });
    await loadUserData();
    if (currentWordIndex < filteredWords.length - 1) {
      setCurrentWordIndex((prev) => prev + 1);
      setIsFlipped(false);
    }
  };

  const nextWord = () => {
    if (currentWordIndex < filteredWords.length - 1) {
      setCurrentWordIndex((prev) => prev + 1);
      setIsFlipped(false);
    }
  };

  const prevWord = () => {
    if (currentWordIndex > 0) {
      setCurrentWordIndex((prev) => prev - 1);
      setIsFlipped(false);
    }
  };

  // -------------------------------------------------------------
  // GAME 1: SPEEDRUN QUIZ ENGINE
  // -------------------------------------------------------------
  const startSpeedrunQuiz = () => {
    if (words.length < 4) {
      alert("Cần tối thiểu 4 từ vựng trong kho để bắt đầu game.");
      return;
    }
    const shuffledWords = [...words].sort(() => 0.5 - Math.random());
    const qCount = Math.min(settings?.questionsPerGame || 10, shuffledWords.length);
    const questions = [];

    for (let i = 0; i < qCount; i++) {
      const correctWord = shuffledWords[i];
      // Pick 3 distractors
      const distractors = words
        .filter((w) => w.id !== correctWord.id)
        .sort(() => 0.5 - Math.random())
        .slice(0, 3);
      const options = [correctWord, ...distractors]
        .sort(() => 0.5 - Math.random())
        .map((w) => ({
          id: w.id,
          text: w.meaning,
          isCorrect: w.id === correctWord.id,
        }));

      questions.push({
        word: correctWord.word,
        ipa: correctWord.ipa,
        example: correctWord.example,
        correctMeaning: correctWord.meaning,
        options,
      });
    }

    setQuizQuestions(questions);
    setQuizQuestionIndex(0);
    setQuizScore(0);
    setQuizStreak(0);
    setQuizCorrectCount(0);
    setQuizTimer(settings?.speedrunSeconds || 15);
    setQuizState("playing");
  };

  // Timer loop for speedrun
  useEffect(() => {
    let interval = null;
    if (quizState === "playing" && quizTimer > 0) {
      interval = setInterval(() => {
        setQuizTimer((t) => t - 1);
      }, 1000);
    } else if (quizState === "playing" && quizTimer === 0) {
      // Time up -> move to next or finish
      handleAnswerQuiz(null);
    }
    return () => clearInterval(interval);
  }, [quizState, quizTimer]);

  const handleAnswerQuiz = async (selectedOption) => {
    const isCorrect = selectedOption?.isCorrect === true;
    let earnedPoints = 0;

    if (isCorrect) {
      const basePoints = settings?.pointsPerCorrect || 100;
      const streakMultiplier = quizStreak >= 3 ? 1.5 : 1;
      earnedPoints = Math.round(basePoints * streakMultiplier);
      setQuizScore((prev) => prev + earnedPoints);
      setQuizStreak((prev) => prev + 1);
      setQuizCorrectCount((prev) => prev + 1);
    } else {
      setQuizStreak(0);
    }

    if (quizQuestionIndex + 1 < quizQuestions.length) {
      setQuizQuestionIndex((prev) => prev + 1);
      setQuizTimer(settings?.speedrunSeconds || 15);
    } else {
      // Quiz Finished!
      setQuizState("finished");
      const finalScore = quizScore + earnedPoints;
      const finalCorrect = quizCorrectCount + (isCorrect ? 1 : 0);
      const accuracy = Math.round((finalCorrect / quizQuestions.length) * 100);

      await saveGameSession({
        studentId,
        studentName,
        studentEmail,
        classId: activeClass?.classId || "ALL",
        gameType: "speedrun",
        score: finalScore,
        correctCount: finalCorrect,
        totalQuestions: quizQuestions.length,
        accuracy,
        durationSeconds: (settings?.speedrunSeconds || 15) * quizQuestions.length,
      });
      await loadUserData();
    }
  };

  // -------------------------------------------------------------
  // GAME 2: MEMORY MATCHING ENGINE
  // -------------------------------------------------------------
  const startMemoryGame = () => {
    const pairCount = settings?.memoryPairsCount || 6;
    const selectedWords = [...words].sort(() => 0.5 - Math.random()).slice(0, pairCount);

    const cards = [];
    selectedWords.forEach((w) => {
      // Card English
      cards.push({
        id: `word_${w.id}`,
        pairId: w.id,
        content: w.word,
        subContent: w.ipa,
        type: "en",
      });
      // Card Vietnamese
      cards.push({
        id: `meaning_${w.id}`,
        pairId: w.id,
        content: w.meaning,
        subContent: w.pos,
        type: "vi",
      });
    });

    setMemoryCards(cards.sort(() => 0.5 - Math.random()));
    setSelectedCards([]);
    setMatchedCardIds([]);
    setMemoryFlips(0);
    setMemoryStartTime(Date.now());
    setMemoryFinished(false);
  };

  const handleCardClick = (card) => {
    if (selectedCards.length === 2) return;
    if (selectedCards.some((c) => c.id === card.id)) return;
    if (matchedCardIds.includes(card.pairId)) return;

    if (card.type === "en") speak(card.content);

    const nextSelected = [...selectedCards, card];
    setSelectedCards(nextSelected);

    if (nextSelected.length === 2) {
      setMemoryFlips((f) => f + 1);
      const [c1, c2] = nextSelected;
      if (c1.pairId === c2.pairId && c1.type !== c2.type) {
        // Matched!
        const nextMatched = [...matchedCardIds, c1.pairId];
        setMatchedCardIds(nextMatched);
        setSelectedCards([]);

        // Check if all pairs matched
        const totalPairs = memoryCards.length / 2;
        if (nextMatched.length === totalPairs) {
          finishMemoryGame(nextMatched.length, memoryFlips + 1);
        }
      } else {
        // Not matched -> flip back after 1 second
        setTimeout(() => {
          setSelectedCards([]);
        }, 1000);
      }
    }
  };

  const finishMemoryGame = async (matchedPairs, totalFlips) => {
    setMemoryFinished(true);
    const durationSec = Math.round((Date.now() - memoryStartTime) / 1000);
    const score = Math.max(100, Math.round(1000 - durationSec * 10 - totalFlips * 15));

    await saveGameSession({
      studentId,
      studentName,
      studentEmail,
      classId: activeClass?.classId || "ALL",
      gameType: "memory",
      score,
      correctCount: matchedPairs,
      totalQuestions: matchedPairs,
      accuracy: 100,
      durationSeconds: durationSec,
    });
    await loadUserData();
  };

  // -------------------------------------------------------------
  // GAME 3: WORD SCRAMBLE ENGINE
  // -------------------------------------------------------------
  const startScrambleGame = () => {
    const pool = [...words].sort(() => 0.5 - Math.random()).slice(0, 5);
    setScrambleWords(pool);
    setScrambleIndex(0);
    setScrambleScore(0);
    setScrambleFinished(false);
    loadScrambleWord(pool[0]);
  };

  const loadScrambleWord = (wordObj) => {
    if (!wordObj) return;
    const original = wordObj.word.toUpperCase();
    const letters = original.split("").map((char, idx) => ({
      char,
      id: `${char}_${idx}`,
      used: false,
    }));
    // Shuffle letters
    setScrambleLetters(letters.sort(() => 0.5 - Math.random()));
    setCurrentGuess("");
    setScrambleFeedback(null);
  };

  const handlePickScrambleLetter = (letterObj) => {
    if (letterObj.used) return;
    setCurrentGuess((prev) => prev + letterObj.char);
    setScrambleLetters((prev) =>
      prev.map((item) => (item.id === letterObj.id ? { ...item, used: true } : item))
    );
  };

  const handleClearScramble = () => {
    setCurrentGuess("");
    setScrambleLetters((prev) => prev.map((item) => ({ ...item, used: false })));
  };

  const handleCheckScramble = async () => {
    const targetWord = scrambleWords[scrambleIndex]?.word.toUpperCase();
    if (currentGuess === targetWord) {
      setScrambleFeedback({ correct: true, text: "Chính xác! +150 XP" });
      const newScore = scrambleScore + 150;
      setScrambleScore(newScore);

      setTimeout(async () => {
        if (scrambleIndex + 1 < scrambleWords.length) {
          const nextIdx = scrambleIndex + 1;
          setScrambleIndex(nextIdx);
          loadScrambleWord(scrambleWords[nextIdx]);
        } else {
          setScrambleFinished(true);
          await saveGameSession({
            studentId,
            studentName,
            studentEmail,
            classId: activeClass?.classId || "ALL",
            gameType: "scramble",
            score: newScore,
            correctCount: scrambleWords.length,
            totalQuestions: scrambleWords.length,
            accuracy: 100,
            durationSeconds: 60,
          });
          await loadUserData();
        }
      }, 1200);
    } else {
      setScrambleFeedback({ correct: false, text: "Chưa đúng, hãy thử sắp xếp lại nhé!" });
      setTimeout(() => {
        handleClearScramble();
        setScrambleFeedback(null);
      }, 1200);
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. TOP HERO BANNER & GAMIFICATION SUMMARY */}
      <div className="bg-gradient-to-r from-[#261e16] via-[#1c1610] to-[#261e16] rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden border border-[#c27803]/40">
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 bg-[#c27803]/20 rounded-full blur-3xl pointer-events-none"></div>

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#c27803]/20 text-[#f59e0b] border border-[#c27803]/40 text-xs font-heading font-bold uppercase tracking-wider">
              <span>🎮</span>
              <span>Webapp Mini Game Từ Vựng</span>
              <span>&bull;</span>
              <span>Gamification Learning</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-heading font-black tracking-wide text-white uppercase">
              Học & Ôn Tập Từ Vựng Qua Mini Game
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 max-w-xl font-medium leading-relaxed">
              Lật thẻ Flashcard thông minh, thử thách phản xạ tốc độ với Speedrun Quiz, tìm cặp từ Memory và xếp chữ cái Word Scramble để ghi nhớ từ vựng sâu sắc.
            </p>
          </div>

          {/* Gamification Stats Card */}
          <div className="p-4 bg-white/10 backdrop-blur-md rounded-2xl border border-white/15 grid grid-cols-3 gap-3 text-center self-start md:self-auto min-w-[280px]">
            <div>
              <div className="text-[10px] font-heading font-bold uppercase tracking-wider text-slate-300">
                Tổng XP
              </div>
              <div className="text-xl font-heading font-black text-amber-400 mt-0.5">
                {totalXp}
              </div>
            </div>
            <div>
              <div className="text-[10px] font-heading font-bold uppercase tracking-wider text-slate-300">
                Đã Thuộc
              </div>
              <div className="text-xl font-heading font-black text-emerald-400 mt-0.5">
                {masteredCount}
              </div>
            </div>
            <div>
              <div className="text-[10px] font-heading font-bold uppercase tracking-wider text-slate-300">
                Lượt Chơi
              </div>
              <div className="text-xl font-heading font-black text-sky-400 mt-0.5">
                {gameSessions.length}
              </div>
            </div>
          </div>
        </div>

        {/* Navigation Mode Bar */}
        <div className="flex items-center gap-2 pt-6 mt-6 border-t border-white/10 overflow-x-auto text-xs">
          <button
            type="button"
            onClick={() => {
              setMode("learn");
              setIsFlipped(false);
            }}
            className={`px-4 py-2.5 rounded-xl font-heading font-bold uppercase tracking-wider transition flex items-center gap-2 whitespace-nowrap ${
              mode === "learn"
                ? "bg-[#c27803] text-white shadow-md"
                : "bg-white/10 text-slate-300 hover:bg-white/20"
            }`}
          >
            <span>🎴</span>
            <span>1. Học Flashcard ({words.length})</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setMode("speedrun");
              startSpeedrunQuiz();
            }}
            className={`px-4 py-2.5 rounded-xl font-heading font-bold uppercase tracking-wider transition flex items-center gap-2 whitespace-nowrap ${
              mode === "speedrun"
                ? "bg-[#c27803] text-white shadow-md"
                : "bg-white/10 text-slate-300 hover:bg-white/20"
            }`}
          >
            <span>⚡</span>
            <span>2. Speedrun Quiz</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setMode("memory");
              startMemoryGame();
            }}
            className={`px-4 py-2.5 rounded-xl font-heading font-bold uppercase tracking-wider transition flex items-center gap-2 whitespace-nowrap ${
              mode === "memory"
                ? "bg-[#c27803] text-white shadow-md"
                : "bg-white/10 text-slate-300 hover:bg-white/20"
            }`}
          >
            <span>🧩</span>
            <span>3. Memory Match</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setMode("scramble");
              startScrambleGame();
            }}
            className={`px-4 py-2.5 rounded-xl font-heading font-bold uppercase tracking-wider transition flex items-center gap-2 whitespace-nowrap ${
              mode === "scramble"
                ? "bg-[#c27803] text-white shadow-md"
                : "bg-white/10 text-slate-300 hover:bg-white/20"
            }`}
          >
            <span>🔤</span>
            <span>4. Word Scramble</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setMode("history");
              loadUserData();
            }}
            className={`px-4 py-2.5 rounded-xl font-heading font-bold uppercase tracking-wider transition flex items-center gap-2 whitespace-nowrap ${
              mode === "history"
                ? "bg-[#c27803] text-white shadow-md"
                : "bg-white/10 text-slate-300 hover:bg-white/20"
            }`}
          >
            <span>📊</span>
            <span>5. Lịch Sử & Thành Tích</span>
          </button>
        </div>
      </div>

      {/* 2. MODE: 1. FLASHCARD LEARNING */}
      {mode === "learn" && currentWord && (
        <div className="space-y-4 max-w-2xl mx-auto">
          {/* Controls & Filter */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-2xs flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between text-xs">
            <div className="flex items-center gap-1.5">
              {[
                { id: "all", label: `Tất cả (${words.length})` },
                { id: "review", label: `Cần ôn (${reviewCount})` },
                { id: "mastered", label: `Đã thuộc (${masteredCount})` },
              ].map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => {
                    setLearnFilter(f.id);
                    setCurrentWordIndex(0);
                    setIsFlipped(false);
                  }}
                  className={`px-3 py-1.5 rounded-xl font-heading font-bold uppercase tracking-wider transition ${
                    learnFilter === f.id
                      ? "bg-[#c27803] text-white"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>

            <div className="text-slate-400 font-medium">
              Từ {currentWordIndex + 1} / {filteredWords.length}
            </div>
          </div>

          {/* 3D Flashcard */}
          <div
            onClick={() => setIsFlipped(!isFlipped)}
            className="w-full min-h-[320px] bg-white rounded-3xl border-2 border-amber-300/80 shadow-md hover:shadow-xl transition-all cursor-pointer p-8 flex flex-col justify-between text-center relative overflow-hidden group select-none"
          >
            <div className="flex items-center justify-between text-xs">
              <span className="px-2.5 py-0.5 rounded-full font-mono font-bold text-[10px] bg-amber-100 text-amber-900">
                {currentWord.topic || "Business"} &bull; {currentWord.level || "B1"}
              </span>

              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  speak(currentWord.word);
                }}
                className="w-9 h-9 rounded-xl bg-amber-100 hover:bg-[#c27803] text-amber-900 hover:text-white flex items-center justify-center text-sm transition shadow-2xs"
                title="Nghe phát âm chuẩn"
              >
                🔊
              </button>
            </div>

            {/* Front & Back Content */}
            {!isFlipped ? (
              <div className="my-auto space-y-3">
                <span className="text-xs uppercase font-heading font-bold text-slate-400 tracking-wider">
                  Bấm vào thẻ để lật mặt sau
                </span>
                <h2 className="text-3xl sm:text-4xl font-heading font-black text-slate-900 group-hover:text-[#c27803] transition tracking-tight">
                  {currentWord.word}
                </h2>
                <div className="font-mono text-base text-[#c27803] font-bold">
                  {currentWord.ipa}
                </div>
                <span className="inline-block px-2.5 py-0.5 rounded text-xs font-bold text-slate-500 bg-slate-100">
                  {currentWord.pos || "v."}
                </span>
              </div>
            ) : (
              <div className="my-auto space-y-3 bg-amber-50/50 p-6 rounded-2xl border border-amber-200">
                <span className="text-xs uppercase font-heading font-bold text-[#c27803] tracking-wider">
                  Nghĩa tiếng Việt & Ví dụ
                </span>
                <h3 className="text-2xl font-heading font-bold text-slate-900">
                  {currentWord.meaning}
                </h3>
                <p className="text-xs text-slate-600 italic max-w-md mx-auto leading-relaxed">
                  "{currentWord.example || "No example available"}"
                </p>
              </div>
            )}

            <div className="text-[11px] text-slate-400">
              {wordStatusMap[currentWord.id] === "mastered" ? (
                <span className="text-emerald-600 font-bold">✓ Bạn đã đánh dấu: ĐÃ THUỘC</span>
              ) : wordStatusMap[currentWord.id] === "review" ? (
                <span className="text-amber-600 font-bold">⚠️ Bạn đã đánh dấu: CẦN ÔN LẠI</span>
              ) : (
                "Chưa đánh dấu trạng thái"
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-between gap-3 pt-2">
            <button
              type="button"
              onClick={prevWord}
              disabled={currentWordIndex === 0}
              className="px-4 py-2.5 bg-white border border-slate-200 text-slate-700 rounded-xl text-xs font-heading font-bold uppercase tracking-wider hover:bg-slate-50 transition disabled:opacity-40"
            >
              ← Từ Trước
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleMarkWord("review")}
                className="px-4 py-2.5 bg-amber-100 hover:bg-amber-200 text-amber-900 rounded-xl text-xs font-heading font-bold uppercase tracking-wider transition active:translate-y-px"
              >
                Cần Ôn Lại ⚠️
              </button>

              <button
                type="button"
                onClick={() => handleMarkWord("mastered")}
                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-heading font-bold uppercase tracking-wider transition shadow-sm active:translate-y-px"
              >
                Đã Thuộc ✓
              </button>
            </div>

            <button
              type="button"
              onClick={nextWord}
              disabled={currentWordIndex >= filteredWords.length - 1}
              className="px-4 py-2.5 bg-white border border-slate-200 text-slate-700 rounded-xl text-xs font-heading font-bold uppercase tracking-wider hover:bg-slate-50 transition disabled:opacity-40"
            >
              Từ Tiếp →
            </button>
          </div>
        </div>
      )}

      {/* 3. MODE: 2. SPEEDRUN QUIZ */}
      {mode === "speedrun" && (
        <div className="max-w-xl mx-auto space-y-4">
          {quizState === "playing" && quizQuestions[quizQuestionIndex] && (
            <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-lg space-y-6">
              {/* Question Top Bar */}
              <div className="flex items-center justify-between text-xs">
                <span className="font-heading font-bold text-slate-500 uppercase">
                  Câu {quizQuestionIndex + 1} / {quizQuestions.length}
                </span>

                <div className="flex items-center gap-3">
                  {quizStreak >= 3 && (
                    <span className="px-2 py-0.5 rounded-full font-heading font-bold text-[10px] bg-orange-100 text-orange-800 animate-pulse">
                      🔥 Streak x{quizStreak} (1.5x XP)
                    </span>
                  )}
                  <span className="font-heading font-extrabold text-sm text-[#c27803]">
                    {quizScore} XP
                  </span>
                </div>
              </div>

              {/* Countdown Progress Bar */}
              <div className="space-y-1">
                <div className="flex items-center justify-between text-[11px] font-mono font-bold text-slate-500">
                  <span>Thời gian:</span>
                  <span className={quizTimer <= 5 ? "text-rose-600 animate-pulse font-extrabold" : "text-amber-700"}>
                    ⏱️ {quizTimer}s
                  </span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-gradient-to-r from-amber-500 to-[#c27803] h-full transition-all duration-1000"
                    style={{
                      width: `${(quizTimer / (settings?.speedrunSeconds || 15)) * 100}%`,
                    }}
                  />
                </div>
              </div>

              {/* Target Word */}
              <div className="text-center py-4 bg-amber-50/50 rounded-2xl border border-amber-200">
                <span className="text-[10px] uppercase font-heading font-bold text-slate-400 tracking-wider">
                  Chọn nghĩa tiếng Việt chính xác
                </span>
                <h3 className="text-2xl sm:text-3xl font-heading font-black text-slate-900 mt-1">
                  {quizQuestions[quizQuestionIndex].word}
                </h3>
                <span className="font-mono text-xs text-[#c27803]">
                  {quizQuestions[quizQuestionIndex].ipa}
                </span>
              </div>

              {/* 4 Options Grid */}
              <div className="grid grid-cols-1 gap-2.5">
                {quizQuestions[quizQuestionIndex].options.map((opt, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleAnswerQuiz(opt)}
                    className="p-3.5 bg-slate-50 hover:bg-amber-100 hover:border-amber-400 text-slate-800 border border-slate-200 rounded-2xl text-xs font-semibold text-left transition active:scale-[0.99] flex items-center gap-3 group"
                  >
                    <span className="w-6 h-6 rounded-lg bg-white border border-slate-200 group-hover:bg-[#c27803] group-hover:text-white flex items-center justify-center font-bold text-[11px] text-slate-600 shrink-0">
                      {String.fromCharCode(65 + idx)}
                    </span>
                    <span className="flex-1">{opt.text}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {quizState === "finished" && (
            <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-xl text-center space-y-4">
              <span className="text-5xl block animate-bounce">🏆</span>
              <h2 className="text-2xl font-heading font-black text-slate-900 uppercase">
                Hoàn Thành Lượt Chơi Speedrun!
              </h2>
              <div className="p-4 bg-amber-50 rounded-2xl border border-amber-200 max-w-sm mx-auto space-y-1.5 text-xs text-slate-700">
                <div className="flex justify-between">
                  <span>Tổng điểm đạt được:</span>
                  <strong className="font-heading font-black text-base text-[#c27803]">
                    +{quizScore} XP
                  </strong>
                </div>
                <div className="flex justify-between">
                  <span>Số câu trả lời đúng:</span>
                  <strong className="text-emerald-700">
                    {quizCorrectCount} / {quizQuestions.length} câu
                  </strong>
                </div>
                <div className="flex justify-between">
                  <span>Độ chính xác:</span>
                  <strong className="font-mono text-slate-900">
                    {Math.round((quizCorrectCount / quizQuestions.length) * 100)}%
                  </strong>
                </div>
              </div>

              <div className="flex justify-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={startSpeedrunQuiz}
                  className="px-6 py-3 bg-[#c27803] hover:bg-[#b45309] text-white rounded-xl text-xs font-heading font-extrabold uppercase tracking-wider shadow-md transition"
                >
                  Chơi Lại Lượt Mới 🔄
                </button>
                <button
                  type="button"
                  onClick={() => setMode("history")}
                  className="px-4 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-heading font-bold uppercase tracking-wider transition"
                >
                  Xem Lịch Sử 📊
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 4. MODE: 3. MEMORY MATCH */}
      {mode === "memory" && (
        <div className="max-w-2xl mx-auto space-y-4">
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs flex items-center justify-between text-xs">
            <div>
              <span className="font-heading font-bold uppercase text-slate-500">Số Lượt Lật:</span>{" "}
              <strong className="text-slate-900 font-mono text-sm">{memoryFlips}</strong>
            </div>
            <div>
              <span className="font-heading font-bold uppercase text-slate-500">Đã Khớp:</span>{" "}
              <strong className="text-[#c27803] font-mono text-sm">
                {matchedCardIds.length} / {memoryCards.length / 2} cặp
              </strong>
            </div>
            <button
              type="button"
              onClick={startMemoryGame}
              className="px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold"
            >
              Xáo Lại Thẻ 🔄
            </button>
          </div>

          {!memoryFinished ? (
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2.5">
              {memoryCards.map((card) => {
                const isSelected = selectedCards.some((c) => c.id === card.id);
                const isMatched = matchedCardIds.includes(card.pairId);

                return (
                  <button
                    key={card.id}
                    type="button"
                    disabled={isMatched}
                    onClick={() => handleCardClick(card)}
                    className={`h-28 rounded-2xl p-2.5 text-center flex flex-col items-center justify-center transition-all duration-300 font-medium ${
                      isMatched
                        ? "bg-emerald-100 border border-emerald-300 text-emerald-900 opacity-60 pointer-events-none"
                        : isSelected
                        ? "bg-[#c27803] text-white shadow-md scale-105"
                        : "bg-white hover:bg-amber-50/60 border-2 border-slate-200 text-slate-800 shadow-2xs"
                    }`}
                  >
                    {isSelected || isMatched ? (
                      <div className="space-y-1">
                        <span className="block font-heading font-extrabold text-xs leading-tight">
                          {card.content}
                        </span>
                        {card.subContent && (
                          <span className="block text-[10px] opacity-75 font-mono">
                            {card.subContent}
                          </span>
                        )}
                      </div>
                    ) : (
                      <span className="text-2xl text-amber-600/40 font-bold select-none">🎴</span>
                    )}
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-xl text-center space-y-4">
              <span className="text-5xl block animate-bounce">🎉</span>
              <h2 className="text-2xl font-heading font-black text-slate-900 uppercase">
                Chúc Mừng Bạn Đã Tìm Hết Các Cặp Thẻ!
              </h2>
              <p className="text-xs text-slate-500">
                Bạn đã hoàn thành trò chơi trong <strong>{memoryFlips}</strong> lượt lật thẻ. Điểm thưởng XP đã được cộng vào hồ sơ cá nhân.
              </p>
              <button
                type="button"
                onClick={startMemoryGame}
                className="px-6 py-3 bg-[#c27803] hover:bg-[#b45309] text-white rounded-xl text-xs font-heading font-extrabold uppercase tracking-wider shadow-md transition"
              >
                Chơi Ván Mới 🔄
              </button>
            </div>
          )}
        </div>
      )}

      {/* 5. MODE: 4. WORD SCRAMBLE */}
      {mode === "scramble" && (
        <div className="max-w-xl mx-auto space-y-4">
          {!scrambleFinished && scrambleWords[scrambleIndex] ? (
            <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-lg space-y-6 text-center">
              <div className="flex items-center justify-between text-xs">
                <span className="font-heading font-bold text-slate-500 uppercase">
                  Từ {scrambleIndex + 1} / {scrambleWords.length}
                </span>
                <span className="font-heading font-extrabold text-sm text-[#c27803]">
                  {scrambleScore} XP
                </span>
              </div>

              {/* Clue Box */}
              <div className="p-4 bg-amber-50 rounded-2xl border border-amber-200 space-y-1">
                <span className="text-[10px] uppercase font-heading font-bold text-slate-400">
                  Gợi ý nghĩa tiếng Việt:
                </span>
                <h3 className="text-xl font-heading font-bold text-slate-900">
                  {scrambleWords[scrambleIndex].meaning}
                </h3>
                <span className="text-xs font-mono text-[#c27803]">
                  Phiên âm: {scrambleWords[scrambleIndex].ipa}
                </span>
              </div>

              {/* Current Guess Slot */}
              <div className="min-h-[50px] p-3 bg-slate-100 rounded-2xl border-2 border-dashed border-slate-300 flex items-center justify-center gap-1.5 font-mono text-xl font-black text-slate-900 tracking-widest">
                {currentGuess ? currentGuess : <span className="text-xs font-sans text-slate-400">Bấm các chữ cái bên dưới để ghép từ</span>}
              </div>

              {scrambleFeedback && (
                <div
                  className={`p-2.5 rounded-xl text-xs font-bold ${
                    scrambleFeedback.correct
                      ? "bg-emerald-100 text-emerald-800"
                      : "bg-rose-100 text-rose-800"
                  }`}
                >
                  {scrambleFeedback.text}
                </div>
              )}

              {/* Letters Buttons */}
              <div className="flex flex-wrap items-center justify-center gap-2">
                {scrambleLetters.map((l) => (
                  <button
                    key={l.id}
                    type="button"
                    disabled={l.used}
                    onClick={() => handlePickScrambleLetter(l)}
                    className={`w-11 h-11 rounded-xl font-mono text-lg font-black border transition ${
                      l.used
                        ? "bg-slate-100 border-slate-200 text-slate-300 pointer-events-none"
                        : "bg-white hover:bg-[#c27803] hover:text-white border-slate-300 text-slate-900 shadow-2xs active:scale-95"
                    }`}
                  >
                    {l.char}
                  </button>
                ))}
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleClearScramble}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition"
                >
                  Xóa Lại
                </button>
                <button
                  type="button"
                  onClick={handleCheckScramble}
                  disabled={!currentGuess}
                  className="px-6 py-2.5 bg-[#c27803] hover:bg-[#b45309] text-white rounded-xl text-xs font-heading font-extrabold uppercase tracking-wider transition shadow-sm disabled:opacity-50"
                >
                  Kiểm Tra Đáp Án →
                </button>
              </div>
            </div>
          ) : (
            <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-xl text-center space-y-4">
              <span className="text-5xl block animate-bounce">🔤</span>
              <h2 className="text-2xl font-heading font-black text-slate-900 uppercase">
                Hoàn Thành Game Sắp Xếp Chữ Cái!
              </h2>
              <p className="text-xs text-slate-500">
                Bạn đã ghép chính xác toàn bộ các từ vựng. Đã cộng <strong>+{scrambleScore} XP</strong> vào hồ sơ cá nhân của bạn!
              </p>
              <button
                type="button"
                onClick={startScrambleGame}
                className="px-6 py-3 bg-[#c27803] hover:bg-[#b45309] text-white rounded-xl text-xs font-heading font-extrabold uppercase tracking-wider shadow-md transition"
              >
                Chơi Vòng Mới 🔄
              </button>
            </div>
          )}
        </div>
      )}

      {/* 6. MODE: 5. HISTORY & STATS */}
      {mode === "history" && (
        <div className="space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
              <span className="text-[11px] font-heading font-bold text-slate-400 uppercase">
                Tổng Điểm Tích Lũy
              </span>
              <div className="text-2xl font-heading font-black text-[#c27803] mt-1">
                {totalXp} XP
              </div>
              <span className="text-[10px] text-slate-400">Trên toàn hệ thống</span>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
              <span className="text-[11px] font-heading font-bold text-slate-400 uppercase">
                Số Từ Đã Thuộc
              </span>
              <div className="text-2xl font-heading font-black text-emerald-600 mt-1">
                {masteredCount} từ
              </div>
              <span className="text-[10px] text-slate-400">Đã tự tin ghi nhớ</span>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
              <span className="text-[11px] font-heading font-bold text-slate-400 uppercase">
                Từ Cần Ôn Lại
              </span>
              <div className="text-2xl font-heading font-black text-amber-600 mt-1">
                {reviewCount} từ
              </div>
              <span className="text-[10px] text-slate-400">Cần lật thẻ ôn tập</span>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
              <span className="text-[11px] font-heading font-bold text-slate-400 uppercase">
                Tổng Lượt Chơi Game
              </span>
              <div className="text-2xl font-heading font-black text-sky-600 mt-1">
                {gameSessions.length} lượt
              </div>
              <span className="text-[10px] text-slate-400">Mini Game đã hoàn thành</span>
            </div>
          </div>

          {/* Recent Game Sessions Table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-heading font-bold text-xs uppercase tracking-wider text-slate-900 flex items-center gap-2">
                <span>🎮</span>
                <span>Lịch Sử Các Lượt Chơi Mini Game Đã Lưu</span>
              </h3>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#261e16] text-amber-200 uppercase font-heading font-bold text-[10px] tracking-wider">
                  <tr>
                    <th className="py-2.5 px-4">Tên Game</th>
                    <th className="py-2.5 px-4">Điểm Số (XP)</th>
                    <th className="py-2.5 px-4">Số Câu Đúng</th>
                    <th className="py-2.5 px-4">Độ Chính Xác</th>
                    <th className="py-2.5 px-4">Thời Gian Chơi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {gameSessions.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-slate-400">
                        Bạn chưa hoàn thành lượt chơi game nào. Hãy thử chơi một ván ở trên nhé!
                      </td>
                    </tr>
                  ) : (
                    gameSessions.map((s, idx) => (
                      <tr key={s.sessionId || idx} className="hover:bg-amber-50/30">
                        <td className="py-3 px-4 font-heading font-bold text-slate-900">
                          {s.gameType === "speedrun"
                            ? "⚡ Speedrun Quiz"
                            : s.gameType === "memory"
                            ? "🧩 Memory Match"
                            : "🔤 Word Scramble"}
                        </td>
                        <td className="py-3 px-4 font-heading font-extrabold text-sm text-[#c27803]">
                          +{s.score} XP
                        </td>
                        <td className="py-3 px-4">
                          {s.correctCount} / {s.totalQuestions}
                        </td>
                        <td className="py-3 px-4 font-mono font-bold text-emerald-700">
                          {s.accuracy}%
                        </td>
                        <td className="py-3 px-4 text-slate-400 text-[11px]">
                          {s.playedAt ? new Date(s.playedAt).toLocaleString("vi-VN") : "—"}
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
    </div>
  );
};
