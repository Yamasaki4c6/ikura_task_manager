import { weekday } from "@/lib/dates";
import type { Item } from "./types";

export const WD = "日月火水木金土";
const LONG_SPAN = 7; // これより長い期間ものは、毎日ではなく始まりと終わりの日にだけ載せる

const spanDays = (it: Item) =>
  it.startDate && it.dueDate ? (Date.parse(it.dueDate) - Date.parse(it.startDate)) / 86_400_000 + 1 : 1;

// その日に載せる項目か。カレンダーに載せる指定のものだけ。期間・繰り返し（毎日／毎週X）も見る
export function onDay(item: Item, day: string): "on" | "start" | "end" | null {
  if (!item.onCalendar || item.status === "完了") return null;
  const r = item.recurrence;
  if (r) {
    if (item.startDate && day < item.startDate) return null;
    if (item.dueDate && day > item.dueDate) return null;
    if (r.includes("毎日")) return "on";
    const m = r.match(/毎週([日月火水木金土]+)/);
    if (m) return m[1].includes(WD[weekday(day)]) ? "on" : null;
  }
  if (item.startDate && item.dueDate && item.startDate !== item.dueDate) {
    if (day < item.startDate || day > item.dueDate) return null;
    if (spanDays(item) <= LONG_SPAN) return "on";
    return day === item.startDate ? "start" : day === item.dueDate ? "end" : null;
  }
  return (item.dueDate ?? item.startDate) === day ? "on" : null;
}

