import { readFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';

const path = join(resolve(process.cwd()), '.private', 'archive-audit.private.json');
readFile(path, 'utf8').then((value) => {
  const audit = JSON.parse(value) as Record<string, number | string>;
  process.stdout.write('Private encrypted-archive audit (counts only):\n');
  for (const [key, count] of Object.entries(audit)) process.stdout.write(`${key}: ${typeof count === 'number' ? count : '[private]'}\n`);
}).catch(() => { process.stderr.write('No private audit exists yet. Run the local WhatsApp importer first.\n'); process.exitCode = 1; });

