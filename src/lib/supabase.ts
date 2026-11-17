import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import {
  LOGISTIC_UNITS,
  type AppDatabase,
  type AppUser,
  type ElektrikInventoryItem,
  type ElektrikLog,
  type IncomingGoodsSuggestion,
  type LogisticLog,
  type LogisticUnit,
  type MekanikLog,
  type PlantUnit,
  type ReportPeriod,
  type UserRole,
} from '@/src/types/muliabara';

const SUPABASE_URL =
  import.meta.env.VITE_SUPABASE_URL || 'ISI_URL_SUPABASE_ANDA';
const SUPABASE_ANON_KEY =
  import.meta.env.VITE_SUPABASE_ANON_KEY || 'ISI_ANON_KEY_ANDA';

export const isSupabaseConfigured: boolean =
  typeof SUPABASE_URL === 'string' &&
  SUPABASE_URL.startsWith('https://') &&
  !SUPABASE_URL.includes('ISI_URL') &&
  typeof SUPABASE_ANON_KEY === 'string' &&
  SUPABASE_ANON_KEY.length > 20 &&
  !SUPABASE_ANON_KEY.includes('ISI_ANON');

export const sbClient: SupabaseClient | null = isSupabaseConfigured
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  : null;

const DB_KEY = 'muliabara_plant_db_v3';
const SESSION_KEY = 'muliabara_session_user_v1';
const THEME_KEY = 'muliabara_theme_v1';

let memoryDbBackup: string | null = null;
let memorySessionBackup: string | null = null;

export function safeGetStorage(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    if (key === DB_KEY) return memoryDbBackup;
    if (key === SESSION_KEY) return memorySessionBackup;
    return null;
  }
}

export function safeSetStorage(key: string, value: string): boolean {
  if (key === DB_KEY) memoryDbBackup = value;
  if (key === SESSION_KEY) memorySessionBackup = value;
  try {
    window.localStorage.setItem(key, value);
    return true;
  } catch {
    return false;
  }
}

export function safeRemoveStorage(key: string): void {
  if (key === SESSION_KEY) memorySessionBackup = null;
  try {
    window.localStorage.removeItem(key);
  } catch {
    // ignore storage errors in sandboxed iframes
  }
}

export function getSavedTheme(): 'dark' | 'light' {
  const saved = safeGetStorage(THEME_KEY);
  return saved === 'light' ? 'light' : 'dark';
}

export function saveThemePreference(theme: 'dark' | 'light'): void {
  safeSetStorage(THEME_KEY, theme);
}

export function getSavedSessionUserId(): string | null {
  return safeGetStorage(SESSION_KEY);
}

export function saveSessionUserId(userId: string): void {
  safeSetStorage(SESSION_KEY, userId);
}

export function clearSessionUserId(): void {
  safeRemoveStorage(SESSION_KEY);
}

