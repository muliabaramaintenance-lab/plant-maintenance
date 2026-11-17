import React, { useId, useRef } from 'react';
import { Camera, Image as ImageIcon, Trash2 } from 'lucide-react';
import { compressImageFile } from '@/src/lib/supabase';

interface PhotoEvidencePickerProps {
  photoBase64: string;
  onChange: (base64: string, blob: Blob | null) => void;
  onError: (msg: string) => void;
  label?: string;
  required?: boolean;
}

export const PhotoEvidencePicker: React.FC<PhotoEvidencePickerProps> = ({
  photoBase64,
  onChange,
  onError,
  label = 'Bukti Foto (Wajib)',
  required = true,
}) => {
  const uid = useId();
  const cameraInputRef = useRef<HTMLInputElement | null>(null);
  const galleryInputRef = useRef<HTMLInputElement | null>(null);

  const handleFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const compressed = await compressImageFile(file);
      onChange(compressed.base64, compressed.blob);
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Gambar tidak valid.');
    } finally {
      e.target.value = '';
    }
  };

  const handleClear = () => {
    onChange('', null);
    if (cameraInputRef.current) cameraInputRef.current.value = '';
    if (galleryInputRef.current) galleryInputRef.current.value = '';
  };

  return (
    <div className="space-y-2.5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="block text-xs font-semibold text-slate-600 dark:text-slate-400">
          {label}
          {required && <span className="ml-1 text-red-500">*</span>}
        </span>
        <span className="text-xs text-slate-500 dark:text-slate-400">
          {photoBase64 ? 'Foto siap dilampirkan' : 'Pilih Kamera HP atau Galeri'}
        </span>
      </div>

      <div className="flex flex-wrap items-center gap-2.5">
        <label
          htmlFor={`cam-${uid}`}
          className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-slate-200 bg-[#19325d] px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-[#122547] focus-within:ring-2 focus-within:ring-[#7ab547] dark:border-slate-700 dark:bg-[#7ab547] dark:text-[#090e13] dark:hover:bg-[#82c341] whitespace-nowrap"
        >
          <Camera className="h-4 w-4" />
          Kamera HP Langsung
        </label>
        <input
          ref={cameraInputRef}
          id={`cam-${uid}`}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handleFileSelected}
          className="sr-only"
        />

        <label
          htmlFor={`gal-${uid}`}
          className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-4 py-2 text-xs font-semibold text-slate-800 transition-colors hover:bg-slate-100 focus-within:ring-2 focus-within:ring-[#7ab547] dark:border-slate-700 dark:bg-[#16202a] dark:text-slate-200 dark:hover:bg-slate-800 whitespace-nowrap"
        >
          <ImageIcon className="h-4 w-4 text-[#7ab547]" />
          Pilih dari Galeri
        </label>
        <input
          ref={galleryInputRef}
          id={`gal-${uid}`}
          type="file"
          accept="image/*"
          onChange={handleFileSelected}
          className="sr-only"
        />

        {photoBase64 && (
          <button
            type="button"
            onClick={handleClear}
            className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-600 transition-colors hover:bg-red-100 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-400 whitespace-nowrap"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Hapus Foto
          </button>
        )}
      </div>

      {photoBase64 && (
        <div className="pt-1">
          <img
            src={photoBase64}
            alt="Pratinjau bukti foto"
            referrerPolicy="no-referrer"
            className="h-36 rounded-lg border border-slate-200 object-cover dark:border-slate-700"
          />
        </div>
      )}
    </div>
  );
};
