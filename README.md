# 🎓 CBT CERIA - Aplikasi CBT Online Ramah Anak SD & Sistem Ujian Terpadu

[![React](https://img.shields.io/badge/React-19.0-61dafb?logo=react&logoColor=black)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-3178c6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4.0-38bdf8?logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![Firebase](https://img.shields.io/badge/Firebase-Firestore_%26_Auth-ffca28?logo=firebase&logoColor=black)](https://firebase.google.com/)
[![Vite](https://img.shields.io/badge/Vite-6.0-646cff?logo=vite&logoColor=white)](https://vitejs.dev/)

**CBT CERIA** adalah platform Computer-Based Test (CBT) modern berbasis web yang dirancang khusus untuk pelaksanaan asesmen siswa Sekolah Dasar (SD) hingga menengah di Indonesia. Aplikasi ini menggabungkan antarmuka ramah anak (*kid-friendly*) yang bebas intimidasi dengan sistem pengawasan ruang ujian (*Proctor Portal*) yang tangguh dan manajemen bank soal serta analitik nilai komprehensif bagi Guru & Administrator.

Aplikasi telah dioptimalkan untuk concurrent access ratusan siswa (hingga 800+ siswa), didukung proteksi *crash-recovery* jawaban otomatis, dukungan stimulus gambar berkualitas tinggi, serta tipografi soal berformat paragraf rapi (*auto-wrap & scrollable*).

---

## 🏛️ Arsitektur Tiga Portal Akses

CBT CERIA menyediakan 3 pintu masuk portal utama yang terisolasi dengan kontrol hak akses (RBAC):

1. **Portal Siswa** &rarr; Pengerjaan ujian ramah anak via Token Ujian, navigasi visual ceria, timer adaptif, dan sertifikat prestasi.
2. **Portal Proktor** &rarr; Ruang kendali pengawas ruang ujian untuk membuka sesi peserta terkendala (*Reset Peserta*), memantau progres langsung (*Live Monitoring*), serta merekap nilai ujian.
3. **Portal Guru / Admin** &rarr; Pusat manajemen bank soal multi-model, import massal Excel, analitik nilai, dan **Manajemen Akun Proktor**.

---

## ✨ Fitur Unggulan

### 🎒 1. Portal Siswa (Ramah Anak & Edukatif)
- **Tampilan Interaktif & Ramah Anak**: Tipografi bersahabat (font Fredoka & Nunito), warna ceria, tombol berukuran besar, dan ramah sentuhan (*touch-friendly*).
- **Akses Ujian via Token**: Siswa masuk hanya dengan memasukkan nama, nomor peserta, dan token ujian yang diberikan pengawas/guru.
- **Engine Soal Interaktif & Dukungan Stimulus Gambar**:
  - Stimulus gambar soal responsif (mendukung URL gambar eksternal maupun unggahan lokal).
  - Teks soal mempertahankan format paragraf asli (`white-space: pre-wrap; overflow-wrap: break-word;`) dengan kontainer yang dapat di-*scroll* secara nyaman.
  - Tipe Pilihan Ganda Biasa dan Pilihan Ganda Kompleks (Multi-Opsi & Pernyataan Benar/Salah).
  - Penanda soal "Ragu-ragu" dan navigasi grid nomor soal instan.
  - Timer waktu ujian dinamis dengan hitung mundur dan konfirmasi otomatis saat waktu habis.
- **Perlindungan Sesi & Anti Kehilangan Jawaban**:
  - Sinkronisasi jawaban secara *real-time* ke Firestore & penyimpanan lokal (*session caching*).
  - Jika perangkat siswa mati atau browser tertutup, jawaban yang telah dipilih tetap utuh dan tersimpan saat sesi dibuka kembali oleh Proktor.
- **Hasil & Apresiasi Belajar**:
  - Pengumuman nilai instan dengan pesan motivatif positif.
  - Efek selebrasi konfeti interaktif (*canvas-confetti*).
  - Unduh **Sertifikat Penghargaan Digital** langsung dalam bentuk gambar/cetak.

---

### 🛡️ 2. Portal Proktor (Pengawas Ruang Ujian Baru)
Portal khusus pengawas ruang ujian dengan sistem login mandiri (*Username & Password*) yang dibuat oleh Admin/Guru:

- **Login Terisolasi & Aman**: Proktor memiliki sesi mandiri tanpa akses ke konfigurasi internal guru/admin.
- **Fitur 1: Reset Peserta (Buka Kunci Sesi)**:
  - Mengatasi kendala komputer siswa mati mendadak, jaringan terputus, atau browser tertutup.
  - Membuka kunci status ujian siswa (`isLocked = false`) **tanpa menghapus jawaban yang telah dikerjakan**.
  - Opsi reset sesi login untuk memungkinkan siswa melanjutkan pengerjaan ujian dengan cepat.
- **Fitur 2: Pantau Ujian (Real-time Live Monitoring)**:
  - Memilih mata ujian yang sedang berlangsung secara fleksibel.
  - Pemantauan status siswa *live*: **Belum Mulai**, **Sedang Mengerjakan**, atau **Selesai**.
  - Kartu metrik ringkasan (Total Terdaftar, Aktif Mengerjakan, Selesai, dan Butuh Bantuan).
  - Filter status cepat dan kotak pencarian nama/nomor peserta.
  - Tombol sinkronisasi manual dan otomatis (*auto-refresh*).
- **Fitur 3: Hasil Ujian & Rekap Nilai**:
  - Tabel rekapitulasi nilai peserta secara instan setelah siswa menyelesaikan ujian.
  - Informasi rincian skor, status kelulusan (Lulus / Perlu Bimbingan), dan waktu penyelesaian.
  - **Ekspor Laporan CSV / Excel**: Ekspor data nilai berstandar UTF-8 BOM yang dapat langsung dibuka rapi di Microsoft Excel.

---

### 👨‍🏫 3. Portal Guru & Administrator
- **Dashboard Analitik**: Ringkasan jumlah ujian aktif, bank soal, total peserta, serta rata-rata nilai.
- **Manajemen Akun Proktor (CRUD)**:
  - Guru/Admin dapat membuat akun proktor baru dengan menentukan Username, Nama Pengawas, Ruang/Tugas, dan Password.
  - Mengubah informasi akun atau memperbarui password proktor.
  - Mengaktifkan atau menonaktifkan akun proktor.
  - Menghapus akun proktor yang sudah tidak bertugas.
- **Manajemen Ujian**:
  - Pembuatan ujian baru, pengaturan durasi, token ujian, dan status aktif/nonaktif.
  - Pengacakan urutan soal dan opsi jawaban.
- **Bank Soal Multi-Model & Import Excel Canggih**:
  - **Pilihan Ganda Biasa (Single Choice)**: 1 opsi jawaban benar (A, B, C, D).
  - **Pilihan Ganda Kompleks Multi-Opsi**: Memilih lebih dari 1 pilihan jawaban yang benar (contoh: A dan C).
  - **Pilihan Ganda Kompleks Pernyataan (Benar / Salah)**: Daftar butir pernyataan di mana siswa menentukan status **Benar (B)** atau **Salah (S)** pada setiap butir pernyataan. Mendukung **input gambar ilustrasi pada setiap butir pernyataan** (baik via URL maupun unggahan file).
  - **Import Massal Excel**: Mendukung import sekaligus untuk seluruh tipe soal lengkap dengan link gambar ilustrasi via file Excel (`.xlsx`).
  - Template soal Excel resmi 2 sheet (Lembar Soal & Lembar Panduan Pengisian) yang siap diunduh oleh guru.
- **Monitoring & Analisis Nilai Kelas**:
  - Visualisasi grafik distribusi nilai menggunakan **Recharts**.
  - Fitur Reset Hasil Ujian (massal atau per-siswa) untuk keperluan remedial/susulan.
  - Ekspor rekapitulasi nilai lengkap ke format **Microsoft Excel (`.xlsx`)** dan **PDF Dokumen Resmi (`jsPDF`)**.

---

## 🛠️ Teknologi yang Digunakan

| Komponen | Teknologi | Keterangan |
| :--- | :--- | :--- |
| **Frontend Framework** | React 19, TypeScript, Vite | Arsitektur SPA cepat, modern & type-safe |
| **Styling & Icons** | Tailwind CSS v4, Lucide Icons | Desain responsif, clean UI, dan ramah pengguna |
| **Animasi & Interaksi** | Motion, Canvas Confetti | Efek transisi halus dan apresiasi kelulusan |
| **Visualisasi Data** | Recharts | Visualisasi distribusi nilai & statistik ujian |
| **Ekspor Dokumen** | `xlsx` (SheetJS), `jspdf`, `jspdf-autotable` | Unduh rekap nilai Excel, CSV, & laporan cetak PDF |
| **Backend & Database** | Firebase Firestore, Firebase Authentication | Penyimpanan data awan real-time & multi-role data store |

---

## 📂 Struktur Direktori

```plaintext
├── public/                     # Aset gambar, ikon, dan file statis publik
├── src/
│   ├── components/
│   │   ├── common/             # Komponen global (Navbar, Footer, Modal, Button)
│   │   ├── landing/            # Kartu portal beranda (Siswa, Proktor, Guru)
│   │   ├── proctor/            # Komponen Portal Proktor
│   │   │   ├── ProctorLogin.tsx     # Autentikasi pengawas ruang ujian
│   │   │   ├── ProctorDashboard.tsx # Shell navigasi dashboard proktor
│   │   │   ├── ResetPesertaTab.tsx  # Reset sesi & buka kunci peserta ujian
│   │   │   ├── PantauUjianTab.tsx   # Monitoring pengerjaan siswa real-time
│   │   │   └── HasilUjianTab.tsx    # Rekap nilai & unduh laporan CSV/Excel
│   │   ├── student/            # Komponen Portal Siswa (ExamEngine, Certificate, dll.)
│   │   └── teacher/            # Komponen Portal Guru (Analytics, Manager, Soal, dll.)
│   │       ├── ProctorManagement.tsx # CRUD Akun Proktor oleh Admin/Guru
│   │       └── ...
│   ├── pages/                  # Halaman utama (LandingPage, TeacherPortal)
│   ├── services/
│   │   └── firebase/           # Service Firebase Firestore & Auth
│   │       ├── proctorService.ts    # CRUD & Autentikasi Proktor
│   │       ├── examService.ts       # Operasi Ujian & Manajemen Soal
│   │       └── firebase.ts          # Inisialisasi Firebase App
│   ├── types/                  # Definisi antarmuka TypeScript (Proctor, Exam, Question, dll.)
│   ├── utils/                  # Helper fungsi, Excel parser, & formatter
│   ├── App.tsx                 # Router utama & state autentikasi multi-portal
│   ├── index.css               # Konfigurasi Tailwind CSS v4
│   └── main.tsx                # Entry point React
├── firebase-applet-config.json # Kredensial konfigurasi Firebase Client
├── firestore.rules             # Aturan keamanan database Firestore
├── metadata.json               # Metadata aplikasi
├── package.json                # Dependensi paket & NPM script
├── tsconfig.json               # Konfigurasi kompilasi TypeScript
├── vite.config.ts              # Konfigurasi bundler Vite
└── README.md                   # Dokumentasi lengkap proyek
```

---

## 🚀 Panduan Instalasi & Menjalankan Proyek

### 1. Kloning Repositori
```bash
git clone https://github.com/username/cbt-ceria.git
cd cbt-ceria
```

### 2. Pasang Dependensi
Pastikan Anda menggunakan **Node.js** (versi 18 atau lebih baru):
```bash
npm install
```

### 3. Konfigurasi Lingkungan (Firebase)
1. Buat atau sesuaikan berkas `firebase-applet-config.json` di root proyek:
   ```json
   {
     "apiKey": "YOUR_FIREBASE_API_KEY",
     "authDomain": "YOUR_PROJECT.firebaseapp.com",
     "projectId": "YOUR_PROJECT_ID",
     "storageBucket": "YOUR_PROJECT.appspot.com",
     "messagingSenderId": "YOUR_MESSAGING_SENDER_ID",
     "appId": "YOUR_APP_ID",
     "firestoreDatabaseId": "(default)"
   }
   ```
2. Salin file `.env.example` menjadi `.env` jika diperlukan.

### 4. Jalankan Server Pengembangan (Dev)
```bash
npm run dev
```
Akses aplikasi melalui browser di [http://localhost:3000](http://localhost:3000).

### 5. Kompilasi Produksi (Build)
```bash
npm run build
```
Berkas siap rilis akan di-generate ke dalam direktori `dist/`.

---

## 🔄 Panduan Sinkronisasi ke GitHub

Untuk menyinkronkan seluruh kode terbaru ke repositori GitHub Anda:

```bash
# 1. Periksa berkas yang telah diperbarui
git status

# 2. Tambahkan seluruh berkas perubahan ke staging area
git add .

# 3. Buat commit dengan pesan deskriptif
git commit -m "feat: tambahkan portal proktor, manajemen proktor admin, reset peserta, dan update dokumentasi"

# 4. Pastikan branch utama adalah main (atau master sesuai repo Anda)
git branch -M main

# 5. Hubungkan ke remote GitHub (hanya jika baru pertama kali inisialisasi)
# git remote add origin https://github.com/USERNAME/REPO_ANDA.git

# 6. Unggah perubahan ke GitHub
git push -u origin main
```

---

## 🔐 Konfigurasi Firebase 'Authorized Domains'

Jika Anda menggunakan fitur **Masuk via Akun Google** pada Portal Guru, pastikan domain deployment telah didaftarkan pada konsol Firebase:

1. Kunjungi [Firebase Console &rarr; Authentication &rarr; Settings](https://console.firebase.google.com/).
2. Gulir ke bagian **Authorized domains** (Domain resmi).
3. Tambahkan domain aplikasi Anda (misal domain Vercel, Netlify, atau Cloud Run).
4. Klik **Simpan**.

---

## 🔒 Keamanan & Hak Akses Firestore

Sistem database Firestore diamankan dengan `firestore.rules`:
- **Siswa**: Hanya dapat membaca ujian aktif yang terdaftar dan mengirimkan lembar jawaban sesuai sesi yang sedang berjalan.
- **Proktor**: Memiliki akses verifikasi kredensial terpisah, dapat memperbarui status peserta ujian (*reset* sesi), serta membaca rekap hasil ujian untuk pengawasan ruang.
- **Guru & Admin**: Memiliki hak penuh untuk konfigurasi ujian, bank soal, manajemen akun proktor, dan penghapusan data.

---

## 📄 Lisensi

Proyek ini dikembangkan dengan dedikasi tinggi untuk mendukung kemajuan asesmen dan literasi digital pendidikan sekolah di Indonesia. Bebas dikembangkan dan disesuaikan untuk kebutuhan instansi pendidikan.
