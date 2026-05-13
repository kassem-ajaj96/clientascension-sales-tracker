import { google } from "googleapis";

function getAuth() {
  const json = Buffer.from(
    process.env.GOOGLE_SERVICE_ACCOUNT_JSON!,
    "base64"
  ).toString("utf-8");
  const credentials = JSON.parse(json);
  return new google.auth.GoogleAuth({
    credentials,
    scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
  });
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
  const auth = getAuth();
  const sheets = google.sheets({ version: "v4", auth });

  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: process.env.GOOGLE_SHEET_ID!,
    range: tabName,
  });

  const rows = response.data.values || [];
  if (rows.length === 0) return [];

  const headers = rows[0] as string[];
  const dataRows = rows.slice(1);

  const from = new Date(fromDate);
  const to = new Date(toDate);
  to.setHours(23, 59, 59, 999);

  return dataRows
    .map((row) => {
      const obj: Record<string, string> = {};
      headers.forEach((h, i) => {
        obj[h] = (row[i] as string) || "";
      });
      return obj;
    })
    .filter((row) => {
      const d = parseDate(row[dateColumn]);
      if (!d) return false;
      return d >= from && d <= to;
    });
}
