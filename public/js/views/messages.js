import { I18n } from '../services/i18n.js';
import { formatTime, formatListDate } from '../utils/dateFormatter.js';
import { openRatingModal } from './rating.js?v=4';

let chatInterval = null;

const playNotificationSound = () => {
    try {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        if (!AudioContext) return;
        const ctx = new AudioContext();
        const oscillator = ctx.createOscillator();
        const gainNode = ctx.createGain();
        oscillator.connect(gainNode);
        gainNode.connect(ctx.destination);
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(880, ctx.currentTime);
        gainNode.gain.setValueAtTime(0.1, ctx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.00001, ctx.currentTime + 0.5);
        oscillator.start();
        oscillator.stop(ctx.currentTime + 0.5);
    } catch (e) { console.error('Audio play failed', e); }
};

const renderChatRoomUnified = async (roomId, user, prefill, appElement) => {
    let lastMsgCount = 0;
    let chatTitle = I18n.t('common.chat') || 'Room Chat';

    // 1. Deteksi Kategori dari ID
    let roomType = 'sports';
    let realId = String(roomId);

    if (realId.includes('_')) {
        const parts = realId.split('_');
        roomType = parts[0].toLowerCase(); // Udah di-lowercase biar aman
        realId = parts[1];
    }

    let isHost = false;
    let activityStatus = 'open';

    // 2. Ambil Judul Event & DAFTARKAN RUANGAN
    try {
        let fetchUrl = '/activities';
        if (roomType === 'hangout' || roomType === 'travel' || roomType === 'food') fetchUrl = '/hangouts';
        else if (roomType === 'carpool') fetchUrl = '/carpools';
        else if (roomType === 'study') fetchUrl = '/studies';
        else if (roomType === 'housing' || roomType === 'groupbuy') fetchUrl = '/housing';

        const res = await fetch(fetchUrl);
        const data = await res.json();
        const currentItem = data.find(i => String(i.id) === realId);

        if (currentItem) {
            if (currentItem.title) chatTitle = currentItem.title;
            else if (currentItem.teamName) chatTitle = currentItem.teamName;
            
            isHost = (currentItem.host_email === user.email);
            activityStatus = currentItem.status || 'open';
        } else {
            // Kalau ga ketemu, nyontek dari data Inbox
            const myRoomsRes = await fetch(`/my-chat-rooms/${user.email}`);
            if (myRoomsRes.ok) {
                const myRooms = await myRoomsRes.json();
                const existingRoom = myRooms.find(r => String(r.id) === String(roomId));
                if (existingRoom && existingRoom.teamName && existingRoom.teamName !== '聊天室') {
                    chatTitle = existingRoom.teamName;
                }
            }
        }

        // Daftarkan ke DB
        await fetch('/setup-chat-room', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                room_id: String(roomId),
                post_id: realId,
                room_type: roomType,
                team_name: chatTitle,
                participants: [{ id: user.email, name: user.displayName || user.name || 'User', role: 'participant' }]
            })
        });
    } catch (e) { console.error("Auto-Setup room error", e); }

    // PASTIKAN BARIS INI TIDAK TERHAPUS:
    appElement.innerHTML = `
        <div class="chat-container fade-in">
            <header class="chat-header">
                <div style="display: flex; align-items: center; gap: 10px;">
                    <button id="btn-back-messages" style="background: none; border: none; font-size: 1.5rem; cursor: pointer;">⬅️</button>
                    <div style="width: 40px; height: 40px; background: var(--primary-color); border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; font-size: 1.2rem;">💬</div>
                    <div>
                        <h3 style="margin: 0; font-size: 1.1rem; color: #111; max-width: 200px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${chatTitle}</h3>
                        <span style="font-size: 0.8rem; color: #25d366;">● Online</span>
                    </div>
                </div>
                
                <div style="display: flex; align-items: center; gap: 8px; position: relative;">
                    ${isHost && activityStatus !== 'success' ? `
                    <button id="btn-complete-activity" style="background: var(--primary-color); color: white; border: none; padding: 6px 12px; border-radius: 20px; font-size: 0.8rem; font-weight: bold; cursor: pointer; display: flex; align-items: center; gap: 4px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                        ✅ ${I18n.t('chat.action.complete') || 'Completed'}
                    </button>` : ''}
                    <button id="btn-chat-options" class="btn-icon">⋮</button>
                    <div id="chat-options-menu" style="display: none; position: absolute; right: 0; top: 100%; background: white; border: 1px solid #ddd; border-radius: 8px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); z-index: 200; min-width: 170px; overflow: hidden;">
                        ${(() => {
            const isZH = localStorage.getItem('language')?.includes('zh') || false;
            const txtKick = isZH ? '🛡️ 管理成員' : '🛡️ Kick Members';
            return `
                            <button onclick="window.showKickMemberModal('${roomId}')" style="width: 100%; text-align: left; padding: 12px; background: #fff5f5; border: none; border-bottom: 1px solid #eee; cursor: pointer; color: #E64A19; font-weight: bold;">
                                ${txtKick}
                            </button>
                            `;
        })()}
                        <button id="menu-report" style="width: 100%; text-align: left; padding: 12px; background: none; border: none; border-bottom: 1px solid #eee; cursor: pointer; color: #D32F2F;">⚠️ ${I18n.t('chat.menu.report') || 'Report'}</button>
                        <button id="menu-album" style="width: 100%; text-align: left; padding: 12px; background: none; border: none; border-bottom: 1px solid #eee; cursor: pointer; color: #333;">🖼️ ${I18n.t('chat.menu.album') || 'Album'}</button>
                        <button id="menu-clear" style="width: 100%; text-align: left; padding: 12px; background: none; border: none; cursor: pointer; color: #333;">🗑️ ${I18n.t('chat.menu.clear') || 'Clear Cache'}</button>
                    </div>
                </div>
            </header>

            <div id="chat-pinned-banner" style="display: none; background: #fff3cd; color: #856404; padding: 10px 15px; font-size: 0.85rem; border-bottom: 1px solid #ffeeba; align-items: center; gap: 10px; z-index: 9; box-shadow: 0 2px 4px rgba(0,0,0,0.05);">
                <span style="font-size: 1.2rem;">📌</span>
                <div style="flex: 1; overflow: hidden;">
                    <strong id="pinned-sender" style="display: block; font-size: 0.75rem; opacity: 0.8;"></strong>
                    <div id="pinned-text" style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis;"></div>
                </div>
            </div>

            <div id="chat-messages-area" class="chat-message-area">
                <div style="text-align:center; color:#888; margin-top: 20px; font-size: 0.9rem;">${I18n.t('chat.connecting') || 'Connecting...'}</div>
            </div>

            <div class="chat-input-area">
                <input type="file" id="input-file-chat" style="display: none;" accept="image/*, .pdf, .doc, .docx">
                <button id="btn-attach" class="btn-icon" title="${I18n.t('chat.send_file') || 'Attach'}">📎</button>
                <button id="btn-location" class="btn-icon" title="${I18n.t('chat.send_location') || 'Location'}">📍</button>
                <input type="text" id="chat-input-msg" class="chat-input-box" placeholder="${I18n.t('messages.input.placeholder') || 'Type a message...'}" value="${prefill || ''}">
                <button id="btn-send-msg" class="btn-send">➤</button>
            </div>
        </div>
    `;

    const messageArea = document.getElementById('chat-messages-area');
    const inputField = document.getElementById('chat-input-msg');
    const pinnedBanner = document.getElementById('chat-pinned-banner');

    window.jumpToMsg = (msgId) => {
        const el = document.getElementById(`msg-${msgId}`);
        if (el) {
            const historyModal = document.getElementById('history-modal-overlay');
            if (historyModal) historyModal.remove();

            el.scrollIntoView({ behavior: 'smooth', block: 'center' });
            const originalBg = el.style.backgroundColor;
            el.style.transition = 'background-color 0.5s ease';
            el.style.backgroundColor = '#ffeaa7';
            setTimeout(() => { el.style.backgroundColor = originalBg || ''; }, 1500);
        }
    };

    const loadMessages = async (isInitial = false) => {
        try {
            // SEMUA FITUR SEKARANG BACA DARI JALUR BARU
            const res = await fetch(`/room-messages/${roomId}`);
            const dbMsgs = await res.json();

            if (!Array.isArray(dbMsgs)) return; // Baju Zirah

            let rawMessages = dbMsgs.map(m => {
                const safeMsg = m.message || '';
                return {
                    id: m.id, sender_email: m.sender_email, sender_name: m.sender_name, created_at: m.created_at,
                    message_type: safeMsg.startsWith('!') ? 'announcement' : 'text', content: safeMsg.replace('!', '').trim(),
                    role: 'participant', sender_dept: '', sender_student_id: ''
                };
            });

            if (!isInitial && rawMessages.length > lastMsgCount) {
                const lastMsg = rawMessages[rawMessages.length - 1];
                if (lastMsg.sender_email !== user.email) playNotificationSound();
            }
            lastMsgCount = rawMessages.length;

            messageArea.innerHTML = '';

            if (rawMessages.length === 0) {
                messageArea.innerHTML = `<div style="text-align:center; color:#888; margin-top: 20px; font-size: 0.9rem;">${I18n.t('common.no_data') || 'No messages yet.'}</div>`;
                return;
            }

            const allAnnouncements = rawMessages.filter(m => m.message_type === 'announcement' || (m.content && String(m.content).startsWith('!')));
            const latestAnnouncement = allAnnouncements.length > 0 ? allAnnouncements[allAnnouncements.length - 1] : null;

            rawMessages.forEach(msg => {
                const isMine = msg.sender_email === user.email;
                const date = new Date(msg.created_at);
                const timeStr = `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
                const crownIcon = msg.role === 'host' ? '👑 ' : '';
                const uniqueId = msg.id || new Date(msg.created_at).getTime();

                let contentHtml = msg.content || '';

                const googleMapsRegex = /https?:\/\/(?:www\.)?(?:google\.com\/maps|maps\.google\.com|goo\.gl\/maps|maps\.app\.goo\.gl)\/\S+/i;
                if (contentHtml && (contentHtml.startsWith('http://googleusercontent.com/maps') || googleMapsRegex.test(contentHtml))) {
                    msg.message_type = 'location';
                } else if (contentHtml && contentHtml.match(/\.(jpeg|jpg|gif|png)$/i) && contentHtml.startsWith('http')) {
                    msg.message_type = 'image';
                } else if (contentHtml && contentHtml.match(/\.(pdf|doc|docx)$/i) && contentHtml.startsWith('http')) {
                    msg.message_type = 'file';
                }

                if (msg.message_type === 'location') {
                    const isGoogleMaps = googleMapsRegex.test(contentHtml);
                    
                    if (isGoogleMaps) {
                        contentHtml = `
                            <a href="${contentHtml}" target="_blank" class="location-card">
                                <div class="location-icon-wrapper">
                                    <span class="location-icon">📍</span>
                                </div>
                                <div class="location-card-content">
                                    <span class="location-card-title">Google Maps Location</span>
                                    <span class="location-card-subtitle">${I18n.t('chat.location.view_on_maps') || 'View Location on Google Maps'}</span>
                                </div>
                            </a>
                        `;
                    } else {
                        // Original OpenStreetMap logic for coordinate-based locations
                        let lat = 23.9510, lng = 120.9280;
                        const match = contentHtml.match(/([-+]?\d*\.\d+),\s*([-+]?\d*\.\d+)/);
                        if (match) { lat = parseFloat(match[1]); lng = parseFloat(match[2]); }
                        contentHtml = `
                            <a href="${contentHtml}" target="_blank" style="text-decoration: none; display: block; width: 240px; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.15); margin-top: 5px;">
                                <div style="height: 130px; width: 100%; position: relative; background: #e5e3df; pointer-events: none;">
                                    <iframe width="100%" height="100%" frameborder="0" scrolling="no" marginheight="0" marginwidth="0" src="https://www.openstreetmap.org/export/embed.html?bbox=${lng - 0.005},${lat - 0.005},${lng + 0.005},${lat + 0.005}&layer=mapnik&marker=${lat},${lng}"></iframe>
                                </div>
                                <div style="padding: 10px; background: white; border-top: 1px solid #eee;">
                                    <div style="font-size: 0.95rem; color: #333; font-weight: bold; display: flex; align-items: center; gap: 6px;">
                                        <span style="color: #25d366; font-size: 1.2rem;">📍</span> Location
                                    </div>
                                    <div style="font-size: 0.75rem; color: #888; margin-top: 4px;">${lat.toFixed(4)}, ${lng.toFixed(4)}</div>
                                </div>
                            </a>
                        `;
                    }
                } else if (msg.message_type === 'image') {
                    contentHtml = `<a href="${contentHtml}" target="_blank"><img src="${contentHtml}" style="max-width: 100%; max-height: 250px; border-radius: 8px; margin-top: 5px;" alt="Image"></a>`;
                } else if (msg.message_type === 'file') {
                    const fileName = contentHtml.split('/').pop().substring(14) || 'File';
                    contentHtml = `📄 <a href="${contentHtml}" target="_blank" style="color: ${isMine ? '#d35400' : '#2980b9'}; font-weight: bold; text-decoration: underline;">Download File</a><br><small>${fileName}</small>`;
                }

                if (msg.message_type === 'announcement' || (msg.content && String(msg.content).startsWith('!'))) {
                    messageArea.innerHTML += `
                        <div id="msg-${uniqueId}" class="chat-announcement" style="padding: 10px; border-radius: 8px;">
                            📢 <b>${I18n.t('chat.announcement_label') || 'Announcement'} ${crownIcon}${msg.sender_name}</b><br>
                            ${contentHtml.replace('!', '').trim()}
                        </div>
                    `;
                } else {
                    messageArea.innerHTML += `
                        <div id="msg-${uniqueId}" class="chat-bubble ${isMine ? 'chat-mine' : 'chat-other'}" data-type="${msg.message_type}" data-content="${msg.content.replace(/"/g, '"')}">
                            ${!isMine ? `
                            <div class="chat-sender-info">
                                <span style="color: ${msg.role === 'host' ? '#e67e22' : '#3498db'};${msg.role === 'host' ? 'font-weight:900;' : ''}">${crownIcon}${msg.sender_name}</span>
                            </div>` : ''}
                            <div>${contentHtml}</div>
                            <div class="chat-time">${timeStr}</div>
                        </div>
                    `;
                }
            });

            if (latestAnnouncement) {
                pinnedBanner.style.display = 'flex';
                pinnedBanner.style.cursor = 'pointer';
                const latestId = latestAnnouncement.id || new Date(latestAnnouncement.created_at).getTime();
                const cleanText = latestAnnouncement.content.replace('!', '').trim();

                document.getElementById('pinned-sender').innerHTML = `${I18n.t('chat.pinned_by') || 'Pinned by'} <b>${latestAnnouncement.sender_name}</b> <span style="color: #e67e22; font-size: 0.75rem; margin-left: 5px;">${I18n.t('chat.view_all') || '(Click to view all)'}</span>`;
                document.getElementById('pinned-text').innerText = cleanText;

                pinnedBanner.onclick = () => {
                    if (allAnnouncements.length === 1) {
                        window.jumpToMsg(latestId);
                        return;
                    }

                    const historyModal = document.createElement('div');
                    historyModal.id = 'history-modal-overlay';
                    historyModal.style.cssText = 'position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.6); z-index: 9999; display: flex; align-items: center; justify-content: center; backdrop-filter: blur(2px);';

                    let listHtml = [...allAnnouncements].reverse().map(a => {
                        const aId = a.id || new Date(a.created_at).getTime();
                        return `
                        <div onclick="window.jumpToMsg('${aId}')" style="background: #fdf6e3; padding: 12px; border-radius: 8px; margin-bottom: 10px; border-left: 4px solid #f1c40f; box-shadow: 0 1px 3px rgba(0,0,0,0.05); cursor: pointer; transition: transform 0.2s;">
                            <div style="font-size: 0.75rem; color: #666; margin-bottom: 4px; display: flex; justify-content: space-between;">
                                <b>${a.sender_name}</b> 
                                <span>${new Date(a.created_at).toLocaleDateString()} ${new Date(a.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                            </div>
                            <div style="font-size: 0.95rem; color: #333; line-height: 1.4; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${a.content.replace('!', '').trim()}</div>
                            <div style="font-size: 0.7rem; color: #3498db; margin-top: 6px; text-align: right;">Click to jump to message ⤴</div>
                        </div>
                    `}).join('');

                    historyModal.innerHTML = `
                        <div style="background: white; width: 90%; max-width: 450px; max-height: 80vh; border-radius: 12px; padding: 1.5rem; display: flex; flex-direction: column; box-shadow: 0 4px 15px rgba(0,0,0,0.2);">
                            <h3 style="margin-top: 0; color: #333; margin-bottom: 15px; border-bottom: 2px solid #eee; padding-bottom: 10px;">${I18n.t('chat.history_title') || 'History'}</h3>
                            <div style="flex: 1; overflow-y: auto; padding-right: 5px;">
                                ${listHtml}
                            </div>
                            <div style="display: flex; justify-content: flex-end; margin-top: 15px;">
                                <button id="btn-close-history" style="padding: 10px 20px; border: none; background: #e0e0e0; color: #333; font-weight: bold; border-radius: 8px; cursor: pointer;">${I18n.t('common.cancel') || 'Close'}</button>
                            </div>
                        </div>
                    `;
                    document.body.appendChild(historyModal);
                    document.getElementById('btn-close-history').onclick = () => historyModal.remove();
                };
            } else {
                pinnedBanner.style.display = 'none';
            }

            if (isInitial) messageArea.scrollTop = messageArea.scrollHeight;
        } catch (err) { console.error("Gagal load chat:", err); }
    };

    const sendMessage = async (type = 'text', customContent = null) => {
        let content = customContent;
        if (type === 'text') {
            content = inputField.value.trim();
            if (!content) return;
            inputField.value = '';
        }

        let finalType = type;
        if (type === 'text' && content.startsWith('!')) {
            finalType = 'announcement';
            content = content.substring(1).trim();
        }

        try {
            // SEMUA PESAN SEKARANG DIKIRIM KE JALUR BARU
            const finalMessage = finalType === 'announcement' ? `! ${content}` : content;
            const sendRes = await fetch('/send-message', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    room_id: String(roomId),
                    sender_email: user.email,
                    sender_name: user.displayName || user.name || 'User',
                    message: finalMessage
                })
            });

            if (!sendRes.ok) {
                alert("Gagal kirim dari Server! Pastikan Node.js nyala.");
                return;
            }

            loadMessages();
            setTimeout(() => { messageArea.scrollTop = messageArea.scrollHeight; }, 100);
        } catch (err) {
            alert('Koneksi terputus: ' + err.message);
        }
    };

    let pressTimer;
    const startPress = (e) => {
        const bubble = e.target.closest('.chat-bubble');
        if (!bubble || bubble.getAttribute('data-type') !== 'text') return;
        const textContent = bubble.getAttribute('data-content');
        pressTimer = setTimeout(() => {
            if (confirm(I18n.t('chat.pin_confirm') || "Pin this message as an announcement?")) {
                sendMessage('announcement', textContent);
            }
        }, 1500);
    };
    const cancelPress = () => { clearTimeout(pressTimer); };

    messageArea.addEventListener('mousedown', startPress);
    messageArea.addEventListener('touchstart', startPress);
    messageArea.addEventListener('mouseup', cancelPress);
    messageArea.addEventListener('mouseleave', cancelPress);
    messageArea.addEventListener('touchend', cancelPress);
    messageArea.addEventListener('touchcancel', cancelPress);

    document.getElementById('btn-back-messages').addEventListener('click', () => {
        window.location.hash = 'messages';
        renderMessages();
    });

    document.getElementById('btn-send-msg').addEventListener('click', () => sendMessage('text'));
    inputField.addEventListener('keypress', (e) => { if (e.key === 'Enter') sendMessage('text'); });

    // Handle Completion
    if (isHost && document.getElementById('btn-complete-activity')) {
        document.getElementById('btn-complete-activity').onclick = async () => {
            if (!confirm(I18n.t('chat.confirm.complete') || 'Confirm activity completion?')) return;

            try {
                let statusUrl = `/update-activity-status/${realId}`;
                if (roomType === 'carpool') statusUrl = `/update-carpool-status/${realId}`;
                else if (roomType === 'study') statusUrl = `/update-study-status/${realId}`;
                else if (roomType === 'hangout' || roomType === 'travel' || roomType === 'food') statusUrl = `/update-hangout-status/${realId}`;
                else if (roomType === 'housing' || roomType === 'groupbuy') statusUrl = `/update-housing-status/${realId}`;

                const res = await fetch(statusUrl, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ status: 'success' })
                });

                if (res.ok) {
                    alert(I18n.t('common.success') || 'Activity marked as completed!');
                    // Hide button and update locally
                    document.getElementById('btn-complete-activity').style.display = 'none';
                    activityStatus = 'success';
                    
                    // Optionally send a system message
                    sendMessage('announcement', `🎉 ${I18n.t('system.msg.match_success') || 'Activity completed!'}`);
                } else {
                    alert("Failed to update status.");
                }
            } catch (err) {
                console.error("Completion error:", err);
                alert("Error: " + err.message);
            }
        };
    }

    // (Kode Maps & Fitur lain dipotong agar ringkas, tetap biarkan aslinya di sini)
    // AKU MASUKKAN SEMUA SUPAYA KAMU TINGGAL COPY-PASTE

    document.getElementById('btn-location').addEventListener('click', () => {
        const mapModal = document.createElement('div');
        mapModal.style.cssText = 'position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.6); z-index: 9999; display: flex; align-items: center; justify-content: center; backdrop-filter: blur(2px);';
        mapModal.innerHTML = `
            <div style="background: white; width: 90%; max-width: 500px; border-radius: 12px; padding: 1.5rem; display: flex; flex-direction: column; gap: 10px; box-shadow: 0 4px 20px rgba(0,0,0,0.2);">
                <h3 style="margin: 0; color: #333;">📍 ${I18n.t('chat.send_location') || 'Location'}</h3>
                <div style="display: flex; gap: 8px; margin-top: 5px;">
                    <input type="text" id="map-search-input" placeholder="${I18n.t('chat.map.search_placeholder') || 'Search...'}" style="flex: 1; padding: 10px; border: 1px solid #ddd; border-radius: 8px; outline: none;">
                    <button id="btn-map-search" style="padding: 10px 15px; background: #3498db; color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: bold;">${I18n.t('chat.map.search_btn') || 'Search'}</button>
                </div>
                <p style="font-size: 0.8rem; color: #888; margin: 0; margin-bottom: 5px;">${I18n.t('chat.map.hint') || 'Drag pin or search'}</p>
                <div id="map-container" style="height: 300px; width: 100%; border-radius: 8px; border: 1px solid #ddd; z-index: 1;"></div>
                <div style="display: flex; gap: 10px; justify-content: flex-end; margin-top: 10px;">
                    <button id="btn-close-map" style="padding: 10px 15px; border: none; background: #f0f0f0; border-radius: 8px; cursor: pointer;">${I18n.t('common.cancel') || 'Cancel'}</button>
                    <button id="btn-send-map" style="padding: 10px 15px; border: none; background: var(--primary-color); color: white; border-radius: 8px; cursor: pointer; font-weight: bold;">${I18n.t('chat.map.send_btn') || 'Send'}</button>
                </div>
            </div>
        `;
        document.body.appendChild(mapModal);

        let currentLat = 23.9510; let currentLng = 120.9280;
        const map = L.map('map-container').setView([currentLat, currentLng], 15);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '© OpenStreetMap' }).addTo(map);
        const marker = L.marker([currentLat, currentLng], { draggable: true }).addTo(map);
        marker.on('dragend', function () { currentLat = marker.getLatLng().lat; currentLng = marker.getLatLng().lng; });

        const searchInput = document.getElementById('map-search-input');
        const searchBtn = document.getElementById('btn-map-search');
        const performSearch = async () => {
            const query = searchInput.value.trim();
            if (!query) return;
            searchBtn.innerText = '⏳';
            try {
                const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query + ', Taiwan')}`);
                const data = await res.json();
                if (data && data.length > 0) {
                    currentLat = parseFloat(data.lat); currentLng = parseFloat(data.lon);
                    map.flyTo([currentLat, currentLng], 16); marker.setLatLng([currentLat, currentLng]);
                } else { alert(I18n.t('chat.map.not_found') || 'Not found'); }
            } catch (err) { alert(I18n.t('chat.map.search_error') || 'Error'); }
            finally { searchBtn.innerText = I18n.t('chat.map.search_btn') || 'Search'; }
        };
        searchBtn.onclick = performSearch;
        searchInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') performSearch(); });

        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition((pos) => {
                if (!searchInput.value) {
                    currentLat = pos.coords.latitude; currentLng = pos.coords.longitude;
                    map.setView([currentLat, currentLng], 15); marker.setLatLng([currentLat, currentLng]);
                }
            });
        }

        document.getElementById('btn-close-map').onclick = () => mapModal.remove();
        document.getElementById('btn-send-map').onclick = () => {
            sendMessage('location', `https://www.google.com/maps?q=$${currentLat},${currentLng}`);
            mapModal.remove();
        };
    });

    document.getElementById('btn-attach').addEventListener('click', () => document.getElementById('input-file-chat').click());
    document.getElementById('input-file-chat').addEventListener('change', async (e) => {
        const file = e.target.files;
        if (!file) return;
        const formData = new FormData();
        formData.append('file', file);
        try {
            messageArea.innerHTML += `<div id="upload-loading" style="text-align:center; color:#888; margin-top: 10px; font-size: 0.8rem;">Uploading... ⏳</div>`;
            messageArea.scrollTop = messageArea.scrollHeight;
            const res = await fetch('/upload', { method: 'POST', body: formData });
            const data = await res.json();
            document.getElementById('upload-loading')?.remove();
            sendMessage(data.type, data.url);
        } catch (err) { alert("Upload failed!"); }
    });

    const optBtn = document.getElementById('btn-chat-options');
    const optMenu = document.getElementById('chat-options-menu');
    optBtn.onclick = (e) => { e.stopPropagation(); optMenu.style.display = optMenu.style.display === 'none' ? 'block' : 'none'; };
    document.addEventListener('click', () => { optMenu.style.display = 'none'; });
    optMenu.onclick = (e) => e.stopPropagation();

    document.getElementById('menu-clear').onclick = () => {
        if (confirm(I18n.t('chat.confirm_clear_cache') || 'Clear cache?')) { messageArea.innerHTML = `<div style="text-align:center; color:#888; margin-top: 20px;">${I18n.t('chat.cache_cleared') || 'Cleared'}</div>`; optMenu.style.display = 'none'; }
    };

    // --- FITUR ALBUM ---
    document.getElementById('menu-album').onclick = () => {
        optMenu.style.display = 'none';
        const dbKey = `joinup_albums_${roomId}`;
        const getAlbums = () => JSON.parse(localStorage.getItem(dbKey)) || [];
        const saveAlbums = (data) => localStorage.setItem(dbKey, JSON.stringify(data));

        const appAlbum = document.createElement('div');
        appAlbum.style.cssText = 'position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: #ffffff; z-index: 10000; display: flex; flex-direction: column; font-family: sans-serif; animation: slideUp 0.3s ease;';
        document.body.appendChild(appAlbum);

        const todayDate = new Date().toLocaleDateString('en-GB');
        let currentSelectedAlbumId = null;

        const viewContainer = document.createElement('div');
        viewContainer.style.cssText = 'flex: 1; display: flex; flex-direction: column; overflow: hidden;';

        const sheetHtml = `
            <div id="album-bottom-sheet" style="display: none; position: fixed; bottom: 0; left: 0; width: 100%; background: white; border-top-left-radius: 15px; border-top-right-radius: 15px; box-shadow: 0 -5px 20px rgba(0,0,0,0.15); flex-direction: column; padding: 20px 0; z-index: 10001; animation: slideUp 0.3s ease;">
                <button id="menu-add-item" style="padding: 15px 25px; text-align: left; background: none; border: none; font-size: 1.05rem; color: #333; cursor: pointer; width: 100%;">${I18n.t('chat.album.menu_add') || 'Add items'}</button>
                <button id="menu-rename-album" style="padding: 15px 25px; text-align: left; background: none; border: none; font-size: 1.05rem; color: #333; cursor: pointer; width: 100%;">${I18n.t('chat.album.menu_rename') || 'Rename album'}</button>
                <button id="menu-download-album" style="padding: 15px 25px; text-align: left; background: none; border: none; font-size: 1.05rem; color: #333; cursor: pointer; width: 100%;">${I18n.t('chat.album.menu_download') || 'Download album'}</button>
                <button id="menu-delete-album" style="padding: 15px 25px; text-align: left; background: none; border: none; font-size: 1.05rem; color: #e74c3c; cursor: pointer; width: 100%;">${I18n.t('chat.album.menu_delete') || 'Delete album'}</button>
            </div>
            <div id="album-menu-overlay" style="display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); z-index: 10000;"></div>
            <input type="file" id="upload-more-photo" multiple accept="image/*" style="display: none;">
        `;
        appAlbum.appendChild(viewContainer);
        appAlbum.insertAdjacentHTML('beforeend', sheetHtml);

        const menu = document.getElementById('album-bottom-sheet');
        const overlay = document.getElementById('album-menu-overlay');
        const uploadMoreInput = document.getElementById('upload-more-photo');
        const closeMenu = () => { menu.style.display = 'none'; overlay.style.display = 'none'; };
        overlay.onclick = closeMenu;

        window.openAlbumMenu = (id) => { currentSelectedAlbumId = id; menu.style.display = 'flex'; overlay.style.display = 'block'; };
        document.getElementById('menu-add-item').onclick = () => { closeMenu(); uploadMoreInput.click(); };

        uploadMoreInput.onchange = async (e) => {
            const files = e.target.files;
            if (!files.length || !currentSelectedAlbumId) return;
            const albums = getAlbums();
            const albumIndex = albums.findIndex(a => a.id === currentSelectedAlbumId);
            if (albumIndex === -1) return;

            appAlbum.insertAdjacentHTML('beforeend', `<div id="album-loading" style="position:fixed; top:50%; left:50%; transform:translate(-50%,-50%); background:rgba(0,0,0,0.7); color:white; padding:15px 20px; border-radius:8px; z-index:99999;">${I18n.t('chat.album.uploading') || 'Uploading... ⏳'}</div>`);
            for (let file of files) {
                const formData = new FormData(); formData.append('file', file);
                try {
                    const res = await fetch('/upload', { method: 'POST', body: formData });
                    const data = await res.json();
                    if (data.url) albums[albumIndex].photos.push(data.url);
                } catch (err) { }
            }
            saveAlbums(albums);
            document.getElementById('album-loading')?.remove();
            if (document.getElementById('album-detail-view')) window.openAlbumDetail(currentSelectedAlbumId);
            else renderMainList();
        };

        document.getElementById('menu-rename-album').onclick = () => {
            closeMenu(); const albums = getAlbums(); const album = albums.find(a => a.id === currentSelectedAlbumId);
            if (!album) return;
            const newName = prompt(I18n.t('chat.album.prompt_rename') || 'Enter new album name:', album.title);
            if (newName && newName.trim()) { album.title = newName.trim(); saveAlbums(albums); renderMainList(); }
        };

        document.getElementById('menu-download-album').onclick = () => {
            closeMenu(); const albums = getAlbums(); const album = albums.find(a => a.id === currentSelectedAlbumId);
            if (!album || album.photos.length === 0) return alert(I18n.t('chat.album.empty_alert') || 'Album is empty!');
            alert(`${I18n.t('chat.album.downloading') || 'Downloading'} ${album.photos.length} ${I18n.t('chat.album.photos_count') || 'photos'}...`);
            album.photos.forEach((p, i) => {
                setTimeout(() => {
                    const a = document.createElement('a'); a.href = p; a.download = album.title.replace(/\s+/g, '_') + '_' + (i + 1) + '.jpg';
                    a.target = '_blank'; document.body.appendChild(a); a.click(); document.body.removeChild(a);
                }, i * 500);
            });
        };

        document.getElementById('menu-delete-album').onclick = () => {
            closeMenu();
            if (confirm(I18n.t('chat.album.confirm_delete') || 'Are you sure you want to delete this album?')) {
                const updatedAlbums = getAlbums().filter(a => a.id !== currentSelectedAlbumId);
                saveAlbums(updatedAlbums); renderMainList();
            }
        };

        const renderMainList = () => {
            const albums = getAlbums();
            let content = '';
            if (albums.length === 0) {
                content = `
                    <div style="flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 20px;">
                        <h2 style="margin: 0 0 10px 0; color: #111; font-size: 1.2rem;">${I18n.t('chat.album.no_albums') || 'No albums yet.'}</h2>
                        <p style="color: #888; text-align: center; font-size: 0.9rem; margin-bottom: 20px; max-width: 250px;">${I18n.t('chat.album.keep_photos') || 'Keep your best photos in albums and share them with the chat.'}</p>
                        <button id="btn-create-empty" style="padding: 10px 20px; border: 1px solid #ddd; background: white; border-radius: 8px; font-weight: bold; cursor: pointer; font-size: 0.95rem;">${I18n.t('chat.album.btn_create') || 'Create album'}</button>
                    </div>
                `;
            } else {
                let list = albums.map(a => `
                    <div style="display: flex; flex-direction: column;">
                        <div onclick="window.openAlbumDetail('${a.id}')" style="width: 100%; aspect-ratio: 1; background: #eee; border-radius: 12px; overflow: hidden; margin-bottom: 8px; border: 1px solid #eee; cursor: pointer;">
                            ${a.photos.length > 0 ? `<img src="${a.photos}" style="width:100%; height:100%; object-fit:cover;">` : ''}
                        </div>
                        <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                            <div style="flex: 1; overflow: hidden;" onclick="window.openAlbumDetail('${a.id}')">
                                <span style="font-weight: bold; font-size: 0.95rem; color: #333; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; display: block;">${a.title}</span>
                                <span style="font-size: 0.8rem; color: #888;">${a.photos.length} ${I18n.t('chat.album.photos_count') || 'photos'}</span>
                            </div>
                            <button onclick="window.openAlbumMenu('${a.id}')" style="background:none; border:none; font-size: 1.4rem; cursor: pointer; padding: 0 5px; color: #555; line-height: 1;">⋮</button>
                        </div>
                    </div>
                `).join('');
                content = `<div style="flex: 1; overflow-y: auto; padding: 20px; display: grid; grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); gap: 20px; align-content: flex-start;">${list}</div>`;
            }

            viewContainer.innerHTML = `
                <header style="background: var(--primary-color); padding: 15px 20px; display: flex; align-items: center; justify-content: space-between; box-shadow: 0 2px 5px rgba(0,0,0,0.1);">
                    <div style="display: flex; align-items: center; gap: 15px;">
                        <button id="btn-close-app" style="background: none; border: none; color: #ffffff; font-size: 1.5rem; cursor: pointer; line-height: 1;"><</button>
                        <h3 style="margin: 0; font-size: 1.25rem; font-weight: bold; color: #ffffff; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 250px;">${chatTitle}</h3>
                    </div>
                </header>
                ${content}
                <button id="btn-fab-add" style="position: absolute; bottom: 30px; right: 30px; width: 60px; height: 60px; border-radius: 50%; background: var(--primary-color); color: white; font-size: 2.5rem; border: none; box-shadow: 0 4px 10px rgba(0,0,0,0.3); cursor: pointer; display: flex; align-items: center; justify-content: center; padding-bottom: 5px; z-index: 10;">+</button>
            `;
            document.getElementById('btn-close-app').onclick = () => appAlbum.remove();
            document.getElementById('btn-fab-add').onclick = renderCreate;
            if (document.getElementById('btn-create-empty')) document.getElementById('btn-create-empty').onclick = renderCreate;
        };

        const renderCreate = () => {
            let tempPhotos = [];
            const renderCreateUI = () => {
                let gridHtml = tempPhotos.map(p => `<div style="width: 100%; aspect-ratio: 1; background: #eee; border-radius: 8px; overflow: hidden;"><img src="${p}" style="width: 100%; height: 100%; object-fit: cover;"></div>`).join('');
                gridHtml += `<div id="btn-add-photo" style="width: 100%; aspect-ratio: 1; border: 2px dashed #ccc; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-size: 2rem; color: #ccc; cursor: pointer;">+</div>`;

                viewContainer.innerHTML = `
                    <header style="background: var(--primary-color); padding: 15px 20px; display: flex; align-items: center; justify-content: space-between; box-shadow: 0 2px 5px rgba(0,0,0,0.1);">
                        <button id="btn-back-create" style="background: none; border: none; color: #ffffff; font-size: 1.5rem; cursor: pointer; line-height: 1;"><</button>
                        <h3 style="margin: 0; font-size: 1.25rem; font-weight: bold; color: #ffffff;">${I18n.t('chat.album.btn_create') || 'Create Album'}</h3>
                        <button id="btn-save-album" style="background: none; border: none; font-size: 1rem; color: #ffffff; font-weight: bold; cursor: pointer; display: flex; align-items: center; gap: 8px;">
                            ${I18n.t('chat.album.btn_save') || 'Save'}
                        </button>
                    </header>
                    <div style="padding: 20px; flex: 1; overflow-y: auto; background: white;">
                        <h1 style="color: #e0e0e0; font-size: 2.5rem; margin: 0 0 5px 0;">${todayDate}</h1>
                        <div style="color: #aaa; font-size: 0.9rem; margin-bottom: 20px;">${tempPhotos.length} ${I18n.t('chat.album.photos_count') || 'photos'}</div>
                        <input type="text" id="album-title-input" placeholder="${I18n.t('chat.album.name_placeholder') || 'Album name'}" style="width: 100%; border: none; border-bottom: 1px solid #ddd; padding: 10px 0; font-size: 1.1rem; outline: none; margin-bottom: 25px; font-weight: bold;">
                        <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(100px, 1fr)); gap: 10px;">${gridHtml}</div>
                    </div>
                    <input type="file" id="upload-album-photo" multiple accept="image/*" style="display: none;">
                `;
                document.getElementById('btn-back-create').onclick = renderMainList;
                document.getElementById('btn-add-photo').onclick = () => document.getElementById('upload-album-photo').click();

                document.getElementById('upload-album-photo').onchange = async (e) => {
                    const files = e.target.files;
                    if (!files.length) return;
                    document.getElementById('btn-add-photo').innerHTML = '<span style="font-size: 1rem;">⏳</span>';
                    for (let file of files) {
                        const formData = new FormData(); formData.append('file', file);
                        try {
                            const res = await fetch('/upload', { method: 'POST', body: formData });
                            const data = await res.json();
                            if (data.url) tempPhotos.push(data.url);
                        } catch (err) { }
                    }
                    renderCreateUI();
                };

                document.getElementById('btn-save-album').onclick = () => {
                    const title = document.getElementById('album-title-input').value.trim() || `${I18n.t('chat.album.name_placeholder') || 'Album'} ${todayDate}`;
                    const albums = getAlbums();
                    const newAlbum = { id: Date.now().toString(), title, date: todayDate, photos: tempPhotos };
                    albums.push(newAlbum); saveAlbums(albums);
                    const annText = I18n.t('chat.album.announcement') || 'created a new album:';
                    sendMessage('announcement', `🖼️ ${user.displayName} ${annText} "${title}"`);
                    renderMainList();
                };
            };
            renderCreateUI();
        };

        window.openAlbumDetail = (id) => {
            const albums = getAlbums(); const album = albums.find(a => a.id === id);
            if (!album) return;

            let gridHtml = album.photos.map((p, index) => `
                <div style="width: 100%; aspect-ratio: 1; background: #eee; overflow: hidden; position: relative;">
                    <img src="${p}" style="width: 100%; height: 100%; object-fit: cover;">
                    <a href="${p}" download="${album.title.replace(/\s+/g, '_')}_${index + 1}.jpg" target="_blank" style="position: absolute; bottom: 5px; right: 5px; background: rgba(255,255,255,0.9); border-radius: 50%; width: 26px; height: 26px; display: flex; align-items: center; justify-content: center; text-decoration: none; box-shadow: 0 2px 4px rgba(0,0,0,0.2);" title="Download Photo">⬇️</a>
                </div>
            `).join('');

            viewContainer.innerHTML = `
                <div id="album-detail-view" style="display:flex; flex-direction:column; height:100%;">
                    <header style="background: var(--primary-color); padding: 15px 20px; display: flex; align-items: center; justify-content: space-between; box-shadow: 0 2px 5px rgba(0,0,0,0.1);">
                        <button id="btn-back-detail" style="background: none; border: none; color: #ffffff; font-size: 1.5rem; cursor: pointer; line-height: 1;"><</button>
                        <h3 style="margin: 0; font-size: 1.25rem; font-weight: bold; color: #ffffff; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 200px;">${album.title}</h3>
                        <div style="width: 24px;"></div>
                    </header>
                    <div style="padding: 20px; flex: 1; overflow-y: auto; background: white;">
                        <h2 style="margin: 0 0 5px 0; font-size: 1.5rem; color: #111;">${album.title}</h2>
                        <h3 style="color: #333; font-size: 1.2rem; margin: 25px 0 5px 0;">${album.date}</h3>
                        <div style="color: #888; font-size: 0.9rem; margin-bottom: 20px;">${album.photos.length} ${I18n.t('chat.album.photos_count') || 'photos'}</div>
                        <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(110px, 1fr)); gap: 4px;">${gridHtml}</div>
                    </div>
                </div>
            `;
            document.getElementById('btn-back-detail').onclick = renderMainList;
        };

        renderMainList();
    };

    document.getElementById('menu-report').onclick = () => {
        optMenu.style.display = 'none';
        const reportModal = document.createElement('div');
        reportModal.style.cssText = 'position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.6); z-index: 9999; display: flex; align-items: center; justify-content: center; backdrop-filter: blur(2px);';
        reportModal.innerHTML = `
            <div style="background: white; width: 90%; max-width: 400px; border-radius: 12px; padding: 1.5rem; box-shadow: 0 4px 12px rgba(0,0,0,0.15);">
                <h3 style="margin: 0; color: #333;">⚠️ ${I18n.t('chat.report.title') || 'Report'}</h3>
                <p style="font-size: 0.9rem; color: #666; margin-bottom: 1rem;">${I18n.t('chat.report.ask') || 'Who?'}</p>
                <select id="report-user-select" style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 8px; margin-bottom: 1rem; font-size: 1rem;"></select>
                <textarea id="report-reason" rows="4" placeholder="${I18n.t('chat.report.reason') || 'Reason'}" style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 8px; margin-bottom: 1rem; font-size: 1rem; resize: none;"></textarea>
                <div style="display: flex; gap: 10px; justify-content: flex-end;">
                    <button id="btn-cancel-report" style="padding: 10px 15px; border: none; background: #f0f0f0; border-radius: 8px; cursor: pointer;">${I18n.t('chat.report.cancel') || 'Cancel'}</button>
                    <button id="btn-submit-report" style="padding: 10px 15px; border: none; background: #D32F2F; color: white; border-radius: 8px; cursor: pointer; font-weight: bold;">${I18n.t('chat.report.submit') || 'Submit'}</button>
                </div>
            </div>
        `;
        document.body.appendChild(reportModal);

        fetch(`/room-messages/${roomId}`)
            .then(res => res.json())
            .then(messages => {
                if (Array.isArray(messages)) {
                    const uniqueSenders = [...new Set(messages.map(m => m.sender_name))];
                    if (uniqueSenders.length === 0) selectBox.innerHTML = `<option value="">${I18n.t('chat.report.no_user') || 'No users'}</option>`;
                    else uniqueSenders.forEach(name => selectBox.innerHTML += `<option value="${name}">${name}</option>`);
                }
            });
        document.getElementById('btn-cancel-report').onclick = () => reportModal.remove();
        document.getElementById('btn-submit-report').onclick = () => {
            const reason = document.getElementById('report-reason').value.trim();
            if (!reason) return alert(I18n.t('chat.report.empty_reason') || 'Need reason');
            alert(I18n.t('chat.report.success') || 'Success');
            reportModal.remove();
        };
    };

    loadMessages(true);
    chatInterval = setInterval(() => loadMessages(false), 3000);
};

