import React, { useEffect } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { X, AlertTriangle, CheckCircle2, Info } from 'lucide-react';
import type { ConfirmDialogState, PhotoModalState } from '@/src/types/muliabara';

interface PhotoModalProps {
  modal: PhotoModalState;
  onClose: () => void;
}

export const PhotoModal: React.FC<PhotoModalProps> = ({ modal, onClose }) => {
  useEffect(() => {
    if (!modal.open) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [modal.open, onClose]);

  return (
    <AnimatePresence>
      {modal.open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
          onClick={onClose}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-xs"
          role="dialog"
          aria-modal="true"
          aria-label="Pratinjau Bukti Foto"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 8 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-lg rounded-xl border border-slate-200 bg-white p-4 shadow-xl dark:border-slate-800 dark:bg-[#10171f]"
          >
            <div className="overflow-hidden rounded-lg border border-slate-200 bg-slate-100 dark:border-slate-800 dark:bg-[#090e13]">
              <img
                src={modal.src}
                alt="Bukti Foto Logistik"
                referrerPolicy="no-referrer"
                className="max-h-[72vh] w-full object-contain"
              />
            </div>
            <div className="mt-4 flex items-center justify-between gap-4">
              <span className="text-xs font-medium text-slate-600 dark:text-slate-300">
                {modal.caption}
              </span>
              <button
                type="button"
                onClick={onClose}
                className="inline-flex items-center gap-1.5 rounded-lg bg-[#19325d] px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-[#122547] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#7ab547] whitespace-nowrap shrink-0"
              >
                <X className="h-3.5 w-3.5" />
                Tutup
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

interface ConfirmModalProps {
  dialog: ConfirmDialogState;
  onCancel: () => void;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  dialog,
  onCancel,
}) => {
  useEffect(() => {
    if (!dialog.open) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [dialog.open, onCancel]);

  return (
    <AnimatePresence>
      {dialog.open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
          onClick={onCancel}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-xs"
          role="dialog"
          aria-modal="true"
          aria-labelledby="confirm-dialog-title"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 8 }}
            transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-6 shadow-xl dark:border-slate-800 dark:bg-[#10171f]"
          >
            <div className="flex items-start gap-3">
              <div
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border ${
                  dialog.destructive
                    ? 'border-red-200 bg-red-50 text-red-600 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-400'
                    : 'border-slate-200 bg-slate-100 text-[#19325d] dark:border-slate-800 dark:bg-slate-800/60 dark:text-[#82c341]'
                }`}
              >
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <h3
                  id="confirm-dialog-title"
                  className="font-display text-base font-bold text-slate-900 dark:text-slate-100"
                >
                  {dialog.title}
                </h3>
                <p className="mt-1.5 text-sm leading-relaxed text-slate-600 dark:text-slate-400">
                  {dialog.message}
                </p>
              </div>
            </div>
            <div className="mt-6 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={onCancel}
                className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-400 dark:border-slate-700 dark:bg-[#16202a] dark:text-slate-200 dark:hover:bg-slate-800 whitespace-nowrap shrink-0"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={() => {
                  dialog.onConfirm();
                  onCancel();
                }}
                className={`rounded-lg px-4 py-2 text-xs font-semibold text-white transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 whitespace-nowrap shrink-0 ${
                  dialog.destructive
                    ? 'bg-red-600 hover:bg-red-700 focus-visible:outline-red-500'
                    : 'bg-[#19325d] hover:bg-[#122547] focus-visible:outline-[#7ab547]'
                }`}
              >
                {dialog.confirmLabel}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

interface ToastBannerProps {
  message: string | null;
  type?: 'success' | 'error' | 'info';
  onDismiss: () => void;
}

export const ToastBanner: React.FC<ToastBannerProps> = ({
  message,
  type = 'success',
  onDismiss,
}) => {
  return (
    <AnimatePresence>
      {message && (
        <motion.div
          initial={{ opacity: 0, y: 12, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 8, scale: 0.97 }}
          transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
          className="fixed right-5 bottom-5 z-50 flex max-w-sm items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-900 shadow-lg dark:border-slate-700 dark:bg-[#141d26] dark:text-slate-100"
          role="status"
          aria-live="polite"
        >
          {type === 'error' ? (
            <AlertTriangle className="h-4 w-4 shrink-0 text-red-500" />
          ) : type === 'info' ? (
            <Info className="h-4 w-4 shrink-0 text-sky-500" />
          ) : (
            <CheckCircle2 className="h-4 w-4 shrink-0 text-[#7ab547]" />
          )}
          <span className="flex-1 text-xs sm:text-sm">{message}</span>
          <button
            type="button"
            onClick={onDismiss}
            aria-label="Tutup notifikasi"
            className="rounded p-1 text-slate-400 transition-colors hover:text-slate-700 dark:hover:text-slate-200"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
