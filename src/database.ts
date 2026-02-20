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
  updatedAt: string;
}

const DB_KEY = 'titlecrm_parcels';

function readFromFile(): Parcel[] | null {
  try {
    const api = (window as any).electronAPI;
    if (api?.loadParcels) {
      const result = api.loadParcels();
      if (result && typeof result.then === 'function') return null; // async, can't use here
      return result as Parcel[];
    }
  } catch {}
  return null;
}

export function getAllParcels(): Parcel[] {
  const raw = localStorage.getItem(DB_KEY);
  return raw ? JSON.parse(raw) : [];
}

export function saveParcels(parcels: Parcel[]): void {
  localStorage.setItem(DB_KEY, JSON.stringify(parcels));
  // Also write to shared file asynchronously
  try {
    (window as any).electronAPI?.saveParcels?.(parcels);
  } catch {}
}

export function getParcelById(id: string): Parcel | undefined {
  return getAllParcels().find(p => p.id === id);
}

export function upsertParcel(parcel: Parcel): void {
  const all = getAllParcels();
  const idx = all.findIndex(p => p.id === parcel.id);
  if (idx >= 0) {
    all[idx] = parcel;
  } else {
    all.push(parcel);
  }
  saveParcels(all);
}

export function deleteParcel(id: string): void {
  saveParcels(getAllParcels().filter(p => p.id !== id));
}

export function toggleComplete(id: string): void {
  const all = getAllParcels();
  const idx = all.findIndex(p => p.id === id);
  if (idx >= 0) {
    all[idx].completed = !all[idx].completed;
    all[idx].updatedAt = new Date().toISOString();
    saveParcels(all);
  }
}

// Call this once on app startup to seed localStorage from file if localStorage is empty
export async function initDatabase(): Promise<void> {
  try {
    const existing = localStorage.getItem(DB_KEY);
    if (existing && JSON.parse(existing).length > 0) return; // already has data

    const api = (window as any).electronAPI;
    if (api?.loadParcels) {
      const fromFile: Parcel[] = await api.loadParcels();
      if (fromFile && fromFile.length > 0) {
        localStorage.setItem(DB_KEY, JSON.stringify(fromFile));
      }
    }
  } catch {}
}