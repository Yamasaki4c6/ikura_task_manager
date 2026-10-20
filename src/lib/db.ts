import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import * as schema from "./schema";

// 貼り付け時に紛れ込む空白や改行で接続先が壊れないよう trim する
const url = process.env.TURSO_DATABASE_URL?.trim() || undefined;
const authToken = process.env.TURSO_AUTH_TOKEN?.trim() || undefined;

// Vercel 上でローカルファイルに落ちると、書き込みはインスタンスごとに消えていく。
// 黙って動かず、設定漏れとして止める（ensureSchema がこれを投げる）
export const dbConfigError =
  !url && process.env.VERCEL
    ? "TURSO_DATABASE_URL が実行時に見えていません。Vercel の環境変数（Production）を確認し、再デプロイしてください"
    : null;

// 本番は Turso などのホスト DB、手元ではローカルファイル
const client = createClient({ url: url ?? "file:local.db", authToken });

export const db = drizzle(client, { schema });

// 接続先の確認用。秘密情報は含めない
export const dbTarget = url ? `turso:${new URL(url.replace(/^libsql:/, "https:")).host}` : "local-file";
