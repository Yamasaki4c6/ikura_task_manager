"use client";
import { useEffect, useState } from "react";
import { addDays, weekday } from "@/lib/dates";
import { WD } from "./days";

export const MOODS = [
  { v: 1, face: "😣", label: "つらい" },
  { v: 2, face: "😕", label: "いまいち" },
  { v: 3, face: "😐", label: "ふつう" },
  { v: 4, face: "🙂", label: "よい" },
  { v: 5, face: "😄", label: "とてもよい" },
];

// 1日1件の日記。キャラクターをタップすると今日の分が開く。◀▶で前の日も見返せる
export function Diary({ today, onClose, onSaved }: { today: string; onClose: () => void; onSaved: (date: string, mood: number | null) => void }) {
  const [date, setDate] = useState(today);
  const [mood, setMood] = useState<number | null>(null);
  const [text, setText] = useState("");
  const [state, setState] = useState<"loading" | "idle" | "saving" | "saved" | "error">("loading");

  useEffect(() => {
    let alive = true;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- 日を切り替えたら読み直す
    setState("loading");
    fetch(`/api/diary?date=${date}`, { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => {
        if (!alive) return;
        setMood(d.entry?.mood ?? null);
        setText(d.entry?.text ?? "");
        setState("idle");
      })
      .catch(() => alive && setState("error"));
    return () => {
      alive = false;
    };
  }, [date]);

  async function save() {
    setState("saving");
    const res = await fetch("/api/diary", { method: "PUT", body: JSON.stringify({ date, mood, text }) }).catch(() => null);
    if (!res?.ok) return setState("error");
    setState("saved");
    onSaved(date, mood);
  }

  const label = `${Number(date.slice(5, 7))}月${Number(date.slice(8))}日（${WD[weekday(date)]}）`;
  const dirty = state === "idle" || state === "error";

  return (
    <div className="fixed inset-0 z-40 flex items-end bg-black/30 md:items-center md:justify-center" onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[90dvh] w-full flex-col gap-3 rounded-t-2xl bg-white p-4 text-sm shadow-xl md:max-w-md md:rounded-2xl dark:bg-neutral-900"
      >
        <div className="flex items-center gap-1">
          <button onClick={() => setDate(addDays(date, -1))} className="px-2 text-neutral-500" aria-label="前の日">◀</button>
          <h2 className="flex-1 text-center font-bold">{date === today ? "今日の日記" : "日記"}　{label}</h2>
          <button onClick={() => setDate(addDays(date, 1))} disabled={date >= today} className="px-2 text-neutral-500 disabled:opacity-20" aria-label="次の日">▶</button>
          <button onClick={onClose} className="px-2 text-neutral-400" aria-label="閉じる">×</button>
        </div>

        <div>
          <p className="mb-1 text-xs text-neutral-500">今日の気分</p>
          <div className="flex justify-between">
            {MOODS.map((m) => (
              <button
                key={m.v}
                onClick={() => {
                  setMood(mood === m.v ? null : m.v);
                  setState("idle");
                }}
                className={`flex flex-col items-center rounded-xl px-2 py-1 ${mood === m.v ? "bg-amber-100 dark:bg-amber-900" : "opacity-60"}`}
                aria-pressed={mood === m.v}
              >
                <span className="text-2xl">{m.face}</span>
                <span className="text-[10px]">{m.label}</span>
              </button>
            ))}
          </div>
        </div>

        <textarea
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            setState("idle");
          }}
          disabled={state === "loading"}
          rows={8}
          placeholder="今日あったこと、感じたこと、うまくいったこと、しんどかったこと。"
          className="min-h-40 w-full flex-1 resize-none rounded-lg border border-neutral-300 bg-transparent px-3 py-2 text-base outline-none focus:border-neutral-500 dark:border-neutral-700"
        />

        <div className="flex items-center gap-2">
          <span className="text-xs text-neutral-500">
            {state === "loading" ? "読み込み中…" : state === "saving" ? "保存中…" : state === "saved" ? "保存しました" : state === "error" ? "保存に失敗しました" : ""}
          </span>
          <button
            onClick={save}
            disabled={!dirty}
            className="ml-auto rounded-lg bg-neutral-900 px-4 py-2 text-white disabled:opacity-30 dark:bg-neutral-100 dark:text-neutral-900"
          >
            保存
          </button>
        </div>
      </div>
    </div>
  );
}
