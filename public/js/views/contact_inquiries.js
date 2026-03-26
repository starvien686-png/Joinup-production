import { I18n } from '../services/i18n.js';

export const renderContact = () => {
    const app = document.getElementById('app');
    const userProfileStr = localStorage.getItem('userProfile');
    const user = userProfileStr ? JSON.parse(userProfileStr) : { email: '' };

    const t = (en, zh) => {
        const isZH = (localStorage.getItem('app_language') || '').includes('zh');
        return isZH ? zh : en;
    };

    app.innerHTML = `
        <div class="container fade-in" style="padding-bottom: 80px; max-width: 500px; margin: 0 auto;">
            <header style="margin-bottom: 2rem; display: flex; align-items: center;">
                <button id="contact-back-btn" style="background: none; border: none; font-size: 1.5rem; margin-right: 1rem; cursor: pointer; padding: 0.5rem;">⬅️</button>
                <h2 style="margin: 0; font-size: 1.5rem; font-weight: 700;">${t('Contact Us', '聯絡我們')}</h2>
            </header>

            <form id="contact-form" class="contact-form-container" style="background: white; padding: 2rem; border-radius: 24px; box-shadow: 0 10px 30px rgba(0,0,0,0.05); border: 1px solid #f0f0f0;">
                <p style="color: #666; font-size: 0.95rem; margin-bottom: 2rem; line-height: 1.6;">
                    ${t('Got a question or feedback? We\'d love to hear from you. Please fill out the form below.', '有疑問或建議嗎？我們很樂意聽取您的意見。請填寫下面的表單。')}
                </p>

                <div style="margin-bottom: 1.5rem;">
                    <label style="display: block; font-size: 0.85rem; font-weight: 600; color: #333; margin-bottom: 0.5rem; text-transform: uppercase; letter-spacing: 0.5px;">
                        ${t('Your Email Address', '您的電子郵件地址')}
                    </label>
                    <input name="user_email" type="email" value="${user.email}" placeholder="example@mail1.ncnu.edu.tw" required
                        style="width: 100%; padding: 12px 16px; border-radius: 12px; border: 1.5px solid #eee; font-size: 1rem; outline: none; transition: border-color 0.2s; box-sizing: border-box;">
                </div>

                <div style="margin-bottom: 1.5rem;">
                    <label style="display: block; font-size: 0.85rem; font-weight: 600; color: #333; margin-bottom: 0.5rem; text-transform: uppercase; letter-spacing: 0.5px;">
                        ${t('Issue Category', '問題類別')}
                    </label>
                    <select name="category" style="width: 100%; padding: 12px 16px; border-radius: 12px; border: 1.5px solid #eee; font-size: 1rem; background: white; outline: none; transition: border-color 0.2s; cursor: pointer; box-sizing: border-box;">
                        <option value="general">${t('General Inquiry', '一般查詢')}</option>
                        <option value="bug">${t('Bug Report', '系統報修')}</option>
                        <option value="suggestion">${t('Suggestion', '產品建議')}</option>
                        <option value="account">${t('Account Issue', '帳號問題')}</option>
                        <option value="other">${t('Other', '其他')}</option>
                    </select>
                </div>

                <div style="margin-bottom: 2rem;">
                    <label style="display: block; font-size: 0.85rem; font-weight: 600; color: #333; margin-bottom: 0.5rem; text-transform: uppercase; letter-spacing: 0.5px;">
                        ${t('Message', '訊息內容')}
                    </label>
                    <textarea name="message" placeholder="${t('How can we help you today?', '今天有什麼我們可以幫您的？')}" required
                        style="width: 100%; padding: 12px 16px; border-radius: 12px; border: 1.5px solid #eee; font-size: 1rem; min-height: 150px; resize: vertical; outline: none; transition: border-color 0.2s; line-height: 1.5; box-sizing: border-box;"></textarea>
                </div>

                <button type="submit" id="contact-submit-btn" style="width: 100%; background: linear-gradient(135deg,  #FFD600, #FF6D00); color: white; border: none; padding: 16px; border-radius: 16px; font-size: 1.1rem; font-weight: 700; cursor: pointer; box-shadow: 0 8px 20px rgba(76, 175, 80, 0.3); transition: all 0.2s;">
                    ${t('Submit', '提交')}
                </button>
            </form>
        </div>

        <style>
            .contact-form-container input:focus, 
            .contact-form-container select:focus, 
            .contact-form-container textarea:focus {
                border-color: #d2601aff !important;
                background: #fcfdfc;
            }
            #contact-submit-btn:hover {
                transform: translateY(-2px);
                box-shadow: 0 10px 25px rgba(255, 109, 0, 0.4);
            }
            #contact-submit-btn:active {
                transform: scale(0.98);
            }
            #contact-submit-btn:disabled {
                background: #ccc;
                cursor: not-allowed;
                transform: none;
                box-shadow: none;
            }
        </style>
    `;

    // Internal navigation
    document.getElementById('contact-back-btn').addEventListener('click', () => {
        window.navigateTo('profile');
    });

    // Form submission handler
    const contactForm = document.getElementById('contact-form');
    const submitBtn = document.getElementById('contact-submit-btn');

    if (contactForm) {
        contactForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            // UI Feedback: Loading state
            const originalBtnText = submitBtn.innerText;
            submitBtn.disabled = true;
            submitBtn.innerText = t('Sending...', '正在提交...');

            try {
                const formData = new FormData(contactForm);
                const response = await fetch('process_inquiry.php', {
                    method: 'POST',
                    body: formData
                });

                if (!response.ok) {
                    throw new Error(`Server returned ${response.status}: ${response.statusText}`);
                }

                const result = await response.text();
                console.log('Contact form response:', result);

                // We expect exactly "Sukses" from the PHP script
                if (result.trim() === "Sukses") {
                    alert(t('Thank you! Your message has been sent.', '感謝您！您的訊息已送出。'));
                    // Navigate back after success
                    if (window.navigateTo) {
                        window.navigateTo('profile');
                    } else {
                        window.location.href = 'index.html';
                    }
                } else {
                    // Show specific error from backend if available
                    alert(t('Registration failed: ', '提交失敗：') + result);
                    submitBtn.disabled = false;
                    submitBtn.innerText = originalBtnText;
                }
            } catch (error) {
                console.error('Submission error:', error);
                alert(t('Connection error. Please check your internet or database settings.', '連線錯誤。請檢查您的網路或資料庫設定。') + ' (' + error.message + ')');
                submitBtn.disabled = false;
                submitBtn.innerText = originalBtnText;
            }
        });
    }
};
