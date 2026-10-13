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
      pertanyaan: 'Berapakah hasil dari 12 x 4 : 2?',
      gambar: '',
      option_a: '12',
      option_b: '24',
      option_c: '48',
      option_d: '96',
      correct_answer: 'B',
      weight: 25,
      explanation: '12 x 4 = 48, kemudian 48 : 2 = 24.',
    },
    {
      nomor: 2,
      pertanyaan: 'Bentuk pecahan paling sederhana dari 6/16 adalah ...',
      gambar: '',
      option_a: '1/4',
      option_b: '2/8',
      option_c: '3/8',
      option_d: '5/8',
      correct_answer: 'C',
      weight: 25,
      explanation: 'Pembilang dan penyebut sama-sama dibagi 2 sehingga 6/16 = 3/8.',
    },
    {
      nomor: 3,
      pertanyaan: 'Sebuah persegi memiliki panjang sisi 12 cm. Luas persegi tersebut adalah ...',
      gambar: '',
      option_a: '48 cm²',
      option_b: '120 cm²',
      option_c: '144 cm²',
      option_d: '144 cm3',
      correct_answer: 'C',
      weight: 25,
      explanation: 'Luas persegi = sisi x sisi = 12 cm x 12 cm = 144 cm² (atau 144 cm2).',
    },
    {
      nomor: 4,
      pertanyaan: 'Besar sudut siku-siku adalah ...',
      gambar: '',
      option_a: '45°',
      option_b: '90° (90 derajat)',
      option_c: '180°',
      option_d: '360°',
      correct_answer: 'B',
      weight: 25,
      explanation: 'Sudut siku-siku memiliki besar sudut tepat 90° atau 90 derajat.',
    },
  ];

  const worksheet = XLSX.utils.json_to_sheet(sampleData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Format Soal CBT CERIA');
  XLSX.writeFile(workbook, 'Template_Import_Soal_CBT_CERIA.xlsx');
}
