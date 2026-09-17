const ALIASES = {
  date: ['날짜', '판매일자', '일자', 'date'],
  product: ['상품명', '상품', '제품명', 'product', 'item'],
  quantity: ['판매수량', '수량', '판매량', 'qty', 'quantity'],
  unitPrice: ['단가', 'unitprice', 'price'],
  revenue: ['실판매금액', '매출', '판매금액', 'revenue', 'amount'],
};

export const REQUIRED_ROLES = ['date', 'product', 'quantity'];
export const ROLE_LABEL = { date: '날짜', product: '상품명', quantity: '판매수량', unitPrice: '단가', revenue: '매출' };

const normalize = value => String(value ?? '').trim().toLowerCase().replace(/\s+/g, '');

function guessColumn(headers, role) {
  const aliases = ALIASES[role].map(normalize);
  const normalizedHeaders = headers.map(normalize);
  const exact = normalizedHeaders.findIndex(header => aliases.includes(header));
  if (exact !== -1) return { index: exact, confident: true };
  const partial = normalizedHeaders.findIndex(header => aliases.some(alias => header.includes(alias) || alias.includes(header)));
  return { index: partial, confident: false };
}

export function autoDetect(headers) {
  const mapping = {};
  for (const role of Object.keys(ALIASES)) mapping[role] = guessColumn(headers, role);
  return mapping;
}

export function parseCsvText(text) {
  const lines = text.replace(/\r\n/g, '\n').trim().split('\n').filter(line => line.trim() !== '');
  if (!lines.length) return { headers: [], rows: [] };
  const headers = lines[0].split(',').map(cell => cell.trim());
  const rows = lines.slice(1).map(line => line.split(',').map(cell => cell.trim()));
  return { headers, rows };
}

export async function parseXlsxFile(file) {
  const XLSX = await import('xlsx');
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: 'array' });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const grid = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: false, defval: '' });
  const [headerRow, ...dataRows] = grid;
  const headers = (headerRow || []).map(cell => String(cell).trim());
  const rows = dataRows
    .filter(row => row.some(cell => String(cell).trim() !== ''))
    .map(row => headers.map((_, index) => String(row[index] ?? '').trim()));
  return { headers, rows };
}

export function parseFile(file) {
  const isXlsx = /\.xlsx?$/i.test(file.name);
  if (isXlsx) return parseXlsxFile(file);
  return file.text().then(parseCsvText);
}

const WEEKDAY_KO = ['일', '월', '화', '수', '목', '금', '토'];

export function unresolvedRequired(mapping) {
  return REQUIRED_ROLES.filter(role => mapping[role].index === -1);
}

export function needsConfirmation(mapping) {
  return REQUIRED_ROLES.filter(role => mapping[role].index !== -1 && !mapping[role].confident);
}

// Groups raw POS rows by product name. When no product column can be found at all
// (older single-product exports, e.g. this project's original 4-column CSV format),
// every row is attributed to `fallbackProductName` instead of blocking the upload.
export function groupByProduct(rows, mapping, fallbackProductName) {
  const groups = {};
  const hasProductColumn = mapping.product.index !== -1;
  for (const row of rows) {
    const date = row[mapping.date.index];
    const product = hasProductColumn ? row[mapping.product.index] : fallbackProductName;
    const sold = Number(row[mapping.quantity.index]);
    if (!date || !product || !Number.isFinite(sold)) continue;
    const key = product.trim();
    if (!groups[key]) groups[key] = [];
    let day = '';
    const parsedDate = new Date(`${date}T00:00:00`);
    if (!Number.isNaN(parsedDate.getTime())) day = WEEKDAY_KO[parsedDate.getDay()];
    groups[key].push({ date, day, sold, note: '업로드' });
  }
  Object.values(groups).forEach(records => records.sort((a, b) => a.date.localeCompare(b.date)));
  return groups;
}

export function summarize(groups) {
  const allDates = Object.values(groups).flat().map(record => record.date).sort();
  const totalQuantity = Object.values(groups).flat().reduce((sum, record) => sum + record.sold, 0);
  return {
    startDate: allDates[0] || null,
    endDate: allDates[allDates.length - 1] || null,
    dayCount: new Set(allDates).size,
    productCount: Object.keys(groups).length,
    totalQuantity,
  };
}
