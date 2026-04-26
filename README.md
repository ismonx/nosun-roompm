# 🏡 FU·PMS V6.0 — 專業旅宿營運矩陣 (Bilingual Matrix)

這是一套進化至 V6.0 的專業旅宿管理系統 (Property Management System)，專為追求效率與美感的「現代經營者」打造。從單一訂房頁進化為具備多租戶潛力的營運中樞，全面自動化處理定價、房控與旅客轉化。

---

## 📍 系統核心：專業級營運架構

[ **前端：智慧預訂門戶** ] 
      |
      |-- (A) **四層定價引擎**：自動計算 Promo > Rule > Room Promo > Base Price
      |-- (B) **優惠碼結帳**：即時驗證折抵碼，重新計算總額
      |-- (C) **雙語系支援**：自動偵測瀏覽器語言 (ZH/EN)，無縫切換雙語內容
      |-- (D) **LINE OA 深度整合**：一鍵預訂並自動生成完整的帶位資訊字串
      V
[ **後端：Firestore 解耦架構** ] <----> [ **管理端：fUX Center** ]
      | (Collection 化管理)                 |
      |-- config/global_settings          |-- (A) **週矩陣檢視**：CSS Grid 自適應寬度，一眼透視當週房況
      |-- rooms                           |-- (B) **月曆檢視**：支援年份/月份快速跳轉
      |-- pricing_rules                   |-- (C) **房型定價與推薦碼管理**：完整 CRUD 卡片介面
      |-- bookings                        |-- (D) **三主題切換**：深夜/南灣/恆春 Style 一鍵切換
      |-- promo_codes                     |-- (E) **無障礙對比度**：全面符合 WCAG AA 日間模式規範

---

## 🚀 V6.0 重大更新亮點

### 1. 專業營運矩陣 (Matrix OS)
*   **週檢視 (Week View)**：工業級自動伸展佈局。房型欄固定，日期欄根據螢幕自動延伸。提供上週/下週/今日快速切換。
*   **月檢視 (Month View)**：整合式全月統計，支援年月快速跳轉，點擊日期可直達該週細節。
*   **介面進化**：全站採用 `rounded-md` (6px) 工業風圓角收斂，搭配頂部水平工具列，最大化工作可視空間。
*   **合作夥伴/優惠碼系統**：全新的 `promo_codes` 模組，支援折扣率自訂、到期日限制與即時驗證。

### 2. 四級智慧定價引擎 (Pricing Logic)
優先級演算：
1.  **Pricing Rules (Promo)**：特定區間促銷價（顯示原價刪除線）。
2.  **Pricing Rules (Price)**：特定區間標準價。
3.  **Room Level (Promo)**：房型預設優惠價。
4.  **Room Level (Base)**：房型基礎房價。

### 3. 三主題設計系統 (Theme System)
結合 CSS Variables 與 Tailwind，支援即時主題注入：
*   🌲 **深夜森林 (Midnight Forest)**：低飽和深邃綠，沉穩文青感的極致。
*   🌊 **南灣浪花 (Nanwan Surf)**：沁涼輕盈藍，充滿海洋呼吸感的排版。
*   🌇 **恆春落日 (Sunset Vibe)**：溫暖大地橘，如夕陽灑落的舒適調性。
*   🌗 **全域夜間模式**：所有主題皆支援一鍵天黑，平滑 500ms 漸變效果。日間模式已全面加強文字對比度，提升閱讀清晰度。

---

## 🛠 技術棧與開發指南

### 前端技術
*   **Framework**: React (Vite)
*   **Styling**: Tailwind CSS v4 + CSS Variables Theme Engine
*   **Icons**: Lucide-react
*   **State**: Context API (Decoupled Global State)

### 後端服務
*   **Database**: Firebase Firestore (5-Collection Normalized Schema)
*   **Deployment**: Vercel

### 環境變數設定 (.env)
需在 Vercel 或本地建立以下變數：
```env
VITE_FIREBASE_API_KEY=xxx
VITE_FIREBASE_AUTH_DOMAIN=xxx
VITE_FIREBASE_PROJECT_ID=xxx
VITE_FIREBASE_STORAGE_BUCKET=xxx
VITE_FIREBASE_MESSAGING_SENDER_ID=xxx
VITE_FIREBASE_APP_ID=xxx
VITE_LINE_OA_ID=@your_id
```

### 開發指令
```bash
npm install     # 安裝依賴
npm run dev     # 啟動開發伺服器
npm run build   # 執行生產環境建置
```

---

© 2026 防曬不要擦太多民宿 · 營運架構師 TEO (Advanced AI Partner)