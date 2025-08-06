-- usersテーブルに表示名カラムを追加
-- Supabaseで実行してください

-- 表示名カラムを追加
ALTER TABLE users ADD COLUMN IF NOT EXISTS display_name TEXT;

-- 既存のユーザーにはユーザー名をデフォルトの表示名として設定
UPDATE users SET display_name = username WHERE display_name IS NULL;

-- インデックスを作成（検索用）
CREATE INDEX IF NOT EXISTS idx_users_display_name ON users(display_name);