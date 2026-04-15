import { MockStore } from '../models/mockStore.js?v=21';
import { AirtableService } from '../services/airtableService.js';
import { I18n } from '../services/i18n.js';

export const renderAdminDashboard = async () => { // <-- JADIKAN ASYNC
    const app = document.getElementById('app');

    // Allowed Admin Credentials
    const ALLOWED_ADMINS = [
        { email: 's112212030@mail1.ncnu.edu.tw', pwd: 'joinup30admin', name: '張棣惠' },
        { email: 's112212025@mail1.ncnu.edu.tw', pwd: 'joinup25admin', name: '陳冠蓁' },
        { email: 's112212026@mail1.ncnu.edu.tw', pwd: 'joinup26admin', name: '林詩芸' },
        { email: 's112212051@mail1.ncnu.edu.tw', pwd: 'joinup51admin', name: '鄭飛英' },
        { email: 's112212052@mail1.ncnu.edu.tw', pwd: 'joinup52admin', name: '許薇荌' },
        { email: 's112212060@mail1.ncnu.edu.tw', pwd: 'joinup60admin', name: '楊慧賢' }
    ];

    // Admin Authentication Check
    const isAuthenticated = sessionStorage.getItem('isAdminAuthenticated') === 'true';
    const adminName = sessionStorage.getItem('adminName') || 'Admin';

    if (!isAuthenticated) {
        app.innerHTML = `
            <div class="container fade-in" style="padding-top: 4rem; text-align: center;">
                <div style="font-size: 3rem; margin-bottom: 1rem;">🔒</div>
                <h2 style="margin-bottom: 0.5rem;">${I18n.t('admin.login_title')}</h2>
                <p style="color: #666; margin-bottom: 2rem;">${I18n.t('admin.login_desc')}</p>

                <div class="card" style="max-width: 400px; margin: 0 auto; text-align: left;">
                    <div style="margin-bottom: 1rem;">
                        <label style="display: block; margin-bottom: 0.5rem; font-weight: bold;">${I18n.t('admin.email_label')}</label>
                        <input type="email" id="admin-email" placeholder="name@mail1.ncnu.edu.tw" style="width: 100%; padding: 0.8rem; border: 1px solid #ddd; border-radius: 8px;">
                    </div>
                    <div style="margin-bottom: 1.5rem;">
                        <label style="display: block; margin-bottom: 0.5rem; font-weight: bold;">${I18n.t('admin.pwd_label')}</label>
                        <input type="password" id="admin-pwd" placeholder="${I18n.t('admin.pwd_label')}" style="width: 100%; padding: 0.8rem; border: 1px solid #ddd; border-radius: 8px;">
                    </div>
                    <button onclick="window.handleAdminLogin()" style="width: 100%; background: #333; color: white; padding: 1rem; border: none; border-radius: 8px; font-weight: bold; cursor: pointer;">
                        ${I18n.t('admin.login_btn')}
                    </button>
                    <button onclick="window.navigateTo('profile')" style="width: 100%; background: none; color: #666; padding: 1rem; border: none; margin-top: 0.5rem; cursor: pointer;">
                        ${I18n.t('admin.back_to_profile')}
                    </button>
                </div>
            </div>
        `;

        window.handleAdminLogin = async () => {
            const email = document.getElementById('admin-email').value;
            const pwd = document.getElementById('admin-pwd').value;

            const localAdmin = ALLOWED_ADMINS.find(a => a.email === email && a.pwd === pwd);
            if (localAdmin) {
                sessionStorage.setItem('isAdminAuthenticated', 'true');
                sessionStorage.setItem('adminName', localAdmin.name);
                renderAdminDashboard();
                return;
            }

            const adminCheck = await AirtableService.verifyAdmin(email, pwd);
            if (adminCheck.success) {
                sessionStorage.setItem('isAdminAuthenticated', 'true');
                sessionStorage.setItem('adminName', adminCheck.name);
                renderAdminDashboard();
            } else {
                alert('❌ 帳號或密碼錯誤 (Invalid email or password)');
            }
        };
        return;
    }

    // ==========================================
    // 1. DATA FETCHING (TERMASUK MYSQL FEEDBACK)
    // ==========================================
    const stats = JSON.parse(localStorage.getItem('match_statistics') || '[]');
    const total = stats.length;
    const successCount = stats.filter(s => s.status === 'Success').length;
    const cancelledCount = stats.filter(s => s.status === 'Cancelled').length;
    const expiredCount = stats.filter(s => s.status === 'Expired').length;
    stats.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    const reports = MockStore.getReports ? MockStore.getReports() : [];
    const inboxMessages = MockStore.getAgentInboxMessages ? MockStore.getAgentInboxMessages() : [];
    const unreadSupportCount = inboxMessages.filter(m => m.status === 'unread').length;
    const auditLogs = MockStore.getAuditLogs ? MockStore.getAuditLogs() : [];

    // --- FETCH DATA FEEDBACK DARI MYSQL ---
    let feedbackStats = [];
    let feedbackDetails = [];
    try {
        const res = await fetch('/admin/feedback-stats');
        if (res.ok) {
            const data = await res.json();
            feedbackStats = data.stats || [];
            feedbackDetails = data.details || [];
        }
    } catch (e) { console.error("Gagal load feedback MySQL:", e); }

    // ==========================================
    // 2. RENDER HTML COMPONENTS
    // ==========================================
    const getStatusStyle = (status) => {
        switch (status) {
            case 'Success': return 'background: #E8F5E9; color: #2E7D32;';
            case 'Full': return 'background: #E3F2FD; color: #1565C0;';
            case 'Cancelled': return 'background: #FFEBEE; color: #C62828;';
            case 'Expired': return 'background: #FFF3E0; color: #E65100;';
            default: return 'background: #F5F5F5; color: #616161;';
        }
    };
    const getStatusLabel = (status) => {
        switch (status) {
            case 'Success': return '✓ 成案'; case 'Full': return '滿額';
            case 'Cancelled': return '✗ 取消'; case 'Expired': return '⏰ 過期'; default: return status;
        }
    };

    const reportRows = reports.map(r => { /* ... Kodingan asli ... */
        let chatRoomLink = '';
        if (r.targetId) {
            const rooms = MockStore.getChatRooms ? MockStore.getChatRooms(r.reporterId) : [];
            const relevantRoom = rooms.find(room => (room.postId === r.targetId) || (room.participants && room.participants.some(p => (typeof p === 'string' ? p : p.id) === r.targetId)));
            if (relevantRoom) chatRoomLink = `<br><button onclick="window.navigateTo('messages?room=${relevantRoom.id}')" style="margin-top:5px; padding:2px 8px; font-size: 0.8rem; background: #E3F2FD; color: #1565C0; border: 1px solid #1565C0; border-radius: 4px; cursor: pointer;">🔍 查看對話記錄 (Chat Logs)</button>`;
        }
        return `
        <tr style="background: ${r.status === 'resolved' ? '#f9f9f9' : r.status === 'dismissed' ? '#f0f0f0' : 'white'}; opacity: ${r.status === 'dismissed' ? 0.6 : 1}">
             <td style="padding: 0.8rem; border-bottom: 1px solid #eee;"><span style="padding: 2px 8px; border-radius: 12px; font-size: 0.8rem; background: ${r.type === 'bug' ? '#FFEBEE; color: #C62828' : r.type === 'violation' ? '#FFF3E0; color: #E65100' : '#E8F5E9; color: #2E7D32'};">${r.type === 'bug' ? '🐛 報修' : r.type === 'violation' ? '⚠️ 違規' : '💡 建議'}</span></td>
            <td style="padding: 0.8rem; border-bottom: 1px solid #eee; font-size: 0.9rem;"><div style="font-weight: bold; margin-bottom: 4px;">回報類別: <span style="color: #666; font-weight: normal;">${r.category || '未分類'}</span></div><div style="background: #FFF3E0; padding: 8px; border-radius: 4px;">${r.description}</div>${r.targetId ? `<small style="color: #666; display:block; margin-top:5px;">目標: ${r.targetType} #${r.targetId}</small>` : ''}<div style="margin-top: 10px; display: flex; gap: 10px;"><button onclick="window.viewReportDetails('${r.id}')" style="background: #1976D2; color: white; border: none; padding: 4px 12px; border-radius: 4px; cursor: pointer; font-size: 0.8rem;">🔍 調查詳情 / 定案</button>${chatRoomLink ? `<div style="font-size: 0.8rem; border: 1px solid #ddd; padding: 4px 8px; border-radius: 4px;">${chatRoomLink.replace('window.navigateTo', `window.handleAdminAuditView('${r.id}', 'view_chat',`)}</div>` : ''}</div></td>
            <td style="padding: 0.8rem; border-bottom: 1px solid #eee; font-size: 0.85rem; color: #666;">${r.reporterName}<br>${new Date(r.createdAt || r.timestamp).toLocaleString('zh-TW')}</td>
            <td style="padding: 0.8rem; border-bottom: 1px solid #eee;"><span style="font-size: 0.8rem; color: #666;">${r.status}</span></td>
            <td style="padding: 0.8rem; border-bottom: 1px solid #eee;">
                ${r.status === 'pending' ? `
                    <div style="display: flex; flex-direction: column; gap: 0.5rem;">
                        <button onclick="window.handleReportAction('${r.id}', 'dismiss')" style="padding: 4px; font-size: 0.8rem; cursor: pointer; border-radius: 4px; border: 1px solid #ddd;">${I18n.t('admin.report.action_dismiss')}</button>
                        ${r.targetType === 'user' ? `
                            <button onclick="window.viewReportDetails('${r.id}')" style="padding: 4px; font-size: 0.8rem; cursor: pointer; background: #FFEBEE; color: #C62828; border: 1px solid #C62828; border-radius: 4px; font-weight: bold;">🚫 ${I18n.t('admin.report.action_deduct')}</button>
                            <button onclick="window.handleReportAction('${r.id}', 'warn', '${r.targetId}')" style="padding: 4px; font-size: 0.8rem; cursor: pointer; background: #FFF9C4; color: #856404; border: 1px solid #FBC02D; border-radius: 4px;">${I18n.t('admin.report.action_warn')}</button>
                            <button onclick="window.handleReportAction('${r.id}', 'suspend', '${r.targetId}')" style="padding: 4px; font-size: 0.8rem; cursor: pointer; background: #FDECEA; color: #D32F2F; border: 1px solid #D32F2F; border-radius: 4px;">${I18n.t('admin.report.action_suspend')}</button>
                        ` : ''}
                    </div>
                ` : '-'}
            </td>
        </tr>
        `;
    }).join('');

    // RENDER HTML UNTUK TAB FEEDBACK BARU
    const feedbackStatsHtml = feedbackStats.length > 0 ? feedbackStats.map(s => {
        const successRate = s.total_feedback > 0 ? Math.round((s.success_count / s.total_feedback) * 100) : 0;
        return `
            <div style="background: white; border-radius: 8px; padding: 15px; border-left: 4px solid #FF9800; border: 1px solid #eee;">
                <h4 style="margin: 0 0 10px 0; text-transform: uppercase; color: #333;">📂 ${s.category}</h4>
                <div style="font-size: 0.9rem; margin-bottom: 5px;">Total Feedback: <b>${s.total_feedback}</b></div>
                <div style="font-size: 0.9rem; margin-bottom: 5px;">Avg Experience: <b>⭐ ${parseFloat(s.avg_q1).toFixed(1)}</b></div>
                <div style="font-size: 0.9rem; margin-bottom: 5px;">Avg Recommend: <b>⭐ ${parseFloat(s.avg_q2).toFixed(1)}</b></div>
                <div style="font-size: 0.9rem; color: ${successRate > 50 ? '#2E7D32' : '#D32F2F'};">Success Rate: <b>${successRate}%</b></div>
            </div>
        `;
    }).join('') : '<p style="color: #888; text-align: center; grid-column: 1 / -1;">No feedback stats available.</p>';

    const feedbackDetailsHtml = feedbackDetails.length > 0 ? feedbackDetails.map(d => `
        <tr>
            <td style="padding: 10px; border-bottom: 1px solid #eee; font-size: 0.85rem;"><b>${d.user_name}</b><br><span style="color:#888">${d.user_dept}</span></td>
            <td style="padding: 10px; border-bottom: 1px solid #eee; font-size: 0.85rem;"><span style="color:#1976D2; font-weight: bold;">[${d.category}]</span><br>${d.event_title}</td>
            <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: center; font-size: 0.85rem;">⭐ ${d.q1_rating}</td>
            <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: center; font-size: 0.85rem;">⭐ ${d.q2_rating}</td>
            <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: center; font-size: 0.85rem;">${d.q3_success ? '✅' : '❌'}</td>
            <td style="padding: 10px; border-bottom: 1px solid #eee; font-size: 0.85rem; max-width: 200px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" title="${d.q4_message || ''}">${d.q4_message || '-'}</td>
            <td style="padding: 10px; border-bottom: 1px solid #eee; font-size: 0.8rem; color: #888;">${new Date(d.created_at).toLocaleDateString()}</td>
        </tr>
    `).join('') : '<tr><td colspan="7" style="text-align:center; padding: 20px; color: #888;">No detailed feedback yet.</td></tr>';

    // ==========================================
    // 3. INJECT KE APP
    // ==========================================
    app.innerHTML = `
        <div class="container fade-in" style="padding-bottom: 80px;">
            <header style="margin-bottom: 1.5rem; display: flex; align-items: center; justify-content: space-between;">
                <div style="display: flex; align-items: center;">
                    <button onclick="window.navigateTo('profile')" style="background: none; border: none; font-size: 1.5rem; margin-right: 1rem; cursor: pointer;">⬅️</button>
                    <h2 style="margin: 0;">🛠️ ${I18n.t('admin.title')} <span style="font-size: 0.9rem; font-weight: normal; color: #999;">Hi, ${adminName}</span></h2>
                </div>
                <button onclick="sessionStorage.removeItem('isAdminAuthenticated'); sessionStorage.removeItem('adminName'); renderAdminDashboard();" style="background: none; border: 1px solid #ddd; padding: 5px 12px; border-radius: 4px; cursor: pointer; font-size: 0.85rem; color: #666;">${I18n.t('profile.btn.logout')}</button>
            </header>

            <div style="display: flex; gap: 1rem; margin-bottom: 2rem; border-bottom: 1px solid #eee; padding-bottom: 0.5rem; overflow-x: auto;">
                <button id="tab-stats" onclick="window.switchAdminTab('stats')" style="background: none; border: none; padding: 10px; font-weight: bold; cursor: pointer; border-bottom: 3px solid var(--primary-color); white-space: nowrap;">${I18n.t('admin.tab.stats')}</button>
                <button id="tab-reports" onclick="window.switchAdminTab('reports')" style="background: none; border: none; padding: 10px; font-weight: bold; cursor: pointer; white-space: nowrap;">${I18n.t('admin.tab.reports')} (${reports.filter(r => r.status === 'pending').length})</button>
                <button id="tab-feedback" onclick="window.switchAdminTab('feedback')" style="background: none; border: none; padding: 10px; font-weight: bold; cursor: pointer; white-space: nowrap; color: #FF9800;">📊 Feedback Analytics</button>
                <button id="tab-inbox" onclick="window.switchAdminTab('inbox')" style="background: none; border: none; padding: 10px; font-weight: bold; cursor: pointer; white-space: nowrap;">
                    Inbox ${unreadSupportCount > 0 ? `<span style="background: #D32F2F; color: white; border-radius: 10px; padding: 2px 6px; font-size: 0.7rem; margin-left: 4px;">${unreadSupportCount}</span>` : ''}
                </button>
                <button id="tab-notifications" onclick="window.switchAdminTab('notifications')" style="background: none; border: none; padding: 10px; font-weight: bold; cursor: pointer; white-space: nowrap;">通知追蹤</button>
                <button id="tab-audit" onclick="window.switchAdminTab('audit')" style="background: none; border: none; padding: 10px; font-weight: bold; cursor: pointer; white-space: nowrap;">${I18n.t('admin.tab.audit')}</button>
            </div>

            <div id="section-stats">
                <div class="card" style="margin-bottom: 2rem; padding: 1.5rem;">
                    <h4 style="margin: 0 0 1rem 0; color: #666;">成案統計</h4>
                    <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 1rem; text-align: center;">
                        <div style="background: #f8f9fa; padding: 1rem; border-radius: 8px;">
                            <div style="font-size: 1.5rem; color: #333; font-weight: bold;">${total}</div>
                            <div style="font-size: 0.8rem; color: #666;">總件數</div>
                        </div>
                        <div style="background: #E8F5E9; padding: 1rem; border-radius: 8px;">
                            <div style="font-size: 1.5rem; color: #2E7D32; font-weight: bold;">${successCount}</div>
                            <div style="font-size: 0.8rem; color: #2E7D32;">成功</div>
                        </div>
                         <div style="background: #FFF3E0; padding: 1rem; border-radius: 8px;">
                            <div style="font-size: 1.5rem; color: #E65100; font-weight: bold;">${expiredCount + cancelledCount}</div>
                            <div style="font-size: 0.8rem; color: #E65100;">未達成</div>
                        </div>
                        <div style="background: #E3F2FD; padding: 1rem; border-radius: 8px;">
                            <div style="font-size: 1.5rem; color: #1565C0; font-weight: bold;">${reports.length}</div>
                            <div style="font-size: 0.8rem; color: #1565C0;">回饋數</div>
                        </div>
                    </div>
                </div>
            </div>

            <div id="section-reports" style="display: none;">
                <h3 style="margin-bottom: 1rem;">⚖️ 檢舉審核面板</h3>
                <div class="card" style="overflow-x: auto; padding: 0; margin-bottom: 2rem;">
                    <table style="width: 100%; border-collapse: collapse; min-width: 600px;">
                        <thead style="background: #f5f5f5;">
                            <tr>
                                <th style="padding: 0.8rem; text-align: left; font-size: 0.9rem;">類別</th>
                                <th style="padding: 0.8rem; text-align: left; font-size: 0.9rem;">檢舉內容與證據</th>
                                <th style="padding: 0.8rem; text-align: left; font-size: 0.9rem; width: 150px;">回報者</th>
                                <th style="padding: 0.8rem; text-align: left; font-size: 0.9rem; width: 80px;">狀態</th>
                                <th style="padding: 0.8rem; text-align: left; font-size: 0.9rem; width: 140px;">決策</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${reportRows.length ? reportRows : '<tr><td colspan="5" style="padding: 3rem; text-align: center; color: #999;">目前無待處理的檢舉</td></tr>'}
                        </tbody>
                    </table>
                </div>
            </div>

            <div id="section-feedback" style="display: none;">
                <h3 style="margin-bottom: 1rem; color: #FF9800;">📊 滿意度與數據分析 (MySQL Feedback)</h3>
                
                <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 15px; margin-bottom: 20px;">
                    ${feedbackStatsHtml}
                </div>

                <div class="card" style="padding: 0; overflow-x: auto; border: 1px solid #ddd;">
                    <table style="width: 100%; border-collapse: collapse; min-width: 600px;">
                        <thead style="background: #f5f5f5;">
                            <tr>
                                <th style="padding: 10px; text-align: left; border-bottom: 2px solid #ddd;">User</th>
                                <th style="padding: 10px; text-align: left; border-bottom: 2px solid #ddd;">Event</th>
                                <th style="padding: 10px; text-align: center; border-bottom: 2px solid #ddd;">Exp (Q1)</th>
                                <th style="padding: 10px; text-align: center; border-bottom: 2px solid #ddd;">Rec (Q2)</th>
                                <th style="padding: 10px; text-align: center; border-bottom: 2px solid #ddd;">Success</th>
                                <th style="padding: 10px; text-align: left; border-bottom: 2px solid #ddd;">Message</th>
                                <th style="padding: 10px; text-align: left; border-bottom: 2px solid #ddd;">Date</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${feedbackDetailsHtml}
                        </tbody>
                    </table>
                </div>
            </div>

            <div id="section-inbox" style="display: none;">
                <h3 style="margin-bottom: 1rem;">📩 Agent Inbox (客服中心)</h3>
                <div class="card" style="padding: 0; overflow: hidden;">
                    ${(() => {
            if (inboxMessages.length === 0) return '<div style="padding: 3rem; text-align: center; color: #999;">目前沒有私訊訊息</div>';
            return inboxMessages.map(room => {
                const userPart = room.participants.find(p => p.role === 'user');
                return `
                                <div onclick="window.navigateTo('messages?room=${room.id}')" style="padding: 1.2rem; border-bottom: 1px solid #eee; display: flex; justify-content: space-between; align-items: center; cursor: pointer; transition: 0.2s;" onmouseover="this.style.background='#f5f5f5'" onmouseout="this.style.background='white'">
                                    <div style="display: flex; align-items: center; gap: 1rem;">
                                        <div style="width: 45px; height: 45px; background: #E3F2FD; color: #1976D2; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 1.2rem;">${(userPart?.name || 'U').charAt(0)}</div>
                                        <div>
                                            <div style="font-weight: bold;">${userPart?.name || '未知'} <small style="color: #999;">(${userPart?.id || ''})</small></div>
                                            <div style="font-size: 0.9rem; color: #666; margin-top: 4px;">${room.lastMessage || '無訊息'}</div>
                                        </div>
                                    </div>
                                    <div style="text-align: right;">
                                        <div style="font-size: 0.75rem; color: #999; margin-bottom: 4px;">${new Date(room.lastMessageAt || room.createdAt).toLocaleString()}</div>
                                        <span style="font-size: 0.7rem; padding: 2px 8px; border-radius: 10px; background: ${room.status === 'unread' ? '#D32F2F; color: white' : '#E0E0E0; color: #666'}">${room.status || 'Active'}</span>
                                    </div>
                                </div>
                            `;
            }).join('');
        })()}
                </div>
            </div>

            <div id="section-notifications" style="display: none;">
                <h3 style="margin-bottom: 1rem;">🔔 違規通知發送狀態</h3>
                <div class="card" style="padding: 0; overflow: hidden;">
                    <table style="width: 100%; border-collapse: collapse;">
                        <thead style="background: #f5f5f5;">
                            <tr>
                                <th style="padding: 1rem; text-align: left;">時間</th>
                                <th style="padding: 1rem; text-align: left;">用戶</th>
                                <th style="padding: 1rem; text-align: left;">內容</th>
                                <th style="padding: 1rem; text-align: left;">狀態</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${(() => {
            const notifs = MockStore.getSystemNotifications ? MockStore.getSystemNotifications() : [];
            if (notifs.length === 0) return '<tr><td colspan="4" style="padding: 3rem; text-align: center; color: #999;">目前無發送記錄</td></tr>';
            return notifs.map(n => `
                                    <tr>
                                        <td style="padding: 1rem; border-bottom: 1px solid #eee; font-size: 0.85rem;">${new Date(n.timestamp).toLocaleString()}</td>
                                        <td style="padding: 1rem; border-bottom: 1px solid #eee;">${n.userId}</td>
                                        <td style="padding: 1rem; border-bottom: 1px solid #eee; font-size: 0.85rem;">${n.body}</td>
                                        <td style="padding: 1rem; border-bottom: 1px solid #eee;">
                                            <span style="padding: 3px 8px; border-radius: 12px; font-size: 0.75rem; background: ${n.status === 'opened' ? '#E8F5E9' : '#FFF3E0'}; color: ${n.status === 'opened' ? '#2E7D32' : '#E65100'}; border: 1px solid ${n.status === 'opened' ? '#C8E6C9' : '#FFE0B2'};">
                                                ${n.status === 'opened' ? '已開啟 (Opened)' : '已送達 (Delivered)'}
                                            </span>
                                        </td>
                                    </tr>
                                `).join('');
        })()}
                        </tbody>
                    </table>
                </div>
            </div>

            <div id="section-audit" style="display: none;">
                <h3 style="margin-bottom: 1rem;">🕵️ 隱私稽核日誌 (Privacy Guard)</h3>
                <div class="card" style="padding: 0; overflow: hidden;">
                    <table style="width: 100%; border-collapse: collapse;">
                        <thead style="background: #f5f5f5;">
                            <tr>
                                <th style="padding: 0.8rem; text-align: left; font-size: 0.8rem;">時間</th>
                                <th style="padding: 0.8rem; text-align: left; font-size: 0.8rem;">管理員</th>
                                <th style="padding: 0.8rem; text-align: left; font-size: 0.8rem;">操作</th>
                                <th style="padding: 0.8rem; text-align: left; font-size: 0.8rem;">目標</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${auditLogs.length ? auditLogs.reverse().map(l => `
                                <tr>
                                    <td style="padding: 0.8rem; border-bottom: 1px solid #eee; font-size: 0.8rem; color: #666;">${new Date(l.timestamp).toLocaleString()}</td>
                                    <td style="padding: 0.8rem; border-bottom: 1px solid #eee; font-size: 0.85rem; font-weight: bold;">${l.adminId}</td>
                                    <td style="padding: 0.8rem; border-bottom: 1px solid #eee; font-size: 0.85rem;">
                                        <span style="color: ${l.action.includes('view') ? '#1976D2' : '#D32F2F'}">${l.action === 'view_chat' ? '👁️ 調閱私密對話' : l.action}</span>
                                    </td>
                                    <td style="padding: 0.8rem; border-bottom: 1px solid #eee; font-size: 0.75rem; font-family: monospace;">${l.targetId}</td>
                                </tr>
                            `).join('') : '<tr><td colspan="4" style="padding: 2rem; text-align: center; color: #999;">尚無稽核紀錄</td></tr>'}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    `;

    // ==========================================
    // 4. GLOBAL UI HANDLERS
    // ==========================================
    window.switchAdminTab = (tabId) => {
        // 👇 UPDATE FUNGSI SWITCH TAB UNTUK MEMASUKKAN 'feedback' 👇
        ['stats', 'reports', 'feedback', 'inbox', 'notifications', 'audit'].forEach(id => {
            const section = document.getElementById('section-' + id);
            const tab = document.getElementById('tab-' + id);
            if (section) section.style.display = (id === tabId) ? 'block' : 'none';
            if (tab) tab.style.borderBottom = (id === tabId) ? '3px solid var(--primary-color)' : 'none';
        });
    };

    window.handleAdminAuditView = (reportId, action, roomId) => {
        const currentAdmin = sessionStorage.getItem('adminName') || 'SystemAdmin';
        MockStore.logAdminAction(currentAdmin, action, roomId);
        window.navigateTo('messages?room=' + roomId);
    };

    window.handleReportAction = (reportId, action, targetUserId) => {
        if (!confirm('確定要執行此操作嗎？')) return;
        const currentAdmin = sessionStorage.getItem('adminName') || 'SystemAdmin';

        if (action === 'dismiss') {
            MockStore.updateReportStatus(reportId, 'dismissed');
            MockStore.logAdminAction(currentAdmin, 'dismiss_report', reportId);
        } else if (action === 'warn') {
            const reason = prompt('請輸入警告原因 (Traditional Chinese):', '違反社群行為準則');
            if (!reason) return;
            MockStore.warnUser(targetUserId, reason);
            MockStore.updateReportStatus(reportId, 'resolved');
            MockStore.logAdminAction(currentAdmin, 'warn_user', targetUserId);
            alert('已成功發送系統警告通知。');
        } else if (action === 'suspend') {
            MockStore.suspendUser(targetUserId, 3, '嚴重違反社群規範 - 管理員停權');
            MockStore.updateReportStatus(reportId, 'resolved');
            MockStore.logAdminAction(currentAdmin, 'suspend_user', targetUserId);
            alert('用戶已被停權 3 天，且系統已自動發送違規通知。');
        }
        renderAdminDashboard();
    };

    window.handleCreditAction = async (reportId, targetUserId, points) => {
        const reason = prompt('請輸入扣分原因:', '違反社群行為準則');
        if (!reason) return;
        const currentAdmin = sessionStorage.getItem('adminName') || 'SystemAdmin';

        if (confirm(`確定要扣除 ${targetUserId} 的 ${points} 點信用積分嗎？`)) {
            await MockStore.deductTrustPoints(targetUserId, points, reason, currentAdmin);
            MockStore.updateReportStatus(reportId, 'resolved');
            MockStore.logAdminAction(currentAdmin, 'deduct_credit', targetUserId);
            alert('已成功扣除點數並通知用戶。');
            renderAdminDashboard();
        }
    };
};

// --- Phase 6: Admin Investigation Handlers ---
window.viewReportDetails = (reportId) => {
    const reports = MockStore.getReports();
    const report = reports.find(r => r.id === reportId);
    if (!report) return;

    const history = MockStore.getUserViolationHistory(report.targetId);
    const context = MockStore.getReportContext(reportId, 100000);
    const adminName = sessionStorage.getItem('adminName') || 'Admin';

    // Audit Log Entry
    MockStore.logAdminAction(adminName, 'view_report_details', reportId);

    const modal = document.createElement('div');
    modal.id = 'report-detail-modal';
    modal.style = `
        position: fixed; top: 0; left: 0; right: 0; bottom: 0;
        background: rgba(0,0,0,0.6); backdrop-filter: blur(5px);
        z-index: 10000; display: flex; align-items: center; justify-content: center;
    `;

    modal.innerHTML = `
        <div class="card fade-in" style="width: 90%; max-width: 800px; max-height: 90vh; overflow-y: auto; padding: 2.5rem; position: relative; border-radius: 12px; background: #fff; box-shadow: 0 10px 40px rgba(0,0,0,0.3); border: 1px solid #ddd;">
            <button onclick="document.getElementById('report-detail-modal').remove()" style="position: absolute; top: 1rem; right: 1rem; background: #f0f0f0; border: none; width: 36px; height: 36px; border-radius: 50%; cursor: pointer; font-size: 1.2rem; display: flex; align-items: center; justify-content: center;">✕</button>
            
            <h2 style="margin-top: 0; margin-bottom: 2rem; display: flex; align-items: center; gap: 12px; color: #333;">🛡️ ${I18n.t('admin.report.action_details')} <small style="font-weight: normal; color: #999; font-size: 0.9rem;">Case #${report.id}</small></h2>
            
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 2rem; margin-bottom: 2rem;">
                <div style="background: #fdfdfd; padding: 1.5rem; border-radius: 8px; border: 1px solid #eee;">
                    <h4 style="margin-top: 0; border-bottom: 2px solid #D32F2F; padding-bottom: 8px; color: #555;">👤 ${I18n.t('profile.violation_points')}</h4>

                    <div style="margin-top: 15px; line-height: 1.6;">
                        <div style="margin-bottom: 5px;"><strong>${I18n.t('admin.email_label')}:</strong> ${report.targetId}</div>
                        <div style="display: flex; gap: 10px; flex-wrap: wrap; margin-top: 10px;">
                            <div style="flex: 1; min-width: 100px; background: ${history.strikeCount >= 3 ? '#FFEBEE' : '#F5F5F5'}; padding: 10px; border-radius: 6px; text-align: center; border: 1px solid #eee;">
                                <div style="font-size: 0.7rem; color: #666; margin-bottom: 2px;">${I18n.t('profile.credit_score')}</div>
                                <div style="font-size: 1.2rem; font-weight: bold; color: ${history.violationScore > 0 ? '#D32F2F' : '#333'}">${history.violationScore}</div>
                            </div>
                            <div style="flex: 1; min-width: 100px; background: ${history.strikeCount >= 3 ? '#ffebee' : '#f5f5f5'}; padding: 10px; border-radius: 6px; text-align: center; border: 1px solid #eee;">
                                <div style="font-size: 0.7rem; color: #666; margin-bottom: 2px;">Confirmed Violations</div>
                                <div style="font-size: 1.2rem; font-weight: bold; color: ${history.strikeCount >= 3 ? '#D32F2F' : '#333'}">${history.strikeCount}/3</div>
                            </div>
                        </div>
                        ${history.isBlacklisted ? `
                            <div style="margin-top: 15px; padding: 8px; background: #000; color: #FFEB3B; border-radius: 4px; font-weight: bold; text-align: center; font-size: 0.85rem;">
                                🚫 已列入黑名單 (Blacklisted)
                            </div>
                        ` : ''}
                    </div>
                </div>
                <div style="background: #fdfdfd; padding: 1.5rem; border-radius: 8px; border: 1px solid #eee;">
                    <h4 style="margin-top: 0; border-bottom: 2px solid #1976D2; padding-bottom: 8px; color: #555;">📝 Report Summary</h4>
                    <div style="margin-top: 15px; line-height: 1.6;">
                        <div><strong>Target Type:</strong> ${report.targetType}</div>
                        <div><strong>Category:</strong> <span style="color: #E65100; font-weight: bold;">${report.category || 'Uncategorized'}</span></div>
                        <div style="margin-top: 10px; padding: 10px; background: #FFF3E0; border-radius: 6px; font-size: 0.9rem; border-left: 4px solid #FBC02D;">"${report.description}"</div>
                    </div>
                </div>
            </div>

            <div style="margin-bottom: 2rem;">
                <h4 style="border-bottom: 1px solid #eee; padding-bottom: 8px; display: flex; justify-content: space-between; align-items: center;">
                    <span style="color: #555;">💬 證據上下文 (證據存檔範圍)</span>
                    <div style="display: flex; align-items: center; gap: 8px;">
                        <span style="padding: 2px 8px; background: #E0E0E0; border-radius: 10px; font-size: 0.7rem;">View Only</span>
                        <small style="color: #999; font-weight: normal;">顯示最後 100,000 條</small>
                    </div>
                </h4>
                <div style="background: #f1f3f5; border: 1px solid #dee2e6; border-radius: 8px; padding: 1.5rem; max-height: 350px; overflow-y: auto; font-family: 'Inter', sans-serif; font-size: 0.9rem; margin-top: 15px;">
                    ${context.length ? context.map(m => `
                        <div style="margin-bottom: 12px; display: flex; flex-direction: column;">
                            <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 4px;">
                                <strong style="color: ${m.senderId === report.targetId ? '#D32F2F' : '#1976D2'}; font-size: 0.85rem;">${m.senderName}</strong>
                                ${m.senderId === report.targetId ? '<small style="background: #FFEBEE; color: #D32F2F; padding: 0 4px; border-radius: 2px; font-size: 0.65rem;">REPORTED</small>' : ''}
                                <small style="color: #999; font-size: 0.7rem;">${new Date(m.timestamp).toLocaleTimeString()}</small>
                            </div>
                            <div style="background: #fff; border: 1px solid ${m.senderId === report.targetId ? '#FFCDD2' : '#E0E0E0'}; padding: 8px 12px; border-radius: 0 12px 12px 12px; max-width: 90%; align-self: flex-start; box-shadow: 0 1px 2px rgba(0,0,0,0.05);">
                                ${m.content}
                            </div>
                        </div>
                    `).join('') : '<div style="text-align: center; color: #999; padding: 3rem; background: #fff; border-radius: 8px;">此案件無聊天證據 (或目標非聊天室)</div>'}
                </div>
            </div>

            <div style="display: flex; gap: 1.5rem; border-top: 1px solid #eee; padding-top: 2rem; justify-content: center; flex-wrap: wrap;">
                <button onclick="window.handleDecision('${report.id}', 'dismiss')" style="padding: 12px 24px; background: #fff; color: #2E7D32; border: 2px solid #2E7D32; border-radius: 8px; cursor: pointer; font-weight: bold; transition: all 0.2s;" onmouseover="this.style.background='#E8F5E9'" onmouseout="this.style.background='#fff'">✅ ${I18n.t('admin.report.action_dismiss')} (Not Guilty)</button>
                
                <div style="display: flex; align-items: center; gap: 10px; background: #FFEBEE; padding: 5px 15px; border-radius: 8px; border: 1px solid #FFCDD2;">
                    <span style="font-weight: bold; font-size: 0.9rem; color: #D32F2F;">Verdict:</span>
                    <select id="point-amount" style="padding: 5px; border-radius: 4px; border: 1px solid #D32F2F;">
                        <option value="1">-1 Point (Minor Violation)</option>
                        <option value="2">-2 Points (Serious Misconduct)</option>
                        <option value="5">-5 Points (Fatal Violation / Blacklist)</option>
                    </select>
                    <button onclick="window.handleDecision('${report.id}', 'deduct', '${report.targetId}')" style="padding: 8px 16px; background: #D32F2F; color: #fff; border: none; border-radius: 6px; cursor: pointer; font-weight: bold;">Confirmed Violation</button>
                </div>
                
                <button onclick="window.handleDecision('${report.id}', 'warn', '${report.targetId}')" style="padding: 12px 24px; background: #FFF9C4; color: #856404; border: 2px solid #FBC02D; border-radius: 8px; cursor: pointer; font-weight: bold;">⚠️ Send Warning Only</button>
            </div>
        </div>
    `;

    document.body.appendChild(modal);

    modal.onclick = (e) => {
        if (e.target === modal) modal.remove();
    };
};

window.handleDecision = async (reportId, action, targetUserId) => {
    const adminName = sessionStorage.getItem('adminName') || 'Admin';

    if (action === 'dismiss') {
        if (!confirm('裁定此案件無違規並關閉？')) return;
        MockStore.updateReportStatus(reportId, 'dismissed');
        MockStore.logAdminAction(adminName, 'dismiss_report_not_guilty', reportId);
        alert('案件已關閉，無任何處分。');
    } else {
        const context = MockStore.getReportContext(reportId, 100000);
        MockStore.archiveEvidence(reportId, context);

        if (action === 'deduct') {
            const amount = parseInt(document.getElementById('point-amount').value);
            const reason = prompt('請輸入確診違規原因 (將記錄於黑名單 Sheets):', '違反社群準則');
            if (!reason) return;

            await MockStore.deductTrustPoints(targetUserId, amount, reason, adminName);
            MockStore.updateReportStatus(reportId, 'resolved');
            alert(`裁決成功：扣除 ${amount} 點違規積分。證據已存檔。`);
        } else if (action === 'warn') {
            const reason = prompt('請輸入警告原因:', '違反社群行為準則');
            if (!reason) return;
            await MockStore.warnUser(targetUserId, reason);
            MockStore.updateReportStatus(reportId, 'resolved');
            MockStore.logAdminAction(adminName, 'warn_user_manual', targetUserId);
            alert('警告已發送。');
        } else if (action === 'suspend') {
            const daysStr = prompt('懲處停權天數 (輸入 0 為永久黑名單並同步至 Sheets):', '3');
            if (daysStr === null) return;
            const days = parseInt(daysStr);
            const reason = prompt('懲處原因:', '嚴重的社群違規行為');
            if (!reason) return;

            await MockStore.suspendUser(targetUserId, days, reason);
            MockStore.updateReportStatus(reportId, 'resolved');
            MockStore.logAdminAction(adminName, 'suspend_user_final', targetUserId);
            alert('裁定已執行。');
        }
    }

    const modal = document.getElementById('report-detail-modal');
    if (modal) modal.remove();
    renderAdminDashboard();
};
