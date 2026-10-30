import {
  collection,
  doc,
  writeBatch,
  getDocs,
  getDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
  deleteDoc,
  onSnapshot,
} from "firebase/firestore";
import { db } from "../config/firebase";
import { getClassroomGrades } from "./api";

const COLLECTION_NAME = "scores";

/**
 * Normalizes scores into a 0 - 100 percentage scale for unified Radar Chart rendering
 * Fully supports teacher-defined question counts, points per question, custom skills, and bulk configs.
 */
export const calculateRadarScale = (
  testType,
  rawSkills = {},
  gradingMode = "custom_flexible",
  config = {}
) => {
  const normalized = {};

  // 1. If flexible multi-skill or section-based configuration is provided
  if (config?.skillsConfig && Array.isArray(config.skillsConfig) && config.skillsConfig.length > 0) {
    let totalEarned = 0;
    let totalMax = 0;

    config.skillsConfig.forEach((sk) => {
      const skillKey = sk.id;
      const earned = Number(rawSkills[skillKey]) || 0;
      const max = Number(sk.maxScore) || 10;
      const pct = max > 0 ? Math.min(100, Math.max(0, Math.round((earned / max) * 100))) : 0;
      normalized[sk.name || sk.id] = pct;
      totalEarned += earned;
      totalMax += max;
    });

    // If exactly 2 skills exist, add overall benchmark so SVG polygon forms a complete 3-axis triangle
    if (config.skillsConfig.length === 2) {
      const overallPct = totalMax > 0 ? Math.min(100, Math.max(0, Math.round((totalEarned / totalMax) * 100))) : 0;
      normalized["Tổng kết (Overall)"] = overallPct;
    }

    return normalized;
  }

  // 2. Single test configuration (graded by total questions or direct score)
  if (gradingMode === "by_questions" || config?.totalQuestions) {
    const totalQuestions = Number(config?.totalQuestions) || 20;
    const totalScore = Number(config?.totalScore) || 10;
    const correctCount = Number(rawSkills.correct ?? rawSkills.correctCount) || 0;
    const earnedScore = Number(rawSkills.score ?? rawSkills.totalScore ?? rawSkills.correct) || 0;
    const target = Number(config?.targetScore) || (totalScore * 0.7);

    const accuracyPct =
      totalQuestions > 0 ? Math.min(100, Math.max(0, Math.round((correctCount / totalQuestions) * 100))) : 0;
    const scorePct =
      totalScore > 0 ? Math.min(100, Math.max(0, Math.round((earnedScore / totalScore) * 100))) : accuracyPct;
    const targetPct =
      target > 0 ? Math.min(100, Math.max(0, Math.round((earnedScore / target) * 100))) : scorePct;

    normalized["Tỷ lệ điểm số (% Điểm)"] = scorePct;
    normalized["Tỷ lệ câu đúng (% Đúng)"] = accuracyPct;
    normalized["Đạt mục tiêu (% Target)"] = targetPct;
    return normalized;
  }

  if (gradingMode === "direct_score") {
    const maxScore = Number(config?.maxScore || config?.totalScore) || 10;
    const score = Number(rawSkills.score ?? rawSkills.totalScore) || 0;
    const pct = maxScore > 0 ? Math.min(100, Math.max(0, Math.round((score / maxScore) * 100))) : 0;
    normalized["Điểm số (% Đạt)"] = pct;
    normalized["Tỷ lệ đạt chuẩn"] = pct;
    normalized["Tổng kết (Overall)"] = pct;
    return normalized;
  }

  // 3. Fallback / Standard Certifications with custom scale adaptation
  if (testType === "TOEIC") {
    const maxListening = Number(config?.skillsConfig?.[0]?.maxScore) || 495;
    const maxReading = Number(config?.skillsConfig?.[1]?.maxScore) || 495;
    const lVal = Number(rawSkills.listening) || 0;
    const rVal = Number(rawSkills.reading) || 0;
    const lPct = Math.min(100, Math.max(0, Math.round((lVal / maxListening) * 100)));
    const rPct = Math.min(100, Math.max(0, Math.round((rVal / maxReading) * 100)));
    const oPct = Math.min(100, Math.max(0, Math.round(((lVal + rVal) / (maxListening + maxReading)) * 100)));

    normalized["Listening"] = lPct;
    normalized["Reading"] = rPct;
    normalized["Tổng kết (Overall)"] = oPct;
  } else if (testType === "IELTS" || testType === "VSTEP") {
    const max = testType === "VSTEP" ? (Number(config?.totalScore) || 10) : 9;
    normalized["Listening"] = Math.min(100, Math.round(((rawSkills.listening || 0) / max) * 100));
    normalized["Reading"] = Math.min(100, Math.round(((rawSkills.reading || 0) / max) * 100));
    normalized["Writing"] = Math.min(100, Math.round(((rawSkills.writing || 0) / max) * 100));
    normalized["Speaking"] = Math.min(100, Math.round(((rawSkills.speaking || 0) / max) * 100));
  } else if (testType === "APTIS") {
    const maxComp = Number(config?.skillsConfig?.[0]?.maxScore) || 50;
    normalized["Grammar & Vocab"] = Math.min(100, Math.round(((rawSkills.grammar_vocab || 0) / maxComp) * 100));
    normalized["Listening"] = Math.min(100, Math.round(((rawSkills.listening || 0) / maxComp) * 100));
    normalized["Reading"] = Math.min(100, Math.round(((rawSkills.reading || 0) / maxComp) * 100));
    normalized["Speaking"] = Math.min(100, Math.round(((rawSkills.speaking || 0) / maxComp) * 100));
    normalized["Writing"] = Math.min(100, Math.round(((rawSkills.writing || 0) / maxComp) * 100));
  } else {
    // Dynamic fallback for any skill names present in rawSkills
    const skillKeys = Object.keys(rawSkills);
    if (skillKeys.length > 0) {
      skillKeys.forEach((key) => {
        const val = Number(rawSkills[key]) || 0;
        normalized[key] = Math.min(100, Math.max(0, val <= 10 ? Math.round(val * 10) : Math.round(val)));
      });
      if (skillKeys.length === 2) {
        normalized["Tổng kết (Overall)"] = Math.round(
          Object.values(normalized).reduce((a, b) => a + b, 0) / 2
        );
      }
    }
  }

  return normalized;
};

