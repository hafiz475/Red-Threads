import yauzl, { type Entry, type ZipFile } from 'yauzl';

export function openZip(path: string): Promise<ZipFile> {
  return new Promise((resolve, reject) => {
    yauzl.open(path, { lazyEntries: true, autoClose: false }, (error, zip) => error ? reject(error) : resolve(zip!));
  });
}

export function listEntries(zip: ZipFile): Promise<Entry[]> {
  return new Promise((resolve, reject) => {
    const entries: Entry[] = [];
    zip.on('entry', (entry: Entry) => {
      entries.push(entry);
      zip.readEntry();
    });
    zip.once('end', () => resolve(entries));
    zip.once('error', reject);
    zip.readEntry();
  });
}

export function entryStream(zip: ZipFile, entry: Entry): Promise<NodeJS.ReadableStream> {
  return new Promise((resolve, reject) => zip.openReadStream(entry, (error, stream) => error ? reject(error) : resolve(stream!)));
}

export async function readEntry(zip: ZipFile, entry: Entry, maxBytes: number): Promise<Buffer> {
  if (entry.uncompressedSize > maxBytes) throw new Error('Archive entry exceeds the allowed transcript size.');
  const stream = await entryStream(zip, entry);
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of stream) {
    const buffer = Buffer.from(chunk);
    size += buffer.length;
    if (size > maxBytes) throw new Error('Archive entry exceeded the allowed transcript size while reading.');
    chunks.push(buffer);
  }
  return Buffer.concat(chunks);
}

