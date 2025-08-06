let currentPage = 1;
const postsPerPage = 10;
let allPosts = [];
let editingSimplemde;

// Marked.jsの設定（プレビュー用）
if (typeof marked !== 'undefined') {
    marked.setOptions({
        breaks: true,  // 改行を<br>に変換
        gfm: true,     // GitHub Flavored Markdown
        sanitize: false // HTMLを許可
    });
}

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
        // 通常記事とVS記録を両方取得
        const [postsResponse, vsRecordsResponse, usersResponse, categoriesResponse] = await Promise.all([
            supabaseClient
                .from('posts')
                .select('*, user_id')
                .order('created_at', { ascending: false }),
            supabaseClient
                .from('vs_records')
                .select('*')
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
                type: 'vs',
                users: user,
                categories: category,
                display_title: `${user?.display_name || user?.username || '投稿者'} vs ${record.title}`
            };
        });
        
        // 全ての投稿を統合
        const allItems = [
            ...posts.map(post => ({ ...post, type: 'blog', display_title: post.title })),
            ...vsRecordsWithUserInfo
        ].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
        
        loadingEl.style.display = 'none';
        
        if (allItems.length === 0) {
            noPostsEl.style.display = 'block';
            tableEl.style.display = 'none';
            paginationEl.style.display = 'none';
            return;
        }
        
        allPosts = allItems;
        document.getElementById('post-count').textContent = `全${allItems.length}件（記事${posts.length}件、VS記録${vsRecords.length}件）`;
        
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
        const typeText = post.type === 'vs' ? '[VS記録]' : '[記事]';
        const typeClass = post.type === 'vs' ? 'type-vs' : 'type-blog';
        
        const userId = post.user_id || post.users?.id || '-';
        const userIdShort = userId.length > 8 ? userId.substring(0, 8) + '...' : userId;
        
        row.innerHTML = `
            <td class="post-title-cell" onclick="editPost('${post.id}', '${post.type}')">
                <span class="post-type ${typeClass}">${typeText}</span>
                ${escapeHtml(post.display_title || post.title)}
            </td>
            <td><span class="status-badge ${statusClass}">${statusText}</span></td>
            <td class="post-user-cell" title="${userId}">${userIdShort}</td>
            <td class="post-date-cell">${formatDate(post.created_at)}</td>
            <td>
                <div class="post-actions">
                    <button class="btn-edit" onclick="editPost('${post.id}', '${post.type}')">編集</button>
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

async function editPost(postId, postType) {
    const post = allPosts.find(p => p.id === postId);
    if (!post) return;
    
    // 編集セクションを表示
    document.getElementById('post-list-section').style.display = 'none';
    document.getElementById('edit-section').classList.add('active');
    
    // フォームに値をセット
    document.getElementById('edit-post-id').value = post.id;
    document.getElementById('edit-post-type').value = post.type || 'blog';
    document.getElementById('edit-title').value = post.title;
    document.getElementById('edit-status').value = post.status || 'published';
    
    if (post.type === 'vs') {
        // VS記録の場合は追加フィールドを表示・設定
        showVsEditFields(true);
        document.getElementById('edit-vs-description').value = post.description || '';
        document.getElementById('edit-vs-date').value = post.record_date || '';
        
        // 画像プレビューを表示
        if (post.image_url) {
            const imagePreview = document.getElementById('edit-image-preview');
            imagePreview.src = post.image_url;
            imagePreview.style.display = 'block';
        }
        
        // カテゴリを設定
        if (post.categories) {
            document.getElementById('edit-vs-category').value = post.categories.name || '';
        }
        
        // SimpleMDEは使用しない
        if (editingSimplemde) {
            editingSimplemde.toTextArea();
            editingSimplemde = null;
        }
        document.getElementById('edit-content').style.display = 'none';
        
    } else {
        // 通常記事の場合はVS記録フィールドを隠す
        showVsEditFields(false);
        document.getElementById('edit-content').style.display = 'block';
        
        // SimpleMDEエディタを初期化
        if (editingSimplemde) {
            editingSimplemde.toTextArea();
            editingSimplemde = null;
        }
        
        editingSimplemde = new SimpleMDE({
            element: document.getElementById('edit-content'),
            spellChecker: false,
            placeholder: 'Markdownで記事を書いてください...',
            initialValue: post.content,
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
    }
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
    const postType = document.getElementById('edit-post-type').value;
    const title = document.getElementById('edit-title').value;
    const status = document.getElementById('edit-status').value;
    const submitButton = e.target.querySelector('button[type="submit"]');
    
    if (!title) {
        showMessage('タイトルを入力してください。', 'error');
        return;
    }
    
    submitButton.disabled = true;
    submitButton.textContent = '更新中...';
    
    try {
        if (postType === 'vs') {
            // VS記録の更新
            const description = document.getElementById('edit-vs-description').value;
            const recordDate = document.getElementById('edit-vs-date').value;
            
            if (!recordDate) {
                showMessage('日付を入力してください。', 'error');
                submitButton.disabled = false;
                submitButton.textContent = '更新する';
                return;
            }
            
            const { error } = await supabaseClient
                .from('vs_records')
                .update({
                    title: title,
                    description: description,
                    record_date: recordDate,
                    status: status
                })
                .eq('id', postId);
            
            if (error) throw error;
            
        } else {
            // 通常記事の更新
            const content = editingSimplemde.value();
            
            if (!content) {
                showMessage('内容を入力してください。', 'error');
                submitButton.disabled = false;
                submitButton.textContent = '更新する';
                return;
            }
            
            const { error } = await supabaseClient
                .from('posts')
                .update({
                    title: title,
                    content: content,
                    status: status
                })
                .eq('id', postId);
            
            if (error) throw error;
        }
        
        showMessage(`${postType === 'vs' ? 'VS記録' : '記事'}を更新しました！`, 'success');
        
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

// VS記録編集フィールドの表示・非表示切り替え
function showVsEditFields(show) {
    const vsFields = document.querySelectorAll('.vs-edit-field');
    vsFields.forEach(field => {
        field.style.display = show ? 'block' : 'none';
    });
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