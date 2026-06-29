import { initializeApp } from 'firebase/app';
import { 
  getFirestore, 
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
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
const DATABASE_ID = "ai-studio-golzinho-0995fe15-3271-4878-b89e-6cb9c0110c9b";

// Robust database initialization with try-catch fallback for iframe and permission restrictions
let tempDb;
try {
  tempDb = initializeFirestore(app, {
    localCache: persistentLocalCache({
      tabManager: persistentMultipleTabManager()
    })
  }, DATABASE_ID);
} catch (e) {
  console.warn("Erro ao inicializar cache persistente do Firestore. Usando conexão padrão:", e);
  tempDb = getFirestore(app, DATABASE_ID);
}

export const db = tempDb;

export interface UserData {
  userId: string;
  syncCode: string;
  vehicle: Vehicle;
  vehicles?: Vehicle[];
  activeVehicleId?: string;
  fuelLogs: FuelLog[];
  maintenanceLogs: MaintenanceLog[];
  updatedAt: string;
}

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  }
}

// Global error handler required by Firebase Integration guidelines
export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: null,
      email: null,
      emailVerified: null,
      isAnonymous: null,
      tenantId: null,
      providerInfo: []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Recursively sanitizes data to ensure no undefined values are written to Firestore
export function sanitizeForFirestore(obj: any): any {
  if (obj === null) return null;
  if (obj === undefined) return null;
  if (typeof obj !== 'object') return obj;

  if (Array.isArray(obj)) {
    return obj.map(sanitizeForFirestore);
  }

  const sanitized: { [key: string]: any } = {};
  for (const key of Object.keys(obj)) {
    const value = obj[key];
    if (value !== undefined) {
      sanitized[key] = sanitizeForFirestore(value);
    }
  }
  return sanitized;
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
  maintenanceLogs: MaintenanceLog[],
  vehicles?: Vehicle[],
  activeVehicleId?: string
): Promise<void> {
  const normalized = (vehicle.plate || '').trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
  const rawData = {
    userId,
    syncCode,
    vehicle,
    vehicles: vehicles || [vehicle],
    activeVehicleId: activeVehicleId || vehicle.id || 'vehicle-1',
    fuelLogs,
    maintenanceLogs,
    updatedAt: new Date().toISOString(),
    plateNormalized: normalized || null
  };

  // Sanitize data recursively to purge any 'undefined' keys/values which crash Firestore writes
  const dataToSave = sanitizeForFirestore(rawData);

  const path = `users/${userId}`;
  try {
    // 1. Save to the active userId document
    const userDocRef = doc(db, 'users', userId);
    await setDoc(userDocRef, dataToSave, { merge: true });

    // 2. If a plate is present, and it's a distinct document, also save to deterministic plate document
    const plateDocId = `placa_${normalized}`;
    if (normalized && userId !== plateDocId) {
      const plateDocRef = doc(db, 'users', plateDocId);
      await setDoc(plateDocRef, {
        ...dataToSave,
        userId: plateDocId // preserve plate doc id inside the record
      }, { merge: true });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

// Load user data by userId (Server-first, falling back to cache if offline)
export async function loadUserData(userId: string): Promise<UserData | null> {
  const path = `users/${userId}`;
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
    handleFirestoreError(error, OperationType.GET, path);
  }
  return null;
}

// Search for user data by vehicle plate (Server-first)
export async function findUserByPlate(plate: string): Promise<UserData | null> {
  const normalized = plate.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (!normalized) return null;
  
  const path = `users/placa_${normalized}`;
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
      handleFirestoreError(cacheError, OperationType.LIST, 'users');
    }
    handleFirestoreError(error, OperationType.LIST, 'users');
  }
  return null;
}

// Search for user data by syncCode (Server-first)
export async function findUserBySyncCode(syncCode: string): Promise<UserData | null> {
  const cleanCode = syncCode.trim().toUpperCase();
  try {
    const usersRef = collection(db, 'users');
    const q = query(usersRef, where('syncCode', '==', cleanCode), limit(1));
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
      const q = query(usersRef, where('syncCode', '==', cleanCode), limit(1));
      const querySnapshot = await getDocs(q);
      if (!querySnapshot.empty) {
        return querySnapshot.docs[0].data() as UserData;
      }
    } catch (cacheError) {
      handleFirestoreError(cacheError, OperationType.LIST, 'users');
    }
    handleFirestoreError(error, OperationType.LIST, 'users');
  }
  return null;
}
