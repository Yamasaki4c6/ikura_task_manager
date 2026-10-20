"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function LoginPage() {
  const [passcode, setPasscode] = useState("");
  const [error, setError] = useState(false);
  const router = useRouter();
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch("/api/login", { method: "POST", body: JSON.stringify({ passcode }) });
    if (res.ok) router.replace("/");
    else setError(true);
  }
  return (
    <form onSubmit={submit} className="m-auto flex w-72 flex-col gap-3 p-4">
      <h1 className="text-lg font-bold">ログイン</h1>
      <input
        type="password"
        value={passcode}
        onChange={(e) => setPasscode(e.target.value)}
        placeholder="パスコード"
        className="rounded border border-neutral-300 bg-transparent px-3 py-2 dark:border-neutral-700"
      />
      {error && <p className="text-sm text-red-600">パスコードが違います</p>}
      <button className="rounded bg-neutral-900 px-3 py-2 text-white dark:bg-neutral-100 dark:text-neutral-900">入る</button>
    </form>
  );
}
