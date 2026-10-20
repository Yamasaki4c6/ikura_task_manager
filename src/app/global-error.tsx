"use client";

// 画面全体が落ちたときの表示。原因を報告できるよう、エラーの文面と発生箇所を出す
export default function GlobalError({ error }: { error: Error & { digest?: string } }) {
  return (
    <html lang="ja">
      <body style={{ fontFamily: "system-ui, sans-serif", padding: 16, maxWidth: 720, margin: "0 auto" }}>
        <h1 style={{ fontSize: 18 }}>画面の表示に失敗しました</h1>
        <p style={{ fontSize: 14 }}>下の文面をそのまま送ってください。</p>
        <pre style={{ whiteSpace: "pre-wrap", fontSize: 12, background: "#f4f4f5", padding: 8, borderRadius: 4 }}>
          {error.message}
          {error.digest ? `\n(digest: ${error.digest})` : ""}
          {error.stack ? `\n\n${error.stack.split("\n").slice(0, 8).join("\n")}` : ""}
        </pre>
        <button onClick={() => location.reload()} style={{ marginTop: 12, padding: "6px 12px" }}>
          再読み込み
        </button>
      </body>
    </html>
  );
}
