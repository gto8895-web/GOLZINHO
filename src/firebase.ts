import { initializeApp } from 'firebase/app';
import { 
  getFirestore, 
  doc, 
  getDoc, 
  setDoc, 
  collection, 
  query, 
  where, 
  getDocs,
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
  const userDocRef = doc(db, 'users', userId);
  await setDoc(userDocRef, {
    userId,
    syncCode,
    vehicle,
    fuelLogs,
    maintenanceLogs,
    updatedAt: new Date().toISOString()
  }, { merge: true });
}

// Load user data by userId
export async function loadUserData(userId: string): Promise<UserData | null> {
  try {
    const userDocRef = doc(db, 'users', userId);
    const docSnap = await getDoc(userDocRef);
    if (docSnap.exists()) {
      return docSnap.data() as UserData;
    }
  } catch (error) {
    console.error("Erro ao carregar dados do usuário no Firestore:", error);
    throw error;
  }
  return null;
}

// Search for user data by syncCode
export async function findUserBySyncCode(syncCode: string): Promise<UserData | null> {
  try {
    const usersRef = collection(db, 'users');
    const q = query(usersRef, where('syncCode', '==', syncCode.trim().toUpperCase()), limit(1));
    const querySnapshot = await getDocs(q);
    if (!querySnapshot.empty) {
      const userDoc = querySnapshot.docs[0];
      return userDoc.data() as UserData;
    }
  } catch (error) {
    console.error("Erro ao buscar código de sincronização no Firestore:", error);
    throw error;
  }
  return null;
}
