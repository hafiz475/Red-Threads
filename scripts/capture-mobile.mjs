import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const endpoint = process.argv[2] ?? 'http://127.0.0.1:9223';
const output = resolve('.vite/mobile-v3');
await mkdir(output, { recursive: true });
const target = await (await fetch(`${endpoint}/json/new`, { method: 'PUT' })).json();
const socket = new WebSocket(target.webSocketDebuggerUrl);
await new Promise((resolveOpen, reject) => { socket.addEventListener('open', resolveOpen, { once: true }); socket.addEventListener('error', reject, { once: true }); });
let nextId = 1;
const waiting = new Map();
socket.addEventListener('message', ({ data }) => { const message = JSON.parse(String(data)); if (message.id && waiting.has(message.id)) { waiting.get(message.id)(message); waiting.delete(message.id); } });
function send(method, params = {}) { const id = nextId++; socket.send(JSON.stringify({ id, method, params })); return new Promise((resolveMessage) => waiting.set(id, resolveMessage)); }
await send('Page.enable');
const captures = [
  { name: 'home-320-dark.png', width: 320, height: 720, url: 'http://127.0.0.1:4174/Red-Threads/?synthetic-preview=1&screen=home' },
  { name: 'calendar-375-dark.png', width: 375, height: 812, url: 'http://127.0.0.1:4174/Red-Threads/?synthetic-preview=1&screen=calendar' },
  { name: 'home-390-dark.png', width: 390, height: 844, url: 'http://127.0.0.1:4174/Red-Threads/?synthetic-preview=1&screen=home' },
  { name: 'chat-390-night.png', width: 390, height: 844, url: 'http://127.0.0.1:4174/Red-Threads/?synthetic-preview=1&screen=chat' },
  { name: 'calendar-430-light.png', width: 430, height: 932, url: 'http://127.0.0.1:4174/Red-Threads/?synthetic-preview=1&screen=calendar&theme=light' },
  { name: 'home-768-dark.png', width: 768, height: 1024, url: 'http://127.0.0.1:4174/Red-Threads/?synthetic-preview=1&screen=home' },
  { name: 'home-1280-light.png', width: 1280, height: 900, url: 'http://127.0.0.1:4174/Red-Threads/?synthetic-preview=1&screen=home&theme=light' },
];
for (const capture of captures) {
  await send('Emulation.setDeviceMetricsOverride', { width: capture.width, height: capture.height, deviceScaleFactor: 1, mobile: true });
  await send('Page.navigate', { url: capture.url });
  await new Promise((resolveDelay) => setTimeout(resolveDelay, 2600));
  const dimensions = await send('Runtime.evaluate', { expression: '`${innerWidth}x${innerHeight}`', returnByValue: true });
  if (dimensions.result?.result?.value !== `${capture.width}x${capture.height}`) throw new Error(`Viewport mismatch: ${dimensions.result?.result?.value}`);
  const overflow = await send('Runtime.evaluate', { expression: 'document.documentElement.scrollWidth > innerWidth', returnByValue: true });
  if (overflow.result?.result?.value) throw new Error(`Horizontal overflow at ${capture.width}px`);
  const shot = await send('Page.captureScreenshot', { format: 'png', fromSurface: true, captureBeyondViewport: false });
  await writeFile(resolve(output, capture.name), Buffer.from(shot.result.data, 'base64'));
}
socket.close();
await fetch(`${endpoint}/json/close/${target.id}`);
process.stdout.write(`Captured ${captures.length} synthetic mobile screens at exact CSS viewport sizes.\n`);
