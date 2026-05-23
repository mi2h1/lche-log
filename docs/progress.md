# 保守ログ

> 最終更新: 2026-05-23

## リポジトリ
- https://github.com/mi2h1/lche-log
- ブランチ: main のみ（直接 push）

---

## 対応ログ

### 2026-05-23 — keepalive ワークフロー修正

**問題**
keepalive ワークフローが 2026-05-05 以降毎日 failure し、Supabase プロジェクトがスリープしていた。

**原因**
`@supabase/supabase-js` の新バージョンが Node.js ネイティブ WebSocket を要求するようになったが、
ワークフローが Node.js 20（ネイティブ WebSocket 非対応）を使用していたためクライアント生成時にクラッシュ。

```
Error: Node.js 20 detected without native WebSocket support.
```

**対応**
`.github/workflows/keepalive.yml` の `node-version: '20'` → `'22'` に変更。
Node.js 22 以降はネイティブ WebSocket 対応済みのため解決。

**確認**
手動実行で成功を確認。
