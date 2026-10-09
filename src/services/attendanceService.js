import {
  doc,
  getDoc,
  setDoc,
  collection,
  query,
  where,
  getDocs,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "../config/firebase";

const COLLECTION_NAME = "attendance_sessions";

/**
 * Fetch an attendance session for a class on a specific date.
 * Free-Tier Optimization: Costs exactly 1 document read!
 */
export const getAttendanceSession = async (classId, dateStr) => {
  const sessionId = `${classId}_${dateStr}`;
  const docRef = doc(db, COLLECTION_NAME, sessionId);
  const docSnap = await getDoc(docRef);

  if (docSnap.exists()) {
    return { sessionId, ...docSnap.data() };
  }
  return null;
};

/**
 * Save or update class attendance for a specific session.
 * Stores all student statuses in a single map document.
 */
export const saveAttendanceSession = async ({
  classId,
  dateStr,
  takenBy = "Admin",
  records, // { [studentId]: { studentName, status, note } }
}) => {
  const sessionId = `${classId}_${dateStr}`;
  const docRef = doc(db, COLLECTION_NAME, sessionId);

  // Calculate summary metrics
  const recordValues = Object.values(records || {});
  const summary = {
    total: recordValues.length,
    present: recordValues.filter((r) => r.status === "present").length,
    late: recordValues.filter((r) => r.status === "late").length,
    excused: recordValues.filter((r) => r.status === "excused").length,
    unexcused: recordValues.filter((r) => r.status === "unexcused").length,
  };

  const payload = {
    sessionId,
    classId,
    date: dateStr,
    takenBy,
    records,
    summary,
    updatedAt: serverTimestamp(),
  };

  await setDoc(docRef, payload, { merge: true });
  return payload;
};

/**
 * Fetch attendance sessions for a specific class within a date range (for reports/history)
 */
export const getClassAttendanceSessions = async (classId) => {
  const q = query(
    collection(db, COLLECTION_NAME),
    where("classId", "==", classId)
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => ({ sessionId: d.id, ...d.data() }));
};