// ==========================================
// --- RENDER HALAMAN INBOX (DAFTAR CHAT) ---
// ==========================================
export const renderMessages = (roomId = null, prefill = null) => {
    if (chatInterval) clearInterval(chatInterval);

    const app = document.getElementById('app');
    const userProfileStr = localStorage.getItem('userProfile');

    if (!userProfileStr) {
        alert(I18n.t('auth.err.login_required') || "Please login first!");
        window.navigateTo('home');
        return;
    }
    const user = JSON.parse(userProfileStr);

    if (!document.getElementById('chat-fullscreen-styles')) {
        const style = document.createElement('style');
        style.id = 'chat-fullscreen-styles';
        style.innerHTML = `
            .chat-container { display: flex; flex-direction: column; height: 100vh; background: #EFEAE2; }
            .chat-header { background: white; padding: 12px 15px; display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid #ddd; z-index: 10; box-shadow: 0 1px 2px rgba(0,0,0,0.05); }
            .chat-message-area { flex: 1; padding: 20px 15px; overflow-y: auto; display: flex; flex-direction: column; gap: 8px; background-image: url("https://www.transparenttextures.com/patterns/cubes.png"); }
            .chat-input-area { background: #f0f2f5; padding: 10px 15px; display: flex; gap: 10px; align-items: center; border-top: 1px solid #ddd; padding-bottom: calc(10px + env(safe-area-inset-bottom)); }
            .chat-bubble { max-width: 80%; padding: 10px 14px; border-radius: 15px; margin-bottom: 4px; font-size: 0.95rem; line-height: 1.4; position: relative; word-wrap: break-word; box-shadow: 0 1px 2px rgba(0,0,0,0.1); cursor: pointer; transition: filter 0.2s; }
            .chat-bubble:active { filter: brightness(0.9); }
            .chat-mine { background: #FFE082; align-self: flex-end; border-top-right-radius: 4px; } 
            .chat-other { background: #ffffff; align-self: flex-start; border-top-left-radius: 4px; }
            .chat-sender-info { font-size: 0.75rem; color: #667781; margin-bottom: 4px; font-weight: bold; display: flex; align-items: center; gap: 4px; }
            .chat-time { font-size: 0.65rem; color: #667781; text-align: right; margin-top: 4px; }
            .chat-announcement { background: #fff3cd; color: #856404; text-align: center; padding: 8px; border-radius: 8px; font-size: 0.85rem; margin: 10px auto; width: 80%; box-shadow: 0 1px 2px rgba(0,0,0,0.05); font-weight: bold; border: 1px solid #ffeeba; }
            .btn-icon { background: none; border: none; font-size: 1.5rem; cursor: pointer; color: #54656f; padding: 5px; transition: transform 0.2s; }
            .btn-icon:hover { transform: scale(1.1); }
            .chat-input-box { flex: 1; padding: 12px 15px; border-radius: 20px; border: none; outline: none; font-size: 1rem; box-shadow: 0 1px 2px rgba(0,0,0,0.05); }
            .btn-send { background: var(--primary-color); color: white; border: none; width: 45px; height: 45px; border-radius: 50%; font-size: 1.2rem; cursor: pointer; display: flex; align-items: center; justify-content: center; box-shadow: 0 2px 5px rgba(0,0,0,0.2); transition: transform 0.2s; }
            
            /* Location Card Styles */
            .location-card {
                display: flex;
                align-items: center;
                gap: 12px;
                background: #ffffff;
                border: 1px solid #e0e0e0;
                border-radius: 12px;
                padding: 12px 16px;
                text-decoration: none;
                color: #333;
                width: 240px;
                margin-top: 8px;
                transition: all 0.2s ease;
                box-shadow: 0 2px 6px rgba(0,0,0,0.08);
            }
            .location-card:hover {
                background: #f8f9fa;
                box-shadow: 0 4px 12px rgba(0,0,0,0.12);
                transform: translateY(-1px);
            }
            .location-icon-wrapper {
                width: 42px;
                height: 42px;
                background: #e8f5e9;
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                flex-shrink: 0;
            }
            .location-icon {
                font-size: 1.4rem;
            }
            .location-card-content {
                display: flex;
                flex-direction: column;
                overflow: hidden;
            }
            .location-card-title {
                font-size: 0.95rem;
                font-weight: 700;
                color: #1a1a1a;
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
            }
            .location-card-subtitle {
                font-size: 0.75rem;
                color: #25d366;
                font-weight: 600;
                margin-top: 2px;
            }
        `;
        document.head.appendChild(style);
    }

    const hash = window.location.hash || '';
    let parsedRoomId = roomId;
    if (!parsedRoomId && hash.includes('room=')) {
        parsedRoomId = decodeURIComponent(hash.split('room=').split('&'));
    }

    if (parsedRoomId) {
        renderChatRoomUnified(parsedRoomId, user, prefill, app);
        return;
    }

    app.innerHTML = `
        <style>
            body, html, #app { background-color: #ffffff !important; }
            .container { box-shadow: none !important; border: none !important; }
        </style>
        
        <div class="container fade-in" style="padding-bottom: 90px; min-height: 100vh; display: flex; flex-direction: column; background: #ffffff;">
            <header style="padding: 15px 20px; background: #ffffff; display: flex; align-items: center; gap: 15px; position: sticky; top: 0; z-index: 10; border-bottom: 1px solid #f4f4f4;">
                <button onclick="window.navigateTo('home')" style="background: none; border: none; font-size: 1.5rem; cursor: pointer; color: #4285F4; padding: 0; display: flex; align-items: center;">⬅️</button>
                <h1 style="margin: 0; font-size: 1.5rem; color: #f39c12; font-weight: bold;">${I18n.t('messages.title') || 'Messages'}</h1>
            </header>
            
            <div id="inbox-list" style="flex: 1; overflow-y: auto; padding: 15px 20px; background: #ffffff;">
                <div style="text-align:center; color:#888; margin-top: 3rem; font-size: 0.9rem;">
                    ${I18n.t('chat.inbox.loading') || 'Loading...'}
                </div>
            </div>
        </div>
        
        <nav class="bottom-nav" style="background: #ffffff; border-top: 1px solid #f4f4f4;">
            <a href="#" class="nav-item" onclick="window.navigateTo('home')"><span class="nav-icon">🏠</span><span>${I18n.t('nav.home') || 'Home'}</span></a>
            <a href="#" class="nav-item active"><span class="nav-icon">💬</span><span>${I18n.t('nav.messages') || 'Messages'}</span></a>
            <a href="#" class="nav-item" onclick="window.navigateTo('profile')"><span class="nav-icon">👤</span><span>${I18n.t('nav.profile') || 'Profile'}</span></a>
        </nav>
    `;

    const loadInbox = async () => {
        try {
            const inboxContainer = document.getElementById('inbox-list');
            if (!inboxContainer) return;

            let inboxData = [];

            // SEMUA FITUR SEKARANG TERPUSAT DI SINI
            try {
                const myRoomsRes = await fetch(`/my-chat-rooms/${user.email}`);
                if (myRoomsRes.ok) {
                    const myRooms = await myRoomsRes.json();
                    for (let room of myRooms) {
                        try {
                            const chatRes = await fetch(`/room-messages/${room.id}`);
                            if (chatRes.ok) {
                                const chats = await chatRes.json();
                                if (Array.isArray(chats) && chats.length > 0) {
                                    const lastChat = chats[chats.length - 1];
                                    inboxData.push({
                                        roomId: room.id, title: room.teamName,
                                        lastMessage: lastChat.message || '', senderName: lastChat.sender_name,
                                        timestamp: new Date(lastChat.created_at).getTime(),
                                        isMyMsg: lastChat.sender_email === user.email
                                    });
                                }
                            }
                        } catch (err) { }
                    }
                }
            } catch (e) { }

            inboxData.sort((a, b) => b.timestamp - a.timestamp);

            if (inboxData.length === 0) {
                inboxContainer.innerHTML = `<div style="text-align:center; color:#888; margin-top: 3rem;">${I18n.t('chat.inbox.empty') || 'No messages yet.'}</div>`;
                return;
            }

            let listHtml = '';
            inboxData.forEach(item => {
                const date = new Date(item.timestamp);
                const timeStr = `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;

                let previewText = item.lastMessage || '';
                if (previewText.startsWith('http://googleusercontent.com/maps')) previewText = I18n.t('chat.inbox.location') || '📍 Location';
                else if (previewText.match(/\.(jpeg|jpg|gif|png)$/i) && previewText.startsWith('http')) previewText = I18n.t('chat.inbox.photo') || '📷 Photo';
                else if (previewText.match(/\.(pdf|doc|docx)$/i) && previewText.startsWith('http')) previewText = I18n.t('chat.inbox.file') || '📄 File';
                else if (previewText.startsWith('!')) previewText = `📢 ${previewText.replace('!', '').trim()}`;

                if (previewText.length > 30) previewText = previewText.substring(0, 30) + '...';
                const senderDisplay = item.isMyMsg ? (I18n.t('chat.inbox.you') || 'You') : (item.senderName ? item.senderName.split(' ') : '');

                listHtml += `
                    <div onclick="window.navigateTo('messages?room=${item.roomId}')" style="background: white; padding: 15px; border-radius: 12px; margin-bottom: 15px; display: flex; gap: 15px; align-items: center; cursor: pointer; box-shadow: 0 4px 15px rgba(0,0,0,0.06); border: 1px solid #f4f4f4; transition: transform 0.2s;">
                        <div style="width: 52px; height: 52px; background: #e1f5fe; border-radius: 14px; display: flex; align-items: center; justify-content: center; font-size: 1.6rem; flex-shrink: 0;">💬</div>
                        <div style="flex: 1; overflow: hidden;">
                            <div style="display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 6px;">
                                <h4 style="margin: 0; font-size: 1.05rem; color: #222; font-weight: bold; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${item.title}</h4>
                                <span style="font-size: 0.75rem; color: #999; flex-shrink: 0; margin-left: 10px;">${timeStr}</span>
                            </div>
                            <div style="font-size: 0.85rem; color: #666; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                                <strong>${senderDisplay ? senderDisplay + ':' : ''}</strong> ${previewText}
                            </div>
                        </div>
                    </div>
                `;
            });

            inboxContainer.innerHTML = listHtml;
        } catch (err) {
            console.error("Gagal load inbox:", err);
            document.getElementById('inbox-list').innerHTML = `<div style="text-align:center; color:#e74c3c; margin-top: 3rem;">${I18n.t('chat.inbox.error') || 'Error loading.'}</div>`;
        }
    };

    loadInbox();
    chatInterval = setInterval(loadInbox, 5000);
};
