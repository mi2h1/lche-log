-- サンプルデータ（開発・テスト用）

-- 1. テストユーザーの作成
-- パスワード: 'test1234' (SHA-256: 937e8d5fbb48bd4949536cd65b8d35c426b80d2f830c5c308e2cdec422ae2244)
INSERT INTO users (username, password_hash) 
VALUES ('testuser', '937e8d5fbb48bd4949536cd65b8d35c426b80d2f830c5c308e2cdec422ae2244')
ON CONFLICT (username) DO NOTHING;

-- 2. ブログ設定のサンプル
INSERT INTO blog_settings (blog_title, profile_bio, profile_image, color_primary)
VALUES (
  'My Tech Blog',
  'プログラミングと技術について書いています。\nWeb開発が専門です。',
  'https://via.placeholder.com/150',
  '#2c3e50'
)
ON CONFLICT DO NOTHING;

-- 3. サンプル記事（公開中）
INSERT INTO posts (title, content, status) VALUES 
(
  'ブログを始めました',
  '# はじめまして\n\nこのブログでは、日々の技術的な学びや発見を共有していきます。\n\n## 主なトピック\n\n- Web開発\n- プログラミング\n- 新技術の紹介\n\nよろしくお願いします！',
  'published'
),
(
  'Markdownの基本的な書き方',
  '# Markdownとは\n\nMarkdownは、文書を記述するための軽量マークアップ言語です。\n\n## 基本的な記法\n\n### 見出し\n\n```markdown\n# 見出し1\n## 見出し2\n### 見出し3\n```\n\n### リスト\n\n- 項目1\n- 項目2\n  - 項目2-1\n  - 項目2-2\n\n### コード\n\n```javascript\nfunction hello() {\n  console.log("Hello, World!");\n}\n```\n\n### リンク\n\n[Google](https://www.google.com)',
  'published'
);

-- 4. サンプル記事（下書き）
INSERT INTO posts (title, content, status) VALUES 
(
  '【下書き】次回の記事アイデア',
  '# 次回書きたいこと\n\n- Reactの新機能について\n- TypeScriptのベストプラクティス\n- テスト駆動開発の実践\n\nTODO: 詳細を追加する',
  'draft'
);

-- 5. サンプル記事（非公開）
INSERT INTO posts (title, content, status) VALUES 
(
  '【非公開】社内向けメモ',
  '# プロジェクトメモ\n\nこの記事は非公開設定のため、管理画面からのみ閲覧可能です。',
  'private'
);