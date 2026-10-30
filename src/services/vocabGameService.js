import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  writeBatch,
  onSnapshot,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "../config/firebase";

const VOCAB_WORDS_COLLECTION = "vocab_words";
const VOCAB_SETTINGS_DOC = "system_settings/vocab_game_settings";
const VOCAB_LEARNING_HISTORY = "vocab_learning_history";
const VOCAB_GAME_SESSIONS = "vocab_game_sessions";

export const DEFAULT_GAME_SETTINGS = {
  speedrunSeconds: 15,
  questionsPerGame: 10,
  pointsPerCorrect: 100,
  streakBonus: true,
  memoryPairsCount: 6,
  scrambleSeconds: 30,
  soundEffects: true,
  difficulty: "medium", // "easy" | "medium" | "hard"
};

export const DEFAULT_VOCAB_BANK = [
  {
    id: "vocab_01",
    word: "Accommodate",
    ipa: "/əˈkɒm.ə.deɪt/",
    pos: "v.",
    meaning: "Đáp ứng, cung cấp chỗ ở, chứa được",
    example: "The conference center can accommodate up to 600 attendees comfortably.",
    topic: "Office & Facilities",
    level: "B1",
  },
  {
    id: "vocab_02",
    word: "Implement",
    ipa: "/ˈɪm.plɪ.ment/",
    pos: "v.",
    meaning: "Thi hành, triển khai thực hiện kế hoạch",
    example: "Our department will implement the new remote work policy next month.",
    topic: "Management",
    level: "B2",
  },
  {
    id: "vocab_03",
    word: "Negotiate",
    ipa: "/nəˈɡəʊ.ʃi.eɪt/",
    pos: "v.",
    meaning: "Đàm phán, thương lượng hợp đồng",
    example: "The marketing director is negotiating terms with the overseas supplier.",
    topic: "Business",
    level: "B2",
  },
  {
    id: "vocab_04",
    word: "Eligible",
    ipa: "/ˈel.ɪ.dʒə.bəl/",
    pos: "adj.",
    meaning: "Đủ điều kiện, thích hợp được chọn",
    example: "Employees who have served over one year are eligible for the annual bonus.",
    topic: "Human Resources",
    level: "B1",
  },
  {
    id: "vocab_05",
    word: "Complimentary",
    ipa: "/ˌkɒm.plɪˈmen.tər.i/",
    pos: "adj.",
    meaning: "Miễn phí, mang tính mời",
    example: "Guests can enjoy complimentary breakfast and Wi-Fi during their stay.",
    topic: "Hospitality & Travel",
    level: "B1",
  },
  {
    id: "vocab_06",
    word: "Collaborate",
    ipa: "/kəˈlæb.ə.reɪt/",
    pos: "v.",
    meaning: "Hợp tác, phối hợp làm việc",
    example: "Our engineering division collaborated with the design studio on this app.",
    topic: "Teamwork",
    level: "B2",
  },
  {
    id: "vocab_07",
    word: "Reimburse",
    ipa: "/ˌriː.ɪmˈbɜːs/",
    pos: "v.",
    meaning: "Hoàn trả chi phí, bồi hoàn tiền công tác",
    example: "Please retain all original receipts so the company can reimburse your expenses.",
    topic: "Finance & Accounting",
    level: "B2",
  },
  {
    id: "vocab_08",
    word: "Deadline",
    ipa: "/ˈded.laɪn/",
    pos: "n.",
    meaning: "Hạn chót hoàn thành công việc",
    example: "The strict deadline for the proposal submission is 5:00 PM this Friday.",
    topic: "Daily Work",
    level: "A2",
  },
  {
    id: "vocab_09",
    word: "Confidential",
    ipa: "/ˌkɒn.fɪˈden.ʃəl/",
    pos: "adj.",
    meaning: "Tuyệt mật, bí mật nội bộ",
    example: "All client records and financial transactions must be kept strictly confidential.",
    topic: "Security & Legal",
    level: "B2",
  },
  {
    id: "vocab_10",
    word: "Punctual",
    ipa: "/ˈpʌŋk.tʃu.əl/",
    pos: "adj.",
    meaning: "Đúng giờ, không bao giờ trễ",
    example: "Being punctual to morning briefings demonstrates professional commitment.",
    topic: "Work Ethics",
    level: "B1",
  },
  {
    id: "vocab_11",
    word: "Subsidize",
    ipa: "/ˈsʌb.sɪ.daɪz/",
    pos: "v.",
    meaning: "Trợ giá, hỗ trợ chi phí",
    example: "The corporation subsidizes public transport passes for all full-time staff.",
    topic: "Benefits & Perks",
    level: "B2",
  },
  {
    id: "vocab_12",
    word: "Lucrative",
    ipa: "/ˈluː.krə.tɪv/",
    pos: "adj.",
    meaning: "Sinh lời cao, đem lại nguồn lợi lớn",
    example: "They successfully signed a lucrative sponsorship agreement with an airline.",
    topic: "Finance",
    level: "C1",
  },
  {
    id: "vocab_13",
    word: "Renovate",
    ipa: "/ˈren.ə.veɪt/",
    pos: "v.",
    meaning: "Cải tạo, nâng cấp cơ sở vật chất",
    example: "The head office building will be renovated during the summer break.",
    topic: "Facilities",
    level: "B1",
  },
  {
    id: "vocab_14",
    word: "Supervisor",
    ipa: "/ˈsuː.pə.vaɪ.zər/",
    pos: "n.",
    meaning: "Người giám sát, quản lý trực tiếp",
    example: "Always notify your immediate supervisor if you anticipate any project delays.",
    topic: "Human Resources",
    level: "A2",
  },
  {
    id: "vocab_15",
    word: "Warranty",
    ipa: "/ˈwɒr.ən.ti/",
    pos: "n.",
    meaning: "Phiếu bảo hành, cam kết chất lượng",
    example: "This electronic equipment is covered under a comprehensive two-year warranty.",
    topic: "Customer Service",
    level: "A2",
  },
  {
    id: "vocab_16",
    word: "Feasible",
    ipa: "/ˈfiː.zə.bəl/",
    pos: "adj.",
    meaning: "Khả thi, có thể thực hiện được",
    example: "The advisory committee confirmed that the expansion schedule is completely feasible.",
    topic: "Planning",
    level: "B2",
  },
  {
    id: "vocab_17",
    word: "Terminate",
    ipa: "/ˈtɜː.mɪ.neɪt/",
    pos: "v.",
    meaning: "Chấm dứt, kết thúc hợp đồng",
    example: "Either party may terminate the partnership by providing 30 days written notice.",
    topic: "Legal",
    level: "B2",
  },
  {
    id: "vocab_18",
    word: "Pioneer",
    ipa: "/ˌpaɪəˈnɪər/",
    pos: "n., v.",
    meaning: "Người tiên phong, đi đầu phát triển",
    example: "The enterprise has pioneered sustainable logistics in Southeast Asia.",
    topic: "Innovation",
    level: "B2",
  },
  {
    id: "vocab_19",
    word: "Exceed",
    ipa: "/ɪkˈsiːd/",
    pos: "v.",
    meaning: "Vượt quá mức mong đợi, vượt chỉ tiêu",
    example: "Quarterly sales figures exceeded the board's expectations by 18 percent.",
    topic: "Sales & Performance",
    level: "B1",
  },
  {
    id: "vocab_20",
    word: "Itinerary",
    ipa: "/aɪˈtɪn.ər.ər.i/",
    pos: "n.",
    meaning: "Lịch trình chuyến đi, hành trình công tác",
    example: "The executive assistant finalized the European travel itinerary yesterday.",
    topic: "Travel & Logistics",
    level: "B2",
  },
];

