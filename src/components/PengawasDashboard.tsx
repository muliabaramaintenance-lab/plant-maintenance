import React, { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  BarChart3,
  Cpu,
  Layers,
  Users,
  RefreshCw,
  RotateCcw,
  Download,
  Printer,
  Sun,
  Moon,
  Search,
  Plus,
  Minus,
  Trash2,
  Pencil,
  Eye,
  KeyRound,
  AlertCircle,
} from 'lucide-react';
import {
  LOGISTIC_UNITS,
  type AppDatabase,
  type AppUser,
  type ConfirmDialogState,
  type ElektrikInventoryItem,
  type PengawasTab,
  type PhotoModalState,
  type PlantUnit,
  type ReportPeriod,
  type ThemeMode,
  type UnitStatus,
  type UserRole,
} from '@/src/types/muliabara';
import {
  buildSeedData,
  deleteUnitRemote,
  deleteUserRemote,
  exportReportToCSV,
  extractHmValue,
  fmtDT,
  formatLogisticItemQty,
  getTodayISO,
  insertUserRemote,
  isInReportPeriod,
  isSupabaseConfigured,
  saveLocalDatabase,
  updateUnitStatusRemote,
  upsertUnitRemote,
} from '@/src/lib/supabase';
import {
  ActivityBarChart,
  FuelKwhChart,
  ReadinessDoughnutChart,
} from './Charts';

interface PengawasDashboardProps {
  db: AppDatabase;
  setDb: React.Dispatch<React.SetStateAction<AppDatabase>>;
  currentUser: AppUser;
  theme: ThemeMode;
  onToggleTheme: () => void;
  onRefresh: () => Promise<void>;
  onToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
  onConfirm: (dialog: ConfirmDialogState) => void;
  onOpenPhoto: (modal: PhotoModalState) => void;
}

