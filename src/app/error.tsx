"use client";

// 落ちたときに原因を見えるようにする。報告するときはこの文面をそのまま送る
export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="m-auto max-w-md p-4 text-sm">
      <h1 className="mb-2 font-bold">画面の表示に失敗しました</h1>
      <pre className="whitespace-pre-wrap rounded bg-neutral-100 p-2 text-xs dark:bg-neutral-800">
        {error.message}
        {error.digest ? `\n(digest: ${error.digest})` : ""}
        {error.stack ? `\n\n${error.stack.split("\n").slice(0, 8).join("\n")}` : ""}
      </pre>
      <button onClick={reset} className="mt-3 rounded bg-neutral-900 px-3 py-1.5 text-white dark:bg-neutral-100 dark:text-neutral-900">
        もう一度
      </button>
    </div>
  );
}
