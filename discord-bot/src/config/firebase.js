import fs from "fs";
import path from "path";
import admin from "firebase-admin";
import { initializeApp as initClientApp, getApps as getClientApps } from "firebase/app";
import {
  getFirestore as getClientFirestore,
  collection,
  getDocs,
  getDoc,
  doc,
  query,
  where,
  orderBy,
  limit as firestoreLimit,
  onSnapshot,
} from "firebase/firestore";
import config from "./env.js";

let adminApp = null;
let clientApp = null;
let db = null;
let auth = null;
let isUsingAdmin = false;

// Fallback config for client SDK if service account is not yet provided
const FALLBACK_CLIENT_CONFIG = {
  apiKey: "AIzaSyDnJ0Y2bI09ZLmnPMRtoN2qXyH_9dkG4cc",
  authDomain: "auto-lms-43b1d.firebaseapp.com",
  projectId: config.firebase.projectId || "auto-lms-43b1d",
  storageBucket: "auto-lms-43b1d.firebasestorage.app",
  messagingSenderId: "109707658171",
  appId: "1:109707658171:web:a4d20cbf52298eea98ba9e",
};

/**
 * Initialize Firebase connection
 */
export const initFirebase = () => {
  if (db) return { db, auth, isUsingAdmin };

  // Attempt 1: Load serviceAccountKey.json or env credentials for Admin SDK
  try {
    let credential = null;
    const saPath = config.firebase.serviceAccountPath;

    if (fs.existsSync(saPath)) {
      const saRaw = fs.readFileSync(saPath, "utf-8");
      const saJson = JSON.parse(saRaw);
      credential = admin.credential.cert(saJson);
      console.log(`🔑 [Firebase] Loaded Service Account from ${saPath}`);
    } else if (config.firebase.clientEmail && config.firebase.privateKey) {
      credential = admin.credential.cert({
        projectId: config.firebase.projectId,
        clientEmail: config.firebase.clientEmail,
        privateKey: config.firebase.privateKey,
      });
      console.log("🔑 [Firebase] Loaded Service Account from environment variables");
    }

    if (credential) {
      adminApp = admin.initializeApp({
        credential,
        projectId: config.firebase.projectId,
      });
      db = adminApp.firestore();
      auth = adminApp.auth();
      isUsingAdmin = true;
      console.log("✅ [Firebase] Firebase Admin SDK initialized successfully (Full Privileges).");
      return { db, auth, isUsingAdmin };
    }
  } catch (err) {
    console.warn("⚠️ [Firebase] Could not initialize Admin SDK:", err.message);
  }

  // Attempt 2: Fallback to Client SDK
  console.log("ℹ️ [Firebase] Falling back to Firebase Client SDK for read access...");
  const apps = getClientApps();
  clientApp = apps.length ? apps[0] : initClientApp(FALLBACK_CLIENT_CONFIG);
  db = getClientFirestore(clientApp);
  isUsingAdmin = false;
  console.log("✅ [Firebase] Firebase Client SDK initialized.");
  return { db, auth: null, isUsingAdmin };
};

/**
 * Unified Helper to query documents across both Admin SDK and Client SDK
 */
export const fetchCollectionDocs = async (collectionName, options = {}) => {
  const { orderByField, orderDirection = "desc", limitCount, whereFilters = [] } = options;

  if (isUsingAdmin) {
    let q = db.collection(collectionName);
    for (const [field, op, value] of whereFilters) {
      q = q.where(field, op, value);
    }
    if (orderByField) {
      q = q.orderBy(orderByField, orderDirection);
    }
    if (limitCount) {
      q = q.limit(limitCount);
    }
    const snap = await q.get();
    return snap.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }));
  } else {
    // Client SDK
    let queryConstraints = [];
    for (const [field, op, value] of whereFilters) {
      queryConstraints.push(where(field, op, value));
    }
    if (orderByField) {
      queryConstraints.push(orderBy(orderByField, orderDirection));
    }
    if (limitCount) {
      queryConstraints.push(firestoreLimit(limitCount));
    }

    const q = query(collection(db, collectionName), ...queryConstraints);
    const snap = await getDocs(q);
    return snap.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }));
  }
};

/**
 * Unified Helper to fetch a single document by ID
 */
export const fetchDocById = async (collectionName, docId) => {
  if (isUsingAdmin) {
    const snap = await db.collection(collectionName).doc(docId).get();
    if (!snap.exists) return null;
    return { id: snap.id, ...snap.data() };
  } else {
    const docRef = doc(db, collectionName, docId);
    const snap = await getDoc(docRef);
    if (!snap.exists()) return null;
    return { id: snap.id, ...snap.data() };
  }
};

/**
 * Unified Helper for Realtime Listeners
 */
export const listenCollection = (collectionName, onAddedCallback, options = {}) => {
  const { orderByField = "createdAt", limitCount = 20 } = options;

  if (isUsingAdmin) {
    let q = db.collection(collectionName).orderBy(orderByField, "desc").limit(limitCount);
    let initialLoaded = false;

    return q.onSnapshot(
      (snapshot) => {
        if (!initialLoaded) {
          initialLoaded = true;
          return; // Ignore initial historical records
        }
        snapshot.docChanges().forEach((change) => {
          if (change.type === "added") {
            onAddedCallback({ id: change.doc.id, ...change.doc.data() });
          }
        });
      },
      (error) => {
        console.error(`[Listener Error] ${collectionName}:`, error);
      }
    );
  } else {
    // Client SDK
    const q = query(
      collection(db, collectionName),
      orderBy(orderByField, "desc"),
      firestoreLimit(limitCount)
    );
    let initialLoaded = false;

    return onSnapshot(
      q,
      (snapshot) => {
        if (!initialLoaded) {
          initialLoaded = true;
          return;
        }
        snapshot.docChanges().forEach((change) => {
          if (change.type === "added") {
            onAddedCallback({ id: change.doc.id, ...change.doc.data() });
          }
        });
      },
      (error) => {
        console.error(`[Listener Error] ${collectionName}:`, error);
      }
    );
  }
};

export { db, auth, isUsingAdmin };
export default {
  initFirebase,
  fetchCollectionDocs,
  fetchDocById,
  listenCollection,
};
