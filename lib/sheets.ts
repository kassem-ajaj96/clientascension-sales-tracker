function parseCSV(text: string): string[][] {
  const rows: string[][] = [];
  let current = "";
  let inQuotes = false;
  let cells: string[] = [];

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    const next = text[i + 1];

    if (ch === '"') {
      if (inQuotes && next === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === "," && !inQuotes) {
      cells.push(current.trim());
      current = "";
    } else if ((ch === "\n" || (ch === "\r" && next === "\n")) && !inQuotes) {
      if (ch === "\r") i++;
      cells.push(current.trim());
      rows.push(cells);
      cells = [];
      current = "";
    } else {
      current += ch;
    }
  }
  if (current || cells.length) {
    cells.push(current.trim());
    rows.push(cells);
  }

  return rows.filter((r) => r.some((c) => c !== ""));
}

function parseDate(val: string): Date | null {
  if (!val?.trim()) return null;
  // YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}/.test(val)) return new Date(val);
  // DD/MM/YYYY
  const parts = val.split("/");
  if (parts.length === 3 && parts[2].length === 4) {
    return new Date(
      `${parts[2]}-${parts[1].padStart(2, "0")}-${parts[0].padStart(2, "0")}`
    );
  }
  const d = new Date(val);
  return isNaN(d.getTime()) ? null : d;
}

export async function getSheetRows(
  tabName: string,
  dateColumn: string,
  fromDate: string,
  toDate: string
): Promise<Record<string, string>[]> {
  const sheetId = process.env.GOOGLE_SHEET_ID!;
  const url = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(tabName)}`;

  const res = await fetch(url, { next: { revalidate: 0 } });
  if (!res.ok) throw new Error(`Failed to fetch sheet "${tabName}": ${res.status}`);

  const text = await res.text();
  const rows = parseCSV(text);
  if (rows.length === 0) return [];

  const headers = rows[0];
  const dataRows = rows.slice(1);

  const from = new Date(fromDate);
  const to = new Date(toDate);
  to.setHours(23, 59, 59, 999);

  return dataRows
    .map((row) => {
      const obj: Record<string, string> = {};
      headers.forEach((h, i) => {
        obj[h] = row[i] || "";
      });
      return obj;
    })
    .filter((row) => {
      const d = parseDate(row[dateColumn]);
      if (!d) return false;
      return d >= from && d <= to;
    });
}
