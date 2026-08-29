# 保守ログ

> 最終更新: 2026-08-29

## リポジトリ
- https://github.com/mi2h1/lche-log
- ブランチ: main のみ（直接 push）

---

## 対応ログ

### 2026-08-29 — トップページを10件ずつの無限スクロールに変更

**問題**
トップページが公開済みの posts と vs_records を毎回すべて取得していたため、
投稿が増えるほど初期表示が重くなる構造だった。

**対応**
`js/blog.js` を 10件ずつ読み込む無限スクロールに変更（`PAGE_SIZE` で件数変更可）。
- 2テーブルを統合したタイムラインのため offset は使えず、`created_at` を基準にした
  キーセットページネーションを採用。posts / vs_records からそれぞれ取得してマージし、
  先頭 PAGE_SIZE 件だけを表示、最後に表示した投稿の created_at を次回の基準にする。
- 同時刻の投稿を取りこぼさないよう `lte` で取得し、重複は ID の Set で除外。
  除外される分（基準時刻と同時刻の表示済み件数 `boundaryCount`）だけ多めに取得して
  常に10件表示されるようにした。
- users / categories は件数が少ないため初回のみ取得してキャッシュ。
- IntersectionObserver で下端を検知。非対応ブラウザは scroll イベントにフォールバック。
  1ページで画面が埋まらない場合は `maybeLoadMore()` が続けて読み込む。
- 読み込み失敗時は再読み込みボタンを表示（自動再取得は停止）。
- `index.html` に読み込み表示・終端メッセージ・トリガー要素を追加。
  `.main-content` が `display: flex` のままだと横並びになるため `flex-direction: column` を追加。
- VS記録の画像に `loading="lazy"` を追加。

**確認**
Supabase クエリと DOM をスタブしたスクリプトで11パターンを検証。
投稿なし / 3件 / ちょうど10件 / 20件 / 30件 / VS記録のみ / 両テーブル混在 /
同時刻11件 / 同時刻25件 / 両テーブル同時刻15件ずつ、いずれも
ページ件数・重複なし・時系列順・網羅・終端メッセージが期待通りであることを確認。
検証中に「2ページ目以降が9件になる」「同時刻が10件以上あると1件表示されない」不具合を
発見し、上記の `boundaryCount` 方式で修正済み。
ブラウザでの実動作（スクロール検知・レイアウト）は未確認。

---

### 2026-08-29 — VS記録タイトルの「vs」表記削除とセッション保持期間の延長

**対応1: VS記録タイトルから「（ユーザー名）vs 」を削除**
VS記録のタイトルが投稿者名を接頭辞に付けて表示されていたため、タイトルのみの表示に変更。
- `js/blog.js` トップページのカード見出し
- `js/article.js` 個別記事ページの見出し / OGP の og:title
- `js/post.js` 記事管理画面の一覧タイトル（`display_title`）

投稿者名は各画面の「投稿者」欄で引き続き表示される。
個別記事ページの「対戦相手:」欄と OGP description の文言は従来どおり。

**対応2: ログイン保持期間を24時間 → 90日に延長**
同一の有効期限判定が6ファイルにコピーされていたため、`js/config.js` に集約した。
- `SESSION_DURATION_DAYS`（= 90）、`isSessionValid()`、`saveSession()`、`clearSession()` を追加
- 各ページの `checkLogin()` / `login.js` の `isLoggedIn()` は `isSessionValid()` を呼ぶだけに変更
- 判定基準を loginTime から lastAccess に変更（アクセスのたびに期限が延長されるスライディング方式）
- `lastAccess` を持たない既存セッションは `loginTime` を基準にフォールバックするため、
  デプロイ後もログインし直しは不要

期間を変えたい場合は `js/config.js` の `SESSION_DURATION_DAYS` のみ書き換える。

**確認**
`node --check` で全JSの構文確認。localStorage をスタブしたスクリプトで
新規ログイン / 89日・91日経過 / 旧形式セッション / 壊れたJSON / 不正な日付 / 未ログイン
の8ケースを検証し、期待通りの結果を確認。ブラウザでの実動作は未確認。

---

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
