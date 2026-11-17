import { useCallback, useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import type {
  AppDatabase,
  AppUser,
  ConfirmDialogState,
  PhotoModalState,
  PortalType,
  ThemeMode,
} from '@/src/types/muliabara';
import {
  clearSessionUserId,
  getSavedSessionUserId,
  getSavedTheme,
  isElektrikRole,
  loadDatabase,
  loadLocalDatabase,
  saveSessionUserId,
  saveThemePreference,
} from '@/src/lib/supabase';
import { LandingPortalView } from '@/src/components/LandingPortalView';
import { AppShellHeader } from '@/src/components/AppShellHeader';
import { PengawasDashboard } from '@/src/components/PengawasDashboard';
import { MekanikWorkspace } from '@/src/components/MekanikWorkspace';
import { ElektrikWorkspace } from '@/src/components/ElektrikWorkspace';
import { LogisticWorkspace } from '@/src/components/LogisticWorkspace';
import {
  ConfirmModal,
  PhotoModal,
  ToastBanner,
} from '@/src/components/Modals';

export default function App() {
  const [db, setDb] = useState<AppDatabase>(() => loadLocalDatabase());
  const [currentUser, setCurrentUser] = useState<AppUser | null>(null);
  const [theme, setTheme] = useState<ThemeMode>(() => getSavedTheme());
  const [toast, setToast] = useState<{
    message: string | null;
    type: 'success' | 'error' | 'info';
  }>({ message: null, type: 'success' });
  const [photoModal, setPhotoModal] = useState<PhotoModalState>({
    open: false,
    src: '',
    caption: '',
  });
  const [confirmDialog, setConfirmDialog] = useState<ConfirmDialogState>({
    open: false,
    title: '',
    message: '',
    confirmLabel: 'Konfirmasi',
    destructive: false,
    onConfirm: () => {},
  });

  const showToast = useCallback(
    (message: string, type: 'success' | 'error' | 'info' = 'success') => {
      setToast({ message, type });
    },
    []
  );

  useEffect(() => {
    if (!toast.message) return;
    const timer = window.setTimeout(() => {
      setToast((prev) => ({ ...prev, message: null }));
    }, 3400);
    return () => window.clearTimeout(timer);
  }, [toast.message]);

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    saveThemePreference(theme);
  }, [theme]);

  const toggleTheme = useCallback(() => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  }, []);

  const refreshData = useCallback(async () => {
    const res = await loadDatabase();
    setDb(res.data);
    if (res.error) {
      showToast(res.error, 'error');
    }
    return res.data;
  }, [showToast]);

  useEffect(() => {
    let active = true;
    (async () => {
      const res = await loadDatabase();
      if (!active) return;
      setDb(res.data);
      if (res.error) {
        showToast(res.error, 'error');
      }
      const savedId = getSavedSessionUserId();
      if (savedId) {
        const matched = res.data.users.find(
          (u) => u.id.toUpperCase() === savedId.toUpperCase()
        );
        if (matched) {
          setCurrentUser(matched);
        } else {
          clearSessionUserId();
        }
      }
    })();
    return () => {
      active = false;
    };
  }, [showToast]);

  const handleAuthenticate = useCallback(
    async (portal: PortalType, userId: string, password: string) => {
      const res = await loadDatabase();
      setDb(res.data);
      const idNormalized = userId.trim().toUpperCase();
      const passNormalized = password.trim();

      const found = res.data.users.find(
        (u) =>
          u.id.toUpperCase() === idNormalized && u.password === passNormalized
      );

      if (!found) {
        return {
          ok: false,
          error: 'ID atau Password salah. Hubungi Pengawas.',
        };
      }

      if (portal === 'pengawas' && found.role !== 'Pengawas') {
        return { ok: false, error: 'Akun ini bukan akun Pengawas.' };
      }
      if (
        portal === 'operator_mekanik' &&
        found.role !== 'Operator Mekanik'
      ) {
        return { ok: false, error: 'Akun ini bukan akun Operator Mekanik.' };
      }
      if (portal === 'operator_elektrik' && !isElektrikRole(found.role)) {
        return { ok: false, error: 'Akun ini bukan akun Operator Elektrik.' };
      }
      if (portal === 'logistic' && found.role !== 'Logistic') {
        return { ok: false, error: 'Akun ini bukan akun Logistic.' };
      }

      saveSessionUserId(found.id);
      setCurrentUser(found);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      showToast(`Selamat datang, ${found.name}.`, 'success');
      return { ok: true, user: found };
    },
    [showToast]
  );

  const handleLogout = useCallback(() => {
    clearSessionUserId();
    setCurrentUser(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
    showToast('Anda telah keluar dari sistem.', 'info');
  }, [showToast]);

  return (
    <div className="min-h-screen bg-[var(--bg-canvas)] text-[var(--text-primary)]">
      <AnimatePresence mode="wait">
        {!currentUser ? (
          <motion.div
            key="landing-portal"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
          >
            <LandingPortalView
              db={db}
              theme={theme}
              onToggleTheme={toggleTheme}
              onAuthenticate={handleAuthenticate}
            />
          </motion.div>
        ) : (
          <motion.div
            key={`workspace-${currentUser.id}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="flex min-h-screen flex-col"
          >
            <AppShellHeader currentUser={currentUser} onLogout={handleLogout} />
            <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6">
              {currentUser.role === 'Pengawas' && (
                <PengawasDashboard
                  db={db}
                  setDb={setDb}
                  currentUser={currentUser}
                  theme={theme}
                  onToggleTheme={toggleTheme}
                  onRefresh={async () => {
                    await refreshData();
                    showToast('Data berhasil disegarkan.', 'success');
                  }}
                  onToast={showToast}
                  onConfirm={setConfirmDialog}
                  onOpenPhoto={setPhotoModal}
                />
              )}
              {currentUser.role === 'Operator Mekanik' && (
                <MekanikWorkspace
                  db={db}
                  setDb={setDb}
                  currentUser={currentUser}
                  theme={theme}
                  onToggleTheme={toggleTheme}
                  onToast={showToast}
                  onOpenPhoto={setPhotoModal}
                />
              )}
              {isElektrikRole(currentUser.role) && (
                <ElektrikWorkspace
                  db={db}
                  setDb={setDb}
                  currentUser={currentUser}
                  theme={theme}
                  onToggleTheme={toggleTheme}
                  onToast={showToast}
                  onOpenPhoto={setPhotoModal}
                />
              )}
              {currentUser.role === 'Logistic' && (
                <LogisticWorkspace
                  db={db}
                  setDb={setDb}
                  currentUser={currentUser}
                  theme={theme}
                  onToggleTheme={toggleTheme}
                  onToast={showToast}
                  onOpenPhoto={setPhotoModal}
                />
              )}
            </main>
          </motion.div>
        )}
      </AnimatePresence>

      <PhotoModal
        modal={photoModal}
        onClose={() => setPhotoModal((prev) => ({ ...prev, open: false }))}
      />

      <ConfirmModal
        dialog={confirmDialog}
        onCancel={() =>
          setConfirmDialog((prev) => ({ ...prev, open: false }))
        }
      />

      <ToastBanner
        message={toast.message}
        type={toast.type}
        onDismiss={() => setToast((prev) => ({ ...prev, message: null }))}
      />
    </div>
  );
}
