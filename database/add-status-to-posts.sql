-- postsテーブルにstatusカラムを追加
-- Supabaseで実行してください

-- statusカラムを追加（vs_recordsテーブルと同じ形式）
ALTER TABLE posts ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'published' 
  CHECK (status IN ('draft', 'published', 'private'));

-- インデックスを作成
CREATE INDEX IF NOT EXISTS idx_posts_status ON posts(status);

-- 既存のレコードはすべて'published'に設定
UPDATE posts SET status = 'published' WHERE status IS NULL;