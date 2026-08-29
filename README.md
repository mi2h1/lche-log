# 静的ブログシステム (GitHub Pages + Supabase)

このプロジェクトは、GitHub Pages と Supabase を使用した静的ブログシステムです。
日記投稿と VS記録（対戦記録）を1つのタイムラインに統合して表示します。

## セットアップ手順

### 1. Supabase の設定

1. [Supabase](https://supabase.com) でプロジェクトを作成
2. SQL Editor で以下を実行
   - `database/setup.sql` … posts / users / blog_settings / categories / vs_records
   - `database/keepalive-setup.sql` … 自動スリープ防止用の keepalive テーブル
3. Storage で**公開バケット `vs-images`** を作成（VS記録の画像アップロード先）
4. 管理者ユーザーを登録（手順は `database/README.md` を参照）
5. プロジェクトの URL と anon key を取得

スキーマの詳細・パスワードハッシュの生成方法は `database/README.md` にまとめています。

### 2. GitHub Secrets の設定

リポジトリの Settings → Secrets and variables → Actions で以下を追加：

- `SUPABASE_URL`: Supabase プロジェクトの URL
- `SUPABASE_ANON_KEY`: Supabase の anon key

デプロイ時に `.github/workflows/deploy.yml` がこの2つを `js/config-template.js` に
差し込んで `js/env-config.js` を生成し、各 HTML に読み込み用の `<script>` を挿入します。
`js/env-config.js` は `.gitignore` 済みで、認証情報をリポジトリに含めません。

ローカルで動かす場合のみ、同じ内容の `js/env-config.js` を手元に作成してください。

### 3. GitHub Pages の有効化

1. このリポジトリを GitHub にプッシュ
2. Settings → Pages → Source を "GitHub Actions" に設定
3. `main` への push で自動デプロイされます

## 使い方

| ページ | 内容 |
|---|---|
| `index.html` | トップ。日記とVS記録のカード一覧 |
| `article.html?id=...` | 個別記事ページ |
| `login.html` | 管理者ログイン（URLは非公開、直接アクセスのみ） |
| `admin.html` | 新規投稿（日記 / VS記録をタブで切替）※要ログイン |
| `post.html` | 投稿の一覧・編集・削除 ※要ログイン |
| `settings.html` | ブログ設定・表示名・パスワード・ユーザー追加 ※要ログイン |

## 機能

- Markdown 形式での記事作成（SimpleMDE エディタ・自動保存）
- 記事ステータス管理（下書き / 公開 / 非公開）
- VS記録の投稿（画像アップロード・カテゴリ管理）
- ブログタイトル・プロフィール・プライマリカラーのカスタマイズ
- レスポンシブデザイン
- 完全な静的サイト（サーバー不要）
- ログイン認証（管理画面へのアクセス制限）
- Supabase の自動スリープ防止（GitHub Actions で毎日 keepalive を更新）

## 注意事項

- ログインページ（`login.html`）へのリンクは意図的に設置していません。URL を知っている管理者のみアクセス可能です
- 認証は anon key を使ったクライアント側の照合です。セキュリティ上の既知課題は `CLAUDE.md` / `database/setup.sql` を参照してください
- Supabase の無料プランには制限があるため、アクセス数が多い場合は有料プランを検討してください
- 保守の経緯は `docs/progress.md` に記録しています
