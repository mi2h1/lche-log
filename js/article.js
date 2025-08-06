// Marked.jsの設定
marked.setOptions({
    breaks: true,
    gfm: true,
    sanitize: false
});

document.addEventListener('DOMContentLoaded', async function() {
    checkLoginStatus();
    await loadBlogSettings();
    loadArticle();
    initMobileMenu();
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

// ブログ設定を読み込む関数
async function loadBlogSettings() {
    initSupabase();
    
    try {
        // まずlocalStorageから読み込む（高速化のため）
        const cachedSettings = localStorage.getItem('blog_settings');
        if (cachedSettings) {
            applySettings(JSON.parse(cachedSettings));
        }
        
        // Supabaseから最新の設定を取得
        const { data: settings, error } = await supabaseClient
            .from('blog_settings')
            .select('*')
            .single();
        
        if (error && error.code !== 'PGRST116') {
            throw error;
        }
        
        if (settings) {
            applySettings(settings);
            // localStorageを更新
            localStorage.setItem('blog_settings', JSON.stringify(settings));
        }
        
    } catch (error) {
        console.error('Error loading blog settings:', error);
    }
}

function applySettings(settings) {
    if (settings.blog_title) {
        document.querySelector('.blog-title').textContent = settings.blog_title;
        // モバイルヘッダーも更新
        const mobileTitleEl = document.querySelector('.mobile-blog-title');
        if (mobileTitleEl) {
            mobileTitleEl.textContent = settings.blog_title;
        }
    }
    
    if (settings.profile_bio) {
        document.querySelector('.profile-bio').innerHTML = settings.profile_bio.replace(/\n/g, '<br>');
        // モバイルヘッダーの説明も更新（改行を削除して1行で表示）
        const mobileDescEl = document.querySelector('.mobile-blog-description');
        if (mobileDescEl) {
            // 改行をスペースに置換して、最初の行のみ表示
            const firstLine = settings.profile_bio.split('\n')[0];
            mobileDescEl.textContent = firstLine;
        }
    }
    
    if (settings.profile_image) {
        const profileImg = document.querySelector('.profile-image');
        profileImg.src = settings.profile_image;
        profileImg.onerror = function() {
            this.src = 'https://via.placeholder.com/150';
        };
        // モバイルヘッダーの画像も更新
        const mobileImg = document.querySelector('.mobile-profile-image');
        if (mobileImg) {
            mobileImg.src = settings.profile_image;
            mobileImg.onerror = function() {
                this.src = 'https://via.placeholder.com/150';
            };
        }
    }
    
    if (settings.color_primary) {
        const sidebar = document.querySelector('.sidebar');
        sidebar.style.backgroundColor = settings.color_primary;
        
        // モバイルヘッダーの背景色も更新
        const mobileHeader = document.querySelector('.mobile-header');
        if (mobileHeader) {
            mobileHeader.style.backgroundColor = settings.color_primary;
        }
        
        // 背景色の明度を計算して文字色とリンクのスタイルを自動調整
        const rgb = hexToRgb(settings.color_primary);
        const brightness = (rgb.r * 299 + rgb.g * 587 + rgb.b * 114) / 1000;
        
        if (brightness > 128) {
            // 明るい背景色の場合
            sidebar.style.color = '#333333';
            sidebar.style.setProperty('--link-color', '#333333');
            sidebar.style.setProperty('--link-hover-bg', 'rgba(0, 0, 0, 0.1)');
            sidebar.style.setProperty('--profile-border', 'rgba(0, 0, 0, 0.2)');
            if (mobileHeader) {
                mobileHeader.style.color = '#333333';
            }
        } else {
            // 暗い背景色の場合
            sidebar.style.color = '#ffffff';
            sidebar.style.setProperty('--link-color', '#ffffff');
            sidebar.style.setProperty('--link-hover-bg', 'rgba(255, 255, 255, 0.1)');
            sidebar.style.setProperty('--profile-border', 'rgba(255, 255, 255, 0.2)');
            if (mobileHeader) {
                mobileHeader.style.color = '#ffffff';
            }
        }
    }
}

function hexToRgb(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
    } : null;
}

function initMobileMenu() {
    const menuToggle = document.getElementById('mobile-menu-toggle');
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebar-overlay');
    const closeBtn = document.getElementById('sidebar-close');
    
    if (menuToggle) {
        menuToggle.addEventListener('click', () => {
            sidebar.classList.add('active');
            overlay.classList.add('active');
        });
    }
    
    // 閉じる処理をまとめる
    const closeSidebar = () => {
        sidebar.classList.remove('active');
        overlay.classList.remove('active');
    };
    
    if (overlay) {
        overlay.addEventListener('click', closeSidebar);
    }
    
    if (closeBtn) {
        closeBtn.addEventListener('click', closeSidebar);
    }
    
    // サイドバー内のリンクをクリックしたときもメニューを閉じる
    const navLinks = document.querySelectorAll('.sidebar .nav-link');
    navLinks.forEach(link => {
        link.addEventListener('click', () => {
            if (window.innerWidth <= 768) {
                closeSidebar();
            }
        });
    });
}

function checkLoginStatus() {
    const isLoggedIn = checkLogin();
    const adminLinks = document.querySelectorAll('.nav-link[href="admin.html"], .nav-link[href="post.html"], .nav-link[href="settings.html"]');
    
    if (!isLoggedIn) {
        // 未ログインの場合は管理系のリンクを非表示
        adminLinks.forEach(link => {
            link.style.display = 'none';
        });
    } else {
        // ログイン済みの場合はログアウトボタンを追加
        const nav = document.querySelector('.sidebar-nav');
        if (nav && !document.getElementById('logout-link')) {
            const logoutLink = document.createElement('a');
            logoutLink.id = 'logout-link';
            logoutLink.href = '#';
            logoutLink.className = 'nav-link';
            logoutLink.textContent = 'ログアウト';
            logoutLink.style.marginTop = '20px';
            logoutLink.style.borderTop = '1px solid rgba(255,255,255,0.2)';
            logoutLink.style.paddingTop = '20px';
            logoutLink.onclick = (e) => {
                e.preventDefault();
                if (confirm('ログアウトしますか？')) {
                    localStorage.removeItem('blog_session');
                    window.location.reload();
                }
            };
            nav.appendChild(logoutLink);
        }
    }
}

function checkLogin() {
    const session = localStorage.getItem('blog_session');
    if (!session) return false;
    
    try {
        const sessionData = JSON.parse(session);
        const loginTime = new Date(sessionData.loginTime);
        const now = new Date();
        const hoursDiff = (now - loginTime) / (1000 * 60 * 60);
        
        if (hoursDiff > 24) {
            localStorage.removeItem('blog_session');
            return false;
        }
        
        return true;
    } catch (error) {
        localStorage.removeItem('blog_session');
        return false;
    }
}