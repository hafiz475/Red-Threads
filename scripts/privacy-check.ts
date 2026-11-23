import { readFile, readdir, stat } from 'node:fs/promises';
import { extname, join, relative, resolve, sep } from 'node:path';
import { execFileSync } from 'node:child_process';

const root = resolve(process.cwd());
const ignored = new Set(['node_modules', '.git', '.private', '.vite', 'coverage']);
const rawExtensions = new Set(['.zip', '.opus', '.mov', '.mp4', '.m4a', '.aac', '.webp', '.jpg', '.jpeg', '.png', '.gif']);
const textExtensions = new Set(['.ts', '.tsx', '.js', '.jsx', '.json', '.md', '.html', '.css', '.yml', '.yaml', '.txt', '.env']);
const violations: string[] = [];

function isApprovedArt(path: string) {
  const normalized = path.split(sep).join('/');
  return normalized.startsWith('public/art/') || normalized.startsWith('dist/art/');
}
function isSealed(path: string) { return path.split(sep).join('/').startsWith('public/sealed/'); }

async function walk(directory: string): Promise<string[]> {
  const output: string[] = [];
  for (const item of await readdir(directory, { withFileTypes: true })) {
    if (ignored.has(item.name)) continue;
    const path = join(directory, item.name);
    if (item.isDirectory()) output.push(...await walk(path)); else output.push(path);
  }
  return output;
}

function checkText(path: string, text: string) {
  const rel = relative(root, path).split(sep).join('/');
  const privatePin = process.env.RED_THREADS_PRIVATE_PIN;
  if (privatePin && privatePin.length >= 8 && text.includes(privatePin)) violations.push(`${rel}: contains the private PIN supplied to the scanner`);
  if ((rel.startsWith('public/') || rel.startsWith('dist/')) && /\[?\d{1,2}\/\d{1,2}\/\d{2,4},\s*\d{1,2}:\d{2}/.test(text)) violations.push(`${rel}: contains a WhatsApp-style timestamp`);
  if ((rel.startsWith('public/') || rel.startsWith('dist/')) && /Assalamualaikum|Walaikum Assalam|red threads were activated/i.test(text)) violations.push(`${rel}: contains a prohibited private-source phrase`);
  if (/invite=[A-Za-z0-9_-]{43}(?:[^A-Za-z0-9_-]|$)/.test(text)) violations.push(`${rel}: appears to contain a complete invitation secret`);
}

async function main() {
  const files = await walk(root);
  for (const path of files) {
    const rel = relative(root, path);
    const extension = extname(path).toLowerCase();
    if (rawExtensions.has(extension) && !isApprovedArt(rel)) violations.push(`${rel}: raw/private media extension is not allowed`);
    if (isSealed(rel) && extension !== '.bin' && rel.split(sep).join('/') !== 'public/sealed/envelope.json' && rel.split(sep).join('/') !== 'public/sealed/.gitkeep') violations.push(`${rel}: unexpected public sealed-file type`);
    const info = await stat(path);
    if (textExtensions.has(extension) && info.size < 8 * 1024 * 1024) checkText(path, await readFile(path, 'utf8'));
    if (extension === '.bin' && isSealed(rel)) {
      const header = (await readFile(path)).subarray(0, 16);
      const rawMagic = header.subarray(0, 4).toString('hex');
      if (['504b0304', 'ffd8ffe0', 'ffd8ffe1', '52494646', '66747970'].some((magic) => rawMagic.startsWith(magic))) violations.push(`${rel}: encrypted object begins with a raw-file signature`);
      if (header[0] !== 1) violations.push(`${rel}: sealed object has an unsupported version byte`);
    }
  }
  try {
    const tracked = execFileSync('git', ['ls-files'], { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).split(/\r?\n/).filter(Boolean);
    for (const file of tracked) {
      const extension = extname(file).toLowerCase();
      if (rawExtensions.has(extension) && !isApprovedArt(file)) violations.push(`${file}: raw media is tracked by Git`);
      if (/WhatsApp Chat|_chat\.txt/i.test(file)) violations.push(`${file}: private export filename is tracked by Git`);
    }
  } catch { /* A new uninitialized checkout is still scanned above. */ }
  if (violations.length) {
    process.stderr.write(`Privacy check failed (${violations.length}):\n${violations.map((item) => `- ${item}`).join('\n')}\n`);
    process.exitCode = 1;
  } else {
    process.stdout.write(`Privacy check passed: ${files.length} files inspected; no publishable plaintext or raw archive media detected.\n`);
  }
}

main().catch((error: unknown) => { process.stderr.write(`Privacy check stopped: ${error instanceof Error ? error.message : 'unknown error'}\n`); process.exitCode = 1; });
