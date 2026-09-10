// Genesoft Infotech CRM - Dynamic Month & Date Utilities

export function getCurrentMonthKey(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

export function formatMonthLabel(monthKey?: string | null): string {
  if (!monthKey || monthKey === "ALL") return "All Time (Lifetime)";
  const parts = monthKey.split("-");
  if (parts.length !== 2) return monthKey;
  const year = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10);
  if (isNaN(year) || isNaN(month) || month < 1 || month > 12) return monthKey;

  const date = new Date(Date.UTC(year, month - 1, 1));
  return date.toLocaleDateString("en-US", { month: "long", year: "numeric", timeZone: "UTC" });
}

export function parseMonthDateRange(
  monthKey?: string | null
): { start: Date; end: Date; label: string; daysInMonth: number } | null {
  if (!monthKey || monthKey === "ALL") return null;
  const parts = monthKey.split("-");
  if (parts.length !== 2) return null;
  const year = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10);
  if (isNaN(year) || isNaN(month) || month < 1 || month > 12) return null;

  const start = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0, 0));
  // Last day of month
  const end = new Date(Date.UTC(year, month, 0, 23, 59, 59, 999));
  const daysInMonth = new Date(year, month, 0).getDate();
  const label = formatMonthLabel(monthKey);

  return { start, end, label, daysInMonth };
}

export function getDefaultAvailableMonths(): Array<{ value: string; label: string }> {
  const current = getCurrentMonthKey();
  const now = new Date();
  const map = new Map<string, string>();

  // Always include current active month
  map.set(current, `${formatMonthLabel(current)} (Current Active)`);

  // Always include August 2026 baseline
  if (current !== "2026-08") {
    map.set("2026-08", "August 2026 (Aug.xlsx Imported)");
  }

  // Include past 3 months
  for (let i = 1; i <= 3; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const key = `${y}-${m}`;
    if (!map.has(key)) {
      map.set(key, formatMonthLabel(key));
    }
  }

  // Sort descending
  const sortedKeys = Array.from(map.keys()).sort().reverse();
  const list = sortedKeys.map((k) => ({
    value: k,
    label: map.get(k) || formatMonthLabel(k),
  }));

  list.push({ value: "ALL", label: "All Months (Lifetime)" });
  return list;
}

export function numberToWordsINR(num: number): string {
  if (isNaN(num) || num <= 0) return "Zero Rupees Only";
  const whole = Math.floor(num);

  const units = [
    "", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine",
    "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"
  ];
  const tens = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

  function convertTwoDigits(n: number): string {
    if (n === 0) return "";
    if (n < 20) return units[n];
    const t = Math.floor(n / 10);
    const u = n % 10;
    return tens[t] + (u > 0 ? "-" + units[u] : "");
  }

  function convertThreeDigits(n: number): string {
    const h = Math.floor(n / 100);
    const rem = n % 100;
    let res = "";
    if (h > 0) res += units[h] + " Hundred";
    if (rem > 0) {
      if (res !== "") res += " and ";
      res += convertTwoDigits(rem);
    }
    return res;
  }

  const crores = Math.floor(whole / 10000000);
  const lakhs = Math.floor((whole % 10000000) / 100000);
  const thousands = Math.floor((whole % 100000) / 1000);
  const hundreds = whole % 1000;

  const parts: string[] = [];
  if (crores > 0) parts.push(convertTwoDigits(crores) + " Crore");
  if (lakhs > 0) parts.push(convertTwoDigits(lakhs) + " Lakh");
  if (thousands > 0) parts.push(convertTwoDigits(thousands) + " Thousand");
  if (hundreds > 0) parts.push(convertThreeDigits(hundreds));

  return parts.join(" ") + " Rupees Only";
}

