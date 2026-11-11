# Northgo RWD 網站地圖

## 全球辦公室地圖

直接開啟 `offices-map.html`：預設顯示全部 7 個辦公室，可切換全球、亞洲、台灣、日本、北美、東南亞，並支援縮放、拖曳、鍵盤選取及據點資訊卡。地圖資料、樣式和互動程式都內嵌於單一 HTML，無須外部地圖 API。Google Maps、電話及 Email 連結使用官網聯絡資料；標記為城市概略位置。

原始資料：`offices-data.mjs`、`world-countries.geojson`；介面：`offices.css`、`offices.js`。執行 `node build-offices.mjs` 重新產生，`node verify-offices.mjs` 驗證。`offices-map-preview.png` 為完成畫面，`offices-verification.json` 記錄驗證結果。底圖為 Natural Earth 公有領域資料。

## 網站地圖

直接以瀏覽器開啟 `index.html`（完整版）或 `sitemap-tree.html`（精簡樹狀版）即可使用；CSS、JavaScript 與網站地圖資料均內嵌，無須安裝套件或連網載入資源。原站連結需網路連線。

- 桌面三欄、手機單欄，自適應版面。
- 支援關鍵字搜尋、分類篩選、區塊展開收合、列印。
- 語系選單切換繁中、英文、日文、越南文；標題、摘要、操作介面、搜尋與官網連結同步切換。
- 語系會盡可能儲存於瀏覽器；可用 `?lang=zh-tw`、`?lang=en`、`?lang=ja`、`?lang=vi` 指定，網址參數優先。完整與樹狀版互連時保留語系。
- 樹狀版僅保留頁面階層、貨運子項、聯絡頁錨點及 404 標示。
- 依 2026-11-11 公開導覽與直接連結整理；包含查核狀態及分析。

`build.mjs` 是產生器；`content.mjs` 是四語摘要資料，`styles.css` 是共用基礎樣式，`sitemap.js` 是共用互動邏輯。修改後執行 `node build.mjs` 即可重新產生兩個獨立 HTML。

`crawl*.json` 為公開頁面的查核記錄，`verification.json` 記錄檢核結果。執行 `node verify.mjs` 可核對互動邏輯及連結資料。

已核對 48 個語系頁面網址（44 個 HTTP 200、4 個 News 網址 HTTP 404）及 32 個全語系錨點。地圖內容為依官網結構整理的多語摘要，非逐字轉載官網譯文。未測試表單提交。瀏覽器視覺驗證因本機檔案存取政策受限而未完成。
