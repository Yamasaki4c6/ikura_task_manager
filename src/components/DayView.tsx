"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { addDays, weekday } from "@/lib/dates";
import { FOLDERS } from "@/lib/schema";
import { onDay, WD } from "./days";
import { PRIORITY_COLOR, type Item } from "./types";

const HOUR = 56; // 1時間の高さ（px）
const toMin = (t: string) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3, 5));
const toTime = (m: number) => `${String(Math.floor(m / 60) % 24).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;

type Draft = { title: string; startTime: string; endTime: string; folder: string };

// 1日の時間表（iPhone のカレンダーの日表示のように、縦に24時間を並べる）
export function DayView({
  day: initialDay,
  today,
  items,
  onClose,
  onSelect,
  onCreate,
}: {
  day: string;
  today: string;
  items: Item[];
  onClose: () => void;
  onSelect: (id: number) => void;
  onCreate: (e: { title: string; date: string; startTime: string; endTime: string; folder: string }) => Promise<void>;
}) {
  const [day, setDay] = useState(initialDay);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [now, setNow] = useState<number | null>(null);
  const scroller = useRef<HTMLDivElement>(null);

  const list = useMemo(() => items.filter((it) => onDay(it, day)), [items, day]);
  const allDay = list.filter((it) => !it.startTime);
  // 時刻つきの予定を、重なりに応じて横に並べる
  const timed = useMemo(() => {
    const evs = list
      .filter((it) => it.startTime)
      .map((it) => {
        const start = toMin(it.startTime!);
        const end = it.endTime && toMin(it.endTime) > start ? toMin(it.endTime) : start + 60;
        return { it, start, end, col: 0, cols: 1 };
      })
      .sort((a, b) => a.start - b.start || b.end - a.end);
    let group: typeof evs = [];
    let groupEnd = -1;
    const flush = () => group.forEach((e) => (e.cols = Math.max(...group.map((g) => g.col)) + 1));
    for (const e of evs) {
      if (e.start >= groupEnd) {
        flush();
        group = [];
        groupEnd = -1;
      }
      const used = new Set(group.filter((g) => g.end > e.start).map((g) => g.col));
      while (used.has(e.col)) e.col++;
      group.push(e);
      groupEnd = Math.max(groupEnd, e.end);
    }
    flush();
    return evs;
  }, [list]);

  useEffect(() => {
    const tick = () => {
      const d = new Date(Date.now() + 9 * 3600_000);
      setNow(d.getUTCHours() * 60 + d.getUTCMinutes());
    };
    tick();
    const id = setInterval(tick, 60_000);
    return () => clearInterval(id);
  }, []);

  // 開いたら、今日なら今の1時間前、それ以外は最初の予定か8時あたりを上に出す
  useEffect(() => {
    const first = timed[0]?.start;
    const nowMin = new Date(Date.now() + 9 * 3600_000);
    const target = day === today ? nowMin.getUTCHours() * 60 - 60 : first !== undefined ? Math.min(first, 8 * 60) - 30 : 8 * 60;
    scroller.current?.scrollTo({ top: (Math.max(0, target) / 60) * HOUR });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- 日を変えたときだけ合わせる
  }, [day]);

  const label = (d: string) => `${Number(d.slice(5, 7))}月${Number(d.slice(8))}日（${WD[weekday(d)]}）`;

  async function save() {
    if (!draft?.title.trim()) return;
    await onCreate({ ...draft, title: draft.title.trim(), date: day });
    setDraft(null);
  }

  return (
    <div className="fixed inset-0 z-40 flex flex-col bg-white md:inset-auto md:top-1/2 md:left-1/2 md:h-[85dvh] md:w-[28rem] md:-translate-x-1/2 md:-translate-y-1/2 md:rounded-2xl md:shadow-2xl dark:bg-neutral-950">
      <div className="flex items-center gap-1 border-b border-neutral-200 px-2 py-2 dark:border-neutral-800">
        <button onClick={onClose} className="px-2 text-lg leading-none text-neutral-500" aria-label="カレンダーに戻る">‹</button>
        <button onClick={() => setDay(addDays(day, -1))} className="px-2 text-neutral-500" aria-label="前の日">◀</button>
        <h2 className={`flex-1 text-center font-bold ${day === today ? "text-red-600" : ""}`}>{label(day)}</h2>
        <button onClick={() => setDay(addDays(day, 1))} className="px-2 text-neutral-500" aria-label="次の日">▶</button>
        <button
          onClick={() => setDraft({ title: "", startTime: "09:00", endTime: "10:00", folder: "生活" })}
          className="px-2 text-xl leading-none"
          aria-label="予定を追加"
        >
          ＋
        </button>
      </div>

      {allDay.length > 0 && (
        <div className="flex flex-wrap gap-1 border-b border-neutral-200 px-2 py-1.5 dark:border-neutral-800">
          <span className="w-10 shrink-0 pt-0.5 text-[10px] text-neutral-500">終日</span>
          {allDay.map((it) => (
            <button key={it.id} onClick={() => onSelect(it.id)} className={`rounded px-1.5 py-0.5 text-xs text-white ${PRIORITY_COLOR[it.priority]}`}>
              {it.title}
            </button>
          ))}
        </div>
      )}

      <div ref={scroller} className="relative min-h-0 flex-1 overflow-y-auto overscroll-contain">
        <div className="relative" style={{ height: HOUR * 24 }}>
          {Array.from({ length: 24 }, (_, h) => (
            // 空いている時間を押すと、その時刻から1時間の予定を入れる
            <button
              key={h}
              onClick={() => setDraft({ title: "", startTime: toTime(h * 60), endTime: toTime(Math.min(h * 60 + 60, 23 * 60 + 59)), folder: "生活" })}
              className="absolute right-0 left-0 flex border-t border-neutral-200 text-left dark:border-neutral-800"
              style={{ top: h * HOUR, height: HOUR }}
              aria-label={`${h}時に予定を追加`}
            >
              <span className="-mt-2 w-12 shrink-0 bg-white pr-1 text-right text-[10px] text-neutral-500 dark:bg-neutral-950">{h === 0 ? "" : `${h}:00`}</span>
            </button>
          ))}
          {timed.map(({ it, start, end, col, cols }) => (
            <button
              key={it.id}
              onClick={() => onSelect(it.id)}
              className={`absolute overflow-hidden rounded-md border-l-4 border-black/20 px-1.5 py-0.5 text-left text-xs text-white ${PRIORITY_COLOR[it.priority]}`}
              style={{
                top: (start / 60) * HOUR + 1,
                height: Math.max(((end - start) / 60) * HOUR - 2, 22),
                left: `calc(3.25rem + (100% - 3.75rem) * ${col / cols})`,
                width: `calc((100% - 3.75rem) / ${cols} - 2px)`,
              }}
            >
              <div className="truncate font-bold">{it.title}</div>
              <div className="opacity-80">
                {it.startTime}
                {it.endTime && `〜${it.endTime}`}
              </div>
            </button>
          ))}
          {day === today && now !== null && (
            <div className="pointer-events-none absolute right-0 left-11 flex items-center" style={{ top: (now / 60) * HOUR }}>
              <span className="-ml-1 h-2 w-2 rounded-full bg-red-500" />
              <span className="h-px flex-1 bg-red-500" />
            </div>
          )}
        </div>
      </div>

      {draft && (
        <div className="fixed inset-0 z-50 flex items-end bg-black/30 md:items-center md:justify-center" onClick={() => setDraft(null)}>
          <form
            onClick={(e) => e.stopPropagation()}
            onSubmit={(e) => {
              e.preventDefault();
              save();
            }}
            className="w-full space-y-3 rounded-t-2xl bg-white p-4 text-sm shadow-xl md:max-w-sm md:rounded-2xl dark:bg-neutral-900"
          >
            <div className="flex items-center">
              <h3 className="font-bold">{label(day)}に予定を追加</h3>
              <button type="button" onClick={() => setDraft(null)} className="ml-auto text-neutral-400" aria-label="閉じる">×</button>
            </div>
            <input
              autoFocus
              value={draft.title}
              onChange={(e) => setDraft({ ...draft, title: e.target.value })}
              placeholder="予定の名前"
              className="w-full rounded-lg border border-neutral-300 bg-transparent px-3 py-2 text-base dark:border-neutral-700"
            />
            <div className="flex flex-wrap items-center gap-2">
              <input
                type="time"
                value={draft.startTime}
                onChange={(e) => {
                  // 開始をずらしたら、長さを保ったまま終了もずらす
                  const len = toMin(draft.endTime) - toMin(draft.startTime);
                  const start = e.target.value || draft.startTime;
                  setDraft({ ...draft, startTime: start, endTime: toTime(Math.min(toMin(start) + Math.max(len, 15), 23 * 60 + 59)) });
                }}
                className="rounded border border-neutral-300 bg-transparent px-2 py-1 dark:border-neutral-700"
              />
              〜
              <input
                type="time"
                value={draft.endTime}
                onChange={(e) => setDraft({ ...draft, endTime: e.target.value || draft.endTime })}
                className="rounded border border-neutral-300 bg-transparent px-2 py-1 dark:border-neutral-700"
              />
              <select
                value={draft.folder}
                onChange={(e) => setDraft({ ...draft, folder: e.target.value })}
                className="ml-auto rounded border border-neutral-300 bg-transparent px-1 py-1 dark:border-neutral-700"
              >
                {FOLDERS.map((f) => <option key={f}>{f}</option>)}
              </select>
            </div>
            <button
              disabled={!draft.title.trim()}
              className="w-full rounded-lg bg-neutral-900 py-2 text-white disabled:opacity-30 dark:bg-neutral-100 dark:text-neutral-900"
            >
              追加
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
