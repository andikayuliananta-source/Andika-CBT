# Sistem Portal Proktor CBT CERIA

Rencana arsitektur dan implementasi penambahan subsistem **Portal Proktor** ke dalam aplikasi ujian Computer Based Test **CBT CERIA** tanpa mengubah atau mengganggu seluruh fitur Guru/Admin yang sudah ada.

---

## User Review & Critical Decisions

> [!IMPORTANT]
> Keputusan dan preferensi implementasi telah dikonfirmasi bersama pengguna melalui sesi klarifikasi interaktif:

- **Confirmed Decision 1 (Ruang Lingkup Pengawasan)**: Akun proktor memiliki akses fleksibel untuk memilih dan memantau semua ujian yang sedang aktif di sekolah/ruangan.
- **Confirmed Decision 2 (Mekanisme Reset Peserta)**: Aksi "Reset Peserta" membuka kunci sesi login siswa yang terkendala (mati lampu, restart laptop, crash browser) tanpa menghilangkan riwayat dan lembar jawaban yang telah dikerjakan oleh siswa.
- **Confirmed Decision 3 (Akses Hasil Ujian)**: Halaman Hasil Ujian proktor dilengkapi dengan tabel rekap interaktif, pencarian, filter status kelulusan, dan tombol unduh instan ke file spreadsheet (CSV/Excel).

---

## 1. Overview & Core Concept

- **What It Does**: Memperluas ekosistem CBT CERIA dengan peran ketiga yakni **Proktor Ujian** (pengawas ruangan). Proktor bertugas mendampingi pelaksanaan teknis di ruang lab/kelas, mengatasi kendala siswa terkunci dengan fitur Reset Peserta satu klik, memantau ritme pengerjaan siswa secara langsung (live monitoring), serta melihat dan mengunduh rekap hasil ujian sesaat setelah sesi berakhir.
- **Target Audience / Persona**: Proktor Ruang Ujian / Teknisi Laboratorium Komputer SD yang memerlukan antarmuka cepat, bersih, dan berfokus pada penanganan teknis tanpa akses ke bank soal atau setelan master ujian milik Admin/Guru.
- **Key Value**: Mencegah kepanikan saat terjadi mati listrik atau laptop siswa restart, mengisolasi wewenang agar proktor tidak sengaja mengubah bank soal, dan menjaga kelancaran 800+ siswa yang mengakses ujian bersamaan.

---

## 2. User Experience & Visual Design

### Key User Flows

1. **Akses dari Beranda (Landing Page)**:
   - Header navigasi memiliki 3 tombol akses sejajar: **🎓 Siswa**, **🛡️ Proktor**, dan **🔐 Guru / Admin**.
   - Pada kartu utama beranda, terdapat 3 kartu portal utama dengan visual konsisten:
     - Kartu Siswa (Kuning/Amber ceria)
     - Kartu Proktor (Emerald/Teal bersahabat & sigap)
     - Kartu Guru/Admin (Biru/Indigo profesional & aman)
2. **Manajemen Proktor di Portal Guru / Admin**:
   - Menu baru "Manajemen Proktor" hadir di sidebar admin (ikon ShieldCheck).
   - Admin dapat menambah proktor baru (Username, Password, Nama Proktor, Keterangan Ruangan/Lab).
   - Tabel interaktif untuk melihat daftar proktor, mengganti password/edit nama, mengaktifkan/menonaktifkan, atau menghapus akun proktor.
3. **Login & Dashboard Proktor**:
   - Halaman login khusus Proktor (`/proctor-login`) dengan form Username & Password.
   - Setelah otentikasi berhasil, proktor diarahkan ke **Dashboard Proktor** (`/proctor-dashboard`) yang memiliki 3 tab terisolasi:
     - **Tab 1: Reset Peserta**: Tabel siswa aktif, status sesi terkunci/berlangsung, tombol "Buka Kunci Sesi", dan indikator jumlah soal tersimpan.
     - **Tab 2: Pantau Ujian**: Statistik real-time (Belum Mulai, Sedang Mengerjakan, Selesai), filter per judul ujian, bar progres pengerjaan, dan deteksi pelanggaran (tab switch count).
     - **Tab 3: Hasil Ujian**: Rekapitulasi nilai siswa lengkap dengan skor, KKM, status kelulusan, rincian benar/salah, dan tombol ekspor CSV/Excel.
   - Sesi proktor diamankan dalam `proctorSession` dan dicegah secara ketat agar tidak dapat melompat ke rute Admin.

