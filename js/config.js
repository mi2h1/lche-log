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