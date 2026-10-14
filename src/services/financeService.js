import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  updateDoc,
  query,
  where,
  orderBy,
  limit,
  increment,
  arrayUnion,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "../config/firebase";

const TUITIONS_COLLECTION = "tuitions";
const LEDGER_COLLECTION = "ledger";
const SUMMARIES_COLLECTION = "ledger_summaries";

/**
 * Fetch all tuitions or filter by class
 */
export const getTuitions = async (classId = null) => {
  let q;
  if (classId && classId !== "all") {
    q = query(collection(db, TUITIONS_COLLECTION), where("classId", "==", classId));
  } else {
    q = query(collection(db, TUITIONS_COLLECTION), orderBy("updatedAt", "desc"));
  }
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => ({ tuitionId: d.id, ...d.data() }));
};

/**
 * Record a student tuition payment:
 * 1. Updates tuition record (debt deduction & history append)
 * 2. Updates student profile debt cache
 * 3. Automatically registers transaction in the internal Ledger
 * 4. Rolls up monthly summary
 */
export const recordTuitionPayment = async ({
  tuitionId,
  studentId,
  classId,
  studentName,
  amount,
  paymentMethod = "bank_transfer",
  note = "",
  receivedBy = "Admin",
}) => {
  const numAmount = Number(amount) || 0;
  const now = new Date();
  const dateStr = now.toISOString().split("T")[0];
  const yearMonth = dateStr.slice(0, 7);

  const receiptId = `REC_${Date.now().toString().slice(-6)}`;
  const receipt = {
    receiptId,
    amount: numAmount,
    method: paymentMethod,
    paidAt: now.toISOString(),
    receivedBy,
    note,
  };

  // 1. Update Tuition Document
  const tuitionRef = doc(db, TUITIONS_COLLECTION, tuitionId);
  const tuitionSnap = await getDoc(tuitionRef);
  if (!tuitionSnap.exists()) throw new Error("Tuition record not found.");

  const currentTotalFee = currentData.totalFee ?? currentData.finalAmount ?? currentData.totalAmount ?? 0;
  const newPaid = (currentData.paidAmount || currentData.paid || 0) + numAmount;
  const newDebt = Math.max(0, currentTotalFee - newPaid);
  const newStatus = newDebt === 0 ? "paid" : newPaid > 0 ? "partial" : "unpaid";

  await updateDoc(tuitionRef, {
    paidAmount: newPaid,
    paid: newPaid,
    debtAmount: newDebt,
    debt: newDebt,
    totalFee: currentTotalFee,
    status: newStatus,
    paymentHistory: arrayUnion(receipt),
    updatedAt: serverTimestamp(),
  });

  // 2. Update Student Profile
  if (studentId) {
    const studentRef = doc(db, "students", studentId);
    await updateDoc(studentRef, {
      "tuitionOverview.paidAmount": newPaid,
      "tuitionOverview.paid": newPaid,
      "tuitionOverview.totalDebt": newDebt,
      "tuitionOverview.debt": newDebt,
      "tuitionOverview.totalFee": currentTotalFee,
      "tuitionOverview.lastPaymentDate": now.toISOString(),
      updatedAt: serverTimestamp(),
    });
  }

  // 3. Create Ledger Income Record
  await addLedgerTransaction({
    type: "income",
    category: "tuition",
    amount: numAmount,
    description: `Tuition payment - ${studentName} (${studentId})`,
    referenceId: receiptId,
    paymentMethod,
    date: dateStr,
    createdBy: receivedBy,
  });

  return { receiptId, newDebt, newStatus };
};

/**
 * Add an Income or Expense transaction to the Internal Ledger
 */
export const addLedgerTransaction = async ({
  type, // "income" | "expense"
  category,
  amount,
  description,
  referenceId = null,
  paymentMethod = "cash",
  date,
  createdBy = "Admin",
}) => {
  const numAmount = Number(amount) || 0;
  const txDate = date || new Date().toISOString().split("T")[0];
  const yearMonth = txDate.slice(0, 7);

  const txId = `TX_${Date.now().toString().slice(-6)}`;
  const txRef = doc(db, LEDGER_COLLECTION, txId);

  const transactionData = {
    transactionId: txId,
    type,
    category: category || "other",
    amount: numAmount,
    description: description || "",
    referenceId,
    paymentMethod,
    date: txDate,
    yearMonth,
    createdBy,
    createdAt: serverTimestamp(),
  };

  await setDoc(txRef, transactionData);

  // Update Monthly Summary Rollup (Cost Optimization)
  const summaryRef = doc(db, SUMMARIES_COLLECTION, yearMonth);
  const incomeInc = type === "income" ? numAmount : 0;
  const expenseInc = type === "expense" ? numAmount : 0;
  const profitInc = type === "income" ? numAmount : -numAmount;

  await setDoc(
    summaryRef,
    {
      yearMonth,
      totalIncome: increment(incomeInc),
      totalExpense: increment(expenseInc),
      netProfit: increment(profitInc),
      transactionCount: increment(1),
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );

  return transactionData;
};

/**
 * Get recent Ledger transactions
 */
export const getLedgerTransactions = async (limitCount = 50) => {
  const q = query(
    collection(db, LEDGER_COLLECTION),
    orderBy("date", "desc"),
    limit(limitCount)
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => ({ transactionId: d.id, ...d.data() }));
};

/**
 * Get monthly summaries for Profit & Loss Chart.
 * 12 reads per year!
 */
export const getMonthlySummaries = async () => {
  const q = query(collection(db, SUMMARIES_COLLECTION), orderBy("yearMonth", "asc"));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => ({ yearMonth: d.id, ...d.data() }));
};
