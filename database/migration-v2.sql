-- 既存のデータベースをv2（ステータス機能付き）にアップグレードするSQL

-- 1. postsテーブルにstatusカラムを追加
ALTER TABLE posts 
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'published' 
CHECK (status IN ('draft', 'published', 'private'));

-- 2. 既存の全ての記事を「公開中」に設定
UPDATE posts 
SET status = 'published' 
WHERE status IS NULL;

-- 3. statusカラムにインデックスを追加（パフォーマンス向上）
CREATE INDEX IF NOT EXISTS idx_posts_status ON posts(status);

-- 4. 確認用クエリ
-- SELECT COUNT(*) as total_posts, status FROM posts GROUP BY status;