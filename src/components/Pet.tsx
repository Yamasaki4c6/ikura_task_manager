"use client";
import { useEffect, useMemo, useState } from "react";
import { onDay } from "./days";
import type { Item } from "./types";

// 気分（日記の mood 1〜5）で表情を変える。未記入はふつうの顔
const MOUTH: Record<number, string> = {
  1: "M-7 6 Q0 1 7 6",
  2: "M-6 5 Q0 3 6 5",
  3: "M-6 4 L6 4",
  4: "M-7 3 Q0 8 7 3",
  5: "M-8 2 Q0 11 8 2",
};

// 今日やることを選ぶ。今日の予定（時刻順）→ 締切が今日か過ぎたもの → 進行中のもの
export function todayPicks(items: Item[], today: string) {
  const open = items.filter((i) => i.status !== "完了");
  const events = open.filter((i) => onDay(i, today)).sort((a, b) => (a.startTime ?? "99").localeCompare(b.startTime ?? "99"));
  const due = open.filter((i) => i.dueDate && i.dueDate <= today && !i.onCalendar && !i.childIds.length);
  const doing = open.filter((i) => i.status === "進行中" && !i.childIds.length);
  const seen = new Set<number>();
  return [...events, ...due, ...doing].filter((i) => !seen.has(i.id) && seen.add(i.id));
}

// 投げ込み画面の上にいるキャラクター。見た目は仮置きの SVG で、動きは CSS だけ（AI は呼ばない）
export function Pet({
  items,
  today,
  mood,
  wroteDiary,
  onSelect,
  onOpenDiary,
}: {
  items: Item[];
  today: string;
  mood: number | null;
  wroteDiary: boolean;
  onSelect: (id: number) => void;
  onOpenDiary: () => void;
}) {
  const picks = useMemo(() => todayPicks(items, today), [items, today]);
  // 時間帯であいさつを変える。描画中に時計を読まないよう、effect で拾って1分ごとに更新する
  const [hour, setHour] = useState(12);
  useEffect(() => {
    const tick = () => setHour(new Date(Date.now() + 9 * 3600_000).getUTCHours());
    tick();
    const id = setInterval(tick, 60_000);
    return () => clearInterval(id);
  }, []);
  const greeting = hour < 5 ? "夜ふかしだね。" : hour < 11 ? "おはよう！" : hour < 18 ? "こんにちは。" : "おつかれさま。";

  return (
    <div className="flex h-full min-h-0 items-end gap-2 border-b border-neutral-200 bg-gradient-to-b from-amber-50 to-transparent px-3 pt-3 pb-2 dark:border-neutral-800 dark:from-neutral-900">
      <button onClick={onOpenDiary} className="pet shrink-0 self-end" aria-label="今日の日記をひらく">
        <svg viewBox="-40 -40 80 80" className="h-24 w-24 drop-shadow md:h-20 md:w-20">
          <ellipse cx="0" cy="34" rx="22" ry="4" className="fill-black/10" />
          <g className="pet-body">
            <path d="M-28 10 Q-30 -30 0 -30 Q30 -30 28 10 Q26 30 0 30 Q-26 30 -28 10 Z" className="fill-amber-300 stroke-amber-500" strokeWidth="2" />
            <circle cx="-17" cy="8" r="5" className="fill-pink-300/70" />
            <circle cx="17" cy="8" r="5" className="fill-pink-300/70" />
            <g className="pet-eyes">
              <ellipse cx="-10" cy="-4" rx="3.2" ry="4.5" className="fill-neutral-800" />
              <ellipse cx="10" cy="-4" rx="3.2" ry="4.5" className="fill-neutral-800" />
            </g>
            <path d={MOUTH[mood ?? 3]} transform="translate(0 8)" className="fill-none stroke-neutral-800" strokeWidth="2" strokeLinecap="round" />
          </g>
        </svg>
      </button>

      {/* 吹き出し：今日やること */}
      <div className="relative mb-6 min-h-0 flex-1 self-stretch">
        <div className="absolute inset-0 flex flex-col overflow-hidden rounded-2xl border border-neutral-200 bg-white p-3 text-sm shadow-sm dark:border-neutral-700 dark:bg-neutral-900">
          <p className="mb-1 text-xs text-neutral-500">
            {greeting}
            {picks.length ? "今日やることはこれ。" : ""}
          </p>
          {picks.length === 0 ? (
            <p className="text-neutral-600 dark:text-neutral-300">今日は決まった予定はないよ。思いついたことを投げ込んでね。</p>
          ) : (
            <ul className="min-h-0 flex-1 space-y-1 overflow-y-auto">
              {picks.slice(0, 5).map((it) => (
                <li key={it.id}>
                  <button onClick={() => onSelect(it.id)} className="flex w-full items-baseline gap-1.5 text-left">
                    <span className="w-10 shrink-0 text-[11px] text-neutral-500 tabular-nums">
                      {it.startTime ?? (it.dueDate && it.dueDate < today ? "期限切" : it.status === "進行中" ? "進行中" : "今日")}
                    </span>
                    <span className="truncate">{it.title}</span>
                  </button>
                </li>
              ))}
              {picks.length > 5 && <li className="text-xs text-neutral-500">ほか {picks.length - 5} 件はリストで見てね</li>}
            </ul>
          )}
          {!wroteDiary && hour >= 18 && (
            <button onClick={onOpenDiary} className="mt-1 text-left text-xs text-amber-700 dark:text-amber-400">
              今日はどんな日だった？ ぼくをタップして日記を書いてね。
            </button>
          )}
        </div>
        <span className="absolute bottom-5 -left-1.5 h-3 w-3 rotate-45 border-b border-l border-neutral-200 bg-white dark:border-neutral-700 dark:bg-neutral-900" />
      </div>
    </div>
  );
}
