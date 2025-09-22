-- Keepalive テーブルの作成
-- このテーブルはSupabaseの自動スリープを防ぐために定期的に更新されます

-- 既存のテーブルがある場合は削除
DROP TABLE IF EXISTS keepalive;

-- keepaliveテーブルの作成
CREATE TABLE keepalive (
    id INTEGER PRIMARY KEY DEFAULT 1,
    last_ping TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    ping_count INTEGER DEFAULT 0,
    notes TEXT DEFAULT 'GitHub Actions による自動更新',
    CONSTRAINT single_row CHECK (id = 1)  -- 1行のみを保証
);

-- 初期データの挿入
INSERT INTO keepalive (id, last_ping, ping_count, notes) 
VALUES (1, NOW(), 0, 'Initial setup');

-- RLSを有効化
ALTER TABLE keepalive ENABLE ROW LEVEL SECURITY;

-- 誰でも読み取り可能なポリシー
CREATE POLICY "Anyone can read keepalive" ON keepalive
    FOR SELECT USING (true);

-- サービスロール（GitHub Actions）のみ更新可能
CREATE POLICY "Service role can update keepalive" ON keepalive
    FOR UPDATE USING (true);

-- サービスロール（GitHub Actions）のみ挿入可能
CREATE POLICY "Service role can insert keepalive" ON keepalive
    FOR INSERT WITH CHECK (true);

-- インデックスの作成（必要に応じて）
CREATE INDEX idx_keepalive_last_ping ON keepalive(last_ping);

-- コメント追加
COMMENT ON TABLE keepalive IS 'Supabaseの自動スリープ防止用テーブル';
COMMENT ON COLUMN keepalive.last_ping IS '最後にpingを受信した時刻';
COMMENT ON COLUMN keepalive.ping_count IS 'pingの累積回数';