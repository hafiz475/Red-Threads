import { useState, type FormEvent } from 'react';
import { KeyRound, LockKeyhole, Sparkles } from '../../components/Icons';
import type { PrivateArchive, PublicEnvelope } from '../../archive/types';
import { unlockArchive } from '../../crypto/browser';
import { IllustratedSky } from '../../components/IllustratedSky';

interface Props {
  invitation?: Uint8Array;
  envelope?: PublicEnvelope;
  envelopeState: 'loading' | 'ready' | 'missing' | 'error';
  animate: boolean;
  onUnlock: (archive: PrivateArchive, key: CryptoKey) => void;
}

export function LockScreen({ invitation, envelope, envelopeState, animate, onUnlock }: Props) {
  const [opened, setOpened] = useState(false);
  const [pin, setPin] = useState('');
  const [status, setStatus] = useState<'idle' | 'unlocking' | 'error'>('idle');
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!invitation || !envelope || pin.length !== 8 || status === 'unlocking') return;
    setStatus('unlocking');
    try {
      const result = await unlockArchive(pin, invitation, envelope, import.meta.env.BASE_URL);
      setPin('');
      onUnlock(result.archive, result.key);
    } catch {
      setPin('');
      setStatus('error');
    }
  };
  return (
    <main className="lock-screen">
      <IllustratedSky animate={animate} phase="night" />
      <div className="lock-art-scrim" />
      <section className="lock-card" aria-labelledby="lock-title">
        <div className="lock-mark"><Sparkles /><span>Red Threads</span></div>
        <p className="eyebrow">A private illustrated story</p>
        <h1 id="lock-title">Some stories are written one message at a time.</h1>
        <p className="lock-copy">Two little stars. One patient thread. A universe that opens only for its invited readers.</p>
        {!opened ? (
          <button className="primary-button" onClick={() => setOpened(true)}><LockKeyhole /> Open our little universe</button>
        ) : !invitation ? (
          <div className="quiet-notice" role="status"><KeyRound /> This is a private story. Open your personal invitation link.</div>
        ) : envelopeState === 'loading' ? (
          <div className="quiet-notice" role="status">Finding the sealed story…</div>
        ) : envelopeState !== 'ready' || !envelope ? (
          <div className="quiet-notice" role="status">The encrypted story has not been prepared here yet.</div>
        ) : (
          <form className="pin-form" onSubmit={submit}>
            <label htmlFor="private-pin">Enter your private 8-digit code</label>
            <input
              id="private-pin"
              type="password"
              inputMode="numeric"
              autoComplete="off"
              pattern="[0-9]{8}"
              maxLength={8}
              value={pin}
              onChange={(event) => { setPin(event.target.value.replace(/\D/g, '').slice(0, 8)); setStatus('idle'); }}
              aria-describedby={status === 'error' ? 'unlock-error' : undefined}
              autoFocus
            />
            <button className="primary-button" disabled={pin.length !== 8 || status === 'unlocking'}>
              <KeyRound /> {status === 'unlocking' ? 'Opening safely…' : 'Unlock the story'}
            </button>
            {status === 'error' && <p id="unlock-error" className="form-error" role="alert">That invitation and code could not open this story. Please check both and try again.</p>}
          </form>
        )}
        <p className="privacy-line">Nothing personal is shown until authenticated decryption succeeds in this browser.</p>
      </section>
    </main>
  );
}
