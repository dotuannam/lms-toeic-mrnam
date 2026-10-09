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
  where,
  orderBy,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "../config/firebase";

export const SUPER_ADMIN_EMAIL = "dotuannamwork2809@gmail.com";

export const isSuperAdmin = (email) => {
  if (!email || typeof email !== "string") return false;
  return email.toLowerCase().trim() === SUPER_ADMIN_EMAIL.toLowerCase().trim();
};

export const STAFF_ROLES = {
  CONSULTANT: {
    id: "consultant",
    labelVi: "Chăm sóc học vụ (Consultant)",
    labelEn: "Academic Consultant",
    badgeColor: "bg-blue-100 text-blue-800 border-blue-200",
    descriptionVi: "Quản lý thông tin học viên, theo dõi học phí, điểm danh và chia sẻ tài liệu.",
    descriptionEn: "Manages students, tuition tracking, attendance, and learning materials.",
    permissions: ["students", "classes", "attendance", "finance", "materials"],
  },
  INSTRUCTOR: {
    id: "instructor",
    labelVi: "Giáo viên / Giảng viên (Instructor)",
    labelEn: "Instructor / Teacher",
    badgeColor: "bg-emerald-100 text-emerald-800 border-emerald-200",
    descriptionVi: "Nhập điểm, kéo điểm Google Classroom, điểm danh lớp học được phân công và tài liệu giảng dạy.",
    descriptionEn: "Inputs grades, syncs Google Classroom scores, attendance, and uploads class materials.",
    permissions: ["classes", "attendance", "scores", "materials"],
  },
  ADMIN: {
    id: "admin",
    labelVi: "Quản trị viên (Admin)",
    labelEn: "Administrator",
    badgeColor: "bg-purple-100 text-purple-800 border-purple-200",
    descriptionVi: "Toàn quyền quản trị vận hành trung tâm và báo cáo.",
    descriptionEn: "Full management of academic operations and reports.",
    permissions: ["students", "classes", "attendance", "scores", "finance", "reports", "website-admin"],
  },
};

const COLLECTION_NAME = "staff";

/**
 * Fetch all staff members
 */
export const getStaffList = async () => {
  const q = query(collection(db, COLLECTION_NAME), orderBy("createdAt", "desc"));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => ({ staffId: d.id, ...d.data() }));
};

/**
 * Real-time listener for staff
 */
export const subscribeStaff = (callback) => {
  const q = query(collection(db, COLLECTION_NAME), orderBy("createdAt", "desc"));
  return onSnapshot(
    q,
    (snapshot) => {
      const list = snapshot.docs.map((d) => ({ staffId: d.id, ...d.data() }));
      callback(list);
    },
    (error) => {
      console.error("Staff subscription error:", error);
    }
  );
};

/**
 * Lookup staff record by email
 */
export const getStaffByEmail = async (email) => {
  if (!email) return null;
  const cleanEmail = email.toLowerCase().trim();
  const q = query(collection(db, COLLECTION_NAME), where("email", "==", cleanEmail));
  const snap = await getDocs(q);
  if (snap.empty) return null;
  const d = snap.docs[0];
  return { staffId: d.id, ...d.data() };
};

/**
 * Add a new Staff member (Consultant or Instructor).
 * STRICT POLICY: Only dotuannamwork2809@gmail.com can perform this action.
 */
