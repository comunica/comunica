import fs from 'fs';
import path from 'path';

const dir = path.join(process.cwd(), 'packages');

for (const file of fs.readdirSync(path.join(process.cwd(), 'packages'), { recursive: true })) {
    if (typeof file === 'string' && file.endsWith('.ts') && !file.endsWith('.d.ts')) {
        const fileLocation = path.join(dir, file);
        fs.copyFileSync(fileLocation, fileLocation.replace(/\.ts$/, '.mts'));
        fs.copyFileSync(fileLocation, fileLocation.replace(/\.ts$/, '.cts'));
    }
}
