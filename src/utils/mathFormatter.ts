/**
 * Standard Web CBT Math Formatter & Converter
 * 
 * Rules strictly respecting CBT Web friendliness for elementary school students:
 * 1. Jangan gunakan format LaTeX (seperti \frac{}{}, \text{}, $).
 * 2. Pecahan: gunakan format slash, contoh: 3/8
 * 3. Pangkat/Luas/Volume: tuliskan cm2 atau cm3 (atau gunakan Unicode: cm², cm³)
 * 4. Derajat: gunakan simbol ° atau kata 'derajat'
 * 5. Perkalian/Pembagian: gunakan x atau * dan :
 */

export const MATH_CBT_GUIDELINES = {
  mainRule: "Jangan gunakan format LaTeX (seperti \\frac{}{}, \\text{}, $). Tuliskan semua rumus dan simbol matematika menggunakan teks standar yang ramah CBT web:",
  rules: [
    {
      category: "Pecahan",
      instruction: "Gunakan format slash (garis miring)",
      example: "3/8",
      description: "Contoh: 1/2, 3/4, 3/8, 5 1/2",
      badge: "3/8",
    },
    {
      category: "Pangkat / Luas / Volume",
      instruction: "Tuliskan cm2 atau cm3 (atau gunakan simbol Unicode: cm², cm³)",
      example: "cm2 / cm3 atau cm² / cm³",
      description: "Contoh: 15 cm², 200 m², volume 500 cm³",
      badge: "cm² / cm³",
    },
    {
      category: "Derajat",
      instruction: "Gunakan simbol ° atau kata 'derajat'",
      example: "90° atau 90 derajat",
      description: "Contoh: Sudut siku-siku adalah 90° (atau 90 derajat)",
      badge: "90° / derajat",
    },
    {
      category: "Perkalian & Pembagian",
      instruction: "Gunakan x atau * dan :",
      example: "12 x 4 : 2 = 24",
      description: "Contoh: 25 x 4 = 100, atau 100 : 4 = 25",
      badge: "x, *, :",
    },
  ],
};

// Common quick-insert symbols for teachers
export const QUICK_MATH_SYMBOLS = [
  { label: 'Pecahan 1/2', value: '1/2', group: 'fraction' },
  { label: 'Pecahan 3/4', value: '3/4', group: 'fraction' },
  { label: 'Pecahan 3/8', value: '3/8', group: 'fraction' },
  { label: 'cm²', value: 'cm²', group: 'unit' },
  { label: 'cm³', value: 'cm³', group: 'unit' },
  { label: 'm²', value: 'm²', group: 'unit' },
  { label: 'Pangkat ²', value: '²', group: 'power' },
  { label: 'Pangkat ³', value: '³', group: 'power' },
  { label: 'Derajat (°)', value: '°', group: 'symbol' },
  { label: 'Kali (x)', value: ' x ', group: 'operator' },
  { label: 'Bagi (:)', value: ' : ', group: 'operator' },
  { label: 'Tambah (+)', value: ' + ', group: 'operator' },
  { label: 'Kurang (-)', value: ' - ', group: 'operator' },
  { label: 'Sama dengan (=)', value: ' = ', group: 'operator' },
  { label: 'Kurang dari sama (≤)', value: '≤', group: 'symbol' },
  { label: 'Lebih dari sama (≥)', value: '≥', group: 'symbol' },
  { label: 'Tidak sama (≠)', value: '≠', group: 'symbol' },
  { label: 'Akar (√)', value: '√', group: 'symbol' },
  { label: 'Phi (π)', value: 'π', group: 'symbol' },
  { label: 'Plus Minus (±)', value: '±', group: 'symbol' },
];

/**
 * Checks if a string contains raw LaTeX code (e.g. \frac, \text, $, \times, \div, etc.)
 */
