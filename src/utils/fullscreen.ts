/**
 * Fullscreen utilities with cross-browser compatibility and error handling
 */

export async function requestAppFullscreen(element?: HTMLElement): Promise<boolean> {
  try {
    if (isAppFullscreen()) {
      return true;
    }
    const target = element || document.documentElement;
    const el = target as any;

    if (el.requestFullscreen) {
      await el.requestFullscreen();
      return true;
    } else if (el.webkitRequestFullscreen) {
      await el.webkitRequestFullscreen();
      return true;
    } else if (el.mozRequestFullScreen) {
      await el.mozRequestFullScreen();
      return true;
    } else if (el.msRequestFullscreen) {
      await el.msRequestFullscreen();
      return true;
    }
  } catch (err) {
    // Some browsers or iframes restrict fullscreen without explicit user activation
    console.warn('Fullscreen request could not be granted:', err);
  }
  return false;
}

export function isFullscreenSupported(): boolean {
  if (typeof document === 'undefined') return false;
  const doc = document as any;
  return Boolean(
    doc.fullscreenEnabled ||
    doc.webkitFullscreenEnabled ||
    doc.mozFullScreenEnabled ||
    doc.msFullscreenEnabled
  );
}

export async function exitAppFullscreen(): Promise<boolean> {
  try {
    const doc = document as any;
    if (isAppFullscreen()) {
      if (doc.exitFullscreen) {
        await doc.exitFullscreen();
        return true;
      } else if (doc.webkitExitFullscreen) {
        await doc.webkitExitFullscreen();
        return true;
      } else if (doc.mozCancelFullScreen) {
        await doc.mozCancelFullScreen();
        return true;
      } else if (doc.msExitFullscreen) {
        await doc.msExitFullscreen();
        return true;
      }
    }
  } catch (err) {
    console.warn('Exit fullscreen error:', err);
  }
  return false;
}

export function isAppFullscreen(): boolean {
  if (typeof document === 'undefined') return false;
  const doc = document as any;
  return Boolean(
    doc.fullscreenElement ||
    doc.webkitFullscreenElement ||
    doc.mozFullScreenElement ||
    doc.msFullscreenElement
  );
}

export function subscribeFullscreenChange(callback: (isFullscreen: boolean) => void): () => void {
  if (typeof document === 'undefined') {
    return () => {};
  }

  const handler = () => {
    callback(isAppFullscreen());
  };

  document.addEventListener('fullscreenchange', handler);
  document.addEventListener('webkitfullscreenchange', handler);
  document.addEventListener('mozfullscreenchange', handler);
  document.addEventListener('MSFullscreenChange', handler);

  return () => {
    document.removeEventListener('fullscreenchange', handler);
    document.removeEventListener('webkitfullscreenchange', handler);
    document.removeEventListener('mozfullscreenchange', handler);
    document.removeEventListener('MSFullscreenChange', handler);
  };
}
