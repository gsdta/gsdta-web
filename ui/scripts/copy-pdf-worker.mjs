// Copy pdf.js worker to public for reliable loading without external network (ESM)
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Try local node_modules first, then hoisted root node_modules (pnpm)
const localSrc = path.resolve(__dirname, "..", "node_modules", "pdfjs-dist", "build", "pdf.worker.min.js");
const hoistedSrc = path.resolve(__dirname, "..", "..", "node_modules", "pdfjs-dist", "build", "pdf.worker.min.js");
const src = fs.existsSync(localSrc) ? localSrc : hoistedSrc;
const dest = path.resolve(__dirname, "..", "public", "pdf.worker.min.js");

fs.mkdirSync(path.dirname(dest), { recursive: true });

if (!fs.existsSync(src)) {
  console.error("pdf.worker.min.js not found at", localSrc, "or", hoistedSrc);
  process.exit(1);
}

fs.copyFileSync(src, dest);
console.log("Copied pdf.worker.min.js to", dest);

