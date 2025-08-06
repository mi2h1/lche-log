-- postsテーブルにuser_idカラムを追加
-- Supabaseで実行してください

-- user_idカラムを追加（vs_recordsテーブルと同じ形式）
ALTER TABLE posts ADD COLUMN IF NOT EXISTS user_id UUID;

-- 外部キー制約を追加
ALTER TABLE posts ADD CONSTRAINT fk_posts_user_id 
  FOREIGN KEY (user_id) REFERENCES users(id);

-- インデックスを作成
CREATE INDEX IF NOT EXISTS idx_posts_user_id ON posts(user_id);

-- 既存のレコードにadminユーザーのIDを設定（必要に応じて調整）
-- まずadminユーザーのIDを取得して、既存の記事に設定
UPDATE posts 
SET user_id = (SELECT id FROM users WHERE username = 'admin' LIMIT 1)
WHERE user_id IS NULL;