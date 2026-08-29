const SUPABASE_URL = window.SUPABASE_URL || 'YOUR_SUPABASE_URL';
const SUPABASE_ANON_KEY = window.SUPABASE_ANON_KEY || 'YOUR_SUPABASE_ANON_KEY';

let supabaseClient;

function initSupabase() {
    if (typeof supabase !== 'undefined') {
        supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    }
}

function formatDate(dateString) {
    const date = new Date(dateString);
    // JSTで表示 (yyyy/mm/dd形式)
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    
    // JSTに変換
    const jstDate = new Date(date.toLocaleString('en-US', { timeZone: 'Asia/Tokyo' }));
    const jstYear = jstDate.getFullYear();
    const jstMonth = String(jstDate.getMonth() + 1).padStart(2, '0');
    const jstDay = String(jstDate.getDate()).padStart(2, '0');
    
    return `${jstYear}/${jstMonth}/${jstDay}`;
}

// 現在時刻をJSTで取得する関数
function getCurrentJSTDate() {
    return new Date().toLocaleString('ja-JP', {
        timeZone: 'Asia/Tokyo',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    }).replace(/\//g, '-').replace(/,/, '');
}

// ===== セッション管理（全ページ共通） =====

// ログイン状態の保持期間（日数）。変更する場合はここだけ書き換える
const SESSION_DURATION_DAYS = 90;

// セッションを保存する（ログイン時に使用）
function saveSession(sessionData) {
    const now = new Date().toISOString();
    localStorage.setItem('blog_session', JSON.stringify({
        ...sessionData,
        loginTime: sessionData.loginTime || now,
        lastAccess: now
    }));
}

// セッションを破棄する
function clearSession() {
    localStorage.removeItem('blog_session');
}

// セッションが有効かチェックする
// 最終アクセスから SESSION_DURATION_DAYS 以内なら有効。
// 有効だった場合は最終アクセス時刻を更新するため、使い続けている限り期限は延長される。
function isSessionValid() {
    const session = localStorage.getItem('blog_session');
    if (!session) return false;

    try {
        const sessionData = JSON.parse(session);
        // lastAccess を持たない旧セッションは loginTime を基準にする
        const baseTime = new Date(sessionData.lastAccess || sessionData.loginTime);

        if (isNaN(baseTime.getTime())) {
            clearSession();
            return false;
        }

        const daysDiff = (Date.now() - baseTime.getTime()) / (1000 * 60 * 60 * 24);

        if (daysDiff > SESSION_DURATION_DAYS) {
            clearSession();
            return false;
        }

        // 有効なのでアクセス時刻を更新（期限を延長）
        sessionData.lastAccess = new Date().toISOString();
        localStorage.setItem('blog_session', JSON.stringify(sessionData));

        return true;
    } catch (error) {
        clearSession();
        return false;
    }
}
