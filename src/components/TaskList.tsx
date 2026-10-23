"use client";
import { useEffect, useState } from "react";
import { addDays } from "@/lib/dates";
import { FOLDERS, KINDS, type Status } from "@/lib/schema";
import { KIND_STYLE, PRIORITY_COLOR, type Item } from "./types";

// チェックで完了／未完了を切り替える。進行中は相談チャットの編集から
const MARK: Record<Status, string> = { 未着手: "☐", 進行中: "◐", 完了: "☑" };

// 畳んだフォルダと、開いた親項目を覚えておく（この端末だけ）。子を持つ項目は畳んだ状態から始める
const STORE = "vp.list.open";
type Open = { folders: string[]; items: number[] };
function loadOpen(): Open | null {
  try {
    const v = JSON.parse(localStorage.getItem(STORE) ?? "null");
    return Array.isArray(v?.folders) && Array.isArray(v?.items) ? v : null;
  } catch {
    return null;
  }
}

export function TaskList({
  items,
  today,
  selectedId,
  onSelect,
  onStatus,
}: {
  items: Item[];
  today: string | null;
  selectedId: number | null;
  onSelect: (id: number) => void;
  onStatus: (id: number, s: Status) => void;
}) {
  const [kind, setKind] = useState<string | null>(null);
  const [showDone, setShowDone] = useState(false);
  // 閉じているフォルダ名と、開いている親項目の id
  const [closed, setClosed] = useState<Open>({ folders: [], items: [] });
  useEffect(() => {
    const saved = loadOpen();
    // eslint-disable-next-line react-hooks/set-state-in-effect -- 端末に覚えた開閉を読み戻す
    if (saved) setClosed(saved);
  }, []);
  const save = (next: Open) => {
    setClosed(next);
    try {
      localStorage.setItem(STORE, JSON.stringify(next));
    } catch {}
  };
  const toggle = <K extends keyof Open>(key: K, v: Open[K][number]) => {
    const list = closed[key] as Open[K][number][];
    save({ ...closed, [key]: list.includes(v) ? list.filter((x) => x !== v) : [...list, v] });
  };
  const folderOpen = (f: string) => !closed.folders.includes(f);
  const itemOpen = (id: number) => closed.items.includes(id);
  const allClosed = FOLDERS.every((f) => closed.folders.includes(f));
  const byId = new Map(items.map((i) => [i.id, i]));
  const visible = (i: Item) => (showDone || i.status !== "完了") && (!kind || i.kind === kind);

  // 締切の近さで色を変える（過ぎた・今日＝赤、3日以内＝橙）
  const dueTone = (d: string) => (!today ? "" : d <= today ? "text-red-600 font-bold" : d <= addDays(today, 3) ? "text-orange-600" : "");

  const row = (it: Item, child = false) => {
    const done = it.status === "完了";
    const kids = it.childIds.map((c) => byId.get(c)).filter((c): c is Item => Boolean(c));
    const doneKids = kids.filter((c) => c.status === "完了").length;
    return (
      <li key={it.id} className={child ? "" : "border-b border-neutral-100 last:border-b-0 dark:border-neutral-800/60"}>
        <div className={`flex items-start gap-2 rounded-lg px-1 ${child ? "py-1.5" : "py-2.5"} ${selectedId === it.id ? "bg-neutral-100 dark:bg-neutral-800" : ""}`}>
          {kids.length > 0 ? (
            <button
              onClick={() => toggle("items", it.id)}
              className="flex h-6 w-6 shrink-0 items-center justify-center text-xs text-neutral-500"
              aria-label={itemOpen(it.id) ? "たたむ" : "ひらく"}
              aria-expanded={itemOpen(it.id)}
            >
              {itemOpen(it.id) ? "▼" : "▶"}
            </button>
          ) : (
            <button
              onClick={() => onStatus(it.id, done ? "未着手" : "完了")}
              className="flex h-6 w-6 shrink-0 items-center justify-center text-lg leading-none"
              title={it.status}
              aria-label={done ? "未完了に戻す" : "完了にする"}
            >
              {MARK[it.status]}
            </button>
          )}
          <button onClick={() => onSelect(it.id)} className="min-w-0 flex-1 text-left">
            <div className={`line-clamp-2 leading-snug ${child ? "text-sm" : "text-[15px] font-medium"} ${done ? "text-neutral-400 line-through" : ""}`}>
              {it.title}
            </div>
            {/* 2行目に属性をまとめ、見出しを読みやすくする */}
            <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-neutral-500">
              <span className={`inline-block h-2 w-2 rounded-full ${PRIORITY_COLOR[it.priority]}`} />
              {!child && <span className={`rounded px-1 ${KIND_STYLE[it.kind]}`}>{it.kind}</span>}
              {it.dueDate && (
                <span className={`tabular-nums ${dueTone(it.dueDate)}`}>
                  {it.onCalendar ? "📅" : "〆"}
                  {it.dueDate.slice(5).replace("-", "/")}
                  {it.startTime && ` ${it.startTime}`}
                </span>
              )}
              {kids.length > 0 && (
                <span className="flex items-center gap-1 tabular-nums">
                  <span className="h-1 w-10 overflow-hidden rounded-full bg-neutral-200 dark:bg-neutral-700">
                    <span className="block h-full bg-green-600" style={{ width: `${(doneKids / kids.length) * 100}%` }} />
                  </span>
                  {doneKids}/{kids.length}
                </span>
              )}
              {it.recurrence && <span className="text-green-700 dark:text-green-400">{it.recurrence}</span>}
              {it.tags.slice(0, 2).map((t) => <span key={t} className="text-neutral-400">#{t}</span>)}
            </div>
          </button>
        </div>
        {kids.length > 0 && itemOpen(it.id) && (
          <ul className="mb-1 ml-4 border-l-2 border-neutral-200 pl-2 dark:border-neutral-700">{kids.filter(visible).map((c) => row(c, true))}</ul>
        )}
      </li>
    );
  };

  return (
    <div className="flex h-full flex-col">
      <div className="flex flex-wrap items-center gap-1 border-b border-neutral-200 px-2 py-2 text-xs dark:border-neutral-800">
        {[null, ...KINDS].map((k) => (
          <button
            key={k ?? "all"}
            onClick={() => setKind(k)}
            className={`rounded-full px-2 py-0.5 ${kind === k ? "bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900" : "bg-neutral-100 dark:bg-neutral-800"}`}
          >
            {k ?? "すべて"}
          </button>
        ))}
        <button
          onClick={() => save(allClosed ? { ...closed, folders: [] } : { folders: [...FOLDERS], items: [] })}
          className="ml-auto text-neutral-500"
        >
          {allClosed ? "全部ひらく" : "全部たたむ"}
        </button>
        <label className="flex items-center gap-1 text-neutral-500">
          <input type="checkbox" checked={showDone} onChange={(e) => setShowDone(e.target.checked)} />完了も
        </label>
      </div>
      <div className="flex-1 overflow-y-auto px-2 pb-4 text-sm">
        {FOLDERS.map((f) => {
          const top = items.filter((i) => i.folder === f && !i.parentId && visible(i));
          if (top.length === 0) return null;
          // 日付のあるものを先に、締切なしの素材は後ろで寝かせる（仕様 §8）
          const dated = top.filter((i) => i.dueDate || i.startDate).sort((a, b) => (a.dueDate ?? a.startDate ?? "").localeCompare(b.dueDate ?? b.startDate ?? ""));
          const undated = top.filter((i) => !i.dueDate && !i.startDate);
          return (
            <section key={f} className="mb-2">
              {/* フォルダ名はスクロールしても上に残す */}
              <h3 className="sticky top-0 z-10 -mx-2 bg-white/95 px-2 backdrop-blur dark:bg-neutral-950/95">
                <button
                  onClick={() => toggle("folders", f)}
                  className="flex w-full items-center gap-2 border-b border-neutral-200 py-2 text-sm font-bold dark:border-neutral-800"
                  aria-expanded={folderOpen(f)}
                >
                  <span className="w-6 text-center text-xs text-neutral-400">{folderOpen(f) ? "▼" : "▶"}</span>
                  {f}
                  <span className="rounded-full bg-neutral-100 px-2 text-xs font-normal text-neutral-500 dark:bg-neutral-800">{top.length}</span>
                </button>
              </h3>
              {folderOpen(f) && <ul>{dated.map((i) => row(i))}</ul>}
              {folderOpen(f) && undated.length > 0 && (
                <>
                  {dated.length > 0 && <div className="mt-2 mb-0.5 pl-9 text-[11px] font-bold text-neutral-400">締切なし</div>}
                  <ul>{undated.map((i) => row(i))}</ul>
                </>
              )}
            </section>
          );
        })}
      </div>
    </div>
  );
}
