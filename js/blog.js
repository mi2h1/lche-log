// Marked.jsの設定
marked.setOptions({
    breaks: true,  // 改行を<br>に変換
    gfm: true,     // GitHub Flavored Markdown
    sanitize: false // HTMLを許可（XSS対策は別途必要）
});

async function loadPosts() {
    initSupabase();
    const loadingEl = document.getElementById('loading');
    const postsContainer = document.getElementById('posts-container');
    
    try {
        // ブログ記事とVS記録の両方を取得
        const [postsResponse, vsRecordsResponse, usersResponse, categoriesResponse] = await Promise.all([
            supabaseClient
                .from('posts')
                .select('*')
                .eq('status', 'published')
                .order('created_at', { ascending: false }),
            supabaseClient
                .from('vs_records')
                .select('*')
                .eq('status', 'published')
                .order('created_at', { ascending: false }),
            supabaseClient
                .from('users')
                .select('id, username, display_name'),
            supabaseClient
                .from('categories')
                .select('id, name')
        ]);
        
        if (postsResponse.error) throw postsResponse.error;
        if (vsRecordsResponse.error) throw vsRecordsResponse.error;
        if (usersResponse.error) throw usersResponse.error;
        if (categoriesResponse.error) throw categoriesResponse.error;
        
        const posts = postsResponse.data || [];
        const vsRecords = vsRecordsResponse.data || [];
        const users = usersResponse.data || [];
        const categories = categoriesResponse.data || [];
        
        // VS記録にユーザー情報とカテゴリ情報を結合
        const vsRecordsWithUserInfo = vsRecords.map(record => {
            const user = users.find(u => u.id === record.user_id);
            const category = categories.find(c => c.id === record.category_id);
            return {
                ...record,
                users: user,
                categories: category
            };
        });
        
        loadingEl.style.display = 'none';
        
        // 通常記事にもユーザー情報を結合
        const postsWithUserInfo = posts.map(post => {
            const user = users.find(u => u.id === post.user_id);
            return {
                ...post,
                type: 'blog',
                users: user
            };
        });
        
        // 両方のデータを統合してソート
        const allItems = [
            ...postsWithUserInfo,
            ...vsRecordsWithUserInfo.map(record => ({ ...record, type: 'vs' }))
        ].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
        
        if (allItems.length === 0) {
            postsContainer.innerHTML = '<p>まだ投稿がありません。</p>';
            return;
        }
        
        // 最新のブログ記事でTwitter Cardを更新
        const latestPost = posts.find(post => post.type === 'blog' || !post.type);
        if (latestPost) {
            updateTwitterCard(latestPost);
        }
        
        // 統合タイムラインを表示
        allItems.forEach(item => {
            const itemCard = document.createElement('div');
            
            if (item.type === 'vs') {
                // VS記録の表示
                itemCard.className = 'post-card vs-record';
                const displayName = item.users?.display_name || item.users?.username || '投稿者';
                itemCard.innerHTML = `
                    <div class="vs-title">
                        <h2>${escapeHtml(displayName)} vs ${escapeHtml(item.title)}</h2>
                    </div>
                    <div class="vs-image-container">
                        <img src="${item.image_url}" alt="${escapeHtml(item.title)}" class="vs-image">
                    </div>
                    <div class="vs-footer">
                        <span class="vs-category">${item.categories?.name || 'カテゴリなし'}</span>
                        <span class="vs-date">${formatDate(item.record_date)}</span>
                    </div>
                    ${item.description ? `<div class="vs-description">${escapeHtml(item.description)}</div>` : ''}
                `;
            } else {
                // ブログ記事の表示
                itemCard.className = 'post-card';
                const htmlContent = marked.parse(item.content);
                const displayName = item.users?.display_name || item.users?.username || '投稿者';
                
                itemCard.innerHTML = `
                    <h2>${escapeHtml(item.title)}</h2>
                    <div class="post-content">
                        ${htmlContent}
                    </div>
                    <div class="post-meta">
                        <span class="post-author">${escapeHtml(displayName)}</span>
                        <span class="post-date">${formatDate(item.created_at)}</span>
                    </div>
                `;
            }
            
            postsContainer.appendChild(itemCard);
        });
        
    } catch (error) {
        console.error('Error loading posts:', error);
        loadingEl.textContent = '投稿の読み込みに失敗しました。';
    }
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function updateTwitterCard(latestPost) {
    // 記事の内容から最初の200文字を説明文として取得
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = marked.parse(latestPost.content);
    const textContent = tempDiv.textContent || tempDiv.innerText || '';
    const description = textContent.substring(0, 200) + (textContent.length > 200 ? '...' : '');
    
    // 現在のブログ設定を取得
    const cachedSettings = localStorage.getItem('blog_settings');
    let blogTitle = '開拓日誌';
    let profileImage = 'https://via.placeholder.com/1200x630';
    
    if (cachedSettings) {
        const settings = JSON.parse(cachedSettings);
        blogTitle = settings.blog_title || blogTitle;
        profileImage = settings.profile_image || profileImage;
    }
    
    // Twitter Card用のタイトル（最新記事のタイトル + ブログ名）
    const cardTitle = `${latestPost.title} | ${blogTitle}`;
    
    // メタタグを更新
    updateMetaTag('twitter:title', cardTitle);
    updateMetaTag('twitter:description', description);
    updateMetaTag('twitter:image', profileImage);
    
    // Open Graph タグも更新
    updateMetaTag('og:title', cardTitle, 'property');
    updateMetaTag('og:description', description, 'property');
    updateMetaTag('og:image', profileImage, 'property');
    updateMetaTag('og:url', window.location.href, 'property');
    
    // ページタイトルはブログタイトルのみ
    document.title = blogTitle;
}

function updateMetaTag(name, content, attribute = 'name') {
    let selector = `meta[${attribute}="${name}"]`;
    let metaTag = document.querySelector(selector);
    
    if (!metaTag) {
        metaTag = document.createElement('meta');
        metaTag.setAttribute(attribute, name);
        document.head.appendChild(metaTag);
    }
    
    metaTag.setAttribute('content', content);
}

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
        document.title = settings.blog_title;
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

document.addEventListener('DOMContentLoaded', async () => {
    checkLoginStatus();
    await loadBlogSettings();
    await loadPosts();
    initMobileMenu();
});

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