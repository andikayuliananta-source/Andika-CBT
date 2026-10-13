import { Result, Exam } from '../types';

/**
 * Generates a high-resolution (1400x990, approx A4 landscape ratio)
 * beautifully styled digital certificate of completion on an HTML5 canvas.
 */
export async function generateCertificateCanvas(result: Result, exam: Exam): Promise<HTMLCanvasElement> {
  const canvas = document.createElement('canvas');
  const width = 1400;
  const height = 990;
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Canvas 2D context not available');
  }

  // 1. Background (Parchment/Ivory base)
  const bgGrad = ctx.createLinearGradient(0, 0, width, height);
  bgGrad.addColorStop(0, '#FFFFFF');
  bgGrad.addColorStop(0.5, '#FFFDF8');
  bgGrad.addColorStop(1, '#FEF9EE');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, width, height);

  // Helper for drawing rounded rect
  function drawRoundedRect(
    x: number,
    y: number,
    w: number,
    h: number,
    radius: number,
    fillColor?: string,
    strokeColor?: string,
    strokeWidth: number = 1
  ) {
    if (!ctx) return;
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + w - radius, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
    ctx.lineTo(x + w, y + h - radius);
    ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
    ctx.lineTo(x + radius, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();

    if (fillColor) {
      ctx.fillStyle = fillColor;
      ctx.fill();
    }
    if (strokeColor) {
      ctx.strokeStyle = strokeColor;
      ctx.lineWidth = strokeWidth;
      ctx.stroke();
    }
  }

  // 2. Ornate Border Frame
  // Outer border
  ctx.strokeStyle = '#D97706'; // Amber 600
  ctx.lineWidth = 10;
  ctx.strokeRect(30, 30, width - 60, height - 60);

  // Thin inner border
  ctx.strokeStyle = '#FCD34D'; // Amber 300
  ctx.lineWidth = 3;
  ctx.strokeRect(44, 44, width - 88, height - 88);

  // Inner border frame
  ctx.strokeStyle = '#1E3A8A'; // Navy Blue
  ctx.lineWidth = 2;
  ctx.strokeRect(52, 52, width - 104, height - 104);

  // Corner ornaments
  const corners = [
    { x: 52, y: 52 },
    { x: width - 52, y: 52 },
    { x: 52, y: height - 52 },
    { x: width - 52, y: height - 52 },
  ];
  corners.forEach(({ x, y }) => {
    ctx.fillStyle = '#D97706';
    ctx.beginPath();
    ctx.arc(x, y, 14, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#FEF3C7';
    ctx.beginPath();
    ctx.arc(x, y, 7, 0, Math.PI * 2);
    ctx.fill();
  });

  // Top header emblem / ribbon
  drawRoundedRect(width / 2 - 180, 70, 360, 48, 24, '#1E3A8A');
  ctx.fillStyle = '#FEF08A';
  ctx.font = '900 16px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('★ CBT CERIA DIGITAL ACADEMY ★', width / 2, 100);

  // Main Certificate Title
  ctx.fillStyle = '#1E293B';
  ctx.font = '900 46px serif';
  ctx.fillText('SERTIFIKAT KELULUSAN', width / 2, 180);

  ctx.fillStyle = '#D97706';
  ctx.font = 'bold 22px sans-serif';
  ctx.letterSpacing = '2px';
  ctx.fillText('CERTIFICATE OF COMPLETION', width / 2, 220);

  // Awarded text
  ctx.fillStyle = '#64748B';
  ctx.font = 'normal 18px sans-serif';
  ctx.fillText('Dengan ini menerangkan dan memberikan penghargaan kepada:', width / 2, 275);

  // Student Name (Large & Elegant)
  ctx.fillStyle = '#0F172A';
  ctx.font = '900 50px sans-serif';
  const studentName = (result.name || 'NAMA PESERTA').toUpperCase();
  ctx.fillText(studentName, width / 2, 345);

  // Decorative underline beneath student name
  const textWidth = Math.min(ctx.measureText(studentName).width + 60, width - 240);
  ctx.strokeStyle = '#D97706';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(width / 2 - textWidth / 2, 368);
  ctx.lineTo(width / 2 + textWidth / 2, 368);
  ctx.stroke();

  // Student School & Grade
  ctx.fillStyle = '#334155';
  ctx.font = 'bold 20px sans-serif';
  ctx.fillText(`${result.school || 'Sekolah Dasar'} • Kelas ${result.grade || exam.grade} SD`, width / 2, 405);

  // Exam Details
  ctx.fillStyle = '#64748B';
  ctx.font = '18px sans-serif';
  ctx.fillText('Telah berhasil mengikuti dan menyelesaikan evaluasi pembelajaran pada ujian:', width / 2, 460);

  ctx.fillStyle = '#1E3A8A';
  ctx.font = 'bold 30px sans-serif';
  ctx.fillText(exam.title || 'Ujian Komputer Berbasis CBT', width / 2, 505);

  ctx.fillStyle = '#475569';
  ctx.font = 'bold 18px sans-serif';
  ctx.fillText(`Mata Pelajaran: ${exam.subject || '-'} • KKM: ${exam.kkm || 75}`, width / 2, 540);

  // Score Badge & Status Card in the middle
  const scoreCardX = width / 2 - 250;
  const scoreCardY = 575;
  const scoreCardW = 500;
  const scoreCardH = 110;

  const isPassed = result.score >= (exam.kkm || 75);
  drawRoundedRect(scoreCardX, scoreCardY, scoreCardW, scoreCardH, 20, '#FFFBEB', '#FCD34D', 2);

  // Left Score Pill
  drawRoundedRect(scoreCardX + 25, scoreCardY + 20, 150, 70, 16, '#F59E0B');
  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 13px sans-serif';
  ctx.fillText('NILAI AKHIR', scoreCardX + 100, scoreCardY + 42);
  ctx.font = '900 34px sans-serif';
  ctx.fillText(`${result.score}`, scoreCardX + 100, scoreCardY + 74);

  // Right Status info
  ctx.textAlign = 'left';
  ctx.fillStyle = isPassed ? '#166534' : '#991B1B';
  ctx.font = '900 22px sans-serif';
  ctx.fillText(isPassed ? '✓ LULUS / TUNTAS' : 'SELESAI MENGERJAKAN', scoreCardX + 200, scoreCardY + 52);

  ctx.fillStyle = '#475569';
  ctx.font = 'bold 16px sans-serif';
  ctx.fillText(`Jawaban Benar: ${result.correctAnswers} dari ${result.totalQuestions} soal`, scoreCardX + 200, scoreCardY + 80);

  // Footer / Signatures
  // Left: Date and Certificate ID
  ctx.textAlign = 'left';
  const certDate = result.finishedAt || result.createdAt
    ? new Date(result.finishedAt || result.createdAt).toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })
    : new Date().toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      });

  ctx.fillStyle = '#64748B';
  ctx.font = '15px sans-serif';
  ctx.fillText(`Tanggal Terbit: ${certDate}`, 120, 780);
  ctx.fillText(`Nomor Sertifikat: CBT-${(result.resultId || '00000000').slice(0, 8).toUpperCase()}`, 120, 805);

  // Center Gold Seal
  const sealX = width / 2;
  const sealY = 780;
  ctx.fillStyle = '#F59E0B';
  ctx.beginPath();
  ctx.arc(sealX, sealY, 50, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = '#FEF3C7';
  ctx.lineWidth = 4;
  ctx.stroke();

  ctx.textAlign = 'center';
  ctx.fillStyle = '#FFFFFF';
  ctx.font = '900 13px sans-serif';
  ctx.fillText('VERIFIED', sealX, sealY - 12);
  ctx.font = '900 20px sans-serif';
  ctx.fillText('★ CBT ★', sealX, sealY + 10);
  ctx.font = 'bold 11px sans-serif';
  ctx.fillText('CERIA ED', sealX, sealY + 28);

  // Right Signature
  ctx.textAlign = 'center';
  ctx.strokeStyle = '#94A3B8';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(width - 340, 800);
  ctx.lineTo(width - 120, 800);
  ctx.stroke();

  ctx.fillStyle = '#0F172A';
  ctx.font = 'bold 16px sans-serif';
  ctx.fillText('Guru Pengampu / Tim Penguji', width - 230, 825);
  ctx.fillStyle = '#64748B';
  ctx.font = '14px sans-serif';
  ctx.fillText('Sistem Evaluasi CBT CERIA', width - 230, 845);

  return canvas;
}

/**
 * Trigger immediate download of the certificate as a high-res PNG
 */
export async function downloadCertificateImage(result: Result, exam: Exam): Promise<void> {
  const canvas = await generateCertificateCanvas(result, exam);
  const dataUrl = canvas.toDataURL('image/png');
  const safeName = (result.name || 'Siswa').replace(/[^a-zA-Z0-9]/g, '_');
  const filename = `Sertifikat_${safeName}_${result.score}.png`;

  const link = document.createElement('a');
  link.href = dataUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
