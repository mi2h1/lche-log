-- lche-log データベースセットアップ用SQL
-- Supabaseで実行してください

-- 1. 記事テーブル
CREATE TABLE IF NOT EXISTS posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  status TEXT DEFAULT 'published' CHECK (status IN ('draft', 'published', 'private')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. ブログ設定テーブル
CREATE TABLE IF NOT EXISTS blog_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  blog_title TEXT,
  profile_bio TEXT,
  profile_image TEXT,
  color_primary TEXT DEFAULT '#2c3e50',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. ユーザーテーブル（認証用）
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. 既存のpostsテーブルにstatusカラムを追加する場合（すでにテーブルが存在する場合）
-- ALTER TABLE posts ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'published' CHECK (status IN ('draft', 'published', 'private'));

-- 5. 初期ユーザーの登録例
-- パスワードのハッシュ化方法：
-- 1) オンラインツール: https://emn178.github.io/online-tools/sha256.html
-- 2) ブラウザのコンソールで以下を実行:
--    await crypto.subtle.digest('SHA-256', new TextEncoder().encode('your_password')).then(hash => Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join(''))
-- 
-- 例: パスワード 'admin1234' の場合
-- INSERT INTO users (username, password_hash) VALUES ('admin', 'e9cee71ab932fde863338d08be4de9dfe39ea049bdafb342ce659ec5450b69ae');

-- 6. RLS (Row Level Security) の設定（推奨）
-- postsテーブル: 誰でも読み取り可能、認証ユーザーのみ書き込み可能
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Posts are viewable by everyone" ON posts
  FOR SELECT USING (true);

CREATE POLICY "Posts are insertable by authenticated users" ON posts
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Posts are updatable by authenticated users" ON posts
  FOR UPDATE USING (true);

CREATE POLICY "Posts are deletable by authenticated users" ON posts
  FOR DELETE USING (true);

-- blog_settingsテーブル: 誰でも読み取り可能、認証ユーザーのみ書き込み可能
ALTER TABLE blog_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Blog settings are viewable by everyone" ON blog_settings
  FOR SELECT USING (true);

CREATE POLICY "Blog settings are insertable by authenticated users" ON blog_settings
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Blog settings are updatable by authenticated users" ON blog_settings
  FOR UPDATE USING (true);

-- usersテーブル: 認証用なのでRLSは設定しない（アプリケーションレベルで制御）

-- 7. インデックスの作成（パフォーマンス向上）
CREATE INDEX idx_posts_status ON posts(status);
CREATE INDEX idx_posts_created_at ON posts(created_at DESC);
CREATE INDEX idx_users_username ON users(username);