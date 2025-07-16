document.addEventListener('DOMContentLoaded', initializeSettings);

async function initializeSettings() {
    initSupabase();
    
    // 画像URLの変更を監視してプレビューを更新
    document.getElementById('profile-image').addEventListener('input', updateImagePreview);
    
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
            updateImagePreview();
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
                    profile_image: profileImage
                }]);
        }
        
        if (result.error) throw result.error;
        
        showMessage('設定を保存しました！', 'success');
        
        // localStorageにも保存（即座に反映させるため）
        localStorage.setItem('blog_settings', JSON.stringify({
            blog_title: blogTitle,
            profile_bio: profileBio,
            profile_image: profileImage
        }));
        
    } catch (error) {
        console.error('Error saving settings:', error);
        showMessage('設定の保存に失敗しました。', 'error');
    } finally {
        submitButton.disabled = false;
        submitButton.textContent = '設定を保存';
    }
}

function updateImagePreview() {
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