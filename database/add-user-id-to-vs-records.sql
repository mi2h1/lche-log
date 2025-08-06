-- vs_recordsテーブルにuser_idカラムを追加
-- Supabaseで実行してください

-- user_idカラムを追加（usersテーブルへの外部キー）
ALTER TABLE vs_records ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id) ON DELETE SET NULL;

-- インデックスを作成
CREATE INDEX IF NOT EXISTS idx_vs_records_user_id ON vs_records(user_id);

-- 既存のvs_recordsレコードにデフォルトユーザー（admin）を設定する場合
-- UPDATE vs_records SET user_id = (SELECT id FROM users WHERE username = 'admin') WHERE user_id IS NULL;