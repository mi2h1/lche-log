# 保守ログ

> 最終更新: 2026-07-23

## リポジトリ
- https://github.com/mi2h1/lche-log
- ブランチ: main のみ（直接 push）

---

## 対応ログ

### 2026-07-23 — keepalive ワークフローの60日自動停止対策

**問題**
GitHub から「Keep Supabase Active ワークフローが disabled になった」というメールが届いた。
`gh workflow list` で状態が `disabled_inactivity` になっていた。

**原因**
GitHub は「リポジトリに60日間コミット（push）がない」とスケジュールワークフローを自動停止する。
実行の成功/失敗とは無関係で、スケジュール実行自体はリポジトリ活動としてカウントされない。
最終コミットが 2026-05-23 で、ちょうど60日経過した 2026-07-23 に停止された。

**対応**
1. `gh workflow enable keepalive.yml` で再有効化（状態が `active` に復帰）。
2. 再発防止として `.github/workflows/keepalive.yml` に自動コミットステップを追加。
   最終コミットから50日以上経過している場合のみ `docs/keepalive-activity.txt` を更新して
   push し、リポジトリ活動を発生させ続けることで60日自動停止を回避する。
   （`permissions: contents: write` を付与）

**確認**
YAML 妥当性を確認。以降のスケジュール実行と、50日経過時の自動コミット挙動は運用で要観察。

---

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
