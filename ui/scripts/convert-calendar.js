/* eslint-env node */
/* eslint-disable @typescript-eslint/no-require-imports */
const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

// Helper: Excel serial date -> YYYY-MM-DD
function excelSerialToISO(serial) {
  if (typeof serial !== 'number') return null;
  const excelEpoch = new Date(1899, 11, 30);
  const d = new Date(excelEpoch.getTime() + serial * 24 * 60 * 60 * 1000);
  return d.toISOString().split('T')[0];
}

function parseDateCell(cell) {
  if (cell == null) return null;
  if (typeof cell === 'number') return excelSerialToISO(cell);
  // Try parse string dates flexibly (YYYY-MM-DD or MM/DD/YYYY)
  const s = String(cell).trim();
  if (!s) return null;
  // If already ISO-like
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  const d = new Date(s);
  if (!isNaN(d.getTime())) return d.toISOString().split('T')[0];
  return null;
}

function normHeader(x) {
  return String(x || '')
    .replace(/\n/g, ' ')
    .replace(/\r/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

function writeJSON(rel, data) {
  const out = path.join(__dirname, rel);
  fs.writeFileSync(out, JSON.stringify(data, null, 2));
  console.log(`Wrote ${rel} (${Array.isArray(data.events) ? data.events.length : 0} rows)`);
}

// Read the Excel file (Sheet 1 only)
let excelPath = path.join(__dirname, '../public/docs/GSDTA.xlsx');
if (!fs.existsSync(excelPath)) {
  // Fallback to the known file in repo
  const fallback = path.join(__dirname, '../public/docs/GSDTA Calendar-2025-26.xlsx');
  if (fs.existsSync(fallback)) {
    excelPath = fallback;
    console.log(`Primary Excel not found. Using fallback: ${path.basename(fallback)}`);
  } else {
    console.error('Excel file not found: expected GSDTA.xlsx or GSDTA Calendar-2025-26.xlsx');
    process.exit(1);
  }
}
const workbook = XLSX.readFile(excelPath);
const sheetName = workbook.SheetNames[0];
const worksheet = workbook.Sheets[sheetName];
const raw = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

if (!raw || raw.length === 0) {
  console.error('No data found in sheet.');
  process.exit(1);
}

// Find header row (first row containing at least one of our keywords)
let headerRowIdx = 0;
let headers = raw[0];
const wantedKeys = ['trimester', 'semester', 'sdusd', 'pusd', 'india', 'holiday', 'long', 'weekend', 'gsdta', 'date'];
for (let i = 0; i < Math.min(raw.length, 5); i++) {
  const row = raw[i] || [];
  const hit = row.some(cell => wantedKeys.some(k => normHeader(cell).includes(k)));
  if (hit) {
    headerRowIdx = i;
    headers = row;
    break;
  }
}

// Build column index map
let dateCol = -1;
let trimesterCol = -1;
let semesterCol = -1;
let sdusdCol = -1;
let pusdCol = -1;
let indiaCol = -1;
let weekendCol = -1;
let gsdtaDateCol = -1;
let gsdtaEventCol = -1;

headers.forEach((h, idx) => {
  const hh = normHeader(h);
  if (dateCol === -1 && (hh.includes('date') || hh === 'date')) dateCol = idx;
  if (trimesterCol === -1 && hh.includes('trimester')) trimesterCol = idx;
  if (semesterCol === -1 && hh.includes('semester')) semesterCol = idx;
  if (sdusdCol === -1 && hh.includes('sdusd')) sdusdCol = idx;
  if (pusdCol === -1 && hh.includes('pusd')) pusdCol = idx;
  if (indiaCol === -1 && (hh.includes('india') && hh.includes('holiday'))) indiaCol = idx;
  if (weekendCol === -1 && (hh.includes('long') && hh.includes('weekend'))) weekendCol = idx;
  if (gsdtaDateCol === -1 && (hh.includes('gsdta') && hh.includes('date'))) gsdtaDateCol = idx;
  if (gsdtaEventCol === -1 && (hh.includes('gsdta') && (hh.includes('event') || hh.includes('desc') || hh.includes('description')))) gsdtaEventCol = idx;
});

// Reasonable defaults if date column not labeled
if (dateCol === -1) dateCol = 0;

// If GSDTA columns not found by header, default to I-J (index 8, 9) if available
if (gsdtaDateCol === -1 && headers.length > 8) gsdtaDateCol = 8;
if (gsdtaEventCol === -1 && headers.length > 9) gsdtaEventCol = 9;

// Containers for per-column outputs
const outTrimester = [];
const outSemester = [];
const outSDUSD = [];
const outPUSD = [];
const outIndia = [];
const outWeekend = [];
const outGSDTA = [];

// Combined events keyed by date
const map = new Map(); // date -> event

function upsert(dateISO) {
  if (!dateISO) return null;
  if (!map.has(dateISO)) {
    map.set(dateISO, {
      week: null,
      trimester: null,
      semester: null,
      date: dateISO,
      sdusd: null,
      pusd: null,
      indiaHolidays: null,
      longWeekend: null,
      gsdtaDates: null,
      gsdtaEvents: null,
    });
  }
  return map.get(dateISO);
}

// Iterate data rows
for (let r = headerRowIdx + 1; r < raw.length; r++) {
  const row = raw[r] || [];
  const dateISO = parseDateCell(row[dateCol]);
  // Per-date columns
  if (trimesterCol !== -1) {
    const v = row[trimesterCol];
    if (v) {
      const d = upsert(dateISO);
      if (d) d.trimester = String(v);
      if (dateISO) outTrimester.push({ date: dateISO, trimester: String(v) });
    }
  }
  if (semesterCol !== -1) {
    const v = row[semesterCol];
    if (v) {
      const d = upsert(dateISO);
      if (d) d.semester = String(v);
      if (dateISO) outSemester.push({ date: dateISO, semester: String(v) });
    }
  }
  if (sdusdCol !== -1) {
    const v = row[sdusdCol];
    if (v) {
      const d = upsert(dateISO);
      if (d) d.sdusd = String(v);
      if (dateISO) outSDUSD.push({ date: dateISO, sdusd: String(v) });
    }
  }
  if (pusdCol !== -1) {
    const v = row[pusdCol];
    if (v) {
      const d = upsert(dateISO);
      if (d) d.pusd = String(v);
      if (dateISO) outPUSD.push({ date: dateISO, pusd: String(v) });
    }
  }
  if (indiaCol !== -1) {
    const v = row[indiaCol];
    if (v) {
      const d = upsert(dateISO);
      if (d) d.indiaHolidays = String(v);
      if (dateISO) outIndia.push({ date: dateISO, indiaHolidays: String(v) });
    }
  }
  if (weekendCol !== -1) {
    const v = row[weekendCol];
    if (v) {
      const d = upsert(dateISO);
      if (d) d.longWeekend = String(v);
      if (dateISO) outWeekend.push({ date: dateISO, longWeekend: String(v) });
    }
  }
  // GSDTA events (columns i-j), can be independent of the row date
  if (gsdtaDateCol !== -1 || gsdtaEventCol !== -1) {
    const gd = parseDateCell(row[gsdtaDateCol]);
    const ge = row[gsdtaEventCol] ? String(row[gsdtaEventCol]) : null;
    if (gd && ge) {
      const d = upsert(gd);
      if (d) {
        d.gsdtaDates = gd;
        d.gsdtaEvents = ge;
      }
      outGSDTA.push({ date: gd, gsdtaDates: gd, gsdtaEvents: ge });
    }
  }
}

// Prepare combined events sorted
const combinedEvents = Array.from(map.values()).sort((a, b) => a.date.localeCompare(b.date));

// Write per-column JSONs
writeJSON('../src/data/calendar-trimester.json', { events: outTrimester });
writeJSON('../src/data/calendar-semester.json', { events: outSemester });
writeJSON('../src/data/calendar-sdusd.json', { events: outSDUSD });
writeJSON('../src/data/calendar-pusd.json', { events: outPUSD });
writeJSON('../src/data/calendar-india-holidays.json', { events: outIndia });
writeJSON('../src/data/calendar-long-weekend.json', { events: outWeekend });
writeJSON('../src/data/calendar-gsdta-events.json', { events: outGSDTA });

// Write combined JSON
writeJSON('../src/data/calendar.json', { events: combinedEvents });

// Maintain split files for current calendar page
const kg1Events = combinedEvents.map(e => ({ ...e, semester: null }));
const grades2to8Events = combinedEvents.map(e => ({ ...e, trimester: null }));
writeJSON('../src/data/calendar-kg1.json', { events: kg1Events });
writeJSON('../src/data/calendar-grades2to8.json', { events: grades2to8Events });

console.log('Calendar data conversion complete.');
