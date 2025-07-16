async function loadPost() {
    const urlParams = new URLSearchParams(window.location.search);
    const postId = urlParams.get('id');
    
    if (!postId) {
        window.location.href = 'index.html';
        return;
    }
    
    const loadingEl = document.getElementById('loading');
    const postContainer = document.getElementById('post-container');
    
    try {
        const { data: post, error } = await supabaseClient
            .from('posts')
            .select('*')
            .eq('id', postId)
            .single();
        
        if (error) throw error;
        
        if (!post) {
            loadingEl.textContent = '記事が見つかりませんでした。';
            return;
        }
        
        document.title = `${post.title} - My Blog`;
        
        const htmlContent = marked.parse(post.content);
        
        postContainer.innerHTML = `
            <h1>${escapeHtml(post.title)}</h1>
            <div class="post-meta">
                投稿日: ${formatDate(post.created_at)}
            </div>
            <div class="post-content">
                ${htmlContent}
            </div>
        `;
        
    } catch (error) {
        console.error('Error loading post:', error);
        loadingEl.textContent = '記事の読み込みに失敗しました。';
    }
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

document.addEventListener('DOMContentLoaded', loadPost);