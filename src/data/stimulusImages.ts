/**
 * High-definition, child-friendly vector stimulus illustrations for CBT CERIA.
 * Self-contained SVG Data URLs guarantee 0ms latency, zero CORS errors, and
 * 100% offline reliability for 800+ concurrent students across all devices.
 */

// Helper to convert clean SVG string to encoded Data URI
function svgToDataUri(svg: string): string {
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg.trim())}`;
}

export const STIMULUS_IMAGES = {
  // Soal 1: Diagram Pecahan 3/4 + 1/2
  FRACTION_PIE: svgToDataUri(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 500 240" width="500" height="240">
      <defs>
        <filter id="shadow" x="-5%" y="-5%" width="110%" height="110%">
          <feDropShadow dx="0" dy="4" stdDeviation="4" flood-color="#0f172a" flood-opacity="0.08"/>
        </filter>
      </defs>
      <rect width="500" height="240" rx="20" fill="#f8fafc"/>
      <rect x="2" y="2" width="496" height="236" rx="18" fill="none" stroke="#e2e8f0" stroke-width="2"/>
      
      <!-- Lingkaran 1: 3/4 -->
      <g transform="translate(100, 110)" filter="url(#shadow)">
        <circle cx="0" cy="0" r="60" fill="#ffffff" stroke="#cbd5e1" stroke-width="3"/>
        <!-- 3/4 Pie slice (270 deg) -->
        <path d="M 0 0 L 0 -60 A 60 60 0 1 1 -60 0 Z" fill="#38bdf8"/>
        <!-- Sisa 1/4 putih transparan -->
        <path d="M 0 0 L -60 0 A 60 60 0 0 1 0 -60 Z" fill="#f1f5f9"/>
        <line x1="0" y1="-60" x2="0" y2="60" stroke="#0284c7" stroke-width="2.5" stroke-dasharray="4 3"/>
        <line x1="-60" y1="0" x2="60" y2="0" stroke="#0284c7" stroke-width="2.5" stroke-dasharray="4 3"/>
        <circle cx="0" cy="0" r="5" fill="#0369a1"/>
        <text x="0" y="85" text-anchor="middle" font-family="sans-serif" font-weight="800" font-size="15" fill="#0369a1">3/4 Lingkaran</text>
      </g>

      <!-- Simbol Tambah -->
      <text x="210" y="118" text-anchor="middle" font-family="sans-serif" font-weight="900" font-size="32" fill="#64748b">+</text>

      <!-- Lingkaran 2: 1/2 (atau 2/4) -->
      <g transform="translate(320, 110)" filter="url(#shadow)">
        <circle cx="0" cy="0" r="60" fill="#ffffff" stroke="#cbd5e1" stroke-width="3"/>
        <!-- 1/2 Pie slice (180 deg) -->
        <path d="M 0 0 L 0 -60 A 60 60 0 0 1 0 60 Z" fill="#34d399"/>
        <path d="M 0 0 L 0 60 A 60 60 0 0 1 0 -60 Z" fill="#f1f5f9"/>
        <line x1="0" y1="-60" x2="0" y2="60" stroke="#059669" stroke-width="2.5"/>
        <line x1="-60" y1="0" x2="60" y2="0" stroke="#059669" stroke-width="2" stroke-dasharray="4 3"/>
        <circle cx="0" cy="0" r="5" fill="#047857"/>
        <text x="0" y="85" text-anchor="middle" font-family="sans-serif" font-weight="800" font-size="15" fill="#047857">1/2 Lingkaran</text>
      </g>

      <!-- Header Label -->
      <rect x="15" y="12" width="220" height="26" rx="8" fill="#e0f2fe"/>
      <text x="25" y="29" font-family="sans-serif" font-weight="800" font-size="12" fill="#0369a1">STIMULUS PECAHAN MATEMATIKA</text>
    </svg>
  `),

  // Soal 2: Geometri Lingkaran dengan Jari-jari r = 14 cm
  CIRCLE_RADIUS: svgToDataUri(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 500 240" width="500" height="240">
      <rect width="500" height="240" rx="20" fill="#f8fafc"/>
      <rect x="2" y="2" width="496" height="236" rx="18" fill="none" stroke="#e2e8f0" stroke-width="2"/>
      
      <g transform="translate(180, 120)">
        <circle cx="0" cy="0" r="85" fill="#fef3c7" stroke="#f59e0b" stroke-width="3.5"/>
        <!-- Radius line -->
        <line x1="0" y1="0" x2="85" y2="0" stroke="#b45309" stroke-width="3"/>
        <circle cx="0" cy="0" r="6" fill="#b45309"/>
        <circle cx="85" cy="0" r="5" fill="#b45309"/>
        
        <text x="42" y="-10" text-anchor="middle" font-family="sans-serif" font-weight="800" font-size="14" fill="#92400e">r = 14 cm</text>
        <text x="-12" y="5" text-anchor="end" font-family="sans-serif" font-weight="800" font-size="14" fill="#92400e">Titik Pusat O</text>
      </g>

      <!-- Formula card -->
      <g transform="translate(325, 65)">
        <rect width="150" height="110" rx="14" fill="#ffffff" stroke="#fde68a" stroke-width="2"/>
        <rect x="0" y="0" width="150" height="32" rx="14" fill="#fef3c7"/>
        <text x="75" y="21" text-anchor="middle" font-family="sans-serif" font-weight="800" font-size="12" fill="#92400e">KETERANGAN</text>
        <text x="15" y="55" font-family="sans-serif" font-weight="700" font-size="12" fill="#475569">Jari-jari (r) = 14 cm</text>
        <text x="15" y="78" font-family="sans-serif" font-weight="700" font-size="12" fill="#475569">Nilai π = 22/7</text>
        <text x="15" y="100" font-family="sans-serif" font-weight="800" font-size="11" fill="#b45309">Rumus: L = π × r²</text>
      </g>

      <rect x="15" y="12" width="220" height="26" rx="8" fill="#fef3c7"/>
      <text x="25" y="29" font-family="sans-serif" font-weight="800" font-size="12" fill="#92400e">STIMULUS BANGUN LINGKARAN</text>
    </svg>
  `),

  // Soal 3: Diagram Batang Pecahan 3/5 ke Persen
  FRACTION_BAR: svgToDataUri(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 500 240" width="500" height="240">
      <rect width="500" height="240" rx="20" fill="#f8fafc"/>
      <rect x="2" y="2" width="496" height="236" rx="18" fill="none" stroke="#e2e8f0" stroke-width="2"/>
      
      <!-- Fraction bar divided into 5 equal parts -->
      <g transform="translate(60, 80)">
        <rect width="380" height="70" rx="12" fill="#ffffff" stroke="#cbd5e1" stroke-width="3"/>
        
        <!-- 3 Shaded parts (each part is 76px wide) -->
        <rect x="0" y="0" width="76" height="70" rx="12" fill="#6366f1"/>
        <rect x="66" y="0" width="86" height="70" fill="#6366f1"/>
        <rect x="152" y="0" width="76" height="70" fill="#6366f1"/>

        <!-- Grid lines dividing into 5 blocks -->
        <line x1="76" y1="0" x2="76" y2="70" stroke="#ffffff" stroke-width="3"/>
        <line x1="152" y1="0" x2="152" y2="70" stroke="#ffffff" stroke-width="3"/>
        <line x1="228" y1="0" x2="228" y2="70" stroke="#cbd5e1" stroke-width="3"/>
        <line x1="304" y1="0" x2="304" y2="70" stroke="#cbd5e1" stroke-width="3"/>

        <!-- Part labels -->
        <text x="38" y="42" text-anchor="middle" font-family="sans-serif" font-weight="900" font-size="18" fill="#ffffff">1/5</text>
        <text x="114" y="42" text-anchor="middle" font-family="sans-serif" font-weight="900" font-size="18" fill="#ffffff">1/5</text>
        <text x="190" y="42" text-anchor="middle" font-family="sans-serif" font-weight="900" font-size="18" fill="#ffffff">1/5</text>
        <text x="266" y="42" text-anchor="middle" font-family="sans-serif" font-weight="700" font-size="16" fill="#94a3b8">1/5</text>
        <text x="342" y="42" text-anchor="middle" font-family="sans-serif" font-weight="700" font-size="16" fill="#94a3b8">1/5</text>

        <!-- Bracket under 3 parts -->
        <path d="M 0 82 L 0 92 Q 114 92 114 102 Q 114 92 228 92 L 228 82" fill="none" stroke="#4f46e5" stroke-width="2.5"/>
        <text x="114" y="122" text-anchor="middle" font-family="sans-serif" font-weight="800" font-size="14" fill="#4338ca">3 bagian diarsir (3/5)</text>

        <!-- Whole label -->
        <text x="380" y="95" text-anchor="end" font-family="sans-serif" font-weight="700" font-size="12" fill="#64748b">Total = 5/5 = 100%</text>
      </g>

      <rect x="15" y="12" width="220" height="26" rx="8" fill="#e0e7ff"/>
      <text x="25" y="29" font-family="sans-serif" font-weight="800" font-size="12" fill="#4338ca">STIMULUS DIAGRAM PECAHAN</text>
    </svg>
  `),

  // Soal 4: 3D Geometri Balok (p=10 cm, l=6 cm, t=5 cm)
  CUBOID_3D: svgToDataUri(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 500 240" width="500" height="240">
      <rect width="500" height="240" rx="20" fill="#f8fafc"/>
      <rect x="2" y="2" width="496" height="236" rx="18" fill="none" stroke="#e2e8f0" stroke-width="2"/>
      
      <!-- 3D Cuboid Isometric / Oblique Projection -->
      <g transform="translate(130, 60)">
        <!-- Back hidden lines (dashed) -->
        <line x1="60" y1="30" x2="260" y2="30" stroke="#94a3b8" stroke-width="2" stroke-dasharray="5 4"/>
        <line x1="60" y1="30" x2="60" y2="130" stroke="#94a3b8" stroke-width="2" stroke-dasharray="5 4"/>
        <line x1="0" y1="100" x2="60" y2="30" stroke="#94a3b8" stroke-width="2" stroke-dasharray="5 4"/>

        <!-- Top Face -->
        <polygon points="0,0 200,0 260,30 60,30" fill="#fed7aa" stroke="#ea580c" stroke-width="2.5"/>

        <!-- Right Face -->
        <polygon points="200,0 260,30 260,130 200,100" fill="#fdba74" stroke="#ea580c" stroke-width="2.5"/>

        <!-- Front Face -->
        <polygon points="0,0 200,0 200,100 0,100" fill="#ffedd5" stroke="#ea580c" stroke-width="2.5"/>

        <!-- Dimension labels -->
        <!-- Panjang (Front bottom) -->
        <text x="100" y="122" text-anchor="middle" font-family="sans-serif" font-weight="800" font-size="14" fill="#c2410c">Panjang (p) = 10 cm</text>
        
        <!-- Tinggi (Left front) -->
        <text x="-15" y="55" text-anchor="end" font-family="sans-serif" font-weight="800" font-size="14" fill="#c2410c">Tinggi (t) = 5 cm</text>

        <!-- Lebar (Top right diagonal) -->
        <text x="245" y="10" text-anchor="start" font-family="sans-serif" font-weight="800" font-size="14" fill="#c2410c">Lebar (l) = 6 cm</text>
      </g>

      <rect x="15" y="12" width="220" height="26" rx="8" fill="#ffedd5"/>
      <text x="25" y="29" font-family="sans-serif" font-weight="800" font-size="12" fill="#c2410c">STIMULUS BANGUN RUANG BALOK</text>
    </svg>
  `),

  // Soal 5: Diagram Batang Nilai Siswa (70, 80, 85, 90, 75)
  BAR_CHART_SCORES: svgToDataUri(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 500 240" width="500" height="240">
      <rect width="500" height="240" rx="20" fill="#f8fafc"/>
      <rect x="2" y="2" width="496" height="236" rx="18" fill="none" stroke="#e2e8f0" stroke-width="2"/>
      
      <!-- Coordinate Axes & Grid -->
      <g transform="translate(70, 180)">
        <!-- Grid horizontal lines -->
        <line x1="0" y1="0" x2="380" y2="0" stroke="#334155" stroke-width="2"/>
        <line x1="0" y1="-30" x2="380" y2="-30" stroke="#e2e8f0" stroke-width="1.5" stroke-dasharray="4 3"/>
        <line x1="0" y1="-60" x2="380" y2="-60" stroke="#e2e8f0" stroke-width="1.5" stroke-dasharray="4 3"/>
        <line x1="0" y1="-90" x2="380" y2="-90" stroke="#e2e8f0" stroke-width="1.5" stroke-dasharray="4 3"/>
        <line x1="0" y1="-120" x2="380" y2="-120" stroke="#e2e8f0" stroke-width="1.5" stroke-dasharray="4 3"/>

        <!-- Y Axis labels -->
        <text x="-12" y="4" text-anchor="end" font-family="sans-serif" font-weight="700" font-size="11" fill="#64748b">0</text>
        <text x="-12" y="-26" text-anchor="end" font-family="sans-serif" font-weight="700" font-size="11" fill="#64748b">25</text>
        <text x="-12" y="-56" text-anchor="end" font-family="sans-serif" font-weight="700" font-size="11" fill="#64748b">50</text>
        <text x="-12" y="-86" text-anchor="end" font-family="sans-serif" font-weight="700" font-size="11" fill="#64748b">75</text>
        <text x="-12" y="-116" text-anchor="end" font-family="sans-serif" font-weight="700" font-size="11" fill="#64748b">100</text>

        <!-- Bars: heights proportional to score (scale = 1.2px per score unit) -->
        <!-- Bar 1: 70 -> height 84 -->
        <rect x="25" y="-84" width="45" height="84" rx="6" fill="#38bdf8"/>
        <text x="47.5" y="-90" text-anchor="middle" font-family="sans-serif" font-weight="800" font-size="12" fill="#0284c7">70</text>
        <text x="47.5" y="18" text-anchor="middle" font-family="sans-serif" font-weight="700" font-size="11" fill="#334155">Nilai 1</text>

        <!-- Bar 2: 80 -> height 96 -->
        <rect x="95" y="-96" width="45" height="96" rx="6" fill="#34d399"/>
        <text x="117.5" y="-102" text-anchor="middle" font-family="sans-serif" font-weight="800" font-size="12" fill="#059669">80</text>
        <text x="117.5" y="18" text-anchor="middle" font-family="sans-serif" font-weight="700" font-size="11" fill="#334155">Nilai 2</text>

        <!-- Bar 3: 85 -> height 102 -->
        <rect x="165" y="-102" width="45" height="102" rx="6" fill="#fbbf24"/>
        <text x="187.5" y="-108" text-anchor="middle" font-family="sans-serif" font-weight="800" font-size="12" fill="#d97706">85</text>
        <text x="187.5" y="18" text-anchor="middle" font-family="sans-serif" font-weight="700" font-size="11" fill="#334155">Nilai 3</text>

        <!-- Bar 4: 90 -> height 108 -->
        <rect x="235" y="-108" width="45" height="108" rx="6" fill="#f472b6"/>
        <text x="257.5" y="-114" text-anchor="middle" font-family="sans-serif" font-weight="800" font-size="12" fill="#db2777">90</text>
        <text x="257.5" y="18" text-anchor="middle" font-family="sans-serif" font-weight="700" font-size="11" fill="#334155">Nilai 4</text>

        <!-- Bar 5: 75 -> height 90 -->
        <rect x="305" y="-90" width="45" height="90" rx="6" fill="#a78bfa"/>
        <text x="327.5" y="-96" text-anchor="middle" font-family="sans-serif" font-weight="800" font-size="12" fill="#7c3aed">75</text>
        <text x="327.5" y="18" text-anchor="middle" font-family="sans-serif" font-weight="700" font-size="11" fill="#334155">Nilai 5</text>
      </g>

      <rect x="15" y="12" width="220" height="26" rx="8" fill="#e0f2fe"/>
      <text x="25" y="29" font-family="sans-serif" font-weight="800" font-size="12" fill="#0369a1">STIMULUS DIAGRAM BATANG</text>
    </svg>
  `),

  // Soal 6: Sifat-sifat Bangun Datar Persegi
  SQUARE_PROPERTIES: svgToDataUri(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 500 240" width="500" height="240">
      <rect width="500" height="240" rx="20" fill="#f8fafc"/>
      <rect x="2" y="2" width="496" height="236" rx="18" fill="none" stroke="#e2e8f0" stroke-width="2"/>
      
      <!-- Persegi dengan sudut siku-siku & diagonal -->
      <g transform="translate(140, 45)">
        <rect x="0" y="0" width="140" height="140" rx="4" fill="#ede9fe" stroke="#7c3aed" stroke-width="3"/>
        
        <!-- Diagonals -->
        <line x1="0" y1="0" x2="140" y2="140" stroke="#a78bfa" stroke-width="2" stroke-dasharray="5 4"/>
        <line x1="140" y1="0" x2="0" y2="140" stroke="#a78bfa" stroke-width="2" stroke-dasharray="5 4"/>

        <!-- 4 Right Angle Markers -->
        <rect x="0" y="0" width="16" height="16" fill="none" stroke="#7c3aed" stroke-width="2"/>
        <rect x="124" y="0" width="16" height="16" fill="none" stroke="#7c3aed" stroke-width="2"/>
        <rect x="124" y="124" width="16" height="16" fill="none" stroke="#7c3aed" stroke-width="2"/>
        <rect x="0" y="124" width="16" height="16" fill="none" stroke="#7c3aed" stroke-width="2"/>

        <!-- Equal side ticks -->
        <line x1="68" y1="-4" x2="68" y2="4" stroke="#7c3aed" stroke-width="2.5"/>
        <line x1="72" y1="-4" x2="72" y2="4" stroke="#7c3aed" stroke-width="2.5"/>

        <line x1="136" y1="68" x2="144" y2="68" stroke="#7c3aed" stroke-width="2.5"/>
        <line x1="136" y1="72" x2="144" y2="72" stroke="#7c3aed" stroke-width="2.5"/>

        <line x1="68" y1="136" x2="68" y2="144" stroke="#7c3aed" stroke-width="2.5"/>
        <line x1="72" y1="136" x2="72" y2="144" stroke="#7c3aed" stroke-width="2.5"/>

        <line x1="-4" y1="68" x2="4" y2="68" stroke="#7c3aed" stroke-width="2.5"/>
        <line x1="-4" y1="72" x2="4" y2="72" stroke="#7c3aed" stroke-width="2.5"/>

        <!-- Vertex labels -->
        <text x="-8" y="-8" font-family="sans-serif" font-weight="800" font-size="14" fill="#6d28d9">A</text>
        <text x="148" y="-8" font-family="sans-serif" font-weight="800" font-size="14" fill="#6d28d9">B</text>
        <text x="148" y="152" font-family="sans-serif" font-weight="800" font-size="14" fill="#6d28d9">C</text>
        <text x="-8" y="152" font-family="sans-serif" font-weight="800" font-size="14" fill="#6d28d9">D</text>
      </g>

      <!-- Annotations card -->
      <g transform="translate(320, 50)">
        <rect width="155" height="135" rx="12" fill="#ffffff" stroke="#ddd6fe" stroke-width="2"/>
        <rect x="0" y="0" width="155" height="30" rx="12" fill="#ede9fe"/>
        <text x="77.5" y="20" text-anchor="middle" font-family="sans-serif" font-weight="800" font-size="11" fill="#6d28d9">SIFAT-SIFAT PERSEGI</text>
        <text x="12" y="52" font-family="sans-serif" font-weight="700" font-size="11" fill="#475569">✓ 4 sisi sama panjang</text>
        <text x="12" y="74" font-family="sans-serif" font-weight="700" font-size="11" fill="#475569">✓ 4 sudut siku-siku 90°</text>
        <text x="12" y="96" font-family="sans-serif" font-weight="700" font-size="11" fill="#475569">✓ Diagonal sama panjang</text>
        <text x="12" y="118" font-family="sans-serif" font-weight="700" font-size="11" fill="#475569">✓ Diagonal tegak lurus</text>
      </g>

      <rect x="15" y="12" width="220" height="26" rx="8" fill="#ede9fe"/>
      <text x="25" y="29" font-family="sans-serif" font-weight="800" font-size="12" fill="#6d28d9">STIMULUS GEOMETRI PERSEGI</text>
    </svg>
  `),

  // Soal 7: Bangun Ruang Kubus & Balok (Stimulus Utama)
  CUBE_CUBOID_COMPARE: svgToDataUri(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 500 240" width="500" height="240">
      <rect width="500" height="240" rx="20" fill="#f8fafc"/>
      <rect x="2" y="2" width="496" height="236" rx="18" fill="none" stroke="#e2e8f0" stroke-width="2"/>
      
      <!-- Kubus (Kiri) -->
      <g transform="translate(80, 70)">
        <!-- Top Face -->
        <polygon points="0,0 70,0 100,25 30,25" fill="#ccfbf1" stroke="#0f766e" stroke-width="2.5"/>
        <!-- Right Face -->
        <polygon points="70,0 100,25 100,95 70,70" fill="#99f6e4" stroke="#0f766e" stroke-width="2.5"/>
        <!-- Front Face -->
        <polygon points="0,0 70,0 70,70 0,70" fill="#e6fffa" stroke="#0f766e" stroke-width="2.5"/>
        <text x="50" y="105" text-anchor="middle" font-family="sans-serif" font-weight="900" font-size="14" fill="#0f766e">Bangun 1: Kubus</text>
        <text x="50" y="122" text-anchor="middle" font-family="sans-serif" font-weight="700" font-size="11" fill="#64748b">(Sisi berbentuk persegi)</text>
      </g>

      <!-- Balok (Kanan) -->
      <g transform="translate(260, 70)">
        <!-- Top Face -->
        <polygon points="0,0 140,0 180,25 40,25" fill="#e0f2fe" stroke="#0369a1" stroke-width="2.5"/>
        <!-- Right Face -->
        <polygon points="140,0 180,25 180,95 140,70" fill="#bae6fd" stroke="#0369a1" stroke-width="2.5"/>
        <!-- Front Face -->
        <polygon points="0,0 140,0 140,70 0,70" fill="#f0f9ff" stroke="#0369a1" stroke-width="2.5"/>
        <text x="90" y="105" text-anchor="middle" font-family="sans-serif" font-weight="900" font-size="14" fill="#0369a1">Bangun 2: Balok</text>
        <text x="90" y="122" text-anchor="middle" font-family="sans-serif" font-weight="700" font-size="11" fill="#64748b">(12 rusuk &amp; 8 titik sudut)</text>
      </g>

      <rect x="15" y="12" width="230" height="26" rx="8" fill="#ccfbf1"/>
      <text x="25" y="29" font-family="sans-serif" font-weight="800" font-size="12" fill="#0f766e">STIMULUS KUBUS &amp; BALOK</text>
    </svg>
  `),

  // Statement 1: Kubus 6 Sisi Persegi Kongruen
  STATEMENT_CUBE: svgToDataUri(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 140" width="200" height="140">
      <rect width="200" height="140" rx="12" fill="#f0fdfa"/>
      <g transform="translate(60, 30)">
        <polygon points="0,0 55,0 75,20 20,20" fill="#ccfbf1" stroke="#0d9488" stroke-width="2"/>
        <polygon points="55,0 75,20 75,75 55,55" fill="#99f6e4" stroke="#0d9488" stroke-width="2"/>
        <polygon points="0,0 55,0 55,55 0,55" fill="#e6fffa" stroke="#0d9488" stroke-width="2"/>
      </g>
      <text x="100" y="120" text-anchor="middle" font-family="sans-serif" font-weight="800" font-size="11" fill="#0f766e">Kubus (6 Sisi Persegi)</text>
    </svg>
  `),

  // Statement 2: Balok 12 Rusuk & 8 Titik Sudut
  STATEMENT_CUBOID: svgToDataUri(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 140" width="200" height="140">
      <rect width="200" height="140" rx="12" fill="#f0f9ff"/>
      <g transform="translate(45, 30)">
        <polygon points="0,0 85,0 110,20 25,20" fill="#e0f2fe" stroke="#0284c7" stroke-width="2"/>
        <polygon points="85,0 110,20 110,75 85,55" fill="#bae6fd" stroke="#0284c7" stroke-width="2"/>
        <polygon points="0,0 85,0 85,55 0,55" fill="#f0f9ff" stroke="#0284c7" stroke-width="2"/>
        <!-- 8 Red dots on vertices -->
        <circle cx="0" cy="0" r="3" fill="#ef4444"/>
        <circle cx="85" cy="0" r="3" fill="#ef4444"/>
        <circle cx="85" cy="55" r="3" fill="#ef4444"/>
        <circle cx="0" cy="55" r="3" fill="#ef4444"/>
        <circle cx="25" cy="20" r="3" fill="#ef4444"/>
        <circle cx="110" cy="20" r="3" fill="#ef4444"/>
        <circle cx="110" cy="75" r="3" fill="#ef4444"/>
      </g>
      <text x="100" y="120" text-anchor="middle" font-family="sans-serif" font-weight="800" font-size="11" fill="#0369a1">Balok (12 Rusuk &amp; 8 Titik Sudut)</text>
    </svg>
  `),

  // Statement 3: Tabung (Silinder) Tanpa Titik Sudut
  STATEMENT_CYLINDER: svgToDataUri(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 140" width="200" height="140">
      <rect width="200" height="140" rx="12" fill="#fff1f2"/>
      <g transform="translate(100, 30)">
        <!-- Cylinder body -->
        <rect x="-35" y="15" width="70" height="50" fill="#ffe4e6" stroke="none"/>
        <line x1="-35" y1="15" x2="-35" y2="65" stroke="#e11d48" stroke-width="2"/>
        <line x1="35" y1="15" x2="35" y2="65" stroke="#e11d48" stroke-width="2"/>
        <!-- Bottom ellipse -->
        <ellipse cx="0" cy="65" rx="35" ry="15" fill="#fecdd3" stroke="#e11d48" stroke-width="2"/>
        <!-- Top ellipse -->
        <ellipse cx="0" cy="15" rx="35" ry="15" fill="#fda4af" stroke="#e11d48" stroke-width="2"/>
      </g>
      <text x="100" y="120" text-anchor="middle" font-family="sans-serif" font-weight="800" font-size="11" fill="#be123c">Tabung (0 Titik Sudut)</text>
    </svg>
  `),
};
