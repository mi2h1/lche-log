// Marked.jsの設定
marked.setOptions({
    breaks: true,  // 改行を<br>に変換
    gfm: true,     // GitHub Flavored Markdown
    sanitize: false // HTMLを許可（XSS対策は別途必要）
});

// 1ページあたりの表示件数
const PAGE_SIZE = 10;

// ページング用の状態
let usersCache = [];
let categoriesCache = [];
let oldestLoadedAt = null;   // 次ページ取得の基準（最後に表示した投稿の created_at）
let boundaryCount = 0;       // 基準時刻とちょうど同じ created_at を持つ表示済み件数
let hasMoreItems = true;
let isLoadingPage = false;
let isFirstPage = true;
const loadedItemIds = new Set();

async function loadPosts() {
    initSupabase();

    try {
        // ユーザーとカテゴリは件数が少ないため最初に一度だけ取得して使い回す
        const [usersResponse, categoriesResponse] = await Promise.all([
            supabaseClient
                .from('users')
                .select('id, username, display_name'),
            supabaseClient
                .from('categories')
                .select('id, name')
        ]);

        if (usersResponse.error) throw usersResponse.error;
        if (categoriesResponse.error) throw categoriesResponse.error;

        usersCache = usersResponse.data || [];
        categoriesCache = categoriesResponse.data || [];

        await loadNextPage();
        setupInfiniteScroll();
    } catch (error) {
        console.error('Error loading posts:', error);
        showLoadError();
    }
}

// 次のページを読み込んで表示する
// posts と vs_records をそれぞれ PAGE_SIZE 件取得し、マージした上で先頭 PAGE_SIZE 件だけを
// 表示する。次回は「最後に表示した投稿の created_at」を基準に続きを取得する
// （offset ではなく created_at 基準にすることで、読み込み中に投稿が増えても表示がズレない）
async function loadNextPage() {
    if (isLoadingPage || !hasMoreItems) return;

    isLoadingPage = true;
    showPageLoading(true);

    try {
        // 同時刻の投稿を取りこぼさないよう lte で取得し、重複は ID で除外する。
        // 除外される分（基準時刻と同時刻の表示済み件数）だけ多めに取得することで、
        // 常に PAGE_SIZE 件を表示できるようにする
        const fetchLimit = PAGE_SIZE + boundaryCount;

        const buildQuery = (table) => {
            let query = supabaseClient
                .from(table)
                .select('*')
                .eq('status', 'published')
                .order('created_at', { ascending: false })
                .limit(fetchLimit);

            if (oldestLoadedAt) {
                query = query.lte('created_at', oldestLoadedAt);
            }
            return query;
        };

        const [postsResponse, vsRecordsResponse] = await Promise.all([
            buildQuery('posts'),
            buildQuery('vs_records')
        ]);

        if (postsResponse.error) throw postsResponse.error;
        if (vsRecordsResponse.error) throw vsRecordsResponse.error;

        const posts = postsResponse.data || [];
        const vsRecords = vsRecordsResponse.data || [];

        // ユーザー情報・カテゴリ情報を結合してから時系列に並べる
        const merged = [
            ...posts.map(post => ({
                ...post,
                type: 'blog',
                users: usersCache.find(u => u.id === post.user_id)
            })),
            ...vsRecords.map(record => ({
                ...record,
                type: 'vs',
                users: usersCache.find(u => u.id === record.user_id),
                categories: categoriesCache.find(c => c.id === record.category_id)
            }))
        ]
            .filter(item => !loadedItemIds.has(item.id))
            .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

        // どちらかのテーブルが上限件数まで返した、または表示しきれない分が残っていれば続きがある
        const mayHaveMore = posts.length === fetchLimit
            || vsRecords.length === fetchLimit
            || merged.length > PAGE_SIZE;

        const items = merged.slice(0, PAGE_SIZE);

        if (items.length === 0) {
            hasMoreItems = false;
        } else {
            items.forEach(item => loadedItemIds.add(item.id));

            // 次回の基準時刻と、その時刻に該当する表示済み件数を更新する
            const newOldest = items[items.length - 1].created_at;
            const sameTimeInPage = items.filter(item => item.created_at === newOldest).length;
            boundaryCount = (newOldest === oldestLoadedAt)
                ? boundaryCount + sameTimeInPage
                : sameTimeInPage;
            oldestLoadedAt = newOldest;

            hasMoreItems = mayHaveMore;
            renderItems(items);
        }

        if (isFirstPage) {
            isFirstPage = false;

            // 最新のブログ記事で Twitter Card を更新
            const latestPost = items.find(item => item.type === 'blog');
            if (latestPost) {
                updateTwitterCard(latestPost);
            }

            if (loadedItemIds.size === 0) {
                document.getElementById('posts-container').innerHTML = '<p>まだ投稿がありません。</p>';
            }
        }

        if (hasMoreItems) {
            // 1ページ分が画面を埋めきらない場合は続けて読み込む
            maybeLoadMore();
        } else {
            showEndMessage();
        }
    } catch (error) {
        console.error('Error loading posts:', error);
        showLoadError();
    } finally {
        isLoadingPage = false;
        showPageLoading(false);
    }
}

