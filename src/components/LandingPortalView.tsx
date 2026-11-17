import React, { useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  ArrowRight,
  BarChart3,
  CheckCircle2,
  Cpu,
  Eye,
  EyeOff,
  Lock,
  Moon,
  Package,
  ShieldCheck,
  Sun,
  UserCheck,
  Wrench,
} from 'lucide-react';
import type {
  AppDatabase,
  AppUser,
  PortalType,
  ThemeMode,
} from '@/src/types/muliabara';
import { isSupabaseConfigured } from '@/src/lib/supabase';
import { BrandMark } from './BrandMark';

interface LandingPortalViewProps {
  db: AppDatabase;
  theme: ThemeMode;
  onToggleTheme: () => void;
  onAuthenticate: (
    portal: PortalType,
    userId: string,
    password: string
  ) => Promise<{ ok: boolean; error?: string; user?: AppUser }>;
}

const DIVISION_CARDS: Array<{
  index: string;
  portal: PortalType;
  title: string;
  subtitle: string;
  description: string;
  image: string;
  imageAlt: string;
  icon: React.ComponentType<{ className?: string }>;
}> = [
  {
    index: '01',
    portal: 'operator_mekanik',
    title: 'Operator Mekanik',
    subtitle: 'Genset · Alat Berat · General',
    description:
      'Pelaporan Genset (P2H, HM, KWH, Fuel), Alat Berat, General, serta pengambilan barang spare part langsung.',
    image: '/src/assets/images/card_genset_power_1794897265480.jpg',
    imageAlt: 'Stasiun unit genset industri di area operasional',
    icon: Wrench,
  },
  {
    index: '02',
    portal: 'operator_elektrik',
    title: 'Operator Elektrik',
    subtitle: 'AC · Lampu · Panel & Inventaris',
    description:
      'Dokumentasi perawatan, perbaikan, pemasangan inventaris elektrik disertai bukti foto dan pengambilan barang.',
    image:
      '/assets/aistudio/Professional_Commercial_Electrical_Services_in_Adelaide_98b3edce.jfif',
    imageAlt: 'Teknisi elektrik memeriksa panel distribusi industri',
    icon: Cpu,
  },
  {
    index: '03',
    portal: 'pengawas',
    title: 'Pengawas & Admin',
    subtitle: 'Analitik PA · Unit · Inventaris',
    description:
      'Pantau Physical Availability, kelola inventaris AC/Lampu & kategori elektrik, serta ekspor laporan lengkap.',
    image:
      '/assets/aistudio/Implementing_Effective_Preventative_Maintenance_____3b48a933.jfif',
    imageAlt: 'Monitor diagnostik preventive maintenance di meja teknisi',
    icon: BarChart3,
  },
  {
    index: '04',
    portal: 'logistic',
    title: 'Manajemen Logistic',
    subtitle: 'Barang Masuk · Keluar · Bukti Foto',
    description:
      'Pencatatan barang masuk dan pengambilan barang lengkap dengan satuan (pcs, unit, set, liter, roll, kg) dan foto.',
    image: '/src/assets/images/card_logistic_warehouse_1794897266026.jpg',
    imageAlt: 'Gudang logistik suku cadang dan selang hidrolik tertata rapi',
    icon: Package,
  },
];

const DEMO_ACCOUNTS: Record<
  PortalType,
  Array<{ id: string; password: string; label: string }>
> = {
  operator_mekanik: [
    { id: 'MEK01', password: '123', label: 'Demo Mekanik (MEK01)' },
  ],
  operator_elektrik: [
    { id: 'ELK01', password: '123', label: 'Demo Elektrik (ELK01)' },
  ],
  pengawas: [{ id: 'PGW01', password: '123', label: 'Demo Pengawas (PGW01)' }],
  logistic: [{ id: 'LOG01', password: '123', label: 'Demo Logistic (LOG01)' }],
};

