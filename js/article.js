// Marked.jsの設定
marked.setOptions({
    breaks: true,
    gfm: true,
    sanitize: false
});

document.addEventListener('DOMContentLoaded', function() {
    loadArticle();
    setupNavigation();
});

async function loadArticle() {
    initSupabase();
    
    // URLパラメータから記事IDとタイプを取得
    const urlParams = new URLSearchParams(window.location.search);
    const articleId = urlParams.get('id');
    const articleType = urlParams.get('type') || 'blog';
    
    if (!articleId) {
        showError('記事が指定されていません。');
        return;
    }
    
    const loadingEl = document.getElementById('loading');
    const errorEl = document.getElementById('error');
    const contentEl = document.getElementById('article-content');
    
    try {
        let article = null;
        let users = [];
        let categories = [];
        
        // ユーザーとカテゴリ情報を取得
        const [usersResponse, categoriesResponse] = await Promise.all([
            supabaseClient.from('users').select('id, username, display_name'),
            supabaseClient.from('categories').select('id, name')
        ]);
        
        users = usersResponse.data || [];
        categories = categoriesResponse.data || [];
        
        if (articleType === 'vs') {
            // VS記録を取得
            const { data, error } = await supabaseClient
                .from('vs_records')
                .select('*')
                .eq('id', articleId)
                .eq('status', 'published')
                .single();
            
            if (error || !data) {
                throw new Error('VS記録が見つかりません。');
            }
            
            article = { ...data, type: 'vs' };
        } else {
            // ブログ記事を取得
            const { data, error } = await supabaseClient
                .from('posts')
                .select('*')
                .eq('id', articleId)
                .eq('status', 'published')
                .single();
            
            if (error || !data) {
                throw new Error('記事が見つかりません。');
            }
            
            article = { ...data, type: 'blog' };
        }
        
        // ユーザー情報を結合
        const user = users.find(u => u.id === article.user_id);
        article.users = user;
        
        // カテゴリ情報を結合（VS記録の場合）
        if (article.type === 'vs') {
            const category = categories.find(c => c.id === article.category_id);
            article.categories = category;
        }
        
        loadingEl.style.display = 'none';
        displayArticle(article);
        updateMetaTags(article);
        
    } catch (error) {
        console.error('Error loading article:', error);
        loadingEl.style.display = 'none';
        showError(error.message || '記事の読み込みに失敗しました。');
    }
}

function displayArticle(article) {
    const contentEl = document.getElementById('article-content');
    const displayName = article.users?.display_name || article.users?.username || '投稿者';
    
    if (article.type === 'vs') {
        // VS記録の表示
        const vsTitle = `${displayName} vs ${escapeHtml(article.title)}`;
        
        contentEl.innerHTML = `
            <div class="article-header">
                <h1 class="article-title">${vsTitle}</h1>
                <div class="article-meta">
                    <span>投稿者: ${escapeHtml(displayName)}</span>
                    <span>対戦日: ${formatDate(article.record_date)}</span>
                    <span>投稿日: ${formatDate(article.created_at)}</span>
                </div>
            </div>
            <div class="article-content vs-article">
                <img src="${article.image_url}" alt="${escapeHtml(article.title)}" class="vs-image">
                
                <div class="vs-info">
                    <div><strong>カテゴリ:</strong> ${article.categories?.name || 'カテゴリなし'}</div>
                    <div><strong>対戦相手:</strong> ${escapeHtml(article.title)}</div>
                </div>
                
                ${article.description ? `<div style="margin-top: 2rem; text-align: left;">
                    <h3>メモ・感想</h3>
                    <p>${escapeHtml(article.description).replace(/\n/g, '<br>')}</p>
                </div>` : ''}
            </div>
        `;
    } else {
        // ブログ記事の表示
        const htmlContent = marked.parse(article.content);
        
        contentEl.innerHTML = `
            <div class="article-header">
                <h1 class="article-title">${escapeHtml(article.title)}</h1>
                <div class="article-meta">
                    <span>投稿者: ${escapeHtml(displayName)}</span>
                    <span>投稿日: ${formatDate(article.created_at)}</span>
                </div>
            </div>
            <div class="article-content">
                ${htmlContent}
            </div>
        `;
    }
    
    contentEl.style.display = 'block';
}

function updateMetaTags(article) {
    const displayName = article.users?.display_name || article.users?.username || '投稿者';
    let title, description, image;
    
    if (article.type === 'vs') {
        title = `${displayName} vs ${article.title} - 開拓日誌`;
        description = article.description || `${displayName}の${article.title}との対戦記録`;
        image = article.image_url;
    } else {
        title = `${article.title} - 開拓日誌`;
        // Markdownからテキストを抽出（簡易的）
        description = article.content.replace(/[#*`\[\]]/g, '').substring(0, 150) + '...';
        image = 'https://via.placeholder.com/1200x630'; // デフォルト画像
    }
    
    // ページタイトルを更新
    document.title = title;
    document.getElementById('page-title').textContent = title;
    
    // メタタグを更新
    document.getElementById('twitter-title').setAttribute('content', title);
    document.getElementById('twitter-description').setAttribute('content', description);
    document.getElementById('twitter-image').setAttribute('content', image);
    
    document.getElementById('og-title').setAttribute('content', title);
    document.getElementById('og-description').setAttribute('content', description);
    document.getElementById('og-image').setAttribute('content', image);
    document.getElementById('og-url').setAttribute('content', window.location.href);
}

function showError(message) {
    const errorEl = document.getElementById('error');
    errorEl.textContent = message;
    errorEl.style.display = 'block';
}

// 共通関数（blog.jsから移植）
function formatDate(dateString) {
    const date = new Date(dateString);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}/${month}/${day}`;
}

function escapeHtml(text) {
    if (typeof text !== 'string') return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}