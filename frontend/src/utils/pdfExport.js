/**
 * pdfExport.js — Generic PDF/CSV export utility used by tenant/admin pages.
 *
 * This module is intentionally lightweight: it builds a printable HTML
 * document on-the-fly and opens it in a new window, then triggers the
 * browser's native print/save-as-PDF dialog. No extra dependencies needed.
 *
 * Also exports CSV helpers for download.
 */

/**
 * Format a number as currency string.
 */
function fmtAmount(v, currency = 'SRD') {
  const n = Number(v || 0);
  return `${currency} ${n.toLocaleString('nl-NL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function fmtDate(d) {
  if (!d) return '—';
  try {
    return new Date(d).toLocaleDateString('nl-NL', {
      day: '2-digit', month: 'long', year: 'numeric',
    });
  } catch {
    return String(d);
  }
}

/**
 * Build a CSS-styled HTML string for a payments table.
 */
function buildHTML({ title = 'Rapport', subtitle = '', rows = [], columns = [], footer = '' } = {}) {
  const head = columns.map((c) => `<th>${c.label}</th>`).join('');
  const body = rows
    .map(
      (r) =>
        `<tr>${columns
          .map((c) => `<td>${c.format ? c.format(r[c.key], r) : (r[c.key] ?? '')}</td>`)
          .join('')}</tr>`
    )
    .join('');
  return `<!DOCTYPE html>
<html lang="nl">
<head>
<meta charset="utf-8" />
<title>${title}</title>
<style>
  * { box-sizing: border-box; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 24px; color: #1e293b; }
  h1 { font-size: 20px; margin: 0 0 4px; }
  .subtitle { color: #64748b; font-size: 13px; margin-bottom: 18px; }
  table { width: 100%; border-collapse: collapse; font-size: 12px; }
  th { text-align: left; background: #f1f5f9; padding: 8px 10px; border-bottom: 1px solid #cbd5e1; font-weight: 600; }
  td { padding: 8px 10px; border-bottom: 1px solid #e2e8f0; }
  tr:nth-child(even) td { background: #f8fafc; }
  .footer { margin-top: 18px; font-size: 11px; color: #64748b; }
  @media print { body { padding: 0; } }
</style>
</head>
<body>
  <h1>${title}</h1>
  ${subtitle ? `<div class="subtitle">${subtitle}</div>` : ''}
  <table>
    <thead><tr>${head}</tr></thead>
    <tbody>${body || '<tr><td colspan="99">Geen records.</td></tr>'}</tbody>
  </table>
  ${footer ? `<div class="footer">${footer}</div>` : ''}
  <script>window.addEventListener('load', () => setTimeout(() => window.print(), 250));</script>
</body>
</html>`;
}

/**
 * Open a print-ready PDF view in a new window.
 */
export function exportToPDF(options) {
  const html = buildHTML(options);
  const w = window.open('', '_blank', 'noopener,noreferrer,width=900,height=700');
  if (!w) {
    // Popup blocked — fallback to data URL
    const url = `data:text/html;charset=utf-8,${encodeURIComponent(html)}`;
    window.location.href = url;
    return false;
  }
  w.document.open();
  w.document.write(html);
  w.document.close();
  return true;
}

// Aliases used by other components
export const generatePDF = exportToPDF;
export const printAsPDF = exportToPDF;
export const downloadPDF = exportToPDF;

/**
 * Convert array-of-objects to CSV string.
 */
export function toCSV(rows, columns) {
  if (!rows || !rows.length) return '';
  const esc = (v) => {
    if (v === null || v === undefined) return '';
    const s = String(v).replace(/"/g, '""');
    return /[",\n;]/.test(s) ? `"${s}"` : s;
  };
  const header = columns.map((c) => esc(c.label)).join(',');
  const body = rows
    .map((r) => columns.map((c) => esc(c.format ? c.format(r[c.key], r) : r[c.key])).join(','))
    .join('\n');
  return `${header}\n${body}`;
}

/**
 * Trigger a CSV file download.
 */
export function exportToCSV({ filename = 'export.csv', rows = [], columns = [] } = {}) {
  const csv = toCSV(rows, columns);
  const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export const downloadCSV = exportToCSV;
export const generateCSV = exportToCSV;

// Format helpers re-exported in case callers want them
export { fmtAmount, fmtDate };

const pdfExport = {
  exportToPDF,
  generatePDF,
  printAsPDF,
  downloadPDF,
  exportToCSV,
  downloadCSV,
  generateCSV,
  toCSV,
  fmtAmount,
  fmtDate,
};

export default pdfExport;