/**
 * Calculate total / overall score according to test guidelines & flexible grading modes
 */
export const calculateTotalScore = (
  testType,
  skills = {},
  gradingMode = "custom_flexible",
  config = {}
) => {
  // If multi-skill configuration is present
  if (config?.skillsConfig && Array.isArray(config.skillsConfig) && config.skillsConfig.length > 0) {
    if (config.scoringAggregation === "average_round_half") {
      const vals = config.skillsConfig.map((sk) => Number(skills[sk.id]) || 0);
      const avg = vals.reduce((a, b) => a + b, 0) / (vals.length || 1);
      return Math.round(avg * 2) / 2;
    }
    const sum = config.skillsConfig.reduce(
      (acc, sk) => acc + (Number(skills[sk.id]) || 0),
      0
    );
    return Math.round(sum * 100) / 100;
  }

  if (gradingMode === "by_questions") {
    const totalQuestions = Number(config.totalQuestions) || 20;
    const correctCount = Number(skills.correct ?? skills.correctCount) || 0;
    const scoringMethod = config.scoringMethod || "points_per_question";
    const pointsPerQuestion = Number(config.pointsPerQuestion) || 1;

    if (scoringMethod === "scale_10") {
      return totalQuestions > 0 ? Math.round(((correctCount / totalQuestions) * 10) * 10) / 10 : 0;
    }
    if (scoringMethod === "scale_100") {
      return totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * 100) : 0;
    }
    // points_per_question
    return Math.round(correctCount * pointsPerQuestion * 100) / 100;
  }

  if (gradingMode === "direct_score") {
    return Number(skills.score) || 0;
  }

  if (testType === "TOEIC") {
    return Math.round(((Number(skills.listening) || 0) + (Number(skills.reading) || 0)) * 100) / 100;
  }

  if (testType === "IELTS" || testType === "VSTEP") {
    const list = [
      Number(skills.listening) || 0,
      Number(skills.reading) || 0,
      Number(skills.writing) || 0,
      Number(skills.speaking) || 0,
    ];
    const avg = list.reduce((a, b) => a + b, 0) / 4;
    // Round to nearest 0.5
    return Math.round(avg * 2) / 2;
  }

  if (testType === "APTIS") {
    return (
      (Number(skills.grammar_vocab) || 0) +
      (Number(skills.listening) || 0) +
      (Number(skills.reading) || 0) +
      (Number(skills.speaking) || 0) +
      (Number(skills.writing) || 0)
    );
  }

  return Number(skills.score) || 0;
};

