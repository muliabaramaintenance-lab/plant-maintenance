import React, { useMemo, useState } from 'react';
import { Package, Plus, Trash2, Send, Eye, Search } from 'lucide-react';
import {
  LOGISTIC_UNITS,
  type AppDatabase,
  type AppUser,
  type LogisticItem,
  type LogisticLog,
  type LogisticUnit,
  type PhotoModalState,
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

interface OperatorLogisticPanelProps {
  db: AppDatabase;
  setDb: React.Dispatch<React.SetStateAction<AppDatabase>>;
  currentUser: AppUser;
  onToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
  onOpenPhoto: (modal: PhotoModalState) => void;
}

export const OperatorLogisticPanel: React.FC<OperatorLogisticPanelProps> = ({
  db,
  setDb,
  currentUser,
  onToast,
  onOpenPhoto,
}) => {
  const [picName, setPicName] = useState<string>(currentUser.name);
  const [items, setItems] = useState<LogisticItem[]>([
    { name: '', qty: '', unit: 'pcs' },
  ]);
  const [activeSuggestIdx, setActiveSuggestIdx] = useState<number | null>(null);
  const [photoBase64, setPhotoBase64] = useState<string>('');
  const [photoBlob, setPhotoBlob] = useState<Blob | null>(null);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [formError, setFormError] = useState<string>('');

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

    if (!picName.trim()) {
      setFormError('PIC Nama Pengambil wajib diisi.');
      return;
    }

    const validItems = items
      .map((i) => ({
        name: i.name.trim(),
        qty: i.qty.trim(),
        unit: (i.unit || 'pcs') as LogisticUnit,
      }))
      .filter((i) => i.name.length > 0 && i.qty.length > 0);

    if (validItems.length === 0) {
      setFormError('Minimal masukkan 1 nama barang dan jumlah quantity.');
      return;
    }

    if (!photoBase64) {
      setFormError(
        'Bukti foto pengambilan barang wajib dilampirkan (Kamera atau Galeri).'
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
        type: 'Pengambilan Barang',
        person: picName.trim(),
        items: validItems,
        photo: finalPhoto,
      };

      if (isSupabaseConfigured) {
        await insertLogisticLogRemote(entry);
      }

      const savedOk = (() => {
        let ok = true;
        setDb((prev) => {
          const nextDb: AppDatabase = {
            ...prev,
            logisticLogs: [...prev.logisticLogs, entry],
          };
          if (!isSupabaseConfigured) ok = saveLocalDatabase(nextDb);
          return nextDb;
        });
        return ok;
      })();

      setItems([{ name: '', qty: '', unit: 'pcs' }]);
      setPhotoBase64('');
      setPhotoBlob(null);
      setActiveSuggestIdx(null);

      if (!savedOk) {
        onToast(
          'Pengambilan barang tercatat di sesi ini, namun penyimpanan lokal penuh.',
          'info'
        );
      } else {
        onToast('Pengambilan barang berhasil dicatat.', 'success');
      }
    } catch {
      onToast('Gagal menyimpan transaksi pengambilan barang.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const operatorOutgoingLogs = useMemo(
    () =>
      db.logisticLogs
        .filter((l) => l.type === 'Pengambilan Barang')
        .slice()
        .reverse(),
    [db.logisticLogs]
  );

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-[#10171f]">
        <div className="mb-6 flex flex-col justify-between gap-2 border-b border-slate-200 pb-4 sm:flex-row sm:items-center dark:border-slate-800">
          <div>
            <h2 className="font-display text-xl font-bold tracking-tight text-slate-900 dark:text-white">
              Pengambilan Barang Logistic
            </h2>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
              Khusus pengambilan barang oleh operator. Ketik nama barang untuk
              melihat saran stok dari Barang Masuk.
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
              <label className="mb-1.5 block text-xs font-semibold text-slate-600 dark:text-slate-400">
                Jenis Transaksi
              </label>
              <input
                type="text"
                readOnly
                value="Pengambilan Barang (Keluar)"
                className="w-full cursor-not-allowed rounded-lg border border-slate-200 bg-slate-100 px-3 py-2.5 text-sm font-semibold text-slate-700 dark:border-slate-700 dark:bg-[#16202a] dark:text-slate-300"
              />
            </div>

            <div>
              <label
                htmlFor="op-log-pic"
                className="mb-1.5 block text-xs font-semibold text-slate-600 dark:text-slate-400"
              >
                PIC Nama Pengambil
              </label>
              <input
                id="op-log-pic"
                type="text"
                required
                value={picName}
                onChange={(e) => setPicName(e.target.value)}
                placeholder="Nama lengkap pengambil barang"
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition-colors focus:border-[#7ab547] focus:ring-2 focus:ring-[#7ab547]/25 dark:border-slate-700 dark:bg-[#16202a] dark:text-slate-100"
              />
            </div>
          </div>

          <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-[#090e13]">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-bold tracking-wide text-slate-900 dark:text-slate-200">
                Daftar Barang Diambil (Saran otomatis dari Barang Masuk)
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

            <div className="space-y-3">
              {items.map((item, idx) => {
                const query = item.name.trim().toLowerCase();
                const matches = incomingSuggestions.filter((s) =>
                  query ? s.name.toLowerCase().includes(query) : true
                );

                return (
                  <div
                    key={idx}
                    className="grid grid-cols-12 items-start gap-2.5"
                  >
                    <div className="relative col-span-12 sm:col-span-6">
                      <div className="relative">
                        <Search className="pointer-events-none absolute top-1/2 left-3 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
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
                          placeholder="Cari / ketik nama barang masuk..."
                          className="w-full rounded-lg border border-slate-200 bg-white py-2 pr-3 pl-8 text-sm text-slate-900 outline-none focus:border-[#7ab547] dark:border-slate-700 dark:bg-[#16202a] dark:text-slate-100"
                        />
                      </div>

                      {activeSuggestIdx === idx && matches.length > 0 && (
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
                                Sisa ~{s.available} {s.unit} (Masuk: {s.totalIn}{' '}
                                {s.unit})
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
            label="Bukti Foto Pengambilan Barang (Wajib)"
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
              {submitting ? 'Menyimpan...' : 'Simpan Pengambilan Barang'}
            </button>
          </div>
        </form>
      </div>

      {/* Outgoing History */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-[#10171f]">
        <div className="mb-4 flex items-center justify-between gap-2">
          <h3 className="font-display text-base font-bold text-slate-900 dark:text-white">
            Riwayat Pengambilan Barang
          </h3>
          <span className="font-mono-tabular text-xs text-slate-500 dark:text-slate-400">
            {operatorOutgoingLogs.length} Transaksi
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 text-xs font-semibold text-slate-500 dark:border-slate-800 dark:text-slate-400">
              <tr>
                <th className="px-3 py-3">Tanggal &amp; Waktu</th>
                <th className="px-3 py-3">PIC Pengambil</th>
                <th className="px-3 py-3">Barang &amp; Quantity</th>
                <th className="px-3 py-3">Bukti Foto</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
              {operatorOutgoingLogs.length === 0 ? (
                <tr>
                  <td
                    colSpan={4}
                    className="px-3 py-8 text-center text-sm text-slate-500 dark:text-slate-400"
                  >
                    Belum ada riwayat pengambilan barang.
                  </td>
                </tr>
              ) : (
                operatorOutgoingLogs.map((l) => (
                  <tr
                    key={l.id}
                    className="transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/40"
                  >
                    <td className="font-mono-tabular whitespace-nowrap px-3 py-3 text-xs text-slate-500 dark:text-slate-400">
                      {fmtDT(l.timestamp)}
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
    </div>
  );
};