export function getTodayISO(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function getLocalDateISO(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function isoDaysAgo(days: number, hour = 10): string {
  const x = new Date();
  x.setDate(x.getDate() - days);
  x.setHours(hour, 15, 0, 0);
  return x.toISOString();
}

export function fmtDT(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '-';
  return d.toLocaleString('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

export function fmtShort(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '-';
  return d.toLocaleDateString('id-ID', {
    day: '2-digit',
    month: 'short',
  });
}

export function isElektrikRole(role: UserRole | string): boolean {
  return role === 'Operator Elektrik' || role === 'Operator Elektrik AC';
}

export function extractHmValue(value: string): number | null {
  const str = String(value || '');
  const explicitMatch = str.match(/hm\s*[:\-]?\s*(\d+(?:\.\d+)?)/i);
  if (explicitMatch && explicitMatch[1]) {
    return Number(explicitMatch[1]);
  }
  const matches = str.match(/(\d+(?:\.\d+)?)/g);
  return matches && matches.length > 0
    ? Number(matches[matches.length - 1])
    : null;
}

export function isInReportPeriod(
  iso: string,
  period: ReportPeriod,
  refDateISO: string
): boolean {
  if (period === 'semua') return true;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return false;
  const effectiveRef = refDateISO || getTodayISO();

  if (period === 'harian') {
    return getLocalDateISO(iso) === effectiveRef;
  }

  const refDate = new Date(`${effectiveRef}T23:59:59`);
  if (period === 'mingguan') {
    const start = new Date(refDate);
    start.setDate(start.getDate() - 6);
    start.setHours(0, 0, 0, 0);
    return d >= start && d <= refDate;
  }

  return (
    d.getFullYear() === refDate.getFullYear() &&
    d.getMonth() === refDate.getMonth()
  );
}

export const DEFAULT_ELEKTRIK_CATEGORIES = [
  'AC',
  'Lampu',
  'Unit',
  'Komponen Lainnya',
];

export function buildSeedData(): AppDatabase {
  return {
    users: [
      {
        id: 'PGW01',
        password: '123',
        name: 'Pak Hendra (Pengawas)',
        role: 'Pengawas',
      },
      {
        id: 'MEK01',
        password: '123',
        name: 'Budi (Mekanik)',
        role: 'Operator Mekanik',
      },
      {
        id: 'ELK01',
        password: '123',
        name: 'Rizal (Elektrik)',
        role: 'Operator Elektrik',
      },
      {
        id: 'LOG01',
        password: '123',
        name: 'Sari (Logistic)',
        role: 'Logistic',
      },
    ],
    units: [
      {
        id: 'U1',
        name: 'Genset Perkins 500 kVA #01',
        category: 'Genset',
        status: 'Ready',
        currentHm: 2475,
        lastService: 'HM 2250',
        nextService: 'HM 2500',
        remarks: 'Operasional normal, cek filter berkala',
      },
      {
        id: 'U2',
        name: 'Genset CAT 350 kVA #02',
        category: 'Genset',
        status: 'Ready',
        currentHm: 1840,
        lastService: 'HM 1750',
        nextService: 'HM 2000',
        remarks: 'Standby unit plant utama',
      },
      {
        id: 'U3',
        name: 'Excavator Komatsu PC200 #03',
        category: 'Alat Berat',
        status: 'Ready',
        currentHm: 4180,
        lastService: 'HM 4000',
        nextService: 'HM 4250',
        remarks: 'Siap operasi area pit',
      },
      {
        id: 'U4',
        name: 'Dump Truck Hino 500 #02',
        category: 'Alat Berat',
        status: 'Tidak Ready',
        currentHm: 6995,
        lastService: 'HM 6750',
        nextService: 'HM 7000',
        remarks: 'Perbaikan hose hidrolik dump & jadwal service',
      },
    ],
    mekanikLogs: [
      {
        id: 'M1',
        timestamp: isoDaysAgo(4, 9),
        operatorName: 'Budi (Mekanik)',
        unitId: 'U1',
        unitCategory: 'Genset',
        unitName: 'Genset Perkins 500 kVA #01',
        jenis: 'P2H',
        hm: 2420,
        kwh: 980,
        fuel: 165,
        detail: 'P2H rutin pagi, cek tegangan baterai & level radiator.',
        photo: '',
      },
      {
        id: 'M2',
        timestamp: isoDaysAgo(3, 14),
        operatorName: 'Budi (Mekanik)',
        unitId: 'U3',
        unitCategory: 'Alat Berat',
        unitName: 'Excavator Komatsu PC200 #03',
        jenis: 'Perawatan Harian',
        hm: 4145,
        kwh: null,
        fuel: 210,
        detail: 'Greasing pin bucket, cek oli hidrolik.',
        photo: '',
      },
      {
        id: 'M3',
        timestamp: isoDaysAgo(2, 10),
        operatorName: 'Budi (Mekanik)',
        unitId: 'U2',
        unitCategory: 'Genset',
        unitName: 'Genset CAT 350 kVA #02',
        jenis: 'Service Berkala',
        hm: 1820,
        kwh: 890,
        fuel: 140,
        detail: 'Ganti filter oli, filter solar, & filter udara.',
        photo: '',
      },
      {
        id: 'M4',
        timestamp: isoDaysAgo(1, 11),
        operatorName: 'Budi (Mekanik)',
        unitId: 'U4',
        unitCategory: 'Alat Berat',
        unitName: 'Dump Truck Hino 500 #02',
        jenis: 'Perbaikan / Trouble',
        hm: 6995,
        kwh: null,
        fuel: 120,
        detail: 'Penanganan kebocoran hose hidrolik dump.',
        photo: '',
      },
      {
        id: 'M5',
        timestamp: isoDaysAgo(0, 8),
        operatorName: 'Budi (Mekanik)',
        unitId: 'U1',
        unitCategory: 'Genset',
        unitName: 'Genset Perkins 500 kVA #01',
        jenis: 'P2H',
        hm: 2475,
        kwh: 1120,
        fuel: 185,
        detail:
          'P2H genset: cek oli mesin, water separator, tambah air radiator.',
        photo: '',
      },
      {
        id: 'M6',
        timestamp: isoDaysAgo(0, 9),
        operatorName: 'Budi (Mekanik)',
        unitId: 'U3',
        unitCategory: 'Alat Berat',
        unitName: 'Excavator Komatsu PC200 #03',
        jenis: 'Perawatan Harian',
        hm: 4180,
        kwh: null,
        fuel: 230,
        detail: 'Cek fuel, bersihkan cabin filter, greasing joint.',
        photo: '',
      },
    ],
    elektrikLogs: [
      {
        id: 'E1',
        timestamp: isoDaysAgo(2, 13),
        operatorName: 'Rizal (Elektrik)',
        category: 'Lampu',
        unitAc: 'Lampu Sorot Menara Pit #1',
        action: 'Dipasang',
        detail: 'Pemasangan lampu sorot LED 150W baru.',
        photo: '',
      },
      {
        id: 'E2',
        timestamp: isoDaysAgo(1, 15),
        operatorName: 'Rizal (Elektrik)',
        category: 'Unit',
        unitAc: 'Alternator Genset CAT #02',
        action: 'Diperbaiki',
        detail: 'Pengencangan terminal AVR & soket sensor.',
        photo: '',
      },
      {
        id: 'E3',
        timestamp: isoDaysAgo(0, 9),
        operatorName: 'Rizal (Elektrik)',
        category: 'AC',
        unitAc: 'AC Ruang Control Room',
        action: 'Maintenance',
        detail: 'Cuci indoor/outdoor unit, tekanan freon normal.',
        photo: '',
      },
    ],
    elektrikCategories: [...DEFAULT_ELEKTRIK_CATEGORIES],
    elektrikInventory: [
      {
        id: 'INV1',
        name: 'AC Split Daikin 2 PK Control Room',
        category: 'AC',
        qty: 4,
        unit: 'unit',
        location: 'Control Room & Office Plant',
        condition: 'Normal',
        remarks: 'Cuci rutin per 3 bulan',
      },
      {
        id: 'INV2',
        name: 'Lampu Sorot LED Floodlight 150W',
        category: 'Lampu',
        qty: 12,
        unit: 'pcs',
        location: 'Gudang Elektrik / Menara Pit',
        condition: 'Normal',
        remarks: 'Stok siap pasang area pit',
      },
      {
        id: 'INV3',
        name: 'MCB 3 Phase Schneider 63A',
        category: 'Komponen Lainnya',
        qty: 6,
        unit: 'pcs',
        location: 'Panel Utama Workshop',
        condition: 'Normal',
        remarks: 'Cadangan panel distribusi',
      },
      {
        id: 'INV4',
        name: 'Alternator AVR Genset CAT 350 kVA',
        category: 'Unit',
        qty: 2,
        unit: 'set',
        location: 'Power House #02',
        condition: 'Normal',
        remarks: 'Siap pakai',
      },
    ],
    logisticLogs: [
      {
        id: 'L1',
        timestamp: isoDaysAgo(1, 10),
        petugas: 'Sari (Logistic)',
        type: 'Barang Masuk',
        person: 'PT Mitra Sparepart',
        items: [
          { name: 'Filter Oli Perkins', qty: '10', unit: 'pcs' },
          { name: 'Lampu Sorot LED 150W', qty: '4', unit: 'unit' },
          { name: 'Oli Mesin SAE 15W-40', qty: '100', unit: 'liter' },
          { name: 'Kabel NYY 4x16mm', qty: '3', unit: 'roll' },
        ],
        photo: '',
      },
      {
        id: 'L2',
        timestamp: isoDaysAgo(0, 10),
        petugas: 'Sari (Logistic)',
        type: 'Pengambilan Barang',
        person: 'Budi (Mekanik)',
        items: [
          { name: 'Filter Oli Perkins', qty: '2', unit: 'pcs' },
          { name: 'Oli Mesin SAE 15W-40', qty: '20', unit: 'liter' },
        ],
        photo: '',
      },
    ],
  };
}

function normalizeLogisticItem(raw: {
  name?: string;
  qty?: string;
  unit?: string;
}): { name: string; qty: string; unit: LogisticUnit } {
  const name = String(raw?.name || '').trim();
  const rawQty = String(raw?.qty || '').trim();
  if (raw?.unit && LOGISTIC_UNITS.includes(raw.unit as LogisticUnit)) {
    return { name, qty: rawQty, unit: raw.unit as LogisticUnit };
  }
  const match = rawQty.match(
    /^(\d+(?:[.,]\d+)?)\s*(pcs|unit|set|liter|kodi|roll|kg|ball)?$/i
  );
  if (match) {
    const qtyNum = match[1];
    const parsedUnit = (match[2]?.toLowerCase() || 'pcs') as LogisticUnit;
    return {
      name,
      qty: qtyNum,
      unit: LOGISTIC_UNITS.includes(parsedUnit) ? parsedUnit : 'pcs',
    };
  }
  return { name, qty: rawQty, unit: 'pcs' };
}

export function formatLogisticItemQty(item: {
  qty: string;
  unit?: LogisticUnit;
}): string {
  return item.unit ? `${item.qty} ${item.unit}` : item.qty;
}

export function getIncomingGoodsSuggestions(
  logs: LogisticLog[]
): IncomingGoodsSuggestion[] {
  const map = new Map<string, IncomingGoodsSuggestion>();

  logs.forEach((log) => {
    log.items.forEach((rawItem) => {
      const item = normalizeLogisticItem(rawItem);
      if (!item.name) return;
      const key = `${item.name.toLowerCase()}__${item.unit}`;
      const qtyNum = parseFloat(item.qty.replace(',', '.')) || 0;
      const existing = map.get(key) || {
        name: item.name,
        unit: item.unit,
        totalIn: 0,
        totalOut: 0,
        available: 0,
        lastTimestamp: log.timestamp,
      };

      if (log.type === 'Barang Masuk') {
        existing.totalIn += qtyNum;
        if (new Date(log.timestamp) > new Date(existing.lastTimestamp)) {
          existing.lastTimestamp = log.timestamp;
          existing.name = item.name;
        }
      } else {
        existing.totalOut += qtyNum;
      }
      existing.available = Math.max(0, existing.totalIn - existing.totalOut);
      map.set(key, existing);
    });
  });

  return Array.from(map.values())
    .filter((entry) => entry.totalIn > 0)
    .sort((a, b) => a.name.localeCompare(b.name, 'id'));
}

export function saveLocalDatabase(data: AppDatabase): boolean {
  return safeSetStorage(DB_KEY, JSON.stringify(data));
}

export function loadLocalDatabase(): AppDatabase {
  const raw = safeGetStorage(DB_KEY);
  if (raw) {
    try {
      const parsed = JSON.parse(raw) as Partial<AppDatabase>;
      if (
        Array.isArray(parsed.users) &&
        Array.isArray(parsed.units) &&
        Array.isArray(parsed.mekanikLogs) &&
        Array.isArray(parsed.elektrikLogs) &&
        Array.isArray(parsed.logisticLogs)
      ) {
        const seed = buildSeedData();
        return {
          users: parsed.users,
          units: parsed.units,
          mekanikLogs: parsed.mekanikLogs.map((m) => ({
            ...m,
            photo: m.photo || '',
          })),
          elektrikLogs: parsed.elektrikLogs.map((e) => ({
            ...e,
            photo: e.photo || '',
          })),
          elektrikCategories:
            Array.isArray(parsed.elektrikCategories) &&
            parsed.elektrikCategories.length > 0
              ? parsed.elektrikCategories
              : seed.elektrikCategories,
          elektrikInventory: Array.isArray(parsed.elektrikInventory)
            ? parsed.elektrikInventory
            : seed.elektrikInventory,
          logisticLogs: parsed.logisticLogs.map((l) => ({
            ...l,
            items: (l.items || []).map(normalizeLogisticItem),
          })),
        };
      }
    } catch {
      // fall through to seed data
    }
  }
  const seed = buildSeedData();
  saveLocalDatabase(seed);
  return seed;
}

export async function loadDatabase(): Promise<{
  data: AppDatabase;
  error?: string;
}> {
  if (!isSupabaseConfigured || !sbClient) {
    return { data: loadLocalDatabase() };
  }

  try {
    const [u, un, m, e, l] = await Promise.all([
      sbClient.from('app_users').select('*').order('created_at'),
      sbClient.from('units').select('*').order('created_at'),
      sbClient.from('mekanik_logs').select('*').order('timestamp'),
      sbClient.from('elektrik_logs').select('*').order('timestamp'),
      sbClient.from('logistic_logs').select('*').order('timestamp'),
    ]);

    const firstError = u.error || un.error || m.error || e.error || l.error;
    if (firstError) {
      throw firstError;
    }

    const localSnapshot = loadLocalDatabase();

    const data: AppDatabase = {
      users: (u.data || []) as AppUser[],
      units: (un.data || []).map((x) => ({
        id: String(x.id),
        name: String(x.name),
        category: x.category as PlantUnit['category'],
        status: x.status as PlantUnit['status'],
        currentHm: Number(x.current_hm ?? 0),
        lastService: String(x.last_service ?? ''),
        nextService: String(x.next_service ?? ''),
        remarks: String(x.remarks || ''),
      })),
      mekanikLogs: (m.data || []).map((x) => ({
        id: String(x.id),
        timestamp: String(x.timestamp),
        operatorName: String(x.operator_name),
        unitId: String(x.unit_id || ''),
        unitCategory: x.unit_category as MekanikLog['unitCategory'],
        unitName: String(x.unit_name),
        jenis: String(x.jenis),
        hm: x.hm === null || x.hm === undefined ? null : Number(x.hm),
        kwh: x.kwh === null || x.kwh === undefined ? null : Number(x.kwh),
        fuel: x.fuel === null || x.fuel === undefined ? null : Number(x.fuel),
        detail: String(x.detail || ''),
        photo: String(x.photo || ''),
      })),
      elektrikLogs: (e.data || []).map((x) => ({
        id: String(x.id),
        timestamp: String(x.timestamp),
        operatorName: String(x.operator_name),
        category: String(x.category || 'AC'),
        unitAc: String(x.target_name || ''),
        action: String(x.action || ''),
        detail: String(x.detail || ''),
        photo: String(x.photo || ''),
      })),
      elektrikCategories: localSnapshot.elektrikCategories,
      elektrikInventory: localSnapshot.elektrikInventory,
      logisticLogs: (l.data || []).map((x) => ({
        id: String(x.id),
        timestamp: String(x.timestamp),
        petugas: String(x.petugas),
        type: x.type as LogisticLog['type'],
        person: String(x.person),
        items: Array.isArray(x.items)
          ? x.items.map(normalizeLogisticItem)
          : [],
        photo: String(x.photo || ''),
      })),
    };

    // Optional remote sync for elektrik_categories & elektrik_inventory if tables exist
    try {
      const [catRes, invRes] = await Promise.all([
        sbClient.from('elektrik_categories').select('name').order('name'),
        sbClient.from('elektrik_inventory').select('*').order('name'),
      ]);
      if (!catRes.error && Array.isArray(catRes.data) && catRes.data.length > 0) {
        data.elektrikCategories = catRes.data.map((c) => String(c.name));
      }
      if (!invRes.error && Array.isArray(invRes.data)) {
        data.elektrikInventory = invRes.data as ElektrikInventoryItem[];
      }
    } catch {
      // keep local snapshot for categories/inventory if remote tables are not created yet
    }

    return { data };
  } catch {
    return {
      data: loadLocalDatabase(),
      error:
        'Gagal mengambil data dari Supabase, menggunakan data cadangan lokal.',
    };
  }
}

export async function upsertUnitRemote(unit: PlantUnit): Promise<void> {
  if (!isSupabaseConfigured || !sbClient) return;
  const { error } = await sbClient.from('units').upsert({
    id: unit.id,
    name: unit.name,
    category: unit.category,
    status: unit.status,
    current_hm: unit.currentHm,
    last_service: unit.lastService,
    next_service: unit.nextService,
    remarks: unit.remarks,
  });
  if (error) throw error;
}

export async function updateUnitStatusRemote(
  id: string,
  status: PlantUnit['status']
): Promise<void> {
  if (!isSupabaseConfigured || !sbClient) return;
  const { error } = await sbClient
    .from('units')
    .update({ status })
    .eq('id', id);
  if (error) throw error;
}

export async function deleteUnitRemote(id: string): Promise<void> {
  if (!isSupabaseConfigured || !sbClient) return;
  const { error } = await sbClient.from('units').delete().eq('id', id);
  if (error) throw error;
}

export async function insertUserRemote(user: AppUser): Promise<void> {
  if (!isSupabaseConfigured || !sbClient) return;
  const { error } = await sbClient.from('app_users').insert({
    id: user.id,
    password: user.password,
    name: user.name,
    role: user.role,
  });
  if (error) throw error;
}

export async function deleteUserRemote(id: string): Promise<void> {
  if (!isSupabaseConfigured || !sbClient) return;
  const { error } = await sbClient.from('app_users').delete().eq('id', id);
  if (error) throw error;
}

export async function insertMekanikLogRemote(
  entry: MekanikLog,
  unitUpdate?: { unitId: string; currentHm: number; lastService?: string }
): Promise<void> {
  if (!isSupabaseConfigured || !sbClient) return;
  const { error } = await sbClient.from('mekanik_logs').insert({
    id: entry.id,
    timestamp: entry.timestamp,
    operator_name: entry.operatorName,
    unit_id: entry.unitId || null,
    unit_category: entry.unitCategory,
    unit_name: entry.unitName,
    jenis: entry.jenis,
    hm: entry.hm,
    kwh: entry.kwh,
    fuel: entry.fuel,
    detail: entry.detail,
    photo: entry.photo,
  });
  if (error) throw error;

  if (unitUpdate) {
    const payload: { current_hm: number; last_service?: string } = {
      current_hm: unitUpdate.currentHm,
    };
    if (unitUpdate.lastService) {
      payload.last_service = unitUpdate.lastService;
    }
    const { error: unitErr } = await sbClient
      .from('units')
      .update(payload)
      .eq('id', unitUpdate.unitId);
    if (unitErr) throw unitErr;
  }
}

export async function insertElektrikLogRemote(
  entry: ElektrikLog
): Promise<void> {
  if (!isSupabaseConfigured || !sbClient) return;
  const { error } = await sbClient.from('elektrik_logs').insert({
    id: entry.id,
    timestamp: entry.timestamp,
    operator_name: entry.operatorName,
    category: entry.category,
    target_name: entry.unitAc,
    action: entry.action,
    detail: entry.detail,
    photo: entry.photo,
  });
  if (error) throw error;
}

export async function uploadEvidencePhotoRemote(
  prefix: string,
  logId: string,
  blob: Blob
): Promise<string | null> {
  if (!isSupabaseConfigured || !sbClient) return null;
  try {
    const filename = `${prefix}_${logId}.jpg`;
    const { error: uploadErr } = await sbClient.storage
      .from('logistic-photos')
      .upload(filename, blob, { contentType: 'image/jpeg' });
    if (uploadErr) return null;
    const { data } = sbClient.storage
      .from('logistic-photos')
      .getPublicUrl(filename);
    return data?.publicUrl || null;
  } catch {
    return null;
  }
}

export async function insertLogisticLogRemote(
  entry: LogisticLog
): Promise<void> {
  if (!isSupabaseConfigured || !sbClient) return;
  const { error } = await sbClient.from('logistic_logs').insert({
    id: entry.id,
    timestamp: entry.timestamp,
    petugas: entry.petugas,
    type: entry.type,
    person: entry.person,
    items: entry.items,
    photo: entry.photo,
  });
  if (error) throw error;
}

export function compressImageFile(
  file: File
): Promise<{ base64: string; blob: Blob | null }> {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) {
      reject(new Error('File harus berupa gambar.'));
      return;
    }

    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Gagal membaca file gambar.'));
    reader.onload = (ev) => {
      const result = ev.target?.result;
      if (typeof result !== 'string') {
        reject(new Error('Format gambar tidak valid.'));
        return;
      }
      const img = new Image();
      img.onerror = () => reject(new Error('Gambar tidak dapat dimuat.'));
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const scale = Math.min(1, 640 / img.width);
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Canvas tidak tersedia.'));
          return;
        }
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        const base64 = canvas.toDataURL('image/jpeg', 0.6);
        canvas.toBlob(
          (blob) => {
            resolve({ base64, blob });
          },
          'image/jpeg',
          0.65
        );
      };
      img.src = result;
    };
    reader.readAsDataURL(file);
  });
}

