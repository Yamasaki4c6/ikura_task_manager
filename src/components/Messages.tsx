"use client";
import { useEffect, useRef } from "react";

export type Msg = { id: number; role: "user" | "assistant"; text: string; error?: boolean };

export function Messages({ log, pending, empty, children }: { log: Msg[]; pending: boolean; empty: string; children?: React.ReactNode }) {
  const bottom = useRef<HTMLDivElement>(null);
  // 波括弧で包んで何も返さない。新しい Chrome では scrollIntoView が Promise を返し、
  // それを React が後片付け関数として呼んで「i is not a function」で落ちていた
  useEffect(() => {
    bottom.current?.scrollIntoView({ block: "end" });
  }, [log, pending]);

  return (
    <div className="flex-1 space-y-2 overflow-y-auto p-3 text-sm">
      {children}
      {log.length === 0 && !pending && <p className="text-neutral-400">{empty}</p>}
      {log.map((m) =>
        m.role === "user" ? (
          <div key={m.id} className="ml-auto w-fit max-w-[90%] whitespace-pre-wrap rounded-lg bg-neutral-100 px-3 py-1.5 dark:bg-neutral-800">
            {m.text}
          </div>
        ) : (
          <div key={m.id} className={`max-w-[90%] whitespace-pre-wrap text-xs leading-relaxed ${m.error ? "text-red-600" : "text-neutral-600 dark:text-neutral-400"}`}>
            {m.text}
          </div>
        ),
      )}
      {pending && <div className="text-xs text-neutral-400">考え中…</div>}
      <div ref={bottom} />
    </div>
  );
}
