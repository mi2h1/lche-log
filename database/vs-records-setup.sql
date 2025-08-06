-- VS記録機能追加用SQL
-- Supabaseで実行してください

-- 1. カテゴリテーブル
CREATE TABLE IF NOT EXISTS categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. VS記録テーブル
CREATE TABLE IF NOT EXISTS vs_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID REFERENCES categories(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  image_url TEXT NOT NULL,
  record_date DATE NOT NULL,
  status TEXT,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. インデックスの作成
CREATE INDEX idx_vs_records_category_id ON vs_records(category_id);
CREATE INDEX idx_vs_records_record_date ON vs_records(record_date DESC);
CREATE INDEX idx_vs_records_created_at ON vs_records(created_at DESC);

-- 4. RLS (Row Level Security) の設定
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE vs_records ENABLE ROW LEVEL SECURITY;

-- categoriesテーブル: 誰でも読み取り可能、認証ユーザーのみ書き込み可能
CREATE POLICY "Categories are viewable by everyone" ON categories
  FOR SELECT USING (true);

CREATE POLICY "Categories are insertable by authenticated users" ON categories
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Categories are updatable by authenticated users" ON categories
  FOR UPDATE USING (true);

CREATE POLICY "Categories are deletable by authenticated users" ON categories
  FOR DELETE USING (true);

-- vs_recordsテーブル: 誰でも読み取り可能、認証ユーザーのみ書き込み可能
CREATE POLICY "VS records are viewable by everyone" ON vs_records
  FOR SELECT USING (true);

CREATE POLICY "VS records are insertable by authenticated users" ON vs_records
  FOR INSERT WITH CHECK (true);

CREATE POLICY "VS records are updatable by authenticated users" ON vs_records
  FOR UPDATE USING (true);

CREATE POLICY "VS records are deletable by authenticated users" ON vs_records
  FOR DELETE USING (true);

-- 5. ストレージバケットの作成（Supabase管理画面で実行）
-- Storage > New bucket > Name: "vs-images" > Public bucket: true