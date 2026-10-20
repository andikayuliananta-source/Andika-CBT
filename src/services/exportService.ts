import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Result, Exam, Question } from '../types';

export function exportResultsToExcel(examTitle: string, results: Result[]) {
  const rows = results.map((r, idx) => ({
    No: idx + 1,
    'Nama Siswa': r.name,
    'Asal Sekolah': r.school,
    Kelas: `Kelas ${r.grade}`,
    'Total Soal': r.totalQuestions,
    'Jawaban Benar': r.correctAnswers,
    'Jawaban Salah': r.wrongAnswers,
    Nilai: r.score,
    Status: r.status,
    'Waktu Selesai': r.finishedAt ? new Date(r.finishedAt).toLocaleString('id-ID') : '-',
  }));

  const worksheet = XLSX.utils.json_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Hasil Ujian');

  const safeTitle = (examTitle || 'Ujian').replace(/[^a-zA-Z0-9_-]/g, '_');
  XLSX.writeFile(workbook, `CBT_CERIA_Hasil_${safeTitle}.xlsx`);
}

export function exportResultsToPdf(exam: Exam, results: Result[]) {
  const doc = new jsPDF();

  // Header Title
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.setTextColor(30, 41, 59);
  doc.text('CBT CERIA', 14, 20);

  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text('LAPORAN HASIL UJIAN BERBASIS KOMPUTER', 14, 27);

  // Metadata Info Box
  doc.setFontSize(10);
  doc.setTextColor(51, 65, 85);
  doc.text(`Nama Ujian   : ${exam.title}`, 14, 38);
  doc.text(`Mata Pelajaran: ${exam.subject}`, 14, 44);
  doc.text(`Kelas / KKM   : Kelas ${exam.grade} SD / KKM: ${exam.kkm}`, 14, 50);
  doc.text(`Tanggal Unduh : ${new Date().toLocaleDateString('id-ID', { dateStyle: 'full' })}`, 14, 56);
  doc.text(`Total Peserta : ${results.length} Siswa`, 14, 62);

  // Table
  const tableData = results.map((r, idx) => [
    idx + 1,
    r.name,
    r.school,
    `Kelas ${r.grade}`,
    r.correctAnswers,
    r.wrongAnswers,
    r.score,
    r.status,
  ]);

  autoTable(doc, {
    startY: 68,
    head: [['No', 'Nama Siswa', 'Asal Sekolah', 'Kelas', 'Benar', 'Salah', 'Nilai', 'Status']],
    body: tableData,
    theme: 'striped',
    headStyles: {
      fillColor: [245, 158, 11], // Amber 500
      textColor: [255, 255, 255],
      fontStyle: 'bold',
    },
    styles: {
      fontSize: 9,
      cellPadding: 3,
    },
    didDrawPage: (data) => {
      // Mandatory copyright footer
      const pageSize = doc.internal.pageSize;
      const pageHeight = pageSize.height || pageSize.getHeight();
      doc.setFontSize(8);
      doc.setTextColor(148, 163, 184);
      doc.text(
        '© 2026 CBT CERIA • By Andika Yuliananta, S.Pd.',
        14,
        pageHeight - 10
      );
      doc.text(
        `Halaman ${data.pageNumber}`,
        pageSize.width - 30,
        pageHeight - 10
      );
    },
  });

  const safeTitle = (exam.title || 'Ujian').replace(/[^a-zA-Z0-9_-]/g, '_');
  doc.save(`CBT_CERIA_Hasil_${safeTitle}.pdf`);
}

