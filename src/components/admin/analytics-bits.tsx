// ============================================================================
// Analytics helpers — date-range presets, number formatting and client-side
// CSV / XLSX exports. Kept out of the route file to keep it readable. These run
// only in the browser (export uses SheetJS, loaded lazily).
// ============================================================================

export type DatePresetKey =
  | "today"
  | "yesterday"
  | "7d"
  | "30d"
  | "90d"
  | "this_month"
  | "last_month"
  | "this_year"
  | "custom";

export type Range = { start: string; end: string };

function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}
function endOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
}

export const DATE_PRESETS: { key: DatePresetKey; label: string }[] = [
  { key: "today", label: "Today" },
  { key: "yesterday", label: "Yesterday" },
  { key: "7d", label: "Last 7 days" },
  { key: "30d", label: "Last 30 days" },
  { key: "90d", label: "Last 90 days" },
  { key: "this_month", label: "This month" },
  { key: "last_month", label: "Last month" },
  { key: "this_year", label: "This year" },
  { key: "custom", label: "Custom" },
];

export function rangeForPreset(key: DatePresetKey, custom?: { from?: string; to?: string }): Range {
  const now = new Date();
  switch (key) {
    case "today":
      return { start: startOfDay(now).toISOString(), end: endOfDay(now).toISOString() };
    case "yesterday": {
      const y = new Date(now);
      y.setDate(y.getDate() - 1);
      return { start: startOfDay(y).toISOString(), end: endOfDay(y).toISOString() };
    }
    case "7d":
      return { start: startOfDay(new Date(now.getTime() - 6 * 864e5)).toISOString(), end: endOfDay(now).toISOString() };
    case "30d":
      return { start: startOfDay(new Date(now.getTime() - 29 * 864e5)).toISOString(), end: endOfDay(now).toISOString() };
    case "90d":
      return { start: startOfDay(new Date(now.getTime() - 89 * 864e5)).toISOString(), end: endOfDay(now).toISOString() };
    case "this_month":
      return { start: new Date(now.getFullYear(), now.getMonth(), 1).toISOString(), end: endOfDay(now).toISOString() };
    case "last_month": {
      const s = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const e = new Date(now.getFullYear(), now.getMonth(), 0);
      return { start: s.toISOString(), end: endOfDay(e).toISOString() };
    }
    case "this_year":
      return { start: new Date(now.getFullYear(), 0, 1).toISOString(), end: endOfDay(now).toISOString() };
    case "custom": {
      const from = custom?.from ? startOfDay(new Date(custom.from)) : new Date(now.getTime() - 29 * 864e5);
      const to = custom?.to ? endOfDay(new Date(custom.to)) : now;
      return { start: from.toISOString(), end: to.toISOString() };
    }
    default:
      return { start: startOfDay(new Date(now.getTime() - 29 * 864e5)).toISOString(), end: endOfDay(now).toISOString() };
  }
}

export function fmt(n: number | null | undefined): string {
  if (n == null || Number.isNaN(n)) return "0";
  return n.toLocaleString();
}

export function fmtRangeLabel(r: Range): string {
  const s = new Date(r.start);
  const e = new Date(r.end);
  const opt: Intl.DateTimeFormatOptions = { month: "short", day: "numeric", year: "numeric" };
  return `${s.toLocaleDateString(undefined, opt)} – ${e.toLocaleDateString(undefined, opt)}`;
}

// ----------------------------------------------------------------- exports
function download(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function exportCSV(filename: string, rows: Record<string, unknown>[]) {
  if (rows.length === 0) {
    download(new Blob([""], { type: "text/csv" }), filename);
    return;
  }
  const headers = Object.keys(rows[0]);
  const escape = (v: unknown) => {
    const s = v == null ? "" : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const csv = [headers.join(","), ...rows.map((r) => headers.map((h) => escape(r[h])).join(","))].join("\n");
  download(new Blob([csv], { type: "text/csv;charset=utf-8" }), filename);
}

export async function exportXLSX(filename: string, sheets: { name: string; rows: Record<string, unknown>[] }[]) {
  const XLSX = await import("xlsx");
  const wb = XLSX.utils.book_new();
  for (const s of sheets) {
    const ws = XLSX.utils.json_to_sheet(s.rows.length ? s.rows : [{}]);
    XLSX.utils.book_append_sheet(wb, ws, s.name.slice(0, 31));
  }
  XLSX.writeFile(wb, filename);
}
