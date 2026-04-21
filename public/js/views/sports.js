import { MockStore } from '../models/mockStore.js?v=12';
import { I18n } from '../services/i18n.js';
import api from '../utils/api.js';

window.AppEngine = {
    saveApp: (appData) => {
        const apps = JSON.parse(localStorage.getItem('joinup_applications') || '[]');
        appData.id = Date.now().toString();
        apps.push(appData);
        localStorage.setItem('joinup_applications', JSON.stringify(apps));
        return appData.id;
    },
    getApps: (postId) => {
        const apps = JSON.parse(localStorage.getItem('joinup_applications') || '[]');
        return apps.filter(a => String(a.postId) === String(postId));
    },
    updateApp: (appId, status) => {
        const apps = JSON.parse(localStorage.getItem('joinup_applications') || '[]');
        const index = apps.findIndex(a => String(a.id) === String(appId));
        if (index > -1) {
            apps[index].status = status;
            localStorage.setItem('joinup_applications', JSON.stringify(apps));
        }
    }
};

export const renderSports = () => {
    const app = document.getElementById('app');
    const userProfileStr = localStorage.getItem('userProfile');

    if (!userProfileStr) {
        alert(I18n.t('auth.profile_incomplete'));
        localStorage.removeItem('isLoggedIn');
        window.location.reload();
        return;
    }

    const user = JSON.parse(userProfileStr);
    let currentState = 'landing';
    let userRole = '';
    const CATEGORY_ID = 'sports';

    let activeFilters = {
        eventType: null,
        dateRange: null,
        peopleCount: null,
        keyword: null
    };

    const getLocName = (val) => {
        const map = {
            '體育健康中心 (1F 健身房)': 'sports.loc.gym_1f',
            '體育健康中心 (2F 綜合球場)': 'sports.loc.gym_2f',
            '體育健康中心 (3F 羽球場)': 'sports.loc.gym_3f',
            '游泳池 (室內)': 'sports.loc.pool',
            '學生活動中心 (舞鏡月屋)': 'sports.loc.dance_room',
            '室外籃球場 (靠宿舍)': 'sports.loc.court_basket',
            '室外排球場 (靠田徑場)': 'sports.loc.court_volley',
            '網球場': 'sports.loc.court_tennis',
            '田徑場 (司令台)': 'sports.loc.track',
            '壘球場': 'sports.loc.field_softball',
            '大草皮 (近校門)': 'sports.loc.grass_field',
            '埔里國小 (籃球場)': 'sports.loc.puli_elem',
            '埔里鎮立育樂中心': 'sports.loc.puli_rec',
            '虎頭山 (慢跑/飛行傘點)': 'sports.loc.hutou',
            '地理中心碑 (階梯訓練)': 'sports.loc.geographic',
            '國立中興大學(NCHU)籃球場': 'sports.loc.nchu',
            '自訂': 'sports.loc.custom'
        };
        return map[val] ? I18n.t(map[val]) : val;
    };

    const checkBlocking = async () => {
        const blockingStatus = MockStore.checkBlocking(user.email);
        if (blockingStatus.isBlocked) {
            alert(blockingStatus.message);
            return true;
        }
        return false;
    };

    const renderLanding = () => {
        return `
            <div class="container fade-in" style="height: 100vh; display: flex; flex-direction: column; justify-content: center;">
                <div style="text-align: center; margin-bottom: 2rem;">
                    <span style="font-size: 3rem;">🏀</span>
                    <h1 style="color: var(--primary-dark); margin-top: 1rem;">${I18n.t('sports.title')}</h1>
                    <p style="color: var(--text-secondary);">${I18n.t('sports.subtitle')}</p>
                </div>

                <div style="display: grid; gap: 1rem;">
                    <button id="btn-role-host" class="role-card" style="background: var(--bg-card); border-radius: 16px; box-shadow: var(--shadow-sm); border: none; border-left: 4px solid #FF8C00; padding: 1.5rem; text-align: left; display: flex; align-items: center; cursor: pointer; width: 100%; margin-bottom: 1rem; transition: transform 0.2s;" onmouseover="this.style.transform='translateY(-2px)'" onmouseout="this.style.transform='translateY(0)'">
                        <span style="font-size: 2.5rem; margin-right: 1.5rem;">💪</span>
                        <div>
                            <h3 style="margin: 0 0 0.2rem 0; font-size: 1.2rem; color: var(--text-primary);">${I18n.t('sports.role.host')}</h3>
                            <p style="margin: 0; font-size: 0.9rem; color: var(--text-secondary);">${I18n.t('sports.role.host_desc')}</p>
                        </div>
                    </button>

                    <button id="btn-role-partner" class="role-card" style="background: var(--bg-card); border-radius: 16px; box-shadow: var(--shadow-sm); border: none; border-left: 4px solid #FFD600; padding: 1.5rem; text-align: left; display: flex; align-items: center; cursor: pointer; width: 100%; margin-bottom: 1rem; transition: transform 0.2s;" onmouseover="this.style.transform='translateY(-2px)'" onmouseout="this.style.transform='translateY(0)'">
                        <span style="font-size: 2.5rem; margin-right: 1.5rem;">👟</span>
                        <div>
                            <h3 style="margin: 0 0 0.2rem 0; font-size: 1.2rem; color: var(--text-primary);">${I18n.t('sports.role.join')}</h3>
                            <p style="margin: 0; font-size: 0.9rem; color: var(--text-secondary);">${I18n.t('sports.role.join_desc')}</p>
                        </div>
                    </button>
                    
                    <button id="btn-manage" class="btn" style="background: linear-gradient(135deg, #FFD600, #FF6D00); color: white; margin-top: 1rem; padding: 0.5rem 1rem; border-radius: 20px; font-size: 0.85rem; font-weight: bold; border: none; cursor: pointer; box-shadow: 0 4px 10px rgba(255, 109, 0, 0.3); transition: transform 0.2s;" onmouseover="this.style.transform='scale(1.05)'" onmouseout="this.style.transform='scale(1)'">
                        ⚙️ ${I18n.t('common.manage')}
                    </button>
                </div>
                
                <button onclick="window.navigateTo('home')" style="position: absolute; top: 1rem; left: 1rem; background: none; border: none; font-size: 1.2rem; cursor: pointer;">
                    ⬅️ ${I18n.t('common.back')}
                </button>
            </div>
        `;
    };

    const renderCreatePost = () => {
        return `
            <div class="container fade-in" style="padding-bottom: 2rem;">
                <header style="margin-bottom: 1.5rem; display: flex; align-items: center;">
                    <button class="btn-back" style="background: none; border: none; font-size: 1.5rem; margin-right: 1rem; cursor: pointer;">⬅️</button>
                    <h2>${I18n.t('sports.create.title')}</h2>
                </header>

                <form id="createPostForm">
                    <h3 style="margin-bottom: 1rem; color: var(--primary-dark); border-bottom: 2px solid var(--primary-light); padding-bottom: 0.5rem;">📋 ${I18n.t('common.description')}</h3>
                    
                    <div class="input-group">
                        <div style="color: #888888; font-size: 12px; text-align: center; margin-top: 10px; margin-bottom: 5px;">${I18n.t('common.financial_disclaimer')}</div>
                        <label>${I18n.t('sports.label.title')} *</label>
                        <input type="text" id="teamName" placeholder="${I18n.t('sports.placeholder.title')}" required>
                    </div>

                    <div class="input-group">
                        <label>${I18n.t('sports.label.sport')} *</label>
                        <select id="eventType" style="width: 100%; padding: 0.8rem; border-radius: var(--radius-sm); border: 1px solid var(--border-color);" required>
                            <option value="">${I18n.t('common.select')}</option>
                            <optgroup label="🏀 ${I18n.t('sports.cat.ball')}">
                                <option value="籃球">🏀 ${I18n.t('sports.type.basketball')}</option>
                                <option value="羽球">🏸 ${I18n.t('sports.type.badminton')}</option>
                                <option value="排球">🏐 ${I18n.t('sports.type.volleyball')}</option>
                                <option value="網球">🎾 ${I18n.t('sports.type.tennis')}</option>
                                <option value="桌球">🏓 ${I18n.t('sports.type.table_tennis')}</option>
                                <option value="棒壘球">⚾ ${I18n.t('sports.type.baseball')}</option>
                                <option value="足球">⚽ ${I18n.t('sports.type.soccer')}</option>
                            </optgroup>
                            <optgroup label="💪 ${I18n.t('sports.cat.fitness')}">
                                <option value="健身重訓">🏋️ ${I18n.t('sports.type.gym')}</option>
                                <option value="瑜珈">🧘 ${I18n.t('sports.type.yoga')}</option>
                                <option value="有氧舞蹈">💃 ${I18n.t('sports.type.aerobics')}</option>
                            </optgroup>
                            <optgroup label="🏃 ${I18n.t('sports.cat.outdoor')}">
                                <option value="慢跑">🏃 ${I18n.t('sports.type.jogging')}</option>
                                <option value="游泳">🏊 ${I18n.t('sports.type.swimming')}</option>
                                <option value="騎單車">🚴 ${I18n.t('sports.type.cycling')}</option>
                                <option value="其他">✨ ${I18n.t('sports.type.other')}</option>
                            </optgroup>
                        </select>
                        <input type="text" id="customEventType" style="margin-top: 0.5rem; width: 100%; padding: 0.8rem; border-radius: var(--radius-sm); border: 1px solid var(--border-color); display: none;" placeholder="${I18n.t('sports.type.other')}">
                    </div>

                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
                        <div class="input-group">
                            <label>${I18n.t('reg.name_label')} *</label>
                            <input type="text" id="hostName" value="${user.name || user.displayName || ''}" required>
                        </div>
                        <div class="input-group">
                            <label>${I18n.t('reg.major_label')} *</label>
                            <input type="text" id="hostDept" value="${user.department || ''}" placeholder="" required>
                        </div>
                    </div>

                    <div class="input-group">
                        <label>${I18n.t('common.people_needed')} *</label>
                        <input type="number" id="requiredPeople" min="2" max="20" value="4" required>
                    </div>

                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
                        <div class="input-group">
                            <label>${I18n.t('sports.label.time')} *</label>
                            <input type="datetime-local" id="eventTime" required>
                        </div>
                        <div class="input-group">
                            <label>${I18n.t('housing.label.deadline')} *</label>
                            <input type="datetime-local" id="deadline" required>
                        </div>
                    </div>

                    <div class="input-group">
                        <label>${I18n.t('sports.label.location')} *</label>
                        <select id="meetingPoint" style="width: 100%; padding: 0.8rem; border-radius: var(--radius-sm); border: 1px solid var(--border-color);" required>
                            <option value="">${I18n.t('common.select')}</option>
                            <optgroup label="🏢 ${I18n.t('sports.loc_group.indoor')}">
                                <option value="體育健康中心 (1F 健身房)">🏋️ ${I18n.t('sports.loc.gym_1f')}</option>
                                <option value="體育健康中心 (2F 綜合球場)">🏐 ${I18n.t('sports.loc.gym_2f')}</option>
                                <option value="體育健康中心 (3F 羽球場)">🏸 ${I18n.t('sports.loc.gym_3f')}</option>
                                <option value="游泳池 (室內)">🏊 ${I18n.t('sports.loc.pool')}</option>
                                <option value="學生活動中心 (舞鏡月屋)">💃 ${I18n.t('sports.loc.dance_room')}</option>
                            </optgroup>
                            <optgroup label="🏀 ${I18n.t('sports.loc_group.outdoor')}">
                                <option value="室外籃球場 (靠宿舍)">🏀 ${I18n.t('sports.loc.court_basket')}</option>
                                <option value="室外排球場 (靠田徑場)">🏐 ${I18n.t('sports.loc.court_volley')}</option>
                                <option value="網球場">🎾 ${I18n.t('sports.loc.court_tennis')}</option>
                                <option value="田徑場 (司令台)">🏃 ${I18n.t('sports.loc.track')}</option>
                                <option value="壘球場">⚾ ${I18n.t('sports.loc.field_softball')}</option>
                                <option value="大草皮 (近校門)">⛺ ${I18n.t('sports.loc.grass_field')}</option>
                            </optgroup>
                            <optgroup label="🏘️ ${I18n.t('sports.loc_group.puli')}">
                                <option value="埔里國小 (籃球場)">🏀 ${I18n.t('sports.loc.puli_elem')}</option>
                                <option value="埔里鎮立育樂中心">🏸 ${I18n.t('sports.loc.puli_rec')}</option>
                                <option value="虎頭山 (慢跑/飛行傘點)">🌄 ${I18n.t('sports.loc.hutou')}</option>
                                <option value="地理中心碑 (階梯訓練)">🧗 ${I18n.t('sports.loc.geographic')}</option>
                            </optgroup>
                             <optgroup label="${I18n.t('sports.loc_group.other')}">
                                <option value="國立中興大學(NCHU)籃球場">🏀 ${I18n.t('sports.loc.nchu')}</option>
                            </optgroup>
                            <option value="自訂">📍 ${I18n.t('sports.loc.custom')}</option>
                        </select>
                        <input type="text" id="customLocation" style="margin-top: 0.5rem; width: 100%; padding: 0.8rem; border-radius: var(--radius-sm); border: 1px solid var(--border-color); display: none;" placeholder="${I18n.t('sports.loc.custom')}">
                    </div>

                    <div class="input-group">
                        <label>${I18n.t('sports.label.description')}</label>
                        <textarea id="description" rows="4" placeholder="" style="width: 100%; padding: 0.8rem; border-radius: var(--radius-sm); border: 1px solid var(--border-color);"></textarea>
                    </div>

                    <button type="submit" class="btn btn-primary btn-large" style="margin-top: 1.5rem; width: 100%;">${I18n.t('common.submit')}</button>
                </form>
            </div>
        `;
    };

    const renderList = async () => {
        let posts = [];
        let myStatuses = {};
        try {
            if (user && user.email) {
                try {
                    const statusRes = await fetch(`/api/v1/join/my-statuses?user_email=${encodeURIComponent(user.email)}`);
                    const statusData = await statusRes.json();
                    if (statusData.success) myStatuses = statusData.data || {};
                } catch (e) { console.warn("Fail fetch statuses", e); }
            }
            const response = await fetch(`/activities?user_email=${encodeURIComponent(user.email)}`);
            const dbPosts = await response.json();
            const availablePosts = dbPosts.filter(p => {
                if (p.status === 'cancelled' || p.status === 'success' || p.status === 'expired') return false;

                return true;
            });

            posts = availablePosts.map(p => ({
                id: p.id,
                category: p.category,
                teamName: p.title,
                eventType: p.sport_type,
                maxParticipants: p.people_needed,
                eventTime: p.event_time,
                deadline: p.deadline,
                meetingPoint: p.location,
                description: p.description,
                status: 'open',
                authorId: p.host_email,
                hostName: p.host_name || 'Host',
                hostDept: p.host_dept || '',
                participants: [{ userId: p.host_email, role: 'host' }],
                createdAt: p.created_at
            })).filter(p => p.category === CATEGORY_ID);
        } catch (error) {
            console.error("Gagal ambil data List:", error);
        }

        if (activeFilters.eventType) {
            posts = posts.filter(p => p.eventType === activeFilters.eventType);
        }

        if (activeFilters.dateRange) {
            const targetDate = new Date();
            if (activeFilters.dateRange === 'today') {
                targetDate.setHours(23, 59, 59, 999);
                posts = posts.filter(p => new Date(p.eventTime) <= targetDate);
            } else if (activeFilters.dateRange === 'week') {
                targetDate.setDate(targetDate.getDate() + 7);
                posts = posts.filter(p => new Date(p.eventTime) <= targetDate);
            } else if (activeFilters.dateRange === 'month') {
                targetDate.setMonth(targetDate.getMonth() + 1);
                posts = posts.filter(p => new Date(p.eventTime) <= targetDate);
            }
        }

        if (activeFilters.peopleCount) {
            posts = posts.filter(p => p.maxParticipants <= activeFilters.peopleCount);
        }

        const activeFilterCount = [
            activeFilters.eventType,
            activeFilters.dateRange,
            activeFilters.peopleCount
        ].filter(Boolean).length;

        if (activeFilters.keyword) {
            const kw = activeFilters.keyword.toLowerCase();
            posts = posts.filter(p =>
                (p.teamName && p.teamName.toLowerCase().includes(kw)) ||
                (p.hostName && p.hostName.toLowerCase().includes(kw)) ||
                (p.description && p.description.toLowerCase().includes(kw))
            );
        }

        // Sensor Bahasa List View
        const currentLang = localStorage.getItem('language') || localStorage.getItem('lang') || 'zh-TW';
        const isZH = currentLang.toLowerCase().includes('zh');

        const txtHost = isZH ? '發起人' : 'Host';
        const txtJoin = isZH ? '加入' : 'Join';
        const txtJoinChat = isZH ? '進入聊天室' : 'Enter Chat Room';
        const txtFull = isZH ? '額滿' : 'Full';
        const txtExpired = isZH ? '已過期' : 'Expired';

        const postsHtml = posts.length ? posts.map(p => {
            const totalActiveCount = Math.max(1, parseInt(p.approvedCount) || 0);
            const isFull = totalActiveCount >= p.maxParticipants;
            const isExpired = new Date(p.deadline) < new Date();
            const statusKey = `${p.category || 'sports'}_${p.id}`;
            const userStatus = myStatuses[statusKey];
            const isParticipant = userStatus === 'approved' || userStatus === 'accepted';

            let actionBtn = '';
            if (isHost || isParticipant) {
                actionBtn = `
                <button 
                    class="btn" 
                    onclick="event.stopPropagation(); window.openGroupChat('${p.id}');" 
                    style="width: 100%; margin-top: 0.8rem; padding: 0.7rem; font-weight: bold; background: #ffc200; border: none; color: white; border-radius: 8px; cursor: pointer; transition: transform 0.2s; font-size: 0.95rem; box-shadow: 0 2px 4px rgba(255, 194, 0, 0.3);"
                >
                    💬 ${txtJoinChat}
                </button>`;
            } else if (isFull || p.status === 'full') {
                actionBtn = `
                <button 
                    class="btn btn-full" 
                    disabled 
                    style="width: 100%; margin-top: 0.8rem; padding: 0.7rem; font-weight: bold; border: none; color: white; border-radius: 8px; cursor: not-allowed; font-size: 0.95rem;"
                >
                    ${txtFull}
                </button>`;
            } else if (isExpired) {
                actionBtn = `
                <button 
                    class="btn btn-full" 
                    disabled 
                    style="width: 100%; margin-top: 0.8rem; padding: 0.7rem; font-weight: bold; border: none; color: white; border-radius: 8px; cursor: not-allowed; font-size: 0.95rem;"
                >
                    ${txtExpired}
                </button>`;
            } else {
                actionBtn = `
                <button 
                    class="btn btn-primary" 
                    onclick="event.stopPropagation(); window.openJoinForm('${p.id}', '${p.teamName}');" 
                    style="width: 100%; margin-top: 0.8rem; padding: 0.7rem; font-weight: bold; background: linear-gradient(135deg, #FF7043, #E64A19); border: none; color: white; border-radius: 8px; cursor: pointer; transition: transform 0.2s; font-size: 0.95rem;"
                >
                    ${txtJoin}
                </button>`;
            }

            return `
            <div class="card" style="${(isFull || p.status === 'full') || isExpired ? 'opacity: 0.8;' : ''} margin-bottom: 1rem;">
                <div onclick="window.showEventDetail('${p.id}')" style="cursor: pointer;">
                    <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 0.5rem;">
                        <span style="font-size: 0.8rem; padding: 0.2rem 0.5rem; background: #FFEBEE; color: #D32F2F; border-radius: 4px;">
                            ${p.eventType}
                        </span>
                        <span style="font-size: 0.8rem; color: var(--text-secondary);">${new Date(p.createdAt).toLocaleDateString()}</span>
                    </div>
                    <h3 style="margin-bottom: 0.5rem;">${p.teamName}</h3>
                    <div style="color: var(--text-secondary); font-size: 0.9rem; margin-bottom: 0.5rem; font-weight: 500;">
                        <span>🏷️ ${txtHost}: ${p.hostName} (${p.hostDept})</span>
                    </div>
                    <div style="display: flex; gap: 1rem; color: var(--text-secondary); font-size: 0.9rem; margin-bottom: 0.5rem;">
                        <span>👥 ${totalActiveCount} / ${p.maxParticipants}</span>
                        <span>📅 ${new Date(p.eventTime).toLocaleDateString()}</span>
                        <span>📍 ${getLocName(p.meetingPoint)}</span>
                    </div>
                    ${p.description ? `
                    <p style="color: var(--text-secondary); font-size: 0.9rem; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                        ${p.description}
                    </p>` : ''}
                </div>
                ${actionBtn}
            </div>
        `;
        }).join('') : `<p style="text-align: center; color: var(--text-secondary); margin-top: 2rem;">${I18n.t('common.no_data') || 'No items'}</p>`;

        return `
            <div class="container fade-in" style="padding-bottom: 80px;">
                <header style="margin-bottom: 1rem; display: flex; align-items: center;">
                    <button id="btn-list-back" class="btn-back" style="background: none; border: none; font-size: 1.5rem; margin-right: 1rem; cursor: pointer;">⬅️</button>
                    <h2 style="flex: 1; margin: 0;">${I18n.t('sports.role.join')}</h2>
                    <button id="btn-filter" style="background: #FFEBEE; border: none; padding: 0.5rem 1rem; border-radius: 20px; cursor: pointer; display: flex; align-items: center; gap: 0.5rem; font-size: 0.9rem; color: #D32F2F;">
                        ⚙️ ${I18n.t('common.filter')}
                        ${activeFilterCount > 0 ? `<span style="background: #f44336; color: white; font-size: 0.7rem; padding: 2px 6px; border-radius: 10px;">${activeFilterCount}</span>` : ''}
                    </button>
                </header>

                <div id="search-container" style="margin-bottom: 1rem; position: relative;">
                    <input type="text" id="search-events" value="${activeFilters.keyword || ''}" placeholder="${I18n.t('common.search')}..." style="width: 100%; padding: 12px 20px; border-radius: 20px; border: 1px solid #ddd; font-size: 1rem; outline: none; transition: border-color 0.2s; box-shadow: 0 2px 8px rgba(0,0,0,0.05);">
                    <span style="position: absolute; right: 0.8rem; top: 50%; transform: translateY(-50%); color: #888; font-size: 1.1rem;">🔍</span>
                </div>
                
                ${activeFilterCount > 0 ? `
                <div style="margin-bottom: 1rem; padding: 0.5rem 1rem; background: #FFEBEE; border-radius: 8px; display: flex; justify-content: space-between; align-items: center;">
                    <span style="font-size: 0.9rem; color: #D32F2F;">✓ ${activeFilterCount} ${I18n.t('common.active')}</span>
                    <button id="btn-clear-filters" style="background: none; border: none; color: #D32F2F; font-size: 0.9rem; cursor: pointer; text-decoration: underline;">${I18n.t('common.clear')}</button>
                </div>
                ` : ''}
                
                <div class="post-list">
                    ${postsHtml}
                </div>
            </div>
        `;
    };

    window.openJoinForm = async (postId, teamName) => {
        if (await checkBlocking()) return;

        const existingOverlay = document.getElementById('join-overlay');
        if (existingOverlay) existingOverlay.remove();

        const currentLang = localStorage.getItem('language') || localStorage.getItem('lang') || 'zh-TW';
        const isZH = currentLang.toLowerCase().includes('zh');

        const t = (key, fallbackZH, fallbackEN) => {
            if (typeof I18n !== 'undefined' && I18n.t) {
                const trans = I18n.t(key);
                if (trans && trans !== key) return trans;
            }
            return isZH ? fallbackZH : fallbackEN;
        };

        const msgConfirm = isZH ? '確認加入' : 'Confirm Join';
        const msgDesc = isZH ? `您確定要報名參與 <strong>${teamName}</strong> 嗎？發起人將會收到您的申請。` : `Are you sure you want to apply for <strong>${teamName}</strong>? The host will receive your request.`;
        const msgCancel = isZH ? '取消' : 'Cancel';
        const msgSubmit = isZH ? '確認送出' : 'Submit';

        const formHtml = `
            <div id="join-overlay" style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.6); display: flex; align-items: center; justify-content: center; z-index: 10000; backdrop-filter: blur(4px);">
                <div style="background: var(--bg-card); width: 85%; max-width: 350px; border-radius: 16px; padding: 2rem; text-align: center; box-shadow: var(--shadow-lg); animation: scaleIn 0.2s ease-out; border: 1px solid var(--border-color);">
                    <h3 style="margin: 0 0 1rem 0; color: var(--text-primary);">${msgConfirm}</h3>
                    <p style="color: var(--text-secondary); margin-bottom: 1.5rem; line-height: 1.5;">${msgDesc}</p>
                    <div style="display: flex; gap: 1rem;">
                        <button onclick="document.getElementById('join-overlay').remove()" class="btn" style="flex: 1; padding: 0.8rem; background: var(--bg-secondary); color: var(--text-secondary); border-radius: 8px; border: none; cursor: pointer; font-weight: bold;">
                            ${msgCancel}
                        </button>
                        <button id="btn-confirm-join" class="btn btn-primary" style="flex: 1; padding: 0.8rem; background: #FF8C00; color: white; border-radius: 8px; border: none; cursor: pointer; font-weight: bold;">
                            ${msgSubmit}
                        </button>
                    </div>
                </div>
            </div>
            <style>@keyframes scaleIn { from { transform: scale(0.9); opacity: 0; } to { transform: scale(1); opacity: 1; } }</style>
        `;
        document.body.insertAdjacentHTML('beforeend', formHtml);

        document.getElementById('btn-confirm-join').onclick = async () => {
            const currentUserStr = localStorage.getItem('userProfile');
            let user = currentUserStr ? JSON.parse(currentUserStr) : {};

            // MENGAMBIL DATA PALING FRESH DARI DATABASE LOKAL
            if (window.MockStore && window.MockStore.getUser) {
                const fresh = window.MockStore.getUser(user.email);
                if (fresh) user = fresh;
            } else {
                const allUsers = JSON.parse(localStorage.getItem('mock_users') || '[]');
                const fresh = allUsers.find(u => u.email === user.email);
                if (fresh) user = fresh;
            }

            // PENYEDOT FOTO UNIVERSAL (Agar Foto Profil yang muncul di Account Settings tidak hilang)
            const finalAvatar = user.profile_pic || user.profilePic || user.avatar || user.picture || '';

            const appId = window.AppEngine.saveApp({
                postId: postId,
                applicantId: user.email,
                applicantName: user.displayName || user.name || 'Pelajar',
                applicantDept: user.department || user.major || '',
                applicantBio: user.bio || '',
                applicantHobby: user.hobby || '',
                applicantPic: finalAvatar,
                status: 'pending'
            });

            try {
                const response = await fetch('/activities');
                const posts = await response.json();
                const post = posts.find(p => String(p.id) === String(postId));

                if (post && window.sendAppNotification) {
                    const linkPayload = `action:review_sports_app:${appId}:${postId}:${user.email}:${encodeURIComponent(teamName)}`;
                    window.sendAppNotification(
                        post.host_email,
                        'action',
                        isZH ? `🔔 ${user.displayName || user.name} 想加入您的活動「${teamName}」！` : `🔔 ${user.displayName || user.name} wants to join "${teamName}"!`,
                        linkPayload
                    );
                }
            } catch (e) { console.error("Gagal kirim notif", e); }

            const successMsg = isZH ? '報名已送出！請等待發起人確認。' : 'Application sent! Please wait for host confirmation.';
            alert(successMsg);

            document.getElementById('join-overlay').remove();
        };
    };

    const renderFilterPanel = async () => {
        const sportsList = [
            { id: '籃球', icon: '🏀', key: 'sports.type.basketball' },
            { id: '羽球', icon: '🏸', key: 'sports.type.badminton' },
            { id: '排球', icon: '🏐', key: 'sports.type.volleyball' },
            { id: '網球', icon: '🎾', key: 'sports.type.tennis' },
            { id: '桌球', icon: '🏓', key: 'sports.type.table_tennis' },
            { id: '棒壘球', icon: '⚾', key: 'sports.type.baseball' },
            { id: '足球', icon: '⚽', key: 'sports.type.soccer' },
            { id: '健身重訓', icon: '🏋️', key: 'sports.type.gym' },
            { id: '瑜珈', icon: '🧘', key: 'sports.type.yoga' },
            { id: '慢跑', icon: '🏃', key: 'sports.type.jogging' },
            { id: '游泳', icon: '🏊', key: 'sports.type.swimming' },
            { id: '騎單車', icon: '🚴', key: 'sports.type.cycling' }
        ];

        let eventTypesHtml = sportsList.map(sport => {
            const isActive = activeFilters.eventType === sport.id;
            const label = (typeof I18n !== 'undefined') ? I18n.t(sport.key) : sport.id;
            return `<button class="filter-option ${isActive ? 'active' : ''}" data-filter="eventType" data-value="${sport.id}" style="padding: 0.6rem 1rem; border: 2px solid var(--border-color); border-radius: 20px; background: ${isActive ? '#FFF3E0' : 'white'}; border-color: ${isActive ? '#FF8C00' : 'var(--border-color)'}; color: ${isActive ? '#E65100' : '#555'}; font-weight: ${isActive ? 'bold' : 'normal'}; cursor: pointer; transition: all 0.2s; box-shadow: 0 2px 5px rgba(0,0,0,0.05);">${sport.icon} ${label}</button>`;
        }).join('');

        return `
            <div id="filter-overlay" style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); display: flex; align-items: end; z-index: 1000;">
                <div class="slide-up" style="background: var(--bg-card); border: 1px solid var(--border-color); width: 100%; border-radius: 16px 16px 0 0; padding: 1.5rem; max-height: 85vh; overflow-y: auto;">
                    <div style="display: flex; justify-content: space-between; margin-bottom: 1.5rem;">
                        <h3 style="color: var(--text-primary);">🔍 ${I18n.t('common.filter')}</h3>
                        <button onclick="window.closeFilterPanel()" style="background: none; border: none; font-size: 1.5rem; cursor: pointer; color: var(--text-primary);">×</button>
                    </div>

                    <div style="margin-bottom: 1.5rem;">
                        <label style="display: block; margin-bottom: 0.8rem; font-weight: bold; font-size: 1.1rem; color: var(--text-primary);">${I18n.t('sports.label.sport')}</label>
                        <div style="display: flex; gap: 0.6rem; flex-wrap: wrap;">
                            ${eventTypesHtml}
                        </div>
                    </div>

                    <div style="margin-bottom: 1.5rem;">
                        <label style="display: block; margin-bottom: 0.5rem; font-weight: bold; color: var(--text-primary);">${I18n.t('common.date')}</label>
                        <div style="display: flex; gap: 0.5rem;">
                            <button class="filter-option ${activeFilters.dateRange === 'today' ? 'active' : ''}" data-filter="dateRange" data-value="today" style="flex: 1; padding: 0.6rem; border: 2px solid var(--border-color); border-radius: 8px; background: ${activeFilters.dateRange === 'today' ? 'var(--primary-light)' : 'var(--bg-card)'}; color: ${activeFilters.dateRange === 'today' ? 'white' : 'inherit'}; cursor: pointer;">${I18n.t('outing.filter.date_today')}</button>
                            <button class="filter-option ${activeFilters.dateRange === 'week' ? 'active' : ''}" data-filter="dateRange" data-value="week" style="flex: 1; padding: 0.6rem; border: 2px solid var(--border-color); border-radius: 8px; background: ${activeFilters.dateRange === 'week' ? 'var(--primary-light)' : 'var(--bg-card)'}; color: ${activeFilters.dateRange === 'week' ? 'white' : 'inherit'}; cursor: pointer;">${I18n.t('outing.filter.date_week')}</button>
                            <button class="filter-option ${activeFilters.dateRange === 'month' ? 'active' : ''}" data-filter="dateRange" data-value="month" style="flex: 1; padding: 0.6rem; border: 2px solid var(--border-color); border-radius: 8px; background: ${activeFilters.dateRange === 'month' ? 'var(--primary-light)' : 'var(--bg-card)'}; color: ${activeFilters.dateRange === 'month' ? 'white' : 'inherit'}; cursor: pointer;">${I18n.t('outing.filter.date_month')}</button>
                        </div>
                    </div>

                    <div style="margin-bottom: 1.5rem;">
                        <label style="display: block; margin-bottom: 0.5rem; font-weight: bold; color: var(--text-primary);">${I18n.t('common.people_needed')} <=</label>
                        <div style="display: flex; gap: 0.5rem;">
                            <button class="filter-option ${activeFilters.peopleCount === 5 ? 'active' : ''}" data-filter="peopleCount" data-value="5" style="flex: 1; padding: 0.6rem; border: 2px solid var(--border-color); border-radius: 8px; background: ${activeFilters.peopleCount === 5 ? 'var(--primary-light)' : 'var(--bg-card)'}; color: ${activeFilters.peopleCount === 5 ? 'white' : 'inherit'}; cursor: pointer;">5</button>
                            <button class="filter-option ${activeFilters.peopleCount === 10 ? 'active' : ''}" data-filter="peopleCount" data-value="10" style="flex: 1; padding: 0.6rem; border: 2px solid var(--border-color); border-radius: 8px; background: ${activeFilters.peopleCount === 10 ? 'var(--primary-light)' : 'var(--bg-card)'}; color: ${activeFilters.peopleCount === 10 ? 'white' : 'inherit'}; cursor: pointer;">10</button>
                            <button class="filter-option ${activeFilters.peopleCount === 20 ? 'active' : ''}" data-filter="peopleCount" data-value="20" style="flex: 1; padding: 0.6rem; border: 2px solid var(--border-color); border-radius: 8px; background: ${activeFilters.peopleCount === 20 ? 'var(--primary-light)' : 'var(--bg-card)'}; color: ${activeFilters.peopleCount === 20 ? 'white' : 'inherit'}; cursor: pointer;">20</button>
                        </div>
                    </div>

                    <div style="display: flex; gap: 0.5rem; margin-top: 2rem;">
                        <button onclick="window.resetFilters()" class="btn" style="flex: 1; background: var(--bg-body); color: var(--text-primary); border: 1px solid var(--border-color);">${I18n.t('common.reset')}</button>
                        <button onclick="window.applyFilters()" class="btn btn-primary" style="flex: 2;">${I18n.t('common.apply')}</button>
                    </div>
                </div>
            </div>
            <style>
                @keyframes slideUp { from { transform: translateY(100%); } to { transform: translateY(0); } }
                .slide-up { animation: slideUp 0.3s ease-out; }
            </style>
        `;
    };

    const renderManage = async () => {
        let myPosts = [];
        try {
            const response = await fetch('/my-activities/' + user.email);
            const data = await response.json();
            const dbPosts = Array.isArray(data) ? data : [];
            myPosts = dbPosts.map(p => ({
                id: p.id, category: p.category, teamName: p.title, eventType: p.sport_type, maxParticipants: p.people_needed,
                eventTime: p.event_time, deadline: p.deadline, meetingPoint: p.location, description: p.description, status: p.status || 'open',
                authorId: p.host_email, hostName: user.displayName || user.name, hostDept: user.department || ''
            }));
        } catch (error) { console.error("Gagal ambil data:", error); }

        const savedLang = localStorage.getItem('language') || localStorage.getItem('lang') || localStorage.getItem('i18nextLng') || '';
        const isZH = savedLang.toLowerCase().includes('zh');

        const txtManageTitle = isZH ? '⚙️ 管理我的活動' : '⚙️ Manage My Events';
        const txtNoData = isZH ? '尚未建立任何活動。' : 'No events created yet.';
        const txtCreateBtn = isZH ? '+ 建立新活動' : '+ Create New Event';

        const postsHtmlArray = await Promise.all(myPosts.map(async p => {
            let pendingApps = [];
            let acceptedApps = [];
            
            // 1. Fetch from Server (Source of Truth)
            try {
                const data = await api.fetch(`/api/v1/host/participants?event_type=sports&event_id=${p.id}&host_email=${user.email}`, { idempotency: false });
                if (data.success && data.data) {
                    pendingApps = data.data.filter(a => a.status === 'pending');
                    acceptedApps = data.data.filter(a => a.status === 'approved' || a.status === 'accepted');
                }
            } catch (e) { console.warn("Failed to fetch server participants, falling back to local.", e); }

            // 2. Legacy Fallback
            if (pendingApps.length === 0 && acceptedApps.length === 0) {
                const legacyApps = window.AppEngine.getApps(p.id) || [];
                pendingApps = legacyApps.filter(a => a.status === 'pending');
                acceptedApps = legacyApps.filter(a => a.status === 'accepted');
            }

            const totalActiveCount = Math.max(1, parseInt(p.approvedCount) || 0);

            let statusBadge = '';
            if (p.status === 'open') statusBadge = `<span style="font-size: 0.8rem; color: #4CAF50; border: 1px solid #4CAF50; padding: 2px 6px; border-radius: 4px;">🟢 ${isZH ? '狀態: 招募中' : 'Status: OK'}</span>`;
            else if (p.status === 'paused') statusBadge = `<span style="font-size: 0.8rem; color: #ff9800; border: 1px solid #ff9800; padding: 2px 6px; border-radius: 4px;">⏸️ ${isZH ? '暫停招募' : 'Paused'}</span>`;
            else if (p.status === 'success') statusBadge = `<span style="font-size: 0.8rem; color: #2196f3; border: 1px solid #2196f3; padding: 2px 6px; border-radius: 4px;">🎉 ${isZH ? '已成案' : 'Success'}</span>`;
            else statusBadge = `<span style="font-size: 0.8rem; color: #f44336; border: 1px solid #f44336; padding: 2px 6px; border-radius: 4px;">✗ ${isZH ? '已取消' : 'Cancelled'}</span>`;

            let participantsView = '';
            if (pendingApps.length > 0 || acceptedApps.length > 0) {
                participantsView = `
                <div style="background: var(--bg-body); padding: 1rem; border-radius: 8px; margin-bottom: 1rem;">
                    <h5 style="margin: 0 0 0.8rem 0; font-size: 0.95rem;">👥 ${isZH ? '報名名單' : 'Participants'} (${totalActiveCount}/${p.maxParticipants})</h5>
                    
                    ${pendingApps.length > 0 ? `<div style="font-size: 0.8rem; font-weight: bold; color: #ff9800; margin-bottom: 0.5rem; padding-bottom: 0.2rem; border-bottom: 1px solid #ffe0b2;">⏳ ${isZH ? '待確認' : 'Pending Confirmation'}:</div>` : ''}
                    ${pendingApps.map(app => `
                    <div style="display: flex; justify-content: space-between; align-items: center; padding: 0.5rem 0;">
                        <span style="font-size: 0.9rem; color: var(--text-primary);"><b>${app.snapshot_display_name || app.applicantName}</b> <span style="color: var(--text-secondary);">(${app.applicantDept || ''})</span></span>
                        <button class="btn" onclick="window.showReviewApplicationModal('${app.id}', '${p.id}', '${app.user_email || app.user_id || app.applicantId}', '${p.teamName.replace(/'/g, "\\'").replace(/"/g, '&quot;')}', 'sports', null)" style="padding: 4px 10px; font-size: 0.75rem; background: #FF9800; color: white; border: none; border-radius: 4px; cursor: pointer;">${isZH ? '查看申請' : 'Review'}</button>
                    </div>
                    `).join('')}

                    <div style="font-size: 0.8rem; font-weight: bold; color: #4caf50; margin-top: 1rem; margin-bottom: 0.5rem; padding-bottom: 0.2rem; border-bottom: 1px solid #c8e6c9;">✅ ${isZH ? '已加入' : 'Joined'}:</div>
                    
                    <!-- NEW: Explicit Host Row -->
                    <div style="display: flex; justify-content: space-between; align-items: center; padding: 0.5rem 0; border-bottom: 1px dashed #eee;">
                        <span style="font-size: 0.9rem; color: var(--text-primary);">⭐ <b>${p.hostName || 'Host'}</b> <span style="font-size: 0.75rem; background: #E3F2FD; color: #1976D2; padding: 1px 6px; border-radius: 4px; margin-left: 4px;">Host</span></span>
                    </div>
                    ${acceptedApps.map(app => `
                    <div style="display: flex; justify-content: space-between; align-items: center; padding: 0.5rem 0;">
                        <span style="font-size: 0.9rem; color: var(--text-primary);">${app.snapshot_display_name || app.applicantName} <span style="color: var(--text-secondary);">(${app.applicantDept || ''})</span></span>
                    </div>
                    `).join('')}
                </div>`;
            } else {
                participantsView = `<p style="font-size: 0.9rem; color: #888; background: #f9f9f9; padding: 1rem; border-radius: 8px; text-align: center;">${isZH ? '尚未有參與者。' : 'No participants yet.'}</p>`;
            }

            const txtChat = isZH ? '進入聊天室' : 'Enter Chat Room';
            const txtPause = isZH ? '暫停招募' : 'Pause Recruiting';
            const txtResume = isZH ? '繼續招募' : 'Resume Recruiting';
            const txtSuccess = isZH ? '✓ 成案' : '✓ Success';
            const txtCancel = isZH ? '取消' : 'Cancel';

            return `
                <div class="card" style="${p.status === 'cancelled' || p.status === 'expired' ? 'opacity: 0.6;' : ''} margin-bottom: 1.5rem; border: 1px solid var(--border-color); box-shadow: var(--shadow-sm);">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem;">
                        <h4 style="margin: 0; font-size: 1.2rem; color: var(--text-primary);">${p.teamName}</h4>
                        ${statusBadge}
                    </div>
                    <div style="display: flex; justify-content: space-between; align-items: center; font-size: 0.9rem; color: var(--text-secondary); margin-bottom: 1rem;">
                        <span>📅 ${new Date(p.eventTime).toLocaleDateString()}</span>
                        <span style="font-weight: bold; color: #FF9800;">👥 ${totalActiveCount} / ${p.maxParticipants}</span>
                    </div>

                    ${participantsView}

                    <div style="display: flex; flex-direction: column; gap: 0.5rem;">
                        <button class="btn" style="padding: 0.8rem; background: #1976D2; color: white; border: none; border-radius: 8px; font-weight: bold;" onclick="window.openGroupChat('${p.id}')">💬 ${txtChat}</button>

                        ${p.status === 'open' ? `
                            <button class="btn" style="background: #FF9800; color: white; padding: 0.8rem; border-radius: 8px; font-weight: bold; border: none;" onclick="window.pauseRecruiting('${p.id}')">⏸️ ${txtPause}</button>
                            <button class="btn" style="background: #2196f3; color: white; padding: 0.8rem; border-radius: 8px; font-weight: bold; border: none;" onclick="window.confirmSuccess('${p.id}')">${txtSuccess}</button>
                            <button class="btn" style="background: #F44336; color: white; padding: 0.8rem; border-radius: 8px; font-weight: bold; border: none;" onclick="window.cancelPost('${p.id}')">${txtCancel}</button>
                        ` : p.status === 'paused' ? `
                            <button class="btn" style="background: #FFC107; color: white; padding: 0.8rem; border-radius: 8px; font-weight: bold; border: none;" onclick="window.resumeRecruiting('${p.id}')">▶️ ${txtResume}</button>
                            <button class="btn" style="background: #2196f3; color: white; padding: 0.8rem; border-radius: 8px; font-weight: bold; border: none;" onclick="window.confirmSuccess('${p.id}')">${txtSuccess}</button>
                            <button class="btn" style="background: #F44336; color: white; padding: 0.8rem; border-radius: 8px; font-weight: bold; border: none;" onclick="window.cancelPost('${p.id}')">${txtCancel}</button>
                        ` : ''}
                        <button class="btn" style="background: var(--bg-secondary); color: var(--text-primary); padding: 0.8rem; border-radius: 8px; font-weight: bold; border: 1px solid var(--border-color);" onclick="window.deletePost('${p.id}', 'sports')">${isZH ? '🗑️ 刪除' : '🗑️ Delete'}</button>
                    </div>
                </div>
            `;
        }));

        return `
            <div class="container fade-in" style="padding-bottom: 80px;">
                <header style="margin-bottom: 1.5rem; display: flex; align-items: center;">
                    <button class="btn-back" style="background: none; border: none; font-size: 1.5rem; margin-right: 1rem; cursor: pointer;">⬅️</button>
                    <h2>${txtManageTitle}</h2>
                </header>

                ${myPosts.length > 0 ? `
                    <section style="margin-bottom: 2rem;">
                        ${postsHtmlArray.join('')}
                    </section>
                ` : `
                    <div style="text-align: center; padding: 3rem 1rem; color: var(--text-secondary);">
                        <div style="font-size: 3rem; margin-bottom: 1rem;">📝</div>
                        <p>${txtNoData}</p>
                        <button onclick="window.setState('create', 'host')" class="btn btn-primary" style="margin-top: 1rem;">${txtCreateBtn}</button>
                    </div>
                `}
            </div>
        `;
    };

    const updateView = async () => {
        if (currentState === 'landing') {
            app.innerHTML = renderLanding();
            bindLandingListeners();
        } else if (currentState === 'create') {
            app.innerHTML = renderCreatePost();
            bindCreateListeners();
        } else if (currentState === 'list') {
            app.innerHTML = await renderList();
            bindListListeners();
        } else if (currentState === 'manage') {
            app.innerHTML = await renderManage();
            bindManageListeners();
        }
    };

    const bindLandingListeners = () => {
        document.getElementById('btn-role-host')?.addEventListener('click', async () => {
            if (await checkBlocking()) return;
            currentState = 'create';
            userRole = 'host';
            updateView();
        });

        document.getElementById('btn-role-partner')?.addEventListener('click', async () => {
            if (await checkBlocking()) return;
            currentState = 'list';
            userRole = 'partner';
            updateView();
        });

        document.getElementById('btn-manage')?.addEventListener('click', () => {
            currentState = 'manage';
            updateView();
        });
    };

    const bindCreateListeners = () => {
        document.querySelector('.btn-back')?.addEventListener('click', () => {
            currentState = 'landing';
            updateView();
        });

        const eventTypeSelect = document.getElementById('eventType');
        const customEventTypeInput = document.getElementById('customEventType');
        eventTypeSelect?.addEventListener('change', () => {
            if (eventTypeSelect.value === '其他') {
                customEventTypeInput.style.display = 'block';
                customEventTypeInput.required = true;
            } else {
                customEventTypeInput.style.display = 'none';
                customEventTypeInput.required = false;
            }
        });

        const meetingSelect = document.getElementById('meetingPoint');
        const customInput = document.getElementById('customLocation');
        meetingSelect?.addEventListener('change', () => {
            if (meetingSelect.value === '自訂') {
                customInput.style.display = 'block';
                customInput.required = true;
            } else {
                customInput.style.display = 'none';
                customInput.required = false;
            }
        });

        document.getElementById('createPostForm')?.addEventListener('submit', async (e) => {
            e.preventDefault();

            const userProfile = JSON.parse(localStorage.getItem('userProfile'));
            if (!userProfile || !userProfile.email) {
                return alert("Oops! You must be logged in to create an event.");
            }

            const sportType = document.getElementById('eventType').value === '其他'
                ? document.getElementById('customEventType').value
                : document.getElementById('eventType').value;

            const location = document.getElementById('meetingPoint').value === '自訂'
                ? document.getElementById('customLocation').value
                : document.getElementById('meetingPoint').value;

            const btnSubmit = e.target.querySelector('button[type="submit"]');
            const originalText = btnSubmit.innerText;
            btnSubmit.innerText = "⏳ Submitting...";
            btnSubmit.disabled = true;

            try {
                const response = await fetch('/create-activity', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        host_email: userProfile.email,
                        host_name: userProfile.displayName || userProfile.name || 'User',
                        host_dept: userProfile.department || userProfile.major || 'N/A',
                        category: CATEGORY_ID,
                        title: document.getElementById('teamName').value,
                        sport_type: sportType,
                        people_needed: parseInt(document.getElementById('requiredPeople').value),
                        event_time: document.getElementById('eventTime').value,
                        deadline: document.getElementById('deadline').value,
                        location: location,
                        description: document.getElementById('description').value
                    })
                });

                const result = await response.json();

                if (response.ok) {
                    if (window.refreshUserProfile) await window.refreshUserProfile();
                    alert(I18n.t('common.success') + " 🎉");
                    e.target.reset();
                    currentState = 'manage';
                    updateView();
                } else {
                    const errorMsg = result.fields ? `${result.error}: ${result.fields.join(', ')}` : result.error;
                    alert("⚠️ " + (I18n.t('common.error') || "Error") + ": " + (errorMsg || "Unknown error"));
                }

            } catch (error) {
                alert("❌ " + (I18n.t('common.error') || "Connection Error") + ": " + error.message);
            } finally {
                btnSubmit.innerText = originalText;
                btnSubmit.disabled = false;
            }
        });

    };

    const bindFilterOptions = () => {
        document.querySelectorAll('.filter-option').forEach(btn => {
            btn.addEventListener('click', async function () {
                const filterType = this.getAttribute('data-filter');
                const value = this.getAttribute('data-value');

                if (activeFilters[filterType] === value || (filterType === 'peopleCount' && activeFilters[filterType] === parseInt(value))) {
                    activeFilters[filterType] = null;
                } else {
                    activeFilters[filterType] = filterType === 'peopleCount' ? parseInt(value) : value;
                }

                const filterOverlay = document.getElementById('filter-overlay');
                if (filterOverlay) {
                    filterOverlay.outerHTML = await renderFilterPanel();
                    bindFilterOptions();
                }
            });
        });
    };

    const bindListListeners = () => {
        document.getElementById('btn-list-back')?.addEventListener('click', () => {
            activeFilters.keyword = null; // Re-reset
            currentState = 'landing';
            updateView();
        });

        const searchInput = document.getElementById('search-events');
        searchInput?.addEventListener('input', (e) => {
            activeFilters.keyword = e.target.value;
            if (window._searchTimeout) clearTimeout(window._searchTimeout);
            window._searchTimeout = setTimeout(async () => {
                const refreshedHtml = await renderList();
                // Instead of clearing app.innerHTML, let's try to just update the list part if possible, 
                // but sports.js is structured to re-render everything.
                // We'll restore focus meticulously.
                const lastFocusedId = document.activeElement?.id;
                const selectionStart = document.activeElement?.selectionStart;
                app.innerHTML = refreshedHtml;
                bindListListeners();
                if (lastFocusedId) {
                    const el = document.getElementById(lastFocusedId);
                    if (el) {
                        el.focus();
                        if (selectionStart !== undefined) el.setSelectionRange(selectionStart, selectionStart);
                    }
                }
            }, 300);
        });

        document.getElementById('btn-filter')?.addEventListener('click', async () => {
            const existingOverlay = document.getElementById('filter-overlay');
            if (existingOverlay) existingOverlay.remove();

            app.insertAdjacentHTML('beforeend', await renderFilterPanel());
            bindFilterOptions();
        });

        document.getElementById('btn-clear-filters')?.addEventListener('click', () => {
            activeFilters = {
                eventType: null,
                dateRange: null,
                peopleCount: null
            };
            updateView();
        });
    };

    const bindManageListeners = () => {
        document.querySelector('.btn-back')?.addEventListener('click', () => {
            currentState = 'landing';
            updateView();
        });
    };

    window.setState = (state, role) => {
        currentState = state;
        userRole = role || '';
        updateView();
    };

    window.closeFilterPanel = () => {
        const overlay = document.getElementById('filter-overlay');
        if (overlay) {
            overlay.remove();
        }
    };

    window.resetFilters = async () => {
        activeFilters = {
            eventType: null,
            dateRange: null,
            peopleCount: null
        };
        const filterOverlay = document.getElementById('filter-overlay');
        if (filterOverlay) {
            filterOverlay.outerHTML = await renderFilterPanel();
            bindFilterOptions();
        }
    };

    window.applyFilters = () => {
        window.closeFilterPanel();
        updateView();
    };

    window.updateActivityStatus = async (postId, newStatus) => {
        try {
            const response = await fetch(`/update-activity-status/${postId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: newStatus })
            });

            if (response.ok) {
                if (window.refreshUserProfile) await window.refreshUserProfile();
                updateView();
            } else {
                alert(I18n.t('common.error') + " update database.");
            }
        } catch (error) {
            alert("Error server: " + error.message);
        }
    };

    window.pauseRecruiting = (postId) => {
        if (confirm(I18n.t('common.confirm') + ' Pause?')) {
            window.updateActivityStatus(postId, 'paused');
        }
    };

    window.resumeRecruiting = (postId) => {
        if (confirm(I18n.t('common.confirm') + ' Continue?')) {
            window.updateActivityStatus(postId, 'open');
        }
    };

    window.confirmSuccess = (postId) => {
        if (confirm(I18n.t('common.confirm') + ' Complete?')) {
            window.updateActivityStatus(postId, 'success');
        }
    };

    window.cancelPost = async (postId) => {
        const savedLang = localStorage.getItem('language') || localStorage.getItem('lang') || 'zh-TW';
        const isZH = savedLang.toLowerCase().includes('zh');
        const userProfile = JSON.parse(localStorage.getItem('userProfile') || '{}');

        // --- Fetch created_at ---
        let createdAt = null;
        try {
            const res = await fetch(`/activity/${postId}`);
            const data = await res.json();
            createdAt = data.created_at || null;
        } catch (e) { console.warn('Could not fetch activity created_at:', e); }

        if (createdAt) {
            const ageMs = Date.now() - new Date(createdAt).getTime();
            const GRACE_PERIOD_MS = 10 * 60 * 1000;

            if (ageMs <= GRACE_PERIOD_MS) {
                const silentMsg = isZH ? "此活動剛建立不久，確定要取消嗎？" : "This event was just created. Are you sure you want to cancel?";
                if (!confirm(silentMsg)) return;
                window.updateActivityStatus(postId, 'cancelled');
                return;
            }
        }

        // --- > 10 minutes → Mandatory Feedback Modal ---
        const existingModal = document.getElementById('cancel-feedback-overlay');
        if (existingModal) existingModal.remove();

        const reasons = isZH ? [
            { value: 'schedule_conflict', label: '🗓️ 時間衝突 / 有其他安排' },
            { value: 'not_enough_people', label: '👥 人數不足 / 沒人報名' },
            { value: 'wrong_info', label: '📝 發佈資訊有誤' },
            { value: 'personal_reason', label: '🙋 個人原因' },
            { value: 'other', label: '💬 其他原因' }
        ] : [
            { value: 'schedule_conflict', label: '🗓️ Schedule Conflict' },
            { value: 'not_enough_people', label: '👥 Not Enough Participants' },
            { value: 'wrong_info', label: '📝 Posted Wrong Information' },
            { value: 'personal_reason', label: '🙋 Personal Reason' },
            { value: 'other', label: '💬 Other' }
        ];

        const reasonRadios = reasons.map(r => `
            <label>
                <input type="radio" name="cancel-reason" value="${r.value}">
                <span>${r.label}</span>
            </label>
        `).join('');

        const modalHtml = `
            <div class="cancel-feedback-overlay" id="cancel-feedback-overlay">
                <div class="cancel-feedback-modal">
                    <div class="cancel-warning-badge">⚠️ ${isZH ? '取消前必填' : 'Required Before Cancel'}</div>
                    <h3>${isZH ? '為什麼要取消此活動？' : 'Why are you canceling this event?'}</h3>
                    <p class="modal-subtitle">${isZH
                        ? '請告訴我們取消原因。取消已有已核准參與者的活動，或在活動開始前最後 2 小時內取消，將扣除 2 點信用積分。'
                        : 'Please tell us the reason. Canceling with accepted participants, or within 2 hours of start time, will result in a -2 point deduction.'}</p>
                    <div class="cancel-reason-group" id="cancel-reason-group">${reasonRadios}</div>
                    <textarea class="cancel-detail-textarea" id="cancel-detail-text" placeholder="${isZH ? '補充說明（選填）...' : 'Additional details (optional)...'}"></textarea>
                    <button class="cancel-submit-btn" id="cancel-submit-btn" disabled>${isZH ? '❌ 確認取消並送出' : '❌ Confirm Cancel & Submit'}</button>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', modalHtml);

        const escHandler = (e) => { if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); } };
        document.addEventListener('keydown', escHandler, true);

        const overlay = document.getElementById('cancel-feedback-overlay');
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) {
                e.preventDefault(); e.stopPropagation();
                const modal = overlay.querySelector('.cancel-feedback-modal');
                modal.style.animation = 'none';
                requestAnimationFrame(() => { modal.style.animation = 'cancelModalIn 0.35s cubic-bezier(0.34, 1.56, 0.64, 1)'; });
            }
        });

        document.getElementById('cancel-reason-group').addEventListener('change', () => {
            document.getElementById('cancel-submit-btn').disabled = !document.querySelector('input[name="cancel-reason"]:checked');
        });

        document.getElementById('cancel-submit-btn').addEventListener('click', async () => {
            const selected = document.querySelector('input[name="cancel-reason"]:checked');
            if (!selected) return;
            const submitBtn = document.getElementById('cancel-submit-btn');
            submitBtn.disabled = true;
            submitBtn.textContent = isZH ? '⏳ 處理中...' : '⏳ Processing...';
            try {
                await fetch('/api/v1/cancellation-feedback', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ event_id: postId, event_category: 'sports', user_email: userProfile.email || '', action_type: 'cancel', reason: selected.value, detail: document.getElementById('cancel-detail-text').value || '' })
                });
                await window.updateActivityStatus(postId, 'cancelled');
            } catch (error) {
                console.error("Cancel Error:", error);
                alert(isZH ? "❌ 發生錯誤，請稍後再試。" : "❌ An error occurred. Please try again later.");
                submitBtn.disabled = false;
                submitBtn.textContent = isZH ? '❌ 確認取消並送出' : '❌ Confirm Cancel & Submit';
            } finally {
                document.removeEventListener('keydown', escHandler, true);
                overlay?.remove();
            }
        });
    };

    window.openGroupChat = (activityId) => {
        const userProfileStr = localStorage.getItem('userProfile');
        if (!userProfileStr) {
            alert(I18n.t('auth.err.login_required') || "Please login first!");
            return;
        }
        window.navigateTo(`messages?room=sports_${activityId}`);
    };

    updateView();
};
