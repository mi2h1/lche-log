# データベースセットアップガイド

このディレクトリには、lche-log のデータベースセットアップに必要な SQL ファイルが含まれています。

## ファイル一覧

### setup.sql
新規インストール用の完全なデータベーススキーマです。以下を作成します。

| テーブル | 用途 |
|---|---|
| `users` | 認証用ユーザー（username / display_name / password_hash） |
| `posts` | 日記投稿（Markdown、status、user_id） |
| `blog_settings` | ブログ設定（タイトル・プロフィール・カラー） |
| `categories` | VS記録用カテゴリ |
| `vs_records` | 対戦記録（画像URL・カテゴリ・記録日） |

あわせて RLS ポリシーとインデックスも作成します。
既存環境にカラムだけ追加したい場合は、末尾の「9. 既存環境向けの追加SQL」の
`ALTER TABLE` をコメントアウトを外して実行してください。

### keepalive-setup.sql
Supabase の自動スリープ防止用 `keepalive` テーブルを作成します。
`.github/workflows/keepalive.yml` が毎日このテーブルを更新します。
**`DROP TABLE IF EXISTS keepalive;` を含むため、再実行すると ping_count がリセットされます。**

## セットアップ手順

### 新規インストール
1. Supabase のダッシュボードにログイン
2. SQL Editor を開く
3. `setup.sql` を実行
4. `keepalive-setup.sql` を実行
5. Storage で公開バケット `vs-images` を作成（VS記録の画像アップロードに必要）
6. 管理者ユーザーを作成（ハッシュの生成方法は `setup.sql` 内のコメント参照）

### 既存環境の更新
1. `setup.sql` の「9. 既存環境向けの追加SQL」から必要な `ALTER TABLE` のみ実行

## パスワードハッシュの生成方法

ブラウザのコンソールで以下を実行：

```javascript
const password = 'your_password_here';
const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(password))
  .then(hash => Array.from(new Uint8Array(hash))
  .map(b => b.toString(16).padStart(2, '0'))
  .join(''));
console.log(hash);
```

なお、管理者ユーザーの追加・表示名変更・パスワード変更は `settings.html` の画面からも行えます。

## 注意事項

- 本番環境では必ず強力なパスワードを使用してください
- `users` テーブルは RLS 未設定です。ログイン処理が anon key で直接 SELECT しているため、
  設定次第では `password_hash` が公開読み取り可能になります（`setup.sql` の既知課題を参照）
- 書き込み系の RLS ポリシーは `USING (true)` で全許可です。認証はアプリケーション側でのみ制御しています
- 定期的なバックアップを推奨します
