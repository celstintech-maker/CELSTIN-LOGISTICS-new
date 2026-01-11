import { initializeApp } from "firebase/app";
import { 
  getFirestore, 
  collection, 
  addDoc, 
  setDoc,
  doc, 
  onSnapshot, 
  updateDoc, 
  query, 
  where,
  getDoc,
  serverTimestamp,
  enableIndexedDbPersistence
} from "firebase/firestore";
import { 
  getAuth, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged 
} from "firebase/auth";
import { User } from "./types";

const firebaseConfig = {
  apiKey: "AIzaSyDR5ItO2VcxLxcxqp8bmKVQ4QOBhakFZ6g",
  authDomain: "cels-logistics.firebaseapp.com",
  projectId: "cels-logistics",
  storageBucket: "cels-logistics.firebasestorage.app",
  messagingSenderId: "579295288862",
  appId: "1:579295288862:web:888f1d48d4828f89b1980f",
  measurementId: "G-23ZLTEH7JM"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);

// Enable offline persistence for better mobile reliability
enableIndexedDbPersistence(db).catch((err) => {
    if (err.code === 'failed-precondition') {
        console.warn('Multiple tabs open, persistence enabled in only one.');
    } else if (err.code === 'unimplemented') {
        console.warn('Persistence is not supported in this environment.');
    }
});

export { signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, onAuthStateChanged };

/**
 * Fetches user metadata from Firestore based on their Auth UID
 */
export const getUserProfile = async (uid: string): Promise<User | null> => {
  try {
    const docRef = doc(db, "users", uid);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() } as User;
    }
    return null;
  } catch (error) {
    console.error("Error fetching user profile:", error);
    return null;
  }
};

export const syncCollection = (collectionName: string, callback: (data: any[]) => void, onError?: (err: any) => void) => {
  const q = query(collection(db, collectionName));
  return onSnapshot(q, (snapshot) => {
    const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    callback(data);
  }, (error: any) => {
    console.error(`[Firebase] Error syncing ${collectionName}:`, error.message);
    if (onError) onError(error);
  });
};

export const pushData = async (collectionName: string, data: any) => {
  try {
    const docRef = await addDoc(collection(db, collectionName), {
      ...data,
      createdAt: serverTimestamp()
    });
    return docRef.id;
  } catch (e: any) {
    console.error("Error adding document: ", e);
    throw e;
  }
};

export const setProfileData = async (uid: string, data: any) => {
  try {
    await setDoc(doc(db, "users", uid), {
      ...data,
      updatedAt: serverTimestamp()
    }, { merge: true });
  } catch (e: any) {
    console.error("Error setting profile: ", e);
    throw e;
  }
};

export const updateData = async (collectionName: string, id: string, data: any) => {
  try {
    const docRef = doc(collectionName, id);
    await updateDoc(docRef, {
      ...data,
      updatedAt: serverTimestamp()
    });
  } catch (e: any) {
    console.error("Error updating document: ", e);
    throw e;
  }
};