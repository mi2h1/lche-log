document.addEventListener('DOMContentLoaded', initializeSettings);

async function initializeSettings() {
    // ログインチェック
    if (!checkLogin()) {
        alert('ログインが必要です');
        window.location.href = 'login.html';
        return;
    }
    
    initSupabase();
    
    // 画像URLの変更を監視してプレビューを更新
    document.getElementById('profile-image').addEventListener('input', updatePreview);
    
    // タイトルとプロフィールの変更を監視
    document.getElementById('blog-title').addEventListener('input', updatePreview);
    document.getElementById('profile-bio').addEventListener('input', updatePreview);
    
    // カラーピッカーとテキスト入力の同期
    const colorPicker = document.getElementById('sidebar-color');
    const colorText = document.getElementById('sidebar-color-text');
    
    colorPicker.addEventListener('input', (e) => {
        colorText.value = e.target.value;
        updatePreview();
    });
    
    colorText.addEventListener('input', (e) => {
        if (/^#[0-9A-F]{6}$/i.test(e.target.value)) {
            colorPicker.value = e.target.value;
            updatePreview();
        }
    });
    
    // フォームの送信イベント
    document.getElementById('settings-form').addEventListener('submit', handleSubmit);
    document.getElementById('user-settings-form').addEventListener('submit', handleUserSettings);
    document.getElementById('password-change-form').addEventListener('submit', handlePasswordChange);
    document.getElementById('user-register-form').addEventListener('submit', handleUserRegister);
    
    // 権限に基づいて表示制御
    await setupUserPermissions();
    
    // 既存の設定を読み込む
    await loadSettings();
    await loadUserSettings();
}

async function loadSettings() {
    try {
        const { data: settings, error } = await supabaseClient
            .from('blog_settings')
            .select('*')
            .single();
        
        if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
            throw error;
        }
        
        if (settings) {
            document.getElementById('blog-title').value = settings.blog_title || '';
            document.getElementById('profile-bio').value = settings.profile_bio || '';
            document.getElementById('profile-image').value = settings.profile_image || '';
            
            if (settings.color_primary) {
                document.getElementById('sidebar-color').value = settings.color_primary;
                document.getElementById('sidebar-color-text').value = settings.color_primary;
            }
            
            updatePreview();
        }
        
    } catch (error) {
        console.error('Error loading settings:', error);
        showMessage('設定の読み込みに失敗しました。', 'error');
    }
}

async function handleSubmit(e) {
    e.preventDefault();
    
    // admin権限チェック
    const session = localStorage.getItem('blog_session');
    const sessionData = JSON.parse(session);
    if (sessionData.username !== 'admin') {
        showMessage('この操作にはadmin権限が必要です', 'error');
        return;
    }
    
    const blogTitle = document.getElementById('blog-title').value;
    const profileBio = document.getElementById('profile-bio').value;
    const profileImage = document.getElementById('profile-image').value;
    const colorPrimary = document.getElementById('sidebar-color').value;
    const submitButton = e.target.querySelector('button[type="submit"]');
    
    submitButton.disabled = true;
    submitButton.textContent = '保存中...';
    
    try {
        // まず既存の設定があるか確認
        const { data: existingSettings } = await supabaseClient
            .from('blog_settings')
            .select('id')
            .single();
        
        let result;
        if (existingSettings) {
            // 更新
            result = await supabaseClient
                .from('blog_settings')
                .update({
                    blog_title: blogTitle,
                    profile_bio: profileBio,
                    profile_image: profileImage,
                    color_primary: colorPrimary,
                    updated_at: new Date().toISOString() // Supabaseは自動的にUTCで保存するのでISOStringのまま
                })
                .eq('id', existingSettings.id);
        } else {
            // 新規作成
            result = await supabaseClient
                .from('blog_settings')
                .insert([{
                    blog_title: blogTitle,
                    profile_bio: profileBio,
                    profile_image: profileImage,
                    color_primary: colorPrimary
                }]);
        }
        
        if (result.error) throw result.error;
        
        showMessage('設定を保存しました！', 'success');
        
        // localStorageにも保存（即座に反映させるため）
        localStorage.setItem('blog_settings', JSON.stringify({
            blog_title: blogTitle,
            profile_bio: profileBio,
            profile_image: profileImage,
            color_primary: colorPrimary
        }));
        
    } catch (error) {
        console.error('Error saving settings:', error);
        showMessage('設定の保存に失敗しました。', 'error');
    } finally {
        submitButton.disabled = false;
        submitButton.textContent = '設定を保存';
    }
}

