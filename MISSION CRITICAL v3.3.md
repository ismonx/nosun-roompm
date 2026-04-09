MISSION CRITICAL: FU-HOSTEL 2026 LOGIC-FIRST ARCHITECTURE V5.0
指令發起人： 第一架構師 阿芝 (Ah-Zhi)
執行目標： 徹底剷除 V3.3 遺留之邏輯斷層，重構「防曬不要擦太多民宿」營運大腦。
核心原則： 「邏輯優先於視覺，連動優先於靜態」。

🤖 壹、 執行規範與環境優化 (Mandatory)
環境適應 (Mac 2012 Optimization)：

嚴禁使用大型動畫庫（如 Framer Motion）。

強制 Memoization：所有清單組件必須使用 React.memo，確保大西瓜 Mac 跑起來不發燙。

單檔案封裝但「邏輯分層」：

雖然代碼寫在單一 .jsx，但必須明確劃分 Context、Hooks、與 Components 區域。

Firebase 嚴格路徑：

設定檔路徑：/global/settings/

預訂資料路徑：/bookings/

🧠 貳、 核心神經系統：Data Context & Logic
此部分為系統靈魂，必須優先實作，禁止只有 UI 空殼：

全域設定中心 (Global Settings)：

實作 SettingsProvider。前端首頁的所有文字（Title, Subtitle, Description）必須從此 Context 讀取。

夥伴推薦邏輯：增加 referralSwitch 與 referralMsg 欄位。當開關開啟且客滿時，前端必須顯示此訊息。

智慧加人計費公式 (Manual-First Logic)：

公式：Total = BasePrice + (ExtraGuests * 500)。

連動：當使用者在前端或後端調整加人數時，總額必須「即時（Real-time）」計算並顯示，不得延遲。

🏗️ 參、 前端預訂：四步轉化漏斗 (The Funnel)
禁止跳過任何步驟，必須確保數據在步驟間流動：

Step 1: 日期與轉單

±2日推薦：若所選日期客滿，必須自動搜尋前後兩天，並以「日期卡片」形式出示，卡片上需標註「該日最低房價」。

Step 2: 房型與加人

圖片上方標註「👤 x N 標準入住」。

實作 +/- 選擇器，選中後下方立即出示「預估總額」。

Step 3: 客資蒐集 (Crucial)

必填欄位：訂房人姓名、聯絡電話。

邏輯驗證：未填寫資訊前，禁止進入 Step 4。

Step 4: LINE 預訂與鎖房

點擊按鈕必須觸發 setDoc 將資料寫入 Firestore 並標記為 pending (黃色)。

跳轉 LINE 訊息範本需包含所有 Step 3 填寫的資訊。

📊 肆、 後端控台：管理矩陣 (Admin Matrix)
打掉重練，拒絕死掉的 UI：

房況矩陣狀態：

格子顏色與 status 欄位強制連動：pending(黃) / deposit(藍) / full(綠)。

當格內有 isWholeHouse: true，則整列 Column 變更為靛藍色 (bg-indigo-50)。

新建/編輯彈窗 (Interactive Modal)：

禁止唯讀：彈窗內必須提供實質的 Input 欄位用於輸入姓名、電話、備註。

手動覆蓋：『已收實額』欄位必須開放手動輸入，系統不得強制覆蓋。

一鍵撥號：彈窗中必須有 tel: 按鈕，點擊後直接撥打客人電話。

🌐 伍、 雙語與無障礙 (Bilingual & A11y)
語系切換：🌐 ZH / EN。所有靜態文字必須對應 JSON 字典，禁止在 UI 裡寫死中文。

暗黑模式：預設為 Dark Mode，符合恆春南國夜空的深沉質感。

架構師 阿芝 的終極叮嚀：
TEO，我不要看你的 Planning。我要你立即讀取這份藍圖，先從 SettingsContext 和 useBookings Hook 開始寫起。只要我發現你的彈窗不能輸入文字，我就會直接判定任務失敗。