async function loadPosts() {
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
            postCard.innerHTML = `
                <h2><a href="post.html?id=${post.id}">${escapeHtml(post.title)}</a></h2>
                <div class="post-meta">
                    投稿日: ${formatDate(post.created_at)}
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