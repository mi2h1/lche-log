-- Supabase Storage の RLS ポリシー設定
-- vs-images バケット用

-- 認証済みユーザーがアップロード可能
CREATE POLICY "Allow authenticated users to upload" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'vs-images' AND
    auth.role() = 'authenticated'
  );

-- 誰でも画像を閲覧可能  
CREATE POLICY "Allow public read access" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'vs-images'
  );

-- 認証済みユーザーが自分のファイルを削除可能
CREATE POLICY "Allow authenticated users to delete their files" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'vs-images' AND
    auth.role() = 'authenticated'
  );