import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  orderBy,
  increment,
  serverTimestamp,
} from "firebase/firestore";
import { inviteStudentToClassroom, shareDriveFolderWithStudent } from "./api";
import { addLedgerTransaction } from "./financeService";
import { db } from "../config/firebase";
import { calculateTuitionBreakdown, detectPackageFromClassCode } from "../constants/pricingPolicy";

const COLLECTION_NAME = "students";

/**
 * Fetch all students
 */
export const getStudents = async () => {
  const q = query(collection(db, COLLECTION_NAME), orderBy("createdAt", "desc"));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => ({ studentId: d.id, ...d.data() }));
};

/**
 * Real-time listener for students
 */
export const subscribeStudents = (callback) => {
  const q = query(collection(db, COLLECTION_NAME), orderBy("createdAt", "desc"));
  return onSnapshot(
    q,
    (snapshot) => {
      const students = snapshot.docs.map((d) => ({ studentId: d.id, ...d.data() }));
      callback(students);
    },
    (error) => {
      console.error("Students subscription error:", error);
    }
  );
};

/**
 * Create a new student profile
 * @param {Object} studentData - Student fields
 * @param {Object} [selectedClass] - Assigned class object
 * @param {boolean} [sendClassroomInvite=true] - Trigger automated Classroom email invite
 */
