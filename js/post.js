let currentPage = 1;
const postsPerPage = 10;
let allPosts = [];
let editingSimplemde;

document.addEventListener('DOMContentLoaded', initializePostManagement);

async function initializePostManagement() {
    // ログインチェック
    if (!checkLogin()) {
        alert('ログインが必要です');
        window.location.href = 'login.html';
        return;
    }
    
    initSupabase();
    
    // 編集フォームのイベントリスナー
    document.getElementById('edit-form').addEventListener('submit', handleUpdate);
    
    // 記事一覧を読み込む
    await loadPosts();
}

async function loadPosts() {
    const loadingEl = document.getElementById('loading');
    const tableEl = document.getElementById('post-list-table');
    const noPostsEl = document.getElementById('no-posts');
    const paginationEl = document.getElementById('pagination');
    
    try {
        const { data: posts, error } = await supabaseClient
            .from('posts')
            .select('*')
            .order('created_at', { ascending: false });
        
        if (error) throw error;
        
        loadingEl.style.display = 'none';
        
        if (!posts || posts.length === 0) {
            noPostsEl.style.display = 'block';
            tableEl.style.display = 'none';
            paginationEl.style.display = 'none';
            return;
        }
        
        allPosts = posts;
        document.getElementById('post-count').textContent = `全${posts.length}件`;
        
        displayPosts();
        
    } catch (error) {
        console.error('Error loading posts:', error);
        loadingEl.textContent = '記事の読み込みに失敗しました。';
    }
}

function displayPosts() {
    const tableEl = document.getElementById('post-list-table');
    const tbody = document.getElementById('post-list-body');
    const paginationEl = document.getElementById('pagination');
    
    // ページネーション計算
    const totalPages = Math.ceil(allPosts.length / postsPerPage);
    const startIndex = (currentPage - 1) * postsPerPage;
    const endIndex = startIndex + postsPerPage;
    const currentPosts = allPosts.slice(startIndex, endIndex);
    
    // テーブルをクリア
    tbody.innerHTML = '';
    
    // 記事を表示
    currentPosts.forEach(post => {
        const row = document.createElement('tr');
        const statusText = getStatusText(post.status || 'published');
        const statusClass = `status-${post.status || 'published'}`;
        
        row.innerHTML = `
            <td class="post-title-cell" onclick="editPost('${post.id}')">${escapeHtml(post.title)}</td>
            <td><span class="status-badge ${statusClass}">${statusText}</span></td>
            <td class="post-date-cell">${formatDate(post.created_at)}</td>
            <td>
                <div class="post-actions">
                    <button class="btn-edit" onclick="editPost('${post.id}')">編集</button>
                </div>
            </td>
        `;
        tbody.appendChild(row);
    });
    
    // ページネーションを作成
    createPagination(totalPages);
    
    tableEl.style.display = 'table';
    paginationEl.style.display = totalPages > 1 ? 'flex' : 'none';
}

