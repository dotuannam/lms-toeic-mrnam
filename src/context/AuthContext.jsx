import React, { createContext, useContext, useEffect, useState } from "react";
import {
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  sendPasswordResetEmail,
  onAuthStateChanged,
} from "firebase/auth";
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  collection,
  query,
  where,
  getDocs,
  serverTimestamp,
} from "firebase/firestore";
import { auth, googleProvider, db } from "../config/firebase";
import { CENTER_CONFIG } from "../config/appConfig";
import { isSuperAdmin, getStaffByEmail, SUPER_ADMIN_EMAIL } from "../services/staffService";

const AuthContext = createContext(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [role, setRole] = useState(null); // 'superadmin' | 'admin' | 'consultant' | 'instructor' | 'student' | null
  const [staffInfo, setStaffInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState(null);

  /**
   * Synchronize or provision the user's role profile from Firestore.
   * Resolves whether the user is Super Admin, Staff (Consultant/Instructor), or Student.
   */
  const syncUserProfile = async (firebaseUser) => {
    if (!firebaseUser) {
      setUserProfile(null);
      setRole(null);
      setStaffInfo(null);
      return;
    }

    const userEmail = (firebaseUser.email || "").toLowerCase().trim();
    const isSuper = isSuperAdmin(userEmail);
    const configuredAdmin = (CENTER_CONFIG?.adminEmail || "").toLowerCase().trim();
    const isAdminEmail = isSuper || (userEmail !== "" && userEmail === configuredAdmin);

    // Check staff registry in Firestore
    let staffRecord = null;
    try {
      staffRecord = await getStaffByEmail(userEmail);
      setStaffInfo(staffRecord);
    } catch (sErr) {
      console.warn("Could not check staff role:", sErr);
    }

    try {
      const userDocRef = doc(db, "users", firebaseUser.uid);
      const userDocSnap = await getDoc(userDocRef);

      if (userDocSnap.exists()) {
        const data = userDocSnap.data();
        let effectiveRole = data.role || "student";

        // Prioritize Super Admin & Staff roles
        if (isSuper) {
          effectiveRole = "superadmin";
        } else if (staffRecord && staffRecord.role) {
          effectiveRole = staffRecord.role;
        } else if (isAdminEmail && effectiveRole === "student") {
          effectiveRole = "admin";
        }

        if (effectiveRole !== data.role) {
          data.role = effectiveRole;
          await updateDoc(userDocRef, {
            role: effectiveRole,
            updatedAt: serverTimestamp(),
          });
        }

        setUserProfile(data);
        setRole(effectiveRole);
      } else {
        const detectedRole = isSuper
          ? "superadmin"
          : staffRecord && staffRecord.role
          ? staffRecord.role
          : isAdminEmail
          ? "admin"
          : "student";
        let linkedStudentId = null;

        if (!isAdminEmail && !isSuper && !staffRecord) {
          // First-time sign-in by student: search for matching student profile by email
          const studentsQuery = query(
            collection(db, "students"),
            where("email", "==", userEmail)
          );
          const querySnapshot = await getDocs(studentsQuery);

          if (!querySnapshot.empty) {
            const studentDoc = querySnapshot.docs[0];
            linkedStudentId = studentDoc.id;

            await updateDoc(doc(db, "students", studentDoc.id), {
              uid: firebaseUser.uid,
              updatedAt: serverTimestamp(),
            });
          }
        }

        const newProfile = {
          uid: firebaseUser.uid,
          email: userEmail,
          displayName: firebaseUser.displayName || userEmail.split("@")[0],
          photoURL: firebaseUser.photoURL || null,
          role: detectedRole,
          studentId: linkedStudentId,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        };

        await setDoc(userDocRef, newProfile);
        setUserProfile(newProfile);
        setRole(detectedRole);
      }
    } catch (err) {
      console.error("Failed to sync user profile from Firestore:", err);
      // Fallback: If Firestore read/write error occurs, still grant admin role in memory if email matches
      if (isAdminEmail) {
        const fallbackAdminProfile = {
          uid: firebaseUser.uid,
          email: userEmail,
          displayName: firebaseUser.displayName || "Administrator",
          role: "admin",
        };
        setUserProfile(fallbackAdminProfile);
        setRole("admin");
      } else {
        setAuthError(err.message);
      }
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setLoading(true);
      setCurrentUser(user);
      if (user) {
        await syncUserProfile(user);
      } else {
        setUserProfile(null);
        setRole(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Email & Password Login
  const loginWithEmail = async (email, password) => {
    setAuthError(null);
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      await syncUserProfile(userCredential.user);
      return userCredential.user;
    } catch (err) {
      setAuthError(err.message);
      throw err;
    }
  };

  // Google OAuth Login
  const loginWithGoogle = async () => {
    setAuthError(null);
    try {
      const userCredential = await signInWithPopup(auth, googleProvider);
      await syncUserProfile(userCredential.user);
      return userCredential.user;
    } catch (err) {
      setAuthError(err.message);
      throw err;
    }
  };

  // Logout
  const logout = async () => {
    setAuthError(null);
    try {
      await signOut(auth);
      setCurrentUser(null);
      setUserProfile(null);
      setRole(null);
    } catch (err) {
      setAuthError(err.message);
      throw err;
    }
  };

  // Password Reset
  const resetPassword = async (email) => {
    setAuthError(null);
    try {
      await sendPasswordResetEmail(auth, email);
    } catch (err) {
      setAuthError(err.message);
      throw err;
    }
  };

  const value = {
    currentUser,
    userProfile,
    role,
    isSuperAdmin: isSuperAdmin(currentUser?.email),
    isAdmin: role === "admin" || role === "superadmin",
    isConsultant: role === "consultant",
    isInstructor: role === "instructor",
    isStaff:
      role === "admin" ||
      role === "superadmin" ||
      role === "consultant" ||
      role === "instructor",
    staffInfo,
    isStudent: role === "student",
    loading,
    authError,
    setAuthError,
    loginWithEmail,
    loginWithGoogle,
    logout,
    resetPassword,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
export default AuthContext;
