"use client";
import { useState } from "react";

// 投げ込み欄と相談チャットで共通の入力欄
export function Composer({ onSend, placeholder, disabled }: { onSend: (text: string) => void; placeholder: string; disabled?: boolean }) {
  const [text, setText] = useState("");
  const send = () => {
    if (!text.trim() || disabled) return;
    onSend(text.trim());
    setText("");
  };
  return (
    <div className="flex items-end gap-2 border-t border-neutral-200 p-2 dark:border-neutral-800">
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
            e.preventDefault();
            send();
          }
        }}
        rows={2}
        placeholder={placeholder}
        className="min-w-0 flex-1 resize-none rounded-lg border border-neutral-300 bg-transparent px-3 py-2 text-base outline-none focus:border-neutral-500 md:text-sm dark:border-neutral-700"
      />
      {/* スマホのキーボードでは Enter が改行・変換確定になりがちなので、送るボタンも置く */}
      <button
        onClick={send}
        disabled={!text.trim() || disabled}
        className="shrink-0 rounded-lg bg-neutral-900 px-3 py-2 text-sm text-white disabled:opacity-30 dark:bg-neutral-100 dark:text-neutral-900"
      >
        送る
      </button>
    </div>
  );
}
