// VS記録機能の実装

let selectedImage = null;
let categories = [];

// 初期化
async function initVsRecord() {
    console.log('VS記録機能を初期化中...');
    
    // 要素の存在確認
    const vsDateEl = document.getElementById('vs-date');
    if (!vsDateEl) {
        console.error('VS記録の要素が見つかりません');
        return;
    }
    
    await loadCategories();
    setupEventListeners();
    
    // デフォルトで今日の日付を設定
    vsDateEl.valueAsDate = new Date();
    console.log('VS記録機能の初期化完了');
}

// カテゴリを読み込む
async function loadCategories() {
    try {
        const { data, error } = await supabaseClient
            .from('categories')
            .select('*')
            .order('name');
        
        if (error) throw error;
        
        categories = data || [];
        updateCategorySelect();
        
    } catch (error) {
        console.error('Error loading categories:', error);
    }
}

// カテゴリセレクトボックスを更新
function updateCategorySelect() {
    const select = document.getElementById('vs-category-select');
    select.innerHTML = '<option value="">既存カテゴリから選択...</option>';
    
    categories.forEach(category => {
        const option = document.createElement('option');
        option.value = category.id;
        option.textContent = category.name;
        select.appendChild(option);
    });
}

// イベントリスナーを設定
function setupEventListeners() {
    // 画像アップロードエリア
    const uploadArea = document.getElementById('image-upload-area');
    const imageInput = document.getElementById('vs-image');
    
    uploadArea.addEventListener('click', () => imageInput.click());
    
    uploadArea.addEventListener('dragover', (e) => {
        e.preventDefault();
        uploadArea.classList.add('hover');
    });
    
    uploadArea.addEventListener('dragleave', () => {
        uploadArea.classList.remove('hover');
    });
    
    uploadArea.addEventListener('drop', (e) => {
        e.preventDefault();
        uploadArea.classList.remove('hover');
        
        const files = e.dataTransfer.files;
        if (files.length > 0 && files[0].type.startsWith('image/')) {
            handleImageSelect(files[0]);
        }
    });
    
    imageInput.addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
            handleImageSelect(e.target.files[0]);
        }
    });
    
    // カテゴリ選択/入力の連動
    const categorySelect = document.getElementById('vs-category-select');
    const categoryInput = document.getElementById('vs-category-input');
    
    categorySelect.addEventListener('change', () => {
        if (categorySelect.value) {
            categoryInput.value = '';
            categoryInput.disabled = true;
        } else {
            categoryInput.disabled = false;
        }
    });
    
    categoryInput.addEventListener('input', () => {
        if (categoryInput.value) {
            categorySelect.value = '';
            categorySelect.disabled = true;
        } else {
            categorySelect.disabled = false;
        }
    });
    
    // フォーム送信
    document.getElementById('vs-form').addEventListener('submit', handleVsSubmit);
}

// 画像選択処理
function handleImageSelect(file) {
    if (!file.type.startsWith('image/')) {
        showMessage('画像ファイルを選択してください', 'error');
        return;
    }
    
    selectedImage = file;
    
    const reader = new FileReader();
    reader.onload = (e) => {
        const preview = document.getElementById('image-preview');
        preview.src = e.target.result;
        preview.style.display = 'block';
        
        const uploadArea = document.getElementById('image-upload-area');
        uploadArea.classList.add('has-image');
        uploadArea.querySelector('p').textContent = '✅ 画像が選択されました';
    };
    reader.readAsDataURL(file);
}

