-- lche-log データベースセットアップ用SQL
-- Supabaseで実行してください
--
-- 【注意】本番環境はこのファイルより先に構築されており、本ファイルは
-- アプリケーションコードが実際に参照しているカラムから再構成したものです。
-- 既存環境に適用する場合は「9. 既存環境向けの追加SQL」を参照してください。

-- 1. ユーザーテーブル（認証用）
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username TEXT UNIQUE NOT NULL,
  display_name TEXT,                        -- 記事カード等に表示する名前（未設定時は username を表示）
  password_hash TEXT NOT NULL,              -- SHA-256（ソルトなし）
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. 記事テーブル（日記投稿）
CREATE TABLE IF NOT EXISTS posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  content TEXT NOT NULL,                    -- Markdown
  status TEXT DEFAULT 'published' CHECK (status IN ('draft', 'published', 'private')),
  user_id UUID REFERENCES users(id),        -- 投稿者
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. ブログ設定テーブル
CREATE TABLE IF NOT EXISTS blog_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  blog_title TEXT,
  profile_bio TEXT,
  profile_image TEXT,
  color_primary TEXT DEFAULT '#2c3e50',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. カテゴリテーブル（VS記録用）
CREATE TABLE IF NOT EXISTS categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 5. VS記録テーブル（対戦記録）
CREATE TABLE IF NOT EXISTS vs_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID REFERENCES categories(id),
  title TEXT NOT NULL,
  image_url TEXT,                           -- Storage バケット vs-images の公開URL
  record_date DATE,
  status TEXT DEFAULT 'published',
  description TEXT,
  user_id UUID REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 6. 初期ユーザーの登録例
-- パスワードのハッシュ化方法：
-- 1) オンラインツール: https://emn178.github.io/online-tools/sha256.html
-- 2) ブラウザのコンソールで以下を実行:
--    await crypto.subtle.digest('SHA-256', new TextEncoder().encode('your_password')).then(hash => Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join(''))
--
-- 例: パスワード 'admin1234' の場合
-- INSERT INTO users (username, display_name, password_hash) VALUES ('admin', '管理者', 'e9cee71ab932fde863338d08be4de9dfe39ea049bdafb342ce659ec5450b69ae');

-- 7. RLS (Row Level Security) の設定
-- 認証は anon key + アプリケーション側の照合で行っているため、書き込みポリシーは
-- 実質的に全許可になっている点に注意（後述の「セキュリティ上の既知課題」参照）。
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Posts are viewable by everyone" ON posts
  FOR SELECT USING (true);

CREATE POLICY "Posts are insertable by authenticated users" ON posts
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Posts are updatable by authenticated users" ON posts
  FOR UPDATE USING (true);

CREATE POLICY "Posts are deletable by authenticated users" ON posts
  FOR DELETE USING (true);

ALTER TABLE blog_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Blog settings are viewable by everyone" ON blog_settings
  FOR SELECT USING (true);

CREATE POLICY "Blog settings are insertable by authenticated users" ON blog_settings
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Blog settings are updatable by authenticated users" ON blog_settings
  FOR UPDATE USING (true);

ALTER TABLE categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Categories are viewable by everyone" ON categories
  FOR SELECT USING (true);

CREATE POLICY "Categories are insertable by authenticated users" ON categories
  FOR INSERT WITH CHECK (true);

ALTER TABLE vs_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "VS records are viewable by everyone" ON vs_records
  FOR SELECT USING (true);

CREATE POLICY "VS records are insertable by authenticated users" ON vs_records
  FOR INSERT WITH CHECK (true);

CREATE POLICY "VS records are updatable by authenticated users" ON vs_records
  FOR UPDATE USING (true);

CREATE POLICY "VS records are deletable by authenticated users" ON vs_records
  FOR DELETE USING (true);

-- usersテーブル: ログイン時に anon key で直接 SELECT しているため RLS は未設定。
-- ★セキュリティ上の既知課題★
--   password_hash が公開読み取り可能な状態になり得る。将来的に Supabase Auth への
--   移行、または RPC + サーバーサイド照合への変更を検討すること。

-- 8. インデックスの作成（パフォーマンス向上）
CREATE INDEX IF NOT EXISTS idx_posts_status ON posts(status);
CREATE INDEX IF NOT EXISTS idx_posts_created_at ON posts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_posts_user_id ON posts(user_id);
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_vs_records_created_at ON vs_records(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_vs_records_category_id ON vs_records(category_id);
CREATE INDEX IF NOT EXISTS idx_vs_records_user_id ON vs_records(user_id);

-- 9. 既存環境向けの追加SQL（必要なものだけ実行）
-- ALTER TABLE posts ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'published' CHECK (status IN ('draft', 'published', 'private'));
-- ALTER TABLE posts ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id);
-- ALTER TABLE users ADD COLUMN IF NOT EXISTS display_name TEXT;

-- 10. Storage
-- VS記録の画像は Storage の公開バケット `vs-images` にアップロードされる
-- （js/vs-record.js）。バケットは Supabase ダッシュボードから作成すること。

-- 11. keepalive テーブルは database/keepalive-setup.sql を実行して作成する
