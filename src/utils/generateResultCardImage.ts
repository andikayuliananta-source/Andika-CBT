import { Result, Exam } from '../types';

/**
 * Utility to draw and download a friendly, high-resolution (1200x900) PNG card
 * of the student's exam result for saving or sharing with parents.
 */
export async function generateResultCardCanvas(result: Result, exam: Exam): Promise<HTMLCanvasElement> {
  const canvas = document.createElement('canvas');
  const width = 1200;
  const height = 900;
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Canvas 2D context not available');
  }

  // 1. Background gradient (Soft Warm Kid-Friendly Palette)
  const bgGrad = ctx.createLinearGradient(0, 0, width, height);
  bgGrad.addColorStop(0, '#FFFDF8');
  bgGrad.addColorStop(1, '#FEF3C7');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, width, height);

  // Decorative border
  ctx.strokeStyle = '#FDE68A';
  ctx.lineWidth = 14;
  ctx.strokeRect(16, 16, width - 32, height - 32);

  ctx.strokeStyle = '#F59E0B';
  ctx.lineWidth = 4;
  ctx.strokeRect(26, 26, width - 52, height - 52);

  // Helper function for drawing rounded rectangles
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

  // 2. Header Banner
  drawRoundedRect(60, 50, width - 120, 110, 24, '#FFFFFF', '#FCD34D', 2);

  // App Logo Badge
  drawRoundedRect(80, 65, 80, 80, 20, '#F59E0B');
  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 44px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('🎒', 120, 105);

  // Header Titles
  ctx.textAlign = 'left';
  ctx.fillStyle = '#1E293B';
  ctx.font = '900 32px sans-serif';
  ctx.fillText('KARTU HASIL UJIAN SISWA • CBT CERIA', 180, 95);

  ctx.fillStyle = '#64748B';
  ctx.font = 'bold 18px sans-serif';
  ctx.fillText('Sistem Penilaian Ramah Anak SD • Resmi & Terverifikasi', 180, 130);

  // 3. Student Identity Card Box
  drawRoundedRect(60, 180, 640, 320, 24, '#FFFFFF', '#E2E8F0', 2);

  ctx.fillStyle = '#D97706';
  ctx.font = '900 16px sans-serif';
  ctx.fillText('DATA IDENTITAS PESERTA', 90, 220);

  const studentFields = [
    { label: 'Nama Peserta', val: result.name.toUpperCase() },
    { label: 'Asal Sekolah', val: result.school || '-' },
    { label: 'Tingkat Kelas', val: `Kelas ${result.grade} Sekolah Dasar (SD)` },
    { label: 'Mata Pelajaran', val: `${exam.title} (${exam.subject})` },
    {
      label: 'Waktu Ujian',
      val: new Date().toLocaleDateString('id-ID', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      }),
    },
  ];

  let currentY = 255;
  studentFields.forEach((field) => {
    ctx.fillStyle = '#64748B';
    ctx.font = 'bold 16px sans-serif';
    ctx.fillText(field.label, 90, currentY);

    ctx.fillStyle = '#0F172A';
    ctx.font = '900 17px sans-serif';
    ctx.fillText(`: ${field.val}`, 240, currentY);
    currentY += 40;
  });

  // 4. Score Highlight Box (Right Side)
  const isPassed = result.score >= (exam.kkm || 75);
  const scoreBoxColor = isPassed ? '#F0FDF4' : '#FEF2F2';
  const scoreBorderColor = isPassed ? '#BBF7D0' : '#FECACA';

  drawRoundedRect(720, 180, 420, 320, 24, scoreBoxColor, scoreBorderColor, 2);

  ctx.textAlign = 'center';
  ctx.fillStyle = isPassed ? '#166534' : '#991B1B';
  ctx.font = '900 18px sans-serif';
  ctx.fillText('SKOR AKHIR NILAI', 930, 225);

  // Big Score Number
  ctx.fillStyle = isPassed ? '#14532D' : '#7F1D1D';
  ctx.font = '900 110px sans-serif';
  ctx.fillText(String(result.score), 930, 335);

  // Pass/Fail Pill Badge
  const pillBg = isPassed ? '#22C55E' : '#EF4444';
  drawRoundedRect(780, 380, 300, 48, 24, pillBg);
  ctx.fillStyle = '#FFFFFF';
  ctx.font = '900 20px sans-serif';
  const statusLabel = isPassed
    ? `✓ LULUS (KKM: ${exam.kkm || 75})`
    : `✕ BELUM LULUS (KKM: ${exam.kkm || 75})`;
  ctx.fillText(statusLabel, 930, 410);

  // 5. Statistics Cards (Bottom Row)
  const stats = [
    { label: 'Total Soal', value: `${result.totalQuestions} Butir`, color: '#EFF6FF', border: '#BFDBFE', text: '#1D4ED8', icon: '📝' },
    { label: 'Jawaban Benar', value: `${result.correctAnswers} Soal`, color: '#ECFDF5', border: '#A7F3D0', text: '#047857', icon: '✅' },
    { label: 'Jawaban Salah', value: `${result.wrongAnswers} Soal`, color: '#FEF2F2', border: '#FECACA', text: '#B91C1C', icon: '❌' },
    {
      label: 'Persentase',
      value: `${Math.round((result.correctAnswers / (result.totalQuestions || 1)) * 100)}%`,
      color: '#FFFBEB',
      border: '#FDE68A',
      text: '#B45309',
      icon: '📊',
    },
  ];

  const cardW = 250;
  const startX = 60;
  stats.forEach((st, i) => {
    const x = startX + i * (cardW + 26);
    drawRoundedRect(x, 520, cardW, 140, 20, st.color, st.border, 2);

    ctx.textAlign = 'center';
    ctx.font = '32px sans-serif';
    ctx.fillText(st.icon, x + cardW / 2, 565);

    ctx.fillStyle = '#64748B';
    ctx.font = 'bold 15px sans-serif';
    ctx.fillText(st.label, x + cardW / 2, 600);

    ctx.fillStyle = st.text;
    ctx.font = '900 22px sans-serif';
    ctx.fillText(st.value, x + cardW / 2, 632);
  });

  // 6. Motivation & Security Verification Footer Box
  drawRoundedRect(60, 680, width - 120, 150, 20, '#FFFFFF', '#CBD5E1', 1.5);

  // Stamp Badge
  drawRoundedRect(80, 700, 110, 110, 18, '#EFF6FF', '#93C5FD', 1.5);
  ctx.fillStyle = '#2563EB';
  ctx.font = 'bold 44px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('🛡️', 135, 765);

  ctx.textAlign = 'left';
  ctx.fillStyle = '#0F172A';
  ctx.font = '900 18px sans-serif';
  ctx.fillText('Terverifikasi Resmi oleh Sistem CBT CERIA SD', 210, 725);

  ctx.fillStyle = '#475569';
  ctx.font = 'bold 14px sans-serif';
  ctx.fillText(
    'Catatan untuk Orang Tua: Dokumen gambar ini adalah ringkasan hasil evaluasi belajar siswa melalui platform CBT CERIA.',
    210,
    755
  );

  ctx.fillStyle = '#2563EB';
  ctx.font = 'italic bold 15px sans-serif';
  ctx.fillText(
    '⭐ "Belajar dengan ceria, kejujuran adalah kunci kesuksesan!" • Administrator: Andika Yuliananta, S.Pd.',
    210,
    785
  );

  return canvas;
}

