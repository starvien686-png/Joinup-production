import { I18n } from '../services/i18n.js';
import api from '../utils/api.js';

export const renderActivities = async () => {
    const app = document.getElementById('app');
    const userProfileStr = localStorage.getItem('userProfile');
    const user = userProfileStr ? JSON.parse(userProfileStr) : null;

    let upcoming = [];
    let myStatuses = {};
    try {
        if (user && user.email) {
            try {
                const statusData = await api.fetch(`/api/v1/join/my-statuses?user_email=${encodeURIComponent(user.email)}`, { idempotency: false });
                if (statusData.success) {
                    myStatuses = statusData.data || {};
                }
            } catch (statusErr) {
                console.warn('Could not fetch join statuses:', statusErr);
            }
        }

        const [actRes, carpoolRes, studyRes, hangoutRes, housingRes] = await Promise.all([
            fetch('/activities'),
            fetch('/carpools'),
            fetch('/studies'),
            fetch('/hangouts'),
            fetch('/housing')
        ]);

        const [activities, carpools, studies, hangouts, housings] = await Promise.all([
            actRes.json(), carpoolRes.json(), studyRes.json(), hangoutRes.json(), housingRes.json()
        ]);

        let dbPosts = [
            ...(Array.isArray(activities) ? activities : []).map(p => ({ ...p, category: p.category || 'sports' })),
            ...(Array.isArray(carpools) ? carpools : []).map(p => ({
                ...p, category: 'carpool', people_needed: p.available_seats,
                event_time: p.departure_time, location: p.departure_loc
            })),
            ...(Array.isArray(studies) ? studies : []).map(p => ({ ...p, category: 'study' })),
            ...(Array.isArray(hangouts) ? hangouts : []).map(p => ({
                ...p, category: p.category || 'travel', location: p.meeting_location
            })),
            ...(Array.isArray(housings) ? housings : []).map(p => ({ ...p, category: 'housing' }))
        ];

        const isPostActive = (p) => {
            if (p.status === 'cancelled' || p.status === 'success' || p.status === 'expired' || p.status === 'full') return false;
            const refDateStr = p.deadline || p.event_time || p.departure_time;
            if (refDateStr) {
                const eventDate = new Date(refDateStr);
                if (eventDate < new Date()) return false;
            }
            if (p.people_needed !== undefined && p.people_needed <= 0) return false;
            return true;
        };

        const availablePosts = dbPosts.filter(p => isPostActive(p));
        const allowedCats = [
            'carpool', 'travel', 'study', 'housing', 'groupbuy', 'sports',
            'Food', 'Outdoor', 'Arts', 'Entertainment', 'Shopping', 'Sports', 'Nightlife', 'food'
        ];
        const targetPosts = availablePosts.filter(p => allowedCats.includes(p.category));

        upcoming = targetPosts.map(p => ({
            ...p,
            id: p.id, category: p.category, title: p.title,
            sportType: p.sport_type, peopleNeeded: p.people_needed,
            eventTime: p.event_time || p.departure_time || p.deadline,
            location: p.location || p.destination || p.meeting_location,
            deadline: p.deadline, description: p.description, hostEmail: p.host_email,
            hostName: p.host_name || 'Host', hostDept: p.host_dept || '', status: 'open',
            createdAt: p.created_at
        }));
        window._cachedActivitiesPosts = upcoming;
    } catch (error) {
        console.error("Gagal load Activities:", error);
    }

    upcoming = upcoming.sort((a, b) => new Date(b.createdAt || b.eventTime || 0) - new Date(a.createdAt || a.eventTime || 0));

    const getLocTrans = (loc) => {
        const map = {
            '體育健康中心 (1F 健身房)': 'sports.loc.gym_1f', '體育健康中心 (2F 綜合球場)': 'sports.loc.gym_2f',
            '體育健康中心 (3F 羽球場)': 'sports.loc.gym_3f', '游泳池 (室內)': 'sports.loc.pool',
            '學生活動中心 (舞鏡月屋)': 'sports.loc.dance_room', '室外籃球場 (靠宿舍)': 'sports.loc.court_basket',
            '室外排球場 (靠田徑場)': 'sports.loc.court_volley', '網球場': 'sports.loc.court_tennis',
            '田徑場 (司令台)': 'sports.loc.track', '壘球場': 'sports.loc.field_softball',
            '大草皮 (近校門)': 'sports.loc.grass_field', '埔里國小 (籃球場)': 'sports.loc.puli_elem',
            '埔里鎮立育樂中心': 'sports.loc.puli_rec', '虎頭山 (慢跑/飛行傘點)': 'sports.loc.hutou',
            '地理中心碑 (階梯訓練)': 'sports.loc.geographic', '國立中興大學(NCHU)籃球場': 'sports.loc.nchu',
            '自訂': 'sports.loc.custom'
        };
        return map[loc] ? I18n.t(map[loc]) : loc;
    };

    const getSportTrans = (sport) => {
        const map = {
            '籃球': 'sports.type.basketball', '羽球': 'sports.type.badminton',
            '排球': 'sports.type.volleyball', '網球': 'sports.type.tennis',
            '桌球': 'sports.type.table_tennis', '棒壘球': 'sports.type.baseball',
            '足球': 'sports.type.soccer', '健身重訓': 'sports.type.gym',
            '瑜珈': 'sports.type.yoga', '有氧舞蹈': 'sports.type.aerobics',
            '慢跑': 'sports.type.jogging', '游泳': 'sports.type.swimming',
            '騎單車': 'sports.type.cycling', '其他': 'sports.type.other'
        };
        return map[sport] ? I18n.t(map[sport]) : sport;
    };

    const renderList = () => {
        if (upcoming.length === 0) {
            return `<div style="text-align: center; color: var(--text-secondary); margin-top: 3rem;">${I18n.t('common.no_data')}</div>`;
        }

        return upcoming.map(p => {
            const date = new Date(p.eventTime || p.createdAt || Date.now());
            const dateStr = date.toLocaleDateString('zh-TW', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' });

            const getIconAndColor = (cat, sportType) => {
                const colorMap = {
                    'sports': '#FF7043', 'carpool': '#42A5F5', 'housing': '#FFCA28',
                    'groupbuy': '#FFCA28', 'study': '#66BB6A', 'travel': '#EC407A'
                };
                if (cat === 'sports') {
                    const color = colorMap.sports;
                    if (!sportType) return { icon: '🏅', color };
                    if (sportType.includes('籃')) return { icon: '🏀', color };
                    if (sportType.includes('羽')) return { icon: '🏸', color };
                    if (sportType.includes('排')) return { icon: '🏐', color };
                    if (sportType.includes('網')) return { icon: '🎾', color };
                    return { icon: '🏅', color };
                }
                if (cat === 'carpool') return { icon: '🚗', color: colorMap.carpool };
                if (cat === 'housing' || cat === 'groupbuy') return { icon: '🏠', color: colorMap.housing };
                if (cat === 'study') return { icon: '📚', color: colorMap.study };
                return { icon: '📅', color: colorMap.travel || '#666' };
            };

            const { icon, color } = getIconAndColor(p.category, p.sportType);
            const labelName = p.category === 'sports' && p.sportType ? getSportTrans(p.sportType) : I18n.t(`home.cat.${p.category === 'groupbuy' ? 'housing' : p.category}`);
            const translatedLoc = getLocTrans(p.location);

            const statusKey = `${p.category || 'sports'}_${p.id}`;
            const roleStatus = myStatuses[statusKey];

            let actionBtn = '';
            if (user && user.email && p.hostEmail && user.email === p.hostEmail) {
                actionBtn = `<button onclick="event.stopPropagation(); window.navigateTo('messages?room=${p.category}_${p.id}')" style="width:100%; margin-top:12px; padding:8px; border-radius:8px; background:#1976D2; border:none; color:white; font-weight:bold; cursor:pointer; box-shadow: 0 2px 4px rgba(25, 118, 210, 0.3);">💬 進入聊天室 / Enter Chat</button>`;
            } else if (roleStatus === 'approved' || roleStatus === 'accepted') {
                actionBtn = `<button onclick="event.stopPropagation(); window.navigateTo('messages?room=${p.category}_${p.id}')" style="width:100%; margin-top:12px; padding:8px; border-radius:8px; background:#4CAF50; border:none; color:white; font-weight:bold; cursor:pointer; box-shadow: 0 2px 4px rgba(76, 175, 80, 0.3);">💬 進入聊天室 / Enter Chat</button>`;
            } else if (roleStatus === 'pending') {
                actionBtn = `<button onclick="event.stopPropagation();" disabled style="width:100%; margin-top:12px; padding:8px; border-radius:8px; background:#9E9E9E; border:none; color:white; font-weight:bold; cursor:not-allowed; box-shadow: 0 2px 4px rgba(158, 158, 158, 0.3);">⏳ Pending...</button>`;
            } else {
                actionBtn = `<button onclick="event.stopPropagation(); window.quickApply('${p.id}', '${p.category}', this)" style="width:100%; margin-top:12px; padding:10px; border-radius:8px; background:linear-gradient(135deg,#FF8C00,#FF6D00); border:none; color:white; font-weight:bold; cursor:pointer; box-shadow: 0 2px 4px rgba(255, 140, 0, 0.3);">申請加入 / Apply to Join</button>`;
            }

            return `
                <div class="card" onclick="window.showUniversalDetail('${p.id}', '${p.category}')" style="cursor: pointer; margin-bottom: 1.2rem; padding: 18px;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.8rem;">
                        <span style="font-size: 0.75rem; background: ${color}15; color: ${color}; padding: 3px 10px; border-radius: 20px; font-weight: bold; display: flex; align-items: center; gap: 4px;">
                            ${icon} ${labelName}
                        </span>
                        <span style="font-size: 0.8rem; color: #999;">${dateStr}</span>
                    </div>
                    <h3 style="margin: 0 0 10px 0; font-size: 1.15rem; color: #111;">${p.title}</h3>
                    
                    <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 12px; padding: 8px; background: #f8fafc; border-radius: 10px; border: 1px solid #f1f5f9;">
                        <img src="${p.profile_pic || 'https://cdn-icons-png.flaticon.com/512/149/149071.png'}" style="width: 38px; height: 38px; border-radius: 50%; object-fit: cover; border: 2px solid #fff; box-shadow: 0 2px 4px rgba(0,0,0,0.05);">
                        <div style="flex: 1; min-width: 0;">
                            <div style="font-size: 0.85rem; font-weight: 600; color: #1e293b;">${p.hostName}</div>
                            <div style="font-size: 0.7rem; color: #64748b;">🎓 ${p.hostDept} ${p.study_year ? `• ${p.study_year}` : ''}</div>
                        </div>
                    </div>

                    <div style="font-size: 0.85rem; color: #64748b; margin-bottom: 12px; display: flex; flex-direction: column; gap: 4px;">
                        <div>📍 ${translatedLoc || 'NCNU'}</div>
                    </div>

                    ${p.description ? `
                    <p style="color: #475569; font-size: 0.9rem; line-height: 1.4; margin-bottom: 12px; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; text-overflow: ellipsis;">
                        ${p.description}
                    </p>` : ''}

                    ${actionBtn}
                </div>
            `;
        }).join('');
    };

    app.innerHTML = `
        <div class="container fade-in" style="padding-bottom: 80px;">
            <header style="margin-bottom: 1.5rem; display: flex; align-items: center;">
                <button onclick="window.navigateTo('home')" style="background: none; border: none; font-size: 1.5rem; margin-right: 1rem; cursor: pointer; color: #334155;">⬅️</button>
                <h2 style="margin: 0; font-size: 1.5rem; color: #1e293b; font-weight: 700;">${I18n.t('home.section.new_activity')}</h2>
            </header>
            <div class="activity-list">${renderList()}</div>
        </div>
    `;

    if (!document.getElementById('activities-styles')) {
        const style = document.createElement('style');
        style.id = 'activities-styles';
        style.innerHTML = `
            .card { background: white; border-radius: 16px; box-shadow: 0 4px 15px rgba(0,0,0,0.06); border: 1px solid #f1f5f9; transition: transform 0.2s, box-shadow 0.2s; }
            .card:hover { transform: translateY(-2px); box-shadow: 0 8px 20px rgba(0,0,0,0.1); }
            @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
            @keyframes slideUp { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
        `;
        document.head.appendChild(style);
    }

    if (!window.quickApply) {
        window.quickApply = async (eventId, category, btn) => {
            const currentUserStr = localStorage.getItem('userProfile');
            let u = currentUserStr ? JSON.parse(currentUserStr) : {};
            if (!u.email) { alert("Please login first!"); return; }

            const confirmHtml = `
                <div id="join-confirm-overlay" style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.6); display: flex; align-items: center; justify-content: center; z-index: 100000; backdrop-filter: blur(4px); animation: fadeIn 0.2s;">
                    <div style="background: white; width: 90%; max-width: 400px; border-radius: 20px; padding: 30px; text-align: center; box-shadow: 0 20px 40px rgba(0,0,0,0.2); animation: slideUp 0.3s ease-out;">
                        <div style="font-size: 3rem; margin-bottom: 1rem;">🤝</div>
                        <h3 style="margin: 0 0 10px 0; color: #1e293b;">${I18n.t('common.confirm_join') || 'Confirm Join?'}</h3>
                        <p style="color: #64748b; font-size: 0.95rem; line-height: 1.5; margin-bottom: 25px;">
                            ${I18n.t('common.confirm_join_desc') || 'Your request will be sent to the Host for review.'}
                        </p>
                        <div style="display: flex; gap: 12px;">
                            <button onclick="document.getElementById('join-confirm-overlay').remove()" style="flex: 1; padding: 12px; border-radius: 12px; background: #f1f5f9; border: none; color: #64748b; font-weight: bold; cursor: pointer;">Cancel</button>
                            <button id="join-submit-btn" style="flex: 1; padding: 12px; border-radius: 12px; background: linear-gradient(135deg,#FF8C00,#FF6D00); border: none; color: white; font-weight: bold; cursor: pointer; box-shadow: 0 4px 10px rgba(255,109,0,0.25);">Confirm</button>
                        </div>
                    </div>
                </div>`;
            document.body.insertAdjacentHTML('beforeend', confirmHtml);

            document.getElementById('join-submit-btn').onclick = async () => {
                const submitBtn = document.getElementById('join-submit-btn');
                submitBtn.innerText = "Processing...";
                submitBtn.disabled = true;
                try {
                    const out = await api.fetch('/api/v1/join', { method: 'POST', body: { event_type: category || 'sports', event_id: eventId, user_email: u.email } });
                    document.getElementById('join-confirm-overlay').remove();
                    alert(I18n.t('common.join_sent') || 'Application sent! Please wait for approval.');
                    btn.innerText = "⏳ Pending..."; btn.style.background = "#9E9E9E"; btn.style.cursor = "not-allowed"; btn.onclick = (e) => e.stopPropagation();
                    if (window.syncNotifications) window.syncNotifications();
                } catch (e) {
                    alert('Error: ' + (e.message || 'Unknown error'));
                    submitBtn.innerText = "Confirm"; submitBtn.disabled = false;
                }
            };
        };
    }

    if (!window.showUniversalDetail) {
        window.showUniversalDetail = async (id, category) => {
            const lookIn = [...(window._cachedHomePosts || []), ...(window._cachedActivitiesPosts || [])];
            const p = lookIn.find(post => String(post.id) === String(id) && post.category === category);
            if (!p) return;

            const existing = document.getElementById('univ-detail-overlay');
            if (existing) existing.remove();

            const isZH = (localStorage.getItem('language') || '').includes('zh') || true;
            const hostAvatar = p.profile_pic || 'https://cdn-icons-png.flaticon.com/512/149/149071.png';
            const evTimeStr = p.eventtime || p.eventTime || p.event_time || p.departure_time || p.deadline || p.created_at;
            const dTime = new Date(evTimeStr);
            const timeStr = dTime.toLocaleString('zh-TW', { year: 'numeric', month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' });

            const makeMap = loc => loc ? `<div style="margin-top: 10px;"><iframe width="100%" height="200" src="https://maps.google.com/maps?q=${encodeURIComponent(loc)}&output=embed" style="border:0; border-radius: 12px;" allowfullscreen loading="lazy"></iframe></div>` : '';

            const modalHtml = `
                <div id="univ-detail-overlay" style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.6); display: flex; align-items: flex-end; justify-content: center; z-index: 100000; backdrop-filter: blur(4px); animation: fadeIn 0.3s;">
                    <div style="background: white; width: 100%; max-width: 600px; max-height: 90vh; border-radius: 24px 24px 0 0; padding: 30px; overflow-y: auto; position: relative; animation: slideUp 0.3s ease;">
                        <button onclick="document.getElementById('univ-detail-overlay').remove()" style="position: absolute; top: 20px; right: 20px; background: #f1f5f9; border: none; width: 36px; height: 36px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: bold; cursor: pointer; color: #64748b;">✕</button>
                        
                        <div style="display: flex; gap: 8px; margin-bottom: 15px;">
                            <span style="padding: 4px 12px; background: #f1f5f9; color: #64748b; border-radius: 20px; font-size: 0.75rem; font-weight: bold; text-transform: uppercase;">${p.category}</span>
                        </div>
                        
                        <h2 style="margin: 0 0 20px 0; color: #1e293b; font-size: 1.5rem; font-weight: 700; line-height: 1.3;">${p.title}</h2>
                        
                        <div style="display: flex; align-items: center; gap: 15px; margin-bottom: 25px; padding: 15px; background: #f8fafc; border-radius: 16px; border: 1px solid #f1f5f9;">
                            <img src="${hostAvatar}" style="width: 50px; height: 50px; border-radius: 50%; object-fit: cover; border: 3px solid #fff; box-shadow: 0 4px 10px rgba(0,0,0,0.05);">
                            <div style="flex: 1;">
                                <div style="color: #1e293b; font-weight: 700; font-size: 1.1rem; margin-bottom: 2px;">${p.hostName}</div>
                                <div style="font-size: 0.85rem; color: #64748b;">🎓 ${p.hostDept} ${p.study_year ? `• ${p.study_year}` : ''}</div>
                            </div>
                            <div style="background: #E8F5E9; color: #2E7D32; padding: 4px 10px; border-radius: 20px; font-size: 0.8rem; font-weight: bold; display: flex; align-items: center; gap: 4px;">
                                ✨ ${p.credit_points !== undefined ? p.credit_points : 0} pts
                            </div>
                        </div>

                        <div style="display: grid; gap: 15px; margin-bottom: 25px;">
                            <div style="padding: 15px; background: #fff; border: 1px solid #f1f5f9; border-radius: 16px; box-shadow: 0 2px 8px rgba(0,0,0,0.02);">
                                <div style="font-size: 0.8rem; color: #94a3b8; font-weight: bold; margin-bottom: 8px; text-transform: uppercase;">📍 ${isZH ? '活動地點' : 'Location'}</div>
                                <div style="font-size: 1rem; color: #1e293b; font-weight: 500;">${p.location || 'NCNU'}</div>
                                ${makeMap(p.location)}
                            </div>
                            <div style="padding: 15px; background: #fff; border: 1px solid #f1f5f9; border-radius: 16px; box-shadow: 0 2px 8px rgba(0,0,0,0.02);">
                                <div style="font-size: 0.8rem; color: #94a3b8; font-weight: bold; margin-bottom: 8px; text-transform: uppercase;">🕒 ${isZH ? '活動時間' : 'Time'}</div>
                                <div style="font-size: 1rem; color: #1e293b; font-weight: 500;">${timeStr}</div>
                            </div>
                        </div>

                        <div style="margin-bottom: 30px;">
                            <div style="font-size: 0.8rem; color: #94a3b8; font-weight: bold; margin-bottom: 12px; text-transform: uppercase;">📝 ${isZH ? '詳細說明' : 'About'}</div>
                            <div style="color: #334155; line-height: 1.6; font-size: 1rem; white-space: pre-wrap;">${p.description || (isZH ? '暫無說明' : 'No description provided.')}</div>
                        </div>
                    </div>
                </div>`;
            document.body.insertAdjacentHTML('beforeend', modalHtml);
        };
    }
};
