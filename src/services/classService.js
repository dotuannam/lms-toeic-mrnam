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
import { createGoogleClassroomCourse, createClassStructure } from "./api";

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
 * Create a new Class with automated infrastructure:
 * - Google Drive Root Folder
 * - N subfolders for N sessions (e.g. Buổi 01, Buổi 02...)
 * - Vocabulary Google Sheet (3 columns: Vocabulary - IPA - Meaning auto formula)
 * - Google Classroom (Backup system)
 * - Google Meet direct room link
 */
export const createClass = async (classData, options = {}) => {
  const cleanCode = (classData.code || "").trim().toUpperCase();
  const classId = `CLASS_${cleanCode}_${Date.now().toString().slice(-4)}`;

  const totalSessions = Number(classData.totalSessions) || 24;
  const meetLink = (classData.meetLink || classData.googleMeetLink || "").trim();
  const shouldAutoCreate = typeof options === "boolean" ? options : (classData.autoCreateClassStructure ?? classData.autoCreateClassroom ?? true);

  let integrations = {
    googleMeet: {
      link: meetLink,
    },
    googleClassroom: null,
    googleDrive: null,
    vocabularySheet: null,
  };

  if (shouldAutoCreate) {
    try {
      const gasResult = await createClassStructure({
        name: classData.name,
        section: cleanCode,
        totalSessions,
        meetLink,
        descriptionHeading: `LMS Primary • Google Classroom Backup - Khóa học ${classData.courseType || "TOEIC"} (GV: ${classData.teacherName || "N/A"})`,
        room: classData.schedule || "Online / Hybrid",
        createDriveFolders: classData.autoCreateDriveFolders !== false,
        createVocabSheet: classData.autoCreateVocabSheet !== false,
        createClassroom: classData.autoCreateClassroom !== false,
      });

      if (gasResult) {
        if (gasResult.classroom) {
          integrations.googleClassroom = {
            courseId: gasResult.classroom.courseId,
            alternateLink: gasResult.classroom.alternateLink,
            enrollmentCode: gasResult.classroom.enrollmentCode,
            isBackup: true,
          };
        }
        if (gasResult.driveFolder) {
          integrations.googleDrive = {
            folderId: gasResult.driveFolder.folderId,
            folderLink: gasResult.driveFolder.folderLink,
            totalSessions: gasResult.driveFolder.totalSessions || totalSessions,
            sessionFolders: gasResult.driveFolder.sessionFolders || [],
          };
        }
        if (gasResult.vocabSheet) {
          integrations.vocabularySheet = {
            sheetId: gasResult.vocabSheet.sheetId,
            sheetUrl: gasResult.vocabSheet.sheetUrl,
            name: gasResult.vocabSheet.name,
          };
        }
      }
    } catch (apiErr) {
      console.warn("Classroom API creation failed or running offline, generating local structure:", apiErr);
      const rootFolderId = "sim_root_" + cleanCode;
      const sessionFolders = [];
      for (let i = 1; i <= totalSessions; i++) {
        const numStr = i < 10 ? `0${i}` : `${i}`;
        sessionFolders.push({
          sessionNumber: i,
          name: `Buổi ${numStr} - Bài giảng & Tài liệu`,
          folderId: `sim_session_${numStr}`,
          folderLink: `https://drive.google.com/drive/folders/sim_session_${numStr}`,
        });
      }
      integrations.googleDrive = {
        folderId: rootFolderId,
        folderLink: `https://drive.google.com/drive/folders/${rootFolderId}`,
        totalSessions,
        sessionFolders,
      };
      integrations.vocabularySheet = {
        sheetId: `sim_sheet_${cleanCode}`,
        sheetUrl: `https://docs.google.com/spreadsheets/d/sim_sheet_${cleanCode}/edit`,
        name: `Sổ tay Từ Vựng - ${classData.name} (${cleanCode})`,
      };
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
    totalSessions,
    meetLink,
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
