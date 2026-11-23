import { readFile } from 'node:fs/promises';
import { isAbsolute, resolve } from 'node:path';

const index = process.argv.indexOf('--recovery');
const input = index >= 0 ? process.argv[index + 1] : process.argv.slice(2).find((value) => !value.startsWith('-'));
if (!input || !isAbsolute(input)) {
  process.stderr.write('Use an absolute private path: npm run invite:recover -- --recovery "C:\\Private\\red-threads-invitation-key.txt"\n');
  process.exitCode = 1;
} else {
  readFile(resolve(input), 'utf8').then((text) => {
    const key = text.trim().split(/\s+/).at(-1) ?? '';
    if (!/^[A-Za-z0-9_-]{43}$/.test(key)) throw new Error('Invalid recovery file.');
    process.stdout.write(`Private invitation — send only through a private channel:\nhttps://hafiz475.github.io/Red-Threads/#invite=${key}\n`);
  }).catch((error: unknown) => { process.stderr.write(`${error instanceof Error ? error.message : 'Recovery failed.'}\n`); process.exitCode = 1; });
}
