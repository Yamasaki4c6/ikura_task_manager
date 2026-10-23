import type { MetadataRoute } from "next";

// ホーム画面に追加したとき、ブラウザの枠なしでアプリとして開くための設定
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "VertexPilot",
    short_name: "VertexPilot",
    description: "投げ込むだけで整理・接続してくれるタスク管理",
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#171717",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
