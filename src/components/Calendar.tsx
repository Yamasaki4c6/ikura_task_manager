"use client";
import { useMemo, useState } from "react";
import { addDays, weekday } from "@/lib/dates";
import { PRIORITY_COLOR, type Item } from "./types";

const WD = "日月火水木金土";

// その日に載せる項目か。期間・繰り返し（毎日／毎週X）も見る
function onDay(item: Item, day: string) {
  if (item.status === "完了") return false;
  const r = item.recurrence;
  if (r) {
    if (item.startDate && day < item.startDate) return false;
    if (item.dueDate && day > item.dueDate) return false;
    if (r.includes("毎日")) return true;
    const m = r.match(/毎週([日月火水木金土]+)/);
    if (m) return m[1].includes(WD[weekday(day)]);
  }
  if (item.startDate && item.dueDate) return day >= item.startDate && day <= item.dueDate;
  return (item.dueDate ?? item.startDate) === day;
}

const isSpan = (it: Item) => Boolean(it.startDate && it.dueDate && it.startDate !== it.dueDate && !it.recurrence);

export function Calendar({ items, today, onSelect }: { items: Item[]; today: string; onSelect: (id: number) => void }) {
  const [month, setMonth] = useState(today.slice(0, 7));
  const byId = useMemo(() => new Map(items.map((i) => [i.id, i])), [items]);

  const days = useMemo(() => {
    const first = `${month}-01`;
    const start = addDays(first, -weekday(first));
    return Array.from({ length: 42 }, (_, i) => addDays(start, i));
  }, [month]);

  const shift = (n: number) => {
    const [y, m] = month.split("-").map(Number);
    const d = new Date(Date.UTC(y, m - 1 + n, 1));
    setMonth(d.toISOString().slice(0, 7));
  };

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2 border-b border-neutral-200 px-3 py-2 dark:border-neutral-800">
        <button onClick={() => shift(-1)} className="px-2" aria-label="前の月">‹</button>
        <h2 className="font-bold">{month.replace("-", "年")}月</h2>
        <button onClick={() => shift(1)} className="px-2" aria-label="次の月">›</button>
        <button onClick={() => setMonth(today.slice(0, 7))} className="ml-auto text-sm text-neutral-500">今日</button>
      </div>
      <div className="grid grid-cols-7 text-center text-xs text-neutral-500">
        {[...WD].map((w) => <div key={w} className="py-1">{w}</div>)}
      </div>
      <div className="grid flex-1 grid-cols-7 grid-rows-6 overflow-hidden">
        {days.map((day) => {
          // 期間ものは後ろに薄く。子は親と同じ日なら親だけ載せる
          const list = items
            .filter((it) => onDay(it, day) && !(it.parentId && byId.get(it.parentId) && onDay(byId.get(it.parentId)!, day)))
            .sort((a, b) => Number(isSpan(a)) - Number(isSpan(b)));
          const inMonth = day.startsWith(month);
          return (
            <div
              key={day}
              className={`min-h-0 overflow-hidden border-t border-l border-neutral-200 p-1 dark:border-neutral-800 ${inMonth ? "" : "opacity-40"}`}
            >
              <div className={`text-xs ${day === today ? "inline-block rounded-full bg-neutral-900 px-1.5 text-white dark:bg-neutral-100 dark:text-neutral-900" : ""}`}>
                {Number(day.slice(8))}
              </div>
              {list.slice(0, 3).map((it) => (
                <button
                  key={it.id}
                  onClick={() => onSelect(it.id)}
                  className={`mt-0.5 block w-full truncate rounded px-1 text-left text-[11px] text-white ${PRIORITY_COLOR[it.priority]} ${isSpan(it) ? "opacity-50" : ""}`}
                  title={it.title}
                >
                  {it.title}
                </button>
              ))}
              {list.length > 3 && <div className="text-[10px] text-neutral-500">+{list.length - 3}</div>}
            </div>
          );
        })}
      </div>
    </div>
  );
}
