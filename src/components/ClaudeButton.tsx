"use client";
import { useState } from "react";
import { sendToClaude } from "./claude";

const NOTE = {
  shared: "共有メニューで Claude を選んでください",
  opened: "Claude を開きました。入っていなければ貼り付けてください",
  copied: "長いのでコピーしました。Claude で貼り付けてください",
  cancelled: "コピーだけしておきました",
};

// 相談の記録を Claude アプリへ渡すボタン。押したあと何が起きたかを数秒だけ出す
export function ClaudeButton({ text, className = "" }: { text: string | null; className?: string }) {
  const [note, setNote] = useState<string | null>(null);
  if (!text) return null;
  return (
    <span className={`relative ${className}`}>
      <button
        onClick={async () => {
          const r = await sendToClaude(text);
          setNote(NOTE[r]);
          setTimeout(() => setNote(null), 4000);
        }}
        className="rounded-full border border-orange-300 px-2 py-0.5 text-xs text-orange-700 dark:border-orange-800 dark:text-orange-400"
      >
        Claudeに送る
      </button>
      {note && (
        <span className="absolute top-full right-0 z-10 mt-1 w-48 rounded-lg bg-neutral-900 px-2 py-1 text-[11px] text-white shadow dark:bg-neutral-100 dark:text-neutral-900">
          {note}
        </span>
      )}
    </span>
  );
}
