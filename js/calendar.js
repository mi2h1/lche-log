// 獲得カレンダー機能

let allRecords = [];          // 取得した獲得記録（published）
let allCategories = [];       // カテゴリ（ゲーム）一覧
let recordsByDate = {};       // 'YYYY-MM-DD' -> [record, ...]（フィルタ適用後）
let viewYear, viewMonth;      // 現在表示中の年・月（monthは1〜12）
let selectedDate = null;      // 選択中の日付キー
let activeCategory = null;    // 絞り込み中のカテゴリID（null = 全ゲーム）

const WEEKDAYS = ['日', '月', '火', '水', '木', '金', '土'];

document.addEventListener('DOMContentLoaded', async () => {
    initSupabase();
    initMobileMenu();
    loadBlogSettings();
    checkLoginStatus();

    // 今月を初期表示（JST基準）
    const now = getJSTNow();
    viewYear = now.year;
    viewMonth = now.month;

    document.getElementById('cal-prev').addEventListener('click', () => changeMonth(-1));
    document.getElementById('cal-next').addEventListener('click', () => changeMonth(1));
    document.getElementById('cal-today').addEventListener('click', () => {
        const t = getJSTNow();
        viewYear = t.year;
        viewMonth = t.month;
        selectedDate = null;
        renderCalendar();
    });

    await loadRecords();
});

// JSTの現在年月日を取得
function getJSTNow() {
    const s = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Tokyo' }); // YYYY-MM-DD
    const [y, m, d] = s.split('-').map(Number);
    return { year: y, month: m, day: d };
}

// 獲得記録を取得して日付ごとにまとめる
async function loadRecords() {
    const loadingEl = document.getElementById('cal-loading');
    const errorEl = document.getElementById('cal-error');

    try {
        const [recordsRes, categoriesRes] = await Promise.all([
            supabaseClient
                .from('vs_records')
                .select('id, title, image_url, record_date, description, category_id')
                .eq('status', 'published'),
            supabaseClient
                .from('categories')
                .select('id, name')
        ]);

        if (recordsRes.error) throw recordsRes.error;
        if (categoriesRes.error) throw categoriesRes.error;

        allCategories = categoriesRes.data || [];
        allRecords = (recordsRes.data || []).map(r => ({
            ...r,
            categoryName: (allCategories.find(c => c.id === r.category_id) || {}).name || 'その他'
        }));

        loadingEl.style.display = 'none';
        renderFilter();
        rebuildIndex();
        renderCalendar();
    } catch (error) {
        console.error('獲得記録の読み込みに失敗:', error);
        loadingEl.style.display = 'none';
        errorEl.style.display = 'block';
    }
}

// activeCategory に応じて record_date ごとにまとめ直す（日付がないものは除外）
function rebuildIndex() {
    recordsByDate = {};
    allRecords.forEach(r => {
        if (!r.record_date) return;
        if (activeCategory && r.category_id !== activeCategory) return;
        const key = r.record_date.slice(0, 10);
        (recordsByDate[key] = recordsByDate[key] || []).push(r);
    });
}

// ゲーム（カテゴリ）フィルターのボタンを描画する
function renderFilter() {
    const wrap = document.getElementById('cal-filter');
    if (!wrap) return;

    // 実際に獲得記録が存在するカテゴリのみボタン化
    const usedIds = new Set(allRecords.map(r => r.category_id));
    const cats = allCategories.filter(c => usedIds.has(c.id));

    let html = `<button type="button" class="cal-filter-btn${activeCategory === null ? ' active' : ''}" data-cat="">すべて</button>`;
    cats.forEach(c => {
        const on = activeCategory === c.id ? ' active' : '';
        html += `<button type="button" class="cal-filter-btn${on}" data-cat="${c.id}">${escapeHtml(c.name)}</button>`;
    });
    wrap.innerHTML = html;

    wrap.querySelectorAll('.cal-filter-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            activeCategory = btn.dataset.cat || null;
            selectedDate = null;
            renderFilter();
            rebuildIndex();
            renderCalendar();
        });
    });
}

function changeMonth(delta) {
    viewMonth += delta;
    if (viewMonth < 1) { viewMonth = 12; viewYear--; }
    else if (viewMonth > 12) { viewMonth = 1; viewYear++; }
    selectedDate = null;
    renderCalendar();
}

