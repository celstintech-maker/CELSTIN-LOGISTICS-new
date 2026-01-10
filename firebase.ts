import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { 
  getFirestore, 
  collection, 
  addDoc, 
  setDoc,
  doc, 
  onSnapshot, 
  updateDoc, 
  query, 
  orderBy,
  serverTimestamp,
  enableIndexedDbPersistence
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

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

// Attempt to enable offline persistence
enableIndexedDbPersistence(db).catch((err) => {
    if (err.code === 'failed-precondition') {
        console.warn('Multiple tabs open, persistence enabled in only one.');
    } else if (err.code === 'unimplemented') {
        console.warn('Persistence is not supported in this environment.');
    }
});

export const syncCollection = (collectionName: string, callback: (data: any[]) => void, onError?: (err: any) => void) => {
  const q = query(collection(db, collectionName));
  return onSnapshot(q, (snapshot) => {
    const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    callback(data);
  }, (error: any) => {
    console.error(`[Firebase] Error syncing ${collectionName}:`, error.message);
    
    if (error.code === 'permission-denied') {
        console.warn("%c FIREBASE PERMISSION DENIED: You must update your Security Rules to 'allow read, write: if true;' at https://console.firebase.google.com/project/cels-logistics/firestore/rules", "color: white; background: #e11d48; font-weight: bold; padding: 4px; border-radius: 4px;");
    } else if (error.code === 'not-found' || error.message?.includes('database (default) does not exist')) {
        console.warn("%c DATABASE MISSING: Initialize Firestore at https://console.firebase.google.com/project/cels-logistics/firestore", "color: white; background: #f59e0b; font-weight: bold; padding: 4px; border-radius: 4px;");
    }
    
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
    if (e.code === 'permission-denied') {
        throw new Error("Access Denied: Please update Firestore Security Rules to allow writes.");
    }
    if (e.code === 'not-found' || e.message?.includes('not-found')) {
        throw new Error("Cloud Registry Offline: The database has not been initialized.");
    }
    throw e;
  }
};

export const updateData = async (collectionName: string, id: string, data: any) => {
  try {
    const docRef = doc(db, collectionName, id);
    await updateDoc(docRef, {
      ...data,
      updatedAt: serverTimestamp()
    });
  } catch (e: any) {
    console.error("Error updating document: ", e);
    throw e;
  }
};