export function downloadQuestionImportTemplate() {
  const sampleData = [
    {
      nomor: 1,
      tipe_soal: 'BIASA',
      pertanyaan: 'Berapakah hasil dari 12 x 4 : 2?',
      gambar: '',
      option_a: '12',
      gambar_a: '',
      option_b: '24',
      gambar_b: '',
      option_c: '48',
      gambar_c: '',
      option_d: '96',
      gambar_d: '',
      kunci_jawaban: 'B',
      bobot: 20,
      pembahasan: '12 x 4 = 48, kemudian 48 : 2 = 24.',
    },
    {
      nomor: 2,
      tipe_soal: 'KOMPLEKS',
      pertanyaan: 'Di antara bilangan-bilangan berikut, manakah yang merupakan bilangan prima? (Pilih semua yang benar)',
      gambar: '',
      option_a: '11',
      gambar_a: '',
      option_b: '15',
      gambar_b: '',
      option_c: '17',
      gambar_c: '',
      option_d: '21',
      gambar_d: '',
      kunci_jawaban: 'A,C',
      bobot: 20,
      pembahasan: '11 dan 17 adalah bilangan prima karena hanya memiliki 2 faktor. Sedangkan 15 dan 21 bukan prima.',
    },
    {
      nomor: 3,
      tipe_soal: 'PERNYATAAN',
      pertanyaan: 'Perhatikan beberapa pernyataan tentang bangun datar berikut. Tentukan apakah setiap pernyataan bernilai Benar (B) atau Salah (S)!',
      gambar: '',
      option_a: 'Persegi memiliki 4 sisi sama panjang dan 4 sudut siku-siku.',
      gambar_a: '',
      option_b: 'Segitiga sama sisi memiliki 3 sudut yang besarnya masing-masing 60 derajat.',
      gambar_b: '',
      option_c: 'Lingkaran memiliki 4 titik sudut yang berhadapan.',
      gambar_c: '',
      option_d: '',
      gambar_d: '',
      kunci_jawaban: 'B,B,S',
      bobot: 20,
      pembahasan: 'Pernyataan 1 Benar. Pernyataan 2 Benar. Pernyataan 3 Salah (lingkaran tidak memiliki titik sudut).',
    },
    {
      nomor: 4,
      tipe_soal: 'BIASA',
      pertanyaan: 'Besar sudut satu putaran penuh adalah ...',
      gambar: '',
      option_a: '45°',
      gambar_a: '',
      option_b: '90° (90 derajat)',
      gambar_b: '',
      option_c: '180°',
      gambar_c: '',
      option_d: '360°',
      gambar_d: '',
      kunci_jawaban: 'D',
      bobot: 20,
      pembahasan: 'Satu putaran penuh memiliki sudut tepat 360°.',
    },
  ];

  const guideData = [
    {
      Kolom: 'nomor',
      Wajib: 'Ya',
      Keterangan: 'Nomor urut soal (1, 2, 3, dst.)',
    },
    {
      Kolom: 'tipe_soal',
      Wajib: 'Tidak',
      Keterangan: 'Pilih: "BIASA" (1 opsi benar), "KOMPLEKS" (multi opsi benar), atau "PERNYATAAN" (soal Benar/Salah). Default: BIASA',
    },
    {
      Kolom: 'pertanyaan',
      Wajib: 'Ya',
      Keterangan: 'Teks pertanyaan atau stimulus soal',
    },
    {
      Kolom: 'gambar',
      Wajib: 'Tidak',
      Keterangan: 'Link URL gambar utama soal (https://...)',
    },
    {
      Kolom: 'option_a s/d option_d (atau pernyataan_1 s/d 4)',
      Wajib: 'Ya (min 2)',
      Keterangan: 'Teks opsi A, B, C, D (untuk BIASA/KOMPLEKS) atau Pernyataan 1, 2, 3, 4 (untuk PERNYATAAN)',
    },
    {
      Kolom: 'gambar_a s/d gambar_d (atau gambar_1 s/d 4)',
      Wajib: 'Tidak',
      Keterangan: 'Link URL gambar untuk pilihan atau pernyataan terkait (https://...)',
    },
    {
      Kolom: 'kunci_jawaban',
      Wajib: 'Ya',
      Keterangan: 'Untuk BIASA: "A"/"B"/"C"/"D". Untuk KOMPLEKS: contoh "A,C". Untuk PERNYATAAN: urutan Benar/Salah contoh "B,S,B" atau "1:B, 2:S, 3:B"',
    },
    {
      Kolom: 'bobot',
      Wajib: 'Tidak',
      Keterangan: 'Poin nilai soal (contoh: 20 atau 25). Default: 20',
    },
    {
      Kolom: 'pembahasan',
      Wajib: 'Tidak',
      Keterangan: 'Penjelasan atau pembahasan jawaban soal',
    },
  ];

  const worksheet = XLSX.utils.json_to_sheet(sampleData);
  const guideSheet = XLSX.utils.json_to_sheet(guideData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Format Soal CBT CERIA');
  XLSX.utils.book_append_sheet(workbook, guideSheet, 'Panduan Pengisian');
  XLSX.writeFile(workbook, 'Template_Import_Soal_CBT_CERIA.xlsx');
}
