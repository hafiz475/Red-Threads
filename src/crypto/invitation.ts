import { base64UrlToBytes } from './encoding';

export function captureInvitation(): Uint8Array | undefined {
  const match = window.location.hash.match(/(?:^#|&)invite=([A-Za-z0-9_-]+)/);
  if (!match?.[1]) return undefined;
  try {
    const key = base64UrlToBytes(match[1]);
    if (key.byteLength !== 32) return undefined;
    window.history.replaceState(null, document.title, `${window.location.pathname}${window.location.search}`);
    return key;
  } catch {
    return undefined;
  }
}

