-- vs_recordsテーブルの構造を確認
-- Supabaseで実行してテーブル構造を確認してください

-- テーブル構造を確認
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'vs_records' 
ORDER BY ordinal_position;

-- 最近のvs_recordsのstatusを確認
SELECT id, title, status, created_at 
FROM vs_records 
ORDER BY created_at DESC 
LIMIT 10;