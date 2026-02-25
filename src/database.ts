import {
  collection,
  doc,
  getDocs,
  setDoc,
  deleteDoc,
  updateDoc,
} from 'firebase/firestore';
import { db } from './firebase';
import { auth } from './firebase';

export interface Parcel {
  id: string;
  apn: string;
  mapParcelNo: string;
  county: string;
  state: string;
  address: string;
  assessedOwner: string;
  legalOwner: string;
  legalDescription: string;
  briefLegal: string;
  tractType: string;
  acres: string;
  vestingDeedNo: string;
  completed: boolean;
  folderPath: string;
  createdAt: string;
  notes: string;
  updatedAt: string;
}

const DB_KEY = 'titlecrm_parcels';

function getUid(): string {
  const uid = auth.currentUser?.uid;
  if (!uid) throw new Error('Not logged in');
  return uid;
}

function parcelsCollection() {
  return collection(db, 'users', getUid(), 'parcels');
}

// ── Local cache helpers ──────────────────────────────────────────────────────

function cacheGet(): Parcel[] {
  const raw = localStorage.getItem(DB_KEY);
  return raw ? JSON.parse(raw) : [];
}

function cacheSet(parcels: Parcel[]): void {
  localStorage.setItem(DB_KEY, JSON.stringify(parcels));
}

// ── Public API ───────────────────────────────────────────────────────────────

export function getAllParcels(): Parcel[] {
  return cacheGet();
}

export async function loadParcelsFromFirestore(): Promise<Parcel[]> {
  try {
    const snap = await getDocs(parcelsCollection());
    const parcels: Parcel[] = [];
    snap.forEach(d => parcels.push(d.data() as Parcel));
    cacheSet(parcels);
    // also sync to local file
    try {
      (window as any).electronAPI?.saveParcels?.(parcels);
    } catch {}
    return parcels;
  } catch (err) {
    console.error('Firestore load failed, falling back to cache', err);
    return cacheGet();
  }
}

export async function upsertParcel(parcel: Parcel): Promise<void> {
  // Update local cache immediately
  const all = cacheGet();
  const idx = all.findIndex(p => p.id === parcel.id);
  if (idx >= 0) {
    all[idx] = parcel;
  } else {
    all.push(parcel);
  }
  cacheSet(all);
  // also sync to local file
  try {
    (window as any).electronAPI?.saveParcels?.(all);
  } catch {}
  // Write to Firestore
  try {
    await setDoc(doc(parcelsCollection(), parcel.id), parcel);
  } catch (err) {
    console.error('Firestore upsert failed', err);
  }
}

export async function deleteParcel(id: string): Promise<void> {
  const all = cacheGet().filter(p => p.id !== id);
  cacheSet(all);
  try {
    (window as any).electronAPI?.saveParcels?.(all);
  } catch {}
  try {
    await deleteDoc(doc(parcelsCollection(), id));
  } catch (err) {
    console.error('Firestore delete failed', err);
  }
}

export async function toggleComplete(id: string): Promise<void> {
  const all = cacheGet();
  const idx = all.findIndex(p => p.id === id);
  if (idx < 0) return;
  all[idx].completed = !all[idx].completed;
  all[idx].updatedAt = new Date().toISOString();
  cacheSet(all);
  try {
    (window as any).electronAPI?.saveParcels?.(all);
  } catch {}
  try {
    await updateDoc(doc(parcelsCollection(), id), {
      completed: all[idx].completed,
      updatedAt: all[idx].updatedAt,
    });
  } catch (err) {
    console.error('Firestore toggleComplete failed', err);
  }
}

export function getParcelById(id: string): Parcel | undefined {
  return cacheGet().find(p => p.id === id);
}

export function saveParcels(parcels: Parcel[]): void {
  cacheSet(parcels);
  try {
    (window as any).electronAPI?.saveParcels?.(parcels);
  } catch {}
}

export async function initDatabase(): Promise<void> {
  // Seed localStorage from local file if empty (offline fallback)
  try {
    const existing = localStorage.getItem(DB_KEY);
    if (!existing || JSON.parse(existing).length === 0) {
      const api = (window as any).electronAPI;
      if (api?.loadParcels) {
        const fromFile: Parcel[] = await api.loadParcels();
        if (fromFile && fromFile.length > 0) {
          cacheSet(fromFile);
        }
      }
    }
  } catch {}
}

export function formatBriefLegal(parcel: Parcel): string {
  const brief = parcel.briefLegal || '';
  const acres = parcel.acres ? ` - ${parcel.acres} Acres` : '';
  return brief ? `${brief}${acres}` : '';
}