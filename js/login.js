document.addEventListener('DOMContentLoaded', function() {
    initSupabase();
    
    // すでにログイン済みの場合はホームへリダイレクト
    if (isLoggedIn()) {
        window.location.href = 'index.html';
    }
    
    document.getElementById('login-form').addEventListener('submit', handleLogin);
});

async function handleLogin(e) {
    e.preventDefault();
    
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    const button = document.getElementById('login-button');
    const messageEl = document.getElementById('message');
    
    // バリデーション
    if (!username || !password) {
        showMessage('ユーザーIDとパスワードを入力してください', 'error');
        return;
    }
    
    if (password.length < 4) {
        showMessage('パスワードは4文字以上で入力してください', 'error');
        return;
    }
    
    button.disabled = true;
    button.textContent = 'ログイン中...';
    
    try {
        // Supabaseからユーザー情報を取得
        const { data: users, error } = await supabaseClient
            .from('users')
            .select('*')
            .eq('username', username)
            .single();
        
        if (error || !users) {
            throw new Error('ユーザーIDまたはパスワードが正しくありません');
        }
        
        // パスワードの検証（簡易的なハッシュ比較）
        const hashedPassword = await hashPassword(password);
        
        if (users.password_hash !== hashedPassword) {
            throw new Error('ユーザーIDまたはパスワードが正しくありません');
        }
        
        // ログイン成功（セッション情報を保存）
        saveSession({
            username: users.username,
            userId: users.id
        });
        
        showMessage('ログインに成功しました', 'success');
        
        // ホームページへリダイレクト
        setTimeout(() => {
            window.location.href = 'index.html';
        }, 1000);
        
    } catch (error) {
        console.error('Login error:', error);
        showMessage(error.message || 'ログインに失敗しました', 'error');
    } finally {
        button.disabled = false;
        button.textContent = 'ログイン';
    }
}

// 簡易的なハッシュ関数（本番環境ではより安全な方法を使用すべき）
async function hashPassword(password) {
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    return hashHex;
}

function showMessage(message, type) {
    const messageEl = document.getElementById('message');
    messageEl.textContent = message;
    messageEl.className = type === 'error' ? 'error-message' : 'success-message';
    
    setTimeout(() => {
        messageEl.textContent = '';
        messageEl.className = '';
    }, 5000);
}

// ログイン状態をチェックする関数
// セッション判定は js/config.js の isSessionValid() に集約
function isLoggedIn() {
    return isSessionValid();
}

// ログアウト関数
function logout() {
    clearSession();
    window.location.href = 'index.html';
}