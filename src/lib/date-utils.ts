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
