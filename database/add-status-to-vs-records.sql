-- vs_recordsテーブルにstatusカラムを追加
-- Supabaseで実行してください

-- statusカラムを追加（postsテーブルと同じ形式）
ALTER TABLE vs_records ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'published' 
  CHECK (status IN ('draft', 'published', 'private'));

-- インデックスを作成
CREATE INDEX IF NOT EXISTS idx_vs_records_status ON vs_records(status);

-- 既存のレコードはすべて'published'に設定
UPDATE vs_records SET status = 'published' WHERE status IS NULL;