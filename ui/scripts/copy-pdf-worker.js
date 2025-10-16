// Copy pdf.js worker to public for reliable loading without external network
const fs = require('fs');
const path = require('path');

const src = path.resolve(__dirname, '..', 'node_modules', 'pdfjs-dist', 'build', 'pdf.worker.min.js');
const dest = path.resolve(__dirname, '..', 'public', 'pdf.worker.min.js');

fs.mkdirSync(path.dirname(dest), { recursive: true });

if (!fs.existsSync(src)) {
  console.error('pdf.worker.min.js not found at', src);
  process.exit(1);
}

fs.copyFileSync(src, dest);
console.log('Copied pdf.worker.min.js to', dest);

