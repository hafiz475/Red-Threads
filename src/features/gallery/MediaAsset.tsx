import { useEffect, useState } from 'react';
import { Download, FileQuestion, LoaderCircle, Play, X } from '../../components/Icons';
import type { MediaEntry } from '../../archive/types';
import { decryptSealedObject } from '../../crypto/browser';

interface Props { media: MediaEntry; cryptoKey: CryptoKey; compact?: boolean; }

export function MediaAsset({ media, cryptoKey, compact = false }: Props) {
  const [url, setUrl] = useState<string>();
  const [status, setStatus] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle');
  useEffect(() => () => { if (url) URL.revokeObjectURL(url); }, [url]);
  const open = async () => {
    if (url) return;
    setStatus('loading');
    try {
      const pieces: ArrayBuffer[] = [];
      for (const chunk of [...media.chunks].sort((a, b) => a.index - b.index)) {
        const response = await fetch(`${import.meta.env.BASE_URL}${chunk.path}`);
        if (!response.ok) throw new Error('Missing encrypted media');
        pieces.push(await decryptSealedObject(await response.arrayBuffer(), cryptoKey, chunk.aad));
      }
      const objectUrl = URL.createObjectURL(new Blob(pieces, { type: media.mime }));
      setUrl(objectUrl);
      setStatus('ready');
    } catch {
      setStatus('error');
    }
  };
  const close = () => {
    if (url) URL.revokeObjectURL(url);
    setUrl(undefined);
    setStatus('idle');
  };
  if (!url) return (
    <button className={`media-sealed ${compact ? 'compact' : ''}`} onClick={open} disabled={status === 'loading'}>
      {status === 'loading' ? <LoaderCircle className="spin" /> : status === 'error' ? <FileQuestion /> : <Play />}
      <span>{status === 'loading' ? 'Decrypting in memory…' : status === 'error' ? 'Could not open this file' : `Open ${media.extension.replace('.', '').toUpperCase()} privately`}</span>
    </button>
  );
  const isImage = media.mime.startsWith('image/');
  const isVideo = media.mime.startsWith('video/');
  const isAudio = media.mime.startsWith('audio/');
  return (
    <div className={`decrypted-media ${compact ? 'compact' : ''}`}>
      {isImage && <img src={url} alt="Decrypted archive media" loading="lazy" />}
      {isVideo && <video src={url} controls playsInline preload="metadata" />}
      {isAudio && <audio src={url} controls preload="none" />}
      {!isImage && !isVideo && !isAudio && <div className="unsupported-media"><FileQuestion /><span>This browser cannot preview this format.</span></div>}
      <div className="media-actions"><a href={url} download={media.sourceName}><Download /> Download this decrypted file</a><button onClick={close} aria-label="Close decrypted media"><X /></button></div>
    </div>
  );
}
