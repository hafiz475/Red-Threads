# Red Threads

Red Threads is a static, illustrated React storybook for a private WhatsApp export. The public GitHub Pages site contains a generic lock screen, original non-personal artwork, application code, and opaque encrypted blobs only. The transcript and media are decrypted in the invited reader's browser after both secrets are supplied.

## Security model

Unlocking requires two independent factors:

1. A random 256-bit invitation key carried only in the URL fragment. Fragments are not sent to GitHub Pages and the app removes the fragment from the address bar immediately after capturing it.
2. An eight-digit PIN hardened with PBKDF2-HMAC-SHA-256 (650,000 iterations) and a fresh salt.

The two factors are combined through HKDF-SHA-256 to derive an AES-256-GCM archive key. Every manifest or media chunk has a fresh 96-bit IV and authenticated context. A wrong PIN, wrong invitation, altered ciphertext, or wrong context fails closed.

This is strong client-side encryption, not authenticated hosting. Ciphertext and file sizes remain public. Anyone with both the full invitation and PIN can decrypt the archive. An eight-digit PIN has limited entropy, so the invitation must remain private. A downloaded old archive cannot be remotely revoked; rotate the invitation and re-encrypt for future access if either factor leaks.

## Install and verify

```powershell
npm install
npm test
npm run typecheck
npm run privacy:check
npm run build
npm run privacy:check
```

The tests use synthetic conversations only. They cover multiline and Unicode-mark parsing, duplicate timestamps, stable ordering, empty calendar days, attachment mapping, nickname direction, historical time phases, AES-GCM round trips, wrong credentials, tampering, wrong AAD, IV uniqueness, and Node/browser Web Crypto compatibility.

## Private local import

Keep the WhatsApp ZIP outside this repository. Then run:

```powershell
npm run import:whatsapp -- --input "C:\Private\WhatsApp Chat.zip" --include-media=all
```

The importer:

- refuses a ZIP located inside the project;
- asks which local participant is the owner when necessary;
- asks for the PIN twice in a non-echoing terminal prompt;
- creates or reuses a random invitation key;
- parses every recoverable message in stable source order;
- streams the ZIP and encrypts media in chunks of at most 8 MiB;
- writes only ciphertext and a generic public envelope to `public/sealed`;
- writes a counts-only report under ignored `.private/`;
- saves the invitation recovery key beside the source ZIP, outside Git;
- prints the private fragment invitation once.

Do not paste the PIN or invitation into a command, environment committed to disk, issue, commit message, screenshot, or CI setting. Share the invitation and PIN separately through private channels. Obtain the other participant's consent before publishing even encrypted personal history.

### Review names and featured moments

The importer conservatively detects affectionate terms and preserves spelling, direction, and exact evidence links. It also writes repeated custom vocatives and playful spellings to ignored `.private/nickname-candidates.private.json`; these candidates stay hidden from the experience until the owner reviews them. For owner review, create ignored `.private/nickname-review.json`:

```json
{
  "allow": [{ "term": "synthetic example", "direction": "mine-to-theirs", "featured": true }],
  "reject": ["ambiguous example"],
  "merge": { "variant example": "canonical example" }
}
```

Re-import after review. The review file never enters Git; its result is inside the encrypted manifest.

### Refresh without breaking the saved invitation

Use the recovery file from the first import:

```powershell
npm run import:whatsapp -- --input "C:\Private\Updated Chat.zip" --include-media=all --reuse-invitation "C:\Private\red-threads-invitation-key.txt"
```

The importer generates fresh salts and IVs while retaining the invitation factor. Omit `--reuse-invitation` to rotate the link deliberately. Back up the original export, PIN, and recovery file privately; none can be recovered from GitHub.

## Private verification and recovery

```powershell
npm run audit:archive
npm run verify:encrypted -- --recovery "C:\Private\red-threads-invitation-key.txt"
npm run invite:recover -- --recovery "C:\Private\red-threads-invitation-key.txt"
```

The encrypted verifier asks for the PIN privately and decrypts every object only to validate authentication and byte counts. It never prints messages, names, filenames, or excerpts.

## GitHub Pages deployment

1. Run the import locally.
2. Run tests, typecheck, build, and the privacy check. Optionally enable the local hook with `git config core.hooksPath .githooks`.
3. Inspect `git status`. Commit source, original safe art, `public/sealed/envelope.json`, and `public/sealed/*.bin` only.
4. Push `main` to the repository.
5. In GitHub **Settings → Pages**, select **GitHub Actions** as the source.
6. Wait for **Verify and deploy encrypted site** to pass.
7. Send the private invitation link and PIN separately. The site remains available while the importing laptop is off because GitHub Pages serves the static code and ciphertext.

The CI workflow cannot access the source ZIP, PIN, invitation recovery file, plaintext transcript, or local review files. It only verifies and deploys the already encrypted static artifact.

## Media notes

Images, WebP stickers, MP4 video, browser-compatible audio, and other exported files are decrypted on demand. Audio never autoplays. MOV or Opus support depends on the reader's browser; unsupported items can be downloaded locally after unlock without uploading them to a third party. Object URLs are revoked when closed, locked, or unmounted.

## Commands

- `npm run dev` — local Vite development server
- `npm run build` — strict typecheck and production build
- `npm test` — synthetic parser, crypto, indexing, and scene tests
- `npm run privacy:check` — fail-closed source/build/tracked-file scan
- `npm run inspect:source -- --input <absolute-zip>` — counts-only local source inspection
- `npm run import:whatsapp -- --input <absolute-zip> --include-media=all` — private import and encryption
- `npm run audit:archive` — counts-only ignored import report
- `npm run verify:encrypted -- --recovery <absolute-file>` — authenticate all ciphertext locally
- `npm run invite:recover -- --recovery <absolute-file>` — reconstruct the private invitation locally
