import { I18n } from '../services/i18n.js';

export const openRatingModal = (post, onSubmitted) => {
    const overlayId = 'rating-overlay';
    const existingOverlay = document.getElementById(overlayId);
    if (existingOverlay) existingOverlay.remove();

    const userProfileStr = localStorage.getItem('userProfile');
    if (!userProfileStr) return;
    const user = JSON.parse(userProfileStr);

    const renderModal = () => {
        return `
            <div id="${overlayId}" style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 2000; backdrop-filter: blur(4px);">
                <div class="rating-modal fade-in" style="background: white; width: 90%; max-width: 450px; border-radius: 16px; padding: 1.5rem; box-shadow: 0 4px 20px rgba(0,0,0,0.2); text-align: center; max-height: 90vh; overflow-y: auto;">
                    
                    <button onclick="document.getElementById('${overlayId}').remove()" style="position: absolute; right: 20px; top: 20px; background: none; border: none; font-size: 1.2rem; cursor: pointer; color: #888;">X</button>

                    <div style="margin-bottom: 1rem;">
                        <span style="font-size: 3rem;">🌟</span>
                        <h3 style="margin: 0.5rem 0 0.5rem 0; color: #FF9800;">${I18n.t('common.rate_activity') || 'Rate Activity'}</h3>
                        <p style="color: var(--text-secondary); margin: 0; font-size: 0.9rem;">${post.title || post.teamName || 'Activity'}</p>
                    </div>

                    <form id="ratingForm" style="text-align: left;">
                        
                        <div style="margin-bottom: 1.2rem;">
                            <label style="display: block; margin-bottom: 0.5rem; font-weight: bold; font-size: 0.95rem;">對這次活動體驗的整體評價如何?(1~5顆星)</label>
                            <div class="star-rating" data-target="effectiveness" style="display: flex; gap: 0.5rem; font-size: 1.8rem; cursor: pointer; justify-content: center;">
                                <span data-value="1">☆</span>
                                <span data-value="2">☆</span>
                                <span data-value="3">☆</span>
                                <span data-value="4">☆</span>
                                <span data-value="5">☆</span>
                            </div>
                            <input type="hidden" id="effectivenessValue" value="0" required>
                        </div>

                        <div style="margin-bottom: 1.2rem;">
                            <label style="display: block; margin-bottom: 0.5rem; font-weight: bold; font-size: 0.95rem;">你願意推薦「Joinup!」給其他同學嗎？(1~5顆星)</label>
                            <div class="star-rating" data-target="speed" style="display: flex; gap: 0.5rem; font-size: 1.8rem; cursor: pointer; justify-content: center;">
                                <span data-value="1">☆</span>
                                <span data-value="2">☆</span>
                                <span data-value="3">☆</span>
                                <span data-value="4">☆</span>
                                <span data-value="5">☆</span>
                            </div>
                            <input type="hidden" id="speedValue" value="0" required>
                        </div>

                        <div style="margin-bottom: 1.2rem;">
                            <label style="display: block; margin-bottom: 0.5rem; font-weight: bold; font-size: 0.95rem;">是否成功完成此次活動?(是/否)</label>
                            <div style="display: flex; justify-content: center; gap: 1rem;">
                                <label style="cursor: pointer; display: flex; align-items: center; gap: 0.5rem; padding: 0.5rem 1rem; border: 1px solid #ddd; border-radius: 8px;">
                                    <input type="radio" name="isSuccess" value="1" required checked>
                                    <span>✅ ${I18n.t('common.yes') || 'Yes'}</span>
                                </label>
                                <label style="cursor: pointer; display: flex; align-items: center; gap: 0.5rem; padding: 0.5rem 1rem; border: 1px solid #ddd; border-radius: 8px;">
                                    <input type="radio" name="isSuccess" value="0">
                                    <span>❌ ${I18n.t('common.no') || 'No'}</span>
                                </label>
                            </div>
                        </div>

                        <div style="margin-bottom: 1.5rem;">
                             <label style="display: block; margin-bottom: 0.5rem; font-weight: bold; font-size: 0.95rem;">any other inquiries/messages?</label>
                            <textarea id="comment" rows="3" style="width: 100%; padding: 0.8rem; border-radius: 8px; border: 1px solid #ddd; resize: none;"></textarea>
                        </div>

                        <button type="submit" id="btn-submit-rating" class="btn btn-primary" style="width: 100%; padding: 0.8rem; border-radius: 8px; font-weight: bold; background: #FFC107; border: none; color: white;">
                            ${I18n.t('common.submit') || 'Submit'}
                        </button>
                    </form>
                </div>
            </div>
            <style>
                .star-rating span { color: #ddd; transition: transform 0.2s; }
                .star-rating span:hover { transform: scale(1.2); }
                .star-rating span.active { color: #FFC107; }
                @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
            </style>
        `;
    };

    document.body.insertAdjacentHTML('beforeend', renderModal());

    // Star Rating Logic
    const setupStars = (groupName) => {
        const group = document.querySelector(`.star-rating[data-target="${groupName}"]`);
        const input = document.getElementById(`${groupName}Value`);
        const stars = group.querySelectorAll('span');

        stars.forEach(star => {
            star.addEventListener('click', () => {
                const val = parseInt(star.getAttribute('data-value'));
                input.value = val;

                // Update visuals
                stars.forEach(s => {
                    const v = parseInt(s.getAttribute('data-value'));
                    if (v <= val) {
                        s.innerText = '★';
                        s.classList.add('active');
                    } else {
                        s.innerText = '☆';
                        s.classList.remove('active');
                    }
                });
            });
        });
    };

    setupStars('effectiveness');
    setupStars('speed');

    // Form Submit (KIRIM KE MYSQL!)
    document.getElementById('ratingForm').addEventListener('submit', async (e) => {
        e.preventDefault();

        const effectiveness = parseInt(document.getElementById('effectivenessValue').value);
        const speed = parseInt(document.getElementById('speedValue').value);

        if (effectiveness === 0 || speed === 0) {
            alert(I18n.t('feedback.alert.rate_both') || 'Please rate both questions!');
            return;
        }

        const btn = document.getElementById('btn-submit-rating');
        btn.innerText = "⏳ Submitting..."; btn.disabled = true;

        const feedbackData = {
            user_email: user.email || 'unknown',
            user_name: user.displayName || user.name || 'User',
            user_dept: user.department || 'NCNU',
            study_year: user.study_year || '-',
            event_id: post.id || post.postId || 'unknown',
            event_title: post.title || post.teamName || 'Activity',
            category: post.category || post.roomType || 'general',
            q1_rating: effectiveness,
            q2_rating: speed,
            q3_success: parseInt(document.querySelector('input[name="isSuccess"]:checked').value),
            q4_message: document.getElementById('comment').value.trim()
        };

        try {
            const response = await fetch('http://localhost:3000/submit-feedback', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(feedbackData)
            });

            if (response.ok) {
                alert('🎉 ' + (I18n.t('common.feedback_thanks') || 'Thanks for your feedback!'));
                document.getElementById(overlayId).remove();
                if (onSubmitted) onSubmitted();
            } else {
                const errData = await response.json();
                alert('Database Error: ' + (errData.error || 'Server menolak data.'));
                btn.innerText = "Submit"; btn.disabled = false;
            }
        } catch (error) {
            alert('Connection failed!');
            btn.innerText = "Submit"; btn.disabled = false;
        }
    });
};