const PORTAL_BUTTONS: Array<{
  id: PortalType;
  title: string;
  sub: string;
  icon: React.ComponentType<{ className?: string }>;
}> = [
  {
    id: 'operator_mekanik',
    title: 'Operator Mekanik',
    sub: 'Genset, Alat Berat, General & Pengambilan Barang',
    icon: Wrench,
  },
  {
    id: 'operator_elektrik',
    title: 'Operator Elektrik',
    sub: 'AC, Lampu, Panel & Pengambilan Barang',
    icon: Cpu,
  },
  {
    id: 'pengawas',
    title: 'Pengawas / Admin',
    sub: 'Dashboard, Inventaris, Unit & Kelola Akun',
    icon: ShieldCheck,
  },
  {
    id: 'logistic',
    title: 'Logistic',
    sub: 'Input Barang Masuk & Pengambilan Barang',
    icon: Package,
  },
];

export const LandingPortalView: React.FC<LandingPortalViewProps> = ({
  db,
  theme,
  onToggleTheme,
  onAuthenticate,
}) => {
  const [selectedPortal, setSelectedPortal] =
    useState<PortalType>('operator_mekanik');
  const [userId, setUserId] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [loginError, setLoginError] = useState<string>('');
  const [submitting, setSubmitting] = useState<boolean>(false);

  const topLoginRef = useRef<HTMLElement | null>(null);
  const userIdInputRef = useRef<HTMLInputElement | null>(null);

  const readyUnits = useMemo(
    () => db.units.filter((u) => u.status === 'Ready').length,
    [db.units]
  );
  const paPercent = db.units.length
    ? Math.round((readyUnits / db.units.length) * 100)
    : 0;

  const focusLoginPortal = (portal?: PortalType) => {
    if (portal) {
      setSelectedPortal(portal);
      setLoginError('');
    }
    topLoginRef.current?.scrollIntoView({
      behavior: 'smooth',
      block: 'start',
    });
    window.setTimeout(() => {
      userIdInputRef.current?.focus();
    }, 300);
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    setSubmitting(true);
    try {
      const result = await onAuthenticate(selectedPortal, userId, password);
      if (!result.ok) {
        setLoginError(result.error || 'Gagal masuk ke sistem.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const portalLabel =
    PORTAL_BUTTONS.find((b) => b.id === selectedPortal)?.title || 'Sistem';

  return (
    <div className="min-h-screen bg-[var(--bg-canvas)] text-[var(--text-primary)]">
      {/* 3-Zone Top Navigation Bar */}
      <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/90 backdrop-blur-md dark:border-slate-800/80 dark:bg-[#090e13]/90">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-8 px-4 py-3.5 sm:px-6">
          <a
            href="#beranda"
            className="flex items-center gap-2.5 whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#7ab547]"
          >
            <BrandMark variant="light" className="h-6 w-auto dark:hidden" />
            <BrandMark variant="dark" className="hidden h-6 w-auto dark:block" />
            <span className="font-display text-lg font-bold tracking-tight text-slate-900 dark:text-white whitespace-nowrap shrink-0">
              Muliabara
            </span>
          </a>

          <nav
            aria-label="Navigasi Utama"
            className="hidden items-center gap-7 text-sm font-medium text-slate-600 md:flex dark:text-slate-300"
          >
            <a
              href="#beranda"
              className="transition-colors hover:text-slate-950 hover:underline hover:underline-offset-8 dark:hover:text-white whitespace-nowrap shrink-0"
            >
              Portal Masuk
            </a>
            <a
              href="#divisi"
              className="transition-colors hover:text-slate-950 hover:underline hover:underline-offset-8 dark:hover:text-white whitespace-nowrap shrink-0"
            >
              Divisi
            </a>
            <a
              href="#arsitektur"
              className="transition-colors hover:text-slate-950 hover:underline hover:underline-offset-8 dark:hover:text-white whitespace-nowrap shrink-0"
            >
              Sistem
            </a>
            <a
              href="#keamanan"
              className="transition-colors hover:text-slate-950 hover:underline hover:underline-offset-8 dark:hover:text-white whitespace-nowrap shrink-0"
            >
              Standar K3
            </a>
          </nav>

          <div className="flex items-center shrink-0">
            <button
              type="button"
              onClick={() => focusLoginPortal('operator_mekanik')}
              className="inline-flex items-center gap-2 rounded-lg bg-[#7ab547] px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-[#699e3b] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#7ab547] dark:text-[#090e13] whitespace-nowrap shrink-0"
            >
              Masuk Operator
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </header>

      {/* Section 1: Atmospheric Hero WITH Top-Mounted Operator Login Portal */}
      <section
        id="beranda"
        ref={topLoginRef}
        className="relative overflow-hidden border-b border-slate-200 dark:border-slate-800"
      >
        <div className="absolute inset-0">
          <img
            src="/src/assets/images/hero_plant_facility_1794897264029.jpg"
            alt="Fasilitas plant dan pemeliharaan alat berat Muliabara"
            referrerPolicy="no-referrer"
            className="h-full w-full object-cover object-center"
          />
          <div
            className={
              theme === 'dark'
                ? 'absolute inset-0 bg-gradient-to-r from-[#090e13]/95 via-[#090e13]/85 to-[#090e13]/75'
                : 'absolute inset-0 bg-gradient-to-r from-white/95 via-white/90 to-white/80'
            }
          />
        </div>

        <div className="relative mx-auto max-w-7xl px-4 pt-6 pb-12 sm:px-6 lg:pt-10 lg:pb-14">
          {/* Hero Utility Bar */}
          <div className="mb-8 flex flex-wrap items-center justify-between gap-3 border-b border-slate-300/60 pb-4 dark:border-white/10">
            <div className="flex items-center gap-2 text-xs font-medium text-slate-600 dark:text-slate-300">
              <span>Plant &amp; Maintenance Operations</span>
              <span aria-hidden="true">·</span>
              <span>
                {isSupabaseConfigured
                  ? 'Sinkronisasi Supabase Aktif'
                  : 'Mode Demo Lokal'}
              </span>
            </div>
            <button
              type="button"
              onClick={onToggleTheme}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300/80 bg-white/85 px-3 py-1.5 text-xs font-semibold text-slate-800 backdrop-blur-sm transition-colors hover:bg-white dark:border-white/15 dark:bg-[#10171f]/85 dark:text-slate-100 dark:hover:bg-[#16202a] whitespace-nowrap shrink-0"
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

          {/* 2-Column Split: Left = Headline + Quick Operator Role Cards on Top; Right = Direct Login Form */}
          <div className="grid grid-cols-1 items-stretch gap-8 lg:grid-cols-12">
            {/* Left Column: Headline + Direct Top Role Buttons (Operator Mekanik & Operator Elektrik on top!) */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
              className="flex flex-col justify-between lg:col-span-6"
            >
              <div>
                <p className="text-xs font-semibold tracking-wider text-[#5d9132] uppercase dark:text-[#82c341]">
                  Portal Akses Cepat Lapangan
                </p>
                <h1
                  className="font-display text-balance mt-2.5 font-bold tracking-tight text-slate-950 dark:text-white"
                  style={{
                    fontSize: 'clamp(2rem, 3.6vw, 3.25rem)',
                    lineHeight: 1.08,
                  }}
                >
                  Kendali Penuh Aset Plant &amp; Armada.
                </h1>
                <p className="mt-4 max-w-xl text-sm leading-relaxed text-slate-700 sm:text-base dark:text-slate-300">
                  Pilih posisi kerja Anda di bawah ini—Operator Mekanik dan
                  Operator Elektrik berada di baris teratas untuk akses laporan
                  dan pengambilan barang langsung.
                </p>
              </div>

              {/* Role Selector Buttons: Operator Mekanik & Operator Elektrik ON TOP */}
              <div className="mt-7 space-y-3">
                <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                  1. Pilih Divisi Login Anda:
                </p>
                <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                  {PORTAL_BUTTONS.map((btn) => {
                    const Icon = btn.icon;
                    const active = selectedPortal === btn.id;
                    return (
                      <button
                        key={btn.id}
                        type="button"
                        onClick={() => {
                          setSelectedPortal(btn.id);
                          setLoginError('');
                          userIdInputRef.current?.focus();
                        }}
                        className={`flex items-start gap-3 rounded-xl border p-3.5 text-left transition-all focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#7ab547] ${
                          active
                            ? 'border-[#7ab547] bg-white shadow-sm dark:border-[#82c341] dark:bg-[#10171f]'
                            : 'border-slate-200/80 bg-white/75 hover:bg-white dark:border-white/15 dark:bg-[#10171f]/70 dark:hover:bg-[#10171f]'
                        }`}
                      >
                        <div
                          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border ${
                            active
                              ? 'border-[#7ab547] bg-[#7ab547] text-white dark:text-[#090e13]'
                              : 'border-slate-200 bg-slate-100 text-slate-600 dark:border-slate-700 dark:bg-[#16202a] dark:text-slate-300'
                          }`}
                        >
                          <Icon className="h-4 w-4" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="font-display text-sm font-bold text-slate-900 dark:text-white">
                            {btn.title}
                          </p>
                          <p className="mt-0.5 text-xs leading-snug text-slate-500 dark:text-slate-400">
                            {btn.sub}
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </motion.div>

            {/* Right Column: Login Card Immediately Visible Above the Fold */}
            <motion.div
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                duration: 0.4,
                delay: 0.08,
                ease: [0.16, 1, 0.3, 1],
              }}
              className="lg:col-span-6"
            >
              <div className="flex h-full flex-col justify-between rounded-xl border border-slate-200/95 bg-white/95 p-6 backdrop-blur-md sm:p-7 dark:border-white/15 dark:bg-[#10171f]/95">
                <div>
                  <div className="flex items-center justify-between gap-4 border-b border-slate-200 pb-4 dark:border-slate-800">
                    <div>
                      <h2 className="font-display text-lg font-bold text-slate-900 dark:text-white">
                        Login {portalLabel}
                      </h2>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        Masukkan User ID &amp; Password dari Pengawas
                      </p>
                    </div>
                    <UserCheck className="h-5 w-5 text-[#7ab547]" />
                  </div>

                  <AnimatePresence mode="wait">
                    <motion.form
                      key={selectedPortal}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -6 }}
                      transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
                      onSubmit={handleLoginSubmit}
                      className="mt-5 space-y-4"
                    >
                      <div>
                        <label
                          htmlFor="login-user-id"
                          className="mb-1.5 block text-xs font-semibold text-slate-600 dark:text-slate-400"
                        >
                          User ID
                        </label>
                        <input
                          ref={userIdInputRef}
                          id="login-user-id"
                          type="text"
                          required
                          value={userId}
                          onChange={(e) => setUserId(e.target.value)}
                          placeholder="cth: MEK01, ELK01, PGW01"
                          className="font-mono-tabular w-full rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none transition-colors focus:border-[#7ab547] focus:ring-2 focus:ring-[#7ab547]/25 dark:border-slate-700 dark:bg-[#16202a] dark:text-slate-100"
                        />
                      </div>

                      <div>
                        <label
                          htmlFor="login-password"
                          className="mb-1.5 block text-xs font-semibold text-slate-600 dark:text-slate-400"
                        >
                          Password
                        </label>
                        <div className="relative">
                          <input
                            id="login-password"
                            type={showPassword ? 'text' : 'password'}
                            required
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="Masukkan Password"
                            className="font-mono-tabular w-full rounded-lg border border-slate-200 bg-white py-2.5 pr-10 pl-3.5 text-sm text-slate-900 outline-none transition-colors focus:border-[#7ab547] focus:ring-2 focus:ring-[#7ab547]/25 dark:border-slate-700 dark:bg-[#16202a] dark:text-slate-100"
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword((prev) => !prev)}
                            aria-label={
                              showPassword
                                ? 'Sembunyikan password'
                                : 'Lihat password'
                            }
                            className="absolute top-1/2 right-2.5 -translate-y-1/2 rounded p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                          >
                            {showPassword ? (
                              <EyeOff className="h-4 w-4" />
                            ) : (
                              <Eye className="h-4 w-4" />
                            )}
                          </button>
                        </div>
                      </div>

                      {loginError && (
                        <p
                          role="alert"
                          className="text-xs font-semibold text-red-600 dark:text-red-400"
                        >
                          {loginError}
                        </p>
                      )}

                      <button
                        type="submit"
                        disabled={submitting}
                        className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-[#19325d] px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#122547] disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#7ab547] dark:bg-[#7ab547] dark:text-[#090e13] dark:hover:bg-[#82c341]"
                      >
                        <Lock className="h-4 w-4" />
                        {submitting ? 'Memeriksa akun...' : `Masuk ${portalLabel}`}
                      </button>
                    </motion.form>
                  </AnimatePresence>
                </div>

                {/* Quick Demo Fillers */}
                <div className="mt-5 border-t border-slate-200 pt-4 dark:border-slate-800">
                  <p className="mb-2 text-xs font-semibold text-slate-500 dark:text-slate-400">
                    Akses Uji Coba Cepat ({portalLabel}):
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {DEMO_ACCOUNTS[selectedPortal].map((demo) => (
                      <button
                        key={demo.id}
                        type="button"
                        onClick={() => {
                          setUserId(demo.id);
                          setPassword(demo.password);
                          setLoginError('');
                        }}
                        className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-[#5d9132] transition-colors hover:border-[#7ab547] hover:bg-slate-100 dark:border-slate-700 dark:bg-[#16202a] dark:text-[#82c341] dark:hover:bg-slate-800 whitespace-nowrap"
                      >
                        {demo.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          </div>

          {/* Bottom 4-Column Stat Strip */}
          <div className="mt-10 grid grid-cols-2 gap-4 rounded-xl border border-slate-200/90 bg-white/90 p-5 backdrop-blur-md lg:grid-cols-4 dark:border-white/15 dark:bg-[#10171f]/85">
            <div>
              <p className="font-mono-tabular text-2xl font-bold text-slate-900 dark:text-white">
                {db.units.length} Unit
              </p>
              <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                Genset &amp; Alat Berat Terdaftar
              </p>
            </div>
            <div>
              <p className="font-mono-tabular text-2xl font-bold text-[#5d9132] dark:text-[#82c341]">
                {paPercent}%
              </p>
              <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                Physical Availability Saat Ini
              </p>
            </div>
            <div>
              <p className="font-mono-tabular text-2xl font-bold text-slate-900 dark:text-white">
                {db.mekanikLogs.length + db.elektrikLogs.length} Laporan
              </p>
              <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                Aktivitas Mekanik &amp; Elektrik
              </p>
            </div>
            <div>
              <p className="font-mono-tabular text-2xl font-bold text-slate-900 dark:text-white">
                {db.logisticLogs.length} Transaksi
              </p>
              <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                Sirkulasi Barang Logistic
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Section 2: 4 Core Divisions */}
      <section
        id="divisi"
        className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:py-20"
      >
        <div className="grid grid-cols-1 items-end gap-6 lg:grid-cols-12">
          <div className="lg:col-span-6">
            <p className="text-xs font-semibold tracking-wider text-[#5d9132] uppercase dark:text-[#82c341]">
              Struktur Divisi Operasional
            </p>
            <h2 className="font-display text-balance mt-2 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl dark:text-white">
              Alur Kerja Spesifik untuk Setiap Peran Lapangan.
            </h2>
          </div>
          <div className="lg:col-span-6">
            <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-400">
              Operator Mekanik dan Elektrik dapat melakukan pelaporan pekerjaan
              beserta pengambilan barang logistik langsung dalam satu akun tanpa
              perlu berpindah login.
            </p>
          </div>
        </div>

        <div className="mt-10 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {DIVISION_CARDS.map((card, idx) => {
            const Icon = card.icon;
            return (
              <motion.button
                key={card.index}
                type="button"
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.2 }}
                transition={{
                  duration: 0.28,
                  delay: idx * 0.05,
                  ease: [0.16, 1, 0.3, 1],
                }}
                onClick={() => focusLoginPortal(card.portal)}
                className="group flex flex-col overflow-hidden rounded-xl border border-slate-200 bg-white text-left transition-all hover:border-[#7ab547] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#7ab547] dark:border-slate-800 dark:bg-[#10171f] dark:hover:border-[#82c341]"
              >
                <div className="relative h-44 w-full overflow-hidden bg-slate-200 dark:bg-[#16202a]">
                  <img
                    src={card.image}
                    alt={card.imageAlt}
                    referrerPolicy="no-referrer"
                    className="h-full w-full object-cover transition-transform duration-300 ease-out group-hover:scale-[1.03]"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/15 to-transparent" />
                  <div className="absolute bottom-3 left-3 flex items-center gap-2 text-white">
                    <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#10171f]/80 backdrop-blur-sm">
                      <Icon className="h-4 w-4 text-[#82c341]" />
                    </span>
                    <span className="font-mono-tabular text-xs font-bold">
                      {card.index}
                    </span>
                  </div>
                </div>

                <div className="flex flex-1 flex-col justify-between p-5">
                  <div>
                    <h3 className="font-display text-base font-bold text-slate-900 dark:text-white">
                      {card.title}
                    </h3>
                    <p className="mt-1 text-xs font-medium text-[#5d9132] dark:text-[#82c341]">
                      {card.subtitle}
                    </p>
                    <p className="mt-3 text-sm leading-relaxed text-slate-600 dark:text-slate-400">
                      {card.description}
                    </p>
                  </div>
                  <div className="mt-5 inline-flex items-center gap-1.5 text-xs font-semibold text-slate-900 transition-transform group-hover:translate-x-1 dark:text-slate-200">
                    Pilih Login {card.title}
                    <ArrowRight className="h-3.5 w-3.5 text-[#7ab547]" />
                  </div>
                </div>
              </motion.button>
            );
          })}
        </div>
      </section>

      {/* Section 3: Architecture & Safety Workshop Split */}
      <section
        id="arsitektur"
        className="border-y border-slate-200 bg-white py-16 lg:py-20 dark:border-slate-800 dark:bg-[#10171f]"
      >
        <div
          id="keamanan"
          className="mx-auto grid max-w-7xl grid-cols-1 items-stretch gap-10 px-4 sm:px-6 lg:grid-cols-12"
        >
          <div className="flex flex-col justify-center lg:col-span-5">
            <p className="text-xs font-semibold tracking-wider text-[#5d9132] uppercase dark:text-[#82c341]">
              Keandalan Sistem &amp; K3 Workshop
            </p>
            <h2 className="font-display text-balance mt-2 text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
              Bukti Foto Wajib di Setiap Pelaporan.
            </h2>
            <p className="mt-4 text-sm leading-relaxed text-slate-600 dark:text-slate-400">
              Setiap laporan Mekanik (Genset, Alat Berat, General), Elektrik,
              dan transaksi Logistic dilengkapi opsi kamera HP langsung atau
              galeri agar dokumentasi lapangan selalu terverifikasi.
            </p>

            <ul className="mt-6 space-y-3 text-sm text-slate-700 dark:text-slate-300">
              <li className="flex items-start gap-2.5">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#7ab547]" />
                <span>
                  Kategori General bebas ketik jenis pekerjaan tanpa perhitungan
                  HM/KWH/Fuel
                </span>
              </li>
              <li className="flex items-start gap-2.5">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#7ab547]" />
                <span>
                  Pengambilan barang langsung dari menu Operator dengan saran
                  pencarian Barang Masuk
                </span>
              </li>
              <li className="flex items-start gap-2.5">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#7ab547]" />
                <span>
                  Admin dapat tambah, kurang, edit inventaris AC/Lampu serta
                  menambah kategori baru
                </span>
              </li>
              <li className="flex items-start gap-2.5">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#7ab547]" />
                <span>
                  Satuan logistik lengkap: pcs, unit, set, liter, kodi, roll,
                  kg, dan ball
                </span>
              </li>
            </ul>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-12 lg:col-span-7">
            <div className="overflow-hidden rounded-xl border border-slate-200 bg-slate-100 sm:col-span-7 dark:border-slate-800 dark:bg-[#090e13]">
              <img
                src="/assets/aistudio/Machine_Guarding_and_Worker_Protection_c8fce49b.jfif"
                alt="Aktivitas workshop mekanik yang aman dan terstandar"
                referrerPolicy="no-referrer"
                className="h-72 w-full object-cover lg:h-full"
              />
            </div>
            <div className="flex flex-col justify-between rounded-xl border border-slate-200 bg-slate-50 p-5 sm:col-span-5 dark:border-slate-800 dark:bg-[#090e13]">
              <div>
                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                  Ringkasan Aset Aktif
                </p>
                <p className="font-mono-tabular mt-2 text-3xl font-bold text-slate-900 dark:text-white">
                  {paPercent}%
                </p>
                <p className="text-xs text-[#5d9132] dark:text-[#82c341]">
                  Physical Availability
                </p>
              </div>

              <div className="my-5 space-y-2.5 border-y border-slate-200 py-4 text-xs dark:border-slate-800">
                {db.units.slice(0, 3).map((u) => (
                  <div
                    key={u.id}
                    className="flex items-center justify-between gap-2"
                  >
                    <span className="truncate font-medium text-slate-700 dark:text-slate-300">
                      {u.name}
                    </span>
                    <span
                      className={`font-mono-tabular font-semibold shrink-0 ${
                        u.status === 'Ready'
                          ? 'text-[#5d9132] dark:text-[#82c341]'
                          : 'text-red-600 dark:text-red-400'
                      }`}
                    >
                      {u.status}
                    </span>
                  </div>
                ))}
              </div>

              <button
                type="button"
                onClick={() => focusLoginPortal('pengawas')}
                className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-[#19325d] px-4 py-2.5 text-xs font-semibold text-white transition-colors hover:bg-[#122547] dark:bg-[#7ab547] dark:text-[#090e13] dark:hover:bg-[#82c341]"
              >
                Buka Dashboard Pengawas
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Bottom Atmospheric Banner */}
      <section className="relative overflow-hidden py-14">
        <div className="absolute inset-0">
          <img
            src="/src/assets/images/banner_cta_operations_1794897265966.jpg"
            alt="Panel pengukur tekanan dan temperatur mesin diesel industri"
            referrerPolicy="no-referrer"
            className="h-full w-full object-cover object-center"
          />
          <div
            className={
              theme === 'dark'
                ? 'absolute inset-0 bg-[#090e13]/90'
                : 'absolute inset-0 bg-slate-100/92'
            }
          />
        </div>

        <div className="relative mx-auto flex max-w-7xl flex-col items-start justify-between gap-6 px-4 sm:flex-row sm:items-center sm:px-6">
          <div>
            <h2 className="font-display text-2xl font-bold text-slate-950 dark:text-white">
              Siap Mengisi Laporan Shift Hari Ini?
            </h2>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
              Kembali ke panel akses atas untuk masuk sebagai Operator Mekanik,
              Operator Elektrik, atau Pengawas.
            </p>
          </div>
          <button
            type="button"
            onClick={() => focusLoginPortal('operator_mekanik')}
            className="inline-flex items-center gap-2 rounded-lg bg-[#7ab547] px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#699e3b] dark:text-[#090e13] whitespace-nowrap shrink-0"
          >
            Kembali ke Login Atas
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </section>

      {/* Quiet Footer */}
      <footer className="border-t border-slate-200 bg-white py-8 dark:border-slate-800 dark:bg-[#090e13]">
        <div className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-4 px-4 sm:flex-row sm:items-center sm:px-6">
          <div className="flex items-center gap-2.5">
            <BrandMark variant="light" className="h-5 w-auto dark:hidden" />
            <BrandMark variant="dark" className="hidden h-5 w-auto dark:block" />
            <span className="font-display text-sm font-bold text-slate-900 dark:text-white">
              Muliabara Plant &amp; Maintenance
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-6 text-xs text-slate-500 dark:text-slate-400">
            <a href="#beranda" className="hover:text-slate-900 dark:hover:text-white">
              Portal Masuk
            </a>
            <a href="#divisi" className="hover:text-slate-900 dark:hover:text-white">
              Divisi
            </a>
            <a href="#arsitektur" className="hover:text-slate-900 dark:hover:text-white">
              Sistem
            </a>
            <a href="#keamanan" className="hover:text-slate-900 dark:hover:text-white">
              Standar K3
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
};
