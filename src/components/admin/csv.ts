// Tiny CSV-export helper. No deps — the rows are already in memory by
// the time the export button renders, so we just stringify and trigger
// a browser download. RFC 4180-style escaping (quote fields containing
// commas / quotes / newlines; double-up embedded quotes).

export function downloadCsv(opts: {
  filename: string;
  columns: string[];
  rows: Array<Array<string | number | null | undefined>>;
}): void {
  const { filename, columns, rows } = opts;
  const escape = (v: string | number | null | undefined): string => {
    if (v === null || v === undefined) return "";
    const s = String(v);
    if (/[",\n\r]/.test(s)) {
      return `"${s.replace(/"/g, '""')}"`;
    }
    return s;
  };
  const body = [
    columns.map(escape).join(","),
    ...rows.map((r) => r.map(escape).join(",")),
  ].join("\n");
  const blob = new Blob([body], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
