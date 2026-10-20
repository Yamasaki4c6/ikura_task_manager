// 日付はすべて日本時間の YYYY-MM-DD 文字列で扱う
export function todayJST(now = new Date()): string {
  return new Date(now.getTime() + 9 * 3600_000).toISOString().slice(0, 10);
}

export function addDays(date: string, days: number): string {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export function weekday(date: string): number {
  return new Date(`${date}T00:00:00Z`).getUTCDay();
}
