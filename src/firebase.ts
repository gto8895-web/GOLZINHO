import { initializeApp } from 'firebase/app';
import { 
  getFirestore, 
  doc, 
  getDoc, 
  getDocFromServer,
  setDoc, 
  collection, 
  query, 
  where, 
  getDocs,
  getDocsFromServer,
  limit
} from 'firebase/firestore';
import { Vehicle, FuelLog, MaintenanceLog } from './types';

const firebaseConfig = {
  apiKey: "AIzaSyBRdkQ-dGo1puGT6CJmAcAbepMM4R9w3Q0",
  authDomain: "fair-inscriber-lw1xt.firebaseapp.com",
  projectId: "fair-inscriber-lw1xt",
  storageBucket: "fair-inscriber-lw1xt.firebasestorage.app",
  messagingSenderId: "109448782263",
  appId: "1:109448782263:web:5c49388bbaf25d78da8832"
};

const app = initializeApp(firebaseConfig);
// Connect using the custom databaseId provided in config
export const db = getFirestore(app, "ai-studio-golzinho-0995fe15-3271-4878-b89e-6cb9c0110c9b");

export interface UserData {
  userId: string;
  syncCode: string;
  vehicle: Vehicle;
  fuelLogs: FuelLog[];
  maintenanceLogs: MaintenanceLog[];
  updatedAt: string;
}

// Generate a random 6-digit sync code (e.g., GOL-183920)
export function generateSyncCode(): string {
  const digits = Math.floor(100000 + Math.random() * 900000).toString();
  return `GOL-${digits}`;
}

// Generate a simple unique user ID
export function generateUserId(): string {
  return `usr_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

// Save all user data in a single atomic document
export async function saveUserData(
  userId: string, 
  syncCode: string, 
  vehicle: Vehicle, 
  fuelLogs: FuelLog[], 
  maintenanceLogs: MaintenanceLog[]
): Promise<void> {
  const normalized = (vehicle.plate || '').trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
  const dataToSave = {
    userId,
    syncCode,
    vehicle,
    fuelLogs,
    maintenanceLogs,
    updatedAt: new Date().toISOString(),
    plateNormalized: normalized || null
  };

  try {
    // 1. Save to the active userId document
    const userDocRef = doc(db, 'users', userId);
    await setDoc(userDocRef, dataToSave, { merge: true });

    // 2. If a plate is present, also save to a deterministic plate-based document
    // so that even if the user clears all local storage, they can restore instantly by plate!
    if (normalized) {
      const plateDocRef = doc(db, 'users', `placa_${normalized}`);
      await setDoc(plateDocRef, {
        ...dataToSave,
        userId: `placa_${normalized}` // ensure the deterministic ID is preserved when retrieved
      }, { merge: true });
    }
  } catch (error) {
    console.error("Erro ao salvar dados do usuário no Firestore:", error);
    throw error;
  }
}

// Load user data by userId (Server-first, falling back to cache if offline)
export async function loadUserData(userId: string): Promise<UserData | null> {
  const userDocRef = doc(db, 'users', userId);
  try {
    // Force direct fetch from server to guarantee 100% cloud accuracy and bypass stale browser cache
    const docSnap = await getDocFromServer(userDocRef);
    if (docSnap.exists()) {
      return docSnap.data() as UserData;
    }
  } catch (error) {
    console.warn("Erro ao buscar dados do servidor, tentando cache local...", error);
    try {
      const docSnap = await getDoc(userDocRef);
      if (docSnap.exists()) {
        return docSnap.data() as UserData;
      }
    } catch (cacheError) {
      console.error("Erro ao carregar dados do cache local do Firestore:", cacheError);
    }
    throw error;
  }
  return null;
}

// Search for user data by vehicle plate (Server-first)
export async function findUserByPlate(plate: string): Promise<UserData | null> {
  const normalized = plate.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (!normalized) return null;
  
  const plateDocRef = doc(db, 'users', `placa_${normalized}`);
  try {
    // Try deterministic document fetch from server first
    const docSnap = await getDocFromServer(plateDocRef);
    if (docSnap.exists()) {
      return docSnap.data() as UserData;
    }
  } catch (error) {
    console.warn("Erro ao buscar placa diretamente do servidor, tentando query...", error);
  }

  // Fallback to query from server
  try {
    const usersRef = collection(db, 'users');
    const q = query(usersRef, where('plateNormalized', '==', normalized), limit(1));
    const querySnapshot = await getDocsFromServer(q);
    if (!querySnapshot.empty) {
      return querySnapshot.docs[0].data() as UserData;
    }
  } catch (error) {
    console.error("Erro ao realizar query da placa no servidor, tentando cache...", error);
    // Last-resort fallback to standard query (which can check cache)
    try {
      const usersRef = collection(db, 'users');
      const q = query(usersRef, where('plateNormalized', '==', normalized), limit(1));
      const querySnapshot = await getDocs(q);
      if (!querySnapshot.empty) {
        return querySnapshot.docs[0].data() as UserData;
      }
    } catch (cacheError) {
      console.error("Erro ao buscar no cache local:", cacheError);
      throw error;
    }
  }
  return null;
}

// Search for user data by syncCode (Server-first)
export async function findUserBySyncCode(syncCode: string): Promise<UserData | null> {
  try {
    const usersRef = collection(db, 'users');
    const q = query(usersRef, where('syncCode', '==', syncCode.trim().toUpperCase()), limit(1));
    const querySnapshot = await getDocsFromServer(q);
    if (!querySnapshot.empty) {
      const userDoc = querySnapshot.docs[0];
      return userDoc.data() as UserData;
    }
  } catch (error) {
    console.error("Erro ao buscar código de sincronização no servidor, tentando cache...", error);
    // Cache fallback
    try {
      const usersRef = collection(db, 'users');
      const q = query(usersRef, where('syncCode', '==', syncCode.trim().toUpperCase()), limit(1));
      const querySnapshot = await getDocs(q);
      if (!querySnapshot.empty) {
        return querySnapshot.docs[0].data() as UserData;
      }
    } catch (cacheError) {
      console.error("Erro ao buscar código de sincronização no cache local:", cacheError);
      throw error;
    }
  }
  return null;
}