export const checkPendingFeedback = async (user) => {
    if (!user || !user.email) return;

    // Cegah pop-up numpuk kalau udah ada yang kebuka
    if (document.getElementById('rating-overlay')) return;

    try {
        // 1. Ambil daftar ID event yang SUDAH di-rate dari MySQL
        const fbRes = await fetch(`http://localhost:3000/my-feedbacks/${user.email}`);
        const ratedIds = fbRes.ok ? await fbRes.json() : [];

        // 2. Tarik semua event dari semua kategori di MySQL
        const endpoints = [
            { url: 'activities', cat: 'sports' },
            { url: 'carpools', cat: 'carpool' },
            { url: 'housing', cat: 'housing' },
            { url: 'studies', cat: 'study' },
            { url: 'hangouts', cat: 'travel' }
        ];

        let allEvents = [];
        for (let ep of endpoints) {
            const res = await fetch(`http://localhost:3000/${ep.url}`);
            if (res.ok) {
                const data = await res.json();
                data.forEach(d => allEvents.push({ ...d, category: ep.cat }));
            }
        }

        // 3. Tarik data pendaftaran Participant (HANYA YANG STATUSNYA 'accepted')
        const myAppIds = [
            ...JSON.parse(localStorage.getItem('joinup_applications') || '[]')
                .filter(a => a.applicantId === user.email && a.status === 'accepted') // <-- TAMBAH SYARAT INI
                .map(a => String(a.postId)),

            ...JSON.parse(localStorage.getItem('joinup_carpool_apps') || '[]')
                .filter(a => a.applicantId === user.email && a.status === 'accepted') // <-- TAMBAH SYARAT INI
                .map(a => String(a.postId))
        ];

        // 4. Proses Pencarian: Adakah event yang selesai tapi belum di-rate?
        const now = new Date();
        const unratedEvent = allEvents.find(p => {
            const eventId = String(p.id);

            // Lewati kalau udah di-rate
            if (ratedIds.includes(eventId)) return false;

            // Cek keterlibatan: Apakah user ini Host atau Participant?
            const isHost = p.host_email === user.email;
            const isParticipant = myAppIds.includes(eventId);
            if (!isHost && !isParticipant) return false;

            // Cek kondisi: Apakah Selesai (Success/Cancelled) ATAU Deadline-nya udah lewat?
            const isFinishedStatus = p.status === 'success' || p.status === 'cancelled' || p.status === 'expired';
            const isPastDeadline = p.deadline && new Date(p.deadline) < now;

            return isFinishedStatus || isPastDeadline;
        });

        // 5. BOOM! Tembak Pop-up kalau ketemu!
        if (unratedEvent) {
            openRatingModal(unratedEvent, () => {
                // Begitu form di-submit, jalankan lagi fungsinya (siapa tau ada event kedua yang numpuk minta di-rate)
                checkPendingFeedback(user);
            });
        }
    } catch (error) {
        console.error("Failed to auto-check feedback:", error);
    }
};