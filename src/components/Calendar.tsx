"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { addDays, weekday } from "@/lib/dates";
import { PRIORITY_COLOR, type Item } from "./types";

const WD = "日月火水木金土";
const BEFORE = 6; // 今月より前に何か月ぶん並べるか
const AFTER = 18;
const LONG_SPAN = 7; // これより長い期間ものは、毎日ではなく始まりと終わりの日にだけ載せる

const spanDays = (it: Item) =>
  it.startDate && it.dueDate ? (Date.parse(it.dueDate) - Date.parse(it.startDate)) / 86_400_000 + 1 : 1;

// その日に載せる項目か。カレンダーに載せる指定のものだけ。期間・繰り返し（毎日／毎週X）も見る
function onDay(item: Item, day: string): "on" | "start" | "end" | null {
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

function monthOf(base: string, n: number) {
  const [y, m] = base.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1 + n, 1)).toISOString().slice(0, 7);
}

function Month({ month, today, items, byId, onSelect }: { month: string; today: string; items: Item[]; byId: Map<number, Item>; onSelect: (id: number) => void }) {
  const days = useMemo(() => {
    const first = `${month}-01`;
    const start = addDays(first, -weekday(first));
    return Array.from({ length: 42 }, (_, i) => addDays(start, i));
  }, [month]);

  return (
    <div className="grid h-full snap-start snap-always grid-cols-7 grid-rows-6" data-month={month}>
      {days.map((day) => {
        // 子は親と同じ日なら親だけ載せる
        const list = items
          .map((it) => ({ it, mark: onDay(it, day) }))
          .filter(({ it, mark }) => mark && !(it.parentId && byId.get(it.parentId) && onDay(byId.get(it.parentId)!, day)));
        const inMonth = day.startsWith(month);
        return (
          <div key={day} className={`min-h-0 overflow-hidden border-t border-l border-neutral-200 p-0.5 dark:border-neutral-800 ${inMonth ? "" : "opacity-30"}`}>
            <div className={`text-xs ${day === today ? "inline-block rounded-full bg-neutral-900 px-1.5 text-white dark:bg-neutral-100 dark:text-neutral-900" : ""}`}>
              {Number(day.slice(8))}
            </div>
            {list.slice(0, 3).map(({ it, mark }) => (
              <button
                key={it.id}
                onClick={() => onSelect(it.id)}
                className={`mt-0.5 block w-full truncate rounded px-0.5 text-left text-[10px] leading-4 text-white md:text-[11px] ${PRIORITY_COLOR[it.priority]}`}
                title={it.title}
              >
                {mark === "start" && "▶"}
                {mark === "end" && "〆"}
                {it.title}
              </button>
            ))}
            {list.length > 3 && <div className="text-[10px] text-neutral-500">+{list.length - 3}</div>}
          </div>
        );
      })}
    </div>
  );
}

// 月を縦に並べ、縦スクロールで月から月へ吸い付くように移る
export function Calendar({ items, today, onSelect }: { items: Item[]; today: string; onSelect: (id: number) => void }) {
  const thisMonth = today.slice(0, 7);
  const months = useMemo(() => Array.from({ length: BEFORE + AFTER + 1 }, (_, i) => monthOf(thisMonth, i - BEFORE)), [thisMonth]);
  const [index, setIndex] = useState(BEFORE);
  const scroller = useRef<HTMLDivElement>(null);
  const byId = useMemo(() => new Map(items.map((i) => [i.id, i])), [items]);
  const shown = useMemo(() => items.filter((i) => i.onCalendar && i.status !== "完了"), [items]);

  const go = (i: number, smooth = true) => {
    const el = scroller.current;
    if (!el) return;
    el.scrollTo({ top: Math.max(0, Math.min(months.length - 1, i)) * el.clientHeight, behavior: smooth ? "smooth" : "instant" });
  };

  useEffect(() => {
    go(BEFORE, false);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- 初回だけ今月に合わせる
  }, []);

  const month = months[index];
  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2 border-b border-neutral-200 px-3 py-2 dark:border-neutral-800">
        <button onClick={() => go(index - 1)} className="px-2" aria-label="前の月">‹</button>
        <h2 className="font-bold tabular-nums">{month.replace("-", "年")}月</h2>
        <button onClick={() => go(index + 1)} className="px-2" aria-label="次の月">›</button>
        <button onClick={() => go(BEFORE)} className="ml-auto text-sm text-neutral-500">今日</button>
      </div>
      <div className="grid grid-cols-7 text-center text-xs text-neutral-500">
        {[...WD].map((w) => <div key={w} className="py-1">{w}</div>)}
      </div>
      <div
        ref={scroller}
        onScroll={(e) => setIndex(Math.round(e.currentTarget.scrollTop / e.currentTarget.clientHeight))}
        className="min-h-0 flex-1 snap-y snap-mandatory overflow-y-auto overscroll-contain [scrollbar-width:none]"
      >
        {months.map((m) => (
          <Month key={m} month={m} today={today} items={shown} byId={byId} onSelect={onSelect} />
        ))}
      </div>
    </div>
  );
}
