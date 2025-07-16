async function loadPosts() {
    initSupabase();
    const loadingEl = document.getElementById('loading');
    const postsContainer = document.getElementById('posts-container');
    
    try {
        const { data: posts, error } = await supabaseClient
            .from('posts')
            .select('*')
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
                <div class="post-meta">
                    投稿日: ${formatDate(post.created_at)}
                </div>
                <div class="post-content">
                    ${htmlContent}
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
    }
    
    if (settings.profile_bio) {
        document.querySelector('.profile-bio').innerHTML = settings.profile_bio.replace(/\n/g, '<br>');
    }
    
    if (settings.profile_image) {
        const profileImg = document.querySelector('.profile-image');
        profileImg.src = settings.profile_image;
        profileImg.onerror = function() {
            this.src = 'https://via.placeholder.com/150';
        };
    }
    
    if (settings.color_primary) {
        const sidebar = document.querySelector('.sidebar');
        sidebar.style.backgroundColor = settings.color_primary;
        
        // 背景色の明度を計算して文字色とリンクのスタイルを自動調整
        const rgb = hexToRgb(settings.color_primary);
        const brightness = (rgb.r * 299 + rgb.g * 587 + rgb.b * 114) / 1000;
        
        if (brightness > 128) {
            // 明るい背景色の場合
            sidebar.style.color = '#333333';
            sidebar.style.setProperty('--link-color', '#333333');
            sidebar.style.setProperty('--link-hover-bg', 'rgba(0, 0, 0, 0.1)');
            sidebar.style.setProperty('--profile-border', 'rgba(0, 0, 0, 0.2)');
        } else {
            // 暗い背景色の場合
            sidebar.style.color = '#ffffff';
            sidebar.style.setProperty('--link-color', '#ffffff');
            sidebar.style.setProperty('--link-hover-bg', 'rgba(255, 255, 255, 0.1)');
            sidebar.style.setProperty('--profile-border', 'rgba(255, 255, 255, 0.2)');
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
    await loadBlogSettings();
    await loadPosts();
});