# 静的ブログシステム (GitHub Pages + Supabase)

このプロジェクトは、GitHub PagesとSupabaseを使用した静的ブログシステムです。

## セットアップ手順

### 1. Supabaseの設定

1. [Supabase](https://supabase.com)でプロジェクトを作成
2. 以下のSQLを実行してpostsテーブルを作成：

```sql
-- 記事テーブル
CREATE TABLE posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ブログ設定テーブル
CREATE TABLE blog_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  blog_title TEXT,
  profile_bio TEXT,
  profile_image TEXT,
  sidebar_color TEXT DEFAULT '#2c3e50',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

3. プロジェクトのURLとanon keyを取得

### 2. GitHub Secretsの設定

リポジトリの Settings → Secrets and variables → Actions で以下のSecretsを追加：

- `SUPABASE_URL`: SupabaseプロジェクトのURL
- `SUPABASE_ANON_KEY`: Supabaseのanon key

※ ローカル開発時は`js/config.js`を直接編集することも可能です。

### 3. GitHub Pagesの有効化

1. このリポジトリをGitHubにプッシュ
2. Settings → Pages → Source を "GitHub Actions" に設定
3. Actions workflowが自動的にデプロイを開始します

## 使い方

- **ホームページ** (`index.html`): ブログ記事を全文表示（サイドバー付き）
- **新規投稿** (`admin.html`): 新しい記事を投稿（Markdownエディタ付き）
- **ブログ設定** (`settings.html`): ブログタイトル、プロフィール、アイコンを編集

## 機能

- Markdown形式での記事作成
- SimpleMDEエディタによる快適な執筆体験
- 自動保存機能
- レスポンシブデザイン
- 完全な静的サイト（サーバー不要）

## 注意事項

- 管理画面は誰でもアクセスできるため、本番環境では認証機能の追加を推奨
- Supabaseの無料プランには制限があるため、アクセス数が多い場合は有料プランを検討