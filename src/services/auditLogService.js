import {
  collection,
  addDoc,
  serverTimestamp,
  query,
  where,
  orderBy,
  limit,
  getDocs,
} from "firebase/firestore";
import { auth, db } from "../config/firebase";

export const ACTIVITY_LOGS_COLLECTION = "activity_logs";

export const ACTION_TYPES = {
  // Authentication
  LOGIN: "USER_LOGIN",
  LOGOUT: "USER_LOGOUT",

  // Student actions
  STUDENT_CREATE: "STUDENT_CREATE",
  STUDENT_UPDATE: "STUDENT_UPDATE",
  STUDENT_DELETE: "STUDENT_DELETE",

  // Class actions
  CLASS_CREATE: "CLASS_CREATE",
  CLASS_UPDATE: "CLASS_UPDATE",

  // Attendance
  ATTENDANCE_SAVE: "ATTENDANCE_SAVE",

  // Scores
  SCORE_SAVE: "SCORE_SAVE",
  SCORE_DELETE: "SCORE_DELETE",

  // Finance
  PAYMENT_RECORD: "PAYMENT_RECORD",
  LEDGER_ADD: "LEDGER_ADD",

  // Learning / Vocab
  VOCAB_PRACTICE: "VOCAB_PRACTICE",

  // Generic
  GENERIC_ACTION: "GENERIC_ACTION",
};

/**
 * Log a user activity into Firestore
 * Safe and non-blocking: Never throws error to crash caller
 */
export const logActivity = async ({
  action,
  resource = "system",
  targetId = null,
  targetName = "",
  details = "",
  metadata = {},
  actor = null, // Optional override { uid, email, displayName, role }
}) => {
  try {
    const currentUser = auth.currentUser;
    const actorUid = actor?.uid || currentUser?.uid || "system";
    const actorEmail = actor?.email || currentUser?.email || "system@toeicmrnam.vn";
    const actorName =
      actor?.displayName ||
      currentUser?.displayName ||
      actorEmail.split("@")[0] ||
      "Ẩn danh";
    const actorRole = actor?.role || (actorEmail.includes("nam") ? "admin" : "user");

    const payload = {
      action,
      resource,
      targetId: targetId || null,
      targetName: targetName || "",
      details: details || "",
      actor: {
        uid: actorUid,
        email: actorEmail,
        name: actorName,
        role: actorRole,
      },
      metadata: {
        ...metadata,
        userAgent: typeof navigator !== "undefined" ? navigator.userAgent : "server",
        url: typeof window !== "undefined" ? window.location.pathname : "",
      },
      createdAt: serverTimestamp(),
      createdDate: new Date().toISOString().slice(0, 10), // YYYY-MM-DD for fast query
      timestamp: Date.now(),
    };

    const docRef = await addDoc(collection(db, ACTIVITY_LOGS_COLLECTION), payload);
    return { success: true, logId: docRef.id };
  } catch (error) {
    // Non-blocking log failure
    console.warn("[AuditLog] Failed to record activity:", error);
    return { success: false, error: error.message };
  }
};

/**
 * Fetch recent activity logs (used by Web UI if needed)
 */
export const getRecentLogs = async (maxCount = 50) => {
  try {
    const q = query(
      collection(db, ACTIVITY_LOGS_COLLECTION),
      orderBy("createdAt", "desc"),
      limit(maxCount)
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
  } catch (err) {
    console.error("[AuditLog] Error fetching logs:", err);
    return [];
  }
};

export default {
  logActivity,
  getRecentLogs,
  ACTION_TYPES,
  ACTIVITY_LOGS_COLLECTION,
};