function pad(n) { return String(n).padStart(2, '0'); }
function dateKey(y, m, d) { return `${y}-${pad(m)}-${pad(d)}`; }

function renderCalendar() {
    const grid = document.getElementById('calendar-grid');
    const label = document.getElementById('cal-current');
    label.textContent = `${viewYear}年${viewMonth}月`;

    const firstWeekday = new Date(viewYear, viewMonth - 1, 1).getDay(); // 0=日
    const daysInMonth = new Date(viewYear, viewMonth, 0).getDate();
    const today = getJSTNow();

    let html = '';
    // 曜日ヘッダー
    WEEKDAYS.forEach((w, i) => {
        const cls = i === 0 ? ' sun' : (i === 6 ? ' sat' : '');
        html += `<div class="cal-weekday${cls}">${w}</div>`;
    });
    // 月初までの空セル
    for (let i = 0; i < firstWeekday; i++) {
        html += '<div class="cal-cell cal-empty"></div>';
    }
    // 各日
    for (let d = 1; d <= daysInMonth; d++) {
        const key = dateKey(viewYear, viewMonth, d);
        const records = recordsByDate[key] || [];
        const count = records.length;
        const wd = new Date(viewYear, viewMonth - 1, d).getDay();
        const isToday = (today.year === viewYear && today.month === viewMonth && today.day === d);

        let cls = 'cal-cell';
        if (wd === 0) cls += ' sun';
        if (wd === 6) cls += ' sat';
        if (count > 0) cls += ' has-records';
        if (isToday) cls += ' is-today';
        if (selectedDate === key) cls += ' is-selected';

        // 獲得したキャラ名を1件1行で表示（複数なら複数行）
        const names = records.map(r =>
            `<span class="cal-name" title="${escapeHtml(r.title)}">${escapeHtml(r.title)}</span>`
        ).join('');
        const attr = count > 0 ? ` data-date="${key}" role="button" tabindex="0"` : '';

        html += `<div class="${cls}"${attr}>
            <span class="cal-day-num">${d}</span>
            ${names ? `<div class="cal-names">${names}</div>` : ''}
        </div>`;
    }

    grid.innerHTML = html;
    grid.style.display = 'grid';

    // クリック・キーボード操作
    grid.querySelectorAll('.cal-cell[data-date]').forEach(cell => {
        cell.addEventListener('click', () => showDayDetail(cell.dataset.date));
        cell.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                showDayDetail(cell.dataset.date);
            }
        });
    });

    // 月を移動したら詳細を閉じる（選択中の日が別の月なら）
    if (!selectedDate || selectedDate.slice(0, 7) !== `${viewYear}-${pad(viewMonth)}`) {
        document.getElementById('day-detail').style.display = 'none';
    }
}

// 選択した日の獲得内容を表示
function showDayDetail(key) {
    selectedDate = key;
    renderCalendar();

    const detail = document.getElementById('day-detail');
    const records = recordsByDate[key] || [];
    const [y, m, d] = key.split('-').map(Number);

    let html = `<h2 class="day-detail-title">${y}年${m}月${d}日の獲得（${records.length}件）</h2>`;
    html += '<div class="day-detail-list">';
    records.forEach(r => {
        const img = r.image_url
            ? `<img src="${r.image_url}" alt="${escapeHtml(r.title)}" class="day-detail-img" loading="lazy">`
            : '';
        const desc = r.description
            ? `<p class="day-detail-desc">${escapeHtml(r.description)}</p>`
            : '';
        html += `<a href="article.html?type=vs&id=${r.id}" class="day-detail-item">
            ${img}
            <div class="day-detail-info">
                <span class="day-detail-cat">${escapeHtml(r.categoryName)}</span>
                <span class="day-detail-name">${escapeHtml(r.title)}</span>
                ${desc}
            </div>
        </a>`;
    });
    html += '</div>';

    detail.innerHTML = html;
    detail.style.display = 'block';
    detail.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text == null ? '' : text;
    return div.innerHTML;
}

// ===== 以下はサイドバー共通処理（blog.js と同等） =====