### Visual Identity & Theme
- **Warna Utama Proktor**: Emerald / Teal (`emerald-600`, `teal-500`, latar lembut `emerald-50/60`) melambangkan kesigapan pengawas, ketenangan teknis, dan tetap selaras dengan nuansa ramah anak CBT CERIA.
- **Tipografi**: Display font font-display dengan hierarchy teks yang tebal, jelas, dan kontras tinggi untuk memudahkan proktor membaca nama peserta di ruangan ujian dari jarak pandang monitor.
- **Feedback & Micro-interactions**: Modal konfirmasi saat reset sesi, status indikator hijau/kuning/biru yang hidup, toast notifikasi sukses reset, dan tombol aksi berukuran responsif.

---

## 3. Key Product Decisions & Trade-Offs

- **Decision 1: Penyimpanan Kredensial Proktor**:
  - *Chosen Approach*: Menyimpan akun proktor dalam koleksi Firestore `proctors` dengan hash token / sanitasi password yang diverifikasi secara spesifik oleh service autentikasi proktor.
  - *Why*: Memisahkan akun proktor dari akun Firebase Google Auth Admin utama (`andika.yuliananta@gmail.com`), sehingga guru/admin dapat membuatkan 5-20 akun proktor ruangan tanpa harus mendaftarkan email Google baru untuk tiap proktor.
  - *Alternatives Considered*: Firebase Auth Anonymous atau email palsu ditolak karena merepotkan pengelolaan akun oleh admin sekolah.
- **Decision 2: Strategi Reset Peserta**:
  - *Chosen Approach*: Mengubah status sesi participant menjadi `IN_PROGRESS` (jika stuck), membersihkan session lock dan penanda logout browser, namun mempertahankan seluruh riwayat jawaban di Firestore dan autosave snapshot.
  - *Why*: Menjamin siswa yang komputernya mati dapat login kembali dengan token ujian dan nama yang sama, lalu langsung melanjutkan soal yang belum selesai tanpa mengulang dari nomor 1.
- **Decision 3: Pemisahan Sesi & Proteksi Routing**:
  - *Chosen Approach*: Penyimpanan session proktor di `sessionStorage`/`localStorage` dengan token verifikasi terpisah (`cbt_proctor_session`). Jika user aktif berstatus proktor mencoba mengakses halaman admin, sistem langsung mengalihkan kembali ke dashboard proktor dengan peringatan wewenang.

---

## 4. Technical Architecture & Data Strategy

### System Architecture Diagram

```
┌────────────────────────────────────────────────────────────────────────┐
│                        CBT CERIA LANDING PAGE                          │
│        [🎓 Siswa]            [🛡️ Proktor]         [🔐 Guru/Admin]       │
└────────────┬───────────────────────┬──────────────────────┬────────────┘
             │                       │                      │
             ▼                       ▼                      ▼
    ┌─────────────────┐    ┌──────────────────┐    ┌────────────────────┐
    │  Portal Siswa   │    │  Portal Proktor  │    │ Portal Guru/Admin  │
    │  (Token Ujian)  │    │  (User/Password) │    │  (Admin Auth Safe) │
    └────────┬────────┘    └─────────┬────────┘    └─────────┬──────────┘
             │                       │                       │
             │                       ├─ Reset Peserta        ├─ Manajemen Ujian
             │                       ├─ Pantau Ujian (Live)  ├─ Bank Soal
             │                       └─ Hasil Ujian (Export) ├─ Hasil Analytics
             │                                               ├─ Manajemen Proktor (CRUD)
             ▼                                               └─ Pengaturan CBT
    ┌───────────────────────────────────────────────────────────────────┐
    │                       FIRESTORE DATABASE                          │
    │  • exams/{examId}                                                 │
    │  • exams/{examId}/questions/{questionId}                          │
    │  • exams/{examId}/participants/{participantId}                    │
    │  • exams/{examId}/answers/{answerId}                              │
    │  • results/{resultId}                                             │
    │  • proctors/{proctorId}  <-- NEW COLLECTION                       │
    └───────────────────────────────────────────────────────────────────┘
```

### Data Model & Firestore Schema

