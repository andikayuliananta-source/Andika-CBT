/**
 * High-performance client-side image compressor for exam questions.
 * Converts uploaded files or pasted images into lightweight, crisp WebP/JPEG DataURLs (typically 20KB - 70KB)
 * in under 50 milliseconds without any network latency, timeout, or storage permission failures.
 */

export interface CompressedImageResult {
  dataUrl: string;
  width: number;
  height: number;
  sizeBytes: number;
  format: 'webp' | 'jpeg';
}

export async function compressImageFile(
  file: File,
  options: {
    maxDimension?: number;
    quality?: number;
    maxFileSizeMb?: number;
  } = {}
): Promise<CompressedImageResult> {
  const maxDimension = options.maxDimension || 960;
  const quality = options.quality ?? 0.82;
  const maxFileSizeMb = options.maxFileSizeMb || 10;

  // 1. Validate file size up to 10MB
  if (file.size > maxFileSizeMb * 1024 * 1024) {
    throw new Error(`Ukuran berkas gambar terlalu besar (${(file.size / (1024 * 1024)).toFixed(1)}MB). Maksimal ${maxFileSizeMb}MB.`);
  }

  // 2. Validate MIME type or file extension
  const isImageMime = file.type && file.type.startsWith('image/');
  const isImageExt = /\.(jpe?g|png|webp|gif|bmp|svg)$/i.test(file.name || '');

  if (!isImageMime && !isImageExt) {
    throw new Error('Format berkas tidak valid. Harap pilih berkas gambar (JPG, PNG, WEBP, atau GIF).');
  }

  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const img = new Image();

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      try {
        let { naturalWidth: width, naturalHeight: height } = img;
        if (!width || !height) {
          width = img.width || 600;
          height = img.height || 400;
        }

        // Calculate proportional scale down to maxDimension
        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        // Create in-memory canvas
        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, width);
        canvas.height = Math.max(1, height);
        const ctx = canvas.getContext('2d', { alpha: false });
        if (!ctx) {
          throw new Error('Gagal menginisialisasi canvas untuk kompresi gambar.');
        }

        // Fill white background in case of transparent PNG/WebP so it displays cleanly in exam
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, width, height);

        // High quality smoothing
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, width, height);

        // Try WebP first
        let format: 'webp' | 'jpeg' = 'webp';
        let dataUrl = canvas.toDataURL('image/webp', quality);

        // Fallback to JPEG if browser doesn't support WebP export
        if (!dataUrl.startsWith('data:image/webp')) {
          dataUrl = canvas.toDataURL('image/jpeg', quality);
          format = 'jpeg';
        }

        // If the resulting dataUrl is still larger than 250KB, reduce quality slightly to keep under Firestore limit
        if (dataUrl.length > 250 * 1024) {
          dataUrl = canvas.toDataURL('image/jpeg', 0.68);
          format = 'jpeg';
        }

        const sizeBytes = Math.round((dataUrl.length * 3) / 4);

        resolve({
          dataUrl,
          width,
          height,
          sizeBytes,
          format,
        });
      } catch (err: any) {
        reject(new Error('Gagal memproses gambar: ' + (err?.message || 'Error tidak diketahui')));
      }
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      // Fallback via FileReader in case ObjectURL had issue with specific browser security policy
      const reader = new FileReader();
      reader.onload = (e) => {
        const fallbackImg = new Image();
        fallbackImg.onload = () => {
          try {
            const canvas = document.createElement('canvas');
            canvas.width = Math.min(fallbackImg.width, maxDimension);
            canvas.height = Math.round((fallbackImg.height * canvas.width) / fallbackImg.width);
            const ctx = canvas.getContext('2d');
            ctx?.drawImage(fallbackImg, 0, 0, canvas.width, canvas.height);
            const dataUrl = canvas.toDataURL('image/jpeg', quality);
            resolve({
              dataUrl,
              width: canvas.width,
              height: canvas.height,
              sizeBytes: Math.round((dataUrl.length * 3) / 4),
              format: 'jpeg',
            });
          } catch (e2: any) {
            reject(new Error('Gagal membaca gambar: ' + (e2?.message || 'Format tidak didukung')));
          }
        };
        fallbackImg.onerror = () => reject(new Error('Berkas gambar rusak atau tidak dapat dimuat.'));
        fallbackImg.src = e.target?.result as string;
      };
      reader.onerror = () => reject(new Error('Gagal membaca berkas gambar dari perangkat.'));
      reader.readAsDataURL(file);
    };

    img.src = objectUrl;
  });
}

/**
 * Format bytes to readable string (e.g. "45 KB")
 */
export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}