function initMobileMenu() {
    const menuToggle = document.getElementById('mobile-menu-toggle');
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebar-overlay');
    const closeBtn = document.getElementById('sidebar-close');

    const openSidebar = () => {
        sidebar.classList.add('active');
        overlay.classList.add('active');
    };
    const closeSidebar = () => {
        sidebar.classList.remove('active');
        overlay.classList.remove('active');
    };

    if (menuToggle) menuToggle.addEventListener('click', openSidebar);
    if (overlay) overlay.addEventListener('click', closeSidebar);
    if (closeBtn) closeBtn.addEventListener('click', closeSidebar);

    document.querySelectorAll('.sidebar-nav .nav-link').forEach(link => {
        link.addEventListener('click', closeSidebar);
    });
}

async function loadBlogSettings() {
    try {
        const cached = localStorage.getItem('blog_settings');
        if (cached) applySettings(JSON.parse(cached));

        const { data: settings, error } = await supabaseClient
            .from('blog_settings')
            .select('*')
            .single();

        if (error && error.code !== 'PGRST116') throw error;
        if (settings) {
            applySettings(settings);
            localStorage.setItem('blog_settings', JSON.stringify(settings));
        }
    } catch (error) {
        console.error('ブログ設定の読み込みに失敗:', error);
    }
}

function applySettings(settings) {
    if (settings.blog_title) {
        const t = document.querySelector('.blog-title');
        if (t) t.textContent = settings.blog_title;
        const mt = document.querySelector('.mobile-blog-title');
        if (mt) mt.textContent = settings.blog_title;
    }
    if (settings.profile_bio) {
        const b = document.querySelector('.profile-bio');
        if (b) b.innerHTML = settings.profile_bio.replace(/\n/g, '<br>');
        const mb = document.querySelector('.mobile-blog-description');
        if (mb) mb.textContent = settings.profile_bio.replace(/\n/g, ' ');
    }
    if (settings.profile_image) {
        document.querySelectorAll('.profile-image, .mobile-profile-image').forEach(img => {
            img.src = settings.profile_image;
            img.onerror = function () { this.src = 'https://via.placeholder.com/150'; };
        });
    }
    if (settings.color_primary) {
        const sidebar = document.querySelector('.sidebar');
        const mobileHeader = document.querySelector('.mobile-header');
        if (sidebar) sidebar.style.backgroundColor = settings.color_primary;
        if (mobileHeader) mobileHeader.style.backgroundColor = settings.color_primary;

        const rgb = hexToRgb(settings.color_primary);
        if (rgb && sidebar) {
            const brightness = (rgb.r * 299 + rgb.g * 587 + rgb.b * 114) / 1000;
            if (brightness > 128) {
                sidebar.style.color = '#333333';
                sidebar.style.setProperty('--link-color', '#333333');
                sidebar.style.setProperty('--link-hover-bg', 'rgba(0, 0, 0, 0.1)');
                sidebar.style.setProperty('--profile-border', 'rgba(0, 0, 0, 0.2)');
            } else {
                sidebar.style.color = '#ffffff';
                sidebar.style.setProperty('--link-color', '#ffffff');
                sidebar.style.setProperty('--link-hover-bg', 'rgba(255, 255, 255, 0.1)');
                sidebar.style.setProperty('--profile-border', 'rgba(255, 255, 255, 0.2)');
            }
        }
    }
}

function hexToRgb(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
    } : null;
}

function checkLoginStatus() {
    const isLoggedIn = isSessionValid();
    const adminLinks = document.querySelectorAll(
        '.nav-link[href="admin.html"], .nav-link[href="post.html"], .nav-link[href="settings.html"]'
    );

    if (!isLoggedIn) {
        adminLinks.forEach(link => { link.style.display = 'none'; });
    } else {
        const nav = document.querySelector('.sidebar-nav');
        if (nav && !document.getElementById('logout-link')) {
            const logoutLink = document.createElement('a');
            logoutLink.id = 'logout-link';
            logoutLink.href = '#';
            logoutLink.className = 'nav-link';
            logoutLink.textContent = 'ログアウト';
            logoutLink.style.marginTop = '20px';
            logoutLink.style.borderTop = '1px solid rgba(255,255,255,0.2)';
            logoutLink.style.paddingTop = '20px';
            logoutLink.onclick = (e) => {
                e.preventDefault();
                if (confirm('ログアウトしますか？')) {
                    clearSession();
                    window.location.reload();
                }
            };
            nav.appendChild(logoutLink);
        }
    }
}