/**
 * Save batch test scores for an entire class simultaneously using atomic writeBatch.
 * Denormalizes latest score into student records for instantaneous single-read loading.
 */
export const saveBatchScores = async ({
  sessionId,
  classId,
  testTitle,
  testType = "QUIZ",
  gradingMode = "by_questions",
  config = {},
  testDate,
  targetScore = 0,
  entries = [], // Array of { scoreId, studentId, studentName, skills: {...}, correctCount, totalScore, feedback }
}) => {
  const batch = writeBatch(db);
  const activeSessionId =
    sessionId ||
    `SESSION_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

  for (const entry of entries) {
    const scoreId =
      entry.scoreId ||
      `SCORE_${testDate.replace(/-/g, "")}_${entry.studentId}_${Date.now().toString().slice(-4)}_${Math.random().toString(36).substring(2, 5)}`;
    const scoreRef = doc(db, COLLECTION_NAME, scoreId);

    // If totalScore is manually given or precalculated, use it; otherwise compute
    let total =
      entry.totalScore !== undefined && entry.totalScore !== null && entry.totalScore !== ""
        ? Number(entry.totalScore)
        : calculateTotalScore(testType, entry.skills, gradingMode, config);

    if (isNaN(total)) total = 0;

    const normalizedRadar = calculateRadarScale(testType, entry.skills, gradingMode, config);

    const scoreDoc = {
      scoreId,
      sessionId: activeSessionId,
      studentId: entry.studentId,
      studentName: entry.studentName || "",
      classId,
      testType,
      gradingMode,
      config: {
        totalQuestions: config.totalQuestions ? Number(config.totalQuestions) : null,
        totalScore: config.totalScore ? Number(config.totalScore) : null,
        pointsMode: config.pointsMode || "equal",
        pointsPerQuestion:
          config.pointsPerQuestion !== undefined && config.pointsPerQuestion !== null
            ? Number(config.pointsPerQuestion)
            : null,
        questionWeights: Array.isArray(config.questionWeights) ? config.questionWeights : [],
        skillsConfig: Array.isArray(config.skillsConfig) ? config.skillsConfig : [],
        entryMode: config.entryMode || "score",
        scoringMethod: config.scoringMethod || "points_per_question",
        scoringAggregation: config.scoringAggregation || "sum",
        maxScore: config.maxScore ? Number(config.maxScore) : (config.totalScore ? Number(config.totalScore) : null),
      },
      testTitle,
      testDate,
      correctCount:
        entry.correctCount !== undefined && entry.correctCount !== null && entry.correctCount !== ""
          ? Number(entry.correctCount)
          : entry.skills?.correct !== undefined
          ? Number(entry.skills.correct)
          : null,
      skills: entry.skills || {},
      normalizedRadarScales: normalizedRadar,
      totalScore: total,
      targetScore: Number(targetScore) || 0,
      passed: total >= Number(targetScore),
      feedback: entry.feedback || "",
      updatedAt: serverTimestamp(),
    };

    if (!entry.scoreId) {
      scoreDoc.createdAt = serverTimestamp();
    }

    batch.set(scoreRef, scoreDoc, { merge: true });

    // Denormalize summary onto student document for 1-read student portal load
    try {
      const studentRef = doc(db, "students", entry.studentId);
      batch.update(studentRef, {
        latestScoreSummary: {
          scoreId,
          sessionId: activeSessionId,
          testType,
          gradingMode,
          testTitle,
          examDate: testDate,
          totalScore: total,
          targetScore: Number(targetScore) || 0,
          passed: total >= Number(targetScore),
          skills: entry.skills || {},
          normalizedRadarScales: normalizedRadar,
          config: {
            totalQuestions: config.totalQuestions ? Number(config.totalQuestions) : null,
            totalScore: config.totalScore ? Number(config.totalScore) : null,
            pointsMode: config.pointsMode || "equal",
            skillsConfig: Array.isArray(config.skillsConfig) ? config.skillsConfig : [],
          },
        },
        updatedAt: serverTimestamp(),
      });
    } catch (e) {
      console.warn("Failed to update student latestScoreSummary:", e);
    }
  }

  await batch.commit();
  return activeSessionId;
};

/**
 * Real-time subscription to all scores
 */
export const subscribeScores = (callback) => {
  const colRef = collection(db, COLLECTION_NAME);
  return onSnapshot(
    colRef,
    (snapshot) => {
      const list = snapshot.docs.map((d) => ({ scoreId: d.id, ...d.data() }));
      list.sort((a, b) => (b.testDate || "").localeCompare(a.testDate || ""));
      callback(list);
    },
    (err) => {
      console.error("Scores subscription error:", err);
      callback([]);
    }
  );
};

/**
 * Fetch scores by student
 */
export const getStudentScores = async (studentId) => {
  const q = query(
    collection(db, COLLECTION_NAME),
    where("studentId", "==", studentId),
    orderBy("testDate", "desc")
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => ({ scoreId: d.id, ...d.data() }));
};

/**
 * Delete an entire test session (all scores for that session) and refresh student latestScoreSummary
 */
export const deleteTestSession = async (scoresToDelete = []) => {
  if (!scoresToDelete || scoresToDelete.length === 0) return;

  const batch = writeBatch(db);
  const studentIds = new Set();
  const deletedScoreIds = new Set();

  for (const item of scoresToDelete) {
    if (item.scoreId) {
      const scoreRef = doc(db, COLLECTION_NAME, item.scoreId);
      batch.delete(scoreRef);
      deletedScoreIds.add(item.scoreId);
      if (item.studentId) studentIds.add(item.studentId);
    }
  }

  await batch.commit();

  // For affected students, refresh their latestScoreSummary
  for (const studentId of studentIds) {
    try {
      const studentScores = await getStudentScores(studentId);
      const remainingScores = studentScores.filter((s) => !deletedScoreIds.has(s.scoreId));
      const studentRef = doc(db, "students", studentId);

      if (remainingScores.length > 0) {
        const topScore = remainingScores[0];
        await batch.commit; // no-op
        const updateBatch = writeBatch(db);
        updateBatch.update(studentRef, {
          latestScoreSummary: {
            scoreId: topScore.scoreId,
            sessionId: topScore.sessionId || "",
            testType: topScore.testType,
            gradingMode: topScore.gradingMode || "standard_cert",
            testTitle: topScore.testTitle,
            examDate: topScore.testDate,
            totalScore: topScore.totalScore,
            targetScore: topScore.targetScore || 0,
            passed: topScore.passed || false,
            skills: topScore.skills || {},
            normalizedRadarScales: topScore.normalizedRadarScales || {},
            config: topScore.config || null,
          },
          updatedAt: serverTimestamp(),
        });
        await updateBatch.commit();
      } else {
        const updateBatch = writeBatch(db);
        updateBatch.update(studentRef, {
          latestScoreSummary: null,
          updatedAt: serverTimestamp(),
        });
        await updateBatch.commit();
      }
    } catch (err) {
      console.warn(`Could not refresh latestScoreSummary for student ${studentId}:`, err);
    }
  }
};

/**
 * Delete a single student score record and refresh their latestScoreSummary
 */
export const deleteSingleScore = async (scoreId, studentId) => {
  if (!scoreId) return;

  await deleteDoc(doc(db, COLLECTION_NAME, scoreId));

  if (studentId) {
    try {
      const studentScores = await getStudentScores(studentId);
      const remainingScores = studentScores.filter((s) => s.scoreId !== scoreId);
      const studentRef = doc(db, "students", studentId);

      if (remainingScores.length > 0) {
        const topScore = remainingScores[0];
        const batch = writeBatch(db);
        batch.update(studentRef, {
          latestScoreSummary: {
            scoreId: topScore.scoreId,
            sessionId: topScore.sessionId || "",
            testType: topScore.testType,
            gradingMode: topScore.gradingMode || "standard_cert",
            testTitle: topScore.testTitle,
            examDate: topScore.testDate,
            totalScore: topScore.totalScore,
            targetScore: topScore.targetScore || 0,
            passed: topScore.passed || false,
            skills: topScore.skills || {},
            normalizedRadarScales: topScore.normalizedRadarScales || {},
            config: topScore.config || null,
          },
          updatedAt: serverTimestamp(),
        });
        await batch.commit();
      } else {
        const batch = writeBatch(db);
        batch.update(studentRef, {
          latestScoreSummary: null,
          updatedAt: serverTimestamp(),
        });
        await batch.commit();
      }
    } catch (err) {
      console.warn(`Could not refresh student latestScoreSummary:`, err);
    }
  }
};

const CLASSROOM_GRADES_COLLECTION = "classroom_grades";

/**
 * Save / update student Google Classroom grades in Firestore
 */
export const saveStudentClassroomGrades = async ({
  studentId,
  classId,
  courseId,
  grades = [],
}) => {
  if (!studentId || !Array.isArray(grades) || grades.length === 0) return;

  const batch = writeBatch(db);
  const nowIso = new Date().toISOString();

  let totalPoints = 0;
  let totalMax = 0;
  let gradedCount = 0;

  grades.forEach((g) => {
    const docId = `CG_${studentId}_${g.submissionId || g.courseWorkId}`;
    const docRef = doc(db, CLASSROOM_GRADES_COLLECTION, docId);

    if (g.grade !== null && typeof g.grade !== "undefined") {
      gradedCount++;
      totalPoints += Number(g.grade) || 0;
      totalMax += Number(g.maxPoints) || 100;
    }

    batch.set(
      docRef,
      {
        ...g,
        studentId,
        classId: classId || "",
        courseId: courseId || "",
        syncedAt: nowIso,
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );
  });

  const averagePercentage = totalMax > 0 ? Math.round((totalPoints / totalMax) * 100) : 0;

  try {
    const studentRef = doc(db, "students", studentId);
    batch.update(studentRef, {
      latestClassroomSummary: {
        courseId: courseId || "",
        totalAssignments: grades.length,
        gradedCount,
        averagePercentage,
        lastSyncedAt: nowIso,
      },
      updatedAt: serverTimestamp(),
    });
  } catch (stErr) {
    console.warn("Could not denormalize latestClassroomSummary onto student:", stErr);
  }

  await batch.commit();
};

/**
 * Retrieve saved Google Classroom grades from Firestore
 */
export const getStudentClassroomGrades = async ({ studentId, classId = null }) => {
  if (!studentId) return [];
  try {
    const qConstraints = [where("studentId", "==", studentId)];
    if (classId) {
      qConstraints.push(where("classId", "==", classId));
    }
    const q = query(collection(db, CLASSROOM_GRADES_COLLECTION), ...qConstraints);
    const snapshot = await getDocs(q);
    const list = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
    return list.sort((a, b) => {
      const dateA = a.dueDate || a.updateTime || "";
      const dateB = b.dueDate || b.updateTime || "";
      return dateB.localeCompare(dateA);
    });
  } catch (err) {
    console.warn("Failed to get student classroom grades from Firestore:", err);
    return [];
  }
};

/**
 * Pull and sync Google Classroom grades from GAS API, then cache to Firestore
 */
export const syncStudentClassroomGrades = async ({
  studentId,
  studentEmail,
  classId,
  courseId,
}) => {
  const result = await getClassroomGrades({
    courseId,
    studentEmail,
    studentId,
  });

  if (result && Array.isArray(result.grades) && studentId) {
    try {
      await saveStudentClassroomGrades({
        studentId,
        classId,
        courseId: result.courseId || courseId,
        grades: result.grades,
      });
    } catch (saveErr) {
      console.warn("Could not save classroom grades to Firestore cache:", saveErr);
    }
  }

  return result;
};