/**
 * Generate unique safe ID for vocabulary word
 */
export const generateVocabId = (prefix = "vocab") => {
  const timestamp = Date.now();
  const randomStr = Math.random().toString(36).substring(2, 9);
  return `${prefix}_${timestamp}_${randomStr}`;
};

/**
 * Ensure default vocab bank is permanently seeded to Firestore if collection is empty
 */
export const ensureDefaultBankSeeded = async () => {
  try {
    const snap = await getDocs(collection(db, VOCAB_WORDS_COLLECTION));
    if (snap.empty) {
      const batch = writeBatch(db);
      const now = new Date().toISOString();
      for (const item of DEFAULT_VOCAB_BANK) {
        const docRef = doc(db, VOCAB_WORDS_COLLECTION, item.id);
        batch.set(docRef, {
          ...item,
          createdAt: now,
          updatedAt: now,
          isDefault: true,
        });
      }
      await batch.commit();
      console.log("Seeded 20 default vocab words to Firestore.");
      return true;
    }
    return false;
  } catch (err) {
    console.warn("Could not seed default vocab bank:", err);
    return false;
  }
};

/**
 * Seed or restore default vocab bank (can be called manually by admin)
 * Will add any default words that are missing from the DB
 */
export const restoreDefaultVocabBank = async () => {
  try {
    const snap = await getDocs(collection(db, VOCAB_WORDS_COLLECTION));
    const existingWords = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    const existingMap = new Map();
    existingWords.forEach((w) => {
      if (w.word) existingMap.set(w.word.trim().toLowerCase(), w);
    });

    const batch = writeBatch(db);
    const now = new Date().toISOString();
    let seededCount = 0;

    for (const item of DEFAULT_VOCAB_BANK) {
      const key = item.word.trim().toLowerCase();
      if (!existingMap.has(key)) {
        const docRef = doc(db, VOCAB_WORDS_COLLECTION, item.id);
        batch.set(docRef, {
          ...item,
          createdAt: now,
          updatedAt: now,
          isDefault: true,
        });
        seededCount++;
      }
    }

    if (seededCount > 0) {
      await batch.commit();
    }
    return { success: true, seededCount, totalDefault: DEFAULT_VOCAB_BANK.length };
  } catch (err) {
    console.error("Error restoring default vocab bank:", err);
    throw err;
  }
};

