import { initializeApp } from "firebase/app";
import {
  getFirestore,
  doc,
  deleteDoc,
  collection,
  getDocs,
  query,
  where,
  writeBatch,
  setDoc,
} from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyDnJ0Y2bI09ZLmnPMRtoN2qXyH_9dkG4cc",
  authDomain: "auto-lms-43b1d.firebaseapp.com",
  projectId: "auto-lms-43b1d",
  storageBucket: "auto-lms-43b1d.firebasestorage.app",
  messagingSenderId: "109707658171",
  appId: "1:109707658171:web:a4d20cbf52298eea98ba9e",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function cleanAllSimulatedData() {
  console.log("Starting thorough cleanup of ALL simulated / sandbox data...");
  const batch = writeBatch(db);
  let deleteCount = 0;

  // 1. Specific known Sandbox document IDs
  const knownDocsToDelete = [
    // Classes
    { col: "classes", id: "CLASS_SANDBOX_TOEIC_650" },

    // Students
    { col: "students", id: "HV_SANDBOX_01" },
    { col: "students", id: "HV_SANDBOX_02" },

    // Tuitions
    { col: "tuitions", id: "HV_SANDBOX_01_CLASS_SANDBOX_TOEIC_650" },
    { col: "tuitions", id: "HV_SANDBOX_02_CLASS_SANDBOX_TOEIC_650" },

    // Referrals
    { col: "referrals", id: "ref_sandbox_HV_SANDBOX_01_HV_SANDBOX_02" },

    // Classroom grades
    { col: "classroom_grades", id: "CG_HV_SANDBOX_02_sub_sb_01" },
    { col: "classroom_grades", id: "CG_HV_SANDBOX_02_sub_sb_02" },
    { col: "classroom_grades", id: "CG_HV_SANDBOX_02_sub_sb_03" },

    // Materials
    { col: "materials", id: "mat_sb_primary_01" },
    { col: "materials", id: "mat_sb_supp_01" },
    { col: "materials", id: "mat_sb_live_01" },

    // Vocab words
    { col: "vocab_words", id: "word_sb_01" },
    { col: "vocab_words", id: "word_sb_02" },
    { col: "vocab_words", id: "word_sb_03" },

    // Game history
    { col: "vocab_game_history", id: "sess_sb_flashcard_01" },
    { col: "vocab_game_history", id: "sess_sb_speedrun_01" },
    { col: "vocab_game_history", id: "sess_sb_match_01" },
  ];

  for (const item of knownDocsToDelete) {
    batch.delete(doc(db, item.col, item.id));
    deleteCount++;
  }

  // 2. Scan and delete any document with isSandbox: true or ID starting with "HV_SANDBOX" or "CLASS_SANDBOX"
  const collectionsToCheck = [
    "classes",
    "students",
    "tuitions",
    "referrals",
    "classroom_grades",
    "materials",
    "vocab_words",
    "vocab_game_history",
    "bank_webhook_logs",
    "pos_receipts",
  ];

  for (const colName of collectionsToCheck) {
    try {
      const snap = await getDocs(collection(db, colName));
      snap.docs.forEach((d) => {
        const data = d.data();
        const id = d.id;
        const isSimulated =
          data.isSandbox === true ||
          id.toLowerCase().includes("sandbox") ||
          id.toLowerCase().includes("sim_") ||
          (data.studentId && data.studentId.includes("SANDBOX")) ||
          (data.classId && data.classId.includes("SANDBOX")) ||
          (data.notes && data.notes.includes("Sandbox"));

        if (isSimulated && !knownDocsToDelete.some((k) => k.col === colName && k.id === id)) {
          batch.delete(doc(db, colName, id));
          deleteCount++;
          console.log(`Marked for deletion: [${colName}] ${id}`);
        }
      });
    } catch (err) {
      console.warn(`Error scanning collection ${colName}:`, err.message);
    }
  }

  // 3. Reset Global Announcement Banner if it was the sandbox banner
  try {
    const bannerRef = doc(db, "system_settings", "global_banner");
    batch.set(
      bannerRef,
      {
        enabled: false,
        title: "",
        message: "",
        type: "info",
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    );
    console.log("Global announcement banner disabled.");
  } catch (bErr) {
    console.warn("Error resetting banner:", bErr.message);
  }

  // Commit all deletions
  await batch.commit();
  console.log(`CLEANUP_SUCCESS: Deleted ${deleteCount} simulated documents from Firestore!`);
  process.exit(0);
}

cleanAllSimulatedData().catch((err) => {
  console.error("Cleanup error:", err);
  process.exit(1);
});
