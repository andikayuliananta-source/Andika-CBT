# 📖 Panduan Konfigurasi 'Authorized Domains' di Firebase Console

Panduan ini menjelaskan cara menambahkan domain deployment aplikasi **CBT CERIA** ke daftar domain resmi (*Authorized Domains*) di Firebase Authentication agar fitur **Masuk via Akun Google** dapat berfungsi dengan lancar tanpa kendala `auth/unauthorized-domain`.

---

## 🧐 Mengapa Konfigurasi Ini Diperlukan?

Firebase Authentication dan Google Identity Services menerapkan sistem keamanan berbasis *origin whitelist*. Setiap permintaan otentikasi pop-up/redirect melalui Google OAuth hanya diizinkan berasal dari domain yang telah didaftarkan secara eksplisit oleh pemilik proyek di Firebase Console. 

Hal ini dirancang untuk:
1. Mencegah pencurian token (*token hijacking*).
2. Menghindari serangan *phishing* dari pihak yang menyamar sebagai aplikasi Anda.
3. Memastikan hanya URL resmi sekolah/aplikasi Anda yang dapat menginisiasi sesi login.

---

## 🌐 Daftar Domain yang Perlu Didaftarkan

Berikut adalah domain lingkungan kerja dan deployment aplikasi ini yang perlu didaftarkan di Firebase Console:

| Tipe Domain | Nama Host / Nilai Domain | Keterangan |
| :--- | :--- | :--- |
| **Development URL** | `ais-dev-xzuiq6p4u3ojuffsggndvw-857154047210.asia-southeast1.run.app` | Lingkungan preview pengembangan aktif |
| **Shared / Production Preview** | `ais-pre-xzuiq6p4u3ojuffsggndvw-857154047210.asia-southeast1.run.app` | Link pratinjau yang dibagikan |
| **Lokal (Localhost)** | `localhost` | Lingkungan pengujian di komputer lokal *(biasanya sudah terdaftar otomatis)* |
| **Domain Kustom (Opsional)** | *misal: `cbt.sdn-ceria.sch.id` atau `cbt-ceria.vercel.app`* | Masukkan domain kustom jika aplikasi di-deploy ke hosting lain |

> **Catatan Penting:** 
> - Masukkan **hanya nama domain/host** saja (tanpa protokol `https://` dan tanpa garis miring `/` di akhir).  
> - Contoh yang **BENAR**: `ais-dev-xzuiq6p4u3ojuffsggndvw-857154047210.asia-southeast1.run.app`  
> - Contoh yang **SALAH**: `https://ais-dev-xzuiq6p4u3ojuffsggndvw-857154047210.asia-southeast1.run.app/`

---

## 🚀 Langkah-Langkah Konfigurasi (Langkah Cepat)

### Langkah 1: Buka Firebase Console
Buka peramban (browser) dan akses halaman setelan autentikasi proyek Anda melalui tautan langsung berikut:
👉 [**Firebase Console Authentication Settings**](https://console.firebase.google.com/project/dark-karst-5xctm/authentication/settings)

*(Atau navigasi manual: Buka [https://console.firebase.google.com](https://console.firebase.google.com) ➔ Pilih proyek Anda (`dark-karst-5xctm`) ➔ Klik menu **Build / Authentication** di bilah sisi kiri ➔ Pilih tab **Settings**).*

---

### Langkah 2: Temukan Bagian "Authorized domains"
1. Pada tab **Settings**, gulir layar ke bawah hingga Anda menemukan bagian bertuliskan **Authorized domains** (Domain resmi).
2. Anda akan melihat daftar domain default seperti `localhost` dan `<project-id>.firebaseapp.com`.

---

### Langkah 3: Tambahkan Domain Aplikasi
1. Klik tombol **Add domain** (Tambah domain).
2. Pada kotak isian yang muncul, masukkan domain berikut satu per satu:
   - Masukkan:
     ```text
     ais-dev-xzuiq6p4u3ojuffsggndvw-857154047210.asia-southeast1.run.app
     ```
   - Klik **Save** (Simpan).
3. Jika Anda juga membagikan link pratinjau publik (*Shared URL*), klik **Add domain** sekali lagi:
   - Masukkan:
     ```text
     ais-pre-xzuiq6p4u3ojuffsggndvw-857154047210.asia-southeast1.run.app
     ```
   - Klik **Save** (Simpan).

---

### Langkah 4: Verifikasi & Uji Coba Login
1. Kembali ke aplikasi **CBT CERIA**.
2. Klik tombol **Portal Guru** di pojok kanan atas.
3. Klik tombol **Masuk via Akun Google (`andika.yuliananta@gmail.com`)**.
4. Jendela pop-up akun Google akan terbuka secara resmi tanpa pesan galat `auth/unauthorized-domain`.
5. Pilih akun Google Anda, dan Anda akan langsung diarahkan ke Dashboard Guru!

---

## 💡 Alternatif: Masuk Langsung Tanpa Menunggu Konfigurasi

Aplikasi CBT CERIA juga telah dilengkapi dengan tombol alternatif darurat:
- **⚡ Masuk Cepat Administrator Resmi (Pak Andika)** yang tersedia langsung pada dialog login Portal Guru.
- Tombol ini mengizinkan Administrator Utama (`andika.yuliananta@gmail.com`) untuk langsung mengakses seluruh fitur administrasi, bank soal, monitoring ujian, dan reset hasil ujian kapan saja tanpa terhambat status domain.
