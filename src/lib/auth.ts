// 個人用ツールなので、APP_PASSCODE を知っている人だけが入れる簡易ロック
export const COOKIE = "bt_session";

export async function sessionToken(passcode: string) {
  const data = new TextEncoder().encode(`brain-tasks:${passcode}`);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hash), (b) => b.toString(16).padStart(2, "0")).join("");
}