function updatePreview() {
    // 画像プレビュー
    const imageUrl = document.getElementById('profile-image').value;
    const preview = document.getElementById('image-preview');
    
    if (imageUrl) {
        preview.src = imageUrl;
        preview.onerror = function() {
            preview.src = 'https://via.placeholder.com/150';
        };
    } else {
        preview.src = 'https://via.placeholder.com/150';
    }
    
    // タイトルとプロフィールのプレビュー
    const title = document.getElementById('blog-title').value || 'My Blog';
    const bio = document.getElementById('profile-bio').value || 'プロフィール';
    document.getElementById('title-preview').textContent = title;
    document.getElementById('bio-preview').textContent = bio;
    
    // サイドバーの色プレビュー
    const sidebarColor = document.getElementById('sidebar-color').value;
    const sidebarPreview = document.getElementById('sidebar-preview');
    sidebarPreview.style.backgroundColor = sidebarColor;
    
    // 背景色の明度を計算して文字色を自動調整
    const rgb = hexToRgb(sidebarColor);
    const brightness = (rgb.r * 299 + rgb.g * 587 + rgb.b * 114) / 1000;
    const textColor = brightness > 128 ? '#333333' : '#ffffff';
    sidebarPreview.style.color = textColor;
}

function hexToRgb(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
    } : null;
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

// ユーザー権限に基づく表示制御
async function setupUserPermissions() {
    try {
        const session = localStorage.getItem('blog_session');
        if (!session) return;
        
        const sessionData = JSON.parse(session);
        const username = sessionData.username;
        const isAdmin = username === 'admin'; // adminユーザーかチェック
        
        if (!isAdmin) {
            // ブログ設定の編集セクションを非表示
            const blogSettingsTitle = document.querySelector('.admin-container h2');
            const blogSettingsForm = document.getElementById('settings-form');
            
            if (blogSettingsTitle && blogSettingsTitle.textContent.includes('ブログ設定')) {
                blogSettingsTitle.style.display = 'none';
            }
            if (blogSettingsForm) {
                blogSettingsForm.style.display = 'none';
            }
            
            // ユーザー新規登録セクションを非表示
            const userRegisterSection = document.querySelector('form#user-register-form').parentElement;
            if (userRegisterSection) {
                userRegisterSection.style.display = 'none';
            }
        }
        
    } catch (error) {
        console.error('Error setting up user permissions:', error);
        console.log('Continuing with default display...');
    }
}

// 現在のユーザー設定を読み込む
async function loadUserSettings() {
    try {
        const session = localStorage.getItem('blog_session');
        if (!session) return;
        
        const sessionData = JSON.parse(session);
        const username = sessionData.username;
        
        const { data: user, error } = await supabaseClient
            .from('users')
            .select('username, display_name')
            .eq('username', username)
            .single();
        
        if (error) throw error;
        
        if (user) {
            document.getElementById('display-name').value = user.display_name || user.username;
        }
        
    } catch (error) {
        console.error('Error loading user settings:', error);
    }
}

// ユーザー設定の更新処理
async function handleUserSettings(e) {
    e.preventDefault();
    
    const displayName = document.getElementById('display-name').value.trim();
    
    if (!displayName) {
        showMessage('表示名を入力してください', 'error');
        return;
    }
    
    const submitBtn = e.target.querySelector('button[type="submit"]');
    submitBtn.disabled = true;
    submitBtn.textContent = '更新中...';
    
    try {
        const session = localStorage.getItem('blog_session');
        const sessionData = JSON.parse(session);
        const username = sessionData.username;
        
        const { data, error } = await supabaseClient
            .from('users')
            .update({ display_name: displayName })
            .eq('username', username)
            .select();
        
        if (error) throw error;
        
        showMessage('表示名を更新しました！', 'success');
        
    } catch (error) {
        console.error('Error updating user settings:', error);
        showMessage('表示名の更新に失敗しました: ' + error.message, 'error');
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = '表示名を更新';
    }
}

