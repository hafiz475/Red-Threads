export async function promptHidden(label: string): Promise<string> {
  if (!process.stdin.isTTY || !process.stdout.isTTY) throw new Error('A private interactive terminal is required.');
  process.stdout.write(label);
  process.stdin.setRawMode(true);
  process.stdin.resume();
  process.stdin.setEncoding('utf8');
  return new Promise((resolve, reject) => {
    let value = '';
    const cleanup = () => {
      process.stdin.setRawMode(false);
      process.stdin.pause();
      process.stdin.removeListener('data', onData);
      process.stdout.write('\n');
    };
    const onData = (key: string) => {
      if (key === '\u0003') {
        cleanup();
        reject(new Error('Cancelled.'));
      } else if (key === '\r' || key === '\n') {
        cleanup();
        resolve(value);
      } else if (key === '\u007f' || key === '\b') {
        if (value) {
          value = value.slice(0, -1);
          process.stdout.write('\b \b');
        }
      } else if (/^[0-9]$/.test(key) && value.length < 8) {
        value += key;
        process.stdout.write('•');
      }
    };
    process.stdin.on('data', onData);
  });
}

export async function promptVisible(label: string): Promise<string> {
  if (!process.stdin.isTTY || !process.stdout.isTTY) throw new Error('An interactive terminal is required.');
  process.stdout.write(label);
  process.stdin.resume();
  process.stdin.setEncoding('utf8');
  return new Promise((resolve) => {
    const onData = (data: string) => {
      process.stdin.pause();
      process.stdin.removeListener('data', onData);
      resolve(data.trim());
    };
    process.stdin.on('data', onData);
  });
}

