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

document.addEventListener('DOMContentLoaded', loadPosts);