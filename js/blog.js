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
        const { data: posts, error } = await supabaseClient
            .from('posts')
            .select('*')
            .eq('status', 'published')
            .order('created_at', { ascending: false });
        
        if (error) throw error;
        
        loadingEl.style.display = 'none';
        
        if (posts.length === 0) {
            postsContainer.innerHTML = '<p>まだ投稿がありません。</p>';
            return;
        }
        
        posts.forEach(post => {
            const postCard = document.createElement('div');
            postCard.className = 'post-card';
            
            // Markdownをパース
            const htmlContent = marked.parse(post.content);
            
            postCard.innerHTML = `
                <h2>${escapeHtml(post.title)}</h2>
                <div class="post-content">
                    ${htmlContent}
                </div>
                <div class="post-meta">
                    ${formatDate(post.created_at)}
                </div>
            `;
            postsContainer.appendChild(postCard);
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