export function hasLatexCode(text: string): boolean {
  if (!text || typeof text !== 'string') return false;
  return /\\(frac|dfrac|text|times|div|cdot|degree|sqrt|le|leq|ge|geq|neq|approx|pm|pi|quad|left|right|\^\{|_)|\$|\{|\}/i.test(text);
}

// In-memory memoization cache to eliminate regex lag during question rendering
const mathFormatCache = new Map<string, string>();
const MAX_CACHE_SIZE = 500;

export function convertLatexToStandardMath(text: string): string {
  if (!text || typeof text !== 'string') return '';

  const cached = mathFormatCache.get(text);
  if (cached !== undefined) {
    return cached;
  }

  let out = text;

  // 1. Remove enclosing math delimiters: $$ ... $$, $ ... $, \( ... \), \[ ... \]
  out = out.replace(/\$\$([\s\S]*?)\$\$/g, '$1');
  out = out.replace(/\$([^\$]+)\$/g, '$1');
  out = out.replace(/\\\(([\s\S]*?)\\\)/g, '$1');
  out = out.replace(/\\\[([\s\S]*?)\\\]/g, '$1');

  // 2. Convert fractions: \frac{a}{b} or \dfrac{a}{b} -> a/b
  // Handle nested or simple braces iteratively
  for (let i = 0; i < 4; i++) {
    out = out.replace(/\\d?frac\{([^{}]+)\}\{([^{}]+)\}/g, '$1/$2');
  }

  // 3. Convert \text{...} -> ...
  out = out.replace(/\\text\{([^{}]+)\}/g, '$1');

  // 4. Units & superscripts: cm^2 -> cm², cm^3 -> cm³, cm2 -> cm2
  out = out.replace(/cm\^\{?2\}?/gi, 'cm²');
  out = out.replace(/cm\^\{?3\}?/gi, 'cm³');
  out = out.replace(/m\^\{?2\}?/gi, 'm²');
  out = out.replace(/m\^\{?3\}?/gi, 'm³');
  out = out.replace(/km\^\{?2\}?/gi, 'km²');
  out = out.replace(/km\^\{?3\}?/gi, 'km³');

  // Generic superscripts
  out = out.replace(/\^\{?2\}?/g, '²');
  out = out.replace(/\^\{?3\}?/g, '³');
  out = out.replace(/\^\{?0\}?/g, '⁰');
  out = out.replace(/\^\{?1\}?/g, '¹');
  out = out.replace(/\^\{?4\}?/g, '⁴');
  out = out.replace(/\^\{?5\}?/g, '⁵');

  // 5. Degree: ^{\circ}, ^\circ, \degree -> °
  out = out.replace(/\^\{?\\circ\}?/g, '°');
  out = out.replace(/\\degree/g, '°');

  // 6. Multiplication: \times -> x, \cdot -> *
  out = out.replace(/\\times/g, 'x');
  out = out.replace(/\\cdot/g, '*');

  // 7. Division: \div -> :
  out = out.replace(/\\div/g, ':');

  // 8. Other standard symbols
  out = out.replace(/\\pm/g, '±');
  out = out.replace(/\\sqrt\{([^{}]+)\}/g, '√$1');
  out = out.replace(/\\sqrt/g, '√');
  out = out.replace(/\\(le|leq)/g, '≤');
  out = out.replace(/\\(ge|geq)/g, '≥');
  out = out.replace(/\\neq/g, '≠');
  out = out.replace(/\\approx/g, '≈');
  out = out.replace(/\\pi/g, 'π');
  out = out.replace(/\\quad/g, ' ');
  out = out.replace(/\\left|\\right/g, '');

  // 9. Clean up any remaining stray curly braces from basic formatting
  out = out.replace(/\{([a-zA-Z0-9_\-+*/]+)\}/g, '$1');

  // 10. Normalize double spaces
  const result = out.trim();
  if (mathFormatCache.size < MAX_CACHE_SIZE) {
    mathFormatCache.set(text, result);
  }
  return result;
}
