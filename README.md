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
  status TEXT DEFAULT 'published' CHECK (status IN ('draft', 'published', 'private')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 既存のpostsテーブルにstatusカラムを追加する場合
-- ALTER TABLE posts ADD COLUMN status TEXT DEFAULT 'published' CHECK (status IN ('draft', 'published', 'private'));

-- ブログ設定テーブル
CREATE TABLE blog_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  blog_title TEXT,
  profile_bio TEXT,
  profile_image TEXT,
  color_primary TEXT DEFAULT '#2c3e50',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ユーザーテーブル（認証用）
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 初期ユーザーの登録例
-- パスワードのハッシュ化にはオンラインツール（https://emn178.github.io/online-tools/sha256.html）を使用
-- または、ブラウザのコンソールで以下を実行：
-- await crypto.subtle.digest('SHA-256', new TextEncoder().encode('your_password')).then(hash => Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join(''))
-- 
-- 例: INSERT INTO users (username, password_hash) VALUES ('admin', 'your_hash_here');
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
- **ログイン** (`login.html`): 管理者ログイン（URLは非公開、直接アクセスのみ）
- **新規投稿** (`admin.html`): 新しい記事を投稿（Markdownエディタ付き）※要ログイン
- **ブログ設定** (`settings.html`): ブログタイトル、プロフィール、アイコンを編集 ※要ログイン

## 機能

- Markdown形式での記事作成
- SimpleMDEエディタによる快適な執筆体験
- 自動保存機能
- レスポンシブデザイン
- 完全な静的サイト（サーバー不要）
- ログイン認証機能（管理画面へのアクセス制限）

## 注意事項

- ログインページ（`login.html`）へのリンクは意図的に設置していません。URLを知っている管理者のみアクセス可能です
- Supabaseの無料プランには制限があるため、アクセス数が多い場合は有料プランを検討