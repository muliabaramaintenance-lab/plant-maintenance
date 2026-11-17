import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'motion/react';
import {
  Package,
  Plus,
  Trash2,
  Sun,
  Moon,
  Clock,
  Send,
  Eye,
  Search,
} from 'lucide-react';
import {
  LOGISTIC_UNITS,
  type AppDatabase,
  type AppUser,
  type LogisticItem,
  type LogisticLog,
  type LogisticUnit,
  type PhotoModalState,
  type ThemeMode,
} from '@/src/types/muliabara';
import {
  fmtDT,
  formatLogisticItemQty,
  getIncomingGoodsSuggestions,
  insertLogisticLogRemote,
  isSupabaseConfigured,
  saveLocalDatabase,
  uploadEvidencePhotoRemote,
} from '@/src/lib/supabase';
import { PhotoEvidencePicker } from './PhotoEvidencePicker';

interface LogisticWorkspaceProps {
  db: AppDatabase;
  setDb: React.Dispatch<React.SetStateAction<AppDatabase>>;
  currentUser: AppUser;
  theme: ThemeMode;
  onToggleTheme: () => void;
  onToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
  onOpenPhoto: (modal: PhotoModalState) => void;
}

export const LogisticWorkspace: React.FC<LogisticWorkspaceProps> = ({
  db,
  setDb,
  currentUser,
  theme,
  onToggleTheme,
  onToast,
  onOpenPhoto,
}) => {
  const [type, setType] = useState<'Pengambilan Barang' | 'Barang Masuk'>(
    'Barang Masuk'
  );
  const [person, setPerson] = useState<string>('');
  const [items, setItems] = useState<LogisticItem[]>([
    { name: '', qty: '', unit: 'pcs' },
  ]);
  const [activeSuggestIdx, setActiveSuggestIdx] = useState<number | null>(null);
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

  const incomingSuggestions = useMemo(
    () => getIncomingGoodsSuggestions(db.logisticLogs),
    [db.logisticLogs]
  );

  const handleAddRow = () => {
    setItems((prev) => [...prev, { name: '', qty: '', unit: 'pcs' }]);
  };

  const handleRemoveRow = (index: number) => {
    if (items.length <= 1) {
      onToast('Minimal harus ada 1 baris barang.', 'info');
      return;
    }
    setItems((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleItemChange = (
    index: number,
    field: keyof LogisticItem,
    value: string
  ) => {
    setItems((prev) =>
      prev.map((item, idx) =>
        idx === index ? { ...item, [field]: value } : item
      )
    );
  };

  const handleSelectSuggestion = (
    index: number,
    name: string,
    unit: LogisticUnit
  ) => {
    setItems((prev) =>
      prev.map((item, idx) =>
        idx === index ? { ...item, name, unit } : item
      )
    );
    setActiveSuggestIdx(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    const validItems = items
      .map((i) => ({
        name: i.name.trim(),
        qty: i.qty.trim(),
        unit: (i.unit || 'pcs') as LogisticUnit,
      }))
      .filter((i) => i.name.length > 0 && i.qty.length > 0);

    if (validItems.length === 0) {
      setFormError('Minimal masukkan 1 nama barang dan quantity.');
      return;
    }

    if (!photoBase64) {
      setFormError(
        'Bukti foto barang wajib dilampirkan untuk Pengambilan Barang maupun Barang Masuk.'
      );
      return;
    }

    setSubmitting(true);
    try {
      const id = 'L_' + Date.now();
      let finalPhoto = photoBase64;

      if (isSupabaseConfigured && photoBlob) {
        const uploadedUrl = await uploadEvidencePhotoRemote(
          'logistic',
          id,
          photoBlob
        );
        if (uploadedUrl) finalPhoto = uploadedUrl;
      }

      const entry: LogisticLog = {
        id,
        timestamp: new Date().toISOString(),
        petugas: currentUser.name,
        type,
        person: person.trim(),
        items: validItems,
        photo: finalPhoto,
      };

      if (isSupabaseConfigured) {
        await insertLogisticLogRemote(entry);
      }

      let savedOk = true;
      setDb((prev) => {
        const nextDb: AppDatabase = {
          ...prev,
          logisticLogs: [...prev.logisticLogs, entry],
        };
        if (!isSupabaseConfigured) {
          savedOk = saveLocalDatabase(nextDb);
        }
        return nextDb;
      });

      setPerson('');
      setItems([{ name: '', qty: '', unit: 'pcs' }]);
      setPhotoBase64('');
      setPhotoBlob(null);
      setActiveSuggestIdx(null);

      if (!savedOk) {
        onToast(
          'Transaksi tersimpan di sesi ini, namun kapasitas penyimpanan lokal penuh.',
          'info'
        );
      } else {
        onToast('Transaksi Logistic berhasil tersimpan.', 'success');
      }
    } catch {
      onToast('Gagal menyimpan transaksi Logistic ke server.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const recentLogs = useMemo(
    () => db.logisticLogs.slice().reverse(),
    [db.logisticLogs]
  );

  return (
    <motion.section
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
      className="space-y-6"
    >
      {/* Workspace Utility Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 dark:border-slate-800 dark:bg-[#10171f]">
        <div className="flex items-center gap-2.5 text-xs text-slate-600 dark:text-slate-400">
          <Clock className="h-3.5 w-3.5 text-[#7ab547]" />
          <span className="font-mono-tabular">{clockText}</span>
          <span aria-hidden="true">·</span>
          <span>
            {isSupabaseConfigured ? 'Sinkronisasi Supabase' : 'Mode Demo Lokal'}
          </span>
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

      {/* Form Card */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-[#10171f]">
        <div className="mb-6 flex flex-col justify-between gap-2 border-b border-slate-200 pb-4 sm:flex-row sm:items-center dark:border-slate-800">
          <div>
            <h2 className="font-display text-xl font-bold tracking-tight text-slate-900 dark:text-white">
              Input Transaksi Logistic
            </h2>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
              Barang Masuk &amp; Pengambilan Barang dengan pilihan satuan
              (pcs, unit, set, liter, kodi, roll, kg, ball), PIC, dan bukti
              foto wajib.
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
            <Package className="h-4 w-4 text-[#7ab547]" />
            <span>{currentUser.name}</span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label
                htmlFor="log-type"
                className="mb-1.5 block text-xs font-semibold text-slate-600 dark:text-slate-400"
              >
                Jenis Transaksi
              </label>
              <select
                id="log-type"
                value={type}
                onChange={(e) =>
                  setType(
                    e.target.value as 'Pengambilan Barang' | 'Barang Masuk'
                  )
                }
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold text-slate-900 outline-none transition-colors focus:border-[#7ab547] focus:ring-2 focus:ring-[#7ab547]/25 dark:border-slate-700 dark:bg-[#16202a] dark:text-slate-100"
              >
                <option value="Barang Masuk">Barang Masuk</option>
                <option value="Pengambilan Barang">
                  Pengambilan Barang (Keluar)
                </option>
              </select>
            </div>

            <div>
              <label
                htmlFor="log-person"
                className="mb-1.5 block text-xs font-semibold text-slate-600 dark:text-slate-400"
              >
                {type === 'Barang Masuk'
                  ? 'PIC Penerima / Sumber Supplier'
                  : 'PIC Nama Pengambil Barang'}
              </label>
              <input
                id="log-person"
                type="text"
                required
                value={person}
                onChange={(e) => setPerson(e.target.value)}
                placeholder={
                  type === 'Barang Masuk'
                    ? 'cth: Sari / PT Sumber Sparepart'
                    : 'cth: Ahmad (Mekanik)'
                }
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition-colors focus:border-[#7ab547] focus:ring-2 focus:ring-[#7ab547]/25 dark:border-slate-700 dark:bg-[#16202a] dark:text-slate-100"
              />
            </div>
          </div>

          <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-[#090e13]">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-bold tracking-wide text-slate-900 dark:text-slate-200">
                Daftar Barang, Quantity &amp; Satuan
              </span>
              <button
                type="button"
                onClick={handleAddRow}
                className="inline-flex items-center gap-1.5 rounded-lg bg-[#19325d] px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-[#122547] dark:bg-[#7ab547] dark:text-[#090e13] dark:hover:bg-[#82c341] whitespace-nowrap"
              >
                <Plus className="h-3.5 w-3.5" />
                Tambah Baris
              </button>
            </div>

            <div className="space-y-2.5">
              {items.map((item, idx) => {
                const query = item.name.trim().toLowerCase();
                const matches =
                  type === 'Pengambilan Barang'
                    ? incomingSuggestions.filter((s) =>
                        query ? s.name.toLowerCase().includes(query) : true
                      )
                    : [];

                return (
                  <div
                    key={idx}
                    className="grid grid-cols-12 items-start gap-2.5"
                  >
                    <div className="relative col-span-12 sm:col-span-6">
                      <div className="relative">
                        {type === 'Pengambilan Barang' && (
                          <Search className="pointer-events-none absolute top-1/2 left-3 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                        )}
                        <input
                          type="text"
                          required
                          value={item.name}
                          onFocus={() => setActiveSuggestIdx(idx)}
                          onBlur={() =>
                            window.setTimeout(
                              () =>
                                setActiveSuggestIdx((cur) =>
                                  cur === idx ? null : cur
                                ),
                              150
                            )
                          }
                          onChange={(e) => {
                            handleItemChange(idx, 'name', e.target.value);
                            setActiveSuggestIdx(idx);
                          }}
                          placeholder={
                            type === 'Pengambilan Barang'
                              ? 'Cari / ketik barang masuk...'
                              : 'Nama Barang'
                          }
                          className={`w-full rounded-lg border border-slate-200 bg-white py-2 pr-3 text-sm text-slate-900 outline-none focus:border-[#7ab547] dark:border-slate-700 dark:bg-[#16202a] dark:text-slate-100 ${
                            type === 'Pengambilan Barang' ? 'pl-8' : 'pl-3'
                          }`}
                        />
                      </div>

                      {type === 'Pengambilan Barang' &&
                        activeSuggestIdx === idx &&
                        matches.length > 0 && (
                          <div className="absolute z-20 mt-1 max-h-48 w-full overflow-y-auto rounded-lg border border-slate-200 bg-white py-1 shadow-lg dark:border-slate-700 dark:bg-[#10171f]">
                            {matches.map((s) => (
                              <button
                                key={`${s.name}-${s.unit}`}
                                type="button"
                                onMouseDown={(ev) => {
                                  ev.preventDefault();
                                  handleSelectSuggestion(idx, s.name, s.unit);
                                }}
                                className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-xs transition-colors hover:bg-slate-100 dark:hover:bg-slate-800"
                              >
                                <span className="font-semibold text-slate-900 dark:text-white">
                                  {s.name}
                                </span>
                                <span className="font-mono-tabular text-slate-500 dark:text-slate-400">
                                  Sisa ~{s.available} {s.unit}
                                </span>
                              </button>
                            ))}
                          </div>
                        )}
                    </div>

                    <div className="col-span-5 sm:col-span-2">
                      <input
                        type="text"
                        required
                        value={item.qty}
                        onChange={(e) =>
                          handleItemChange(idx, 'qty', e.target.value)
                        }
                        placeholder="Qty"
                        className="font-mono-tabular w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-[#7ab547] dark:border-slate-700 dark:bg-[#16202a] dark:text-slate-100"
                      />
                    </div>

                    <div className="col-span-5 sm:col-span-3">
                      <select
                        value={item.unit || 'pcs'}
                        onChange={(e) =>
                          handleItemChange(idx, 'unit', e.target.value)
                        }
                        aria-label="Satuan barang"
                        className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-[#7ab547] dark:border-slate-700 dark:bg-[#16202a] dark:text-slate-100"
                      >
                        {LOGISTIC_UNITS.map((u) => (
                          <option key={u} value={u}>
                            {u}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="col-span-2 flex justify-end sm:col-span-1">
                      <button
                        type="button"
                        onClick={() => handleRemoveRow(idx)}
                        aria-label={`Hapus baris ${idx + 1}`}
                        className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/40 dark:hover:text-red-400"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <PhotoEvidencePicker
            photoBase64={photoBase64}
            onChange={(b64, blob) => {
              setPhotoBase64(b64);
              setPhotoBlob(blob);
            }}
            onError={(msg) => onToast(msg, 'error')}
            label={`Bukti Foto ${type} (Wajib)`}
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
              className="inline-flex items-center gap-2 rounded-lg bg-[#7ab547] px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#699e3b] disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#7ab547] dark:text-[#090e13] whitespace-nowrap"
            >
              <Send className="h-4 w-4" />
              {submitting ? 'Menyimpan...' : 'Simpan Transaksi Logistic'}
            </button>
          </div>
        </form>
      </div>

      {/* History Table */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-[#10171f]">
        <div className="mb-4 flex items-center justify-between gap-2">
          <h3 className="font-display text-base font-bold text-slate-900 dark:text-white">
            Riwayat Barang Masuk &amp; Pengambilan Barang
          </h3>
          <span className="font-mono-tabular text-xs text-slate-500 dark:text-slate-400">
            {recentLogs.length} Transaksi
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 text-xs font-semibold text-slate-500 dark:border-slate-800 dark:text-slate-400">
              <tr>
                <th className="px-3 py-3">Tanggal &amp; Waktu</th>
                <th className="px-3 py-3">Jenis</th>
                <th className="px-3 py-3">PIC Pengambil / Sumber</th>
                <th className="px-3 py-3">Barang &amp; Quantity</th>
                <th className="px-3 py-3">Bukti Foto</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
              {recentLogs.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-3 py-8 text-center text-sm text-slate-500 dark:text-slate-400"
                  >
                    Belum ada transaksi logistik.
                  </td>
                </tr>
              ) : (
                recentLogs.map((l) => (
                  <tr
                    key={l.id}
                    className="transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/40"
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
    </motion.section>
  );
};
