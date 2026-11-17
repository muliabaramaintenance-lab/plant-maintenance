import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'motion/react';
import { Cpu, Package, Sun, Moon, Clock, Send, Eye } from 'lucide-react';
import type {
  AppDatabase,
  AppUser,
  ElektrikLog,
  PhotoModalState,
  ThemeMode,
} from '@/src/types/muliabara';
import {
  fmtDT,
  insertElektrikLogRemote,
  isSupabaseConfigured,
  saveLocalDatabase,
  uploadEvidencePhotoRemote,
} from '@/src/lib/supabase';
import { PhotoEvidencePicker } from './PhotoEvidencePicker';
import { OperatorLogisticPanel } from './OperatorLogisticPanel';

interface ElektrikWorkspaceProps {
  db: AppDatabase;
  setDb: React.Dispatch<React.SetStateAction<AppDatabase>>;
  currentUser: AppUser;
  theme: ThemeMode;
  onToggleTheme: () => void;
  onToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
  onOpenPhoto: (modal: PhotoModalState) => void;
}

const PLACEHOLDERS: Record<string, string> = {
  AC: 'cth: AC Ruang Kontrol Plant',
  Lampu: 'cth: Lampu Sorot Pit #1',
  Unit: 'cth: Alternator Genset #1',
  'Komponen Lainnya': 'cth: Panel MCB / Kontaktor',
};