export const addStaffMember = async (
  {
    email,
    fullName = "",
    role = "consultant", // "consultant" | "instructor" | "admin"
    phone = "",
    assignedClassIds = [],
    notes = "",
  },
  operatorEmail = ""
) => {
  if (!isSuperAdmin(operatorEmail)) {
    throw new Error(
      "Từ chối quyền truy cập: Chỉ duy nhất tài khoản Super Admin (dotuannamwork2809@gmail.com) mới có quyền thêm nhân sự."
    );
  }

  const cleanEmail = (email || "").toLowerCase().trim();
  if (!cleanEmail || !cleanEmail.includes("@")) {
    throw new Error("Vui lòng nhập địa chỉ Gmail hợp lệ.");
  }

  // Check if staff email already exists
  const existing = await getStaffByEmail(cleanEmail);
  if (existing) {
    throw new Error(`Nhân viên với email "${cleanEmail}" đã tồn tại trong hệ thống.`);
  }

  const staffId = `STAFF_${Date.now()}`;
  const docRef = doc(db, COLLECTION_NAME, staffId);

  const newStaff = {
    staffId,
    email: cleanEmail,
    fullName: fullName.trim() || cleanEmail.split("@")[0],
    role, // "consultant" | "instructor" | "admin"
    phone: phone.trim(),
    assignedClassIds: Array.isArray(assignedClassIds) ? assignedClassIds : [],
    status: "active",
    notes: notes.trim(),
    createdBy: operatorEmail.toLowerCase().trim(),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  await setDoc(docRef, newStaff);

  // Sync role to user document in `users` collection if they already signed in
  try {
    const userQ = query(collection(db, "users"), where("email", "==", cleanEmail));
    const userSnap = await getDocs(userQ);
    if (!userSnap.empty) {
      await updateDoc(doc(db, "users", userSnap.docs[0].id), {
        role: role === "admin" ? "admin" : role,
        updatedAt: serverTimestamp(),
      });
    }
  } catch (err) {
    console.warn("Could not sync user role immediately:", err);
  }

  return newStaff;
};

/**
 * Update staff member
 * STRICT POLICY: Only dotuannamwork2809@gmail.com can perform this action.
 */
export const updateStaffMember = async (staffId, updateData, operatorEmail = "") => {
  if (!isSuperAdmin(operatorEmail)) {
    throw new Error(
      "Từ chối quyền truy cập: Chỉ duy nhất tài khoản Super Admin (dotuannamwork2809@gmail.com) mới có quyền chỉnh sửa nhân sự."
    );
  }

  const docRef = doc(db, COLLECTION_NAME, staffId);
  await updateDoc(docRef, {
    ...updateData,
    updatedAt: serverTimestamp(),
  });

  // If role changed, update users collection
  if (updateData.email && updateData.role) {
    try {
      const userQ = query(collection(db, "users"), where("email", "==", updateData.email.toLowerCase().trim()));
      const userSnap = await getDocs(userQ);
      if (!userSnap.empty) {
        await updateDoc(doc(db, "users", userSnap.docs[0].id), {
          role: updateData.role,
          updatedAt: serverTimestamp(),
        });
      }
    } catch (err) {
      console.warn("User role sync error:", err);
    }
  }
};

/**
 * Delete a Staff member.
 * STRICT POLICY: Only dotuannamwork2809@gmail.com can perform this action.
 */
export const deleteStaffMember = async (staffId, staffEmail = "", operatorEmail = "") => {
  if (!isSuperAdmin(operatorEmail)) {
    throw new Error(
      "Từ chối quyền truy cập: Chỉ duy nhất tài khoản Super Admin (dotuannamwork2809@gmail.com) mới có quyền xóa nhân sự."
    );
  }

  if (isSuperAdmin(staffEmail)) {
    throw new Error("Không thể xóa tài khoản Super Admin chính của hệ thống.");
  }

  const docRef = doc(db, COLLECTION_NAME, staffId);
  await deleteDoc(docRef);

  // Downgrade users collection role back to student
  if (staffEmail) {
    try {
      const userQ = query(collection(db, "users"), where("email", "==", staffEmail.toLowerCase().trim()));
      const userSnap = await getDocs(userQ);
      if (!userSnap.empty) {
        await updateDoc(doc(db, "users", userSnap.docs[0].id), {
          role: "student",
          updatedAt: serverTimestamp(),
        });
      }
    } catch (err) {
      console.warn("User role revoke error:", err);
    }
  }
};