/**
 * Check incoming words against existing database words for duplicates
 */
export const checkVocabDuplicates = (incomingWords, existingWords = []) => {
  const existingMap = new Map();
  (existingWords || []).forEach((item) => {
    if (item && item.word) {
      const key = item.word.trim().toLowerCase();
      if (!existingMap.has(key)) {
        existingMap.set(key, item);
      }
    }
  });

  const newWords = [];
  const duplicateWords = [];
  const batchDuplicates = [];
  const seenInBatch = new Set();

  (incomingWords || []).forEach((incoming, index) => {
    if (!incoming || !incoming.word || !incoming.word.trim()) return;
    const cleanWord = incoming.word.trim();
    const key = cleanWord.toLowerCase();

    // Check duplicate within incoming batch
    if (seenInBatch.has(key)) {
      batchDuplicates.push({
        ...incoming,
        word: cleanWord,
        index,
        duplicateReason: "Từ này bị lặp lại trong chính danh sách bạn đang nạp",
      });
      return;
    }
    seenInBatch.add(key);

    // Check against existing database
    if (existingMap.has(key)) {
      const existingMatch = existingMap.get(key);
      duplicateWords.push({
        ...incoming,
        word: cleanWord,
        index,
        existingWord: existingMatch,
        duplicateReason: `Đã có trong CSDL: "${existingMatch.word}" (${existingMatch.meaning})`,
      });
    } else {
      newWords.push({
        ...incoming,
        word: cleanWord,
        index,
      });
    }
  });

  return {
    totalIncoming: incomingWords.length,
    newWords,
    duplicateWords,
    batchDuplicates,
    hasDuplicates: duplicateWords.length > 0 || batchDuplicates.length > 0,
    canAccumulateCount: newWords.length,
  };
};

