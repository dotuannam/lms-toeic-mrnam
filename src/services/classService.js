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
  serverTimestamp,
} from "firebase/firestore";
import { db } from "../config/firebase";
import { createGoogleClassroomCourse } from "./api";

const COLLECTION_NAME = "classes";

/**
 * Fetch all classes ordered by creation date
 */
export const getClasses = async () => {
  const q = query(collection(db, COLLECTION_NAME), orderBy("createdAt", "desc"));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => ({ classId: d.id, ...d.data() }));
};

/**
 * Real-time listener for classes
 */
export const subscribeClasses = (callback) => {
  const q = query(collection(db, COLLECTION_NAME), orderBy("createdAt", "desc"));
  return onSnapshot(
    q,
    (snapshot) => {
      const classes = snapshot.docs.map((d) => ({ classId: d.id, ...d.data() }));
      callback(classes);
    },
    (error) => {
      console.error("Classes subscription error:", error);
    }
  );
};

/**
 * Create a new Class. If autoCreateClassroom is true, calls Google Apps Script backend
 * to provision Google Classroom and Google Drive folder simultaneously.
 */
export const createClass = async (classData, autoCreateClassroom = true) => {
  const cleanCode = (classData.code || "").trim().toUpperCase();
  const classId = `CLASS_${cleanCode}_${Date.now().toString().slice(-4)}`;

  let integrations = {
    googleClassroom: null,
    googleDrive: null,
  };

  if (autoCreateClassroom) {
    try {
      const gasResult = await createGoogleClassroomCourse({
        name: classData.name,
        section: cleanCode,
        descriptionHeading: `${classData.courseType} Course - Teacher: ${classData.teacherName || "N/A"}`,
        room: classData.schedule || "Hybrid",
        createDriveFolder: true,
      });

      if (gasResult) {
        integrations.googleClassroom = {
          courseId: gasResult.courseId,
          alternateLink: gasResult.alternateLink,
          enrollmentCode: gasResult.enrollmentCode,
        };
        if (gasResult.driveFolder) {
          integrations.googleDrive = {
            folderId: gasResult.driveFolder.folderId,
            folderLink: gasResult.driveFolder.folderLink,
          };
        }
      }
    } catch (apiErr) {
      console.warn("Classroom API creation failed or running offline:", apiErr);
      // Non-blocking: continue class creation in Firestore
    }
  }

  const docRef = doc(db, COLLECTION_NAME, classId);
  const newClass = {
    classId,
    code: cleanCode,
    name: classData.name,
    courseType: classData.courseType || "TOEIC", // "TOEIC" | "IELTS" | "APTIS"
    teacherName: classData.teacherName || "",
    startDate: classData.startDate || "",
    endDate: classData.endDate || "",
    schedule: classData.schedule || "",
    status: classData.status || "in_progress", // "planned" | "in_progress" | "completed"
    studentCount: 0,
    tuitionFee: Number(classData.tuitionFee) || 0,
    integrations,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  await setDoc(docRef, newClass);
  return { classId, ...newClass };
};

/**
 * Update class details
 */
export const updateClass = async (classId, updateData) => {
  const docRef = doc(db, COLLECTION_NAME, classId);
  await updateDoc(docRef, {
    ...updateData,
    updatedAt: serverTimestamp(),
  });
};

/**
 * Delete a class
 */
export const deleteClass = async (classId) => {
  const docRef = doc(db, COLLECTION_NAME, classId);
  await deleteDoc(docRef);
};