export function exportReportToCSV(
  mekanikLogs: MekanikLog[],
  elektrikLogs: ElektrikLog[],
  logisticLogs: LogisticLog[],
  units: PlantUnit[],
  period: ReportPeriod
): void {
  const getCat = (m: MekanikLog) =>
    m.unitCategory || units.find((u) => u.id === m.unitId)?.category || '-';

  const rows: Array<Array<string | number>> = [
    [
      'Divisi',
      'Tanggal & Waktu',
      'Petugas / PIC',
      'Kategori',
      'Unit/Lokasi',
      'Aktivitas',
      'HM',
      'KWH',
      'Fuel(L)',
      'Keterangan',
    ],
  ];

  mekanikLogs.forEach((m) => {
    const cat = getCat(m);
    const isGeneral = cat === 'General';
    rows.push([
      'Mekanik',
      fmtDT(m.timestamp),
      m.operatorName,
      cat,
      m.unitName,
      m.jenis,
      isGeneral || m.hm === null ? '-' : m.hm,
      isGeneral || cat === 'Alat Berat' || m.kwh === null ? '-' : m.kwh,
      isGeneral || m.fuel === null ? '-' : m.fuel,
      m.detail,
    ]);
  });

  elektrikLogs.forEach((e) => {
    rows.push([
      'Elektrik',
      fmtDT(e.timestamp),
      e.operatorName,
      e.category || 'AC',
      e.unitAc,
      e.action,
      '-',
      '-',
      '-',
      e.detail,
    ]);
  });

  logisticLogs.forEach((l) => {
    rows.push([
      'Logistic',
      fmtDT(l.timestamp),
      l.petugas,
      'Logistic',
      l.person,
      l.type,
      '-',
      '-',
      '-',
      l.items
        .map((i) => `${i.name} (${formatLogisticItemQty(i)})`)
        .join('; '),
    ]);
  });

  const csvContent =
    '\uFEFF' +
    rows
      .map((r) =>
        r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(',')
      )
      .join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `Laporan_Muliabara_${period}_${getTodayISO()}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