#### Entitas Baru: `Proctor` (`proctors/{proctorId}`)
```typescript
export interface Proctor {
  proctorId: string;        // ID unik proktor (auto-generated / UUID)
  username: string;         // Username unik untuk login proktor (huruf kecil & angka)
  password: string;         // Password akses proktor
  name: string;             // Nama lengkap proktor (misal: "Budi Santoso, S.Kom")
  roomOrLab?: string;       // Keterangan ruangan (misal: "Lab Komputer 1", "Ruang 04")
  status: 'ACTIVE' | 'INACTIVE';
  assignedExamIds?: string[]; // Opsional: batas ujian (default: semua ujian aktif)
  createdAt: string;
  updatedAt: string;
  createdBy: string;        // UID Admin yang membuat
}
```

### File-Level Implementation Plan

1. **Tipe Data & Model (`src/types/index.ts`)**:
   - Tambahkan interface `Proctor` dan `ProctorSession`.
   - Tambahkan enum view `PROCTOR_LOGIN` dan `PROCTOR_DASHBOARD` pada `AppView`.
   - Perluas `TeacherTab` dengan menu `'proctors'`.

2. **Layanan Autentikasi & Database Proktor (`src/services/firebase/proctorService.ts`)**:
   - `getProctors()`: Mengambil daftar semua proktor untuk tabel admin.
   - `createProctor(data)`: Membuat akun proktor baru dengan validasi username unik.
   - `updateProctor(proctorId, data)`: Mengubah nama, password, atau status proktor.
   - `deleteProctor(proctorId)`: Menghapus akun proktor.
   - `loginProctor(username, password)`: Verifikasi login proktor dan mengembalikan data sesi.
   - `resetStudentSessionByProctor(examId, participantId)`: Buka kunci sesi siswa dan pulihkan status `IN_PROGRESS`.

3. **Komponen Manajemen Proktor di Portal Guru (`src/components/teacher/ProctorManagement.tsx`)**:
   - Form pembuatan akun proktor baru (Username, Password, Nama, Ruangan).
   - Tabel daftar akun proktor dengan status aktif, tanggal pembuatan, tombol edit password, dan tombol hapus.
   - Integrasikan ke `TeacherSidebar.tsx` dan `TeacherPortal.tsx` tanpa menyentuh fitur yang sudah ada.

4. **Komponen Portal Proktor (`src/components/proctor/`)**:
   - `ProctorLogin.tsx`: Antarmuka login proktor yang bersih, konsisten tema CBT Ceria, validasi cepat, dan tombol kembali ke beranda.
   - `ProctorDashboard.tsx`: Dashboard utama proktor dengan header profil, tombol logout, pemilih ujian aktif, dan 3 tab utama:
     - `ResetPesertaTab.tsx`: Tampilan daftar peserta ujian aktif, tombol "Reset Sesi / Buka Kunci", filter pencarian nama siswa/sekolah, dan status koneksi.
     - `PantauUjianTab.tsx`: Live monitoring kemajuan siswa (progres bar, durasi tersisa, jumlah soal dijawab, deteksi keluar tab).
     - `HasilUjianTab.tsx`: Tabel rekap nilai, persentase kelulusan KKM, dan fitur ekspor ke file format CSV/Excel.

5. **Pembaruan Navigasi Beranda (`Navbar.tsx` & `LandingPage.tsx`)**:
   - Tambahkan tombol "Proktor" di samping tombol "Siswa" dan "Guru / Admin" pada Navbar.
   - Tambahkan kartu akses Proktor berwarna Emerald/Teal di Landing Page yang serasi dengan kartu Siswa dan Guru.

6. **Pembaruan Router Utama (`src/App.tsx`)**:
   - Tangani state `PROCTOR_LOGIN` dan `PROCTOR_DASHBOARD`.
   - Pasang proteksi otorisasi yang ketat: sesi proktor tidak bisa membuka rute `TEACHER_PORTAL`, dan sesi non-admin tidak bisa mengakses fitur manajemen proktor.

7. **Sinkronisasi Blueprint & Aturan Keamanan (`firebase-blueprint.json` & `firestore.rules`)**:
   - Daftarkan skema entitas `proctor` di `firebase-blueprint.json`.
   - Perbarui aturan Firestore untuk koleksi `proctors` (hanya admin yang dapat menulis/menghapus proktor, proktor dapat membaca kredensial saat login).
   - Jalankan verifikasi linting dan build (`compile_applet`).