function createPagination(totalPages) {
    const paginationEl = document.getElementById('pagination');
    paginationEl.innerHTML = '';
    
    // 前へボタン
    const prevBtn = document.createElement('button');
    prevBtn.textContent = '前へ';
    prevBtn.disabled = currentPage === 1;
    prevBtn.onclick = () => {
        if (currentPage > 1) {
            currentPage--;
            displayPosts();
        }
    };
    paginationEl.appendChild(prevBtn);
    
    // ページ番号ボタン
    const maxButtons = 5;
    let startPage = Math.max(1, currentPage - Math.floor(maxButtons / 2));
    let endPage = Math.min(totalPages, startPage + maxButtons - 1);
    
    if (endPage - startPage < maxButtons - 1) {
        startPage = Math.max(1, endPage - maxButtons + 1);
    }
    
    if (startPage > 1) {
        const firstBtn = document.createElement('button');
        firstBtn.textContent = '1';
        firstBtn.onclick = () => {
            currentPage = 1;
            displayPosts();
        };
        paginationEl.appendChild(firstBtn);
        
        if (startPage > 2) {
            const dots = document.createElement('span');
            dots.textContent = '...';
            dots.style.padding = '0 0.5rem';
            paginationEl.appendChild(dots);
        }
    }
    
    for (let i = startPage; i <= endPage; i++) {
        const pageBtn = document.createElement('button');
        pageBtn.textContent = i;
        pageBtn.className = i === currentPage ? 'active' : '';
        pageBtn.onclick = () => {
            currentPage = i;
            displayPosts();
        };
        paginationEl.appendChild(pageBtn);
    }
    
    if (endPage < totalPages) {
        if (endPage < totalPages - 1) {
            const dots = document.createElement('span');
            dots.textContent = '...';
            dots.style.padding = '0 0.5rem';
            paginationEl.appendChild(dots);
        }
        
        const lastBtn = document.createElement('button');
        lastBtn.textContent = totalPages;
        lastBtn.onclick = () => {
            currentPage = totalPages;
            displayPosts();
        };
        paginationEl.appendChild(lastBtn);
    }
    
    // 次へボタン
    const nextBtn = document.createElement('button');
    nextBtn.textContent = '次へ';
    nextBtn.disabled = currentPage === totalPages;
    nextBtn.onclick = () => {
        if (currentPage < totalPages) {
            currentPage++;
            displayPosts();
        }
    };
    paginationEl.appendChild(nextBtn);
    
    // ページ情報
    const pageInfo = document.createElement('span');
    pageInfo.className = 'pagination-info';
    pageInfo.textContent = `${currentPage} / ${totalPages}`;
    pageInfo.style.marginLeft = '1rem';
    paginationEl.appendChild(pageInfo);
}

async function editPost(postId) {
    const post = allPosts.find(p => p.id === postId);
    if (!post) return;
    
    // 編集セクションを表示
    document.getElementById('post-list-section').style.display = 'none';
    document.getElementById('edit-section').classList.add('active');
    
    // フォームに値をセット
    document.getElementById('edit-post-id').value = post.id;
    document.getElementById('edit-title').value = post.title;
    document.getElementById('edit-status').value = post.status || 'published';
    
    // SimpleMDEエディタを初期化
    if (editingSimplemde) {
        editingSimplemde.toTextArea();
        editingSimplemde = null;
    }
    
    editingSimplemde = new SimpleMDE({
        element: document.getElementById('edit-content'),
        spellChecker: false,
        placeholder: 'Markdownで記事を書いてください...',
        initialValue: post.content
    });
}

function showPostList() {
    document.getElementById('edit-section').classList.remove('active');
    document.getElementById('post-list-section').style.display = 'block';
    
    if (editingSimplemde) {
        editingSimplemde.toTextArea();
        editingSimplemde = null;
    }
}

async function handleUpdate(e) {
    e.preventDefault();
    
    const postId = document.getElementById('edit-post-id').value;
    const title = document.getElementById('edit-title').value;
    const content = editingSimplemde.value();
    const status = document.getElementById('edit-status').value;
    const submitButton = e.target.querySelector('button[type="submit"]');
    
    if (!title || !content) {
        showMessage('タイトルと内容を入力してください。', 'error');
        return;
    }
    
    submitButton.disabled = true;
    submitButton.textContent = '更新中...';
    
    try {
        const { error } = await supabaseClient
            .from('posts')
            .update({
                title: title,
                content: content,
                status: status
            })
            .eq('id', postId);
        
        if (error) throw error;
        
        showMessage('記事を更新しました！', 'success');
        
        // リストを更新
        await loadPosts();
        
        // 一覧に戻る
        setTimeout(() => {
            showPostList();
        }, 1500);
        
    } catch (error) {
        console.error('Error updating post:', error);
        showMessage('更新に失敗しました。', 'error');
    } finally {
        submitButton.disabled = false;
        submitButton.textContent = '更新する';
    }
}

function getStatusText(status) {
    switch (status) {
        case 'published':
            return '公開中';
        case 'draft':
            return '下書き';
        case 'private':
            return '非公開';
        default:
            return '公開中';
    }
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
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