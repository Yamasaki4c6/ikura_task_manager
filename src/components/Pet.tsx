"use client";
import { useEffect, useMemo, useState } from "react";
import { onDay } from "./days";
import type { Item } from "./types";

const MAX = 3;
// すぐ出せる仮の一言。AI の要約が届くまでと、AI キーがないときに使う
const cut = (t: string) => t.split(/[（(：:／/、,]/)[0].trim().slice(0, 12);

// 今日やることを3件まで選ぶ。細かい子タスクは親にまとめて出す。
// 並びは 今日の予定（時刻順）→ 締切が今日か過ぎたもの → 進行中のもの
export function todayPicks(items: Item[], today: string) {
  const byId = new Map(items.map((i) => [i.id, i]));
  const top = (i: Item) => (i.parentId ? byId.get(i.parentId) ?? i : i);
  const open = items.filter((i) => i.status !== "完了");
  const events = open.filter((i) => onDay(i, today)).sort((a, b) => (a.startTime ?? "99").localeCompare(b.startTime ?? "99"));
  const due = open.filter((i) => i.dueDate && i.dueDate <= today && !i.onCalendar).sort((a, b) => a.dueDate!.localeCompare(b.dueDate!));
  const doing = open.filter((i) => i.status === "進行中");
  const seen = new Set<number>();
  return [...events, ...due, ...doing]
    .map(top)
    .filter((i) => i.status !== "完了" && !seen.has(i.id) && seen.add(i.id))
    .slice(0, MAX);
}

// 投げ込み画面の上にいるキャラクター。見た目は仮置きでアプリのアイコンを置いている
export function Pet({
  items,
  today,
  wroteDiary,
  onSelect,
  onOpenDiary,
}: {
  items: Item[];
  today: string;
  wroteDiary: boolean;
  onSelect: (id: number) => void;
  onOpenDiary: () => void;
}) {
  const picks = useMemo(() => todayPicks(items, today), [items, today]);
  // 長い見出しは AI に一言へまとめさせる（一度作れば保存されるので、次からは呼ばない）
  const [shorts, setShorts] = useState<Record<number, string>>({});
  const need = picks.filter((i) => !i.shortTitle && !shorts[i.id]).map((i) => i.id).join(",");
  useEffect(() => {
    if (!need) return;
    fetch("/api/shorten", { method: "POST", body: JSON.stringify({ ids: need.split(",").map(Number) }) })
      .then((r) => r.json())
      .then((d) => d.shorts && setShorts((s) => ({ ...s, ...d.shorts })))
      .catch(() => {});
  }, [need]);
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
      <button onClick={onOpenDiary} className="shrink-0 self-end active:scale-95" aria-label="今日の日記をひらく">
        {/* eslint-disable-next-line @next/next/no-img-element -- 仮置きの小さな静止画なので最適化は不要 */}
        <img src="/icon-192.png" alt="" width={88} height={88} className="h-22 w-22 rounded-3xl shadow-md md:h-18 md:w-18" />
      </button>

      {/* 吹き出し：今日やること */}
      <div className="relative mb-8 max-h-full min-h-0 flex-1">
        <div className="flex max-h-full flex-col overflow-hidden rounded-2xl border border-neutral-200 bg-white p-3 text-sm shadow-sm dark:border-neutral-700 dark:bg-neutral-900">
          <p className="mb-1 text-xs text-neutral-500">
            {greeting}
            {picks.length ? "今日やることはこれ。" : ""}
          </p>
          {picks.length === 0 ? (
            <p className="text-neutral-600 dark:text-neutral-300">今日は決まった予定はないよ。思いついたことを投げ込んでね。</p>
          ) : (
            <ul className="min-h-0 flex-1 space-y-1.5 overflow-y-auto">
              {picks.map((it) => (
                <li key={it.id}>
                  <button onClick={() => onSelect(it.id)} className="flex w-full items-baseline gap-2 text-left text-[15px]">
                    <span className="w-10 shrink-0 text-[11px] text-neutral-500 tabular-nums">
                      {it.startTime ?? (it.dueDate && it.dueDate < today ? "期限切" : it.status === "進行中" ? "進行中" : "今日")}
                    </span>
                    <span className="truncate">{shorts[it.id] ?? it.shortTitle ?? cut(it.title)}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
          {!wroteDiary && hour >= 18 && (
            <button onClick={onOpenDiary} className="mt-1 text-left text-xs text-amber-700 dark:text-amber-400">
              今日はどんな日だった？ アイコンをタップして日記を書いてね。
            </button>
          )}
        </div>
        <span className="absolute bottom-5 -left-1.5 h-3 w-3 rotate-45 border-b border-l border-neutral-200 bg-white dark:border-neutral-700 dark:bg-neutral-900" />
      </div>
    </div>
  );
}
