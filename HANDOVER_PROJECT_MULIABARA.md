# DOKUMEN HANDOVER PROYEK: MULIABARA PLANT & MAINTENANCE SYSTEM

Dokumen ini disusun sebagai panduan lengkap serah-terima (*handover*) proyek untuk dilanjutkan pengembangannya di **Claude** (Claude Code / Claude AI).

> **PENTING UNTUK CLAUDE:** Source code aplikasi **versi terbaru** berada di `index.html` (root), folder `src/`, dan `supabase_setup.sql` (root). Jika di dalam workspace/ZIP masih terdapat file `.html`, `.txt`, atau `.sql` di dalam `public/assets/aistudio/`, **ABAIKAN** file-file tersebut karena itu hanya arsip lampiran awal sebelum migrasi ke React. Hanya file `.jfif` di `public/assets/aistudio/` yang dipakai sebagai aset gambar.

---

## 1. Ringkasan Proyek & Tech Stack

- **Nama Sistem**: Muliabara Plant & Maintenance System
- **Arsitektur**: Single-Page Web Application (SPA) responsif untuk PC & Mobile
- **Framework & Versi**:
  - **React** `19.0.1` + **TypeScript** `7.0.2`
  - **Vite** `8.3.0` (`@vitejs/plugin-react` `6.1.1`)
  - **Tailwind CSS v4** (`4.3.3` via `@tailwindcss/vite`, menggunakan `@custom-variant dark (&:where(.dark, .dark *));`)
  - **Motion** (`motion/react` `12.23.24`) untuk transisi UI profesional (`cubic-bezier(0.16, 1, 0.3, 1)`)
  - **Lucide React** (`0.546.0`) untuk ikonografi minimalis
  - **Chart.js** (`chart.js/auto`) untuk 3 grafik analitik Pengawas
  - **Supabase JS SDK v2** (`@supabase/supabase-js`) dengan **Hybrid Fallback** otomatis ke `localStorage` + *in-memory backup* apabila variabel lingkungan Supabase belum diisi.

### Perintah Menjalankan Proyek
```bash
npm install
npm run dev      # Menjalankan server dev di port 3000
npm run lint     # Pengecekan TypeScript (tsc --noEmit)
npm run build    # Build produksi ke folder dist/
```

### Variabel Lingkungan (`.env.example`)
```env
VITE_SUPABASE_URL=""
VITE_SUPABASE_ANON_KEY=""
```
> Jika kosong atau belum dikonfigurasi, aplikasi otomatis berjalan pada **Mode Demo Lokal** menggunakan seed data bawaan di `localStorage` (`muliabara_plant_db_v3`).

---

## 2. Struktur File Proyek

```text
/
├── index.html                          # Entry HTML + Google Fonts (Plus Jakarta Sans, DM Sans, JetBrains Mono)
├── metadata.json                       # Metadata aplikasi
├── package.json                        # Daftar dependensi & skrip npm
├── tsconfig.json                       # Konfigurasi TypeScript (@/* alias ke root)
├── vite.config.ts                      # Konfigurasi Vite + Tailwind v4 + copy src/assets saat build
├── .env.example                        # Template environment variables
├── supabase_setup.sql                  # Skema SQL Supabase v2 lengkap (tabel, RLS, storage bucket, seed)
├── HANDOVER_PROJECT_MULIABARA.md       # Dokumen handover ini
├── public/
│   └── assets/aistudio/                # Foto referensi workshop, preventive maintenance, & elektrikal
└── src/
    ├── main.tsx                        # Mount React root
    ├── index.css                       # Tailwind v4 + @custom-variant dark + Swiss semantic CSS tokens + print rules
    ├── App.tsx                         # State global, theme dark/light, session persistence, auth & routing role
    ├── assets/images/                  # Aset visual beresolusi tinggi (hero, genset, warehouse, banner CTA)
    ├── types/
    │   └── muliabara.ts                # Seluruh interface TypeScript, enum satuan logistik, & state UI
    ├── lib/
    │   └── supabase.ts                 # Hybrid Supabase/localStorage client, kompresi foto, parser HM, CSV UTF-8 BOM
    └── components/
        ├── AppShellHeader.tsx          # Header 3-zona saat user sudah login
        ├── BrandMark.tsx               # Logo SVG Muliabara (varian light & dark)
        ├── Charts.tsx                  # FuelKwhChart, ReadinessDoughnutChart, ActivityBarChart (theme-aware)
        ├── LandingPortalView.tsx       # Landing page + Portal Login di bagian atas (Operator Mekanik & Elektrik di atas)
        ├── MekanikWorkspace.tsx        # Workspace Mekanik (Genset, Alat Berat, General) + tab Pengambilan Barang
        ├── ElektrikWorkspace.tsx       # Workspace Elektrik (kategori dinamis Admin) + tab Pengambilan Barang
        ├── LogisticWorkspace.tsx       # Workspace Logistic (Barang Masuk & Pengambilan Barang)
        ├── OperatorLogisticPanel.tsx   # Komponen Pengambilan Barang untuk Operator (saran pencarian dari Barang Masuk)
        ├── PengawasDashboard.tsx       # Dashboard Eksekutif, Manajemen Unit, Inventaris & Kategori Elektrik, Kelola Akun
        ├── PhotoEvidencePicker.tsx     # Input bukti foto wajib 2 pilihan: Kamera HP Langsung & Pilih Galeri
        └── Modals.tsx                  # PhotoModal (zoom), ConfirmModal (pengganti window.confirm), ToastBanner
```

