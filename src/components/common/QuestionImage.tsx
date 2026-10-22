import React, { useState, useEffect } from 'react';
import { ImageOff, Loader2, RefreshCw, ZoomIn, Image as ImageIcon } from 'lucide-react';

interface QuestionImageProps {
  src: string;
  alt: string;
  onZoom?: () => void;
  className?: string;
  imgClassName?: string;
  allowZoom?: boolean;
}

export function normalizeImageUrl(rawUrl?: string | null): string {
  if (!rawUrl || typeof rawUrl !== 'string') return '';
  let url = rawUrl.trim();
  if (!url) return '';

  // Google Drive share link converter
  // Converts view/open links to direct embed/view URLs
  const gDriveMatch1 = url.match(/drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/);
  if (gDriveMatch1 && gDriveMatch1[1]) {
    return `https://drive.google.com/uc?export=view&id=${gDriveMatch1[1]}`;
  }
  const gDriveMatch2 = url.match(/drive\.google\.com\/(?:open|uc)\?id=([a-zA-Z0-9_-]+)/);
  if (gDriveMatch2 && gDriveMatch2[1]) {
    return `https://drive.google.com/uc?export=view&id=${gDriveMatch2[1]}`;
  }

  // Dropbox link converter: dl=0 -> raw=1
  if (url.includes('dropbox.com') && url.includes('dl=0')) {
    return url.replace('dl=0', 'raw=1');
  }

  return url;
}

/**
 * QuestionImage with lazy loading (loading="lazy", decoding="async"),
 * skeleton placeholder while fetching, hotlinking protection bypass (referrerPolicy="no-referrer"),
 * and fallback UI with placeholder icon and retry functionality when image fails to load.
 */
export const QuestionImage: React.FC<QuestionImageProps> = ({
  src,
  alt,
  onZoom,
  className = '',
  imgClassName = '',
  allowZoom = true,
}) => {
  const [loading, setLoading] = useState<boolean>(true);
  const [hasError, setHasError] = useState<boolean>(false);
  const [retryCount, setRetryCount] = useState<number>(0);

  const cleanSrc = normalizeImageUrl(src);

  // Reset states when the image source changes or user clicks retry
  useEffect(() => {
    if (!cleanSrc) {
      setHasError(true);
      setLoading(false);
      return;
    }
    setLoading(true);
    setHasError(false);
  }, [cleanSrc, retryCount]);

  if (!cleanSrc) {
    return null;
  }

  // Generate URL for retry if needed (adds cache buster query param for non-data URLs)
  const resolvedSrc = cleanSrc.startsWith('data:')
    ? cleanSrc
    : retryCount > 0
    ? `${cleanSrc}${cleanSrc.includes('?') ? '&' : '?'}_retry=${retryCount}`
    : cleanSrc;

  const handleRetry = (e: React.MouseEvent) => {
    e.stopPropagation();
    setHasError(false);
    setLoading(true);
    setRetryCount((prev) => prev + 1);
  };

  return (
    <div
      className={`relative overflow-hidden rounded-2xl border-2 border-slate-200 bg-slate-50 transition-all ${className}`}
    >
      {/* 1. Loading Skeleton & Placeholder UI during fetch */}
      {loading && !hasError && (
        <div
          role="status"
          aria-live="polite"
          className="flex min-h-[160px] sm:min-h-[220px] w-full flex-col items-center justify-center space-y-2.5 bg-slate-100/90 p-5 text-center animate-pulse"
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-100 text-indigo-600 shadow-xs">
            <Loader2 className="h-6 w-6 animate-spin text-indigo-600" />
          </div>
          <div className="space-y-0.5">
            <p className="text-xs font-bold text-slate-700 flex items-center justify-center space-x-1">
              <ImageIcon className="w-3.5 h-3.5 text-indigo-500 inline" />
              <span>Memuat gambar soal...</span>
            </p>
            <p className="text-[11px] text-slate-400 font-medium">Sedang mengambil berkas media</p>
          </div>
        </div>
      )}

      {/* 2. Fallback UI with Placeholder Icon when image fails to load */}
      {hasError && (
        <div
          role="alert"
          className="flex min-h-[160px] sm:min-h-[200px] w-full flex-col items-center justify-center space-y-2.5 bg-amber-50/80 p-5 text-center border-2 border-dashed border-amber-300 rounded-2xl select-none"
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-100 text-amber-700 shadow-xs">
            <ImageOff className="h-6 w-6" />
          </div>
          <div className="space-y-1">
            <p className="text-xs font-bold text-amber-950">Gambar Soal Gagal Dimuat</p>
            <p className="text-[11px] text-amber-800/80 max-w-xs leading-relaxed">
              Koneksi terganggu atau berkas gambar sedang tidak dapat diakses.
            </p>
          </div>
          <button
            type="button"
            onClick={handleRetry}
            className="inline-flex items-center space-x-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 active:scale-95 px-3 py-1.5 text-xs font-bold text-white shadow-xs transition-all cursor-pointer"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            <span>Coba Muat Ulang</span>
          </button>
        </div>
      )}

      {/* 3. Rendered Image with Lazy Loading & Asynchronous Decoding */}
      {!hasError && (
        <div className="relative group flex items-center justify-center">
          <img
            key={`${cleanSrc}-${retryCount}`}
            src={resolvedSrc}
            alt={alt}
            loading="lazy"
            decoding="async"
            referrerPolicy="no-referrer"
            onLoad={() => setLoading(false)}
            onError={() => {
              setLoading(false);
              setHasError(true);
            }}
            onClick={allowZoom && onZoom ? onZoom : undefined}
            className={`w-full max-h-48 sm:max-h-72 object-contain mx-auto rounded-xl transition-all duration-300 ${
              loading
                ? 'opacity-0 absolute inset-0 pointer-events-none'
                : 'opacity-100'
            } ${allowZoom && onZoom ? 'cursor-zoom-in' : ''} ${imgClassName}`}
          />

          {/* Zoom Button on Loaded Image */}
          {!loading && allowZoom && onZoom && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onZoom();
              }}
              className="absolute bottom-2.5 right-2.5 bg-slate-900/80 hover:bg-slate-900 text-white text-[11px] font-bold px-2.5 py-1 rounded-lg flex items-center space-x-1 shadow-sm backdrop-blur-xs cursor-pointer transition-all opacity-90 hover:opacity-100"
            >
              <ZoomIn className="w-3 h-3" />
              <span>Perbesar</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
};