// 投稿カードを生成して一覧に追加する
function renderItems(items) {
    const postsContainer = document.getElementById('posts-container');

    items.forEach(item => {
        const itemCard = document.createElement('div');

        if (item.type === 'vs') {
            // VS記録の表示
            itemCard.className = 'post-card vs-record';
            itemCard.innerHTML = `
                <div class="vs-title">
                    <h2>${escapeHtml(item.title)}</h2>
                </div>
                <div class="vs-image-container">
                    <img src="${item.image_url}" alt="${escapeHtml(item.title)}" class="vs-image" loading="lazy">
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
}

// 一番下までスクロールされたら次のページを読み込む
function setupInfiniteScroll() {
    const sentinel = document.getElementById('scroll-sentinel');
    if (!sentinel) return;

    if (!('IntersectionObserver' in window)) {
        // 非対応ブラウザ向けのフォールバック
        window.addEventListener('scroll', () => {
            if (window.innerHeight + window.scrollY >= document.body.offsetHeight - 300) {
                loadNextPage();
            }
        });
        return;
    }

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                loadNextPage();
            }
        });
    }, { rootMargin: '200px' });

    observer.observe(sentinel);
}

// 読み込み位置がまだ画面内にある場合は続けて読み込む
// （1ページ分では画面が埋まらず、スクロールが発生しないケースへの対応）
function maybeLoadMore() {
    const sentinel = document.getElementById('scroll-sentinel');
    if (!sentinel || !hasMoreItems) return;

    const rect = sentinel.getBoundingClientRect();
    if (rect.top < window.innerHeight) {
        // 現在の loadNextPage が終わってから次を呼ぶ
        setTimeout(loadNextPage, 0);
    }
}

function showPageLoading(visible) {
    const loadingEl = document.getElementById('loading');
    if (loadingEl) {
        loadingEl.style.display = visible ? 'block' : 'none';
    }
}

function showEndMessage() {
    const endEl = document.getElementById('list-end');
    if (endEl && loadedItemIds.size > 0) {
        endEl.style.display = 'block';
    }
}

function showLoadError() {
    // 自動での再取得を止め、手動で再試行できるようにする
    hasMoreItems = false;
    showPageLoading(false);

    const errorEl = document.getElementById('load-error');
    if (!errorEl) return;

    errorEl.style.display = 'block';

    const retryButton = document.getElementById('retry-button');
    if (retryButton) {
        retryButton.onclick = () => {
            errorEl.style.display = 'none';
            hasMoreItems = true;
            loadNextPage();
        };
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
                    clearSession();
                    window.location.reload();
                }
            };
            nav.appendChild(logoutLink);
        }
    }
}

function checkLogin() {
    // セッション判定は js/config.js の isSessionValid() に集約
    return isSessionValid();
}