"use client";
import { Composer } from "./Composer";
import { Messages, type Msg } from "./Messages";

// 投げ込み欄。新しい事柄も、完了・一部完了・保留の報告も、相談もここに投げる
export function Chat({
  log,
  pending,
  onDump,
  aiEnabled,
  onSeed,
  seeding,
  pet,
}: {
  log: Msg[];
  pending: boolean;
  onDump: (text: string) => void;
  aiEnabled: boolean;
  onSeed: (() => void) | null;
  seeding: boolean;
  pet?: React.ReactNode;
}) {
  return (
    <div className="flex h-full flex-col">
      {/* 上の5分の2ほどにキャラクター。キーボードが出ている間は隠す */}
      {pet && <div className="h-[38%] max-h-72 shrink-0 md:h-48">{pet}</div>}
      <Messages log={log} pending={pending} empty="思いついたこと、終わったこと、相談したいことを、そのまま投げ込んでください。">
        {!aiEnabled && (
          <p className="rounded bg-amber-50 p-2 text-xs text-amber-800 dark:bg-amber-950 dark:text-amber-200">
            AI キーが未設定のため、簡易分類で動いています。
          </p>
        )}
        {onSeed && (
          <button
            onClick={onSeed}
            disabled={seeding}
            className="rounded border border-neutral-300 px-3 py-1.5 text-xs disabled:opacity-50 dark:border-neutral-700"
          >
            {seeding ? "入れています…" : "初期タスク（31件）を入れる"}
          </button>
        )}
      </Messages>
      <Composer onSend={onDump} placeholder="投げ込む（例: 名刺の連絡は完了、残りは保留）" />
    </div>
  );
}
