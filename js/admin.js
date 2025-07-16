let simplemde;

document.addEventListener('DOMContentLoaded', () => {
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2';
    script.onload = initializeAdmin;
    document.head.appendChild(script);
});

function initializeAdmin() {
    simplemde = new SimpleMDE({
        element: document.getElementById('content'),
        spellChecker: false,
        placeholder: 'Markdownで記事を書いてください...',
        autosave: {
            enabled: true,
            uniqueId: 'blog-post-draft',
            delay: 1000,
        }
    });
    
    document.getElementById('post-form').addEventListener('submit', handleSubmit);
}

async function handleSubmit(e) {
    e.preventDefault();
    
    const title = document.getElementById('title').value;
    const content = simplemde.value();
    const submitButton = e.target.querySelector('button[type="submit"]');
    const messageEl = document.getElementById('message');
    
    if (!title || !content) {
        showMessage('タイトルと内容を入力してください。', 'error');
        return;
    }
    
    submitButton.disabled = true;
    submitButton.textContent = '投稿中...';
    
    try {
        const { data, error } = await supabaseClient
            .from('posts')
            .insert([
                {
                    title: title,
                    content: content,
                    created_at: new Date().toISOString()
                }
            ])
            .select();
        
        if (error) throw error;
        
        showMessage('投稿が完了しました！', 'success');
        
        document.getElementById('title').value = '';
        simplemde.value('');
        simplemde.clearAutosavedValue();
        
        setTimeout(() => {
            window.location.href = 'index.html';
        }, 1500);
        
    } catch (error) {
        console.error('Error creating post:', error);
        showMessage('投稿に失敗しました。もう一度お試しください。', 'error');
    } finally {
        submitButton.disabled = false;
        submitButton.textContent = '投稿する';
    }
}

function showMessage(message, type) {
    const messageEl = document.getElementById('message');
    messageEl.textContent = message;
    messageEl.className = type;
    
    setTimeout(() => {
        messageEl.textContent = '';
        messageEl.className = '';
    }, 5000);
}