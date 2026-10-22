/**
 * Image URL normalization and preloading utilities for CBT CERIA.
 * Ensures external links (Google Drive, Dropbox, Unsplash, etc.)
 * resolve to direct browser-renderable image streams without CORS errors.
 */

export function normalizeImageUrl(rawUrl?: string | null): string {
  if (!rawUrl || typeof rawUrl !== 'string') return '';
  const trimmed = rawUrl.trim();
  if (!trimmed) return '';

  // Data URLs and SVGs don't need transformation
  if (trimmed.startsWith('data:image/') || trimmed.startsWith('blob:')) {
    return trimmed;
  }

  try {
    // 1. Google Drive Sharing Link Normalization
    // Patterns:
    // https://drive.google.com/file/d/FILE_ID/view?usp=sharing
    // https://drive.google.com/open?id=FILE_ID
    // https://drive.google.com/uc?id=FILE_ID
    const gDriveFileMatch = trimmed.match(/drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/);
    if (gDriveFileMatch && gDriveFileMatch[1]) {
      const fileId = gDriveFileMatch[1];
      // lh3.googleusercontent.com/d/{id} is Google's public direct image CDN
      return `https://lh3.googleusercontent.com/d/${fileId}`;
    }

    const gDriveOpenMatch = trimmed.match(/drive\.google\.com\/(?:open|uc)\?(?:[^&]*&)*id=([a-zA-Z0-9_-]+)/);
    if (gDriveOpenMatch && gDriveOpenMatch[1]) {
      const fileId = gDriveOpenMatch[1];
      return `https://lh3.googleusercontent.com/d/${fileId}`;
    }

    // 2. Dropbox Link Normalization
    // www.dropbox.com/... -> dl.dropboxusercontent.com/...
    if (trimmed.includes('dropbox.com')) {
      if (trimmed.includes('dl=0')) {
        return trimmed.replace('dl=0', 'raw=1');
      }
      if (!trimmed.includes('raw=1')) {
        return `${trimmed}${trimmed.includes('?') ? '&' : '?'}raw=1`;
      }
    }

    // 3. Imgur Link Normalization (ensure direct .jpg / .png if omitted)
    const imgurMatch = trimmed.match(/^https?:\/\/imgur\.com\/([a-zA-Z0-9]+)$/);
    if (imgurMatch && imgurMatch[1]) {
      return `https://i.imgur.com/${imgurMatch[1]}.png`;
    }

    return trimmed;
  } catch {
    return trimmed;
  }
}

/**
 * Preloads an array of image URLs into browser cache in the background.
 * Prevents loading delay and layout shift when students navigate between questions.
 */
export function preloadQuestionImages(urls: (string | undefined | null)[]): void {
  const validUrls = urls
    .map((u) => normalizeImageUrl(u))
    .filter((u): u is string => Boolean(u && u.length > 5));

  if (validUrls.length === 0) return;

  // Preload with concurrency limit to avoid overwhelming school WiFi
  const uniqueUrls = Array.from(new Set(validUrls));
  
  uniqueUrls.forEach((url) => {
    try {
      const img = new Image();
      img.decoding = 'async';
      img.src = url;
    } catch {
      // Ignore background preload errors
    }
  });
}
