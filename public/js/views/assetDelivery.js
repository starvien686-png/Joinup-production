export const renderAssetDelivery = () => {
    const app = document.getElementById('app');

    const assetPacks = [
        { id: 'initial', name: '基礎資源包 (Initial)', desc: '包含基礎圖示與 UI 元件', size: '2.4 MB', status: 'installed' },
        { id: 'media', name: '多媒體資源包 (Media)', desc: '高品質對話預覽與背景', size: '12.8 MB', status: 'available' },
        { id: 'lang', name: '語言擴充包 (Language)', desc: '多國語言支援模組', size: '0.5 MB', status: 'available' }
    ];

    const renderList = () => {
        return assetPacks.map(pack => `
            <div class="card" style="margin-bottom: 1rem; padding: 1rem; border: 1px solid #eee; background: white; border-radius: 12px;">
                <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 0.5rem;">
                    <div>
                        <h4 style="margin: 0; color: #333;">${pack.name}</h4>
                        <p style="margin: 0.25rem 0; font-size: 0.8rem; color: #999;">${pack.desc}</p>
                    </div>
                    <span style="font-size: 0.8rem; font-weight: bold; color: var(--primary-color);">${pack.size}</span>
                </div>
                
                <div id="progress-container-${pack.id}" style="display: none; margin-bottom: 0.75rem;">
                    <div style="height: 6px; background: #eee; border-radius: 3px; overflow: hidden;">
                        <div id="progress-bar-${pack.id}" style="width: 0%; height: 100%; background: var(--primary-color); transition: width 0.3s;"></div>
                    </div>
                    <div style="display: flex; justify-content: space-between; margin-top: 0.25rem; font-size: 0.7rem; color: #666;">
                        <span id="progress-text-${pack.id}">正在下載...</span>
                        <span id="progress-percent-${pack.id}">0%</span>
                    </div>
                </div>

                <div style="display: flex; gap: 0.5rem;">
                    ${pack.status === 'installed'
                ? `<button class="btn" style="flex: 1; background: #f5f5f5; color: #999; border: none; cursor: default;">✅ 已安裝</button>`
                : `<button id="btn-install-${pack.id}" class="btn" style="flex: 1; background: var(--primary-color); color: white; border: none;" onclick="window.simulateDownload('${pack.id}')">安裝 / 更新</button>`
            }
                    <button class="btn" style="padding: 0.5rem 1rem; background: white; border: 1px solid #ddd; color: #666;" onclick="alert('查看詳情')">詳情</button>
                </div>
            </div>
        `).join('');
    };

    app.innerHTML = `
        <div class="container fade-in" style="padding-bottom: 80px;">
            <header style="margin-bottom: 1.5rem; display: flex; align-items: center;">
                <button onclick="window.navigateTo('profile')" style="background: none; border: none; font-size: 1.5rem; margin-right: 1rem; cursor: pointer;">⬅️</button>
                <div>
                    <h2 style="margin: 0; font-size: 1.2rem;">📦 Play Asset Delivery</h2>
                    <p style="margin: 0; font-size: 0.8rem; color: #999;">管理您的資源包以優化效能</p>
                </div>
            </header>

            <div style="background: #E3F2FD; padding: 1rem; border-radius: 12px; margin-bottom: 2rem; display: flex; align-items: center; gap: 1rem;">
                <span style="font-size: 1.5rem;">💡</span>
                <p style="margin: 0; font-size: 0.85rem; color: #1565C0;">
                    使用動態交付可減少初始安裝大小，並在需要時自動下載高品質資源。
                </p>
            </div>

            <div class="asset-list">
                ${renderList()}
            </div>
        </div>
        
        <nav class="bottom-nav">
            <a href="#" class="nav-item" onclick="window.navigateTo('home')"><span class="nav-icon">🏠</span><span>首頁</span></a>

            <a href="#" class="nav-item" onclick="window.navigateTo('messages')"><span class="nav-icon">💬</span><span>訊息</span></a>
            <a href="#" class="nav-item active" onclick="window.navigateTo('profile')"><span class="nav-icon">👤</span><span>我的</span></a>
        </nav>
    `;

    // Simulated Download Logic
    window.simulateDownload = (id) => {
        const btn = document.getElementById(`btn-install-${id}`);
        const container = document.getElementById(`progress-container-${id}`);
        const bar = document.getElementById(`progress-bar-${id}`);
        const percent = document.getElementById(`progress-percent-${id}`);
        const text = document.getElementById(`progress-text-${id}`);

        if (btn) btn.style.display = 'none';
        if (container) container.style.display = 'block';

        let progress = 0;
        const interval = setInterval(() => {
            progress += Math.random() * 15;
            if (progress >= 100) {
                progress = 100;
                clearInterval(interval);
                text.innerText = '安裝完成！';
                setTimeout(() => {
                    alert(`${id === 'media' ? '多媒體' : '語言'}資源包已成功下載並啟用。`);
                    renderAssetDelivery(); // Refresh UI
                }, 500);
            }
            if (bar) bar.style.width = `${progress}%`;
            if (percent) percent.innerText = `${Math.floor(progress)}%`;
        }, 300);
    };
};
