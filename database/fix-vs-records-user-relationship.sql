-- vs_recordsとusersの外部キー関係を修正
-- Supabaseで実行してください

-- まず既存のuser_idカラムを削除（もし存在する場合）
ALTER TABLE vs_records DROP COLUMN IF EXISTS user_id;

-- 正しい外部キー制約でuser_idカランを追加
ALTER TABLE vs_records ADD COLUMN user_id UUID;

-- 外部キー制約を追加
ALTER TABLE vs_records ADD CONSTRAINT fk_vs_records_user_id 
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL;

-- インデックスを作成
CREATE INDEX idx_vs_records_user_id ON vs_records(user_id);

-- 既存のvs_recordsレコードにデフォルトユーザー（admin）を設定
UPDATE vs_records SET user_id = (SELECT id FROM users WHERE username = 'admin') WHERE user_id IS NULL;