// パスワード変更処理
async function handlePasswordChange(e) {
    e.preventDefault();
    
    const newPassword = document.getElementById('new-password-change').value;
    const confirmPassword = document.getElementById('confirm-password-change').value;
    
    // バリデーション
    if (newPassword.length < 4) {
        showMessage('パスワードは4文字以上で入力してください', 'error');
        return;
    }
    
    if (newPassword !== confirmPassword) {
        showMessage('パスワードが一致しません', 'error');
        return;
    }
    
    const submitBtn = e.target.querySelector('button[type="submit"]');
    submitBtn.disabled = true;
    submitBtn.textContent = '変更中...';
    
    try {
        const session = localStorage.getItem('blog_session');
        const sessionData = JSON.parse(session);
        const username = sessionData.username;
        
        // パスワードをSHA-256でハッシュ化
        const passwordHash = await hashPassword(newPassword);
        
        // パスワードを更新
        const { data, error } = await supabaseClient
            .from('users')
            .update({ password_hash: passwordHash })
            .eq('username', username)
            .select();
        
        if (error) throw error;
        
        showMessage('パスワードを変更しました！', 'success');
        
        // フォームをリセット
        document.getElementById('password-change-form').reset();
        
    } catch (error) {
        console.error('Error changing password:', error);
        showMessage('パスワードの変更に失敗しました: ' + error.message, 'error');
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = 'パスワードを変更';
    }
}

// ユーザー新規登録処理
async function handleUserRegister(e) {
    e.preventDefault();
    
    // admin権限チェック
    const session = localStorage.getItem('blog_session');
    const sessionData = JSON.parse(session);
    if (sessionData.username !== 'admin') {
        showMessage('ユーザー新規登録にはadmin権限が必要です', 'error');
        return;
    }
    
    const username = document.getElementById('new-username').value.trim();
    const displayName = document.getElementById('new-display-name').value.trim();
    const password = document.getElementById('new-password').value;
    const passwordConfirm = document.getElementById('new-password-confirm').value;
    
    // バリデーション
    if (!username) {
        showMessage('ユーザー名を入力してください', 'error');
        return;
    }
    
    if (!displayName) {
        showMessage('表示名を入力してください', 'error');
        return;
    }
    
    if (password.length < 4) {
        showMessage('パスワードは4文字以上で入力してください', 'error');
        return;
    }
    
    if (password !== passwordConfirm) {
        showMessage('パスワードが一致しません', 'error');
        return;
    }
    
    const submitBtn = e.target.querySelector('button[type="submit"]');
    submitBtn.disabled = true;
    submitBtn.textContent = '作成中...';
    
    try {
        // パスワードをSHA-256でハッシュ化
        const passwordHash = await hashPassword(password);
        
        // ユーザーをデータベースに挿入
        const { data, error } = await supabaseClient
            .from('users')
            .insert({
                username: username,
                display_name: displayName,
                password_hash: passwordHash
            })
            .select();
        
        if (error) {
            if (error.code === '23505') { // unique constraint violation
                throw new Error('このユーザー名は既に使用されています');
            }
            throw error;
        }
        
        showMessage(`ユーザー「${username}」を作成しました！`, 'success');
        
        // フォームをリセット
        document.getElementById('user-register-form').reset();
        
    } catch (error) {
        console.error('Error creating user:', error);
        showMessage('ユーザーの作成に失敗しました: ' + error.message, 'error');
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = 'ユーザーを作成';
    }
}

// SHA-256ハッシュ関数
async function hashPassword(password) {
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hash = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hash));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    return hashHex;
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