export const createStudent = async (studentData, selectedClass = null, sendClassroomInvite = true) => {
  const studentId = studentData.studentId.trim().toUpperCase();
  const docRef = doc(db, COLLECTION_NAME, studentId);

  const enrolledClasses = selectedClass
    ? [
        {
          classId: selectedClass.classId,
          className: selectedClass.name,
          classCode: selectedClass.code,
          enrolledAt: new Date().toISOString(),
        },
      ]
    : [];

  // Compute or extract pricing breakdown based on Tiered Policy (Phương án B)
  const breakdown =
    studentData.pricingBreakdown ||
    calculateTuitionBreakdown({
      packageCode: studentData.packageCode || detectPackageFromClassCode(selectedClass?.code),
      customBaseFee: studentData.baseFee ?? studentData.tuitionFee ?? selectedClass?.tuitionFee ?? 0,
      customSessions: studentData.sessions || 24,
      groupDiscountType: studentData.groupDiscountType || "NONE",
      isReferredByOldStudent: Boolean(studentData.isReferredByOldStudent),
      referrerCode: studentData.referrerCode || "",
      referrerUpgradeRewardType: studentData.referrerUpgradeRewardType || "NONE",
    });

  const totalFee = Number(
    breakdown.totalFee !== undefined
      ? breakdown.totalFee
      : studentData.tuitionFee ?? selectedClass?.tuitionFee ?? 0
  );
  const tuitionStatus = studentData.tuitionStatus || "debt"; // "completed" | "debt" | "installment"
  let initialPaid = 0;
  if (tuitionStatus === "completed") {
    initialPaid = totalFee;
  } else {
    initialPaid = Number(studentData.paidAmount || 0);
  }
  const remainingDebt = Math.max(0, totalFee - initialPaid);
  const statusStr =
    tuitionStatus === "completed" || remainingDebt === 0
      ? "paid"
      : initialPaid > 0
      ? "partial"
      : "unpaid";

  // Handle Referrer Credit Increment: If referred by an existing student, increment their referral count & credits
  if (breakdown.isReferredByOldStudent && breakdown.referrerCode) {
    try {
      const refCode = breakdown.referrerCode.trim().toUpperCase();
      const refDocRef = doc(db, COLLECTION_NAME, refCode);
      const refSnap = await getDoc(refDocRef);
      if (refSnap.exists()) {
        await updateDoc(refDocRef, {
          referralCount: increment(1),
          referralCreditsAvailable: increment(1),
          updatedAt: serverTimestamp(),
        });
      }
    } catch (refErr) {
      console.warn("Could not credit referrer student:", refErr);
    }
  }

  const newStudent = {
    studentId,
    studentCode: studentId,
    fullName: studentData.fullName.trim(),
    email: studentData.email.trim().toLowerCase(),
    phone: studentData.phone ? studentData.phone.trim() : "",
    dob: studentData.dob || "",
    status: studentData.status || "active",
    referralCount: Number(studentData.referralCount) || 0,
    referralCreditsAvailable: Number(studentData.referralCreditsAvailable) || 0,
    currentClassIds: selectedClass ? [selectedClass.classId] : [],
    enrolledClasses,
    tuitionOverview: {
      tuitionStatus,
      totalAmount: totalFee,
      totalFee,
      paidAmount: initialPaid,
      paid: initialPaid,
      totalDebt: remainingDebt,
      debt: remainingDebt,
      packageCode: breakdown.packageCode,
      packageName: breakdown.packageName,
      sessions: breakdown.sessions,
      baseFee: breakdown.baseFee,
      comboDiscountPct: breakdown.comboDiscountPct,
      groupDiscountType: breakdown.groupDiscountType,
      groupDiscountPct: breakdown.groupDiscountPct,
      isReferredByOldStudent: breakdown.isReferredByOldStudent,
      referrerCode: breakdown.referrerCode,
      referrerUpgradeRewardType: breakdown.referrerUpgradeRewardType,
      totalDiscountAmount: breakdown.totalDiscountAmount,
      effectivePricePerSession: breakdown.effectivePricePerSession,
      isCappedAt20Pct: breakdown.isCappedAt20Pct,
      isFloorEnforced: breakdown.isFloorEnforced,
      lastPaymentDate: initialPaid > 0 ? new Date().toISOString() : null,
    },
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  await setDoc(docRef, newStudent);

  // If assigned to a class, increment student count and create initial tuition record
  if (selectedClass) {
    try {
      const classRef = doc(db, "classes", selectedClass.classId);
      await updateDoc(classRef, {
        studentCount: increment(1),
      });

      // Initialize tuition record in 'tuitions' collection
      const tuitionRef = doc(db, "tuitions", `${studentId}_${selectedClass.classId}`);
      const paymentHistory = [];
      if (initialPaid > 0) {
        paymentHistory.push({
          receiptId: `REC_INIT_${Date.now()}`,
          amount: initialPaid,
          method: "bank_transfer",
          paidAt: new Date().toISOString(),
          receivedBy: "Admin",
          note:
            tuitionStatus === "completed"
              ? "Đã hoàn tất học phí khi ghi danh"
              : "Thanh toán đợt 1 / đặt cọc",
        });
      }

      await setDoc(tuitionRef, {
        tuitionId: `${studentId}_${selectedClass.classId}`,
        studentId,
        studentCode: studentId,
        studentName: newStudent.fullName,
        studentEmail: newStudent.email,
        classId: selectedClass.classId,
        className: selectedClass.name,
        tuitionStatus, // "completed" | "debt" | "installment"
        // Legacy & compatibility aliases
        totalAmount: totalFee,
        totalFee,
        discountAmount: breakdown.totalDiscountAmount,
        totalDiscountAmount: breakdown.totalDiscountAmount,
        finalAmount: totalFee,
        paidAmount: initialPaid,
        paid: initialPaid,
        debtAmount: remainingDebt,
        debt: remainingDebt,
        status: statusStr,
        // Breakdown fields for Tiered Policy
        packageCode: breakdown.packageCode,
        packageName: breakdown.packageName,
        sessions: breakdown.sessions,
        baseFee: breakdown.baseFee,
        comboDiscountPct: breakdown.comboDiscountPct,
        groupDiscountType: breakdown.groupDiscountType,
        groupDiscountPct: breakdown.groupDiscountPct,
        isReferredByOldStudent: breakdown.isReferredByOldStudent,
        referrerCode: breakdown.referrerCode,
        referrerUpgradeRewardType: breakdown.referrerUpgradeRewardType,
        effectivePricePerSession: breakdown.effectivePricePerSession,
        isCappedAt20Pct: breakdown.isCappedAt20Pct,
        isFloorEnforced: breakdown.isFloorEnforced,
        installmentNote: studentData.installmentNote || "",
        paymentHistory,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      // Record collected money into ledger (unpaid debt is NOT counted as revenue)
      if (initialPaid > 0) {
        addLedgerTransaction({
          type: "income",
          category: "tuition",
          amount: initialPaid,
          description: `Thu học phí: ${newStudent.fullName} (${selectedClass.name}) - ${tuitionStatus === "completed" ? "Hoàn tất" : "Đợt 1"}`,
          paymentMethod: "bank_transfer",
          date: new Date().toISOString().split("T")[0],
          createdBy: "Admin",
        }).catch((lErr) => console.warn("Initial ledger recording skipped:", lErr));
      }

      // 1. Automatically grant Google Drive Viewer permission if folder exists
      const driveFolderId = selectedClass.integrations?.googleDrive?.folderId;
      if (driveFolderId && newStudent.email) {
        shareDriveFolderWithStudent({
          folderId: driveFolderId,
          studentEmail: newStudent.email,
        }).catch((err) => console.warn("Automated Drive permission grant skipped:", err));
      }

      // 2. Trigger Google Classroom invite if configured
      if (
        sendClassroomInvite &&
        selectedClass.integrations?.googleClassroom?.courseId &&
        newStudent.email
      ) {
        inviteStudentToClassroom({
          courseId: selectedClass.integrations.googleClassroom.courseId,
          studentEmail: newStudent.email,
          folderId: driveFolderId,
        }).catch((err) => console.warn("Automated classroom invitation skipped:", err));
      }
    } catch (e) {
      console.warn("Class association update warning:", e);
    }
  }

  return { studentId, ...newStudent };
};

/**
 * Update student record
 */
export const updateStudent = async (studentId, updateData) => {
  const docRef = doc(db, COLLECTION_NAME, studentId);
  await updateDoc(docRef, {
    ...updateData,
    updatedAt: serverTimestamp(),
  });
};

/**
 * Delete a student record
 */
export const deleteStudent = async (studentId, classId = null) => {
  const docRef = doc(db, COLLECTION_NAME, studentId);
  await deleteDoc(docRef);

  if (classId) {
    try {
      const classRef = doc(db, "classes", classId);
      await updateDoc(classRef, {
        studentCount: increment(-1),
      });
    } catch (e) {
      console.warn("Class count decrement error:", e);
    }
  }
};

/**
 * Grant Google Drive folder viewer access for a student
 */
export const grantStudentDriveAccess = async (folderId, studentEmail) => {
  if (!folderId || !studentEmail) return false;
  return await shareDriveFolderWithStudent({ folderId, studentEmail });
};