---

## 3. Hak Akses & Akun Demo

Urutan portal pada layar login dirancang agar **Operator Mekanik** dan **Operator Elektrik** berada di posisi paling atas sehingga pekerja lapangan langsung melihat akses masuknya tanpa bingung.

| Portal / Role | ID Demo | Password | Hak Akses & Fitur Utama |
| :--- | :--- | :--- | :--- |
| **Operator Mekanik** | `MEK01` | `123` | • 3 Kategori Unit: **Genset**, **Alat Berat**, dan **General**.<br>• **Genset**: Pilih unit, aktivitas (`P2H`, `Perawatan Harian`, `Service Berkala`, `Perbaikan / Trouble`), input `HM`, `KWH`, `Fuel`, opsi auto-update *Last Service*, keterangan, **Bukti Foto Wajib**.<br>• **Alat Berat**: Tanpa KWH & tanpa P2H.<br>• **General**: Pekerjaan umum tanpa perhitungan (`HM/KWH/Fuel = null`), input **Jenis Pekerjaan ketik bebas** (tanpa dropdown), **Keterangan**, dan **Bukti Foto Wajib**.<br>• Tab **Pengambilan Barang (Logistic)** langsung di workspace tanpa perlu login akun Logistic. |
| **Operator Elektrik** | `ELK01` | `123` | • Kategori Elektrik dinamis mengikuti daftar kategori yang dikelola Admin/Pengawas.<br>• Saran autocomplete lokasi/item dari **Inventaris Elektrik**, pilih tindakan (`Maintenance`, `Diperbaiki`, `Dilepas`, `Dipasang`), detail pekerjaan, dan **Bukti Foto Wajib**.<br>• Tab **Pengambilan Barang (Logistic)** langsung di workspace tanpa perlu login akun Logistic. |
| **Pengawas / Admin** | `PGW01` | `123` | • **Executive Dashboard & Laporan**: 5 KPI (*Physical Availability %, Total Fuel, Total KWH, Aktivitas Maintenance, Alert Service Due*), 3 grafik Chart.js, *Service Interval Health Monitor*, filter (`Harian`, `Mingguan`, `Bulanan`, `Semua Data`), pencarian teks, *Export CSV (UTF-8 BOM)*, *Cetak/PDF*, serta tombol *Lihat Foto* pada semua tabel.<br>• **Genset & Alat Berat**: Tambah, Edit, Hapus, Toggle cepat `Ready` / `Tidak Ready`.<br>• **Inventaris & Kategori**: Tambah & hapus kategori elektrik kustom; Tambah, Edit, Hapus, serta Tambah (`+1`) / Kurang (`-1`) stok inventaris AC, Lampu, Unit, dan Komponen.<br>• **Kelola ID Operator & Logistic**: Buat & hapus akun beserta fitur *Auto ID & Password*. |
| **Logistic** | `LOG01` | `123` | • Input **Barang Masuk** & **Pengambilan Barang**.<br>• Kolom standar: Nama Barang (dengan saran pencarian dari *Barang Masuk* saat *Pengambilan Barang*), Quantity, **Satuan** (`pcs`, `unit`, `set`, `liter`, `kodi`, `roll`, `kg`, `ball`), **PIC Nama Pengambil / Sumber**, dan **Bukti Foto Wajib** (perlakuan identik untuk masuk & keluar). |

