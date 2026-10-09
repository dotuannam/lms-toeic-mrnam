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

  const totalFee = Number(studentData.tuitionFee ?? selectedClass?.tuitionFee ?? 0);
  const tuitionStatus = studentData.tuitionStatus || "debt"; // "completed" | "debt" | "installment"
  let initialPaid = 0;
  if (tuitionStatus === "completed") {
    initialPaid = totalFee;
  } else {
    initialPaid = Number(studentData.paidAmount || 0);
  }
  const remainingDebt = Math.max(0, totalFee - initialPaid);
  const statusStr = tuitionStatus === "completed" || remainingDebt === 0 ? "paid" : initialPaid > 0 ? "partial" : "unpaid";

  const newStudent = {
    studentId,
    fullName: studentData.fullName.trim(),
    email: studentData.email.trim().toLowerCase(),
    phone: studentData.phone ? studentData.phone.trim() : "",
    dob: studentData.dob || "",
    status: studentData.status || "active",
    currentClassIds: selectedClass ? [selectedClass.classId] : [],
    enrolledClasses,
    tuitionOverview: {
      tuitionStatus,
      totalAmount: totalFee,
      paidAmount: initialPaid,
      totalDebt: remainingDebt,
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

      // Initialize tuition record
      const tuitionRef = doc(db, "tuitions", `${studentId}_${selectedClass.classId}`);
      const paymentHistory = [];
      if (initialPaid > 0) {
        paymentHistory.push({
          receiptId: `REC_INIT_${Date.now()}`,
          amount: initialPaid,
          method: "bank_transfer",
          paidAt: new Date().toISOString(),
          receivedBy: "Admin",
          note: tuitionStatus === "completed" ? "Đã hoàn tất học phí khi ghi danh" : "Thanh toán đợt 1 / đặt cọc",
        });
      }

      await setDoc(tuitionRef, {
        tuitionId: `${studentId}_${selectedClass.classId}`,
        studentId,
        studentName: newStudent.fullName,
        studentEmail: newStudent.email,
        classId: selectedClass.classId,
        className: selectedClass.name,
        tuitionStatus, // "completed" | "debt" | "installment"
        totalAmount: totalFee,
        discountAmount: 0,
        finalAmount: totalFee,
        paidAmount: initialPaid,
        debtAmount: remainingDebt,
        status: statusStr,
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