/**
 * Downloads the student result card as a high-quality PNG image
 */
export async function downloadResultCardImage(result: Result, exam: Exam): Promise<void> {
  const canvas = await generateResultCardCanvas(result, exam);
  const dataUrl = canvas.toDataURL('image/png', 1.0);

  const cleanName = (result.name || 'Siswa').replace(/[^a-zA-Z0-9]/g, '_');
  const cleanSubject = (exam.subject || 'Ujian').replace(/[^a-zA-Z0-9]/g, '_');
  const fileName = `Hasil_Ujian_${cleanName}_${cleanSubject}.png`;

  const link = document.createElement('a');
  link.href = dataUrl;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Shares the result card via Web Share API if available, or returns dataUrl
 */
export async function shareOrDownloadResultCard(
  result: Result,
  exam: Exam
): Promise<{ shared: boolean; dataUrl: string }> {
  const canvas = await generateResultCardCanvas(result, exam);
  const dataUrl = canvas.toDataURL('image/png', 1.0);

  const cleanName = (result.name || 'Siswa').replace(/[^a-zA-Z0-9]/g, '_');
  const cleanSubject = (exam.subject || 'Ujian').replace(/[^a-zA-Z0-9]/g, '_');
  const fileName = `Hasil_Ujian_${cleanName}_${cleanSubject}.png`;

  if (navigator.share) {
    try {
      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob((b) => resolve(b), 'image/png')
      );
      if (blob && navigator.canShare && navigator.canShare({ files: [new File([blob], fileName, { type: 'image/png' })] })) {
        await navigator.share({
          title: `Hasil Ujian ${result.name} - ${exam.title}`,
          text: `Alhamdulillah! Berikut ringkasan hasil ujian ${exam.title} (${exam.subject}) ananda ${result.name} dengan nilai ${result.score} (${result.status}).`,
          files: [new File([blob], fileName, { type: 'image/png' })],
        });
        return { shared: true, dataUrl };
      }
    } catch (e) {
      // User cancelled share or failed, fallback to download
      console.log('Share dismissed or not supported with files:', e);
    }
  }

  // Fallback direct download
  await downloadResultCardImage(result, exam);
  return { shared: false, dataUrl };
}
