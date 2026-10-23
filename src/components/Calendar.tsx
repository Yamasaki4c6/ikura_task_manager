"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { addDays, weekday } from "@/lib/dates";
import { onDay, WD } from "./days";
import { PRIORITY_COLOR, type Item } from "./types";

const WEEKS_BEFORE = 26; // 今週より前に何週ぶん並べるか
const WEEKS_AFTER = 78;
const ROWS = 6; // 画面に見える週の数
function monthOf(base: string, n: number) {
  const [y, m] = base.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1 + n, 1)).toISOString().slice(0, 7);
}

// 週を縦に並べ、慣性スクロールで自由に流す。月の切れ目で止めない
export function Calendar({
  items,
  today,
  onSelect,
  onOpenDay,
}: {
  items: Item[];
  today: string;
  onSelect: (id: number) => void;
  onOpenDay: (day: string) => void;
}) {
  const firstDay = addDays(today, -weekday(today) - WEEKS_BEFORE * 7);
  const weeks = useMemo(
    () => Array.from({ length: WEEKS_BEFORE + WEEKS_AFTER + 1 }, (_, w) => Array.from({ length: 7 }, (_, d) => addDays(firstDay, w * 7 + d))),
    [firstDay],
  );
  // 開いたときと「今日」は、今月の1日を含む週を上端に合わせる（ふつうの月表示と同じ見え方）
  const home = WEEKS_BEFORE - Math.floor((Number(today.slice(8)) - 1 + weekday(`${today.slice(0, 7)}-01`)) / 7);
  const [top, setTop] = useState(home);
  const scroller = useRef<HTMLDivElement>(null);
  const byId = useMemo(() => new Map(items.map((i) => [i.id, i])), [items]);
  const shown = useMemo(() => items.filter((i) => i.onCalendar && i.status !== "完了"), [items]);

  const goWeek = (w: number, smooth = true) => {
    const el = scroller.current;
    if (!el || w < 0) return;
    el.scrollTo({ top: (w * el.clientHeight) / ROWS, behavior: smooth ? "smooth" : "instant" });
  };
  // 見出しの月は、画面のまん中あたりの週で決める（いちばん多く見えている月）
  const month = weeks[Math.min(weeks.length - 1, top + ROWS / 2)][0].slice(0, 7);
  const firstWeekOf = (m: string) => weeks.findIndex((w) => w.includes(`${m}-01`));

  useEffect(() => {
    goWeek(home, false);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- 初回だけ合わせる。あとは利用者のスクロールに任せる
  }, []);

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2 border-b border-neutral-200 px-3 py-2 dark:border-neutral-800">
        <button onClick={() => goWeek(firstWeekOf(monthOf(month, -1)))} className="px-2" aria-label="前の月">‹</button>
        <h2 className="font-bold tabular-nums">{month.replace("-", "年")}月</h2>
        <button onClick={() => goWeek(firstWeekOf(monthOf(month, 1)))} className="px-2" aria-label="次の月">›</button>
        <button onClick={() => goWeek(home)} className="ml-auto text-sm text-neutral-500">今日</button>
      </div>
      <div className="grid grid-cols-7 text-center text-xs text-neutral-500">
        {[...WD].map((w) => <div key={w} className="py-1">{w}</div>)}
      </div>
      {/* 縦だけ囲い込む。両方向で止めると、横スワイプで隣の画面へ移れなくなる */}
      <div
        ref={scroller}
        onScroll={(e) => setTop(Math.round((e.currentTarget.scrollTop * ROWS) / e.currentTarget.clientHeight))}
        className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain [scrollbar-width:none]"
      >
        {weeks.map((week) => (
          <div key={week[0]} className="grid h-1/6 grid-cols-7">
            {week.map((day) => {
              // 子は親と同じ日なら親だけ載せる
              const list = shown
                .map((it) => ({ it, mark: onDay(it, day) }))
                .filter(({ it, mark }) => mark && !(it.parentId && byId.get(it.parentId) && onDay(byId.get(it.parentId)!, day)))
                .sort((a, b) => (a.it.startTime ?? "").localeCompare(b.it.startTime ?? ""));
              // 月の境目が分かるよう、偶数月を薄く塗り分ける
              const even = Number(day.slice(5, 7)) % 2 === 0;
              return (
                // 日付のマスを押すと、その日の時間表を開く
                <div
                  key={day}
                  onClick={() => onOpenDay(day)}
                  className={`min-h-0 cursor-pointer overflow-hidden border-t border-l border-neutral-200 p-0.5 dark:border-neutral-800 ${even ? "bg-neutral-50 dark:bg-neutral-900" : ""} ${day.startsWith(month) ? "" : "text-neutral-400"}`}
                >
                  <div className={`text-xs ${day === today ? "inline-block rounded-full bg-neutral-900 px-1.5 text-white dark:bg-neutral-100 dark:text-neutral-900" : ""}`}>
                    {day.endsWith("-01") ? <b>{Number(day.slice(5, 7))}/1</b> : Number(day.slice(8))}
                  </div>
                  {list.slice(0, 3).map(({ it, mark }) => (
                    <button
                      key={it.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelect(it.id);
                      }}
                      className={`mt-0.5 block w-full truncate rounded px-0.5 text-left text-[10px] leading-4 text-white md:text-[11px] ${PRIORITY_COLOR[it.priority]}`}
                      title={it.title}
                    >
                      {mark === "start" && "▶"}
                      {mark === "end" && "〆"}
                      {it.startTime && <span className="opacity-80">{it.startTime.replace(/^0/, "")} </span>}
                      {it.title}
                    </button>
                  ))}
                  {list.length > 3 && <div className="text-[10px] text-neutral-500">+{list.length - 3}</div>}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
