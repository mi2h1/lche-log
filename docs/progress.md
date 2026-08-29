# 保守ログ

> 最終更新: 2026-08-29

## リポジトリ
- https://github.com/mi2h1/lche-log
- ブランチ: main のみ（直接 push）

---

## 対応ログ

### 2026-08-29 — ドキュメントと実スキーマのズレを修正

**問題**
ドキュメントが実装から乖離していた。
- `CLAUDE.md` のファイル構成に `article.html` / `js/article.js` / `js/vs-record.js` /
  `js/config-template.js` が未記載。逆に存在しない `migration-v2.sql` /
  `sample-data.sql` / `vs-records-setup.sql` が記載されていた（`7b89bd5` で削除済）。
- `database/setup.sql` に `posts.user_id` と `users.display_name` の定義がなく、
  `categories` / `vs_records` の DDL がどこにも残っていなかった。
  この SQL だけでは現行アプリが動かない状態。
- Storage の公開バケット `vs-images` がどのドキュメントにも記載なし。

**対応**
1. `database/setup.sql` を実スキーマに合わせて再構成。
   `users.display_name`・`posts.user_id`・`categories`・`vs_records` を追加し、
   RLS ポリシーとインデックス、既存環境向けの `ALTER TABLE` 例も記載。
   ※本番 DB は先行して構築済みのため、内容はアプリのクエリから再構成したもの。
2. `database/README.md` を実在ファイル（setup.sql / keepalive-setup.sql）に合わせて書き直し。
   `vs-images` バケット作成手順を追加。
3. `CLAUDE.md` のファイル構成・テーブル定義・設定手順を実態に更新。
   deploy.yml による env-config.js 生成の仕組みと、認証まわりの既知課題を明記。
4. `README.md` のインライン SQL（古い定義の二重管理）を削除し、`database/` を参照する形に変更。

**残課題**
- `users` テーブルの RLS 未設定により `password_hash` が公開読み取り可能になり得る。
  Supabase ダッシュボードでの実設定確認と、Supabase Auth 等への移行検討が必要。
- keepalive の60日自動停止対策（自動コミット）は最終コミットから50日経過時に初回発火。
  2026-08-29 時点で未発火のため、引き続き要観察。

---

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
