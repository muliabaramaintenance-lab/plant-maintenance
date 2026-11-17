import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'motion/react';
import {
  Wrench,
  Zap,
  Truck,
  ClipboardList,
  Package,
  Sun,
  Moon,
  Clock,
  Send,
  Eye,
} from 'lucide-react';
import type {
  AppDatabase,
  AppUser,
  MekanikLog,
  PhotoModalState,
  ThemeMode,
  UnitCategory,
} from '@/src/types/muliabara';
import {
  fmtDT,
  getTodayISO,
  insertMekanikLogRemote,
  isSupabaseConfigured,
  saveLocalDatabase,
  uploadEvidencePhotoRemote,
} from '@/src/lib/supabase';
import { PhotoEvidencePicker } from './PhotoEvidencePicker';
import { OperatorLogisticPanel } from './OperatorLogisticPanel';

interface MekanikWorkspaceProps {
  db: AppDatabase;
  setDb: React.Dispatch<React.SetStateAction<AppDatabase>>;
  currentUser: AppUser;
  theme: ThemeMode;
  onToggleTheme: () => void;
  onToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
  onOpenPhoto: (modal: PhotoModalState) => void;
}

export const MekanikWorkspace: React.FC<MekanikWorkspaceProps> = ({
  db,
  setDb,
  currentUser,
  theme,
  onToggleTheme,
  onToast,
  onOpenPhoto,
}) => {
  const [workspaceTab, setWorkspaceTab] = useState<'laporan' | 'logistic'>(
    'laporan'
  );
  const [category, setCategory] = useState<UnitCategory>('Genset');
  const [unitId, setUnitId] = useState<string>('');
  const [jenis, setJenis] = useState<string>('P2H');
  const [generalJenis, setGeneralJenis] = useState<string>('');
  const [hm, setHm] = useState<string>('');
  const [kwh, setKwh] = useState<string>('');
  const [fuel, setFuel] = useState<string>('');
  const [detail, setDetail] = useState<string>('');
  const [updateLastService, setUpdateLastService] = useState<boolean>(false);
  const [photoBase64, setPhotoBase64] = useState<string>('');
  const [photoBlob, setPhotoBlob] = useState<Blob | null>(null);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [formError, setFormError] = useState<string>('');
  const [clockText, setClockText] = useState<string>(() =>
    new Date().toLocaleString('id-ID', {
      weekday: 'short',
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    })
  );

  useEffect(() => {
    const timer = window.setInterval(() => {
      setClockText(
        new Date().toLocaleString('id-ID', {
          weekday: 'short',
          day: '2-digit',
          month: 'short',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        })
      );
    }, 1000);
    return () => window.clearInterval(timer);
  }, []);

  const filteredUnits = useMemo(
    () =>
      category === 'General'
        ? []
        : db.units.filter((u) => u.category === category),
    [db.units, category]
  );

  const activityOptions = useMemo(
    () =>
      category === 'Genset'
        ? ['P2H', 'Perawatan Harian', 'Service Berkala', 'Perbaikan / Trouble']
        : ['Perawatan Harian', 'Service Berkala', 'Perbaikan / Trouble'],
    [category]
  );

  useEffect(() => {
    if (category === 'General') {
      setUnitId('');
      setHm('');
      setKwh('');
      setFuel('');
      setUpdateLastService(false);
      return;
    }
    if (filteredUnits.length > 0) {
      if (!filteredUnits.some((u) => u.id === unitId)) {
        setUnitId(filteredUnits[0].id);
      }
    } else {
      setUnitId('');
    }
  }, [filteredUnits, unitId, category]);

  useEffect(() => {
    if (category !== 'General' && !activityOptions.includes(jenis)) {
      setJenis(activityOptions[0]);
    }
    if (category === 'Alat Berat') {
      setKwh('');
    }
  }, [category, activityOptions, jenis]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!photoBase64) {
      setFormError(
        'Bukti foto pekerjaan wajib dilampirkan (Kamera HP atau Galeri).'
      );
      return;
    }

    if (category === 'General') {
      if (!generalJenis.trim()) {
        setFormError('Jenis pekerjaan umum wajib diisi.');
        return;
      }
      if (!detail.trim()) {
        setFormError('Keterangan pekerjaan wajib diisi.');
        return;
      }

      setSubmitting(true);
      try {
        const id = 'M_' + Date.now();
        let finalPhoto = photoBase64;
        if (isSupabaseConfigured && photoBlob) {
          const uploadedUrl = await uploadEvidencePhotoRemote(
            'mekanik',
            id,
            photoBlob
          );
          if (uploadedUrl) finalPhoto = uploadedUrl;
        }

        const entry: MekanikLog = {
          id,
          timestamp: new Date().toISOString(),
          operatorName: currentUser.name,
          unitId: '',
          unitCategory: 'General',
          unitName: 'Pekerjaan Umum',
          jenis: generalJenis.trim(),
          hm: null,
          kwh: null,
          fuel: null,
          detail: detail.trim(),
          photo: finalPhoto,
        };

        if (isSupabaseConfigured) {
          await insertMekanikLogRemote(entry);
        }

        let savedOk = true;
        setDb((prev) => {
          const nextDb: AppDatabase = {
            ...prev,
            mekanikLogs: [...prev.mekanikLogs, entry],
          };
          if (!isSupabaseConfigured) savedOk = saveLocalDatabase(nextDb);
          return nextDb;
        });

        setGeneralJenis('');
        setDetail('');
        setPhotoBase64('');
        setPhotoBlob(null);
        onToast(
          savedOk
            ? 'Laporan pekerjaan General tersimpan.'
            : 'Tersimpan di sesi ini (penyimpanan lokal penuh).',
          savedOk ? 'success' : 'info'
        );
      } catch {
        onToast('Gagal menyimpan laporan pekerjaan General.', 'error');
      } finally {
        setSubmitting(false);
      }
      return;
    }

    if (!unitId) {
      setFormError(`Belum ada unit ${category} yang terdaftar.`);
      return;
    }

    const hmNum = Number(hm);
    const fuelNum = Number(fuel);
    const kwhNum = category === 'Genset' ? Number(kwh) : null;

    if (Number.isNaN(hmNum) || hmNum < 0) {
      setFormError('Nilai HM (Hour Meter) tidak valid.');
      return;
    }
    if (Number.isNaN(fuelNum) || fuelNum < 0) {
      setFormError('Nilai konsumsi Fuel (Liter) tidak valid.');
      return;
    }
    if (
      category === 'Genset' &&
      (kwhNum === null || Number.isNaN(kwhNum) || kwhNum < 0)
    ) {
      setFormError('Nilai KWH untuk unit Genset wajib diisi dengan angka valid.');
      return;
    }

    setSubmitting(true);
    try {
      const id = 'M_' + Date.now();
      let finalPhoto = photoBase64;
      if (isSupabaseConfigured && photoBlob) {
        const uploadedUrl = await uploadEvidencePhotoRemote(
          'mekanik',
          id,
          photoBlob
        );
        if (uploadedUrl) finalPhoto = uploadedUrl;
      }

      const unit = db.units.find((u) => u.id === unitId);
      const shouldUpdateService =
        updateLastService || jenis === 'Service Berkala';
      const newLastService = `${getTodayISO()} (HM ${hmNum})`;

      const entry: MekanikLog = {
        id,
        timestamp: new Date().toISOString(),
        operatorName: currentUser.name,
        unitId,
        unitCategory: category,
        unitName: unit ? unit.name : '-',
        jenis,
        hm: hmNum,
        kwh: kwhNum,
        fuel: fuelNum,
        detail: detail.trim(),
        photo: finalPhoto,
      };

      if (isSupabaseConfigured) {
        await insertMekanikLogRemote(
          entry,
          unit
            ? {
                unitId: unit.id,
                currentHm: hmNum,
                lastService: shouldUpdateService ? newLastService : undefined,
              }
            : undefined
        );
      }

      let savedOk = true;
      setDb((prev) => {
        const nextUnits = prev.units.map((u) =>
          u.id === unitId
            ? {
                ...u,
                currentHm: hmNum,
                lastService: shouldUpdateService
                  ? newLastService
                  : u.lastService,
              }
            : u
        );
        const nextDb: AppDatabase = {
          ...prev,
          units: nextUnits,
          mekanikLogs: [...prev.mekanikLogs, entry],
        };
        if (!isSupabaseConfigured) savedOk = saveLocalDatabase(nextDb);
        return nextDb;
      });

      setHm('');
      setKwh('');
      setFuel('');
      setDetail('');
      setPhotoBase64('');
      setPhotoBlob(null);
      setUpdateLastService(false);
      onToast(
        savedOk
          ? 'Laporan Mekanik berhasil tersimpan.'
          : 'Tersimpan di sesi ini (penyimpanan lokal penuh).',
        savedOk ? 'success' : 'info'
      );
    } catch {
      onToast('Gagal menyimpan laporan Mekanik ke server.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const recentLogs = useMemo(
    () => db.mekanikLogs.slice().reverse(),
    [db.mekanikLogs]
  );

  return (
    <motion.section
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
      className="space-y-6"
    >
      {/* Workspace Navigation & Utility Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-[#10171f]">
        <div className="flex flex-wrap items-center gap-1.5 rounded-lg bg-slate-100 p-1 dark:bg-[#090e13]">
          <button
            type="button"
            onClick={() => setWorkspaceTab('laporan')}
            className={`inline-flex items-center gap-2 rounded-md px-3.5 py-2 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
              workspaceTab === 'laporan'
                ? 'bg-white text-slate-900 shadow-xs dark:bg-[#19325d] dark:text-white'
                : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
            }`}
          >
            <Wrench className="h-3.5 w-3.5" />
            Laporan Mekanik
          </button>
          <button
            type="button"
            onClick={() => setWorkspaceTab('logistic')}
            className={`inline-flex items-center gap-2 rounded-md px-3.5 py-2 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
              workspaceTab === 'logistic'
                ? 'bg-white text-slate-900 shadow-xs dark:bg-[#19325d] dark:text-white'
                : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
            }`}
          >
            <Package className="h-3.5 w-3.5" />
            Pengambilan Barang (Logistic)
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400">
            <Clock className="h-3.5 w-3.5 text-[#7ab547]" />
            <span className="font-mono-tabular">{clockText}</span>
          </div>
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
        </div>
      </div>

      {workspaceTab === 'logistic' ? (
        <OperatorLogisticPanel
          db={db}
          setDb={setDb}
          currentUser={currentUser}
          onToast={onToast}
          onOpenPhoto={onOpenPhoto}
        />
      ) : (
        <>
          <div className="rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-[#10171f]">
            <div className="mb-6 flex flex-col justify-between gap-2 border-b border-slate-200 pb-4 sm:flex-row sm:items-center dark:border-slate-800">
              <div>
                <h2 className="font-display text-xl font-bold tracking-tight text-slate-900 dark:text-white">
                  Input Laporan Operator Mekanik
                </h2>
                <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                  Pilih Genset, Alat Berat, atau General (pekerjaan umum tanpa
                  perhitungan). Semua laporan wajib melampirkan bukti foto.
                </p>
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                <Wrench className="h-4 w-4 text-[#7ab547]" />
                <span>{currentUser.name}</span>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="mb-2 block text-xs font-semibold tracking-wide text-slate-600 dark:text-slate-400">
                  01. Pilih Kategori Unit
                </label>
                <div className="grid max-w-xl grid-cols-3 gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setCategory('Genset');
                      setFormError('');
                    }}
                    className={`inline-flex items-center justify-center gap-2 rounded-lg border px-3 py-3 text-xs font-semibold transition-all sm:text-sm whitespace-nowrap ${
                      category === 'Genset'
                        ? 'border-[#7ab547] bg-[#19325d] text-white dark:bg-[#7ab547] dark:text-[#090e13]'
                        : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-[#16202a] dark:text-slate-300 dark:hover:bg-slate-800'
                    }`}
                  >
                    <Zap className="h-4 w-4 shrink-0" />
                    Genset
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setCategory('Alat Berat');
                      setFormError('');
                    }}
                    className={`inline-flex items-center justify-center gap-2 rounded-lg border px-3 py-3 text-xs font-semibold transition-all sm:text-sm whitespace-nowrap ${
                      category === 'Alat Berat'
                        ? 'border-[#7ab547] bg-[#19325d] text-white dark:bg-[#7ab547] dark:text-[#090e13]'
                        : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-[#16202a] dark:text-slate-300 dark:hover:bg-slate-800'
                    }`}
                  >
                    <Truck className="h-4 w-4 shrink-0" />
                    Alat Berat
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setCategory('General');
                      setFormError('');
                    }}
                    className={`inline-flex items-center justify-center gap-2 rounded-lg border px-3 py-3 text-xs font-semibold transition-all sm:text-sm whitespace-nowrap ${
                      category === 'General'
                        ? 'border-[#7ab547] bg-[#19325d] text-white dark:bg-[#7ab547] dark:text-[#090e13]'
                        : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-[#16202a] dark:text-slate-300 dark:hover:bg-slate-800'
                    }`}
                  >
                    <ClipboardList className="h-4 w-4 shrink-0" />
                    General
                  </button>
                </div>
              </div>

              {category === 'General' ? (
                <div className="grid grid-cols-1 gap-4">
                  <div>
                    <label
                      htmlFor="mek-general-jenis"
                      className="mb-1.5 block text-xs font-semibold text-slate-600 dark:text-slate-400"
                    >
                      02. Jenis Pekerjaan (Ketik Bebas)
                    </label>
                    <input
                      id="mek-general-jenis"
                      type="text"
                      required
                      value={generalJenis}
                      onChange={(e) => setGeneralJenis(e.target.value)}
                      placeholder="Ketik jenis pekerjaan umum, cth: Fabrikasi dudukan pipa / Pembersihan area workshop"
                      className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition-colors focus:border-[#7ab547] focus:ring-2 focus:ring-[#7ab547]/25 dark:border-slate-700 dark:bg-[#16202a] dark:text-slate-100"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="mek-general-detail"
                      className="mb-1.5 block text-xs font-semibold text-slate-600 dark:text-slate-400"
                    >
                      03. Keterangan Pekerjaan
                    </label>
                    <textarea
                      id="mek-general-detail"
                      rows={3}
                      required
                      value={detail}
                      onChange={(e) => setDetail(e.target.value)}
                      placeholder="Tuliskan keterangan pekerjaan yang telah dilakukan..."
                      className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition-colors focus:border-[#7ab547] focus:ring-2 focus:ring-[#7ab547]/25 dark:border-slate-700 dark:bg-[#16202a] dark:text-slate-100"
                    />
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  <div>
                    <label
                      htmlFor="mek-unit"
                      className="mb-1.5 block text-xs font-semibold text-slate-600 dark:text-slate-400"
                    >
                      02. Pilih Unit {category}
                    </label>
                    <select
                      id="mek-unit"
                      value={unitId}
                      onChange={(e) => setUnitId(e.target.value)}
                      required
                      className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition-colors focus:border-[#7ab547] focus:ring-2 focus:ring-[#7ab547]/25 dark:border-slate-700 dark:bg-[#16202a] dark:text-slate-100"
                    >
                      {filteredUnits.length === 0 ? (
                        <option value="">
                          -- Belum ada unit {category} --
                        </option>
                      ) : (
                        filteredUnits.map((u) => (
                          <option key={u.id} value={u.id}>
                            {u.name} ({u.status} · HM {u.currentHm})
                          </option>
                        ))
                      )}
                    </select>
                  </div>

                  <div>
                    <label
                      htmlFor="mek-jenis"
                      className="mb-1.5 block text-xs font-semibold text-slate-600 dark:text-slate-400"
                    >
                      03. Jenis Aktivitas
                    </label>
                    <select
                      id="mek-jenis"
                      value={jenis}
                      onChange={(e) => setJenis(e.target.value)}
                      className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition-colors focus:border-[#7ab547] focus:ring-2 focus:ring-[#7ab547]/25 dark:border-slate-700 dark:bg-[#16202a] dark:text-slate-100"
                    >
                      {activityOptions.map((opt) => (
                        <option key={opt} value={opt}>
                          {opt}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label
                      htmlFor="mek-hm"
                      className="mb-1.5 block text-xs font-semibold text-slate-600 dark:text-slate-400"
                    >
                      HM (Hour Meter)
                    </label>
                    <input
                      id="mek-hm"
                      type="number"
                      step="0.1"
                      min="0"
                      required
                      value={hm}
                      onChange={(e) => setHm(e.target.value)}
                      placeholder="cth: 1255.5"
                      className="font-mono-tabular w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition-colors focus:border-[#7ab547] focus:ring-2 focus:ring-[#7ab547]/25 dark:border-slate-700 dark:bg-[#16202a] dark:text-slate-100"
                    />
                  </div>

                  {category === 'Genset' && (
                    <div>
                      <label
                        htmlFor="mek-kwh"
                        className="mb-1.5 block text-xs font-semibold text-slate-600 dark:text-slate-400"
                      >
                        KWH Output
                      </label>
                      <input
                        id="mek-kwh"
                        type="number"
                        step="0.1"
                        min="0"
                        required
                        value={kwh}
                        onChange={(e) => setKwh(e.target.value)}
                        placeholder="cth: 450"
                        className="font-mono-tabular w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition-colors focus:border-[#7ab547] focus:ring-2 focus:ring-[#7ab547]/25 dark:border-slate-700 dark:bg-[#16202a] dark:text-slate-100"
                      />
                    </div>
                  )}

                  <div>
                    <label
                      htmlFor="mek-fuel"
                      className="mb-1.5 block text-xs font-semibold text-slate-600 dark:text-slate-400"
                    >
                      Fuel (Liter)
                    </label>
                    <input
                      id="mek-fuel"
                      type="number"
                      step="0.1"
                      min="0"
                      required
                      value={fuel}
                      onChange={(e) => setFuel(e.target.value)}
                      placeholder="cth: 120"
                      className="font-mono-tabular w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition-colors focus:border-[#7ab547] focus:ring-2 focus:ring-[#7ab547]/25 dark:border-slate-700 dark:bg-[#16202a] dark:text-slate-100"
                    />
                  </div>

                  <div className="flex items-end pb-2">
                    <label className="flex cursor-pointer items-center gap-2.5 text-sm text-slate-700 dark:text-slate-300">
                      <input
                        type="checkbox"
                        checked={updateLastService}
                        onChange={(e) => setUpdateLastService(e.target.checked)}
                        className="h-4 w-4 rounded border-slate-300 accent-[#7ab547]"
                      />
                      <span>
                        Perbarui <strong>Last Service</strong> otomatis
                      </span>
                    </label>
                  </div>

                  <div className="sm:col-span-2 lg:col-span-3">
                    <label
                      htmlFor="mek-detail"
                      className="mb-1.5 block text-xs font-semibold text-slate-600 dark:text-slate-400"
                    >
                      Detail Pekerjaan Dilakukan
                    </label>
                    <textarea
                      id="mek-detail"
                      rows={3}
                      required
                      value={detail}
                      onChange={(e) => setDetail(e.target.value)}
                      placeholder="Rincian P2H / Perawatan Harian / Service..."
                      className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition-colors focus:border-[#7ab547] focus:ring-2 focus:ring-[#7ab547]/25 dark:border-slate-700 dark:bg-[#16202a] dark:text-slate-100"
                    />
                  </div>
                </div>
              )}

              <PhotoEvidencePicker
                photoBase64={photoBase64}
                onChange={(b64, blob) => {
                  setPhotoBase64(b64);
                  setPhotoBlob(blob);
                }}
                onError={(msg) => onToast(msg, 'error')}
                label="Bukti Foto Pekerjaan (Wajib)"
              />

              {formError && (
                <p className="text-xs font-semibold text-red-600 dark:text-red-400">
                  {formError}
                </p>
              )}

              <div>
                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex items-center gap-2 rounded-lg bg-[#19325d] px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#122547] disabled:opacity-60 dark:bg-[#7ab547] dark:text-[#090e13] dark:hover:bg-[#82c341] whitespace-nowrap"
                >
                  <Send className="h-4 w-4" />
                  {submitting ? 'Menyimpan...' : 'Kirim Laporan Mekanik'}
                </button>
              </div>
            </form>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-[#10171f]">
            <div className="mb-4 flex items-center justify-between gap-2">
              <h3 className="font-display text-base font-bold text-slate-900 dark:text-white">
                Riwayat Laporan Mekanik
              </h3>
              <span className="font-mono-tabular text-xs text-slate-500 dark:text-slate-400">
                {recentLogs.length} Entri
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-slate-200 text-xs font-semibold text-slate-500 dark:border-slate-800 dark:text-slate-400">
                  <tr>
                    <th className="px-3 py-3">Tanggal &amp; Waktu</th>
                    <th className="px-3 py-3">Kategori</th>
                    <th className="px-3 py-3">Unit / Area</th>
                    <th className="px-3 py-3">Jenis Pekerjaan</th>
                    <th className="px-3 py-3 text-right">HM</th>
                    <th className="px-3 py-3 text-right">KWH</th>
                    <th className="px-3 py-3 text-right">Fuel (L)</th>
                    <th className="px-3 py-3">Keterangan</th>
                    <th className="px-3 py-3">Bukti Foto</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                  {recentLogs.length === 0 ? (
                    <tr>
                      <td
                        colSpan={9}
                        className="px-3 py-8 text-center text-sm text-slate-500 dark:text-slate-400"
                      >
                        Belum ada riwayat laporan mekanik.
                      </td>
                    </tr>
                  ) : (
                    recentLogs.map((m) => {
                      const cat =
                        m.unitCategory ||
                        db.units.find((u) => u.id === m.unitId)?.category ||
                        '-';
                      const isGeneral = cat === 'General';
                      return (
                        <tr
                          key={m.id}
                          className="transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/40"
                        >
                          <td className="font-mono-tabular whitespace-nowrap px-3 py-3 text-xs text-slate-500 dark:text-slate-400">
                            {fmtDT(m.timestamp)}
                          </td>
                          <td className="px-3 py-3 text-xs font-semibold text-slate-700 dark:text-slate-300">
                            {cat}
                          </td>
                          <td className="px-3 py-3 font-semibold text-slate-900 dark:text-white">
                            {m.unitName}
                          </td>
                          <td className="px-3 py-3 text-xs text-slate-600 dark:text-slate-300">
                            {m.jenis}
                          </td>
                          <td className="font-mono-tabular px-3 py-3 text-right text-xs text-slate-800 dark:text-slate-200">
                            {isGeneral || m.hm === null ? '-' : m.hm}
                          </td>
                          <td className="font-mono-tabular px-3 py-3 text-right text-xs text-slate-800 dark:text-slate-200">
                            {isGeneral ||
                            cat === 'Alat Berat' ||
                            m.kwh === null
                              ? '-'
                              : m.kwh}
                          </td>
                          <td className="font-mono-tabular px-3 py-3 text-right text-xs text-slate-800 dark:text-slate-200">
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
        </>
      )}
    </motion.section>
  );
};