---

## 4. Aturan Bisnis & Perbaikan Bug yang Sudah Diterapkan

1. **Bukti Foto Wajib 2 Opsi (`PhotoEvidencePicker.tsx`)**:
   - Setiap form pelaporan mewajibkan bukti foto melalui dua tombol: **Kamera HP Langsung** (`capture="environment"`) dan **Pilih dari Galeri** (tanpa `capture`).
   - Kompresi foto di `compressImageFile()` menggunakan `Promise` untuk mencegah *race condition* pada `canvas.toBlob` sebelum pengiriman ke Supabase Storage.
2. **Saran Pencarian Barang Masuk (`getIncomingGoodsSuggestions`)**:
   - Menghitung total `Barang Masuk` dikurangi `Pengambilan Barang` per kombinasi nama + satuan, sehingga operator saat mengetik nama barang langsung mendapat saran otomatis beserta estimasi sisa stok.
3. **Parsing HM yang Aman (`extractHmValue`)**:
   - Memprioritaskan regex eksplisit `hm\s*[:\-]?\s*(\d+(?:\.\d+)?)` agar format seperti `2026-11-17 (HM 1200)` tidak keliru membaca angka tanggal.
4. **Bebas Dialog Native Browser**:
   - Tidak ada `window.alert` atau `window.confirm`; seluruh konfirmasi menggunakan `ConfirmModal` dan notifikasi menggunakan `ToastBanner` agar aman di preview iframe.
5. **Dual-Theme Minimalism & Swiss Style**:
   - Menggunakan token semantik di `src/index.css` dengan `@custom-variant dark (&:where(.dark, .dark *));`, border hairline `1px`, angka tabel `tabular-nums` (`JetBrains Mono`), dan Chart.js yang otomatis menyesuaikan warna teks & grid saat pindah Light/Dark mode.

---

## 5. Catatan untuk Pengembangan Lanjutan di Claude

Jika Anda ingin melanjutkan penyempurnaan di Claude, hal-hal berikut siap dikembangkan:
1. **Sinkronisasi Penuh Tabel Baru ke Supabase**: Pastikan Anda menjalankan `supabase_setup.sql` versi terbaru di SQL Editor Supabase agar kolom `photo` pada `mekanik_logs` & `elektrik_logs`, nullable `hm`/`fuel`, serta tabel `elektrik_categories` & `elektrik_inventory` aktif di cloud (saat ini `elektrikCategories` dan `elektrikInventory` sudah punya *safe fallback* ke `localStorage` jika tabel cloud belum dibuat).
2. **CRUD Remote Inventaris & Kategori Elektrik**: Tambahkan fungsi `upsert`/`delete` ke `src/lib/supabase.ts` untuk `elektrik_categories` dan `elektrik_inventory` apabila sudah mengaktifkan mode Supabase production.
3. **Autentikasi & Keamanan**: Saat ini login memvalidasi ID/password terhadap tabel `app_users` agar mudah dikelola langsung oleh Pengawas; untuk skala produksi penuh dapat ditingkatkan dengan hashing password atau Supabase Auth + Edge Functions.

### Contoh Prompt Awal untuk Claude
> *"Baca `HANDOVER_PROJECT_MULIABARA.md` dan `supabase_setup.sql`. Ini adalah aplikasi React + TypeScript + Vite + Tailwind v4 untuk Muliabara Plant & Maintenance System. Pelajari struktur komponen di `src/components/` dan state di `src/lib/supabase.ts`, lalu bantu saya menyempurnakan [sebutkan fitur yang ingin ditambahkan, misalnya: sinkronisasi penuh tabel inventaris ke Supabase / approval pengawas / pengingat service otomatis]."*
