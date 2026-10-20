# 🎓 CBT CERIA - Aplikasi CBT Online Ramah Anak SD

[![React](https://img.shields.io/badge/React-19.0-61dafb?logo=react&logoColor=black)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-3178c6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4.0-38bdf8?logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![Firebase](https://img.shields.io/badge/Firebase-Firestore_%26_Auth-ffca28?logo=firebase&logoColor=black)](https://firebase.google.com/)
[![Vite](https://img.shields.io/badge/Vite-6.0-646cff?logo=vite&logoColor=white)](https://vitejs.dev/)

**CBT CERIA** adalah platform Computer-Based Test (CBT) modern berbasis web yang dirancang khusus untuk siswa Sekolah Dasar (SD) di Indonesia. Memadukan antarmuka visual yang ceria, ramah anak, dan bebas intimidasi dengan fitur manajemen ujian yang lengkap, aman, dan analitis untuk para guru.

---

## ✨ Fitur Unggulan

### 🎒 1. Portal Siswa (Ramah Anak & Edukatif)
- **Tampilan Interaktif & Ramah Anak**: Tipografi bersahabat (font Fredoka & Nunito), warna ceria, tombol berukuran besar, dan ramah sentuhan (touch-friendly).
- **Akses Ujian via Token**: Siswa masuk hanya dengan memasukkan nama, nomor peserta, dan token ujian yang diberikan guru.
- **Engine Soal Interaktif**:
  - Pilihan ganda dengan feedback visual yang jelas.
  - Penanda soal "Ragu-ragu".
  - Navigasi nomor soal cepat.
  - Timer waktu ujian dinamis dengan hitung mundur dan konfirmasi otomatis saat waktu habis.
- **Hasil & Apresiasi Belajar**:
  - Pengumuman nilai instan dengan pesan motivatif positif.
  - Efek selebrasi konfeti interaktif (*canvas-confetti*).
  - Unduh **Sertifikat Penghargaan Digital** langsung dalam bentuk gambar/cetak.

### 👨‍🏫 2. Portal Guru & Pengawas
- **Dashboard Analitik**: Ringkasan jumlah ujian aktif, bank soal, total peserta, serta rata-rata nilai.
- **Manajemen Ujian**:
  - Pembuatan ujian baru, pengaturan durasi, token ujian, dan status aktif/nonaktif.
  - Pengacakan urutan soal dan opsi jawaban.
- **Bank Soal Beragam Tipe & Import Excel**:
  - **Pilihan Ganda Biasa (Single Choice)**: 1 opsi jawaban benar.
  - **Pilihan Ganda Kompleks Multi-Opsi**: Memilih lebih dari 1 pilihan jawaban yang benar.
  - **Pilihan Ganda Kompleks Pernyataan (Benar / Salah)**: Daftar butir pernyataan di mana siswa menentukan status **Benar (B)** atau **Salah (S)** pada setiap butir pernyataan.
  - Penulisan rumus matematika ramah CBT web dengan konversi otomatis simbol standar SD.
  - Tambah soal secara manual atau import massal via file Excel (`.xlsx`).
  - Template soal Excel yang mudah digunakan oleh guru.
- **Monitoring Peserta Real-time**:
  - Pantau siswa yang sedang mengerjakan ujian secara langsung (*live status*).
  - Reset status peserta per-individu jika siswa mengalami kendala perangkat atau internet.
- **Hasil & Analisis Nilai**:
  - Distribusi nilai, nilai tertinggi, terendah, dan rata-rata kelas.
  - Grafik visualisasi nilai menggunakan **Recharts**.
  - **Fitur Reset Hasil Ujian**: Opsi reset data hasil ujian secara massal atau per-siswa jika diperlukan ujian susulan/remedial.
  - Ekspor rekapitulasi nilai lengkap ke format **Microsoft Excel (`.xlsx`)** dan **PDF Dokumen Resmi (`jsPDF`)**.

---

## 🛠️ Teknologi yang Digunakan

| Komponen | Teknologi | Keterangan |
| :--- | :--- | :--- |
| **Frontend** | React 19, TypeScript, Vite | Arsitektur SPA cepat, modern & type-safe |
| **Styling** | Tailwind CSS v4, Lucide Icons | Desain responsif, modern, dan ringan |
| **Animasi & Interaksi** | Motion, Canvas Confetti | Efek transisi halus dan perayaan kelulusan |
| **Grafik & Analisis** | Recharts | Visualisasi distribusi nilai & statistik |
| **Ekspor Dokumen** | `xlsx` (SheetJS), `jspdf`, `jspdf-autotable` | Unduh rekap nilai Excel & laporan PDF |
| **Backend & Database** | Firebase Firestore, Firebase Authentication | Penyimpanan data awan real-time & autentikasi guru |

---

## 🚀 Panduan Instalasi & Menjalankan Proyek

### 1. Kloning Repositori
```bash
git clone https://github.com/username/cbt-ceria.git
cd cbt-ceria
```

### 2. Pasang Dependensi
Pastikan Anda sudah menginstal **Node.js** (versi 18 atau lebih baru):
```bash
npm install
# atau menggunakan bun / pnpm / yarn
```

### 3. Konfigurasi Lingkungan (Environment)
1. Salin berkas `.env.example` menjadi `.env`:
   ```bash
   cp .env.example .env
   ```
2. Pastikan file konfigurasi Firebase `firebase-applet-config.json` tersedia di root proyek dengan struktur:
   ```json
   {
     "apiKey": "YOUR_API_KEY",
     "authDomain": "YOUR_PROJECT.firebaseapp.com",
     "projectId": "YOUR_PROJECT_ID",
     "storageBucket": "YOUR_PROJECT.appspot.com",
     "messagingSenderId": "YOUR_SENDER_ID",
     "appId": "YOUR_APP_ID",
     "firestoreDatabaseId": "(default)"
   }
   ```

### 4. Jalankan Server Pengembangan (Dev)
```bash
npm run dev
```
Buka peramban (browser) di [http://localhost:3000](http://localhost:3000).

### 5. Kompilasi Produksi (Build)
```bash
npm run build
```
Hasil build akan tersimpan di dalam direktori `dist/`.

---

## 🔐 Konfigurasi Firebase 'Authorized Domains' (Login Google)

Agar fitur **Masuk via Akun Google** (`andika.yuliananta@gmail.com`) bekerja tanpa kendala `auth/unauthorized-domain`:

1. Buka [Firebase Console &rarr; Authentication &rarr; Settings](https://console.firebase.google.com/project/dark-karst-5xctm/authentication/settings).
2. Gulir ke bagian **Authorized domains** (Domain resmi).
3. Klik **Add domain** lalu masukkan domain deployment Anda:
   - `ais-dev-xzuiq6p4u3ojuffsggndvw-857154047210.asia-southeast1.run.app` (Dev URL)
   - `ais-pre-xzuiq6p4u3ojuffsggndvw-857154047210.asia-southeast1.run.app` (Shared URL)
   - Domain kustom Anda (misal `cbt.sekolah.sch.id` atau domain hosting Vercel/Netlify).
4. Klik **Save**.
5. Panduan lengkap dan langkah detail tersedia di berkas [`docs/PANDUAN_AUTHORIZED_DOMAINS.md`](./docs/PANDUAN_AUTHORIZED_DOMAINS.md).

---

## 📂 Struktur Direktori

```plaintext
├── public/                 # Aset statis publik
├── src/
│   ├── components/
│   │   ├── common/         # Komponen umum (Navbar, Footer, Modal, Button)
│   │   ├── landing/        # Komponen Beranda / Halaman Awal
│   │   ├── student/        # Komponen Portal Siswa (ExamEngine, Certificate, dll.)
│   │   └── teacher/        # Komponen Portal Guru (Analytics, Manager, Reset, dll.)
│   ├── pages/              # Halaman utama (LandingPage, TeacherPortal)
│   ├── services/
│   │   └── firebase/       # Layanan Auth, Firestore & Operasi Ujian
│   ├── types/              # Definisi tipe TypeScript
│   ├── utils/              # Helper, formatter, dan fungsi utilitas
│   ├── App.tsx             # Komponen Router & State Utama
│   ├── index.css           # Styling Global Tailwind CSS
│   └── main.tsx            # Entry point aplikasi React
├── firebase-applet-config.json # Konfigurasi Firebase App
├── firestore.rules         # Aturan keamanan database Firestore
├── metadata.json           # Metadata aplikasi
├── package.json            # Daftar dependensi & script project
├── tsconfig.json           # Konfigurasi TypeScript
├── vite.config.ts          # Konfigurasi Vite
└── README.md               # Dokumentasi proyek
```

---

## 🔒 Keamanan & Aturan Firestore

Aplikasi dilengkapi dengan `firestore.rules` yang memastikan:
- Siswa hanya dapat membaca ujian aktif dan mengirimkan jawaban mereka sesuai sesi.
- Pengelolaan soal, hasil rekap, dan reset data hanya dapat dilakukan oleh guru terautentikasi.

---

## 📄 Lisensi

Proyek ini dikembangkan untuk kebutuhan edukasi dan asesmen sekolah. Bebas dimodifikasi sesuai kebutuhan sekolah dan tenaga pengajar di Indonesia.