/**
 * Fetch all vocabulary words
 */
export const getVocabWords = async () => {
  try {
    const q = query(collection(db, VOCAB_WORDS_COLLECTION), orderBy("word", "asc"));
    const snapshot = await getDocs(q);
    if (snapshot.empty) {
      await ensureDefaultBankSeeded();
      return DEFAULT_VOCAB_BANK;
    }
    return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
  } catch (err) {
    console.warn("Vocab fetch fallback to default bank:", err);
    return DEFAULT_VOCAB_BANK;
  }
};

/**
 * Real-time subscription to vocab words
 */
export const subscribeVocabWords = (callback) => {
  try {
    const q = query(collection(db, VOCAB_WORDS_COLLECTION), orderBy("word", "asc"));
    return onSnapshot(
      q,
      (snapshot) => {
        if (snapshot.empty) {
          // Asynchronously seed default bank into Firestore so they become permanent docs
          ensureDefaultBankSeeded().catch((e) => console.warn("Auto-seed error:", e));
          callback(DEFAULT_VOCAB_BANK);
        } else {
          callback(snapshot.docs.map((d) => ({ id: d.id, ...d.data() })));
        }
      },
      (err) => {
        console.warn("Vocab subscription error, using default bank:", err);
        callback(DEFAULT_VOCAB_BANK);
      }
    );
  } catch (err) {
    console.warn("Vocab subscription init error:", err);
    callback(DEFAULT_VOCAB_BANK);
    return () => {};
  }
};

/**
 * Create a new vocab word
 */
