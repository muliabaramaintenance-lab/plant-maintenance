export type UserRole =
  | 'Pengawas'
  | 'Operator Mekanik'
  | 'Operator Elektrik'
  | 'Operator Elektrik AC'
  | 'Logistic';

export type PortalType =
  | 'operator_mekanik'
  | 'operator_elektrik'
  | 'pengawas'
  | 'logistic';

export type UnitCategory = 'Genset' | 'Alat Berat' | 'General';
export type UnitStatus = 'Ready' | 'Tidak Ready';

export type LogisticUnit =
  | 'pcs'
  | 'unit'
  | 'set'
  | 'liter'
  | 'kodi'
  | 'roll'
  | 'kg'
  | 'ball';

export const LOGISTIC_UNITS: LogisticUnit[] = [
  'pcs',
  'unit',
  'set',
  'liter',
  'kodi',
  'roll',
  'kg',
  'ball',
];

export type ReportPeriod = 'harian' | 'mingguan' | 'bulanan' | 'semua';
export type PengawasTab = 'laporan' | 'unit' | 'inventaris' | 'users';
export type ThemeMode = 'dark' | 'light';

export interface AppUser {
  id: string;
  password: string;
  name: string;
  role: UserRole;
}

export interface PlantUnit {
  id: string;
  name: string;
  category: 'Genset' | 'Alat Berat';
  status: UnitStatus;
  currentHm: number;
  lastService: string;
  nextService: string;
  remarks: string;
}

export interface MekanikLog {
  id: string;
  timestamp: string;
  operatorName: string;
  unitId: string;
  unitCategory: UnitCategory;
  unitName: string;
  jenis: string;
  hm: number | null;
  kwh: number | null;
  fuel: number | null;
  detail: string;
  photo: string;
}

export interface ElektrikLog {
  id: string;
  timestamp: string;
  operatorName: string;
  category: string;
  unitAc: string;
  action: string;
  detail: string;
  photo: string;
}

export interface ElektrikInventoryItem {
  id: string;
  name: string;
  category: string;
  qty: number;
  unit: string;
  location: string;
  condition: 'Normal' | 'Perlu Perbaikan' | 'Rusak';
  remarks: string;
}

export interface LogisticItem {
  name: string;
  qty: string;
  unit?: LogisticUnit;
}

export interface LogisticLog {
  id: string;
  timestamp: string;
  petugas: string;
  type: 'Pengambilan Barang' | 'Barang Masuk';
  person: string;
  items: LogisticItem[];
  photo: string;
}

export interface AppDatabase {
  users: AppUser[];
  units: PlantUnit[];
  mekanikLogs: MekanikLog[];
  elektrikLogs: ElektrikLog[];
  elektrikCategories: string[];
  elektrikInventory: ElektrikInventoryItem[];
  logisticLogs: LogisticLog[];
}

export interface ConfirmDialogState {
  open: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  destructive?: boolean;
  onConfirm: () => void | Promise<void>;
}

export interface PhotoModalState {
  open: boolean;
  src: string;
  caption: string;
}

export interface IncomingGoodsSuggestion {
  name: string;
  unit: LogisticUnit;
  totalIn: number;
  totalOut: number;
  available: number;
  lastTimestamp: string;
}
