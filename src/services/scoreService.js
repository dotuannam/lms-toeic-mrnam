import {
  collection,
  doc,
  writeBatch,
  getDocs,
  query,
  where,
  orderBy,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "../config/firebase";
import { getClassroomGrades } from "./api";

const COLLECTION_NAME = "scores";

/**
 * Normalizes scores into a 0 - 100 percentage scale for unified Radar Chart rendering
 */
export const calculateRadarScale = (testType, rawSkills = {}) => {
  const normalized = {};

  if (testType === "TOEIC") {
    // Listening (5-495), Reading (5-495)
    normalized["Listening"] = Math.min(100, Math.round(((rawSkills.listening || 0) / 495) * 100));
    normalized["Reading"] = Math.min(100, Math.round(((rawSkills.reading || 0) / 495) * 100));
  } else if (testType === "IELTS") {
    // 0 - 9 scale
    normalized["Listening"] = Math.min(100, Math.round(((rawSkills.listening || 0) / 9) * 100));
    normalized["Reading"] = Math.min(100, Math.round(((rawSkills.reading || 0) / 9) * 100));
    normalized["Writing"] = Math.min(100, Math.round(((rawSkills.writing || 0) / 9) * 100));
    normalized["Speaking"] = Math.min(100, Math.round(((rawSkills.speaking || 0) / 9) * 100));
  } else if (testType === "APTIS") {
    // 0 - 50 scale per component
    normalized["Grammar & Vocab"] = Math.min(100, Math.round(((rawSkills.grammar_vocab || 0) / 50) * 100));
    normalized["Listening"] = Math.min(100, Math.round(((rawSkills.listening || 0) / 50) * 100));
    normalized["Reading"] = Math.min(100, Math.round(((rawSkills.reading || 0) / 50) * 100));
    normalized["Speaking"] = Math.min(100, Math.round(((rawSkills.speaking || 0) / 50) * 100));
    normalized["Writing"] = Math.min(100, Math.round(((rawSkills.writing || 0) / 50) * 100));
  }

  return normalized;
};

/**
 * Calculate total / overall score according to test guidelines
 */
export const calculateTotalScore = (testType, skills = {}) => {
  if (testType === "TOEIC") {
    return (Number(skills.listening) || 0) + (Number(skills.reading) || 0);
  }

  if (testType === "IELTS") {
    const list = [
      Number(skills.listening) || 0,
      Number(skills.reading) || 0,
      Number(skills.writing) || 0,
      Number(skills.speaking) || 0,
    ];
    const avg = list.reduce((a, b) => a + b, 0) / 4;
    // IELTS rounds to nearest 0.5
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

  return 0;
};

/**
 * Save batch test scores for an entire class simultaneously using atomic writeBatch.
 * Denormalizes latest score into student records for instantaneous single-read loading.
 */
export const saveBatchScores = async ({
  classId,
  testTitle,
  testType,
  testDate,
  targetScore = 0,
  entries, // Array of { studentId, studentName, skills: {...}, feedback }
}) => {
  const batch = writeBatch(db);

  for (const entry of entries) {
    const scoreId = `SCORE_${testDate.replace(/-/g, "")}_${entry.studentId}_${Date.now().toString().slice(-4)}`;
    const scoreRef = doc(db, COLLECTION_NAME, scoreId);

    const total = calculateTotalScore(testType, entry.skills);
    const normalizedRadar = calculateRadarScale(testType, entry.skills);

    const scoreDoc = {
      scoreId,
      studentId: entry.studentId,
      studentName: entry.studentName,
      classId,
      testType,
      testTitle,
      testDate,
      skills: entry.skills,
      normalizedRadarScales: normalizedRadar,
      totalScore: total,
      targetScore: Number(targetScore) || 0,
      passed: total >= Number(targetScore),
      feedback: entry.feedback || "",
      createdAt: serverTimestamp(),
    };

    batch.set(scoreRef, scoreDoc);

    // Denormalize summary onto student document for 1-read student portal load
    const studentRef = doc(db, "students", entry.studentId);
    batch.update(studentRef, {
      latestScoreSummary: {
        scoreId,
        testType,
        testTitle,
        examDate: testDate,
        totalScore: total,
        skills: entry.skills,
        normalizedRadarScales: normalizedRadar,
      },
      updatedAt: serverTimestamp(),
    });
  }

  await batch.commit();
};

/**
 * Fetch scores by class or student
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
