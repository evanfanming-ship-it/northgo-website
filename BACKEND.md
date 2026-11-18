# 前台詢問與後台管理

使用 Node.js 24。在有 npm 的環境執行 `npm run build`。複製 `.env.example` 為 `.env`，填入專用的管理員密碼（至少 16 字元），再執行 `npm start` 或 `node --env-file-if-exists=.env server.mjs`。若沒有 npm，依 [建置步驟](DEPLOYMENT.md) 逐一執行 Node 指令。

- 首頁與詢問表單位於 http://localhost:3000/#enquiry。
- 管理員於 http://localhost:3000/admin 登入。表格可搜尋、依狀態篩選、按欄位排序與調整每頁筆數。點選姓名可查看完整內容，或使用每列的「編輯」「刪除」。右上方提供「新增詢問」「重新載入」及表格列高設定。
- 客戶確認預覽後送出，收到可供查詢的收件編號。重試同一份送出時沿用編號，以免重複建單。
- 詢問與登入工作階段儲存在 SQLite。預設資料庫位於 `data/enquiries.sqlite`，不應提交到 Git。

GitHub Pages 僅提供靜態頁面，仍可使用原有的郵件草稿流程。要公開啟用收件與後台，請將同一套網站與 Node 後端部署到支援常駐 Node 程序及持久磁碟的主機，以 HTTPS 反向代理提供服務。將 `PUBLIC_ORIGIN` 設為訪客實際使用的 HTTPS 網址，將 `DB_PATH` 設在持久磁碟，並設定定期 SQLite 備份。部署為單一 Node 實例，反向代理後目前的速率限制會以代理的連線位址共用。

驗證可執行 `node --test tests/backend.test.mjs`。測試使用暫存資料庫與臨時管理員密碼。

Workers 與 D1 的部署方式見 [Cloudflare 部署](CLOUDFLARE.md)。
