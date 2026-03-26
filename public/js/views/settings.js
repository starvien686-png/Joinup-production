import { I18n } from '../services/i18n.js';
import { renderRegister } from './register.js';
import { MockStore } from '../models/mockStore.js';

export const renderSettings = () => {
    const app = document.getElementById('app');
    const userProfile = JSON.parse(localStorage.getItem('userProfile')) || {};
    const defaultFoto = 'https://cdn-icons-png.flaticon.com/512/149/149071.png';

    // 🌟 FUNGSI SULTAN: AUTO-HITUNG TAHUN ANGKATAN (Bulan 8 Agustus naik kelas)
    const calculateStudyYear = (email, savedStudyYear) => {
        // Kalau emailnya gak valid, tampilin aja apa yang disave user pas Sign Up
        if (!email || !email.startsWith('s') || email.length < 4) return savedStudyYear || 'Unknown';

        // Ambil 3 digit di belakang 's' (Contoh: s112... jadi '112')
        const entryYearStr = email.substring(1, 4);
        const entryYearROC = parseInt(entryYearStr);

        // Cek bahasa yang lagi dipakai di aplikasi sekarang
        const currentLang = typeof I18n !== 'undefined' ? I18n.getLanguage() : 'en';

        // JIKA BAHASA INGGRIS: Langsung tampilkan 3 digit angkanya aja (misal: 112)
        if (currentLang === 'en') {
            return entryYearStr;
        }

        // JIKA BAHASA MANDARIN: Hitung tahun ke berapa (大一, 大二, 大三...)
        const now = new Date();
        const currentMonth = now.getMonth() + 1;
        const currentYearROC = now.getFullYear() - 1911;
        const academicYear = currentMonth >= 8 ? currentYearROC : currentYearROC - 1;
        const yearNumber = academicYear - entryYearROC + 1;

        const yearMap = { 1: '大一', 2: '大二', 3: '大三', 4: '大四', 5: '大五' };

        if (yearNumber >= 1 && yearNumber <= 5) {
            return yearMap[yearNumber];
        }

        return savedStudyYear || entryYearStr;
    };

    // Panggil fungsinya pakai email & data study_year dari local storage
    const currentYearString = calculateStudyYear(userProfile.email, userProfile.study_year);

    // Fungsi Ganti Bahasa Otomatis
    const updateTexts = () => {
        document.querySelectorAll('[data-i18n]').forEach(el => {
            const key = el.getAttribute('data-i18n');
            if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
                el.placeholder = I18n.t(key) || el.placeholder;
            } else {
                el.innerText = I18n.t(key) || el.innerText;
            }
        });
    };

    const username = userProfile.displayName || 'Guest';
    const email = userProfile.email || 'unknown';

    app.innerHTML = `
        <div class="container fade-in" style="padding-bottom: 40px;">
            <!-- Header -->
            <header style="margin-bottom: 2rem; display: flex; align-items: center; gap: 1rem;">
                <span id="back-to-profile" class="back-icon" style="cursor: pointer;">←</span>
                <h2 style="margin: 0; flex-grow: 1;" data-i18n="settings.title">⚙️ Account Settings</h2>
            </header>

            <!-- Profile Card -->
            <div class="card" style="text-align: center; margin-bottom: 2rem; border-radius: 16px;">
                <input type="file" id="input-foto" accept="image/*" style="display: none;">
                
                <div style="display: flex; flex-direction: column; gap: 0.8rem; align-items: center;">
                    <div id="settings-avatar-container" onclick="document.getElementById('input-foto').click()" 
                         style="width: 100px; height: 100px; border-radius: 50%; margin: 0; display: flex; align-items: center; justify-content: center; font-size: 3rem; border: 4px solid white; box-shadow: 0 4px 15px rgba(0,0,0,0.1); position: relative; cursor: pointer; background: #E3F2FD; overflow: hidden;">
                        <img id="preview-foto" src="${userProfile.profile_pic || userProfile.photoURL || defaultFoto}" style="width: 100%; height: 100%; object-fit: cover; ${userProfile.profile_pic || userProfile.photoURL ? '' : 'display: none;'}">
                        <span id="preview-foto-placeholder" style="${userProfile.profile_pic || userProfile.photoURL ? 'display: none;' : ''}">👤</span>
                    </div>

                    <div style="display: flex; gap: 0.5rem; flex-wrap: wrap; justify-content: center;">
                        <button type="button" onclick="document.getElementById('input-foto').click()" class="btn" style="padding: 0.5rem 1rem; background: var(--primary-color); color: white; border: none; border-radius: 20px; font-size: 0.85rem; font-weight: bold; cursor: pointer;">
                            📷 ${I18n.t('profile.btn.change_photo') || 'Change Photo'}
                        </button>
                    </div>
                </div>

                <h3 style="margin: 1rem 0 0.5rem 0;">${username}</h3>
                <p style="color: #666; margin: 0;">${email.split('@')[0]}</p>
            </div>

            <!-- Form -->
            <div class="card" style="border-radius: 16px; padding: 1.5rem;">
                <form id="settings-form">
                    <div class="form-group" style="margin-bottom: 1.5rem; background: #f3f4f6; padding: 12px; border-radius: 8px; border-left: 4px solid var(--primary-color);">
                        <label style="font-weight: bold; font-size: 0.9rem; color: #555;" data-i18n="settings.academic_year">Academic Year:</label>
                        <div style="font-size: 1.2rem; font-weight: bold; color: var(--primary-color); margin-top: 5px;">${currentYearString}</div>
                        <small style="color: #888; font-size: 0.8rem;" data-i18n="settings.year_note">*Auto-updated based on current month & year</small>
                    </div>

                    <div class="form-group" style="margin-bottom: 1.5rem;">
                        <label style="display: block; margin-bottom: 0.5rem; font-weight: 500; color: #333;" data-i18n="settings.bio_label">Your Bio:</label>
                        <textarea id="edit-bio" class="form-control" rows="3" style="width: 100%; padding: 12px; border: 1px solid #ddd; border-radius: 8px; font-size: 1rem;" data-i18n="settings.bio_placeholder" placeholder="Love coffee and basketball...">${userProfile.bio || ''}</textarea>
                    </div>

                    <div class="form-group" style="margin-bottom: 2rem;">
                        <label style="display: block; margin-bottom: 0.5rem; font-weight: 500; color: #333;" data-i18n="settings.hobby_label">Hobby:</label>
                        <input type="text" id="edit-hobby" class="form-control" style="width: 100%; padding: 12px; border: 1px solid #ddd; border-radius: 8px; font-size: 1rem;" data-i18n="settings.hobby_placeholder" placeholder="E.g., Basketball, Coding" value="${userProfile.hobby || ''}">
                    </div>

                    <button type="submit" id="btn-save-profile" style="width: 100%; padding: 14px; background: #FF8C00; color: white; border: none; border-radius: 12px; font-size: 1.1rem; font-weight: bold; cursor: pointer; margin-bottom: 1rem; box-shadow: 0 4px 6px rgba(255, 140, 0, 0.2);" data-i18n="settings.save_btn">
                        💾 Save Changes
                    </button>
                    
                    <button type="button" id="btn-logout" style="width: 100%; padding: 14px; background: #FFEBEE; color: #D32F2F; border: none; border-radius: 12px; font-size: 1.1rem; font-weight: bold; cursor: pointer;">
                        Logout
                    </button>
                </form>
            </div>
        </div>
    `;

    // Jalankan ganti bahasa saat pertama kali dibuka
    if (typeof I18n !== 'undefined') updateTexts();

    // 1. LOGIKA PREVIEW FOTO
    let fotoBase64 = userProfile.profile_pic || userProfile.photoURL || '';
    document.getElementById('input-foto').onchange = (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
                fotoBase64 = event.target.result;
                const img = document.getElementById('preview-foto');
                const placeholder = document.getElementById('preview-foto-placeholder');
                img.src = fotoBase64;
                img.style.display = 'block';
                placeholder.style.display = 'none';
            };
            reader.readAsDataURL(file);
        }
    };

    // 2. LOGIKA TOMBOL BACK
    // LOGIKA TOMBOL BACK (TANDA PANAH)
    document.getElementById('back-to-profile').onclick = () => {
        window.navigateTo('profile');
    };

    // 3. LOGIKA LOGOUT
    document.getElementById('btn-logout').onclick = () => {
        if (confirm('Are you sure you want to logout?')) {
            localStorage.removeItem('userProfile');
            localStorage.removeItem('isLoggedIn');
            localStorage.removeItem('userEmail');
            window.location.reload();
        }
    };

    // 4. LOGIKA TOMBOL SAVE & AUTO-REDIRECT
    document.getElementById('settings-form').onsubmit = async (e) => {
        e.preventDefault();
        if (!userProfile.email) return alert("Login dulu ya!");

        const inputBio = document.getElementById('edit-bio').value;
        const inputHobby = document.getElementById('edit-hobby').value;
        const btn = document.getElementById('btn-save-profile');

        btn.innerText = "⏳...";
        btn.disabled = true;

        try {
            // Check if server exists, fallback to MockStore if it doesn't
            let serverSuccess = false;
            try {
                // Send data to MySQL database
                const response = await fetch('http://localhost:3000/update-profile', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        email: userProfile.email,
                        bio: inputBio,
                        hobby: inputHobby,
                        profile_pic: fotoBase64
                    })
                });

                if (response.ok) {
                    // 1. Save locally in the browser so it doesn't disappear on refresh
                    userProfile.bio = inputBio;
                    userProfile.hobby = inputHobby;

                    if (fotoBase64) {
                        userProfile.profile_pic = fotoBase64;
                        userProfile.photoURL = fotoBase64; // <-- INI KUNCI BIAR LANGSUNG MUNCUL!
                    }
                    localStorage.setItem('userProfile', JSON.stringify(userProfile));

                    // 2. Show success message
                    alert("AWESOME! 🎉 Profile saved successfully.");

                    // 3. JUMP TO PROFILE! 🚀 (Biar kamu langsung lihat hasil foto barumu)
                    window.navigateTo('profile');
                    return; // Stop execution
                } else {
                    alert("Saving the data...");
                }
            } catch (err) {
                console.warn("Backend API unavailable, using MockStore as fallback", err);
                alert("Oops, Server is down! Please check your node server.js terminal.");
            }

            // Also update MockStore so it reflects properly in local app
            const updates = { bio: inputBio, hobby: inputHobby, profile_pic: fotoBase64, photoURL: fotoBase64, study_year: currentYearString };
            await MockStore.updateUserProfile(userProfile.email, updates);

            alert(typeof I18n !== 'undefined' ? I18n.t('settings.success') || "Settings updated successfully!" : "Settings updated successfully!");

            userProfile.bio = inputBio;
            userProfile.hobby = inputHobby;
            userProfile.profile_pic = fotoBase64;
            userProfile.photoURL = fotoBase64;
            userProfile.study_year = currentYearString;
            localStorage.setItem('userProfile', JSON.stringify(userProfile));

            window.navigateTo('home');

        } catch (err) {
            console.error("Save error:", err);
            alert("Oops, an error occurred!");
        } finally {
            btn.disabled = false;
            btn.innerText = typeof I18n !== 'undefined' ? I18n.t('settings.save_btn') || "💾 Save Changes" : "💾 Save Changes";
        }
    };
};