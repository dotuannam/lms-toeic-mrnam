import { fetchCollectionDocs, fetchDocById } from "../config/firebase.js";
import { format } from "date-fns";

/**
 * Find student by ID, phone, or name
 */
export const findStudent = async (searchQuery) => {
  if (!searchQuery) return null;
  const qStr = searchQuery.trim().toLowerCase();

  // Try direct fetch by ID (case-insensitive fallback)
  const direct = await fetchDocById("students", searchQuery.trim().toUpperCase());
  if (direct) return direct;

  const allStudents = await fetchCollectionDocs("students", { limitCount: 200 });

  return (
    allStudents.find(
      (s) =>
        (s.studentId && s.studentId.toLowerCase() === qStr) ||
        (s.phone && s.phone.replace(/[\s\.\-\+]/g, "").includes(qStr.replace(/[\s\.\-\+]/g, ""))) ||
        (s.fullName && s.fullName.toLowerCase().includes(qStr)) ||
        (s.email && s.email.toLowerCase().includes(qStr))
    ) || null
  );
};

/**
 * Find class by ID, code, or name
 */
export const findClass = async (searchQuery) => {
  if (!searchQuery) return null;
  const qStr = searchQuery.trim().toLowerCase();

  const direct = await fetchDocById("classes", searchQuery.trim());
  if (direct) return direct;

  const allClasses = await fetchCollectionDocs("classes", { limitCount: 100 });
  return (
    allClasses.find(
      (c) =>
        (c.classId && c.classId.toLowerCase() === qStr) ||
        (c.code && c.code.toLowerCase() === qStr) ||
        (c.name && c.name.toLowerCase().includes(qStr))
    ) || null
  );
};

/**
 * Get attendance records for today (or a specific date)
 */
export const getAttendanceToday = async (classId = null, dateStr = null) => {
  const targetDate = dateStr || format(new Date(), "yyyy-MM-dd");

  if (classId) {
    const sessionDoc = await fetchDocById("attendance_sessions", `${classId}_${targetDate}`);
    return sessionDoc ? [sessionDoc] : [];
  }

  // Fetch all sessions of today
  const allSessions = await fetchCollectionDocs("attendance_sessions", {
    whereFilters: [["date", "==", targetDate]],
    limitCount: 50,
  });

  return allSessions;
};

/**
 * Get scores for a student
 */
export const getStudentScores = async (studentId) => {
  if (!studentId) return [];
  return await fetchCollectionDocs("scores", {
    whereFilters: [["studentId", "==", studentId.toUpperCase()]],
    orderByField: "testDate",
    orderDirection: "desc",
    limitCount: 10,
  });
};

/**
 * Get financial summary for a period ('today', 'this_week', 'this_month')
 */
export const getFinanceSummary = async (period = "today") => {
  const todayStr = format(new Date(), "yyyy-MM-dd");
  const currentYearMonth = format(new Date(), "yyyy-MM");

  const ledgerTxs = await fetchCollectionDocs("ledger", {
    orderByField: "date",
    orderDirection: "desc",
    limitCount: 150,
  });

  let filtered = ledgerTxs;

  if (period === "today") {
    filtered = ledgerTxs.filter((t) => t.date === todayStr);
  } else if (period === "this_month") {
    filtered = ledgerTxs.filter((t) => t.date && t.date.startsWith(currentYearMonth));
  } else if (period === "this_week") {
    // Last 7 days
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    filtered = ledgerTxs.filter((t) => t.date >= weekAgo);
  }

  const income = filtered
    .filter((t) => t.type === "income")
    .reduce((acc, cur) => acc + (Number(cur.amount) || 0), 0);

  const expense = filtered
    .filter((t) => t.type === "expense")
    .reduce((acc, cur) => acc + (Number(cur.amount) || 0), 0);

  const net = income - expense;

  // Calculate current total outstanding student debt
  const tuitions = await fetchCollectionDocs("tuitions", { limitCount: 200 });
  const totalDebt = tuitions.reduce((acc, cur) => acc + (Number(cur.debtAmount) || 0), 0);
  const debtStudentsCount = tuitions.filter((t) => Number(t.debtAmount) > 0).length;

  return {
    period,
    income,
    expense,
    net,
    txCount: filtered.length,
    totalOutstandingDebt: totalDebt,
    debtStudentsCount,
    recentTxs: filtered.slice(0, 5),
  };
};

/**
 * Get classes scheduled for today based on daysOfWeek
 */
export const getTodayClasses = async () => {
  const allClasses = await fetchCollectionDocs("classes", {
    whereFilters: [["status", "==", "active"]],
    limitCount: 100,
  });

  const dayOfWeekIndex = new Date().getDay(); // 0 is Sunday, 1 is Monday...
  const dayMap = {
    0: ["CN", "Sunday", "Chủ nhật"],
    1: ["T2", "Thứ 2", "Monday", "Mon"],
    2: ["T3", "Thứ 3", "Tuesday", "Tue"],
    3: ["T4", "Thứ 4", "Wednesday", "Wed"],
    4: ["T5", "Thứ 5", "Thursday", "Thu"],
    5: ["T6", "Thứ 6", "Friday", "Fri"],
    6: ["T7", "Thứ 7", "Saturday", "Sat"],
  };

  const currentDayTokens = dayMap[dayOfWeekIndex] || [];

  return allClasses.filter((c) => {
    const scheduleStr = `${c.schedule?.days || ""} ${c.daysOfWeek?.join(" ") || ""} ${c.name || ""}`.toLowerCase();
    return currentDayTokens.some((token) => scheduleStr.includes(token.toLowerCase()));
  });
};

/**
 * Check for high absenteeism (students with >= 2 unexcused absences recently)
 */
export const checkAbsentAlerts = async () => {
  const sessions = await fetchCollectionDocs("attendance_sessions", {
    orderByField: "date",
    orderDirection: "desc",
    limitCount: 20,
  });

  const absenceCounts = {};

  sessions.forEach((s) => {
    if (s.records) {
      Object.entries(s.records).forEach(([studentId, rec]) => {
        if (rec.status === "unexcused") {
          if (!absenceCounts[studentId]) {
            absenceCounts[studentId] = {
              studentId,
              studentName: rec.studentName || studentId,
              classId: s.classId,
              count: 0,
              dates: [],
            };
          }
          absenceCounts[studentId].count += 1;
          absenceCounts[studentId].dates.push(s.date);
        }
      });
    }
  });

  return Object.values(absenceCounts).filter((a) => a.count >= 2);
};

/**
 * Check for students with large or overdue tuition debt
 */
export const checkTuitionDebtAlerts = async () => {
  const tuitions = await fetchCollectionDocs("tuitions", {
    whereFilters: [["status", "in", ["unpaid", "partial", "debt"]]],
    limitCount: 50,
  });

  return tuitions
    .filter((t) => Number(t.debtAmount) > 0)
    .map((t) => ({
      studentId: t.studentId,
      studentName: t.studentName || t.studentId,
      classId: t.classId,
      debtAmount: Number(t.debtAmount),
      totalAmount: Number(t.finalAmount || t.totalAmount || 0),
      dueDate: t.dueDate || "N/A",
    }))
    .slice(0, 10);
};

export default {
  findStudent,
  findClass,
  getAttendanceToday,
  getStudentScores,
  getFinanceSummary,
  getTodayClasses,
  checkAbsentAlerts,
  checkTuitionDebtAlerts,
};