// VS記録の投稿処理
async function handleVsSubmit(e) {
    e.preventDefault();
    
    if (!selectedImage) {
        showMessage('画像を選択してください', 'error');
        return;
    }
    
    const submitBtn = e.target.querySelector('button[type="submit"]');
    submitBtn.disabled = true;
    submitBtn.textContent = '投稿中...';
    
    try {
        // カテゴリの処理
        let categoryId;
        const categorySelect = document.getElementById('vs-category-select');
        const categoryInput = document.getElementById('vs-category-input');
        
        if (categorySelect.value) {
            categoryId = categorySelect.value;
        } else if (categoryInput.value) {
            // まず既存のカテゴリを確認
            const existingCategory = categories.find(cat => cat.name.toLowerCase() === categoryInput.value.toLowerCase());
            
            if (existingCategory) {
                // 既存のカテゴリを使用
                categoryId = existingCategory.id;
            } else {
                // 新規カテゴリを作成
                try {
                    const { data: newCategory, error: categoryError } = await supabaseClient
                        .from('categories')
                        .insert({ name: categoryInput.value })
                        .select()
                        .single();
                    
                    if (categoryError) {
                        // 重複エラーの場合は既存のカテゴリを取得
                        if (categoryError.code === '23505') {
                            const { data: existingCat, error: fetchError } = await supabaseClient
                                .from('categories')
                                .select('*')
                                .eq('name', categoryInput.value)
                                .single();
                            
                            if (fetchError) throw fetchError;
                            categoryId = existingCat.id;
                            
                            // ローカルリストにも追加
                            if (!categories.find(cat => cat.id === existingCat.id)) {
                                categories.push(existingCat);
                                updateCategorySelect();
                            }
                        } else {
                            throw categoryError;
                        }
                    } else {
                        categoryId = newCategory.id;
                        
                        // カテゴリリストを更新
                        categories.push(newCategory);
                        updateCategorySelect();
                    }
                } catch (error) {
                    throw new Error('カテゴリの作成に失敗しました: ' + error.message);
                }
            }
        } else {
            throw new Error('カテゴリを選択または入力してください');
        }
        
        // 画像をアップロード
        const timestamp = Date.now();
        const originalName = selectedImage.name;
        const fileExtension = originalName.substring(originalName.lastIndexOf('.'));
        const sanitizedName = sanitizeFileName(originalName);
        const fileName = `vs-records/${timestamp}-${sanitizedName}${fileExtension}`;
        
        const { data: uploadData, error: uploadError } = await supabaseClient.storage
            .from('vs-images')
            .upload(fileName, selectedImage);
        
        if (uploadError) throw uploadError;
        
        // 画像の公開URLを取得
        const { data: { publicUrl } } = supabaseClient.storage
            .from('vs-images')
            .getPublicUrl(fileName);
        
        // 現在のユーザーIDを取得
        const session = localStorage.getItem('blog_session');
        const sessionData = JSON.parse(session);
        const { data: userData, error: userError } = await supabaseClient
            .from('users')
            .select('id')
            .eq('username', sessionData.username)
            .single();
        
        if (userError) throw userError;
        
        // VS記録を保存
        const vsRecord = {
            category_id: categoryId,
            title: document.getElementById('vs-title').value,
            image_url: publicUrl,
            record_date: document.getElementById('vs-date').value,
            description: document.getElementById('vs-description').value || '',
            user_id: userData.id,
            status: 'published'
        };
        
        console.log('Inserting VS record:', vsRecord); // デバッグ用
        
        const { data, error } = await supabaseClient
            .from('vs_records')
            .insert(vsRecord)
            .select(); // 挿入されたデータを返すように変更
        
        if (error) throw error;
        
        console.log('Inserted VS record result:', data); // デバッグ用
        
        showMessage('獲得記録を投稿しました！', 'success');
        resetVsForm();
        
    } catch (error) {
        console.error('Error submitting VS record:', error);
        showMessage('投稿に失敗しました: ' + error.message, 'error');
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = '獲得記録を投稿';
    }
}

// フォームをリセット
function resetVsForm() {
    document.getElementById('vs-form').reset();
    document.getElementById('vs-date').valueAsDate = new Date();
    
    selectedImage = null;
    const preview = document.getElementById('image-preview');
    preview.style.display = 'none';
    
    const uploadArea = document.getElementById('image-upload-area');
    uploadArea.classList.remove('has-image');
    uploadArea.querySelector('p').textContent = '📸 画像をドロップまたはクリックして選択';
    
    // カテゴリ入力の有効化
    document.getElementById('vs-category-select').disabled = false;
    document.getElementById('vs-category-input').disabled = false;
}

// ファイル名をサニタイズする関数
function sanitizeFileName(fileName) {
    // ファイル拡張子を除いたベース名を取得
    const baseName = fileName.substring(0, fileName.lastIndexOf('.'));
    
    // 日本語文字、特殊文字、スペースを安全な文字に変換
    return baseName
        .replace(/[^\w\-_.]/g, '-') // 英数字、ハイフン、アンダースコア、ドット以外を'-'に変換
        .replace(/\s+/g, '-') // スペースを'-'に変換
        .replace(/-+/g, '-') // 連続する'-'を1つに
        .replace(/^-|-$/g, '') // 先頭末尾の'-'を削除
        .substring(0, 50) // 最大50文字に制限
        || 'image'; // 空文字列の場合のフォールバック
}

// メッセージ表示関数（admin.jsのものと同じ）
function showMessage(message, type) {
    const messageEl = document.getElementById('message');
    if (!messageEl) return;
    
    messageEl.textContent = message;
    messageEl.className = type;
    
    setTimeout(() => {
        messageEl.textContent = '';
        messageEl.className = '';
    }, 5000);
}