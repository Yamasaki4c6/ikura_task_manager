"use client";
import { useEffect, useRef } from "react";
import { weekday } from "@/lib/dates";
import { WD } from "./days";

// kind: ack は登録・更新の一言（小さく灰色）、chat は相談への返事（会話として本文の大きさで出す）
export type Msg = { id: number; role: "user" | "assistant"; text: string; kind?: "ack" | "chat"; createdAt?: string; error?: boolean };

const dayOf = (iso?: string) => (iso ? new Date(Date.parse(iso) + 9 * 3600_000).toISOString().slice(0, 10) : null);
const dayLabel = (d: string) => `${Number(d.slice(5, 7))}月${Number(d.slice(8))}日（${WD[weekday(d)]}）`;

// やり取りは下から積む（Claude アプリのように、新しいものが入力欄のすぐ上に来る）。古い履歴は上へスクロールして見る
export function Messages({
  log,
  pending,
  empty,
  allChat,
  children,
}: {
  log: Msg[];
  pending: boolean;
  empty: string;
  allChat?: boolean;
  children?: React.ReactNode;
}) {
  const box = useRef<HTMLDivElement>(null);
  // 一番下まで送る。scrollIntoView は横並びの画面まで動かしてしまい、カレンダーを見ていても投げ込みへ飛ぶので使わない
  useEffect(() => {
    const el = box.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [log, pending]);

  return (
    <div ref={box} className="flex flex-1 flex-col overflow-y-auto p-3 text-sm">
      <div className="mt-auto space-y-3">
        {children}
        {log.length === 0 && !pending && <p className="text-neutral-400">{empty}</p>}
        {log.map((m, i) => {
          // 日が変わったところに日付を挟む
          const d = dayOf(m.createdAt);
          const sep = d && d !== dayOf(log[i - 1]?.createdAt) ? d : null;
          return (
            <div key={m.id}>
              {sep && <div className="my-2 text-center text-[10px] text-neutral-400">{dayLabel(sep)}</div>}
              {m.role === "user" ? (
                <div className="ml-auto w-fit max-w-[85%] rounded-2xl bg-neutral-100 px-3 py-2 whitespace-pre-wrap dark:bg-neutral-800">{m.text}</div>
              ) : m.error ? (
                <div className="text-xs text-red-600">{m.text}</div>
              ) : allChat || m.kind === "chat" ? (
                <div className="leading-relaxed whitespace-pre-wrap">{m.text}</div>
              ) : (
                <div className="text-xs text-neutral-500">{m.text}</div>
              )}
            </div>
          );
        })}
        {pending && <div className="animate-pulse text-xs text-neutral-400">考え中…</div>}
      </div>
    </div>
  );
}
