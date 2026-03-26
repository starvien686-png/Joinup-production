# JoinUp! 一起加入吧 🎉

> 國立暨南國際大學校園互助平台 - PWA版本

[![PWA](https://img.shields.io/badge/PWA-Ready-brightgreen)](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps)
[![Version](https://img.shields.io/badge/version-1.0.0-blue)]()

## 📖 專案簡介

**JoinUp! 一起加入吧** 是一個專為暨大學生設計的校園互助平台，讓學生能輕鬆揪團、找室友、參加活動。

### 🎯 核心理念
- **學生互助**：促進校園內學生間的交流與合作
- **即時媒合**：快速找到志同道合的夥伴
- **簡單易用**：直覺的使用介面，無需複雜操作

---

## ✨ 已完成功能

### 🛍️ 一起合租吧
完整的租屋室友媒合系統
### ✅ 已完成功能
1. **一起合租吧 (Roommate Matching)**
   - 瀏覽房源/室友需求 (校內宿舍、校外合租)
   - 發佈徵室友貼文
   - 進階篩選 (性別、租金、作息、生活習慣)
   - 申請與審核流程 (等待成案、確認成案)

2. **一起出去吧 (Activity/Events)**
   - 發起/加入活動 (運動、美食、旅遊等)
   - 聊天室功能 (群組聊天)
   - 參加管理

3. **一起運動吧 (Sports)**
   - 發起/加入運動團
   - 地點/時間/人數管理
   - 專屬聊天室

4. **一起坐車吧 (Carpool)**
   - 發起/加入共乘 (返鄉、出遊)
   - 路線與費用說明
   - 專屬聊天室

5. **一起學習吧 (Study)**
   - 發起/加入讀書會
   - 科目/地點/時間設定
   - 專屬聊天室

6. **訊息中心 (Messaging)**
   - 整合所有聊天室
   - 一對一聊天 (合租、共乘、學習)
   - 群組聊天 (活動、運動)
   - 即時訊息更新

7. **個人中心 (User Profile)**
   - 用戶資料管理
   - 我的活動紀錄
   - 成案統計

---

## 🏗️ 技術架構

### Frontend
- **純 JavaScript (ES6+)**
- **HTML5 + CSS3**
- **PWA** (Progressive Web App)
- **SPA** (Single Page Application)

### 🚀 待開發功能 (Pending)
- [ ] **通知系統 (Notifications)**：即時通知申請結果、新訊息。
- [ ] **圖片上傳 (Image Upload)**：目前僅支援文字描述，需串接圖片存儲。
- [ ] **個人檔案進階設定**：更多個性化標籤與頭像更換。
- [ ] **評價系統**：活動/合租結束後互評。

### 資料儲存
- **LocalStorage** (模擬後端)
- 未來可替換為真實後端 API

### 檔案結構
```
JoinUp!/
├── index.html              # 主頁面
├── manifest.json          # PWA manifest
├── sw.js                  # Service Worker
├── css/
│   └── style.css          # 全域樣式
├── js/
│   ├── app.js             # 應用程式入口 (Routing)
│   ├── views/
│   │   ├── home.js        # 首頁 (類別選擇)
│   │   ├── groupbuy.js    # 一起合租吧 (完整邏輯)
│   │   ├── travel.js      # 一起出去吧 (完整邏輯)
│   │   ├── sports.js      # 一起運動吧 (完整邏輯)
│   │   ├── carpool.js     # 一起坐車吧 (完整邏輯)
│   │   ├── study.js       # 一起學習吧 (完整邏輯)
│   │   ├── messages.js    # 聊天室列表與對話視窗
│   │   ├── register.js    # 註冊/登入頁面
│   │   ├── profile.js     # 個人檔案
│   │   └── admin.js       # 管理員後台
│   └── models/
│       └── mockStore.js   # 模擬後端資料庫 (LocalStorage)
└── assets/
    └── icons/             # PWA 圖示
```

---

## 🔧 開發指南

### 環境需求
- **Node.js** (選用，目前未使用)
- 現代瀏覽器（Chrome, Edge, Firefox）
- HTTPS 環境（用於 PWA 測試）

### 快速開始

#### 1. Clone 專案
```bash
git clone <repository-url>
cd "JoinUp!一起加入吧!"
```

#### 2. 本地開發
使用任意靜態伺服器，例如：

**Python:**
```bash
python -m http.server 8000
```

**VS Code Live Server:**
- 安裝 Live Server 擴充功能
- 右鍵 `index.html` → Open with Live Server

**Node.js http-server:**
```bash
npx http-server -p 8000
```

然後開啟瀏覽器：`http://localhost:8000`

#### 3. PWA 測試（需要 HTTPS）

**使用 Cloudflare Tunnel:**
```bash
# 下載 cloudflared (已在 .gitignore)
cloudflared tunnel --url http://localhost:8000
```

**或使用 ngrok:**
```bash
# 下載 ngrok (已在 .gitignore)
ngrok http 8000
```

取得 HTTPS URL 後即可測試 PWA 安裝功能。

---

## 📂 核心檔案說明

### `js/models/mockStore.js` ⭐⭐⭐
**最重要的檔案！** 模擬後端資料庫

**主要功能：**
- 貼文 CRUD
- 申請管理
- 聊天室管理
- 訊息系統
- 狀態管理
- 資料持久化（LocalStorage）

**關鍵方法：**
```javascript
// 貼文
createPost(postData)
getPosts(filter)
getMyPosts(userId)
updatePostStatus(postId, status)

// 申請（租屋）
createApplication(appData)
updateApplicationStatus(appId, status)
partnerConfirmMatch(postId, partnerId)

// 活動（一起出去吧）
joinTravelActivity(postId, userId, userName, dept)
removeParticipant(postId, userId)

// 聊天
createChatRoom(roomData)
createGroupChatRoom(roomData)
sendChatMessage(roomId, senderId, senderName, content)
getChatRooms(userId)
```

### `js/views/groupbuy.js`
一起合租吧完整實作（~1400 行）

**主要功能：**
- 4 路徑選擇邏輯
- 表單驗證
- 生活習慣標籤系統
- 申請管理介面
- 雙向確認流程

### `js/views/travel.js`
一起出去吧完整實作（~860 行）

**主要功能：**
- 活動發起
- 即時加入機制
- 群組聊天
- 篩選功能
- 活動管理

### `js/views/messages.js`
訊息中心（~300 行）

**功能：**
- 聊天室列表
- 一對一/群組聊天
- 訊息即時更新

---

## 💾 資料結構

### LocalStorage Keys
```javascript
'joinup_posts_manual_test_v1'         // 所有貼文
'joinup_applications_manual_test_v1'  // 所有申請
'joinup_chatrooms_v1'                 // 聊天室
'joinup_messages_manual_test_v1'      // 訊息
'userProfile'                         // 用戶資料
'isLoggedIn'                          // 登入狀態
'match_statistics'                    // 統計資料
```

### Post 資料結構
```javascript
{
  id: 'post_timestamp',
  category: 'groupbuy' | 'travel' | 'sports' | 'carpool' | 'study',
  authorId: 'user@ncnu.edu.tw',
  status: 'open' | 'paused' | 'success' | 'expired' | 'cancelled',
  participants: [...],  // 活動參與者（travel）
  // ... 其他欄位依分類不同
}
```

---

## 🎨 開發規範

### 命名規則
- **函式**：camelCase (`renderHome`, `createPost`)
- **常數**：UPPER_SNAKE_CASE (`STORAGE_KEYS`, `CATEGORY_ID`)
- **檔案**：kebab-case 或 camelCase

### 新增功能步驟

#### 1. 在 `home.js` 新增分類
```javascript
const categories = [
  // ...
  { id: 'sports', name: '一起運動吧', icon: '🏀', color: '#FF7043' }
];
```

#### 2. 建立新的 view 檔案
```javascript
// js/views/sports.js
export const renderSports = () => {
  // 實作邏輯
};
```

#### 3. 在 `app.js` 註冊路由
```javascript
import { renderSports } from './views/sports.js';

const routes = [
  // ...
  { path: '/sports', view: renderSports }
];
```

#### 4. 在 `mockStore.js` 擴充資料方法
```javascript
// 根據需求新增對應的 CRUD 方法
```

### 狀態管理
使用 `currentState` 變數追蹤頁面狀態：
```javascript
let currentState = 'landing'; // 'landing', 'create', 'list', 'manage'
```

### 事件綁定
每次重新 render 後都要重新綁定事件：
```javascript
const updateView = () => {
  app.innerHTML = renderSomething();
  bindListeners(); // 重新綁定
};
```

---

## 🧪 測試

### 測試帳號
系統會自動要求 NCNU email 驗證：
- Email 格式：`xxx@ncnu.edu.tw`
- 註冊後資料存於 LocalStorage

### 清除資料
開啟 DevTools Console：
```javascript
localStorage.clear();
location.reload();
```

### PWA 測試
1. 使用 HTTPS 環境
2. 開啟 DevTools → Application → Manifest
3. 檢查 Service Worker 狀態
4. 點擊「安裝」按鈕測試

---

## 📱 PWA 功能

### Service Worker (`sw.js`)
- 快取靜態資源
- 離線瀏覽支援
- 版本控制：修改 `CACHE_NAME` 觸發更新

### Manifest (`manifest.json`)
- App 名稱、圖示
- 主題色彩
- 顯示模式：standalone

### 圖示需求
需要放置於 `assets/icons/`：
- `icon-192.png` (192x192)
- `icon-512.png` (512x512)

---

## 🐛 已知問題

### 已解決
- ✅ 租屋篩選功能空白頁問題
- ✅ 聊天室開啟失敗問題
- ✅ 申請列表重複顯示問題

### 待優化
- [ ] 訊息未讀提示
- [ ] 圖片上傳功能
- [ ] 更好的錯誤處理
- [ ] 載入動畫

---

## 📚 參考文件

### 內部文檔
- [一起合租吧功能說明](./docs/groupbuy.md)（如果有的話）
- [一起出去吧功能報告](./docs/travel-report.md)（腦資料夾內）

### 技術文檔
- [PWA 開發指南](https://web.dev/progressive-web-apps/)
- [Service Worker API](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API)
- [LocalStorage Guide](https://developer.mozilla.org/en-US/docs/Web/API/Window/localStorage)

---

## 👥 貢獻者

- **第一階段開發**：[你的名字] - 一起合租吧、一起出去吧
- **第二階段開發**：[下一位同學] - 其他功能

---

## 📝 版本歷史

### v1.0.0 (2026-01-05)
**已完成功能：**
- ✅ 用戶註冊與登入
- ✅ 一起合租吧（完整）
- ✅ 一起出去吧（完整）
- ✅ 訊息中心
- ✅ 個人中心
- ✅ PWA 基礎配置

**待開發：**
- ⏳ 一起運動吧
- ⏳ 一起坐車吧
- ⏳ 一起學習吧

---

## 📞 聯絡資訊

如有問題，請透過：
- Email: [你的 email]
- GitHub Issues
- [其他聯絡方式]

---

## 📄 授權

本專案僅供暨南大學內部使用。

---

**祝開發順利！🚀**

最後更新：2026-01-05