export const ElektrikWorkspace: React.FC<ElektrikWorkspaceProps> = ({
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
  const categories = useMemo(
    () =>
      db.elektrikCategories.length > 0
        ? db.elektrikCategories
        : ['AC', 'Lampu', 'Unit', 'Komponen Lainnya'],
    [db.elektrikCategories]
  );

  const [category, setCategory] = useState<string>(categories[0]);
  const [targetName, setTargetName] = useState<string>('');
  const [action, setAction] = useState<string>('Maintenance');
  const [detail, setDetail] = useState<string>('');
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
    if (!categories.includes(category)) {
      setCategory(categories[0]);
    }
  }, [categories, category]);

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

  const inventorySuggestions = useMemo(
    () => db.elektrikInventory.filter((i) => i.category === category),
    [db.elektrikInventory, category]
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    if (!targetName.trim() || !detail.trim()) {
      setFormError('Lokasi/komponen dan detail pekerjaan wajib diisi.');
      return;
    }
    if (!photoBase64) {
      setFormError(
        'Bukti foto pekerjaan wajib dilampirkan (Kamera HP atau Galeri).'
      );
      return;
    }

    setSubmitting(true);
    try {
      const id = 'E_' + Date.now();
      let finalPhoto = photoBase64;
      if (isSupabaseConfigured && photoBlob) {
        const uploadedUrl = await uploadEvidencePhotoRemote(
          'elektrik',
          id,
          photoBlob
        );
        if (uploadedUrl) finalPhoto = uploadedUrl;
      }

      const entry: ElektrikLog = {
        id,
        timestamp: new Date().toISOString(),
        operatorName: currentUser.name,
        category,
        unitAc: targetName.trim(),
        action,
        detail: detail.trim(),
        photo: finalPhoto,
      };

      if (isSupabaseConfigured) {
        await insertElektrikLogRemote(entry);
      }

      let savedOk = true;
      setDb((prev) => {
        const nextDb: AppDatabase = {
          ...prev,
          elektrikLogs: [...prev.elektrikLogs, entry],
        };
        if (!isSupabaseConfigured) savedOk = saveLocalDatabase(nextDb);
        return nextDb;
      });

      setTargetName('');
      setDetail('');
      setPhotoBase64('');
      setPhotoBlob(null);
      onToast(
        savedOk
          ? 'Laporan Elektrik berhasil tersimpan.'
          : 'Tersimpan di sesi ini (penyimpanan lokal penuh).',
        savedOk ? 'success' : 'info'
      );
    } catch {
      onToast('Gagal menyimpan laporan Elektrik ke server.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const recentLogs = useMemo(
    () => db.elektrikLogs.slice().reverse(),
    [db.elektrikLogs]
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
            <Cpu className="h-3.5 w-3.5" />
            Laporan Elektrik
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
                  Input Laporan Operator Elektrik
                </h2>
                <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                  Pilih kategori (dikelola Admin) serta lokasi/inventaris,
                  tindakan, detail pekerjaan, dan bukti foto wajib.
                </p>
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                <Cpu className="h-4 w-4 text-[#7ab547]" />
                <span>{currentUser.name}</span>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div>
                  <label
                    htmlFor="elk-cat"
                    className="mb-1.5 block text-xs font-semibold text-slate-600 dark:text-slate-400"
                  >
                    Kategori Elektrik
                  </label>
                  <select
                    id="elk-cat"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold text-slate-900 outline-none transition-colors focus:border-[#7ab547] focus:ring-2 focus:ring-[#7ab547]/25 dark:border-slate-700 dark:bg-[#16202a] dark:text-slate-100"
                  >
                    {categories.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="elk-target"
                    className="mb-1.5 block text-xs font-semibold text-slate-600 dark:text-slate-400"
                  >
                    Lokasi / Nama Unit / Inventaris
                  </label>
                  <input
                    id="elk-target"
                    type="text"
                    list="elk-inventory-list"
                    required
                    value={targetName}
                    onChange={(e) => setTargetName(e.target.value)}
                    placeholder={
                      PLACEHOLDERS[category] ||
                      `Ketik / pilih item ${category}`
                    }
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition-colors focus:border-[#7ab547] focus:ring-2 focus:ring-[#7ab547]/25 dark:border-slate-700 dark:bg-[#16202a] dark:text-slate-100"
                  />
                  <datalist id="elk-inventory-list">
                    {inventorySuggestions.map((inv) => (
                      <option
                        key={inv.id}
                        value={`${inv.name} (${inv.location})`}
                      />
                    ))}
                  </datalist>
                </div>

                <div>
                  <label
                    htmlFor="elk-action"
                    className="mb-1.5 block text-xs font-semibold text-slate-600 dark:text-slate-400"
                  >
                    Kategori Tindakan
                  </label>
                  <select
                    id="elk-action"
                    value={action}
                    onChange={(e) => setAction(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition-colors focus:border-[#7ab547] focus:ring-2 focus:ring-[#7ab547]/25 dark:border-slate-700 dark:bg-[#16202a] dark:text-slate-100"
                  >
                    <option value="Maintenance">Maintenance</option>
                    <option value="Diperbaiki">Diperbaiki</option>
                    <option value="Dilepas">Dilepas</option>
                    <option value="Dipasang">Dipasang</option>
                  </select>
                </div>

                <div className="sm:col-span-3">
                  <label
                    htmlFor="elk-detail"
                    className="mb-1.5 block text-xs font-semibold text-slate-600 dark:text-slate-400"
                  >
                    Detail Pekerjaan
                  </label>
                  <textarea
                    id="elk-detail"
                    rows={3}
                    required
                    value={detail}
                    onChange={(e) => setDetail(e.target.value)}
                    placeholder="Detail pekerjaan yang dilakukan..."
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition-colors focus:border-[#7ab547] focus:ring-2 focus:ring-[#7ab547]/25 dark:border-slate-700 dark:bg-[#16202a] dark:text-slate-100"
                  />
                </div>
              </div>

              <PhotoEvidencePicker
                photoBase64={photoBase64}
                onChange={(b64, blob) => {
                  setPhotoBase64(b64);
                  setPhotoBlob(blob);
                }}
                onError={(msg) => onToast(msg, 'error')}
                label="Bukti Foto Pekerjaan Elektrik (Wajib)"
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
                  {submitting ? 'Menyimpan...' : 'Kirim Laporan Elektrik'}
                </button>
              </div>
            </form>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-[#10171f]">
            <div className="mb-4 flex items-center justify-between gap-2">
              <h3 className="font-display text-base font-bold text-slate-900 dark:text-white">
                Riwayat Laporan Elektrik
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
                    <th className="px-3 py-3">Lokasi / Komponen</th>
                    <th className="px-3 py-3">Tindakan</th>
                    <th className="px-3 py-3">Detail Pekerjaan</th>
                    <th className="px-3 py-3">Bukti Foto</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                  {recentLogs.length === 0 ? (
                    <tr>
                      <td
                        colSpan={6}
                        className="px-3 py-8 text-center text-sm text-slate-500 dark:text-slate-400"
                      >
                        Belum ada riwayat laporan elektrik.
                      </td>
                    </tr>
                  ) : (
                    recentLogs.map((e) => (
                      <tr
                        key={e.id}
                        className="transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/40"
                      >
                        <td className="font-mono-tabular whitespace-nowrap px-3 py-3 text-xs text-slate-500 dark:text-slate-400">
                          {fmtDT(e.timestamp)}
                        </td>
                        <td className="px-3 py-3 text-xs font-semibold text-slate-700 dark:text-slate-300">
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
        </>
      )}
    </motion.section>
  );
};
