import { mkdir, copyFile } from 'node:fs/promises';
import { dirname } from 'node:path';

const files = [
  ['node_modules/html2canvas/dist/html2canvas.min.js', 'libs/html2canvas.min.js'],
  ['node_modules/jspdf/dist/jspdf.umd.min.js', 'libs/jspdf.umd.min.js']
];
for (const [from, to] of files) {
  await mkdir(dirname(to), { recursive: true });
  await copyFile(from, to);
}
console.log('Bibliotecas locais de PDF copiadas para libs/.');
