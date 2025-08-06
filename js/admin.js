let simplemde;

// Marked.jsの設定（プレビュー用）
if (typeof marked !== 'undefined') {
    marked.setOptions({
        breaks: true,  // 改行を<br>に変換
        gfm: true,     // GitHub Flavored Markdown
        sanitize: false // HTMLを許可
    });
}

document.addEventListener('DOMContentLoaded', initializeAdmin);

function initializeAdmin() {
    // ログインチェック
    if (!checkLogin()) {
        alert('ログインが必要です');
        window.location.href = 'login.html';
        return;
    }
    
    initSupabase();
    
    // 投稿タイプ切り替え
    setupPostTypeTabs();
    
    // ブログ投稿の初期化
    simplemde = new SimpleMDE({
        element: document.getElementById('content'),
        spellChecker: false,
        placeholder: 'Markdownで記事を書いてください...',
        autosave: {
            enabled: true,
            uniqueId: 'blog-post-draft',
            delay: 1000,
        },
        renderingConfig: {
            singleLineBreaks: true,  // 単一改行を<br>として扱う
            codeSyntaxHighlighting: true
        },
        previewRender: function(plainText) {
            // プレビュー時もmarkedの設定を適用
            marked.setOptions({
                breaks: true,
                gfm: true,
                sanitize: false
            });
            return marked.parse(plainText);
        }
    });
    
    document.getElementById('post-form').addEventListener('submit', handleSubmit);
    
    // 公開・下書きボタンのクリックイベント
    document.getElementById('publish-btn').addEventListener('click', (e) => {
        e.currentTarget.dataset.clicked = 'true';
    });
    document.getElementById('draft-btn').addEventListener('click', (e) => {
        e.currentTarget.dataset.clicked = 'true';
    });
    
    // VS記録機能の初期化
    if (typeof initVsRecord === 'function') {
        initVsRecord();
    }
}

// 投稿タイプタブの設定
function setupPostTypeTabs() {
    const tabs = document.querySelectorAll('.post-type-tab');
    const contents = document.querySelectorAll('.post-type-content');
    
    console.log('タブの数:', tabs.length, 'コンテンツの数:', contents.length);
    
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const type = tab.dataset.type;
            console.log('タブクリック:', type);
            
            // タブの切り替え
            tabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            
            // コンテンツの切り替え
            contents.forEach(content => {
                if (content.id === `${type}-content`) {
                    content.classList.add('active');
                    console.log('コンテンツ表示:', content.id);
                } else {
                    content.classList.remove('active');
                }
            });
        });
    });
}

async function handleSubmit(e) {
    e.preventDefault();
    
    const title = document.getElementById('title').value;
    const content = simplemde.value();
    const messageEl = document.getElementById('message');
    
    // どのボタンがクリックされたか判定
    const publishBtn = document.getElementById('publish-btn');
    const draftBtn = document.getElementById('draft-btn');
    let status = 'published';
    let clickedButton = publishBtn;
    
    if (draftBtn.dataset.clicked === 'true') {
        status = 'draft';
        clickedButton = draftBtn;
    }
    
    // クリック状態をリセット
    publishBtn.dataset.clicked = 'false';
    draftBtn.dataset.clicked = 'false';
    
    if (!title || !content) {
        showMessage('タイトルと内容を入力してください。', 'error');
        return;
    }
    
    const originalText = clickedButton.textContent;
    clickedButton.disabled = true;
    publishBtn.disabled = true;
    draftBtn.disabled = true;
    clickedButton.textContent = status === 'draft' ? '保存中...' : '投稿中...';
    
    try {
        const { data, error } = await supabaseClient
            .from('posts')
            .insert([
                {
                    title: title,
                    content: content,
                    status: status,
                    created_at: new Date().toISOString()
                }
            ])
            .select();
        
        if (error) throw error;
        
        const message = status === 'draft' ? '下書きを保存しました！' : '記事を公開しました！';
        showMessage(message, 'success');
        
        document.getElementById('title').value = '';
        simplemde.value('');
        simplemde.clearAutosavedValue();
        
        setTimeout(() => {
            window.location.href = status === 'draft' ? 'post.html' : 'index.html';
        }, 1500);
        
    } catch (error) {
        console.error('Error creating post:', error);
        showMessage('投稿に失敗しました。もう一度お試しください。', 'error');
    } finally {
        clickedButton.disabled = false;
        publishBtn.disabled = false;
        draftBtn.disabled = false;
        clickedButton.textContent = originalText;
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