export const createVocabWord = async (vocabData) => {
  // Ensure default bank seeded if empty before writing
  await ensureDefaultBankSeeded();

  const id = vocabData.id || generateVocabId("vocab");
  const docRef = doc(db, VOCAB_WORDS_COLLECTION, id);
  const newWord = {
    id,
    word: (vocabData.word || "").trim(),
    ipa: (vocabData.ipa || "").trim(),
    pos: (vocabData.pos || "n.").trim(),
    meaning: (vocabData.meaning || "").trim(),
    example: (vocabData.example || "").trim(),
    topic: vocabData.topic || "General Business",
    level: vocabData.level || "B1",
    createdAt: vocabData.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  await setDoc(docRef, newWord);
  return newWord;
};

/**
 * Update vocab word
 */
export const updateVocabWord = async (id, updateData) => {
  const docRef = doc(db, VOCAB_WORDS_COLLECTION, id);
  await updateDoc(docRef, {
    ...updateData,
    updatedAt: new Date().toISOString(),
  });
};

/**
 * Delete vocab word
 */
export const deleteVocabWord = async (id) => {
  const docRef = doc(db, VOCAB_WORDS_COLLECTION, id);
  await deleteDoc(docRef);
};

/**
 * Batch add vocabulary words with accumulation and duplicate management
 * @param {Array} wordsArray - Array of word objects to import
 * @param {Object} options - { overwriteDuplicates: boolean, existingWords: Array }
 */
export const batchAddVocabWords = async (wordsArray, options = {}) => {
  const { overwriteDuplicates = false, existingWords = [] } = options;

  // 1. Ensure default bank is seeded if Firestore collection is completely empty
  await ensureDefaultBankSeeded();

  // 2. Fetch fresh existing words if not passed or empty
  let currentWords = existingWords;
  if (!currentWords || currentWords.length === 0) {
    currentWords = await getVocabWords();
  }

  // 3. Analyze duplicates
  const analysis = checkVocabDuplicates(wordsArray, currentWords);
  const { newWords, duplicateWords } = analysis;

  const addedWords = [];
  const updatedWords = [];
  const skippedWords = [];

  // 4. Batch commit to Firestore (chunked in groups of 400 for safety)
  const CHUNK_SIZE = 400;
  const operations = [];

  // A. Accumulate ALL new words into database
  for (let i = 0; i < newWords.length; i++) {
    const item = newWords[i];
    const uniqueId = item.id || generateVocabId("vocab");
    const docRef = doc(db, VOCAB_WORDS_COLLECTION, uniqueId);
    const newWordDoc = {
      id: uniqueId,
      word: item.word.trim(),
      ipa: (item.ipa || "").trim(),
      pos: (item.pos || "n.").trim(),
      meaning: (item.meaning || "").trim(),
      example: (item.example || "").trim(),
      topic: item.topic || "Imported Vocab",
      level: item.level || "B1",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    operations.push({ type: "set", ref: docRef, data: newWordDoc });
    addedWords.push(newWordDoc);
  }

  // B. Handle duplicates based on admin option
  for (const item of duplicateWords) {
    if (overwriteDuplicates && item.existingWord && item.existingWord.id) {
      const docRef = doc(db, VOCAB_WORDS_COLLECTION, item.existingWord.id);
      const updateData = {
        meaning: item.meaning?.trim() || item.existingWord.meaning,
        ipa: item.ipa?.trim() || item.existingWord.ipa || "",
        pos: item.pos?.trim() || item.existingWord.pos || "n.",
        example: item.example?.trim() || item.existingWord.example || "",
        topic: item.topic || item.existingWord.topic || "General",
        level: item.level || item.existingWord.level || "B1",
        updatedAt: new Date().toISOString(),
      };
      operations.push({ type: "update", ref: docRef, data: updateData });
      updatedWords.push({ ...item.existingWord, ...updateData });
    } else {
      skippedWords.push(item);
    }
  }

  // Execute batch operations
  if (operations.length > 0) {
    for (let c = 0; c < operations.length; c += CHUNK_SIZE) {
      const chunk = operations.slice(c, c + CHUNK_SIZE);
      const batch = writeBatch(db);
      chunk.forEach((op) => {
        if (op.type === "set") {
          batch.set(op.ref, op.data);
        } else if (op.type === "update") {
          batch.update(op.ref, op.data);
        }
      });
      await batch.commit();
    }
  }

  return {
    success: true,
    totalProcessed: wordsArray.length,
    addedCount: addedWords.length,
    updatedCount: updatedWords.length,
    skippedCount: skippedWords.length,
    addedWords,
    updatedWords,
    skippedWords,
    duplicateWords,
    batchDuplicates: analysis.batchDuplicates,
  };
};

/**
 * Get game configuration
 */
export const getGameSettings = async () => {
  try {
    const snap = await getDoc(doc(db, "system_settings", "vocab_game_settings"));
    if (snap.exists()) {
      return { ...DEFAULT_GAME_SETTINGS, ...snap.data() };
    }
    return DEFAULT_GAME_SETTINGS;
  } catch (err) {
    console.warn("Could not load game settings, returning defaults:", err);
    return DEFAULT_GAME_SETTINGS;
  }
};

/**
 * Save game configuration
 */
export const saveGameSettings = async (settings) => {
  const docRef = doc(db, "system_settings", "vocab_game_settings");
  await setDoc(docRef, {
    ...settings,
    updatedAt: new Date().toISOString(),
  }, { merge: true });
};

/**
 * Save student word learning progress (Mark as Mastered or Need Review)
 */
export const saveStudentVocabWordStatus = async ({ studentId, wordId, word, status }) => {
  if (!studentId || !wordId) return;
  const historyDocId = `${studentId}_${wordId}`;
  const docRef = doc(db, VOCAB_LEARNING_HISTORY, historyDocId);

  const prev = await getDoc(docRef);
  const prevData = prev.exists() ? prev.data() : {};
  const reviewCount = (prevData.reviewCount || 0) + 1;

  await setDoc(docRef, {
    studentId,
    wordId,
    word: word || prevData.word || "",
    status: status || "review", // "mastered" | "review"
    reviewCount,
    lastReviewedAt: new Date().toISOString(),
    createdAt: prevData.createdAt || new Date().toISOString(),
  }, { merge: true });
};

/**
 * Get student's vocab learning progress
 */
export const getStudentVocabHistory = async (studentId) => {
  if (!studentId) return [];
  try {
    const q = query(
      collection(db, VOCAB_LEARNING_HISTORY),
      where("studentId", "==", studentId)
    );
    const snap = await getDocs(q);
    return snap.docs.map((d) => d.data());
  } catch (err) {
    console.warn("Failed to get student vocab history:", err);
    return [];
  }
};

/**
 * Save completed game session
 */
export const saveGameSession = async ({
  studentId,
  studentName,
  studentEmail,
  classId,
  gameType,
  score,
  correctCount,
  totalQuestions,
  accuracy,
  durationSeconds,
}) => {
  const sessionId = `session_${Date.now()}`;
  const docRef = doc(db, VOCAB_GAME_SESSIONS, sessionId);

  const sessionData = {
    sessionId,
    studentId: studentId || "anonymous",
    studentName: studentName || "Học viên",
    studentEmail: studentEmail || "",
    classId: classId || "ALL",
    gameType: gameType || "speedrun", // "speedrun" | "memory" | "scramble"
    score: Number(score) || 0,
    correctCount: Number(correctCount) || 0,
    totalQuestions: Number(totalQuestions) || 0,
    accuracy: Number(accuracy) || 0,
    durationSeconds: Number(durationSeconds) || 0,
    playedAt: new Date().toISOString(),
  };

  await setDoc(docRef, sessionData);
  return sessionData;
};

/**
 * Get game history for a specific student
 */
export const getStudentGameSessions = async (studentId) => {
  if (!studentId) return [];
  try {
    const q = query(
      collection(db, VOCAB_GAME_SESSIONS),
      where("studentId", "==", studentId),
      orderBy("playedAt", "desc"),
      limit(50)
    );
    const snap = await getDocs(q);
    return snap.docs.map((d) => d.data());
  } catch (err) {
    console.warn("Failed to get student game sessions:", err);
    return [];
  }
};

/**
 * Get all game sessions for Admin Leaderboard & Analytics
 */
export const getAllGameLeaderboard = async () => {
  try {
    const q = query(
      collection(db, VOCAB_GAME_SESSIONS),
      orderBy("score", "desc"),
      limit(100)
    );
    const snap = await getDocs(q);
    const sessions = snap.docs.map((d) => d.data());

    // Aggregate by student
    const studentAggregates = {};
    sessions.forEach((s) => {
      const sId = s.studentId || "unknown";
      if (!studentAggregates[sId]) {
        studentAggregates[sId] = {
          studentId: sId,
          studentName: s.studentName,
          studentEmail: s.studentEmail,
          totalScore: 0,
          highestScore: 0,
          totalGames: 0,
          totalCorrect: 0,
          totalQuestions: 0,
          lastPlayedAt: s.playedAt,
        };
      }
      studentAggregates[sId].totalScore += s.score;
      if (s.score > studentAggregates[sId].highestScore) {
        studentAggregates[sId].highestScore = s.score;
      }
      studentAggregates[sId].totalGames += 1;
      studentAggregates[sId].totalCorrect += s.correctCount;
      studentAggregates[sId].totalQuestions += s.totalQuestions;
    });

    const leaderboard = Object.values(studentAggregates).sort(
      (a, b) => b.totalScore - a.totalScore
    );

    return {
      recentSessions: sessions.slice(0, 30),
      leaderboard,
      totalSessionsCount: sessions.length,
    };
  } catch (err) {
    console.warn("Failed to load leaderboard, returning dummy list:", err);
    return {
      recentSessions: [],
      leaderboard: [],
      totalSessionsCount: 0,
    };
  }
};