export const PengawasDashboard: React.FC<PengawasDashboardProps> = ({
  db,
  setDb,
  currentUser,
  theme,
  onToggleTheme,
  onRefresh,
  onToast,
  onConfirm,
  onOpenPhoto,
}) => {
  const [activeTab, setActiveTab] = useState<PengawasTab>('laporan');
  const [period, setPeriod] = useState<ReportPeriod>('mingguan');
  const [refDate, setRefDate] = useState<string>(getTodayISO);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [refreshing, setRefreshing] = useState<boolean>(false);

  // Unit form state
  const [editUnitId, setEditUnitId] = useState<string>('');
  const [unitName, setUnitName] = useState<string>('');
  const [unitCategory, setUnitCategory] = useState<'Genset' | 'Alat Berat'>(
    'Genset'
  );
  const [unitStatus, setUnitStatus] = useState<UnitStatus>('Ready');
  const [unitCurrentHm, setUnitCurrentHm] = useState<string>('');
  const [unitLastService, setUnitLastService] = useState<string>('');
  const [unitNextService, setUnitNextService] = useState<string>('');
  const [unitRemarks, setUnitRemarks] = useState<string>('');
  const [savingUnit, setSavingUnit] = useState<boolean>(false);

  // Elektrik Categories & Inventory state
  const [newCategoryName, setNewCategoryName] = useState<string>('');
  const [editInvId, setEditInvId] = useState<string>('');
  const [invName, setInvName] = useState<string>('');
  const [invCategory, setInvCategory] = useState<string>(
    db.elektrikCategories[0] || 'AC'
  );
  const [invQty, setInvQty] = useState<string>('1');
  const [invUnit, setInvUnit] = useState<string>('unit');
  const [invLocation, setInvLocation] = useState<string>('');
  const [invCondition, setInvCondition] = useState<
    'Normal' | 'Perlu Perbaikan' | 'Rusak'
  >('Normal');
  const [invRemarks, setInvRemarks] = useState<string>('');

  // User form state
  const [newUserName, setNewUserName] = useState<string>('');
  const [newUserRole, setNewUserRole] = useState<UserRole>('Operator Mekanik');
  const [newUserId, setNewUserId] = useState<string>('');
  const [newUserPass, setNewUserPass] = useState<string>('');
  const [savingUser, setSavingUser] = useState<boolean>(false);
  const [userFormError, setUserFormError] = useState<string>('');

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await onRefresh();
    } finally {
      setRefreshing(false);
    }
  };

  const handleResetDemo = () => {
    if (isSupabaseConfigured) return;
    onConfirm({
      open: true,
      title: 'Reset Data Demo',
      message:
        'Semua perubahan lokal akan dikembalikan ke data awal Muliabara. Lanjutkan?',
      confirmLabel: 'Reset Data',
      destructive: true,
      onConfirm: () => {
        const seed = buildSeedData();
        setDb(seed);
        saveLocalDatabase(seed);
        onToast('Data demo berhasil dimuat ulang.', 'success');
      },
    });
  };

  const normalizedQuery = searchQuery.trim().toLowerCase();

  const mekFiltered = useMemo(
    () =>
      db.mekanikLogs.filter((m) => {
        if (!isInReportPeriod(m.timestamp, period, refDate)) return false;
        if (!normalizedQuery) return true;
        return (
          m.unitName.toLowerCase().includes(normalizedQuery) ||
          m.operatorName.toLowerCase().includes(normalizedQuery) ||
          m.jenis.toLowerCase().includes(normalizedQuery) ||
          m.detail.toLowerCase().includes(normalizedQuery)
        );
      }),
    [db.mekanikLogs, period, refDate, normalizedQuery]
  );

  const elkFiltered = useMemo(
    () =>
      db.elektrikLogs.filter((e) => {
        if (!isInReportPeriod(e.timestamp, period, refDate)) return false;
        if (!normalizedQuery) return true;
        return (
          e.unitAc.toLowerCase().includes(normalizedQuery) ||
          e.operatorName.toLowerCase().includes(normalizedQuery) ||
          e.category.toLowerCase().includes(normalizedQuery) ||
          e.action.toLowerCase().includes(normalizedQuery) ||
          e.detail.toLowerCase().includes(normalizedQuery)
        );
      }),
    [db.elektrikLogs, period, refDate, normalizedQuery]
  );

  const logFiltered = useMemo(
    () =>
      db.logisticLogs.filter((l) => {
        if (!isInReportPeriod(l.timestamp, period, refDate)) return false;
        if (!normalizedQuery) return true;
        return (
          l.person.toLowerCase().includes(normalizedQuery) ||
          l.petugas.toLowerCase().includes(normalizedQuery) ||
          l.type.toLowerCase().includes(normalizedQuery) ||
          l.items.some((i) => i.name.toLowerCase().includes(normalizedQuery))
        );
      }),
    [db.logisticLogs, period, refDate, normalizedQuery]
  );

  const readyCount = useMemo(
    () => db.units.filter((u) => u.status === 'Ready').length,
    [db.units]
  );
  const notReadyCount = db.units.length - readyCount;
  const paPercent = db.units.length
    ? Math.round((readyCount / db.units.length) * 100)
    : 0;

  const totalFuel = useMemo(
    () => mekFiltered.reduce((sum, i) => sum + Number(i.fuel || 0), 0),
    [mekFiltered]
  );

  const totalKwh = useMemo(
    () =>
      mekFiltered.reduce((sum, i) => {
        const cat =
          i.unitCategory ||
          db.units.find((u) => u.id === i.unitId)?.category ||
          '-';
        return cat === 'Genset' ? sum + Number(i.kwh || 0) : sum;
      }, 0),
    [mekFiltered, db.units]
  );

  const serviceHealthList = useMemo(() => {
    return db.units.map((u) => {
      const lHm = extractHmValue(u.lastService);
      const nHm = extractHmValue(u.nextService);
      const cHm = Number(u.currentHm || 0);
      let pct = 50;
      let rem = `Jadwal: ${u.nextService}`;
      let statusLabel: 'Normal' | 'Mendekati Service' | 'Segera Service' =
        'Normal';
      let isAlert = false;

      if (nHm !== null && lHm !== null && nHm > lHm) {
        pct = Math.max(
          0,
          Math.min(100, Math.round(((cHm - lHm) / (nHm - lHm)) * 100))
        );
        const sisa = Math.round((nHm - cHm) * 10) / 10;
        rem = sisa <= 0 ? `Lewat ${Math.abs(sisa)} HM` : `Sisa ${sisa} HM lagi`;
        if (pct >= 100 || sisa <= 0) {
          statusLabel = 'Segera Service';
          isAlert = true;
        } else if (pct >= 80) {
          statusLabel = 'Mendekati Service';
          isAlert = true;
        }
      } else if (nHm !== null && cHm >= nHm) {
        pct = 100;
        rem = 'Mencapai target HM';
        statusLabel = 'Segera Service';
        isAlert = true;
      }

      return { unit: u, pct, rem, statusLabel, isAlert };
    });
  }, [db.units]);

  const serviceAlertCount = useMemo(
    () => serviceHealthList.filter((s) => s.isAlert).length,
    [serviceHealthList]
  );

  const periodLabel = {
    harian: `Harian (${refDate})`,
    mingguan: `Mingguan (7 Hari s/d ${refDate})`,
    bulanan: `Bulanan (${refDate.slice(0, 7)})`,
    semua: 'Semua Riwayat',
  }[period];

  // Unit CRUD
  const resetUnitForm = () => {
    setEditUnitId('');
    setUnitName('');
    setUnitCategory('Genset');
    setUnitStatus('Ready');
    setUnitCurrentHm('');
    setUnitLastService('');
    setUnitNextService('');
    setUnitRemarks('');
  };

  const handleSaveUnit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingUnit(true);
    try {
      const unitObj: PlantUnit = {
        id: editUnitId || 'U_' + Date.now(),
        name: unitName.trim(),
        category: unitCategory,
        status: unitStatus,
        currentHm: Number(unitCurrentHm || 0),
        lastService: unitLastService.trim(),
        nextService: unitNextService.trim(),
        remarks: unitRemarks.trim(),
      };

      if (isSupabaseConfigured) {
        await upsertUnitRemote(unitObj);
      }

      setDb((prev) => {
        const exists = prev.units.some((x) => x.id === unitObj.id);
        const nextUnits = exists
          ? prev.units.map((x) => (x.id === unitObj.id ? unitObj : x))
          : [...prev.units, unitObj];
        const nextDb: AppDatabase = { ...prev, units: nextUnits };
        if (!isSupabaseConfigured) saveLocalDatabase(nextDb);
        return nextDb;
      });

      onToast(
        editUnitId ? 'Data unit diperbarui.' : 'Unit baru berhasil ditambahkan.',
        'success'
      );
      resetUnitForm();
    } catch {
      onToast('Gagal menyimpan unit ke Supabase.', 'error');
    } finally {
      setSavingUnit(false);
    }
  };

  const handleEditUnit = (u: PlantUnit) => {
    setEditUnitId(u.id);
    setUnitName(u.name);
    setUnitCategory(u.category);
    setUnitStatus(u.status);
    setUnitCurrentHm(String(u.currentHm));
    setUnitLastService(u.lastService);
    setUnitNextService(u.nextService);
    setUnitRemarks(u.remarks);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleToggleUnitStatus = async (u: PlantUnit) => {
    const nextStatus: UnitStatus =
      u.status === 'Ready' ? 'Tidak Ready' : 'Ready';
    try {
      if (isSupabaseConfigured) {
        await updateUnitStatusRemote(u.id, nextStatus);
      }
      setDb((prev) => {
        const nextDb: AppDatabase = {
          ...prev,
          units: prev.units.map((x) =>
            x.id === u.id ? { ...x, status: nextStatus } : x
          ),
        };
        if (!isSupabaseConfigured) saveLocalDatabase(nextDb);
        return nextDb;
      });
      onToast(`Status ${u.name}: ${nextStatus}`, 'success');
    } catch {
      onToast('Gagal memperbarui status unit.', 'error');
    }
  };

  const handleDeleteUnit = (u: PlantUnit) => {
    onConfirm({
      open: true,
      title: 'Hapus Unit',
      message: `Yakin ingin menghapus unit "${u.name}"? Riwayat laporan sebelumnya tetap tersimpan.`,
      confirmLabel: 'Hapus Unit',
      destructive: true,
      onConfirm: async () => {
        try {
          if (isSupabaseConfigured) await deleteUnitRemote(u.id);
          setDb((prev) => {
            const nextDb: AppDatabase = {
              ...prev,
              units: prev.units.filter((x) => x.id !== u.id),
            };
            if (!isSupabaseConfigured) saveLocalDatabase(nextDb);
            return nextDb;
          });
          if (editUnitId === u.id) resetUnitForm();
          onToast('Unit berhasil dihapus.', 'success');
        } catch {
          onToast('Gagal menghapus unit.', 'error');
        }
      },
    });
  };

  // Elektrik Category & Inventory CRUD
  const handleAddCategory = (e: React.FormEvent) => {
    e.preventDefault();
    const cleaned = newCategoryName.trim();
    if (!cleaned) return;
    if (
      db.elektrikCategories.some(
        (c) => c.toLowerCase() === cleaned.toLowerCase()
      )
    ) {
      onToast(`Kategori "${cleaned}" sudah ada.`, 'info');
      return;
    }
    setDb((prev) => {
      const nextDb: AppDatabase = {
        ...prev,
        elektrikCategories: [...prev.elektrikCategories, cleaned],
      };
      saveLocalDatabase(nextDb);
      return nextDb;
    });
    setNewCategoryName('');
    setInvCategory(cleaned);
    onToast(`Kategori "${cleaned}" ditambahkan.`, 'success');
  };

  const handleDeleteCategory = (cat: string) => {
    if (db.elektrikCategories.length <= 1) {
      onToast('Minimal harus ada 1 kategori elektrik.', 'error');
      return;
    }
    onConfirm({
      open: true,
      title: 'Hapus Kategori',
      message: `Hapus kategori "${cat}" dari daftar pilihan?`,
      confirmLabel: 'Hapus Kategori',
      destructive: true,
      onConfirm: () => {
        setDb((prev) => {
          const remaining = prev.elektrikCategories.filter((c) => c !== cat);
          const nextDb: AppDatabase = {
            ...prev,
            elektrikCategories: remaining,
          };
          saveLocalDatabase(nextDb);
          if (invCategory === cat && remaining.length > 0) {
            setInvCategory(remaining[0]);
          }
          return nextDb;
        });
        onToast(`Kategori "${cat}" dihapus.`, 'success');
      },
    });
  };

  const resetInventoryForm = () => {
    setEditInvId('');
    setInvName('');
    setInvCategory(db.elektrikCategories[0] || 'AC');
    setInvQty('1');
    setInvUnit('unit');
    setInvLocation('');
    setInvCondition('Normal');
    setInvRemarks('');
  };

  const handleSaveInventory = (e: React.FormEvent) => {
    e.preventDefault();
    const qtyNum = Math.max(0, Number(invQty || 0));
    const itemObj: ElektrikInventoryItem = {
      id: editInvId || 'INV_' + Date.now(),
      name: invName.trim(),
      category: invCategory || db.elektrikCategories[0] || 'AC',
      qty: Number.isNaN(qtyNum) ? 0 : qtyNum,
      unit: invUnit,
      location: invLocation.trim(),
      condition: invCondition,
      remarks: invRemarks.trim(),
    };

    setDb((prev) => {
      const exists = prev.elektrikInventory.some((x) => x.id === itemObj.id);
      const nextInventory = exists
        ? prev.elektrikInventory.map((x) => (x.id === itemObj.id ? itemObj : x))
        : [...prev.elektrikInventory, itemObj];
      const nextDb: AppDatabase = { ...prev, elektrikInventory: nextInventory };
      saveLocalDatabase(nextDb);
      return nextDb;
    });

    onToast(
      editInvId
        ? 'Data inventaris diperbarui.'
        : 'Item inventaris baru ditambahkan.',
      'success'
    );
    resetInventoryForm();
  };

  const handleEditInventory = (item: ElektrikInventoryItem) => {
    setEditInvId(item.id);
    setInvName(item.name);
    setInvCategory(item.category);
    setInvQty(String(item.qty));
    setInvUnit(item.unit);
    setInvLocation(item.location);
    setInvCondition(item.condition);
    setInvRemarks(item.remarks);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleAdjustInventoryQty = (
    item: ElektrikInventoryItem,
    delta: number
  ) => {
    const nextQty = Math.max(0, item.qty + delta);
    setDb((prev) => {
      const nextDb: AppDatabase = {
        ...prev,
        elektrikInventory: prev.elektrikInventory.map((x) =>
          x.id === item.id ? { ...x, qty: nextQty } : x
        ),
      };
      saveLocalDatabase(nextDb);
      return nextDb;
    });
  };

  const handleDeleteInventory = (item: ElektrikInventoryItem) => {
    onConfirm({
      open: true,
      title: 'Hapus Inventaris',
      message: `Hapus "${item.name}" dari daftar inventaris?`,
      confirmLabel: 'Hapus',
      destructive: true,
      onConfirm: () => {
        setDb((prev) => {
          const nextDb: AppDatabase = {
            ...prev,
            elektrikInventory: prev.elektrikInventory.filter(
              (x) => x.id !== item.id
            ),
          };
          saveLocalDatabase(nextDb);
          return nextDb;
        });
        if (editInvId === item.id) resetInventoryForm();
        onToast('Item inventaris dihapus.', 'success');
      },
    });
  };

  // User CRUD
  const generateCredentials = () => {
    const prefixMap: Record<string, string> = {
      'Operator Mekanik': 'MEK',
      'Operator Elektrik': 'ELK',
      'Operator Elektrik AC': 'ELK',
      Logistic: 'LOG',
      Pengawas: 'PGW',
    };
    const prefix = prefixMap[newUserRole] || 'USR';
    setNewUserId(prefix + Math.floor(10 + Math.random() * 89));
    setNewUserPass(String(Math.floor(100000 + Math.random() * 899999)));
  };

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setUserFormError('');
    const normalizedId = newUserId.trim().toUpperCase();
    if (!normalizedId) {
      setUserFormError('User ID wajib diisi.');
      return;
    }
    if (db.users.some((u) => u.id.toUpperCase() === normalizedId)) {
      setUserFormError(`User ID "${normalizedId}" sudah dipakai.`);
      return;
    }

    setSavingUser(true);
    try {
      const userObj: AppUser = {
        id: normalizedId,
        password: newUserPass.trim(),
        name: newUserName.trim(),
        role: newUserRole,
      };
      if (isSupabaseConfigured) {
        await insertUserRemote(userObj);
      }
      setDb((prev) => {
        const nextDb: AppDatabase = {
          ...prev,
          users: [...prev.users, userObj],
        };
        if (!isSupabaseConfigured) saveLocalDatabase(nextDb);
        return nextDb;
      });
      setNewUserName('');
      setNewUserId('');
      setNewUserPass('');
      onToast(`Akun ${userObj.name} (${userObj.id}) dibuat.`, 'success');
    } catch {
      onToast('Gagal membuat akun di server.', 'error');
    } finally {
      setSavingUser(false);
    }
  };

  const handleDeleteUser = (u: AppUser) => {
    if (u.id === currentUser.id) {
      onToast('Tidak dapat menghapus akun yang sedang aktif.', 'error');
      return;
    }
    onConfirm({
      open: true,
      title: 'Hapus Akun',
      message: `Hapus akses akun "${u.name}" (${u.id})?`,
      confirmLabel: 'Hapus Akun',
      destructive: true,
      onConfirm: async () => {
        try {
          if (isSupabaseConfigured) await deleteUserRemote(u.id);
          setDb((prev) => {
            const nextDb: AppDatabase = {
              ...prev,
              users: prev.users.filter((x) => x.id !== u.id),
            };
            if (!isSupabaseConfigured) saveLocalDatabase(nextDb);
            return nextDb;
          });
          onToast(`Akun ${u.id} dihapus.`, 'success');
        } catch {
          onToast('Gagal menghapus akun.', 'error');
        }
      },
    });
  };

  return (
    <motion.section
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
      className="space-y-6"
    >
      {/* Workspace Navigation & Utility Bar */}
      <div className="no-print flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-[#10171f]">
        <div className="flex flex-wrap items-center gap-1.5 rounded-lg bg-slate-100 p-1 dark:bg-[#090e13]">
          <button
            type="button"
            onClick={() => setActiveTab('laporan')}
            className={`inline-flex items-center gap-2 rounded-md px-3.5 py-2 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
              activeTab === 'laporan'
                ? 'bg-white text-slate-900 shadow-xs dark:bg-[#19325d] dark:text-white'
                : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
            }`}
          >
            <BarChart3 className="h-3.5 w-3.5" />
            Executive Dashboard &amp; Laporan
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('unit')}
            className={`inline-flex items-center gap-2 rounded-md px-3.5 py-2 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
              activeTab === 'unit'
                ? 'bg-white text-slate-900 shadow-xs dark:bg-[#19325d] dark:text-white'
                : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
            }`}
          >
            <Cpu className="h-3.5 w-3.5" />
            Genset &amp; Alat Berat
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('inventaris')}
            className={`inline-flex items-center gap-2 rounded-md px-3.5 py-2 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
              activeTab === 'inventaris'
                ? 'bg-white text-slate-900 shadow-xs dark:bg-[#19325d] dark:text-white'
                : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
            }`}
          >
            <Layers className="h-3.5 w-3.5" />
            Inventaris &amp; Kategori
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('users')}
            className={`inline-flex items-center gap-2 rounded-md px-3.5 py-2 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
              activeTab === 'users'
                ? 'bg-white text-slate-900 shadow-xs dark:bg-[#19325d] dark:text-white'
                : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
            }`}
          >
            <Users className="h-3.5 w-3.5" />
            Kelola ID Operator &amp; Logistic
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={onToggleTheme}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-100 dark:border-slate-700 dark:bg-[#16202a] dark:text-slate-200 dark:hover:bg-slate-800 whitespace-nowrap shrink-0"
          >
            {theme === 'dark' ? (
              <>
                <Sun className="h-3.5 w-3.5 text-amber-400" />
                Tema Terang
              </>
            ) : (
              <>
                <Moon className="h-3.5 w-3.5 text-[#19325d]" />
                Tema Gelap
              </>
            )}
          </button>
          <button
            type="button"
            onClick={handleRefresh}
            disabled={refreshing}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-60 dark:border-slate-700 dark:bg-[#16202a] dark:text-slate-200 dark:hover:bg-slate-800 whitespace-nowrap shrink-0"
          >
            <RefreshCw
              className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin' : ''}`}
            />
            Segarkan Data
          </button>
          {!isSupabaseConfigured && (
            <button
              type="button"
              onClick={handleResetDemo}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:bg-[#16202a] dark:text-slate-300 dark:hover:bg-slate-800 whitespace-nowrap shrink-0"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Reset Demo
            </button>
          )}
        </div>
      </div>

      <AnimatePresence mode="wait">
        {activeTab === 'laporan' && (
          <motion.div
            key="tab-laporan"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
            className="space-y-6"
          >
            {/* Period Filter & Actions Bar */}
            <div className="no-print flex flex-col justify-between gap-4 rounded-xl border border-slate-200 bg-[#19325d] p-4 text-white lg:flex-row lg:items-center dark:border-slate-800 dark:bg-[#10171f]">
              <div className="flex flex-wrap items-center gap-2">
                <span className="mr-1 text-xs font-semibold text-[#a5dc6b]">
                  Periode Analitik:
                </span>
                {(
                  [
                    ['harian', 'Harian'],
                    ['mingguan', 'Mingguan'],
                    ['bulanan', 'Bulanan'],
                    ['semua', 'Semua Data'],
                  ] as const
                ).map(([key, label]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setPeriod(key)}
                    className={`rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
                      period === key
                        ? 'bg-[#7ab547] text-white dark:text-[#090e13]'
                        : 'bg-white/10 text-slate-200 hover:bg-white/20'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>

              <div className="flex flex-wrap items-center gap-2.5">
                <div className="relative">
                  <Search className="pointer-events-none absolute top-1/2 left-2.5 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                  <input
                    type="search"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Cari unit / operator..."
                    aria-label="Cari laporan atau unit"
                    className="w-44 rounded-lg border border-white/15 bg-white/10 py-1.5 pr-3 pl-8 text-xs text-white placeholder:text-slate-300 focus:border-[#82c341] focus:outline-none dark:border-slate-700 dark:bg-[#16202a]"
                  />
                </div>
                <input
                  type="date"
                  value={refDate}
                  onChange={(e) => setRefDate(e.target.value)}
                  aria-label="Tanggal referensi laporan"
                  className="font-mono-tabular rounded-lg border border-white/15 bg-white/10 px-3 py-1.5 text-xs text-white focus:border-[#82c341] focus:outline-none dark:border-slate-700 dark:bg-[#16202a]"
                />
                <button
                  type="button"
                  onClick={() =>
                    exportReportToCSV(
                      mekFiltered,
                      elkFiltered,
                      logFiltered,
                      db.units,
                      period
                    )
                  }
                  className="inline-flex items-center gap-1.5 rounded-lg bg-[#7ab547] px-3.5 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-[#699e3b] dark:text-[#090e13] whitespace-nowrap shrink-0"
                >
                  <Download className="h-3.5 w-3.5" />
                  Export CSV
                </button>
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-white px-3.5 py-1.5 text-xs font-semibold text-[#19325d] transition-colors hover:bg-slate-100 whitespace-nowrap shrink-0"
                >
                  <Printer className="h-3.5 w-3.5" />
                  Cetak / PDF
                </button>
              </div>
            </div>

            {/* 5 KPI Cards */}
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
              <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-[#10171f]">
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                  Physical Availability
                </p>
                <div className="mt-1.5 flex items-baseline gap-2">
                  <p className="font-mono-tabular text-2xl font-bold text-[#5d9132] dark:text-[#82c341]">
                    {paPercent}%
                  </p>
                  <span className="font-mono-tabular text-xs text-slate-500 dark:text-slate-400">
                    ({readyCount}/{db.units.length})
                  </span>
                </div>
                <p className="mt-1 text-xs font-medium text-red-600 dark:text-red-400">
                  {notReadyCount} Tidak Ready
                </p>
              </div>

              <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-[#10171f]">
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                  Total Konsumsi Fuel
                </p>
                <p className="font-mono-tabular mt-1.5 text-2xl font-bold text-slate-900 dark:text-white">
                  {totalFuel.toLocaleString('id-ID')} L
                </p>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  Akumulasi periode
                </p>
              </div>

              <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-[#10171f]">
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                  Total Output KWH
                </p>
                <p className="font-mono-tabular mt-1.5 text-2xl font-bold text-slate-900 dark:text-white">
                  {totalKwh.toLocaleString('id-ID')}
                </p>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  Produksi Genset
                </p>
              </div>

              <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-[#10171f]">
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                  Aktivitas Maintenance
                </p>
                <p className="font-mono-tabular mt-1.5 text-2xl font-bold text-sky-700 dark:text-sky-400">
                  {mekFiltered.length + elkFiltered.length}
                </p>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  Mekanik &amp; Elektrik
                </p>
              </div>

              <div className="col-span-2 rounded-xl border border-slate-200 bg-white p-4 lg:col-span-1 dark:border-slate-800 dark:bg-[#10171f]">
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                  Alert Service Due
                </p>
                <p className="font-mono-tabular mt-1.5 text-2xl font-bold text-amber-600 dark:text-amber-400">
                  {serviceAlertCount} Unit
                </p>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  {logFiltered.length} Transaksi Logistic
                </p>
              </div>
            </div>

            {/* 4 Executive Analytical Panels */}
            <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
              <div className="print-break rounded-xl border border-slate-200 bg-white p-5 lg:col-span-8 dark:border-slate-800 dark:bg-[#10171f]">
                <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h3 className="font-display text-base font-bold text-slate-900 dark:text-white">
                      Analisis Konsumsi Fuel (Liter) &amp; Produksi KWH
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {period === 'harian'
                        ? 'Pemakaian Fuel & Output KWH per Unit (Hari Terpilih)'
                        : 'Tren Harian Konsumsi Fuel (Liter) vs Output KWH Genset'}
                    </p>
                  </div>
                  <span className="font-mono-tabular text-xs font-semibold text-[#5d9132] dark:text-[#82c341]">
                    {periodLabel}
                  </span>
                </div>
                <div className="relative h-64 sm:h-72">
                  <FuelKwhChart
                    mekanikLogs={mekFiltered}
                    units={db.units}
                    period={period}
                    theme={theme}
                  />
                </div>
              </div>

              <div className="print-break flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-5 lg:col-span-4 dark:border-slate-800 dark:bg-[#10171f]">
                <div>
                  <h3 className="font-display text-base font-bold text-slate-900 dark:text-white">
                    Kesiapan Armada &amp; Genset
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Rasio Unit Ready vs Tidak Ready (PA)
                  </p>
                </div>
                <div className="relative my-3 flex h-52 items-center justify-center">
                  <ReadinessDoughnutChart
                    readyCount={readyCount}
                    notReadyCount={notReadyCount}
                    theme={theme}
                  />
                  <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center pb-5">
                    <span className="font-mono-tabular text-2xl font-bold text-slate-900 dark:text-white">
                      {paPercent}%
                    </span>
                    <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                      Availability
                    </span>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3 border-t border-slate-200 pt-3 text-xs dark:border-slate-800">
                  <div>
                    <span className="block text-slate-500 dark:text-slate-400">
                      Genset Ready
                    </span>
                    <strong className="font-mono-tabular text-slate-900 dark:text-white">
                      {
                        db.units.filter(
                          (u) =>
                            u.category === 'Genset' && u.status === 'Ready'
                        ).length
                      }{' '}
                      / {db.units.filter((u) => u.category === 'Genset').length}{' '}
                      Unit
                    </strong>
                  </div>
                  <div>
                    <span className="block text-slate-500 dark:text-slate-400">
                      Alat Berat Ready
                    </span>
                    <strong className="font-mono-tabular text-slate-900 dark:text-white">
                      {
                        db.units.filter(
                          (u) =>
                            u.category === 'Alat Berat' && u.status === 'Ready'
                        ).length
                      }{' '}
                      /{' '}
                      {
                        db.units.filter((u) => u.category === 'Alat Berat')
                          .length
                      }{' '}
                      Unit
                    </strong>
                  </div>
                </div>
              </div>

              <div className="print-break rounded-xl border border-slate-200 bg-white p-5 lg:col-span-6 dark:border-slate-800 dark:bg-[#10171f]">
                <div className="mb-4">
                  <h3 className="font-display text-base font-bold text-slate-900 dark:text-white">
                    Distribusi Aktivitas Maintenance &amp; Logistik
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Komposisi P2H, Perawatan, Service, Trouble, Elektrik &amp;
                    Logistic
                  </p>
                </div>
                <div className="relative h-64">
                  <ActivityBarChart
                    mekanikLogs={mekFiltered}
                    elektrikLogs={elkFiltered}
                    logisticLogs={logFiltered}
                    theme={theme}
                  />
                </div>
              </div>

              <div className="print-break flex flex-col rounded-xl border border-slate-200 bg-white p-5 lg:col-span-6 dark:border-slate-800 dark:bg-[#10171f]">
                <div className="mb-4 flex items-center justify-between gap-2">
                  <div>
                    <h3 className="font-display text-base font-bold text-slate-900 dark:text-white">
                      Service Interval Health Monitor
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Monitoring jarak HM menuju jadwal Next Service
                    </p>
                  </div>
                  <span className="text-xs font-semibold text-[#5d9132] dark:text-[#82c341]">
                    Auto-Tracking
                  </span>
                </div>

                <div className="max-h-64 space-y-3 overflow-y-auto pr-1">
                  {serviceHealthList.length === 0 ? (
                    <p className="py-8 text-center text-sm text-slate-400">
                      Belum ada unit terdaftar.
                    </p>
                  ) : (
                    serviceHealthList.map(
                      ({ unit, pct, rem, statusLabel }) => (
                        <div
                          key={unit.id}
                          className="rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-[#090e13]"
                        >
                          <div className="mb-1.5 flex items-center justify-between gap-2">
                            <div className="min-w-0 truncate">
                              <span className="text-xs font-bold text-slate-900 sm:text-sm dark:text-white">
                                {unit.name}
                              </span>{' '}
                              <span className="text-xs text-slate-500 dark:text-slate-400">
                                · {unit.category}
                              </span>
                            </div>
                            <span
                              className={`text-xs font-bold whitespace-nowrap shrink-0 ${
                                statusLabel === 'Segera Service'
                                  ? 'text-red-600 dark:text-red-400'
                                  : statusLabel === 'Mendekati Service'
                                  ? 'text-amber-600 dark:text-amber-400'
                                  : 'text-[#5d9132] dark:text-[#82c341]'
                              }`}
                            >
                              {statusLabel}
                            </span>
                          </div>
                          <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
                            <div
                              className={`h-full rounded-full transition-all ${
                                statusLabel === 'Segera Service'
                                  ? 'bg-red-500'
                                  : statusLabel === 'Mendekati Service'
                                  ? 'bg-amber-500'
                                  : 'bg-[#7ab547]'
                              }`}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                          <div className="mt-1.5 flex justify-between text-xs text-slate-500 dark:text-slate-400">
                            <span className="font-mono-tabular">
                              Current:{' '}
                              <strong className="text-slate-900 dark:text-slate-200">
                                HM {unit.currentHm}
                              </strong>
                            </span>
                            <span className="font-mono-tabular">
                              {rem} (Next: {unit.nextService})
                            </span>
                          </div>
                        </div>
                      )
                    )
                  )}
                </div>
              </div>
            </div>

            {/* Table 1: Service Summary */}
            <div className="print-break rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-[#10171f]">
              <h3 className="font-display mb-4 text-base font-bold text-slate-900 dark:text-white">
                Status Management Service Unit (Genset &amp; Alat Berat)
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="border-b border-slate-200 text-xs font-semibold text-slate-500 dark:border-slate-800 dark:text-slate-400">
                    <tr>
                      <th className="px-3 py-3">Unit / Genset</th>
                      <th className="px-3 py-3">Kategori</th>
                      <th className="px-3 py-3">Status</th>
                      <th className="px-3 py-3 text-right">HM Saat Ini</th>
                      <th className="px-3 py-3">Last Service</th>
                      <th className="px-3 py-3">Next Service</th>
                      <th className="px-3 py-3">Remarks</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                    {db.units.length === 0 ? (
                      <tr>
                        <td
                          colSpan={7}
                          className="px-3 py-6 text-center text-slate-500 dark:text-slate-400"
                        >
                          Belum ada unit terdaftar.
                        </td>
                      </tr>
                    ) : (
                      db.units.map((u) => (
                        <tr
                          key={u.id}
                          className="hover:bg-slate-50 dark:hover:bg-slate-800/40"
                        >
                          <td className="px-3 py-3 font-semibold text-slate-900 dark:text-white">
                            {u.name}
                          </td>
                          <td className="px-3 py-3 text-slate-600 dark:text-slate-300">
                            {u.category}
                          </td>
                          <td className="px-3 py-3 text-xs font-bold">
                            <span
                              className={
                                u.status === 'Ready'
                                  ? 'text-[#5d9132] dark:text-[#82c341]'
                                  : 'text-red-600 dark:text-red-400'
                              }
                            >
                              {u.status}
                            </span>
                          </td>
                          <td className="font-mono-tabular px-3 py-3 text-right text-slate-800 dark:text-slate-200">
                            {u.currentHm}
                          </td>
                          <td className="px-3 py-3 text-slate-600 dark:text-slate-300">
                            {u.lastService}
                          </td>
                          <td className="px-3 py-3 font-semibold text-slate-900 dark:text-white">
                            {u.nextService}
                          </td>
                          <td className="px-3 py-3 text-slate-600 dark:text-slate-400">
                            {u.remarks || '-'}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Table 2: Mekanik Logs */}
            <div className="print-break rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-[#10171f]">
              <h3 className="font-display mb-4 text-base font-bold text-slate-900 dark:text-white">
                Laporan Operator Mekanik
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="border-b border-slate-200 text-xs font-semibold text-slate-500 dark:border-slate-800 dark:text-slate-400">
                    <tr>
                      <th className="px-3 py-3">Tanggal &amp; Waktu</th>
                      <th className="px-3 py-3">Operator</th>
                      <th className="px-3 py-3">Kategori</th>
                      <th className="px-3 py-3">Unit / Area</th>
                      <th className="px-3 py-3">Aktivitas / Pekerjaan</th>
                      <th className="px-3 py-3 text-right">HM</th>
                      <th className="px-3 py-3 text-right">KWH</th>
                      <th className="px-3 py-3 text-right">Fuel (L)</th>
                      <th className="px-3 py-3">Keterangan</th>
                      <th className="px-3 py-3">Bukti Foto</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                    {mekFiltered.length === 0 ? (
                      <tr>
                        <td
                          colSpan={10}
                          className="px-3 py-6 text-center text-slate-500 dark:text-slate-400"
                        >
                          Tidak ada data mekanik pada periode ini.
                        </td>
                      </tr>
                    ) : (
                      mekFiltered
                        .slice()
                        .reverse()
                        .map((m) => {
                          const cat =
                            m.unitCategory ||
                            db.units.find((x) => x.id === m.unitId)?.category ||
                            '-';
                          const isGeneral = cat === 'General';
                          return (
                            <tr
                              key={m.id}
                              className="hover:bg-slate-50 dark:hover:bg-slate-800/40"
                            >
                              <td className="font-mono-tabular whitespace-nowrap px-3 py-3 text-xs text-slate-500 dark:text-slate-400">
                                {fmtDT(m.timestamp)}
                              </td>
                              <td className="px-3 py-3 text-slate-700 dark:text-slate-300">
                                {m.operatorName}
                              </td>
                              <td className="px-3 py-3 text-xs font-semibold text-slate-700 dark:text-slate-300">
                                {cat}
                              </td>
                              <td className="px-3 py-3 font-semibold text-slate-900 dark:text-white">
                                {m.unitName}
                              </td>
                              <td className="px-3 py-3 text-xs font-medium text-slate-700 dark:text-slate-300">
                                {m.jenis}
                              </td>
                              <td className="font-mono-tabular px-3 py-3 text-right text-slate-800 dark:text-slate-200">
                                {isGeneral || m.hm === null ? '-' : m.hm}
                              </td>
                              <td className="font-mono-tabular px-3 py-3 text-right text-slate-800 dark:text-slate-200">
                                {isGeneral ||
                                cat === 'Alat Berat' ||
                                m.kwh === null
                                  ? '-'
                                  : m.kwh}
                              </td>
                              <td className="font-mono-tabular px-3 py-3 text-right text-slate-800 dark:text-slate-200">
                                {isGeneral || m.fuel === null ? '-' : m.fuel}
                              </td>
                              <td className="px-3 py-3 text-slate-700 dark:text-slate-300">
                                {m.detail}
                              </td>
                              <td className="px-3 py-3">
                                {m.photo ? (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      onOpenPhoto({
                                        open: true,
                                        src: m.photo,
                                        caption: `${m.unitName} · ${m.jenis} (${fmtDT(m.timestamp)})`,
                                      })
                                    }
                                    className="inline-flex items-center gap-1 text-xs font-semibold text-[#19325d] underline decoration-slate-300 underline-offset-4 hover:text-[#7ab547] dark:text-[#82c341] dark:decoration-slate-700"
                                  >
                                    <Eye className="h-3.5 w-3.5" />
                                    Lihat Foto
                                  </button>
                                ) : (
                                  <span className="text-xs text-slate-400">
                                    Tanpa foto
                                  </span>
                                )}
                              </td>
                            </tr>
                          );
                        })
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Table 3: Elektrik Logs */}
            <div className="print-break rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-[#10171f]">
              <h3 className="font-display mb-4 text-base font-bold text-slate-900 dark:text-white">
                Laporan Operator Elektrik
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="border-b border-slate-200 text-xs font-semibold text-slate-500 dark:border-slate-800 dark:text-slate-400">
                    <tr>
                      <th className="px-3 py-3">Tanggal &amp; Waktu</th>
                      <th className="px-3 py-3">Operator</th>
                      <th className="px-3 py-3">Kategori</th>
                      <th className="px-3 py-3">Lokasi / Unit / Komponen</th>
                      <th className="px-3 py-3">Tindakan</th>
                      <th className="px-3 py-3">Detail Pekerjaan</th>
                      <th className="px-3 py-3">Bukti Foto</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                    {elkFiltered.length === 0 ? (
                      <tr>
                        <td
                          colSpan={7}
                          className="px-3 py-6 text-center text-slate-500 dark:text-slate-400"
                        >
                          Tidak ada data elektrik pada periode ini.
                        </td>
                      </tr>
                    ) : (
                      elkFiltered
                        .slice()
                        .reverse()
                        .map((e) => (
                          <tr
                            key={e.id}
                            className="hover:bg-slate-50 dark:hover:bg-slate-800/40"
                          >
                            <td className="font-mono-tabular whitespace-nowrap px-3 py-3 text-xs text-slate-500 dark:text-slate-400">
                              {fmtDT(e.timestamp)}
                            </td>
                            <td className="px-3 py-3 text-slate-700 dark:text-slate-300">
                              {e.operatorName}
                            </td>
                            <td className="px-3 py-3 text-xs font-semibold text-[#5d9132] dark:text-[#82c341]">
                              {e.category || 'AC'}
                            </td>
                            <td className="px-3 py-3 font-semibold text-slate-900 dark:text-white">
                              {e.unitAc}
                            </td>
                            <td className="px-3 py-3 text-xs font-medium text-sky-700 dark:text-sky-400">
                              {e.action}
                            </td>
                            <td className="px-3 py-3 text-slate-700 dark:text-slate-300">
                              {e.detail}
                            </td>
                            <td className="px-3 py-3">
                              {e.photo ? (
                                <button
                                  type="button"
                                  onClick={() =>
                                    onOpenPhoto({
                                      open: true,
                                      src: e.photo,
                                      caption: `${e.category} · ${e.unitAc} (${fmtDT(e.timestamp)})`,
                                    })
                                  }
                                  className="inline-flex items-center gap-1 text-xs font-semibold text-[#19325d] underline decoration-slate-300 underline-offset-4 hover:text-[#7ab547] dark:text-[#82c341] dark:decoration-slate-700"
                                >
                                  <Eye className="h-3.5 w-3.5" />
                                  Lihat Foto
                                </button>
                              ) : (
                                <span className="text-xs text-slate-400">
                                  Tanpa foto
                                </span>
                              )}
                            </td>
                          </tr>
                        ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Table 4: Logistic Logs */}
            <div className="print-break rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-[#10171f]">
              <h3 className="font-display mb-4 text-base font-bold text-slate-900 dark:text-white">
                Laporan Logistic (Barang Masuk &amp; Pengambilan Barang)
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="border-b border-slate-200 text-xs font-semibold text-slate-500 dark:border-slate-800 dark:text-slate-400">
                    <tr>
                      <th className="px-3 py-3">Tanggal &amp; Waktu</th>
                      <th className="px-3 py-3">Tipe</th>
                      <th className="px-3 py-3">Petugas</th>
                      <th className="px-3 py-3">PIC Pengambil / Sumber</th>
                      <th className="px-3 py-3">Barang &amp; Quantity</th>
                      <th className="px-3 py-3">Bukti Foto</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                    {logFiltered.length === 0 ? (
                      <tr>
                        <td
                          colSpan={6}
                          className="px-3 py-6 text-center text-slate-500 dark:text-slate-400"
                        >
                          Tidak ada data logistic pada periode ini.
                        </td>
                      </tr>
                    ) : (
                      logFiltered
                        .slice()
                        .reverse()
                        .map((l) => (
                          <tr
                            key={l.id}
                            className="hover:bg-slate-50 dark:hover:bg-slate-800/40"
                          >
                            <td className="font-mono-tabular whitespace-nowrap px-3 py-3 text-xs text-slate-500 dark:text-slate-400">
                              {fmtDT(l.timestamp)}
                            </td>
                            <td className="px-3 py-3 text-xs font-semibold">
                              <span
                                className={
                                  l.type === 'Barang Masuk'
                                    ? 'text-[#5d9132] dark:text-[#82c341]'
                                    : 'text-[#19325d] dark:text-sky-400'
                                }
                              >
                                {l.type}
                              </span>
                            </td>
                            <td className="px-3 py-3 text-slate-700 dark:text-slate-300">
                              {l.petugas}
                            </td>
                            <td className="px-3 py-3 font-medium text-slate-900 dark:text-white">
                              {l.person}
                            </td>
                            <td className="px-3 py-3">
                              <ul className="space-y-0.5 text-xs text-slate-700 dark:text-slate-300">
                                {l.items.map((i, idx) => (
                                  <li key={idx}>
                                    <span className="font-semibold text-slate-900 dark:text-white">
                                      {i.name}
                                    </span>{' '}
                                    <span className="font-mono-tabular text-slate-500 dark:text-slate-400">
                                      ({formatLogisticItemQty(i)})
                                    </span>
                                  </li>
                                ))}
                              </ul>
                            </td>
                            <td className="px-3 py-3">
                              {l.photo ? (
                                <button
                                  type="button"
                                  onClick={() =>
                                    onOpenPhoto({
                                      open: true,
                                      src: l.photo,
                                      caption: `${l.type} · ${l.person} (${fmtDT(l.timestamp)})`,
                                    })
                                  }
                                  className="inline-flex items-center gap-1 text-xs font-semibold text-[#19325d] underline decoration-slate-300 underline-offset-4 hover:text-[#7ab547] dark:text-[#82c341] dark:decoration-slate-700"
                                >
                                  <Eye className="h-3.5 w-3.5" />
                                  Lihat Foto
                                </button>
                              ) : (
                                <span className="text-xs text-slate-400">
                                  Tanpa foto
                                </span>
                              )}
                            </td>
                          </tr>
                        ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </motion.div>
        )}

        {activeTab === 'unit' && (
          <motion.div
            key="tab-unit"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
            className="space-y-6"
          >
            <div className="rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-[#10171f]">
              <h3 className="font-display mb-4 text-lg font-bold text-slate-900 dark:text-white">
                {editUnitId
                  ? `Edit Unit: ${unitName}`
                  : 'Tambah Genset / Unit Alat Berat Baru'}
              </h3>
              <form
                onSubmit={handleSaveUnit}
                className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4"
              >
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-slate-600 dark:text-slate-400">
                    Nama / Kode Unit
                  </label>
                  <input
                    type="text"
                    required
                    value={unitName}
                    onChange={(e) => setUnitName(e.target.value)}
                    placeholder="cth: Genset CAT 500kVA #1"
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-[#7ab547] dark:border-slate-700 dark:bg-[#16202a] dark:text-slate-100"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-slate-600 dark:text-slate-400">
                    Kategori
                  </label>
                  <select
                    value={unitCategory}
                    onChange={(e) =>
                      setUnitCategory(
                        e.target.value as 'Genset' | 'Alat Berat'
                      )
                    }
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-[#7ab547] dark:border-slate-700 dark:bg-[#16202a] dark:text-slate-100"
                  >
                    <option value="Genset">Genset</option>
                    <option value="Alat Berat">Alat Berat</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-slate-600 dark:text-slate-400">
                    Status Kesiapan
                  </label>
                  <select
                    value={unitStatus}
                    onChange={(e) =>
                      setUnitStatus(e.target.value as UnitStatus)
                    }
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-[#7ab547] dark:border-slate-700 dark:bg-[#16202a] dark:text-slate-100"
                  >
                    <option value="Ready">Ready</option>
                    <option value="Tidak Ready">Tidak Ready</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-slate-600 dark:text-slate-400">
                    HM Saat Ini
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    required
                    value={unitCurrentHm}
                    onChange={(e) => setUnitCurrentHm(e.target.value)}
                    placeholder="cth: 1250"
                    className="font-mono-tabular w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-[#7ab547] dark:border-slate-700 dark:bg-[#16202a] dark:text-slate-100"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-slate-600 dark:text-slate-400">
                    Last Service
                  </label>
                  <input
                    type="text"
                    required
                    value={unitLastService}
                    onChange={(e) => setUnitLastService(e.target.value)}
                    placeholder="cth: HM 1200"
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-[#7ab547] dark:border-slate-700 dark:bg-[#16202a] dark:text-slate-100"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-slate-600 dark:text-slate-400">
                    Next Service
                  </label>
                  <input
                    type="text"
                    required
                    value={unitNextService}
                    onChange={(e) => setUnitNextService(e.target.value)}
                    placeholder="cth: HM 1450"
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-[#7ab547] dark:border-slate-700 dark:bg-[#16202a] dark:text-slate-100"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="mb-1.5 block text-xs font-semibold text-slate-600 dark:text-slate-400">
                    Remarks
                  </label>
                  <input
                    type="text"
                    value={unitRemarks}
                    onChange={(e) => setUnitRemarks(e.target.value)}
                    placeholder="Catatan kondisi unit"
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-[#7ab547] dark:border-slate-700 dark:bg-[#16202a] dark:text-slate-100"
                  />
                </div>
                <div className="flex items-center gap-2.5 sm:col-span-2 lg:col-span-4">
                  <button
                    type="submit"
                    disabled={savingUnit}
                    className="inline-flex items-center gap-2 rounded-lg bg-[#19325d] px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#122547] disabled:opacity-60 dark:bg-[#7ab547] dark:text-[#090e13] dark:hover:bg-[#82c341]"
                  >
                    <Plus className="h-4 w-4" />
                    {savingUnit ? 'Menyimpan...' : 'Simpan Unit'}
                  </button>
                  <button
                    type="button"
                    onClick={resetUnitForm}
                    className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-100 dark:border-slate-700 dark:bg-[#16202a] dark:text-slate-300 dark:hover:bg-slate-800"
                  >
                    Batal / Reset
                  </button>
                </div>
              </form>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-[#10171f]">
              <h3 className="font-display mb-4 text-base font-bold text-slate-900 dark:text-white">
                Daftar Genset &amp; Alat Berat
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="border-b border-slate-200 text-xs font-semibold text-slate-500 dark:border-slate-800 dark:text-slate-400">
                    <tr>
                      <th className="px-3 py-3">Unit</th>
                      <th className="px-3 py-3">Kategori</th>
                      <th className="px-3 py-3">Status</th>
                      <th className="px-3 py-3 text-right">HM</th>
                      <th className="px-3 py-3">Last Service</th>
                      <th className="px-3 py-3">Next Service</th>
                      <th className="px-3 py-3">Remarks</th>
                      <th className="px-3 py-3 text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                    {db.units.length === 0 ? (
                      <tr>
                        <td
                          colSpan={8}
                          className="px-3 py-6 text-center text-slate-500 dark:text-slate-400"
                        >
                          Belum ada unit terdaftar.
                        </td>
                      </tr>
                    ) : (
                      db.units.map((u) => (
                        <tr
                          key={u.id}
                          className="hover:bg-slate-50 dark:hover:bg-slate-800/40"
                        >
                          <td className="px-3 py-3 font-semibold text-slate-900 dark:text-white">
                            {u.name}
                          </td>
                          <td className="px-3 py-3 text-slate-600 dark:text-slate-300">
                            {u.category}
                          </td>
                          <td className="px-3 py-3">
                            <button
                              type="button"
                              onClick={() => handleToggleUnitStatus(u)}
                              className={`inline-flex items-center gap-1 rounded-md border px-2.5 py-1 text-xs font-semibold transition-colors whitespace-nowrap ${
                                u.status === 'Ready'
                                  ? 'border-[#7ab547]/40 bg-[#7ab547]/10 text-[#5d9132] hover:bg-[#7ab547]/20 dark:text-[#82c341]'
                                  : 'border-red-500/40 bg-red-500/10 text-red-600 hover:bg-red-500/20 dark:text-red-400'
                              }`}
                            >
                              {u.status}
                            </button>
                          </td>
                          <td className="font-mono-tabular px-3 py-3 text-right text-slate-800 dark:text-slate-200">
                            {u.currentHm}
                          </td>
                          <td className="px-3 py-3 text-slate-600 dark:text-slate-300">
                            {u.lastService}
                          </td>
                          <td className="px-3 py-3 font-semibold text-slate-900 dark:text-white">
                            {u.nextService}
                          </td>
                          <td className="px-3 py-3 text-slate-600 dark:text-slate-400">
                            {u.remarks || '-'}
                          </td>
                          <td className="px-3 py-3 text-right">
                            <div className="inline-flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => handleEditUnit(u)}
                                className="inline-flex items-center gap-1 text-xs font-semibold text-[#19325d] hover:text-[#7ab547] dark:text-sky-400"
                              >
                                <Pencil className="h-3.5 w-3.5" />
                                Edit
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteUnit(u)}
                                className="inline-flex items-center gap-1 text-xs font-semibold text-red-600 hover:text-red-700 dark:text-red-400"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                                Hapus
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </motion.div>
        )}

        {activeTab === 'inventaris' && (
          <motion.div
            key="tab-inventaris"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
            className="space-y-6"
          >
            {/* Manage Custom Categories */}
            <div className="rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-[#10171f]">
              <h3 className="font-display mb-2 text-lg font-bold text-slate-900 dark:text-white">
                Kelola Kategori Elektrik &amp; Inventaris
              </h3>
              <p className="mb-4 text-xs text-slate-500 dark:text-slate-400">
                Kategori yang ditambahkan di sini langsung muncul pada pilihan
                inventaris dan form Operator Elektrik.
              </p>

              <form
                onSubmit={handleAddCategory}
                className="mb-5 flex flex-wrap items-center gap-2.5"
              >
                <input
                  type="text"
                  required
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  placeholder="Nama kategori baru (cth: Panel Listrik, Pompa Air)"
                  className="w-full max-w-sm rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-[#7ab547] dark:border-slate-700 dark:bg-[#16202a] dark:text-slate-100"
                />
                <button
                  type="submit"
                  className="inline-flex items-center gap-1.5 rounded-lg bg-[#19325d] px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-[#122547] dark:bg-[#7ab547] dark:text-[#090e13] dark:hover:bg-[#82c341] whitespace-nowrap"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Tambah Kategori
                </button>
              </form>

              <div className="divide-y divide-slate-100 rounded-lg border border-slate-200 dark:divide-slate-800 dark:border-slate-800">
                {db.elektrikCategories.map((cat) => (
                  <div
                    key={cat}
                    className="flex items-center justify-between px-4 py-2.5 text-sm"
                  >
                    <span className="font-semibold text-slate-800 dark:text-slate-200">
                      {cat}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleDeleteCategory(cat)}
                      className="inline-flex items-center gap-1 text-xs font-semibold text-red-600 hover:text-red-700 dark:text-red-400"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Hapus
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Add / Edit Inventory Form */}
            <div className="rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-[#10171f]">
              <h3 className="font-display mb-4 text-lg font-bold text-slate-900 dark:text-white">
                {editInvId
                  ? `Edit Inventaris: ${invName}`
                  : 'Tambah Inventaris AC, Lampu, Unit & Komponen'}
              </h3>
              <form
                onSubmit={handleSaveInventory}
                className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4"
              >
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-slate-600 dark:text-slate-400">
                    Nama Item / Perangkat
                  </label>
                  <input
                    type="text"
                    required
                    value={invName}
                    onChange={(e) => setInvName(e.target.value)}
                    placeholder="cth: AC Split Daikin 2 PK"
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-[#7ab547] dark:border-slate-700 dark:bg-[#16202a] dark:text-slate-100"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-slate-600 dark:text-slate-400">
                    Kategori
                  </label>
                  <select
                    value={invCategory}
                    onChange={(e) => setInvCategory(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-[#7ab547] dark:border-slate-700 dark:bg-[#16202a] dark:text-slate-100"
                  >
                    {db.elektrikCategories.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-slate-600 dark:text-slate-400">
                    Jumlah / Stok
                  </label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={invQty}
                    onChange={(e) => setInvQty(e.target.value)}
                    className="font-mono-tabular w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-[#7ab547] dark:border-slate-700 dark:bg-[#16202a] dark:text-slate-100"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-slate-600 dark:text-slate-400">
                    Satuan
                  </label>
                  <select
                    value={invUnit}
                    onChange={(e) => setInvUnit(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-[#7ab547] dark:border-slate-700 dark:bg-[#16202a] dark:text-slate-100"
                  >
                    {LOGISTIC_UNITS.map((u) => (
                      <option key={u} value={u}>
                        {u}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-slate-600 dark:text-slate-400">
                    Lokasi Penempatan
                  </label>
                  <input
                    type="text"
                    required
                    value={invLocation}
                    onChange={(e) => setInvLocation(e.target.value)}
                    placeholder="cth: Ruang Control Room"
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-[#7ab547] dark:border-slate-700 dark:bg-[#16202a] dark:text-slate-100"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-slate-600 dark:text-slate-400">
                    Kondisi
                  </label>
                  <select
                    value={invCondition}
                    onChange={(e) =>
                      setInvCondition(
                        e.target.value as 'Normal' | 'Perlu Perbaikan' | 'Rusak'
                      )
                    }
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-[#7ab547] dark:border-slate-700 dark:bg-[#16202a] dark:text-slate-100"
                  >
                    <option value="Normal">Normal</option>
                    <option value="Perlu Perbaikan">Perlu Perbaikan</option>
                    <option value="Rusak">Rusak</option>
                  </select>
                </div>
                <div className="sm:col-span-2">
                  <label className="mb-1.5 block text-xs font-semibold text-slate-600 dark:text-slate-400">
                    Keterangan
                  </label>
                  <input
                    type="text"
                    value={invRemarks}
                    onChange={(e) => setInvRemarks(e.target.value)}
                    placeholder="Catatan inventaris"
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-[#7ab547] dark:border-slate-700 dark:bg-[#16202a] dark:text-slate-100"
                  />
                </div>
                <div className="flex items-center gap-2.5 sm:col-span-2 lg:col-span-4">
                  <button
                    type="submit"
                    className="inline-flex items-center gap-2 rounded-lg bg-[#19325d] px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#122547] dark:bg-[#7ab547] dark:text-[#090e13] dark:hover:bg-[#82c341]"
                  >
                    <Plus className="h-4 w-4" />
                    {editInvId ? 'Perbarui Inventaris' : 'Simpan Inventaris'}
                  </button>
                  <button
                    type="button"
                    onClick={resetInventoryForm}
                    className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-100 dark:border-slate-700 dark:bg-[#16202a] dark:text-slate-300 dark:hover:bg-slate-800"
                  >
                    Batal / Reset
                  </button>
                </div>
              </form>
            </div>

            {/* Inventory List Table */}
            <div className="rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-[#10171f]">
              <h3 className="font-display mb-4 text-base font-bold text-slate-900 dark:text-white">
                Daftar Inventaris (Tambah / Kurang / Edit)
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="border-b border-slate-200 text-xs font-semibold text-slate-500 dark:border-slate-800 dark:text-slate-400">
                    <tr>
                      <th className="px-3 py-3">Nama Item</th>
                      <th className="px-3 py-3">Kategori</th>
                      <th className="px-3 py-3">Jumlah</th>
                      <th className="px-3 py-3">Lokasi</th>
                      <th className="px-3 py-3">Kondisi</th>
                      <th className="px-3 py-3">Keterangan</th>
                      <th className="px-3 py-3 text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                    {db.elektrikInventory.length === 0 ? (
                      <tr>
                        <td
                          colSpan={7}
                          className="px-3 py-6 text-center text-slate-500 dark:text-slate-400"
                        >
                          Belum ada item inventaris.
                        </td>
                      </tr>
                    ) : (
                      db.elektrikInventory.map((item) => (
                        <tr
                          key={item.id}
                          className="hover:bg-slate-50 dark:hover:bg-slate-800/40"
                        >
                          <td className="px-3 py-3 font-semibold text-slate-900 dark:text-white">
                            {item.name}
                          </td>
                          <td className="px-3 py-3 text-xs font-semibold text-[#5d9132] dark:text-[#82c341]">
                            {item.category}
                          </td>
                          <td className="px-3 py-3">
                            <div className="inline-flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() =>
                                  handleAdjustInventoryQty(item, -1)
                                }
                                aria-label={`Kurangi jumlah ${item.name}`}
                                className="rounded border border-slate-200 p-1 text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                              >
                                <Minus className="h-3 w-3" />
                              </button>
                              <span className="font-mono-tabular min-w-[3.5rem] text-center text-xs font-bold text-slate-900 dark:text-white">
                                {item.qty} {item.unit}
                              </span>
                              <button
                                type="button"
                                onClick={() =>
                                  handleAdjustInventoryQty(item, 1)
                                }
                                aria-label={`Tambah jumlah ${item.name}`}
                                className="rounded border border-slate-200 p-1 text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                              >
                                <Plus className="h-3 w-3" />
                              </button>
                            </div>
                          </td>
                          <td className="px-3 py-3 text-slate-700 dark:text-slate-300">
                            {item.location}
                          </td>
                          <td className="px-3 py-3 text-xs font-semibold">
                            <span
                              className={
                                item.condition === 'Normal'
                                  ? 'text-[#5d9132] dark:text-[#82c341]'
                                  : item.condition === 'Perlu Perbaikan'
                                  ? 'text-amber-600 dark:text-amber-400'
                                  : 'text-red-600 dark:text-red-400'
                              }
                            >
                              {item.condition}
                            </span>
                          </td>
                          <td className="px-3 py-3 text-slate-600 dark:text-slate-400">
                            {item.remarks || '-'}
                          </td>
                          <td className="px-3 py-3 text-right">
                            <div className="inline-flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => handleEditInventory(item)}
                                className="inline-flex items-center gap-1 text-xs font-semibold text-[#19325d] hover:text-[#7ab547] dark:text-sky-400"
                              >
                                <Pencil className="h-3.5 w-3.5" />
                                Edit
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteInventory(item)}
                                className="inline-flex items-center gap-1 text-xs font-semibold text-red-600 hover:text-red-700 dark:text-red-400"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                                Hapus
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </motion.div>
        )}

        {activeTab === 'users' && (
          <motion.div
            key="tab-users"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
            className="space-y-6"
          >
            <div className="rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-[#10171f]">
              <h3 className="font-display mb-4 text-lg font-bold text-slate-900 dark:text-white">
                Tambah Akun Operator &amp; Logistic
              </h3>
              <form
                onSubmit={handleAddUser}
                className="grid grid-cols-1 items-end gap-4 sm:grid-cols-2 lg:grid-cols-4"
              >
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-slate-600 dark:text-slate-400">
                    Nama Lengkap
                  </label>
                  <input
                    type="text"
                    required
                    value={newUserName}
                    onChange={(e) => setNewUserName(e.target.value)}
                    placeholder="cth: Budi Santoso"
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-[#7ab547] dark:border-slate-700 dark:bg-[#16202a] dark:text-slate-100"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-slate-600 dark:text-slate-400">
                    Divisi
                  </label>
                  <select
                    value={newUserRole}
                    onChange={(e) => setNewUserRole(e.target.value as UserRole)}
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-[#7ab547] dark:border-slate-700 dark:bg-[#16202a] dark:text-slate-100"
                  >
                    <option value="Operator Mekanik">Operator Mekanik</option>
                    <option value="Operator Elektrik">
                      Operator Elektrik (AC/Lampu/Unit)
                    </option>
                    <option value="Logistic">Logistic</option>
                    <option value="Pengawas">Pengawas</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-slate-600 dark:text-slate-400">
                    User ID
                  </label>
                  <div className="flex gap-1.5">
                    <input
                      type="text"
                      required
                      value={newUserId}
                      onChange={(e) => setNewUserId(e.target.value)}
                      placeholder="MEK02"
                      className="font-mono-tabular w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-[#7ab547] dark:border-slate-700 dark:bg-[#16202a] dark:text-slate-100"
                    />
                    <button
                      type="button"
                      onClick={generateCredentials}
                      className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 px-2.5 text-xs font-semibold text-[#5d9132] hover:bg-slate-100 dark:border-slate-700 dark:bg-[#16202a] dark:text-[#82c341] whitespace-nowrap shrink-0"
                    >
                      <KeyRound className="h-3.5 w-3.5" />
                      Auto ID
                    </button>
                  </div>
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-slate-600 dark:text-slate-400">
                    Password
                  </label>
                  <input
                    type="text"
                    required
                    value={newUserPass}
                    onChange={(e) => setNewUserPass(e.target.value)}
                    placeholder="123456"
                    className="font-mono-tabular w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-[#7ab547] dark:border-slate-700 dark:bg-[#16202a] dark:text-slate-100"
                  />
                </div>
                {userFormError && (
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-red-600 sm:col-span-2 lg:col-span-4 dark:text-red-400">
                    <AlertCircle className="h-3.5 w-3.5" />
                    {userFormError}
                  </div>
                )}
                <div className="sm:col-span-2 lg:col-span-4">
                  <button
                    type="submit"
                    disabled={savingUser}
                    className="inline-flex items-center gap-2 rounded-lg bg-[#19325d] px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#122547] disabled:opacity-60 dark:bg-[#7ab547] dark:text-[#090e13] dark:hover:bg-[#82c341]"
                  >
                    <Plus className="h-4 w-4" />
                    {savingUser
                      ? 'Menyimpan...'
                      : 'Buat Akun & Berikan ID/Password'}
                  </button>
                </div>
              </form>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-[#10171f]">
              <h3 className="font-display mb-4 text-base font-bold text-slate-900 dark:text-white">
                Daftar Akun Terdaftar
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="border-b border-slate-200 text-xs font-semibold text-slate-500 dark:border-slate-800 dark:text-slate-400">
                    <tr>
                      <th className="px-3 py-3">Nama</th>
                      <th className="px-3 py-3">Divisi</th>
                      <th className="px-3 py-3">User ID</th>
                      <th className="px-3 py-3">Password</th>
                      <th className="px-3 py-3 text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                    {db.users.map((u) => (
                      <tr
                        key={u.id}
                        className="hover:bg-slate-50 dark:hover:bg-slate-800/40"
                      >
                        <td className="px-3 py-3 font-semibold text-slate-900 dark:text-white">
                          {u.name}
                        </td>
                        <td className="px-3 py-3 text-slate-600 dark:text-slate-300">
                          {u.role}
                        </td>
                        <td className="font-mono-tabular px-3 py-3 font-bold text-[#19325d] dark:text-[#82c341]">
                          {u.id}
                        </td>
                        <td className="font-mono-tabular px-3 py-3 text-slate-600 dark:text-slate-400">
                          {u.password}
                        </td>
                        <td className="px-3 py-3 text-right">
                          <button
                            type="button"
                            onClick={() => handleDeleteUser(u)}
                            className="inline-flex items-center gap-1 text-xs font-semibold text-red-600 hover:text-red-700 dark:text-red-400"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                            Hapus
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.section>
  );
};
