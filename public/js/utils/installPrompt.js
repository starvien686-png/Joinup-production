// PWA Install Prompt - 全螢幕版本
// 智慧偵測裝置並顯示安裝提示

class PWAInstallPrompt {
  constructor() {
    this.deferredPrompt = null;
    this.init();
  }

  init() {
    // 監聽 beforeinstallprompt 事件（Android Chrome）
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      this.deferredPrompt = e;
      this.showInstallPrompt();
    });

    // 頁面載入後立即顯示提示
    window.addEventListener('load', () => {
      if (this.isAppInstalled()) {
        return;
      }
      // 立即顯示
      this.showInstallPrompt();
    });

    // 監聽路由變化，在首頁再次提醒
    window.addEventListener('hashchange', () => {
      const hash = window.location.hash;
      if (hash === '' || hash === '#' || hash === '#/home' || hash === '#!/home') {
        setTimeout(() => this.showSecondaryPrompt(), 1000);
      }
    });
  }

  isAppInstalled() {
    return window.matchMedia('(display-mode: standalone)').matches ||
      window.navigator.standalone === true;
  }

  getDeviceInfo() {
    const ua = navigator.userAgent;
    const isIOS = /iPad|iPhone|iPod/.test(ua) && !window.MSStream;
    const isAndroid = /Android/.test(ua);
    const isSafari = /Safari/.test(ua) && !/Chrome/.test(ua);
    const isChrome = /Chrome/.test(ua) && /Google Inc/.test(navigator.vendor);

    const isWebView = this.detectWebView(ua);
    const webViewType = this.getWebViewType(ua);

    return { isIOS, isAndroid, isSafari, isChrome, isWebView, webViewType };
  }

  detectWebView(ua) {
    const webViewPatterns = [
      /Line/i, /FBAV/i, /FBAN/i, /Instagram/i,
      /Messenger/i, /MicroMessenger/i, /GSA/i,
      /Twitter/i, /Telegram/i
    ];
    return webViewPatterns.some(pattern => pattern.test(ua));
  }

  getWebViewType(ua) {
    if (/Line/i.test(ua)) return 'Line';
    if (/FBAV/i.test(ua) || /FBAN/i.test(ua)) return 'Facebook';
    if (/Instagram/i.test(ua)) return 'Instagram';
    if (/Messenger/i.test(ua)) return 'Messenger';
    if (/MicroMessenger/i.test(ua)) return 'WeChat';
    return '應用程式';
  }

  showInstallPrompt() {
    const { isIOS, isAndroid, isSafari, isChrome, isWebView, webViewType } = this.getDeviceInfo();

    if (sessionStorage.getItem('installPromptShown')) {
      return;
    }

    let promptHTML = '';

    // 優先處理 WebView
    if (isWebView) {
      promptHTML = this.getWebViewPrompt(webViewType, isIOS, isAndroid);
    } else if (isIOS) {
      if (isSafari) {
        promptHTML = this.getIOSPrompt();
      } else {
        promptHTML = this.getIOSWrongBrowserPrompt();
      }
    } else if (isAndroid) {
      if (isChrome || this.deferredPrompt) {
        promptHTML = this.getAndroidPrompt();
      } else {
        promptHTML = this.getAndroidWrongBrowserPrompt();
      }
    } else {
      if (this.deferredPrompt) {
        promptHTML = this.getDesktopPrompt();
      }
    }

    if (promptHTML) {
      this.displayPrompt(promptHTML);
      sessionStorage.setItem('installPromptShown', 'true');
    }
  }

  showSecondaryPrompt() {
    if (this.isAppInstalled() || sessionStorage.getItem('secondaryPromptShown')) {
      return;
    }

    const { isIOS, isAndroid, isWebView } = this.getDeviceInfo();

    if (!isWebView) {
      let reminderHTML = '';

      if (isIOS) {
        reminderHTML = `
          <div class="pwa-reminder">
            <p>💡 點擊底部 <strong>分享 ⎋</strong> → 選擇「<strong>加入主畫面</strong>」即可安裝 JoinUp! App</p>
          </div>
        `;
      } else if (isAndroid) {
        reminderHTML = `
          <div class="pwa-reminder">
            <p>💡 點擊選單 <strong>⋮</strong> → 選擇「<strong>新增至主畫面</strong>」即可安裝 JoinUp! App</p>
          </div>
        `;
      }

      if (reminderHTML) {
        this.displayReminder(reminderHTML);
        sessionStorage.setItem('secondaryPromptShown', 'true');
      }
    }
  }

  getWebViewPrompt(appName, isIOS, isAndroid) {
    let browserName = isAndroid ? 'Chrome' : 'Safari';
    let instructionsZH = '';
    let instructionsEN = '';

    if (isIOS) {
      instructionsZH = `
        <ol style="margin: 0; padding-left: 1.5rem; font-size: 1rem; line-height: 1.6; color: #eee;">
          <li>點選右下角 「三個直點 ⋮ 」</li>
          <li>選擇 「在瀏覽器中開啟」</li>
          <li>點選底部 「分享 ⎋」 → 選擇「加入主畫面 ➕」</li>
        </ol>
      `;
      instructionsEN = `
        <ol style="margin: 0; padding-left: 1.5rem; font-size: 1rem; line-height: 1.6; color: #eee; opacity: 0.9;">
          <li>Click the "three dots ⋮" in the bottom right</li>
          <li>Select "Open in Browser"</li>
          <li>Click "Share ⎋" → Select "Add to Home Screen ➕"</li>
        </ol>
      `;
    } else if (isAndroid) {
      instructionsZH = `
        <ol style="margin: 0; padding-left: 1.5rem; font-size: 1rem; line-height: 1.6; color: #eee;">
          <li>點選右下角 「三個直點 ⋮ 」</li>
          <li>選擇 「在瀏覽器中開啟」</li>
          <li>點選右上角 「三個直點 ⋮」 → 選擇「新增至主畫面 ➕」</li>
        </ol>
      `;
      instructionsEN = `
        <ol style="margin: 0; padding-left: 1.5rem; font-size: 1rem; line-height: 1.6; color: #eee; opacity: 0.9;">
          <li>Click the "three dots ⋮" in the bottom right</li>
          <li>Select "Open in Browser"</li>
          <li>Click the "three dots ⋮" at the top → Select "Add to Home Screen ➕"</li>
        </ol>
      `;
    }

    return `
      <div class="pwa-fullscreen-overlay">
        <div class="pwa-fullscreen-content">
          <div style="text-align: center; margin-bottom: 1.5rem;">
            <div style="font-size: 3.5rem; margin-bottom: 0.5rem;">📱</div>
            <h2 style="margin: 0; font-size: 1.5rem; color: white;">歡迎來到 JoinUp! 暨大專屬揪團平台</h2>
            <p style="margin: 0.25rem 0 0 0; font-size: 1.1rem; color: #FFD54F; font-weight: bold;">(不佔空間、即開即用！)</p>
          </div>
          
          <div style="background: rgba(255,255,255,0.1); padding: 1.5rem; border-radius: 16px; margin-bottom: 1rem; border: 1px solid rgba(255,255,255,0.2);">
            <h3 style="margin: 0 0 0.8rem 0; font-size: 1.1rem; color: #fff;">如何安裝 JoinUp! / How to Install</h3>
            
            <div style="margin-bottom: 1.2rem;">
              <p style="margin: 0 0 0.5rem 0; font-size: 0.9rem; color: #fff; font-weight: bold;">[中文] 簡單 3 步將 App 釘在桌面！</p>
              ${instructionsZH}
            </div>
            
            <div>
              <p style="margin: 0 0 0.5rem 0; font-size: 0.85rem; color: #ccc; font-weight: bold;">[English] Pin App to desktop in 3 steps!</p>
              ${instructionsEN}
            </div>
          </div>
          
          <div style="text-align: center; font-size: 0.9rem; color: #eee; margin-top: 1rem;">
            大功告成！你現在可以從桌面直接開啟 JoinUp! 囉！ ✨<br>
            <span style="opacity: 0.8;">Done! Open JoinUp! directly from your home screen!</span>
          </div>

          <button class="fullscreen-close-btn" onclick="window.closeInstallPrompt()">
            我知道了 / Got it
          </button>
        </div>
      </div>
    `;
  }

  getIOSPrompt() {
    return `
      <div class="pwa-fullscreen-overlay">
        <div class="pwa-fullscreen-content">
          <div style="text-align: center; margin-bottom: 2rem;">
            <div style="font-size: 4rem; margin-bottom: 1rem;">📱</div>
            <h2 style="margin: 0; font-size: 1.6rem; color: white;">歡迎來到 JoinUp! 暨大專屬揪團平台</h2>
            <p style="margin: 0.5rem 0 0 0; font-size: 1.1rem; color: #FFD54F;">免下載，簡單 3 步將 App 釘在桌面！</p>
          </div>
          
          <div style="background: rgba(255,255,255,0.15); padding: 1.8rem; border-radius: 20px; text-align: center; border: 1px solid rgba(255,255,255,0.2);">
            <div style="margin-bottom: 1.5rem;">
              <p style="margin: 0; font-size: 1.2rem; line-height: 1.6; color: white;">
                1️⃣ 點選底部 「<strong>分享</strong>」 <span style="font-size: 1.8rem;">⎋</span>
              </p>
              <p style="margin: 0; font-size: 0.9rem; color: #eee; opacity: 0.8;">Tap the <strong>Share</strong> button at the bottom</p>
            </div>
            
            <div>
              <p style="margin: 0; font-size: 1.2rem; line-height: 1.6; color: white;">
                2️⃣ 點選 「<strong>加入主畫面 ➕</strong>」
              </p>
              <p style="margin: 0; font-size: 0.9rem; color: #eee; opacity: 0.8;">Select "<strong>Add to Home Screen ➕</strong>"</p>
            </div>
            
            <div style="margin-top: 1.5rem; font-size: 2.5rem; animation: bounce 2s infinite;">✨</div>
          </div>
          
          <p style="text-align: center; margin-top: 1.5rem; font-size: 0.95rem; color: white; opacity: 0.9;">
            大功告成！你現在可以從桌面直接開啟 JoinUp! 囉！<br>
            <span style="font-size: 0.85rem; opacity: 0.7;">Done! Open JoinUp! directly from your home screen.</span>
          </p>

          <button class="fullscreen-close-btn" onclick="window.closeInstallPrompt()">
            稍後再說 / Maybe Later
          </button>
        </div>
      </div>
    `;
  }

  getIOSWrongBrowserPrompt() {
    return `
      <div class="pwa-fullscreen-overlay">
        <div class="pwa-fullscreen-content">
          <div style="text-align: center; margin-bottom: 2rem;">
            <div style="font-size: 4.5rem; margin-bottom: 1rem;">⚠️</div>
            <h2 style="margin: 0; font-size: 1.8rem; color: white;">請使用 Safari 瀏覽器</h2>
            <p style="margin: 0.5rem 0 0 0; font-size: 1.1rem; opacity: 0.9;">Please use Safari Browser</p>
          </div>
          <div style="background: rgba(255,255,255,0.1); padding: 1.5rem; border-radius: 16px; text-align: center; border: 1px solid rgba(255,255,255,0.2);">
            <p style="margin: 0; font-size: 1.1rem; line-height: 1.8;">
              在 iPhone 上，只有 <strong>Safari</strong> 可以安裝 PWA。<br>
              請複製連結並切換至 Safari 開啟！
            </p>
            <p style="margin: 1.2rem 0 0 0; font-size: 1rem; color: #ccc;">
              On iPhone, only <strong>Safari</strong> supports PWA installation. Please copy the URL and open it in Safari.
            </p>
          </div>
          <button class="fullscreen-close-btn" onclick="window.closeInstallPrompt()">
            我知道了 / Got it
          </button>
        </div>
      </div>
    `;
  }

  getAndroidPrompt() {
    return `
      <div class="pwa-fullscreen-overlay">
        <div class="pwa-fullscreen-content">
          <div style="text-align: center; margin-bottom: 2rem;">
            <div style="font-size: 4rem; margin-bottom: 1rem;">📱</div>
            <h2 style="margin: 0; font-size: 1.6rem; color: white;">歡迎來到 JoinUp! 暨大專屬揪團平台</h2>
            <p style="margin: 0.5rem 0 0 0; font-size: 1.1rem; color: #FFD54F;">免下載，簡單 3 步將 App 釘在桌面！</p>
          </div>

          <div style="background: rgba(255,255,255,0.15); padding: 1.8rem; border-radius: 20px; text-align: center; border: 1px solid rgba(255,255,255,0.2);">
            <div style="margin-bottom: 1rem;">
              <p style="margin: 0; font-size: 1.2rem; line-height: 1.6; color: white;">
                1️⃣ 點選右上角 「<strong>三個直點 ⋮</strong>」
              </p>
              <p style="margin: 0; font-size: 0.9rem; color: #eee; opacity: 0.8;">Tap the <strong>three dots ⋮</strong> at the top</p>
            </div>
            
            <div style="margin-bottom: 1.5rem;">
              <p style="margin: 0; font-size: 1.2rem; line-height: 1.6; color: white;">
                2️⃣ 選單內點選 「<strong>新增至主畫面 ➕</strong>」
              </p>
              <p style="margin: 0; font-size: 0.9rem; color: #eee; opacity: 0.8;">Select "<strong>Add to Home Screen ➕</strong>"</p>
            </div>

            <button class="fullscreen-install-btn" onclick="window.triggerInstall()" style="background: white; color: #667eea; border-radius: 12px; height: 50px; font-weight: bold;">
              立即安裝 / Install Now
            </button>
          </div>
          
          <p style="text-align: center; margin-top: 1.5rem; font-size: 0.95rem; color: white; opacity: 0.9;">
            大功告成！你現在可以從桌面直接開啟 JoinUp! 囉！<br>
            <span style="font-size: 0.85rem; opacity: 0.7;">Done! Open JoinUp! directly from your home screen.</span>
          </p>

          <button class="fullscreen-close-btn" onclick="window.closeInstallPrompt()">
            稍後再說 / Maybe Later
          </button>
        </div>
      </div>
    `;
  }

  getAndroidWrongBrowserPrompt() {
    return `
      <div class="pwa-fullscreen-overlay">
        <div class="pwa-fullscreen-content">
          <div style="text-align: center; margin-bottom: 2rem;">
            <div style="font-size: 4.5rem; margin-bottom: 1rem;">⚠️</div>
            <h2 style="margin: 0; font-size: 1.8rem; color: white;">建議使用 Chrome 瀏覽器</h2>
            <p style="margin: 0.5rem 0 0 0; font-size: 1.1rem; opacity: 0.9;">Chrome is Recommended</p>
          </div>
          <div style="background: rgba(255,255,255,0.1); padding: 1.5rem; border-radius: 16px; text-align: center; border: 1px solid rgba(255,255,255,0.2);">
            <p style="margin: 0; font-size: 1.1rem; line-height: 1.8;">
              在 Android 上，建議使用 <strong>Chrome</strong> 以獲得最佳安裝與使用體驗。
            </p>
            <p style="margin: 1.2rem 0 0 0; font-size: 1rem; color: #ccc;">
              For the best experience on Android, we recommend using <strong>Google Chrome</strong> to install JoinUp!.
            </p>
          </div>
          <button class="fullscreen-close-btn" onclick="window.closeInstallPrompt()">
            我知道了 / Got it
          </button>
        </div>
      </div>
    `;
  }

  getDesktopPrompt() {
    return `
      <div class="pwa-fullscreen-overlay">
        <div class="pwa-fullscreen-content">
          <div style="text-align: center; margin-bottom: 2rem;">
            <div style="font-size: 4.5rem; margin-bottom: 1rem;">💻</div>
            <h2 style="margin: 0; font-size: 1.8rem; color: white;">安裝 JoinUp! 到電腦桌面</h2>
            <p style="margin: 0.5rem 0 0 0; font-size: 1.1rem; opacity: 0.9;">Install JoinUp! to Desktop</p>
          </div>
          <div style="background: rgba(255,255,255,0.1); padding: 1.5rem; border-radius: 16px; text-align: center; border: 1px solid rgba(255,255,255,0.2);">
            <p style="margin: 0; font-size: 1.1rem; line-height: 1.8;">
              點擊網址列右側的「安裝」圖示<br>或使用下方連結：
            </p>
            <p style="margin: 1.2rem 0 1rem 0; font-size: 1rem; color: #ccc;">
              Click the install icon in the address bar or use the button below:
            </p>
            <button class="fullscreen-install-btn" onclick="window.triggerInstall()" style="background: white; color: #667eea; border-radius: 12px; height: 50px; font-weight: bold;">
              立即安裝 / Install Now
            </button>
          </div>
          <button class="fullscreen-close-btn" onclick="window.closeInstallPrompt()">
            稍後再說 / Maybe Later
          </button>
        </div>
      </div>
    `;
  }

  displayPrompt(html) {
    const oldPrompt = document.getElementById('pwa-install-prompt');
    if (oldPrompt) {
      oldPrompt.remove();
    }

    const promptDiv = document.createElement('div');
    promptDiv.id = 'pwa-install-prompt';
    promptDiv.innerHTML = html;
    document.body.appendChild(promptDiv);

    this.addStyles();

    setTimeout(() => {
      promptDiv.classList.add('show');
    }, 100);
  }

  displayReminder(html) {
    const reminderDiv = document.createElement('div');
    reminderDiv.id = 'pwa-reminder';
    reminderDiv.innerHTML = html;
    document.body.appendChild(reminderDiv);

    this.addReminderStyles();

    setTimeout(() => {
      reminderDiv.style.opacity = '0';
      setTimeout(() => reminderDiv.remove(), 300);
    }, 5000);
  }

  addStyles() {
    if (document.getElementById('pwa-install-prompt-styles')) {
      return;
    }

    const style = document.createElement('style');
    style.id = 'pwa-install-prompt-styles';
    style.innerHTML = `
      #pwa-install-prompt {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        z-index: 99999;
        opacity: 0;
        transition: opacity 0.3s ease-out;
      }

      #pwa-install-prompt.show {
        opacity: 1;
      }

      .pwa-fullscreen-overlay {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 2rem;
      }

      .pwa-fullscreen-content {
        max-width: 500px;
        width: 100%;
        color: white;
        text-align: left;
      }

      .fullscreen-install-btn {
        background: white;
        color: #667eea;
        border: none;
        padding: 1rem 2rem;
        border-radius: 12px;
        font-size: 1.2rem;
        font-weight: 700;
        cursor: pointer;
        transition: all 0.2s;
        width: 100%;
        margin-top: 1rem;
      }

      .fullscreen-install-btn:hover {
        transform: translateY(-2px);
        box-shadow: 0 8px 20px rgba(0,0,0,0.3);
      }

      .fullscreen-close-btn {
        position: fixed;
        bottom: 2rem;
        right: 2rem;
        background: rgba(255,255,255,0.2);
        color: white;
        border: 2px solid rgba(255,255,255,0.5);
        padding: 0.8rem 1.5rem;
        border-radius: 25px;
        font-size: 1rem;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.2s;
      }

      .fullscreen-close-btn:hover {
        background: rgba(255,255,255,0.3);
        transform: scale(1.05);
      }

      @keyframes bounce {
        0%, 20%, 50%, 80%, 100% {transform: translateY(0);}
        40% {transform: translateY(-10px);}
        60% {transform: translateY(-5px);}
      }

      @media (max-width: 600px) {
        .pwa-fullscreen-content h2 {
          font-size: 1.3rem !important;
        }

        .pwa-fullscreen-content p {
          font-size: 0.9rem !important;
        }

        .fullscreen-close-btn {
          bottom: 1rem;
          right: 50%;
          transform: translateX(50%);
          width: calc(100% - 4rem);
          max-width: 300px;
          text-align: center;
        }
      }
    `;
    document.head.appendChild(style);
  }

  addReminderStyles() {
    if (document.getElementById('pwa-reminder-styles')) {
      return;
    }

    const style = document.createElement('style');
    style.id = 'pwa-reminder-styles';
    style.innerHTML = `
      #pwa-reminder {
        position: fixed;
        top: 20px;
        left: 50%;
        transform: translateX(-50%);
        z-index: 9998;
        transition: opacity 0.3s;
      }

      .pwa-reminder {
        background: rgba(255, 194, 0, 0.95);
        color: white;
        padding: 1rem 1.5rem;
        border-radius: 12px;
        box-shadow: 0 4px 20px rgba(0,0,0,0.3);
        max-width: 90%;
        text-align: center;
        animation: slideDown 0.3s ease-out;
      }

      @keyframes slideDown {
        from {
          transform: translateY(-100%);
          opacity: 0;
        }
        to {
          transform: translateY(0);
          opacity: 1;
        }
      }

      .pwa-reminder p {
        margin: 0;
        font-size: 0.95rem;
        line-height: 1.5;
      }

      @media (max-width: 600px) {
        .pwa-reminder p {
          font-size: 0.85rem;
        }
      }
    `;
    document.head.appendChild(style);
  }

  closePrompt() {
    const prompt = document.getElementById('pwa-install-prompt');
    if (prompt) {
      prompt.classList.remove('show');
      setTimeout(() => {
        prompt.remove();
        // 關閉後顯示第二次提醒
        setTimeout(() => this.showSecondaryPrompt(), 500);
      }, 300);
    }
  }

  async triggerInstall() {
    if (!this.deferredPrompt) {
      alert('請使用瀏覽器選單的「安裝」功能');
      return;
    }

    this.deferredPrompt.prompt();
    const { outcome } = await this.deferredPrompt.userChoice;
    console.log(`User response: ${outcome}`);

    this.deferredPrompt = null;
    this.closePrompt();
  }
}

// 全域函式
window.closeInstallPrompt = () => {
  if (window.pwaInstallPrompt) {
    window.pwaInstallPrompt.closePrompt();
  }
};

window.triggerInstall = () => {
  if (window.pwaInstallPrompt) {
    window.pwaInstallPrompt.triggerInstall();
  }
};

// 初始化
window.pwaInstallPrompt = new PWAInstallPrompt();
