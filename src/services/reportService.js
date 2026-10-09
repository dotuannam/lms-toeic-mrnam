import {
  collection,
  doc,
  getDocs,
  setDoc,
  query,
  where,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "../config/firebase";
import { sendWeeklyReportEmail } from "./api";

const REPORTS_COLLECTION = "system_reports";

/**
 * Compile weekly summary metrics from Firestore
 */
export const compileWeeklyReport = async (startDateStr, endDateStr) => {
  // 1. Fetch Students count enrolled in range
  const studentsSnap = await getDocs(collection(db, "students"));
  const allStudents = studentsSnap.docs.map((d) => d.data());
  const newStudents = allStudents.filter((s) => {
    if (!s.createdAt) return false;
    const date = s.createdAt.toDate ? s.createdAt.toDate().toISOString().split("T")[0] : "";
    return date >= startDateStr && date <= endDateStr;
  }).length;

  // 2. Fetch Ledger Tuition collected in range
  const ledgerQ = query(
    collection(db, "ledger"),
    where("type", "==", "income"),
    where("date", ">=", startDateStr),
    where("date", "<=", endDateStr)
  );
  const ledgerSnap = await getDocs(ledgerQ);
  const tuitionCollected = ledgerSnap.docs
    .map((d) => d.data())
    .reduce((sum, tx) => sum + (tx.amount || 0), 0);

  // 3. Outstanding debt from all tuitions
  const tuitionsSnap = await getDocs(collection(db, "tuitions"));
  const outstandingDebt = tuitionsSnap.docs
    .map((d) => d.data())
    .reduce((sum, t) => sum + (t.debtAmount || 0), 0);

  // 4. Absences from attendance sessions
  const sessionsQ = query(
    collection(db, "attendance_sessions"),
    where("date", ">=", startDateStr),
    where("date", "<=", endDateStr)
  );
  const sessionsSnap = await getDocs(sessionsQ);
  let totalAbsences = 0;
  let unexcusedAbsences = 0;

  sessionsSnap.docs.forEach((doc) => {
    const summary = doc.data().summary || {};
    const excused = summary.excused || 0;
    const unexcused = summary.unexcused || 0;
    totalAbsences += excused + unexcused;
    unexcusedAbsences += unexcused;
  });

  return {
    period: {
      from: startDateStr,
      to: endDateStr,
    },
    metrics: {
      newStudents,
      tuitionCollected,
      outstandingDebt,
      totalAbsences,
      unexcusedAbsences,
    },
  };
};

/**
 * Save report to Firestore and dispatch email through GAS Web App
 */
export const dispatchWeeklyReport = async (recipients, reportData) => {
  const reportId = `REPORT_${reportData.period.from.replace(/-/g, "")}_${reportData.period.to.replace(/-/g, "")}`;
  const reportRef = doc(db, REPORTS_COLLECTION, reportId);

  // Send Email via GAS API
  await sendWeeklyReportEmail({
    recipients,
    reportData,
  });

  // Log in Firestore
  const reportDoc = {
    reportId,
    period: reportData.period,
    metrics: reportData.metrics,
    dispatchedTo: recipients,
    dispatchStatus: "delivered",
    generatedAt: serverTimestamp(),
  };

  await setDoc(reportRef, reportDoc);
  return reportDoc;
};
