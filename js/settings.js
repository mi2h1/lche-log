document.addEventListener('DOMContentLoaded', initializeSettings);

async function initializeSettings() {
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
    
    // 既存の設定を読み込む
    await loadSettings();
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
                    updated_at: new Date().toISOString()
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