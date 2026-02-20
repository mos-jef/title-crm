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

export function getAllParcels(): Parcel[] {
  const raw = localStorage.getItem(DB_KEY);
  return raw ? JSON.parse(raw) : [];
}

export function saveParcels(parcels: Parcel[]): void {
  localStorage.setItem(DB_KEY, JSON.stringify(parcels));
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
  const all = getAllParcels().filter(p => p.id !== id);
  saveParcels(all);
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